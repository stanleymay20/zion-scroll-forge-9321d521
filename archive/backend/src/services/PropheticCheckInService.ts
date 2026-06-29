/**
 * Prophetic Check-in Service
 * Manages prophetic check-ins and spiritual growth tracking
 */

import { PrismaClient } from '@prisma/client';
import AIGatewayService from './AIGatewayService';
import VectorStoreService from './VectorStoreService';
import {
  PropheticCheckIn,
  PropheticCheckInRequest,
  PropheticCheckInResponse,
  SpiritualGrowthTracking,
  PropheticGuidance,
  GrowthMetric,
  ProgressIndicator,
  Milestone,
  GuidanceMessage,
  PropheticInsight,
  CallingClarification,
  ActionStep,
  Warning,
  Encouragement,
  ScriptureReference
} from '../types/prophetic-checkin.types';

const prisma = new PrismaClient();

export default class PropheticCheckInService {
  private aiGateway: AIGatewayService;
  private vectorStore: VectorStoreService;

  constructor(
    aiGateway?: AIGatewayService,
    vectorStore?: VectorStoreService
  ) {
    this.aiGateway = aiGateway || new AIGatewayService();
    this.vectorStore = vectorStore || new VectorStoreService();
  }

  /**
   * Submit a prophetic check-in
   */
  async submitCheckIn(request: PropheticCheckInRequest): Promise<PropheticCheckInResponse> {
    try {
      // Create check-in record
      const checkIn = await this.createCheckIn(request);

      // Generate growth tracking
      const growthTracking = await this.generateGrowthTracking(checkIn);

      // Generate prophetic guidance
      const guidance = await this.generatePropheticGuidance(checkIn, growthTracking);

      // Save all records
      await this.saveCheckInData(checkIn, growthTracking, guidance);

      return {
        success: true,
        checkIn,
        growthTracking,
        guidance,
        confidence: guidance.confidence,
        requiresHumanReview: guidance.requiresHumanReview
      };
    } catch (error) {
      console.error('Error submitting prophetic check-in:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit prophetic check-in',
        confidence: 0,
        requiresHumanReview: true
      };
    }
  }

  /**
   * Get check-in history for a user
   */
  async getCheckInHistory(userId: string, limit: number = 10): Promise<PropheticCheckIn[]> {
    try {
      const checkIns = await prisma.propheticCheckIn.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      return checkIns.map(this.mapCheckInFromDb);
    } catch (error) {
      console.error('Error fetching check-in history:', error);
      throw new Error('Failed to fetch check-in history');
    }
  }

  /**
   * Get growth tracking for a user
   */
  async getGrowthTracking(userId: string, limit: number = 10): Promise<SpiritualGrowthTracking[]> {
    try {
      const tracking = await prisma.spiritualGrowthTracking.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      return tracking.map(this.mapGrowthTrackingFromDb);
    } catch (error) {
      console.error('Error fetching growth tracking:', error);
      throw new Error('Failed to fetch growth tracking');
    }
  }

  /**
   * Get prophetic guidance for a user
   */
  async getPropheticGuidance(userId: string, limit: number = 10): Promise<PropheticGuidance[]> {
    try {
      const guidance = await prisma.propheticGuidance.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      return guidance.map(this.mapGuidanceFromDb);
    } catch (error) {
      console.error('Error fetching prophetic guidance:', error);
      throw new Error('Failed to fetch prophetic guidance');
    }
  }

  // Private helper methods

  private async createCheckIn(request: PropheticCheckInRequest): Promise<PropheticCheckIn> {
    const id = this.generateId();
    
    return {
      id,
      userId: request.userId,
      timestamp: new Date(),
      questionnaire: request.questionnaire,
      spiritualTemperature: request.spiritualTemperature,
      mood: request.mood,
      lifeCircumstances: request.lifeCircumstances,
      prayerFocus: request.prayerFocus,
      scriptureHighlights: request.scriptureHighlights,
      godsVoice: request.godsVoice,
      obedienceLevel: request.obedienceLevel,
      communityEngagement: request.communityEngagement,
      ministryActivity: request.ministryActivity,
      challengesFaced: request.challengesFaced,
      victoriesExperienced: request.victoriesExperienced
    };
  }

