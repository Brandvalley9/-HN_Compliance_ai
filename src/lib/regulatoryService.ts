import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  where
} from 'firebase/firestore';
import { db } from './firebase';
import { RegulatoryEntry, MatchedRegulatoryEntry, RegulatoryMatchOptions } from '../types/regulatory';

const REGULATORY_COLLECTION = 'regulatory_entries';
const LOCAL_STORAGE_KEY = 'hypenex_regulatory_entries_fallback';

function getLocalEntries(): RegulatoryEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalEntries(list: RegulatoryEntry[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
}

// Seed initial curated standard regulatory entries if none exist (for quick reviewer onboarding)
export const INITIAL_REGULATORY_SEEDS: Omit<RegulatoryEntry, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    source: 'CAP',
    documentName: 'CAP Code (Non-broadcast Advertising and Direct & Promotional Marketing)',
    sectionRef: 'Rule 2.1 & 2.4 - Recognition of Marketing',
    summary: 'Marketing communications must be obviously identifiable as such. Influencer and UGC collaborations must feature a prominent disclosure such as "#ad" visible prior to engagement or video play.',
    effectiveDate: '2023-01-01',
    topicTags: ['disclosure', 'influencer marketing', 'misleading claims'],
    sourceUrl: 'https://www.asa.org.uk/type/non_broadcast/code_section/02.html'
  },
  {
    source: 'ASA',
    documentName: 'ASA Advertising Guidance on Misleading Claims and Substantiation',
    sectionRef: 'Section 3.1 - Substantiation Requirement',
    summary: 'Before distributing marketing communications, marketers must hold documentary evidence to prove all objective claims, whether direct or implied. Consumer survey results or testimonials alone do not substantiate scientific efficacy.',
    effectiveDate: '2022-06-15',
    topicTags: ['misleading claims', 'substantiation', 'health claims'],
    sourceUrl: 'https://www.asa.org.uk/resource/substantiation-of-claims.html'
  },
  {
    source: 'FCA',
    documentName: 'FCA Policy Statement PS23/6 - Financial Promotions on Social Media',
    sectionRef: 'Section 4.12 - Prohibited Return Guarantees',
    summary: 'Promotions must never state or imply that investment capital or returns are guaranteed or risk-free. Promoters must include mandatory risk warnings with equal visual prominence to any headline incentive.',
    effectiveDate: '2023-10-08',
    topicTags: ['guaranteed returns', 'disclosure', 'crypto & high-risk investments'],
    sourceUrl: 'https://www.fca.org.uk/publications/policy-statements/ps23-6-financial-promotion-rules-cryptoassets'
  }
];

