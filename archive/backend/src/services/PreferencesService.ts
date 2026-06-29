/**
 * User Preferences Service
 * "Let all things be done decently and in order" - 1 Corinthians 14:40
 */

import { PrismaClient } from '@prisma/client';
import { cacheService } from './CacheService';
import { logger } from '../utils/productionLogger';
import { UserPreferences, BulkPreferencesUpdate } from '../types/profile.types';

const prisma = new PrismaClient();

export class PreferencesService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly CACHE_PREFIX = 'preferences:';

  /**
   * Get user preferences
   */
  async getPreferences(userId: string): Promise<UserPreferences> {
    try {
      // Try cache first
      const cached = await cacheService.get(`${this.CACHE_PREFIX}${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId }
      });

      if (!preferences) {
        // Create default preferences
        return await this.createDefaultPreferences(userId);
      }

      // Cache the result
      await cacheService.set(
        `${this.CACHE_PREFIX}${userId}`,
        JSON.stringify(preferences),
        { ttl: this.CACHE_TTL }
      );

      logger.info('Preferences retrieved', { userId });

      return preferences as UserPreferences;
    } catch (error) {
      logger.error('Failed to get preferences', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    try {
      // Update preferences
      const preferences = await prisma.userPreferences.upsert({
        where: { userId },
        update: {
          ...updates,
          updatedAt: new Date()
        },
        create: {
          userId,
          ...this.getDefaultPreferencesData(),
          ...updates,
          updatedAt: new Date()
        }
      });

      // Invalidate cache
      await cacheService.delete(`${this.CACHE_PREFIX}${userId}`);

      logger.info('Preferences updated', { userId, updatedFields: Object.keys(updates) });

      return preferences as UserPreferences;
    } catch (error) {
      logger.error('Failed to update preferences', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    emailPrefs?: Partial<UserPreferences['emailNotifications']>,
    pushPrefs?: Partial<UserPreferences['pushNotifications']>,
    smsPrefs?: Partial<UserPreferences['smsNotifications']>
  ): Promise<UserPreferences> {
    try {
      const currentPrefs = await this.getPreferences(userId);

      const updates: Partial<UserPreferences> = {};

      if (emailPrefs) {
        updates.emailNotifications = {
          ...currentPrefs.emailNotifications,
          ...emailPrefs
        };
      }

      if (pushPrefs) {
        updates.pushNotifications = {
          ...currentPrefs.pushNotifications,
          ...pushPrefs
        };
      }

      if (smsPrefs) {
        updates.smsNotifications = {
          ...currentPrefs.smsNotifications,
          ...smsPrefs
        };
      }

      return await this.updatePreferences(userId, updates);
    } catch (error) {
      logger.error('Failed to update notification preferences', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Bulk update preferences
   */
  async bulkUpdatePreferences(request: BulkPreferencesUpdate): Promise<UserPreferences> {
    try {
      const { userId, preferences, overwrite } = request;

      if (overwrite) {
        // Replace all preferences
        return await this.updatePreferences(userId, preferences);
      } else {
        // Merge with existing preferences
        const currentPrefs = await this.getPreferences(userId);
        const merged = this.mergePreferences(currentPrefs, preferences);
        return await this.updatePreferences(userId, merged);
      }
    } catch (error) {
      logger.error('Failed to bulk update preferences', { error: error.message });
      throw error;
    }
  }

  /**
   * Reset preferences to default
   */
  async resetPreferences(userId: string): Promise<UserPreferences> {
    try {
      const defaultPrefs = this.getDefaultPreferencesData();

      const preferences = await prisma.userPreferences.upsert({
        where: { userId },
        update: {
          ...defaultPrefs,
          updatedAt: new Date()
        },
        create: {
          userId,
          ...defaultPrefs,
          updatedAt: new Date()
        }
      });

      // Invalidate cache
      await cacheService.delete(`${this.CACHE_PREFIX}${userId}`);

      logger.info('Preferences reset to default', { userId });

      return preferences as UserPreferences;
    } catch (error) {
      logger.error('Failed to reset preferences', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Create default preferences
   */
  private async createDefaultPreferences(userId: string): Promise<UserPreferences> {
    try {
      const defaultPrefs = this.getDefaultPreferencesData();

      const preferences = await prisma.userPreferences.create({
        data: {
          userId,
          ...defaultPrefs,
          updatedAt: new Date()
        }
      });

      logger.info('Default preferences created', { userId });

      return preferences as UserPreferences;
    } catch (error) {
      logger.error('Failed to create default preferences', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get default preferences data
   */
  private getDefaultPreferencesData(): Omit<UserPreferences, 'userId' | 'updatedAt'> {
    return {
      theme: 'auto',
      fontSize: 'medium',
      language: 'en',
      timeZone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      emailNotifications: {
        enabled: true,
        courseUpdates: true,
        assignmentReminders: true,
        gradeNotifications: true,
        communityActivity: true,
        spiritualFormation: true,
        systemAnnouncements: true,
        marketingEmails: false,
        weeklyDigest: true
      },
      pushNotifications: {
        enabled: true,
        courseUpdates: true,
        assignmentReminders: true,
        gradeNotifications: true,
        messages: true,
        communityActivity: false,
        spiritualFormation: true
      },
      smsNotifications: {
        enabled: false,
        urgentOnly: true,
        assignmentDeadlines: false,
        systemAlerts: true
      },
      profileVisibility: 'public',
      showEmail: false,
      showPhoneNumber: false,
      showLocation: true,
      allowMessagesFrom: 'everyone',
      autoPlayVideos: true,
      videoQuality: 'auto',
      closedCaptionsEnabled: false,
      screenReaderEnabled: false,
      highContrastMode: false,
      keyboardNavigationEnabled: false
    };
  }

  /**
   * Merge preferences (deep merge)
   */
  private mergePreferences(
    current: UserPreferences,
    updates: Partial<UserPreferences>
  ): Partial<UserPreferences> {
    const merged = { ...current };

    for (const key in updates) {
      if (updates.hasOwnProperty(key)) {
        const value = updates[key];
        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          merged[key] = { ...merged[key], ...value };
        } else {
          merged[key] = value;
        }
      }
    }

    return merged;
  }

  /**
   * Export preferences
   */
  async exportPreferences(userId: string): Promise<UserPreferences> {
    try {
      const preferences = await this.getPreferences(userId);
      logger.info('Preferences exported', { userId });
      return preferences;
    } catch (error) {
      logger.error('Failed to export preferences', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Import preferences
   */
  async importPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      return await this.updatePreferences(userId, preferences);
    } catch (error) {
      logger.error('Failed to import preferences', { error: error.message, userId });
      throw error;
    }
  }
}

export const preferencesService = new PreferencesService();
