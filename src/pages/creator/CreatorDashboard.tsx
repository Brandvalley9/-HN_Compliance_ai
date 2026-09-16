import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Campaign } from '../../types/campaign';
import { getCampaignsForCreator } from '../../lib/campaignService';
import { CampaignGuardrailsCard } from '../../components/creator/CampaignGuardrailsCard';
import { CreatorSubmissionFlow } from '../../components/creator/CreatorSubmissionFlow';
import { 
  UserCheck, 
  Megaphone, 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  History, 
  CheckCircle2, 
  AlertCircle,
  Video,
  ArrowRight,
  Layers,
  ChevronRight
} from 'lucide-react';

export const CreatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [stagedScript, setStagedScript] = useState<string>('');

  useEffect(() => {
    async function loadAssignedCampaigns() {
      setLoading(true);
      try {
        const list = await getCampaignsForCreator(user?.uid, user?.isDemo);
        setCampaigns(list);
        if (list.length > 0) {
          setSelectedCampaignId(list[0].id || '');
        }
      } catch (err) {
        console.warn('Failed to load campaigns for creator:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAssignedCampaigns();
  }, [user?.uid, user?.isDemo]);

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId) || campaigns[0] || null;

  return (
    <div id="creator-flow-container" className="space-y-6">
      {/* 1. Header Banner */}
      <div id="creator-header-card" className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <UserCheck className="w-3.5 h-3.5" />
                Role: Creator Portal
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                Logged in as <span className="font-semibold text-slate-700">{user?.displayName || user?.email || 'Demo Creator'}</span>
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Assigned Campaigns & Pre-Flight Compliance
            </h1>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Review your assigned brand campaigns, inspect plain-language guardrails (approved claims, forbidden words, mandatory disclosures), and submit your UGC captions or scripts for instant Steps 3–5 compliance verification.
            </p>
          </div>

          {/* Campaign Count Chip */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Assigned Campaigns
              </span>
              <span className="text-sm font-bold text-slate-900">
                {campaigns.length} {campaigns.length === 1 ? 'Campaign' : 'Campaigns'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Assigned Campaign Selector / Tabs */}
      <div id="assigned-campaigns-selector" className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Megaphone className="w-3.5 h-3.5 text-indigo-600" />
            Select Your Active Campaign Assignment
          </h2>
          <span className="text-[11px] text-slate-500">
            Switch between campaigns to inspect guardrails & submit content
          </span>
        </div>

        {loading ? (
          <div className="p-4 text-center text-xs text-slate-500">
            Loading assigned campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
            <p className="font-semibold">No assigned campaigns found.</p>
            <p className="text-slate-500">
              Switch to the <strong>Campaigner</strong> tab to create brand briefs or use the demo switch to load pre-seeded campaigns.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {campaigns.map((camp) => {
              const isSelected = (selectedCampaign?.id === camp.id);
              return (
                <button
                  key={camp.id}
                  type="button"
                  onClick={() => {
                    setSelectedCampaignId(camp.id || '');
                    setStagedScript(''); // reset staged sample
                  }}
                  className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-500 shadow-xs ring-2 ring-indigo-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                        isSelected ? 'bg-indigo-200/60 text-indigo-900' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {camp.productType}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                      {camp.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-normal">
                      {camp.productDescription}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{camp.approvedClaims.length} Claims • {camp.requiredDisclosures.length} Disclosures</span>
                    <span className="font-semibold text-indigo-600 flex items-center gap-0.5">
                      Select <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Campaign Guardrails in Plain Language */}
      {selectedCampaign && (
        <CampaignGuardrailsCard
          campaign={selectedCampaign}
          onUseSampleScript={(script) => {
            setStagedScript(script);
            // Smoothly scroll down to submission section
            const el = document.getElementById('creator-submission-flow-card');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      )}

      {/* 4. Creator Submission & Steps 3-5 Audit Pipeline */}
      {selectedCampaign && (
        <CreatorSubmissionFlow
          campaign={selectedCampaign}
          initialScript={stagedScript}
          onScriptChange={(text) => setStagedScript(text)}
        />
      )}
    </div>
  );
};
