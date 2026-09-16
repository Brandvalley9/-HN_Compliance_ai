import React, { createContext, useContext, useEffect, useState, useTransition, useRef } from 'react';
import { 
  AppUser, 
  AuthContextType, 
  UserRole 
} from '../types/auth';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  isFirebaseConfigured, 
  FirebaseUser 
} from '../lib/firebase';
import { 
  createOrFetchUserProfile, 
  subscribeToUserProfile,
  updateUserRoleInFirestore 
} from '../lib/userService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const profileUnsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize Auth state with Firestore onSnapshot subscription
  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      // Clean up previous profile listener if any
      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current();
        profileUnsubscribeRef.current = null;
      }

      if (firebaseUser) {
        try {
          // Ensure profile document exists in Firestore at /users/{uid}
          // Stores { uid, email, displayName, role: 'campaigner', createdAt: serverTimestamp() } without overwriting if already exists
          await createOrFetchUserProfile(
            firebaseUser.uid,
            firebaseUser.email,
            firebaseUser.displayName,
            'campaigner'
          );

          // Listen in realtime directly to Firestore /users/{uid}
          profileUnsubscribeRef.current = subscribeToUserProfile(
            firebaseUser.uid,
            (profile) => {
              if (profile) {
                startTransition(() => {
                  setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: profile.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                    role: profile.role || 'campaigner',
                    isDemo: false
                  });
                });
              }
              setLoading(false);
            },
            (err) => {
              console.error('Failed to sync profile from Firestore:', err);
              setError(err.message);
              setLoading(false);
            }
          );
        } catch (err) {
          console.error('Failed to initialize user profile document in Firestore:', err);
          setError(err instanceof Error ? err.message : 'Error resolving user profile');
          setLoading(false);
        }
      } else {
        startTransition(() => {
          setUser((currentUser) => (currentUser?.isDemo && (import.meta.env.DEV || import.meta.env.VITE_ALLOW_DEMO_LOGIN === 'true') ? currentUser : null));
        });
        setLoading(false);
      }
    }, (err) => {
      console.error('Auth state error:', err);
      setError(err.message);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current();
        profileUnsubscribeRef.current = null;
      }
    };
  }, []);

  const loginWithGoogle = async (rolePreference: UserRole = 'campaigner') => {
    setError(null);
    if (!auth || !isFirebaseConfigured) {
      throw new Error('Firebase Authentication is not yet configured.');
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      // Write or verify document at /users/{uid} with default 'campaigner' without overwriting existing role
      await createOrFetchUserProfile(
        fbUser.uid,
        fbUser.email,
        fbUser.displayName,
        rolePreference || 'campaigner'
      );
      // State is automatically resolved via the onSnapshot listener
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setError(msg);
      throw err;
    }
  };

  const loginWithEmail = async (email: string, pass: string, rolePreference: UserRole = 'campaigner') => {
    setError(null);
    if (!auth || !isFirebaseConfigured) {
      throw new Error('Firebase Authentication is not yet configured.');
    }
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      const fbUser = result.user;

      // Ensure profile exists in Firestore (does not overwrite existing role if document already exists)
      await createOrFetchUserProfile(
        fbUser.uid,
        fbUser.email,
        fbUser.displayName,
        rolePreference || 'campaigner'
      );
      // State is automatically resolved via the onSnapshot listener
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed.';
      setError(msg);
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, role: UserRole = 'campaigner') => {
    setError(null);
    if (!auth || !isFirebaseConfigured) {
      throw new Error('Firebase Authentication is not yet configured.');
    }
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      const fbUser = result.user;

      // Write initial user profile at registration in Firestore
      await createOrFetchUserProfile(
        fbUser.uid,
        fbUser.email,
        fbUser.email?.split('@')[0] || 'User',
        role || 'campaigner'
      );
      // State is automatically resolved via the onSnapshot listener
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      setError(msg);
      throw err;
    }
  };

  /**
   * Demo / Preview Login: Strictly gated to DEV environment or explicit flag.
   * Does NOT use localStorage for roles or write to production Firestore.
   */
  const demoLogin = (role: UserRole) => {
    const isDevOrDemoAllowed = import.meta.env.DEV || import.meta.env.VITE_ALLOW_DEMO_LOGIN === 'true';
    if (!isDevOrDemoAllowed) {
      console.warn('Demo preview launcher is disabled in production environments.');
      return;
    }

    setError(null);
    const demoUser: AppUser = {
      uid: `demo-${role}-${Date.now()}`,
      email: `${role.toLowerCase()}@hypenex.demo`,
      displayName: `${role.charAt(0).toUpperCase() + role.slice(1)} (Demo Preview)`,
      role,
      isDemo: true
    };
    startTransition(() => {
      setUser(demoUser);
    });
  };

  /**
   * Neutered switchRole: Genuine no-op.
   * A user's role can only ever change via a Firestore write to their /users/{uid}
   * doc performed by an admin/reviewer flow — not by the user themselves,
   * not by URL navigation.
   */
  const switchRole = async (_newRole: UserRole): Promise<void> => {
    console.warn(
      'Security notice: switchRole is permanently disabled. User roles must be updated in Firestore by a Reviewer.'
    );
  };

  const logout = async () => {
    setError(null);
    if (profileUnsubscribeRef.current) {
      profileUnsubscribeRef.current();
      profileUnsubscribeRef.current = null;
    }

    if (auth && !user?.isDemo) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn('SignOut error:', err);
      }
    }
    startTransition(() => {
      setUser(null);
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isFirebaseConfigured,
        loginWithGoogle,
        loginWithEmail,
        signUpWithEmail,
        demoLogin,
        switchRole,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
