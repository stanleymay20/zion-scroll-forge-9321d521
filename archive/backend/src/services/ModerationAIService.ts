/**
 * Moderation AI Service
 * Main orchestration service for AI-powered content moderation
 * Coordinates content scanning, theological review, tone analysis, and action recommendations
 */

import {
  UserContent,
  ContentScanRequest,
  ContentScanResult,
  ModerationResult,
  ModerationHistory,
  ModerationMetrics
} from '../types/moderation.types';
import ContentScanningService from './ContentScanningService';
import TheologicalReviewService from './TheologicalReviewService';
import ToneAnalysisService from './ToneAnalysisService';
import ModerationActionService from './ModerationActionService';
import ModerationAppealsService from './ModerationAppealsService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default class ModerationAIService {
  private contentScanner: ContentScanningService;
  private theologicalReviewer: TheologicalReviewService;
  private toneAnalyzer: ToneAnalysisService;
  private actionRecommender: ModerationActionService;
  private appealsService: ModerationAppealsService;

  constructor() {
    this.contentScanner = new ContentScanningService();
    this.theologicalReviewer = new TheologicalReviewService();
    this.toneAnalyzer = new ToneAnalysisService();
    this.actionRecommender = new ModerationActionService();
    this.appealsService = new ModerationAppealsService();
  }

  /**
   * Moderate user-generated content
   */
  async moderateContent(request: ContentScanRequest): Promise<ContentScanResult> {
    const startTime = Date.now();
    const { content, context, scanOptions } = request;

    try {
      // Get user moderation history
      const userHistory = await this.getUserHistory(content.userId);

      // Parallel execution of moderation checks
      const [violations, theologicalReview, toneAnalysis] = await Promise.all([
        scanOptions?.checkLanguage !== false 
          ? this.contentScanner.scanContent(content)
          : Promise.resolve([]),
        scanOptions?.checkTheology !== false
          ? this.theologicalReviewer.reviewTheology(content)
          : Promise.resolve(null),
        scanOptions?.checkTone !== false
          ? this.toneAnalyzer.analyzeTone(content)
          : Promise.resolve(null)
      ]);

      // Compile moderation result
      const moderationResult = this.compileModerationResult(
        content,
        violations,
        theologicalReview,
        toneAnalysis
      );

      // Get action recommendation
      const actionRecommendation = await this.actionRecommender.recommendAction(
        moderationResult,
        userHistory
      );

      // Save moderation result
      await this.saveModerationResult(moderationResult, actionRecommendation);

      // Update user history
      if (violations.length > 0) {
        await this.updateUserHistory(content.userId, moderationResult);
      }

      // Update metrics
      await this.updateMetrics(moderationResult);

      const processingTime = Date.now() - startTime;
      const cost = this.calculateCost(violations.length, theologicalReview, toneAnalysis);

      return {
        contentId: content.id,
        scanned: true,
        violations,
        theologicalReview: theologicalReview || undefined,
        toneAnalysis: toneAnalysis || undefined,
        moderationResult,
        actionRecommendation,
        processingTime,
        cost
      };
    } catch (error) {
      console.error('Error moderating content:', error);
      throw error;
    }
  }

  /**
   * Compile moderation result from all checks
   */
  private compileModerationResult(
    content: UserContent,
    violations: any[],
    theologicalReview: any,
    toneAnalysis: any
  ): ModerationResult {
    // Add theological violations if any
    if (theologicalReview?.hasDoctrinalError) {
      for (const concern of theologicalReview.concerns) {
        violations.push({
          type: 'theological_error',
          severity: concern.severity,
          description: concern.issue,
          evidence: [concern.statement],
          confidence: theologicalReview.confidence
        });
      }
    }

    // Add tone violations if problematic
    if (toneAnalysis?.isHostile) {
      violations.push({
        type: 'bullying',
        severity: 'high',
        description: 'Hostile tone detected in communication',
        evidence: [content.content],
        confidence: toneAnalysis.confidence
      });
    }

    if (toneAnalysis?.isDivisive) {
      violations.push({
        type: 'divisive_content',
        severity: 'medium',
        description: 'Content promotes division within community',
        evidence: [content.content],
        confidence: toneAnalysis.confidence
      });
    }

    // Determine overall severity
    const overallSeverity = this.determineOverallSeverity(violations);

    // Determine if approved
    const approved = violations.length === 0 || overallSeverity === 'low';

    // Determine if human review required
    const requiresHumanReview = this.requiresHumanReview(
      violations,
      overallSeverity,
      theologicalReview,
      toneAnalysis
    );

    // Calculate average confidence
    const avgConfidence = violations.length > 0
      ? violations.reduce((sum, v) => sum + (v.confidence || 0), 0) / violations.length
      : 0.95;

    return {
      contentId: content.id,
      approved,
      violations,
      overallSeverity,
      recommendedAction: 'approve', // Will be set by action recommender
      reasoning: this.generateReasoning(violations, theologicalReview, toneAnalysis),
      confidence: avgConfidence,
      requiresHumanReview,
      timestamp: new Date()
    };
  }

  /**
   * Determine overall severity from violations
   */
  private determineOverallSeverity(violations: any[]): any {
    if (violations.length === 0) return 'low';

    const severities = violations.map(v => v.severity);

    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
  }

  /**
   * Determine if human review is required
   */
  private requiresHumanReview(
    violations: any[],
    overallSeverity: string,
    theologicalReview: any,
    toneAnalysis: any
  ): boolean {
    // Critical severity always requires review
    if (overallSeverity === 'critical') return true;

    // Theological concerns require advisor review
    if (theologicalReview?.requiresAdvisorReview) return true;

    // Low confidence requires review
    const avgConfidence = violations.length > 0
      ? violations.reduce((sum, v) => sum + (v.confidence || 0), 0) / violations.length
      : 1.0;

    if (avgConfidence < 0.75) return true;

    // Multiple high severity violations
    const highSeverityCount = violations.filter(v => v.severity === 'high').length;
    if (highSeverityCount >= 2) return true;

    return false;
  }

  /**
   * Generate reasoning for moderation decision
   */
  private generateReasoning(
    violations: any[],
    theologicalReview: any,
    toneAnalysis: any
  ): string {
    const reasons: string[] = [];

    if (violations.length === 0) {
      reasons.push('No policy violations detected');
    } else {
      reasons.push(`${violations.length} violation(s) detected`);
    }

    if (theologicalReview?.hasDoctrinalError) {
      reasons.push('Theological concerns identified');
    }

    if (toneAnalysis?.isHostile) {
      reasons.push('Hostile tone detected');
    }

    if (toneAnalysis?.isDivisive) {
      reasons.push('Divisive content identified');
    }

    return reasons.join('. ');
  }

  /**
   * Get user moderation history
   */
  private async getUserHistory(userId: string): Promise<ModerationHistory | undefined> {
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT * FROM moderation_history WHERE user_id = ${userId}
      `;

      if (result.length === 0) return undefined;

      const row = result[0];
      return {
        userId: row.user_id,
        totalViolations: row.total_violations,
        violationsByType: row.violations_by_type,
        violationsBySeverity: row.violations_by_severity,
        actionsTaken: row.actions_taken,
        appealsSubmitted: row.appeals_submitted,
        appealsSuccessful: row.appeals_successful,
        lastViolation: row.last_violation,
        currentSuspension: row.current_suspension,
        riskScore: parseFloat(row.risk_score)
      };
    } catch (error) {
      console.error('Error getting user history:', error);
      return undefined;
    }
  }

  /**
   * Save moderation result to database
   */
  private async saveModerationResult(
    moderationResult: ModerationResult,
    actionRecommendation: any
  ): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO moderation_results (
          content_id, user_id, content_type, content_text,
          approved, overall_severity, recommended_action,
          reasoning, confidence, requires_human_review,
          violations, metadata, created_at
        ) VALUES (
          ${moderationResult.contentId},
          'unknown',
          'post',
          '',
          ${moderationResult.approved},
          ${moderationResult.overallSeverity},
          ${actionRecommendation.action},
          ${moderationResult.reasoning},
          ${moderationResult.confidence},
          ${moderationResult.requiresHumanReview},
          ${JSON.stringify(moderationResult.violations)},
          ${JSON.stringify({})},
          ${moderationResult.timestamp}
        )
      `;
    } catch (error) {
      console.error('Error saving moderation result:', error);
    }
  }

  /**
   * Update user moderation history
   */
  private async updateUserHistory(
    userId: string,
    moderationResult: ModerationResult
  ): Promise<void> {
    try {
      const history = await this.getUserHistory(userId);

      if (!history) {
        // Create new history
        await prisma.$executeRaw`
          INSERT INTO moderation_history (
            user_id, total_violations, violations_by_type,
            violations_by_severity, actions_taken, risk_score
          ) VALUES (
            ${userId}, 1, ${JSON.stringify({})},
            ${JSON.stringify({})}, ${JSON.stringify({})}, 0.1
          )
        `;
      } else {
        // Update existing history
        const newTotal = history.totalViolations + 1;
        const newRiskScore = Math.min(1.0, history.riskScore + 0.1);

        await prisma.$executeRaw`
          UPDATE moderation_history
          SET 
            total_violations = ${newTotal},
            last_violation = CURRENT_TIMESTAMP,
            risk_score = ${newRiskScore},
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ${userId}
        `;
      }
    } catch (error) {
      console.error('Error updating user history:', error);
    }
  }

  /**
   * Update daily moderation metrics
   */
  private async updateMetrics(moderationResult: ModerationResult): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];

      await prisma.$executeRaw`
        INSERT INTO moderation_metrics (
          date, total_content_scanned, violations_detected
        ) VALUES (
          ${today}::date, 1, ${moderationResult.violations.length}
        )
        ON CONFLICT (date) DO UPDATE SET
          total_content_scanned = moderation_metrics.total_content_scanned + 1,
          violations_detected = moderation_metrics.violations_detected + ${moderationResult.violations.length}
      `;
    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  }

  /**
   * Calculate cost of moderation
   */
  private calculateCost(
    violationCount: number,
    theologicalReview: any,
    toneAnalysis: any
  ): number {
    let cost = 0;

    // Base cost for content scanning
    cost += 0.02;

    // Additional cost per violation detected
    cost += violationCount * 0.01;

    // Theological review cost
    if (theologicalReview) {
      cost += 0.03;
    }

    // Tone analysis cost
    if (toneAnalysis) {
      cost += 0.02;
    }

    return Math.round(cost * 100) / 100;
  }

  /**
   * Get moderation metrics
   */
  async getMetrics(timeframe: 'day' | 'week' | 'month'): Promise<ModerationMetrics> {
    try {
      const days = timeframe === 'day' ? 1 : timeframe === 'week' ? 7 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await prisma.$queryRaw<any[]>`
        SELECT 
          SUM(total_content_scanned) as total_scanned,
          SUM(violations_detected) as total_violations,
          AVG(human_review_rate) as avg_review_rate,
          AVG(average_confidence) as avg_confidence,
          AVG(average_processing_time) as avg_processing_time,
          AVG(appeal_rate) as avg_appeal_rate,
          AVG(appeal_success_rate) as avg_appeal_success_rate,
          AVG(accuracy_score) as avg_accuracy
        FROM moderation_metrics
        WHERE date >= ${startDate.toISOString().split('T')[0]}::date
      `;

      const row = result[0];

      return {
        totalContentScanned: parseInt(row.total_scanned) || 0,
        violationsDetected: parseInt(row.total_violations) || 0,
        violationsByType: {} as Record<any, number>,
        violationsBySeverity: {} as Record<any, number>,
        actionsTaken: {} as Record<any, number>,
        humanReviewRate: parseFloat(row.avg_review_rate) || 0,
        averageConfidence: parseFloat(row.avg_confidence) || 0,
        averageProcessingTime: parseFloat(row.avg_processing_time) || 0,
        appealRate: parseFloat(row.avg_appeal_rate) || 0,
        appealSuccessRate: parseFloat(row.avg_appeal_success_rate) || 0,
        falsePositiveRate: 0,
        accuracyScore: parseFloat(row.avg_accuracy) || 0
      };
    } catch (error) {
      console.error('Error getting metrics:', error);
      return {
        totalContentScanned: 0,
        violationsDetected: 0,
        violationsByType: {} as Record<any, number>,
        violationsBySeverity: {} as Record<any, number>,
        actionsTaken: {} as Record<any, number>,
        humanReviewRate: 0,
        averageConfidence: 0,
        averageProcessingTime: 0,
        appealRate: 0,
        appealSuccessRate: 0,
        falsePositiveRate: 0,
        accuracyScore: 0
      };
    }
  }
}
