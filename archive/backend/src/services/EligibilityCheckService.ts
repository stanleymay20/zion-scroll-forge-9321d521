/**
 * Eligibility Check Service
 * "The Lord is my shepherd; I shall not want" - Psalm 23:1
 * 
 * Handles eligibility checking for scholarship applications
 */

import { PrismaClient } from '@prisma/client';
import {
  EligibilityCriteria,
  EligibilityCheckResult
} from '../types/scholarship.types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export default class EligibilityCheckService {
  /**
   * Check if a user is eligible for a scholarship
   */
  async checkEligibility(
    userId: string,
    criteria: EligibilityCriteria
  ): Promise<EligibilityCheckResult> {
    try {
      logger.info('Checking eligibility', { userId, criteria });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          enrollments: {
            include: {
              course: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const matchedCriteria: string[] = [];
      const failedCriteria: string[] = [];
      const recommendations: string[] = [];
      let score = 0;
      const maxScore = this.calculateMaxScore(criteria);

      // Check GPA
      if (criteria.minGPA !== undefined || criteria.maxGPA !== undefined) {
        const userGPA = await this.calculateUserGPA(userId);
        
        if (criteria.minGPA !== undefined && userGPA >= criteria.minGPA) {
          matchedCriteria.push(`GPA meets minimum requirement (${criteria.minGPA})`);
          score += 15;
        } else if (criteria.minGPA !== undefined) {
          failedCriteria.push(`GPA below minimum requirement (${criteria.minGPA})`);
          recommendations.push(`Improve your GPA to at least ${criteria.minGPA}`);
        }

        if (criteria.maxGPA !== undefined && userGPA <= criteria.maxGPA) {
          matchedCriteria.push(`GPA within maximum limit (${criteria.maxGPA})`);
          score += 5;
        }
      }

      // Check Age
      if (criteria.minAge !== undefined || criteria.maxAge !== undefined) {
        if (user.dateOfBirth) {
          const age = this.calculateAge(user.dateOfBirth);
          
          if (criteria.minAge !== undefined && age >= criteria.minAge) {
            matchedCriteria.push(`Age meets minimum requirement (${criteria.minAge})`);
            score += 5;
          } else if (criteria.minAge !== undefined) {
            failedCriteria.push(`Age below minimum requirement (${criteria.minAge})`);
          }

          if (criteria.maxAge !== undefined && age <= criteria.maxAge) {
            matchedCriteria.push(`Age within maximum limit (${criteria.maxAge})`);
            score += 5;
          } else if (criteria.maxAge !== undefined) {
            failedCriteria.push(`Age exceeds maximum limit (${criteria.maxAge})`);
          }
        } else {
          failedCriteria.push('Date of birth not provided');
          recommendations.push('Please update your profile with your date of birth');
        }
      }

      // Check Academic Level
      if (criteria.requiredAcademicLevel && criteria.requiredAcademicLevel.length > 0) {
        if (criteria.requiredAcademicLevel.includes(user.academicLevel)) {
          matchedCriteria.push(`Academic level matches requirement (${user.academicLevel})`);
          score += 10;
        } else {
          failedCriteria.push(`Academic level does not match requirements`);
        }
      }

      // Check Enrollment Status
      if (criteria.requiredEnrollmentStatus && criteria.requiredEnrollmentStatus.length > 0) {
        if (criteria.requiredEnrollmentStatus.includes(user.enrollmentStatus)) {
          matchedCriteria.push(`Enrollment status matches requirement (${user.enrollmentStatus})`);
          score += 10;
        } else {
          failedCriteria.push(`Enrollment status does not match requirements`);
        }
      }

      // Check Location
      if (criteria.requiredLocation && criteria.requiredLocation.length > 0) {
        if (user.location && criteria.requiredLocation.includes(user.location)) {
          matchedCriteria.push(`Location matches requirement (${user.location})`);
          score += 5;
        } else {
          failedCriteria.push(`Location does not match requirements`);
        }
      }

      // Check Ministry Experience
      if (criteria.requiredMinistryExperience) {
        // Check if user has ministry-related courses or experience
        const hasMinistryExperience = user.enrollments.some(e => 
          e.course.title.toLowerCase().includes('ministry') ||
          e.course.description.toLowerCase().includes('ministry')
        );

        if (hasMinistryExperience) {
          matchedCriteria.push('Has ministry experience');
          score += 15;
        } else {
          failedCriteria.push('Ministry experience required');
          recommendations.push('Complete ministry-focused courses or provide ministry experience documentation');
        }
      }

      // Check ScrollCoin Balance
      if (criteria.minScrollCoinBalance !== undefined) {
        if (user.scrollCoinBalance >= criteria.minScrollCoinBalance) {
          matchedCriteria.push(`ScrollCoin balance meets requirement (${criteria.minScrollCoinBalance})`);
          score += 10;
        } else {
          failedCriteria.push(`ScrollCoin balance below requirement (${criteria.minScrollCoinBalance})`);
          recommendations.push(`Earn more ScrollCoin to reach ${criteria.minScrollCoinBalance}`);
        }
      }

      // Check Spiritual Gifts
      if (criteria.requiredSpiritualGifts && criteria.requiredSpiritualGifts.length > 0) {
        const hasRequiredGifts = criteria.requiredSpiritualGifts.some(gift =>
          user.spiritualGifts.includes(gift)
        );

        if (hasRequiredGifts) {
          matchedCriteria.push('Has required spiritual gifts');
          score += 10;
        } else {
          failedCriteria.push('Required spiritual gifts not identified');
          recommendations.push('Complete spiritual gifts assessment');
        }
      }

      // Check Course Completion
      if (criteria.requiredCourseCompletion && criteria.requiredCourseCompletion.length > 0) {
        const completedCourses = user.enrollments
          .filter(e => e.status === 'COMPLETED')
          .map(e => e.courseId);

        const hasRequiredCourses = criteria.requiredCourseCompletion.every(courseId =>
          completedCourses.includes(courseId)
        );

        if (hasRequiredCourses) {
          matchedCriteria.push('All required courses completed');
          score += 15;
        } else {
          failedCriteria.push('Not all required courses completed');
          recommendations.push('Complete all prerequisite courses');
        }
      }

      // Calculate final score as percentage
      const finalScore = maxScore > 0 ? (score / maxScore) * 100 : 0;
      const eligible = failedCriteria.length === 0 && finalScore >= 60;

      logger.info('Eligibility check completed', {
        userId,
        eligible,
        score: finalScore,
        matchedCriteria: matchedCriteria.length,
        failedCriteria: failedCriteria.length
      });

      return {
        eligible,
        score: finalScore,
        matchedCriteria,
        failedCriteria,
        recommendations,
        details: {
          userGPA: await this.calculateUserGPA(userId),
          userAge: user.dateOfBirth ? this.calculateAge(user.dateOfBirth) : null,
          academicLevel: user.academicLevel,
          enrollmentStatus: user.enrollmentStatus,
          scrollCoinBalance: user.scrollCoinBalance,
          completedCourses: user.enrollments.filter(e => e.status === 'COMPLETED').length
        }
      };
    } catch (error) {
      logger.error('Error checking eligibility', { error, userId });
      throw new Error(`Failed to check eligibility: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate maximum possible score based on criteria
   */
  private calculateMaxScore(criteria: EligibilityCriteria): number {
    let maxScore = 0;

    if (criteria.minGPA !== undefined) maxScore += 15;
    if (criteria.maxGPA !== undefined) maxScore += 5;
    if (criteria.minAge !== undefined) maxScore += 5;
    if (criteria.maxAge !== undefined) maxScore += 5;
    if (criteria.requiredAcademicLevel && criteria.requiredAcademicLevel.length > 0) maxScore += 10;
    if (criteria.requiredEnrollmentStatus && criteria.requiredEnrollmentStatus.length > 0) maxScore += 10;
    if (criteria.requiredLocation && criteria.requiredLocation.length > 0) maxScore += 5;
    if (criteria.requiredMinistryExperience) maxScore += 15;
    if (criteria.minScrollCoinBalance !== undefined) maxScore += 10;
    if (criteria.requiredSpiritualGifts && criteria.requiredSpiritualGifts.length > 0) maxScore += 10;
    if (criteria.requiredCourseCompletion && criteria.requiredCourseCompletion.length > 0) maxScore += 15;

    return maxScore || 100; // Default to 100 if no criteria
  }

  /**
   * Calculate user's GPA
   */
  private async calculateUserGPA(userId: string): Promise<number> {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          finalGrade: { not: null }
        }
      });

      if (enrollments.length === 0) {
        return 0;
      }

      const totalGrade = enrollments.reduce((sum, e) => sum + (e.finalGrade || 0), 0);
      return totalGrade / enrollments.length;
    } catch (error) {
      logger.error('Error calculating GPA', { error, userId });
      return 0;
    }
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Batch check eligibility for multiple users
   */
  async batchCheckEligibility(
    userIds: string[],
    criteria: EligibilityCriteria
  ): Promise<Map<string, EligibilityCheckResult>> {
    const results = new Map<string, EligibilityCheckResult>();

    for (const userId of userIds) {
      try {
        const result = await this.checkEligibility(userId, criteria);
        results.set(userId, result);
      } catch (error) {
        logger.error('Error in batch eligibility check', { error, userId });
      }
    }

    return results;
  }
}
