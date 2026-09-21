import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from './firebase';
import { Campaign, CampaignAuditTrailEntry } from '../types/campaign';

const CAMPAIGNS_COLLECTION = 'campaigns';
const AUDIT_SUBCOLLECTION = 'audit_trail';
const LOCAL_STORAGE_KEY = 'hypenex_campaigns_fallback';

const SEED_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-seed-1',
    name: 'SuperBoost Energy Elixir Launch',
    productDescription: 'An all-natural adaptogenic sparkling tonic designed for sustained midday focus without caffeine jitters.',
    productType: 'Food & Beverage / Supplement',
    targetAudience: 'Fitness enthusiasts and busy remote knowledge workers aged 22–40.',
    platforms: ['TikTok', 'Instagram Reels'],
    approvedClaims: [
      'Provides sustained mental focus and natural vitality',
      'Infused with 100% organic ashwagandha and lion’s mane extract',
      'No added sugars or artificial sweeteners'
    ],
    prohibitedClaims: [
      'Cures chronic fatigue syndrome or clinical exhaustion',
      'Guaranteed to boost productivity by 300%',
      'Replaces prescription ADHD medication or clinical therapies'
    ],
    requiredDisclosures: [
      '#ad',
      '#SuperBoostPartner',
      'Consult your physician before introducing new herbal adaptogens.'
    ],
    instructions: 'Keep lighting bright and demonstrate drinking the tonic directly from the chilled can within the first 3 seconds.',
    ownerId: 'campaigner-seed-1',
    assignedCreators: ['creator-1', 'creator-seed-1'],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'camp-seed-2',
    name: 'Lumivita Ceramide Barrier Recovery Serum',
    productDescription: 'Clinical-grade triple lipid barrier repair serum formulated for sensitive skin restoration.',
    productType: 'Skincare / Cosmetics',
    targetAudience: 'Individuals dealing with compromised skin barriers, post-retinol dryness, or eczema-prone sensitivity.',
    platforms: ['Instagram Reels', 'YouTube Shorts', 'TikTok'],
    approvedClaims: [
      'Clinically formulated to restore the natural moisture barrier',
      'Contains 3 essential skin-identical ceramides (EOP, NP, AP)',
      'Fragrance-free, non-comedogenic, and dermatologist tested'
    ],
    prohibitedClaims: [
      'Permanently eliminates acne overnight',
      'Guaranteed miracle medical cure for chronic eczema',
      'Comparable to prescription dermatological topical steroids'
    ],
    requiredDisclosures: [
      '#ad',
      '#LumivitaPartner',
      'Results may vary depending on individual skin condition.'
    ],
    instructions: 'Showcase the serum texture on the back of the hand and apply cleanly to bare, unblemished facial skin.',
    ownerId: 'campaigner-seed-1',
    assignedCreators: ['creator-1', 'creator-seed-1'],
    status: 'active',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  }
];

function getLocalCampaigns(): Campaign[] {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_CAMPAIGNS));
    return SEED_CAMPAIGNS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return SEED_CAMPAIGNS;
  }
}

