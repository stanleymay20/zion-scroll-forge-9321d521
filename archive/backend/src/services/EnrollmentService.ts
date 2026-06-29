// Student Enrollment Service
// "Commit to the LORD whatever you do, and he will establish your plans" - Proverbs 16:3

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import {
  EnrollmentRequest,
  EnrollmentResponse,
  BulkEnrollmentRequest,
  BulkEnrollmentResult
} from '../types/enrollment.types';

const prisma = new PrismaClient();

export class EnrollmentService {
  /**
   * Create a new course enrollment for a student
   */
  async createEnrollment(request: EnrollmentRequest): Promise<EnrollmentResponse> {
    try {
      logger.info('Creating enrollment', { userId: request.userId, courseId: request.courseId });

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: request.userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify course exists and is active
      const course = await prisma.course.findUnique({
        where: { id: request.courseId }
      });

      if (!course) {
        throw new Error('Course not found');
      }

      if (!course.isActive) {
        throw new Error('Course is not currently available for enrollment');
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: request.userId,
            courseId: request.courseId
          }
        }
      });

      if (existingEnrollment) {
        throw new Error('User is already enrolled in this course');
      }

      // Check prerequisites
      if (course.prerequisites && course.prerequisites.length > 0) {
        const completedCourses = await prisma.enrollment.findMany({
          where: {
            userId: request.userId,
            courseId: { in: course.prerequisites },
            status: 'ACTIVE',
            completedAt: { not: null }
          }
        });

        if (completedCourses.length < course.prerequisites.length) {
          throw new Error('Prerequisites not met for this course');
        }
      }

      // Process payment if required
      if (course.scrollCoinCost > 0) {
        await this.processEnrollmentPayment(request, course.scrollCoinCost);
      }

      // Calculate expiration date (1 year from now)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      // Create enrollment
      const enrollment = await prisma.enrollment.create({
        data: {
          userId: request.userId,
          courseId: request.courseId,
          status: 'ACTIVE',
          progress: 0,
          scrollXPEarned: 0,
          currentModule: 1,
          startedAt: new Date(),
          expiresAt
        }
      });

      logger.info('Enrollment created successfully', { enrollmentId: enrollment.id });

      return {
        enrollmentId: enrollment.id,
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        status: enrollment.status,
        progress: enrollment.progress,
        startedAt: enrollment.startedAt,
        expiresAt: enrollment.expiresAt || undefined,
        scrollXPEarned: enrollment.scrollXPEarned,
        currentModule: enrollment.currentModule
      };
    } catch (error) {
      logger.error('Error creating enrollment', { error, request });
      throw error;
    }
  }

  /**
   * Process payment for enrollment
   */
  private async processEnrollmentPayment(
    request: EnrollmentRequest,
    amount: number
  ): Promise<void> {
    const paymentMethod = request.paymentMethod || 'scroll_coin';

    if (paymentMethod === 'scroll_coin') {
      // Check user balance
      const user = await prisma.user.findUnique({
        where: { id: request.userId }
      });

      if (!user || user.scrollCoinBalance < amount) {
        throw new Error('Insufficient ScrollCoin balance');
      }

      // Deduct ScrollCoin
      await prisma.user.update({
        where: { id: request.userId },
        data: {
          scrollCoinBalance: {
            decrement: amount
          }
        }
      });

      // Record transaction
      await prisma.scrollCoinTransaction.create({
        data: {
          userId: request.userId,
          amount: -amount,
          type: 'SPENT',
          description: `Course enrollment payment`,
          activityType: 'COURSE_COMPLETION'
        }
      });
    } else if (paymentMethod === 'scholarship') {
      if (!request.scholarshipId) {
        throw new Error('Scholarship ID required for scholarship payment');
      }

      // Verify scholarship eligibility
      const scholarship = await prisma.scholarship.findUnique({
        where: { scholarshipId: request.scholarshipId }
      });

      if (!scholarship || !scholarship.isActive) {
        throw new Error('Invalid or inactive scholarship');
      }

      // Record scholarship payment
      await prisma.payment.create({
        data: {
          userId: request.userId,
          amount: amount,
          currency: 'ScrollCoin',
          method: 'SCHOLARSHIP',
          description: `Scholarship payment for course enrollment`,
          status: 'COMPLETED'
        }
      });
    } else if (paymentMethod === 'work_trade') {
      // Check work-trade credits
      const user = await prisma.user.findUnique({
        where: { id: request.userId }
      });

      if (!user || user.workTradeCredits < amount) {
        throw new Error('Insufficient work-trade credits');
      }

      // Deduct work-trade credits
      await prisma.user.update({
        where: { id: request.userId },
        data: {
          workTradeCredits: {
            decrement: amount
          }
        }
      });

      // Record payment
      await prisma.payment.create({
        data: {
          userId: request.userId,
          amount: amount,
          currency: 'WorkTradeCredits',
          method: 'WORK_TRADE',
          description: `Work-trade payment for course enrollment`,
          status: 'COMPLETED'
        }
      });
    }
  }

  /**
   * Get enrollment by ID
   */
  async getEnrollment(enrollmentId: string): Promise<EnrollmentResponse | null> {
    try {
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          course: true,
          user: true
        }
      });

      if (!enrollment) {
        return null;
      }

      return {
        enrollmentId: enrollment.id,
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        status: enrollment.status,
        progress: enrollment.progress,
        startedAt: enrollment.startedAt,
        expiresAt: enrollment.expiresAt || undefined,
        scrollXPEarned: enrollment.scrollXPEarned,
        currentModule: enrollment.currentModule
      };
    } catch (error) {
      logger.error('Error getting enrollment', { error, enrollmentId });
      throw error;
    }
  }

  /**
   * Get all enrollments for a user
   */
  async getUserEnrollments(userId: string): Promise<EnrollmentResponse[]> {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: true
        },
        orderBy: {
          startedAt: 'desc'
        }
      });

      return enrollments.map(enrollment => ({
        enrollmentId: enrollment.id,
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        status: enrollment.status,
        progress: enrollment.progress,
        startedAt: enrollment.startedAt,
        expiresAt: enrollment.expiresAt || undefined,
        scrollXPEarned: enrollment.scrollXPEarned,
        currentModule: enrollment.currentModule
      }));
    } catch (error) {
      logger.error('Error getting user enrollments', { error, userId });
      throw error;
    }
  }

  /**
   * Update enrollment progress
   */
  async updateProgress(
    enrollmentId: string,
    progress: number,
    currentModule?: number
  ): Promise<EnrollmentResponse> {
    try {
      const updateData: any = {
        progress,
        updatedAt: new Date()
      };

      if (currentModule !== undefined) {
        updateData.currentModule = currentModule;
      }

      // Check if course is completed
      if (progress >= 100) {
        updateData.completedAt = new Date();
        updateData.status = 'ACTIVE'; // Keep active even after completion

        // Award ScrollXP
        const enrollment = await prisma.enrollment.findUnique({
          where: { id: enrollmentId },
          include: { course: true }
        });

        if (enrollment) {
          updateData.scrollXPEarned = enrollment.course.scrollXPReward;

          // Award ScrollCoin bonus
          await prisma.scrollCoinTransaction.create({
            data: {
              userId: enrollment.userId,
              amount: enrollment.course.scrollXPReward,
              type: 'EARNED',
              description: `Course completion reward: ${enrollment.course.title}`,
              activityType: 'COURSE_COMPLETION'
            }
          });

          // Update user balance
          await prisma.user.update({
            where: { id: enrollment.userId },
            data: {
              scrollCoinBalance: {
                increment: enrollment.course.scrollXPReward
              }
            }
          });
        }
      }

      const updatedEnrollment = await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: updateData
      });

      return {
        enrollmentId: updatedEnrollment.id,
        userId: updatedEnrollment.userId,
        courseId: updatedEnrollment.courseId,
        status: updatedEnrollment.status,
        progress: updatedEnrollment.progress,
        startedAt: updatedEnrollment.startedAt,
        expiresAt: updatedEnrollment.expiresAt || undefined,
        scrollXPEarned: updatedEnrollment.scrollXPEarned,
        currentModule: updatedEnrollment.currentModule
      };
    } catch (error) {
      logger.error('Error updating enrollment progress', { error, enrollmentId });
      throw error;
    }
  }

  /**
   * Withdraw from a course
   */
  async withdrawEnrollment(enrollmentId: string, reason?: string): Promise<void> {
    try {
      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'WITHDRAWN'
        }
      });

      logger.info('Enrollment withdrawn', { enrollmentId, reason });
    } catch (error) {
      logger.error('Error withdrawing enrollment', { error, enrollmentId });
      throw error;
    }
  }

  /**
   * Bulk enroll users in a course
   */
  async bulkEnroll(request: BulkEnrollmentRequest): Promise<BulkEnrollmentResult> {
    const results: BulkEnrollmentResult = {
      totalRequested: request.userIds.length,
      successful: 0,
      failed: 0,
      results: []
    };

    for (const userId of request.userIds) {
      try {
        const enrollment = await this.createEnrollment({
          userId,
          courseId: request.courseId,
          paymentMethod: request.paymentMethod as any,
          scholarshipId: request.scholarshipId,
          notes: request.notes
        });

        results.successful++;
        results.results.push({
          userId,
          success: true,
          enrollmentId: enrollment.enrollmentId
        });
      } catch (error) {
        results.failed++;
        results.results.push({
          userId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.info('Bulk enrollment completed', results);
    return results;
  }

  /**
   * Get enrollment statistics
   */
  async getEnrollmentStats(courseId?: string): Promise<any> {
    try {
      const where = courseId ? { courseId } : {};

      const [total, active, completed, withdrawn] = await Promise.all([
        prisma.enrollment.count({ where }),
        prisma.enrollment.count({ where: { ...where, status: 'ACTIVE' } }),
        prisma.enrollment.count({ where: { ...where, completedAt: { not: null } } }),
        prisma.enrollment.count({ where: { ...where, status: 'WITHDRAWN' } })
      ]);

      return {
        total,
        active,
        completed,
        withdrawn,
        completionRate: total > 0 ? (completed / total) * 100 : 0
      };
    } catch (error) {
      logger.error('Error getting enrollment stats', { error, courseId });
      throw error;
    }
  }
}

export default new EnrollmentService();
