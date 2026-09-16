import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Campaign } from '../../types/campaign';
import { 
  getCampaignsByOwner, 
  createCampaign, 
  updateCampaign, 
  deleteCampaign,
  testFirestoreConnection
} from '../../lib/campaignService';
import { CampaignList } from '../../components/campaigns/CampaignList';
import { CampaignForm } from '../../components/campaigns/CampaignForm';
import { CampaignDetail } from '../../components/campaigns/CampaignDetail';
import { PlaceholderSection } from '../../components/placeholders/PlaceholderSection';
import { 
  UserCheck, 
  Scale, 
  Bot, 
  FileText, 
  Megaphone,
  Database,
  Layers
} from 'lucide-react';

type ViewMode = 'list' | 'create' | 'detail' | 'edit';

export const CampaignerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCampaigns = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getCampaignsByOwner(user.uid, user.isDemo);
      setCampaigns(data);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    testFirestoreConnection();
  }, [user?.uid, user?.isDemo]);

  const handleCreateNew = () => {
    setSelectedCampaign(null);
    setViewMode('create');
  };

  const handleSelectCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setViewMode('detail');
  };

  const handleSaveCampaign = async (campaignData: Omit<Campaign, 'id'>) => {
    if (!user) return;
    setIsSaving(true);
    try {
      if (viewMode === 'edit' && selectedCampaign?.id) {
        await updateCampaign(selectedCampaign.id, campaignData, user.isDemo);
        const updated: Campaign = {
          ...selectedCampaign,
          ...campaignData
        };
        setSelectedCampaign(updated);
        setStatusMessage({ type: 'success', text: 'Campaign updated successfully!' });
        setViewMode('detail');
      } else {
        const payload = {
          ...campaignData,
          ownerId: user.uid,
          ownerEmail: user.email
        };
        const newId = await createCampaign(payload, user.isDemo);
        const createdCampaign: Campaign = {
          id: newId,
          ...payload
        };
        setSelectedCampaign(createdCampaign);
        setStatusMessage({ type: 'success', text: 'Campaign created successfully in Firestore!' });
        setViewMode('detail');
      }
      await fetchCampaigns();
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving campaign';
      setStatusMessage({ type: 'error', text: msg });
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!selectedCampaign?.id || !user) return;
    if (!window.confirm(`Are you sure you want to delete "${selectedCampaign.name}"?`)) {
      return;
    }
    try {
      await deleteCampaign(selectedCampaign.id, user.isDemo);
      setStatusMessage({ type: 'success', text: 'Campaign deleted.' });
      setSelectedCampaign(null);
      setViewMode('list');
      await fetchCampaigns();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Failed to delete campaign:', err);
    }
  };

  return (
    <div id="campaigner-dashboard-view" className="space-y-6">
      {/* Header with Role Name and Simple Page Title */}
      <div id="campaigner-header-block" className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <UserCheck className="w-3.5 h-3.5" />
                Role: Campaigner
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                <Database className="w-3 h-3 text-indigo-500" />
                Firestore Storage
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Campaigner Dashboard
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Configure campaign specifications, platform targets, approved & prohibited claims, and required disclosures.
            </p>
          </div>

          {viewMode !== 'list' && (
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            >
              All Campaigns ({campaigns.length})
            </button>
          )}
        </div>
      </div>

      {/* Flash Status Notification */}
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

      {/* Main Campaign Work Area: List, Create, Detail, or Edit */}
      <div id="campaign-feature-container">
        {viewMode === 'list' && (
          <CampaignList
            campaigns={campaigns}
            loading={loading}
            onSelectCampaign={handleSelectCampaign}
            onCreateNew={handleCreateNew}
          />
        )}

        {viewMode === 'create' && (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-indigo-600" />
              Create New Campaign
            </h2>
            <CampaignForm
              onSave={handleSaveCampaign}
              onCancel={() => setViewMode('list')}
              isSaving={isSaving}
            />
          </div>
        )}

        {viewMode === 'detail' && selectedCampaign && (
          <CampaignDetail
            campaign={selectedCampaign}
            onEdit={() => setViewMode('edit')}
            onBack={() => setViewMode('list')}
            onDelete={handleDeleteCampaign}
          />
        )}

        {viewMode === 'edit' && selectedCampaign && (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-indigo-600" />
              Edit Campaign: {selectedCampaign.name}
            </h2>
            <CampaignForm
              initialData={selectedCampaign}
              onSave={handleSaveCampaign}
              onCancel={() => setViewMode('detail')}
              isSaving={isSaving}
            />
          </div>
        )}
      </div>

      {/* Future Functionality Placeholders (Preserved as Foundation Requirement) */}
      <div className="pt-4 border-t border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-600" />
            Future Capability Placeholders
          </span>
          <span className="text-[11px] text-slate-600">
            No compliance checking or AI reasoning in this stage
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PlaceholderSection
            id="placeholder-deterministic-rules"
            title="Deterministic Compliance Rules"
            subtitle="Empty placeholder for deterministic rule engines, banned keyword lists, and statutory disclosures."
            icon={Scale}
            plannedStage="Future Stage"
          />

          <PlaceholderSection
            id="placeholder-ai-reasoning"
            title="AI Compliance Reasoning"
            subtitle="Empty placeholder for AI compliance co-pilot analysis and contextual brand risk evaluations."
            icon={Bot}
            plannedStage="Future Stage"
          />

          <PlaceholderSection
            id="placeholder-audit-trails"
            title="Audit Trails"
            subtitle="Empty placeholder for immutable campaign compliance records and verification checkpoints."
            icon={FileText}
            plannedStage="Future Stage"
          />
        </div>
      </div>
    </div>
  );
};
