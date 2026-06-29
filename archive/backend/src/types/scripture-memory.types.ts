/**
 * Scripture Memory System Types
 * Comprehensive type definitions for scripture memorization with spaced repetition
 */

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type QuizFormat = 'fill_in_blank' | 'multiple_choice' | 'recitation' | 'typing';
export type MasteryLevel = 'beginner' | 'learning' | 'familiar' | 'proficient' | 'mastered';

/**
 * Scripture verse in the memory library
 */
export interface MemoryVerse {
  id: string;
  reference: string;
  text: string;
  translation: string;
  category: string;
  difficulty: DifficultyLevel;
  tags: string[];
  audioUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User's progress on a specific verse
 */
export interface VerseProgress {
  id: string;
  userId: string;
  verseId: string;
  nextReviewDate: Date;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  masteryLevel: number; // 0-100
  masteryStatus: MasteryLevel;
  easeFactor: number; // Spaced repetition ease factor
  interval: number; // Days until next review
  lastReviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Quiz question for verse memorization
 */
export interface MemoryQuiz {
  id: string;
  verseId: string;
  format: QuizFormat;
  question: string;
  correctAnswer: string;
  options?: string[]; // For multiple choice
  blanks?: number[]; // Word positions for fill-in-blank
  hints?: string[];
  createdAt: Date;
}

/**
 * User's quiz attempt
 */
export interface QuizAttempt {
  id: string;
  userId: string;
  verseId: string;
  quizId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent: number; // seconds
  hintsUsed: number;
  attemptedAt: Date;
}

/**
 * Verse memorization challenge
 */
export interface MemorizationChallenge {
  id: string;
  title: string;
  description: string;
  verseIds: string[];
  startDate: Date;
  endDate: Date;
  participantCount: number;
  scrollCoinReward: number;
  badgeReward?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

/**
 * User's participation in a challenge
 */
export interface ChallengeParticipation {
  id: string;
  userId: string;
  challengeId: string;
  progress: number; // 0-100
  versesCompleted: number;
  totalVerses: number;
  rank?: number;
  completedAt?: Date;
  scrollCoinEarned: number;
  joinedAt: Date;
}

/**
 * Shared verse with social features
 */
export interface SharedVerse {
  id: string;
  userId: string;
  verseId: string;
  caption?: string;
  likes: number;
  comments: number;
  shares: number;
  isPublic: boolean;
  sharedAt: Date;
}

/**
 * Request to create a new verse
 */
export interface CreateVerseRequest {
  reference: string;
  text: string;
  translation: string;
  category: string;
  difficulty: DifficultyLevel;
  tags?: string[];
  audioUrl?: string;
}

/**
 * Request to update verse progress
 */
export interface UpdateProgressRequest {
  verseId: string;
  isCorrect: boolean;
  timeSpent: number;
  quizFormat: QuizFormat;
}

/**
 * Request to create a challenge
 */
export interface CreateChallengeRequest {
  title: string;
  description: string;
  verseIds: string[];
  startDate: Date;
  endDate: Date;
  scrollCoinReward: number;
  badgeReward?: string;
}

/**
 * Spaced repetition algorithm parameters
 */
export interface SpacedRepetitionParams {
  easeFactor: number;
  interval: number;
  repetitions: number;
  quality: number; // 0-5 rating of recall quality
}

/**
 * User's overall scripture memory statistics
 */
export interface MemoryStatistics {
  totalVerses: number;
  versesInProgress: number;
  versesMastered: number;
  currentStreak: number;
  longestStreak: number;
  totalReviews: number;
  averageAccuracy: number;
  scrollCoinEarned: number;
  challengesCompleted: number;
  rank?: number;
}

/**
 * Audio playback configuration
 */
export interface AudioPlaybackConfig {
  verseId: string;
  speed: number; // 0.5 - 2.0
  repeat: boolean;
  autoPlay: boolean;
}

/**
 * Verse library filter options
 */
export interface VerseFilterOptions {
  category?: string;
  difficulty?: DifficultyLevel;
  translation?: string;
  tags?: string[];
  searchQuery?: string;
  sortBy?: 'reference' | 'difficulty' | 'popularity' | 'recent';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Service response wrapper
 */
export interface ScriptureMemoryResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
