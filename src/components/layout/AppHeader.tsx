import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { ShieldCheck, LogOut, UserCircle2, Sparkles } from 'lucide-react';

export const AppHeader: React.FC = () => {
  const { user, userRole, switchRole, logout } = useAuth();

  const roles: UserRole[] = ['campaigner', 'creator', 'reviewer'];

  return (
    <header className="sticky top-0 z-50 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto glass-surface rounded-2xl px-5 py-3 flex items-center justify-between">
        {/* Brand Logo & Model Indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)]">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-black tracking-wider text-white">
                HYPENEX
              </span>
              <span className="block text-[9px] uppercase tracking-widest text-indigo-400 font-semibold">
                Compliance AI
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
            <span>gemini-3.6-flash active</span>
          </div>
        </div>

        {/* Role Switcher Pill Capsule */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md">
          {roles.map((r) => {
            const isActive = userRole === r;
            return (
              <button
                key={r}
                onClick={() => switchRole(r)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>

        {/* User Status / Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300">
            <UserCircle2 className="w-4 h-4 text-indigo-400" />
            <span>{user?.displayName || user?.email || 'Active User'}</span>
          </div>
          <button
            onClick={() => logout()}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-rose-400 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
