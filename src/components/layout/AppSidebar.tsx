import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { 
  LayoutDashboard, 
  Megaphone, 
  Scale, 
  Bot, 
  FileText, 
  UploadCloud, 
  CheckSquare, 
  History, 
  BookOpen, 
  ShieldAlert,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isPlanned?: boolean;
  futureCapability?: string;
}

const roleNavigation: Record<UserRole, { title: string; items: SidebarItem[] }> = {
  campaigner: {
    title: 'Campaigner Portal',
    items: [
      { id: 'camp-overview', label: 'Dashboard Overview', icon: LayoutDashboard, isPlanned: false },
      { id: 'camp-campaigns', label: 'Campaign Management', icon: Megaphone, isPlanned: false },
      { id: 'camp-rules', label: 'Deterministic Rules', icon: Scale, isPlanned: true, futureCapability: 'Deterministic compliance rules' },
      { id: 'camp-ai', label: 'AI Compliance Reasoning', icon: Bot, isPlanned: true, futureCapability: 'AI compliance reasoning' },
      { id: 'camp-audit', label: 'Audit Trails', icon: FileText, isPlanned: true, futureCapability: 'Audit trails' },
    ]
  },
  creator: {
    title: 'Creator Portal',
    items: [
      { id: 'creator-overview', label: 'Assigned Campaigns', icon: Megaphone, isPlanned: false },
      { id: 'creator-guardrails', label: 'Campaign Guardrails', icon: Scale, isPlanned: false },
      { id: 'creator-submissions', label: 'Draft Submissions (Steps 3-5)', icon: UploadCloud, isPlanned: false },
      { id: 'creator-history', label: 'Audit History', icon: History, isPlanned: false },
    ]
  },
  reviewer: {
    title: 'Reviewer Portal',
    items: [
      { id: 'reviewer-queue', label: 'Human Review Queue', icon: CheckSquare, isPlanned: false },
      { id: 'reviewer-regulatory', label: 'Regulatory Knowledge', icon: BookOpen, isPlanned: false },
      { id: 'reviewer-logs', label: 'Audit & Compliance Logs', icon: ShieldAlert, isPlanned: true, futureCapability: 'Audit trails' },
    ]
  }
};

export const AppSidebar: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [notification, setNotification] = useState<string | null>(null);

  if (!user) return null;

  const currentNav = roleNavigation[user.role] || roleNavigation.campaigner;

  const handleItemClick = (item: SidebarItem) => {
    if (item.isPlanned) {
      setNotification(`"${item.label}" is mapped to future capability: ${item.futureCapability}. (Reserved for subsequent stage).`);
      setTimeout(() => setNotification(null), 3500);
    } else {
      setActiveTab(item.id);
    }
  };

  return (
    <aside
      id="app-role-sidebar"
      className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16"
    >
      <div className="p-4 space-y-6">
        {/* Role Portal Label */}
        <div className="px-2">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-600">
            {currentNav.title}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            Role: <span className="font-semibold capitalize text-slate-800">{user.role}</span>
          </p>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1">
          {currentNav.items.map((item) => {
            const Icon = item.icon;
            const isSelected = (!item.isPlanned && activeTab === item.id) || (!item.isPlanned && activeTab === 'overview');
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                type="button"
                onClick={() => handleItemClick(item)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all text-left ${
                  isSelected
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.isPlanned ? (
                  <span className="text-[9px] font-semibold text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded text-nowrap">
                    Stage 2+
                  </span>
                ) : (
                  <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-400' : 'opacity-0'}`} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Informative notification when clicking planned capability */}
        {notification && (
          <div className="p-3 bg-indigo-50/80 border border-indigo-100 rounded-lg text-xs text-indigo-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <span className="text-[11px] leading-relaxed">{notification}</span>
          </div>
        )}
      </div>

      {/* Architecture & Stage Information Box */}
      <div className="p-4 border-t border-slate-200 text-xs text-slate-600 bg-white">
        <div className="flex items-center gap-1.5 text-slate-700 font-medium mb-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Foundation Mode Active</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-600">
          Clean application shell & role-based routing enabled. All compliance reasoning & marketplace logic deferred to future stages.
        </p>
      </div>
    </aside>
  );
};