function saveLocalCampaigns(list: Campaign[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
}

export async function getCampaignsForCreator(creatorId?: string, isDemoUser?: boolean): Promise<Campaign[]> {
  if (isDemoUser && import.meta.env.DEV) {
    const all = getLocalCampaigns();
    if (!creatorId) return all;
    // Demo data only: open campaigns, or ones explicitly assigned to a demo creator id.
    const filtered = all.filter(c =>
      !c.assignedCreators || c.assignedCreators.length === 0 ||
      c.assignedCreators.includes(creatorId) || c.assignedCreators.includes('creator') || c.assignedCreators.includes('demo_creator_1')
    );
    return filtered.length > 0 ? filtered : all;
  }

  if (!creatorId) return [];
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  // Creators may only read campaigns they are assigned to (firestore.rules). The query itself must be
  // constrained accordingly, otherwise Firestore rejects it: an unfiltered collection read is denied.
  const q = query(
    collection(db, CAMPAIGNS_COLLECTION),
    where('assignedCreators', 'array-contains', creatorId)
  );
  const snapshot = await getDocs(q);
  const campaigns: Campaign[] = [];
  snapshot.forEach(docSnap => {
    campaigns.push({ id: docSnap.id, ...(docSnap.data() as Omit<Campaign, 'id'>) });
  });
  campaigns.sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
  return campaigns;
}

export async function getAllCampaigns(isDemoUser?: boolean): Promise<Campaign[]> {
  if (isDemoUser && import.meta.env.DEV) {
    return getLocalCampaigns();
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const colRef = collection(db, CAMPAIGNS_COLLECTION);
  const snapshot = await getDocs(colRef);
  const campaigns: Campaign[] = [];
  snapshot.forEach(docSnap => {
    campaigns.push({ id: docSnap.id, ...(docSnap.data() as Omit<Campaign, 'id'>) });
  });
  return campaigns.sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

export async function getCampaignsForOwner(ownerId: string, isDemoUser?: boolean): Promise<Campaign[]> {
  if (isDemoUser && import.meta.env.DEV) {
    const all = getLocalCampaigns();
    return all.filter(c => c.ownerId === ownerId || c.ownerId === 'campaigner-seed-1');
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const colRef = collection(db, CAMPAIGNS_COLLECTION);
  const q = query(colRef, where('ownerId', '==', ownerId));
  const snapshot = await getDocs(q);
  const campaigns: Campaign[] = [];
  snapshot.forEach(docSnap => {
    campaigns.push({ id: docSnap.id, ...(docSnap.data() as Omit<Campaign, 'id'>) });
  });
  return campaigns.sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

export async function getCampaignById(id: string, isDemoUser?: boolean): Promise<Campaign | null> {
  if (isDemoUser && import.meta.env.DEV) {
    const all = getLocalCampaigns();
    return all.find(c => c.id === id) || null;
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const docRef = doc(db, CAMPAIGNS_COLLECTION, id);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return { id: snap.id, ...(snap.data() as Omit<Campaign, 'id'>) };
  }
  return null;
}

export async function createCampaign(
  campaignData: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string,
  isDemoUser?: boolean
): Promise<string> {
  const payload: Omit<Campaign, 'id'> = {
    ...campaignData,
    ownerId: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (isDemoUser && import.meta.env.DEV) {
    const all = getLocalCampaigns();
    const newId = `camp-local-${Date.now()}`;
    const newCampaign = { ...payload, id: newId };
    all.unshift(newCampaign);
    saveLocalCampaigns(all);
    return newId;
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const colRef = collection(db, CAMPAIGNS_COLLECTION);
  const docRef = await addDoc(colRef, {
    ...payload,
    createdAtTimestamp: serverTimestamp(),
    updatedAtTimestamp: serverTimestamp()
  });

  const auditCol = collection(db, CAMPAIGNS_COLLECTION, docRef.id, AUDIT_SUBCOLLECTION);
  await addDoc(auditCol, {
    action: 'created',
    timestamp: new Date().toISOString(),
    actorId: userId,
    details: 'Campaign initialized with brief, claims, and disclosures.'
  });

  return docRef.id;
}

export async function updateCampaign(
  id: string,
  updates: Partial<Omit<Campaign, 'id' | 'createdAt' | 'ownerId'>>,
  userId: string,
  isDemoUser?: boolean
): Promise<void> {
  const payload = {
    ...updates,
    updatedAt: new Date().toISOString()
  };

  if (isDemoUser && import.meta.env.DEV) {
    const all = getLocalCampaigns();
    const idx = all.findIndex(c => c.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...payload };
      saveLocalCampaigns(all);
    }
    return;
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const docRef = doc(db, CAMPAIGNS_COLLECTION, id);
  await updateDoc(docRef, {
    ...payload,
    updatedAtTimestamp: serverTimestamp()
  });

  const auditCol = collection(db, CAMPAIGNS_COLLECTION, id, AUDIT_SUBCOLLECTION);
  await addDoc(auditCol, {
    action: 'updated',
    timestamp: new Date().toISOString(),
    actorId: userId,
    details: `Updated campaign fields: ${Object.keys(updates).join(', ')}`
  });
}

export async function deleteCampaign(id: string, isDemoUser?: boolean): Promise<void> {
  if (isDemoUser && import.meta.env.DEV) {
    const all = getLocalCampaigns();
    const filtered = all.filter(c => c.id !== id);
    saveLocalCampaigns(filtered);
    return;
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const docRef = doc(db, CAMPAIGNS_COLLECTION, id);
  await deleteDoc(docRef);
}

export async function getCampaignAuditTrail(campaignId: string, isDemoUser?: boolean): Promise<CampaignAuditTrailEntry[]> {
  if (isDemoUser && import.meta.env.DEV) {
    return [
      {
        id: 'audit-demo-1',
        action: 'created',
        timestamp: new Date().toISOString(),
        actorId: 'demo-campaigner',
        details: 'Initial campaign parameters and legal guidance locked.'
      }
    ];
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const auditCol = collection(db, CAMPAIGNS_COLLECTION, campaignId, AUDIT_SUBCOLLECTION);
  const snapshot = await getDocs(auditCol);
  const entries: CampaignAuditTrailEntry[] = [];
  snapshot.forEach(docSnap => {
    entries.push({ id: docSnap.id, ...(docSnap.data() as Omit<CampaignAuditTrailEntry, 'id'>) });
  });

  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
