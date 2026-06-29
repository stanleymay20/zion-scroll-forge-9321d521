/**
 * Scholarship Recommendation Service
 * "Trust in the Lord with all your heart" - Proverbs 3:5
 * 
 * Provides personalized scholarship recommendations
 */

import { PrismaClient } from '@prisma/client';
import {
  ScholarshipRecommendation,
  ScholarshipData
} from '../types/scholarship.types';
import logger from '../utils/logger';
import EligibilityCheckService from './EligibilityCheckService';

const prisma = new PrismaClient();

export default class ScholarshipRecommendationService {
  private eligibilityService: EligibilityCheckService;

  constructor() {
    this.eligibilityService = new EligibilityCheckService();
  }

  /**
   * Get personalized scholarship recommendations for a user
   */
  async getRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<ScholarshipRecommendation[]> {
    try {
      logger.info('Generating scholarship recommendations', { userId, limit });

      // Get user profile
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          enrollments: {
            include: { course: true }
          },
          scholarshipApplications: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get active scholarships
      const scholarships = await prisma.scholarship.findMany({
        where: {
          status: 'ACTIVE',
          applicationDeadline: {
            gte: new Date()
          }
        }
      });

      // Filter out scholarships user has already applied to
      const appliedScholarshipIds = user.scholarshipApplications.map(app => app.scholarshipId);
      const availableScholarships = scholarships.filter(s => !appliedScholarshipIds.includes(s.id));

      // Calculate match scores for each scholarship
      const recommendations: ScholarshipRecommendation[] = [];

      for (const scholarship of availableScholarships) {
        const eligibilityResult = await this.eligibilityService.checkEligibility(
          userId,
          scholarship.eligibilityCriteria as any
        );

        const matchScore = this.calculateMatchScore(user, scholarship, eligibilityResult.score);
        const matchReasons = this.generateMatchReasons(user, scholarship, eligibilityResult);
        const estimatedChance = this.estimateSuccessChance(eligibilityResult.score, scholarship);

        recommendations.push({
          scholarship: this.mapToScholarshipData(scholarship),
          matchScore,
          matchReasons,
          eligibilityStatus: eligibilityResult,
          applicationDeadline: scholarship.applicationDeadline,
          estimatedChanceOfSuccess: estimatedChance
        });
      }

      // Sort by match score and return top recommendations
      recommendations.sort((a, b) => b.matchScore - a.matchScore);

      logger.info('Recommendations generated', { userId, count: recommendations.length });

      return recommendations.slice(0, limit);
    } catch (error) {
      logger.error('Error generating recommendations', { error, userId });
      throw new Error(`Failed to generate recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate match score between user and scholarship
   */
  private calculateMatchScore(user: any, scholarship: any, eligibilityScore: number): number {
    let score = eligibilityScore * 0.5; // Eligibility is 50% of the score

    const criteria = scholarship.eligibilityCriteria;

    // Academic alignment (20%)
    if (criteria.requiredAcademicLevel && criteria.requiredAcademicLevel.includes(user.academicLevel)) {
      score += 20;
    }

    // Spiritual alignment (15%)
    if (scholarship.type === 'MINISTRY_FOCUSED' || scholarship.type === 'SPIRITUAL_LEADERSHIP') {
      if (user.scrollCalling || user.spiritualGifts.length > 0) {
        score += 15;
      }
    }

    // Financial need alignment (10%)
    if (scholarship.type === 'NEED_BASED') {
      // Could be enhanced with actual financial need assessment
      score += 10;
    }

    // Location match (5%)
    if (criteria.requiredLocation && user.location && criteria.requiredLocation.includes(user.location)) {
      score += 5;
    }

    return Math.min(score, 100);
  }

  /**
   * Generate match reasons
   */
  private generateMatchReasons(user: any, scholarship: any, eligibilityResult: any): string[] {
    const reasons: string[] = [];

    // Add eligibility-based reasons
    if (eligibilityResult.eligible) {
      reasons.push('You meet all eligibility requirements');
    }

    // Add type-specific reasons
    switch (scholarship.type) {
      case 'MERIT_BASED':
        if (eligibilityResult.details.userGPA >= 3.5) {
          reasons.push('Your strong academic performance makes you a great candidate');
        }
        break;
      case 'MINISTRY_FOCUSED':
        if (user.scrollCalling) {
          reasons.push('Your ministry calling aligns with this scholarship');
        }
        break;
      case 'SPIRITUAL_LEADERSHIP':
        if (user.spiritualGifts.length > 0) {
          reasons.push('Your spiritual gifts match the scholarship focus');
        }
        break;
      case 'COMMUNITY_SERVICE':
        if (user.enrollments.some((e: any) => e.course.title.toLowerCase().includes('service'))) {
          reasons.push('Your community service experience is relevant');
        }
        break;
    }

    // Add ScrollCoin-based reasons
    if (user.scrollCoinBalance > 1000) {
      reasons.push('Your ScrollCoin balance demonstrates active engagement');
    }

    // Add deadline urgency
    const daysUntilDeadline = Math.ceil(
      (scholarship.applicationDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilDeadline <= 7) {
      reasons.push(`Application deadline is in ${daysUntilDeadline} days`);
    }

    // Add funding availability
    if (scholarship.remainingFunding > scholarship.amount * 5) {
      reasons.push('Ample funding still available');
    }

    return reasons.slice(0, 5); // Return top 5 reasons
  }

  /**
   * Estimate success chance
   */
  private estimateSuccessChance(eligibilityScore: number, scholarship: any): number {
    // Base chance on eligibility score
    let chance = eligibilityScore * 0.6;

    // Adjust based on competition
    const competitionRatio = scholarship.currentRecipients / scholarship.maxRecipients;
    if (competitionRatio < 0.5) {
      chance += 20; // Less competition
    } else if (competitionRatio < 0.8) {
      chance += 10;
    }

    // Adjust based on remaining funding
    const fundingRatio = scholarship.remainingFunding / scholarship.totalFunding;
    if (fundingRatio > 0.5) {
      chance += 10;
    }

    return Math.min(chance, 95); // Cap at 95%
  }

  /**
   * Get trending scholarships
   */
  async getTrendingScholarships(limit: number = 5): Promise<ScholarshipData[]> {
    try {
      // Get scholarships with most applications in the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const scholarships = await prisma.scholarship.findMany({
        where: {
          status: 'ACTIVE',
          applicationDeadline: {
            gte: new Date()
          }
        },
        include: {
          applications: {
            where: {
              createdAt: {
                gte: thirtyDaysAgo
              }
            }
          }
        }
      });

      // Sort by application count
      scholarships.sort((a, b) => b.applications.length - a.applications.length);

      return scholarships.slice(0, limit).map(s => this.mapToScholarshipData(s));
    } catch (error) {
      logger.error('Error fetching trending scholarships', { error });
      throw new Error(`Failed to fetch trending scholarships: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get scholarships expiring soon
   */
  async getExpiringSoon(days: number = 7, limit: number = 10): Promise<ScholarshipData[]> {
    try {
      const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      const scholarships = await prisma.scholarship.findMany({
        where: {
          status: 'ACTIVE',
          applicationDeadline: {
            gte: new Date(),
            lte: futureDate
          }
        },
        orderBy: {
          applicationDeadline: 'asc'
        },
        take: limit
      });

      return scholarships.map(s => this.mapToScholarshipData(s));
    } catch (error) {
      logger.error('Error fetching expiring scholarships', { error });
      throw new Error(`Failed to fetch expiring scholarships: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get similar scholarships
   */
  async getSimilarScholarships(scholarshipId: string, limit: number = 5): Promise<ScholarshipData[]> {
    try {
      const scholarship = await prisma.scholarship.findUnique({
        where: { id: scholarshipId }
      });

      if (!scholarship) {
        throw new Error('Scholarship not found');
      }

      // Find scholarships with similar type and amount
      const similarScholarships = await prisma.scholarship.findMany({
        where: {
          id: { not: scholarshipId },
          status: 'ACTIVE',
          type: scholarship.type,
          amount: {
            gte: scholarship.amount * 0.7,
            lte: scholarship.amount * 1.3
          },
          applicationDeadline: {
            gte: new Date()
          }
        },
        take: limit
      });

      return similarScholarships.map(s => this.mapToScholarshipData(s));
    } catch (error) {
      logger.error('Error fetching similar scholarships', { error, scholarshipId });
      throw new Error(`Failed to fetch similar scholarships: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map database model to ScholarshipData
   */
  private mapToScholarshipData(scholarship: any): ScholarshipData {
    return {
      id: scholarship.id,
      name: scholarship.name,
      description: scholarship.description,
      type: scholarship.type,
      status: scholarship.status,
      amount: Number(scholarship.amount),
      currency: scholarship.currency,
      totalFunding: Number(scholarship.totalFunding),
      remainingFunding: Number(scholarship.remainingFunding),
      maxRecipients: scholarship.maxRecipients,
      currentRecipients: scholarship.currentRecipients,
      eligibilityCriteria: scholarship.eligibilityCriteria,
      applicationDeadline: scholarship.applicationDeadline,
      awardDate: scholarship.awardDate,
      disbursementSchedule: scholarship.disbursementSchedule || [],
      renewalEligible: scholarship.renewalEligible,
      renewalCriteria: scholarship.renewalCriteria,
      createdById: scholarship.createdById,
      createdAt: scholarship.createdAt,
      updatedAt: scholarship.updatedAt
    };
  }
}
