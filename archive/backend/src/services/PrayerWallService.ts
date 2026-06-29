/**
 * Prayer Wall Service
 * "Bear one another's burdens, and so fulfill the law of Christ" - Galatians 6:2
 * 
 * Service for managing community prayer walls
 */

import { PrismaClient } from '@prisma/client';
import {
  PrayerWall,
  PrayerRequest,
  WallType,
  PrayerUrgency
} from '../types/prayer.types';

const prisma = new PrismaClient();

export default class PrayerWallService {
  /**
   * Create a prayer wall
   */
  async createPrayerWall(
    userId: string,
    data: {
      name: string;
      description: string;
      type: WallType;
      isPublic: boolean;
      moderators?: string[];
    }
  ): Promise<PrayerWall> {
    try {
      const wall: PrayerWall = {
        id: `wall_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: data.name,
        description: data.description,
        type: data.type,
        isPublic: data.isPublic,
        moderators: data.moderators || [userId],
        requests: [],
        memberCount: 0,
        totalPrayers: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // In production, save to database
      // await prisma.prayerWall.create({ data: wall });

      return wall;
    } catch (error) {
      console.error('Error creating prayer wall:', error);
      throw new Error('Failed to create prayer wall');
    }
  }

  /**
   * Get prayer wall by ID
   */
  async getPrayerWall(wallId: string): Promise<PrayerWall> {
    try {
      // In production, query from database
      const wall: PrayerWall = {
        id: wallId,
        name: 'Global Prayer Wall',
        description: 'A place for the global ScrollUniversity community to share prayer requests',
        type: WallType.GLOBAL,
        isPublic: true,
        moderators: [],
        requests: [],
        memberCount: 150,
        totalPrayers: 1250,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Load prayer requests for this wall
      wall.requests = await this.getWallRequests(wallId);

      return wall;
    } catch (error) {
      console.error('Error getting prayer wall:', error);
      throw new Error('Failed to retrieve prayer wall');
    }
  }

  /**
   * Get all prayer walls
   */
  async getAllPrayerWalls(
    filters?: {
      type?: WallType;
      isPublic?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<PrayerWall[]> {
    try {
      // In production, query from database with filters
      const walls: PrayerWall[] = [];
      
      return walls;
    } catch (error) {
      console.error('Error getting prayer walls:', error);
      throw new Error('Failed to retrieve prayer walls');
    }
  }

  /**
   * Get prayer walls for a specific context (course, faculty, etc.)
   */
  async getContextPrayerWalls(
    type: WallType,
    contextId: string
  ): Promise<PrayerWall[]> {
    try {
      // In production, query walls by type and context
      const walls: PrayerWall[] = [];
      
      return walls;
    } catch (error) {
      console.error('Error getting context prayer walls:', error);
      throw new Error('Failed to retrieve context prayer walls');
    }
  }

  /**
   * Add prayer request to wall
   */
  async addRequestToWall(
    wallId: string,
    requestId: string,
    userId: string
  ): Promise<void> {
    try {
      const wall = await this.getPrayerWall(wallId);
      
      // Check permissions
      if (!wall.isPublic && !wall.moderators.includes(userId)) {
        throw new Error('Unauthorized to add requests to this wall');
      }

      // In production, create junction record
      // await prisma.prayerWallRequest.create({
      //   data: {
      //     prayerWallId: wallId,
      //     prayerRequestId: requestId
      //   }
      // });

      // Update wall statistics
      // await prisma.prayerWall.update({
      //   where: { id: wallId },
      //   data: { memberCount: { increment: 1 } }
      // });
    } catch (error) {
      console.error('Error adding request to wall:', error);
      throw new Error('Failed to add request to prayer wall');
    }
  }

  /**
   * Remove prayer request from wall
   */
  async removeRequestFromWall(
    wallId: string,
    requestId: string,
    userId: string
  ): Promise<void> {
    try {
      const wall = await this.getPrayerWall(wallId);
      
      // Check permissions (must be moderator or request owner)
      if (!wall.moderators.includes(userId)) {
        // Check if user owns the request
        // const request = await prisma.prayerRequest.findUnique({ where: { id: requestId } });
        // if (request.userId !== userId) {
        //   throw new Error('Unauthorized');
        // }
      }

      // In production, delete junction record
      // await prisma.prayerWallRequest.delete({
      //   where: {
      //     prayerWallId_prayerRequestId: {
      //       prayerWallId: wallId,
      //       prayerRequestId: requestId
      //     }
      //   }
      // });
    } catch (error) {
      console.error('Error removing request from wall:', error);
      throw new Error('Failed to remove request from prayer wall');
    }
  }

  /**
   * Get prayer requests on a wall
   */
  async getWallRequests(
    wallId: string,
    filters?: {
      urgency?: PrayerUrgency;
      limit?: number;
      offset?: number;
    }
  ): Promise<PrayerRequest[]> {
    try {
      // In production, query requests for this wall
      const requests: PrayerRequest[] = [];
      
      return requests;
    } catch (error) {
      console.error('Error getting wall requests:', error);
      throw new Error('Failed to retrieve wall requests');
    }
  }

  /**
   * Get urgent requests from all public walls
   */
  async getUrgentRequests(limit: number = 10): Promise<PrayerRequest[]> {
    try {
      // In production, query urgent requests from public walls
      const requests: PrayerRequest[] = [];
      
      return requests;
    } catch (error) {
      console.error('Error getting urgent requests:', error);
      throw new Error('Failed to retrieve urgent requests');
    }
  }

  /**
   * Update prayer wall
   */
  async updatePrayerWall(
    wallId: string,
    userId: string,
    data: Partial<PrayerWall>
  ): Promise<PrayerWall> {
    try {
      const wall = await this.getPrayerWall(wallId);
      
      // Check if user is moderator
      if (!wall.moderators.includes(userId)) {
        throw new Error('Unauthorized to update this prayer wall');
      }

      const updatedWall: PrayerWall = {
        ...wall,
        ...data,
        updatedAt: new Date()
      };

      // In production, update in database
      // await prisma.prayerWall.update({ where: { id: wallId }, data: updatedWall });

      return updatedWall;
    } catch (error) {
      console.error('Error updating prayer wall:', error);
      throw new Error('Failed to update prayer wall');
    }
  }

  /**
   * Delete prayer wall
   */
  async deletePrayerWall(wallId: string, userId: string): Promise<void> {
    try {
      const wall = await this.getPrayerWall(wallId);
      
      // Check if user is moderator
      if (!wall.moderators.includes(userId)) {
        throw new Error('Unauthorized to delete this prayer wall');
      }

      // In production, delete from database
      // await prisma.prayerWall.delete({ where: { id: wallId } });
    } catch (error) {
      console.error('Error deleting prayer wall:', error);
      throw new Error('Failed to delete prayer wall');
    }
  }

  /**
   * Add moderator to prayer wall
   */
  async addModerator(
    wallId: string,
    userId: string,
    newModeratorId: string
  ): Promise<void> {
    try {
      const wall = await this.getPrayerWall(wallId);
      
      // Check if user is already a moderator
      if (!wall.moderators.includes(userId)) {
        throw new Error('Unauthorized to add moderators');
      }

      if (!wall.moderators.includes(newModeratorId)) {
        wall.moderators.push(newModeratorId);
        
        // In production, update in database
        // await prisma.prayerWall.update({
        //   where: { id: wallId },
        //   data: { moderators: wall.moderators }
        // });
      }
    } catch (error) {
      console.error('Error adding moderator:', error);
      throw new Error('Failed to add moderator');
    }
  }

  /**
   * Remove moderator from prayer wall
   */
  async removeModerator(
    wallId: string,
    userId: string,
    moderatorId: string
  ): Promise<void> {
    try {
      const wall = await this.getPrayerWall(wallId);
      
      // Check if user is a moderator
      if (!wall.moderators.includes(userId)) {
        throw new Error('Unauthorized to remove moderators');
      }

      // Don't allow removing the last moderator
      if (wall.moderators.length === 1) {
        throw new Error('Cannot remove the last moderator');
      }

      wall.moderators = wall.moderators.filter(id => id !== moderatorId);
      
      // In production, update in database
      // await prisma.prayerWall.update({
      //   where: { id: wallId },
      //   data: { moderators: wall.moderators }
      // });
    } catch (error) {
      console.error('Error removing moderator:', error);
      throw new Error('Failed to remove moderator');
    }
  }

  /**
   * Get wall statistics
   */
  async getWallStatistics(wallId: string): Promise<{
    totalRequests: number;
    activeRequests: number;
    answeredRequests: number;
    totalPrayers: number;
    memberCount: number;
    averageResponseTime: number;
  }> {
    try {
      // In production, calculate from database
      return {
        totalRequests: 50,
        activeRequests: 15,
        answeredRequests: 35,
        totalPrayers: 1250,
        memberCount: 150,
        averageResponseTime: 2.5 // hours
      };
    } catch (error) {
      console.error('Error getting wall statistics:', error);
      throw new Error('Failed to retrieve wall statistics');
    }
  }

  /**
   * Get trending prayer walls
   */
  async getTrendingWalls(limit: number = 5): Promise<PrayerWall[]> {
    try {
      // In production, query walls with most activity in last 24 hours
      const walls: PrayerWall[] = [];
      
      return walls;
    } catch (error) {
      console.error('Error getting trending walls:', error);
      throw new Error('Failed to retrieve trending walls');
    }
  }
}
