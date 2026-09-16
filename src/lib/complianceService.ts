import { Campaign } from '../types/campaign';
import { MatchedRegulatoryEntry } from '../types/regulatory';
import { 
  DeterministicFinding, 
  ComplianceReasoningResult, 
  ComplianceReport,
  ReviewerDecision
} from '../types/compliance';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import { db } from './firebase';

const COMPLIANCE_REPORTS_COLLECTION = 'compliance_reports';
const LOCAL_STORAGE_REPORTS_KEY = 'hypenex_compliance_reports_fallback';

// Seeded submissions to ensure reviewer queue has rich demonstration data ready immediately
const SEED_REVIEWER_QUEUE_REPORTS: ComplianceReport[] = [
  {
    id: 'report_demo_red_01',
    campaignId: 'camp_lumiglow_01',
    campaignName: 'LumiGlow Barrier Defense Serum',
    creatorId: 'demo_creator_1',
    creatorHandle: '@sarah_beauty_glow',
    submittedContentText: 'Hey guys! You HAVE to try LumiGlow Serum! It literally cured my acne overnight and permanently erased all my acne scars. 100% risk-free guaranteed! Link in bio!',
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(), // 35 mins ago
    deterministicFindings: [
      {
        ruleId: 'prohibited-claim-cures-acne-permanently',
        ruleName: 'Prohibited Claim Breach: "Cures acne permanently"',
        ruleCategory: 'prohibited_claim',
        status: 'FAIL',
        message: 'Content contains forbidden phrase "cured my acne".',
        matchedText: 'cured my acne overnight'
      },
      {
        ruleId: 'prohibited-claim-risk-free',
        ruleName: 'Prohibited Claim Breach: "100% risk free guaranteed"',
        ruleCategory: 'prohibited_claim',
        status: 'FAIL',
        message: 'Content promises 100% risk free guarantees.',
        matchedText: '100% risk-free guaranteed'
      },
      {
        ruleId: 'disclosure-missing-#ad',
        ruleName: 'Missing Statutory Disclosure: "#ad"',
        ruleCategory: 'required_disclosure',
        status: 'FAIL',
        message: 'Mandatory disclosure "#ad" is completely missing from the caption.'
      }
    ],
    matchedRegulatoryEntries: [
      {
        source: 'CAP Code',
        sectionRef: 'Section 12.1',
        summary: 'Medicinal or disease treatment claims (such as curing acne or permanent scar removal) cannot be made for cosmetics without clinical drug authorization.',
        matchedTopicTags: ['cosmetics', 'medical claims', 'acne'],
        entry: {
          id: 'reg-cap-12-1',
          source: 'CAP Code',
          documentName: 'CAP Code (Non-broadcast)',
          sectionRef: 'Section 12.1',
          summary: 'Medicinal or disease treatment claims cannot be made for cosmetics without authorization.',
          effectiveDate: '2023-01-01',
          topicTags: ['cosmetics', 'medical claims'],
          sourceUrl: 'https://www.asa.org.uk'
        }
      },
      {
        source: 'ASA / CMA',
        sectionRef: 'Influencer Guide Section 2.2',
        summary: 'Commercial endorsements must be clearly identified with #ad prominently upfront prior to consumer engagement.',
        matchedTopicTags: ['disclosure', 'ad label', 'influencer'],
        entry: {
          id: 'reg-asa-ad-label',
          source: 'ASA / CMA',
          documentName: 'Influencer Marketing Guidance',
          sectionRef: 'Section 2.2',
          summary: 'Commercial endorsements must be clearly identified with #ad upfront.',
          effectiveDate: '2023-01-01',
          topicTags: ['disclosure', 'ad label'],
          sourceUrl: 'https://www.asa.org.uk'
        }
      },
      {
        source: 'CAP Code',
        sectionRef: 'Section 3.1',
        summary: 'Marketing communications must not materially mislead consumers or exaggerate the efficacy of a product.',
        matchedTopicTags: ['misleading', 'truth in advertising'],
        entry: {
          id: 'reg-cap-3-1',
          source: 'CAP Code',
          documentName: 'CAP Code (Non-broadcast)',
          sectionRef: 'Section 3.1',
          summary: 'Marketing communications must not materially mislead consumers.',
          effectiveDate: '2023-01-01',
          topicTags: ['misleading', 'truth in advertising'],
          sourceUrl: 'https://www.asa.org.uk'
        }
      }
    ],
    aiReasoning: {
      overall_status: 'RED',
      human_review_required: true,
      issues: [
        {
          severity: 'HIGH',
          category: 'Prohibited Medical Claim',
          finding: 'Creator claims cosmetic serum "cured my acne overnight", which constitutes an unauthorized medicinal disease treatment claim under advertising standards.',
          evidence: 'cured my acne overnight and permanently erased all my acne scars',
          regulatory_references: ['CAP Code Section 12.1', 'CAP Code Section 3.1'],
          suggested_fix: 'Remove claims of curing acne or erasing scars. Replace with approved benefits such as "supports natural moisture barrier and hydrates for up to 24 hours".',
          confidence: 0.98
        },
        {
          severity: 'HIGH',
          category: 'Missing Mandatory Disclosure',
          finding: 'The statutory identifier #ad is entirely omitted from commercial endorsement text.',
          evidence: 'Link in bio!',
          regulatory_references: ['ASA / CMA Influencer Guide Section 2.2'],
          suggested_fix: 'Add #ad prominently in the first 2 lines of the caption.',
          confidence: 0.99
        },
        {
          severity: 'MEDIUM',
          category: 'Prohibited Guarantee',
          finding: 'Promising "100% risk-free guaranteed" violates the campaign contract brief and misleads consumers regarding return policies.',
          evidence: '100% risk-free guaranteed!',
          regulatory_references: ['CAP Code Section 3.1'],
          suggested_fix: 'Delete "100% risk-free guaranteed" and add required disclaimer "Individual results may vary".',
          confidence: 0.95
        }
      ]
    }
  },
  {
    id: 'report_demo_amber_01',
    campaignId: 'camp_pulsefit_02',
    campaignName: 'PulseFit Pro Recovery Massage Gun',
    creatorId: 'demo_creator_2',
    creatorHandle: '@marcus_fitness_uk',
    submittedContentText: 'Morning workout complete! Using the PulseFit Pro to release tight calves. Honestly prevents all DOMS and sports injuries if you use it daily! Highly recommend. Check them out! #sp #collab',
    createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(), // 95 mins ago
    deterministicFindings: [
      {
        ruleId: 'prohibited-claim-prevents-injuries',
        ruleName: 'Prohibited Claim: "Prevents sports injuries"',
        ruleCategory: 'prohibited_claim',
        status: 'FAIL',
        message: 'Mentions injury prevention without medical certification.',
        matchedText: 'prevents all DOMS and sports injuries'
      },
      {
        ruleId: 'disclosure-missing-#ad',
        ruleName: 'Inadequate Disclosure Placement',
        ruleCategory: 'required_disclosure',
        status: 'FAIL',
        message: 'Uses ambiguous hashtags (#sp, #collab) instead of explicit #ad disclosure.',
        matchedText: '#sp #collab'
      }
    ],
    matchedRegulatoryEntries: [
      {
        source: 'CAP Code',
        sectionRef: 'Section 12.2',
        summary: 'Health and recovery claims for fitness devices must not claim prevention or treatment of injury or medical conditions without rigorous clinical substantiation.',
        matchedTopicTags: ['fitness', 'recovery', 'injury prevention'],
        entry: {
          id: 'reg-cap-12-wellness',
          source: 'CAP Code',
          documentName: 'CAP Health Guidelines',
          sectionRef: 'Section 12.2',
          summary: 'Health and recovery claims require clinical substantiation.',
          effectiveDate: '2023-01-01',
          topicTags: ['fitness', 'recovery'],
          sourceUrl: 'https://www.asa.org.uk'
        }
      },
      {
        source: 'FTC',
        sectionRef: 'Guides Concerning Use of Endorsements 16 CFR § 255.5',
        summary: 'Ambiguous disclosures like #sp, #spon, or #collab are insufficient. Endorsements must use clear identifiers like #ad.',
        matchedTopicTags: ['disclosure', 'ftc', 'endorsements'],
        entry: {
          id: 'reg-ftc-endorsement',
          source: 'FTC',
          documentName: 'Guides Concerning Endorsements',
          sectionRef: '16 CFR § 255.5',
          summary: 'Clear disclosures required for commercial endorsements.',
          effectiveDate: '2023-01-01',
          topicTags: ['disclosure', 'ftc'],
          sourceUrl: 'https://www.ftc.gov'
        }
      }
    ],
    aiReasoning: {
      overall_status: 'AMBER',
      human_review_required: true,
      issues: [
        {
          severity: 'MEDIUM',
          category: 'Unsubstantiated Injury Prevention Claim',
          finding: 'Stating the device "prevents all DOMS and sports injuries" is an unsubstantiated physiological health claim.',
          evidence: 'prevents all DOMS and sports injuries if you use it daily',
          regulatory_references: ['CAP Code Section 12.2'],
          suggested_fix: 'Rephrase to focus on relaxation and muscle relief: "Helps soothe muscle soreness after high intensity training".',
          confidence: 0.92
        },
        {
          severity: 'MEDIUM',
          category: 'Ambiguous Commercial Disclosure',
          finding: 'The tags #sp and #collab are recognized by regulatory authorities as insufficient for clear commercial identification.',
          evidence: '#sp #collab',
          regulatory_references: ['FTC Guides Concerning Use of Endorsements 16 CFR § 255.5'],
          suggested_fix: 'Replace #sp and #collab with #ad upfront.',
          confidence: 0.96
        }
      ]
    }
  },
  {
    id: 'report_demo_amber_02',
    campaignId: 'camp_apex_energy_03',
    campaignName: 'Apex Electrolyte Hydration Stick Packs',
    creatorId: 'demo_creator_3',
    creatorHandle: '@chloe_runs_trails',
    submittedContentText: 'Mid-trail hydration break with Apex Electrolytes! Rapid hydration with zero sugar. Gives you 10x more stamina than water alone! Check link in bio for 20% off. #ad #partnership',
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
    deterministicFindings: [
      {
        ruleId: 'prohibited-claim-10x-stamina',
        ruleName: 'Comparative Performance Exaggeration',
        ruleCategory: 'prohibited_claim',
        status: 'FAIL',
        message: 'Exaggerated multiplier claim "10x more stamina" not in approved claims list.',
        matchedText: '10x more stamina than water'
      }
    ],
    matchedRegulatoryEntries: [
      {
        source: 'CAP Code',
        sectionRef: 'Section 3.1',
        summary: 'Comparative performance claims and multipliers (e.g. 10x more stamina) require objective comparative test data.',
        matchedTopicTags: ['hydration', 'comparative claims', 'exaggeration'],
        entry: {
          id: 'reg-cap-3-exaggeration',
          source: 'CAP Code',
          documentName: 'CAP Code Section 3',
          sectionRef: 'Section 3.1',
          summary: 'Comparative performance claims require objective test data.',
          effectiveDate: '2023-01-01',
          topicTags: ['comparative claims'],
          sourceUrl: 'https://www.asa.org.uk'
        }
      }
    ],
    aiReasoning: {
      overall_status: 'AMBER',
      human_review_required: true,
      issues: [
        {
          severity: 'MEDIUM',
          category: 'Exaggerated Comparative Claim',
          finding: 'The claim "Gives you 10x more stamina than water alone" constitutes an unsubstantiated comparative nutritional claim.',
          evidence: 'Gives you 10x more stamina than water alone!',
          regulatory_references: ['CAP Code Section 3.1'],
          suggested_fix: 'Change to approved claim: "Helps replenish essential minerals lost in sweat during endurance runs".',
          confidence: 0.91
        }
      ]
    }
  }
];

