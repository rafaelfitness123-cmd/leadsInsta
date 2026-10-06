import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'admin' | 'user';
}

export interface ProspectBoard {
  id: string;
  name: string;
  subtitle?: string;
  niche?: string;
  description?: string;
  color?: string;
  messageCampaignId?: string;
  leadCount: number;
  responseRate: number;
  ownerId: string;
  createdAt: Timestamp;
}

export type LeadStatus = 'new' | 'qualified' | 'contacted' | 'responded' | 'interested' | 'proposal' | 'closed';

export interface Lead {
  id: string;
  boardId: string;
  ownerId: string;
  name?: string;
  instagramHandle: string;
  instagramUrl?: string;
  followersCount?: number;
  city?: string;
  bio?: string;
  status: LeadStatus;
  score: number;
  parsingConfidence: number;
  tags: string[];
  isFavorite: boolean;
  isAnalyzed: boolean;
  lastContactedAt?: Timestamp;
  nextFollowUpAt?: Timestamp;
  createdAt: Timestamp;
  notes?: string;
  assignedMessage?: string;
}

export interface MessageCampaign {
  id: string;
  name: string;
  niche?: string;
  ownerId: string;
  isActive: boolean;
}

export interface MessageVariation {
  id: string;
  campaignId: string;
  title: string;
  text: string;
  isActive: boolean;
  ownerId: string;
}

export interface LeadHistory {
  id: string;
  leadId: string;
  type: 'status_change' | 'message_sent' | 'note_added' | 'follow_up_scheduled';
  content: string;
  variationId?: string;
  createdAt: Timestamp;
}
