export type UserRole = 'campaigner' | 'creator' | 'reviewer';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  isDemo?: boolean;
}

export interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  isFirebaseConfigured: boolean;
  loginWithGoogle: (rolePreference?: UserRole) => Promise<void>;
  loginWithEmail: (email: string, pass: string, rolePreference?: UserRole) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, role: UserRole) => Promise<void>;
  demoLogin: (role: UserRole) => void;
  switchRole: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  iconName: string;
  badge?: string;
  isPlaceholder?: boolean;
}
