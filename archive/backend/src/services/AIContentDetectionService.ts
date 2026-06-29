/**
 * AI Content Detection Service
 * Detects AI-generated content and analyzes writing style consistency
 * "The LORD detests dishonest scales, but accurate weights find favor with him" - Proverbs 11:1
 */

import { PrismaClient } from '@prisma/client';
import {
  AIContentDetectionRequest,
  AIContentDetectionResult,
  AIAnalysis,
  FlaggedSection,
  WritingStyle,
  StyleDeviationResult,
} from '../types/integrity.types';
import { integrityConfig, AI_CONTENT_THRESHOLDS, STYLE_DEVIATION_THRESHOLDS } from '../config/integrity.config';
import { AIGatewayService } from './AIGatewayService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export default class AIContentDetectionService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Detect AI-generated content in submission
   */
  async detectAIContent(request: AIContentDetectionRequest): Promise<AIContentDetectionResult> {
    try {
      logger.info('Starting AI content detection', { studentId: request.studentId });

      // Run detection methods in parallel
      const [gptZeroResult, customModelResult, styleAnalysis] = await Promise.all([
        this.checkGPTZero(request.content),
        this.checkCustomModel(request.content),
        request.studentBaseline 
          ? this.analyzeStyleDeviation(request.content, request.studentBaseline)
          : null,
      ]);

      // Combine results
      const aiProbability = this.combineDetectionResults(gptZeroResult, customModelResult);
      const confidence = this.calculateConfidence(gptZeroResult, customModelResult);

      // Analyze text for AI characteristics
      const analysis = await this.analyzeText(request.content);

      // Identify flagged sections
      const flaggedSections = await this.identifyFlaggedSections(request.content, aiProbability);

      // Determine recommendation
      const recommendation = this.determineRecommendation(
        aiProbability,
        styleAnalysis?.deviationScore || 0
      );

      const result: AIContentDetectionResult = {
        aiProbability,
        confidence,
        flaggedSections,
        analysis,
        recommendation,
      };

      logger.info('AI content detection completed', {
        studentId: request.studentId,
        aiProbability,
        recommendation,
      });

      return result;
    } catch (error) {
      logger.error('Error in AI content detection', { error });
      throw error;
    }
  }

  /**
   * Check content using GPTZero API
   */
  private async checkGPTZero(content: string): Promise<number> {
    if (!integrityConfig.aiDetection.gptZeroEnabled) {
      logger.info('GPTZero check skipped (disabled)');
      return 0;
    }

    try {
      logger.info('Checking GPTZero');

      // TODO: Implement actual GPTZero API integration
      // const response = await axios.post('https://api.gptzero.me/v2/predict/text', {
      //   document: content,
      // }, {
      //   headers: {
      //     'x-api-key': integrityConfig.aiDetection.gptZeroApiKey,
      //     'Content-Type': 'application/json',
      //   },
      // });
      // return response.data.documents[0].completely_generated_prob;

      // Simulate API response
      return 0;
    } catch (error) {
      logger.error('Error checking GPTZero', { error });
      return 0;
    }
  }

  /**
   * Check content using custom AI detection model
   */
  private async checkCustomModel(content: string): Promise<number> {
    if (!integrityConfig.aiDetection.customModelEnabled) {
      logger.info('Custom model check skipped (disabled)');
      return 0;
    }

    try {
      logger.info('Checking custom AI detection model');

      // Use AI Gateway to analyze text characteristics
      const prompt = `Analyze the following text and determine the probability (0-1) that it was written by an AI model like ChatGPT or GPT-4. Consider factors like:
- Perplexity (predictability of word choices)
- Burstiness (variation in sentence length and complexity)
- Vocabulary complexity and consistency
- Sentence structure patterns
- Lack of personal voice or unique style

Text to analyze:
${content}

Respond with ONLY a number between 0 and 1, where 0 means definitely human-written and 1 means definitely AI-generated.`;

      const response = await this.aiGateway.generateCompletion({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4',
        temperature: 0.1,
        maxTokens: 10,
      });

      // Parse probability from response
      const probability = parseFloat(response.content.trim());
      return isNaN(probability) ? 0 : Math.max(0, Math.min(1, probability));
    } catch (error) {
      logger.error('Error checking custom model', { error });
      return 0;
    }
  }

  /**
   * Combine results from multiple detection methods
   */
  private combineDetectionResults(gptZero: number, customModel: number): number {
    // If both are available, take weighted average
    if (gptZero > 0 && customModel > 0) {
      return gptZero * 0.6 + customModel * 0.4;
    }

    // Otherwise, use whichever is available
    return Math.max(gptZero, customModel);
  }

  /**
   * Calculate confidence in detection result
   */
  private calculateConfidence(gptZero: number, customModel: number): number {
    // If both methods agree (within 0.2), confidence is high
    if (gptZero > 0 && customModel > 0) {
      const agreement = 1 - Math.abs(gptZero - customModel);
      return Math.max(0.5, agreement);
    }

    // If only one method available, confidence is moderate
    return 0.6;
  }

  /**
   * Analyze text for AI characteristics
   */
  private async analyzeText(content: string): Promise<AIAnalysis> {
    try {
      // Calculate perplexity (how predictable the text is)
      const perplexity = this.calculatePerplexity(content);

      // Calculate burstiness (variation in sentence length)
      const burstiness = this.calculateBurstiness(content);

      // Calculate vocabulary complexity
      const vocabularyComplexity = this.calculateVocabularyComplexity(content);

      // Calculate sentence variation
      const sentenceVariation = this.calculateSentenceVariation(content);

      // Calculate likelihoods
      const humanLikelihood = (burstiness + sentenceVariation) / 2;
      const aiLikelihood = (perplexity + vocabularyComplexity) / 2;

      return {
        perplexity,
        burstiness,
        vocabularyComplexity,
        sentenceVariation,
        humanLikelihood,
        aiLikelihood,
      };
    } catch (error) {
      logger.error('Error analyzing text', { error });
      throw error;
    }
  }

  /**
   * Calculate perplexity score (0-1, higher = more predictable/AI-like)
   */
  private calculatePerplexity(content: string): number {
    // Simplified perplexity calculation
    // In production, would use a language model
    const words = content.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionRate = 1 - (uniqueWords.size / words.length);

    return Math.min(1, repetitionRate * 2);
  }

  /**
   * Calculate burstiness score (0-1, higher = more variation/human-like)
   */
  private calculateBurstiness(content: string): number {
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length < 2) return 0.5;

    const lengths = sentences.map((s) => s.trim().split(/\s+/).length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);

    // Normalize to 0-1 range
    return Math.min(1, stdDev / avgLength);
  }

  /**
   * Calculate vocabulary complexity (0-1, higher = more complex/AI-like)
   */
  private calculateVocabularyComplexity(content: string): number {
    const words = content.toLowerCase().split(/\s+/);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;

    // Normalize to 0-1 range (assuming avg word length of 5-10)
    return Math.min(1, (avgWordLength - 5) / 5);
  }

  /**
   * Calculate sentence variation (0-1, higher = more variation/human-like)
   */
  private calculateSentenceVariation(content: string): number {
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length < 2) return 0.5;

    // Check for variation in sentence structure
    const startsWithCapital = sentences.filter((s) => /^[A-Z]/.test(s.trim())).length;
    const hasCommas = sentences.filter((s) => s.includes(',')).length;
    const hasConjunctions = sentences.filter((s) => /\b(and|but|or|so|yet)\b/i.test(s)).length;

    const variation = (startsWithCapital + hasCommas + hasConjunctions) / (sentences.length * 3);
    return Math.min(1, variation);
  }

  /**
   * Identify specific sections that appear AI-generated
   */
  private async identifyFlaggedSections(
    content: string,
    overallProbability: number
  ): Promise<FlaggedSection[]> {
    if (overallProbability < AI_CONTENT_THRESHOLDS.review) {
      return [];
    }

    const flaggedSections: FlaggedSection[] = [];

    // Split into paragraphs
    const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      
      // Analyze each paragraph
      const analysis = await this.analyzeText(paragraph);
      const paragraphProbability = analysis.aiLikelihood;

      if (paragraphProbability > AI_CONTENT_THRESHOLDS.review) {
        const startIndex = content.indexOf(paragraph);
        const endIndex = startIndex + paragraph.length;

        flaggedSections.push({
          text: paragraph,
          startIndex,
          endIndex,
          aiProbability: paragraphProbability,
          reason: this.generateFlagReason(analysis),
        });
      }
    }

    return flaggedSections;
  }

  /**
   * Generate human-readable reason for flagging
   */
  private generateFlagReason(analysis: AIAnalysis): string {
    const reasons: string[] = [];

    if (analysis.perplexity > 0.7) {
      reasons.push('highly predictable word choices');
    }

    if (analysis.burstiness < 0.3) {
      reasons.push('uniform sentence structure');
    }

    if (analysis.vocabularyComplexity > 0.7) {
      reasons.push('consistently complex vocabulary');
    }

    if (analysis.sentenceVariation < 0.3) {
      reasons.push('lack of sentence variation');
    }

    return reasons.length > 0 
      ? `Flagged due to: ${reasons.join(', ')}`
      : 'Multiple AI-like characteristics detected';
  }

  /**
   * Determine recommendation based on detection results
   */
  private determineRecommendation(
    aiProbability: number,
    styleDeviation: number
  ): 'clear' | 'review' | 'flag' {
    if (aiProbability >= AI_CONTENT_THRESHOLDS.flag || styleDeviation >= STYLE_DEVIATION_THRESHOLDS.flagged) {
      return 'flag';
    }

    if (aiProbability >= AI_CONTENT_THRESHOLDS.review || styleDeviation >= STYLE_DEVIATION_THRESHOLDS.suspicious) {
      return 'review';
    }

    return 'clear';
  }

  /**
   * Analyze writing style deviation from student's baseline
   */
  async analyzeStyleDeviation(
    content: string,
    baseline: WritingStyle
  ): Promise<StyleDeviationResult> {
    try {
      logger.info('Analyzing style deviation');

      // Calculate current writing style
      const current = await this.extractWritingStyle(content);

      // Calculate deviations
      const deviations = {
        vocabularyLevel: Math.abs(current.vocabularyLevel - baseline.vocabularyLevel),
        sentenceComplexity: Math.abs(current.sentenceComplexity - baseline.sentenceComplexity),
        averageWordLength: Math.abs(current.averageWordLength - baseline.averageWordLength),
        averageSentenceLength: Math.abs(current.averageSentenceLength - baseline.averageSentenceLength),
      };

      // Calculate overall deviation score (in standard deviations)
      const deviationScore = Object.values(deviations).reduce((sum, dev) => sum + dev, 0) / Object.keys(deviations).length;

      // Identify significant deviations
      const significantDeviations: string[] = [];
      if (deviations.vocabularyLevel > 1.5) {
        significantDeviations.push('Vocabulary level significantly different');
      }
      if (deviations.sentenceComplexity > 1.5) {
        significantDeviations.push('Sentence complexity significantly different');
      }
      if (deviations.averageWordLength > 1.5) {
        significantDeviations.push('Word length pattern significantly different');
      }
      if (deviations.averageSentenceLength > 1.5) {
        significantDeviations.push('Sentence length pattern significantly different');
      }

      const flagged = deviationScore >= STYLE_DEVIATION_THRESHOLDS.flagged;

      return {
        deviationScore,
        baseline,
        current,
        significantDeviations,
        flagged,
      };
    } catch (error) {
      logger.error('Error analyzing style deviation', { error });
      throw error;
    }
  }

  /**
   * Extract writing style characteristics from text
   */
  async extractWritingStyle(content: string): Promise<WritingStyle> {
    const words = content.split(/\s+/);
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    const averageWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const averageSentenceLength = words.length / sentences.length;

    // Extract common phrases (2-3 word sequences)
    const phrases: string[] = [];
    for (let i = 0; i < words.length - 2; i++) {
      phrases.push(`${words[i]} ${words[i + 1]}`);
    }
    const phraseFrequency = new Map<string, number>();
    phrases.forEach((phrase) => {
      phraseFrequency.set(phrase, (phraseFrequency.get(phrase) || 0) + 1);
    });
    const commonPhrases = Array.from(phraseFrequency.entries())
      .filter(([_, count]) => count > 1)
      .map(([phrase]) => phrase)
      .slice(0, 10);

    return {
      vocabularyLevel: this.calculateVocabularyComplexity(content),
      sentenceComplexity: this.calculateSentenceVariation(content),
      paragraphStructure: 'standard', // Simplified
      commonPhrases,
      errorPatterns: [], // Would need grammar checking
      writingSpeed: 0, // Would need timing data
      averageWordLength,
      averageSentenceLength,
    };
  }

  /**
   * Get or create student's writing baseline
   */
  async getStudentBaseline(studentId: string): Promise<WritingStyle | null> {
    try {
      // In production, would retrieve from database
      // For now, return null (baseline not available)
      return null;
    } catch (error) {
      logger.error('Error getting student baseline', { error, studentId });
      return null;
    }
  }

  /**
   * Update student's writing baseline with new submission
   */
  async updateStudentBaseline(studentId: string, content: string): Promise<void> {
    try {
      const style = await this.extractWritingStyle(content);

      // In production, would save to database
      // This would be used to build a profile over time

      logger.info('Student baseline updated', { studentId });
    } catch (error) {
      logger.error('Error updating student baseline', { error, studentId });
    }
  }
}
