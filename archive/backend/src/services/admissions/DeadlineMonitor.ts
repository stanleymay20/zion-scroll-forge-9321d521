/**
 * ScrollUniversity Admissions - Deadline Monitor
 * "Many are called, but few are chosen" - Matthew 22:14
 * 
 * Deadline monitoring and automated reminders system
 */

import { PrismaClient, Application, ApplicationStatus } from '@prisma/client';
import { logger } from '../../utils/logger';
import { NotificationManager } from './NotificationManager';

export interface Deadline {
  id: string;
  applicationId: string;
  type: DeadlineType;
  description: string;
  dueDate: Date;
  reminderDates: Date[];
  isHard: boolean; // Hard deadline vs soft deadline
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  createdAt: Date;
  completedAt?: Date;
  metadata?: any;
}

export enum DeadlineType {
  APPLICATION_SUBMISSION = 'APPLICATION_SUBMISSION',
  DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD',
  INTERVIEW_RESPONSE = 'INTERVIEW_RESPONSE',
  ENROLLMENT_CONFIRMATION = 'ENROLLMENT_CONFIRMATION',
  TUITION_DEPOSIT = 'TUITION_DEPOSIT',
  HOUSING_APPLICATION = 'HOUSING_APPLICATION',
  ORIENTATION_REGISTRATION = 'ORIENTATION_REGISTRATION',
  COURSE_REGISTRATION = 'COURSE_REGISTRATION',
  FINANCIAL_AID = 'FINANCIAL_AID',
  CUSTOM = 'CUSTOM'
}

export interface DeadlineRule {
  type: DeadlineType;
  description: string;
  daysFromTrigger: number;
  triggerEvent: string;
  reminderDays: number[]; // Days before deadline to send reminders
  isHard: boolean;
  isAutomatic: boolean;
  conditions?: any[];
}

export class DeadlineMonitor {
  private notificationManager: NotificationManager;
  private deadlineRules: DeadlineRule[] = [];

  constructor(private prisma: PrismaClient) {
    this.notificationManager = new NotificationManager();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default deadline rules
   */
  private initializeDefaultRules(): void {
    this.deadlineRules = [
      {
        type: DeadlineType.APPLICATION_SUBMISSION,
        description: 'Complete application submission',
        daysFromTrigger: 30,
        triggerEvent: 'APPLICATION_STARTED',
        reminderDays: [7, 3, 1],
        isHard: true,
        isAutomatic: true
      },
      {
        type: DeadlineType.DOCUMENT_UPLOAD,
        description: 'Upload all required documents',
        daysFromTrigger: 14,
        triggerEvent: 'APPLICATION_SUBMITTED',
        reminderDays: [7, 3, 1],
        isHard: false,
        isAutomatic: true
      },
      {
        type: DeadlineType.INTERVIEW_RESPONSE,
        description: 'Respond to interview invitation',
        daysFromTrigger: 7,
        triggerEvent: 'INTERVIEW_SCHEDULED',
        reminderDays: [3, 1],
        isHard: true,
        isAutomatic: true
      },
      {
        type: DeadlineType.ENROLLMENT_CONFIRMATION,
        description: 'Confirm enrollment and submit deposit',
        daysFromTrigger: 30,
        triggerEvent: 'ADMISSION_ACCEPTED',
        reminderDays: [14, 7, 3, 1],
        isHard: true,
        isAutomatic: true
      },
      {
        type: DeadlineType.TUITION_DEPOSIT,
        description: 'Submit tuition deposit',
        daysFromTrigger: 30,
        triggerEvent: 'ENROLLMENT_CONFIRMED',
        reminderDays: [14, 7, 3, 1],
        isHard: true,
        isAutomatic: true
      },
      {
        type: DeadlineType.HOUSING_APPLICATION,
        description: 'Submit housing application',
        daysFromTrigger: 60,
        triggerEvent: 'ENROLLMENT_CONFIRMED',
        reminderDays: [30, 14, 7, 3],
        isHard: false,
        isAutomatic: true
      },
      {
        type: DeadlineType.ORIENTATION_REGISTRATION,
        description: 'Register for orientation program',
        daysFromTrigger: 45,
        triggerEvent: 'ENROLLMENT_CONFIRMED',
        reminderDays: [21, 14, 7, 3],
        isHard: false,
        isAutomatic: true
      },
      {
        type: DeadlineType.COURSE_REGISTRATION,
        description: 'Complete course registration',
        daysFromTrigger: 90,
        triggerEvent: 'ENROLLMENT_CONFIRMED',
        reminderDays: [30, 14, 7, 3, 1],
        isHard: true,
        isAutomatic: true
      },
      {
        type: DeadlineType.FINANCIAL_AID,
        description: 'Submit financial aid documentation',
        daysFromTrigger: 45,
        triggerEvent: 'ADMISSION_ACCEPTED',
        reminderDays: [21, 14, 7, 3],
        isHard: false,
        isAutomatic: true
      }
    ];
  }

  /**
   * Create deadline for application
   */
  async createDeadline(
    applicationId: string,
    type: DeadlineType,
    dueDate: Date,
    description?: string,
    isHard: boolean = false,
    metadata?: any
  ): Promise<Deadline> {
    try {
      logger.info(`Creating deadline ${type} for application ${applicationId}`);

      const rule = this.deadlineRules.find(r => r.type === type);
      const reminderDates = this.calculateReminderDates(dueDate, rule?.reminderDays || [1]);

      const deadline: Deadline = {
        id: crypto.randomUUID(),
        applicationId,
        type,
        description: description || rule?.description || `${type} deadline`,
        dueDate,
        reminderDates,
        isHard,
        status: 'ACTIVE',
        createdAt: new Date(),
        metadata
      };

      // In a real implementation, this would be stored in a deadlines table
      // For now, we'll add it to the application timeline
      await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          applicationTimeline: {
            push: {
              event: 'DEADLINE_CREATED',
              timestamp: new Date().toISOString(),
              details: {
                deadlineId: deadline.id,
                type: deadline.type,
                dueDate: deadline.dueDate.toISOString(),
                isHard: deadline.isHard
              }
            }
          }
        }
      });

