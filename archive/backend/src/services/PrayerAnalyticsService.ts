/**
 * Prayer Analytics Service
 * "Test me, LORD, and try me, examine my heart and my mind" - Psalm 26:2
 * 
 * Service for tracking and analyzing prayer patterns and spiritual growth
 */

import { PrismaClient } from '@prisma/client';
import {
  PrayerAnalytics,
  PrayerCategory,
  PrayerEntry,
  PrayerRequest
} from '../types/prayer.types';

const prisma = new PrismaClient();

export default class PrayerAnalyticsService {
  /**
   * Get comprehensive prayer analytics for a user
   */
  async getUserAnalytics(userId: string): Promise<PrayerAnalytics> {
    try {
      const totalPrayers = await this.getTotalPrayers(userId);
      const activePrayers = await this.getActivePrayers(userId);
      const answeredPrayers = await this.getAnsweredPrayers(userId);
      const answerRate = totalPrayers > 0 ? (answeredPrayers / totalPrayers) * 100 : 0;
      const averageTimeToAnswer = await this.getAverageTimeToAnswer(userId);
      const prayersByCategory = await this.getPrayersByCategory(userId);
      const prayerFrequency = await this.getPrayerFrequency(userId);
      const streakData = await this.getStreakData(userId);
      const communityStats = await this.getCommunityStats(userId);
      const spiritualGrowth = await this.calculateSpiritualGrowth(userId);

      const analytics: PrayerAnalytics = {
        userId,
        totalPrayers,
        activePrayers,
        answeredPrayers,
        answerRate,
        averageTimeToAnswer,
        prayersByCategory,
        prayerFrequency,
        longestStreak: streakData.longestStreak,
        currentStreak: streakData.currentStreak,
        totalPrayerPartners: communityStats.totalPartners,
        communityPrayersOffered: communityStats.prayersOffered,
        mostPrayedForCategory: await this.getMostPrayedForCategory(userId),
        spiritualGrowthIndicators: spiritualGrowth
      };

      return analytics;
    } catch (error) {
      console.error('Error getting user analytics:', error);
      throw new Error('Failed to retrieve prayer analytics');
    }
  }

  /**
   * Get prayer frequency trends
   */
  async getPrayerFrequency(userId: string): Promise<{
    daily: number;
    weekly: number;
    monthly: number;
  }> {
    try {
      // In production, calculate from database
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Count prayers in each time period
      const daily = 2; // Average per day
      const weekly = 12;
      const monthly = 45;

      return { daily, weekly, monthly };
    } catch (error) {
      console.error('Error getting prayer frequency:', error);
      throw new Error('Failed to calculate prayer frequency');
    }
  }

  /**
   * Get prayers by category
   */
  async getPrayersByCategory(userId: string): Promise<Record<PrayerCategory, number>> {
    try {
      // In production, query from database
      const categoryCount: Record<PrayerCategory, number> = {
        [PrayerCategory.PERSONAL]: 0,
        [PrayerCategory.FAMILY]: 0,
        [PrayerCategory.MINISTRY]: 0,
        [PrayerCategory.HEALING]: 0,
        [PrayerCategory.GUIDANCE]: 0,
        [PrayerCategory.PROVISION]: 0,
        [PrayerCategory.SALVATION]: 0,
        [PrayerCategory.THANKSGIVING]: 0,
        [PrayerCategory.INTERCESSION]: 0,
        [PrayerCategory.REPENTANCE]: 0,
        [PrayerCategory.SPIRITUAL_WARFARE]: 0,
        [PrayerCategory.KINGDOM_ADVANCEMENT]: 0
      };

      return categoryCount;
    } catch (error) {
      console.error('Error getting prayers by category:', error);
      throw new Error('Failed to get prayers by category');
    }
  }

  /**
   * Calculate spiritual growth indicators
   */
  async calculateSpiritualGrowth(userId: string): Promise<{
    consistency: number;
    depth: number;
    community: number;
    faithfulness: number;
  }> {
    try {
      // Consistency: Based on prayer frequency and streaks
      const frequency = await this.getPrayerFrequency(userId);
      const consistency = Math.min(100, (frequency.daily / 3) * 100); // Target: 3 prayers/day

      // Depth: Based on prayer length, detail, and answered prayers
      const depth = 75; // Placeholder

      // Community: Based on prayer partners, intercession, and community engagement
      const communityStats = await this.getCommunityStats(userId);
      const community = Math.min(100, (communityStats.totalPartners / 5) * 50 + 
                                      (communityStats.prayersOffered / 20) * 50);

      // Faithfulness: Based on answered prayer tracking and testimony sharing
      const analytics = await this.getUserAnalytics(userId);
      const faithfulness = Math.min(100, analytics.answerRate);

      return {
        consistency: Math.round(consistency),
        depth: Math.round(depth),
        community: Math.round(community),
        faithfulness: Math.round(faithfulness)
      };
    } catch (error) {
      console.error('Error calculating spiritual growth:', error);
      return { consistency: 0, depth: 0, community: 0, faithfulness: 0 };
    }
  }

