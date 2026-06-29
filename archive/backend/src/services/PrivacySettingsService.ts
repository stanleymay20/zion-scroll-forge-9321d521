/**
 * Privacy Settings Service
 * "Guard your heart above all else" - Proverbs 4:23
 */

import { PrismaClient } from '@prisma/client';
import { cacheService } from './CacheService';
import { logger } from '../utils/productionLogger';
import { PrivacySettings, ConsentManagement, Consent } from '../types/profile.types';

const prisma = new PrismaClient();

export class PrivacySettingsService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly CACHE_PREFIX = 'privacy:';

  /**
   * Get privacy settings
   */
  async getPrivacySettings(userId: string): Promise<PrivacySettings> {
    try {
      // Try cache first
      const cached = await cacheService.get(`${this.CACHE_PREFIX}${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      const settings = await prisma.privacySettings.findUnique({
        where: { userId }
      });

      if (!settings) {
        // Create default settings
        return await this.createDefaultSettings(userId);
      }

      // Cache the result
      await cacheService.set(
        `${this.CACHE_PREFIX}${userId}`,
        JSON.stringify(settings),
        { ttl: this.CACHE_TTL }
      );

      logger.info('Privacy settings retrieved', { userId });

      return settings as PrivacySettings;
    } catch (error) {
      logger.error('Failed to get privacy settings', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(
    userId: string,
    updates: Partial<PrivacySettings>
  ): Promise<PrivacySettings> {
    try {
      // Update settings
      const settings = await prisma.privacySettings.upsert({
        where: { userId },
        update: {
          ...updates,
          updatedAt: new Date()
        },
        create: {
          userId,
          ...this.getDefaultSettingsData(),
          ...updates,
          updatedAt: new Date()
        }
      });

      // Invalidate cache
      await cacheService.delete(`${this.CACHE_PREFIX}${userId}`);

      logger.info('Privacy settings updated', { userId, updatedFields: Object.keys(updates) });

      return settings as PrivacySettings;
    } catch (error) {
      logger.error('Failed to update privacy settings', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Update profile visibility
   */
  async updateProfileVisibility(
    userId: string,
    visibility: 'public' | 'private' | 'friends_only'
  ): Promise<PrivacySettings> {
    try {
      return await this.updatePrivacySettings(userId, { profileVisibility: visibility });
    } catch (error) {
      logger.error('Failed to update profile visibility', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Update field visibility
   */
  async updateFieldVisibility(
    userId: string,
    fields: {
      showEmail?: boolean;
      showPhoneNumber?: boolean;
      showLocation?: boolean;
      showDateOfBirth?: boolean;
      showCourseProgress?: boolean;
      showAchievements?: boolean;
      showScrollCoinBalance?: boolean;
      showSpiritualGrowth?: boolean;
    }
  ): Promise<PrivacySettings> {
    try {
      return await this.updatePrivacySettings(userId, fields);
    } catch (error) {
      logger.error('Failed to update field visibility', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Update communication settings
   */
  async updateCommunicationSettings(
    userId: string,
    settings: {
      allowMessagesFrom?: 'everyone' | 'connections' | 'nobody';
      allowFriendRequests?: boolean;
      allowStudyGroupInvites?: boolean;
    }
  ): Promise<PrivacySettings> {
    try {
      return await this.updatePrivacySettings(userId, settings);
    } catch (error) {
      logger.error('Failed to update communication settings', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Update data sharing settings
   */
  async updateDataSharingSettings(
    userId: string,
    settings: {
      allowDataAnalytics?: boolean;
      allowPersonalization?: boolean;
      allowThirdPartySharing?: boolean;
    }
  ): Promise<PrivacySettings> {
    try {
      return await this.updatePrivacySettings(userId, settings);
    } catch (error) {
      logger.error('Failed to update data sharing settings', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get consent management
   */
  async getConsentManagement(userId: string): Promise<ConsentManagement> {
    try {
      const consents = await prisma.userConsent.findMany({
        where: { userId }
      });

      return {
        userId,
        consents: consents.map(c => ({
          consentType: c.consentType,
          description: c.description,
          granted: c.granted,
          grantedAt: c.grantedAt,
          revokedAt: c.revokedAt,
          required: c.required
        })),
        updatedAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to get consent management', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Update consent
   */
  async updateConsent(
    userId: string,
    consentType: string,
    granted: boolean
  ): Promise<ConsentManagement> {
    try {
      // Check if consent exists
      const existingConsent = await prisma.userConsent.findFirst({
        where: { userId, consentType }
      });

      if (existingConsent) {
        // Update existing consent
        await prisma.userConsent.update({
          where: { id: existingConsent.id },
          data: {
            granted,
            grantedAt: granted ? new Date() : existingConsent.grantedAt,
            revokedAt: !granted ? new Date() : null
          }
        });
      } else {
        // Create new consent
        await prisma.userConsent.create({
          data: {
            userId,
            consentType,
            description: this.getConsentDescription(consentType),
            granted,
            grantedAt: granted ? new Date() : null,
            required: this.isConsentRequired(consentType)
          }
        });
      }

      logger.info('Consent updated', { userId, consentType, granted });

      return await this.getConsentManagement(userId);
    } catch (error) {
      logger.error('Failed to update consent', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Revoke all non-required consents
   */
  async revokeAllConsents(userId: string): Promise<ConsentManagement> {
    try {
      await prisma.userConsent.updateMany({
        where: {
          userId,
          required: false
        },
        data: {
          granted: false,
          revokedAt: new Date()
        }
      });

      logger.info('All non-required consents revoked', { userId });

      return await this.getConsentManagement(userId);
    } catch (error) {
      logger.error('Failed to revoke all consents', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Create default privacy settings
   */
  private async createDefaultSettings(userId: string): Promise<PrivacySettings> {
    try {
      const defaultSettings = this.getDefaultSettingsData();

      const settings = await prisma.privacySettings.create({
        data: {
          userId,
          ...defaultSettings,
          updatedAt: new Date()
        }
      });

      logger.info('Default privacy settings created', { userId });

      return settings as PrivacySettings;
    } catch (error) {
      logger.error('Failed to create default privacy settings', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get default settings data
   */
  private getDefaultSettingsData(): Omit<PrivacySettings, 'userId' | 'updatedAt'> {
    return {
      profileVisibility: 'public',
      showEmail: false,
      showPhoneNumber: false,
      showLocation: true,
      showDateOfBirth: false,
      showCourseProgress: true,
      showAchievements: true,
      showScrollCoinBalance: false,
      showSpiritualGrowth: true,
      allowMessagesFrom: 'everyone',
      allowFriendRequests: true,
      allowStudyGroupInvites: true,
      allowDataAnalytics: true,
      allowPersonalization: true,
      allowThirdPartySharing: false,
      appearInSearch: true,
      showInLeaderboards: true
    };
  }

  /**
   * Get consent description
   */
  private getConsentDescription(consentType: string): string {
    const descriptions: Record<string, string> = {
      terms_of_service: 'I agree to the Terms of Service',
      privacy_policy: 'I agree to the Privacy Policy',
      data_processing: 'I consent to data processing for service delivery',
      marketing_communications: 'I consent to receive marketing communications',
      analytics: 'I consent to analytics and performance tracking',
      personalization: 'I consent to personalized content and recommendations',
      third_party_sharing: 'I consent to sharing data with trusted third parties'
    };

    return descriptions[consentType] || 'User consent';
  }

  /**
   * Check if consent is required
   */
  private isConsentRequired(consentType: string): boolean {
    const requiredConsents = ['terms_of_service', 'privacy_policy', 'data_processing'];
    return requiredConsents.includes(consentType);
  }

  /**
   * Reset privacy settings to default
   */
  async resetPrivacySettings(userId: string): Promise<PrivacySettings> {
    try {
      const defaultSettings = this.getDefaultSettingsData();

      const settings = await prisma.privacySettings.upsert({
        where: { userId },
        update: {
          ...defaultSettings,
          updatedAt: new Date()
        },
        create: {
          userId,
          ...defaultSettings,
          updatedAt: new Date()
        }
      });

      // Invalidate cache
      await cacheService.delete(`${this.CACHE_PREFIX}${userId}`);

      logger.info('Privacy settings reset to default', { userId });

      return settings as PrivacySettings;
    } catch (error) {
      logger.error('Failed to reset privacy settings', { error: error.message, userId });
      throw error;
    }
  }
}

export const privacySettingsService = new PrivacySettingsService();