      logger.info(`Deadline ${type} created for application ${applicationId}`);
      return deadline;

    } catch (error) {
      logger.error('Error creating deadline:', error);
      throw error;
    }
  }

  /**
   * Process automatic deadline creation based on events
   */
  async processAutomaticDeadlines(applicationId: string, triggerEvent: string): Promise<Deadline[]> {
    try {
      logger.info(`Processing automatic deadlines for application ${applicationId}, event: ${triggerEvent}`);

      const applicableRules = this.deadlineRules.filter(rule => 
        rule.isAutomatic && rule.triggerEvent === triggerEvent
      );

      const createdDeadlines: Deadline[] = [];

      for (const rule of applicableRules) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + rule.daysFromTrigger);

        const deadline = await this.createDeadline(
          applicationId,
          rule.type,
          dueDate,
          rule.description,
          rule.isHard,
          { triggerEvent, ruleId: `${rule.type}-${rule.triggerEvent}` }
        );

        createdDeadlines.push(deadline);
      }

      logger.info(`Created ${createdDeadlines.length} automatic deadlines for application ${applicationId}`);
      return createdDeadlines;

    } catch (error) {
      logger.error('Error processing automatic deadlines:', error);
      throw error;
    }
  }

  /**
   * Check and process upcoming deadlines
   */
  async processUpcomingDeadlines(): Promise<void> {
    try {
      logger.info('Processing upcoming deadlines');

      // Get all active applications
      const applications = await this.prisma.application.findMany({
        where: {
          status: {
            notIn: ['WITHDRAWN', 'REJECTED']
          }
        },
        include: {
          applicant: true
        }
      });

      const now = new Date();
      const processedCount = { reminders: 0, expired: 0 };

      for (const application of applications) {
        // In a real implementation, we would query deadlines from a separate table
        // For now, we'll simulate deadline checking based on application status and timeline
        const deadlines = await this.getApplicationDeadlines(application.id);

        for (const deadline of deadlines) {
          if (deadline.status !== 'ACTIVE') continue;

          // Check for expired deadlines
          if (now > deadline.dueDate) {
            await this.handleExpiredDeadline(application, deadline);
            processedCount.expired++;
            continue;
          }

          // Check for reminder notifications
          for (const reminderDate of deadline.reminderDates) {
            if (now >= reminderDate && now < new Date(reminderDate.getTime() + 60 * 60 * 1000)) {
              // Within 1 hour of reminder time
              await this.sendDeadlineReminder(application, deadline);
              processedCount.reminders++;
              break;
            }
          }
        }
      }

      logger.info(`Processed upcoming deadlines: ${processedCount.reminders} reminders sent, ${processedCount.expired} expired`);

    } catch (error) {
      logger.error('Error processing upcoming deadlines:', error);
      throw error;
    }
  }

  /**
   * Get application deadlines
   */
  async getApplicationDeadlines(applicationId: string): Promise<Deadline[]> {
    try {
      // In a real implementation, this would query from a deadlines table
      // For now, we'll return simulated deadlines based on application status
      
      const application = await this.prisma.application.findUnique({
        where: { id: applicationId }
      });

      if (!application) {
        return [];
      }

      return this.generateSimulatedDeadlines(application);

    } catch (error) {
      logger.error('Error getting application deadlines:', error);
      throw error;
    }
  }

  /**
   * Mark deadline as completed
   */
  async completeDeadline(applicationId: string, deadlineId: string): Promise<void> {
    try {
      logger.info(`Completing deadline ${deadlineId} for application ${applicationId}`);

      // In a real implementation, this would update the deadlines table
      await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          applicationTimeline: {
            push: {
              event: 'DEADLINE_COMPLETED',
              timestamp: new Date().toISOString(),
              details: {
                deadlineId,
                completedAt: new Date().toISOString()
              }
            }
          }
        }
      });

      logger.info(`Deadline ${deadlineId} completed for application ${applicationId}`);

    } catch (error) {
      logger.error('Error completing deadline:', error);
      throw error;
    }
  }

  /**
   * Extend deadline
   */
  async extendDeadline(
    applicationId: string,
    deadlineId: string,
    newDueDate: Date,
    reason: string
  ): Promise<void> {
    try {
      logger.info(`Extending deadline ${deadlineId} for application ${applicationId}`);

      // In a real implementation, this would update the deadlines table
      await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          applicationTimeline: {
            push: {
              event: 'DEADLINE_EXTENDED',
              timestamp: new Date().toISOString(),
              details: {
                deadlineId,
                newDueDate: newDueDate.toISOString(),
                reason
              }
            }
          }
        }
      });

      logger.info(`Deadline ${deadlineId} extended for application ${applicationId}`);

    } catch (error) {
      logger.error('Error extending deadline:', error);
      throw error;
    }
  }

  /**
   * Get deadline statistics
   */
  async getDeadlineStatistics(): Promise<{
    totalActive: number;
    upcomingThisWeek: number;
    overdue: number;
    completionRate: number;
    averageExtensions: number;
  }> {
    try {
      // In a real implementation, this would query deadline statistics from database
      // For now, we'll return mock statistics
      
      const applications = await this.prisma.application.findMany({
        where: {
          status: {
            notIn: ['WITHDRAWN']
          }
        }
      });

      const totalApplications = applications.length;
      
      return {
        totalActive: totalApplications * 3, // Assume 3 active deadlines per application
        upcomingThisWeek: Math.floor(totalApplications * 0.4),
        overdue: Math.floor(totalApplications * 0.1),
        completionRate: 85.5, // Percentage
        averageExtensions: 1.2
      };

    } catch (error) {
      logger.error('Error getting deadline statistics:', error);
      throw error;
    }
  }

  /**
   * Calculate reminder dates
   */
  private calculateReminderDates(dueDate: Date, reminderDays: number[]): Date[] {
    return reminderDays.map(days => {
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - days);
      return reminderDate;
    }).sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Handle expired deadline
   */
  private async handleExpiredDeadline(
    application: Application & { applicant: any },
    deadline: Deadline
  ): Promise<void> {
    try {
      logger.info(`Handling expired deadline ${deadline.id} for application ${application.id}`);

      // Send expiration notification
      await this.notificationManager.sendDeadlineReminder(
        application,
        `${deadline.description} - EXPIRED`,
        deadline.dueDate
      );

      // For hard deadlines, may need to take action (e.g., reject application)
      if (deadline.isHard) {
        await this.handleHardDeadlineExpiration(application, deadline);
      }

      // Mark deadline as expired
      await this.prisma.application.update({
        where: { id: application.id },
        data: {
          applicationTimeline: {
            push: {
              event: 'DEADLINE_EXPIRED',
              timestamp: new Date().toISOString(),
              details: {
                deadlineId: deadline.id,
                type: deadline.type,
                isHard: deadline.isHard,
                dueDate: deadline.dueDate.toISOString()
              }
            }
          }
        }
      });

    } catch (error) {
      logger.error('Error handling expired deadline:', error);
    }
  }

  /**
   * Handle hard deadline expiration
   */
  private async handleHardDeadlineExpiration(
    application: Application,
    deadline: Deadline
  ): Promise<void> {
    try {
      logger.info(`Handling hard deadline expiration for application ${application.id}`);

      // Different actions based on deadline type
      switch (deadline.type) {
        case DeadlineType.APPLICATION_SUBMISSION:
          // Application submission deadline expired - may need to close application
          break;
          
        case DeadlineType.ENROLLMENT_CONFIRMATION:
          // Enrollment confirmation deadline expired - may need to withdraw acceptance
          break;
          
        case DeadlineType.TUITION_DEPOSIT:
          // Tuition deposit deadline expired - may need to cancel enrollment
          break;
          
        default:
          // Log for manual review
          logger.warn(`Hard deadline expired for ${deadline.type} - manual review required`);
      }

    } catch (error) {
      logger.error('Error handling hard deadline expiration:', error);
    }
  }

  /**
   * Send deadline reminder
   */
  private async sendDeadlineReminder(
    application: Application & { applicant: any },
    deadline: Deadline
  ): Promise<void> {
    try {
      await this.notificationManager.sendDeadlineReminder(
        application,
        deadline.description,
        deadline.dueDate
      );

      // Log reminder sent
      await this.prisma.application.update({
        where: { id: application.id },
        data: {
          applicationTimeline: {
            push: {
              event: 'DEADLINE_REMINDER_SENT',
              timestamp: new Date().toISOString(),
              details: {
                deadlineId: deadline.id,
                type: deadline.type,
                dueDate: deadline.dueDate.toISOString()
              }
            }
          }
        }
      });

    } catch (error) {
      logger.error('Error sending deadline reminder:', error);
    }
  }

  /**
   * Generate simulated deadlines for testing
   */
  private generateSimulatedDeadlines(application: Application): Deadline[] {
    const deadlines: Deadline[] = [];
    const now = new Date();

    // Generate deadlines based on application status
    switch (application.status) {
      case 'SUBMITTED':
        deadlines.push({
          id: `${application.id}-doc-upload`,
          applicationId: application.id,
          type: DeadlineType.DOCUMENT_UPLOAD,
          description: 'Upload all required documents',
          dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days
          reminderDates: this.calculateReminderDates(
            new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
            [7, 3, 1]
          ),
          isHard: false,
          status: 'ACTIVE',
          createdAt: application.createdAt
        });
        break;

      case 'INTERVIEW_SCHEDULED':
        deadlines.push({
          id: `${application.id}-interview-response`,
          applicationId: application.id,
          type: DeadlineType.INTERVIEW_RESPONSE,
          description: 'Respond to interview invitation',
          dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
          reminderDates: this.calculateReminderDates(
            new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            [3, 1]
          ),
          isHard: true,
          status: 'ACTIVE',
          createdAt: application.createdAt
        });
        break;

      case 'ACCEPTED':
        deadlines.push({
          id: `${application.id}-enrollment`,
          applicationId: application.id,
          type: DeadlineType.ENROLLMENT_CONFIRMATION,
          description: 'Confirm enrollment and submit deposit',
          dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
          reminderDates: this.calculateReminderDates(
            new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
            [14, 7, 3, 1]
          ),
          isHard: true,
          status: 'ACTIVE',
          createdAt: application.createdAt
        });
        break;
    }

    return deadlines;
  }
}

// Import crypto for UUID generation
import crypto from 'crypto';