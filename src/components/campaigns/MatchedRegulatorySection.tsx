import React, { useState, useEffect } from 'react';
import { Campaign } from '../../types/campaign';
import { MatchedRegulatoryEntry } from '../../types/regulatory';
import { getRelevantRegulatoryEntries } from '../../lib/regulatoryService';
import { useAuth } from '../../context/AuthContext';
import { 
  BookOpen, 
  Bookmark, 
  ExternalLink, 
  Tag, 
  Sparkles, 
  ChevronRight,
  ShieldAlert,
  Info
} from 'lucide-react';

interface MatchedRegulatorySectionProps {
  campaign: Campaign;
}

export const MatchedRegulatorySection: React.FC<MatchedRegulatorySectionProps> = ({ campaign }) => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchedRegulatoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadMatchedRules() {
      setLoading(true);
      try {
        // Collect topic context from campaign: claims, disclosures, description, audience
        const contextItems: string[] = [
          ...campaign.approvedClaims,
          ...campaign.prohibitedClaims,
          ...campaign.requiredDisclosures,
          campaign.targetAudience,
          campaign.productDescription
        ].filter(Boolean);

        const results = await getRelevantRegulatoryEntries({
          productType: campaign.productType,
          topicContext: contextItems
        }, user?.isDemo);

        if (isMounted) {
          setMatches(results);
        }
      } catch (err) {
        console.warn('Failed to match regulatory entries:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadMatchedRules();

    return () => {
      isMounted = false;
    };
  }, [campaign, user?.isDemo]);

  return (
    <div id="matched-regulatory-section" className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 uppercase tracking-wide">
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              Relevant Regulatory Knowledge
            </span>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {matches.length} {matches.length === 1 ? 'Rule Matched' : 'Rules Matched'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Matched from your curated Regulatory Knowledge base by product type (<span className="font-semibold text-slate-700">{campaign.productType}</span>) and campaign topic context.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <span>Retrieving relevant regulatory entries...</span>
        </div>
      ) : matches.length === 0 ? (
        <div className="p-5 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center space-y-1">
          <Info className="w-5 h-5 text-slate-400 mx-auto" />
          <p className="text-xs font-medium text-slate-700">No specific regulatory entries matched this campaign context</p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            You can add new standards in the Reviewer Portal or add more context tags to the campaign brief.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {matches.map((matched, idx) => (
            <div
              key={`${matched.source}-${matched.sectionRef}-${idx}`}
              className="p-4 rounded-lg bg-amber-50/40 border border-amber-200/70 hover:border-amber-300 transition-colors space-y-2.5"
            >
              {/* Header: Source & Section Reference */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 uppercase tracking-wide">
                    <Bookmark className="w-3 h-3 text-amber-700" />
                    {matched.source}
                  </span>
                  <span className="text-xs font-semibold text-slate-800 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                    {matched.sectionRef}
                  </span>
                  {matched.documentName && (
                    <span className="text-xs text-slate-600 font-medium hidden md:inline truncate max-w-xs">
                      • {matched.documentName}
                    </span>
                  )}
                </div>

                {matched.sourceUrl && (
                  <a
                    href={matched.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 hover:text-amber-950 transition-colors"
                  >
                    <span>View Statute</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Summary */}
              <p className="text-xs text-slate-800 leading-relaxed bg-white p-3 rounded-md border border-slate-200/80">
                {matched.summary}
              </p>

              {/* Matched tags */}
              {matched.matchedTopicTags && matched.matchedTopicTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 text-[11px] pt-0.5">
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Matched Tags:
                  </span>
                  {matched.matchedTopicTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100/80 text-amber-900 border border-amber-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
