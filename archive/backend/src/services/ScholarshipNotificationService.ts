/**
 * Scholarship Notification Service
 * "Let your light shine before others" - Matthew 5:16
 * 
 * Handles automated notifications for scholarship system
 */

import { PrismaClient } from '@prisma/client';
import {
  NotificationData,
  ApplicationStatus
} from '../types/scholarship.types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export default class ScholarshipNotificationService {
  /**
   * Send application submitted notification
   */
  async sendApplicationSubmittedNotification(
    userId: string,
    applicationId: string,
    scholarshipName: string
  ): Promise<void> {
    try {
      const notification: NotificationData = {
        recipientId: userId,
        type: 'APPLICATION_SUBMITTED',
        subject: 'Scholarship Application Received',
        message: `Your application for ${scholarshipName} has been successfully submitted and is under review.`,
        data: { applicationId, scholarshipName },
        channels: ['email', 'in_app'],
        priority: 'medium'
      };

      await this.createNotification(notification, null, applicationId);
      logger.info('Application submitted notification sent', { userId, applicationId });
    } catch (error) {
      logger.error('Error sending application submitted notification', { error, userId });
    }
  }

  /**
   * Send application reviewed notification
   */
  async sendApplicationReviewedNotification(
    userId: string,
    applicationId: string,
    status: ApplicationStatus,
    scholarshipName: string
  ): Promise<void> {
    try {
      let subject: string;
      let message: string;
      let priority: 'low' | 'medium' | 'high' | 'urgent' = 'high';

      switch (status) {
        case ApplicationStatus.APPROVED:
          subject = 'Congratulations! Scholarship Approved';
          message = `Your application for ${scholarshipName} has been approved! Congratulations on this achievement.`;
          priority = 'urgent';
          break;
        case ApplicationStatus.REJECTED:
          subject = 'Scholarship Application Update';
          message = `We regret to inform you that your application for ${scholarshipName} was not approved at this time. We encourage you to apply for other opportunities.`;
          break;
        case ApplicationStatus.WAITLISTED:
          subject = 'Scholarship Application Waitlisted';
          message = `Your application for ${scholarshipName} has been placed on the waitlist. We will notify you if a spot becomes available.`;
          break;
        case ApplicationStatus.PENDING_DOCUMENTS:
          subject = 'Additional Documents Required';
          message = `Your application for ${scholarshipName} requires additional documentation. Please submit the required documents as soon as possible.`;
          priority = 'high';
          break;
        default:
          subject = 'Scholarship Application Update';
          message = `Your application for ${scholarshipName} status has been updated to: ${status}`;
      }

      const notification: NotificationData = {
        recipientId: userId,
        type: `APPLICATION_${status}`,
        subject,
        message,
        data: { applicationId, scholarshipName, status },
        channels: ['email', 'push', 'in_app'],
        priority
      };

      await this.createNotification(notification, null, applicationId);
      logger.info('Application reviewed notification sent', { userId, applicationId, status });
    } catch (error) {
      logger.error('Error sending application reviewed notification', { error, userId });
    }
  }

  /**
   * Send disbursement notification
   */
  async sendDisbursementNotification(
    userId: string,
    disbursementId: string,
    amount: number,
    scholarshipName: string
  ): Promise<void> {
    try {
      const notification: NotificationData = {
        recipientId: userId,
        type: 'DISBURSEMENT_PROCESSED',
        subject: 'Scholarship Funds Disbursed',
        message: `Your scholarship funds of $${amount.toFixed(2)} from ${scholarshipName} have been processed and will be applied to your account.`,
        data: { disbursementId, amount, scholarshipName },
        channels: ['email', 'push', 'in_app'],
        priority: 'high'
      };

      await this.createNotification(notification, null, null);
      logger.info('Disbursement notification sent', { userId, disbursementId });
    } catch (error) {
      logger.error('Error sending disbursement notification', { error, userId });
    }
  }

  /**
   * Send deadline reminder notification
   */
  async sendDeadlineReminderNotification(
    userId: string,
    scholarshipId: string,
    scholarshipName: string,
    daysRemaining: number
  ): Promise<void> {
    try {
      const notification: NotificationData = {
        recipientId: userId,
        type: 'DEADLINE_REMINDER',
        subject: `Scholarship Deadline Approaching - ${daysRemaining} Days Left`,
        message: `The application deadline for ${scholarshipName} is in ${daysRemaining} days. Don't miss this opportunity!`,
        data: { scholarshipId, scholarshipName, daysRemaining },
        channels: ['email', 'push', 'in_app'],
        priority: daysRemaining <= 3 ? 'urgent' : 'high'
      };

      await this.createNotification(notification, scholarshipId, null);
      logger.info('Deadline reminder sent', { userId, scholarshipId, daysRemaining });
    } catch (error) {
      logger.error('Error sending deadline reminder', { error, userId });
    }
  }

  /**
   * Send new scholarship notification
   */
  async sendNewScholarshipNotification(
    userId: string,
    scholarshipId: string,
    scholarshipName: string,
    matchScore: number
  ): Promise<void> {
    try {
      const notification: NotificationData = {
        recipientId: userId,
        type: 'NEW_SCHOLARSHIP',
        subject: 'New Scholarship Opportunity Available',
        message: `A new scholarship opportunity "${scholarshipName}" is now available and matches your profile (${matchScore}% match). Apply now!`,
        data: { scholarshipId, scholarshipName, matchScore },
        channels: ['email', 'in_app'],
        priority: matchScore >= 80 ? 'high' : 'medium'
      };

      await this.createNotification(notification, scholarshipId, null);
      logger.info('New scholarship notification sent', { userId, scholarshipId });
    } catch (error) {
      logger.error('Error sending new scholarship notification', { error, userId });
    }
  }

  /**
   * Send document verification notification
   */
  async sendDocumentVerificationNotification(
    userId: string,
    applicationId: string,
    documentType: string,
    verified: boolean
  ): Promise<void> {
    try {
      const notification: NotificationData = {
        recipientId: userId,
        type: verified ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED',
        subject: verified ? 'Document Verified' : 'Document Verification Failed',
        message: verified
          ? `Your ${documentType} has been verified successfully.`
          : `Your ${documentType} could not be verified. Please upload a new document.`,
        data: { applicationId, documentType, verified },
        channels: ['email', 'in_app'],
        priority: verified ? 'medium' : 'high'
      };

      await this.createNotification(notification, null, applicationId);
      logger.info('Document verification notification sent', { userId, documentType, verified });
    } catch (error) {
      logger.error('Error sending document verification notification', { error, userId });
    }
  }

  /**
   * Create notification in database
   */
  private async createNotification(
    notification: NotificationData,
    scholarshipId: string | null,
    applicationId: string | null
  ): Promise<void> {
    try {
      await prisma.scholarshipNotification.create({
        data: {
          recipientId: notification.recipientId,
          scholarshipId,
          applicationId,
          type: notification.type,
          subject: notification.subject,
          message: notification.message,
          data: notification.data as any,
          channels: notification.channels,
          priority: notification.priority,
          scheduledAt: notification.scheduledAt
        }
      });
    } catch (error) {
      logger.error('Error creating notification', { error, notification });
      throw error;
    }
  }

  /**
   * Send batch notifications
   */
  async sendBatchNotifications(notifications: NotificationData[]): Promise<void> {
    try {
      for (const notification of notifications) {
        await this.createNotification(notification, null, null);
      }
      logger.info('Batch notifications sent', { count: notifications.length });
    } catch (error) {
      logger.error('Error sending batch notifications', { error });
    }
  }

  /**
   * Get unread notifications for user
   */
  async getUnreadNotifications(userId: string): Promise<any[]> {
    try {
      return await prisma.scholarshipNotification.findMany({
        where: {
          recipientId: userId,
          read: false
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      logger.error('Error fetching unread notifications', { error, userId });
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await prisma.scholarshipNotification.update({
        where: { id: notificationId },
        data: {
          read: true,
          readAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error marking notification as read', { error, notificationId });
    }
  }

  /**
   * Process scheduled notifications
   */
  async processScheduledNotifications(): Promise<void> {
    try {
      const notifications = await prisma.scholarshipNotification.findMany({
        where: {
          sent: false,
          scheduledAt: {
            lte: new Date()
          }
        }
      });

      for (const notification of notifications) {
        // Here you would integrate with actual email/SMS/push notification services
        // For now, we just mark as sent
        await prisma.scholarshipNotification.update({
          where: { id: notification.id },
          data: {
            sent: true,
            sentAt: new Date()
          }
        });
      }

      logger.info('Scheduled notifications processed', { count: notifications.length });
    } catch (error) {
      logger.error('Error processing scheduled notifications', { error });
    }
  }
}
