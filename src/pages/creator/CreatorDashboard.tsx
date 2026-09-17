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
  CheckCircle2, 
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
      {/* 1. Spatial Header Banner */}
      <div id="creator-header-card" className="glass-surface rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                <UserCheck className="w-3.5 h-3.5" />
                Role: Creator Studio
              </span>
              <span className="text-xs text-slate-400">
                Logged in as <span className="font-semibold text-slate-200">{user?.displayName || user?.email || 'Demo Creator'}</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Pre-Flight UGC Compliance
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Scan scripts and captions against verified FTC/ASA guardrails in real time with interactive Gemini reasoning.
            </p>
          </div>

          {/* Campaign Count Badge */}
          <div className="flex items-center gap-3 bg-black/40 border border-white/10 p-3.5 rounded-2xl shrink-0 backdrop-blur-md">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Campaigns
              </span>
              <span className="text-base font-bold text-white">
                {campaigns.length} Assigned
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Spatial Campaign Selector */}
      <div id="assigned-campaigns-selector" className="glass-surface rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Select Brand Brief
          </h2>
          <span className="text-xs text-slate-400">
            Click to inspect guardrails & run spatial analysis
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Loading assigned briefs...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-2">
            <p className="font-semibold">No assigned campaigns found.</p>
            <p className="text-slate-400">
              Switch to <strong>Campaigner</strong> tab to create brand briefs.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {campaigns.map((camp) => {
              const isSelected = selectedCampaign?.id === camp.id;
              return (
                <button
                  key={camp.id}
                  type="button"
                  onClick={() => {
                    setSelectedCampaignId(camp.id || '');
                    setStagedScript('');
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500/60 shadow-[0_0_20px_rgba(99,102,241,0.25)] ring-1 ring-indigo-400/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                        isSelected ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/30' : 'bg-white/5 text-slate-400'
                      }`}>
                        {camp.productType}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Selected
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white line-clamp-1">
                      {camp.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {camp.productDescription}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{camp.approvedClaims?.length || 0} Claims • {camp.requiredDisclosures?.length || 0} Disclosures</span>
                    <span className="font-semibold text-indigo-400 flex items-center gap-0.5">
                      Select <ChevronRight className="w-3.5 h-3.5" />
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
            const el = document.getElementById('creator-submission-flow-card');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      )}

      {/* 4. Creator Submission & Spatial Scan Pipeline */}
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
