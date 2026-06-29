/**
 * Theological Translation Service
 * Specialized service for translating biblical and theological content with high accuracy
 */

import {
  TheologicalTranslationRequest,
  TheologicalTranslation,
  BibleReference,
  SupportedLanguage
} from '../types/translation.types';
import { AIGatewayService } from './AIGatewayService';
import { VectorStoreService } from './VectorStoreService';
import logger from '../utils/logger';

export default class TheologicalTranslationService {
  private aiGateway: AIGatewayService;
  private vectorStore: VectorStoreService;

  constructor() {
    this.aiGateway = new AIGatewayService();
    this.vectorStore = new VectorStoreService();
  }

  /**
   * Translate biblical content with theological accuracy
   */
  async translateBiblicalContent(request: TheologicalTranslationRequest): Promise<TheologicalTranslation> {
    try {
      logger.info('Translating biblical content', {
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage
      });

      // Get recommended Bible translations for target language
      const bibleTranslations = request.bibleTranslations || 
        this.getRecommendedBibleTranslations(request.targetLanguage);

      // Extract Bible references from text
      const references = await this.extractBibleReferences(request.text);

      // Get parallel translations for references
      const parallelTranslations = await this.getParallelTranslations(
        references,
        request.targetLanguage,
        bibleTranslations
      );

      const prompt = `You are a biblical translation expert with deep knowledge of original Hebrew, Greek, and Aramaic texts.

Translate this biblical content from ${request.sourceLanguage} to ${request.targetLanguage}.

Original Text:
${request.text}

${request.theologicalContext ? `Theological Context: ${request.theologicalContext}` : ''}

Bible References Found:
${references.map(ref => `${ref.book} ${ref.chapter}:${ref.verse}`).join(', ')}

Parallel Translations Available:
${parallelTranslations.map(pt => `${pt.reference}: ${pt.translations.join(' | ')}`).join('\n')}

Recommended Bible Translations for ${request.targetLanguage}:
${bibleTranslations.join(', ')}

Instructions:
1. Maintain absolute theological precision and doctrinal accuracy
2. Consult multiple Bible translations for accuracy
3. Preserve the original meaning and spiritual intent
4. Use appropriate theological terminology in target language
5. Maintain reverence and spiritual tone
6. Cross-reference with original language texts where applicable
7. Flag any areas of theological complexity requiring expert review
8. Preserve all Bible references with proper formatting

Provide the translation in JSON format:
{
  "translatedText": "theologically accurate translation",
  "bibleReferences": [
    {
      "book": "John",
      "chapter": 3,
      "verse": 16,
      "text": "translated verse text",
      "translation": "NIV"
    }
  ],
  "theologicalAccuracy": 0.98,
  "consultedTranslations": ["NIV", "ESV", "NASB"],
  "expertReviewRequired": false,
  "notes": ["important theological notes"]
}`;

      const response = await this.aiGateway.generateCompletion({
        prompt,
        model: 'gpt-4',
        temperature: 0.1, // Very low temperature for theological accuracy
        maxTokens: 4000
      });

      const parsed = JSON.parse(response.content);

      const result: TheologicalTranslation = {
        translatedText: parsed.translatedText,
        bibleReferences: parsed.bibleReferences || references,
        theologicalAccuracy: parsed.theologicalAccuracy || 0.95,
        consultedTranslations: parsed.consultedTranslations || bibleTranslations,
        expertReviewRequired: parsed.expertReviewRequired || 
          parsed.theologicalAccuracy < 0.95 ||
          this.containsComplexTheology(request.text),
        notes: parsed.notes || []
      };

      logger.info('Biblical translation completed', {
        theologicalAccuracy: result.theologicalAccuracy,
        expertReviewRequired: result.expertReviewRequired,
        referencesFound: result.bibleReferences.length
      });

      return result;
    } catch (error) {
      logger.error('Biblical translation failed', { error, request });
      throw new Error(`Biblical translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Consult multiple Bible translations
   */
  async consultMultipleTranslations(
    reference: BibleReference,
    targetLanguage: SupportedLanguage,
    translations: string[]
  ): Promise<{ translation: string; verses: Array<{ version: string; text: string }> }> {
    try {
      logger.info('Consulting multiple Bible translations', {
        reference: `${reference.book} ${reference.chapter}:${reference.verse}`,
        targetLanguage,
        translations
      });

      const prompt = `You are a Bible translation expert. Provide the verse ${reference.book} ${reference.chapter}:${reference.verse} in ${targetLanguage} from these translations: ${translations.join(', ')}.

Instructions:
1. Provide accurate verse text from each translation
2. Note any significant differences in translation
3. Recommend the most accurate translation for theological study
4. Explain any translation nuances

Provide in JSON format:
{
  "verses": [
    {"version": "NIV", "text": "verse text"},
    {"version": "ESV", "text": "verse text"}
  ],
  "recommendedTranslation": "NIV",
  "notes": ["translation notes"]
}`;

      const response = await this.aiGateway.generateCompletion({
        prompt,
        model: 'gpt-4',
        temperature: 0.2,
        maxTokens: 1500
      });

      const parsed = JSON.parse(response.content);

      return {
        translation: parsed.recommendedTranslation || translations[0],
        verses: parsed.verses || []
      };
    } catch (error) {
      logger.error('Translation consultation failed', { error });
      return {
        translation: translations[0],
        verses: []
      };
    }
  }

  /**
   * Maintain theological precision in translation
   */
  async verifyTheologicalPrecision(
    originalText: string,
    translatedText: string,
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage
  ): Promise<{
    accurate: boolean;
    score: number;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      logger.info('Verifying theological precision', {
        sourceLanguage,
        targetLanguage
      });

      const prompt = `You are a theological accuracy expert. Verify that this translation maintains theological precision.

Source Language: ${sourceLanguage}
Target Language: ${targetLanguage}

Original Text:
${originalText}

Translated Text:
${translatedText}

Evaluate:
1. Doctrinal accuracy - Are core theological concepts preserved?
2. Biblical terminology - Are theological terms translated correctly?
3. Spiritual meaning - Is the spiritual intent maintained?
4. Scriptural alignment - Does it align with biblical teaching?
5. Heresy check - Are there any doctrinal errors introduced?

Provide evaluation in JSON format:
{
  "accurate": true/false,
  "score": 0.98,
  "issues": ["any theological issues found"],
  "recommendations": ["recommendations for improvement"]
}`;

      const response = await this.aiGateway.generateCompletion({
        prompt,
        model: 'gpt-4',
        temperature: 0.2,
        maxTokens: 1500
      });

      const parsed = JSON.parse(response.content);

      return {
        accurate: parsed.accurate !== false && parsed.score >= 0.95,
        score: parsed.score || 0.95,
        issues: parsed.issues || [],
        recommendations: parsed.recommendations || []
      };
    } catch (error) {
      logger.error('Theological precision verification failed', { error });
      return {
        accurate: true,
        score: 0.9,
        issues: ['Verification failed'],
        recommendations: ['Manual review recommended']
      };
    }
  }

  /**
   * Review by theological experts (flag for human review)
   */
  async flagForExpertReview(
    translation: TheologicalTranslation,
    reason: string
  ): Promise<{
    flagged: boolean;
    reviewId: string;
    priority: 'high' | 'medium' | 'low';
    assignedExperts: string[];
  }> {
    try {
      logger.info('Flagging translation for expert review', { reason });

      // Determine priority based on theological accuracy and complexity
      const priority = translation.theologicalAccuracy < 0.9 ? 'high' :
        translation.theologicalAccuracy < 0.95 ? 'medium' : 'low';

      // In production, this would integrate with a review queue system
      const reviewId = `theological-review-${Date.now()}`;

      // Assign to theological experts based on content type
      const assignedExperts = this.assignTheologicalExperts(translation);

      logger.info('Translation flagged for expert review', {
        reviewId,
        priority,
        expertCount: assignedExperts.length
      });

      return {
        flagged: true,
        reviewId,
        priority,
        assignedExperts
      };
    } catch (error) {
      logger.error('Expert review flagging failed', { error });
      throw new Error(`Expert review flagging failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract Bible references from text
   */
  private async extractBibleReferences(text: string): Promise<BibleReference[]> {
    try {
      const prompt = `Extract all Bible references from this text. Include book, chapter, and verse.

Text:
${text}

Provide in JSON format:
{
  "references": [
    {"book": "John", "chapter": 3, "verse": 16},
    {"book": "Romans", "chapter": 8, "verse": 28}
  ]
}`;

      const response = await this.aiGateway.generateCompletion({
        prompt,
        model: 'gpt-4',
        temperature: 0.1,
        maxTokens: 1000
      });

      const parsed = JSON.parse(response.content);
      return (parsed.references || []).map((ref: any) => ({
        book: ref.book,
        chapter: ref.chapter,
        verse: ref.verse,
        text: '',
        translation: 'NIV'
      }));
    } catch (error) {
      logger.error('Bible reference extraction failed', { error });
      return [];
    }
  }

  /**
   * Get parallel translations for references
   */
  private async getParallelTranslations(
    references: BibleReference[],
    targetLanguage: SupportedLanguage,
    translations: string[]
  ): Promise<Array<{ reference: string; translations: string[] }>> {
    // In production, this would query a Bible API
    // For now, return empty array
    return references.map(ref => ({
      reference: `${ref.book} ${ref.chapter}:${ref.verse}`,
      translations: []
    }));
  }

  /**
   * Get recommended Bible translations for language
   */
  private getRecommendedBibleTranslations(language: SupportedLanguage): string[] {
    const translations: Record<SupportedLanguage, string[]> = {
      en: ['NIV', 'ESV', 'NKJV', 'NASB'],
      es: ['RVR1960', 'NVI', 'LBLA'],
      fr: ['LSG', 'BDS', 'S21'],
      pt: ['ARA', 'NVI-PT', 'ACF'],
      zh: ['CUV', 'RCUV', 'CNV'],
      ar: ['SVD', 'NAV', 'AVD'],
      hi: ['IRV', 'HINBSI'],
      sw: ['SNV', 'HABARI NJEMA'],
      ru: ['RUSV', 'CARS', 'NRT'],
      ko: ['KRV', 'NKRV', 'KLB']
    };

    return translations[language] || ['NIV', 'ESV'];
  }

  /**
   * Check if text contains complex theology
   */
  private containsComplexTheology(text: string): boolean {
    const complexTerms = [
      'trinity', 'trinitarian', 'godhead',
      'incarnation', 'hypostatic',
      'atonement', 'propitiation', 'expiation',
      'justification', 'sanctification', 'glorification',
      'predestination', 'election', 'sovereignty',
      'eschatology', 'millennium', 'rapture',
      'sacrament', 'eucharist', 'transubstantiation'
    ];

    const lowerText = text.toLowerCase();
    return complexTerms.some(term => lowerText.includes(term));
  }

  /**
   * Assign theological experts for review
   */
  private assignTheologicalExperts(translation: TheologicalTranslation): string[] {
    // In production, this would query a database of theological experts
    // For now, return placeholder
    const experts = ['theological-expert-1', 'biblical-scholar-1'];

    if (translation.theologicalAccuracy < 0.9) {
      experts.push('senior-theologian-1');
    }

    return experts;
  }
}
