/**
 * Calling Discernment Service
 * Helps users discern and clarify their spiritual calling
 */

import { PrismaClient } from '@prisma/client';
import AIGatewayService from './AIGatewayService';
import VectorStoreService from './VectorStoreService';
import {
  CallingDiscernment,
  CallingDiscernmentRequest,
  CallingDiscernmentResponse
} from '../types/prophetic-checkin.types';

const prisma = new PrismaClient();

export default class CallingDiscernmentService {
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
   * Process calling discernment request
   */
  async discernCalling(request: CallingDiscernmentRequest): Promise<CallingDiscernmentResponse> {
    try {
      // Get user's spiritual profile
      const userProfile = await this.getUserProfile(request.userId);

      // Build discernment prompt
      const prompt = this.buildDiscernmentPrompt(request, userProfile);

      // Get AI analysis
      const response = await this.aiGateway.chat({
        messages: [
          {
            role: 'system',
            content: `You are a calling discernment counselor with deep biblical wisdom.
            Help believers discern their God-given calling through analysis of their gifts, passions, experiences, and confirmations.
            Provide clarity while acknowledging the mystery and journey of calling.
            Be encouraging yet realistic about preparation and timing.
            Format your response as JSON.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        maxTokens: 3500
      });

      // Parse AI response
      const discernment = this.parseCallingDiscernment(response.content, request.userId);

      // Save discernment
      await this.saveCallingDiscernment(discernment);

      return {
        success: true,
        discernment,
        confidence: discernment.confidence,
        requiresConfirmation: discernment.confidence < 0.7
      };
    } catch (error) {
      console.error('Error discerning calling:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to discern calling',
        confidence: 0,
        requiresConfirmation: true
      };
    }
  }

  /**
   * Get calling discernment history
   */
  async getCallingHistory(userId: string): Promise<CallingDiscernment[]> {
    try {
      const discernments = await prisma.callingDiscernment.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' }
      });

      return discernments.map(this.mapDiscernmentFromDb);
    } catch (error) {
      console.error('Error fetching calling history:', error);
      throw new Error('Failed to fetch calling history');
    }
  }

  /**
   * Get latest calling discernment
   */
  async getLatestCalling(userId: string): Promise<CallingDiscernment | null> {
    try {
      const discernment = await prisma.callingDiscernment.findFirst({
        where: { userId },
        orderBy: { timestamp: 'desc' }
      });

      return discernment ? this.mapDiscernmentFromDb(discernment) : null;
    } catch (error) {
      console.error('Error fetching latest calling:', error);
      throw new Error('Failed to fetch latest calling');
    }
  }

  // Private helper methods

  private async getUserProfile(userId: string): Promise<any> {
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

      // Get latest gift identification
      const giftIdentification = await prisma.spiritualGiftIdentification.findFirst({
        where: { userId },
        orderBy: { timestamp: 'desc' }
      });

      return {
        ...user,
        giftIdentification
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return {};
    }
  }

  private buildDiscernmentPrompt(request: CallingDiscernmentRequest, userProfile: any): string {
    return `Help discern this person's calling:

Current Understanding:
"${request.currentUnderstanding}"

Questions They're Wrestling With:
${request.questions.join('\n')}

Life Experiences:
${request.experiences.join('\n')}

Confirmations Received:
${request.confirmations.join('\n')}

Concerns:
${request.concerns.join('\n')}

Spiritual Profile:
- Spiritual Gifts: ${userProfile.spiritualGifts?.join(', ') || 'Unknown'}
- Current Calling: ${userProfile.scrollCalling || 'Seeking'}
- Kingdom Vision: ${userProfile.kingdomVision || 'Developing'}

Provide comprehensive calling discernment including:
1. Calling statement - clear, concise articulation
2. Calling confidence score (0-100)
3. Calling components - key elements of their calling
4. Discernment journey - insights from their process
5. Confirmations analysis - validation of calling indicators
6. Questions to explore - areas needing clarity
7. Alignment analysis - gifts, passion, opportunity, fruit
8. Next steps - specific actions with priorities
9. Preparation path - what they need to develop
10. Timing guidance - current season and readiness

Be specific, encouraging, and biblically grounded.
Format as JSON.`;
  }

  private parseCallingDiscernment(content: string, userId: string): CallingDiscernment {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      return {
        id: this.generateId(),
        userId,
        timestamp: new Date(),
        callingStatement: parsed.callingStatement || 'Seeking clarity on calling',
        callingConfidence: parsed.callingConfidence || 50,
        callingComponents: parsed.callingComponents || [],
        discernmentJourney: parsed.discernmentJourney || [],
        confirmations: parsed.confirmations || [],
        questions: parsed.questions || [],
        giftAlignment: parsed.giftAlignment || 50,
        passionAlignment: parsed.passionAlignment || 50,
        opportunityAlignment: parsed.opportunityAlignment || 50,
        fruitAlignment: parsed.fruitAlignment || 50,
        nextSteps: parsed.nextSteps || [],
        preparationPath: parsed.preparationPath || this.getDefaultPreparationPath(),
        timingGuidance: parsed.timingGuidance || this.getDefaultTimingGuidance(),
        confidence: parsed.confidence || 0.7
      };
    } catch (error) {
      console.error('Error parsing calling discernment:', error);
      return {
        id: this.generateId(),
        userId,
        timestamp: new Date(),
        callingStatement: 'Analysis failed - manual review needed',
        callingConfidence: 0,
        callingComponents: [],
        discernmentJourney: [],
        confirmations: [],
        questions: [],
        giftAlignment: 0,
        passionAlignment: 0,
        opportunityAlignment: 0,
        fruitAlignment: 0,
        nextSteps: [],
        preparationPath: this.getDefaultPreparationPath(),
        timingGuidance: this.getDefaultTimingGuidance(),
        confidence: 0.3
      };
    }
  }

  private getDefaultPreparationPath(): any {
    return {
      currentReadiness: 0,
      targetReadiness: 100,
      preparationAreas: [],
      estimatedDuration: 'To be determined',
      milestones: []
    };
  }

  private getDefaultTimingGuidance(): any {
    return {
      currentSeason: 'Seeking',
      readiness: 'not-ready',
      indicators: [],
      waitingGuidance: 'Continue seeking God for direction',
      prayerPoints: ['Clarity on calling', 'Wisdom for next steps', 'Patience in the process']
    };
  }

  private async saveCallingDiscernment(discernment: CallingDiscernment): Promise<void> {
    try {
      await prisma.callingDiscernment.create({
        data: {
          id: discernment.id,
          userId: discernment.userId,
          timestamp: discernment.timestamp,
          callingStatement: discernment.callingStatement,
          callingConfidence: discernment.callingConfidence,
          callingComponents: discernment.callingComponents as any,
          discernmentJourney: discernment.discernmentJourney as any,
          confirmations: discernment.confirmations as any,
          questions: discernment.questions as any,
          giftAlignment: discernment.giftAlignment,
          passionAlignment: discernment.passionAlignment,
          opportunityAlignment: discernment.opportunityAlignment,
          fruitAlignment: discernment.fruitAlignment,
          nextSteps: discernment.nextSteps as any,
          preparationPath: discernment.preparationPath as any,
          timingGuidance: discernment.timingGuidance as any,
          confidence: discernment.confidence
        }
      });

      // Update user's calling if confidence is high
      if (discernment.callingConfidence >= 70) {
        await prisma.user.update({
          where: { id: discernment.userId },
          data: { scrollCalling: discernment.callingStatement }
        });
      }
    } catch (error) {
      console.error('Error saving calling discernment:', error);
      throw new Error('Failed to save calling discernment');
    }
  }

  private mapDiscernmentFromDb(dbDiscernment: any): CallingDiscernment {
    return {
      id: dbDiscernment.id,
      userId: dbDiscernment.userId,
      timestamp: dbDiscernment.timestamp,
      callingStatement: dbDiscernment.callingStatement,
      callingConfidence: dbDiscernment.callingConfidence,
      callingComponents: dbDiscernment.callingComponents,
      discernmentJourney: dbDiscernment.discernmentJourney,
      confirmations: dbDiscernment.confirmations,
      questions: dbDiscernment.questions,
      giftAlignment: dbDiscernment.giftAlignment,
      passionAlignment: dbDiscernment.passionAlignment,
      opportunityAlignment: dbDiscernment.opportunityAlignment,
      fruitAlignment: dbDiscernment.fruitAlignment,
      nextSteps: dbDiscernment.nextSteps,
      preparationPath: dbDiscernment.preparationPath,
      timingGuidance: dbDiscernment.timingGuidance,
      confidence: dbDiscernment.confidence
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
