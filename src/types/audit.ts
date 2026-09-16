import { DeterministicFinding, ComplianceReasoningResult, ReviewerDecision } from './compliance';
import { MatchedRegulatoryEntry } from './regulatory';

export interface AuditRegulatorySnapshot {
  source: string;
  sectionRef: string;
  documentName?: string;
  summary: string;
  effectiveDate?: string;
  sourceUrl?: string;
  matchedTopicTags: string[];
}

export interface CampaignAuditVersion {
  id: string;                         // e.g. "audit-v1-timestamp" or firestore doc id
  campaignId: string;
  campaignName: string;
  submissionId?: string;              // reference to parent report if applicable
  versionNumber: number;              // 1, 2, 3...
  submittedContentText: string;
  submittedBy: {
    userId: string;
    handle?: string;
    email?: string;
    role?: string;
  };
  submittedAt: string;                // ISO timestamp

  // Full AI Reasoning & Deterministic Engine output
  aiOutput: ComplianceReasoningResult;
  deterministicFindings: DeterministicFinding[];

  // Grounded regulatory knowledge version/entries snapshot
  regulatoryEntriesUsed: AuditRegulatorySnapshot[];
  knowledgeVersionInfo?: string;

  // Reviewer decision and reasoning (if reviewed)
  reviewerDecision?: ReviewerDecision;

  // Final approval status: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'PENDING_HUMAN_REVIEW' | 'PASSED_AUTOMATED'
  finalApprovalStatus: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'PENDING_HUMAN_REVIEW' | 'PASSED_AUTOMATED';
}

export interface CampaignAuditTrail {
  campaignId: string;
  campaignName: string;
  totalVersions: number;
  versions: CampaignAuditVersion[];
  lastUpdated: string;
}
