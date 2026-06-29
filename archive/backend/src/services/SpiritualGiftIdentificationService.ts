/**
 * Spiritual Gift Identification Service
 * Identifies and develops spiritual gifts through AI-powered assessment
 */

import { PrismaClient } from '@prisma/client';
import AIGatewayService from './AIGatewayService';
import VectorStoreService from './VectorStoreService';
import {
  SpiritualGiftIdentification,
  SpiritualGiftAssessmentRequest,
  SpiritualGiftAssessmentResponse,
  IdentifiedGift,
  SpiritualGift,
  GiftMix,
  GiftDevelopmentPlan
} from '../types/prophetic-checkin.types';

const prisma = new PrismaClient();

export default class SpiritualGiftIdentificationService {
  private aiGateway: AIGatewayService;
  private vectorStore: VectorStoreService;

  // Standard spiritual gifts catalog
  private readonly SPIRITUAL_GIFTS: SpiritualGift[] = [
    // Motivational Gifts (Romans 12:6-8)
    { name: 'Prophecy', category: 'motivational', description: 'Speaking forth God\'s truth', scriptureReference: 'Romans 12:6' },
    { name: 'Serving', category: 'motivational', description: 'Meeting practical needs', scriptureReference: 'Romans 12:7' },
    { name: 'Teaching', category: 'motivational', description: 'Explaining and applying truth', scriptureReference: 'Romans 12:7' },
    { name: 'Exhortation', category: 'motivational', description: 'Encouraging and motivating', scriptureReference: 'Romans 12:8' },
    { name: 'Giving', category: 'motivational', description: 'Generous financial support', scriptureReference: 'Romans 12:8' },
    { name: 'Leadership', category: 'motivational', description: 'Guiding and directing', scriptureReference: 'Romans 12:8' },
    { name: 'Mercy', category: 'motivational', description: 'Compassion for suffering', scriptureReference: 'Romans 12:8' },
    
    // Ministry Gifts (Ephesians 4:11)
    { name: 'Apostle', category: 'ministry', description: 'Pioneering and establishing', scriptureReference: 'Ephesians 4:11' },
    { name: 'Prophet', category: 'ministry', description: 'Revealing God\'s will', scriptureReference: 'Ephesians 4:11' },
    { name: 'Evangelist', category: 'ministry', description: 'Proclaiming the gospel', scriptureReference: 'Ephesians 4:11' },
    { name: 'Pastor', category: 'ministry', description: 'Shepherding and caring', scriptureReference: 'Ephesians 4:11' },
    { name: 'Teacher', category: 'ministry', description: 'Systematic instruction', scriptureReference: 'Ephesians 4:11' },
    
    // Manifestation Gifts (1 Corinthians 12:8-10)
    { name: 'Word of Wisdom', category: 'manifestation', description: 'Divine wisdom for situations', scriptureReference: '1 Corinthians 12:8' },
    { name: 'Word of Knowledge', category: 'manifestation', description: 'Supernatural knowledge', scriptureReference: '1 Corinthians 12:8' },
    { name: 'Faith', category: 'manifestation', description: 'Extraordinary trust in God', scriptureReference: '1 Corinthians 12:9' },
    { name: 'Healing', category: 'manifestation', description: 'Supernatural healing power', scriptureReference: '1 Corinthians 12:9' },
    { name: 'Miracles', category: 'manifestation', description: 'Supernatural interventions', scriptureReference: '1 Corinthians 12:10' },
    { name: 'Discernment', category: 'manifestation', description: 'Distinguishing spirits', scriptureReference: '1 Corinthians 12:10' },
    { name: 'Tongues', category: 'manifestation', description: 'Speaking in unknown languages', scriptureReference: '1 Corinthians 12:10' },
    { name: 'Interpretation', category: 'manifestation', description: 'Interpreting tongues', scriptureReference: '1 Corinthians 12:10' }
  ];

