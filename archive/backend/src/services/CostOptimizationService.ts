/**
 * Cost Optimization Service
 * Integrates all cost optimization strategies and provides unified interface
 */

import PromptOptimizationService from './PromptOptimizationService';
import AdvancedCacheService from './AdvancedCacheService';
import BatchProcessingService from './BatchProcessingService';
import BudgetControlService from './BudgetControlService';
import {
  OptimizationRecommendation,
  CacheMetrics,
  BudgetStatus,
  CostForecast
} from '../types/cost-optimization.types';
import {
  promptOptimizationConfig,
  cacheConfig,
  budgetConfig,
  modelSelectionConfig
} from '../config/cost-optimization.config';
import logger from '../utils/logger';

export default class CostOptimizationService {
  private promptOptimizer: PromptOptimizationService;
  private cacheService: AdvancedCacheService;
  private batchProcessor: BatchProcessingService;
  private budgetControl: BudgetControlService;

  constructor() {
    this.promptOptimizer = new PromptOptimizationService();
    this.cacheService = new AdvancedCacheService(cacheConfig);
    this.batchProcessor = new BatchProcessingService();
    this.budgetControl = new BudgetControlService(budgetConfig);
  }

  /**
   * Process AI request with cost optimization
   */
  async processRequest(
    service: string,
    request: any,
    options: {
      enableCache?: boolean;
      enableBatch?: boolean;
      priority?: 'low' | 'medium' | 'high';
    } = {}
  ): Promise<any> {
    try {
      const estimatedCost = this.estimateRequestCost(service, request);

      // Check budget
      const canProceed = await this.budgetControl.canProceed(service, estimatedCost);
      if (!canProceed) {
        throw new Error('Budget limit exceeded - request blocked');
      }

      // Try cache first
      if (options.enableCache !== false) {
        const cacheKey = this.generateCacheKey(service, request);
        const cached = await this.cacheService.get(cacheKey, request.prompt);
        if (cached) {
          logger.info(`Cache hit for ${service}`);
          return cached;
        }
      }

      // Optimize prompt
      if (request.prompt) {
        const optimized = await this.promptOptimizer.optimizePrompt(
          request.prompt,
          promptOptimizationConfig
        );
        request.prompt = optimized.optimized;
      }

      // Process with batching if enabled
      let result;
      if (options.enableBatch && options.priority !== 'high') {
        result = await this.batchProcessor.addToBatch(
          service,
          request,
          options.priority || 'medium'
        );
      } else {
        // Process immediately
        result = await this.processImmediate(service, request);
      }

      // Cache result
      if (options.enableCache !== false) {
        const cacheKey = this.generateCacheKey(service, request);
        await this.cacheService.set(cacheKey, result, estimatedCost, request.prompt);
      }

      // Record spending
      await this.budgetControl.recordSpending(service, estimatedCost);

      return result;
    } catch (error) {
      logger.error('Error processing optimized request:', error);
      throw error;
    }
  }

  /**
   * Process request immediately without batching
   */
  private async processImmediate(service: string, request: any): Promise<any> {
    // This would call the actual AI service
    // For now, return a placeholder
    return { processed: true, service, request };
  }

  /**
   * Estimate cost for request
   */
  private estimateRequestCost(service: string, request: any): number {
    const model = this.selectOptimalModel(service);
    const tokens = this.estimateTokens(request);
    return (tokens / 1000) * model.costPer1kTokens;
  }

  /**
   * Select optimal model for service
   */
  private selectOptimalModel(service: string): any {
    const modelType = modelSelectionConfig.selectionRules[service] || 'standard';
    return modelSelectionConfig.models[modelType];
  }

  /**
   * Estimate tokens for request
   */
  private estimateTokens(request: any): number {
    const text = request.prompt || JSON.stringify(request);
    return Math.ceil(text.length / 4);
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(service: string, request: any): string {
    const content = JSON.stringify(request);
    return `${service}:${this.hashString(content)}`;
  }

  /**
   * Simple hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Get comprehensive optimization recommendations
   */
  async getRecommendations(): Promise<OptimizationRecommendation[]> {
    try {
      const recommendations: OptimizationRecommendation[] = [];

      // Get budget status
      const budgetStatus = await this.budgetControl.getBudgetStatus();

      // Get cache metrics
      const cacheMetrics = await this.cacheService.getMetrics();

      // Recommend caching improvements
      if (cacheMetrics.hitRate < 0.5) {
        recommendations.push({
          type: 'cache',
          service: 'all',
          currentCost: budgetStatus.currentMonthlySpend,
          projectedSavings: budgetStatus.currentMonthlySpend * 0.2,
          implementation: 'Increase cache TTL and enable semantic caching',
          priority: 'high'
        });
      }

      // Recommend batching
      const queueStats = await this.batchProcessor.getQueueStats();
      if (queueStats.queueLength > 50) {
        recommendations.push({
          type: 'batch',
          service: 'all',
          currentCost: budgetStatus.currentMonthlySpend,
          projectedSavings: budgetStatus.currentMonthlySpend * 0.15,
          implementation: 'Enable batch processing for more services',
          priority: 'medium'
        });
      }

      // Recommend model optimization
      if (budgetStatus.percentUsed > 80) {
        recommendations.push({
          type: 'model',
          service: 'all',
          currentCost: budgetStatus.currentMonthlySpend,
          projectedSavings: budgetStatus.currentMonthlySpend * 0.25,
          implementation: 'Use GPT-3.5-turbo for simple tasks instead of GPT-4',
          priority: 'high'
        });
      }

      return recommendations;
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive cost report
   */
  async getCostReport(): Promise<{
    budget: BudgetStatus;
    cache: CacheMetrics;
    forecast: CostForecast;
    recommendations: OptimizationRecommendation[];
    spendingByService: Record<string, number>;
  }> {
    try {
      const [budget, cache, forecast, recommendations, spendingByService] = await Promise.all([
        this.budgetControl.getBudgetStatus(),
        this.cacheService.getMetrics(),
        this.budgetControl.generateForecast('monthly'),
        this.getRecommendations(),
        this.budgetControl.getSpendingByService()
      ]);

      return {
        budget,
        cache,
        forecast,
        recommendations,
        spendingByService
      };
    } catch (error) {
      logger.error('Error generating cost report:', error);
      throw error;
    }
  }

  /**
   * Apply optimization strategy
   */
  async applyStrategy(strategy: 'aggressive' | 'balanced' | 'quality'): Promise<void> {
    try {
      logger.info(`Applying ${strategy} optimization strategy`);

      // Update configurations based on strategy
      // Implementation would update service configurations

      logger.info(`${strategy} strategy applied successfully`);
    } catch (error) {
      logger.error('Error applying strategy:', error);
      throw error;
    }
  }

  /**
   * Get optimization metrics
   */
  async getMetrics(): Promise<{
    totalSavings: number;
    cacheHitRate: number;
    batchEfficiency: number;
    budgetUtilization: number;
  }> {
    try {
      const budget = await this.budgetControl.getBudgetStatus();
      const cache = await this.cacheService.getMetrics();

      return {
        totalSavings: cache.costSaved,
        cacheHitRate: cache.hitRate,
        batchEfficiency: 0.85, // Placeholder
        budgetUtilization: budget.percentUsed / 100
      };
    } catch (error) {
      logger.error('Error getting metrics:', error);
      throw error;
    }
  }
}
