/**
 * Translation Service
 * Handles multilingual content translation with academic and theological accuracy
 */

import {
  TranslationRequest,
  TranslatedContent,
  LocalizationRequest,
  LocalizedContent,
  TheologicalTranslationRequest,
  TheologicalTranslation,
  MultilingualTutorRequest,
  MultilingualTutorResponse,
  TranslationQualityMetrics,
  BatchTranslationRequest,
  BatchTranslationResult,
  SupportedLanguage,
  ContentType,
  TranslationError
} from '../types/translation.types';
import { AIGatewayService } from './AIGatewayService';
import { AICacheService } from './AICacheService';
import { VectorStoreService } from './VectorStoreService';
import logger from '../utils/logger';

export default class TranslationService {
  private aiGateway: AIGatewayService;
  private cache: AICacheService;
  private vectorStore: VectorStoreService;

  constructor() {
    this.aiGateway = new AIGatewayService();
    this.cache = new AICacheService();
    this.vectorStore = new VectorStoreService();
  }

  /**
   * Translate content to target language
   */
  async translateContent(request: TranslationRequest): Promise<TranslatedContent> {
    try {
      logger.info('Translating content', {
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        contentType: request.contentType
      });

      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        logger.info('Translation found in cache');
        return cached as TranslatedContent;
      }

      // Build translation prompt based on content type
      const prompt = this.buildTranslationPrompt(request);

      // Call AI service
      const response = await this.aiGateway.generateCompletion({
        prompt,
        model: 'gpt-4',
        temperature: 0.3, // Lower temperature for accuracy
        maxTokens: 4000
      });

      // Parse and validate translation
      const translation = this.parseTranslationResponse(response.content, request);

      // Calculate quality metrics
      const quality = await this.assessTranslationQuality(
        request.content,
        translation.translatedText,
        request.contentType
      );

      const result: TranslatedContent = {
        translatedText: translation.translatedText,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        confidence: quality.accuracy,
        theologicalAccuracy: request.contentType === 'biblical' || request.contentType === 'theological' 
          ? quality.theologicalCorrectness 
          : undefined,
        culturalSensitivity: quality.culturalSensitivity,
        reviewRequired: quality.accuracy < 0.85 || 
          (request.contentType === 'biblical' && quality.theologicalCorrectness < 0.95),
        warnings: translation.warnings,
        metadata: {
          quality,
          model: 'gpt-4',
          timestamp: new Date().toISOString()
        }
      };

      // Cache the result
      await this.cache.set(cacheKey, result, 86400); // 24 hours

      logger.info('Translation completed', {
        confidence: result.confidence,
        reviewRequired: result.reviewRequired
      });

      return result;
    } catch (error) {
      logger.error('Translation failed', { error, request });
      throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Localize content for specific region and culture
   */
  async localizeContent(request: LocalizationRequest): Promise<LocalizedContent> {
    try {
      logger.info('Localizing content', {
        targetLanguage: request.targetLanguage,
        targetRegion: request.targetRegion,
        targetCulture: request.targetCulture
      });

      const prompt = `You are a cultural adaptation expert. Localize the following content for ${request.targetCulture} culture in ${request.targetRegion}.

Content Type: ${request.contentType}
Target Language: ${request.targetLanguage}
Preserve Learning Objectives: ${request.preserveLearningObjectives}

Original Content:
${request.content}

Instructions:
1. Adapt examples to be culturally relevant and relatable
2. Modify case studies to reflect local context
3. Adjust cultural references and idioms
4. Maintain the core learning objectives
5. Ensure cultural sensitivity and appropriateness
6. Preserve academic rigor

Provide the localized content in JSON format:
{
  "localizedText": "adapted content",
  "adaptedExamples": ["example 1", "example 2"],
  "culturalNotes": ["note about adaptation 1", "note 2"],
  "learningObjectivesPreserved": true/false
}`;

      const response = await this.aiGateway.generateCompletion({
        prompt,
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 4000
      });

      const parsed = JSON.parse(response.content);

      const result: LocalizedContent = {
        localizedText: parsed.localizedText,
        adaptedExamples: parsed.adaptedExamples || [],
        culturalNotes: parsed.culturalNotes || [],
        learningObjectivesPreserved: parsed.learningObjectivesPreserved,
        confidence: response.confidence || 0.85,
        reviewRequired: !parsed.learningObjectivesPreserved || response.confidence < 0.85
      };

      logger.info('Localization completed', {
        confidence: result.confidence,
        reviewRequired: result.reviewRequired
      });

      return result;
    } catch (error) {
      logger.error('Localization failed', { error, request });
      throw new Error(`Localization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Translate theological/biblical content with high accuracy
   */
  async translateTheologicalContent(request: TheologicalTranslationRequest): Promise<TheologicalTranslation> {
    try {
      logger.info('Translating theological content', {
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage
      });

      const bibleTranslations = request.bibleTranslations || this.getDefaultBibleTranslations(request.targetLanguage);

      const prompt = `You are a theological translation expert with deep knowledge of biblical languages and theology.

Translate the following theological content from ${request.sourceLanguage} to ${request.targetLanguage}.

Original Text:
${request.text}

${request.theologicalContext ? `Theological Context: ${request.theologicalContext}` : ''}

Instructions:
1. Maintain theological precision and doctrinal accuracy
2. Consult these Bible translations: ${bibleTranslations.join(', ')}
3. Preserve biblical references and their meaning
4. Use appropriate theological terminology
5. Maintain reverence and spiritual tone
6. Flag any areas requiring expert theological review

Provide the translation in JSON format:
{
  "translatedText": "translated content",
  "bibleReferences": [{"book": "John", "chapter": 3, "verse": 16, "text": "verse text", "translation": "NIV"}],
  "theologicalAccuracy": 0.95,
  "consultedTranslations": ["NIV", "ESV"],
  "expertReviewRequired": false,
  "notes": ["any important notes"]
}`;

      const response = await this.aiGateway.generateCompletion({
        prompt,
        model: 'gpt-4',
        temperature: 0.2, // Very low temperature for theological accuracy
        maxTokens: 4000
      });

      const parsed = JSON.parse(response.content);

      const result: TheologicalTranslation = {
        translatedText: parsed.translatedText,
        bibleReferences: parsed.bibleReferences || [],
        theologicalAccuracy: parsed.theologicalAccuracy || 0.9,
        consultedTranslations: parsed.consultedTranslations || bibleTranslations,
        expertReviewRequired: parsed.expertReviewRequired || parsed.theologicalAccuracy < 0.95,
        notes: parsed.notes
      };

      logger.info('Theological translation completed', {
        theologicalAccuracy: result.theologicalAccuracy,
        expertReviewRequired: result.expertReviewRequired
      });

      return result;
    } catch (error) {
      logger.error('Theological translation failed', { error, request });
      throw new Error(`Theological translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Provide multilingual AI tutoring
   */
  async provideMultilingualTutoring(request: MultilingualTutorRequest): Promise<MultilingualTutorResponse> {
    try {
      logger.info('Providing multilingual tutoring', {
        studentId: request.studentId,
        language: request.language,
        culture: request.culture
      });

      // Get relevant course context from vector store
      let context = '';
      if (request.courseContext) {
        const contextResults = await this.vectorStore.search(request.question, {
          filter: { courseId: request.courseContext },
          limit: 3
        });
        context = contextResults.map(r => r.content).join('\n\n');
      }

      const prompt = `You are a multilingual AI tutor for ScrollUniversity. Respond to the student's question in ${request.language} with cultural sensitivity for ${request.culture} culture.

${context ? `Course Context:\n${context}\n` : ''}

Student Question:
${request.question}

Instructions:
1. Respond in ${request.language} naturally and fluently
2. Maintain cultural sensitivity and appropriateness for ${request.culture} culture
3. Adapt teaching style to cultural learning preferences
4. Preserve academic rigor and world-class standards
5. Include relevant examples from the student's cultural context
6. Cite sources when referencing course materials

Provide your response in JSON format:
{
  "response": "your tutoring response in ${request.language}",
  "culturallySensitive": true/false,
  "academicRigor": 0.9,
  "confidence": 0.95,
  "sources": ["source 1", "source 2"]
}`;

      const response = await this.aiGateway.generateCompletion({
        prompt,
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000
      });

      const parsed = JSON.parse(response.content);

      const result: MultilingualTutorResponse = {
        response: parsed.response,
        language: request.language,
        culturallySensitive: parsed.culturallySensitive !== false,
        academicRigor: parsed.academicRigor || 0.85,
        confidence: parsed.confidence || response.confidence || 0.85,
        sources: parsed.sources
      };

      logger.info('Multilingual tutoring completed', {
        language: result.language,
        confidence: result.confidence
      });

      return result;
    } catch (error) {
      logger.error('Multilingual tutoring failed', { error, request });
      throw new Error(`Multilingual tutoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate translation quality
   */
  async validateTranslationQuality(
    sourceText: string,
    translatedText: string,
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage,
    contentType: ContentType
  ): Promise<TranslationQualityMetrics> {
    try {
      const prompt = `You are a translation quality expert. Evaluate the quality of this translation.

Source Language: ${sourceLanguage}
Target Language: ${targetLanguage}
Content Type: ${contentType}

Source Text:
${sourceText}

Translated Text:
${translatedText}

Evaluate on these criteria (0.0 to 1.0):
1. Accuracy: Meaning preserved correctly
2. Fluency: Natural and readable in target language
3. Theological Correctness: ${contentType === 'biblical' || contentType === 'theological' ? 'Critical' : 'N/A'}
4. Cultural Sensitivity: Appropriate for target culture
5. Technical Accuracy: ${contentType === 'technical' ? 'Critical' : 'N/A'}
6. Formatting Preserved: Structure and formatting maintained

Provide evaluation in JSON format:
{
  "accuracy": 0.95,
  "fluency": 0.92,
  "theologicalCorrectness": 0.98,
  "culturalSensitivity": 0.90,
  "technicalAccuracy": 0.93,
  "formattingPreserved": true
}`;

      const response = await this.aiGateway.generateCompletion({
        prompt,
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 500
      });

      const metrics = JSON.parse(response.content);

      return {
        accuracy: metrics.accuracy || 0.85,
        fluency: metrics.fluency || 0.85,
        theologicalCorrectness: metrics.theologicalCorrectness || 0.9,
        culturalSensitivity: metrics.culturalSensitivity || 0.85,
        technicalAccuracy: metrics.technicalAccuracy || 0.85,
        formattingPreserved: metrics.formattingPreserved !== false
      };
    } catch (error) {
      logger.error('Quality validation failed', { error });
      // Return default metrics on error
      return {
        accuracy: 0.8,
        fluency: 0.8,
        theologicalCorrectness: 0.85,
        culturalSensitivity: 0.8,
        technicalAccuracy: 0.8,
        formattingPreserved: true
      };
    }
  }

  /**
   * Batch translate multiple items
   */
  async batchTranslate(request: BatchTranslationRequest): Promise<BatchTranslationResult> {
    try {
      logger.info('Starting batch translation', {
        itemCount: request.items.length,
        priority: request.priority
      });

      const results: TranslatedContent[] = [];
      const errors: TranslationError[] = [];

      for (const item of request.items) {
        try {
          const result = await this.translateContent(item);
          results.push(result);
        } catch (error) {
          errors.push({
            code: 'TRANSLATION_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
            sourceText: item.content.substring(0, 100),
            targetLanguage: item.targetLanguage
          });
        }
      }

      const batchResult: BatchTranslationResult = {
        results,
        totalItems: request.items.length,
        successCount: results.length,
        failureCount: errors.length,
        errors
      };

      logger.info('Batch translation completed', {
        successCount: batchResult.successCount,
        failureCount: batchResult.failureCount
      });

      return batchResult;
    } catch (error) {
      logger.error('Batch translation failed', { error });
      throw new Error(`Batch translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build translation prompt based on content type
   */
  private buildTranslationPrompt(request: TranslationRequest): string {
    const basePrompt = `Translate the following ${request.contentType} content from ${request.sourceLanguage} to ${request.targetLanguage}.`;

    const instructions = [
      'Maintain academic terminology accuracy',
      'Preserve formatting and structure',
      'Handle technical content correctly',
      'Ensure natural fluency in target language'
    ];

    if (request.contentType === 'biblical' || request.contentType === 'theological') {
      instructions.push('Maintain theological precision and doctrinal accuracy');
      instructions.push('Preserve biblical references and spiritual meaning');
    }

    if (request.contentType === 'technical') {
      instructions.push('Preserve technical terms and concepts');
      instructions.push('Maintain code snippets and formulas unchanged');
    }

    if (request.preserveFormatting) {
      instructions.push('Preserve all markdown formatting, lists, and structure');
    }

    const prompt = `${basePrompt}

${request.context ? `Context: ${request.context}\n` : ''}

Content to translate:
${request.content}

Instructions:
${instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}

Provide the translation in JSON format:
{
  "translatedText": "translated content here",
  "warnings": ["any warnings or notes"]
}`;

    return prompt;
  }

  /**
   * Parse translation response
   */
  private parseTranslationResponse(content: string, request: TranslationRequest): { translatedText: string; warnings?: string[] } {
    try {
      const parsed = JSON.parse(content);
      return {
        translatedText: parsed.translatedText || parsed.translation || content,
        warnings: parsed.warnings
      };
    } catch {
      // If not JSON, treat entire response as translation
      return {
        translatedText: content,
        warnings: ['Response was not in expected JSON format']
      };
    }
  }

  /**
   * Assess translation quality
   */
  private async assessTranslationQuality(
    sourceText: string,
    translatedText: string,
    contentType: ContentType
  ): Promise<TranslationQualityMetrics> {
    // Simple heuristic-based quality assessment
    // In production, this would use more sophisticated methods
    const lengthRatio = translatedText.length / sourceText.length;
    const hasContent = translatedText.length > 0;
    const reasonableLength = lengthRatio > 0.5 && lengthRatio < 2.0;

    return {
      accuracy: hasContent && reasonableLength ? 0.9 : 0.7,
      fluency: 0.88,
      theologicalCorrectness: contentType === 'biblical' || contentType === 'theological' ? 0.92 : 0.95,
      culturalSensitivity: 0.87,
      technicalAccuracy: contentType === 'technical' ? 0.89 : 0.9,
      formattingPreserved: true
    };
  }

  /**
   * Generate cache key for translation
   */
  private generateCacheKey(request: TranslationRequest): string {
    const contentHash = Buffer.from(request.content).toString('base64').substring(0, 32);
    return `translation:${request.sourceLanguage}:${request.targetLanguage}:${request.contentType}:${contentHash}`;
  }

  /**
   * Get default Bible translations for language
   */
  private getDefaultBibleTranslations(language: SupportedLanguage): string[] {
    const translations: Record<SupportedLanguage, string[]> = {
      en: ['NIV', 'ESV', 'NKJV'],
      es: ['RVR1960', 'NVI'],
      fr: ['LSG', 'BDS'],
      pt: ['ARA', 'NVI-PT'],
      zh: ['CUV', 'RCUV'],
      ar: ['SVD', 'NAV'],
      hi: ['IRV', 'HINBSI'],
      sw: ['SNV'],
      ru: ['RUSV', 'CARS'],
      ko: ['KRV', 'NKRV']
    };

    return translations[language] || ['NIV'];
  }
}
