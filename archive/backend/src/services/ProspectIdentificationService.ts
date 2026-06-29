/**
 * Prospect Identification Service
 * Identifies and prioritizes potential donors using AI analysis
 */

import {
  ProspectListResponse,
  ProspectProfile,
  ProspectSource,
  ProspectStatus,
  WealthIndicator
} from '../types/fundraising.types';
import { AIGatewayService } from './AIGatewayService';
import logger from '../utils/logger';

export class ProspectIdentificationService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Identify and prioritize donor prospects
   */
  async identifyProspects(
    source?: ProspectSource,
    minCapacity?: number
  ): Promise<ProspectListResponse> {
    try {
      logger.info('Identifying prospects', { source, minCapacity });

      // Get prospect pool from various sources
      const prospects = await this.gatherProspects(source);

      // Analyze each prospect
      const analyzedProspects = await Promise.all(
        prospects.map(p => this.analyzeProspect(p))
      );

      // Filter by minimum capacity if specified
      let filteredProspects = analyzedProspects;
      if (minCapacity) {
        filteredProspects = analyzedProspects.filter(
          p => p.estimatedCapacity >= minCapacity
        );
      }

      // Sort by overall score
      const sortedProspects = filteredProspects.sort(
        (a, b) => b.overallScore - a.overallScore
      );

      // Calculate metrics
      const highPriorityCount = sortedProspects.filter(
        p => p.priority === 'high'
      ).length;

      const estimatedTotalCapacity = sortedProspects.reduce(
        (sum, p) => sum + p.estimatedCapacity,
        0
      );

      logger.info('Prospects identified', {
        total: sortedProspects.length,
        highPriority: highPriorityCount,
        estimatedCapacity: estimatedTotalCapacity
      });

      return {
        prospects: sortedProspects,
        totalCount: sortedProspects.length,
        highPriorityCount,
        estimatedTotalCapacity
      };
    } catch (error) {
      logger.error('Error identifying prospects', { error, source, minCapacity });
      throw error;
    }
  }

  /**
   * Gather prospects from various sources
   */
  private async gatherProspects(source?: ProspectSource): Promise<Partial<ProspectProfile>[]> {
    // In real implementation, query database for prospects
    // For now, return mock data

    const mockProspects: Partial<ProspectProfile>[] = [
      {
        name: 'Michael Thompson',
        email: 'michael.thompson@example.com',
        phone: '555-0101',
        source: ProspectSource.ALUMNI,
        connections: ['Board Member John Smith', 'Professor Sarah Lee'],
        engagementHistory: [
          'Attended homecoming 2024',
          'Responded to alumni survey',
          'Opened 3 recent emails'
        ]
      },
      {
        name: 'Jennifer Martinez',
        email: 'jennifer.martinez@example.com',
        source: ProspectSource.PARENT,
        connections: ['Student: David Martinez (Class of 2025)'],
        engagementHistory: [
          'Attended parent orientation',
          'Volunteered at campus event',
          'Active in parent Facebook group'
        ]
      },
      {
        name: 'Robert Chen',
        email: 'robert.chen@techcorp.com',
        source: ProspectSource.COMMUNITY,
        connections: ['Tech industry leader', 'Christian business owner'],
        engagementHistory: [
          'Attended public lecture series',
          'Expressed interest in AI ethics program'
        ]
      },
      {
        name: 'Sarah Williams',
        email: 'sarah.williams@foundation.org',
        source: ProspectSource.REFERRAL,
        connections: ['Referred by donor James Wilson'],
        engagementHistory: [
          'Initial meeting completed',
          'Requested program information'
        ]
      },
      {
        name: 'David Anderson',
        email: 'david.anderson@example.com',
        source: ProspectSource.ALUMNI,
        connections: ['Class of 2010', 'Successful entrepreneur'],
        engagementHistory: [
          'Attended 15-year reunion',
          'Mentioned interest in giving back'
        ]
      }
    ];

    // Filter by source if specified
    if (source) {
      return mockProspects.filter(p => p.source === source);
    }

    return mockProspects;
  }

  /**
   * Analyze individual prospect
   */
  private async analyzeProspect(
    prospect: Partial<ProspectProfile>
  ): Promise<ProspectProfile> {
    try {
      // Research wealth indicators
      const wealthIndicators = await this.researchWealthIndicators(prospect);

      // Estimate giving capacity
      const estimatedCapacity = this.estimateCapacity(wealthIndicators, prospect);
      const capacityConfidence = this.calculateCapacityConfidence(wealthIndicators);

      // Calculate affinity score
      const affinityScore = this.calculateAffinityScore(prospect);

      // Calculate readiness score
      const readinessScore = this.calculateReadinessScore(prospect);

      // Calculate overall score
      const overallScore = this.calculateOverallScore(
        estimatedCapacity,
        affinityScore,
        readinessScore
      );

      // Determine priority
      const priority = this.determinePriority(overallScore, estimatedCapacity);

      // Identify interests
      const interests = this.identifyInterests(prospect);

      // Generate recommended strategy
      const recommendedStrategy = await this.generateStrategy(
        prospect,
        estimatedCapacity,
        affinityScore,
        readinessScore
      );

      return {
        id: this.generateProspectId(prospect.name!),
        name: prospect.name!,
        email: prospect.email,
        phone: prospect.phone,
        source: prospect.source!,
        estimatedCapacity,
        capacityConfidence,
        affinityScore,
        readinessScore,
        overallScore,
        interests,
        connections: prospect.connections || [],
        wealthIndicators,
        engagementHistory: prospect.engagementHistory || [],
        recommendedStrategy,
        priority,
        status: ProspectStatus.IDENTIFIED,
        notes: [],
        createdAt: new Date()
      };
    } catch (error) {
      logger.error('Error analyzing prospect', { error, prospect });
      throw error;
    }
  }

  /**
   * Research wealth indicators
   */
  private async researchWealthIndicators(
    prospect: Partial<ProspectProfile>
  ): Promise<WealthIndicator[]> {
    const indicators: WealthIndicator[] = [];

    // In real implementation, integrate with wealth screening services
    // For now, generate mock indicators based on source

    if (prospect.source === ProspectSource.ALUMNI) {
      indicators.push({
        type: 'Professional Position',
        value: 'Senior Executive',
        confidence: 0.7,
        source: 'LinkedIn'
      });

      indicators.push({
        type: 'Company Size',
        value: 'Fortune 500',
        confidence: 0.8,
        source: 'Public Records'
      });
    }

    if (prospect.source === ProspectSource.PARENT) {
      indicators.push({
        type: 'Property Ownership',
        value: 'Multiple properties',
        confidence: 0.6,
        source: 'Public Records'
      });
    }

    if (prospect.connections?.some(c => c.includes('entrepreneur') || c.includes('business owner'))) {
      indicators.push({
        type: 'Business Ownership',
        value: 'Private company owner',
        confidence: 0.75,
        source: 'Business Registry'
      });
    }

    // Add education indicator for alumni
    if (prospect.source === ProspectSource.ALUMNI) {
      indicators.push({
        type: 'Education',
        value: 'Advanced degree',
        confidence: 0.9,
        source: 'University Records'
      });
    }

    return indicators;
  }

  /**
   * Estimate giving capacity
   */
  private estimateCapacity(
    indicators: WealthIndicator[],
    prospect: Partial<ProspectProfile>
  ): number {
    let baseCapacity = 5000; // Default minimum

    // Adjust based on wealth indicators
    for (const indicator of indicators) {
      if (indicator.type === 'Professional Position') {
        if (indicator.value.includes('Executive') || indicator.value.includes('Senior')) {
          baseCapacity += 50000;
        }
      }

      if (indicator.type === 'Company Size') {
        if (indicator.value.includes('Fortune')) {
          baseCapacity += 100000;
        }
      }

      if (indicator.type === 'Business Ownership') {
        baseCapacity += 75000;
      }

      if (indicator.type === 'Property Ownership') {
        if (indicator.value.includes('Multiple')) {
          baseCapacity += 25000;
        }
      }
    }

    // Adjust based on source
    if (prospect.source === ProspectSource.FOUNDATION) {
      baseCapacity *= 5; // Foundations typically have higher capacity
    }

    return baseCapacity;
  }

  /**
   * Calculate capacity confidence
   */
  private calculateCapacityConfidence(indicators: WealthIndicator[]): number {
    if (indicators.length === 0) return 0.3;

    const avgConfidence = indicators.reduce((sum, i) => sum + i.confidence, 0) / indicators.length;
    const indicatorBonus = Math.min(indicators.length / 5, 0.2);

    return Math.min(avgConfidence + indicatorBonus, 0.95);
  }

  /**
   * Calculate affinity score (connection to institution)
   */
  private calculateAffinityScore(prospect: Partial<ProspectProfile>): number {
    let score = 0;

    // Source-based affinity
    const sourceScores: Record<ProspectSource, number> = {
      [ProspectSource.ALUMNI]: 40,
      [ProspectSource.PARENT]: 35,
      [ProspectSource.REFERRAL]: 25,
      [ProspectSource.COMMUNITY]: 20,
      [ProspectSource.EVENT]: 15,
      [ProspectSource.RESEARCH]: 10
    };

    score += sourceScores[prospect.source!] || 10;

    // Connection-based affinity
    const connectionCount = prospect.connections?.length || 0;
    score += Math.min(connectionCount * 10, 30);

    // Engagement-based affinity
    const engagementCount = prospect.engagementHistory?.length || 0;
    score += Math.min(engagementCount * 5, 30);

    return Math.min(score, 100);
  }

  /**
   * Calculate readiness score (likelihood to give soon)
   */
  private calculateReadinessScore(prospect: Partial<ProspectProfile>): number {
    let score = 0;

    // Recent engagement
    const recentEngagement = prospect.engagementHistory?.length || 0;
    score += Math.min(recentEngagement * 15, 45);

    // Active connections
    if (prospect.connections && prospect.connections.length > 0) {
      score += 25;
    }

    // Source readiness
    if (prospect.source === ProspectSource.REFERRAL) {
      score += 20; // Referrals are typically warmer
    } else if (prospect.source === ProspectSource.EVENT) {
      score += 15; // Event attendees show interest
    }

    // Expressed interest
    const expressedInterest = prospect.engagementHistory?.some(
      h => h.includes('interest') || h.includes('requested')
    );
    if (expressedInterest) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate overall prospect score
   */
  private calculateOverallScore(
    capacity: number,
    affinity: number,
    readiness: number
  ): number {
    // Weighted average
    const capacityScore = Math.min((capacity / 100000) * 100, 100);
    const weightedScore = (capacityScore * 0.4) + (affinity * 0.3) + (readiness * 0.3);

    return Math.round(weightedScore);
  }

  /**
   * Determine priority level
   */
  private determinePriority(
    overallScore: number,
    capacity: number
  ): 'high' | 'medium' | 'low' {
    if (overallScore >= 70 && capacity >= 50000) return 'high';
    if (overallScore >= 50 || capacity >= 25000) return 'medium';
    return 'low';
  }

  /**
   * Identify prospect interests
   */
  private identifyInterests(prospect: Partial<ProspectProfile>): string[] {
    const interests: string[] = [];

    // Infer from engagement history
    const history = prospect.engagementHistory || [];
    
    if (history.some(h => h.includes('AI') || h.includes('technology'))) {
      interests.push('Technology & Innovation');
    }

    if (history.some(h => h.includes('student') || h.includes('scholarship'))) {
      interests.push('Student Support');
    }

    if (prospect.source === ProspectSource.PARENT) {
      interests.push('Student Success', 'Academic Excellence');
    }

    if (prospect.source === ProspectSource.ALUMNI) {
      interests.push('Alumni Engagement', 'Institutional Growth');
    }

    // Default interests
    if (interests.length === 0) {
      interests.push('General Support', 'Mission Advancement');
    }

    return interests;
  }

  /**
   * Generate cultivation strategy
   */
  private async generateStrategy(
    prospect: Partial<ProspectProfile>,
    capacity: number,
    affinity: number,
    readiness: number
  ): Promise<string> {
    try {
      const prompt = `Generate a brief cultivation strategy for this donor prospect:

Prospect: ${prospect.name}
Source: ${prospect.source}
Estimated Capacity: $${capacity.toLocaleString()}
Affinity Score: ${affinity}/100
Readiness Score: ${readiness}/100
Connections: ${prospect.connections?.join(', ') || 'None'}
Recent Engagement: ${prospect.engagementHistory?.slice(0, 2).join(', ') || 'None'}

Provide a 2-3 sentence cultivation strategy focusing on:
1. Immediate next steps
2. Timeline for cultivation
3. Key relationship-building activities`;

      const response = await this.aiGateway.generateText({
        prompt,
        maxTokens: 200,
        temperature: 0.7
      });

      return response.text;
    } catch (error) {
      logger.error('Error generating strategy', { error });
      
      // Fallback strategy
      if (readiness > 60) {
        return `High readiness prospect. Schedule personal meeting within 2 weeks to discuss interests and potential support. Follow up with tailored proposal within 1 month.`;
      } else if (affinity > 60) {
        return `Strong affinity to institution. Begin cultivation with personalized communications highlighting areas of interest. Build relationship over 3-6 months before solicitation.`;
      } else {
        return `New prospect requiring cultivation. Start with informational materials and invitations to events. Build relationship over 6-12 months before discussing support.`;
      }
    }
  }

  /**
   * Generate prospect ID
   */
  private generateProspectId(name: string): string {
    const timestamp = Date.now();
    const nameHash = name.toLowerCase().replace(/\s+/g, '-');
    return `prospect-${nameHash}-${timestamp}`;
  }

  /**
   * Research specific prospect by name or email
   */
  async researchProspect(identifier: string): Promise<ProspectProfile> {
    try {
      logger.info('Researching specific prospect', { identifier });

      // In real implementation, search databases and external sources
      const prospects = await this.gatherProspects();
      const prospect = prospects.find(
        p => p.name === identifier || p.email === identifier
      );

      if (!prospect) {
        throw new Error(`Prospect not found: ${identifier}`);
      }

      return await this.analyzeProspect(prospect);
    } catch (error) {
      logger.error('Error researching prospect', { error, identifier });
      throw error;
    }
  }

  /**
   * Update prospect status
   */
  async updateProspectStatus(
    prospectId: string,
    status: ProspectStatus,
    notes?: string
  ): Promise<void> {
    try {
      logger.info('Updating prospect status', { prospectId, status });

      // In real implementation, update database
      // For now, just log the update

      logger.info('Prospect status updated', {
        prospectId,
        status,
        notes
      });
    } catch (error) {
      logger.error('Error updating prospect status', { error, prospectId });
      throw error;
    }
  }
}

export default ProspectIdentificationService;
