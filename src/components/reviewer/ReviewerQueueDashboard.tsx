import React, { useState, useEffect } from 'react';
import { ComplianceReport, ReviewerDecisionType } from '../../types/compliance';
import { 
  getReviewerQueueReports, 
  recordReviewerDecision 
} from '../../lib/complianceService';
import { ReviewerQueueItem } from './ReviewerQueueItem';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Filter, 
  RefreshCw, 
  AlertTriangle, 
  XCircle,
  Inbox,
  ArrowUpDown,
  Search
} from 'lucide-react';

export const ReviewerQueueDashboard: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'RED' | 'AMBER'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'DECIDED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const data = await getReviewerQueueReports(user?.isDemo);
      setReports(data);
    } catch (err) {
      console.error('Failed to load reviewer queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [user?.isDemo]);

  const handleRecordDecision = async (
    reportId: string, 
    decision: ReviewerDecisionType, 
    reasoning: string
  ) => {
    await recordReviewerDecision({
      reportId,
      decision,
      reasoning,
      reviewerId: user?.uid || 'reviewer',
      reviewerEmail: user?.email || 'reviewer@hypenex.io',
      isDemoUser: user?.isDemo
    });

    setStatusNotification(`Decision (${decision}) successfully recorded for report.`);
    setTimeout(() => setStatusNotification(null), 4000);
    await fetchQueue();
  };

  // Filter queue
  const filteredReports = reports.filter(r => {
    const status = r.aiReasoning?.overall_status;
    if (filterSeverity !== 'ALL' && status !== filterSeverity) {
      return false;
    }

    const hasDecision = !!r.reviewerDecision;
    if (filterStatus === 'PENDING' && hasDecision) return false;
    if (filterStatus === 'DECIDED' && !hasDecision) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchCampaign = r.campaignName?.toLowerCase().includes(term);
      const matchContent = r.submittedContentText?.toLowerCase().includes(term);
      const matchCreator = r.creatorHandle?.toLowerCase().includes(term);
      if (!matchCampaign && !matchContent && !matchCreator) return false;
    }

    return true;
  });

  const redCount = reports.filter(r => r.aiReasoning?.overall_status === 'RED').length;
  const amberCount = reports.filter(r => r.aiReasoning?.overall_status === 'AMBER').length;
  const pendingCount = reports.filter(r => !r.reviewerDecision).length;
  const fallbackCount = reports.filter(r => r.warning || r.aiReasoning?.warning).length;

  return (
    <div id="reviewer-queue-dashboard" className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                <ShieldAlert className="w-3.5 h-3.5" />
                Human Review Queue
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                <ArrowUpDown className="w-3 h-3 text-indigo-600" />
                Sorted by Severity (RED → AMBER)
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Submissions Compliance Queue
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Inspect flagged submissions requiring human oversight. Review the campaign brief, submitted draft, AI findings, and matched regulatory references to record binding determinations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="refresh-reviewer-queue-btn"
              type="button"
              onClick={fetchQueue}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Severity Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">High Severity (RED)</p>
              <p className="text-xl font-black text-rose-950 mt-0.5">{redCount}</p>
            </div>
            <XCircle className="w-6 h-6 text-rose-500" />
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Medium Severity (AMBER)</p>
              <p className="text-xl font-black text-amber-950 mt-0.5">{amberCount}</p>
            </div>
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Pending Decisions</p>
              <p className="text-xl font-black text-indigo-950 mt-0.5">{pendingCount}</p>
            </div>
            <Inbox className="w-6 h-6 text-indigo-500" />
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/80 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Rule Check Only</p>
              <p className="text-xl font-black text-amber-950 mt-0.5">{fallbackCount}</p>
            </div>
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
        </div>
      </div>

      {/* AI Fallback Notice Banner if any items in queue have fallback */}
      {fallbackCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Notice: Rule-Based Fallbacks Present in Queue ({fallbackCount})
            </p>
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              This result was generated from rule checks only — Gemini was unavailable and did not review this submission.
            </p>
          </div>
        </div>
      )}

      {/* Action Notification */}
      {statusNotification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusNotification}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          {/* Severity Filter */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
            <button
              type="button"
              onClick={() => setFilterSeverity('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                filterSeverity === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Severities
            </button>
            <button
              type="button"
              onClick={() => setFilterSeverity('RED')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                filterSeverity === 'RED' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:text-rose-900'
              }`}
            >
              RED Only ({redCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterSeverity('AMBER')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                filterSeverity === 'AMBER' ? 'bg-amber-500 text-white shadow-2xs' : 'text-amber-700 hover:text-amber-900'
              }`}
            >
              AMBER Only ({amberCount})
            </button>
          </div>

          {/* Status Filter */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                filterStatus === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Status
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('PENDING')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                filterStatus === 'PENDING' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-indigo-700 hover:text-indigo-900'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('DECIDED')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                filterStatus === 'DECIDED' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              Decided
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search campaigns, captions, creators..."
            className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
      </div>

      {/* Submissions List Sorted by Severity */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-700">Loading Reviewer Queue...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-800">No Submissions Found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {reports.length === 0 
              ? 'No AMBER or RED submissions are currently pending review.'
              : 'No items match your active severity and status filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredReports.map((report) => (
            <ReviewerQueueItem
              key={report.id}
              report={report}
              onRecordDecision={handleRecordDecision}
            />
          ))}
        </div>
      )}
    </div>
  );
};
