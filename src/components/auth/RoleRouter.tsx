import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LoginPage } from '../../pages/auth/LoginPage';
import { DashboardLayout } from '../layout/DashboardLayout';
import { CampaignerDashboard } from '../../pages/campaigner/CampaignerDashboard';
import { CreatorDashboard } from '../../pages/creator/CreatorDashboard';
import { ReviewerDashboard } from '../../pages/reviewer/ReviewerDashboard';

export const RoleRouter: React.FC = () => {
  const { user, loading } = useAuth();

  // Ensure clean URL without hash-based role spoofing
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  if (loading) {
    return (
      <div id="auth-loading-screen" className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-600 tracking-wide">
            Initializing HypeNex Compliance Shell...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Render the appropriate role dashboard strictly determined by the role loaded from the Firestore user profile
  const renderDashboard = () => {
    switch (user.role) {
      case 'campaigner':
        return <CampaignerDashboard />;
      case 'creator':
        return <CreatorDashboard />;
      case 'reviewer':
        return <ReviewerDashboard />;
      default:
        return <CreatorDashboard />;
    }
  };

  return (
    <DashboardLayout>
      {renderDashboard()}
    </DashboardLayout>
  );
};
