import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { RegulatoryEntry, MatchedRegulatoryEntry, RegulatoryMatchOptions } from '../types/regulatory';
import { matchRegulatoryEntries } from '../shared/complianceCore';

const REGULATORY_COLLECTION = 'regulatory_entries';
const LOCAL_STORAGE_KEY = 'hypenex_regulatory_entries_fallback';

const SEED_REGULATORY_ENTRIES: RegulatoryEntry[] = [
  {
    id: 'reg-asa-1',
    source: 'ASA / CAP Code',
    documentName: 'CAP Non-broadcast Code',
    sectionRef: 'Section 12.1',
    summary: 'Medicinal, health, or curative claims for food, cosmetics, or wellness products require robust scientific substantiation via randomized clinical trials.',
    effectiveDate: '2023-01-01',
    topicTags: ['health claims', 'substantiation', 'misleading claims'],
    sourceUrl: 'https://www.asa.org.uk/type/non_broadcast/code_section/12.html'
  },
  {
    id: 'reg-asa-2',
    source: 'ASA / CAP Code',
    documentName: 'CAP Influencer Guidance',
    sectionRef: 'Section 2.1',
    summary: 'Advertisements and commercial relationships must be prominently disclosed using clear, unambiguous labels (such as #ad) placed upfront before consumer interaction.',
    effectiveDate: '2022-06-01',
    topicTags: ['disclosure', 'influencer marketing', 'social media guidelines'],
    sourceUrl: 'https://www.asa.org.uk/resource/influencers-guidance.html'
  },
  {
    id: 'reg-fca-1',
    source: 'FCA Guidance',
    documentName: 'FCA Guidance on Financial Promotions on Social Media',
    sectionRef: 'FG24/1',
    summary: 'Promotions of investment or cryptocurrency assets must not promise absolute returns or present risk-free claims, and must include prominent risk warnings.',
    effectiveDate: '2024-03-26',
    topicTags: ['guaranteed returns', 'crypto & high-risk investments', 'disclosure', 'pricing transparency'],
    sourceUrl: 'https://www.fca.org.uk/publications/finalised-guidance/fg24-1-guidance-financial-promotions-social-media'
  },
  {
    id: 'reg-cma-1',
    source: 'CMA Guidance',
    documentName: 'Green Claims Code',
    sectionRef: 'Principles 1–6',
    summary: 'Environmental and sustainability claims must be truthful, accurate, unambiguous, substantiated, and consider the full life cycle of the product.',
    effectiveDate: '2021-09-20',
    topicTags: ['environmental claims (greenwashing)', 'misleading claims', 'substantiation'],
    sourceUrl: 'https://www.gov.uk/government/publications/green-claims-code-making-environmental-claims'
  },
  {
    id: 'reg-ctsi-1',
    source: 'CTSI / UK Regulations',
    documentName: 'Consumer Protection from Unfair Trading Regulations 2008',
    sectionRef: 'Regulation 5 & 6',
    summary: 'Prohibits misleading actions and omissions that deceive consumers regarding product specifications, pricing, guarantees, or efficacy.',
    effectiveDate: '2008-05-26',
    topicTags: ['misleading claims', 'pricing transparency', 'substantiation'],
    sourceUrl: 'https://www.legislation.gov.uk/uksi/2008/1277/contents/made'
  }
];

function getLocalRegulatoryEntries(): RegulatoryEntry[] {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_REGULATORY_ENTRIES));
    return SEED_REGULATORY_ENTRIES;
  }
  try {
    return JSON.parse(data);
  } catch {
    return SEED_REGULATORY_ENTRIES;
  }
}

function saveLocalRegulatoryEntries(list: RegulatoryEntry[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
}

export async function getRegulatoryEntries(isDemoUser?: boolean): Promise<RegulatoryEntry[]> {
  if (isDemoUser && import.meta.env.DEV) {
    return getLocalRegulatoryEntries();
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const colRef = collection(db, REGULATORY_COLLECTION);
  const snapshot = await getDocs(colRef);
  const entries: RegulatoryEntry[] = [];
  snapshot.forEach(docSnap => {
    entries.push({ id: docSnap.id, ...(docSnap.data() as Omit<RegulatoryEntry, 'id'>) });
  });

  return entries;
}

export async function getRegulatoryEntryById(id: string, isDemoUser?: boolean): Promise<RegulatoryEntry | null> {
  if (isDemoUser && import.meta.env.DEV) {
    const all = getLocalRegulatoryEntries();
    return all.find(e => e.id === id) || null;
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const docRef = doc(db, REGULATORY_COLLECTION, id);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return { id: snap.id, ...(snap.data() as Omit<RegulatoryEntry, 'id'>) };
  }
  return null;
}

export async function createRegulatoryEntry(
  entryData: Omit<RegulatoryEntry, 'id' | 'createdAt' | 'updatedAt'>,
  isDemoUser?: boolean
): Promise<string> {
  const payload: Omit<RegulatoryEntry, 'id'> = {
    ...entryData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (isDemoUser && import.meta.env.DEV) {
    const all = getLocalRegulatoryEntries();
    const newId = `reg-local-${Date.now()}`;
    const newEntry = { ...payload, id: newId };
    all.unshift(newEntry);
    saveLocalRegulatoryEntries(all);
    return newId;
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const colRef = collection(db, REGULATORY_COLLECTION);
  const docRef = await addDoc(colRef, {
    ...payload,
    createdAtTimestamp: serverTimestamp(),
    updatedAtTimestamp: serverTimestamp()
  });

  return docRef.id;
}

export async function updateRegulatoryEntry(
  id: string,
  updates: Partial<Omit<RegulatoryEntry, 'id' | 'createdAt'>>,
  isDemoUser?: boolean
): Promise<void> {
  const payload = {
    ...updates,
    updatedAt: new Date().toISOString()
  };

  if (isDemoUser && import.meta.env.DEV) {
    const all = getLocalRegulatoryEntries();
    const idx = all.findIndex(e => e.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...payload };
      saveLocalRegulatoryEntries(all);
    }
    return;
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const docRef = doc(db, REGULATORY_COLLECTION, id);
  await updateDoc(docRef, {
    ...payload,
    updatedAtTimestamp: serverTimestamp()
  });
}

export async function deleteRegulatoryEntry(id: string, isDemoUser?: boolean): Promise<void> {
  if (isDemoUser && import.meta.env.DEV) {
    const all = getLocalRegulatoryEntries();
    const filtered = all.filter(e => e.id !== id);
    saveLocalRegulatoryEntries(filtered);
    return;
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const docRef = doc(db, REGULATORY_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Given a campaign's product type and topic context, retrieves the curated regulatory entries
 * (from Firestore or the dev-demo fallback) whose topic tags are relevant.
 * The scoring itself is pure and shared with the server (src/shared/complianceCore.ts)[cite: 1].
 */
export async function getRelevantRegulatoryEntries(
  options: RegulatoryMatchOptions,
  isDemoUser?: boolean
): Promise<MatchedRegulatoryEntry[]> {
  const entries = await getRegulatoryEntries(isDemoUser);
  return matchRegulatoryEntries(entries, options);
}
