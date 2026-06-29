/**
 * ScrollUniversity Admissions - Status Tracker
 * "Many are called, but few are chosen" - Matthew 22:14
 * 
 * Application status tracking and progress monitoring system
 */

import { PrismaClient, ApplicationStatus } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface TimelineEvent {
  event: string;
  timestamp: string;
  actor?: string;
  details?: any;
  description?: string;
}

export interface StatusInfo {
  currentStatus: ApplicationStatus;
  timeline: TimelineEvent[];
  progress: {
    percentage: number;
    currentStep: string;
    nextStep?: string;
    completedSteps: string[];
    remainingSteps: string[];
  };
  milestones: {
    submitted: Date | null;
    underReview: Date | null;
    assessmentCompleted: Date | null;
    interviewScheduled: Date | null;
    interviewCompleted: Date | null;
    decisionMade: Date | null;
  };
}

export class StatusTracker {
  constructor(private prisma: PrismaClient) {}

  private readonly statusFlow = [
    'SUBMITTED',
    'UNDER_REVIEW',
    'ASSESSMENT_PENDING',
    'INTERVIEW_SCHEDULED',
    'DECISION_PENDING',
    'ACCEPTED', // or 'REJECTED', 'WAITLISTED'
  ];

  private readonly statusDescriptions = {
    SUBMITTED: 'Application has been submitted and is awaiting initial review',
    UNDER_REVIEW: 'Application is being reviewed by admissions staff',
    ASSESSMENT_PENDING: 'Application is undergoing eligibility and academic assessment',
    INTERVIEW_SCHEDULED: 'Interview has been scheduled with admissions committee',
    DECISION_PENDING: 'Application is under final review for admission decision',
    ACCEPTED: 'Congratulations! You have been accepted to ScrollUniversity',
    REJECTED: 'Application has been declined',
    WAITLISTED: 'Application has been placed on the waitlist',
    DEFERRED: 'Application has been deferred to a future term',
    WITHDRAWN: 'Application has been withdrawn by the applicant'
  };

