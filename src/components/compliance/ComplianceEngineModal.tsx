import React, { useState } from 'react';
import { Campaign } from '../../types/campaign';
import { MatchedRegulatoryEntry } from '../../types/regulatory';
import { 
  DeterministicFinding, 
  ComplianceReasoningResult, 
  ComplianceIssue,
  IssueSeverity
} from '../../types/compliance';
import { 
  evaluateDeterministicRules, 
  runAIComplianceReasoning, 
  saveComplianceReport 
} from '../../lib/complianceService';
import { getRelevantRegulatoryEntries } from '../../lib/regulatoryService';
import { useAuth } from '../../context/AuthContext';
import { 
  Bot, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  FileText, 
  Send, 
  ArrowRight,
  Bookmark,
  RefreshCw,
  Scale,
  ExternalLink,
  UserCheck
} from 'lucide-react';

interface ComplianceEngineModalProps {
  campaign: Campaign;
  isOpen: boolean;
  onClose: () => void;
}

export const ComplianceEngineModal: React.FC<ComplianceEngineModalProps> = ({
  campaign,
  isOpen,
  onClose
}) => {
  const { user } = useAuth();

  // Content text input
  const [contentText, setContentText] = useState(
    `Hey everyone! I've been testing this new serum for 3 days and honestly it cured all my blemishes overnight! 100% risk free guaranteed results. Check out the link in bio #ad`
  );

  // States for pipeline
  const [isRunning, setIsRunning] = useState(false);
  const [stepStatus, setStepStatus] = useState<'idle' | 'deterministic' | 'retrieval' | 'reasoning' | 'completed'>('idle');
  const [deterministicFindings, setDeterministicFindings] = useState<DeterministicFinding[]>([]);
  const [matchedRules, setMatchedRules] = useState<MatchedRegulatoryEntry[]>([]);
  const [aiResult, setAiResult] = useState<ComplianceReasoningResult | null>(null);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunPipeline = async () => {
    if (!contentText.trim()) {
      setErrorMessage('Please provide content text or transcript to analyze.');
      return;
    }

    setIsRunning(true);
    setErrorMessage(null);
    setAiResult(null);
    setSavedReportId(null);

    try {
      // Step 3: Run Deterministic Rule Engine
      setStepStatus('deterministic');
      const detFindings = evaluateDeterministicRules(campaign, contentText);
      setDeterministicFindings(detFindings);

      // Gate: Check if campaign completeness check failed
      const incompleteFinding = detFindings.find(f => f.ruleCategory === 'campaign_incomplete');
      if (incompleteFinding) {
        setErrorMessage(
          incompleteFinding.message || 
          'This campaign brief is incomplete. The campaign must be completed by the campaigner (target audience, platforms, and product type required) before content can be checked.'
        );
        setIsRunning(false);
        setStepStatus('idle');
        return;
      }

      // Step 4: Retrieve Matched Regulatory Knowledge Entries
      setStepStatus('retrieval');
      const contextItems: string[] = [
        ...campaign.approvedClaims,
        ...campaign.prohibitedClaims,
        ...campaign.requiredDisclosures,
        campaign.targetAudience,
        campaign.productDescription
      ].filter(Boolean);

      const retrievedRules = await getRelevantRegulatoryEntries({
        productType: campaign.productType,
        topicContext: contextItems
      }, user?.isDemo);
      setMatchedRules(retrievedRules);

      // Step 5: Call Gemini AI Compliance Reasoning
      setStepStatus('reasoning');
      const aiResponse = await runAIComplianceReasoning({
        campaign,
        submittedContentText: contentText,
        deterministicFindings: detFindings,
        matchedRegulatoryEntries: retrievedRules
      });

      setAiResult(aiResponse);

      // Save the validated report
      const reportId = await saveComplianceReport({
        campaignId: campaign.id,
        creatorId: user?.uid || 'creator',
        submittedContentText: contentText,
        deterministicFindings: detFindings,
        matchedRegulatoryEntries: retrievedRules,
        aiReasoning: aiResponse,
        warning: aiResponse.warning
      }, user?.isDemo);

      setSavedReportId(reportId);
      setStepStatus('completed');
    } catch (err: any) {
      console.error('Compliance pipeline error:', err);
      setErrorMessage(err.message || 'An error occurred during compliance reasoning.');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusBadge = (status: 'GREEN' | 'AMBER' | 'RED') => {
    switch (status) {
      case 'GREEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            STATUS: GREEN (COMPLIANT)
          </span>
        );
      case 'AMBER':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            STATUS: AMBER (REVISIONS NEEDED)
          </span>
        );
      case 'RED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            STATUS: RED (HIGH-RISK VIOLATION)
          </span>
        );
    }
  };

  const getSeverityBadge = (severity: IssueSeverity) => {
    switch (severity) {
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            HIGH SEVERITY
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            MEDIUM SEVERITY
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            LOW SEVERITY
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="compliance-reasoning-modal" 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl my-8 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                AI Compliance Reasoning Pipeline
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  Gemini Flash + Curated Rules
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Campaign: <span className="font-semibold text-slate-700">{campaign.name}</span> ({campaign.productType})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Input Section */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              Submitted UGC Content / Script / Transcript Text
            </label>
            <textarea
              id="submitted-content-text"
              rows={4}
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              placeholder="Paste creator caption, script, or video audio transcription here..."
              className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed text-slate-900"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {contentText.length} characters • Analyzed against campaign brief & curated regulatory knowledge
              </span>
              <button
                id="run-compliance-pipeline-btn"
                type="button"
                onClick={handleRunPipeline}
                disabled={isRunning}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Reasoning Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run AI Compliance Reasoning</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Progress Tracker when running */}
          {isRunning && (
            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2.5">
              <div className="text-xs font-bold text-indigo-950 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                Pipeline Progress
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className={`p-2 rounded border ${stepStatus === 'deterministic' ? 'bg-white border-indigo-400 font-bold text-indigo-900' : 'bg-indigo-100/50 text-indigo-700 border-indigo-200'}`}>
                  1. Deterministic Rules
                </div>
                <div className={`p-2 rounded border ${stepStatus === 'retrieval' ? 'bg-white border-indigo-400 font-bold text-indigo-900' : 'bg-indigo-100/50 text-indigo-700 border-indigo-200'}`}>
                  2. Regulatory Retrieval
                </div>
                <div className={`p-2 rounded border ${stepStatus === 'reasoning' ? 'bg-white border-indigo-400 font-bold text-indigo-900' : 'bg-indigo-100/50 text-indigo-700 border-indigo-200'}`}>
                  3. Gemini AI Reasoning
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Execution Error</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* AI Reasoning Results */}
          {aiResult && (
            <div id="ai-reasoning-results-container" className="space-y-6 pt-2">
              {/* Fallback Warning Banner */}
              {aiResult.warning && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-2xs">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      Rule-Based Fallback Mode
                    </p>
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                      This result was generated from rule checks only — Gemini was unavailable and did not review this submission.
                    </p>
                  </div>
                </div>
              )}

              {/* Status Banner */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(aiResult.overall_status)}
                    {aiResult.human_review_required ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                        <UserCheck className="w-3 h-3" />
                        Human Review Required
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Auto-Approved / No Review Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {aiResult.issues.length === 0 
                      ? 'No compliance violations detected. The draft conforms with campaign guidelines.'
                      : `Identified ${aiResult.issues.length} compliance ${aiResult.issues.length === 1 ? 'issue' : 'issues'} requiring attention.`
                    }
                  </p>
                </div>

                {savedReportId && (
                  <span className="text-[10px] font-mono text-slate-500 bg-white px-2.5 py-1 rounded border border-slate-200">
                    Report ID: {savedReportId}
                  </span>
                )}
              </div>

              {/* Issues List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                  <span>Identified Compliance Findings ({aiResult.issues.length})</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Grounding: Citations restricted to matched regulatory rules
                  </span>
                </h3>

                {aiResult.issues.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Great job! No regulatory or brand brief conflicts were found in this submission.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {aiResult.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition-colors space-y-3 shadow-2xs"
                      >
                        {/* Issue Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {getSeverityBadge(issue.severity)}
                            <span className="text-xs font-bold text-slate-900">
                              {issue.category}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            Confidence: {Math.round(issue.confidence * 100)}%
                          </div>
                        </div>

                        {/* Finding */}
                        <div className="text-xs text-slate-800 leading-relaxed font-medium">
                          {issue.finding}
                        </div>

                        {/* Evidence quote */}
                        {issue.evidence && (
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                              Evidence in text:
                            </span>
                            <span className="font-mono text-slate-900 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 text-[11px]">
                              "{issue.evidence}"
                            </span>
                          </div>
                        )}

                        {/* Suggested Fix */}
                        <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950">
                          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-0.5">
                            Suggested Fix:
                          </span>
                          <span>{issue.suggested_fix}</span>
                        </div>

                        {/* Grounded Regulatory References */}
                        {issue.regulatory_references && issue.regulatory_references.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <Scale className="w-3 h-3 text-slate-400" />
                              Grounded Statute Reference:
                            </span>
                            {issue.regulatory_references.map((ref, rIdx) => (
                              <span
                                key={rIdx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                              >
                                <Bookmark className="w-2.5 h-2.5 text-amber-700" />
                                {ref}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Context Summary: Deterministic & Matched Rules Used */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Deterministic Rule Findings: {deterministicFindings.length}
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {deterministicFindings.map((d, i) => (
                      <div key={i} className="text-[11px] flex items-center justify-between text-slate-600">
                        <span className="truncate max-w-[200px]">{d.ruleName}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${d.status === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {d.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide flex items-center gap-1">
                    <Bookmark className="w-3 h-3 text-amber-600" />
                    Matched Curated Rules Provided: {matchedRules.length}
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {matchedRules.length === 0 ? (
                      <span className="text-[11px] text-slate-400">No regulatory entries provided</span>
                    ) : (
                      matchedRules.map((m, i) => (
                        <div key={i} className="text-[11px] flex items-center justify-between text-slate-600 truncate">
                          <span className="truncate">{m.source} {m.sectionRef}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Powered by Google GenAI (gemini-3.8-flash) • Strict regulatory grounding
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
