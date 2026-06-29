/**
 * Notification Batching Service
 * Manages batching of notifications to prevent spam
 */

import { PrismaClient } from '@prisma/client';
import { NotificationBatch, Notification } from '../types/notification.types';
import { notificationConfig } from '../config/notification.config';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export default class NotificationBatchingService {
  /**
   * Process pending batches
   */
  async processPendingBatches(): Promise<void> {
    try {
      const now = new Date();

      const pendingBatches = await prisma.notificationBatch.findMany({
        where: {
          status: 'pending',
          scheduledFor: {
            lte: now,
          },
        },
        include: {
          notifications: true,
        },
      });

      for (const batch of pendingBatches) {
        await this.sendBatch(batch.id);
      }

      logger.info('Processed pending notification batches', { count: pendingBatches.length });
    } catch (error) {
      logger.error('Error processing pending batches', { error });
      throw new Error('Failed to process pending batches');
    }
  }

  /**
   * Send a notification batch
   */
  async sendBatch(batchId: string): Promise<void> {
    try {
      const batch = await prisma.notificationBatch.findUnique({
        where: { id: batchId },
        include: {
          notifications: true,
        },
      });

      if (!batch) {
        throw new Error('Batch not found');
      }

      // Group notifications by category
      const groupedNotifications = this.groupNotificationsByCategory(
        batch.notifications as Notification[]
      );

      // Create digest notification
      const digestContent = this.createDigestContent(groupedNotifications);

      // Send digest
      await prisma.notification.create({
        data: {
          userId: batch.userId,
          category: 'system',
          priority: 'normal',
          channels: ['email', 'in_app'],
          subject: `Your ScrollUniversity Digest - ${batch.notifications.length} updates`,
          content: digestContent,
          status: 'sent',
          sentAt: new Date(),
        },
      });

      // Mark batch as sent
      await prisma.notificationBatch.update({
        where: { id: batchId },
        data: {
          status: 'sent',
          sentAt: new Date(),
        },
      });

      // Mark individual notifications as delivered
      await prisma.notification.updateMany({
        where: {
          id: {
            in: batch.notifications.map((n) => n.id),
          },
        },
        data: {
          status: 'delivered',
          deliveredAt: new Date(),
        },
      });

      logger.info('Notification batch sent', { batchId, count: batch.notifications.length });
    } catch (error) {
      logger.error('Error sending batch', { error, batchId });
      throw new Error('Failed to send batch');
    }
  }

  /**
   * Create batch for user
   */
  async createBatch(userId: string, scheduledFor: Date): Promise<NotificationBatch> {
    try {
      const batch = await prisma.notificationBatch.create({
        data: {
          userId,
          scheduledFor,
          status: 'pending',
        },
      });

      logger.info('Notification batch created', { batchId: batch.id, userId });

      return batch as NotificationBatch;
    } catch (error) {
      logger.error('Error creating batch', { error, userId });
      throw new Error('Failed to create batch');
    }
  }

  /**
   * Add notification to batch
   */
  async addToBatch(notificationId: string, batchId: string): Promise<void> {
    try {
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          batchId,
        },
      });

      logger.info('Notification added to batch', { notificationId, batchId });
    } catch (error) {
      logger.error('Error adding notification to batch', { error, notificationId, batchId });
      throw new Error('Failed to add notification to batch');
    }
  }

  /**
   * Cancel batch
   */
  async cancelBatch(batchId: string): Promise<void> {
    try {
      await prisma.notificationBatch.update({
        where: { id: batchId },
        data: {
          status: 'cancelled',
        },
      });

      logger.info('Notification batch cancelled', { batchId });
    } catch (error) {
      logger.error('Error cancelling batch', { error, batchId });
      throw new Error('Failed to cancel batch');
    }
  }

  /**
   * Get user batches
   */
  async getUserBatches(userId: string): Promise<NotificationBatch[]> {
    try {
      const batches = await prisma.notificationBatch.findMany({
        where: { userId },
        include: {
          notifications: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return batches as NotificationBatch[];
    } catch (error) {
      logger.error('Error getting user batches', { error, userId });
      throw new Error('Failed to get user batches');
    }
  }

  /**
   * Helper: Group notifications by category
   */
  private groupNotificationsByCategory(
    notifications: Notification[]
  ): Map<string, Notification[]> {
    const grouped = new Map<string, Notification[]>();

    for (const notification of notifications) {
      const category = notification.category;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(notification);
    }

    return grouped;
  }

  /**
   * Helper: Create digest content
   */
  private createDigestContent(grouped: Map<string, Notification[]>): string {
    let content = '<h2>Your ScrollUniversity Updates</h2>';

    for (const [category, notifications] of grouped) {
      content += `<h3>${this.formatCategoryName(category)} (${notifications.length})</h3>`;
      content += '<ul>';

      for (const notification of notifications) {
        content += `<li><strong>${notification.subject}</strong><br>${this.truncateContent(notification.content, 100)}</li>`;
      }

      content += '</ul>';
    }

    content += '<p>View all notifications in your dashboard.</p>';

    return content;
  }

  /**
   * Helper: Format category name
   */
  private formatCategoryName(category: string): string {
    return category
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Helper: Truncate content
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }

  /**
   * Check if batch size limit reached
   */
  async isBatchFull(batchId: string): Promise<boolean> {
    try {
      const count = await prisma.notification.count({
        where: { batchId },
      });

      return count >= notificationConfig.batching.maxBatchSize;
    } catch (error) {
      logger.error('Error checking batch size', { error, batchId });
      return false;
    }
  }
}
