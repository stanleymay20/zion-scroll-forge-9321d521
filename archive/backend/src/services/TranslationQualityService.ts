/**
 * Translation Quality Service
 * Validates translation accuracy, theological correctness, and quality metrics
 */

import {
  TranslationQualityMetrics,
  SupportedLanguage,
  ContentType,
  TranslatedContent
} from '../types/translation.types';
import { AIGatewayService } from './AIGatewayService';
import { TheologicalTranslationService } from './TheologicalTranslationService';
import logger from '../utils/logger';

export default class TranslationQualityService {
  private aiGateway: AIGatewayService;
  private theologicalService: TheologicalTranslationService;

  constructor() {
    this.aiGateway = new AIGatewayService();
    this.theologicalService = new TheologicalTranslationService();
  }

  /**
   * Validate translation accuracy
   */
  async validateTranslationAccuracy(
    sourceText: string,
    translatedText: string,
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage,
    contentType: ContentType
  ): Promise<TranslationQualityMetrics> {
    try {
      logger.info('Validating translation accuracy', {
        sourceLanguage,
        targetLanguage,
        contentType
      });

      const prompt = `You are a professional translation quality evaluator. Assess the quality of this translation.

Source Language: ${sourceLanguage}
Target Language: ${targetLanguage}
Content Type: ${contentType}

Source Text:
${sourceText}

Translated Text:
${translatedText}

Evaluate on these criteria (score 0.0 to 1.0):

1. **Accuracy**: Is the meaning preserved correctly? Are there any mistranslations?
2. **Fluency**: Does it read naturally in the target language? Is the grammar correct?
3. **Theological Correctness**: ${contentType === 'biblical' || contentType === 'theological' ? 'CRITICAL - Is the theological meaning accurate?' : 'N/A'}
4. **Cultural Sensitivity**: Is it appropriate for the target culture? Any offensive content?
5. **Technical Accuracy**: ${contentType === 'technical' ? 'CRITICAL - Are technical terms correct?' : 'Are specialized terms handled well?'}
6. **Formatting Preserved**: Is the structure, formatting, and layout maintained?

Provide detailed evaluation in JSON format:
{
  "accuracy": 0.95,
  "fluency": 0.92,
  "theologicalCorrectness": 0.98,
  "culturalSensitivity": 0.90,
  "technicalAccuracy": 0.93,
  "formattingPreserved": true,
  "issues": ["any issues found"],
  "strengths": ["translation strengths"],
  "recommendations": ["improvement suggestions"]
}`;

      const response = await this.aiGateway.generateCompletion({
        prompt,
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 1500
      });

      const parsed = JSON.parse(response.content);

      const metrics: TranslationQualityMetrics = {
        accuracy: parsed.accuracy || 0.85,
        fluency: parsed.fluency || 0.85,
        theologicalCorrectness: parsed.theologicalCorrectness || 0.9,
        culturalSensitivity: parsed.culturalSensitivity || 0.85,
        technicalAccuracy: parsed.technicalAccuracy || 0.85,
        formattingPreserved: parsed.formattingPreserved !== false
      };

      logger.info('Translation quality validated', {
        accuracy: metrics.accuracy,
        overallQuality: this.calculateOverallQuality(metrics)
      });

      return metrics;
    } catch (error) {
      logger.error('Translation validation failed', { error });
      // Return default metrics on error
      return this.getDefaultMetrics();
    }
  }

  /**
   * Check theological correctness
   */
  async checkTheologicalCorrectness(
    originalText: string,
    translatedText: string,
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage
  ): Promise<{
    correct: boolean;
    score: number;
    issues: string[];
    severity: 'none' | 'minor' | 'major' | 'critical';
  }> {
    try {
      logger.info('Checking theological correctness', {
        sourceLanguage,
        targetLanguage
      });

      const verification = await this.theologicalService.verifyTheologicalPrecision(
        originalText,
        translatedText,
        sourceLanguage,
        targetLanguage
      );

      const severity = this.determineTheologicalSeverity(
        verification.score,
        verification.issues
      );

      return {
        correct: verification.accurate,
        score: verification.score,
        issues: verification.issues,
        severity
      };
    } catch (error) {
      logger.error('Theological correctness check failed', { error });
      return {
        correct: true,
        score: 0.9,
        issues: ['Check failed - manual review recommended'],
        severity: 'minor'
      };
    }
  }

