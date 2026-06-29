/**
 * Moderation Action Service
 * Recommends moderation actions, suggests warnings vs removals,
 * determines account suspension needs, and generates explanation messages
 */

import { 
  ModerationResult,
  ModerationActionRecommendation,
  ModerationAction,
  ViolationSeverity,
  ModerationHistory,
  UserContent
} from '../types/moderation.types';
import { AIGatewayService } from './AIGatewayService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default class ModerationActionService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Recommend appropriate moderation action based on violations and context
   */
  async recommendAction(
    moderationResult: ModerationResult,
    userHistory?: ModerationHistory
  ): Promise<ModerationActionRecommendation> {
    // Determine primary action based on severity and history
    const action = this.determinePrimaryAction(
      moderationResult,
      userHistory
    );

    // Generate reasoning for the action
    const reasoning = this.generateReasoning(
      action,
      moderationResult,
      userHistory
    );

    // Generate alternative actions
    const alternativeActions = this.generateAlternatives(
      action,
      moderationResult,
      userHistory
    );

    // Generate appropriate messages
    const messages = await this.generateMessages(
      action,
      moderationResult,
      userHistory
    );

    // Calculate confidence in recommendation
    const confidence = this.calculateConfidence(
      moderationResult,
      userHistory
    );

    return {
      contentId: moderationResult.contentId,
      action,
      reasoning,
      alternativeActions,
      warningMessage: messages.warning,
      removalExplanation: messages.removal,
      suspensionDuration: messages.suspensionDuration,
      escalationReason: messages.escalation,
      confidence
    };
  }

  /**
   * Determine the primary recommended action
   */
  private determinePrimaryAction(
    moderationResult: ModerationResult,
    userHistory?: ModerationHistory
  ): ModerationAction {
    const { overallSeverity, violations } = moderationResult;

    // Critical violations always escalate or suspend
    if (overallSeverity === 'critical') {
      const hasSafetyThreat = violations.some(v => 
        v.description.includes('URGENT') || 
        v.description.includes('threat') ||
        v.description.includes('harm')
      );

      if (hasSafetyThreat) {
        return 'escalate'; // Immediate human review for safety
      }

      // Check for heresy or serious theological error
      const hasHeresy = violations.some(v => 
        v.description.includes('heretical') ||
        v.description.includes('Heretical')
      );

      if (hasHeresy) {
        return 'escalate'; // Spiritual advisor review
      }

      // Repeat critical offender
      if (userHistory && userHistory.totalViolations >= 3) {
        return 'suspend_permanent';
      }

      return 'suspend_temporary';
    }

    // High severity violations
    if (overallSeverity === 'high') {
      if (userHistory && userHistory.totalViolations >= 5) {
        return 'suspend_temporary';
      }

      if (userHistory && userHistory.totalViolations >= 2) {
        return 'remove';
      }

      return 'warn';
    }

    // Medium severity violations
    if (overallSeverity === 'medium') {
      if (userHistory && userHistory.totalViolations >= 3) {
        return 'remove';
      }

      return 'warn';
    }

    // Low severity violations
    if (overallSeverity === 'low') {
      if (userHistory && userHistory.totalViolations >= 5) {
        return 'warn';
      }

      return 'approve'; // Approve with guidance
    }

    return 'approve';
  }

  /**
   * Generate reasoning for the recommended action
   */
  private generateReasoning(
    action: ModerationAction,
    moderationResult: ModerationResult,
    userHistory?: ModerationHistory
  ): string[] {
    const reasoning: string[] = [];

    // Explain severity
    reasoning.push(
      `Content severity: ${moderationResult.overallSeverity} (${moderationResult.violations.length} violation(s) detected)`
    );

    // Explain specific violations
    const violationTypes = [...new Set(moderationResult.violations.map(v => v.type))];
    reasoning.push(
      `Violation types: ${violationTypes.join(', ')}`
    );

    // Explain user history impact
    if (userHistory) {
      if (userHistory.totalViolations > 0) {
        reasoning.push(
          `User has ${userHistory.totalViolations} previous violation(s)`
        );
      }

      if (userHistory.riskScore > 0.5) {
        reasoning.push(
          `User risk score is elevated (${(userHistory.riskScore * 100).toFixed(0)}%)`
        );
      }
    }

    // Explain action choice
    switch (action) {
      case 'approve':
        reasoning.push('Content approved with minor concerns - user will receive guidance');
        break;
      case 'warn':
        reasoning.push('Warning issued to educate user about community standards');
        break;
      case 'remove':
        reasoning.push('Content removed due to policy violations');
        break;
      case 'suspend_temporary':
        reasoning.push('Temporary suspension to prevent further violations');
        break;
      case 'suspend_permanent':
        reasoning.push('Permanent suspension due to severe or repeated violations');
        break;
      case 'escalate':
        reasoning.push('Escalated to human moderator for expert review');
        break;
    }

    return reasoning;
  }

  /**
   * Generate alternative action recommendations
   */
  private generateAlternatives(
    primaryAction: ModerationAction,
    moderationResult: ModerationResult,
    userHistory?: ModerationHistory
  ): ModerationActionRecommendation['alternativeActions'] {
    const alternatives: ModerationActionRecommendation['alternativeActions'] = [];

    // Generate 2-3 alternative actions with reasoning
    const allActions: ModerationAction[] = [
      'approve', 'warn', 'edit', 'remove', 
      'suspend_temporary', 'suspend_permanent', 'escalate'
    ];

    const otherActions = allActions.filter(a => a !== primaryAction);

    // Select most relevant alternatives
    if (primaryAction === 'remove') {
      alternatives.push({
        action: 'warn',
        reasoning: 'Issue warning instead if this is first offense',
        appropriateWhen: 'User has no prior violations and shows willingness to learn'
      });

      alternatives.push({
        action: 'edit',
        reasoning: 'Allow user to edit and resubmit content',
        appropriateWhen: 'Violation is minor and user can easily correct it'
      });
    }

    if (primaryAction === 'warn') {
      alternatives.push({
        action: 'approve',
        reasoning: 'Approve with educational guidance',
        appropriateWhen: 'Violation is very minor or unintentional'
      });

      alternatives.push({
        action: 'remove',
        reasoning: 'Remove content if warning is insufficient',
        appropriateWhen: 'User has history of similar violations'
      });
    }

    if (primaryAction === 'suspend_temporary') {
      alternatives.push({
        action: 'remove',
        reasoning: 'Remove content without suspension',
        appropriateWhen: 'This is an isolated incident for otherwise good user'
      });

      alternatives.push({
        action: 'suspend_permanent',
        reasoning: 'Permanent suspension for severe cases',
        appropriateWhen: 'User shows no remorse or pattern of serious violations'
      });
    }

    if (primaryAction === 'escalate') {
      alternatives.push({
        action: 'suspend_temporary',
        reasoning: 'Immediate temporary suspension pending review',
        appropriateWhen: 'Safety concern requires immediate action'
      });

      alternatives.push({
        action: 'remove',
        reasoning: 'Remove content and monitor user',
        appropriateWhen: 'Violation is clear but not requiring immediate suspension'
      });
    }

    return alternatives;
  }

  /**
   * Generate appropriate messages for each action type
   */
  private async generateMessages(
    action: ModerationAction,
    moderationResult: ModerationResult,
    userHistory?: ModerationHistory
  ): Promise<{
    warning?: string;
    removal?: string;
    suspensionDuration?: number;
    escalation?: string;
  }> {
    const messages: any = {};

    if (action === 'warn' || action === 'approve') {
      messages.warning = await this.generateWarningMessage(moderationResult);
    }

    if (action === 'remove' || action === 'suspend_temporary' || action === 'suspend_permanent') {
      messages.removal = await this.generateRemovalExplanation(moderationResult);
    }

    if (action === 'suspend_temporary') {
      messages.suspensionDuration = this.calculateSuspensionDuration(
        moderationResult,
        userHistory
      );
    }

    if (action === 'escalate') {
      messages.escalation = this.generateEscalationReason(moderationResult);
    }

    return messages;
  }

  /**
   * Generate warning message for user
   */
  private async generateWarningMessage(moderationResult: ModerationResult): Promise<string> {
    const violationSummary = moderationResult.violations
      .map(v => `- ${v.description}`)
      .join('\n');

    const prompt = `Generate a gracious but clear warning message for a user whose content violated community guidelines.

Violations:
${violationSummary}

The message should:
1. Explain what guideline was violated
2. Why it matters for our Christian community
3. How to avoid this in the future
4. Encourage positive participation
5. Be firm but loving in tone

Keep it under 150 words.`;

    try {
      const response = await this.aiGateway.generateCompletion({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are a gracious community moderator for a Christian educational platform. Be firm but loving.' },
          { role: 'user', content: prompt }
        ],
        maxTokens: 250,
        temperature: 0.5
      });

      return response.content;
    } catch (error) {
      console.error('Error generating warning message:', error);
      return `Your recent content did not meet our community guidelines. Please review our standards and ensure future posts are respectful and constructive. We're here to build each other up in Christ.`;
    }
  }

  /**
   * Generate removal explanation
   */
  private async generateRemovalExplanation(moderationResult: ModerationResult): Promise<string> {
    const violationSummary = moderationResult.violations
      .map(v => `- ${v.type}: ${v.description}`)
      .join('\n');

    const prompt = `Generate a clear explanation for why content was removed from our Christian educational platform.

Violations:
${violationSummary}

The explanation should:
1. State clearly what policy was violated
2. Explain why this content cannot remain
3. Reference our community values
4. Offer path forward for the user
5. Maintain respectful tone

Keep it under 200 words.`;

    try {
      const response = await this.aiGateway.generateCompletion({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are a fair and clear community moderator. Explain decisions with grace and truth.' },
          { role: 'user', content: prompt }
        ],
        maxTokens: 300,
        temperature: 0.5
      });

      return response.content;
    } catch (error) {
      console.error('Error generating removal explanation:', error);
      return `Your content has been removed because it violated our community guidelines. We maintain high standards to create a safe, respectful learning environment. Please review our guidelines before posting again.`;
    }
  }

  /**
   * Calculate suspension duration in days
   */
  private calculateSuspensionDuration(
    moderationResult: ModerationResult,
    userHistory?: ModerationHistory
  ): number {
    let baseDuration = 0;

    // Base duration on severity
    switch (moderationResult.overallSeverity) {
      case 'critical':
        baseDuration = 30; // 30 days
        break;
      case 'high':
        baseDuration = 14; // 14 days
        break;
      case 'medium':
        baseDuration = 7; // 7 days
        break;
      case 'low':
        baseDuration = 3; // 3 days
        break;
    }

    // Increase for repeat offenders
    if (userHistory) {
      const repeatMultiplier = Math.min(userHistory.totalViolations, 5);
      baseDuration *= repeatMultiplier;
    }

    // Cap at 90 days for temporary suspension
    return Math.min(baseDuration, 90);
  }

  /**
   * Generate escalation reason for human moderators
   */
  private generateEscalationReason(moderationResult: ModerationResult): string {
    const reasons: string[] = [];

    // Check for critical issues
    const hasSafetyThreat = moderationResult.violations.some(v => 
      v.description.includes('URGENT') || v.description.includes('threat')
    );

    if (hasSafetyThreat) {
      reasons.push('URGENT: Potential safety threat detected - immediate review required');
    }

    const hasTheologicalConcern = moderationResult.violations.some(v => 
      v.type === 'theological_error' && v.severity === 'critical'
    );

    if (hasTheologicalConcern) {
      reasons.push('Serious theological concern requiring spiritual advisor review');
    }

    if (moderationResult.confidence < 0.70) {
      reasons.push('AI confidence below threshold - human judgment needed');
    }

    if (moderationResult.violations.length >= 5) {
      reasons.push('Multiple violations detected - complex case requiring human review');
    }

    if (reasons.length === 0) {
      reasons.push('Case escalated for expert human review');
    }

    return reasons.join('. ');
  }

  /**
   * Calculate confidence in action recommendation
   */
  private calculateConfidence(
    moderationResult: ModerationResult,
    userHistory?: ModerationHistory
  ): number {
    let confidence = moderationResult.confidence;

    // Increase confidence if we have user history
    if (userHistory) {
      confidence += 0.05;
    }

    // Decrease confidence for edge cases
    if (moderationResult.overallSeverity === 'medium' && 
        moderationResult.violations.length === 1) {
      confidence -= 0.10; // Borderline case
    }

    // Increase confidence for clear violations
    if (moderationResult.overallSeverity === 'critical') {
      confidence += 0.05;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}
