/**
 * Prayer Partner Matching Service
 * "Two are better than one... If either of them falls down, one can help the other up" - Ecclesiastes 4:9-10
 * 
 * Service for matching users with prayer partners based on interests and compatibility
 */

import { PrismaClient } from '@prisma/client';
import {
  PrayerPartner,
  PrayerPartnerMatch,
  PrayerPartnerPreferences,
  CreatePrayerPartnerRequest,
  PartnerStatus
} from '../types/prayer.types';

const prisma = new PrismaClient();

export default class PrayerPartnerMatchingService {
  /**
   * Find potential prayer partners for a user
   */
  async findPotentialPartners(
    userId: string,
    limit: number = 10
  ): Promise<PrayerPartnerMatch[]> {
    try {
      const userPreferences = await this.getUserPreferences(userId);
      
      // In production, query database for compatible users
      // Consider: prayer interests, spiritual gifts, availability, timezone
      const potentialMatches: PrayerPartnerMatch[] = [];

      // Calculate compatibility scores
      // Sort by compatibility
      // Return top matches

      return potentialMatches;
    } catch (error) {
      console.error('Error finding potential partners:', error);
      throw new Error('Failed to find potential prayer partners');
    }
  }

  /**
   * Send prayer partner request
   */
  async sendPartnerRequest(
    userId: string,
    data: CreatePrayerPartnerRequest
  ): Promise<PrayerPartner> {
    try {
      // Check if partnership already exists
      const existing = await this.getPartnership(userId, data.partnerId);
      if (existing) {
        throw new Error('Partnership already exists');
      }

      const partnership: PrayerPartner = {
        id: `partner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        partnerId: data.partnerId,
        status: PartnerStatus.PENDING,
        matchedAt: new Date(),
        sharedPrayers: 0,
        compatibility: await this.calculateCompatibility(userId, data.partnerId)
      };

      // In production, save to database
      // await prisma.prayerPartner.create({ data: partnership });

      // Send notification to potential partner
      await this.notifyPartnerRequest(data.partnerId, userId, data.message);

      return partnership;
    } catch (error) {
      console.error('Error sending partner request:', error);
      throw new Error('Failed to send prayer partner request');
    }
  }

  /**
   * Accept prayer partner request
   */
  async acceptPartnerRequest(
    userId: string,
    partnershipId: string
  ): Promise<PrayerPartner> {
    try {
      // In production, query and update partnership
      const partnership: PrayerPartner = {
        id: partnershipId,
        userId: 'other_user',
        partnerId: userId,
        status: PartnerStatus.ACTIVE,
        matchedAt: new Date(),
        sharedPrayers: 0,
        compatibility: 85
      };

      // Update status to active
      partnership.status = PartnerStatus.ACTIVE;

      // In production, update in database
      // await prisma.prayerPartner.update({ where: { id: partnershipId }, data: { status: 'active' } });

      // Create reciprocal partnership
      await this.createReciprocalPartnership(partnership);

      // Notify both users
      await this.notifyPartnerAccepted(partnership.userId, userId);

      return partnership;
    } catch (error) {
      console.error('Error accepting partner request:', error);
      throw new Error('Failed to accept prayer partner request');
    }
  }

  /**
   * Decline prayer partner request
   */
  async declinePartnerRequest(
    userId: string,
    partnershipId: string
  ): Promise<void> {
    try {
      // In production, delete partnership request
      // await prisma.prayerPartner.delete({ where: { id: partnershipId } });
    } catch (error) {
      console.error('Error declining partner request:', error);
      throw new Error('Failed to decline prayer partner request');
    }
  }

  /**
   * Remove prayer partner
   */
  async removePartner(
    userId: string,
    partnerId: string
  ): Promise<void> {
    try {
      // In production, update partnership status to inactive
      // await prisma.prayerPartner.updateMany({
      //   where: {
      //     OR: [
      //       { userId, partnerId },
      //       { userId: partnerId, partnerId: userId }
      //     ]
      //   },
      //   data: { status: 'inactive' }
      // });
    } catch (error) {
      console.error('Error removing partner:', error);
      throw new Error('Failed to remove prayer partner');
    }
  }

  /**
   * Get user's prayer partners
   */
  async getUserPartners(
    userId: string,
    status?: PartnerStatus
  ): Promise<PrayerPartner[]> {
    try {
      // In production, query from database
      const partners: PrayerPartner[] = [];
      
      return partners;
    } catch (error) {
      console.error('Error getting user partners:', error);
      throw new Error('Failed to retrieve prayer partners');
    }
  }

  /**
   * Get user's prayer partner preferences
   */
  async getUserPreferences(userId: string): Promise<PrayerPartnerPreferences> {
    try {
      // In production, query from database
      const preferences: PrayerPartnerPreferences = {
        userId,
        prayerInterests: ['healing', 'guidance', 'ministry'],
        availability: ['morning', 'evening'],
        preferredCommunication: 'chat',
        maxPartners: 5,
        autoMatch: false
      };

      return preferences;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw new Error('Failed to retrieve preferences');
    }
  }

  /**
   * Update user's prayer partner preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<PrayerPartnerPreferences>
  ): Promise<PrayerPartnerPreferences> {
    try {
      const currentPreferences = await this.getUserPreferences(userId);
      const updatedPreferences = { ...currentPreferences, ...preferences };

      // In production, save to database
      // await prisma.prayerPartnerPreferences.upsert({
      //   where: { userId },
      //   update: updatedPreferences,
      //   create: updatedPreferences
      // });

      // If auto-match enabled, find and suggest partners
      if (updatedPreferences.autoMatch) {
        await this.autoMatchPartners(userId);
      }

      return updatedPreferences;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw new Error('Failed to update preferences');
    }
  }

  /**
   * Calculate compatibility between two users
   */
  async calculateCompatibility(userId1: string, userId2: string): Promise<number> {
    try {
      const prefs1 = await this.getUserPreferences(userId1);
      const prefs2 = await this.getUserPreferences(userId2);

      let score = 0;
      let factors = 0;

      // Shared prayer interests (40% weight)
      const sharedInterests = prefs1.prayerInterests.filter(
        interest => prefs2.prayerInterests.includes(interest)
      );
      score += (sharedInterests.length / Math.max(prefs1.prayerInterests.length, 1)) * 40;
      factors++;

      // Availability overlap (30% weight)
      const sharedAvailability = prefs1.availability.filter(
        time => prefs2.availability.includes(time)
      );
      score += (sharedAvailability.length / Math.max(prefs1.availability.length, 1)) * 30;
      factors++;

      // Communication preference match (20% weight)
      if (prefs1.preferredCommunication === prefs2.preferredCommunication ||
          prefs1.preferredCommunication === 'both' ||
          prefs2.preferredCommunication === 'both') {
        score += 20;
      }
      factors++;

      // Additional factors could include:
      // - Timezone compatibility
      // - Spiritual gifts alignment
      // - Language compatibility
      // - Similar life stage/challenges

      return Math.round(score);
    } catch (error) {
      console.error('Error calculating compatibility:', error);
      return 0;
    }
  }

  /**
   * Record prayer session between partners
   */
  async recordPrayerSession(
    userId: string,
    partnerId: string
  ): Promise<void> {
    try {
      // In production, update partnership
      // await prisma.prayerPartner.updateMany({
      //   where: {
      //     OR: [
      //       { userId, partnerId },
      //       { userId: partnerId, partnerId: userId }
      //     ]
      //   },
      //   data: {
      //     lastPrayedTogether: new Date(),
      //     sharedPrayers: { increment: 1 }
      //   }
      // });
    } catch (error) {
      console.error('Error recording prayer session:', error);
      throw new Error('Failed to record prayer session');
    }
  }

  // Private helper methods

  private async getPartnership(userId: string, partnerId: string): Promise<PrayerPartner | null> {
    // In production, query from database
    return null;
  }

  private async notifyPartnerRequest(
    partnerId: string,
    requesterId: string,
    message?: string
  ): Promise<void> {
    // In production, send notification
  }

  private async notifyPartnerAccepted(userId: string, partnerId: string): Promise<void> {
    // In production, send notification to both users
  }

  private async createReciprocalPartnership(partnership: PrayerPartner): Promise<void> {
    // In production, create reciprocal partnership record
    // This ensures both users see each other as partners
  }

  private async autoMatchPartners(userId: string): Promise<void> {
    // In production, find and suggest compatible partners
    const potentialMatches = await this.findPotentialPartners(userId, 5);
    
    // Send notifications about suggested partners
    for (const match of potentialMatches) {
      if (match.compatibility >= 70) {
        // Notify user about high-compatibility match
      }
    }
  }
}
