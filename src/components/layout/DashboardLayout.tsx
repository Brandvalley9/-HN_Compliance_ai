import React from 'react';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '../../context/AuthContext';
import { Info } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isFirebaseConfigured, user } = useAuth();

  return (
    <div id="hypenex-app-shell" className="min-h-screen bg-slate-100 flex flex-col">
      <AppHeader />

      {/* Notice Banner if Firebase is pending project configuration */}
      {!isFirebaseConfigured && (
        <div 
          id="firebase-config-notice"
          className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between"
        >
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Foundation Environment Notice:</strong> Firebase credentials are not yet populated in <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">.env</code>. You can preview, verify, and switch between all 3 role dashboards (Campaigner, Creator, Reviewer) using the header role switcher above.
            </span>
          </div>
        </div>
      )}

      {/* Main App Body */}
      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        <AppSidebar />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
