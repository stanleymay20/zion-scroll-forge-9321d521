/**
 * Spiritual Mentor Matching Service
 * Matches users with appropriate spiritual mentors
 */

import { PrismaClient } from '@prisma/client';
import AIGatewayService from './AIGatewayService';
import {
  SpiritualMentorMatch,
  MentorMatchRequest,
  MentorMatchResponse
} from '../types/prophetic-checkin.types';

const prisma = new PrismaClient();

export default class SpiritualMentorMatchingService {
  private aiGateway: AIGatewayService;

  constructor(aiGateway?: AIGatewayService) {
    this.aiGateway = aiGateway || new AIGatewayService();
  }

  /**
   * Find mentor matches
   */
  async findMentorMatches(request: MentorMatchRequest): Promise<MentorMatchResponse> {
    try {
      // Get user's spiritual profile
      const userProfile = await this.getUserProfile(request.userId);

      // Build matching prompt
      const prompt = this.buildMatchingPrompt(request, userProfile);

      // Get AI recommendations
      const response = await this.aiGateway.chat({
        messages: [
          {
            role: 'system',
            content: `You are a spiritual mentorship coordinator with expertise in matching mentors and mentees.
            Consider spiritual gifts, calling, growth goals, and personality fit.
            Recommend mentor types and characteristics even if specific mentors aren't available.
            Provide practical connection steps and expectations.
            Format your response as JSON.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        maxTokens: 2500
      });

      // Parse AI response
      const matches = this.parseMentorMatches(response.content, request.userId);

      // Save matches
      await this.saveMentorMatches(matches);

      return {
        success: true,
        matches,
        confidence: matches.confidence
      };
    } catch (error) {
      console.error('Error finding mentor matches:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find mentor matches',
        confidence: 0
      };
    }
  }

  /**
   * Get mentor match history
   */
  async getMentorMatchHistory(userId: string): Promise<SpiritualMentorMatch[]> {
    try {
      const matches = await prisma.spiritualMentorMatch.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' }
      });

      return matches.map(this.mapMatchFromDb);
    } catch (error) {
      console.error('Error fetching mentor match history:', error);
      throw new Error('Failed to fetch mentor match history');
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
          kingdomVision: true
        }
      });

      // Get latest gift identification and calling
      const [giftIdentification, calling] = await Promise.all([
        prisma.spiritualGiftIdentification.findFirst({
          where: { userId },
          orderBy: { timestamp: 'desc' }
        }),
        prisma.callingDiscernment.findFirst({
          where: { userId },
          orderBy: { timestamp: 'desc' }
        })
      ]);

      return {
        ...user,
        giftIdentification,
        calling
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return {};
    }
  }

  private buildMatchingPrompt(request: MentorMatchRequest, userProfile: any): string {
    return `Find spiritual mentor matches for this person:

Mentorship Needs:
${request.mentorshipNeeds.join('\n')}

Growth Goals:
${request.growthGoals.join('\n')}

Preferences:
- Mentor Type: ${request.preferences.mentorType || 'Open'}
- Communication Style: ${request.preferences.communicationStyle || 'Flexible'}
- Frequency: ${request.preferences.frequency || 'Regular'}
- Duration: ${request.preferences.duration || 'Ongoing'}

Spiritual Profile:
- Spiritual Gifts: ${userProfile.spiritualGifts?.join(', ') || 'Unknown'}
- Calling: ${userProfile.scrollCalling || 'Seeking'}
- Kingdom Vision: ${userProfile.kingdomVision || 'Developing'}

Provide mentor matching recommendations including:
1. Mentorship needs analysis
2. Recommended mentor types and characteristics
3. Matching criteria (gift alignment, calling alignment, experience level, etc.)
4. Connection steps
5. Mentorship expectations
6. Match scores and reasons

Format as JSON.`;
  }

  private parseMentorMatches(content: string, userId: string): SpiritualMentorMatch {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      return {
        id: this.generateId(),
        userId,
        timestamp: new Date(),
        mentorshipNeeds: parsed.mentorshipNeeds || [],
        currentChallenges: parsed.currentChallenges || [],
        growthGoals: parsed.growthGoals || [],
        recommendedMentors: parsed.recommendedMentors || [],
        matchingCriteria: parsed.matchingCriteria || this.getDefaultMatchingCriteria(),
        connectionSteps: parsed.connectionSteps || [],
        expectations: parsed.expectations || [],
        confidence: parsed.confidence || 0.7
      };
    } catch (error) {
      console.error('Error parsing mentor matches:', error);
      return {
        id: this.generateId(),
        userId,
        timestamp: new Date(),
        mentorshipNeeds: [],
        currentChallenges: [],
        growthGoals: [],
        recommendedMentors: [],
        matchingCriteria: this.getDefaultMatchingCriteria(),
        connectionSteps: [],
        expectations: [],
        confidence: 0.3
      };
    }
  }

  private getDefaultMatchingCriteria(): any {
    return {
      giftAlignment: false,
      callingAlignment: false,
      experienceLevel: 'intermediate',
      personalityFit: 'compatible',
      geographicPreference: 'flexible',
      communicationStyle: 'balanced',
      mentorshipGoals: []
    };
  }

  private async saveMentorMatches(matches: SpiritualMentorMatch): Promise<void> {
    try {
      await prisma.spiritualMentorMatch.create({
        data: {
          id: matches.id,
          userId: matches.userId,
          timestamp: matches.timestamp,
          mentorshipNeeds: matches.mentorshipNeeds as any,
          currentChallenges: matches.currentChallenges,
          growthGoals: matches.growthGoals,
          recommendedMentors: matches.recommendedMentors as any,
          matchingCriteria: matches.matchingCriteria as any,
          connectionSteps: matches.connectionSteps as any,
          expectations: matches.expectations as any,
          confidence: matches.confidence
        }
      });
    } catch (error) {
      console.error('Error saving mentor matches:', error);
      throw new Error('Failed to save mentor matches');
    }
  }

  private mapMatchFromDb(dbMatch: any): SpiritualMentorMatch {
    return {
      id: dbMatch.id,
      userId: dbMatch.userId,
      timestamp: dbMatch.timestamp,
      mentorshipNeeds: dbMatch.mentorshipNeeds,
      currentChallenges: dbMatch.currentChallenges,
      growthGoals: dbMatch.growthGoals,
      recommendedMentors: dbMatch.recommendedMentors,
      matchingCriteria: dbMatch.matchingCriteria,
      connectionSteps: dbMatch.connectionSteps,
      expectations: dbMatch.expectations,
      confidence: dbMatch.confidence
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
