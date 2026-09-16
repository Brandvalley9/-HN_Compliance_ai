import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { db } from './firebase';
import { Campaign } from '../types/campaign';

const CAMPAIGNS_COLLECTION = 'campaigns';
const LOCAL_STORAGE_KEY = 'hypenex_campaigns_local_fallback';

export async function testFirestoreConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore connection test: client offline or database provisioning');
    }
    return false;
  }
}

const DEFAULT_SEED_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp_lumiglow_01',
    name: 'LumiGlow Barrier Defense Serum',
    productDescription: 'A multi-peptide daily facial serum designed to support natural skin barrier hydration and soothe dryness.',
    productType: 'Skincare',
    targetAudience: 'Beauty enthusiasts aged 18-35 dealing with dry or sensitive skin',
    platforms: ['Instagram', 'TikTok'],
    approvedClaims: [
      'Hydrates skin for up to 24 hours',
      'Supports natural skin moisture barrier',
      'Dermatologist tested and fragrance free',
      'Noticeably softer skin texture with regular twice-daily use'
    ],
    prohibitedClaims: [
      'Cures acne permanently',
      'Eliminates wrinkles overnight',
      '100% risk free guaranteed',
      'Medicinal replacement for dermatological prescriptions',
      'Permanent scar removal'
    ],
    requiredDisclosures: [
      '#ad',
      'Individual results may vary',
      'Paid partnership'
    ],
    instructions: 'Capture natural morning lighting while applying 2-3 drops to clean skin. Clearly emphasize consistent daily hydration and texture improvement. Do NOT guarantee permanent overnight cures or medical acne treatments. Ensure #ad is prominently visible in the first 2 lines of the caption before the "more" toggle.',
    ownerId: 'demo-campaigner-1',
    ownerEmail: 'campaigner@hypenex.io',
    assignedCreators: ['creator-demo-id', 'creator', 'demo_creator_1'],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'camp_novavita_02',
    name: 'NovaVita Daily Electrolyte Focus',
    productDescription: 'An effervescent electrolyte hydration sachet infused with B-complex vitamins for daytime energy.',
    productType: 'Food & Supplements',
    targetAudience: 'Fitness enthusiasts, students, and busy professionals seeking clean hydration',
    platforms: ['TikTok', 'YouTube', 'Instagram'],
    approvedClaims: [
      'Supports healthy hydration and fluid balance',
      'Contains essential B-vitamins to support normal energy-yielding metabolism',
      'Zero added sugars with refreshing natural citrus taste'
    ],
    prohibitedClaims: [
      'Cures chronic fatigue or ADHD',
      'Guarantees weight loss or fat burning',
      'Replaces healthy meals and balanced diet',
      'Instantly boosts IQ or cognitive genius'
    ],
    requiredDisclosures: [
      '#ad',
      'Food supplements should not be used as a substitute for a varied diet'
    ],
    instructions: 'Showcase dissolving the packet into cold water before your morning routine or gym session. Highlight taste and daily hydration habits. Never claim it cures health disorders or prevents diseases.',
    ownerId: 'demo-campaigner-1',
    ownerEmail: 'campaigner@hypenex.io',
    assignedCreators: ['creator-demo-id', 'creator', 'demo_creator_1'],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString()
  }
];

// Local Storage Fallback helpers for demo users or temporary offline state
function getLocalCampaigns(): Campaign[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_SEED_CAMPAIGNS));
      return DEFAULT_SEED_CAMPAIGNS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_SEED_CAMPAIGNS));
      return DEFAULT_SEED_CAMPAIGNS;
    }
    return parsed;
  } catch {
    return DEFAULT_SEED_CAMPAIGNS;
  }
}

