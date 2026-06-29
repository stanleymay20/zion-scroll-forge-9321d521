/**
 * Notification Analytics Service
 * Tracks and analyzes notification performance and engagement
 */

import { PrismaClient } from '@prisma/client';
import {
  NotificationAnalytics,
  NotificationChannel,
  NotificationCategory,
  NotificationFilter,
} from '../types/notification.types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export default class NotificationAnalyticsService {
  /**
   * Get comprehensive notification analytics
   */
  async getAnalytics(filter: NotificationFilter): Promise<NotificationAnalytics> {
    try {
      const where = this.buildWhereClause(filter);

      const [
        totalSent,
        totalDelivered,
        totalRead,
        totalFailed,
        deliveries,
        notifications,
      ] = await Promise.all([
        prisma.notification.count({ where: { ...where, status: { not: 'pending' } } }),
        prisma.notification.count({ where: { ...where, status: { in: ['delivered', 'read'] } } }),
        prisma.notification.count({ where: { ...where, status: 'read' } }),
        prisma.notification.count({ where: { ...where, status: 'failed' } }),
        prisma.notificationDelivery.findMany({ where: { notification: where } }),
        prisma.notification.findMany({
          where,
          select: {
            category: true,
            status: true,
            sentAt: true,
            deliveredAt: true,
            readAt: true,
          },
        }),
      ]);

      const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
      const readRate = totalDelivered > 0 ? (totalRead / totalDelivered) * 100 : 0;
      const failureRate = totalSent > 0 ? (totalFailed / totalSent) * 100 : 0;

      const byChannel = this.calculateChannelMetrics(deliveries);
      const byCategory = this.calculateCategoryMetrics(notifications);

      const averageDeliveryTime = this.calculateAverageDeliveryTime(notifications);
      const averageReadTime = this.calculateAverageReadTime(notifications);

      const engagementScore = this.calculateEngagementScore({
        deliveryRate,
        readRate,
        averageReadTime,
      });

      return {
        totalSent,
        totalDelivered,
        totalRead,
        totalFailed,
        deliveryRate,
        readRate,
        failureRate,
        byChannel,
        byCategory,
        averageDeliveryTime,
        averageReadTime,
        engagementScore,
      };
    } catch (error) {
      logger.error('Error getting notification analytics', { error, filter });
      throw new Error('Failed to get notification analytics');
    }
  }

  /**
   * Get channel performance
   */
  async getChannelPerformance(channel: NotificationChannel, filter: NotificationFilter): Promise<{
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
    averageDeliveryTime: number;
  }> {
    try {
      const where = this.buildWhereClause(filter);

      const deliveries = await prisma.notificationDelivery.findMany({
        where: {
          channel,
          notification: where,
        },
      });

      const sent = deliveries.length;
      const delivered = deliveries.filter((d) => d.status === 'delivered').length;
      const failed = deliveries.filter((d) => d.status === 'failed').length;
      const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0;

      const deliveryTimes = deliveries
        .filter((d) => d.sentAt && d.deliveredAt)
        .map((d) => d.deliveredAt!.getTime() - d.sentAt!.getTime());

      const averageDeliveryTime =
        deliveryTimes.length > 0
          ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
          : 0;

      return {
        sent,
        delivered,
        failed,
        deliveryRate,
        averageDeliveryTime,
      };
    } catch (error) {
      logger.error('Error getting channel performance', { error, channel, filter });
      throw new Error('Failed to get channel performance');
    }
  }

  /**
   * Get category performance
   */
  async getCategoryPerformance(category: NotificationCategory, filter: NotificationFilter): Promise<{
    sent: number;
    delivered: number;
    read: number;
    readRate: number;
    averageReadTime: number;
  }> {
    try {
      const where = { ...this.buildWhereClause(filter), category };

      const notifications = await prisma.notification.findMany({
        where,
        select: {
          status: true,
          sentAt: true,
          readAt: true,
        },
      });

      const sent = notifications.length;
      const delivered = notifications.filter((n) => n.status === 'delivered' || n.status === 'read').length;
      const read = notifications.filter((n) => n.status === 'read').length;
      const readRate = delivered > 0 ? (read / delivered) * 100 : 0;

      const readTimes = notifications
        .filter((n) => n.sentAt && n.readAt)
        .map((n) => n.readAt!.getTime() - n.sentAt!.getTime());

      const averageReadTime =
        readTimes.length > 0 ? readTimes.reduce((a, b) => a + b, 0) / readTimes.length : 0;

      return {
        sent,
        delivered,
        read,
        readRate,
        averageReadTime,
      };
    } catch (error) {
      logger.error('Error getting category performance', { error, category, filter });
      throw new Error('Failed to get category performance');
    }
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagement(userId: string, filter: NotificationFilter): Promise<{
    totalReceived: number;
    totalRead: number;
    readRate: number;
    averageReadTime: number;
    mostEngagedCategory: NotificationCategory;
    leastEngagedCategory: NotificationCategory;
    preferredChannel: NotificationChannel;
  }> {
    try {
      const where = { ...this.buildWhereClause(filter), userId };

      const notifications = await prisma.notification.findMany({
        where,
        select: {
          category: true,
          channels: true,
          status: true,
          sentAt: true,
          readAt: true,
        },
      });

      const totalReceived = notifications.length;
      const totalRead = notifications.filter((n) => n.status === 'read').length;
      const readRate = totalReceived > 0 ? (totalRead / totalReceived) * 100 : 0;

      const readTimes = notifications
        .filter((n) => n.sentAt && n.readAt)
        .map((n) => n.readAt!.getTime() - n.sentAt!.getTime());

      const averageReadTime =
        readTimes.length > 0 ? readTimes.reduce((a, b) => a + b, 0) / readTimes.length : 0;

      const categoryEngagement = this.calculateCategoryEngagement(notifications);
      const mostEngagedCategory = this.getMostEngagedCategory(categoryEngagement);
      const leastEngagedCategory = this.getLeastEngagedCategory(categoryEngagement);

      const channelUsage = this.calculateChannelUsage(notifications);
      const preferredChannel = this.getPreferredChannel(channelUsage);

      return {
        totalReceived,
        totalRead,
        readRate,
        averageReadTime,
        mostEngagedCategory,
        leastEngagedCategory,
        preferredChannel,
      };
    } catch (error) {
      logger.error('Error getting user engagement', { error, userId, filter });
      throw new Error('Failed to get user engagement');
    }
  }

  /**
   * Get notification trends
   */
  async getNotificationTrends(
    period: 'day' | 'week' | 'month',
    filter: NotificationFilter
  ): Promise<Array<{
    date: string;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  }>> {
    try {
      const where = this.buildWhereClause(filter);
      const groupBy = this.getGroupByPeriod(period);

      const notifications = await prisma.notification.findMany({
        where,
        select: {
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      const trends = this.groupByPeriod(notifications, groupBy);

      return trends;
    } catch (error) {
      logger.error('Error getting notification trends', { error, period, filter });
      throw new Error('Failed to get notification trends');
    }
  }

  /**
   * Get engagement funnel
   */
  async getEngagementFunnel(filter: NotificationFilter): Promise<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
  }> {
    try {
      const where = this.buildWhereClause(filter);

      const [sent, delivered, engagements] = await Promise.all([
        prisma.notification.count({ where: { ...where, status: { not: 'pending' } } }),
        prisma.notification.count({ where: { ...where, status: { in: ['delivered', 'read'] } } }),
        prisma.notificationEngagement.findMany({
          where: {
            notification: where,
          },
        }),
      ]);

      const opened = engagements.filter((e) => e.action === 'opened').length;
      const clicked = engagements.filter((e) => e.action === 'clicked').length;
      const converted = engagements.filter((e) => e.metadata?.converted === true).length;

      return {
        sent,
        delivered,
        opened,
        clicked,
        converted,
      };
    } catch (error) {
      logger.error('Error getting engagement funnel', { error, filter });
      throw new Error('Failed to get engagement funnel');
    }
  }

  /**
   * Helper: Build where clause from filter
   */
  private buildWhereClause(filter: NotificationFilter): any {
    const where: any = {};

    if (filter.userId) where.userId = filter.userId;
    if (filter.category) where.category = filter.category;
    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = filter.startDate;
      if (filter.endDate) where.createdAt.lte = filter.endDate;
    }

    return where;
  }

  /**
   * Helper: Calculate channel metrics
   */
  private calculateChannelMetrics(deliveries: any[]): NotificationAnalytics['byChannel'] {
    const channels: NotificationChannel[] = ['email', 'sms', 'push', 'websocket', 'in_app'];
    const metrics: any = {};

    for (const channel of channels) {
      const channelDeliveries = deliveries.filter((d) => d.channel === channel);
      const sent = channelDeliveries.length;
      const delivered = channelDeliveries.filter((d) => d.status === 'delivered').length;
      const failed = channelDeliveries.filter((d) => d.status === 'failed').length;
      const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0;

      metrics[channel] = { sent, delivered, failed, deliveryRate };
    }

    return metrics;
  }

  /**
   * Helper: Calculate category metrics
   */
  private calculateCategoryMetrics(notifications: any[]): NotificationAnalytics['byCategory'] {
    const categories: NotificationCategory[] = [
      'academic',
      'spiritual',
      'social',
      'administrative',
      'payment',
      'system',
      'marketing',
    ];
    const metrics: any = {};

    for (const category of categories) {
      const categoryNotifications = notifications.filter((n) => n.category === category);
      const sent = categoryNotifications.length;
      const delivered = categoryNotifications.filter(
        (n) => n.status === 'delivered' || n.status === 'read'
      ).length;
      const read = categoryNotifications.filter((n) => n.status === 'read').length;
      const readRate = delivered > 0 ? (read / delivered) * 100 : 0;

      metrics[category] = { sent, delivered, read, readRate };
    }

    return metrics;
  }

  /**
   * Helper: Calculate average delivery time
   */
  private calculateAverageDeliveryTime(notifications: any[]): number {
    const deliveryTimes = notifications
      .filter((n) => n.sentAt && n.deliveredAt)
      .map((n) => new Date(n.deliveredAt).getTime() - new Date(n.sentAt).getTime());

    return deliveryTimes.length > 0
      ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
      : 0;
  }

  /**
   * Helper: Calculate average read time
   */
  private calculateAverageReadTime(notifications: any[]): number {
    const readTimes = notifications
      .filter((n) => n.sentAt && n.readAt)
      .map((n) => new Date(n.readAt).getTime() - new Date(n.sentAt).getTime());

    return readTimes.length > 0 ? readTimes.reduce((a, b) => a + b, 0) / readTimes.length : 0;
  }

  /**
   * Helper: Calculate engagement score
   */
  private calculateEngagementScore(metrics: {
    deliveryRate: number;
    readRate: number;
    averageReadTime: number;
  }): number {
    // Weighted score: 40% delivery, 40% read rate, 20% read time (faster is better)
    const deliveryScore = metrics.deliveryRate * 0.4;
    const readScore = metrics.readRate * 0.4;
    const timeScore = Math.max(0, 100 - metrics.averageReadTime / 60000) * 0.2; // Penalize slow reads

    return deliveryScore + readScore + timeScore;
  }

  /**
   * Helper: Calculate category engagement
   */
  private calculateCategoryEngagement(notifications: any[]): Map<NotificationCategory, number> {
    const engagement = new Map<NotificationCategory, number>();

    for (const notification of notifications) {
      const category = notification.category as NotificationCategory;
      const isRead = notification.status === 'read';
      const current = engagement.get(category) || 0;
      engagement.set(category, current + (isRead ? 1 : 0));
    }

    return engagement;
  }

  /**
   * Helper: Get most engaged category
   */
  private getMostEngagedCategory(engagement: Map<NotificationCategory, number>): NotificationCategory {
    let maxCategory: NotificationCategory = 'academic';
    let maxCount = 0;

    for (const [category, count] of engagement) {
      if (count > maxCount) {
        maxCount = count;
        maxCategory = category;
      }
    }

    return maxCategory;
  }

  /**
   * Helper: Get least engaged category
   */
  private getLeastEngagedCategory(engagement: Map<NotificationCategory, number>): NotificationCategory {
    let minCategory: NotificationCategory = 'academic';
    let minCount = Infinity;

    for (const [category, count] of engagement) {
      if (count < minCount) {
        minCount = count;
        minCategory = category;
      }
    }

    return minCategory;
  }

  /**
   * Helper: Calculate channel usage
   */
  private calculateChannelUsage(notifications: any[]): Map<NotificationChannel, number> {
    const usage = new Map<NotificationChannel, number>();

    for (const notification of notifications) {
      const channels = notification.channels as NotificationChannel[];
      for (const channel of channels) {
        const current = usage.get(channel) || 0;
        usage.set(channel, current + 1);
      }
    }

    return usage;
  }

  /**
   * Helper: Get preferred channel
   */
  private getPreferredChannel(usage: Map<NotificationChannel, number>): NotificationChannel {
    let maxChannel: NotificationChannel = 'email';
    let maxCount = 0;

    for (const [channel, count] of usage) {
      if (count > maxCount) {
        maxCount = count;
        maxChannel = channel;
      }
    }

    return maxChannel;
  }

  /**
   * Helper: Get group by period
   */
  private getGroupByPeriod(period: 'day' | 'week' | 'month'): string {
    switch (period) {
      case 'day':
        return 'day';
      case 'week':
        return 'week';
      case 'month':
        return 'month';
      default:
        return 'day';
    }
  }

  /**
   * Helper: Group notifications by period
   */
  private groupByPeriod(notifications: any[], groupBy: string): any[] {
    const grouped = new Map<string, any>();

    for (const notification of notifications) {
      const date = new Date(notification.createdAt);
      let key: string;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      }

      if (!grouped.has(key)) {
        grouped.set(key, { date: key, sent: 0, delivered: 0, read: 0, failed: 0 });
      }

      const stats = grouped.get(key)!;
      stats.sent++;
      if (notification.status === 'delivered' || notification.status === 'read') stats.delivered++;
      if (notification.status === 'read') stats.read++;
      if (notification.status === 'failed') stats.failed++;
    }

    return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
}
