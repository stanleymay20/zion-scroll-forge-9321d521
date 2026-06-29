/**
 * Badge Profile and Sharing Service
 * "By the Spirit of Excellence, we showcase achievements to the world"
 * 
 * Service for managing public badge profiles and social media sharing.
 */

import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import scrollBadgeConfig from '../config/scrollbadge.config';
import ScrollBadgeService from './ScrollBadgeService';
import {
  BadgeProfileData,
  BadgeAchievement,
  BadgeShareRequest,
  BadgeShareResult,
  SharePlatform,
  BadgeCredentialType
} from '../types/scrollbadge.types';

const prisma = new PrismaClient();

export class BadgeProfileService {
  private static instance: BadgeProfileService;

  private constructor() {}

  public static getInstance(): BadgeProfileService {
    if (!BadgeProfileService.instance) {
      BadgeProfileService.instance = new BadgeProfileService();
    }
    return BadgeProfileService.instance;
  }

  /**
   * Get user's public badge profile
   */
  async getUserBadgeProfile(userId: string): Promise<BadgeProfileData> {
    try {
      logger.info('Getting user badge profile', { userId });

      // Get user information
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get all badges
      const allBadges = await ScrollBadgeService.getUserBadges(userId);

      // Get public badges only
      const publicBadges = allBadges.filter(badge => badge.isPublic);

      // Calculate achievements
      const achievements = await this.calculateAchievements(userId, allBadges);

      const profileUrl = `${scrollBadgeConfig.shareBaseUrl}/profile/${userId}`;

      return {
        userId,
        userName: `${user.firstName} ${user.lastName}`,
        badges: publicBadges,
        totalBadges: allBadges.length,
        publicBadges: publicBadges.length,
        achievements,
        profileUrl
      };
    } catch (error) {
      logger.error('Error getting badge profile:', error);
      throw error;
    }
  }

  /**
   * Calculate user achievements
   */
  private async calculateAchievements(
    userId: string,
    badges: any[]
  ): Promise<BadgeAchievement[]> {
    const achievements: BadgeAchievement[] = [];

    // Achievement: First Badge
    if (badges.length >= 1) {
      const firstBadge = badges.sort((a, b) => 
        a.completionDate.getTime() - b.completionDate.getTime()
      )[0];

      achievements.push({
        type: 'FIRST_BADGE',
        name: 'First Steps',
        description: 'Earned your first badge',
        earnedAt: firstBadge.completionDate,
        badgeCount: 1
      });
    }

    // Achievement: 5 Badges
    if (badges.length >= 5) {
      achievements.push({
        type: 'FIVE_BADGES',
        name: 'Rising Scholar',
        description: 'Earned 5 badges',
        earnedAt: badges[4].completionDate,
        badgeCount: 5
      });
    }

    // Achievement: 10 Badges
    if (badges.length >= 10) {
      achievements.push({
        type: 'TEN_BADGES',
        name: 'Dedicated Learner',
        description: 'Earned 10 badges',
        earnedAt: badges[9].completionDate,
        badgeCount: 10
      });
    }

    // Achievement: Perfect Score
    const perfectScoreBadges = badges.filter(b => b.grade === 100);
    if (perfectScoreBadges.length > 0) {
      achievements.push({
        type: 'PERFECT_SCORE',
        name: 'Perfectionist',
        description: 'Achieved a perfect score',
        earnedAt: perfectScoreBadges[0].completionDate,
        badgeCount: perfectScoreBadges.length
      });
    }

    // Achievement: High Achiever (90+ average)
    const averageGrade = badges.reduce((sum, b) => sum + b.grade, 0) / badges.length;
    if (averageGrade >= 90) {
      achievements.push({
        type: 'HIGH_ACHIEVER',
        name: 'High Achiever',
        description: 'Maintained 90+ average grade',
        earnedAt: new Date(),
        badgeCount: badges.length
      });
    }

    // Achievement: Degree Completion
    const degreeBadges = badges.filter(
      b => b.credentialType === BadgeCredentialType.DEGREE_COMPLETION
    );
    if (degreeBadges.length > 0) {
      achievements.push({
        type: 'DEGREE_COMPLETION',
        name: 'Graduate',
        description: 'Completed a degree program',
        earnedAt: degreeBadges[0].completionDate,
        badgeCount: degreeBadges.length
      });
    }

    return achievements;
  }

  /**
   * Share badge on social media
   */
  async shareBadge(request: BadgeShareRequest): Promise<BadgeShareResult> {
    try {
      logger.info('Sharing badge', { request });

      const badge = await ScrollBadgeService.getBadgeByTokenId(request.tokenId);

      if (!badge) {
        throw new Error('Badge not found');
      }

      if (!badge.isPublic) {
        throw new Error('Badge is not public');
      }

      const shareUrl = this.generateShareUrl(badge, request.platform);

      // Record share event
      await prisma.badgeShare.create({
        data: {
          badgeId: badge.id,
          platform: request.platform,
          shareUrl,
          message: request.message
        }
      });

      logger.info('Badge shared successfully', {
        badgeId: badge.id,
        platform: request.platform
      });

      return {
        shareUrl,
        platform: request.platform,
        sharedAt: new Date()
      };
    } catch (error) {
      logger.error('Error sharing badge:', error);
      throw error;
    }
  }

