import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RegulatoryEntry } from '../../types/regulatory';
import { 
  getRegulatoryEntries, 
  createRegulatoryEntry, 
  deleteRegulatoryEntry 
} from '../../lib/regulatoryService';
import { RegulatoryList } from '../../components/regulatory/RegulatoryList';
import { RegulatoryEntryForm } from '../../components/regulatory/RegulatoryEntryForm';
import { ReviewerQueueDashboard } from '../../components/reviewer/ReviewerQueueDashboard';
import { UserRoleAdmin } from '../../components/reviewer/UserRoleAdmin';
import { 
  UserCheck, 
  BookOpen, 
  CheckSquare, 
  Database,
  Layers,
  Sparkles,
  ShieldAlert,
  UserCog
} from 'lucide-react';

type ReviewerTab = 'queue' | 'regulatory' | 'roles';
type RegulatoryViewMode = 'list' | 'create';

export const ReviewerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ReviewerTab>('queue');
  const [regulatoryViewMode, setRegulatoryViewMode] = useState<RegulatoryViewMode>('list');
  const [entries, setEntries] = useState<RegulatoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const data = await getRegulatoryEntries(user?.isDemo);
      setEntries(data);
    } catch (err) {
      console.error('Failed to load regulatory entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [user?.isDemo]);

  const handleSaveEntry = async (entryData: Omit<RegulatoryEntry, 'id'>) => {
    setIsSaving(true);
    try {
      const payload = {
        ...entryData,
        createdById: user?.uid || 'reviewer',
        createdByEmail: user?.email || 'reviewer@hypenex.io'
      };
      await createRegulatoryEntry(payload, user?.isDemo);
      setStatusMessage({ type: 'success', text: 'Regulatory entry saved to Firestore!' });
      setRegulatoryViewMode('list');
      await fetchEntries();
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving entry';
      setStatusMessage({ type: 'error', text: msg });
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm('Delete this regulatory knowledge entry?')) return;
    try {
      await deleteRegulatoryEntry(id, user?.isDemo);
      setStatusMessage({ type: 'success', text: 'Regulatory entry deleted.' });
      await fetchEntries();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  return (
    <div id="reviewer-dashboard-view" className="space-y-6">
      {/* Reviewer Portal Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            id="tab-reviewer-queue"
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'queue'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Human Review Queue (AMBER & RED)</span>
          </button>

          <button
            id="tab-reviewer-regulatory"
            type="button"
            onClick={() => setActiveTab('regulatory')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'regulatory'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Regulatory Knowledge Base ({entries.length})</span>
          </button>

          <button
            id="tab-reviewer-roles"
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'roles'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserCog className="w-4 h-4" />
            <span>User Role Administration</span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 text-xs text-slate-500 font-medium">
          <UserCheck className="w-3.5 h-3.5 text-amber-600" />
          <span>Role: Reviewer</span>
        </div>
      </div>

      {/* Tab Content: 1. Human Review Queue */}
      {activeTab === 'queue' && (
        <ReviewerQueueDashboard />
      )}

      {/* Tab Content: 2. Regulatory Knowledge Repository */}
      {activeTab === 'regulatory' && (
        <div className="space-y-6">
          <div id="reviewer-header-block" className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <UserCheck className="w-3.5 h-3.5" />
                    Regulatory Knowledge Ground Truth
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    <Database className="w-3 h-3 text-amber-600" />
                    Firestore /regulatory_entries
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                  Curated Regulatory Knowledge Base
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Manage authoritative statutes (ASA, CAP, FTC, CMA) cited in deterministic and AI compliance evaluation steps.
                </p>
              </div>

              {regulatoryViewMode === 'create' && (
                <button
                  type="button"
                  onClick={() => setRegulatoryViewMode('list')}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                >
                  Browse Entries ({entries.length})
                </button>
              )}
            </div>
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium transition-all ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          <div id="regulatory-knowledge-feature-container">
            {regulatoryViewMode === 'list' && (
              <RegulatoryList
                entries={entries}
                loading={loading}
                onAddNew={() => setRegulatoryViewMode('create')}
                onDeleteEntry={handleDeleteEntry}
              />
            )}

            {regulatoryViewMode === 'create' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    Add Regulatory Knowledge Entry
                  </h2>
                </div>
                <RegulatoryEntryForm
                  onSave={handleSaveEntry}
                  onCancel={() => setRegulatoryViewMode('list')}
                  isSaving={isSaving}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: 3. User Role Administration (Reviewer Only) */}
      {activeTab === 'roles' && (
        <UserRoleAdmin />
      )}
    </div>
  );
};
