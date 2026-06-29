/**
 * Daily Devotion Types
 * Types for daily devotion system
 */

export interface DailyDevotion {
  id: string;
  date: Date;
  title: string;
  theme: string;
  scripture: ScripturePassage;
  reflection: string;
  prayerPrompt: string;
  actionStep: string;
  audioUrl?: string;
  imageUrl?: string;
  author?: string;
  tags: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number; // minutes
  createdAt: Date;
  updatedAt: Date;
}

export interface ScripturePassage {
  reference: string;
  text: string;
  translation: 'NIV' | 'ESV' | 'KJV' | 'NKJV' | 'NLT' | 'NASB';
  audioUrl?: string;
  context?: string;
}

export interface DevotionCompletion {
  id: string;
  userId: string;
  devotionId: string;
  completedAt: Date;
  notes?: string;
  rating?: number; // 1-5
  timeSpent?: number; // minutes
  shared: boolean;
}

export interface DevotionStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  lastCompletionDate: Date;
  streakStartDate: Date;
  milestones: StreakMilestone[];
}

export interface StreakMilestone {
  days: number;
  achievedAt: Date;
  reward?: string;
}

export interface DevotionDiscussion {
  id: string;
  devotionId: string;
  userId: string;
  content: string;
  parentId?: string; // For replies
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DevotionRecommendation {
  devotionId: string;
  score: number;
  reason: string;
  relevantTo: string[];
}

export interface DevotionPreferences {
  userId: string;
  preferredTranslation: ScripturePassage['translation'];
  preferredTime: string; // HH:MM format
  timezone: string;
  topics: string[];
  difficulty: DailyDevotion['difficulty'];
  audioEnabled: boolean;
  notificationsEnabled: boolean;
  reminderTime?: string;
}

export interface DevotionAnalytics {
  userId: string;
  totalCompletions: number;
  averageRating: number;
  favoriteTopics: string[];
  completionRate: number; // percentage
  averageTimeSpent: number; // minutes
  streakData: DevotionStreak;
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
}

export interface DevotionContent {
  devotion: DailyDevotion;
  previousDevotion?: DailyDevotion;
  nextDevotion?: DailyDevotion;
  userCompletion?: DevotionCompletion;
  discussions: DevotionDiscussion[];
  relatedDevotions: DailyDevotion[];
}

export interface DevotionCreationRequest {
  date: Date;
  theme: string;
  scriptureReference: string;
  translation?: ScripturePassage['translation'];
  targetAudience?: string;
  difficulty?: DailyDevotion['difficulty'];
  tags?: string[];
}

export interface DevotionDeliverySchedule {
  userId: string;
  devotionId: string;
  scheduledFor: Date;
  delivered: boolean;
  deliveredAt?: Date;
  opened: boolean;
  openedAt?: Date;
}

export interface BibleTranslation {
  code: string;
  name: string;
  language: string;
  description: string;
  available: boolean;
}

export const AVAILABLE_TRANSLATIONS: BibleTranslation[] = [
  { code: 'NIV', name: 'New International Version', language: 'English', description: 'Modern, readable translation', available: true },
  { code: 'ESV', name: 'English Standard Version', language: 'English', description: 'Literal, word-for-word translation', available: true },
  { code: 'KJV', name: 'King James Version', language: 'English', description: 'Traditional, poetic translation', available: true },
  { code: 'NKJV', name: 'New King James Version', language: 'English', description: 'Updated KJV with modern language', available: true },
  { code: 'NLT', name: 'New Living Translation', language: 'English', description: 'Thought-for-thought, easy to read', available: true },
  { code: 'NASB', name: 'New American Standard Bible', language: 'English', description: 'Highly literal translation', available: true }
];
