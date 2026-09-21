import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldCheck, 
  LogOut, 
  User, 
  Sparkles,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { UserRole } from '../../types/auth';

interface AppHeaderProps {
  onOpenComplianceModal?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onOpenComplianceModal }) => {
  const { user, userRole, logout, isFirebaseConfigured } = useAuth();

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'campaigner':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/20';
      case 'creator':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20';
      case 'reviewer':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-500/20';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Brand Logo & System Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-indigo-400 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-sm sm:text-base">
                  HypeNex Compliance Intelligence
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 border border-slate-200">
                  Foundation
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Pre-Execution UGC Safety & Statutory Ad-Standards Verification
              </p>
            </div>
          </div>

          {/* Right Action Tools & Profile */}
          <div className="flex items-center gap-3 sm:gap-4">
            
            {/* Direct Sandbox Trigger */}
            {onOpenComplianceModal && (
              <button
                type="button"
                id="header-run-compliance-btn"
                onClick={onOpenComplianceModal}
                className="hidden md:inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 hover:text-indigo-800 transition-colors shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Sandbox Checker</span>
              </button>
            )}

            {/* Read-only User Role Badge */}
            {userRole && (
              <div
                id="header-user-role-badge"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border capitalize ring-1 ${getRoleBadgeStyle(
                  userRole
                )}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                <span>{userRole}</span>
              </div>
            )}

            {/* User Identity & Logout */}
            <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200">
              <div className="flex items-center gap-2 text-slate-700">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-medium text-xs">
                  {user?.displayName ? (
                    user.displayName.charAt(0).toUpperCase()
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {user?.displayName || (user?.email ? user.email.split('@')[0] : 'Authenticated User')}
                  </div>
                  <div className="text-[10px] text-slate-600 leading-tight">
                    {user?.isDemo ? 'Demo Mode' : user?.email || 'Active Session'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                id="header-logout-btn"
                onClick={() => logout()}
                title="Sign out of system"
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Development / Demo Mode Alert Ribbon */}
      {!isFirebaseConfigured && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1 text-center">
          <p className="text-[11px] text-amber-800 font-medium flex items-center justify-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Operating in local development demo storage. To enable multi-user persistence, supply Firebase credentials.</span>
          </p>
        </div>
      )}
    </header>
  );
};
