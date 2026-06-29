/**
 * Alt Text Generation Service
 * Uses GPT-4 Vision for image analysis and description
 * Requirement 15.1
 */

import { AltTextRequest, AltTextResult } from '../types/accessibility.types';
import { AIGatewayService } from './AIGatewayService';
import logger from '../utils/logger';

export class AltTextGenerationService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Generate descriptive alt text for images using GPT-4 Vision
   */
  async generateAltText(request: AltTextRequest): Promise<AltTextResult> {
    try {
      const prompt = this.buildAltTextPrompt(request);

      // Use GPT-4 Vision for image analysis
      const response = await this.aiGateway.chatCompletion({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an accessibility expert specializing in creating descriptive alt text for images. Generate concise, informative alt text that conveys the essential information and context of images for users who cannot see them. Follow WCAG 2.1 guidelines.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: request.imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      });

      const altText = response.choices[0]?.message?.content || '';

      // Validate quality
      const qualityScore = this.validateAltTextQuality(altText, request);

      // Generate long description if needed for complex images
      const longDescription = await this.generateLongDescription(request, altText);

      return {
        altText: altText.trim(),
        longDescription,
        confidence: response.confidence || 0.9,
        qualityScore,
        suggestions: this.generateSuggestions(altText, qualityScore),
        wcagCompliant: qualityScore >= 0.7
      };
    } catch (error) {
      logger.error('Error generating alt text', { error, request });
      throw new Error(`Failed to generate alt text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build prompt for alt text generation based on context
   */
  private buildAltTextPrompt(request: AltTextRequest): string {
    let prompt = 'Analyze this image and generate appropriate alt text. ';

    if (request.contentType) {
      const typeInstructions: Record<string, string> = {
        diagram: 'This is a diagram. Describe the structure, relationships, and key information conveyed.',
        photo: 'This is a photograph. Describe the main subject, setting, and relevant details.',
        chart: 'This is a chart or graph. Describe the type of chart, data trends, and key insights.',
        illustration: 'This is an illustration. Describe the visual elements and their meaning.',
        screenshot: 'This is a screenshot. Describe the interface elements and their purpose.'
      };
      prompt += typeInstructions[request.contentType] || '';
    }

    if (request.context) {
      prompt += ` Context: ${request.context}. `;
    }

    prompt += '\n\nProvide:\n';
    prompt += '1. Concise alt text (1-2 sentences, max 125 characters if possible)\n';
    prompt += '2. Whether a longer description would be beneficial\n';
    prompt += '3. Key information that must be conveyed\n';
    prompt += '\nFollow WCAG 2.1 guidelines for alt text.';

    return prompt;
  }

  /**
   * Generate long description for complex images
   */
  private async generateLongDescription(
    request: AltTextRequest,
    shortAltText: string
  ): Promise<string | undefined> {
    try {
      // Only generate long description for complex content types
      if (!request.contentType || !['diagram', 'chart'].includes(request.contentType)) {
        return undefined;
      }

      const prompt = `The short alt text for this image is: "${shortAltText}"\n\n` +
        `Generate a detailed long description (2-4 sentences) that provides additional context ` +
        `and information for users who need more detail. Focus on data, relationships, and insights.`;

      const response = await this.aiGateway.chatCompletion({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: request.imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      });

      return response.choices[0]?.message?.content?.trim();
    } catch (error) {
      logger.warn('Could not generate long description', { error });
      return undefined;
    }
  }

  /**
   * Validate alt text quality against WCAG guidelines
   */
  private validateAltTextQuality(altText: string, request: AltTextRequest): number {
    let score = 1.0;

    // Check length (should be concise but informative)
    if (altText.length < 10) {
      score -= 0.3; // Too short
    } else if (altText.length > 250) {
      score -= 0.2; // Too long
    }

    // Check for common issues
    if (altText.toLowerCase().startsWith('image of') || 
        altText.toLowerCase().startsWith('picture of')) {
      score -= 0.1; // Redundant phrasing
    }

    if (altText.includes('...') || altText.includes('[') || altText.includes(']')) {
      score -= 0.1; // Incomplete or placeholder text
    }

    // Check for meaningful content
    const words = altText.split(/\s+/);
    if (words.length < 3) {
      score -= 0.2; // Too few words
    }

    // Ensure it's not just generic text
    const genericPhrases = ['an image', 'a picture', 'a photo', 'graphic'];
    if (genericPhrases.some(phrase => altText.toLowerCase() === phrase)) {
      score -= 0.4; // Too generic
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Generate suggestions for improving alt text
   */
  private generateSuggestions(altText: string, qualityScore: number): string[] {
    const suggestions: string[] = [];

    if (qualityScore < 0.7) {
      if (altText.length < 10) {
        suggestions.push('Alt text is too short. Add more descriptive details.');
      }
      if (altText.length > 250) {
        suggestions.push('Alt text is too long. Consider using a long description instead.');
      }
      if (altText.toLowerCase().startsWith('image of') || 
          altText.toLowerCase().startsWith('picture of')) {
        suggestions.push('Remove redundant phrases like "image of" or "picture of".');
      }
    }

    if (suggestions.length === 0 && qualityScore >= 0.9) {
      suggestions.push('Alt text meets WCAG 2.1 guidelines.');
    }

    return suggestions;
  }

  /**
   * Batch generate alt text for multiple images
   */
  async batchGenerateAltText(requests: AltTextRequest[]): Promise<AltTextResult[]> {
    try {
      logger.info('Batch generating alt text', { count: requests.length });

      const results = await Promise.all(
        requests.map(request => this.generateAltText(request))
      );

      return results;
    } catch (error) {
      logger.error('Error in batch alt text generation', { error });
      throw new Error(`Batch generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default AltTextGenerationService;
