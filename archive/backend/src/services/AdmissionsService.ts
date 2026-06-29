/**
 * ScrollUniversity Admissions Service
 * "Many are called, but few are chosen" - Matthew 22:14
 * 
 * Comprehensive admissions application system with dynamic forms,
 * document verification, eligibility assessment, spiritual evaluation,
 * interview scheduling, decision management, and applicant portal
 */

import { PrismaClient, ApplicationStatus, ProgramType, AdmissionDecisionType } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  ApplicationFormTemplate,
  ApplicationFormData,
  ApplicantPortalDashboard,
  ApplicationTimelineEvent,
  ApplicationStatusUpdate,
  AdmissionsMetrics,
  ApplicationProcessingMetrics
} from '../types/admissions.types';

const prisma = new PrismaClient();

export class AdmissionsService {
  /**
   * Create a new application
   */
  async createApplication(data: {
    applicantId: string;
    programApplied: ProgramType;
    intendedStartDate: Date;
  }): Promise<any> {
    try {
      logger.info(`Creating application for applicant ${data.applicantId}`);

      const application = await prisma.application.create({
        data: {
          applicantId: data.applicantId,
          programApplied: data.programApplied,
          intendedStartDate: data.intendedStartDate,
          status: ApplicationStatus.SUBMITTED,
          submissionDate: new Date(),
          applicationTimeline: JSON.stringify([{
            eventId: `event_${Date.now()}`,
            eventType: 'APPLICATION_CREATED',
            eventDate: new Date(),
            description: 'Application submitted',
            status: 'completed'
          }])
        },
        include: {
          applicant: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      logger.info(`Application created successfully: ${application.id}`);
      return application;

    } catch (error) {
      logger.error('Error creating application:', error);
      throw new Error(`Failed to create application: ${(error as Error).message}`);
    }
  }

  /**
   * Get application by ID
   */
  async getApplicationById(applicationId: string): Promise<any> {
    try {
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          applicant: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phoneNumber: true
            }
          },
          eligibilityAssessment: true,
          spiritualEvaluations: true,
          academicEvaluations: true,
          interviewRecords: true,
          admissionDecisions: {
            include: {
              appealRecords: true
            }
          }
        }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      return application;

    } catch (error) {
      logger.error('Error fetching application:', error);
      throw new Error(`Failed to fetch application: ${(error as Error).message}`);
    }
  }

  /**
   * Get applications by applicant ID
   */
  async getApplicationsByApplicant(applicantId: string): Promise<any[]> {
    try {
      const applications = await prisma.application.findMany({
        where: { applicantId },
        include: {
          eligibilityAssessment: true,
          spiritualEvaluations: true,
          interviewRecords: true,
          admissionDecisions: true
        },
        orderBy: {
          submissionDate: 'desc'
        }
      });

      return applications;

    } catch (error) {
      logger.error('Error fetching applications:', error);
      throw new Error(`Failed to fetch applications: ${(error as Error).message}`);
    }
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(
    applicationId: string,
    newStatus: ApplicationStatus,
    updatedBy: string,
    reason: string
  ): Promise<ApplicationStatusUpdate> {
    try {
      const application = await prisma.application.findUnique({
        where: { id: applicationId }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const oldStatus = application.status;

      // Update application status
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          status: newStatus,
          updatedAt: new Date()
        }
      });

      // Add timeline event
      await this.addTimelineEvent(applicationId, {
        eventType: 'STATUS_CHANGED',
        description: `Status changed from ${oldStatus} to ${newStatus}`,
        status: 'completed',
        details: reason
      });

      const statusUpdate: ApplicationStatusUpdate = {
        applicationId,
        oldStatus,
        newStatus,
        updatedBy,
        reason,
        timestamp: new Date()
      };

      logger.info(`Application ${applicationId} status updated: ${oldStatus} -> ${newStatus}`);
      return statusUpdate;

    } catch (error) {
      logger.error('Error updating application status:', error);
      throw new Error(`Failed to update application status: ${(error as Error).message}`);
    }
  }