  constructor(
    aiGateway?: AIGatewayService,
    vectorStore?: VectorStoreService
  ) {
    this.aiGateway = aiGateway || new AIGatewayService();
    this.vectorStore = vectorStore || new VectorStoreService();
  }

  /**
   * Assess spiritual gifts
   */
  async assessSpiritualGifts(request: SpiritualGiftAssessmentRequest): Promise<SpiritualGiftAssessmentResponse> {
    try {
      // Build assessment prompt
      const prompt = this.buildAssessmentPrompt(request);

      // Get AI analysis
      const response = await this.aiGateway.chat({
        messages: [
          {
            role: 'system',
            content: `You are a spiritual gifts assessment expert with deep biblical knowledge.
            Analyze assessment responses, life experiences, and ministry experiences to identify spiritual gifts.
            Consider the biblical categories: motivational gifts (Romans 12), ministry gifts (Ephesians 4), and manifestation gifts (1 Corinthians 12).
            Provide evidence-based identification with development recommendations.
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
      const identification = this.parseGiftIdentification(response.content, request.userId);

      // Save identification
      await this.saveGiftIdentification(identification);

      return {
        success: true,
        identification,
        confidence: identification.confidence,
        requiresConfirmation: identification.requiresConfirmation
      };
    } catch (error) {
      console.error('Error assessing spiritual gifts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assess spiritual gifts',
        confidence: 0,
        requiresConfirmation: true
      };
    }
  }

  /**
   * Get gift identification history
   */
  async getGiftIdentificationHistory(userId: string): Promise<SpiritualGiftIdentification[]> {
    try {
      const identifications = await prisma.spiritualGiftIdentification.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' }
      });

      return identifications.map(this.mapIdentificationFromDb);
    } catch (error) {
      console.error('Error fetching gift identification history:', error);
      throw new Error('Failed to fetch gift identification history');
    }
  }

  /**
   * Get latest gift identification
   */
  async getLatestGiftIdentification(userId: string): Promise<SpiritualGiftIdentification | null> {
    try {
      const identification = await prisma.spiritualGiftIdentification.findFirst({
        where: { userId },
        orderBy: { timestamp: 'desc' }
      });

      return identification ? this.mapIdentificationFromDb(identification) : null;
    } catch (error) {
      console.error('Error fetching latest gift identification:', error);
      throw new Error('Failed to fetch latest gift identification');
    }
  }

  // Private helper methods

  private buildAssessmentPrompt(request: SpiritualGiftAssessmentRequest): string {
    const assessmentText = request.assessmentResponses
      .map(r => `Q: ${r.question}\nScore: ${r.response}`)
      .join('\n\n');

    return `Identify spiritual gifts based on this assessment:

Assessment Responses:
${assessmentText}

Life Experiences:
${request.lifeExperiences.join('\n')}

Ministry Experiences:
${request.ministryExperiences.join('\n')}

Confirmations from Others:
${request.confirmations.join('\n')}

Biblical Gift Categories:
1. Motivational Gifts (Romans 12): Prophecy, Serving, Teaching, Exhortation, Giving, Leadership, Mercy
2. Ministry Gifts (Ephesians 4): Apostle, Prophet, Evangelist, Pastor, Teacher
3. Manifestation Gifts (1 Corinthians 12): Word of Wisdom, Word of Knowledge, Faith, Healing, Miracles, Discernment, Tongues, Interpretation

Provide comprehensive gift identification including:
1. Identified gifts with strength scores (0-100)
2. Gift mix (primary, secondary, supporting gifts)
3. Evidence from assessment and experiences
4. Maturity level for each gift
5. Development plan with stages and resources
6. Practice opportunities
7. Mentorship recommendations

Format as JSON.`;
  }

  private parseGiftIdentification(content: string, userId: string): SpiritualGiftIdentification {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      const requiresConfirmation = this.determineIfConfirmationRequired(parsed);

      return {
        id: this.generateId(),
        userId,
        timestamp: new Date(),
        identifiedGifts: parsed.identifiedGifts || [],
        giftMix: parsed.giftMix || this.getDefaultGiftMix(),
        assessmentScores: parsed.assessmentScores || [],
        evidenceFromLife: parsed.evidenceFromLife || [],
        confirmations: parsed.confirmations || [],
        developmentPlan: parsed.developmentPlan || this.getDefaultDevelopmentPlan(),
        confidence: parsed.confidence || 0.7,
        requiresConfirmation
      };
    } catch (error) {
      console.error('Error parsing gift identification:', error);
      return {
        id: this.generateId(),
        userId,
        timestamp: new Date(),
        identifiedGifts: [],
        giftMix: this.getDefaultGiftMix(),
        assessmentScores: [],
        evidenceFromLife: [],
        confirmations: [],
        developmentPlan: this.getDefaultDevelopmentPlan(),
        confidence: 0.3,
        requiresConfirmation: true
      };
    }
  }

  private determineIfConfirmationRequired(parsed: any): boolean {
    // Require confirmation if:
    // - Confidence is low
    // - Manifestation gifts identified
    // - Ministry gifts identified
    // - Multiple high-strength gifts

    if (parsed.confidence && parsed.confidence < 0.7) return true;

    const manifestationGifts = parsed.identifiedGifts?.filter(
      (g: any) => g.gift?.category === 'manifestation'
    );
    if (manifestationGifts && manifestationGifts.length > 0) return true;

    const ministryGifts = parsed.identifiedGifts?.filter(
      (g: any) => g.gift?.category === 'ministry'
    );
    if (ministryGifts && ministryGifts.length > 0) return true;

    return false;
  }

  private getDefaultGiftMix(): GiftMix {
    return {
      primaryGifts: [],
      secondaryGifts: [],
      supportingGifts: [],
      uniqueCombination: 'Assessment needed',
      ministryFit: []
    };
  }

  private getDefaultDevelopmentPlan(): GiftDevelopmentPlan {
    return {
      gifts: [],
      developmentStages: [],
      trainingResources: [],
      practiceOpportunities: [],
      mentorshipRecommendations: [],
      timeline: 'To be determined'
    };
  }

  private async saveGiftIdentification(identification: SpiritualGiftIdentification): Promise<void> {
    try {
      await prisma.spiritualGiftIdentification.create({
        data: {
          id: identification.id,
          userId: identification.userId,
          timestamp: identification.timestamp,
          identifiedGifts: identification.identifiedGifts as any,
          giftMix: identification.giftMix as any,
          assessmentScores: identification.assessmentScores as any,
          evidenceFromLife: identification.evidenceFromLife as any,
          confirmations: identification.confirmations as any,
          developmentPlan: identification.developmentPlan as any,
          confidence: identification.confidence,
          requiresConfirmation: identification.requiresConfirmation
        }
      });

      // Update user's spiritual gifts
      const primaryGifts = identification.giftMix.primaryGifts;
      if (primaryGifts.length > 0) {
        await prisma.user.update({
          where: { id: identification.userId },
          data: { spiritualGifts: primaryGifts }
        });
      }
    } catch (error) {
      console.error('Error saving gift identification:', error);
      throw new Error('Failed to save gift identification');
    }
  }

  private mapIdentificationFromDb(dbIdentification: any): SpiritualGiftIdentification {
    return {
      id: dbIdentification.id,
      userId: dbIdentification.userId,
      timestamp: dbIdentification.timestamp,
      identifiedGifts: dbIdentification.identifiedGifts,
      giftMix: dbIdentification.giftMix,
      assessmentScores: dbIdentification.assessmentScores,
      evidenceFromLife: dbIdentification.evidenceFromLife,
      confirmations: dbIdentification.confirmations,
      developmentPlan: dbIdentification.developmentPlan,
      confidence: dbIdentification.confidence,
      requiresConfirmation: dbIdentification.requiresConfirmation
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
