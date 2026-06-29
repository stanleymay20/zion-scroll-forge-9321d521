/**
 * ScrollUniversity Graduation Eligibility Service
 * "I have fought the good fight, I have finished the race" - 2 Timothy 4:7
 * 
 * Manages graduation eligibility checking and validation
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/productionLogger';
import { GraduationEligibility } from '../types/degree-graduation.types';
import { DegreeAuditService } from './DegreeAuditService';

const prisma = new PrismaClient();

export class GraduationEligibilityService {
  private degreeAuditService: DegreeAuditService;

  constructor() {
    this.degreeAuditService = new DegreeAuditService();
  }

  /**
   * Check if student is eligible for graduation
   */
  async checkEligibility(studentId: string, degreeProgramId: string): Promise<GraduationEligibility> {
    try {
      logger.info('Checking graduation eligibility', { studentId, degreeProgramId });

      // Get degree audit
      const audit = await this.degreeAuditService.getDegreeAudit(studentId, degreeProgramId);

      // Check credit hours
      const creditHoursComplete = audit.creditHoursCompleted >= audit.creditHoursRequired;

      // Check GPA requirement
      const gpaRequirementMet = audit.currentGPA >= audit.degreeProgram.minimumGPA;

      // Check all requirements met
      const allRequirementsMet = 
        audit.requirementsNotStarted.length === 0 &&
        audit.requirementsInProgress.length === 0;

      // Check spiritual formation
      const spiritualFormationComplete = audit.spiritualFormationProgress.every(req => req.completed);

      // Check financial obligations
      const financialObligationsMet = await this.checkFinancialObligations(studentId);

      // Check academic holds
      const noAcademicHolds = await this.checkAcademicHolds(studentId);

      // Determine overall eligibility
      const eligible = 
        creditHoursComplete &&
        gpaRequirementMet &&
        allRequirementsMet &&
        spiritualFormationComplete &&
        financialObligationsMet &&
        noAcademicHolds;

      // Collect missing requirements
      const missingRequirements: string[] = [];
      if (!creditHoursComplete) {
        missingRequirements.push(
          `Need ${audit.creditHoursRequired - audit.creditHoursCompleted} more credit hours`
        );
      }
      if (!gpaRequirementMet) {
        missingRequirements.push(
          `GPA must be at least ${audit.degreeProgram.minimumGPA} (current: ${audit.currentGPA.toFixed(2)})`
        );
      }
      if (!allRequirementsMet) {
        missingRequirements.push(
          `${audit.requirementsNotStarted.length + audit.requirementsInProgress.length} requirements not completed`
        );
      }
      if (!spiritualFormationComplete) {
        const incomplete = audit.spiritualFormationProgress.filter(req => !req.completed);
        missingRequirements.push(
          `Complete spiritual formation: ${incomplete.map(r => r.name).join(', ')}`
        );
      }
      if (!financialObligationsMet) {
        missingRequirements.push('Outstanding financial obligations must be resolved');
      }
      if (!noAcademicHolds) {
        missingRequirements.push('Academic holds must be cleared');
      }

      // Generate action items
      const actionItems: string[] = [];
      if (audit.requirementsInProgress.length > 0) {
        actionItems.push('Complete in-progress courses');
      }
      if (audit.requirementsNotStarted.length > 0) {
        actionItems.push('Enroll in remaining required courses');
      }
      if (!spiritualFormationComplete) {
        actionItems.push('Complete spiritual formation requirements');
      }
      if (!financialObligationsMet) {
        actionItems.push('Contact financial aid office');
      }
      if (!noAcademicHolds) {
        actionItems.push('Contact registrar to resolve holds');
      }

      const eligibility: GraduationEligibility = {
        eligible,
        studentId,
        degreeProgramId,
        checkDate: new Date(),
        requirements: {
          creditHoursComplete,
          gpaRequirementMet,
          allRequirementsMet,
          spiritualFormationComplete,
          financialObligationsMet,
          noAcademicHolds
        },
        missingRequirements,
        actionItems
      };

      logger.info('Graduation eligibility checked', {
        studentId,
        eligible,
        missingCount: missingRequirements.length
      });

      return eligibility;

    } catch (error: any) {
      logger.error('Check eligibility error', { error: error.message, studentId });
      throw error;
    }
  }

  /**
   * Check if student has outstanding financial obligations
   */
  private async checkFinancialObligations(studentId: string): Promise<boolean> {
    try {
      // Check for pending payments
      const pendingPayments = await prisma.payment.count({
        where: {
          userId: studentId,
          status: 'PENDING'
        }
      });

      // Check for failed payments
      const failedPayments = await prisma.payment.count({
        where: {
          userId: studentId,
          status: 'FAILED'
        }
      });

      return pendingPayments === 0 && failedPayments === 0;

    } catch (error: any) {
      logger.error('Check financial obligations error', { error: error.message });
      return false;
    }
  }

  /**
   * Check if student has any academic holds
   */
  private async checkAcademicHolds(studentId: string): Promise<boolean> {
    try {
      // Check enrollment status
      const user = await prisma.user.findUnique({
        where: { id: studentId },
        select: { enrollmentStatus: true }
      });

      if (!user) {
        return false;
      }

      // Student must be in ACTIVE status
      return user.enrollmentStatus === 'ACTIVE';

    } catch (error: any) {
      logger.error('Check academic holds error', { error: error.message });
      return false;
    }
  }

  /**
   * Get all eligible students for a degree program
   */
  async getEligibleStudents(degreeProgramId: string): Promise<string[]> {
    try {
      logger.info('Getting eligible students', { degreeProgramId });

      // Get all students in the degree program
      // For now, get all active students
      const students = await prisma.user.findMany({
        where: {
          role: 'STUDENT',
          enrollmentStatus: 'ACTIVE'
        },
        select: { id: true }
      });

      const eligibleStudents: string[] = [];

      for (const student of students) {
        const eligibility = await this.checkEligibility(student.id, degreeProgramId);
        if (eligibility.eligible) {
          eligibleStudents.push(student.id);
        }
      }

      logger.info('Eligible students found', {
        degreeProgramId,
        count: eligibleStudents.length
      });

      return eligibleStudents;

    } catch (error: any) {
      logger.error('Get eligible students error', { error: error.message });
      throw error;
    }
  }

  /**
   * Approve student for graduation
   */
  async approveForGraduation(studentId: string, degreeProgramId: string): Promise<void> {
    try {
      logger.info('Approving student for graduation', { studentId, degreeProgramId });

      // Check eligibility first
      const eligibility = await this.checkEligibility(studentId, degreeProgramId);

      if (!eligibility.eligible) {
        throw new Error(
          `Student not eligible for graduation: ${eligibility.missingRequirements.join(', ')}`
        );
      }

      // Update enrollment status to GRADUATED
      await prisma.user.update({
        where: { id: studentId },
        data: {
          enrollmentStatus: 'GRADUATED'
        }
      });

      logger.info('Student approved for graduation', { studentId });

    } catch (error: any) {
      logger.error('Approve for graduation error', { error: error.message, studentId });
      throw error;
    }
  }
}