  /**
   * Generate share URL for platform
   */
  private generateShareUrl(badge: any, platform: SharePlatform): string {
    const badgeUrl = `${scrollBadgeConfig.shareBaseUrl}/${badge.tokenId}`;
    const text = `I just earned a badge for completing ${badge.courseName} at ScrollUniversity with a grade of ${badge.grade}%!`;

    switch (platform) {
      case SharePlatform.LINKEDIN:
        if (!scrollBadgeConfig.linkedInShareEnabled) {
          throw new Error('LinkedIn sharing is disabled');
        }
        return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(badgeUrl)}`;

      case SharePlatform.TWITTER:
        if (!scrollBadgeConfig.twitterShareEnabled) {
          throw new Error('Twitter sharing is disabled');
        }
        return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(badgeUrl)}`;

      case SharePlatform.FACEBOOK:
        if (!scrollBadgeConfig.facebookShareEnabled) {
          throw new Error('Facebook sharing is disabled');
        }
        return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(badgeUrl)}`;

      case SharePlatform.EMAIL:
        const subject = 'Check out my ScrollUniversity badge!';
        const body = `${text}\n\nView my badge: ${badgeUrl}`;
        return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      case SharePlatform.CUSTOM:
        return badgeUrl;

      default:
        return badgeUrl;
    }
  }

  /**
   * Get badge share statistics
   */
  async getBadgeShareStats(badgeId: string): Promise<{
    totalShares: number;
    sharesByPlatform: Record<SharePlatform, number>;
    recentShares: any[];
  }> {
    try {
      const shares = await prisma.badgeShare.findMany({
        where: { badgeId },
        orderBy: { createdAt: 'desc' }
      });

      const sharesByPlatform: Record<SharePlatform, number> = {
        [SharePlatform.LINKEDIN]: 0,
        [SharePlatform.TWITTER]: 0,
        [SharePlatform.FACEBOOK]: 0,
        [SharePlatform.EMAIL]: 0,
        [SharePlatform.CUSTOM]: 0
      };

      shares.forEach(share => {
        sharesByPlatform[share.platform as SharePlatform]++;
      });

      return {
        totalShares: shares.length,
        sharesByPlatform,
        recentShares: shares.slice(0, 10)
      };
    } catch (error) {
      logger.error('Error getting badge share stats:', error);
      throw error;
    }
  }

  /**
   * Generate badge embed code
   */
  generateBadgeEmbedCode(tokenId: number): string {
    const badgeUrl = `${scrollBadgeConfig.shareBaseUrl}/${tokenId}`;
    
    return `
      <div class="scrolluniversity-badge" data-token-id="${tokenId}">
        <a href="${badgeUrl}" target="_blank">
          <img src="${badgeUrl}/image" alt="ScrollUniversity Badge" />
        </a>
      </div>
    `.trim();
  }

  /**
   * Get popular badges
   */
  async getPopularBadges(limit: number = 10): Promise<any[]> {
    try {
      // Get badges with most shares
      const popularBadges = await prisma.badgeShare.groupBy({
        by: ['badgeId'],
        _count: {
          badgeId: true
        },
        orderBy: {
          _count: {
            badgeId: 'desc'
          }
        },
        take: limit
      });

      const badgeIds = popularBadges.map(b => b.badgeId);

      const badges = await prisma.scrollBadge.findMany({
        where: {
          id: { in: badgeIds },
          isPublic: true,
          isRevoked: false
        }
      });

      return badges.map(badge => ({
        ...badge,
        shareCount: popularBadges.find(p => p.badgeId === badge.id)?._count.badgeId || 0
      }));
    } catch (error) {
      logger.error('Error getting popular badges:', error);
      throw error;
    }
  }

  /**
   * Get trending badges
   */
  async getTrendingBadges(days: number = 7, limit: number = 10): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const trendingBadges = await prisma.badgeShare.groupBy({
        by: ['badgeId'],
        where: {
          createdAt: {
            gte: startDate
          }
        },
        _count: {
          badgeId: true
        },
        orderBy: {
          _count: {
            badgeId: 'desc'
          }
        },
        take: limit
      });

      const badgeIds = trendingBadges.map(b => b.badgeId);

      const badges = await prisma.scrollBadge.findMany({
        where: {
          id: { in: badgeIds },
          isPublic: true,
          isRevoked: false
        }
      });

      return badges.map(badge => ({
        ...badge,
        shareCount: trendingBadges.find(t => t.badgeId === badge.id)?._count.badgeId || 0
      }));
    } catch (error) {
      logger.error('Error getting trending badges:', error);
      throw error;
    }
  }
}

export default BadgeProfileService.getInstance();
