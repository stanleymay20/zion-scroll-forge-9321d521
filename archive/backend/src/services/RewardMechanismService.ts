/**
 * Reward Mechanism Service
 * "Where righteousness abounds, divine rewards flow"
 */

import { PrismaClient } from '@prisma/client';
import ScrollCoinService from './ScrollCoinService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface RewardEvent {
  userId: string;
  eventType: RewardEventType;
  entityId?: string;
  metadata?: any;
  timestamp: Date;
}

export enum RewardEventType {
  COURSE_COMPLETION = 'COURSE_COMPLETION',
  PEER_ASSISTANCE = 'PEER_ASSISTANCE',
  DAILY_LOGIN = 'DAILY_LOGIN',
  LEARNING_STREAK = 'LEARNING_STREAK'
}

export class RewardMechanismService {
  private static instance: RewardMechanismService;
  private scrollCoinService: ScrollCoinService;

  private constructor() {
    this.scrollCoinService = ScrollCoinService.getInstance();
  }

  public static getInstance(): RewardMechanismService {
    if (!RewardMechanismService.instance) {
      RewardMechanismService.instance = new RewardMechanismService();
    }
    return RewardMechanismService.instance;
  }

  /**
   * Process course completion reward
   */
  async processCourseCompletion(
    userId: string,
    courseId: string,
    score: number,
    difficulty: string
  ): Promise<any> {
    try {
      if (score < 70) {
        return {
          awarded: false,
          amount: 0,
          reason: 'Score below minimum threshold'
        };
      }

      let amount = 100; // Base reward
      
      if (difficulty === 'ADVANCED') {
        amount *= 1.5;
      }
      
      if (score >= 90) {
        amount *= 1.2;
      }

      amount = Math.floor(amount);

      const transaction = await this.scrollCoinService.mintScrollCoin(
        userId,
        'courseCompletion',
        `Course completion reward`,
        courseId
      );

      return {
        awarded: true,
        amount,
        reason: 'Course completion reward',
        transactionId: transaction.id
      };
    } catch (error) {
      logger.error('Error processing course completion reward:', error);
      return {
        awarded: false,
        amount: 0,
        reason: 'Error processing reward'
      };
    }
  }

  /**
   * Process peer assistance reward
   */
  async processPeerAssistance(
    helperId: string,
    helpedUserId: string,
    impact: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'
  ): Promise<any> {
    try {
      let amount = 25; // Base reward
      
      if (impact === 'HIGH') {
        amount *= 1.5;
      }

      const transaction = await this.scrollCoinService.mintScrollCoin(
        helperId,
        'peerAssistance',
        'Peer assistance reward',
        helpedUserId
      );

      return {
        awarded: true,
        amount,
        reason: 'Peer assistance reward',
        transactionId: transaction.id
      };
    } catch (error) {
      logger.error('Error processing peer assistance reward:', error);
      return {
        awarded: false,
        amount: 0,
        reason: 'Error processing reward'
      };
    }
  }

  /**
   * Get reward rules
   */
  getRewardRules(): Map<any, any> {
    return new Map();
  }

  /**
   * Get user reward statistics
   */
  async getUserRewardStats(userId: string): Promise<{
    totalEarned: number;
    rewardsByType: Record<string, number>;
    recentRewards: any[];
  }> {
    try {
      const transactions = await prisma.scrollCoinTransaction.findMany({
        where: {
          userId,
          type: { in: ['EARNED', 'BONUS'] }
        },
        orderBy: { createdAt: 'desc' }
      });

      const totalEarned = transactions.reduce((sum, tx) => sum + tx.amount, 0);
      
      const rewardsByType: Record<string, number> = {};
      transactions.forEach(tx => {
        if (tx.activityType) {
          rewardsByType[tx.activityType] = (rewardsByType[tx.activityType] || 0) + tx.amount;
        }
      });

      const recentRewards = transactions.slice(0, 10).map(tx => ({
        amount: tx.amount,
        description: tx.description,
        activityType: tx.activityType,
        createdAt: tx.createdAt
      }));

      return {
        totalEarned,
        rewardsByType,
        recentRewards
      };
    } catch (error) {
      logger.error('Error getting user reward stats:', error);
      throw error;
    }
  }
}

export default RewardMechanismService;