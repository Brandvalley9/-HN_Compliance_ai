export interface RegulatoryEntry {
  id?: string;
  source: string;              // e.g. FCA, ASA, CAP, FTC, FDA, CMA
  documentName: string;        // Document or rule name, e.g. "CAP Code (Non-broadcast)"
  sectionRef: string;          // Section or reference, e.g. "Section 3.1", "Rule 2.4"
  summary: string;             // Plain-text summary of the rule
  effectiveDate: string;       // Effective date (YYYY-MM-DD or readable string)
  topicTags: string[];         // e.g. ["disclosure", "misleading claims", "guaranteed returns"]
  sourceUrl: string;           // Canonical source link / regulation URL
  createdById?: string;
  createdByEmail?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Result format for matched regulatory entries, returning
 * the matched entries with their source, reference, and summary,
 * along with matched tags and the full entry metadata.
 */
export interface MatchedRegulatoryEntry {
  source: string;
  sectionRef: string;
  summary: string;
  documentName?: string;
  sourceUrl?: string;
  effectiveDate?: string;
  matchedTopicTags: string[];
  entry: RegulatoryEntry;
}

export interface RegulatoryMatchOptions {
  productType?: string;
  topicContext?: string | string[];
  limit?: number;
}


export const COMMON_REGULATORY_SOURCES = [
  'ASA (Advertising Standards Authority)',
  'CAP (Committee of Advertising Practice)',
  'FCA (Financial Conduct Authority)',
  'FTC (Federal Trade Commission)',
  'FDA (Food and Drug Administration)',
  'CMA (Competition and Markets Authority)'
];

export const POPULAR_TOPIC_TAGS = [
  'disclosure',
  'misleading claims',
  'guaranteed returns',
  'pricing transparency',
  'health claims',
  'testimonials & endorsements',
  'environmental claims (greenwashing)',
  'influencer marketing',
  'crypto & high-risk investments',
  'substantiation'
];
