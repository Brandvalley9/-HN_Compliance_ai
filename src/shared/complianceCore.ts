/**
 * Pure compliance core: no Firebase, no DOM, no import.meta.env.
 * Shared by the browser (display / demo) and the server (authoritative evaluation).
 */
import type { Campaign } from '../types/campaign';
import type { MatchedRegulatoryEntry, RegulatoryEntry, RegulatoryMatchOptions } from '../types/regulatory';
import type {
  ComplianceOverallStatus,
  ComplianceReasoningResult,
  DeterministicFinding
} from '../types/compliance';

/* -------------------------------------------------------------------------- */
/*  Text normalisation & phrase matching                                       */
/* -------------------------------------------------------------------------- */

/**
 * Normalises free text so that trivial formatting differences cannot hide a phrase:
 * case, accents, curly quotes, hyphens/dashes, punctuation, zero-width characters,
 * and glued hashtags ("#ad#sponsored"). Hashtag / mention / currency / percent
 * symbols are preserved because they are meaningful ("#ad" is not "ad").
 */
export function normalizeText(input: string): string {
  return (input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u200b-\u200f\u2060\ufeff]/g, '')
    .toLowerCase()
    .replace(/['\u2018\u2019\u201b]/g, '')
    .replace(/[\u2010-\u2015\u2212-]/g, ' ')
    .replace(/(#[\p{L}\p{N}_]+)(?=#)/gu, '$1 ')
    .replace(/[^\p{L}\p{N}#@%£$€ ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(input: string): string[] {
  const n = normalizeText(input);
  return n ? n.split(' ') : [];
}

/**
 * Light suffix stemmer (plural / tense / -ing) so that "guaranteed return" and
 * "guarantees returns" are the same claim. Hashtags, mentions and numbers are left untouched.
 */
export function stem(word: string): string {
  let w = word;
  if (/^[#@]/.test(w) || /\d/.test(w)) return w;
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  for (const suf of ['ing', 'ed', 'es', 's']) {
    if (w.length - suf.length >= 3 && w.endsWith(suf)) {
      w = w.slice(0, -suf.length);
      break;
    }
  }
  if (w.length > 3 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
}

function stemsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const min = Math.min(a.length, b.length);
  if (min < 5) return false;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return longer.startsWith(shorter) && longer.length - shorter.length <= 1;
}

function findSequence(
  content: string[],
  phrase: string[],
  equals: (a: string, b: string) => boolean
): number {
  if (phrase.length === 0 || content.length < phrase.length) return -1;
  for (let i = 0; i <= content.length - phrase.length; i++) {
    let ok = true;
    for (let j = 0; j < phrase.length; j++) {
      if (!equals(content[i + j], phrase[j])) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

/** Fuzzy claim match: word-boundary aware, tolerant to plurals / tense / hyphenation. */
export function containsClaim(contentText: string, claim: string): boolean {
  const phrase = tokenize(claim).map(stem);
  if (phrase.length === 0) return false;
  const content = tokenize(contentText).map(stem);
  return findSequence(content, phrase, stemsMatch) >= 0;
}

/** Strict disclosure match: exact tokens, so "#ad" is NOT satisfied by "#adventure". */
export function containsDisclosure(contentText: string, disclosure: string): boolean {
  const phrase = tokenize(disclosure);
  if (phrase.length === 0) return false;
  const content = tokenize(contentText);
  return findSequence(content, phrase, (a, b) => a === b) >= 0;
}

/* -------------------------------------------------------------------------- */
/*  Deterministic rule engine                                                  */
/* -------------------------------------------------------------------------- */

const HIGH_RISK_PHRASES = [
  { phrase: 'guaranteed returns', rule: 'Financial Guarantee Prohibition' },
  { phrase: '100% risk free', rule: 'Absolute Risk-Free Claim' },
  { phrase: 'miracle cure', rule: 'Unsubstantiated Medical Claim' },
  { phrase: 'instant cure', rule: 'Unsubstantiated Medical Claim' },
  { phrase: 'get rich quick', rule: 'Misleading Wealth Generation' }
] as const;

export function evaluateDeterministicRules(
  campaign: Campaign,
  contentText: string
): DeterministicFinding[] {
  const missingFields: string[] = [];
  if (!campaign.targetAudience || !campaign.targetAudience.trim()) missingFields.push('targetAudience');
  if (
    !campaign.platforms ||
    !Array.isArray(campaign.platforms) ||
    campaign.platforms.length === 0 ||
    campaign.platforms.every((p) => !p || !p.trim())
  ) {
    missingFields.push('platforms');
  }
  if (!campaign.productType || !campaign.productType.trim()) missingFields.push('productType');

  if (missingFields.length > 0) {
    return [
      {
        ruleId: 'gate-campaign-incomplete',
        ruleName: 'Campaign Brief Incomplete',
        ruleCategory: 'campaign_incomplete',
        status: 'FAIL',
        message: `Campaign brief is incomplete. Missing required configuration: ${missingFields.join(', ')}. The campaign must be completed by the campaigner before content can be checked.`,
        ruleDefinition:
          'Campaign must have targetAudience, platforms, and productType specified before compliance checks can run.'
      }
    ];
  }

  const findings: DeterministicFinding[] = [];

  // 1. Required disclosures (strict token match)
  for (const disclosure of campaign.requiredDisclosures || []) {
    if (!disclosure || !disclosure.trim()) continue;
    const clean = disclosure.trim();
    const slug = clean.toLowerCase().replace(/\s+/g, '-');
    if (containsDisclosure(contentText, clean)) {
      findings.push({
        ruleId: `disclosure-pass-${slug}`,
        ruleName: `Required Disclosure: "${clean}"`,
        ruleCategory: 'required_disclosure',
        status: 'PASS',
        message: `Mandatory disclosure is present in content: "${clean}".`,
        matchedText: clean,
        ruleDefinition: clean
      });
    } else {
      findings.push({
        ruleId: `disclosure-fail-${slug}`,
        ruleName: `Missing Disclosure: "${clean}"`,
        ruleCategory: 'required_disclosure',
        status: 'FAIL',
        message: `Required legal disclosure was NOT detected in the text: "${clean}".`,
        ruleDefinition: clean
      });
    }
  }

  // 2. Campaign-specific prohibited claims (normalised, stem-tolerant)
  for (const claim of campaign.prohibitedClaims || []) {
    if (!claim || !claim.trim()) continue;
    const clean = claim.trim();
    if (containsClaim(contentText, clean)) {
      findings.push({
        ruleId: `prohibited-fail-${clean.toLowerCase().replace(/\s+/g, '-')}`,
        ruleName: `Prohibited Claim Violation: "${clean}"`,
        ruleCategory: 'prohibited_claim',
        status: 'FAIL',
        message: `Prohibited marketing claim was detected: "${clean}".`,
        matchedText: clean,
        ruleDefinition: clean
      });
    }
  }

  // 3. Always-on high-risk phrases
  for (const hr of HIGH_RISK_PHRASES) {
    if (containsClaim(contentText, hr.phrase)) {
      findings.push({
        ruleId: `high-risk-phrase-${hr.phrase.replace(/\s+/g, '-')}`,
        ruleName: hr.rule,
        ruleCategory: 'prohibited_claim',
        status: 'FAIL',
        message: `High-risk absolute marketing term detected: "${hr.phrase}".`,
        matchedText: hr.phrase
      });
    }
  }

  return findings;
}

export function isCampaignIncomplete(findings: DeterministicFinding[]): DeterministicFinding | undefined {
  return findings.find((f) => f.ruleCategory === 'campaign_incomplete');
}

/* -------------------------------------------------------------------------- */
/*  AI response validation, reconciliation and fail-closed fallback            */
/* -------------------------------------------------------------------------- */

function isGroundedReference(ref: string, allowed: MatchedRegulatoryEntry[]): boolean {
  const cLow = ref.toLowerCase();
  return allowed.some((e) => {
    const combined = `${e.source} ${e.sectionRef}`.toLowerCase();
    const sLow = (e.source || '').toLowerCase();
    const rLow = (e.sectionRef || '').toLowerCase();
    return (
      combined.includes(cLow) ||
      cLow.includes(sLow) ||
      cLow.includes(rLow) ||
      Boolean(e.documentName && cLow.includes(e.documentName.toLowerCase()))
    );
  });
}

export function validateComplianceReasoningResponse(
  raw: any,
  allowedRegulatoryEntries: MatchedRegulatoryEntry[]
): ComplianceReasoningResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Compliance reasoning response must be a non-null object.');
  }

  let overall_status: ComplianceOverallStatus = 'AMBER';
  if (['GREEN', 'AMBER', 'RED'].includes(raw.overall_status)) overall_status = raw.overall_status;

  const human_review_required =
    typeof raw.human_review_required === 'boolean' ? raw.human_review_required : overall_status !== 'GREEN';

  const rawIssues: any[] = Array.isArray(raw.issues) ? raw.issues : [];

  const issues = rawIssues.map((issue: any) => {
    const severity = ['LOW', 'MEDIUM', 'HIGH'].includes(issue?.severity)
      ? (issue.severity as 'LOW' | 'MEDIUM' | 'HIGH')
      : 'MEDIUM';
    const category = typeof issue?.category === 'string' ? issue.category.trim() : 'Compliance Finding';
    const finding = typeof issue?.finding === 'string' ? issue.finding.trim() : 'Review finding';
    const evidence = typeof issue?.evidence === 'string' ? issue.evidence.trim() : '';
    const suggested_fix =
      typeof issue?.suggested_fix === 'string' ? issue.suggested_fix.trim() : 'Align copy with guidelines.';
    const confidence =
      typeof issue?.confidence === 'number' && !isNaN(issue.confidence)
        ? Math.max(0, Math.min(1, issue.confidence))
        : 0.85;

    const rawRefs: unknown[] = Array.isArray(issue?.regulatory_references) ? issue.regulatory_references : [];
    const regulatory_references: string[] = [];
    if (allowedRegulatoryEntries && allowedRegulatoryEntries.length > 0) {
      for (const ref of rawRefs) {
        if (typeof ref !== 'string') continue;
        const clean = ref.trim();
        if (clean && isGroundedReference(clean, allowedRegulatoryEntries)) regulatory_references.push(clean);
      }
    }

    return { severity, category, finding, evidence, regulatory_references, suggested_fix, confidence };
  });

  const result: ComplianceReasoningResult = { overall_status, human_review_required, issues };
  if (raw.warning && typeof raw.warning === 'string') result.warning = raw.warning;
  return result;
}

/**
 * "Compliance is a hard gate": a GREEN verdict from the language model can never
 * override a failed deterministic rule. Failed prohibited-claim rules force RED,
 * any other failed rule forces at least AMBER, and both require human review.
 */
export function reconcileWithDeterministic(
  result: ComplianceReasoningResult,
  findings: DeterministicFinding[]
): ComplianceReasoningResult {
  const fails = findings.filter((f) => f.status === 'FAIL');
  if (fails.length === 0) return result;

  const floor: ComplianceOverallStatus = fails.some((f) => f.ruleCategory === 'prohibited_claim')
    ? 'RED'
    : 'AMBER';
  const rank: Record<ComplianceOverallStatus, number> = { GREEN: 0, AMBER: 1, RED: 2 };
  const overall_status = rank[result.overall_status] >= rank[floor] ? result.overall_status : floor;

  return { ...result, overall_status, human_review_required: true };
}

/**
 * Used when the AI is unavailable. FAILS CLOSED: the result is never GREEN, so a
 * human reviewer always sees it. (An outage must not silently approve content.)
 */
export function synthesizeFallbackReasoning(
  deterministicFindings: DeterministicFinding[],
  matchedRegulatoryEntries: MatchedRegulatoryEntry[],
  submittedContentText: string,
  reason = 'AI reasoning was unavailable.'
): ComplianceReasoningResult {
  let status: ComplianceOverallStatus = 'AMBER';
  const issues: ComplianceReasoningResult['issues'] = [];

  for (const df of deterministicFindings) {
    if (df.status !== 'FAIL') continue;
    const isProhibited = df.ruleCategory === 'prohibited_claim';
    if (isProhibited) status = 'RED';

    const citations: string[] = [];
    for (const r of matchedRegulatoryEntries) {
      const tags = r.matchedTopicTags || [];
      if (
        (isProhibited && tags.some((t) => /misleading|substantiation|health|guarantee/.test(t))) ||
        (!isProhibited && tags.some((t) => t.includes('disclosure')))
      ) {
        citations.push(`${r.source} ${r.sectionRef}`.trim());
      }
    }
    if (citations.length === 0 && matchedRegulatoryEntries[0]) {
      citations.push(`${matchedRegulatoryEntries[0].source} ${matchedRegulatoryEntries[0].sectionRef}`.trim());
    }

    issues.push({
      severity: isProhibited ? 'HIGH' : 'MEDIUM',
      category: isProhibited ? 'Prohibited & Unsubstantiated Claim' : 'Missing Mandatory Disclosure',
      finding: df.message,
      evidence: df.matchedText || (submittedContentText || '').substring(0, 50),
      regulatory_references: Array.from(new Set(citations)),
      suggested_fix: isProhibited
        ? `Remove absolute or prohibited claim "${df.matchedText || ''}" and replace with an approved campaign benefit claim.`
        : `Ensure the required disclosure "${df.ruleDefinition || ''}" is prominently placed above the fold in the caption.`,
      confidence: 0.95
    });
  }

  issues.push({
    severity: 'LOW',
    category: 'General Compliance',
    finding: 'Automated AI review did not complete, so only rule-based checks were applied. A human reviewer must confirm this content before release.',
    evidence: '',
    regulatory_references: [],
    suggested_fix: 'No action needed from the creator; the submission has been routed to a reviewer.',
    confidence: 1
  });

  return {
    overall_status: status,
    human_review_required: true,
    issues,
    warning: `${reason} Result generated from deterministic rules only and routed for human review.`
  };
}

/* -------------------------------------------------------------------------- */
/*  Regulatory knowledge retrieval (pure)                                      */
/* -------------------------------------------------------------------------- */

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
  'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself'
]);

const PRODUCT_TYPE_TAG_MAP: Record<string, string[]> = {
  skincare: ['health claims', 'substantiation', 'misleading claims', 'disclosure'],
  cosmetics: ['health claims', 'substantiation', 'misleading claims', 'disclosure'],
  beauty: ['health claims', 'substantiation', 'misleading claims', 'disclosure'],
  supplement: ['health claims', 'substantiation', 'misleading claims', 'disclosure'],
  supplements: ['health claims', 'substantiation', 'misleading claims', 'disclosure'],
  health: ['health claims', 'substantiation', 'misleading claims', 'disclosure'],
  wellness: ['health claims', 'substantiation', 'misleading claims', 'disclosure'],
  fintech: ['guaranteed returns', 'crypto & high-risk investments', 'disclosure', 'pricing transparency', 'misleading claims'],
  finance: ['guaranteed returns', 'crypto & high-risk investments', 'disclosure', 'pricing transparency', 'misleading claims'],
  investment: ['guaranteed returns', 'crypto & high-risk investments', 'disclosure', 'pricing transparency'],
  crypto: ['crypto & high-risk investments', 'guaranteed returns', 'disclosure'],
  trading: ['guaranteed returns', 'crypto & high-risk investments', 'disclosure'],
  saas: ['pricing transparency', 'substantiation', 'disclosure', 'testimonials & endorsements'],
  software: ['pricing transparency', 'substantiation', 'disclosure', 'testimonials & endorsements'],
  ecommerce: ['pricing transparency', 'disclosure', 'testimonials & endorsements'],
  food: ['health claims', 'substantiation', 'environmental claims (greenwashing)', 'disclosure'],
  beverage: ['health claims', 'substantiation', 'disclosure']
};

/**
 * Scores curated regulatory entries against a campaign's product type and topic context
 * (simple tag + keyword overlap) and returns them most-relevant first.
 */
export function matchRegulatoryEntries(
  entries: RegulatoryEntry[],
  options: RegulatoryMatchOptions
): MatchedRegulatoryEntry[] {
  const { productType = '', topicContext = '', limit } = options;

  const searchTokens = new Set<string>();
  const directSearchPhrases: string[] = [];

  const extractTokens = (text: string) => {
    if (!text) return;
    const lower = text.toLowerCase();
    directSearchPhrases.push(lower.trim());
    for (const w of lower.split(/[\s,.;:!?/#()[\]{}"'\\-]+/)) {
      const clean = w.trim();
      if (clean.length > 2 && !STOP_WORDS.has(clean)) searchTokens.add(clean);
    }
  };

  const cleanProductType = productType.trim().toLowerCase();
  if (cleanProductType) {
    extractTokens(cleanProductType);
    for (const [catKey, mappedTags] of Object.entries(PRODUCT_TYPE_TAG_MAP)) {
      if (cleanProductType.includes(catKey) || catKey.includes(cleanProductType)) {
        mappedTags.forEach((t) => directSearchPhrases.push(t.toLowerCase()));
      }
    }
  }

  if (Array.isArray(topicContext)) topicContext.forEach((ctx) => extractTokens(ctx));
  else if (typeof topicContext === 'string') extractTokens(topicContext);

  const matched: Array<{ score: number; matchedTags: string[]; entry: RegulatoryEntry }> = [];

  for (const entry of entries) {
    let score = 0;
    const matchedTags = new Set<string>();
    const entryTags = (entry.topicTags || []).map((t) => t.toLowerCase().trim());

    for (const tag of entryTags) {
      for (const phrase of directSearchPhrases) {
        if (phrase && (tag.includes(phrase) || phrase.includes(tag))) {
          score += 4;
          matchedTags.add(tag);
        }
      }
      for (const token of searchTokens) {
        if (tag.includes(token)) {
          score += 2;
          matchedTags.add(tag);
        }
      }
    }

    const lowerSummary = (entry.summary || '').toLowerCase();
    const lowerDocName = (entry.documentName || '').toLowerCase();
    for (const token of searchTokens) {
      if (lowerSummary.includes(token)) score += 1;
      if (lowerDocName.includes(token)) score += 1.5;
    }

    if (score > 0) matched.push({ score, matchedTags: Array.from(matchedTags), entry });
  }

  matched.sort((a, b) => b.score - a.score);
  const final = limit ? matched.slice(0, limit) : matched;

  return final.map((m) => ({
    source: m.entry.source,
    sectionRef: m.entry.sectionRef,
    summary: m.entry.summary,
    documentName: m.entry.documentName,
    sourceUrl: m.entry.sourceUrl,
    effectiveDate: m.entry.effectiveDate,
    matchedTopicTags: m.matchedTags,
    entry: m.entry
  }));
}

/** Builds the topic context used for regulatory retrieval from a campaign brief. */
export function campaignTopicContext(campaign: Campaign): string[] {
  return [
    ...(campaign.approvedClaims || []),
    ...(campaign.prohibitedClaims || []),
    ...(campaign.requiredDisclosures || []),
    campaign.targetAudience,
    campaign.productDescription
  ].filter(Boolean);
}
