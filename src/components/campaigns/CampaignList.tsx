import React from 'react';
import { Campaign } from '../../types/campaign';
import { 
  Plus, 
  Megaphone, 
  Share2, 
  ChevronRight, 
  Calendar,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface CampaignListProps {
  campaigns: Campaign[];
  loading: boolean;
  onSelectCampaign: (campaign: Campaign) => void;
  onCreateNew: () => void;
}

export const CampaignList: React.FC<CampaignListProps> = ({
  campaigns,
  loading,
  onSelectCampaign,
  onCreateNew
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading campaigns from Firestore...</p>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center shadow-2xs space-y-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto shadow-2xs">
          <Megaphone className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">No campaigns created yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Create your first performance UGC campaign to define product details, platforms, approved claims, and disclosures.
          </p>
        </div>
        <button
          id="create-first-campaign-btn"
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create New Campaign</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">
            Your Active Campaigns ({campaigns.length})
          </h2>
          <p className="text-xs text-slate-500">
            Managed briefs stored in Cloud Firestore. Click any campaign to view or edit details.
          </p>
        </div>
        <button
          id="create-campaign-top-btn"
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Campaign</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {campaigns.map((campaign) => {
          const dateStr = campaign.createdAt 
            ? new Date(campaign.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })
            : 'Recent';

          return (
            <div
              key={campaign.id}
              onClick={() => onSelectCampaign(campaign)}
              className="group bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-xs p-4 sm:p-5 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                    {campaign.productType}
                  </span>
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {dateStr}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                  {campaign.name}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-2 max-w-2xl">
                  {campaign.productDescription}
                </p>

                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className="flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{campaign.approvedClaims.length} Approved</span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    <XCircle className="w-3 h-3 text-rose-600" />
                    <span>{campaign.prohibitedClaims.length} Prohibited</span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    <AlertTriangle className="w-3 h-3 text-indigo-600" />
                    <span>{campaign.requiredDisclosures.length} Disclosures</span>
                  </div>

                  {campaign.platforms.length > 0 && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      <Share2 className="w-3 h-3 text-slate-500" />
                      <span>{campaign.platforms.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-medium text-indigo-600 group-hover:translate-x-0.5 transition-transform shrink-0 self-end sm:self-center">
                <span>View / Edit</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
