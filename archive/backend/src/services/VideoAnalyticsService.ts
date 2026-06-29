/**
 * Video Analytics Service
 * "Measure every view, understand every pattern, optimize every scroll"
 * 
 * Handles comprehensive video analytics including watch time, completion rates, and engagement
 */

import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import {
  VideoAnalytics,
  VideoAnalyticsQuery,
  DropOffPoint,
  VideoQuality
} from '../types/video-streaming.types';

export default class VideoAnalyticsService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Get comprehensive video analytics
   */
  async getVideoAnalytics(query: VideoAnalyticsQuery): Promise<VideoAnalytics[]> {
    try {
      logger.info('Getting video analytics', query);

      if (query.lectureId) {
        const analytics = await this.getLectureAnalytics(query.lectureId, query);
        return [analytics];
      }

      if (query.courseId) {
        return await this.getCourseAnalytics(query.courseId, query);
      }

      if (query.moduleId) {
        return await this.getModuleAnalytics(query.moduleId, query);
      }

      return [];
    } catch (error) {
      logger.error('Error getting video analytics:', error);
      throw new Error(`Failed to get video analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get analytics for a specific lecture
   */
  private async getLectureAnalytics(
    lectureId: string,
    query: VideoAnalyticsQuery
  ): Promise<VideoAnalytics> {
    try {
      // Build date filter
      const dateFilter: any = {};
      if (query.startDate) {
        dateFilter.gte = query.startDate;
      }
      if (query.endDate) {
        dateFilter.lte = query.endDate;
      }

      // Get progress records
      const progressRecords = await this.prisma.lectureProgress.findMany({
        where: {
          lectureId,
          ...(Object.keys(dateFilter).length > 0 && {
            lastWatchedAt: dateFilter
          })
        }
      });

      // Calculate metrics
      const totalViews = progressRecords.reduce((sum, p) => sum + p.watchCount, 0);
      const uniqueViewers = progressRecords.length;
      const totalWatchTime = progressRecords.reduce((sum, p) => sum + p.totalWatchTime, 0);
      const averageWatchTime = uniqueViewers > 0 ? totalWatchTime / uniqueViewers : 0;
      const completedCount = progressRecords.filter(p => p.completed).length;
      const completionRate = uniqueViewers > 0 ? (completedCount / uniqueViewers) * 100 : 0;

      // Calculate rewatch rate
      const rewatchCount = progressRecords.filter(p => p.watchCount > 1).length;
      const rewatchRate = uniqueViewers > 0 ? (rewatchCount / uniqueViewers) * 100 : 0;

      // Get drop-off points
      const dropOffPoints = await this.calculateDropOffPoints(lectureId);

      // Calculate engagement score (0-100)
      const engagementScore = this.calculateEngagementScore({
        completionRate,
        averageWatchTime,
        rewatchRate,
        totalViews,
        uniqueViewers
      });

      // Get quality distribution (mock data for now)
      const qualityDistribution = {
        [VideoQuality.AUTO]: 0,
        [VideoQuality.LOW]: 10,
        [VideoQuality.MEDIUM]: 25,
        [VideoQuality.HIGH]: 45,
        [VideoQuality.FULL_HD]: 20,
        [VideoQuality.ULTRA_HD]: 0
      };

      // Get device distribution (mock data for now)
      const deviceDistribution = {
        'Desktop': 60,
        'Mobile': 30,
        'Tablet': 10
      };

      return {
        lectureId,
        totalViews,
        uniqueViewers,
        averageWatchTime,
        completionRate,
        rewatchRate,
        dropOffPoints,
        engagementScore,
        qualityDistribution,
        deviceDistribution
      };
    } catch (error) {
      logger.error('Error getting lecture analytics:', error);
      throw error;
    }
  }

  /**
   * Get analytics for all lectures in a course
   */
  private async getCourseAnalytics(
    courseId: string,
    query: VideoAnalyticsQuery
  ): Promise<VideoAnalytics[]> {
    try {
      const lectures = await this.prisma.lecture.findMany({
        where: {
          module: {
            courseId
          }
        },
        select: {
          id: true
        }
      });

      const analyticsPromises = lectures.map(lecture =>
        this.getLectureAnalytics(lecture.id, query)
      );

      return await Promise.all(analyticsPromises);
    } catch (error) {
      logger.error('Error getting course analytics:', error);
      return [];
    }
  }

  /**
   * Get analytics for all lectures in a module
   */
  private async getModuleAnalytics(
    moduleId: string,
    query: VideoAnalyticsQuery
  ): Promise<VideoAnalytics[]> {
    try {
      const lectures = await this.prisma.lecture.findMany({
        where: { moduleId },
        select: { id: true }
      });

      const analyticsPromises = lectures.map(lecture =>
        this.getLectureAnalytics(lecture.id, query)
      );

      return await Promise.all(analyticsPromises);
    } catch (error) {
      logger.error('Error getting module analytics:', error);
      return [];
    }
  }

  /**
   * Calculate drop-off points in video
   */
  private async calculateDropOffPoints(lectureId: string): Promise<DropOffPoint[]> {
    try {
      // In production, this would analyze watched segments to find
      // where viewers commonly stop watching

      // For now, return mock data
      return [
        { timestamp: 120, dropOffRate: 15 },
        { timestamp: 300, dropOffRate: 25 },
        { timestamp: 600, dropOffRate: 35 }
      ];
    } catch (error) {
      logger.error('Error calculating drop-off points:', error);
      return [];
    }
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(metrics: {
    completionRate: number;
    averageWatchTime: number;
    rewatchRate: number;
    totalViews: number;
    uniqueViewers: number;
  }): number {
    // Weighted scoring algorithm
    const completionWeight = 0.4;
    const watchTimeWeight = 0.3;
    const rewatchWeight = 0.2;
    const viewsWeight = 0.1;

    const completionScore = metrics.completionRate;
    const watchTimeScore = Math.min(100, (metrics.averageWatchTime / 600) * 100); // Normalize to 10 minutes
    const rewatchScore = Math.min(100, metrics.rewatchRate * 2);
    const viewsScore = Math.min(100, (metrics.totalViews / metrics.uniqueViewers) * 50);

    const score =
      completionScore * completionWeight +
      watchTimeScore * watchTimeWeight +
      rewatchScore * rewatchWeight +
      viewsScore * viewsWeight;

    return Math.round(score);
  }

  /**
   * Get trending videos
   */
  async getTrendingVideos(limit: number = 10): Promise<Array<{
    lectureId: string;
    title: string;
    views: number;
    engagementScore: number;
  }>> {
    try {
      // Get lectures with most views in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const progressRecords = await this.prisma.lectureProgress.findMany({
        where: {
          lastWatchedAt: {
            gte: sevenDaysAgo
          }
        },
        include: {
          lecture: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      // Group by lecture and calculate metrics
      const lectureMetrics = new Map<string, {
        lectureId: string;
        title: string;
        views: number;
        completions: number;
      }>();

      progressRecords.forEach(record => {
        const key = record.lectureId;
        const existing = lectureMetrics.get(key) || {
          lectureId: record.lectureId,
          title: record.lecture.title,
          views: 0,
          completions: 0
        };

        existing.views += record.watchCount;
        if (record.completed) {
          existing.completions++;
        }

        lectureMetrics.set(key, existing);
      });

      // Calculate engagement scores and sort
      const trending = Array.from(lectureMetrics.values())
        .map(metric => ({
          lectureId: metric.lectureId,
          title: metric.title,
          views: metric.views,
          engagementScore: this.calculateEngagementScore({
            completionRate: (metric.completions / metric.views) * 100,
            averageWatchTime: 0,
            rewatchRate: 0,
            totalViews: metric.views,
            uniqueViewers: metric.views
          })
        }))
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, limit);

      return trending;
    } catch (error) {
      logger.error('Error getting trending videos:', error);
      return [];
    }
  }

  /**
   * Get video performance comparison
   */
  async compareVideos(lectureIds: string[]): Promise<Array<{
    lectureId: string;
    metrics: VideoAnalytics;
  }>> {
    try {
      const comparisons = await Promise.all(
        lectureIds.map(async lectureId => ({
          lectureId,
          metrics: await this.getLectureAnalytics(lectureId, {})
        }))
      );

      return comparisons;
    } catch (error) {
      logger.error('Error comparing videos:', error);
      return [];
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    query: VideoAnalyticsQuery,
    format: 'CSV' | 'JSON'
  ): Promise<string> {
    try {
      const analytics = await this.getVideoAnalytics(query);

      if (format === 'JSON') {
        return JSON.stringify(analytics, null, 2);
      }

      // Convert to CSV
      const headers = [
        'Lecture ID',
        'Total Views',
        'Unique Viewers',
        'Avg Watch Time',
        'Completion Rate',
        'Rewatch Rate',
        'Engagement Score'
      ];

      const rows = analytics.map(a => [
        a.lectureId,
        a.totalViews,
        a.uniqueViewers,
        a.averageWatchTime,
        a.completionRate,
        a.rewatchRate,
        a.engagementScore
      ]);

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

      return csv;
    } catch (error) {
      logger.error('Error exporting analytics:', error);
      throw error;
    }
  }
}