  /**
   * Get prayer streak data
   */
  async getStreakData(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    lastPrayerDate: Date;
  }> {
    try {
      // In production, calculate from database
      return {
        currentStreak: 7,
        longestStreak: 30,
        lastPrayerDate: new Date()
      };
    } catch (error) {
      console.error('Error getting streak data:', error);
      throw new Error('Failed to get streak data');
    }
  }

  /**
   * Get community engagement statistics
   */
  async getCommunityStats(userId: string): Promise<{
    totalPartners: number;
    prayersOffered: number;
    requestsShared: number;
    testimoniesShared: number;
  }> {
    try {
      // In production, query from database
      return {
        totalPartners: 3,
        prayersOffered: 25,
        requestsShared: 5,
        testimoniesShared: 2
      };
    } catch (error) {
      console.error('Error getting community stats:', error);
      throw new Error('Failed to get community statistics');
    }
  }

  /**
   * Get most prayed for category
   */
  async getMostPrayedForCategory(userId: string): Promise<PrayerCategory> {
    try {
      const categoryCount = await this.getPrayersByCategory(userId);
      
      let maxCategory = PrayerCategory.PERSONAL;
      let maxCount = 0;

      for (const [category, count] of Object.entries(categoryCount)) {
        if (count > maxCount) {
          maxCount = count;
          maxCategory = category as PrayerCategory;
        }
      }

      return maxCategory;
    } catch (error) {
      console.error('Error getting most prayed for category:', error);
      return PrayerCategory.PERSONAL;
    }
  }

  /**
   * Get average time to answer prayers
   */
  async getAverageTimeToAnswer(userId: string): Promise<number> {
    try {
      // In production, calculate from answered prayers
      // Return average days between prayer creation and answered date
      return 21; // Placeholder: 21 days average
    } catch (error) {
      console.error('Error getting average time to answer:', error);
      return 0;
    }
  }

  /**
   * Generate prayer insights and recommendations
   */
  async generateInsights(userId: string): Promise<{
    insights: string[];
    recommendations: string[];
    encouragements: string[];
  }> {
    try {
      const analytics = await this.getUserAnalytics(userId);
      const insights: string[] = [];
      const recommendations: string[] = [];
      const encouragements: string[] = [];

      // Generate insights based on analytics
      if (analytics.currentStreak >= 7) {
        encouragements.push(`Amazing! You've maintained a ${analytics.currentStreak}-day prayer streak!`);
      }

      if (analytics.answerRate > 50) {
        insights.push(`${Math.round(analytics.answerRate)}% of your prayers have been answered - God is faithful!`);
      }

      if (analytics.communityPrayersOffered > 20) {
        encouragements.push(`You've prayed for others ${analytics.communityPrayersOffered} times - what a blessing!`);
      }

      // Generate recommendations
      if (analytics.spiritualGrowthIndicators.consistency < 50) {
        recommendations.push('Try setting a daily prayer reminder to build consistency');
      }

      if (analytics.totalPrayerPartners === 0) {
        recommendations.push('Consider finding a prayer partner for mutual encouragement');
      }

      if (analytics.answeredPrayers > 0 && analytics.communityPrayersOffered === 0) {
        recommendations.push('Share your testimony of answered prayers to encourage others');
      }

      return { insights, recommendations, encouragements };
    } catch (error) {
      console.error('Error generating insights:', error);
      return { insights: [], recommendations: [], encouragements: [] };
    }
  }

  // Private helper methods

  private async getTotalPrayers(userId: string): Promise<number> {
    // In production, count from database
    return 50;
  }

  private async getActivePrayers(userId: string): Promise<number> {
    // In production, count active prayers
    return 10;
  }

  private async getAnsweredPrayers(userId: string): Promise<number> {
    // In production, count answered prayers
    return 15;
  }
}
