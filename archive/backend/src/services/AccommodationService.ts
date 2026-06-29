/**
 * Accommodation Service
 * Recommends and manages accommodations for students with disabilities
 * Requirement 15.5
 */

import {
  AccommodationRequest,
  AccommodationRecommendation,
  Accommodation,
  AccommodationType,
  DisabilityType,
  ModifiedContent,
  AccommodationUsageTracking
} from '../types/accessibility.types';
import { AIGatewayService } from './AIGatewayService';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class AccommodationService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Recommend appropriate accommodations for a student
   */
  async recommendAccommodations(
    request: AccommodationRequest
  ): Promise<AccommodationRecommendation> {
    try {
      logger.info('Recommending accommodations', { 
        studentId: request.studentId,
        disability: request.disability 
      });

      // Get base accommodations for disability type
      const baseAccommodations = this.getBaseAccommodations(request.disability);

      // Get AI-enhanced recommendations
      const aiRecommendations = await this.getAIRecommendations(request);

      // Combine and prioritize accommodations
      const allAccommodations = [...baseAccommodations, ...aiRecommendations];
      const prioritizedAccommodations = this.prioritizeAccommodations(allAccommodations);

      // Generate modified content if needed
      const modifiedContent = request.assessmentId
        ? await this.generateModifiedContent(request)
        : undefined;

      const trackingId = this.generateTrackingId(request);

      return {
        studentId: request.studentId,
        courseId: request.courseId,
        assessmentId: request.assessmentId,
        accommodations: prioritizedAccommodations,
        modifiedContent,
        trackingId,
        approvalStatus: 'pending'
      };
    } catch (error) {
      logger.error('Error recommending accommodations', { error, request });
      throw new Error(`Failed to recommend accommodations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get base accommodations for disability type
   */
  private getBaseAccommodations(disability: DisabilityType): Accommodation[] {
    const accommodationMap: Record<DisabilityType, Accommodation[]> = {
      visual_impairment: [
        {
          type: 'screen_reader_compatible',
          description: 'Ensure all content is screen reader compatible',
          implementation: 'Add proper ARIA labels, alt text, and semantic HTML',
          priority: 'required',
          estimatedEffort: 'medium'
        },
        {
          type: 'alternative_format',
          description: 'Provide content in alternative formats',
          implementation: 'Generate audio versions, large print, or braille',
          priority: 'required',
          estimatedEffort: 'high'
        },
        {
          type: 'text_to_speech',
          description: 'Enable text-to-speech for all written content',
          implementation: 'Integrate TTS engine with course materials',
          priority: 'recommended',
          estimatedEffort: 'low'
        }
      ],
      hearing_impairment: [
        {
          type: 'captions_transcripts',
          description: 'Provide captions and transcripts for all audio/video',
          implementation: 'Generate captions using Whisper API and provide downloadable transcripts',
          priority: 'required',
          estimatedEffort: 'medium'
        },
        {
          type: 'alternative_format',
          description: 'Provide visual alternatives to audio content',
          implementation: 'Create visual summaries and diagrams',
          priority: 'recommended',
          estimatedEffort: 'high'
        }
      ],
      motor_impairment: [
        {
          type: 'keyboard_navigation',
          description: 'Ensure full keyboard navigation support',
          implementation: 'Add keyboard shortcuts and remove mouse-only interactions',
          priority: 'required',
          estimatedEffort: 'medium'
        },
        {
          type: 'speech_to_text',
          description: 'Enable voice input for text entry',
          implementation: 'Integrate speech recognition for assignments',
          priority: 'recommended',
          estimatedEffort: 'medium'
        },
        {
          type: 'extended_time',
          description: 'Provide extended time for assessments',
          implementation: 'Increase time limits by 50-100%',
          priority: 'required',
          estimatedEffort: 'low'
        }
      ],
      cognitive_disability: [
        {
          type: 'simplified_interface',
          description: 'Provide simplified, distraction-free interface',
          implementation: 'Create clean layout with minimal distractions',
          priority: 'required',
          estimatedEffort: 'high'
        },
        {
          type: 'extended_time',
          description: 'Provide extended time for assessments',
          implementation: 'Increase time limits by 50-100%',
          priority: 'required',
          estimatedEffort: 'low'
        },
        {
          type: 'frequent_breaks',
          description: 'Allow frequent breaks during assessments',
          implementation: 'Enable pause/resume functionality',
          priority: 'recommended',
          estimatedEffort: 'medium'
        },
        {
          type: 'reduced_distractions',
          description: 'Minimize visual and auditory distractions',
          implementation: 'Provide quiet testing environment option',
          priority: 'recommended',
          estimatedEffort: 'low'
        }
      ],
      learning_disability: [
        {
          type: 'text_to_speech',
          description: 'Enable text-to-speech for reading support',
          implementation: 'Integrate TTS engine with course materials',
          priority: 'required',
          estimatedEffort: 'low'
        },
        {
          type: 'extended_time',
          description: 'Provide extended time for assessments',
          implementation: 'Increase time limits by 50%',
          priority: 'required',
          estimatedEffort: 'low'
        },
        {
          type: 'alternative_format',
          description: 'Provide content in multiple formats',
          implementation: 'Offer audio, visual, and text versions',
          priority: 'recommended',
          estimatedEffort: 'high'
        }
      ],
      other: [
        {
          type: 'extended_time',
          description: 'Provide extended time for assessments',
          implementation: 'Increase time limits based on specific needs',
          priority: 'recommended',
          estimatedEffort: 'low'
        },
        {
          type: 'alternative_format',
          description: 'Provide content in alternative formats',
          implementation: 'Generate formats based on specific needs',
          priority: 'optional',
          estimatedEffort: 'medium'
        }
      ]
    };

    return accommodationMap[disability] || accommodationMap.other;
  }

  /**
   * Get AI-enhanced accommodation recommendations
   */
  private async getAIRecommendations(
    request: AccommodationRequest
  ): Promise<Accommodation[]> {
    try {
      const prompt = this.buildRecommendationPrompt(request);

      const response = await this.aiGateway.chatCompletion({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an accessibility expert specializing in educational accommodations. Provide specific, actionable recommendations based on student needs and course requirements.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const aiData = JSON.parse(response.choices[0]?.message?.content || '{"accommodations":[]}');
      
      return aiData.accommodations?.map((acc: any) => ({
        type: acc.type as AccommodationType,
        description: acc.description,
        implementation: acc.implementation,
        priority: acc.priority || 'optional',
        estimatedEffort: acc.estimatedEffort || 'medium'
      })) || [];
    } catch (error) {
      logger.warn('Could not get AI recommendations', { error });
      return [];
    }
  }

  /**
   * Build prompt for AI recommendations
   */
  private buildRecommendationPrompt(request: AccommodationRequest): string {
    let prompt = `Recommend educational accommodations for a student with ${request.disability.replace('_', ' ')}.\n\n`;
    prompt += `Course: ${request.courseId}\n`;
    
    if (request.assessmentId) {
      prompt += `Assessment: ${request.assessmentId}\n`;
    }

    if (request.specificNeeds && request.specificNeeds.length > 0) {
      prompt += `Specific needs: ${request.specificNeeds.join(', ')}\n`;
    }

    prompt += `\nProvide recommendations in JSON format:\n`;
    prompt += `{\n`;
    prompt += `  "accommodations": [\n`;
    prompt += `    {\n`;
    prompt += `      "type": "extended_time|alternative_format|etc",\n`;
    prompt += `      "description": "Brief description",\n`;
    prompt += `      "implementation": "How to implement",\n`;
    prompt += `      "priority": "required|recommended|optional",\n`;
    prompt += `      "estimatedEffort": "low|medium|high"\n`;
    prompt += `    }\n`;
    prompt += `  ]\n`;
    prompt += `}`;

    return prompt;
  }

  /**
   * Prioritize accommodations
   */
  private prioritizeAccommodations(accommodations: Accommodation[]): Accommodation[] {
    // Remove duplicates
    const unique = accommodations.filter((acc, index, self) =>
      index === self.findIndex(a => a.type === acc.type)
    );

    // Sort by priority
    const priorityOrder = { required: 0, recommended: 1, optional: 2 };
    return unique.sort((a, b) => 
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }

  /**
   * Generate modified content for assessments
   */
  private async generateModifiedContent(
    request: AccommodationRequest
  ): Promise<ModifiedContent | undefined> {
    try {
      if (!request.assessmentId) return undefined;

      // In production, fetch actual assessment content
      const originalContentId = request.assessmentId;
      const modifiedContentId = `${originalContentId}_modified_${Date.now()}`;

      // Generate modifications based on disability
      const modifications = await this.generateModifications(request);

      return {
        originalContentId,
        modifiedContentId,
        modificationType: `${request.disability}_accommodation`,
        changes: modifications.changes,
        accessibilityImprovements: modifications.improvements
      };
    } catch (error) {
      logger.warn('Could not generate modified content', { error });
      return undefined;
    }
  }

  /**
   * Generate specific modifications for content
   */
  private async generateModifications(
    request: AccommodationRequest
  ): Promise<{ changes: string[]; improvements: string[] }> {
    const changes: string[] = [];
    const improvements: string[] = [];

    switch (request.disability) {
      case 'visual_impairment':
        changes.push('Added alt text to all images');
        changes.push('Increased font size to 16pt minimum');
        changes.push('Enhanced color contrast');
        improvements.push('Screen reader compatible');
        improvements.push('High contrast mode available');
        break;

      case 'hearing_impairment':
        changes.push('Added captions to all videos');
        changes.push('Provided text transcripts');
        improvements.push('Visual alternatives for audio content');
        break;

      case 'motor_impairment':
        changes.push('Enabled full keyboard navigation');
        changes.push('Increased clickable area sizes');
        changes.push('Extended time limit by 100%');
        improvements.push('Voice input enabled');
        improvements.push('No mouse-only interactions');
        break;

      case 'cognitive_disability':
        changes.push('Simplified interface layout');
        changes.push('Reduced visual distractions');
        changes.push('Extended time limit by 100%');
        changes.push('Added frequent break reminders');
        improvements.push('Clear, simple instructions');
        improvements.push('Progress indicators');
        break;

      case 'learning_disability':
        changes.push('Enabled text-to-speech');
        changes.push('Extended time limit by 50%');
        changes.push('Provided content in multiple formats');
        improvements.push('Audio support available');
        improvements.push('Visual aids included');
        break;
    }

    return { changes, improvements };
  }

  /**
   * Generate tracking ID for accommodation
   */
  private generateTrackingId(request: AccommodationRequest): string {
    return `ACC_${request.studentId}_${request.courseId}_${Date.now()}`;
  }

  /**
   * Track accommodation usage
   */
  async trackUsage(
    trackingId: string,
    accommodationType: AccommodationType,
    effectiveness: number,
    feedback?: string
  ): Promise<void> {
    try {
      logger.info('Tracking accommodation usage', { 
        trackingId,
        accommodationType,
        effectiveness 
      });

      // In production, save to database
      // For now, just log
    } catch (error) {
      logger.error('Error tracking accommodation usage', { error });
    }
  }

  /**
   * Get accommodation usage statistics
   */
  async getUsageStatistics(
    studentId: string,
    timeframe: 'week' | 'month' | 'semester' = 'month'
  ): Promise<{
    totalAccommodations: number;
    mostUsed: AccommodationType[];
    averageEffectiveness: number;
    recommendations: string[];
  }> {
    try {
      // In production, query actual usage data
      return {
        totalAccommodations: 0,
        mostUsed: [],
        averageEffectiveness: 0,
        recommendations: []
      };
    } catch (error) {
      logger.error('Error getting usage statistics', { error });
      throw new Error(`Failed to get statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update accommodation based on effectiveness
   */
  async updateAccommodation(
    trackingId: string,
    effectiveness: number,
    feedback: string
  ): Promise<AccommodationRecommendation | null> {
    try {
      logger.info('Updating accommodation', { trackingId, effectiveness });

      // If effectiveness is low, generate new recommendations
      if (effectiveness < 0.6) {
        logger.info('Low effectiveness, generating new recommendations');
        // In production, fetch original request and generate new recommendations
      }

      return null;
    } catch (error) {
      logger.error('Error updating accommodation', { error });
      throw new Error(`Failed to update accommodation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default AccommodationService;