  private async generateGrowthTracking(checkIn: PropheticCheckIn): Promise<SpiritualGrowthTracking> {
    try {
      // Get historical check-ins for comparison
      const historicalCheckIns = await this.getCheckInHistory(checkIn.userId, 12);

      // Build growth analysis prompt
      const prompt = this.buildGrowthAnalysisPrompt(checkIn, historicalCheckIns);

      // Get AI analysis
      const response = await this.aiGateway.chat({
        messages: [
          {
            role: 'system',
            content: `You are a spiritual growth analyst with deep understanding of Christian discipleship.
            Analyze spiritual check-ins to identify growth patterns, trends, and areas of development.
            Provide quantitative metrics and qualitative insights.
            Be encouraging while being honest about areas needing attention.
            Format your response as JSON.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        maxTokens: 3000
      });

      // Parse AI response
      const analysis = this.parseGrowthAnalysis(response.content, checkIn);

      return analysis;
    } catch (error) {
      console.error('Error generating growth tracking:', error);
      throw new Error('Failed to generate growth tracking');
    }
  }

  private async generatePropheticGuidance(
    checkIn: PropheticCheckIn,
    growthTracking: SpiritualGrowthTracking
  ): Promise<PropheticGuidance> {
    try {
      // Get user's spiritual profile
      const userProfile = await this.getUserSpiritualProfile(checkIn.userId);

      // Search for relevant Scripture
      const scriptureResults = await this.vectorStore.search(
        `${checkIn.godsVoice} ${checkIn.prayerFocus.join(' ')}`,
        'scripture',
        10
      );

      // Build prophetic guidance prompt
      const prompt = this.buildPropheticGuidancePrompt(checkIn, growthTracking, userProfile);

      // Get AI guidance
      const response = await this.aiGateway.chat({
        messages: [
          {
            role: 'system',
            content: `You are a prophetic spiritual advisor with deep biblical knowledge and sensitivity to the Holy Spirit.
            Provide prophetic guidance that is biblically grounded, encouraging, and directional.
            Identify spiritual gifts, calling clarity, and next steps in the believer's journey.
            Include relevant Scripture, warnings against deception, and encouragements.
            Be bold but humble, recognizing that all prophecy must be tested.
            Format your response as JSON.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        maxTokens: 4000
      });

      // Parse AI response
      const guidance = this.parsePropheticGuidance(response.content, checkIn, scriptureResults);

      return guidance;
    } catch (error) {
      console.error('Error generating prophetic guidance:', error);
      throw new Error('Failed to generate prophetic guidance');
    }
  }

  private buildGrowthAnalysisPrompt(
    checkIn: PropheticCheckIn,
    historicalCheckIns: PropheticCheckIn[]
  ): string {
    const questionnaireText = checkIn.questionnaire
      .map(q => `${q.question}: ${q.answer}`)
      .join('\n');

    const historicalSummary = historicalCheckIns.length > 0
      ? `Historical data available from ${historicalCheckIns.length} previous check-ins`
      : 'No historical data available';

    return `Analyze this spiritual check-in for growth tracking:

Current Check-in:
${questionnaireText}

Spiritual Temperature: ${checkIn.spiritualTemperature}/10
Mood: ${checkIn.mood}
Life Circumstances: ${checkIn.lifeCircumstances}
Prayer Focus: ${checkIn.prayerFocus.join(', ')}
Scripture Highlights: ${checkIn.scriptureHighlights.join(', ')}
God's Voice: ${checkIn.godsVoice}
Obedience Level: ${checkIn.obedienceLevel}/10
Community Engagement: ${checkIn.communityEngagement}/10
Ministry Activity: ${checkIn.ministryActivity}
Challenges: ${checkIn.challengesFaced.join(', ')}
Victories: ${checkIn.victoriesExperienced.join(', ')}

${historicalSummary}

Provide comprehensive growth analysis including:
1. Overall growth score (0-100)
2. Growth trend (accelerating, steady, plateaued, declining)
3. Growth areas with scores and trends
4. Progress indicators for visualization
5. Milestones achieved
6. Comparison to previous periods
7. Insights and recommendations

Format as JSON with these sections.`;
  }

  private buildPropheticGuidancePrompt(
    checkIn: PropheticCheckIn,
    growthTracking: SpiritualGrowthTracking,
    userProfile: any
  ): string {
    return `Provide prophetic guidance for this believer:

Current Spiritual State:
- Spiritual Temperature: ${checkIn.spiritualTemperature}/10
- Mood: ${checkIn.mood}
- What God is saying: "${checkIn.godsVoice}"
- Prayer Focus: ${checkIn.prayerFocus.join(', ')}
- Scripture Highlights: ${checkIn.scriptureHighlights.join(', ')}
- Obedience Level: ${checkIn.obedienceLevel}/10
- Ministry Activity: ${checkIn.ministryActivity}
- Challenges: ${checkIn.challengesFaced.join(', ')}
- Victories: ${checkIn.victoriesExperienced.join(', ')}

Growth Analysis:
- Overall Growth Score: ${growthTracking.overallGrowthScore}/100
- Growth Trend: ${growthTracking.growthTrend}
- Key Insights: ${growthTracking.insights.join('; ')}

User Profile:
- Spiritual Gifts: ${userProfile.spiritualGifts?.join(', ') || 'Unknown'}
- Calling: ${userProfile.scrollCalling || 'Seeking clarity'}

Provide prophetic guidance including:
1. Guidance messages (instruction, encouragement, correction, revelation, confirmation)
2. Relevant Scripture references with application
3. Prophetic insights (words of knowledge, wisdom, discernment, vision)
4. Calling clarification and gift activation
5. Next steps with priorities and timelines
6. Warnings against spiritual dangers
7. Encouragements and affirmations

Be specific, actionable, and biblically grounded.
Format as JSON.`;
  }

  private parseGrowthAnalysis(content: string, checkIn: PropheticCheckIn): SpiritualGrowthTracking {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      return {
        id: this.generateId(),
        userId: checkIn.userId,
        checkInId: checkIn.id,
        timestamp: new Date(),
        overallGrowthScore: parsed.overallGrowthScore || 50,
        growthTrend: parsed.growthTrend || 'stable',
        growthAreas: parsed.growthAreas || [],
        progressIndicators: parsed.progressIndicators || [],
        milestones: parsed.milestones || [],
        comparedToLastMonth: parsed.comparedToLastMonth || 0,
        comparedToLastQuarter: parsed.comparedToLastQuarter || 0,
        comparedToLastYear: parsed.comparedToLastYear || 0,
        insights: parsed.insights || [],
        recommendations: parsed.recommendations || []
      };
    } catch (error) {
      console.error('Error parsing growth analysis:', error);
      // Return minimal tracking on parse error
      return {
        id: this.generateId(),
        userId: checkIn.userId,
        checkInId: checkIn.id,
        timestamp: new Date(),
        overallGrowthScore: 50,
        growthTrend: 'stable',
        growthAreas: [],
        progressIndicators: [],
        milestones: [],
        comparedToLastMonth: 0,
        comparedToLastQuarter: 0,
        comparedToLastYear: 0,
        insights: ['Analysis parsing failed - manual review needed'],
        recommendations: []
      };
    }
  }

  private parsePropheticGuidance(
    content: string,
    checkIn: PropheticCheckIn,
    scriptureResults: any[]
  ): PropheticGuidance {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      const requiresReview = this.determineIfReviewRequired(parsed);

      return {
        id: this.generateId(),
        userId: checkIn.userId,
        checkInId: checkIn.id,
        timestamp: new Date(),
        guidance: parsed.guidance || [],
        scriptureReferences: parsed.scriptureReferences || [],
        propheticInsights: parsed.propheticInsights || [],
        callingClarification: parsed.callingClarification || this.getDefaultCallingClarification(),
        nextSteps: parsed.nextSteps || [],
        warnings: parsed.warnings || [],
        encouragements: parsed.encouragements || [],
        confidence: parsed.confidence || 0.7,
        requiresHumanReview: requiresReview
      };
    } catch (error) {
      console.error('Error parsing prophetic guidance:', error);
      return {
        id: this.generateId(),
        userId: checkIn.userId,
        checkInId: checkIn.id,
        timestamp: new Date(),
        guidance: [],
        scriptureReferences: [],
        propheticInsights: [],
        callingClarification: this.getDefaultCallingClarification(),
        nextSteps: [],
        warnings: [],
        encouragements: [],
        confidence: 0.3,
        requiresHumanReview: true
      };
    }
  }

