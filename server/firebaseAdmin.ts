import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, getApps, applicationDefault, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Firestore } from 'firebase-admin/firestore';
import type { ComplianceDeps } from './complianceRoutes';
import type { UserRole } from '../src/types/auth';
import type { Campaign } from '../src/types/campaign';
import type { RegulatoryEntry } from '../src/types/regulatory';

interface AppletConfig {
  projectId?: string;
  firestoreDatabaseId?: string;
}

function readAppletConfig(): AppletConfig {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Initialises the Firebase Admin SDK.
 *  - Credentials: FIREBASE_SERVICE_ACCOUNT_JSON (a service-account JSON string), otherwise
 *    Application Default Credentials (Cloud Run / GCE / `gcloud auth application-default login`).
 *  - Project / database: FIREBASE_PROJECT_ID / FIRESTORE_DATABASE_ID, otherwise firebase-applet-config.json.
 */
export function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const cfg = readAppletConfig();
  const projectId = process.env.FIREBASE_PROJECT_ID || cfg.projectId;
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  return initializeApp({
    projectId,
    credential: saJson ? cert(JSON.parse(saJson)) : applicationDefault()
  });
}

export function getAdminDb(): Firestore {
  const cfg = readAppletConfig();
  const databaseId = process.env.FIRESTORE_DATABASE_ID || cfg.firestoreDatabaseId;
  const app = getAdminApp();
  return databaseId && databaseId !== '(default)' ? getFirestore(app, databaseId) : getFirestore(app);
}

/** Privileged data access used by the compliance routes. Rules do not apply to the Admin SDK. */
export function createFirebaseAdminDeps(): Pick<
  ComplianceDeps,
  'verifyToken' | 'getUserRole' | 'getCampaign' | 'getRegulatoryEntries' | 'saveReport'
> {
  const db = () => getAdminDb();

  return {
    async verifyToken(idToken) {
      // checkRevoked=true so disabled/revoked accounts lose access immediately
      const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken, true);
      return { uid: decoded.uid, email: decoded.email };
    },

    async getUserRole(uid) {
      const snap = await db().collection('users').doc(uid).get();
      const role = snap.exists ? (snap.data()?.role as UserRole | undefined) : undefined;
      return role === 'campaigner' || role === 'creator' || role === 'reviewer' ? role : null;
    },

    async getCampaign(id) {
      const snap = await db().collection('campaigns').doc(id).get();
      return snap.exists ? ({ id: snap.id, ...(snap.data() as Omit<Campaign, 'id'>) } as Campaign) : null;
    },

    async getRegulatoryEntries() {
      const snap = await db().collection('regulatory_entries').get();
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RegulatoryEntry, 'id'>) }));
    },

    async saveReport(report) {
      const ref = await db()
        .collection('compliance_reports')
        .add({ ...report, createdAtTimestamp: FieldValue.serverTimestamp() });
      return ref.id;
    }
  };
}
