import React, { useState, useEffect } from 'react';
import { Campaign } from '../../types/campaign';
import { ComplianceReport } from '../../types/compliance';
import { previewCompliance } from '../../lib/complianceService';
import { getAllCampaigns } from '../../lib/campaignService';
import { useAuth } from '../../context/AuthContext';
import { ComplianceOrb } from './ComplianceOrb';
import { 
  X, 
  Sparkles, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  FileText 
} from 'lucide-react';

interface ComplianceEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCampaignId?: string;
}

export const ComplianceEngineModal: React.FC<ComplianceEngineModalProps> = ({
  isOpen,
  onClose,
  defaultCampaignId
}) => {
  const { user, userRole } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(defaultCampaignId || '');
  const [draftContent, setDraftContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ComplianceReport | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    async function loadCampaigns() {
      try {
        const list = await getAllCampaigns(user?.isDemo);
        setCampaigns(list);
        if (!selectedCampaignId && list.length > 0) {
          setSelectedCampaignId(defaultCampaignId || list[0].id);
        }
      } catch (err: unknown) {
        console.error('Failed to load campaigns:', err);
      }
    }
    loadCampaigns();
  }, [isOpen, defaultCampaignId, user?.isDemo]);

  if (!isOpen) return null;

  const activeCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  const handleRunEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCampaign) {
      setError('Please select a campaign to evaluate against.');
      return;
    }
    if (!draftContent.trim()) {
      setError('Please provide content or draft copy to evaluate.');
      return;
    }

    setError(null);
    setIsAnalyzing(true);

    try {
      const generatedReport = await previewCompliance({
        campaign: activeCampaign,
        submittedContentText: draftContent,
        isDemoUser: user?.isDemo,
        demoRole: userRole || 'campaigner'
      });
      setReport(generatedReport);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Evaluation failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Sandbox Compliance Engine</h2>
              <p className="text-[11px] text-slate-500">
                Dry-run simulation against deterministic rules and regulatory context
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Controls Form */}
          <form onSubmit={handleRunEvaluation} className="space-y-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Campaign Target</label>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.productType})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex justify-between">
                <span>Test Copy or Script</span>
                <span className="text-[10px] text-slate-400 font-normal">{draftContent.length}/5000 characters</span>
              </label>
              <textarea
                rows={4}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder="Type or paste draft copy to run a dry-run check..."
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900 leading-relaxed font-sans"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="submit"
                disabled={isAnalyzing || !draftContent.trim()}
                className="py-2 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    <span>Evaluating Copy...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Run Dry Run</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Results Display */}
          {report && (
            <div className="pt-6 border-t border-slate-200 space-y-5">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Simulation Verdict
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">
                      Status: {report.aiReasoning.overall_status}
                    </span>
                    {report.aiReasoning.human_review_required && (
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Reviewer Escalation Required
                      </span>
                    )}
                  </div>
                </div>
                <ComplianceOrb status={report.aiReasoning.overall_status} size="sm" showLabel={false} />
              </div>

              {/* Deterministic checks */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                  Deterministic Hard Gates
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {report.deterministicFindings.map((df, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                        df.status === 'PASS'
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50/50 border-rose-200 text-rose-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {df.status === 'PASS' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        )}
                        <span>{df.message}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase">{df.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Reasoning Findings */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                  AI Contextual Findings & Statues
                </span>
                <div className="space-y-2.5">
                  {(report.aiReasoning.issues || []).map((issue, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{issue.category}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm border ${
                            issue.severity === 'HIGH'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {issue.severity}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{issue.finding}</p>
                      {issue.suggested_fix && (
                        <p className="text-indigo-600 text-[10px] font-medium pt-1 border-t border-slate-100">
                          Fix suggestion: {issue.suggested_fix}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold rounded-xl text-xs transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