  private determineIfReviewRequired(parsed: any): boolean {
    // Require review if:
    // - Confidence is low
    // - Contains urgent warnings
    // - Contains major prophetic insights
    // - Calling clarification has high significance

    if (parsed.confidence && parsed.confidence < 0.6) return true;

    if (parsed.warnings?.some((w: any) => w.severity === 'urgent')) return true;

    if (parsed.propheticInsights?.some((i: any) => i.requiresConfirmation)) return true;

    return false;
  }

  private getDefaultCallingClarification(): CallingClarification {
    return {
      currentCalling: 'Seeking clarity',
      callingConfidence: 0,
      callingEvolution: [],
      giftActivation: [],
      ministryOpportunities: [],
      preparationNeeded: [],
      timingGuidance: 'Continue seeking God for direction'
    };
  }

  private async getUserSpiritualProfile(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          spiritualGifts: true,
          scrollCalling: true,
          kingdomVision: true,
          scrollAlignment: true
        }
      });

      return user || {};
    } catch (error) {
      console.error('Error fetching user spiritual profile:', error);
      return {};
    }
  }

  private async saveCheckInData(
    checkIn: PropheticCheckIn,
    growthTracking: SpiritualGrowthTracking,
    guidance: PropheticGuidance
  ): Promise<void> {
    try {
      // Save check-in
      await prisma.propheticCheckIn.create({
        data: {
          id: checkIn.id,
          userId: checkIn.userId,
          timestamp: checkIn.timestamp,
          questionnaire: checkIn.questionnaire as any,
          spiritualTemperature: checkIn.spiritualTemperature,
          mood: checkIn.mood,
          lifeCircumstances: checkIn.lifeCircumstances,
          prayerFocus: checkIn.prayerFocus,
          scriptureHighlights: checkIn.scriptureHighlights,
          godsVoice: checkIn.godsVoice,
          obedienceLevel: checkIn.obedienceLevel,
          communityEngagement: checkIn.communityEngagement,
          ministryActivity: checkIn.ministryActivity,
          challengesFaced: checkIn.challengesFaced,
          victoriesExperienced: checkIn.victoriesExperienced
        }
      });

      // Save growth tracking
      await prisma.spiritualGrowthTracking.create({
        data: {
          id: growthTracking.id,
          userId: growthTracking.userId,
          checkInId: growthTracking.checkInId,
          timestamp: growthTracking.timestamp,
          overallGrowthScore: growthTracking.overallGrowthScore,
          growthTrend: growthTracking.growthTrend,
          growthAreas: growthTracking.growthAreas as any,
          progressIndicators: growthTracking.progressIndicators as any,
          milestones: growthTracking.milestones as any,
          comparedToLastMonth: growthTracking.comparedToLastMonth,
          comparedToLastQuarter: growthTracking.comparedToLastQuarter,
          comparedToLastYear: growthTracking.comparedToLastYear,
          insights: growthTracking.insights,
          recommendations: growthTracking.recommendations
        }
      });

      // Save prophetic guidance
      await prisma.propheticGuidance.create({
        data: {
          id: guidance.id,
          userId: guidance.userId,
          checkInId: guidance.checkInId,
          timestamp: guidance.timestamp,
          guidance: guidance.guidance as any,
          scriptureReferences: guidance.scriptureReferences as any,
          propheticInsights: guidance.propheticInsights as any,
          callingClarification: guidance.callingClarification as any,
          nextSteps: guidance.nextSteps as any,
          warnings: guidance.warnings as any,
          encouragements: guidance.encouragements as any,
          confidence: guidance.confidence,
          requiresHumanReview: guidance.requiresHumanReview
        }
      });
    } catch (error) {
      console.error('Error saving check-in data:', error);
      throw new Error('Failed to save check-in data');
    }
  }

  private mapCheckInFromDb(dbCheckIn: any): PropheticCheckIn {
    return {
      id: dbCheckIn.id,
      userId: dbCheckIn.userId,
      timestamp: dbCheckIn.timestamp,
      questionnaire: dbCheckIn.questionnaire,
      spiritualTemperature: dbCheckIn.spiritualTemperature,
      mood: dbCheckIn.mood,
      lifeCircumstances: dbCheckIn.lifeCircumstances,
      prayerFocus: dbCheckIn.prayerFocus,
      scriptureHighlights: dbCheckIn.scriptureHighlights,
      godsVoice: dbCheckIn.godsVoice,
      obedienceLevel: dbCheckIn.obedienceLevel,
      communityEngagement: dbCheckIn.communityEngagement,
      ministryActivity: dbCheckIn.ministryActivity,
      challengesFaced: dbCheckIn.challengesFaced,
      victoriesExperienced: dbCheckIn.victoriesExperienced
    };
  }

  private mapGrowthTrackingFromDb(dbTracking: any): SpiritualGrowthTracking {
    return {
      id: dbTracking.id,
      userId: dbTracking.userId,
      checkInId: dbTracking.checkInId,
      timestamp: dbTracking.timestamp,
      overallGrowthScore: dbTracking.overallGrowthScore,
      growthTrend: dbTracking.growthTrend,
      growthAreas: dbTracking.growthAreas,
      progressIndicators: dbTracking.progressIndicators,
      milestones: dbTracking.milestones,
      comparedToLastMonth: dbTracking.comparedToLastMonth,
      comparedToLastQuarter: dbTracking.comparedToLastQuarter,
      comparedToLastYear: dbTracking.comparedToLastYear,
      insights: dbTracking.insights,
      recommendations: dbTracking.recommendations
    };
  }

  private mapGuidanceFromDb(dbGuidance: any): PropheticGuidance {
    return {
      id: dbGuidance.id,
      userId: dbGuidance.userId,
      checkInId: dbGuidance.checkInId,
      timestamp: dbGuidance.timestamp,
      guidance: dbGuidance.guidance,
      scriptureReferences: dbGuidance.scriptureReferences,
      propheticInsights: dbGuidance.propheticInsights,
      callingClarification: dbGuidance.callingClarification,
      nextSteps: dbGuidance.nextSteps,
      warnings: dbGuidance.warnings,
      encouragements: dbGuidance.encouragements,
      confidence: dbGuidance.confidence,
      requiresHumanReview: dbGuidance.requiresHumanReview,
      reviewedBy: dbGuidance.reviewedBy,
      reviewedAt: dbGuidance.reviewedAt
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
