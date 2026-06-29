import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface EnrollmentConfirmation {
  id: string;
  applicationId: string;
  studentId: string;
  confirmationDate: Date;
  enrollmentDeadline: Date;
  depositAmount: number;
  depositPaid: boolean;
  depositPaidDate?: Date;
  programType: string;
  startDate: Date;
  status: EnrollmentStatus;
  conditions: EnrollmentCondition[];
}

export interface EnrollmentCondition {
  id: string;
  type: ConditionType;
  description: string;
  deadline: Date;
  fulfilled: boolean;
  fulfilledDate?: Date;
  evidence?: string[];
}

export enum EnrollmentStatus {
  PENDING_CONFIRMATION = 'pending_confirmation',
  CONFIRMED = 'confirmed',
  DEPOSIT_PENDING = 'deposit_pending',
  CONDITIONS_PENDING = 'conditions_pending',
  ENROLLED = 'enrolled',
  EXPIRED = 'expired',
  WITHDRAWN = 'withdrawn'
}

export enum ConditionType {
  ACADEMIC_TRANSCRIPT = 'academic_transcript',
  MEDICAL_CLEARANCE = 'medical_clearance',
  BACKGROUND_CHECK = 'background_check',
  FINANCIAL_AID_COMPLETION = 'financial_aid_completion',
  HOUSING_APPLICATION = 'housing_application',
  ORIENTATION_ATTENDANCE = 'orientation_attendance'
}

