/**
 * Prayer Journal and Requests Type Definitions
 * "Let us then approach God's throne of grace with confidence" - Hebrews 4:16
 */

export interface PrayerEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: PrayerCategory;
  isPrivate: boolean;
  tags: string[];
  
  // Tracking
  answered: boolean;
  answeredDate?: Date;
  testimony?: string;
  
  // Community
  prayerPartners: string[]; // User IDs
  prayerCount: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export enum PrayerCategory {
  PERSONAL = 'personal',
  FAMILY = 'family',
  MINISTRY = 'ministry',
  HEALING = 'healing',
  GUIDANCE = 'guidance',
  PROVISION = 'provision',
  SALVATION = 'salvation',
  THANKSGIVING = 'thanksgiving',
  INTERCESSION = 'intercession',
  REPENTANCE = 'repentance',
  SPIRITUAL_WARFARE = 'spiritual_warfare',
  KINGDOM_ADVANCEMENT = 'kingdom_advancement'
}

export interface PrayerRequest {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: PrayerCategory;
  urgency: PrayerUrgency;
  isAnonymous: boolean;
  
  // Community Engagement
  prayerCount: number;
  intercessors: string[]; // User IDs who are praying
  updates: PrayerUpdate[];
  
  // Status
  status: PrayerRequestStatus;
  answered: boolean;
  answeredDate?: Date;
  testimony?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export enum PrayerUrgency {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum PrayerRequestStatus {
  ACTIVE = 'active',
  ANSWERED = 'answered',
  CLOSED = 'closed',
  ARCHIVED = 'archived'
}

export interface PrayerUpdate {
  id: string;
  prayerRequestId: string;
  userId: string;
  content: string;
  updateType: 'progress' | 'testimony' | 'answered' | 'general';
  createdAt: Date;
}

export interface PrayerPartner {
  id: string;
  userId: string;
  partnerId: string;
  status: PartnerStatus;
  matchedAt: Date;
  lastPrayedTogether?: Date;
  sharedPrayers: number;
  compatibility: number; // 0-100 score
}

export enum PartnerStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked'
}

export interface PrayerPartnerMatch {
  partner: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    spiritualGifts: string[];
    prayerInterests: string[];
  };
  compatibility: number;
  sharedInterests: string[];
  matchReason: string;
}

export interface AnsweredPrayer {
  id: string;
  prayerEntryId?: string;
  prayerRequestId?: string;
  userId: string;
  title: string;
  originalRequest: string;
  testimony: string;
  answeredDate: Date;
  timeToAnswer: number; // days
  category: PrayerCategory;
  isPublic: boolean;
  likes: number;
  comments: TestimonyComment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TestimonyComment {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
}

export interface PrayerReminder {
  id: string;
  userId: string;
  prayerEntryId?: string;
  prayerRequestId?: string;
  reminderTime: string; // HH:MM format
  frequency: ReminderFrequency;
  daysOfWeek?: number[]; // 0-6 for Sunday-Saturday
  isActive: boolean;
  lastSent?: Date;
  nextScheduled?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum ReminderFrequency {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  CUSTOM = 'custom'
}

export interface PrayerAnalytics {
  userId: string;
  totalPrayers: number;
  activePrayers: number;
  answeredPrayers: number;
  answerRate: number; // percentage
  averageTimeToAnswer: number; // days
  prayersByCategory: Record<PrayerCategory, number>;
  prayerFrequency: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  longestStreak: number;
  currentStreak: number;
  totalPrayerPartners: number;
  communityPrayersOffered: number;
  mostPrayedForCategory: PrayerCategory;
  spiritualGrowthIndicators: {
    consistency: number; // 0-100
    depth: number; // 0-100
    community: number; // 0-100
    faithfulness: number; // 0-100
  };
}

export interface PrayerWall {
  id: string;
  name: string;
  description: string;
  type: WallType;
  isPublic: boolean;
  moderators: string[]; // User IDs
  requests: PrayerRequest[];
  memberCount: number;
  totalPrayers: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum WallType {
  GLOBAL = 'global',
  COURSE = 'course',
  FACULTY = 'faculty',
  MINISTRY = 'ministry',
  PRIVATE_GROUP = 'private_group'
}

export interface PrayerJournalEntry {
  entry: PrayerEntry;
  relatedRequests: PrayerRequest[];
  prayerPartners: PrayerPartner[];
  reminders: PrayerReminder[];
}

export interface PrayerDashboard {
  recentEntries: PrayerEntry[];
  activePrayerRequests: PrayerRequest[];
  answeredPrayers: AnsweredPrayer[];
  prayerPartners: PrayerPartner[];
  analytics: PrayerAnalytics;
  upcomingReminders: PrayerReminder[];
  communityHighlights: {
    recentTestimonies: AnsweredPrayer[];
    urgentRequests: PrayerRequest[];
    prayerWalls: PrayerWall[];
  };
}

export interface CreatePrayerEntryRequest {
  title: string;
  content: string;
  category: PrayerCategory;
  isPrivate: boolean;
  tags?: string[];
}

export interface UpdatePrayerEntryRequest {
  title?: string;
  content?: string;
  category?: PrayerCategory;
  isPrivate?: boolean;
  tags?: string[];
  answered?: boolean;
  answeredDate?: Date;
  testimony?: string;
}

export interface CreatePrayerRequestRequest {
  title: string;
  description: string;
  category: PrayerCategory;
  urgency: PrayerUrgency;
  isAnonymous?: boolean;
  expiresAt?: Date;
}

export interface UpdatePrayerRequestRequest {
  title?: string;
  description?: string;
  category?: PrayerCategory;
  urgency?: PrayerUrgency;
  status?: PrayerRequestStatus;
  answered?: boolean;
  answeredDate?: Date;
  testimony?: string;
}

export interface PrayForRequestRequest {
  prayerRequestId: string;
  note?: string;
}

export interface CreatePrayerPartnerRequest {
  partnerId: string;
  message?: string;
}

export interface PrayerPartnerPreferences {
  userId: string;
  prayerInterests: string[];
  availability: string[];
  preferredCommunication: 'chat' | 'video' | 'both';
  maxPartners: number;
  autoMatch: boolean;
}

export interface PrayerNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string; // Prayer entry or request ID
  read: boolean;
  createdAt: Date;
}

export enum NotificationType {
  PRAYER_ANSWERED = 'prayer_answered',
  PARTNER_REQUEST = 'partner_request',
  PARTNER_ACCEPTED = 'partner_accepted',
  PRAYER_UPDATE = 'prayer_update',
  REMINDER = 'reminder',
  TESTIMONY_SHARED = 'testimony_shared',
  URGENT_REQUEST = 'urgent_request',
  MILESTONE_ACHIEVED = 'milestone_achieved'
}
