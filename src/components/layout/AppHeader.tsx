import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { ShieldCheck, LogOut, UserCircle2, ArrowLeftRight, Sparkles, CheckCircle2, Lock } from 'lucide-react';

const roleColorConfig: Record<UserRole, { bg: string; text: string; border: string; label: string }> = {
  campaigner: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    label: 'Campaigner'
  },
  creator: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    label: 'Creator'
  },
  reviewer: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    label: 'Reviewer'
  }
};

export const AppHeader: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const currentRoleConfig = roleColorConfig[user.role] || roleColorConfig.campaigner;

  return (
    <header
      id="app-main-header"
      className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs"
    >
      {/* Brand & Stage indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-900 text-white font-semibold shadow-xs">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 tracking-tight text-base">
              HypeNex Compliance Intelligence
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Foundation Stage
            </span>
          </div>
          <p className="text-xs text-slate-600 hidden sm:block">
            Performance UGC Compliance Shell
          </p>
        </div>
      </div>

      {/* User Context & Role Management */}
      <div className="flex items-center gap-2 sm:gap-4">
        {user.isDemo ? (
          /* Demo Testing Role Indicator */
          <div id="demo-role-badge" className="flex items-center bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs">
            <span className="text-amber-800 mr-2 flex items-center gap-1 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Demo Preview:</span>
            </span>
            <span className={`px-2 py-0.5 rounded-md font-bold capitalize border shadow-2xs ${currentRoleConfig.bg} ${currentRoleConfig.text} ${currentRoleConfig.border}`}>
              {currentRoleConfig.label}
            </span>
          </div>
        ) : (
          /* Authenticated User: Verified immutable role bound in Firestore */
          <div id="authenticated-role-badge" className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
            <span className="text-slate-500 mr-2 font-medium flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Assigned Role:</span>
            </span>
            <span className={`px-2 py-0.5 rounded-md font-bold capitalize border shadow-2xs ${currentRoleConfig.bg} ${currentRoleConfig.text} ${currentRoleConfig.border}`}>
              {currentRoleConfig.label}
            </span>
            <span className="ml-2 text-[10px] text-slate-600 hidden xl:inline" title="Stored in Firestore user profile (immutable)">
              (Firestore Profile)
            </span>
          </div>
        )}

        {/* User identification badge */}
        <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200">
          <UserCircle2 className="w-5 h-5 text-slate-400" />
          <div className="text-left">
            <div className="text-xs font-semibold text-slate-800 leading-tight">
              {user.displayName || user.email}
            </div>
            <div className="text-[10px] flex items-center gap-1">
              {user.isDemo ? (
                <span className="text-amber-700 font-medium flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> Testing Sandbox
                </span>
              ) : (
                <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Verified Account
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          id="sign-out-btn"
          type="button"
          onClick={() => logout()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          title="Sign out of application"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