export class EnrollmentManager {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createEnrollmentConfirmation(
    applicationId: string,
    enrollmentDeadline: Date,
    depositAmount: number,
    conditions: Omit<EnrollmentCondition, 'id' | 'fulfilled' | 'fulfilledDate'>[] = []
  ): Promise<EnrollmentConfirmation> {
    try {
      logger.info(`Creating enrollment confirmation for application ${applicationId}`);

      // Get application details
      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId },
        include: { admission_decisions: true }
      });

      if (!application) {
        throw new Error(`Application ${applicationId} not found`);
      }

      const decision = application.admission_decisions[0];
      if (!decision || decision.decision !== 'accepted') {
        throw new Error(`Application ${applicationId} is not accepted`);
      }

      // Create enrollment confirmation
      const enrollmentData = {
        id: `enroll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        applicationId,
        studentId: application.applicant_id,
        confirmationDate: new Date(),
        enrollmentDeadline,
        depositAmount,
        depositPaid: false,
        programType: application.program_applied,
        startDate: application.intended_start_date,
        status: EnrollmentStatus.PENDING_CONFIRMATION,
        conditions: conditions.map(condition => ({
          ...condition,
          id: `cond_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fulfilled: false
        }))
      };

      // Store in database (using JSONB for now, would be separate tables in production)
      await this.prisma.admission_decisions.update({
        where: { id: decision.id },
        data: {
          enrollment_data: enrollmentData as any
        }
      });

      logger.info(`Enrollment confirmation created for application ${applicationId}`);
      return enrollmentData;

    } catch (error) {
      logger.error(`Error creating enrollment confirmation: ${error}`);
      throw error;
    }
  }

  async confirmEnrollment(applicationId: string): Promise<EnrollmentConfirmation> {
    try {
      logger.info(`Confirming enrollment for application ${applicationId}`);

      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId },
        include: { admission_decisions: true }
      });

      if (!application?.admission_decisions[0]?.enrollment_data) {
        throw new Error(`No enrollment confirmation found for application ${applicationId}`);
      }

      const enrollmentData = application.admission_decisions[0].enrollment_data as any;
      
      // Check if deadline has passed
      if (new Date() > new Date(enrollmentData.enrollmentDeadline)) {
        throw new Error('Enrollment deadline has passed');
      }

      // Update status to confirmed
      enrollmentData.status = EnrollmentStatus.CONFIRMED;
      enrollmentData.confirmationDate = new Date();

      await this.prisma.admission_decisions.update({
        where: { id: application.admission_decisions[0].id },
        data: {
          enrollment_data: enrollmentData
        }
      });

      logger.info(`Enrollment confirmed for application ${applicationId}`);
      return enrollmentData;

    } catch (error) {
      logger.error(`Error confirming enrollment: ${error}`);
      throw error;
    }
  }

  async processDepositPayment(applicationId: string, paymentAmount: number): Promise<EnrollmentConfirmation> {
    try {
      logger.info(`Processing deposit payment for application ${applicationId}`);

      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId },
        include: { admission_decisions: true }
      });

      if (!application?.admission_decisions[0]?.enrollment_data) {
        throw new Error(`No enrollment confirmation found for application ${applicationId}`);
      }

      const enrollmentData = application.admission_decisions[0].enrollment_data as any;

      if (paymentAmount < enrollmentData.depositAmount) {
        throw new Error(`Insufficient deposit amount. Required: ${enrollmentData.depositAmount}, Received: ${paymentAmount}`);
      }

      // Update deposit status
      enrollmentData.depositPaid = true;
      enrollmentData.depositPaidDate = new Date();
      
      // Update status based on conditions
      if (enrollmentData.conditions.length === 0) {
        enrollmentData.status = EnrollmentStatus.ENROLLED;
      } else {
        enrollmentData.status = EnrollmentStatus.CONDITIONS_PENDING;
      }

      await this.prisma.admission_decisions.update({
        where: { id: application.admission_decisions[0].id },
        data: {
          enrollment_data: enrollmentData
        }
      });

      logger.info(`Deposit payment processed for application ${applicationId}`);
      return enrollmentData;

    } catch (error) {
      logger.error(`Error processing deposit payment: ${error}`);
      throw error;
    }
  }

  async fulfillCondition(applicationId: string, conditionId: string, evidence: string[] = []): Promise<EnrollmentConfirmation> {
    try {
      logger.info(`Fulfilling condition ${conditionId} for application ${applicationId}`);

      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId },
        include: { admission_decisions: true }
      });

      if (!application?.admission_decisions[0]?.enrollment_data) {
        throw new Error(`No enrollment confirmation found for application ${applicationId}`);
      }

      const enrollmentData = application.admission_decisions[0].enrollment_data as any;
      const condition = enrollmentData.conditions.find((c: any) => c.id === conditionId);

      if (!condition) {
        throw new Error(`Condition ${conditionId} not found`);
      }

      // Update condition
      condition.fulfilled = true;
      condition.fulfilledDate = new Date();
      condition.evidence = evidence;

      // Check if all conditions are fulfilled
      const allConditionsFulfilled = enrollmentData.conditions.every((c: any) => c.fulfilled);
      
      if (allConditionsFulfilled && enrollmentData.depositPaid) {
        enrollmentData.status = EnrollmentStatus.ENROLLED;
      }

      await this.prisma.admission_decisions.update({
        where: { id: application.admission_decisions[0].id },
        data: {
          enrollment_data: enrollmentData
        }
      });

      logger.info(`Condition ${conditionId} fulfilled for application ${applicationId}`);
      return enrollmentData;

    } catch (error) {
      logger.error(`Error fulfilling condition: ${error}`);
      throw error;
    }
  }

  async checkEnrollmentDeadlines(): Promise<string[]> {
    try {
      logger.info('Checking enrollment deadlines');

      const applications = await this.prisma.applications.findMany({
        include: { admission_decisions: true }
      });

      const expiredApplications: string[] = [];
      const now = new Date();

      for (const application of applications) {
        const decision = application.admission_decisions[0];
        if (decision?.enrollment_data) {
          const enrollmentData = decision.enrollment_data as any;
          
          if (enrollmentData.status === EnrollmentStatus.PENDING_CONFIRMATION &&
              new Date(enrollmentData.enrollmentDeadline) < now) {
            
            // Mark as expired
            enrollmentData.status = EnrollmentStatus.EXPIRED;
            
            await this.prisma.admission_decisions.update({
              where: { id: decision.id },
              data: {
                enrollment_data: enrollmentData
              }
            });

            expiredApplications.push(application.id);
          }
        }
      }

      logger.info(`Found ${expiredApplications.length} expired enrollments`);
      return expiredApplications;

    } catch (error) {
      logger.error(`Error checking enrollment deadlines: ${error}`);
      throw error;
    }
  }

  async getEnrollmentStatus(applicationId: string): Promise<EnrollmentConfirmation | null> {
    try {
      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId },
        include: { admission_decisions: true }
      });

      if (!application?.admission_decisions[0]?.enrollment_data) {
        return null;
      }

      return application.admission_decisions[0].enrollment_data as any;

    } catch (error) {
      logger.error(`Error getting enrollment status: ${error}`);
      throw error;
    }
  }

  async withdrawEnrollment(applicationId: string, reason: string): Promise<EnrollmentConfirmation> {
    try {
      logger.info(`Withdrawing enrollment for application ${applicationId}`);

      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId },
        include: { admission_decisions: true }
      });

      if (!application?.admission_decisions[0]?.enrollment_data) {
        throw new Error(`No enrollment confirmation found for application ${applicationId}`);
      }

      const enrollmentData = application.admission_decisions[0].enrollment_data as any;
      enrollmentData.status = EnrollmentStatus.WITHDRAWN;
      enrollmentData.withdrawalReason = reason;
      enrollmentData.withdrawalDate = new Date();

      await this.prisma.admission_decisions.update({
        where: { id: application.admission_decisions[0].id },
        data: {
          enrollment_data: enrollmentData
        }
      });

      logger.info(`Enrollment withdrawn for application ${applicationId}`);
      return enrollmentData;

    } catch (error) {
      logger.error(`Error withdrawing enrollment: ${error}`);
      throw error;
    }
  }
}