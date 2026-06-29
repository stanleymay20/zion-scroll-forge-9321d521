/**
 * Daily Devotion Service
 * Core service for managing daily devotions
 */

import { PrismaClient } from '@prisma/client';
import {
  DailyDevotion,
  DevotionCompletion,
  DevotionStreak,
  DevotionPreferences,
  DevotionContent,
  DevotionAnalytics
} from '../types/devotion.types';

const prisma = new PrismaClient();

export default class DailyDevotionService {
  /**
   * Get devotion for a specific date
   */
  async getDevotionByDate(date: Date): Promise<DailyDevotion | null> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // In a real implementation, this would query the database
      // For now, return a placeholder
      const devotion: DailyDevotion = {
        id: `devotion_${date.toISOString().split('T')[0]}`,
        date: startOfDay,
        title: 'Walking in Faith',
        theme: 'Trust and Obedience',
        scripture: {
          reference: 'Proverbs 3:5-6',
          text: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.',
          translation: 'NIV'
        },
        reflection: 'Today, we explore what it means to truly trust God with every aspect of our lives...',
        prayerPrompt: 'Lord, help me to trust You completely, even when I cannot see the path ahead...',
        actionStep: 'Identify one area where you are relying on your own understanding and surrender it to God today.',
        tags: ['faith', 'trust', 'obedience'],
        estimatedReadTime: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return devotion;
    } catch (error) {
      console.error('Error getting devotion by date:', error);
      throw new Error('Failed to retrieve devotion');
    }
  }

  /**
   * Get today's devotion for a user (timezone-aware)
   */
  async getTodaysDevotion(userId: string, timezone: string = 'UTC'): Promise<DevotionContent> {
    try {
      // Get user's local date based on timezone
      const userDate = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
      
      const devotion = await this.getDevotionByDate(userDate);
      
      if (!devotion) {
        throw new Error('No devotion available for today');
      }

      // Get user's completion status
      const completion = await this.getUserCompletion(userId, devotion.id);

      // Get discussions
      const discussions = await this.getDevotionDiscussions(devotion.id);

      // Get related devotions
      const relatedDevotions = await this.getRelatedDevotions(devotion.id, 3);

      return {
        devotion,
        userCompletion: completion || undefined,
        discussions,
        relatedDevotions
      };
    } catch (error) {
      console.error('Error getting today\'s devotion:', error);
      throw new Error('Failed to retrieve today\'s devotion');
    }
  }

  /**
   * Mark devotion as completed
   */
  async completeDevotion(
    userId: string,
    devotionId: string,
    notes?: string,
    rating?: number,
    timeSpent?: number
  ): Promise<DevotionCompletion> {
    try {
      const completion: DevotionCompletion = {
        id: `completion_${Date.now()}`,
        userId,
        devotionId,
        completedAt: new Date(),
        notes,
        rating,
        timeSpent,
        shared: false
      };

      // In a real implementation, save to database
      // await prisma.devotionCompletion.create({ data: completion });

      // Update streak
      await this.updateStreak(userId);

      return completion;
    } catch (error) {
      console.error('Error completing devotion:', error);
      throw new Error('Failed to complete devotion');
    }
  }

  /**
   * Get user's devotion streak
   */
  async getUserStreak(userId: string): Promise<DevotionStreak> {
    try {
      // In a real implementation, query from database
      // For now, return placeholder
      const streak: DevotionStreak = {
        userId,
        currentStreak: 7,
        longestStreak: 30,
        totalCompletions: 45,
        lastCompletionDate: new Date(),
        streakStartDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        milestones: [
          { days: 7, achievedAt: new Date(), reward: '7-day badge' },
          { days: 30, achievedAt: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000), reward: '30-day badge' }
        ]
      };

      return streak;
    } catch (error) {
      console.error('Error getting user streak:', error);
      throw new Error('Failed to retrieve streak data');
    }
  }

  /**
   * Update user's streak
   */
  private async updateStreak(userId: string): Promise<void> {
    try {
      const streak = await this.getUserStreak(userId);
      const now = new Date();
      const lastCompletion = streak.lastCompletionDate;

      // Calculate days since last completion
      const daysSinceLastCompletion = Math.floor(
        (now.getTime() - lastCompletion.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastCompletion === 0) {
        // Already completed today
        return;
      } else if (daysSinceLastCompletion === 1) {
        // Consecutive day - increment streak
        streak.currentStreak++;
        if (streak.currentStreak > streak.longestStreak) {
          streak.longestStreak = streak.currentStreak;
        }
      } else {
        // Streak broken - reset
        streak.currentStreak = 1;
        streak.streakStartDate = now;
      }

      streak.totalCompletions++;
      streak.lastCompletionDate = now;

      // Check for milestone achievements
      const milestoneThresholds = [7, 14, 30, 60, 90, 180, 365];
      for (const threshold of milestoneThresholds) {
        if (streak.currentStreak === threshold) {
          const existingMilestone = streak.milestones.find(m => m.days === threshold);
          if (!existingMilestone) {
            streak.milestones.push({
              days: threshold,
              achievedAt: now,
              reward: `${threshold}-day badge`
            });
          }
        }
      }

      // In a real implementation, save to database
      // await prisma.devotionStreak.update({ where: { userId }, data: streak });
    } catch (error) {
      console.error('Error updating streak:', error);
      throw new Error('Failed to update streak');
    }
  }

  /**
   * Get user's devotion preferences
   */
  async getUserPreferences(userId: string): Promise<DevotionPreferences> {
    try {
      // In a real implementation, query from database
      const preferences: DevotionPreferences = {
        userId,
        preferredTranslation: 'NIV',
        preferredTime: '07:00',
        timezone: 'America/New_York',
        topics: ['faith', 'prayer', 'worship'],
        difficulty: 'intermediate',
        audioEnabled: true,
        notificationsEnabled: true,
        reminderTime: '07:00'
      };

      return preferences;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw new Error('Failed to retrieve preferences');
    }
  }

  /**
   * Update user's devotion preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<DevotionPreferences>
  ): Promise<DevotionPreferences> {
    try {
      const currentPreferences = await this.getUserPreferences(userId);
      const updatedPreferences = { ...currentPreferences, ...preferences };

      // In a real implementation, save to database
      // await prisma.devotionPreferences.update({ where: { userId }, data: updatedPreferences });

      return updatedPreferences;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw new Error('Failed to update preferences');
    }
  }

  /**
   * Get devotion discussions
   */
  async getDevotionDiscussions(devotionId: string, limit: number = 20): Promise<any[]> {
    try {
      // In a real implementation, query from database
      return [];
    } catch (error) {
      console.error('Error getting discussions:', error);
      throw new Error('Failed to retrieve discussions');
    }
  }

  /**
   * Add discussion comment
   */
  async addDiscussion(
    devotionId: string,
    userId: string,
    content: string,
    parentId?: string
  ): Promise<any> {
    try {
      const discussion = {
        id: `discussion_${Date.now()}`,
        devotionId,
        userId,
        content,
        parentId,
        likes: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // In a real implementation, save to database
      // await prisma.devotionDiscussion.create({ data: discussion });

      return discussion;
    } catch (error) {
      console.error('Error adding discussion:', error);
      throw new Error('Failed to add discussion');
    }
  }

  /**
   * Get related devotions
   */
  async getRelatedDevotions(devotionId: string, limit: number = 5): Promise<DailyDevotion[]> {
    try {
      // In a real implementation, find related devotions based on tags, theme, etc.
      return [];
    } catch (error) {
      console.error('Error getting related devotions:', error);
      throw new Error('Failed to retrieve related devotions');
    }
  }

  /**
   * Get user's completion status for a devotion
   */
  async getUserCompletion(userId: string, devotionId: string): Promise<DevotionCompletion | null> {
    try {
      // In a real implementation, query from database
      return null;
    } catch (error) {
      console.error('Error getting user completion:', error);
      throw new Error('Failed to retrieve completion status');
    }
  }

  /**
   * Get user's devotion analytics
   */
  async getUserAnalytics(userId: string): Promise<DevotionAnalytics> {
    try {
      const streak = await this.getUserStreak(userId);

      const analytics: DevotionAnalytics = {
        userId,
        totalCompletions: streak.totalCompletions,
        averageRating: 4.5,
        favoriteTopics: ['faith', 'prayer', 'worship'],
        completionRate: 85,
        averageTimeSpent: 8,
        streakData: streak,
        engagementTrend: 'increasing'
      };

      return analytics;
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw new Error('Failed to retrieve analytics');
    }
  }

  /**
   * Get devotion history for a user
   */
  async getUserHistory(
    userId: string,
    limit: number = 30,
    offset: number = 0
  ): Promise<{ devotion: DailyDevotion; completion?: DevotionCompletion }[]> {
    try {
      // In a real implementation, query from database
      return [];
    } catch (error) {
      console.error('Error getting user history:', error);
      throw new Error('Failed to retrieve history');
    }
  }

  /**
   * Share devotion
   */
  async shareDevotion(userId: string, devotionId: string, platform: string): Promise<{ shareUrl: string }> {
    try {
      const shareUrl = `${process.env.APP_URL || 'https://scrolluniversity.com'}/devotions/${devotionId}?shared_by=${userId}`;

      // In a real implementation, track sharing analytics
      // await prisma.devotionShare.create({ data: { userId, devotionId, platform, sharedAt: new Date() } });

      return { shareUrl };
    } catch (error) {
      console.error('Error sharing devotion:', error);
      throw new Error('Failed to share devotion');
    }
  }
}
