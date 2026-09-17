import React from 'react';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '../../context/AuthContext';
import { Info } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isFirebaseConfigured } = useAuth();

  return (
    <div id="hypenex-app-shell" className="min-h-screen flex flex-col text-slate-100">
      <AppHeader />

      {/* Notice Banner if Firebase is pending */}
      {!isFirebaseConfigured && (
        <div 
          id="firebase-config-notice"
          className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-200 flex items-center justify-between backdrop-blur-md"
        >
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Foundation Environment Notice:</strong> Running in local preview mode. You can switch roles using the spatial header above.
            </span>
          </div>
        </div>
      )}

      {/* Main App Body with Spatial Floating Layout */}
      <div className="flex-1 flex w-full max-w-7xl mx-auto p-4 sm:p-6 gap-6">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};
