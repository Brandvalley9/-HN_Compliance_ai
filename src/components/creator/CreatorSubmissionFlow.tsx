import React, { useState } from 'react';
import { Campaign } from '../../types/campaign';
import { MatchedRegulatoryEntry } from '../../types/regulatory';
import { 
  DeterministicFinding, 
  ComplianceReasoningResult,
  IssueSeverity,
  FollowUpChatMessage,
  SubmissionHistoryItem
} from '../../types/compliance';
import { 
  evaluateDeterministicRules, 
  runAIComplianceReasoning, 
  saveComplianceReport 
} from '../../lib/complianceService';
import { getRelevantRegulatoryEntries } from '../../lib/regulatoryService';
import { useAuth } from '../../context/AuthContext';
import { FollowUpChatSection } from './FollowUpChatSection';
import { 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  UserCheck, 
  ArrowRight,
  ShieldCheck,
  Scale,
  History,
  RotateCcw,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Edit3
} from 'lucide-react';

interface CreatorSubmissionFlowProps {
  campaign: Campaign;
  initialScript?: string;
  onScriptChange?: (val: string) => void;
  onAnalysisCompleted?: () => void;
}

export const CreatorSubmissionFlow: React.FC<CreatorSubmissionFlowProps> = ({
  campaign,
  initialScript = '',
  onScriptChange,
  onAnalysisCompleted
}) => {
  const { user } = useAuth();

  // Current draft text inside the editor
  const [scriptText, setScriptText] = useState(
    initialScript ||
    `Hey guys! Loving the ${campaign.name}. It hydrates skin for 24 hours and honestly cured my blemishes overnight! 100% risk free guaranteed. Check out the link in bio #ad`
  );

  // Sync external sample changes
  React.useEffect(() => {
    if (initialScript) {
      setScriptText(initialScript);
    }
  }, [initialScript]);

  const handleTextChange = (val: string) => {
    setScriptText(val);
    if (onScriptChange) onScriptChange(val);
  };

  // Pipeline Execution States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState<3 | 4 | 5 | null>(null);
  const [stepStatusText, setStepStatusText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Submission History (Newest first: index 0 is current latest version)
  const [history, setHistory] = useState<SubmissionHistoryItem[]>([]);
  // Expand/collapse states for historical cards
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});

  // Reset or initialize history when campaign changes
  React.useEffect(() => {
    // When switching campaigns, we keep fresh session state
  }, [campaign.id]);

  const toggleHistoryExpanded = (id: string) => {
    setExpandedHistoryIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Helper to add follow-up chat message to a specific submission version
  const handleAddChatMessage = (versionId: string, message: FollowUpChatMessage) => {
    setHistory(prev =>
      prev.map(item => {
        if (item.id === versionId) {
          return {
            ...item,
            chatMessages: [...item.chatMessages, message]
          };
        }
        return item;
      })
    );
  };

  // Execute Steps 3 -> 5 Pipeline
  const runPipelineForText = async (textToEvaluate: string, isRecheck: boolean = false) => {
    if (!textToEvaluate.trim()) {
      setErrorMessage('Please enter your caption or script text before submitting.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // -------------------------------------------------------------
      // Step 3: Run Deterministic Rule Engine
      // -------------------------------------------------------------
      setActiveStep(3);
      setStepStatusText('Step 3: Checking mandatory disclosures and prohibited claims...');
      await new Promise(r => setTimeout(r, 200));
      const deterministicFindings = evaluateDeterministicRules(campaign, textToEvaluate);

      // Gate: Check if campaign completeness check failed
      const incompleteFinding = deterministicFindings.find(f => f.ruleCategory === 'campaign_incomplete');
      if (incompleteFinding) {
        setErrorMessage(
          incompleteFinding.message || 
          'This campaign brief is incomplete. The campaign must be completed by the campaigner (target audience, platforms, and product type required) before content can be checked.'
        );
        setIsSubmitting(false);
        setActiveStep(null);
        setStepStatusText('');
        return;
      }

      // -------------------------------------------------------------
      // Step 4: Retrieve Matched Regulatory Knowledge Entries
      // -------------------------------------------------------------
      setActiveStep(4);
      setStepStatusText('Step 4: Retrieving matched regulatory statutes (ASA, CAP, FTC, CMA)...');
      const topicContext = [
        ...campaign.approvedClaims,
        ...campaign.prohibitedClaims,
        ...campaign.requiredDisclosures,
        campaign.targetAudience,
        campaign.productDescription
      ].filter(Boolean);

      const matchedEntries = await getRelevantRegulatoryEntries({
        productType: campaign.productType,
        topicContext
      }, user?.isDemo);

      // -------------------------------------------------------------
      // Step 5: Execute AI Compliance Reasoning via Gemini
      // -------------------------------------------------------------
      setActiveStep(5);
      setStepStatusText('Step 5: Evaluating compliance reasoning & generating plain-language fixes with Gemini...');
      const reasoningResult = await runAIComplianceReasoning({
        campaign,
        submittedContentText: textToEvaluate,
        deterministicFindings,
        matchedRegulatoryEntries: matchedEntries
      });

      // Persist the verified report to database
      const reportId = await saveComplianceReport({
        campaignId: campaign.id,
        campaignName: campaign.name,
        creatorId: user?.uid || 'creator-demo-id',
        creatorHandle: user?.email ? `@${user.email.split('@')[0]}` : '@demo_creator',
        submittedContentText: textToEvaluate,
        deterministicFindings,
        matchedRegulatoryEntries: matchedEntries,
        aiReasoning: reasoningResult,
        warning: reasoningResult.warning
      }, user?.isDemo);

      // Calculate next version number
      const nextVersion = history.length + 1;
      const newHistoryItem: SubmissionHistoryItem = {
        id: reportId || `submission-v${nextVersion}-${Date.now()}`,
        versionNumber: nextVersion,
        submittedContentText: textToEvaluate,
        deterministicFindings,
        matchedRegulatoryEntries: matchedEntries,
        aiReasoning: reasoningResult,
        createdAt: new Date().toISOString(),
        chatMessages: [],
        warning: reasoningResult.warning
      };

      // Add as newest at index 0
      setHistory(prev => [newHistoryItem, ...prev]);

      // Automatically keep the latest version expanded
      setExpandedHistoryIds(prev => ({
        ...prev,
        [newHistoryItem.id]: true
      }));

      if (onAnalysisCompleted) onAnalysisCompleted();

      // Scroll smoothly to results
      setTimeout(() => {
        const resultsEl = document.getElementById(`submission-result-version-${newHistoryItem.versionNumber}`);
        if (resultsEl) resultsEl.scrollIntoView({ behavior: 'smooth' });
      }, 150);

    } catch (err: any) {
      console.error('Submission pipeline error:', err);
      setErrorMessage(err.message || 'Failed to complete compliance evaluation pipeline.');
    } finally {
      setIsSubmitting(false);
      setActiveStep(null);
      setStepStatusText('');
    }
  };

  const handleSubmitScript = (e: React.FormEvent) => {
    e.preventDefault();
    runPipelineForText(scriptText, false);
  };

  // Prepopulate draft editor from chat suggestion or previous version and scroll up to editor
  const handleLoadTextIntoEditor = (text: string) => {
    setScriptText(text);
    if (onScriptChange) onScriptChange(text);
    const editor = document.getElementById('creator-script-input');
    if (editor) {
      editor.scrollIntoView({ behavior: 'smooth' });
      editor.focus();
    }
  };

  const getStatusBadge = (status: 'GREEN' | 'AMBER' | 'RED') => {
    switch (status) {
      case 'GREEN':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>STATUS: GREEN (READY TO POST)</span>
          </div>
        );
      case 'AMBER':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>STATUS: AMBER (REVISIONS NEEDED)</span>
          </div>
        );
      case 'RED':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>STATUS: RED (NON-COMPLIANT)</span>
          </div>
        );
    }
  };

  const getSeverityPill = (severity: IssueSeverity) => {
    switch (severity) {
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            High Severity Risk
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Medium Severity
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Low Severity Suggestion
          </span>
        );
    }
  };

  return (
    <div id="creator-submission-flow-card" className="space-y-6">
      {/* Draft Submission & Revision Editor Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {history.length > 0 ? 'Revise Draft & Re-Check' : 'Submit Draft for Compliance Verification'}
              </h2>
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                Steps 3 → 5 Pipeline
              </span>
              {history.length > 0 && (
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  Current Draft: v{history.length + 1}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit your script, caption, or video voiceover draft. Use the "Re-Check" button to run revised versions while retaining previous versions in history.
            </p>
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
            Campaign: <span className="font-semibold text-slate-800">{campaign.name}</span>
          </div>
        </div>

        {/* Submission Form */}
        <form onSubmit={handleSubmitScript} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="creator-script-input" className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                Script / Caption Text (Draft Editor)
              </label>
              <span className="text-[11px] text-slate-500">
                {scriptText.length} characters
              </span>
            </div>

            <textarea
              id="creator-script-input"
              rows={5}
              value={scriptText}
              onChange={(e) => handleTextChange(e.target.value)}
              disabled={isSubmitting}
              placeholder="Type or paste your UGC draft caption or script here (e.g., 'Loving this serum! #ad')..."
              className="w-full text-xs p-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed text-slate-900 disabled:bg-slate-50 disabled:text-slate-500 transition-all shadow-inner"
            />
          </div>

          {/* Action Controls & Pipeline Runner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Full Steps 3-5 analysis against {campaign.requiredDisclosures.length} disclosures and {campaign.prohibitedClaims.length} prohibited claims</span>
            </div>

            <div className="flex items-center gap-2">
              {history.length > 0 ? (
                <button
                  id="recheck-compliance-btn"
                  type="submit"
                  disabled={isSubmitting || !scriptText.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors shrink-0"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Re-Running Pipeline (Steps 3–5)...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-200" />
                      <span>Re-Check Revised Draft (v{history.length + 1})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  id="submit-creator-draft-btn"
                  type="submit"
                  disabled={isSubmitting || !scriptText.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors shrink-0"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Running Compliance Pipeline...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-indigo-200" />
                      <span>Submit & Run Compliance Audit</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Pipeline Active Step Tracker */}
        {isSubmitting && (
          <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200 space-y-3 animate-pulse">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                {stepStatusText}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div className={`p-2.5 rounded-lg border text-center transition-colors ${activeStep === 3 ? 'bg-white border-indigo-500 font-bold text-indigo-950 shadow-2xs' : 'bg-indigo-100/50 text-indigo-700 border-indigo-200'}`}>
                Step 3: Deterministic Rules
              </div>
              <div className={`p-2.5 rounded-lg border text-center transition-colors ${activeStep === 4 ? 'bg-white border-indigo-500 font-bold text-indigo-950 shadow-2xs' : 'bg-indigo-100/50 text-indigo-700 border-indigo-200'}`}>
                Step 4: Regulatory Retrieval
              </div>
              <div className={`p-2.5 rounded-lg border text-center transition-colors ${activeStep === 5 ? 'bg-white border-indigo-500 font-bold text-indigo-950 shadow-2xs' : 'bg-indigo-100/50 text-indigo-700 border-indigo-200'}`}>
                Step 5: Gemini Reasoning
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Evaluation Error</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* RESULTS STREAM WITH HISTORY & SCOPED FOLLOW-UP CHAT */}
      {history.length > 0 && (
        <div id="creator-compliance-results-stream" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              Submission Versions & Audit History ({history.length} {history.length === 1 ? 'Version' : 'Versions'})
            </h3>
            <span className="text-xs text-slate-500">
              Each version has its own scoped follow-up chat and audit report
            </span>
          </div>

          {history.map((item, index) => {
            const isLatest = index === 0;
            const isExpanded = expandedHistoryIds[item.id] ?? isLatest;

            return (
              <div
                key={item.id}
                id={`submission-result-version-${item.versionNumber}`}
                className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                  isLatest
                    ? 'border-indigo-300 ring-2 ring-indigo-500/10'
                    : 'border-slate-200/90'
                }`}
              >
                {/* Version Header Bar */}
                <div 
                  onClick={() => toggleHistoryExpanded(item.id)}
                  className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                    isLatest
                      ? 'bg-gradient-to-r from-indigo-50/50 via-white to-slate-50 border-b border-indigo-100 hover:bg-indigo-50/70'
                      : 'bg-slate-50/80 border-b border-slate-200 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shadow-2xs ${
                      isLatest ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      v{item.versionNumber}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          Draft Submission Version {item.versionNumber}
                        </span>
                        {isLatest && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                            Latest
                          </span>
                        )}
                        {getStatusBadge(item.aiReasoning.overall_status)}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>•</span>
                        <span>{item.aiReasoning.issues.length} Issues Flagged</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-indigo-600" />
                          {item.chatMessages.length} Follow-up {item.chatMessages.length === 1 ? 'message' : 'messages'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Load into draft editor button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadTextIntoEditor(item.submittedContentText);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors"
                      title="Copy this draft version back into editor to revise"
                    >
                      <Edit3 className="w-3 h-3 text-indigo-600" />
                      <span>Edit & Re-Check</span>
                    </button>

                    <div className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-6 space-y-6">
                    {/* Submitted Draft Quote */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Submitted Draft Content (v{item.versionNumber}):
                      </span>
                      <p className="text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed">
                        "{item.submittedContentText}"
                      </p>
                    </div>

                    {/* Visible AI Fallback Banner */}
                    {(item.warning || item.aiReasoning.warning) && (
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

                    {/* Overall Status Banner */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          {getStatusBadge(item.aiReasoning.overall_status)}
                          {item.aiReasoning.human_review_required ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                              <UserCheck className="w-3 h-3 text-rose-600" />
                              Human Review Required
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Automated Sign-Off
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600">
                          {item.aiReasoning.issues.length === 0
                            ? 'All statements compliant with campaign guardrails and statutes.'
                            : `${item.aiReasoning.issues.length} compliance ${item.aiReasoning.issues.length === 1 ? 'issue' : 'issues'} detected in this version.`}
                        </p>
                      </div>

                      <div className="text-[11px] font-mono text-slate-500 bg-white px-2.5 py-1 rounded border border-slate-200 self-start sm:self-auto">
                        Report ID: {item.id.substring(0, 14)}...
                      </div>
                    </div>

                    {/* Issues List with Suggested Fixes & Grounded Citations */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                        <span>Evaluation Findings & Plain-Language Fixes ({item.aiReasoning.issues.length})</span>
                      </h4>

                      {item.aiReasoning.issues.length === 0 ? (
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Perfect! No prohibited claims, misleading statements, or missing disclosures found in v{item.versionNumber}.</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {item.aiReasoning.issues.map((issue, issueIdx) => (
                            <div
                              key={issueIdx}
                              className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  {getSeverityPill(issue.severity)}
                                  <span className="text-xs font-bold text-slate-900">
                                    {issue.category}
                                  </span>
                                </div>
                                <span className="text-[11px] font-medium text-slate-500">
                                  Confidence: {Math.round(issue.confidence * 100)}%
                                </span>
                              </div>

                              <div className="text-xs text-slate-800 font-medium leading-relaxed">
                                {issue.finding}
                              </div>

                              {issue.evidence && (
                                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                                    Identified in text:
                                  </span>
                                  <span className="font-mono text-rose-950 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-[11px] font-semibold">
                                    "{issue.evidence}"
                                  </span>
                                </div>
                              )}

                              {/* Plain Language Suggested Fix */}
                              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950 space-y-1">
                                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                  Suggested Fix (Plain Language):
                                </span>
                                <p className="leading-relaxed">
                                  {issue.suggested_fix}
                                </p>
                              </div>

                              {/* Specific Grounded Regulatory Citation */}
                              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                  <Scale className="w-3 h-3 text-slate-500" />
                                  Grounded Rule:
                                </span>
                                {issue.regulatory_references && issue.regulatory_references.length > 0 ? (
                                  issue.regulatory_references.map((r, rIdx) => (
                                    <span
                                      key={rIdx}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200"
                                    >
                                      {r}
                                    </span>
                                  ))
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                    Campaign Brief Contract Rule
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* FOLLOW-UP CHAT SCOPED STRICTLY TO THIS SUBMISSION VERSION */}
                    <div className="pt-2">
                      <FollowUpChatSection
                        submissionId={item.id}
                        versionNumber={item.versionNumber}
                        campaign={campaign}
                        submittedContentText={item.submittedContentText}
                        complianceResult={item.aiReasoning}
                        matchedRegulatoryEntries={item.matchedRegulatoryEntries}
                        messages={item.chatMessages}
                        onAddMessage={(msg) => handleAddChatMessage(item.id, msg)}
                        onApplyAlternativeToDraft={(text) => handleLoadTextIntoEditor(text)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
