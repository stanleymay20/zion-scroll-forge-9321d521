/**
 * ScrollUniversity Admissions - Timeline Manager
 * "Many are called, but few are chosen" - Matthew 22:14
 * 
 * Timeline tracking and milestone management system
 */

import { PrismaClient, Application, ApplicationStatus } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface Milestone {
  id: string;
  name: string;
  description: string;
  status: ApplicationStatus;
  estimatedDuration: number; // in days
  isRequired: boolean;
  dependencies: string[];
}

export interface TimelineEntry {
  id: string;
  applicationId: string;
  milestoneId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'FAILED';
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletionDate?: Date;
  actualDuration?: number;
  notes?: string;
  completedBy?: string;
}

export interface ApplicationTimeline {
  applicationId: string;
  currentMilestone: string;
  overallProgress: number;
  estimatedCompletionDate: Date;
  isOnTrack: boolean;
  delayDays: number;
  milestones: TimelineEntry[];
  criticalPath: string[];
}

export class TimelineManager {
  private defaultMilestones: Milestone[] = [];

  constructor(private prisma: PrismaClient) {
    this.initializeDefaultMilestones();
  }

  /**
   * Initialize default admission milestones
   */
  private initializeDefaultMilestones(): void {
    this.defaultMilestones = [
      {
        id: 'application-submission',
        name: 'Application Submission',
        description: 'Initial application submitted by applicant',
        status: 'SUBMITTED',
        estimatedDuration: 0,
        isRequired: true,
        dependencies: []
      },
      {
        id: 'initial-review',
        name: 'Initial Review',
        description: 'Application undergoes initial completeness review',
        status: 'UNDER_REVIEW',
        estimatedDuration: 2,
        isRequired: true,
        dependencies: ['application-submission']
      },
      {
        id: 'document-verification',
        name: 'Document Verification',
        description: 'All required documents are verified for authenticity',
        status: 'UNDER_REVIEW',
        estimatedDuration: 3,
        isRequired: true,
        dependencies: ['initial-review']
      },
      {
        id: 'eligibility-assessment',
        name: 'Eligibility Assessment',
        description: 'Basic eligibility requirements are assessed',
        status: 'ASSESSMENT_PENDING',
        estimatedDuration: 2,
        isRequired: true,
        dependencies: ['document-verification']
      },
      {
        id: 'spiritual-evaluation',
        name: 'Spiritual Evaluation',
        description: 'Spiritual maturity and calling are evaluated',
        status: 'ASSESSMENT_PENDING',
        estimatedDuration: 5,
        isRequired: true,
        dependencies: ['eligibility-assessment']
      },
      {
        id: 'academic-assessment',
        name: 'Academic Assessment',
        description: 'Academic readiness and potential are assessed',
        status: 'ASSESSMENT_PENDING',
        estimatedDuration: 4,
        isRequired: true,
        dependencies: ['eligibility-assessment']
      },
      {
        id: 'interview-scheduling',
        name: 'Interview Scheduling',
        description: 'Interview is scheduled with admissions committee',
        status: 'INTERVIEW_SCHEDULED',
        estimatedDuration: 3,
        isRequired: true,
        dependencies: ['spiritual-evaluation', 'academic-assessment']
      },
      {
        id: 'interview-conduct',
        name: 'Interview Conduct',
        description: 'Interview is conducted with applicant',
        status: 'INTERVIEW_SCHEDULED',
        estimatedDuration: 1,
        isRequired: true,
        dependencies: ['interview-scheduling']
      },
      {
        id: 'committee-review',
        name: 'Committee Review',
        description: 'Admissions committee reviews complete application',
        status: 'DECISION_PENDING',
        estimatedDuration: 7,
        isRequired: true,
        dependencies: ['interview-conduct']
      },
      {
        id: 'final-decision',
        name: 'Final Decision',
        description: 'Final admission decision is made and communicated',
        status: 'ACCEPTED', // or REJECTED, WAITLISTED
        estimatedDuration: 1,
        isRequired: true,
        dependencies: ['committee-review']
      }
    ];
  }