/**
 * Executes standard deterministic rule checks (Step 3) on the content text:
 * - Checks for presence of all required campaign disclosures (case-insensitive)
 * - Checks for forbidden prohibited claims / keywords
 * - Checks for competitor mentions or extreme guarantee phrases
 */
export function evaluateDeterministicRules(
  campaign: Campaign,
  contentText: string
): DeterministicFinding[] {
  // Campaign completeness gate: check targetAudience, platforms, and productType
  const missingFields: string[] = [];
  if (!campaign.targetAudience || !campaign.targetAudience.trim()) {
    missingFields.push('targetAudience');
  }
  if (!campaign.platforms || !Array.isArray(campaign.platforms) || campaign.platforms.length === 0 || campaign.platforms.every(p => !p || !p.trim())) {
    missingFields.push('platforms');
  }
  if (!campaign.productType || !campaign.productType.trim()) {
    missingFields.push('productType');
  }

  if (missingFields.length > 0) {
    return [
      {
        ruleId: 'gate-campaign-incomplete',
        ruleName: 'Campaign Brief Incomplete',
        ruleCategory: 'campaign_incomplete',
        status: 'FAIL',
        message: `Campaign brief is incomplete. Missing required configuration: ${missingFields.join(', ')}. The campaign must be completed by the campaigner before content can be checked.`,
        ruleDefinition: 'Campaign must have targetAudience, platforms, and productType specified before compliance checks can run.'
      }
    ];
  }

  const findings: DeterministicFinding[] = [];
  const lowerContent = contentText.toLowerCase();

  // 1. Check Required Disclosures
  if (campaign.requiredDisclosures && campaign.requiredDisclosures.length > 0) {
    for (const disclosure of campaign.requiredDisclosures) {
      if (!disclosure.trim()) continue;
      const cleanDisclosure = disclosure.trim();
      const discLower = cleanDisclosure.toLowerCase();

      // Check for presence
      const exists = lowerContent.includes(discLower);
      if (exists) {
        findings.push({
          ruleId: `disclosure-pass-${discLower.replace(/\s+/g, '-')}`,
          ruleName: `Required Disclosure: "${cleanDisclosure}"`,
          ruleCategory: 'required_disclosure',
          status: 'PASS',
          message: `Mandatory disclosure is present in content: "${cleanDisclosure}".`,
          matchedText: cleanDisclosure,
          ruleDefinition: cleanDisclosure
        });
      } else {
        findings.push({
          ruleId: `disclosure-fail-${discLower.replace(/\s+/g, '-')}`,
          ruleName: `Missing Disclosure: "${cleanDisclosure}"`,
          ruleCategory: 'required_disclosure',
          status: 'FAIL',
          message: `Required legal disclosure was NOT detected in the text: "${cleanDisclosure}".`,
          ruleDefinition: cleanDisclosure
        });
      }
    }
  }

  // 2. Check Prohibited Claims
  if (campaign.prohibitedClaims && campaign.prohibitedClaims.length > 0) {
    for (const claim of campaign.prohibitedClaims) {
      if (!claim.trim()) continue;
      const cleanClaim = claim.trim();
      const claimLower = cleanClaim.toLowerCase();

      // Look for whole-word or substring match
      const matched = lowerContent.includes(claimLower);
      if (matched) {
        findings.push({
          ruleId: `prohibited-fail-${claimLower.replace(/\s+/g, '-')}`,
          ruleName: `Prohibited Claim Violation: "${cleanClaim}"`,
          ruleCategory: 'prohibited_claim',
          status: 'FAIL',
          message: `Prohibited marketing claim was detected: "${cleanClaim}".`,
          matchedText: cleanClaim,
          ruleDefinition: cleanClaim
        });
      }
    }
  }

  // 3. High-Risk General Advertising Deterministic Safeguards
  const highRiskPhrases = [
    { phrase: 'guaranteed returns', category: 'prohibited_claim' as const, rule: 'Financial Guarantee Prohibition' },
    { phrase: '100% risk free', category: 'prohibited_claim' as const, rule: 'Absolute Risk-Free Claim' },
    { phrase: 'miracle cure', category: 'prohibited_claim' as const, rule: 'Unsubstantiated Medical Claim' },
    { phrase: 'instant cure', category: 'prohibited_claim' as const, rule: 'Unsubstantiated Medical Claim' },
    { phrase: 'get rich quick', category: 'prohibited_claim' as const, rule: 'Misleading Wealth Generation' }
  ];

  for (const hr of highRiskPhrases) {
    if (lowerContent.includes(hr.phrase)) {
      findings.push({
        ruleId: `high-risk-phrase-${hr.phrase.replace(/\s+/g, '-')}`,
        ruleName: hr.rule,
        ruleCategory: hr.category,
        status: 'FAIL',
        message: `High-risk absolute marketing term detected: "${hr.phrase}".`,
        matchedText: hr.phrase
      });
    }
  }

  return findings;
}

