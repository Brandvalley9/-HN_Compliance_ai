import { Campaign } from '../types/campaign';
import { 
  ComplianceReasoningResult, 
  ComplianceReport,
  ReviewerDecision
} from '../types/compliance';
import { MatchedRegulatoryEntry } from '../types/regulatory';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { getRegulatoryEntries } from './regulatoryService';

// Pure engine lives in src/shared so the server can run the exact same code.
export {
  evaluateDeterministicRules,
  validateComplianceReasoningResponse
} from '../shared/complianceCore';

const COMPLIANCE_REPORTS_COLLECTION = 'compliance_reports';
const LOCAL_STORAGE_REPORTS_KEY = 'hypenex_compliance_reports_fallback';

const SEED_REVIEWER_QUEUE_REPORTS: ComplianceReport[] = [
  {
    id: 'report-seed-1',
    campaignId: 'camp-seed-1',
    campaignName: 'SuperBoost Energy Elixir Launch',
    creatorId: 'creator-seed-1',
    submittedContentText:
      'Guys this serum cured all my skin conditions overnight! Guaranteed 100% risk free results! #ad',
    deterministicFindings: [
      {
        ruleId: 'prohibited-cure-all',
        ruleName: 'Prohibited Medical Claim',
        ruleCategory: 'prohibited_claim',
        status: 'FAIL',
        message: 'Claim "cured all my skin conditions overnight" detected.',
        matchedText: 'cured all my skin conditions overnight'
      },
      {
        ruleId: 'high-risk-guarantee',
        ruleName: 'Absolute Guarantee Prohibition',
        ruleCategory: 'prohibited_claim',
        status: 'FAIL',
        message: 'High-risk phrase "100% risk free" detected.',
        matchedText: '100% risk free'
      },
      {
        ruleId: 'disclosure-ad',
        ruleName: 'Required Disclosure: #ad',
        ruleCategory: 'required_disclosure',
        status: 'PASS',
        message: 'Disclosure #ad detected.'
      }
    ],
    matchedRegulatoryEntries: [
      {
        source: 'ASA / CAP Code',
        sectionRef: 'Section 12.1',
        summary: 'Medicinal or medical claims require substantiation by clinical trials.',
        documentName: 'CAP Non-broadcast Code',
        matchedTopicTags: ['health claims', 'substantiation']
      }
    ],
    aiReasoning: {
      overall_status: 'RED',
      human_review_required: true,
      issues: [
        {
          severity: 'HIGH',
          category: 'Prohibited & Unsubstantiated Claim',
          finding: 'Unsubstantiated medical cure claim.',
          evidence: 'cured all my skin conditions overnight',
          regulatory_references: ['ASA / CAP Code Section 12.1'],
          suggested_fix: 'Remove claims of curing conditions. Focus on cosmetic benefits.',
          confidence: 0.98
        }
      ]
    },
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];

/**
 * Auth headers for the compliance API. Real users send their Firebase ID token, which the
 * server verifies. Demo users (dev only) send a role hint that the server honours only when
 * ENABLE_DEMO_API=true and NODE_ENV !== 'production'.
 */
async function complianceAuthHeaders(demoRole?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (demoRole) {
    headers['x-demo-role'] = demoRole;
    return headers;
  }
  const current = auth?.currentUser;
  if (!current) {
    throw new Error('You must be signed in to run a compliance check.');
  }
  headers['Authorization'] = `Bearer ${await current.getIdToken()}`;
  return headers;
}

async function postJson<T>(url: string, body: unknown, demoRole?: string): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: await complianceAuthHeaders(demoRole),
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Server responded with status ${res.status}`);
  }
  return json as T;
}

export interface ComplianceCheckOutcome {
  reportId: string | null;
  report: ComplianceReport;
}

/**
 * Creator submission. The SERVER evaluates the content (deterministic rules + regulatory
 * retrieval + Gemini), reconciles the verdict, and writes the report itself. The browser can
 * no longer author or alter a compliance verdict.
 */
export async function submitForCompliance(params: {
  campaign: Campaign;
  submittedContentText: string;
  isDemoUser?: boolean;
  demoRole?: string;
}): Promise<ComplianceCheckOutcome> {
  const { campaign, submittedContentText, isDemoUser, demoRole } = params;
  const demo = Boolean(isDemoUser && import.meta.env.DEV);
  const json = await postJson<{ success: true; reportId: string | null; report: ComplianceReport }>(
    '/api/compliance/submit',
    demo
      ? { campaign, submittedContentText, regulatoryEntries: await getRegulatoryEntries(true) }
      : { campaignId: campaign.id, submittedContentText },
    demo ? demoRole || 'creator' : undefined
  );

  if (demo) {
    // Demo reports are never written to Firestore; keep them locally so the reviewer demo works.
    const raw = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
    const list: ComplianceReport[] = raw ? JSON.parse(raw) : [...SEED_REVIEWER_QUEUE_REPORTS];
    list.unshift({ ...json.report, id: json.reportId || `report-demo-${Date.now()}` });
    localStorage.setItem(LOCAL_STORAGE_REPORTS_KEY, JSON.stringify(list));
  }

  return { reportId: json.reportId, report: json.report };
}

/**
 * Campaigner / reviewer dry-run. Nothing is persisted.
 */
export async function previewCompliance(params: {
  campaign: Campaign;
  submittedContentText: string;
  isDemoUser?: boolean;
  demoRole?: string;
}): Promise<ComplianceReport> {
  const { campaign, submittedContentText, isDemoUser, demoRole } = params;
  const demo = Boolean(isDemoUser && import.meta.env.DEV);
  const json = await postJson<{ success: true; report: ComplianceReport }>(
    '/api/compliance/preview',
    demo
      ? { campaign, submittedContentText, regulatoryEntries: await getRegulatoryEntries(true) }
      : { campaignId: campaign.id, submittedContentText },
    demo ? demoRole || 'campaigner' : undefined
  );
  return json.report;
}

/**
 * Fetches all compliance reports for the reviewer audit queue.
 */
export async function getReviewerComplianceReports(isDemoUser?: boolean): Promise<ComplianceReport[]> {
  if (isDemoUser && import.meta.env.DEV) {
    const raw = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // Fallback below
      }
    }
    return [...SEED_REVIEWER_QUEUE_REPORTS];
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const colRef = collection(db, COMPLIANCE_REPORTS_COLLECTION);
  const snapshot = await getDocs(colRef);
  const reports: ComplianceReport[] = [];
  snapshot.forEach((d) => {
    reports.push({ id: d.id, ...(d.data() as Omit<ComplianceReport, 'id'>) });
  });

  return reports.sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

/**
 * Fetches compliance reports for a specific creator.
 */
export async function getCreatorComplianceReports(
  creatorId: string,
  isDemoUser?: boolean
): Promise<ComplianceReport[]> {
  if (isDemoUser && import.meta.env.DEV) {
    const all = await getReviewerComplianceReports(true);
    return all.filter((r) => r.creatorId === creatorId || r.creatorId === 'creator-1');
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const colRef = collection(db, COMPLIANCE_REPORTS_COLLECTION);
  const q = query(colRef, where('creatorId', '==', creatorId));
  const snapshot = await getDocs(q);
  const reports: ComplianceReport[] = [];
  snapshot.forEach((d) => {
    reports.push({ id: d.id, ...(d.data() as Omit<ComplianceReport, 'id'>) });
  });

  return reports.sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

/**
 * Records a human reviewer decision on a specific compliance report.
 */
export async function recordReviewerDecision(params: {
  reportId: string;
  decision: ReviewerDecision;
  reviewerId: string;
  reviewerNotes?: string;
  isDemoUser?: boolean;
}): Promise<void> {
  const { reportId, decision, reviewerId, reviewerNotes, isDemoUser } = params;

  if (isDemoUser && import.meta.env.DEV) {
    const raw = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
    const list: ComplianceReport[] = raw ? JSON.parse(raw) : [...SEED_REVIEWER_QUEUE_REPORTS];
    const idx = list.findIndex((r) => r.id === reportId);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        reviewerDecision: {
          decision,
          reviewerId,
          reviewerNotes: reviewerNotes || '',
          decidedAt: new Date().toISOString()
        }
      };
      localStorage.setItem(LOCAL_STORAGE_REPORTS_KEY, JSON.stringify(list));
    }
    return;
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const docRef = doc(db, COMPLIANCE_REPORTS_COLLECTION, reportId);
  await updateDoc(docRef, {
    reviewerDecision: {
      decision,
      reviewerId,
      reviewerNotes: reviewerNotes || '',
      decidedAt: new Date().toISOString()
    },
    updatedAt: serverTimestamp()
  });
}

/**
 * Sends a follow-up question to the compliance AI assistant scoped strictly
 * to a specific submission and its evaluation context. Requires a signed-in user.
 */
export async function sendComplianceFollowUpChat(params: {
  campaign: Campaign;
  submittedContentText: string;
  complianceResult?: Partial<ComplianceReasoningResult>;
  matchedRegulatoryEntries: MatchedRegulatoryEntry[];
  conversationHistory: { role: 'user' | 'assistant'; content: string }[];
  userMessage: string;
  demoRole?: string;
}): Promise<string> {
  const { demoRole, ...body } = params;
  const data = await postJson<{ success: true; reply: string }>('/api/compliance/chat', body, demoRole);
  if (!data.reply) throw new Error('Failed to get follow-up response.');
  return data.reply;
}
