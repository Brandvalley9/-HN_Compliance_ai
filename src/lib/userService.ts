import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebase';
import { UserRole } from '../types/auth';

export interface FirestoreUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/**
 * Fetches the user profile document from Firestore at `/users/{uid}`.
 */
export async function getUserProfile(uid: string): Promise<FirestoreUserProfile | null> {
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const userDocRef = doc(db, 'users', uid);
  const snap = await getDoc(userDocRef);

  if (snap.exists()) {
    return snap.data() as FirestoreUserProfile;
  }
  return null;
}

/**
 * Subscribes to real-time changes to the user's Firestore profile.
 */
export function subscribeToUserProfile(
  uid: string,
  onProfile: (profile: FirestoreUserProfile | null) => void,
  onError?: (err: Error) => void
): () => void {
  if (!db) {
    onProfile(null);
    return () => {};
  }

  const userDocRef = doc(db, 'users', uid);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        onProfile(snap.data() as FirestoreUserProfile);
      } else {
        onProfile(null);
      }
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

/**
 * Ensures a user profile exists in Firestore at `/users/{uid}`.
 * If the document exists, returns it without overwriting the existing role.
 * If the document does not exist, creates it as 'creator' or 'campaigner' (never 'reviewer') with serverTimestamp().
 */
export async function createOrFetchUserProfile(
  uid: string,
  email: string | null,
  displayName: string | null,
  rolePreference: UserRole = 'campaigner'
): Promise<FirestoreUserProfile> {
  if (!db) {
    return {
      uid,
      email,
      displayName: displayName || (email ? email.split('@')[0] : 'User'),
      role: rolePreference === 'reviewer' ? 'campaigner' : rolePreference,
      createdAt: new Date().toISOString()
    };
  }

  const userDocRef = doc(db, 'users', uid);

  try {
    const existingSnap = await getDoc(userDocRef);

    if (existingSnap.exists()) {
      return existingSnap.data() as FirestoreUserProfile;
    }

    // New user profile. Self-registration may only ever produce a campaigner or a creator:
    // 'reviewer' is privileged and can only be granted by an existing reviewer / administrator.
    // (firestore.rules enforces the same restriction server-side.)
    const safeRole: UserRole = rolePreference === 'creator' ? 'creator' : 'campaigner';
    const newProfile: FirestoreUserProfile = {
      uid,
      email: email || null,
      displayName: displayName || (email ? email.split('@')[0] : 'User'),
      role: safeRole,
      createdAt: serverTimestamp()
    };

    await setDoc(userDocRef, newProfile);
    return newProfile;
  } catch (error) {
    console.error('Error fetching or creating user profile in Firestore:', error);
    throw error;
  }
}

/**
 * Updates non-role fields of the user profile document (e.g., displayName).
 */
export async function updateUserProfile(
  uid: string,
  data: Partial<Omit<FirestoreUserProfile, 'uid' | 'role' | 'createdAt'>>
): Promise<void> {
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const userDocRef = doc(db, 'users', uid);
  await updateDoc(userDocRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
}
