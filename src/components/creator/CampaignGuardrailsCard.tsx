import React, { useState } from 'react';
import { Campaign } from '../../types/campaign';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  Info, 
  Share2, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Layers,
  Check,
  Ban,
  Tag
} from 'lucide-react';

interface CampaignGuardrailsCardProps {
  campaign: Campaign;
  onUseSampleScript?: (script: string) => void;
}

export const CampaignGuardrailsCard: React.FC<CampaignGuardrailsCardProps> = ({
  campaign,
  onUseSampleScript
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Generate a sample high-converting, compliant draft template based on approved claims
  const sampleCompliantScript = `Hey guys! Excited to share my daily routine featuring the ${campaign.name}. 
${campaign.approvedClaims[0] ? `What I love most is how it ${campaign.approvedClaims[0].toLowerCase()}` : 'It fits perfectly into my wellness routine'}.
${campaign.approvedClaims[1] ? `Plus, it's ${campaign.approvedClaims[1].toLowerCase()}` : ''}.
Check out the link in my bio to learn more!
${campaign.requiredDisclosures.join(' ')}`;

  // Generate a sample high-risk draft to show how violations trigger
  const sampleViolationScript = `OMG you guys, this new ${campaign.name} literally ${campaign.prohibitedClaims[0] ? campaign.prohibitedClaims[0].toLowerCase() : 'cures everything overnight'}! 100% risk free guaranteed results, check the bio link right now!`;

  return (
    <div 
      id="campaign-guardrails-card" 
      className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all"
    >
      {/* Header with toggle */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-6 py-4 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30 border-b border-slate-200/80 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 shadow-2xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Campaign Guardrails & Compliance Brief
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100/70 text-indigo-800 border border-indigo-200">
                {campaign.productType}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Plain-language rules for approved benefits, strictly forbidden claims, and required legal disclosures.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            {isExpanded ? 'Collapse Guardrails' : 'View Guardrails'}
          </span>
          <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Target Platforms & Creator Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Target Platforms */}
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/60 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                Target Platforms
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {campaign.platforms.map((plat) => (
                  <span 
                    key={plat}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-white text-slate-800 border border-slate-200 shadow-2xs"
                  >
                    {plat}
                  </span>
                ))}
              </div>
            </div>

            {/* Creator Instructions in Plain Language */}
            <div className="md:col-span-2 p-4 rounded-xl bg-slate-50/70 border border-slate-200/60 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-600" />
                Plain-Language Creator Instructions
              </span>
              <p className="text-xs text-slate-700 leading-relaxed font-normal">
                {campaign.instructions || 'Follow authentic UGC guidelines. Deliver your honest personal experience without exaggerating product speed or efficacy.'}
              </p>
            </div>
          </div>

          {/* Core Guardrails 3-Column Bento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Approved Claims (DOs) */}
            <div 
              id="guardrails-approved-claims" 
              className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200/70 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Approved Claims (What You CAN Say)
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                    {campaign.approvedClaims.length} Approved
                  </span>
                </div>

                <p className="text-[11px] text-emerald-800/90 leading-normal">
                  These claims are substantiated by brand clinical testing or regulatory approval. Highlight them in your copy:
                </p>

                <ul className="space-y-2 pt-1">
                  {campaign.approvedClaims.map((claim, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-emerald-950 font-medium bg-white/80 p-2 rounded-lg border border-emerald-100 shadow-2xs">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>"{claim}"</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 text-[10px] text-emerald-700 font-medium">
                💡 Tip: Use your natural voice to describe these key benefits.
              </div>
            </div>

            {/* 2. Prohibited Claims (DON'Ts) */}
            <div 
              id="guardrails-prohibited-claims" 
              className="p-4 rounded-xl bg-rose-50/40 border border-rose-200/70 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                    Forbidden Claims (What You CANNOT Say)
                  </span>
                  <span className="text-[10px] font-semibold text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded-full border border-rose-200">
                    {campaign.prohibitedClaims.length} Prohibited
                  </span>
                </div>

                <p className="text-[11px] text-rose-800/90 leading-normal">
                  Strictly avoid these phrases or implies. They violate advertising statutes (CAP, ASA, FTC) and will trigger an instant RED/AMBER flag:
                </p>

                <ul className="space-y-2 pt-1">
                  {campaign.prohibitedClaims.map((claim, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-rose-950 font-medium bg-white/80 p-2 rounded-lg border border-rose-100 shadow-2xs">
                      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span>"{claim}"</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 text-[10px] text-rose-700 font-medium">
                ⚠️ Avoid absolute guarantees like "100% cure" or "permanent overnight fix".
              </div>
            </div>

            {/* 3. Required Legal Disclosures */}
            <div 
              id="guardrails-required-disclosures" 
              className="p-4 rounded-xl bg-amber-50/40 border border-amber-200/70 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-amber-600 shrink-0" />
                    Mandatory Disclosures
                  </span>
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                    {campaign.requiredDisclosures.length} Required
                  </span>
                </div>

                <p className="text-[11px] text-amber-800/90 leading-normal">
                  You MUST include these exact disclosures visibly in your caption or on-screen text before posting:
                </p>

                <ul className="space-y-2 pt-1">
                  {campaign.requiredDisclosures.map((disc, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-amber-950 font-medium bg-white/80 p-2 rounded-lg border border-amber-100 shadow-2xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="font-mono text-amber-900 font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                        {disc}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 text-[10px] text-amber-800 font-medium">
                📌 Rule: Disclosures must be visible immediately (above the "more" button).
              </div>
            </div>
          </div>

          {/* Quick Test Prompt Templates */}
          {onUseSampleScript && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-slate-600 font-medium flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Want to test? Load a sample script into the submission box:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUseSampleScript(sampleCompliantScript)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold text-[11px] transition-colors"
                >
                  Load Compliant Draft (GREEN)
                </button>
                <button
                  type="button"
                  onClick={() => onUseSampleScript(sampleViolationScript)}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-semibold text-[11px] transition-colors"
                >
                  Load Violation Draft (RED)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
