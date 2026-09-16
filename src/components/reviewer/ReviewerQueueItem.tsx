import React, { useState } from 'react';
import { ComplianceReport, ReviewerDecisionType } from '../../types/compliance';
import { 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  Scale, 
  Sparkles, 
  Send, 
  RotateCcw, 
  Check, 
  Ban, 
  Clock, 
  ShieldAlert, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  Quote
} from 'lucide-react';

interface ReviewerQueueItemProps {
  report: ComplianceReport;
  onRecordDecision: (
    reportId: string, 
    decision: ReviewerDecisionType, 
    reasoning: string
  ) => Promise<void>;
}

export const ReviewerQueueItem: React.FC<ReviewerQueueItemProps> = ({
  report,
  onRecordDecision
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState<ReviewerDecisionType | null>(null);
  const [reasoning, setReasoning] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const status = report.aiReasoning?.overall_status || 'AMBER';
  const isRed = status === 'RED';
  const existingDecision = report.reviewerDecision;

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDecision) {
      setActionError('Please select a decision: Approve, Reject, or Request Changes.');
      return;
    }
    if (!reasoning.trim()) {
      setActionError('Reasoning is mandatory. Please provide a clear explanation for your decision.');
      return;
    }

    if (!report.id) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      await onRecordDecision(report.id, selectedDecision, reasoning.trim());
      setSelectedDecision(null);
      setReasoning('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to record decision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDecisionBadge = (decision: ReviewerDecisionType) => {
    switch (decision) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <Check className="w-3.5 h-3.5 text-emerald-700" />
            Decision: APPROVED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
            <Ban className="w-3.5 h-3.5 text-rose-700" />
            Decision: REJECTED
          </span>
        );
      case 'CHANGES_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
            Decision: CHANGES REQUESTED
          </span>
        );
    }
  };

  // Collect all unique regulatory references
  const allRegulatoryRefs: string[] = [];
  report.aiReasoning?.issues?.forEach(issue => {
    issue.regulatory_references?.forEach(ref => {
      if (!allRegulatoryRefs.includes(ref)) allRegulatoryRefs.push(ref);
    });
  });
  report.matchedRegulatoryEntries?.forEach(entry => {
    const formatted = `${entry.source} ${entry.sectionRef}`.trim();
    if (!allRegulatoryRefs.includes(formatted)) allRegulatoryRefs.push(formatted);
  });

  return (
    <div 
      id={`reviewer-queue-card-${report.id}`}
      className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
        isRed ? 'border-rose-300' : 'border-amber-300'
      }`}
    >
      {/* Top Banner / Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
          isRed 
            ? 'bg-rose-50/50 hover:bg-rose-50/80 border-b border-rose-200' 
            : 'bg-amber-50/40 hover:bg-amber-50/70 border-b border-amber-200'
        }`}
      >
        <div className="flex items-center gap-3.5">
          {/* Priority Status Pill */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
            isRed ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
          }`}>
            {isRed ? <XCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                isRed ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                {isRed ? 'HIGH SEVERITY (RED)' : 'MEDIUM SEVERITY (AMBER)'}
              </span>

              <h3 className="text-sm font-bold text-slate-900">
                {report.campaignName || 'General Campaign'}
              </h3>

              {existingDecision ? (
                getDecisionBadge(existingDecision.decision)
              ) : (
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  Pending Reviewer Action
                </span>
              )}

              {(report.warning || report.aiReasoning?.warning) && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  Rule Check Fallback
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {report.creatorHandle || `Creator: ${report.creatorId || 'Unknown'}`}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {new Date(report.createdAt).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <span>•</span>
              <span>{report.aiReasoning?.issues?.length || 0} issues detected</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="text-xs text-slate-400">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Main Reviewer Workstation Area */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Section 1: Submitted Content Text */}
          <div className="space-y-2">
            {/* Fallback Warning Banner */}
            {(report.warning || report.aiReasoning?.warning) && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-2xs mb-2">
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

            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                Creator's Submitted Content
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                Report ID: {report.id}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed border border-slate-800 shadow-inner relative">
              <Quote className="w-4 h-4 text-slate-600 absolute top-3 right-3 opacity-40" />
              <p className="whitespace-pre-wrap">{report.submittedContentText}</p>
            </div>
          </div>

          {/* Section 2: AI's Findings & Suggested Fixes */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              AI Compliance Findings ({report.aiReasoning?.issues?.length || 0})
            </h4>

            <div className="grid grid-cols-1 gap-3">
              {report.aiReasoning?.issues?.map((issue, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        issue.severity === 'HIGH' 
                          ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {issue.severity} RISK
                      </span>
                      <span className="font-bold text-slate-900">
                        {issue.category}
                      </span>
                    </div>

                    <span className="text-[11px] font-medium text-slate-500">
                      Confidence: {Math.round(issue.confidence * 100)}%
                    </span>
                  </div>

                  <p className="text-slate-700 font-medium leading-relaxed">
                    {issue.finding}
                  </p>

                  {issue.evidence && (
                    <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px]">
                      <span className="text-slate-500 font-semibold uppercase text-[10px] block mb-0.5">
                        Flagged Text Snippet:
                      </span>
                      <span className="font-mono text-rose-950 bg-rose-50 px-1 py-0.5 rounded font-semibold">
                        "{issue.evidence}"
                      </span>
                    </div>
                  )}

                  {/* Suggested Fix */}
                  <div className="p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-100 text-[11px] text-indigo-950">
                    <span className="font-bold text-indigo-900 uppercase text-[10px] block mb-0.5">
                      Suggested Fix for Creator:
                    </span>
                    <p>{issue.suggested_fix}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Regulatory References */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-slate-600" />
              Statutory & Regulatory References
            </h4>

            {allRegulatoryRefs.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                Evaluated against campaign contract rules and standard truth-in-advertising guidelines.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {allRegulatoryRefs.map((ref, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
                  >
                    <Scale className="w-3 h-3 text-slate-500" />
                    {ref}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Existing Decision Record or Decision Form */}
          {existingDecision ? (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Recorded Reviewer Decision:
                  </span>
                  {getDecisionBadge(existingDecision.decision)}
                </div>
                <span className="text-xs text-slate-500">
                  Decided on {new Date(existingDecision.decidedAt).toLocaleString()}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Reviewer Rationale / Instructions:
                </span>
                <p className="whitespace-pre-wrap leading-relaxed font-medium">
                  {existingDecision.reasoning}
                </p>
              </div>

              <p className="text-[11px] text-slate-500 text-right">
                Reviewer: {existingDecision.reviewerEmail || existingDecision.reviewerId}
              </p>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-indigo-600" />
                  Make Reviewer Determination
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose an action and provide your compliance reasoning. Reasoning is mandatory and will be recorded in the audit trail.
                </p>
              </div>

              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleDecisionSubmit} className="space-y-4">
                {/* Decision Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedDecision('APPROVED')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                      selectedDecision === 'APPROVED'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-300'
                        : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Content</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDecision('CHANGES_REQUESTED')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                      selectedDecision === 'CHANGES_REQUESTED'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                        : 'bg-white hover:bg-amber-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Request Changes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDecision('REJECTED')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                      selectedDecision === 'REJECTED'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-300'
                        : 'bg-white hover:bg-rose-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Ban className="w-4 h-4" />
                    <span>Reject Content</span>
                  </button>
                </div>

                {/* Mandatory Reasoning Text Field */}
                <div className="space-y-1.5">
                  <label htmlFor={`reasoning-${report.id}`} className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>
                      Reviewer Reasoning <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      Required for all decisions
                    </span>
                  </label>
                  <textarea
                    id={`reasoning-${report.id}`}
                    rows={3}
                    value={reasoning}
                    onChange={(e) => setReasoning(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Enter explicit rationale for this determination, referencing specific breaches, mandated disclaimers, or necessary revisions..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white placeholder-slate-400 shadow-inner leading-relaxed"
                  />
                </div>

                {/* Submit Decision Button */}
                <div className="flex justify-end">
                  <button
                    id={`submit-decision-${report.id}`}
                    type="submit"
                    disabled={isSubmitting || !selectedDecision || !reasoning.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {isSubmitting ? 'Recording Decision...' : 'Record Reviewer Decision'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
