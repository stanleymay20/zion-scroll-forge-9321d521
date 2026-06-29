/**
 * Cost Optimization Service Tests
 */

import CostOptimizationService from '../CostOptimizationService';
import PromptOptimizationService from '../PromptOptimizationService';
import AdvancedCacheService from '../AdvancedCacheService';
import BudgetControlService from '../BudgetControlService';
import BatchProcessingService from '../BatchProcessingService';

describe('CostOptimizationService', () => {
  let service: CostOptimizationService;

  beforeEach(() => {
    service = new CostOptimizationService();
  });

  describe('processRequest', () => {
    it('should process request with cost optimization', async () => {
      const request = {
        prompt: 'Test prompt for optimization'
      };

      const result = await service.processRequest('grading', request, {
        enableCache: true,
        enableBatch: false,
        priority: 'high'
      });

      expect(result).toBeDefined();
      expect(result.processed).toBe(true);
    });
  });

  describe('getRecommendations', () => {
    it('should return optimization recommendations', async () => {
      const recommendations = await service.getRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('getCostReport', () => {
    it('should generate comprehensive cost report', async () => {
      const report = await service.getCostReport();

      expect(report).toHaveProperty('budget');
      expect(report).toHaveProperty('cache');
      expect(report).toHaveProperty('forecast');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('spendingByService');
    });
  });

  describe('getMetrics', () => {
    it('should return optimization metrics', async () => {
      const metrics = await service.getMetrics();

      expect(metrics).toHaveProperty('totalSavings');
      expect(metrics).toHaveProperty('cacheHitRate');
      expect(metrics).toHaveProperty('batchEfficiency');
      expect(metrics).toHaveProperty('budgetUtilization');
    });
  });
});

describe('PromptOptimizationService', () => {
  let service: PromptOptimizationService;

  beforeEach(() => {
    service = new PromptOptimizationService();
  });

  describe('optimizePrompt', () => {
    it('should optimize prompt for token efficiency', async () => {
      const prompt = 'Please provide a detailed explanation of the concept';
      const config = {
        maxTokens: 4000,
        temperature: 0.7,
        compressionEnabled: true,
        useSystemPrompts: true,
        removeRedundancy: true
      };

      const result = await service.optimizePrompt(prompt, config);

      expect(result.optimized).toBeDefined();
      expect(result.tokensSaved).toBeGreaterThanOrEqual(0);
      expect(result.compressionRatio).toBeLessThanOrEqual(1);
    });
  });

  describe('getBestPractices', () => {
    it('should return prompt optimization best practices', async () => {
      const practices = await service.getBestPractices();

      expect(Array.isArray(practices)).toBe(true);
      expect(practices.length).toBeGreaterThan(0);
    });
  });
});

describe('BudgetControlService', () => {
  let service: BudgetControlService;

  beforeEach(() => {
    service = new BudgetControlService({
      dailyLimit: 100,
      monthlyLimit: 3000,
      perServiceLimits: {
        'grading': 500,
        'content-creation': 800
      },
      alertThresholds: [80, 90, 95],
      throttleThreshold: 95,
      emergencyThreshold: 100
    });
  });

  describe('canProceed', () => {
    it('should allow request within budget', async () => {
      const canProceed = await service.canProceed('grading', 10);
      expect(canProceed).toBe(true);
    });
  });

  describe('recordSpending', () => {
    it('should record spending correctly', async () => {
      await service.recordSpending('grading', 50);
      const status = await service.getBudgetStatus();

      expect(status.currentDailySpend).toBeGreaterThan(0);
    });
  });

  describe('getBudgetStatus', () => {
    it('should return current budget status', async () => {
      const status = await service.getBudgetStatus();

      expect(status).toHaveProperty('currentDailySpend');
      expect(status).toHaveProperty('currentMonthlySpend');
      expect(status).toHaveProperty('dailyRemaining');
      expect(status).toHaveProperty('monthlyRemaining');
      expect(status).toHaveProperty('percentUsed');
    });
  });

  describe('generateForecast', () => {
    it('should generate cost forecast', async () => {
      const forecast = await service.generateForecast('monthly');

      expect(forecast).toHaveProperty('period');
      expect(forecast).toHaveProperty('projectedCost');
      expect(forecast).toHaveProperty('confidence');
      expect(forecast).toHaveProperty('trend');
      expect(forecast).toHaveProperty('recommendations');
    });
  });
});

describe('BatchProcessingService', () => {
  let service: BatchProcessingService;

  beforeEach(() => {
    service = new BatchProcessingService();
  });

  afterEach(() => {
    service.stopProcessing();
  });

  describe('addToBatch', () => {
    it('should add request to batch queue', async () => {
      const promise = service.addToBatch('grading', { content: 'test' }, 'low');
      
      const stats = await service.getQueueStats();
      expect(stats.queueLength).toBeGreaterThan(0);

      // Clean up
      await service.clearQueue();
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await service.getQueueStats();

      expect(stats).toHaveProperty('queueLength');
      expect(stats).toHaveProperty('byService');
      expect(stats).toHaveProperty('byPriority');
    });
  });
});