function saveLocalCampaigns(list: Campaign[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
}

export async function getCampaignsForCreator(creatorId?: string, isDemoUser?: boolean): Promise<Campaign[]> {
  const all = await getAllCampaigns(isDemoUser);
  if (!creatorId) return all;

  // Filter for campaigns where assignedCreators is not specified (open to all creators) OR includes this creator
  const filtered = all.filter(c => {
    if (!c.assignedCreators || c.assignedCreators.length === 0) {
      return true; // Open to assigned creators
    }
    return c.assignedCreators.includes(creatorId) || c.assignedCreators.includes('creator') || c.assignedCreators.includes('demo_creator_1');
  });

  return filtered.length > 0 ? filtered : all;
}

export async function getAllCampaigns(isDemoUser?: boolean): Promise<Campaign[]> {
  if (isDemoUser && import.meta.env.DEV) {
    return getLocalCampaigns();
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const campaignsRef = collection(db, CAMPAIGNS_COLLECTION);
  const snapshot = await getDocs(campaignsRef);
  const campaigns: Campaign[] = [];
  snapshot.forEach(docSnap => {
    campaigns.push({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Campaign, 'id'>)
    });
  });
  campaigns.sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
  return campaigns;
}

export async function getCampaignsByOwner(ownerId: string, isDemoUser?: boolean): Promise<Campaign[]> {
  if (isDemoUser && import.meta.env.DEV) {
    const local = getLocalCampaigns();
    return local.filter(c => c.ownerId === ownerId);
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const campaignsRef = collection(db, CAMPAIGNS_COLLECTION);
  const q = query(
    campaignsRef, 
    where('ownerId', '==', ownerId)
  );
  const snapshot = await getDocs(q);
  const campaigns: Campaign[] = [];
  snapshot.forEach(docSnap => {
    campaigns.push({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Campaign, 'id'>)
    });
  });
  // Sort descending by updatedAt or createdAt
  campaigns.sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
  return campaigns;
}

export async function getCampaignById(id: string, isDemoUser?: boolean): Promise<Campaign | null> {
  if (isDemoUser && import.meta.env.DEV) {
    const local = getLocalCampaigns();
    return local.find(c => c.id === id) || null;
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const docRef = doc(db, CAMPAIGNS_COLLECTION, id);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return {
      id: snap.id,
      ...(snap.data() as Omit<Campaign, 'id'>)
    };
  }
  return null;
}

export async function createCampaign(campaignData: Omit<Campaign, 'id'>, isDemoUser?: boolean): Promise<string> {
  const now = new Date().toISOString();
  const fullData: Omit<Campaign, 'id'> = {
    ...campaignData,
    createdAt: now,
    updatedAt: now
  };

  if (isDemoUser && import.meta.env.DEV) {
    const id = `camp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newCamp: Campaign = {
      id,
      ...fullData
    };
    const current = getLocalCampaigns();
    current.unshift(newCamp);
    saveLocalCampaigns(current);
    return id;
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const campaignsRef = collection(db, CAMPAIGNS_COLLECTION);
  const docRef = await addDoc(campaignsRef, fullData);
  return docRef.id;
}

export async function updateCampaign(id: string, updates: Partial<Campaign>, isDemoUser?: boolean): Promise<void> {
  const now = new Date().toISOString();
  const updatePayload = {
    ...updates,
    updatedAt: now
  };

  if (isDemoUser && import.meta.env.DEV) {
    const current = getLocalCampaigns();
    const index = current.findIndex(c => c.id === id);
    if (index !== -1) {
      current[index] = {
        ...current[index],
        ...updatePayload
      };
      saveLocalCampaigns(current);
    }
    return;
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const docRef = doc(db, CAMPAIGNS_COLLECTION, id);
  await updateDoc(docRef, updatePayload);
}

export async function deleteCampaign(id: string, isDemoUser?: boolean): Promise<void> {
  if (isDemoUser && import.meta.env.DEV) {
    const current = getLocalCampaigns();
    saveLocalCampaigns(current.filter(c => c.id !== id));
    return;
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const docRef = doc(db, CAMPAIGNS_COLLECTION, id);
  await deleteDoc(docRef);
}
