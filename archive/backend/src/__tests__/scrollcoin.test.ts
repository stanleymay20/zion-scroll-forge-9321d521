/**
 * ScrollCoin Service Tests
 * "Test the divine currency system with righteous precision"
 */

import ScrollCoinService from '../services/ScrollCoinService';
import BlockchainService from '../services/BlockchainService';
import RewardMechanismService from '../services/RewardMechanismService';

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn()
    },
    scrollCoinTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn()
    },
    $transaction: jest.fn()
  }))
}));

describe('ScrollCoin Economy Foundation', () => {
  describe('ScrollCoinService', () => {
    test('should be a singleton', () => {
      const instance1 = ScrollCoinService.getInstance();
      const instance2 = ScrollCoinService.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('should have correct reward configuration', () => {
      const scrollCoinService = ScrollCoinService.getInstance();
      const config = scrollCoinService.getRewardConfiguration();
      expect(config).toEqual({
        courseCompletion: 100,
        dailyStreak: 10,
        peerAssistance: 25,
        researchPublication: 500,
        mentoring: 50,
        translation: 75,
        toolBuilding: 200,
        missionService: 300
      });
    });
  });

  describe('BlockchainService', () => {
    test('should be a singleton', () => {
      const instance1 = BlockchainService.getInstance();
      const instance2 = BlockchainService.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('should get network status', async () => {
      const blockchainService = BlockchainService.getInstance();
      const status = await blockchainService.getNetworkStatus();
      
      expect(status).toHaveProperty('isConnected');
      expect(status).toHaveProperty('blockNumber');
      expect(status).toHaveProperty('networkName');
      expect(status.networkName).toBe('ScrollChain');
    });
  });

  describe('RewardMechanismService', () => {
    test('should be a singleton', () => {
      const instance1 = RewardMechanismService.getInstance();
      const instance2 = RewardMechanismService.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('should not award for low scores', async () => {
      const rewardService = RewardMechanismService.getInstance();
      const result = await rewardService.processCourseCompletion(
        'user123',
        'course456',
        65, // Below 70% threshold
        'BEGINNER'
      );

      expect(result.awarded).toBe(false);
      expect(result.amount).toBe(0);
      expect(result.reason).toBe('Score below minimum threshold');
    });
  });

  describe('Basic Functionality', () => {
    test('services should initialize without errors', () => {
      expect(() => {
        ScrollCoinService.getInstance();
        BlockchainService.getInstance();
        RewardMechanismService.getInstance();
      }).not.toThrow();
    });
  });
});