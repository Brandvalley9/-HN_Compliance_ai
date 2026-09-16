export interface Campaign {
  id?: string;
  name: string;
  productDescription: string;
  productType: string;
  targetAudience: string;
  platforms: string[];
  approvedClaims: string[];
  prohibitedClaims: string[];
  requiredDisclosures: string[];
  instructions: string;
  ownerId: string;
  ownerEmail?: string | null;
  assignedCreators?: string[]; // creator user IDs or handles assigned to this campaign
  createdAt?: string;
  updatedAt?: string;
}

export type PlatformOption = 'Instagram' | 'TikTok' | 'YouTube' | 'Facebook' | 'X / Twitter' | 'LinkedIn';
