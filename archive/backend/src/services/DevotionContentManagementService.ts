/**
 * Devotion Content Management Service
 * Handles creation and management of devotion content
 */

import AIGatewayService from './AIGatewayService';
import ScriptureIntegrationService from './ScriptureIntegrationService';
import DevotionAudioService from './DevotionAudioService';
import {
  DailyDevotion,
  DevotionCreationRequest,
  ScripturePassage
} from '../types/devotion.types';

export default class DevotionContentManagementService {
  private aiGateway: AIGatewayService;
  private scriptureService: ScriptureIntegrationService;
  private audioService: DevotionAudioService;

  constructor(
    aiGateway?: AIGatewayService,
    scriptureService?: ScriptureIntegrationService,
    audioService?: DevotionAudioService
  ) {
    this.aiGateway = aiGateway || new AIGatewayService();
    this.scriptureService = scriptureService || new ScriptureIntegrationService();
    this.audioService = audioService || new DevotionAudioService();
  }

  /**
   * Create a new devotion
   */
  async createDevotion(request: DevotionCreationRequest): Promise<DailyDevotion> {
    try {
      // Get scripture passage
      const scripture = await this.scriptureService.getScripture(
        request.scriptureReference,
        request.translation || 'NIV'
      );

      // Generate devotion content using AI
      const content = await this.generateDevotionContent(request, scripture);

      // Create devotion object
      const devotion: DailyDevotion = {
        id: `devotion_${Date.now()}`,
        date: request.date,
        title: content.title,
        theme: request.theme,
        scripture,
        reflection: content.reflection,
        prayerPrompt: content.prayerPrompt,
        actionStep: content.actionStep,
        tags: request.tags || [],
        difficulty: request.difficulty || 'intermediate',
        estimatedReadTime: this.estimateReadTime(content),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Generate audio narration
      try {
        const audioUrl = await this.audioService.generateDevotionAudio(devotion);
        devotion.audioUrl = audioUrl;
      } catch (error) {
        console.error('Error generating audio:', error);
        // Continue without audio
      }

      // Save to database
      await this.saveDevotion(devotion);

      return devotion;
    } catch (error) {
      console.error('Error creating devotion:', error);
      throw new Error('Failed to create devotion');
    }
  }

  /**
   * Update an existing devotion
   */
  async updateDevotion(
    devotionId: string,
    updates: Partial<DailyDevotion>
  ): Promise<DailyDevotion> {
    try {
      // Get existing devotion
      const existing = await this.getDevotion(devotionId);
      
      if (!existing) {
        throw new Error('Devotion not found');
      }

      // Merge updates
      const updated: DailyDevotion = {
        ...existing,
        ...updates,
        updatedAt: new Date()
      };

      // If content changed, regenerate audio
      if (updates.reflection || updates.prayerPrompt || updates.actionStep) {
        try {
          const audioUrl = await this.audioService.generateDevotionAudio(updated);
          updated.audioUrl = audioUrl;
        } catch (error) {
          console.error('Error regenerating audio:', error);
        }
      }

      // Save to database
      await this.saveDevotion(updated);

      return updated;
    } catch (error) {
      console.error('Error updating devotion:', error);
      throw new Error('Failed to update devotion');
    }
  }

  /**
   * Delete a devotion
   */
  async deleteDevotion(devotionId: string): Promise<void> {
    try {
      const devotion = await this.getDevotion(devotionId);
      
      if (!devotion) {
        throw new Error('Devotion not found');
      }

      // Delete audio if exists
      if (devotion.audioUrl) {
        try {
          await this.audioService.deleteAudio(devotion.audioUrl);
        } catch (error) {
          console.error('Error deleting audio:', error);
        }
      }

      // Delete from database
      // await prisma.dailyDevotion.delete({ where: { id: devotionId } });
    } catch (error) {
      console.error('Error deleting devotion:', error);
      throw new Error('Failed to delete devotion');
    }
  }

  /**
   * Generate devotion content using AI
   */
  private async generateDevotionContent(
    request: DevotionCreationRequest,
    scripture: ScripturePassage
  ): Promise<{
    title: string;
    reflection: string;
    prayerPrompt: string;
    actionStep: string;
  }> {
    try {
      const prompt = this.buildContentGenerationPrompt(request, scripture);

      const response = await this.aiGateway.chat({
        messages: [
          {
            role: 'system',
            content: `You are a gifted Christian devotional writer with deep theological knowledge.
            Create devotional content that is:
            - Biblically sound and theologically accurate
            - Personally applicable and practical
            - Encouraging and hope-filled
            - Appropriate for the target audience
            - Engaging and well-written
            
            Always maintain a tone of grace, truth, and compassion.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        maxTokens: 2000
      });

      return this.parseGeneratedContent(response.content);
    } catch (error) {
      console.error('Error generating devotion content:', error);
      throw new Error('Failed to generate devotion content');
    }
  }

  /**
   * Build content generation prompt
   */
  private buildContentGenerationPrompt(
    request: DevotionCreationRequest,
    scripture: ScripturePassage
  ): string {
    return `Create a daily devotion with the following parameters:

Date: ${request.date.toDateString()}
Theme: ${request.theme}
Scripture: ${scripture.reference}
"${scripture.text}"

Target Audience: ${request.targetAudience || 'General Christian audience'}
Difficulty Level: ${request.difficulty || 'Intermediate'}

Please provide:
1. A compelling title (5-8 words)
2. A reflection (300-500 words) that:
   - Explains the scripture in context
   - Draws out key spiritual truths
   - Makes personal application
   - Includes relevant examples or illustrations
3. A prayer prompt (50-100 words) that helps readers pray about the theme
4. An action step (1-2 sentences) - something concrete they can do today

Format your response as JSON with fields: title, reflection, prayerPrompt, actionStep`;
  }

  /**
   * Parse generated content from AI response
   */
  private parseGeneratedContent(content: string): {
    title: string;
    reflection: string;
    prayerPrompt: string;
    actionStep: string;
  } {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      return {
        title: parsed.title || 'Daily Devotion',
        reflection: parsed.reflection || '',
        prayerPrompt: parsed.prayerPrompt || '',
        actionStep: parsed.actionStep || ''
      };
    } catch (error) {
      console.error('Error parsing generated content:', error);
      throw new Error('Failed to parse generated content');
    }
  }

  /**
   * Estimate read time based on content
   */
  private estimateReadTime(content: {
    reflection: string;
    prayerPrompt: string;
    actionStep: string;
  }): number {
    const totalWords = 
      content.reflection.split(/\s+/).length +
      content.prayerPrompt.split(/\s+/).length +
      content.actionStep.split(/\s+/).length;

    // Average reading speed: 200 words per minute
    const minutes = Math.ceil(totalWords / 200);
    
    return Math.max(minutes, 3); // Minimum 3 minutes
  }

  /**
   * Get devotion by ID
   */
  private async getDevotion(devotionId: string): Promise<DailyDevotion | null> {
    try {
      // In a real implementation, query from database
      // return await prisma.dailyDevotion.findUnique({ where: { id: devotionId } });
      return null;
    } catch (error) {
      console.error('Error getting devotion:', error);
      return null;
    }
  }

  /**
   * Save devotion to database
   */
  private async saveDevotion(devotion: DailyDevotion): Promise<void> {
    try {
      // In a real implementation, save to database
      // await prisma.dailyDevotion.upsert({
      //   where: { id: devotion.id },
      //   create: devotion,
      //   update: devotion
      // });
      console.log('Devotion saved:', devotion.id);
    } catch (error) {
      console.error('Error saving devotion:', error);
      throw new Error('Failed to save devotion');
    }
  }

  /**
   * Batch create devotions for a date range
   */
  async batchCreateDevotions(
    startDate: Date,
    endDate: Date,
    themes: string[],
    scriptureReferences: string[]
  ): Promise<DailyDevotion[]> {
    try {
      const devotions: DailyDevotion[] = [];
      const currentDate = new Date(startDate);

      let themeIndex = 0;
      let scriptureIndex = 0;

      while (currentDate <= endDate) {
        const request: DevotionCreationRequest = {
          date: new Date(currentDate),
          theme: themes[themeIndex % themes.length],
          scriptureReference: scriptureReferences[scriptureIndex % scriptureReferences.length]
        };

        try {
          const devotion = await this.createDevotion(request);
          devotions.push(devotion);
        } catch (error) {
          console.error(`Error creating devotion for ${currentDate.toDateString()}:`, error);
        }

        currentDate.setDate(currentDate.getDate() + 1);
        themeIndex++;
        scriptureIndex++;
      }

      return devotions;
    } catch (error) {
      console.error('Error batch creating devotions:', error);
      throw new Error('Failed to batch create devotions');
    }
  }

  /**
   * Validate devotion content
   */
  async validateDevotion(devotion: DailyDevotion): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    try {
      const issues: string[] = [];

      // Check required fields
      if (!devotion.title || devotion.title.length < 3) {
        issues.push('Title is too short');
      }

      if (!devotion.reflection || devotion.reflection.length < 100) {
        issues.push('Reflection is too short');
      }

      if (!devotion.prayerPrompt || devotion.prayerPrompt.length < 20) {
        issues.push('Prayer prompt is too short');
      }

      if (!devotion.actionStep || devotion.actionStep.length < 10) {
        issues.push('Action step is too short');
      }

      // Validate scripture reference
      if (!this.scriptureService.validateReference(devotion.scripture.reference)) {
        issues.push('Invalid scripture reference format');
      }

      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('Error validating devotion:', error);
      return {
        valid: false,
        issues: ['Validation error occurred']
      };
    }
  }
}
