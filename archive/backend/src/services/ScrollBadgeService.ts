/**
 * ScrollBadge NFT Service
 * "By the Spirit of Excellence, we establish verifiable credentials on the blockchain"
 * 
 * Service for managing ScrollBadge NFTs - digital credentials for course completion
 * and academic achievements with blockchain verification.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import scrollBadgeConfig from '../config/scrollbadge.config';
import {
  ScrollBadgeData,
  MintBadgeRequest,
  BadgeQueryOptions,
  BadgeQueryResult,
  BadgeStatistics,
  BadgeCredentialType
} from '../types/scrollbadge.types';

const prisma = new PrismaClient();

export class ScrollBadgeService {
  private static instance: ScrollBadgeService;

  private constructor() {}

  public static getInstance(): ScrollBadgeService {
    if (!ScrollBadgeService.instance) {
      ScrollBadgeService.instance = new ScrollBadgeService();
    }
    return ScrollBadgeService.instance;
  }

  /**
   * Create a new badge (database record)
   */
  async createBadge(request: MintBadgeRequest): Promise<ScrollBadgeData> {
    try {
      logger.info('Creating badge', { request });

      // Get user and course information
      const user = await prisma.user.findUnique({
        where: { id: request.userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const course = await prisma.course.findUnique({
        where: { id: request.courseId }
      });

      if (!course) {
        throw new Error('Course not found');
      }

      // Check if badge already exists
      const existingBadge = await prisma.scrollBadge.findFirst({
        where: {
          userId: request.userId,
          courseId: request.courseId,
          isRevoked: false
        }
      });

      if (existingBadge) {
        throw new Error('Badge already exists for this course');
      }

      // Generate token ID (will be set when minted on blockchain)
      const tokenId = await this.generateTokenId();

      // Create badge record
      const badge = await prisma.scrollBadge.create({
        data: {
          tokenId,
          userId: request.userId,
          courseId: request.courseId,
          courseName: course.title,
          studentName: `${user.firstName} ${user.lastName}`,
          completionDate: new Date(),
          grade: request.grade,
          credentialType: request.credentialType,
          ipfsHash: '', // Will be set after IPFS upload
          metadataUri: '', // Will be set after metadata generation
          isPublic: request.isPublic ?? true,
          ownerAddress: '', // Will be set when minted on blockchain
          isRevoked: false
        }
      });

      logger.info('Badge created successfully', { badgeId: badge.id });

      return this.mapBadgeToData(badge);
    } catch (error) {
      logger.error('Error creating badge:', error);
      throw error;
    }
  }

  /**
   * Get badge by ID
   */
  async getBadgeById(badgeId: string): Promise<ScrollBadgeData | null> {
    try {
      const badge = await prisma.scrollBadge.findUnique({
        where: { id: badgeId }
      });

      if (!badge) {
        return null;
      }

      return this.mapBadgeToData(badge);
    } catch (error) {
      logger.error('Error getting badge:', error);
      throw error;
    }
  }

  /**
   * Get badge by token ID
   */
  async getBadgeByTokenId(tokenId: number): Promise<ScrollBadgeData | null> {
    try {
      const badge = await prisma.scrollBadge.findFirst({
        where: { tokenId }
      });

      if (!badge) {
        return null;
      }

      return this.mapBadgeToData(badge);
    } catch (error) {
      logger.error('Error getting badge by token ID:', error);
      throw error;
    }
  }

  /**
   * Query badges with filters
   */
  async queryBadges(options: BadgeQueryOptions): Promise<BadgeQueryResult> {
    try {
      const {
        userId,
        courseId,
        credentialType,
        isRevoked,
        isPublic,
        minGrade,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
        sortBy = 'completionDate',
        sortOrder = 'desc'
      } = options;

      // Build where clause
      const where: any = {};

      if (userId) where.userId = userId;
      if (courseId) where.courseId = courseId;
      if (credentialType) where.credentialType = credentialType;
      if (isRevoked !== undefined) where.isRevoked = isRevoked;
      if (isPublic !== undefined) where.isPublic = isPublic;
      if (minGrade !== undefined) where.grade = { gte: minGrade };
      
      if (startDate || endDate) {
        where.completionDate = {};
        if (startDate) where.completionDate.gte = startDate;
        if (endDate) where.completionDate.lte = endDate;
      }

      // Get total count
      const total = await prisma.scrollBadge.count({ where });

      // Get badges
      const badges = await prisma.scrollBadge.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset
      });

      return {
        badges: badges.map(b => this.mapBadgeToData(b)),
        total,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit
      };
    } catch (error) {
      logger.error('Error querying badges:', error);
      throw error;
    }
  }

  /**
   * Get user's badges
   */
  async getUserBadges(userId: string): Promise<ScrollBadgeData[]> {
    try {
      const result = await this.queryBadges({
        userId,
        isRevoked: false,
        limit: 1000
      });

      return result.badges;
    } catch (error) {
      logger.error('Error getting user badges:', error);
      throw error;
    }
  }

  /**
   * Get course badges
   */
  async getCourseBadges(courseId: string): Promise<ScrollBadgeData[]> {
    try {
      const result = await this.queryBadges({
        courseId,
        isRevoked: false,
        limit: 1000
      });

      return result.badges;
    } catch (error) {
      logger.error('Error getting course badges:', error);
      throw error;
    }
  }

  /**
   * Update badge metadata
   */
  async updateBadgeMetadata(
    badgeId: string,
    ipfsHash: string,
    metadataUri: string
  ): Promise<ScrollBadgeData> {
    try {
      const badge = await prisma.scrollBadge.update({
        where: { id: badgeId },
        data: {
          ipfsHash,
          metadataUri,
          updatedAt: new Date()
        }
      });

      return this.mapBadgeToData(badge);
    } catch (error) {
      logger.error('Error updating badge metadata:', error);
      throw error;
    }
  }

  /**
   * Update badge blockchain data
   */
  async updateBadgeBlockchainData(
    badgeId: string,
    txHash: string,
    blockNumber: number,
    ownerAddress: string
  ): Promise<ScrollBadgeData> {
    try {
      const badge = await prisma.scrollBadge.update({
        where: { id: badgeId },
        data: {
          blockchainTxHash: txHash,
          blockNumber,
          ownerAddress,
          updatedAt: new Date()
        }
      });

      return this.mapBadgeToData(badge);
    } catch (error) {
      logger.error('Error updating badge blockchain data:', error);
      throw error;
    }
  }

  /**
   * Revoke badge
   */
  async revokeBadge(
    badgeId: string,
    reason: string,
    revokedBy: string
  ): Promise<ScrollBadgeData> {
    try {
      logger.info('Revoking badge', { badgeId, reason, revokedBy });

      const badge = await prisma.scrollBadge.update({
        where: { id: badgeId },
        data: {
          isRevoked: true,
          revokedReason: reason,
          revokedAt: new Date(),
          updatedAt: new Date()
        }
      });

      logger.info('Badge revoked successfully', { badgeId });

      return this.mapBadgeToData(badge);
    } catch (error) {
      logger.error('Error revoking badge:', error);
      throw error;
    }
  }

  /**
   * Update badge visibility
   */
  async updateBadgeVisibility(
    badgeId: string,
    isPublic: boolean
  ): Promise<ScrollBadgeData> {
    try {
      const badge = await prisma.scrollBadge.update({
        where: { id: badgeId },
        data: {
          isPublic,
          updatedAt: new Date()
        }
      });

      return this.mapBadgeToData(badge);
    } catch (error) {
      logger.error('Error updating badge visibility:', error);
      throw error;
    }
  }

  /**
   * Get badge statistics
   */
  async getBadgeStatistics(userId?: string): Promise<BadgeStatistics> {
    try {
      const where: any = { isRevoked: false };
      if (userId) where.userId = userId;

      // Get total badges
      const totalBadges = await prisma.scrollBadge.count({ where });

      // Get badges by type
      const badgesByType: Record<BadgeCredentialType, number> = {
        [BadgeCredentialType.COURSE_COMPLETION]: 0,
        [BadgeCredentialType.SKILL_MASTERY]: 0,
        [BadgeCredentialType.DEGREE_COMPLETION]: 0,
        [BadgeCredentialType.CERTIFICATE]: 0,
        [BadgeCredentialType.SPECIALIZATION]: 0,
        [BadgeCredentialType.ACHIEVEMENT]: 0
      };

      const typeGroups = await prisma.scrollBadge.groupBy({
        by: ['credentialType'],
        where,
        _count: true
      });

      typeGroups.forEach(group => {
        badgesByType[group.credentialType as BadgeCredentialType] = group._count;
      });

      // Get badges by course
      const courseGroups = await prisma.scrollBadge.groupBy({
        by: ['courseId', 'courseName'],
        where,
        _count: true,
        orderBy: { _count: { courseId: 'desc' } },
        take: 10
      });

      const badgesByCourse: Record<string, number> = {};
      courseGroups.forEach(group => {
        badgesByCourse[group.courseId] = group._count;
      });

      // Get average grade
      const gradeAgg = await prisma.scrollBadge.aggregate({
        where,
        _avg: { grade: true }
      });

      const averageGrade = gradeAgg._avg.grade || 0;

      // Get recent badges
      const recentBadges = await prisma.scrollBadge.findMany({
        where,
        orderBy: { completionDate: 'desc' },
        take: 10
      });

      // Get top courses
      const topCourses = courseGroups.map(group => ({
        courseId: group.courseId,
        courseName: group.courseName,
        badgeCount: group._count
      }));

      return {
        totalBadges,
        badgesByType,
        badgesByCourse,
        averageGrade,
        recentBadges: recentBadges.map(b => this.mapBadgeToData(b)),
        topCourses
      };
    } catch (error) {
      logger.error('Error getting badge statistics:', error);
      throw error;
    }
  }

  /**
   * Check if user has badge for course
   */
  async hasBadgeForCourse(userId: string, courseId: string): Promise<boolean> {
    try {
      const badge = await prisma.scrollBadge.findFirst({
        where: {
          userId,
          courseId,
          isRevoked: false
        }
      });

      return badge !== null;
    } catch (error) {
      logger.error('Error checking badge for course:', error);
      throw error;
    }
  }

  /**
   * Generate unique token ID
   */
  private async generateTokenId(): Promise<number> {
    const maxBadge = await prisma.scrollBadge.findFirst({
      orderBy: { tokenId: 'desc' }
    });

    return (maxBadge?.tokenId || 0) + 1;
  }

  /**
   * Map database badge to BadgeData
   */
  private mapBadgeToData(badge: any): ScrollBadgeData {
    return {
      id: badge.id,
      tokenId: badge.tokenId,
      userId: badge.userId,
      courseId: badge.courseId,
      courseName: badge.courseName,
      studentName: badge.studentName,
      completionDate: badge.completionDate,
      grade: badge.grade,
      credentialType: badge.credentialType as BadgeCredentialType,
      ipfsHash: badge.ipfsHash,
      metadataUri: badge.metadataUri,
      blockchainTxHash: badge.blockchainTxHash,
      blockNumber: badge.blockNumber,
      isRevoked: badge.isRevoked,
      revokedReason: badge.revokedReason,
      revokedAt: badge.revokedAt,
      isPublic: badge.isPublic,
      ownerAddress: badge.ownerAddress,
      createdAt: badge.createdAt,
      updatedAt: badge.updatedAt
    };
  }
}

export default ScrollBadgeService.getInstance();
