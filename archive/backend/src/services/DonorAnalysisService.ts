/**
 * Donor Analysis Service
 * Analyzes giving patterns, estimates capacity, and generates donor intelligence
 */

import {
  DonorAnalysisRequest,
  DonorAnalysisResponse,
  DonorIntelligence,
  CapacityRange,
  DonorInterest,
  RecommendedAction,
  ContactMethod,
  Donor,
  DonationRecord
} from '../types/fundraising.types';
import { AIGatewayService } from './AIGatewayService';
import logger from '../utils/logger';

export class DonorAnalysisService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Analyze donor and generate comprehensive intelligence
   */
  async analyzeDonor(request: DonorAnalysisRequest): Promise<DonorAnalysisResponse> {
    try {
      logger.info('Starting donor analysis', { donorId: request.donorId });

      // Get donor data (in real implementation, from database)
      const donor = await this.getDonorData(request.donorId);

      // Analyze giving patterns
      const givingPatterns = this.analyzeGivingPatterns(donor.givingHistory);

      // Estimate giving capacity
      const capacity = await this.estimateGivingCapacity(donor, givingPatterns);

      // Identify donor interests
      const interests = await this.identifyDonorInterests(donor);

      // Calculate engagement score
      const engagementScore = this.calculateEngagementScore(donor, givingPatterns);

      // Determine optimal ask amount
      const optimalAskAmount = this.calculateOptimalAskAmount(
        capacity,
        givingPatterns,
        engagementScore
      );

      // Generate next steps
      const nextSteps = await this.generateNextSteps(
        donor,
        capacity,
        engagementScore,
        interests
      );

      // Identify risks and opportunities
      const riskFactors = this.identifyRiskFactors(donor, givingPatterns);
      const opportunities = this.identifyOpportunities(donor, interests);

      // Generate AI analysis
      const analysis = await this.generateAIAnalysis(
        donor,
        capacity,
        interests,
        engagementScore
      );

      const intelligence: DonorIntelligence = {
        donorId: request.donorId,
        givingCapacity: capacity,
        estimatedCapacity: (capacity.min + capacity.max) / 2,
        capacityConfidence: capacity.confidence,
        interests,
        engagementScore,
        engagementTrend: this.determineEngagementTrend(givingPatterns),
        optimalAskAmount,
        bestContactMethod: this.determineBestContactMethod(donor),
        bestContactTime: this.determineBestContactTime(donor),
        nextSteps,
        riskFactors,
        opportunities,
        analysis,
        generatedAt: new Date()
      };

      const confidence = this.calculateOverallConfidence(
        capacity.confidence,
        interests.length,
        givingPatterns.totalGifts
      );

      const recommendations = this.generateRecommendations(intelligence);

      logger.info('Donor analysis completed', {
        donorId: request.donorId,
        confidence,
        engagementScore
      });

      return {
        intelligence,
        confidence,
        recommendations
      };
    } catch (error) {
      logger.error('Error in donor analysis', { error, request });
      throw error;
    }
  }

  /**
   * Analyze giving patterns from donation history
   */
  private analyzeGivingPatterns(history: DonationRecord[]): {
    totalGifts: number;
    averageGift: number;
    largestGift: number;
    smallestGift: number;
    frequency: string;
    recency: number;
    consistency: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  } {
    if (history.length === 0) {
      return {
        totalGifts: 0,
        averageGift: 0,
        largestGift: 0,
        smallestGift: 0,
        frequency: 'none',
        recency: 0,
        consistency: 0,
        trend: 'stable'
      };
    }

    const amounts = history.map(d => d.amount);
    const totalGifts = history.length;
    const averageGift = amounts.reduce((a, b) => a + b, 0) / totalGifts;
    const largestGift = Math.max(...amounts);
    const smallestGift = Math.min(...amounts);

    // Calculate recency (days since last gift)
    const lastGiftDate = new Date(Math.max(...history.map(d => d.date.getTime())));
    const recency = Math.floor((Date.now() - lastGiftDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate frequency
    const firstGiftDate = new Date(Math.min(...history.map(d => d.date.getTime())));
    const daysSinceFirst = Math.floor((Date.now() - firstGiftDate.getTime()) / (1000 * 60 * 60 * 24));
    const giftsPerYear = (totalGifts / daysSinceFirst) * 365;
    
    let frequency = 'occasional';
    if (giftsPerYear >= 12) frequency = 'monthly';
    else if (giftsPerYear >= 4) frequency = 'quarterly';
    else if (giftsPerYear >= 1) frequency = 'annual';

    // Calculate consistency (standard deviation)
    const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - averageGift, 2), 0) / totalGifts;
    const stdDev = Math.sqrt(variance);
    const consistency = 1 - Math.min(stdDev / averageGift, 1);

    // Determine trend
    const recentGifts = history.slice(-3).map(d => d.amount);
    const olderGifts = history.slice(0, Math.min(3, history.length - 3)).map(d => d.amount);
    const recentAvg = recentGifts.reduce((a, b) => a + b, 0) / recentGifts.length;
    const olderAvg = olderGifts.length > 0 ? olderGifts.reduce((a, b) => a + b, 0) / olderGifts.length : recentAvg;
    
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (recentAvg > olderAvg * 1.2) trend = 'increasing';
    else if (recentAvg < olderAvg * 0.8) trend = 'decreasing';

    return {
      totalGifts,
      averageGift,
      largestGift,
      smallestGift,
      frequency,
      recency,
      consistency,
      trend
    };
  }

  /**
   * Estimate donor's giving capacity using AI and data analysis
   */
  private async estimateGivingCapacity(
    donor: Donor,
    patterns: any
  ): Promise<CapacityRange> {
    try {
      // Use AI to estimate capacity based on giving history and other factors
      const prompt = `Analyze this donor's giving capacity:
      
Donor Profile:
- Total lifetime giving: $${donor.totalLifetimeGiving}
- Average gift: $${patterns.averageGift}
- Largest gift: $${patterns.largestGift}
- Giving frequency: ${patterns.frequency}
- Giving trend: ${patterns.trend}
- Donor type: ${donor.donorType}

Based on this information, estimate the donor's annual giving capacity range.
Consider:
1. Historical giving patterns
2. Giving trend and consistency
3. Donor type and typical capacity ranges
4. Potential for increased giving

Provide a JSON response with:
{
  "min": <minimum annual capacity>,
  "max": <maximum annual capacity>,
  "confidence": <confidence score 0-1>,
  "reasoning": "<brief explanation>"
}`;

      const response = await this.aiGateway.generateText({
        prompt,
        maxTokens: 500,
        temperature: 0.3
      });

      const result = JSON.parse(response.text);

      return {
        min: result.min || patterns.averageGift * 0.5,
        max: result.max || patterns.largestGift * 1.5,
        confidence: result.confidence || 0.7
      };
    } catch (error) {
      logger.error('Error estimating capacity', { error });
      
      // Fallback to simple calculation
      return {
        min: patterns.averageGift * 0.5,
        max: patterns.largestGift * 1.5,
        confidence: 0.6
      };
    }
  }

  /**
   * Identify donor interests from giving history and interactions
   */
  private async identifyDonorInterests(donor: Donor): Promise<DonorInterest[]> {
    try {
      // Analyze designations and patterns to identify interests
      const interests: DonorInterest[] = [];

      // Add interests from donor profile
      for (const interest of donor.interests) {
        interests.push({
          category: interest,
          subcategories: [],
          strength: 0.8,
          evidence: ['Donor profile']
        });
      }

      // Analyze giving history for additional interests
      const designations = donor.givingHistory
        .filter(d => d.designation)
        .map(d => d.designation!);

      const uniqueDesignations = [...new Set(designations)];
      
      for (const designation of uniqueDesignations) {
        const count = designations.filter(d => d === designation).length;
        const strength = Math.min(count / donor.givingHistory.length, 1);

        interests.push({
          category: designation,
          subcategories: [],
          strength,
          evidence: [`${count} gifts to this designation`]
        });
      }

      return interests;
    } catch (error) {
      logger.error('Error identifying interests', { error });
      return [];
    }
  }

  /**
   * Calculate engagement score based on multiple factors
   */
  private calculateEngagementScore(donor: Donor, patterns: any): number {
    let score = 0;

    // Recency (30%)
    if (patterns.recency < 30) score += 30;
    else if (patterns.recency < 90) score += 20;
    else if (patterns.recency < 180) score += 10;

    // Frequency (30%)
    if (patterns.frequency === 'monthly') score += 30;
    else if (patterns.frequency === 'quarterly') score += 20;
    else if (patterns.frequency === 'annual') score += 10;

    // Monetary (20%)
    if (donor.totalLifetimeGiving > 100000) score += 20;
    else if (donor.totalLifetimeGiving > 50000) score += 15;
    else if (donor.totalLifetimeGiving > 10000) score += 10;
    else if (donor.totalLifetimeGiving > 1000) score += 5;

    // Consistency (10%)
    score += patterns.consistency * 10;

    // Trend (10%)
    if (patterns.trend === 'increasing') score += 10;
    else if (patterns.trend === 'stable') score += 5;

    return Math.min(score, 100);
  }

  /**
   * Calculate optimal ask amount
   */
  private calculateOptimalAskAmount(
    capacity: CapacityRange,
    patterns: any,
    engagementScore: number
  ): number {
    // Base on capacity and engagement
    const baseAmount = (capacity.min + capacity.max) / 2;
    
    // Adjust based on engagement
    const engagementMultiplier = 0.5 + (engagementScore / 100) * 0.5;
    
    // Consider giving trend
    let trendMultiplier = 1.0;
    if (patterns.trend === 'increasing') trendMultiplier = 1.2;
    else if (patterns.trend === 'decreasing') trendMultiplier = 0.8;

    const optimalAmount = baseAmount * engagementMultiplier * trendMultiplier;

    // Round to nice number
    return Math.round(optimalAmount / 100) * 100;
  }

  /**
   * Generate recommended next steps
   */
  private async generateNextSteps(
    donor: Donor,
    capacity: CapacityRange,
    engagementScore: number,
    interests: DonorInterest[]
  ): Promise<RecommendedAction[]> {
    const actions: RecommendedAction[] = [];

    // High engagement donors
    if (engagementScore > 70) {
      actions.push({
        action: 'Schedule personal meeting',
        priority: 'high',
        timing: 'Within 2 weeks',
        reasoning: 'High engagement score indicates strong relationship',
        expectedOutcome: 'Deepen relationship and discuss major gift opportunity'
      });
    }

    // Medium engagement
    else if (engagementScore > 40) {
      actions.push({
        action: 'Send personalized update',
        priority: 'medium',
        timing: 'Within 1 month',
        reasoning: 'Maintain engagement with relevant updates',
        expectedOutcome: 'Keep donor informed and engaged'
      });
    }

    // Low engagement or lapsed
    else {
      actions.push({
        action: 'Re-engagement campaign',
        priority: 'medium',
        timing: 'Within 2 months',
        reasoning: 'Low engagement requires re-cultivation',
        expectedOutcome: 'Rekindle interest and relationship'
      });
    }

    // Interest-based actions
    if (interests.length > 0) {
      const topInterest = interests.sort((a, b) => b.strength - a.strength)[0];
      actions.push({
        action: `Share ${topInterest.category} impact story`,
        priority: 'medium',
        timing: 'Next communication',
        reasoning: `Donor has shown strong interest in ${topInterest.category}`,
        expectedOutcome: 'Reinforce alignment with donor interests'
      });
    }

    return actions;
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(donor: Donor, patterns: any): string[] {
    const risks: string[] = [];

    if (patterns.recency > 180) {
      risks.push('No gift in over 6 months - risk of lapsing');
    }

    if (patterns.trend === 'decreasing') {
      risks.push('Giving trend is decreasing');
    }

    if (patterns.consistency < 0.5) {
      risks.push('Inconsistent giving pattern');
    }

    if (donor.communicationPreferences.emailOptIn === false &&
        donor.communicationPreferences.phoneOptIn === false) {
      risks.push('Limited communication channels');
    }

    return risks;
  }

  /**
   * Identify opportunities
   */
  private identifyOpportunities(donor: Donor, interests: DonorInterest[]): string[] {
    const opportunities: string[] = [];

    if (interests.length > 0) {
      opportunities.push(`Strong interest in ${interests[0].category} - potential for targeted appeal`);
    }

    if (donor.relationships.length > 0) {
      opportunities.push('Has connections that could lead to additional prospects');
    }

    opportunities.push('Potential for recurring giving program');
    opportunities.push('Consider for planned giving discussion');

    return opportunities;
  }

  /**
   * Generate AI-powered analysis
   */
  private async generateAIAnalysis(
    donor: Donor,
    capacity: CapacityRange,
    interests: DonorInterest[],
    engagementScore: number
  ): Promise<string> {
    try {
      const prompt = `Provide a brief strategic analysis of this donor:

Donor: ${donor.firstName} ${donor.lastName}
Lifetime Giving: $${donor.totalLifetimeGiving}
Estimated Capacity: $${capacity.min} - $${capacity.max}
Engagement Score: ${engagementScore}/100
Top Interests: ${interests.slice(0, 3).map(i => i.category).join(', ')}

Provide a 2-3 sentence strategic analysis focusing on:
1. Overall donor potential
2. Key cultivation strategies
3. Timing recommendations`;

      const response = await this.aiGateway.generateText({
        prompt,
        maxTokens: 200,
        temperature: 0.7
      });

      return response.text;
    } catch (error) {
      logger.error('Error generating AI analysis', { error });
      return 'Analysis unavailable. Please review donor metrics manually.';
    }
  }

  /**
   * Helper methods
   */
  private determineEngagementTrend(patterns: any): 'increasing' | 'stable' | 'decreasing' {
    return patterns.trend;
  }

  private determineBestContactMethod(donor: Donor): ContactMethod {
    return donor.preferredContactMethod;
  }

  private determineBestContactTime(donor: Donor): string {
    // In real implementation, analyze interaction history
    return 'Weekday mornings (9-11 AM)';
  }

  private calculateOverallConfidence(
    capacityConfidence: number,
    interestCount: number,
    giftCount: number
  ): number {
    let confidence = capacityConfidence * 0.5;
    confidence += Math.min(interestCount / 5, 1) * 0.2;
    confidence += Math.min(giftCount / 10, 1) * 0.3;
    return Math.min(confidence, 1);
  }

  private generateRecommendations(intelligence: DonorIntelligence): string[] {
    const recommendations: string[] = [];

    recommendations.push(
      `Optimal ask amount: $${intelligence.optimalAskAmount.toLocaleString()}`
    );

    recommendations.push(
      `Best contact method: ${intelligence.bestContactMethod}`
    );

    if (intelligence.nextSteps.length > 0) {
      recommendations.push(
        `Priority action: ${intelligence.nextSteps[0].action}`
      );
    }

    if (intelligence.riskFactors.length > 0) {
      recommendations.push(
        `Address risk: ${intelligence.riskFactors[0]}`
      );
    }

    return recommendations;
  }

  /**
   * Get donor data (placeholder for database integration)
   */
  private async getDonorData(donorId: string): Promise<Donor> {
    // In real implementation, query database
    return {
      id: donorId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      donorType: 'individual' as any,
      status: 'active' as any,
      totalLifetimeGiving: 25000,
      givingHistory: [
        {
          id: '1',
          donorId,
          amount: 5000,
          date: new Date('2024-01-15'),
          designation: 'Scholarships',
          method: 'credit_card' as any,
          recurring: false,
          taxDeductible: true,
          acknowledged: true
        },
        {
          id: '2',
          donorId,
          amount: 10000,
          date: new Date('2024-06-20'),
          designation: 'General Fund',
          method: 'bank_transfer' as any,
          recurring: false,
          taxDeductible: true,
          acknowledged: true
        },
        {
          id: '3',
          donorId,
          amount: 10000,
          date: new Date('2024-11-10'),
          designation: 'Scholarships',
          method: 'credit_card' as any,
          recurring: false,
          taxDeductible: true,
          acknowledged: true
        }
      ],
      interests: ['Education', 'Scholarships', 'Student Support'],
      engagementLevel: 'high' as any,
      preferredContactMethod: 'email' as any,
      communicationPreferences: {
        emailOptIn: true,
        phoneOptIn: true,
        mailOptIn: true,
        frequency: 'monthly',
        topics: ['Impact Stories', 'Student Success']
      },
      relationships: [],
      notes: [],
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date()
    };
  }
}

export default DonorAnalysisService;
