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
      setNotification(`"${item.label}" is mapped to future capability: ${item.futureCapability}.`);
      setTimeout(() => setNotification(null), 3500);
    } else {
      setActiveTab(item.id);
    }
  };

  return (
    <aside
      id="app-role-sidebar"
      className="w-64 glass-surface rounded-3xl p-4 hidden md:flex flex-col justify-between shrink-0 h-[calc(100vh-6.5rem)] sticky top-24"
    >
      <div className="space-y-6">
        {/* Role Portal Label */}
        <div className="px-2">
          <p className="text-[10px] uppercase tracking-widest font-bold text-indigo-400">
            {currentNav.title}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Role: <span className="font-semibold capitalize text-slate-200">{user.role}</span>
          </p>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1.5">
          {currentNav.items.map((item) => {
            const Icon = item.icon;
            const isSelected = (!item.isPlanned && activeTab === item.id) || (!item.isPlanned && activeTab === 'overview');
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                type="button"
                onClick={() => handleItemClick(item)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-xl transition-all text-left ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.35)] font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.isPlanned ? (
                  <span className="text-[9px] font-semibold text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-nowrap">
                    Stage 2+
                  </span>
                ) : (
                  <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-white/70' : 'opacity-0'}`} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Informative notification when clicking planned capability */}
        {notification && (
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-200 flex items-start gap-2 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span className="text-[11px] leading-relaxed">{notification}</span>
          </div>
        )}
      </div>

      {/* Architecture & Stage Information Box */}
      <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 text-slate-200 font-medium mb-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
          <span>Spatial Engine Active</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Connected to Gemini 3.6 Flash. Real-time deterministic rules & schema validation enabled.
        </p>
      </div>
    </aside>
  );
};