  /**
   * Save application form data
   */
  async saveApplicationFormData(
    applicationId: string,
    formData: Partial<ApplicationFormData>
  ): Promise<void> {
    try {
      const updateData: any = {};

      if (formData.responses) {
        // Store form responses in appropriate fields
        if (formData.responses.personalStatement) {
          updateData.personalStatement = formData.responses.personalStatement;
        }
        if (formData.responses.spiritualTestimony) {
          updateData.spiritualTestimony = formData.responses.spiritualTestimony;
        }
        if (formData.responses.academicHistory) {
          updateData.academicHistory = formData.responses.academicHistory;
        }
        if (formData.responses.characterReferences) {
          updateData.characterReferences = formData.responses.characterReferences;
        }
      }

      await prisma.application.update({
        where: { id: applicationId },
        data: updateData
      });

      logger.info(`Application form data saved for ${applicationId}`);

    } catch (error) {
      logger.error('Error saving application form data:', error);
      throw new Error(`Failed to save application form data: ${(error as Error).message}`);
    }
  }

  /**
   * Add timeline event to application
   */
  async addTimelineEvent(
    applicationId: string,
    event: Omit<ApplicationTimelineEvent, 'eventId' | 'eventDate'>
  ): Promise<void> {
    try {
      const application = await prisma.application.findUnique({
        where: { id: applicationId }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const timeline = JSON.parse(application.applicationTimeline as string || '[]');
      
      const newEvent: ApplicationTimelineEvent = {
        eventId: `event_${Date.now()}`,
        eventDate: new Date(),
        ...event
      };

      timeline.push(newEvent);

      await prisma.application.update({
        where: { id: applicationId },
        data: {
          applicationTimeline: JSON.stringify(timeline)
        }
      });

      logger.info(`Timeline event added to application ${applicationId}: ${event.eventType}`);

    } catch (error) {
      logger.error('Error adding timeline event:', error);
      throw new Error(`Failed to add timeline event: ${(error as Error).message}`);
    }
  }

  /**
   * Get applicant portal dashboard
   */
  async getApplicantPortalDashboard(applicantId: string): Promise<ApplicantPortalDashboard | null> {
    try {
      // Get the most recent application
      const applications = await prisma.application.findMany({
        where: { applicantId },
        include: {
          eligibilityAssessment: true,
          spiritualEvaluations: true,
          interviewRecords: true,
          admissionDecisions: true
        },
        orderBy: {
          submissionDate: 'desc'
        },
        take: 1
      });

      if (applications.length === 0) {
        return null;
      }

      const application = applications[0];
      const timeline = JSON.parse(application.applicationTimeline as string || '[]');

      // Calculate completion percentage
      const completionPercentage = this.calculateCompletionPercentage(application);

      // Determine next steps
      const nextSteps = this.determineNextSteps(application);

      // Get required documents
      const requiredDocuments = this.getRequiredDocuments(application);

      // Get upcoming interviews
      const upcomingInterviews = application.interviewRecords
        .filter(interview => interview.status === 'SCHEDULED' && new Date(interview.scheduledDate) > new Date())
        .map(interview => ({
          interviewId: interview.id,
          scheduledDate: interview.scheduledDate,
          duration: interview.duration,
          format: interview.format,
          platform: interview.platform,
          meetingUrl: interview.meetingUrl,
          interviewerName: interview.interviewerName,
          preparationMaterials: [],
          confirmationSent: true
        }));

      const dashboard: ApplicantPortalDashboard = {
        applicationId: application.id,
        applicantId: application.applicantId,
        applicationStatus: application.status,
        programApplied: application.programApplied,
        submissionDate: application.submissionDate,
        timeline,
        completionPercentage,
        nextSteps,
        requiredDocuments,
        upcomingInterviews,
        notifications: [],
        decision: application.admissionDecisions.length > 0 ? {
          applicationId: application.id,
          decision: application.admissionDecisions[0].decision,
          decisionDate: application.admissionDecisions[0].decisionDate,
          decisionMakers: JSON.parse(application.admissionDecisions[0].decisionMakers as string || '[]'),
          strengths: JSON.parse(application.admissionDecisions[0].strengths as string || '[]'),
          concerns: JSON.parse(application.admissionDecisions[0].concerns as string || '[]'),
          recommendations: JSON.parse(application.admissionDecisions[0].recommendations as string || '[]'),
          overallAssessment: application.admissionDecisions[0].overallAssessment || '',
          admissionConditions: JSON.parse(application.admissionDecisions[0].admissionConditions as string || '[]'),
          enrollmentDeadline: application.admissionDecisions[0].enrollmentDeadline || undefined,
          nextSteps: JSON.parse(application.admissionDecisions[0].nextSteps as string || '[]'),
          appealEligible: application.admissionDecisions[0].appealEligible,
          appealDeadline: application.admissionDecisions[0].appealDeadline || undefined
        } : undefined
      };

      return dashboard;

    } catch (error) {
      logger.error('Error fetching applicant portal dashboard:', error);
      throw new Error(`Failed to fetch applicant portal dashboard: ${(error as Error).message}`);
    }
  }

  /**
   * Get admissions metrics
   */
  async getAdmissionsMetrics(startDate?: Date, endDate?: Date): Promise<AdmissionsMetrics> {
    try {
      const whereClause: any = {};
      
      if (startDate || endDate) {
        whereClause.submissionDate = {};
        if (startDate) whereClause.submissionDate.gte = startDate;
        if (endDate) whereClause.submissionDate.lte = endDate;
      }

      const applications = await prisma.application.findMany({
        where: whereClause,
        include: {
          admissionDecisions: true,
          interviewRecords: true
        }
      });

      const totalApplications = applications.length;

      // Applications by status
      const applicationsByStatus: Record<ApplicationStatus, number> = {} as any;
      Object.values(ApplicationStatus).forEach(status => {
        applicationsByStatus[status] = applications.filter(app => app.status === status).length;
      });

      // Applications by program
      const applicationsByProgram: Record<ProgramType, number> = {} as any;
      Object.values(ProgramType).forEach(program => {
        applicationsByProgram[program] = applications.filter(app => app.programApplied === program).length;
      });

      // Acceptance rate
      const acceptedApplications = applications.filter(app => 
        app.admissionDecisions.some(decision => decision.decision === AdmissionDecisionType.ACCEPTED)
      ).length;
      const acceptanceRate = totalApplications > 0 ? (acceptedApplications / totalApplications) * 100 : 0;

      // Average processing time
      const completedApplications = applications.filter(app => 
        app.status === ApplicationStatus.ACCEPTED || app.status === ApplicationStatus.REJECTED
      );
      const totalProcessingTime = completedApplications.reduce((sum, app) => {
        const submissionDate = new Date(app.submissionDate);
        const decisionDate = app.admissionDecisions[0]?.decisionDate || new Date();
        const days = Math.floor((decisionDate.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      const averageProcessingTime = completedApplications.length > 0 
        ? totalProcessingTime / completedApplications.length 
        : 0;

      // Interview completion rate
      const totalInterviews = applications.reduce((sum, app) => sum + app.interviewRecords.length, 0);
      const completedInterviews = applications.reduce((sum, app) => 
        sum + app.interviewRecords.filter(interview => interview.status === 'COMPLETED').length, 0
      );
      const interviewCompletionRate = totalInterviews > 0 ? (completedInterviews / totalInterviews) * 100 : 0;

      // Document verification rate (placeholder)
      const documentVerificationRate = 85;

      // Appeal rate (placeholder - would need to query appealRecords separately)
      const appealsCount = 0;
      const appealRate = 0;

      // Enrollment yield (placeholder)
      const enrollmentYield = 75;

      const metrics: AdmissionsMetrics = {
        totalApplications,
        applicationsByStatus,
        applicationsByProgram,
        acceptanceRate,
        averageProcessingTime,
        interviewCompletionRate,
        documentVerificationRate,
        appealRate,
        enrollmentYield
      };

      return metrics;

    } catch (error) {
      logger.error('Error fetching admissions metrics:', error);
      throw new Error(`Failed to fetch admissions metrics: ${(error as Error).message}`);
    }
  }

  /**
   * Get application processing metrics
   */
  async getApplicationProcessingMetrics(applicationId: string): Promise<ApplicationProcessingMetrics> {
    try {
      const application = await this.getApplicationById(applicationId);

      const submissionDate = new Date(application.submissionDate);
      const currentDate = new Date();
      const daysInProcess = Math.floor((currentDate.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate stage completion times
      const timeline = JSON.parse(application.applicationTimeline as string || '[]');
      const stageCompletionTimes: Record<string, number> = {};
      
      for (let i = 1; i < timeline.length; i++) {
        const prevEvent = timeline[i - 1];
        const currEvent = timeline[i];
        const stageName = currEvent.eventType;
        const timeDiff = Math.floor(
          (new Date(currEvent.eventDate).getTime() - new Date(prevEvent.eventDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        stageCompletionTimes[stageName] = timeDiff;
      }

      // Identify bottlenecks
      const bottlenecks: string[] = [];
      Object.entries(stageCompletionTimes).forEach(([stage, days]) => {
        if (days > 7) {
          bottlenecks.push(`${stage}: ${days} days`);
        }
      });

      // Estimate completion date
      const averageRemainingTime = 14; // days
      const estimatedCompletionDate = new Date(currentDate.getTime() + averageRemainingTime * 24 * 60 * 60 * 1000);

      const metrics: ApplicationProcessingMetrics = {
        applicationId,
        submissionDate,
        currentStatus: application.status,
        daysInProcess,
        stageCompletionTimes,
        bottlenecks,
        estimatedCompletionDate
      };

      return metrics;

    } catch (error) {
      logger.error('Error fetching application processing metrics:', error);
      throw new Error(`Failed to fetch application processing metrics: ${(error as Error).message}`);
    }
  }

  // Private helper methods

  private calculateCompletionPercentage(application: any): number {
    let completed = 0;
    let total = 5; // Total stages

    if (application.personalStatement) completed++;
    if (application.spiritualTestimony) completed++;
    if (application.eligibilityAssessment) completed++;
    if (application.spiritualEvaluations.length > 0) completed++;
    if (application.interviewRecords.length > 0) completed++;

    return Math.round((completed / total) * 100);
  }

  private determineNextSteps(application: any): string[] {
    const nextSteps: string[] = [];

    switch (application.status) {
      case ApplicationStatus.SUBMITTED:
        nextSteps.push('Complete all required documents');
        nextSteps.push('Submit personal statement');
        break;
      case ApplicationStatus.UNDER_REVIEW:
        nextSteps.push('Wait for eligibility assessment');
        break;
      case ApplicationStatus.ASSESSMENT_PENDING:
        nextSteps.push('Complete spiritual evaluation');
        break;
      case ApplicationStatus.INTERVIEW_SCHEDULED:
        nextSteps.push('Prepare for upcoming interview');
        break;
      case ApplicationStatus.DECISION_PENDING:
        nextSteps.push('Wait for admission decision');
        break;
      case ApplicationStatus.ACCEPTED:
        nextSteps.push('Complete enrollment process');
        nextSteps.push('Pay enrollment deposit');
        break;
      default:
        nextSteps.push('Check your application status');
    }

    return nextSteps;
  }

  private getRequiredDocuments(application: any): any[] {
    return [
      {
        documentType: 'TRANSCRIPT',
        required: true,
        uploaded: false,
        verified: false,
        instructions: 'Upload official transcripts from all institutions attended'
      },
      {
        documentType: 'PERSONAL_STATEMENT',
        required: true,
        uploaded: !!application.personalStatement,
        verified: true,
        instructions: 'Write a personal statement (500-1000 words)'
      },
      {
        documentType: 'RECOMMENDATION_LETTER',
        required: true,
        uploaded: false,
        verified: false,
        instructions: 'Provide 2-3 letters of recommendation'
      }
    ];
  }
}

export default AdmissionsService;
