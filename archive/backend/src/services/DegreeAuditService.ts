/**
 * ScrollUniversity Degree Audit Service
 * "Commit to the LORD whatever you do, and he will establish your plans" - Proverbs 16:3
 * 
 * Manages degree audits, requirement tracking, and progress monitoring
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/productionLogger';
import {
  DegreeAudit,
  DegreeProgram,
  DegreeRequirement,
  RequirementCategory,
  SpiritualRequirement,
  SpiritualRequirementType
} from '../types/degree-graduation.types';

const prisma = new PrismaClient();

export class DegreeAuditService {
  /**
   * Get degree audit for a student
   */
  async getDegreeAudit(studentId: string, degreeProgramId: string): Promise<DegreeAudit> {
    try {
      logger.info('Getting degree audit', { studentId, degreeProgramId });

      // Get student data
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        include: {
          enrollments: {
            where: { completedAt: { not: null } },
            include: {
              course: true,
              submissions: {
                where: { status: 'GRADED' }
              }
            }
          }
        }
      });

      if (!student) {
        throw new Error('Student not found');
      }

      // Get degree program (mock data for now - would come from database)
      const degreeProgram = await this.getDegreeProgram(degreeProgramId);

      // Calculate completed credit hours
      const creditHoursCompleted = student.enrollments.reduce(
        (sum, enrollment) => sum + 3, // Default 3 credit hours per course
        0
      );

      // Check each requirement
      const requirementsMet: DegreeRequirement[] = [];
      const requirementsInProgress: DegreeRequirement[] = [];
      const requirementsNotStarted: DegreeRequirement[] = [];

      for (const requirement of degreeProgram.requirements) {
        const status = await this.checkRequirementStatus(studentId, requirement);
        
        if (status.completed) {
          requirementsMet.push({ ...requirement, ...status });
        } else if (status.completedCreditHours > 0) {
          requirementsInProgress.push({ ...requirement, ...status });
        } else {
          requirementsNotStarted.push({ ...requirement, ...status });
        }
      }

      // Check spiritual formation requirements
      const spiritualFormationProgress = await this.checkSpiritualFormationProgress(
        studentId,
        degreeProgram.spiritualFormationRequirements
      );

      // Calculate overall progress
      const totalRequirements = degreeProgram.requirements.length;
      const completedRequirements = requirementsMet.length;
      const overallProgress = (completedRequirements / totalRequirements) * 100;

      // Calculate current GPA
      const currentGPA = await this.calculateGPA(studentId);

      // Check graduation eligibility
      const eligibleForGraduation = 
        creditHoursCompleted >= degreeProgram.totalCreditHours &&
        currentGPA >= degreeProgram.minimumGPA &&
        requirementsNotStarted.length === 0 &&
        requirementsInProgress.length === 0 &&
        spiritualFormationProgress.every(req => req.completed);

      // Estimate completion date
      const estimatedCompletionDate = this.estimateCompletionDate(
        requirementsNotStarted.length + requirementsInProgress.length,
        degreeProgram.estimatedDuration
      );

      const audit: DegreeAudit = {
        studentId,
        degreeProgramId,
        degreeProgram,
        overallProgress: Math.round(overallProgress * 100) / 100,
        creditHoursCompleted,
        creditHoursRequired: degreeProgram.totalCreditHours,
        currentGPA,
        requirementsMet,
        requirementsInProgress,
        requirementsNotStarted,
        spiritualFormationProgress,
        eligibleForGraduation,
        estimatedCompletionDate,
        lastUpdated: new Date()
      };

      logger.info('Degree audit completed', {
        studentId,
        overallProgress: audit.overallProgress,
        eligibleForGraduation
      });

      return audit;

    } catch (error: any) {
      logger.error('Get degree audit error', { error: error.message, studentId });
      throw error;
    }
  }

  /**
   * Get degree program details
   */
  private async getDegreeProgram(degreeProgramId: string): Promise<DegreeProgram> {
    // Mock degree program - in production, this would come from database
    return {
      id: degreeProgramId,
      name: 'Bachelor of Scroll Engineering',
      degreeType: 'BACHELOR' as any,
      faculty: 'Sacred AI Engineering',
      totalCreditHours: 120,
      minimumGPA: 2.0,
      requirements: [
        {
          id: 'req-1',
          category: RequirementCategory.CORE,
          name: 'Core Curriculum',
          description: 'Foundational courses in theology and technology',
          creditHours: 30,
          requiredCourses: [],
          completed: false,
          completedCreditHours: 0,
          completedCourses: []
        },
        {
          id: 'req-2',
          category: RequirementCategory.MAJOR,
          name: 'Major Requirements',
          description: 'Specialized courses in chosen field',
          creditHours: 45,
          requiredCourses: [],
          completed: false,
          completedCreditHours: 0,
          completedCourses: []
        },
        {
          id: 'req-3',
          category: RequirementCategory.ELECTIVE,
          name: 'Electives',
          description: 'Student-selected courses',
          creditHours: 30,
          electiveOptions: [],
          completed: false,
          completedCreditHours: 0,
          completedCourses: []
        },
        {
          id: 'req-4',
          category: RequirementCategory.CAPSTONE,
          name: 'Capstone Project',
          description: 'Final integrative project',
          creditHours: 6,
          requiredCourses: [],
          minimumGrade: 'B',
          completed: false,
          completedCreditHours: 0,
          completedCourses: []
        },
        {
          id: 'req-5',
          category: RequirementCategory.SPIRITUAL_FORMATION,
          name: 'Spiritual Formation',
          description: 'Character development and kingdom focus',
          creditHours: 9,
          requiredCourses: [],
          completed: false,
          completedCreditHours: 0,
          completedCourses: []
        }
      ],
      spiritualFormationRequirements: [
        {
          id: 'spiritual-1',
          name: 'Daily Devotions',
          description: 'Complete 100 daily devotions',
          type: SpiritualRequirementType.DAILY_DEVOTIONS,
          minimumScore: 100,
          completed: false
        },
        {
          id: 'spiritual-2',
          name: 'Prayer Journal',
          description: 'Maintain active prayer journal',
          type: SpiritualRequirementType.PRAYER_JOURNAL,
          minimumScore: 50,
          completed: false
        },
        {
          id: 'spiritual-3',
          name: 'Scripture Memory',
          description: 'Memorize 25 scripture passages',
          type: SpiritualRequirementType.SCRIPTURE_MEMORY,
          minimumScore: 25,
          completed: false
        }
      ],
      estimatedDuration: 48, // 4 years
      isActive: true
    };
  }

  /**
   * Check status of a specific requirement
   */
  private async checkRequirementStatus(
    studentId: string,
    requirement: DegreeRequirement
  ): Promise<{
    completed: boolean;
    completedCreditHours: number;
    completedCourses: string[];
  }> {
    // Get student's completed courses
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: studentId,
        completedAt: { not: null }
      },
      include: {
        course: true
      }
    });

    // For now, use simple logic - in production, would match against specific course requirements
    const completedCourses = enrollments.map(e => e.courseId);
    const completedCreditHours = enrollments.length * 3; // Default 3 credits per course

    const completed = completedCreditHours >= requirement.creditHours;

    return {
      completed,
      completedCreditHours: Math.min(completedCreditHours, requirement.creditHours),
      completedCourses
    };
  }

  /**
   * Check spiritual formation progress
   */
  private async checkSpiritualFormationProgress(
    studentId: string,
    requirements: SpiritualRequirement[]
  ): Promise<SpiritualRequirement[]> {
    const progress: SpiritualRequirement[] = [];

    for (const requirement of requirements) {
      let completed = false;

      switch (requirement.type) {
        case SpiritualRequirementType.DAILY_DEVOTIONS:
          // Check devotion completion count
          const devotionCount = await prisma.$queryRaw<any[]>`
            SELECT COUNT(*) as count FROM devotion_completions 
            WHERE user_id = ${studentId}
          `.catch(() => [{ count: 0 }]);
          completed = Number(devotionCount[0]?.count || 0) >= (requirement.minimumScore || 0);
          break;

        case SpiritualRequirementType.PRAYER_JOURNAL:
          // Check prayer journal entries
          const prayerCount = await prisma.$queryRaw<any[]>`
            SELECT COUNT(*) as count FROM prayer_entries 
            WHERE user_id = ${studentId}
          `.catch(() => [{ count: 0 }]);
          completed = Number(prayerCount[0]?.count || 0) >= (requirement.minimumScore || 0);
          break;

        case SpiritualRequirementType.SCRIPTURE_MEMORY:
          // Check memorized verses
          const verseCount = await prisma.$queryRaw<any[]>`
            SELECT COUNT(*) as count FROM memory_verses 
            WHERE user_id = ${studentId} AND mastery_level >= 80
          `.catch(() => [{ count: 0 }]);
          completed = Number(verseCount[0]?.count || 0) >= (requirement.minimumScore || 0);
          break;

        default:
          completed = false;
      }

      progress.push({
        ...requirement,
        completed
      });
    }

    return progress;
  }

  /**
   * Calculate student's current GPA
   */
  private async calculateGPA(studentId: string): Promise<number> {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: studentId,
        completedAt: { not: null }
      },
      include: {
        submissions: {
          where: { status: 'GRADED' }
        }
      }
    });

    if (enrollments.length === 0) {
      return 0.0;
    }

    let totalGradePoints = 0;
    let totalCreditHours = 0;

    for (const enrollment of enrollments) {
      const submissions = enrollment.submissions;
      if (submissions.length === 0) continue;

      const averageScore = submissions.reduce((sum, sub) => sum + (sub.score || 0), 0) / submissions.length;
      const gradePoints = this.scoreToGradePoints(averageScore);
      const creditHours = 3; // Default

      totalGradePoints += gradePoints * creditHours;
      totalCreditHours += creditHours;
    }

    return totalCreditHours > 0 ? totalGradePoints / totalCreditHours : 0.0;
  }

  /**
   * Convert percentage score to grade points
   */
  private scoreToGradePoints(score: number): number {
    if (score >= 93) return 4.0;
    if (score >= 90) return 3.7;
    if (score >= 87) return 3.3;
    if (score >= 83) return 3.0;
    if (score >= 80) return 2.7;
    if (score >= 77) return 2.3;
    if (score >= 73) return 2.0;
    if (score >= 70) return 1.7;
    if (score >= 67) return 1.3;
    if (score >= 63) return 1.0;
    if (score >= 60) return 0.7;
    return 0.0;
  }

  /**
   * Estimate completion date based on remaining requirements
   */
  private estimateCompletionDate(remainingRequirements: number, programDuration: number): Date {
    const now = new Date();
    const monthsPerRequirement = programDuration / 5; // Assuming 5 major requirement categories
    const estimatedMonths = remainingRequirements * monthsPerRequirement;
    
    const completionDate = new Date(now);
    completionDate.setMonth(completionDate.getMonth() + Math.ceil(estimatedMonths));
    
    return completionDate;
  }

  /**
   * Track automatic progress as courses complete
   */
  async trackCourseCompletion(studentId: string, courseId: string): Promise<void> {
    try {
      logger.info('Tracking course completion for degree progress', { studentId, courseId });

      // Get student's degree programs (would come from enrollment data)
      // For now, use a default degree program
      const degreeProgramId = 'default-bachelor-program';

      // Update degree audit
      const audit = await this.getDegreeAudit(studentId, degreeProgramId);

      // Check for milestone notifications
      if (audit.overallProgress >= 25 && audit.overallProgress < 30) {
        await this.sendMilestoneNotification(studentId, '25% Complete', audit);
      } else if (audit.overallProgress >= 50 && audit.overallProgress < 55) {
        await this.sendMilestoneNotification(studentId, '50% Complete - Halfway There!', audit);
      } else if (audit.overallProgress >= 75 && audit.overallProgress < 80) {
        await this.sendMilestoneNotification(studentId, '75% Complete - Almost Done!', audit);
      } else if (audit.eligibleForGraduation) {
        await this.sendGraduationEligibilityNotification(studentId, audit);
      }

      logger.info('Course completion tracked', { studentId, progress: audit.overallProgress });

    } catch (error: any) {
      logger.error('Track course completion error', { error: error.message, studentId });
      throw error;
    }
  }

  /**
   * Send milestone notification
   */
  private async sendMilestoneNotification(
    studentId: string,
    milestone: string,
    audit: DegreeAudit
  ): Promise<void> {
    logger.info('Sending milestone notification', { studentId, milestone });
    
    // Would integrate with notification service
    // For now, just log
  }

  /**
   * Send graduation eligibility notification
   */
  private async sendGraduationEligibilityNotification(
    studentId: string,
    audit: DegreeAudit
  ): Promise<void> {
    logger.info('Sending graduation eligibility notification', { studentId });
    
    // Would integrate with notification service
    // For now, just log
  }
}
