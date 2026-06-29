/**
 * Spiritual Growth Analytics Service
 * Generates comprehensive spiritual growth analytics and reports
 */

import { PrismaClient } from '@prisma/client';
import AIGatewayService from './AIGatewayService';
import {
  SpiritualGrowthAnalytics,
  GrowthAnalyticsRequest,
  GrowthAnalyticsResponse
} from '../types/prophetic-checkin.types';

const prisma = new PrismaClient();

export default class SpiritualGrowthAnalyticsService {
  private aiGateway: AIGatewayService;

  constructor(aiGateway?: AIGatewayService) {
    this.aiGateway = aiGateway || new AIGatewayService();
  }

  /**
   * Generate growth analytics
   */
  async generateAnalytics(request: GrowthAnalyticsRequest): Promise<GrowthAnalyticsResponse> {
    try {
      // Get check-ins for the period
      const checkIns = await this.getCheckInsForPeriod(
        request.userId,
        request.periodStart,
        request.periodEnd
      );

      if (checkIns.length === 0) {
        return {
          success: false,
          error: 'No check-ins found for the specified period'
        };
      }

      // Get growth tracking data
      const growthTracking = await this.getGrowthTrackingForPeriod(
        request.userId,
        request.periodStart,
        request.periodEnd
      );

      // Build analytics prompt
      const prompt = this.buildAnalyticsPrompt(checkIns, growthTracking, request);

      // Get AI analysis
      const response = await this.aiGateway.chat({
        messages: [
          {
            role: 'system',
            content: `You are a spiritual growth analytics expert.
            Analyze spiritual check-ins and growth data to identify patterns, trends, and insights.
            Provide quantitative metrics and qualitative analysis.
            Be encouraging while being honest about areas needing attention.
            Format your response as JSON.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        maxTokens: 4000
      });

      // Parse AI response
      const analytics = this.parseAnalytics(response.content, request);

      // Save analytics
      await this.saveAnalytics(analytics);

      return {
        success: true,
        analytics
      };
    } catch (error) {
      console.error('Error generating growth analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate growth analytics'
      };
    }
  }

  /**
   * Get analytics history
   */
  async getAnalyticsHistory(userId: string, limit: number = 10): Promise<SpiritualGrowthAnalytics[]> {
    try {
      const analytics = await prisma.spiritualGrowthAnalytics.findMany({
        where: { userId },
        orderBy: { periodEnd: 'desc' },
        take: limit
      });

      return analytics.map(this.mapAnalyticsFromDb);
    } catch (error) {
      console.error('Error fetching analytics history:', error);
      throw new Error('Failed to fetch analytics history');
    }
  }

  // Private helper methods

  private async getCheckInsForPeriod(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<any[]> {
    try {
      return await prisma.propheticCheckIn.findMany({
        where: {
          userId,
          timestamp: {
            gte: periodStart,
            lte: periodEnd
          }
        },
        orderBy: { timestamp: 'asc' }
      });
    } catch (error) {
      console.error('Error fetching check-ins for period:', error);
      return [];
    }
  }

  private async getGrowthTrackingForPeriod(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<any[]> {
    try {
      return await prisma.spiritualGrowthTracking.findMany({
        where: {
          userId,
          timestamp: {
            gte: periodStart,
            lte: periodEnd
          }
        },
        orderBy: { timestamp: 'asc' }
      });
    } catch (error) {
      console.error('Error fetching growth tracking for period:', error);
      return [];
    }
  }

  private buildAnalyticsPrompt(
    checkIns: any[],
    growthTracking: any[],
    request: GrowthAnalyticsRequest
  ): string {
    const checkInSummary = checkIns.map(c => ({
      date: c.timestamp,
      spiritualTemp: c.spiritualTemperature,
      obedience: c.obedienceLevel,
      community: c.communityEngagement,
      victories: c.victoriesExperienced.length,
      challenges: c.challengesFaced.length
    }));

    const growthSummary = growthTracking.map(g => ({
      date: g.timestamp,
      score: g.overallGrowthScore,
      trend: g.growthTrend
    }));

    return `Generate comprehensive spiritual growth analytics:

Period: ${request.periodStart.toISOString()} to ${request.periodEnd.toISOString()}

Check-ins Summary (${checkIns.length} total):
${JSON.stringify(checkInSummary, null, 2)}

Growth Tracking Summary (${growthTracking.length} total):
${JSON.stringify(growthSummary, null, 2)}

Provide comprehensive analytics including:
1. Overall growth score (0-100)
2. Growth rate (percentage)
3. Consistency score (0-100)
4. Category scores with trends
5. Growth trends and patterns
6. Achievements and breakthroughs
7. Persistent and new challenges
8. Recommendations with priorities
9. Historical comparison
${request.includeComparisons ? '10. Peer comparison (percentile and insights)' : ''}

Format as JSON.`;
  }

  private parseAnalytics(content: string, request: GrowthAnalyticsRequest): SpiritualGrowthAnalytics {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      return {
        id: this.generateId(),
        userId: request.userId,
        periodStart: request.periodStart,
        periodEnd: request.periodEnd,
        overallGrowth: parsed.overallGrowth || 50,
        growthRate: parsed.growthRate || 0,
        consistencyScore: parsed.consistencyScore || 50,
        categoryScores: parsed.categoryScores || [],
        trends: parsed.trends || [],
        patterns: parsed.patterns || [],
        achievements: parsed.achievements || [],
        breakthroughs: parsed.breakthroughs || [],
        persistentChallenges: parsed.persistentChallenges || [],
        newChallenges: parsed.newChallenges || [],
        recommendations: parsed.recommendations || [],
        peerComparison: request.includeComparisons ? parsed.peerComparison : undefined,
        historicalComparison: parsed.historicalComparison || this.getDefaultHistoricalComparison()
      };
    } catch (error) {
      console.error('Error parsing analytics:', error);
      return {
        id: this.generateId(),
        userId: request.userId,
        periodStart: request.periodStart,
        periodEnd: request.periodEnd,
        overallGrowth: 50,
        growthRate: 0,
        consistencyScore: 50,
        categoryScores: [],
        trends: [],
        patterns: [],
        achievements: [],
        breakthroughs: [],
        persistentChallenges: [],
        newChallenges: [],
        recommendations: [],
        historicalComparison: this.getDefaultHistoricalComparison()
      };
    }
  }

  private getDefaultHistoricalComparison(): any {
    return {
      comparedTo: 'last-month',
      growthPercentage: 0,
      significantChanges: [],
      milestones: []
    };
  }

  private async saveAnalytics(analytics: SpiritualGrowthAnalytics): Promise<void> {
    try {
      await prisma.spiritualGrowthAnalytics.create({
        data: {
          id: analytics.id,
          userId: analytics.userId,
          periodStart: analytics.periodStart,
          periodEnd: analytics.periodEnd,
          overallGrowth: analytics.overallGrowth,
          growthRate: analytics.growthRate,
          consistencyScore: analytics.consistencyScore,
          categoryScores: analytics.categoryScores as any,
          trends: analytics.trends as any,
          patterns: analytics.patterns as any,
          achievements: analytics.achievements as any,
          breakthroughs: analytics.breakthroughs as any,
          persistentChallenges: analytics.persistentChallenges as any,
          newChallenges: analytics.newChallenges as any,
          recommendations: analytics.recommendations as any,
          peerComparison: analytics.peerComparison as any,
          historicalComparison: analytics.historicalComparison as any
        }
      });
    } catch (error) {
      console.error('Error saving analytics:', error);
      throw new Error('Failed to save analytics');
    }
  }

  private mapAnalyticsFromDb(dbAnalytics: any): SpiritualGrowthAnalytics {
    return {
      id: dbAnalytics.id,
      userId: dbAnalytics.userId,
      periodStart: dbAnalytics.periodStart,
      periodEnd: dbAnalytics.periodEnd,
      overallGrowth: dbAnalytics.overallGrowth,
      growthRate: dbAnalytics.growthRate,
      consistencyScore: dbAnalytics.consistencyScore,
      categoryScores: dbAnalytics.categoryScores,
      trends: dbAnalytics.trends,
      patterns: dbAnalytics.patterns,
      achievements: dbAnalytics.achievements,
      breakthroughs: dbAnalytics.breakthroughs,
      persistentChallenges: dbAnalytics.persistentChallenges,
      newChallenges: dbAnalytics.newChallenges,
      recommendations: dbAnalytics.recommendations,
      peerComparison: dbAnalytics.peerComparison,
      historicalComparison: dbAnalytics.historicalComparison
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
