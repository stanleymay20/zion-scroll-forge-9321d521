/**
 * Scholarship Application Service
 * "Ask and it will be given to you; seek and you will find" - Matthew 7:7
 * 
 * Handles scholarship application submission and management
 */

import { PrismaClient } from '@prisma/client';
import {
  ScholarshipApplicationData,
  SubmitApplicationRequest,
  ReviewApplicationRequest,
  ApplicationStatus,
  ApplicationSearchFilters
} from '../types/scholarship.types';
import logger from '../utils/logger';
import EligibilityCheckService from './EligibilityCheckService';
import ScholarshipNotificationService from './ScholarshipNotificationService';

const prisma = new PrismaClient();

export default class ScholarshipApplicationService {
  private eligibilityService: EligibilityCheckService;
  private notificationService: ScholarshipNotificationService;

  constructor() {
    this.eligibilityService = new EligibilityCheckService();
    this.notificationService = new ScholarshipNotificationService();
  }

  /**
   * Submit scholarship application
   */
  async submitApplication(
    userId: string,
    request: SubmitApplicationRequest
  ): Promise<ScholarshipApplicationData> {
    try {
      logger.info('Submitting scholarship application', { userId, scholarshipId: request.scholarshipId });

      // Check if scholarship exists and is active
      const scholarship = await prisma.scholarship.findUnique({
        where: { id: request.scholarshipId }
      });

      if (!scholarship) {
        throw new Error('Scholarship not found');
      }

      if (scholarship.status !== 'ACTIVE') {
        throw new Error('Scholarship is not currently accepting applications');
      }

      if (new Date() > scholarship.applicationDeadline) {
        throw new Error('Application deadline has passed');
      }

      // Check if user already applied
      const existingApplication = await prisma.scholarshipApplication.findUnique({
        where: {
          scholarship_applicant_unique: {
            scholarshipId: request.scholarshipId,
            applicantId: userId
          }
        }
      });

      if (existingApplication) {
        throw new Error('You have already applied for this scholarship');
      }

      // Check eligibility
      const eligibilityResult = await this.eligibilityService.checkEligibility(
        userId,
        scholarship.eligibilityCriteria as any
      );

      // Create application
      const application = await prisma.scholarshipApplication.create({
        data: {
          scholarshipId: request.scholarshipId,
          applicantId: userId,
          status: ApplicationStatus.SUBMITTED,
          submittedAt: new Date(),
          applicationData: request.applicationData as any,
          eligibilityScore: eligibilityResult.score
        }
      });

      // Send confirmation notification
      await this.notificationService.sendApplicationSubmittedNotification(
        userId,
        application.id,
        scholarship.name
      );

      logger.info('Application submitted successfully', { applicationId: application.id });

      return this.mapToApplicationData(application);
    } catch (error) {
      logger.error('Error submitting application', { error, userId });
      throw new Error(`Failed to submit application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get application by ID
   */
  async getApplicationById(applicationId: string): Promise<ScholarshipApplicationData | null> {
    try {
      const application = await prisma.scholarshipApplication.findUnique({
        where: { id: applicationId },
        include: {
          scholarship: true,
          applicant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          documents: true
        }
      });

      if (!application) {
        return null;
      }

      return this.mapToApplicationData(application);
    } catch (error) {
      logger.error('Error fetching application', { error, applicationId });
      throw new Error(`Failed to fetch application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get applications by user
   */
  async getApplicationsByUser(userId: string): Promise<ScholarshipApplicationData[]> {
    try {
      const applications = await prisma.scholarshipApplication.findMany({
        where: { applicantId: userId },
        include: {
          scholarship: true,
          documents: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return applications.map(app => this.mapToApplicationData(app));
    } catch (error) {
      logger.error('Error fetching user applications', { error, userId });
      throw new Error(`Failed to fetch applications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get applications by scholarship
   */
  async getApplicationsByScholarship(
    scholarshipId: string,
    filters?: ApplicationSearchFilters
  ): Promise<ScholarshipApplicationData[]> {
    try {
      const where: any = { scholarshipId };

      if (filters?.status && filters.status.length > 0) {
        where.status = { in: filters.status };
      }

      if (filters?.submittedAfter || filters?.submittedBefore) {
        where.submittedAt = {};
        if (filters.submittedAfter) {
          where.submittedAt.gte = filters.submittedAfter;
        }
        if (filters.submittedBefore) {
          where.submittedAt.lte = filters.submittedBefore;
        }
      }

      if (filters?.minEligibilityScore !== undefined) {
        where.eligibilityScore = { gte: filters.minEligibilityScore };
      }

      const applications = await prisma.scholarshipApplication.findMany({
        where,
        include: {
          applicant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          documents: true
        },
        orderBy: { eligibilityScore: 'desc' }
      });

      return applications.map(app => this.mapToApplicationData(app));
    } catch (error) {
      logger.error('Error fetching scholarship applications', { error, scholarshipId });
      throw new Error(`Failed to fetch applications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Review application
   */
  async reviewApplication(
    reviewerId: string,
    request: ReviewApplicationRequest
  ): Promise<ScholarshipApplicationData> {
    try {
      logger.info('Reviewing application', { applicationId: request.applicationId, reviewerId });

      const application = await prisma.scholarshipApplication.findUnique({
        where: { id: request.applicationId },
        include: { scholarship: true }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      // Update application
      const updatedApplication = await prisma.scholarshipApplication.update({
        where: { id: request.applicationId },
        data: {
          status: request.status,
          reviewedAt: new Date(),
          reviewedById: reviewerId,
          reviewNotes: request.reviewNotes,
          awardAmount: request.awardAmount
        }
      });

      // Send notification to applicant
      await this.notificationService.sendApplicationReviewedNotification(
        application.applicantId,
        request.applicationId,
        request.status,
        application.scholarship.name
      );

      // If approved, create disbursement schedule
      if (request.status === ApplicationStatus.APPROVED && request.awardAmount) {
        await this.createDisbursementSchedule(
          request.applicationId,
          application.scholarshipId,
          application.applicantId,
          request.awardAmount
        );
      }

      logger.info('Application reviewed successfully', { applicationId: request.applicationId });

      return this.mapToApplicationData(updatedApplication);
    } catch (error) {
      logger.error('Error reviewing application', { error, request });
      throw new Error(`Failed to review application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Withdraw application
   */
  async withdrawApplication(applicationId: string, userId: string): Promise<void> {
    try {
      const application = await prisma.scholarshipApplication.findUnique({
        where: { id: applicationId }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      if (application.applicantId !== userId) {
        throw new Error('Unauthorized to withdraw this application');
      }

      if (application.status === ApplicationStatus.APPROVED) {
        throw new Error('Cannot withdraw an approved application');
      }

      await prisma.scholarshipApplication.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.WITHDRAWN,
          updatedAt: new Date()
        }
      });

      logger.info('Application withdrawn', { applicationId, userId });
    } catch (error) {
      logger.error('Error withdrawing application', { error, applicationId });
      throw new Error(`Failed to withdraw application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create disbursement schedule for approved application
   */
  private async createDisbursementSchedule(
    applicationId: string,
    scholarshipId: string,
    recipientId: string,
    totalAmount: number
  ): Promise<void> {
    try {
      // Create a single disbursement for now (can be enhanced for multiple disbursements)
      await prisma.scholarshipDisbursement.create({
        data: {
          scholarshipId,
          applicationId,
          recipientId,
          amount: totalAmount,
          scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          status: 'PENDING',
          method: 'DIRECT_TUITION_CREDIT'
        }
      });

      logger.info('Disbursement schedule created', { applicationId, totalAmount });
    } catch (error) {
      logger.error('Error creating disbursement schedule', { error, applicationId });
      throw error;
    }
  }

  /**
   * Get pending applications for review
   */
  async getPendingApplications(limit: number = 50): Promise<ScholarshipApplicationData[]> {
    try {
      const applications = await prisma.scholarshipApplication.findMany({
        where: {
          status: {
            in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW]
          }
        },
        include: {
          scholarship: true,
          applicant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { submittedAt: 'asc' },
        take: limit
      });

      return applications.map(app => this.mapToApplicationData(app));
    } catch (error) {
      logger.error('Error fetching pending applications', { error });
      throw new Error(`Failed to fetch pending applications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map database model to ApplicationData
   */
  private mapToApplicationData(application: any): ScholarshipApplicationData {
    return {
      id: application.id,
      scholarshipId: application.scholarshipId,
      applicantId: application.applicantId,
      status: application.status as ApplicationStatus,
      submittedAt: application.submittedAt,
      reviewedAt: application.reviewedAt,
      reviewedById: application.reviewedById,
      reviewNotes: application.reviewNotes,
      applicationData: application.applicationData,
      eligibilityScore: Number(application.eligibilityScore),
      documents: application.documents || [],
      createdAt: application.createdAt,
      updatedAt: application.updatedAt
    };
  }
}
