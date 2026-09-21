import React, { useState } from 'react';
import { Campaign } from '../../types/campaign';
import { ComplianceReport } from '../../types/compliance';
import { submitForCompliance, sendComplianceFollowUpChat } from '../../lib/complianceService';
import { useAuth } from '../../context/AuthContext';
import { 
  Sparkles, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  RefreshCw,
  FileText,
  MessageSquare
} from 'lucide-react';

interface CreatorSubmissionFlowProps {
  campaign: Campaign;
  onSubmissionComplete?: (report: ComplianceReport) => void;
  onCancel?: () => void;
}

export const CreatorSubmissionFlow: React.FC<CreatorSubmissionFlowProps> = ({
  campaign,
  onSubmissionComplete,
  onCancel
}) => {
  const { user, userRole } = useAuth();
  const [contentText, setContentText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<ComplianceReport | null>(null);

  // Chat follow-up state
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentText.trim()) {
      setEvaluationError('Please enter draft content, script lines, or post caption to review.');
      return;
    }

    setEvaluationError(null);
    setIsEvaluating(true);

    try {
      const outcome = await submitForCompliance({
        campaign,
        submittedContentText: contentText,
        isDemoUser: user?.isDemo,
        demoRole: userRole || 'creator'
      });

      setActiveReport(outcome.report);
      if (onSubmissionComplete) {
        onSubmissionComplete(outcome.report);
      }
    } catch (err: unknown) {
      setEvaluationError(err instanceof Error ? err.message : 'Evaluation pipeline encountered an unexpected error.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeReport) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    const newHistory = [...chatMessages, { role: 'user' as const, content: userMsg }];
    setChatMessages(newHistory);
    setIsSendingChat(true);

    try {
      const reply = await sendComplianceFollowUpChat({
        campaign,
        submittedContentText: contentText,
        complianceResult: activeReport.aiReasoning,
        matchedRegulatoryEntries: activeReport.matchedRegulatoryEntries || [],
        conversationHistory: newHistory,
        userMessage: userMsg,
        demoRole: userRole || 'creator'
      });

      setChatMessages([...newHistory, { role: 'assistant', content: reply }]);
    } catch (err: unknown) {
      setChatMessages([
        ...newHistory,
        {
          role: 'assistant',
          content: err instanceof Error ? `Error: ${err.message}` : 'Failed to reach AI assistant.'
        }
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
            Automated Statutory Safety Check
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1">Submit Draft for {campaign.name}</h2>
          <p className="text-xs text-slate-500">
            Target: {campaign.productType} • Verified against ASA/CAP, CMA, and brand brief guardrails.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-500 hover:text-slate-800 underline self-start sm:self-auto"
          >
            Back to Campaign
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Campaign Requirements Summary Pillbox */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <span className="font-semibold text-slate-700 block mb-1">Required Disclosures</span>
            <div className="flex flex-wrap gap-1">
              {(campaign.requiredDisclosures || []).map((d, i) => (
                <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-mono text-[11px] border border-emerald-200">
                  {d}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="font-semibold text-slate-700 block mb-1">Approved Claims</span>
            <ul className="text-slate-600 list-disc list-inside space-y-0.5 text-[11px]">
              {(campaign.approvedClaims || []).slice(0, 2).map((c, i) => (
                <li key={i} className="truncate">{c}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className="font-semibold text-slate-700 block mb-1">Strictly Prohibited</span>
            <ul className="text-rose-600 list-disc list-inside space-y-0.5 text-[11px]">
              {(campaign.prohibitedClaims || []).slice(0, 2).map((p, i) => (
                <li key={i} className="truncate">{p}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Creator Draft Text / Script / Caption</span>
              <span className="text-[10px] text-slate-400 font-normal">{contentText.length}/5000 characters</span>
            </label>
            <textarea
              rows={6}
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              placeholder="Paste your caption, spoken script, or overlay text here... (e.g. 'Guys this serum completely transformed my morning routine! #ad')"
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900 leading-relaxed font-sans"
              disabled={isEvaluating}
            />
          </div>

          {evaluationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{evaluationError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isEvaluating || !contentText.trim()}
              className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors"
            >
              {isEvaluating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Executing Server Hardening Checks...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Run Pre-Check & Submit</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Evaluation Verdict Results */}
        {activeReport && (
          <div className="mt-8 pt-6 border-t border-slate-200 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Evaluation Verdict</span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    activeReport.aiReasoning.overall_status === 'GREEN'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : activeReport.aiReasoning.overall_status === 'AMBER'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {activeReport.aiReasoning.overall_status}
                </span>
              </div>
              {activeReport.id && (
                <span className="text-[10px] text-slate-400 font-mono">Report ID: {activeReport.id}</span>
              )}
            </div>

            {/* Findings List */}
            <div className="space-y-3">
              {(activeReport.aiReasoning.issues || []).map((issue, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                    issue.severity === 'HIGH'
                      ? 'bg-rose-50/50 border-rose-200 text-rose-950'
                      : issue.severity === 'MEDIUM'
                      ? 'bg-amber-50/50 border-amber-200 text-amber-950'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs">{issue.category}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-white border border-current opacity-80">
                      {issue.severity} Risk
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{issue.finding}</p>
                  {issue.evidence && (
                    <div className="text-[10px] bg-white/70 p-2 rounded-md font-mono text-slate-700 border border-black/5">
                      Excerpt: "{issue.evidence}"
                    </div>
                  )}
                  {issue.suggested_fix && (
                    <p className="text-[11px] text-indigo-900 font-medium">
                      💡 Suggested revision: {issue.suggested_fix}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Assistant Chat Flow */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <span>Need help fixing flagged copy? Ask Compliance Assistant</span>
              </div>

              {chatMessages.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {chatMessages.map((m, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-xl text-xs ${
                        m.role === 'user'
                          ? 'bg-slate-900 text-white ml-8'
                          : 'bg-white border border-slate-200 text-slate-800 mr-8 whitespace-pre-wrap'
                      }`}
                    >
                      {m.content}
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="e.g. 'Can you suggest an alternative script line that complies?'"
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  disabled={isSendingChat}
                />
                <button
                  type="submit"
                  disabled={isSendingChat || !chatInput.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