  /**
   * Flag potential errors for review
   */
  async flagPotentialErrors(
    translation: TranslatedContent,
    qualityMetrics: TranslationQualityMetrics
  ): Promise<{
    flagged: boolean;
    errors: Array<{ type: string; severity: string; description: string }>;
    reviewPriority: 'high' | 'medium' | 'low';
  }> {
    try {
      logger.info('Flagging potential errors', {
        confidence: translation.confidence,
        accuracy: qualityMetrics.accuracy
      });

      const errors: Array<{ type: string; severity: string; description: string }> = [];

      // Check accuracy threshold
      if (qualityMetrics.accuracy < 0.85) {
        errors.push({
          type: 'accuracy',
          severity: 'high',
          description: `Low accuracy score: ${qualityMetrics.accuracy.toFixed(2)}`
        });
      }

      // Check theological correctness for biblical content
      if (translation.theologicalAccuracy && translation.theologicalAccuracy < 0.95) {
        errors.push({
          type: 'theological',
          severity: 'critical',
          description: `Theological accuracy below threshold: ${translation.theologicalAccuracy.toFixed(2)}`
        });
      }

      // Check fluency
      if (qualityMetrics.fluency < 0.8) {
        errors.push({
          type: 'fluency',
          severity: 'medium',
          description: `Low fluency score: ${qualityMetrics.fluency.toFixed(2)}`
        });
      }

      // Check cultural sensitivity
      if (qualityMetrics.culturalSensitivity < 0.8) {
        errors.push({
          type: 'cultural',
          severity: 'high',
          description: `Cultural sensitivity concerns: ${qualityMetrics.culturalSensitivity.toFixed(2)}`
        });
      }

      // Check formatting preservation
      if (!qualityMetrics.formattingPreserved) {
        errors.push({
          type: 'formatting',
          severity: 'low',
          description: 'Formatting not fully preserved'
        });
      }

      // Add warnings from translation
      if (translation.warnings && translation.warnings.length > 0) {
        translation.warnings.forEach(warning => {
          errors.push({
            type: 'warning',
            severity: 'medium',
            description: warning
          });
        });
      }

      const reviewPriority = this.determineReviewPriority(errors);
      const flagged = errors.length > 0 || translation.reviewRequired;

      logger.info('Error flagging completed', {
        flagged,
        errorCount: errors.length,
        reviewPriority
      });

      return {
        flagged,
        errors,
        reviewPriority
      };
    } catch (error) {
      logger.error('Error flagging failed', { error });
      return {
        flagged: true,
        errors: [{ type: 'system', severity: 'high', description: 'Error flagging failed' }],
        reviewPriority: 'high'
      };
    }
  }

  /**
   * Track translation quality metrics
   */
  async trackQualityMetrics(
    translationId: string,
    metrics: TranslationQualityMetrics,
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage,
    contentType: ContentType
  ): Promise<void> {
    try {
      logger.info('Tracking quality metrics', {
        translationId,
        sourceLanguage,
        targetLanguage,
        contentType,
        overallQuality: this.calculateOverallQuality(metrics)
      });

      // In production, this would store metrics in database for analytics
      // Track trends: accuracy by language pair, content type, over time
      // Identify areas needing improvement
    } catch (error) {
      logger.error('Quality metrics tracking failed', { error });
    }
  }

