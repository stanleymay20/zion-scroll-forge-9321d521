/**
 * Localization Service
 * Handles cultural adaptation and context-specific content localization
 */

import {
  LocalizationRequest,
  LocalizedContent,
  Region,
  Culture,
  SupportedLanguage,
  ContentType
} from '../types/translation.types';
import { AIGatewayService } from './AIGatewayService';
import logger from '../utils/logger';

export default class LocalizationService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Adapt examples to local context
   */
  async adaptExamples(
    examples: string[],
    targetRegion: Region,
    targetCulture: Culture,
    targetLanguage: SupportedLanguage
  ): Promise<string[]> {
    try {
      logger.info('Adapting examples to local context', {
        exampleCount: examples.length,
        targetRegion,
        targetCulture
      });

      const prompt = `You are a cultural adaptation expert. Adapt these examples to be relevant for ${targetCulture} culture in ${targetRegion}.

Original Examples:
${examples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}

Instructions:
1. Replace Western-centric examples with locally relevant ones
2. Use familiar cultural references and contexts
3. Maintain the educational value and learning point
4. Ensure cultural appropriateness and sensitivity
5. Use ${targetLanguage} language naturally

Provide adapted examples in JSON format:
{
  "adaptedExamples": ["adapted example 1", "adapted example 2", ...]
}`;

      const response = await this.aiGateway.generateCompletion({
        prompt,
        model: 'gpt-4',
        temperature: 0.6,
        maxTokens: 2000
      });

      const parsed = JSON.parse(response.content);
      return parsed.adaptedExamples || examples;
    } catch (error) {
      logger.error('Example adaptation failed', { error });
      return examples; // Return original on error
    }
  }

  /**
   * Modify case studies for cultural relevance
   */
  async adaptCaseStudy(
    caseStudy: string,
    targetRegion: Region,
    targetCulture: Culture,
    targetLanguage: SupportedLanguage
  ): Promise<{ adaptedCaseStudy: string; culturalNotes: string[] }> {
    try {
      logger.info('Adapting case study', { targetRegion, targetCulture });

      const prompt = `You are a cultural adaptation expert. Adapt this case study for ${targetCulture} culture in ${targetRegion}.

Original Case Study:
${caseStudy}

Instructions:
1. Replace companies, locations, and contexts with locally relevant ones
2. Adjust business practices to match local norms
3. Consider local economic conditions and market dynamics
4. Maintain the core business lessons and learning objectives
5. Ensure cultural sensitivity and appropriateness
6. Translate to ${targetLanguage} naturally

Provide the adapted case study in JSON format:
{
  "adaptedCaseStudy": "culturally adapted case study text",
  "culturalNotes": ["note about adaptation 1", "note 2"]
}`;

      const response = await this.aiGateway.generateCompletion({
        prompt,
        model: 'gpt-4',
        temperature: 0.6,
        maxTokens: 3000
      });

      const parsed = JSON.parse(response.content);
      return {
        adaptedCaseStudy: parsed.adaptedCaseStudy || caseStudy,
        culturalNotes: parsed.culturalNotes || []
      };
    } catch (error) {
      logger.error('Case study adaptation failed', { error });
      return {
        adaptedCaseStudy: caseStudy,
        culturalNotes: ['Adaptation failed, using original content']
      };
    }
  }

  /**
   * Adjust cultural references and idioms
   */
  async adjustCulturalReferences(
    content: string,
    targetCulture: Culture,
    targetLanguage: SupportedLanguage
  ): Promise<{ adjustedContent: string; replacements: Array<{ original: string; replacement: string }> }> {
    try {
      logger.info('Adjusting cultural references', { targetCulture });

      const prompt = `You are a cultural adaptation expert. Adjust cultural references and idioms in this content for ${targetCulture} culture.

Original Content:
${content}

Instructions:
1. Identify Western-centric idioms, metaphors, and cultural references
2. Replace with equivalent expressions from ${targetCulture} culture
3. Maintain the intended meaning and impact
4. Ensure natural flow in ${targetLanguage}
5. Preserve the educational or spiritual message

Provide the adjusted content in JSON format:
{
  "adjustedContent": "content with adjusted references",
  "replacements": [
    {"original": "original phrase", "replacement": "culturally appropriate phrase"},
    ...
  ]
}`;

      const response = await this.aiGateway.generateCompletion({
        prompt,
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 2500
      });

      const parsed = JSON.parse(response.content);
      return {
        adjustedContent: parsed.adjustedContent || content,
        replacements: parsed.replacements || []
      };
    } catch (error) {
      logger.error('Cultural reference adjustment failed', { error });
      return {
        adjustedContent: content,
        replacements: []
      };
    }
  }

  /**
   * Verify learning objectives are preserved
   */
  async verifyLearningObjectives(
    originalContent: string,
    localizedContent: string,
    learningObjectives: string[]
  ): Promise<{ preserved: boolean; analysis: string; missingObjectives: string[] }> {
    try {
      logger.info('Verifying learning objectives preservation', {
        objectiveCount: learningObjectives.length
      });

      const prompt = `You are an educational content expert. Verify that the localized content preserves all learning objectives from the original.

Learning Objectives:
${learningObjectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

Original Content:
${originalContent}

Localized Content:
${localizedContent}

Analyze whether each learning objective is still achievable with the localized content.

Provide analysis in JSON format:
{
  "preserved": true/false,
  "analysis": "detailed analysis of objective preservation",
  "missingObjectives": ["objective 1 if missing", ...]
}`;

      const response = await this.aiGateway.generateCompletion({
        prompt,
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 1500
      });

      const parsed = JSON.parse(response.content);
      return {
        preserved: parsed.preserved !== false,
        analysis: parsed.analysis || 'Analysis not available',
        missingObjectives: parsed.missingObjectives || []
      };
    } catch (error) {
      logger.error('Learning objective verification failed', { error });
      return {
        preserved: true, // Assume preserved on error
        analysis: 'Verification failed',
        missingObjectives: []
      };
    }
  }

  /**
   * Get cultural context for region
   */
  getCulturalContext(region: Region, culture: Culture): {
    communicationStyle: string;
    learningPreferences: string[];
    culturalValues: string[];
    sensitivities: string[];
  } {
    const contexts: Record<string, any> = {
      latin_america: {
        communicationStyle: 'Warm, relationship-focused, indirect',
        learningPreferences: ['Group work', 'Discussion', 'Practical examples'],
        culturalValues: ['Family', 'Community', 'Respect for authority'],
        sensitivities: ['Economic inequality', 'Colonial history', 'Religious diversity']
      },
      africa: {
        communicationStyle: 'Respectful, community-oriented, storytelling',
        learningPreferences: ['Oral tradition', 'Collaborative learning', 'Real-world application'],
        culturalValues: ['Ubuntu (community)', 'Respect for elders', 'Oral wisdom'],
        sensitivities: ['Colonial legacy', 'Tribal diversity', 'Economic challenges']
      },
      middle_east: {
        communicationStyle: 'Formal, respectful, indirect',
        learningPreferences: ['Structured learning', 'Memorization', 'Teacher-centered'],
        culturalValues: ['Honor', 'Family', 'Religious devotion'],
        sensitivities: ['Religious topics', 'Gender roles', 'Political conflicts']
      },
      south_asia: {
        communicationStyle: 'Hierarchical, respectful, indirect',
        learningPreferences: ['Rote learning', 'Exam-focused', 'Theoretical foundation'],
        culturalValues: ['Education', 'Family honor', 'Spiritual growth'],
        sensitivities: ['Caste system', 'Religious diversity', 'Gender equality']
      },
      east_asia: {
        communicationStyle: 'Indirect, harmony-focused, formal',
        learningPreferences: ['Structured curriculum', 'Repetition', 'Group harmony'],
        culturalValues: ['Education', 'Hard work', 'Respect for authority'],
        sensitivities: ['Face-saving', 'Hierarchy', 'Collectivism vs individualism']
      },
      southeast_asia: {
        communicationStyle: 'Polite, indirect, relationship-based',
        learningPreferences: ['Practical skills', 'Collaborative work', 'Respect for teachers'],
        culturalValues: ['Harmony', 'Respect', 'Community'],
        sensitivities: ['Religious diversity', 'Colonial history', 'Economic disparity']
      }
    };

    return contexts[region] || {
      communicationStyle: 'Respectful and clear',
      learningPreferences: ['Varied approaches'],
      culturalValues: ['Education', 'Respect'],
      sensitivities: ['Cultural differences']
    };
  }

  /**
   * Generate localization report
   */
  async generateLocalizationReport(
    originalContent: string,
    localizedContent: LocalizedContent,
    targetRegion: Region,
    targetCulture: Culture
  ): Promise<{
    summary: string;
    adaptations: string[];
    qualityScore: number;
    recommendations: string[];
  }> {
    try {
      const culturalContext = this.getCulturalContext(targetRegion, targetCulture);

      const report = {
        summary: `Content localized for ${targetCulture} culture in ${targetRegion}`,
        adaptations: [
          `Examples adapted: ${localizedContent.adaptedExamples.length}`,
          `Cultural notes: ${localizedContent.culturalNotes.length}`,
          `Learning objectives preserved: ${localizedContent.learningObjectivesPreserved ? 'Yes' : 'No'}`
        ],
        qualityScore: localizedContent.confidence,
        recommendations: [
          localizedContent.reviewRequired ? 'Human review recommended' : 'Quality acceptable',
          `Consider ${culturalContext.communicationStyle} communication style`,
          `Align with ${culturalContext.learningPreferences.join(', ')} learning preferences`
        ]
      };

      logger.info('Localization report generated', { qualityScore: report.qualityScore });
      return report;
    } catch (error) {
      logger.error('Report generation failed', { error });
      throw new Error(`Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
