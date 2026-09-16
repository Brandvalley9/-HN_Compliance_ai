import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { 
  ShieldCheck, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  UserCheck,
  Lock,
  Mail
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { 
    loginWithGoogle, 
    loginWithEmail, 
    signUpWithEmail, 
    demoLogin, 
    isFirebaseConfigured, 
    error: authError 
  } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserRole>('campaigner');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleLogin = async () => {
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle(selectedRole);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Google authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (authMode === 'signin') {
        await loginWithEmail(email, password, selectedRole);
      } else {
        await signUpWithEmail(email, password, selectedRole);
      }
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="login-page-container" className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-indigo-400 shadow-sm mb-1">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            HypeNex Compliance Intelligence
          </h1>
          <p className="text-xs text-slate-600">
            Foundation Stage • Performance UGC Compliance Portal
          </p>
        </div>

        {/* Role Selection Segmented Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700">
              Role for New Registration
            </label>
            <span className="text-[10px] text-indigo-600 font-medium">
              Saved to Firestore Profile
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['campaigner', 'creator', 'reviewer'] as UserRole[]).map((role) => {
              const isSelected = selectedRole === role;
              return (
                <button
                  key={role}
                  id={`select-role-${role}-btn`}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`py-2 px-2 text-xs font-medium rounded-lg border capitalize transition-all text-center ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {role}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-600">
            {selectedRole === 'campaigner' && 'Campaigners configure campaign rules, brand guidelines, and review audit trails.'}
            {selectedRole === 'creator' && 'Creators submit video drafts and view automated compliance pre-checks.'}
            {selectedRole === 'reviewer' && 'Reviewers audit escalated claims and cross-reference regulatory criteria.'}
          </p>
          <div className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-2">
            <strong>Security Notice:</strong> Upon first login or sign up, your role is permanently registered in your Firestore user profile document and cannot be altered by client-side state or URL parameters. Existing accounts automatically restore their permanent Firestore role.
          </div>
        </div>

        {/* Error notification */}
        {(localError || authError) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{localError || authError}</span>
          </div>
        )}

        {/* Firebase Authentication Forms */}
        <div className="space-y-4">
          {/* Google Sign-in */}
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium text-xs shadow-2xs transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google (Firebase)</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-2 text-[10px] uppercase font-semibold text-slate-600 relative">
              or email auth
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="auth-email-input"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="auth-password-input"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                id="auth-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {authMode === 'signin' ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                <span>{authMode === 'signin' ? `Sign In as ${selectedRole}` : `Create ${selectedRole} Account`}</span>
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                className="text-[11px] text-slate-600 hover:text-slate-900 underline"
              >
                {authMode === 'signin' ? "Don't have an account? Create one" : "Already have an account? Sign in"}
              </button>
            </div>
          </form>
        </div>

        {/* Demo / Preview Mode Launcher (Development Sandbox Only) */}
        {(import.meta.env.DEV || import.meta.env.VITE_ALLOW_DEMO_LOGIN === 'true') && (
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Demo Role Preview (Development Only)
              </span>
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-medium">
                Dev Sandbox
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Explore and test any role without signing in. This demo path operates strictly in development mode and does not modify Firestore user profiles.
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                id="quick-login-campaigner-btn"
                type="button"
                onClick={() => demoLogin('campaigner')}
                className="p-2 text-center rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-900 transition-colors"
              >
                <div className="text-xs font-semibold">Campaigner</div>
                <div className="text-[9px] text-indigo-600 flex items-center justify-center gap-0.5 mt-0.5">
                  Demo Test <ArrowRight className="w-2.5 h-2.5" />
                </div>
              </button>

              <button
                id="quick-login-creator-btn"
                type="button"
                onClick={() => demoLogin('creator')}
                className="p-2 text-center rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900 transition-colors"
              >
                <div className="text-xs font-semibold">Creator</div>
                <div className="text-[9px] text-emerald-600 flex items-center justify-center gap-0.5 mt-0.5">
                  Demo Test <ArrowRight className="w-2.5 h-2.5" />
                </div>
              </button>

              <button
                id="quick-login-reviewer-btn"
                type="button"
                onClick={() => demoLogin('reviewer')}
                className="p-2 text-center rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-900 transition-colors"
              >
                <div className="text-xs font-semibold">Reviewer</div>
                <div className="text-[9px] text-amber-600 flex items-center justify-center gap-0.5 mt-0.5">
                  Demo Test <ArrowRight className="w-2.5 h-2.5" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Foundation Status Footer */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
          <div className="font-semibold text-slate-700 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-slate-500" />
            Foundation Architecture
          </div>
          <p>
            Role-based routing directs authenticated users to their corresponding dashboard shell: Campaigner, Creator, or Reviewer.
          </p>
        </div>
      </div>
    </div>
  );
};