/**
 * Validates the Gemini reasoning JSON shape to guarantee strict conformance with:
 * {
 *   "overall_status": "GREEN" | "AMBER" | "RED",
 *   "human_review_required": boolean,
 *   "issues": [
 *     {
 *       "severity": "LOW" | "MEDIUM" | "HIGH",
 *       "category": string,
 *       "finding": string,
 *       "evidence": string,
 *       "regulatory_references": [string],
 *       "suggested_fix": string,
 *       "confidence": number
 *     }
 *   ]
 * }
 */
export function validateComplianceReasoningResponse(
  raw: any,
  allowedRegulatoryEntries: MatchedRegulatoryEntry[]
): ComplianceReasoningResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Compliance reasoning response must be a non-null object.');
  }

  // 1. Validate overall_status
  let overall_status: 'GREEN' | 'AMBER' | 'RED' = 'AMBER';
  if (['GREEN', 'AMBER', 'RED'].includes(raw.overall_status)) {
    overall_status = raw.overall_status;
  }

  // 2. Validate human_review_required
  const human_review_required = typeof raw.human_review_required === 'boolean'
    ? raw.human_review_required
    : overall_status !== 'GREEN';

  // 3. Validate issues array
  if (!Array.isArray(raw.issues)) {
    raw.issues = [];
  }

  const validatedIssues = raw.issues.map((issue: any) => {
    const severity = ['LOW', 'MEDIUM', 'HIGH'].includes(issue?.severity)
      ? (issue.severity as 'LOW' | 'MEDIUM' | 'HIGH')
      : 'MEDIUM';

    const category = typeof issue?.category === 'string' ? issue.category.trim() : 'Compliance Finding';
    const finding = typeof issue?.finding === 'string' ? issue.finding.trim() : 'Review finding';
    const evidence = typeof issue?.evidence === 'string' ? issue.evidence.trim() : '';
    const suggested_fix = typeof issue?.suggested_fix === 'string' ? issue.suggested_fix.trim() : 'Align copy with guidelines.';
    const confidence = typeof issue?.confidence === 'number' && !isNaN(issue.confidence)
      ? Math.max(0, Math.min(1, issue.confidence))
      : 0.85;

    // Filter regulatory references to ONLY include those provided in matchedRegulatoryEntries
    const rawRefs: string[] = Array.isArray(issue?.regulatory_references) ? issue.regulatory_references : [];
    const groundedRefs: string[] = [];

    if (allowedRegulatoryEntries && allowedRegulatoryEntries.length > 0) {
      for (const ref of rawRefs) {
        if (typeof ref !== 'string') continue;
        const cleanRef = ref.trim();
        if (!cleanRef) continue;

        const isGrounded = allowedRegulatoryEntries.some(e => {
          const combined = `${e.source} ${e.sectionRef}`.toLowerCase();
          const sLow = (e.source || '').toLowerCase();
          const rLow = (e.sectionRef || '').toLowerCase();
          const cLow = cleanRef.toLowerCase();
          return (
            combined.includes(cLow) ||
            cLow.includes(sLow) ||
            cLow.includes(rLow) ||
            (e.documentName && cLow.includes(e.documentName.toLowerCase()))
          );
        });

        if (isGrounded) {
          groundedRefs.push(cleanRef);
        }
      }
    }

    return {
      severity,
      category,
      finding,
      evidence,
      regulatory_references: groundedRefs,
      suggested_fix,
      confidence
    };
  });

  const result: ComplianceReasoningResult = {
    overall_status,
    human_review_required,
    issues: validatedIssues
  };

  if (raw.warning && typeof raw.warning === 'string') {
    result.warning = raw.warning;
  }

  return result;
}

