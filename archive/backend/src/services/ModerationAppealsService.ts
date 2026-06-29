/**
 * Moderation Appeals Service
 * Handles moderation appeals, provides context to human moderators,
 * tracks appeal outcomes, and improves moderation accuracy
 */

import { 
  ModerationAppeal,
  ModerationResult,
  ModerationAction,
  AppealStatus
} from '../types/moderation.types';
import { AIGatewayService } from './AIGatewayService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default class ModerationAppealsService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Submit an appeal for a moderation decision
   */
  async submitAppeal(
    moderationId: string,
    userId: string,
    contentId: string,
    originalAction: ModerationAction,
    appealReason: string
  ): Promise<ModerationAppeal> {
    // Get original moderation result
    const originalModeration = await this.getOriginalModeration(moderationId);

    // Analyze the appeal
    const appealAnalysis = await this.analyzeAppeal(
      appealReason,
      originalModeration
    );

    // Create appeal record
    const appeal: ModerationAppeal = {
      id: this.generateId(),
      moderationId,
      userId,
      contentId,
      originalAction,
      appealReason,
      status: 'pending',
      submittedAt: new Date(),
      aiContext: {
        originalViolations: originalModeration?.violations || [],
        originalConfidence: originalModeration?.confidence || 0,
        appealAnalysis
      }
    };

    // Save to database
    await this.saveAppeal(appeal);

    return appeal;
  }

  /**
   * Analyze an appeal to provide context for human moderators
   */
  async analyzeAppeal(
    appealReason: string,
    originalModeration: ModerationResult | null
  ): Promise<string> {
    if (!originalModeration) {
      return 'Original moderation result not found';
    }

    const violationsSummary = originalModeration.violations
      .map(v => `- ${v.type}: ${v.description} (severity: ${v.severity})`)
      .join('\n');

    const prompt = `Analyze this moderation appeal to help a human moderator make a fair decision.

Original Violations:
${violationsSummary}

Original Action: ${originalModeration.recommendedAction}
AI Confidence: ${(originalModeration.confidence * 100).toFixed(0)}%

User's Appeal:
"${appealReason}"

Provide analysis including:
1. Is the appeal reasonable and well-founded?
2. Did the AI potentially make an error?
3. Are there mitigating circumstances?
4. What additional context should the moderator consider?
5. Preliminary recommendation (uphold, overturn, or modify)

Return JSON:
{
  "appealMerit": "low/medium/high",
  "potentialAIError": true/false,
  "mitigatingFactors": ["factor 1", "factor 2"],
  "additionalContext": "important context for moderator",
  "preliminaryRecommendation": "uphold/overturn/modify",
  "reasoning": "explanation of recommendation"
}`;

    try {
      const response = await this.aiGateway.generateCompletion({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are an impartial appeals analyst helping human moderators make fair decisions.' },
          { role: 'user', content: prompt }
        ],
        maxTokens: 500,
        temperature: 0.3
      });

      const analysis = this.parseAIResponse(response.content);
      return JSON.stringify(analysis, null, 2);
    } catch (error) {
      console.error('Error analyzing appeal:', error);
      return 'Error analyzing appeal - requires full human review';
    }
  }

  /**
   * Process appeal decision by human moderator
   */
  async processAppealDecision(
    appealId: string,
    reviewerId: string,
    decision: 'upheld' | 'overturned' | 'modified',
    newAction?: ModerationAction,
    explanation?: string
  ): Promise<ModerationAppeal> {
    const appeal = await this.getAppeal(appealId);

    if (!appeal) {
      throw new Error('Appeal not found');
    }

    // Update appeal with decision
    appeal.status = 'under_review';
    appeal.reviewedAt = new Date();
    appeal.reviewedBy = reviewerId;
    appeal.outcome = {
      decision,
      newAction,
      explanation: explanation || ''
    };

    // Update in database
    await this.updateAppeal(appeal);

    // Track outcome for accuracy improvement
    await this.trackAppealOutcome(appeal);

    return appeal;
  }

  /**
   * Track appeal outcomes to improve moderation accuracy
   */
  private async trackAppealOutcome(appeal: ModerationAppeal): Promise<void> {
    if (!appeal.outcome) return;

    try {
      // Record the outcome for analytics
      await prisma.$executeRaw`
        INSERT INTO moderation_appeal_outcomes (
          appeal_id,
          original_action,
          appeal_decision,
          new_action,
          original_violations,
          created_at
        ) VALUES (
          ${appeal.id},
          ${appeal.originalAction},
          ${appeal.outcome.decision},
          ${appeal.outcome.newAction || null},
          ${JSON.stringify(appeal.aiContext?.originalViolations || [])},
          CURRENT_TIMESTAMP
        )
        ON CONFLICT DO NOTHING
      `;

      // If appeal was successful, analyze what went wrong
      if (appeal.outcome.decision === 'overturned' || appeal.outcome.decision === 'modified') {
        await this.analyzeModerationError(appeal);
      }
    } catch (error) {
      console.error('Error tracking appeal outcome:', error);
    }
  }

  /**
   * Analyze moderation errors to improve future accuracy
   */
  private async analyzeModerationError(appeal: ModerationAppeal): Promise<void> {
    if (!appeal.aiContext || !appeal.outcome) return;

    const prompt = `Analyze why the AI moderation system made an error that was overturned on appeal.

Original Violations: ${JSON.stringify(appeal.aiContext.originalViolations)}
Original Confidence: ${appeal.aiContext.originalConfidence}
Appeal Reason: ${appeal.appealReason}
Human Decision: ${appeal.outcome.decision}
Explanation: ${appeal.outcome.explanation}

Identify:
1. What did the AI misunderstand or miss?
2. What patterns should we look for to avoid this error?
3. What improvements can be made to the moderation system?

Return JSON with analysis and improvement suggestions.`;

    try {
      const response = await this.aiGateway.generateCompletion({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are a system analyst improving AI moderation accuracy.' },
          { role: 'user', content: prompt }
        ],
        maxTokens: 400,
        temperature: 0.3
      });

      const analysis = this.parseAIResponse(response.content);

      // Log for review and system improvement
      console.log('Moderation Error Analysis:', analysis);

      // Store for future training/improvement
      await this.storeImprovementInsight(appeal.id, analysis);
    } catch (error) {
      console.error('Error analyzing moderation error:', error);
    }
  }

  /**
   * Get appeal statistics for monitoring
   */
  async getAppealStatistics(timeframe: 'day' | 'week' | 'month' | 'all'): Promise<{
    totalAppeals: number;
    pendingAppeals: number;
    upheldRate: number;
    overturnedRate: number;
    modifiedRate: number;
    averageResolutionTime: number;
  }> {
    const timeFilter = this.getTimeFilter(timeframe);

    try {
      const stats = await prisma.$queryRaw<any[]>`
        SELECT 
          COUNT(*) as total_appeals,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_appeals,
          SUM(CASE WHEN outcome->>'decision' = 'upheld' THEN 1 ELSE 0 END) as upheld,
          SUM(CASE WHEN outcome->>'decision' = 'overturned' THEN 1 ELSE 0 END) as overturned,
          SUM(CASE WHEN outcome->>'decision' = 'modified' THEN 1 ELSE 0 END) as modified,
          AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/3600) as avg_resolution_hours
        FROM moderation_appeals
        WHERE submitted_at >= ${timeFilter}
      `;

      const row = stats[0];
      const total = parseInt(row.total_appeals) || 0;

      return {
        totalAppeals: total,
        pendingAppeals: parseInt(row.pending_appeals) || 0,
        upheldRate: total > 0 ? (parseInt(row.upheld) || 0) / total : 0,
        overturnedRate: total > 0 ? (parseInt(row.overturned) || 0) / total : 0,
        modifiedRate: total > 0 ? (parseInt(row.modified) || 0) / total : 0,
        averageResolutionTime: parseFloat(row.avg_resolution_hours) || 0
      };
    } catch (error) {
      console.error('Error getting appeal statistics:', error);
      return {
        totalAppeals: 0,
        pendingAppeals: 0,
        upheldRate: 0,
        overturnedRate: 0,
        modifiedRate: 0,
        averageResolutionTime: 0
      };
    }
  }

  /**
   * Helper methods
   */

  private async getOriginalModeration(moderationId: string): Promise<ModerationResult | null> {
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT * FROM moderation_results WHERE id = ${moderationId}
      `;

      if (result.length === 0) return null;

      const row = result[0];
      return {
        contentId: row.content_id,
        approved: row.approved,
        violations: row.violations,
        overallSeverity: row.overall_severity,
        recommendedAction: row.recommended_action,
        reasoning: row.reasoning,
        confidence: parseFloat(row.confidence),
        requiresHumanReview: row.requires_human_review,
        timestamp: row.created_at
      };
    } catch (error) {
      console.error('Error getting original moderation:', error);
      return null;
    }
  }

  private async getAppeal(appealId: string): Promise<ModerationAppeal | null> {
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT * FROM moderation_appeals WHERE id = ${appealId}
      `;

      if (result.length === 0) return null;

      const row = result[0];
      return {
        id: row.id,
        moderationId: row.moderation_id,
        userId: row.user_id,
        contentId: row.content_id,
        originalAction: row.original_action,
        appealReason: row.appeal_reason,
        status: row.status,
        submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at,
        reviewedBy: row.reviewed_by,
        outcome: row.outcome,
        aiContext: row.ai_context
      };
    } catch (error) {
      console.error('Error getting appeal:', error);
      return null;
    }
  }

  private async saveAppeal(appeal: ModerationAppeal): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO moderation_appeals (
          id, moderation_id, user_id, content_id, original_action,
          appeal_reason, status, submitted_at, ai_context
        ) VALUES (
          ${appeal.id},
          ${appeal.moderationId},
          ${appeal.userId},
          ${appeal.contentId},
          ${appeal.originalAction},
          ${appeal.appealReason},
          ${appeal.status},
          ${appeal.submittedAt},
          ${JSON.stringify(appeal.aiContext)}
        )
      `;
    } catch (error) {
      console.error('Error saving appeal:', error);
      throw error;
    }
  }

  private async updateAppeal(appeal: ModerationAppeal): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE moderation_appeals
        SET 
          status = ${appeal.status},
          reviewed_at = ${appeal.reviewedAt},
          reviewed_by = ${appeal.reviewedBy},
          outcome = ${JSON.stringify(appeal.outcome)}
        WHERE id = ${appeal.id}
      `;
    } catch (error) {
      console.error('Error updating appeal:', error);
      throw error;
    }
  }

  private async storeImprovementInsight(appealId: string, analysis: any): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO moderation_improvement_insights (
          appeal_id, analysis, created_at
        ) VALUES (
          ${appealId},
          ${JSON.stringify(analysis)},
          CURRENT_TIMESTAMP
        )
        ON CONFLICT DO NOTHING
      `;
    } catch (error) {
      console.error('Error storing improvement insight:', error);
    }
  }

  private getTimeFilter(timeframe: 'day' | 'week' | 'month' | 'all'): Date {
    const now = new Date();
    switch (timeframe) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'all':
      default:
        return new Date(0);
    }
  }

  private generateId(): string {
    return `appeal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private parseAIResponse(content: string): any {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {};
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {};
    }
  }
}
