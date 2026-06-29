/**
 * Prayer Reminder Service
 * "Pray continually" - 1 Thessalonians 5:17
 * 
 * Service for managing prayer reminders and notifications
 */

import { PrismaClient } from '@prisma/client';
import {
  PrayerReminder,
  ReminderFrequency,
  PrayerNotification,
  NotificationType
} from '../types/prayer.types';

const prisma = new PrismaClient();

export default class PrayerReminderService {
  /**
   * Create a prayer reminder
   */
  async createReminder(
    userId: string,
    data: {
      prayerEntryId?: string;
      prayerRequestId?: string;
      reminderTime: string;
      frequency: ReminderFrequency;
      daysOfWeek?: number[];
    }
  ): Promise<PrayerReminder> {
    try {
      const reminder: PrayerReminder = {
        id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        prayerEntryId: data.prayerEntryId,
        prayerRequestId: data.prayerRequestId,
        reminderTime: data.reminderTime,
        frequency: data.frequency,
        daysOfWeek: data.daysOfWeek,
        isActive: true,
        nextScheduled: this.calculateNextScheduled(data.reminderTime, data.frequency, data.daysOfWeek),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // In production, save to database
      // await prisma.prayerReminder.create({ data: reminder });

      return reminder;
    } catch (error) {
      console.error('Error creating reminder:', error);
      throw new Error('Failed to create prayer reminder');
    }
  }

  /**
   * Get user's reminders
   */
  async getUserReminders(
    userId: string,
    activeOnly: boolean = true
  ): Promise<PrayerReminder[]> {
    try {
      // In production, query from database
      const reminders: PrayerReminder[] = [];
      
      return reminders;
    } catch (error) {
      console.error('Error getting user reminders:', error);
      throw new Error('Failed to retrieve reminders');
    }
  }

  /**
   * Get upcoming reminders
   */
  async getUpcomingReminders(
    userId: string,
    hours: number = 24
  ): Promise<PrayerReminder[]> {
    try {
      const now = new Date();
      const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

      // In production, query reminders scheduled between now and futureTime
      const reminders: PrayerReminder[] = [];
      
      return reminders;
    } catch (error) {
      console.error('Error getting upcoming reminders:', error);
      throw new Error('Failed to retrieve upcoming reminders');
    }
  }

  /**
   * Update reminder
   */
  async updateReminder(
    reminderId: string,
    userId: string,
    data: Partial<PrayerReminder>
  ): Promise<PrayerReminder> {
    try {
      // In production, update in database
      const reminder: PrayerReminder = {
        id: reminderId,
        userId,
        reminderTime: data.reminderTime || '09:00',
        frequency: data.frequency || ReminderFrequency.DAILY,
        daysOfWeek: data.daysOfWeek,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Recalculate next scheduled time if time or frequency changed
      if (data.reminderTime || data.frequency || data.daysOfWeek) {
        reminder.nextScheduled = this.calculateNextScheduled(
          reminder.reminderTime,
          reminder.frequency,
          reminder.daysOfWeek
        );
      }

      return reminder;
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw new Error('Failed to update reminder');
    }
  }

  /**
   * Delete reminder
   */
  async deleteReminder(reminderId: string, userId: string): Promise<void> {
    try {
      // In production, delete from database
      // await prisma.prayerReminder.delete({ where: { id: reminderId, userId } });
    } catch (error) {
      console.error('Error deleting reminder:', error);
      throw new Error('Failed to delete reminder');
    }
  }

  /**
   * Process due reminders (called by scheduled job)
   */
  async processDueReminders(): Promise<void> {
    try {
      const now = new Date();

      // In production, query all active reminders that are due
      // const dueReminders = await prisma.prayerReminder.findMany({
      //   where: {
      //     isActive: true,
      //     nextScheduled: { lte: now }
      //   }
      // });

      const dueReminders: PrayerReminder[] = [];

      for (const reminder of dueReminders) {
        await this.sendReminderNotification(reminder);
        await this.updateReminderSchedule(reminder);
      }
    } catch (error) {
      console.error('Error processing due reminders:', error);
      throw new Error('Failed to process reminders');
    }
  }

  /**
   * Send reminder notification
   */
  async sendReminderNotification(reminder: PrayerReminder): Promise<void> {
    try {
      let title = 'Prayer Reminder';
      let message = 'Time to pray!';

      // Customize message based on what the reminder is for
      if (reminder.prayerEntryId) {
        // Get prayer entry details
        title = 'Prayer Journal Reminder';
        message = 'Time to continue your prayer from your journal';
      } else if (reminder.prayerRequestId) {
        // Get prayer request details
        title = 'Prayer Request Reminder';
        message = 'Remember to pray for this request';
      }

      const notification: PrayerNotification = {
        id: `notif_${Date.now()}`,
        userId: reminder.userId,
        type: NotificationType.REMINDER,
        title,
        message,
        relatedId: reminder.prayerEntryId || reminder.prayerRequestId,
        read: false,
        createdAt: new Date()
      };

      // In production, save notification and send push notification
      // await prisma.prayerNotification.create({ data: notification });
      // await this.sendPushNotification(reminder.userId, notification);
    } catch (error) {
      console.error('Error sending reminder notification:', error);
      throw new Error('Failed to send reminder notification');
    }
  }

  /**
   * Update reminder schedule after sending
   */
  async updateReminderSchedule(reminder: PrayerReminder): Promise<void> {
    try {
      const updates: Partial<PrayerReminder> = {
        lastSent: new Date()
      };

      // Calculate next scheduled time based on frequency
      if (reminder.frequency !== ReminderFrequency.ONCE) {
        updates.nextScheduled = this.calculateNextScheduled(
          reminder.reminderTime,
          reminder.frequency,
          reminder.daysOfWeek
        );
      } else {
        // One-time reminder - deactivate after sending
        updates.isActive = false;
      }

      // In production, update in database
      // await prisma.prayerReminder.update({
      //   where: { id: reminder.id },
      //   data: updates
      // });
    } catch (error) {
      console.error('Error updating reminder schedule:', error);
      throw new Error('Failed to update reminder schedule');
    }
  }

  /**
   * Calculate next scheduled time for a reminder
   */
  private calculateNextScheduled(
    reminderTime: string,
    frequency: ReminderFrequency,
    daysOfWeek?: number[]
  ): Date {
    const now = new Date();
    const [hours, minutes] = reminderTime.split(':').map(Number);
    
    const nextScheduled = new Date(now);
    nextScheduled.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, move to next occurrence
    if (nextScheduled <= now) {
      switch (frequency) {
        case ReminderFrequency.DAILY:
          nextScheduled.setDate(nextScheduled.getDate() + 1);
          break;
        
        case ReminderFrequency.WEEKLY:
          nextScheduled.setDate(nextScheduled.getDate() + 7);
          break;
        
        case ReminderFrequency.CUSTOM:
          if (daysOfWeek && daysOfWeek.length > 0) {
            // Find next day in daysOfWeek array
            const currentDay = nextScheduled.getDay();
            const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
            
            let nextDay = sortedDays.find(day => day > currentDay);
            if (!nextDay) {
              // Wrap to next week
              nextDay = sortedDays[0];
              nextScheduled.setDate(nextScheduled.getDate() + (7 - currentDay + nextDay));
            } else {
              nextScheduled.setDate(nextScheduled.getDate() + (nextDay - currentDay));
            }
          } else {
            // Default to daily if no days specified
            nextScheduled.setDate(nextScheduled.getDate() + 1);
          }
          break;
        
        case ReminderFrequency.ONCE:
          // For one-time reminders, if time passed, schedule for tomorrow
          nextScheduled.setDate(nextScheduled.getDate() + 1);
          break;
      }
    }

    return nextScheduled;
  }

  /**
   * Get user's notification preferences
   */
  async getNotificationPreferences(userId: string): Promise<{
    emailEnabled: boolean;
    pushEnabled: boolean;
    smsEnabled: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  }> {
    try {
      // In production, query from user preferences
      return {
        emailEnabled: true,
        pushEnabled: true,
        smsEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00'
      };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      throw new Error('Failed to retrieve notification preferences');
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(userId: string): boolean {
    // In production, check user's quiet hours preferences
    return false;
  }

  /**
   * Send push notification (placeholder)
   */
  private async sendPushNotification(userId: string, notification: PrayerNotification): Promise<void> {
    // In production, integrate with push notification service
    // (Firebase Cloud Messaging, OneSignal, etc.)
  }
}