/**
 * Calls the full-stack server endpoint (/api/compliance/reasoning) which invokes
 * Gemini with structured context and strict schema enforcement.
 */
export async function runAIComplianceReasoning(params: {
  campaign: Campaign;
  submittedContentText: string;
  deterministicFindings: DeterministicFinding[];
  matchedRegulatoryEntries: MatchedRegulatoryEntry[];
}): Promise<ComplianceReasoningResult> {
  const {
    campaign,
    submittedContentText,
    deterministicFindings,
    matchedRegulatoryEntries
  } = params;

  const res = await fetch('/api/compliance/reasoning', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      campaign,
      submittedContentText,
      deterministicFindings,
      matchedRegulatoryEntries
    })
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Server responded with status ${res.status}`);
  }

  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Failed to retrieve AI compliance reasoning response.');
  }

  // Client-side double validation to ensure data integrity, passing through warning if present
  const validated = validateComplianceReasoningResponse(json.data, matchedRegulatoryEntries);
  if (json.warning && !validated.warning) {
    validated.warning = json.warning;
  }
  return validated;
}

/**
 * Saves a validated compliance report to Firestore (or localStorage for dev demo users).
 */
export async function saveComplianceReport(
  reportData: Omit<ComplianceReport, 'id' | 'createdAt'>,
  isDemoUser?: boolean
): Promise<string> {
  const payload = {
    ...reportData,
    createdAt: new Date().toISOString()
  };

  if (isDemoUser && import.meta.env.DEV) {
    const raw = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
    const list: ComplianceReport[] = raw ? JSON.parse(raw) : [];
    const newId = `report-demo-${Date.now()}`;
    list.unshift({ ...payload, id: newId });
    localStorage.setItem(LOCAL_STORAGE_REPORTS_KEY, JSON.stringify(list));
    return newId;
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const colRef = collection(db, COMPLIANCE_REPORTS_COLLECTION);
  const docRef = await addDoc(colRef, {
    ...payload,
    createdAtTimestamp: serverTimestamp()
  });
  return docRef.id;
}

/**
 * Retrieves compliance reports for a specific creator or campaign from Firestore.
 */
export async function getComplianceReports(creatorId?: string, isDemoUser?: boolean): Promise<ComplianceReport[]> {
  let reports: ComplianceReport[] = [];

  if (isDemoUser && import.meta.env.DEV) {
    const raw = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
    const list: ComplianceReport[] = raw ? JSON.parse(raw) : [...SEED_REVIEWER_QUEUE_REPORTS];
    reports = creatorId 
      ? list.filter(r => !r.creatorId || r.creatorId === creatorId || r.creatorId === 'creator' || r.creatorId.includes('demo'))
      : list;
  } else {
    if (!db) {
      throw new Error('Firestore is not initialized.');
    }

    const colRef = collection(db, COMPLIANCE_REPORTS_COLLECTION);
    const q = creatorId ? query(colRef, where('creatorId', '==', creatorId)) : query(colRef);
    const snapshot = await getDocs(q);
    reports = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<ComplianceReport, 'id'>)
    }));
  }

  reports.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return reports;
}

/**
 * Retrieves all submissions for the Reviewer Queue with status AMBER or RED, sorted by severity.
 * (RED first, then AMBER, and within same status sorted by timestamp newest first)
 */
export async function getReviewerQueueReports(isDemoUser?: boolean): Promise<ComplianceReport[]> {
  let reports: ComplianceReport[] = [];

  if (isDemoUser && import.meta.env.DEV) {
    const raw = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
    reports = raw ? JSON.parse(raw) : [...SEED_REVIEWER_QUEUE_REPORTS];
  } else {
    if (!db) {
      throw new Error('Firestore is not initialized.');
    }
    const colRef = collection(db, COMPLIANCE_REPORTS_COLLECTION);
    const snapshot = await getDocs(colRef);
    reports = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<ComplianceReport, 'id'>)
    }));
  }

  // Filter strictly for AMBER and RED submissions
  const filtered = reports.filter(r => 
    r.aiReasoning && (r.aiReasoning.overall_status === 'RED' || r.aiReasoning.overall_status === 'AMBER')
  );

  // Sort by severity: RED first (priority 2), then AMBER (priority 1)
  // Within same severity tier, sort by creation time (most recent first)
  return filtered.sort((a, b) => {
    const scoreA = a.aiReasoning.overall_status === 'RED' ? 2 : 1;
    const scoreB = b.aiReasoning.overall_status === 'RED' ? 2 : 1;

    if (scoreA !== scoreB) {
      return scoreB - scoreA; // Highest severity first
    }

    // Secondary sort: Pending review first (undecided), then already decided
    const decidedA = a.reviewerDecision ? 1 : 0;
    const decidedB = b.reviewerDecision ? 1 : 0;
    if (decidedA !== decidedB) {
      return decidedA - decidedB; // Pending first
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Records a reviewer decision (Approve, Reject, or Request Changes) with required reasoning.
 */
export async function recordReviewerDecision(params: {
  reportId: string;
  decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
  reasoning: string;
  reviewerId: string;
  reviewerEmail?: string;
  isDemoUser?: boolean;
}): Promise<void> {
  const reviewerDecision: ReviewerDecision = {
    decision: params.decision,
    reasoning: params.reasoning.trim(),
    reviewerId: params.reviewerId,
    reviewerEmail: params.reviewerEmail,
    decidedAt: new Date().toISOString()
  };

  if (params.isDemoUser && import.meta.env.DEV) {
    const raw = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
    const list: ComplianceReport[] = raw ? JSON.parse(raw) : [...SEED_REVIEWER_QUEUE_REPORTS];
    const index = list.findIndex(r => r.id === params.reportId);
    if (index >= 0) {
      list[index].reviewerDecision = reviewerDecision;
    } else {
      const seedItem = SEED_REVIEWER_QUEUE_REPORTS.find(s => s.id === params.reportId);
      if (seedItem) {
        list.unshift({
          ...seedItem,
          reviewerDecision
        });
      }
    }
    localStorage.setItem(LOCAL_STORAGE_REPORTS_KEY, JSON.stringify(list));
    return;
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const docRef = doc(db, COMPLIANCE_REPORTS_COLLECTION, params.reportId);
  await updateDoc(docRef, {
    reviewerDecision,
    updatedAt: serverTimestamp()
  });
}

/**
 * Sends a follow-up question to the compliance AI assistant scoped strictly
 * to a specific submission and its evaluation context.
 */
export async function sendComplianceFollowUpChat(params: {
  campaign: Campaign;
  submittedContentText: string;
  complianceResult: ComplianceReasoningResult;
  matchedRegulatoryEntries: MatchedRegulatoryEntry[];
  conversationHistory: { role: 'user' | 'assistant'; content: string }[];
  userMessage: string;
}): Promise<string> {
  const res = await fetch('/api/compliance/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server responded with ${res.status}`);
  }

  const data = await res.json();
  if (!data.success || !data.reply) {
    throw new Error(data.error || 'Failed to get follow-up response.');
  }

  return data.reply;
}
