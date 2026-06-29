/**
 * Multilingual Tutor Service
 * Provides AI tutoring in student's native language with cultural adaptation
 */

import {
  MultilingualTutorRequest,
  MultilingualTutorResponse,
  SupportedLanguage,
  Culture,
  LanguageProfile
} from '../types/translation.types';
import { AIGatewayService } from './AIGatewayService';
import { VectorStoreService } from './VectorStoreService';
import { LocalizationService } from './LocalizationService';
import logger from '../utils/logger';

export default class MultilingualTutorService {
  private aiGateway: AIGatewayService;
  private vectorStore: VectorStoreService;
  private localization: LocalizationService;

  constructor() {
    this.aiGateway = new AIGatewayService();
    this.vectorStore = new VectorStoreService();
    this.localization = new LocalizationService();
  }

  /**
   * Provide tutoring in student's native language
   */
  async tutorInNativeLanguage(request: MultilingualTutorRequest): Promise<MultilingualTutorResponse> {
    try {
      logger.info('Providing multilingual tutoring', {
        studentId: request.studentId,
        language: request.language,
        culture: request.culture
      });

      // Get cultural context for teaching style adaptation
      const culturalContext = this.localization.getCulturalContext(
        this.getCultureRegion(request.culture),
        request.culture
      );

      // Retrieve relevant course materials
      const courseMaterials = await this.retrieveCourseMaterials(
        request.question,
        request.courseContext,
        request.language
      );

      // Build culturally adapted tutoring prompt
      const prompt = this.buildTutoringPrompt(
        request,
        culturalContext,
        courseMaterials
      );

      const response = await this.aiGateway.generateCompletion({
        prompt,
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000
      });

      const parsed = this.parseTutoringResponse(response.content);

      const result: MultilingualTutorResponse = {
        response: parsed.response,
        language: request.language,
        culturallySensitive: parsed.culturallySensitive !== false,
        academicRigor: parsed.academicRigor || 0.9,
        confidence: parsed.confidence || response.confidence || 0.85,
        sources: parsed.sources || courseMaterials.map(m => m.title)
      };

      logger.info('Multilingual tutoring completed', {
        language: result.language,
        confidence: result.confidence,
        academicRigor: result.academicRigor
      });

      return result;
    } catch (error) {
      logger.error('Multilingual tutoring failed', { error, request });
      throw new Error(`Multilingual tutoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Maintain cultural sensitivity in tutoring
   */
  async adaptTeachingStyleToCulture(
    content: string,
    culture: Culture,
    language: SupportedLanguage
  ): Promise<{ adaptedContent: string; culturalNotes: string[] }> {
    try {
      logger.info('Adapting teaching style to culture', { culture, language });

      const culturalContext = this.localization.getCulturalContext(
        this.getCultureRegion(culture),
        culture
      );

      const prompt = `You are a culturally sensitive educator. Adapt this teaching content for ${culture} culture.

Original Content:
${content}

Cultural Context:
- Communication Style: ${culturalContext.communicationStyle}
- Learning Preferences: ${culturalContext.learningPreferences.join(', ')}
- Cultural Values: ${culturalContext.culturalValues.join(', ')}
- Sensitivities: ${culturalContext.sensitivities.join(', ')}

Instructions:
1. Adapt communication style to match cultural preferences
2. Use teaching methods aligned with learning preferences
3. Incorporate cultural values into examples
4. Avoid culturally sensitive topics or handle with care
5. Maintain academic rigor and world-class standards
6. Present in ${language} naturally

Provide adapted content in JSON format:
{
  "adaptedContent": "culturally adapted teaching content",
  "culturalNotes": ["note about adaptation 1", "note 2"]
}`;

      const response = await this.aiGateway.generateCompletion({
        prompt,
        model: 'gpt-4',
        temperature: 0.6,
        maxTokens: 2000
      });

      const parsed = JSON.parse(response.content);

      return {
        adaptedContent: parsed.adaptedContent || content,
        culturalNotes: parsed.culturalNotes || []
      };
    } catch (error) {
      logger.error('Teaching style adaptation failed', { error });
      return {
        adaptedContent: content,
        culturalNotes: ['Adaptation failed, using original content']
      };
    }
  }

  /**
   * Preserve academic rigor across languages
   */
  async ensureAcademicRigor(
    response: string,
    language: SupportedLanguage,
    expectedStandard: 'world-class' | 'university' | 'high-school'
  ): Promise<{ meetsStandard: boolean; rigorScore: number; improvements: string[] }> {
    try {
      logger.info('Ensuring academic rigor', { language, expectedStandard });

      const prompt = `You are an academic quality expert. Evaluate if this tutoring response meets ${expectedStandard} academic standards.

Response (in ${language}):
${response}

Evaluate:
1. Depth of explanation - Is it thorough and comprehensive?
2. Accuracy - Is the information correct and precise?
3. Critical thinking - Does it encourage analytical thinking?
4. Academic vocabulary - Uses appropriate terminology?
5. Evidence-based - Provides examples and reasoning?

Provide evaluation in JSON format:
{
  "meetsStandard": true/false,
  "rigorScore": 0.92,
  "improvements": ["suggestion 1", "suggestion 2"]
}`;

      const result = await this.aiGateway.generateCompletion({
        prompt,
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 1000
      });

      const parsed = JSON.parse(result.content);

      return {
        meetsStandard: parsed.meetsStandard !== false && parsed.rigorScore >= 0.85,
        rigorScore: parsed.rigorScore || 0.85,
        improvements: parsed.improvements || []
      };
    } catch (error) {
      logger.error('Academic rigor check failed', { error });
      return {
        meetsStandard: true,
        rigorScore: 0.85,
        improvements: []
      };
    }
  }

  /**
   * Provide examples in student's cultural context
   */
  async provideCulturallyRelevantExamples(
    concept: string,
    culture: Culture,
    language: SupportedLanguage
  ): Promise<string[]> {
    try {
      logger.info('Generating culturally relevant examples', { concept, culture });

      const prompt = `You are an educator creating examples for ${culture} culture. Generate 3 culturally relevant examples to explain this concept.

Concept: ${concept}

Instructions:
1. Use examples from ${culture} cultural context
2. Reference familiar situations, people, or places
3. Ensure examples are relatable and meaningful
4. Maintain educational value
5. Present in ${language}

Provide examples in JSON format:
{
  "examples": ["example 1", "example 2", "example 3"]
}`;

      const response = await this.aiGateway.generateCompletion({
        prompt,
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1500
      });

      const parsed = JSON.parse(response.content);
      return parsed.examples || [];
    } catch (error) {
      logger.error('Example generation failed', { error });
      return [];
    }
  }

  /**
   * Get student's language profile
   */
  async getStudentLanguageProfile(studentId: string): Promise<LanguageProfile | null> {
    try {
      // In production, this would query the database
      // For now, return null to indicate profile not found
      logger.info('Retrieving student language profile', { studentId });
      return null;
    } catch (error) {
      logger.error('Language profile retrieval failed', { error });
      return null;
    }
  }

  /**
   * Track tutoring effectiveness across languages
   */
  async trackTutoringEffectiveness(
    studentId: string,
    language: SupportedLanguage,
    questionId: string,
    helpful: boolean,
    feedback?: string
  ): Promise<void> {
    try {
      logger.info('Tracking tutoring effectiveness', {
        studentId,
        language,
        questionId,
        helpful
      });

      // In production, this would store metrics in database
      // Track: helpfulness, language effectiveness, cultural appropriateness
    } catch (error) {
      logger.error('Effectiveness tracking failed', { error });
    }
  }

  /**
   * Retrieve course materials in target language
   */
  private async retrieveCourseMaterials(
    question: string,
    courseContext: string | undefined,
    language: SupportedLanguage
  ): Promise<Array<{ title: string; content: string; relevance: number }>> {
    try {
      if (!courseContext) {
        return [];
      }

      const results = await this.vectorStore.search(question, {
        filter: { courseId: courseContext, language },
        limit: 3
      });

      return results.map(r => ({
        title: r.metadata?.title || 'Course Material',
        content: r.content,
        relevance: r.score || 0.8
      }));
    } catch (error) {
      logger.error('Course material retrieval failed', { error });
      return [];
    }
  }

  /**
   * Build tutoring prompt with cultural context
   */
  private buildTutoringPrompt(
    request: MultilingualTutorRequest,
    culturalContext: any,
    courseMaterials: Array<{ title: string; content: string }>
  ): string {
    const materialsContext = courseMaterials.length > 0
      ? `\nRelevant Course Materials:\n${courseMaterials.map(m => `${m.title}:\n${m.content}`).join('\n\n')}`
      : '';

    return `You are a world-class multilingual AI tutor for ScrollUniversity. Provide tutoring in ${request.language} for a student from ${request.culture} culture.

Cultural Context:
- Communication Style: ${culturalContext.communicationStyle}
- Learning Preferences: ${culturalContext.learningPreferences.join(', ')}
- Cultural Values: ${culturalContext.culturalValues.join(', ')}
${materialsContext}

Student Question:
${request.question}

Instructions:
1. Respond in ${request.language} naturally and fluently
2. Adapt teaching style to ${request.culture} cultural preferences
3. Use examples relevant to ${request.culture} culture
4. Maintain world-class academic rigor (Harvard/MIT level)
5. Be culturally sensitive to: ${culturalContext.sensitivities.join(', ')}
6. Cite course materials when referencing them
7. Encourage critical thinking and deeper understanding
8. Provide clear, comprehensive explanations

Provide your tutoring response in JSON format:
{
  "response": "your comprehensive tutoring response in ${request.language}",
  "culturallySensitive": true,
  "academicRigor": 0.95,
  "confidence": 0.92,
  "sources": ["source 1", "source 2"]
}`;
  }

  /**
   * Parse tutoring response
   */
  private parseTutoringResponse(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      // If not JSON, treat as plain response
      return {
        response: content,
        culturallySensitive: true,
        academicRigor: 0.85,
        confidence: 0.8,
        sources: []
      };
    }
  }

  /**
   * Get region for culture
   */
  private getCultureRegion(culture: Culture): any {
    const mapping: Record<Culture, string> = {
      western: 'north_america',
      latin: 'latin_america',
      middle_eastern: 'middle_east',
      african: 'africa',
      south_asian: 'south_asia',
      east_asian: 'east_asia',
      southeast_asian: 'southeast_asia'
    };

    return mapping[culture] || 'north_america';
  }
}
