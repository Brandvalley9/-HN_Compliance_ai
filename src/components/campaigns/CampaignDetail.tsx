import React, { useState } from 'react';
import { Campaign } from '../../types/campaign';
import { MatchedRegulatorySection } from './MatchedRegulatorySection';
import { ComplianceEngineModal } from '../compliance/ComplianceEngineModal';
import { 
  ArrowLeft, 
  Edit3, 
  Calendar, 
  Share2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  Tag, 
  Users,
  Trash2,
  Bot
} from 'lucide-react';

interface CampaignDetailProps {
  campaign: Campaign;
  onEdit: () => void;
  onBack: () => void;
  onDelete?: () => void;
}

export const CampaignDetail: React.FC<CampaignDetailProps> = ({
  campaign,
  onEdit,
  onBack,
  onDelete
}) => {
  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);
  const formattedDate = campaign.createdAt 
    ? new Date(campaign.createdAt).toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }) 
    : 'Recently';

  return (
    <div id="campaign-detail-view" className="space-y-6">
      {/* Action Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Campaigns</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            id="run-ai-compliance-test-btn"
            type="button"
            onClick={() => setIsComplianceModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition-colors"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-600" />
            <span>Test AI Compliance</span>
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
          <button
            id="edit-campaign-btn"
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Campaign</span>
          </button>
        </div>
      </div>

      {/* Campaign Main Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
              {campaign.productType}
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1.5">
              {campaign.name}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>Created {formattedDate}</span>
          </div>
        </div>

        {/* Audience & Platforms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              Target Audience
            </span>
            <p className="text-xs text-slate-800 font-medium">
              {campaign.targetAudience}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Share2 className="w-3.5 h-3.5" />
              Target Platforms
            </span>
            <div className="flex flex-wrap gap-1.5">
              {campaign.platforms.map((p) => (
                <span
                  key={p}
                  className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Product Description */}
        <div className="pt-3 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mb-1">
            <FileText className="w-3.5 h-3.5" />
            Product / Service Description
          </span>
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/70">
            {campaign.productDescription}
          </p>
        </div>
      </div>

      {/* Claims Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Approved Claims */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Approved Claims ({campaign.approvedClaims.length})
            </h3>
          </div>
          {campaign.approvedClaims.length > 0 ? (
            <ul className="space-y-2">
              {campaign.approvedClaims.map((claim, idx) => (
                <li
                  key={idx}
                  className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-950 flex items-start gap-2"
                >
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>{claim}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-600 italic py-2">
              No approved claims registered for this campaign.
            </p>
          )}
        </div>

        {/* Prohibited Claims */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-600" />
              Prohibited Claims ({campaign.prohibitedClaims.length})
            </h3>
          </div>
          {campaign.prohibitedClaims.length > 0 ? (
            <ul className="space-y-2">
              {campaign.prohibitedClaims.map((claim, idx) => (
                <li
                  key={idx}
                  className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-100 text-xs text-rose-950 flex items-start gap-2"
                >
                  <span className="text-rose-600 font-bold">•</span>
                  <span>{claim}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-600 italic py-2">
              No prohibited claims registered.
            </p>
          )}
        </div>
      </div>

      {/* Required Disclosures */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-2xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-indigo-600" />
          Required Disclosures ({campaign.requiredDisclosures.length})
        </h3>
        {campaign.requiredDisclosures.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {campaign.requiredDisclosures.map((disc, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-medium text-indigo-900 font-mono"
              >
                {disc}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-600 italic py-2">
            No mandatory disclosures registered.
          </p>
        )}
      </div>

      {/* Instructions & Guidelines */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2 shadow-2xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Campaign Instructions & Creator Briefing
        </h3>
        {campaign.instructions ? (
          <pre className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
            {campaign.instructions}
          </pre>
        ) : (
          <p className="text-xs text-slate-600 italic py-1">
            No custom instructions added.
          </p>
        )}
      </div>

      {/* Relevant Regulatory Knowledge Entries Matched by Product Type & Context */}
      <MatchedRegulatorySection campaign={campaign} />

      {/* AI Compliance Reasoning Test Modal */}
      <ComplianceEngineModal
        campaign={campaign}
        isOpen={isComplianceModalOpen}
        onClose={() => setIsComplianceModalOpen(false)}
      />
    </div>
  );
};
