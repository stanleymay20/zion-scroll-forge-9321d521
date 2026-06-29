/**
 * ScrollUniversity Transcript Service
 * "A good name is more desirable than great riches" - Proverbs 22:1
 * 
 * Manages academic transcripts, grade calculations, and GPA tracking
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/productionLogger';

const prisma = new PrismaClient();

export interface GradeCalculation {
  courseId: string;
  courseTitle: string;
  creditHours: number;
  letterGrade: string;
  gradePoints: number;
  percentage: number;
}

export interface TranscriptData {
  studentId: string;
  studentName: string;
  enrollmentStatus: string;
  academicLevel: string;
  overallGPA: number;
  totalCreditHours: number;
  scrollXP: number;
  courses: GradeCalculation[];
  scrollMetrics: {
    scrollAlignment: number;
    kingdomImpact: number;
    innovationScore: number;
  };
}

export class TranscriptService {
  /**
   * Update grade for a specific assignment
   */
  async updateGrade(
    userId: string,
    assignmentId: string,
    score: number
  ): Promise<void> {
    try {
      logger.info('Updating grade', { userId, assignmentId, score });

      // Get assignment and course info
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: { course: true }
      });

      if (!assignment) {
        throw new Error('Assignment not found');
      }

      // Update enrollment progress
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId,
          courseId: assignment.courseId
        }
      });

      if (enrollment) {
        // Recalculate course progress
        await this.recalculateCourseProgress(enrollment.id);
      }

      // Award ScrollXP based on performance
      const xpEarned = this.calculateScrollXP(score, assignment.maxPoints);
      if (xpEarned > 0) {
        await this.awardScrollXP(userId, xpEarned, `Assignment: ${assignment.title}`);
      }

      logger.info('Grade updated successfully', { userId, assignmentId, xpEarned });

    } catch (error: any) {
      logger.error('Update grade error', { error: error.message });
      throw error;
    }
  }

  /**
   * Recalculate course progress based on completed assignments
   */
  async recalculateCourseProgress(enrollmentId: string): Promise<void> {
    try {
      // Get all submissions for this enrollment
      const submissions = await prisma.submission.findMany({
        where: {
          enrollmentId,
          status: 'GRADED'
        },
        include: {
          assignment: true
        }
      });

      if (submissions.length === 0) {
        return;
      }

      // Calculate average score
      const totalScore = submissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
      const averageScore = totalScore / submissions.length;

      // Calculate progress percentage (based on completed assignments)
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          course: {
            include: {
              assignments: true
            }
          }
        }
      });

      if (!enrollment) return;

      const totalAssignments = enrollment.course.assignments.length;
      const completedAssignments = submissions.length;
      const progressPercentage = (completedAssignments / totalAssignments) * 100;

      // Update enrollment
      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          progress: progressPercentage
        }
      });

      // Check if course is completed
      if (progressPercentage >= 100 && averageScore >= 70) {
        await this.completeCourse(enrollmentId, averageScore);
      }

    } catch (error: any) {
      logger.error('Recalculate progress error', { error: error.message });
      throw error;
    }
  }

  /**
   * Complete a course and award final grade
   */
  async completeCourse(enrollmentId: string, finalScore: number): Promise<void> {
    try {
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          course: true,
          user: true
        }
      });

      if (!enrollment) return;

      // Update enrollment status
      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'ACTIVE',
          completedAt: new Date(),
          progress: 100
        }
      });

      // Award course completion ScrollXP
      const completionXP = enrollment.course.scrollXPReward;
      await this.awardScrollXP(
        enrollment.userId,
        completionXP,
        `Course Completion: ${enrollment.course.title}`
      );

      // Award ScrollCoin
      const scrollCoinReward = this.calculateScrollCoinReward(finalScore);
      await this.awardScrollCoin(
        enrollment.userId,
        scrollCoinReward,
        `Course Completion: ${enrollment.course.title}`
      );

      logger.info('Course completed', {
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        finalScore,
        xpAwarded: completionXP,
        scrollCoinAwarded: scrollCoinReward
      });

    } catch (error: any) {
      logger.error('Complete course error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get complete transcript for a student
   */
  async getTranscript(userId: string): Promise<TranscriptData> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          enrollments: {
            where: {
              completedAt: { not: null }
            },
            include: {
              course: true,
              submissions: {
                where: { status: 'GRADED' }
              }
            }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Calculate grades for each course
      const courses: GradeCalculation[] = [];
      let totalGradePoints = 0;
      let totalCreditHours = 0;

      for (const enrollment of user.enrollments) {
        const courseGrade = await this.calculateCourseGrade(enrollment);
        courses.push(courseGrade);
        
        totalGradePoints += courseGrade.gradePoints * courseGrade.creditHours;
        totalCreditHours += courseGrade.creditHours;
      }

      const overallGPA = totalCreditHours > 0 ? totalGradePoints / totalCreditHours : 0;

      // Calculate scroll metrics
      const scrollMetrics = await this.calculateScrollMetrics(userId);

      return {
        studentId: user.id,
        studentName: `${user.firstName} ${user.lastName}`,
        enrollmentStatus: user.enrollmentStatus,
        academicLevel: user.academicLevel,
        overallGPA: Math.round(overallGPA * 100) / 100,
        totalCreditHours,
        scrollXP: 0, // Would come from a separate XP tracking system
        courses,
        scrollMetrics
      };

    } catch (error: any) {
      logger.error('Get transcript error', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate final grade for a course
   */
  private async calculateCourseGrade(enrollment: any): Promise<GradeCalculation> {
    const submissions = enrollment.submissions;
    
    if (submissions.length === 0) {
      return {
        courseId: enrollment.courseId,
        courseTitle: enrollment.course.title,
        creditHours: 3, // Default credit hours
        letterGrade: 'IP',
        gradePoints: 0,
        percentage: 0
      };
    }

    // Calculate weighted average
    const totalScore = submissions.reduce((sum: number, sub: any) => sum + (sub.score || 0), 0);
    const averageScore = totalScore / submissions.length;

    const letterGrade = this.calculateLetterGrade(averageScore);
    const gradePoints = this.getGradePoints(letterGrade);

    return {
      courseId: enrollment.courseId,
      courseTitle: enrollment.course.title,
      creditHours: 3, // Default credit hours
      letterGrade,
      gradePoints,
      percentage: Math.round(averageScore * 100) / 100
    };
  }

  /**
   * Calculate letter grade from percentage
   */
  private calculateLetterGrade(percentage: number): string {
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 63) return 'D';
    if (percentage >= 60) return 'D-';
    return 'F';
  }

  /**
   * Get grade points for letter grade
   */
  private getGradePoints(letterGrade: string): number {
    const gradeMap: { [key: string]: number } = {
      'A': 4.0,
      'A-': 3.7,
      'B+': 3.3,
      'B': 3.0,
      'B-': 2.7,
      'C+': 2.3,
      'C': 2.0,
      'C-': 1.7,
      'D+': 1.3,
      'D': 1.0,
      'D-': 0.7,
      'F': 0.0,
      'IP': 0.0
    };

    return gradeMap[letterGrade] || 0.0;
  }

  /**
   * Calculate ScrollXP earned from assignment
   */
  private calculateScrollXP(score: number, maxPoints: number): number {
    const percentage = (score / maxPoints) * 100;
    
    // Base XP
    let xp = Math.floor(maxPoints / 10);
    
    // Bonus for excellence
    if (percentage >= 90) {
      xp = Math.floor(xp * 1.5);
    } else if (percentage >= 80) {
      xp = Math.floor(xp * 1.2);
    }
    
    return xp;
  }

  /**
   * Calculate ScrollCoin reward for course completion
   */
  private calculateScrollCoinReward(finalScore: number): number {
    let baseReward = 10;
    
    if (finalScore >= 95) {
      baseReward = 20;
    } else if (finalScore >= 90) {
      baseReward = 15;
    } else if (finalScore >= 80) {
      baseReward = 12;
    }
    
    return baseReward;
  }

  /**
   * Award ScrollXP to user
   */
  private async awardScrollXP(
    userId: string,
    amount: number,
    description: string
  ): Promise<void> {
    // This would integrate with the ScrollXP system
    logger.info('ScrollXP awarded', { userId, amount, description });
  }

  /**
   * Award ScrollCoin to user
   */
  private async awardScrollCoin(
    userId: string,
    amount: number,
    description: string
  ): Promise<void> {
    try {
      await prisma.scrollCoinTransaction.create({
        data: {
          userId,
          amount,
          type: 'EARNED',
          description,
          activityType: 'COURSE_COMPLETION'
        }
      });

      // Update user balance
      await prisma.user.update({
        where: { id: userId },
        data: {
          scrollCoinBalance: {
            increment: amount
          }
        }
      });

      logger.info('ScrollCoin awarded', { userId, amount, description });

    } catch (error: any) {
      logger.error('Award ScrollCoin error', { error: error.message });
    }
  }

  /**
   * Calculate scroll-specific metrics
   */
  private async calculateScrollMetrics(userId: string): Promise<{
    scrollAlignment: number;
    kingdomImpact: number;
    innovationScore: number;
  }> {
    // Get all graded submissions
    const submissions = await prisma.submission.findMany({
      where: {
        enrollment: {
          userId
        },
        status: 'GRADED'
      }
    });

    if (submissions.length === 0) {
      return {
        scrollAlignment: 0,
        kingdomImpact: 0,
        innovationScore: 0
      };
    }

    // Calculate averages
    const scrollAlignment = submissions.reduce((sum, sub) => sum + (sub.scrollAlignment || 0), 0) / submissions.length;
    const kingdomImpact = submissions.reduce((sum, sub) => sum + (sub.kingdomImpact || 0), 0) / submissions.length;
    
    // Innovation score based on project work
    const innovationScore = scrollAlignment * 0.7 + kingdomImpact * 0.3;

    return {
      scrollAlignment: Math.round(scrollAlignment * 100) / 100,
      kingdomImpact: Math.round(kingdomImpact * 100) / 100,
      innovationScore: Math.round(innovationScore * 100) / 100
    };
  }

  /**
   * Generate official transcript document
   */
  async generateOfficialTranscript(userId: string): Promise<any> {
    const transcript = await this.getTranscript(userId);
    
    // This would generate a PDF or official document
    // For now, return the structured data
    return {
      ...transcript,
      generatedAt: new Date(),
      official: true,
      verificationCode: this.generateVerificationCode()
    };
  }

  /**
   * Generate verification code for transcript
   */
  private generateVerificationCode(): string {
    return `SCROLL-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
  }
}