export async function getRegulatoryEntries(isDemoUser?: boolean): Promise<RegulatoryEntry[]> {
  if (isDemoUser && import.meta.env.DEV) {
    let local = getLocalEntries();
    if (local.length === 0) {
      // Seed fallback with timestamps
      const now = new Date().toISOString();
      local = INITIAL_REGULATORY_SEEDS.map((seed, idx) => ({
        ...seed,
        id: `seed_reg_${idx + 1}`,
        createdAt: now,
        updatedAt: now
      }));
      saveLocalEntries(local);
    }
    return local;
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const colRef = collection(db, REGULATORY_COLLECTION);
  const snap = await getDocs(colRef);
  if (snap.empty) {
    // Seed Firestore with initial reference data
    const now = new Date().toISOString();
    const seededList: RegulatoryEntry[] = [];
    for (const seed of INITIAL_REGULATORY_SEEDS) {
      const docRef = await addDoc(colRef, {
        ...seed,
        createdAt: now,
        updatedAt: now
      });
      seededList.push({
        id: docRef.id,
        ...seed,
        createdAt: now,
        updatedAt: now
      });
    }
    return seededList;
  }

  const entries: RegulatoryEntry[] = [];
  snap.forEach((docSnap) => {
    entries.push({
      id: docSnap.id,
      ...(docSnap.data() as Omit<RegulatoryEntry, 'id'>)
    });
  });

  // Sort by createdAt descending
  entries.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return entries;
}

export async function createRegulatoryEntry(
  entryData: Omit<RegulatoryEntry, 'id'>, 
  isDemoUser?: boolean
): Promise<string> {
  const now = new Date().toISOString();
  const fullData: Omit<RegulatoryEntry, 'id'> = {
    ...entryData,
    createdAt: now,
    updatedAt: now
  };

  if (isDemoUser && import.meta.env.DEV) {
    const id = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newEntry: RegulatoryEntry = {
      id,
      ...fullData
    };
    const current = getLocalEntries();
    current.unshift(newEntry);
    saveLocalEntries(current);
    return id;
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const colRef = collection(db, REGULATORY_COLLECTION);
  const docRef = await addDoc(colRef, fullData);
  return docRef.id;
}

export async function deleteRegulatoryEntry(id: string, isDemoUser?: boolean): Promise<void> {
  if (isDemoUser && import.meta.env.DEV) {
    const current = getLocalEntries();
    saveLocalEntries(current.filter(e => e.id !== id));
    return;
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const docRef = doc(db, REGULATORY_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Common stopwords to ignore when extracting keyword tokens from free text context
 */
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

/**
 * Maps known product types to canonical regulatory topic tags
 */
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
 * Given a campaign's product type and topic context (such as claims, audience, description, or custom tags),
 * retrieves the regulatory knowledge entries (from Firestore or fallback) whose topic tags are relevant.
 * 
 * Uses simple tag & keyword matching over the manual curated knowledge base.
 * Returns the matched entries with their source, section reference, and summary.
 */
export async function getRelevantRegulatoryEntries(
  options: RegulatoryMatchOptions,
  isDemoUser?: boolean
): Promise<MatchedRegulatoryEntry[]> {
  const { productType = '', topicContext = '', limit } = options;

  // 1. Fetch all curated regulatory entries from the database
  const entries = await getRegulatoryEntries(isDemoUser);

  // 2. Normalize and collect search tokens from productType and topicContext
  const searchTokens = new Set<string>();
  const directSearchPhrases: string[] = [];

  // Helper to extract clean alphanumeric tokens
  const extractTokens = (text: string) => {
    if (!text) return;
    const lower = text.toLowerCase();
    directSearchPhrases.push(lower.trim());

    // Split words
    const words = lower.split(/[\s,.;:!?/#()[\]{}"'\\-]+/);
    for (const w of words) {
      const clean = w.trim();
      if (clean.length > 2 && !STOP_WORDS.has(clean)) {
        searchTokens.add(clean);
      }
    }
  };

  // Add productType tokens
  const cleanProductType = productType.trim().toLowerCase();
  if (cleanProductType) {
    extractTokens(cleanProductType);

    // Map known product categories to relevant topic tags
    for (const [catKey, mappedTags] of Object.entries(PRODUCT_TYPE_TAG_MAP)) {
      if (cleanProductType.includes(catKey) || catKey.includes(cleanProductType)) {
        mappedTags.forEach(t => directSearchPhrases.push(t.toLowerCase()));
      }
    }
  }

  // Add topicContext (can be string or array of strings such as approved/prohibited claims)
  if (Array.isArray(topicContext)) {
    topicContext.forEach(ctx => extractTokens(ctx));
  } else if (typeof topicContext === 'string') {
    extractTokens(topicContext);
  }

  // 3. Score and match each regulatory entry against the search tokens & phrases
  const matchedResults: Array<{
    score: number;
    matchedTags: string[];
    entry: RegulatoryEntry;
  }> = [];

  for (const entry of entries) {
    let score = 0;
    const matchedTags = new Set<string>();

    const entryTags = (entry.topicTags || []).map(t => t.toLowerCase().trim());

    // A. Check topic tags
    for (const tag of entryTags) {
      // Direct phrase match with context or product type
      for (const phrase of directSearchPhrases) {
        if (phrase && (tag.includes(phrase) || phrase.includes(tag))) {
          score += 4;
          matchedTags.add(tag);
        }
      }

      // Keyword token overlap with tag
      for (const token of searchTokens) {
        if (tag.includes(token)) {
          score += 2;
          matchedTags.add(tag);
        }
      }
    }

    // B. Also check if rule summary or document name matches strong context tokens
    const lowerSummary = (entry.summary || '').toLowerCase();
    const lowerDocName = (entry.documentName || '').toLowerCase();

    for (const token of searchTokens) {
      if (lowerSummary.includes(token)) {
        score += 1;
      }
      if (lowerDocName.includes(token)) {
        score += 1.5;
      }
    }

    // If there is a match or relevance score > 0, include it
    if (score > 0) {
      matchedResults.push({
        score,
        matchedTags: Array.from(matchedTags),
        entry
      });
    }
  }

  // 4. Sort by score descending (most relevant first)
  matchedResults.sort((a, b) => b.score - a.score);

  // Apply optional limit
  const finalMatches = limit ? matchedResults.slice(0, limit) : matchedResults;

  // 5. Return matched entries with source, reference, summary, and matched tags
  return finalMatches.map(m => ({
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

