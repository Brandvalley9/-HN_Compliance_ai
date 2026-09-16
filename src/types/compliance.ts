/**
 * Types for AI Compliance Reasoning and Rule Engine Findings
 */

import { Campaign } from './campaign';
import { MatchedRegulatoryEntry } from './regulatory';

export type ComplianceOverallStatus = 'GREEN' | 'AMBER' | 'RED';
export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DeterministicFinding {
  ruleId: string;
  ruleName: string;
  ruleCategory: 'required_disclosure' | 'prohibited_claim' | 'platform_format' | 'competitor_mention' | 'pricing_currency' | 'campaign_incomplete';
  status: 'PASS' | 'FAIL' | 'FLAG';
  message: string;
  matchedText?: string;
  ruleDefinition?: string;
}

export interface ComplianceIssue {
  severity: IssueSeverity;
  category: string;
  finding: string;
  evidence: string;
  regulatory_references: string[];
  suggested_fix: string;
  confidence: number;
}

/**
 * Exact JSON structure required from Gemini AI Compliance Reasoning
 */
export interface ComplianceReasoningResult {
  overall_status: ComplianceOverallStatus;
  human_review_required: boolean;
  issues: ComplianceIssue[];
  warning?: string;
}

export interface ComplianceReasoningInput {
  campaign: Campaign;
  submittedContentText: string;
  deterministicRuleFindings: DeterministicFinding[];
  matchedRegulatoryEntries: MatchedRegulatoryEntry[];
  submissionMetadata?: {
    platform?: string;
    creatorHandle?: string;
    caption?: string;
    videoTranscript?: string;
  };
}

export type ReviewerDecisionType = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export interface ReviewerDecision {
  decision: ReviewerDecisionType;
  reasoning: string;
  reviewerId: string;
  reviewerEmail?: string;
  decidedAt: string;
}

export interface ComplianceReport {
  id?: string;
  campaignId?: string;
  creatorId?: string;
  campaignName?: string;
  creatorHandle?: string;
  submittedContentText: string;
  deterministicFindings: DeterministicFinding[];
  matchedRegulatoryEntries: MatchedRegulatoryEntry[];
  aiReasoning: ComplianceReasoningResult;
  createdAt: string;
  reviewerDecision?: ReviewerDecision;
  warning?: string;
}

export interface FollowUpChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedAlternative?: string;
}

export interface SubmissionHistoryItem {
  id: string;
  versionNumber: number;
  submittedContentText: string;
  deterministicFindings: DeterministicFinding[];
  matchedRegulatoryEntries: MatchedRegulatoryEntry[];
  aiReasoning: ComplianceReasoningResult;
  createdAt: string;
  chatMessages: FollowUpChatMessage[];
  reviewerDecision?: ReviewerDecision;
  warning?: string;
}