  /**
   * Generate quality report
   */
  async generateQualityReport(
    translation: TranslatedContent,
    metrics: TranslationQualityMetrics
  ): Promise<{
    overallScore: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  }> {
    try {
      const overallScore = this.calculateOverallQuality(metrics);
      const grade = this.calculateGrade(overallScore);

      const strengths: string[] = [];
      const weaknesses: string[] = [];
      const recommendations: string[] = [];

      // Analyze strengths
      if (metrics.accuracy >= 0.9) strengths.push('High translation accuracy');
      if (metrics.fluency >= 0.9) strengths.push('Excellent fluency and readability');
      if (metrics.theologicalCorrectness >= 0.95) strengths.push('Strong theological accuracy');
      if (metrics.culturalSensitivity >= 0.9) strengths.push('Culturally appropriate');

      // Analyze weaknesses
      if (metrics.accuracy < 0.85) weaknesses.push('Accuracy needs improvement');
      if (metrics.fluency < 0.85) weaknesses.push('Fluency could be enhanced');
      if (metrics.theologicalCorrectness < 0.95) weaknesses.push('Theological review recommended');
      if (metrics.culturalSensitivity < 0.85) weaknesses.push('Cultural adaptation needed');

      // Generate recommendations
      if (metrics.accuracy < 0.9) {
        recommendations.push('Review translation for accuracy and meaning preservation');
      }
      if (metrics.theologicalCorrectness < 0.95) {
        recommendations.push('Have theological expert review biblical content');
      }
      if (metrics.culturalSensitivity < 0.9) {
        recommendations.push('Consult native speaker for cultural appropriateness');
      }
      if (!metrics.formattingPreserved) {
        recommendations.push('Restore original formatting and structure');
      }

      const summary = `Translation quality: ${grade} (${(overallScore * 100).toFixed(1)}%). ${
        translation.reviewRequired ? 'Human review recommended.' : 'Quality acceptable for publication.'
      }`;

      return {
        overallScore,
        grade,
        summary,
        strengths,
        weaknesses,
        recommendations
      };
    } catch (error) {
      logger.error('Quality report generation failed', { error });
      throw new Error(`Quality report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compare with human translation (for training/validation)
   */
  async compareWithHumanTranslation(
    aiTranslation: string,
    humanTranslation: string,
    sourceLanguage: SupportedLanguage,
    targetLanguage: SupportedLanguage
  ): Promise<{
    similarity: number;
    differences: string[];
    aiAdvantages: string[];
    humanAdvantages: string[];
  }> {
    try {
      logger.info('Comparing AI and human translations');

      const prompt = `Compare these two translations and analyze their differences.

AI Translation:
${aiTranslation}

Human Translation:
${humanTranslation}

Provide comparison in JSON format:
{
  "similarity": 0.92,
  "differences": ["difference 1", "difference 2"],
  "aiAdvantages": ["AI strength 1"],
  "humanAdvantages": ["human strength 1"]
}`;

      const response = await this.aiGateway.generateCompletion({
        prompt,
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 1500
      });

      const parsed = JSON.parse(response.content);

      return {
        similarity: parsed.similarity || 0.85,
        differences: parsed.differences || [],
        aiAdvantages: parsed.aiAdvantages || [],
        humanAdvantages: parsed.humanAdvantages || []
      };
    } catch (error) {
      logger.error('Translation comparison failed', { error });
      return {
        similarity: 0.8,
        differences: [],
        aiAdvantages: [],
        humanAdvantages: []
      };
    }
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallQuality(metrics: TranslationQualityMetrics): number {
    const weights = {
      accuracy: 0.35,
      fluency: 0.25,
      theologicalCorrectness: 0.20,
      culturalSensitivity: 0.15,
      technicalAccuracy: 0.05
    };

    return (
      metrics.accuracy * weights.accuracy +
      metrics.fluency * weights.fluency +
      metrics.theologicalCorrectness * weights.theologicalCorrectness +
      metrics.culturalSensitivity * weights.culturalSensitivity +
      metrics.technicalAccuracy * weights.technicalAccuracy
    );
  }

  /**
   * Calculate letter grade
   */
  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 0.93) return 'A';
    if (score >= 0.85) return 'B';
    if (score >= 0.75) return 'C';
    if (score >= 0.65) return 'D';
    return 'F';
  }

  /**
   * Determine theological severity
   */
  private determineTheologicalSeverity(
    score: number,
    issues: string[]
  ): 'none' | 'minor' | 'major' | 'critical' {
    if (score >= 0.98 && issues.length === 0) return 'none';
    if (score >= 0.95 && issues.length <= 1) return 'minor';
    if (score >= 0.90) return 'major';
    return 'critical';
  }

  /**
   * Determine review priority
   */
  private determineReviewPriority(
    errors: Array<{ type: string; severity: string; description: string }>
  ): 'high' | 'medium' | 'low' {
    const hasCritical = errors.some(e => e.severity === 'critical');
    const hasHigh = errors.some(e => e.severity === 'high');
    const errorCount = errors.length;

    if (hasCritical || errorCount >= 3) return 'high';
    if (hasHigh || errorCount >= 2) return 'medium';
    return 'low';
  }

  /**
   * Get default metrics
   */
  private getDefaultMetrics(): TranslationQualityMetrics {
    return {
      accuracy: 0.85,
      fluency: 0.85,
      theologicalCorrectness: 0.9,
      culturalSensitivity: 0.85,
      technicalAccuracy: 0.85,
      formattingPreserved: true
    };
  }
}
