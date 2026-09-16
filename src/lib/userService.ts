import { 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  collection,
  getDocs,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { UserRole } from '../types/auth';

export const USERS_COLLECTION = 'users';

export interface FirestoreUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  createdAt?: any;
  updatedAt?: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Reads a user profile document from Firestore by UID.
 * Returns null if the document does not exist or if Firestore is not available.
 */
export async function getUserProfile(uid: string): Promise<FirestoreUserProfile | null> {
  if (!db || !uid) return null;

  const path = `${USERS_COLLECTION}/${uid}`;
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as FirestoreUserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Subscribes to realtime updates for a user profile document at `/users/{uid}`.
 */
export function subscribeToUserProfile(
  uid: string, 
  onUpdate: (profile: FirestoreUserProfile | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db || !uid) {
    return () => {};
  }

  const userDocRef = doc(db, USERS_COLLECTION, uid);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as FirestoreUserProfile);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error('Realtime user profile listener error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Ensures a user profile exists in Firestore at `/users/{uid}`.
 * If the document exists, returns it without overwriting the existing role.
 * If the document does not exist, creates it with the given role (defaulting to 'campaigner') and serverTimestamp().
 */
export async function createOrFetchUserProfile(
  uid: string,
  email: string | null,
  displayName: string | null,
  rolePreference: UserRole = 'campaigner'
): Promise<FirestoreUserProfile> {
  if (!db || !uid) {
    throw new Error('Firestore is not configured or UID is missing');
  }

  const path = `${USERS_COLLECTION}/${uid}`;
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const existingSnap = await getDoc(userDocRef);

    if (existingSnap.exists()) {
      // Return existing profile to preserve the stored role
      return existingSnap.data() as FirestoreUserProfile;
    }

    // New user profile: write with serverTimestamp() and role (default 'campaigner')
    const newProfile: FirestoreUserProfile = {
      uid,
      email: email || null,
      displayName: displayName || (email ? email.split('@')[0] : 'User'),
      role: rolePreference,
      createdAt: serverTimestamp()
    };

    await setDoc(userDocRef, newProfile);
    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetches all registered user profiles from Firestore.
 * Allowed for Reviewers via security rules.
 */
export async function getAllUserProfiles(): Promise<FirestoreUserProfile[]> {
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const path = USERS_COLLECTION;
  try {
    const colRef = collection(db, USERS_COLLECTION);
    const snap = await getDocs(colRef);
    const profiles: FirestoreUserProfile[] = [];
    snap.forEach((d) => {
      profiles.push(d.data() as FirestoreUserProfile);
    });
    return profiles;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Updates the user's role in Firestore.
 * Gated to Reviewers via Firestore security rules.
 */
export async function updateUserRoleInFirestore(uid: string, newRole: UserRole): Promise<void> {
  if (!db || !uid) {
    throw new Error('Firestore is not configured or UID is missing');
  }

  const path = `${USERS_COLLECTION}/${uid}`;
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userDocRef, {
      role: newRole,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
