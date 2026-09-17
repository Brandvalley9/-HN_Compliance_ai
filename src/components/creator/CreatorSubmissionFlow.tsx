import React, { useState } from 'react';
import { Campaign } from '../../types/campaign';
import { MatchedRegulatoryEntry } from '../../types/regulatory';
import {
  evaluateDeterministicRules,
  runAIComplianceReasoning,
  saveComplianceReport
} from '../../lib/complianceService';
import { ComplianceReasoningResult, DeterministicFinding } from '../../types/compliance';
import { ComplianceOrb } from '../compliance/ComplianceOrb';
import { Sparkles, CheckCircle, AlertTriangle, XCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface CreatorSubmissionFlowProps {
  campaign: Campaign;
  matchedRegulations: MatchedRegulatoryEntry[];
  creatorId?: string;
  isDemoUser?: boolean;
}

export const CreatorSubmissionFlow: React.FC<CreatorSubmissionFlowProps> = ({
  campaign,
  matchedRegulations,
  creatorId = 'creator-1',
  isDemoUser = false
}) => {
  const [contentText, setContentText] = useState(
    'Loving my daily morning routine with this new drink! Cures chronic fatigue instantly. Sponsored by SuperBoost'
  );
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [deterministicFindings, setDeterministicFindings] = useState<DeterministicFinding[]>([]);
  const [aiResult, setAiResult] = useState<ComplianceReasoningResult | null>(null);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);

  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    setSavedReportId(null);

    try {
      // 1. Run local deterministic rule engine
      const detFindings = evaluateDeterministicRules(campaign, contentText);
      setDeterministicFindings(detFindings);

      // 2. Call live Gemini AI reasoning pipeline
      const aiResponse = await runAIComplianceReasoning({
        campaign,
        submittedContentText: contentText,
        deterministicFindings: detFindings,
        matchedRegulatoryEntries: matchedRegulations
      });
      setAiResult(aiResponse);

      // 3. Persist verified report to Firestore
      const reportId = await saveComplianceReport(
        {
          campaignId: campaign.id,
          creatorId,
          contentText,
          status: aiResponse.overall_status,
          deterministicFindings: detFindings,
          aiReasoning: aiResponse
        },
        isDemoUser
      );
      setSavedReportId(reportId);
    } catch (err: any) {
      console.error('Compliance check failed:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleApplyFix = (original: string, fix: string) => {
    setContentText((prev) => prev.replace(original, fix));
  };

  const handleInsertMissingDisclosure = (disclosure: string) => {
    setContentText((prev) => `${disclosure} ${prev}`);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Studio Header Bar */}
      <div className="flex items-center justify-between p-5 rounded-2xl glass-surface">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Compliance Studio
            </h2>
            <p className="text-xs text-slate-400">
              Campaign: <span className="text-indigo-300 font-medium">{campaign.name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            gemini-3.6-flash active
          </span>
        </div>
      </div>

      {/* Split Stage Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Editor Canvas (7 cols) */}
        <div className="lg:col-span-7 flex flex-col glass-surface rounded-3xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Content Draft & Copy
            </label>
            <span className="text-xs text-slate-400 font-mono">
              {contentText.length} chars
            </span>
          </div>

          <div className="relative flex-1 min-h-[260px] rounded-2xl bg-black/40 border border-white/5 p-4 focus-within:border-indigo-500/50 transition-colors">
            <textarea
              className="w-full h-full min-h-[220px] bg-transparent text-slate-100 placeholder-slate-500 resize-none outline-none font-sans leading-relaxed text-sm"
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              placeholder="Write or paste your sponsor script, caption, or post copy..."
            />
          </div>

          {/* Action Row */}
          <div className="mt-5 flex items-center justify-between">
            <div className="flex gap-2">
              {campaign.requiredDisclosures?.map((disclosure, idx) => (
                <button
                  key={idx}
                  onClick={() => handleInsertMissingDisclosure(disclosure)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
                >
                  + Add {disclosure}
                </button>
              ))}
            </div>

            <button
              onClick={handleRunEvaluation}
              disabled={isEvaluating || !contentText.trim()}
              className="glow-button px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isEvaluating ? 'Scanning...' : 'Run Spatial Scan'}
            </button>
          </div>
        </div>

        {/* Right Column: Spatial Intelligence Deck (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* 3D Status Orb */}
          <ComplianceOrb
            status={aiResult?.overall_status || 'IDLE'}
            score={aiResult ? Math.round((1 - (aiResult.issues.length * 0.12)) * 100) : 100}
            isEvaluating={isEvaluating}
          />

          {/* Quick Auto-Remediation Suggestions */}
          <div className="glass-surface rounded-3xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              Tactile Findings & Fixes
            </h3>

            {deterministicFindings.length === 0 && (!aiResult || aiResult.issues.length === 0) && (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                Hit "Run Spatial Scan" to evaluate your copy against campaign guardrails.
              </p>
            )}

            {/* Deterministic Missing Disclosures */}
            {deterministicFindings
              .filter((f) => f.status === 'FAIL')
              .map((finding) => (
                <div
                  key={finding.ruleId}
                  className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start justify-between gap-3"
                >
                  <div className="flex gap-2.5">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-rose-200">
                        {finding.ruleName}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {finding.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

            {/* AI Reasoning Findings & One-Click Fixes */}
            {aiResult?.issues.map((issue, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-xs font-semibold text-amber-200">
                      {issue.category}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                    {issue.severity}
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  {issue.finding}
                </p>

                {issue.evidence && issue.suggested_fix && (
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 italic">
                      "{issue.suggested_fix}"
                    </span>
                    <button
                      onClick={() => handleApplyFix(issue.evidence, issue.suggested_fix)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                    >
                      Apply Fix ✨
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
