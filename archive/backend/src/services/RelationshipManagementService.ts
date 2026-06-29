/**
 * Relationship Management Service
 * Manages donor relationships and engagement planning
 */

import {
  EngagementPlanResponse,
  EngagementPlan,
  DonorIntelligence,
  PlannedTouchpoint,
  RecognitionOpportunity,
  RelationshipHealth,
  TouchpointType,
  RecognitionType,
  ContactMethod
} from '../types/fundraising.types';
import { AIGatewayService } from './AIGatewayService';
import logger from '../utils/logger';

export class RelationshipManagementService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Create comprehensive engagement plan for donor
   */
  async createEngagementPlan(
    donorId: string,
    intelligence: DonorIntelligence
  ): Promise<EngagementPlanResponse> {
    try {
      logger.info('Creating engagement plan', { donorId });

      // Assess relationship health
      const relationshipHealth = this.assessRelationshipHealth(intelligence);

      // Generate touchpoint plan
      const touchpoints = await this.generateTouchpoints(intelligence, relationshipHealth);

      // Identify recognition opportunities
      const recognitionOpportunities = this.identifyRecognitionOpportunities(intelligence);

      // Set goals based on donor potential
      const goals = this.setEngagementGoals(intelligence, relationshipHealth);

      // Determine next review date
      const nextReviewDate = this.calculateNextReviewDate(intelligence.engagementScore);

      const plan: EngagementPlan = {
        donorId,
        currentStatus: this.determineCurrentStatus(intelligence, relationshipHealth),
        goals,
        touchpoints,
        recognitionOpportunities,
        relationshipHealth,
        nextReviewDate,
        generatedAt: new Date()
      };

      // Generate implementation guide
      const implementationGuide = this.generateImplementationGuide(plan);

      const confidence = this.calculateConfidence(intelligence, touchpoints.length);

      logger.info('Engagement plan created', {
        donorId,
        touchpointCount: touchpoints.length,
        confidence
      });

      return {
        plan,
        confidence,
        implementationGuide
      };
    } catch (error) {
      logger.error('Error creating engagement plan', { error, donorId });
      throw error;
    }
  }

  /**
   * Assess relationship health
   */
  private assessRelationshipHealth(intelligence: DonorIntelligence): RelationshipHealth {
    const score = this.calculateRelationshipScore(intelligence);
    const trend = this.determineRelationshipTrend(intelligence);
    const strengths = this.identifyStrengths(intelligence);
    const concerns = this.identifyConcerns(intelligence);
    const recommendations = this.generateHealthRecommendations(intelligence, concerns);

    return {
      score,
      trend,
      strengths,
      concerns,
      recommendations
    };
  }

  /**
   * Calculate relationship health score
   */
  private calculateRelationshipScore(intelligence: DonorIntelligence): number {
    let score = 0;

    // Engagement score (40%)
    score += (intelligence.engagementScore / 100) * 40;

    // Capacity utilization (30%)
    const capacityUtilization = intelligence.optimalAskAmount / intelligence.estimatedCapacity;
    score += Math.min(capacityUtilization, 1) * 30;

    // Interest alignment (20%)
    score += Math.min(intelligence.interests.length / 5, 1) * 20;

    // Trend bonus/penalty (10%)
    if (intelligence.engagementTrend === 'increasing') score += 10;
    else if (intelligence.engagementTrend === 'decreasing') score -= 10;
    else score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine relationship trend
   */
  private determineRelationshipTrend(
    intelligence: DonorIntelligence
  ): 'improving' | 'stable' | 'declining' {
    if (intelligence.engagementTrend === 'increasing') return 'improving';
    if (intelligence.engagementTrend === 'decreasing') return 'declining';
    return 'stable';
  }

  /**
   * Identify relationship strengths
   */
  private identifyStrengths(intelligence: DonorIntelligence): string[] {
    const strengths: string[] = [];

    if (intelligence.engagementScore > 70) {
      strengths.push('High engagement and commitment');
    }

    if (intelligence.interests.length >= 3) {
      strengths.push('Strong alignment with multiple program areas');
    }

    if (intelligence.capacityConfidence > 0.8) {
      strengths.push('Well-understood giving capacity');
    }

    if (intelligence.engagementTrend === 'increasing') {
      strengths.push('Growing relationship momentum');
    }

    if (intelligence.opportunities.length > 0) {
      strengths.push('Multiple cultivation opportunities identified');
    }

    return strengths;
  }

  /**
   * Identify relationship concerns
   */
  private identifyConcerns(intelligence: DonorIntelligence): string[] {
    const concerns: string[] = [];

    if (intelligence.engagementScore < 40) {
      concerns.push('Low engagement requires attention');
    }

    if (intelligence.riskFactors.length > 0) {
      concerns.push(...intelligence.riskFactors);
    }

    if (intelligence.engagementTrend === 'decreasing') {
      concerns.push('Declining engagement trend');
    }

    if (intelligence.interests.length === 0) {
      concerns.push('Unclear donor interests and motivations');
    }

    return concerns;
  }

  /**
   * Generate health recommendations
   */
  private generateHealthRecommendations(
    intelligence: DonorIntelligence,
    concerns: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (concerns.length > 0) {
      recommendations.push('Address identified concerns promptly');
    }

    if (intelligence.engagementScore > 70) {
      recommendations.push('Consider major gift conversation');
    } else if (intelligence.engagementScore < 40) {
      recommendations.push('Implement re-engagement strategy');
    }

    if (intelligence.interests.length > 0) {
      recommendations.push(`Focus communications on ${intelligence.interests[0].category}`);
    }

    recommendations.push('Maintain regular touchpoints per plan');
    recommendations.push('Track and document all interactions');

    return recommendations;
  }

  /**
   * Generate touchpoint plan
   */
  private async generateTouchpoints(
    intelligence: DonorIntelligence,
    health: RelationshipHealth
  ): Promise<PlannedTouchpoint[]> {
    const touchpoints: PlannedTouchpoint[] = [];

    // Thank you touchpoint (always include)
    touchpoints.push({
      type: TouchpointType.THANK_YOU,
      timing: 'Within 48 hours of next gift',
      method: intelligence.bestContactMethod,
      purpose: 'Express gratitude and acknowledge impact',
      suggestedContent: 'Personalized thank you with specific impact example',
      priority: 'high',
      completed: false
    });

    // Engagement-based touchpoints
    if (intelligence.engagementScore > 70) {
      // High engagement - cultivation and solicitation
      touchpoints.push({
        type: TouchpointType.CULTIVATION,
        timing: 'Within 2 weeks',
        method: ContactMethod.IN_PERSON,
        purpose: 'Deepen relationship and explore major gift opportunity',
        suggestedContent: 'Personal meeting to discuss vision and impact',
        priority: 'high',
        completed: false
      });

      touchpoints.push({
        type: TouchpointType.UPDATE,
        timing: 'Monthly',
        method: intelligence.bestContactMethod,
        purpose: 'Keep donor informed of progress and impact',
        suggestedContent: 'Personalized impact updates aligned with interests',
        priority: 'medium',
        completed: false
      });
    } else if (intelligence.engagementScore > 40) {
      // Medium engagement - stewardship and cultivation
      touchpoints.push({
        type: TouchpointType.STEWARDSHIP,
        timing: 'Within 1 month',
        method: intelligence.bestContactMethod,
        purpose: 'Show impact of previous gifts',
        suggestedContent: 'Impact report with stories and metrics',
        priority: 'medium',
        completed: false
      });

      touchpoints.push({
        type: TouchpointType.UPDATE,
        timing: 'Quarterly',
        method: ContactMethod.EMAIL,
        purpose: 'Maintain engagement with relevant updates',
        suggestedContent: 'Newsletter with personalized highlights',
        priority: 'medium',
        completed: false
      });
    } else {
      // Low engagement - re-engagement focus
      touchpoints.push({
        type: TouchpointType.CULTIVATION,
        timing: 'Within 2 months',
        method: intelligence.bestContactMethod,
        purpose: 'Re-engage and understand current interests',
        suggestedContent: 'Personal outreach to reconnect',
        priority: 'high',
        completed: false
      });
    }

    // Interest-based touchpoints
    if (intelligence.interests.length > 0) {
      const topInterest = intelligence.interests[0];
      touchpoints.push({
        type: TouchpointType.UPDATE,
        timing: 'When relevant news occurs',
        method: ContactMethod.EMAIL,
        purpose: `Share updates about ${topInterest.category}`,
        suggestedContent: `Impact stories and progress in ${topInterest.category}`,
        priority: 'medium',
        completed: false
      });
    }

    // Invitation touchpoints for engaged donors
    if (intelligence.engagementScore > 50) {
      touchpoints.push({
        type: TouchpointType.INVITATION,
        timing: 'Next major event',
        method: ContactMethod.EMAIL,
        purpose: 'Invite to campus visit or special event',
        suggestedContent: 'Personalized invitation with VIP treatment',
        priority: 'medium',
        completed: false
      });
    }

    // Solicitation touchpoint if appropriate
    if (intelligence.engagementScore > 60 && health.score > 60) {
      touchpoints.push({
        type: TouchpointType.SOLICITATION,
        timing: 'After 2-3 cultivation touchpoints',
        method: intelligence.bestContactMethod,
        purpose: 'Make specific gift request',
        suggestedContent: `Personalized appeal for $${intelligence.optimalAskAmount.toLocaleString()}`,
        priority: 'high',
        completed: false
      });
    }

    return touchpoints.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Identify recognition opportunities
   */
  private identifyRecognitionOpportunities(
    intelligence: DonorIntelligence
  ): RecognitionOpportunity[] {
    const opportunities: RecognitionOpportunity[] = [];

    // Milestone recognition
    if (intelligence.estimatedCapacity >= 100000) {
      opportunities.push({
        type: RecognitionType.MILESTONE,
        occasion: 'Major donor milestone',
        timing: 'Upon reaching cumulative giving threshold',
        suggestedApproach: 'Personal recognition event or naming opportunity',
        impact: 'Strengthens commitment and encourages continued support'
      });
    }

    // Anniversary recognition
    opportunities.push({
      type: RecognitionType.ANNIVERSARY,
      occasion: 'Giving anniversary',
      timing: 'Annual recognition of first gift date',
      suggestedApproach: 'Personalized card or video message',
      impact: 'Acknowledges long-term partnership'
    });

    // Honor roll
    if (intelligence.engagementScore > 50) {
      opportunities.push({
        type: RecognitionType.HONOR_ROLL,
        occasion: 'Annual donor recognition',
        timing: 'Annual report publication',
        suggestedApproach: 'Include in donor honor roll with permission',
        impact: 'Public recognition of support'
      });
    }

    // Special event recognition
    if (intelligence.engagementScore > 70) {
      opportunities.push({
        type: RecognitionType.SPECIAL_EVENT,
        occasion: 'Donor appreciation event',
        timing: 'Annual or semi-annual',
        suggestedApproach: 'VIP invitation to exclusive event',
        impact: 'Deepens relationship and shows appreciation'
      });
    }

    // Naming opportunity for major donors
    if (intelligence.estimatedCapacity >= 250000) {
      opportunities.push({
        type: RecognitionType.NAMING_OPPORTUNITY,
        occasion: 'Major gift recognition',
        timing: 'Upon major gift commitment',
        suggestedApproach: 'Offer naming rights for program, scholarship, or facility',
        impact: 'Creates lasting legacy and encourages transformational gift'
      });
    }

    return opportunities;
  }

  /**
   * Set engagement goals
   */
  private setEngagementGoals(
    intelligence: DonorIntelligence,
    health: RelationshipHealth
  ): string[] {
    const goals: string[] = [];

    // Engagement goals
    if (intelligence.engagementScore < 70) {
      goals.push(`Increase engagement score to ${Math.min(intelligence.engagementScore + 20, 90)}`);
    }

    // Relationship health goals
    if (health.score < 70) {
      goals.push('Improve relationship health score to 70+');
    }

    // Giving goals
    if (intelligence.engagementScore > 60) {
      goals.push(`Secure gift of $${intelligence.optimalAskAmount.toLocaleString()} within 6 months`);
    }

    // Retention goals
    if (intelligence.engagementTrend === 'decreasing') {
      goals.push('Reverse declining engagement trend');
    } else {
      goals.push('Maintain or improve engagement trend');
    }

    // Interest alignment goals
    if (intelligence.interests.length < 3) {
      goals.push('Better understand donor interests and motivations');
    }

    // Upgrade goals for high-potential donors
    if (intelligence.estimatedCapacity > intelligence.optimalAskAmount * 2) {
      goals.push('Cultivate for increased giving capacity');
    }

    return goals;
  }

  /**
   * Determine current status
   */
  private determineCurrentStatus(
    intelligence: DonorIntelligence,
    health: RelationshipHealth
  ): string {
    if (intelligence.engagementScore > 70 && health.score > 70) {
      return 'Strong relationship - ready for major gift conversation';
    } else if (intelligence.engagementScore > 50) {
      return 'Active relationship - continue cultivation';
    } else if (intelligence.engagementScore > 30) {
      return 'Moderate engagement - needs attention';
    } else {
      return 'Low engagement - requires re-engagement strategy';
    }
  }

  /**
   * Calculate next review date
   */
  private calculateNextReviewDate(engagementScore: number): Date {
    const now = new Date();
    let monthsUntilReview = 6; // Default

    if (engagementScore > 70) {
      monthsUntilReview = 3; // Review high-engagement donors quarterly
    } else if (engagementScore < 40) {
      monthsUntilReview = 2; // Review low-engagement donors more frequently
    }

    now.setMonth(now.getMonth() + monthsUntilReview);
    return now;
  }

  /**
   * Generate implementation guide
   */
  private generateImplementationGuide(plan: EngagementPlan): string[] {
    const guide: string[] = [];

    guide.push('ENGAGEMENT PLAN IMPLEMENTATION GUIDE');
    guide.push('');
    guide.push(`Current Status: ${plan.currentStatus}`);
    guide.push(`Relationship Health: ${plan.relationshipHealth.score}/100 (${plan.relationshipHealth.trend})`);
    guide.push('');

    guide.push('IMMEDIATE ACTIONS:');
    const highPriorityTouchpoints = plan.touchpoints.filter(t => t.priority === 'high');
    highPriorityTouchpoints.forEach((t, i) => {
      guide.push(`${i + 1}. ${t.type}: ${t.purpose} (${t.timing})`);
    });
    guide.push('');

    guide.push('GOALS FOR THIS PERIOD:');
    plan.goals.forEach((goal, i) => {
      guide.push(`${i + 1}. ${goal}`);
    });
    guide.push('');

    if (plan.relationshipHealth.concerns.length > 0) {
      guide.push('CONCERNS TO ADDRESS:');
      plan.relationshipHealth.concerns.forEach((concern, i) => {
        guide.push(`${i + 1}. ${concern}`);
      });
      guide.push('');
    }

    guide.push('RECOGNITION OPPORTUNITIES:');
    plan.recognitionOpportunities.forEach((opp, i) => {
      guide.push(`${i + 1}. ${opp.type}: ${opp.occasion} (${opp.timing})`);
    });
    guide.push('');

    guide.push(`Next Review Date: ${plan.nextReviewDate.toLocaleDateString()}`);

    return guide;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(intelligence: DonorIntelligence, touchpointCount: number): number {
    let confidence = 0.7;

    if (intelligence.capacityConfidence > 0.8) confidence += 0.1;
    if (intelligence.interests.length >= 3) confidence += 0.1;
    if (touchpointCount >= 5) confidence += 0.05;

    return Math.min(confidence, 0.95);
  }
}

export default RelationshipManagementService;