  /**
   * Initialize application timeline
   */
  async initializeTimeline(applicationId: string): Promise<void> {
    try {
      logger.info(`Initializing timeline for application ${applicationId}`);

      const initialTimeline: TimelineEvent[] = [
        {
          event: 'APPLICATION_SUBMITTED',
          timestamp: new Date().toISOString(),
          description: 'Application submitted successfully'
        }
      ];

      await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          applicationTimeline: initialTimeline
        }
      });

      logger.info(`Timeline initialized for application ${applicationId}`);

    } catch (error) {
      logger.error('Error initializing timeline:', error);
      throw error;
    }
  }

  /**
   * Update application status
   */
  async updateStatus(
    applicationId: string, 
    newStatus: ApplicationStatus, 
    actorId?: string,
    details?: any
  ): Promise<void> {
    try {
      logger.info(`Updating status for application ${applicationId} to ${newStatus}`);

      const application = await this.prisma.application.findUnique({
        where: { id: applicationId }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      // Validate status transition
      if (!this.isValidStatusTransition(application.status, newStatus)) {
        throw new Error(`Invalid status transition from ${application.status} to ${newStatus}`);
      }

      // Get current timeline
      const currentTimeline = Array.isArray(application.applicationTimeline) 
        ? application.applicationTimeline as TimelineEvent[]
        : [];

      // Create new timeline event
      const newEvent: TimelineEvent = {
        event: `STATUS_CHANGED_TO_${newStatus}`,
        timestamp: new Date().toISOString(),
        actor: actorId,
        details,
        description: this.statusDescriptions[newStatus]
      };

      const updatedTimeline = [...currentTimeline, newEvent];

      // Update application
      await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          status: newStatus,
          applicationTimeline: updatedTimeline,
          updatedAt: new Date()
        }
      });

      logger.info(`Status updated successfully for application ${applicationId}`);

    } catch (error) {
      logger.error('Error updating status:', error);
      throw error;
    }
  }

  /**
   * Add timeline event
   */
  async addTimelineEvent(
    applicationId: string,
    event: string,
    details?: any,
    actorId?: string
  ): Promise<void> {
    try {
      logger.info(`Adding timeline event for application ${applicationId}: ${event}`);

      const application = await this.prisma.application.findUnique({
        where: { id: applicationId }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      // Get current timeline
      const currentTimeline = Array.isArray(application.applicationTimeline) 
        ? application.applicationTimeline as TimelineEvent[]
        : [];

      // Create new timeline event
      const newEvent: TimelineEvent = {
        event,
        timestamp: new Date().toISOString(),
        actor: actorId,
        details,
        description: this.getEventDescription(event, details)
      };

      const updatedTimeline = [...currentTimeline, newEvent];

      // Update application
      await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          applicationTimeline: updatedTimeline,
          updatedAt: new Date()
        }
      });

      logger.info(`Timeline event added successfully for application ${applicationId}`);

    } catch (error) {
      logger.error('Error adding timeline event:', error);
      throw error;
    }
  }

  /**
   * Get application status information
   */
  async getApplicationStatus(applicationId: string): Promise<StatusInfo> {
    try {
      const application = await this.prisma.application.findUnique({
        where: { id: applicationId }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const timeline = Array.isArray(application.applicationTimeline) 
        ? application.applicationTimeline as TimelineEvent[]
        : [];

      // Calculate progress
      const progress = this.calculateProgress(application.status, timeline);

      // Extract milestones
      const milestones = this.extractMilestones(timeline);

      return {
        currentStatus: application.status,
        timeline: timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
        progress,
        milestones
      };

    } catch (error) {
      logger.error('Error getting application status:', error);
      throw error;
    }
  }

  /**
   * Validate status transition
   */
  private isValidStatusTransition(currentStatus: ApplicationStatus, newStatus: ApplicationStatus): boolean {
    // Allow any transition to WITHDRAWN
    if (newStatus === 'WITHDRAWN') {
      return true;
    }

    // Allow any transition from SUBMITTED
    if (currentStatus === 'SUBMITTED') {
      return true;
    }

    // Define valid transitions
    const validTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
      SUBMITTED: ['UNDER_REVIEW', 'WITHDRAWN'],
      UNDER_REVIEW: ['ASSESSMENT_PENDING', 'REJECTED', 'WITHDRAWN'],
      ASSESSMENT_PENDING: ['INTERVIEW_SCHEDULED', 'REJECTED', 'WITHDRAWN'],
      INTERVIEW_SCHEDULED: ['DECISION_PENDING', 'REJECTED', 'WITHDRAWN'],
      DECISION_PENDING: ['ACCEPTED', 'REJECTED', 'WAITLISTED', 'DEFERRED', 'WITHDRAWN'],
      ACCEPTED: ['WITHDRAWN'], // Can only withdraw after acceptance
      REJECTED: [], // Final state
      WAITLISTED: ['ACCEPTED', 'REJECTED', 'WITHDRAWN'],
      DEFERRED: ['UNDER_REVIEW', 'WITHDRAWN'],
      WITHDRAWN: [] // Final state
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Calculate application progress
   */
  private calculateProgress(currentStatus: ApplicationStatus, timeline: TimelineEvent[]): {
    percentage: number;
    currentStep: string;
    nextStep?: string;
    completedSteps: string[];
    remainingSteps: string[];
  } {
    const currentIndex = this.statusFlow.indexOf(currentStatus);
    
    // Handle final states
    if (['ACCEPTED', 'REJECTED', 'WITHDRAWN'].includes(currentStatus)) {
      return {
        percentage: 100,
        currentStep: this.statusDescriptions[currentStatus],
        completedSteps: this.statusFlow.slice(0, currentIndex + 1),
        remainingSteps: []
      };
    }

    const percentage = currentIndex >= 0 ? Math.round(((currentIndex + 1) / this.statusFlow.length) * 100) : 0;
    const nextIndex = currentIndex + 1;
    const nextStep = nextIndex < this.statusFlow.length ? this.statusFlow[nextIndex] : undefined;

    return {
      percentage,
      currentStep: this.statusDescriptions[currentStatus],
      nextStep: nextStep ? this.statusDescriptions[nextStep as ApplicationStatus] : undefined,
      completedSteps: this.statusFlow.slice(0, currentIndex + 1),
      remainingSteps: this.statusFlow.slice(currentIndex + 1)
    };
  }

  /**
   * Extract milestones from timeline
   */
  private extractMilestones(timeline: TimelineEvent[]): {
    submitted: Date | null;
    underReview: Date | null;
    assessmentCompleted: Date | null;
    interviewScheduled: Date | null;
    interviewCompleted: Date | null;
    decisionMade: Date | null;
  } {
    const milestones = {
      submitted: null as Date | null,
      underReview: null as Date | null,
      assessmentCompleted: null as Date | null,
      interviewScheduled: null as Date | null,
      interviewCompleted: null as Date | null,
      decisionMade: null as Date | null
    };

    timeline.forEach(event => {
      const eventDate = new Date(event.timestamp);

      switch (event.event) {
        case 'APPLICATION_SUBMITTED':
          milestones.submitted = eventDate;
          break;
        case 'STATUS_CHANGED_TO_UNDER_REVIEW':
          milestones.underReview = eventDate;
          break;
        case 'ASSESSMENT_COMPLETED':
          milestones.assessmentCompleted = eventDate;
          break;
        case 'INTERVIEW_SCHEDULED':
          milestones.interviewScheduled = eventDate;
          break;
        case 'INTERVIEW_COMPLETED':
          milestones.interviewCompleted = eventDate;
          break;
        case 'STATUS_CHANGED_TO_ACCEPTED':
        case 'STATUS_CHANGED_TO_REJECTED':
        case 'STATUS_CHANGED_TO_WAITLISTED':
        case 'STATUS_CHANGED_TO_DEFERRED':
          milestones.decisionMade = eventDate;
          break;
      }
    });

    return milestones;
  }

  /**
   * Get event description
   */
  private getEventDescription(event: string, details?: any): string {
    const descriptions: Record<string, string> = {
      APPLICATION_SUBMITTED: 'Application submitted successfully',
      DOCUMENT_UPLOADED: 'Document uploaded',
      ELIGIBILITY_ASSESSMENT_STARTED: 'Eligibility assessment initiated',
      ELIGIBILITY_ASSESSMENT_COMPLETED: 'Eligibility assessment completed',
      SPIRITUAL_EVALUATION_STARTED: 'Spiritual evaluation initiated',
      SPIRITUAL_EVALUATION_COMPLETED: 'Spiritual evaluation completed',
      ACADEMIC_ASSESSMENT_STARTED: 'Academic assessment initiated',
      ACADEMIC_ASSESSMENT_COMPLETED: 'Academic assessment completed',
      INTERVIEW_SCHEDULED: 'Interview scheduled',
      INTERVIEW_COMPLETED: 'Interview completed',
      DECISION_MADE: 'Admission decision made',
      APPLICATION_WITHDRAWN: 'Application withdrawn'
    };

    let description = descriptions[event] || event.replace(/_/g, ' ').toLowerCase();

    // Add details if available
    if (details) {
      if (details.documentType) {
        description += ` (${details.documentType})`;
      }
      if (details.reason) {
        description += ` - ${details.reason}`;
      }
    }

    return description;
  }

  /**
   * Get applications by status
   */
  async getApplicationsByStatus(status: ApplicationStatus): Promise<any[]> {
    try {
      const applications = await this.prisma.application.findMany({
        where: { status },
        include: {
          applicant: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              username: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      return applications;

    } catch (error) {
      logger.error('Error getting applications by status:', error);
      throw error;
    }
  }

  /**
   * Get status statistics
   */
  async getStatusStatistics(): Promise<Record<ApplicationStatus, number>> {
    try {
      const statusCounts = await this.prisma.application.groupBy({
        by: ['status'],
        _count: { status: true }
      });

      const statistics: Record<string, number> = {};
      statusCounts.forEach(item => {
        statistics[item.status] = item._count.status;
      });

      return statistics as Record<ApplicationStatus, number>;

    } catch (error) {
      logger.error('Error getting status statistics:', error);
      throw error;
    }
  }
}