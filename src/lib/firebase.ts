import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore 
} from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

// Detect Firebase configuration: Prefer firebase-applet-config.json, then env, then fallback
const getFirebaseConfig = () => {
  if (appletConfig && appletConfig.apiKey && appletConfig.projectId) {
    return {
      apiKey: appletConfig.apiKey,
      authDomain: appletConfig.authDomain,
      projectId: appletConfig.projectId,
      storageBucket: appletConfig.storageBucket,
      messagingSenderId: appletConfig.messagingSenderId,
      appId: appletConfig.appId,
      firestoreDatabaseId: appletConfig.firestoreDatabaseId
    };
  }

  const env = (import.meta as { env?: Record<string, string | undefined> }).env || {};
  if (env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID) {
    return {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
      firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID
    };
  }

  return null;
};

const config = getFirebaseConfig();
export const isFirebaseConfigured = Boolean(config && config.apiKey && config.projectId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
const googleProvider = new GoogleAuthProvider();

if (isFirebaseConfigured && config) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(config);
    auth = getAuth(app);
    // Initialize Firestore with specific database ID if specified in applet config
    if (config.firestoreDatabaseId) {
      db = getFirestore(app, config.firestoreDatabaseId);
    } else {
      db = getFirestore(app);
    }
  } catch (err) {
    console.warn('Firebase initialization warning:', err);
  }
}

export { 
  app, 
  auth, 
  db,
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
};
export type { FirebaseUser };
