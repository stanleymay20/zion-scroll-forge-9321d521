/**
 * Notification Service
 * Core notification management and delivery orchestration
 */

import { PrismaClient } from '@prisma/client';
import {
  Notification,
  NotificationPreferences,
  NotificationTemplate,
  CreateNotificationRequest,
  BulkNotificationRequest,
  NotificationFilter,
  NotificationChannel,
  NotificationCategory,
  NotificationEngagement,
} from '../types/notification.types';
import { notificationConfig } from '../config/notification.config';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export default class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(request: CreateNotificationRequest): Promise<Notification> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(request.userId);

      // Filter channels based on preferences
      const allowedChannels = this.filterChannelsByPreferences(
        request.channels || ['email', 'in_app'],
        request.category,
        preferences
      );

      // Check if in quiet hours
      if (this.isInQuietHours(preferences)) {
        // Schedule for after quiet hours
        const scheduledFor = this.calculateNextAvailableTime(preferences);
        request.scheduledFor = scheduledFor;
      }

      // Check if batching is enabled
      if (preferences.batchingEnabled && request.priority !== 'urgent') {
        return await this.addToBatch(request, preferences);
      }

      // Create notification
      const notification = await prisma.notification.create({
        data: {
          userId: request.userId,
          templateId: request.templateId,
          category: request.category,
          priority: request.priority || 'normal',
          channels: allowedChannels,
          subject: request.subject,
          content: request.content,
          data: request.data || {},
          status: request.scheduledFor ? 'pending' : 'sent',
          scheduledFor: request.scheduledFor,
          expiresAt: request.expiresAt,
          sentAt: request.scheduledFor ? undefined : new Date(),
        },
      });

      // Send immediately if not scheduled
      if (!request.scheduledFor) {
        await this.deliverNotification(notification.id);
      }

      logger.info('Notification created', { notificationId: notification.id, userId: request.userId });

      return notification as Notification;
    } catch (error) {
      logger.error('Error creating notification', { error, request });
      throw new Error('Failed to create notification');
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(request: BulkNotificationRequest): Promise<{ sent: number; failed: number }> {
    try {
      let sent = 0;
      let failed = 0;

      for (const userId of request.userIds) {
        try {
          await this.createNotification({
            userId,
            templateId: request.templateId,
            category: request.category,
            priority: request.priority,
            channels: request.channels,
            subject: request.subject,
            content: request.content,
            data: request.data,
            scheduledFor: request.scheduledFor,
          });
          sent++;
        } catch (error) {
          logger.error('Failed to send notification to user', { userId, error });
          failed++;
        }
      }

      logger.info('Bulk notifications sent', { sent, failed, total: request.userIds.length });

      return { sent, failed };
    } catch (error) {
      logger.error('Error sending bulk notifications', { error, request });
      throw new Error('Failed to send bulk notifications');
    }
  }

  /**
   * Deliver notification through all channels
   */
  async deliverNotification(notificationId: string): Promise<void> {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      const channels = notification.channels as NotificationChannel[];

      for (const channel of channels) {
        try {
          await this.deliverToChannel(notification as Notification, channel);
        } catch (error) {
          logger.error('Failed to deliver notification to channel', { notificationId, channel, error });
        }
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'delivered',
          deliveredAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error delivering notification', { error, notificationId });
      throw new Error('Failed to deliver notification');
    }
  }

  /**
   * Deliver notification to specific channel
   */
  private async deliverToChannel(notification: Notification, channel: NotificationChannel): Promise<void> {
    const delivery = await prisma.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel,
        status: 'pending',
        recipient: await this.getRecipientForChannel(notification.userId, channel),
        retryCount: 0,
      },
    });

    try {
      switch (channel) {
        case 'email':
          await this.sendEmail(notification);
          break;
        case 'sms':
          await this.sendSMS(notification);
          break;
        case 'push':
          await this.sendPushNotification(notification);
          break;
        case 'websocket':
          await this.sendWebSocketNotification(notification);
          break;
        case 'in_app':
          // In-app notifications are stored in database and retrieved by client
          break;
      }

      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'delivered',
          sentAt: new Date(),
          deliveredAt: new Date(),
        },
      });
    } catch (error) {
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'failed',
          failureReason: (error as Error).message,
          retryCount: delivery.retryCount + 1,
        },
      });

      // Retry if under max attempts
      if (delivery.retryCount < notificationConfig.retries.maxAttempts) {
        const delay = this.calculateRetryDelay(delivery.retryCount);
        setTimeout(() => this.deliverToChannel(notification, channel), delay);
      }

      throw error;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(notification: Notification): Promise<void> {
    // Implementation would integrate with SendGrid, AWS SES, or SMTP
    logger.info('Sending email notification', { notificationId: notification.id });
    
    // Placeholder for actual email sending logic
    // await emailProvider.send({
    //   to: recipient,
    //   from: notificationConfig.email.from,
    //   subject: notification.subject,
    //   html: notification.content,
    // });
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(notification: Notification): Promise<void> {
    // Implementation would integrate with Twilio or AWS SNS
    logger.info('Sending SMS notification', { notificationId: notification.id });
    
    // Placeholder for actual SMS sending logic
    // await smsProvider.send({
    //   to: phoneNumber,
    //   from: notificationConfig.sms.from,
    //   body: notification.content,
    // });
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(notification: Notification): Promise<void> {
    // Implementation would integrate with FCM or APNS
    logger.info('Sending push notification', { notificationId: notification.id });
    
    // Placeholder for actual push notification logic
    // await pushProvider.send({
    //   token: deviceToken,
    //   notification: {
    //     title: notification.subject,
    //     body: notification.content,
    //   },
    // });
  }

  /**
   * Send WebSocket notification
   */
  private async sendWebSocketNotification(notification: Notification): Promise<void> {
    // Implementation would use Socket.io or similar
    logger.info('Sending WebSocket notification', { notificationId: notification.id });
    
    // Placeholder for actual WebSocket logic
    // io.to(notification.userId).emit('notification', notification);
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      let preferences = await prisma.notificationPreferences.findUnique({
        where: { userId },
      });

      if (!preferences) {
        // Create default preferences
        preferences = await prisma.notificationPreferences.create({
          data: {
            userId,
            email: {
              enabled: true,
              academic: true,
              spiritual: true,
              social: true,
              administrative: true,
              payment: true,
              system: true,
              marketing: false,
            },
            push: {
              enabled: true,
              academic: true,
              spiritual: true,
              social: true,
              administrative: true,
              payment: true,
              system: true,
              marketing: false,
            },
            sms: {
              enabled: false,
              academic: false,
              spiritual: false,
              social: false,
              administrative: true,
              payment: true,
              system: true,
              marketing: false,
            },
            inApp: {
              enabled: true,
              academic: true,
              spiritual: true,
              social: true,
              administrative: true,
              payment: true,
              system: true,
              marketing: true,
            },
            quietHours: {
              enabled: false,
              startTime: '22:00',
              endTime: '08:00',
              timezone: 'UTC',
            },
            batchingEnabled: false,
            batchInterval: 30,
          },
        });
      }

      return preferences as unknown as NotificationPreferences;
    } catch (error) {
      logger.error('Error getting user preferences', { error, userId });
      throw new Error('Failed to get user preferences');
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const preferences = await prisma.notificationPreferences.update({
        where: { userId },
        data: updates,
      });

      logger.info('Notification preferences updated', { userId });

      return preferences as unknown as NotificationPreferences;
    } catch (error) {
      logger.error('Error updating preferences', { error, userId });
      throw new Error('Failed to update preferences');
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(filter: NotificationFilter): Promise<Notification[]> {
    try {
      const where: any = {};

      if (filter.userId) where.userId = filter.userId;
      if (filter.category) where.category = filter.category;
      if (filter.status) where.status = filter.status;
      if (filter.priority) where.priority = filter.priority;
      if (filter.isRead !== undefined) {
        where.readAt = filter.isRead ? { not: null } : null;
      }
      if (filter.startDate || filter.endDate) {
        where.createdAt = {};
        if (filter.startDate) where.createdAt.gte = filter.startDate;
        if (filter.endDate) where.createdAt.lte = filter.endDate;
      }

      const notifications = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filter.limit || 50,
        skip: filter.offset || 0,
      });

      return notifications as Notification[];
    } catch (error) {
      logger.error('Error getting user notifications', { error, filter });
      throw new Error('Failed to get user notifications');
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'read',
          readAt: new Date(),
        },
      });

      logger.info('Notification marked as read', { notificationId });
    } catch (error) {
      logger.error('Error marking notification as read', { error, notificationId });
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await prisma.notification.delete({
        where: { id: notificationId },
      });

      logger.info('Notification deleted', { notificationId });
    } catch (error) {
      logger.error('Error deleting notification', { error, notificationId });
      throw new Error('Failed to delete notification');
    }
  }

  /**
   * Track notification engagement
   */
  async trackEngagement(engagement: NotificationEngagement): Promise<void> {
    try {
      await prisma.notificationEngagement.create({
        data: engagement,
      });

      // Update notification status if opened
      if (engagement.action === 'opened') {
        await this.markAsRead(engagement.notificationId);
      }

      logger.info('Notification engagement tracked', { engagement });
    } catch (error) {
      logger.error('Error tracking engagement', { error, engagement });
      throw new Error('Failed to track engagement');
    }
  }

  /**
   * Helper: Filter channels by user preferences
   */
  private filterChannelsByPreferences(
    channels: NotificationChannel[],
    category: NotificationCategory,
    preferences: NotificationPreferences
  ): NotificationChannel[] {
    return channels.filter((channel) => {
      const channelPrefs = preferences[channel];
      if (!channelPrefs || !channelPrefs.enabled) return false;
      return channelPrefs[category] !== false;
    });
  }

  /**
   * Helper: Check if in quiet hours
   */
  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours.enabled) return false;

    const now = new Date();
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: preferences.quietHours.timezone }));
    const currentTime = `${userTime.getHours().toString().padStart(2, '0')}:${userTime.getMinutes().toString().padStart(2, '0')}`;

    const { startTime, endTime } = preferences.quietHours;

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  /**
   * Helper: Calculate next available time after quiet hours
   */
  private calculateNextAvailableTime(preferences: NotificationPreferences): Date {
    const now = new Date();
    const endTime = preferences.quietHours.endTime;
    const [hours, minutes] = endTime.split(':').map(Number);

    const nextAvailable = new Date(now);
    nextAvailable.setHours(hours, minutes, 0, 0);

    if (nextAvailable <= now) {
      nextAvailable.setDate(nextAvailable.getDate() + 1);
    }

    return nextAvailable;
  }

  /**
   * Helper: Add notification to batch
   */
  private async addToBatch(
    request: CreateNotificationRequest,
    preferences: NotificationPreferences
  ): Promise<Notification> {
    const batchTime = new Date();
    batchTime.setMinutes(batchTime.getMinutes() + preferences.batchInterval);

    return await this.createNotification({
      ...request,
      scheduledFor: batchTime,
    });
  }

  /**
   * Helper: Get recipient for channel
   */
  private async getRecipientForChannel(userId: string, channel: NotificationChannel): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });

    if (!user) throw new Error('User not found');

    switch (channel) {
      case 'email':
        return user.email;
      case 'sms':
        return user.phone || '';
      case 'push':
      case 'websocket':
      case 'in_app':
        return userId;
      default:
        return userId;
    }
  }

  /**
   * Helper: Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const { initialDelay, backoffMultiplier } = notificationConfig.retries;
    return initialDelay * Math.pow(backoffMultiplier, retryCount);
  }
}