  /**
   * Initialize timeline for new application
   */
  async initializeApplicationTimeline(applicationId: string): Promise<ApplicationTimeline> {
    try {
      logger.info(`Initializing timeline for application ${applicationId}`);

      const application = await this.prisma.application.findUnique({
        where: { id: applicationId }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      // Create timeline entries for all milestones
      const milestones: TimelineEntry[] = this.defaultMilestones.map(milestone => ({
        id: `${applicationId}-${milestone.id}`,
        applicationId,
        milestoneId: milestone.id,
        status: milestone.id === 'application-submission' ? 'COMPLETED' : 'PENDING',
        startedAt: milestone.id === 'application-submission' ? application.createdAt : undefined,
        completedAt: milestone.id === 'application-submission' ? application.createdAt : undefined,
        estimatedCompletionDate: this.calculateEstimatedDate(application.createdAt, milestone),
        actualDuration: milestone.id === 'application-submission' ? 0 : undefined
      }));

      // Calculate overall timeline
      const timeline: ApplicationTimeline = {
        applicationId,
        currentMilestone: 'initial-review',
        overallProgress: this.calculateOverallProgress(milestones),
        estimatedCompletionDate: this.calculateOverallEstimatedCompletion(application.createdAt),
        isOnTrack: true,
        delayDays: 0,
        milestones,
        criticalPath: this.calculateCriticalPath()
      };

      // Store timeline in application record
      await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          applicationTimeline: {
            push: {
              event: 'TIMELINE_INITIALIZED',
              timestamp: new Date().toISOString(),
              details: {
                totalMilestones: milestones.length,
                estimatedCompletion: timeline.estimatedCompletionDate
              }
            }
          }
        }
      });

      logger.info(`Timeline initialized for application ${applicationId}`);
      return timeline;

    } catch (error) {
      logger.error('Error initializing application timeline:', error);
      throw error;
    }
  }

  /**
   * Update milestone status
   */
  async updateMilestone(
    applicationId: string,
    milestoneId: string,
    status: TimelineEntry['status'],
    completedBy?: string,
    notes?: string
  ): Promise<ApplicationTimeline> {
    try {
      logger.info(`Updating milestone ${milestoneId} for application ${applicationId} to ${status}`);

      const timeline = await this.getApplicationTimeline(applicationId);
      const milestoneIndex = timeline.milestones.findIndex(m => m.milestoneId === milestoneId);

      if (milestoneIndex === -1) {
        throw new Error(`Milestone ${milestoneId} not found`);
      }

      const milestone = timeline.milestones[milestoneIndex];
      const now = new Date();

      // Update milestone
      if (status === 'IN_PROGRESS' && !milestone.startedAt) {
        milestone.startedAt = now;
      }

      if (status === 'COMPLETED' || status === 'SKIPPED') {
        milestone.completedAt = now;
        if (milestone.startedAt) {
          milestone.actualDuration = Math.ceil(
            (now.getTime() - milestone.startedAt.getTime()) / (1000 * 60 * 60 * 24)
          );
        }
        milestone.completedBy = completedBy;
      }

      milestone.status = status;
      milestone.notes = notes;

      // Update current milestone and progress
      timeline.currentMilestone = this.getCurrentMilestone(timeline.milestones);
      timeline.overallProgress = this.calculateOverallProgress(timeline.milestones);
      
      // Check if timeline is on track
      const trackingInfo = this.calculateTimelineTracking(timeline);
      timeline.isOnTrack = trackingInfo.isOnTrack;
      timeline.delayDays = trackingInfo.delayDays;

      // Update application record
      await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          applicationTimeline: {
            push: {
              event: `MILESTONE_${status}`,
              timestamp: now.toISOString(),
              details: {
                milestoneId,
                milestoneName: this.getMilestoneName(milestoneId),
                completedBy,
                notes,
                actualDuration: milestone.actualDuration
              }
            }
          }
        }
      });

      logger.info(`Milestone ${milestoneId} updated successfully for application ${applicationId}`);
      return timeline;

    } catch (error) {
      logger.error('Error updating milestone:', error);
      throw error;
    }
  }

  /**
   * Get application timeline
   */
  async getApplicationTimeline(applicationId: string): Promise<ApplicationTimeline> {
    try {
      const application = await this.prisma.application.findUnique({
        where: { id: applicationId }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      // In a real implementation, timeline data would be stored in a separate table
      // For now, we'll reconstruct it from the application status and timeline events
      return this.reconstructTimelineFromApplication(application);

    } catch (error) {
      logger.error('Error getting application timeline:', error);
      throw error;
    }
  }

  /**
   * Get timeline statistics
   */
  async getTimelineStatistics(): Promise<{
    averageProcessingTime: number;
    onTrackApplications: number;
    delayedApplications: number;
    bottleneckMilestones: Array<{ milestoneId: string; averageDelay: number }>;
  }> {
    try {
      // In a real implementation, this would query timeline data from database
      // For now, we'll return mock statistics
      
      const applications = await this.prisma.application.findMany({
        where: {
          status: {
            notIn: ['WITHDRAWN']
          }
        }
      });

      const totalApplications = applications.length;
      const completedApplications = applications.filter(app => 
        ['ACCEPTED', 'REJECTED'].includes(app.status)
      ).length;

      // Calculate average processing time (mock calculation)
      const averageProcessingTime = 21; // days

      // Calculate on-track vs delayed (mock calculation)
      const onTrackApplications = Math.floor(totalApplications * 0.7);
      const delayedApplications = totalApplications - onTrackApplications;

      // Identify bottleneck milestones (mock data)
      const bottleneckMilestones = [
        { milestoneId: 'spiritual-evaluation', averageDelay: 3.2 },
        { milestoneId: 'committee-review', averageDelay: 2.8 },
        { milestoneId: 'interview-scheduling', averageDelay: 2.1 }
      ];

      return {
        averageProcessingTime,
        onTrackApplications,
        delayedApplications,
        bottleneckMilestones
      };

    } catch (error) {
      logger.error('Error getting timeline statistics:', error);
      throw error;
    }
  }

  /**
   * Calculate estimated completion date for a milestone
   */
  private calculateEstimatedDate(startDate: Date, milestone: Milestone): Date {
    const dependencyDays = milestone.dependencies.reduce((total, depId) => {
      const dep = this.defaultMilestones.find(m => m.id === depId);
      return total + (dep?.estimatedDuration || 0);
    }, 0);

    const totalDays = dependencyDays + milestone.estimatedDuration;
    const estimatedDate = new Date(startDate);
    estimatedDate.setDate(estimatedDate.getDate() + totalDays);
    
    return estimatedDate;
  }

  /**
   * Calculate overall estimated completion date
   */
  private calculateOverallEstimatedCompletion(startDate: Date): Date {
    const totalDays = this.defaultMilestones.reduce((total, milestone) => {
      return total + milestone.estimatedDuration;
    }, 0);

    const completionDate = new Date(startDate);
    completionDate.setDate(completionDate.getDate() + totalDays);
    
    return completionDate;
  }

  /**
   * Calculate overall progress percentage
   */
  private calculateOverallProgress(milestones: TimelineEntry[]): number {
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => 
      m.status === 'COMPLETED' || m.status === 'SKIPPED'
    ).length;

    return Math.round((completedMilestones / totalMilestones) * 100);
  }

  /**
   * Get current milestone
   */
  private getCurrentMilestone(milestones: TimelineEntry[]): string {
    // Find the first milestone that is not completed or skipped
    const currentMilestone = milestones.find(m => 
      m.status !== 'COMPLETED' && m.status !== 'SKIPPED'
    );

    return currentMilestone?.milestoneId || 'final-decision';
  }

  /**
   * Calculate critical path
   */
  private calculateCriticalPath(): string[] {
    // For simplicity, return the main path through required milestones
    return this.defaultMilestones
      .filter(m => m.isRequired)
      .map(m => m.id);
  }

  /**
   * Calculate timeline tracking information
   */
  private calculateTimelineTracking(timeline: ApplicationTimeline): {
    isOnTrack: boolean;
    delayDays: number;
  } {
    const now = new Date();
    const estimatedDate = timeline.estimatedCompletionDate;
    
    if (now > estimatedDate) {
      const delayMs = now.getTime() - estimatedDate.getTime();
      const delayDays = Math.ceil(delayMs / (1000 * 60 * 60 * 24));
      
      return {
        isOnTrack: false,
        delayDays
      };
    }

    return {
      isOnTrack: true,
      delayDays: 0
    };
  }

  /**
   * Get milestone name by ID
   */
  private getMilestoneName(milestoneId: string): string {
    const milestone = this.defaultMilestones.find(m => m.id === milestoneId);
    return milestone?.name || milestoneId;
  }

  /**
   * Reconstruct timeline from application data
   */
  private reconstructTimelineFromApplication(application: Application): ApplicationTimeline {
    // This is a simplified reconstruction based on application status
    // In a real implementation, timeline data would be stored separately
    
    const milestones: TimelineEntry[] = this.defaultMilestones.map(milestone => {
      const isCompleted = this.isMilestoneCompletedForStatus(milestone.id, application.status);
      const isInProgress = this.isMilestoneInProgressForStatus(milestone.id, application.status);
      
      return {
        id: `${application.id}-${milestone.id}`,
        applicationId: application.id,
        milestoneId: milestone.id,
        status: isCompleted ? 'COMPLETED' : (isInProgress ? 'IN_PROGRESS' : 'PENDING'),
        startedAt: isCompleted || isInProgress ? application.createdAt : undefined,
        completedAt: isCompleted ? application.updatedAt : undefined,
        estimatedCompletionDate: this.calculateEstimatedDate(application.createdAt, milestone)
      };
    });

    return {
      applicationId: application.id,
      currentMilestone: this.getCurrentMilestone(milestones),
      overallProgress: this.calculateOverallProgress(milestones),
      estimatedCompletionDate: this.calculateOverallEstimatedCompletion(application.createdAt),
      isOnTrack: true, // Simplified
      delayDays: 0, // Simplified
      milestones,
      criticalPath: this.calculateCriticalPath()
    };
  }

  /**
   * Check if milestone is completed for given application status
   */
  private isMilestoneCompletedForStatus(milestoneId: string, status: ApplicationStatus): boolean {
    const statusOrder = ['SUBMITTED', 'UNDER_REVIEW', 'ASSESSMENT_PENDING', 'INTERVIEW_SCHEDULED', 'DECISION_PENDING'];
    const milestoneStatusMap: Record<string, string> = {
      'application-submission': 'SUBMITTED',
      'initial-review': 'UNDER_REVIEW',
      'document-verification': 'UNDER_REVIEW',
      'eligibility-assessment': 'ASSESSMENT_PENDING',
      'spiritual-evaluation': 'ASSESSMENT_PENDING',
      'academic-assessment': 'ASSESSMENT_PENDING',
      'interview-scheduling': 'INTERVIEW_SCHEDULED',
      'interview-conduct': 'INTERVIEW_SCHEDULED',
      'committee-review': 'DECISION_PENDING',
      'final-decision': 'ACCEPTED' // or REJECTED, WAITLISTED
    };

    const milestoneStatus = milestoneStatusMap[milestoneId];
    if (!milestoneStatus) return false;

    const currentIndex = statusOrder.indexOf(status);
    const milestoneIndex = statusOrder.indexOf(milestoneStatus);

    return currentIndex > milestoneIndex || 
           (currentIndex === milestoneIndex && milestoneId !== 'final-decision');
  }

  /**
   * Check if milestone is in progress for given application status
   */
  private isMilestoneInProgressForStatus(milestoneId: string, status: ApplicationStatus): boolean {
    const milestoneStatusMap: Record<string, string> = {
      'application-submission': 'SUBMITTED',
      'initial-review': 'UNDER_REVIEW',
      'document-verification': 'UNDER_REVIEW',
      'eligibility-assessment': 'ASSESSMENT_PENDING',
      'spiritual-evaluation': 'ASSESSMENT_PENDING',
      'academic-assessment': 'ASSESSMENT_PENDING',
      'interview-scheduling': 'INTERVIEW_SCHEDULED',
      'interview-conduct': 'INTERVIEW_SCHEDULED',
      'committee-review': 'DECISION_PENDING',
      'final-decision': 'ACCEPTED' // or REJECTED, WAITLISTED
    };

    return milestoneStatusMap[milestoneId] === status;
  }
}