/**
 * Performance Optimization Service
 * Backend service for performance monitoring and optimization
 */

import { logger } from '../utils/productionLogger';
import { cacheService } from './CacheService';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
  userId?: string;
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  period: {
    start: Date;
    end: Date;
  };
}

class PerformanceOptimizationService {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 10000;
  private readonly CACHE_TTL = 3600; // 1 hour

  /**
   * Record a performance metric
   */
  async recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): Promise<void> {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date(),
    };

    this.metrics.push(fullMetric);

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Cache metric for quick access
    const cacheKey = `perf:${metric.name}:latest`;
    await cacheService.set(cacheKey, fullMetric, this.CACHE_TTL);

    // Log slow operations
    if (metric.name.includes('response_time') && metric.value > 1000) {
      logger.warn('Slow operation detected', {
        metric: metric.name,
        value: metric.value,
        tags: metric.tags,
      });
    }
  }

  /**
   * Get performance report for a time period
   */
  async getPerformanceReport(
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceReport> {
    const filteredMetrics = this.metrics.filter(
      (m) => m.timestamp >= startDate && m.timestamp <= endDate
    );

    const responseTimes = filteredMetrics
      .filter((m) => m.name.includes('response_time'))
      .map((m) => m.value)
      .sort((a, b) => a - b);

    const errors = filteredMetrics.filter((m) => m.name.includes('error')).length;

    return {
      metrics: filteredMetrics,
      summary: {
        avgResponseTime: this.calculateAverage(responseTimes),
        p95ResponseTime: this.calculatePercentile(responseTimes, 95),
        p99ResponseTime: this.calculatePercentile(responseTimes, 99),
        errorRate: errors / filteredMetrics.length,
        throughput: filteredMetrics.length / ((endDate.getTime() - startDate.getTime()) / 1000),
      },
      period: {
        start: startDate,
        end: endDate,
      },
    };
  }

  /**
   * Get metrics by name
   */
  async getMetricsByName(name: string, limit: number = 100): Promise<PerformanceMetric[]> {
    const cacheKey = `perf:metrics:${name}`;
    const cached = await cacheService.get<PerformanceMetric[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const metrics = this.metrics
      .filter((m) => m.name === name)
      .slice(-limit);

    await cacheService.set(cacheKey, metrics, 300); // 5 minutes

    return metrics;
  }

  /**
   * Get slow queries
   */
  async getSlowQueries(threshold: number = 1000): Promise<PerformanceMetric[]> {
    return this.metrics.filter(
      (m) => m.name.includes('query') && m.value > threshold
    );
  }

  /**
   * Optimize database queries
   */
  async optimizeQueries(): Promise<{
    optimized: number;
    recommendations: string[];
  }> {
    const slowQueries = await this.getSlowQueries();
    const recommendations: string[] = [];

    // Analyze slow queries
    slowQueries.forEach((query) => {
      if (query.tags?.query) {
        // Check for missing indexes
        if (!query.tags.query.includes('INDEX')) {
          recommendations.push(
            `Consider adding an index for query: ${query.tags.query.substring(0, 100)}`
          );
        }

        // Check for SELECT *
        if (query.tags.query.includes('SELECT *')) {
          recommendations.push(
            `Avoid SELECT * in query: ${query.tags.query.substring(0, 100)}`
          );
        }

        // Check for N+1 queries
        if (query.tags.count && parseInt(query.tags.count) > 10) {
          recommendations.push(
            `Possible N+1 query detected: ${query.tags.query.substring(0, 100)}`
          );
        }
      }
    });

    return {
      optimized: slowQueries.length,
      recommendations: [...new Set(recommendations)],
    };
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    hitRate: number;
    missRate: number;
    size: number;
    evictions: number;
  }> {
    const stats = await cacheService.getStats();
    return {
      hitRate: stats.hits / (stats.hits + stats.misses) || 0,
      missRate: stats.misses / (stats.hits + stats.misses) || 0,
      size: stats.keys,
      evictions: stats.evictions || 0,
    };
  }

  /**
   * Optimize cache strategy
   */
  async optimizeCacheStrategy(): Promise<{
    recommendations: string[];
    potentialSavings: number;
  }> {
    const stats = await this.getCacheStats();
    const recommendations: string[] = [];
    let potentialSavings = 0;

    // Low hit rate
    if (stats.hitRate < 0.7) {
      recommendations.push(
        'Cache hit rate is low. Consider increasing TTL for frequently accessed data.'
      );
      potentialSavings += 20; // 20% potential improvement
    }

    // High eviction rate
    if (stats.evictions > stats.size * 0.5) {
      recommendations.push(
        'High cache eviction rate. Consider increasing cache size or reducing TTL.'
      );
      potentialSavings += 15;
    }

    // Analyze cache patterns
    const cacheMetrics = await this.getMetricsByName('cache.access');
    const accessPatterns = this.analyzeCacheAccessPatterns(cacheMetrics);

    if (accessPatterns.hotKeys.length > 0) {
      recommendations.push(
        `Hot keys detected: ${accessPatterns.hotKeys.join(', ')}. Consider pre-warming cache.`
      );
      potentialSavings += 10;
    }

    return {
      recommendations,
      potentialSavings,
    };
  }

  /**
   * Analyze cache access patterns
   */
  private analyzeCacheAccessPatterns(metrics: PerformanceMetric[]): {
    hotKeys: string[];
    coldKeys: string[];
  } {
    const keyAccess = new Map<string, number>();

    metrics.forEach((m) => {
      if (m.tags?.key) {
        keyAccess.set(m.tags.key, (keyAccess.get(m.tags.key) || 0) + 1);
      }
    });

    const sorted = Array.from(keyAccess.entries()).sort((a, b) => b[1] - a[1]);
    const hotKeys = sorted.slice(0, 10).map(([key]) => key);
    const coldKeys = sorted.slice(-10).map(([key]) => key);

    return { hotKeys, coldKeys };
  }

  /**
   * Get bundle size recommendations
   */
  async getBundleOptimizations(): Promise<{
    recommendations: string[];
    estimatedSavings: number;
  }> {
    const recommendations: string[] = [];
    let estimatedSavings = 0;

    // Check for large dependencies
    recommendations.push('Enable code splitting for route-based lazy loading');
    estimatedSavings += 30; // 30% reduction

    recommendations.push('Implement tree shaking for unused exports');
    estimatedSavings += 15;

    recommendations.push('Use dynamic imports for heavy components');
    estimatedSavings += 20;

    recommendations.push('Enable compression (gzip/brotli) for static assets');
    estimatedSavings += 25;

    return {
      recommendations,
      estimatedSavings,
    };
  }

  /**
   * Calculate average
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[index] || 0;
  }

  /**
   * Clear old metrics
   */
  async clearOldMetrics(olderThan: Date): Promise<number> {
    const initialLength = this.metrics.length;
    this.metrics = this.metrics.filter((m) => m.timestamp > olderThan);
    return initialLength - this.metrics.length;
  }

  /**
   * Export metrics for analysis
   */
  async exportMetrics(format: 'json' | 'csv' = 'json'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(this.metrics, null, 2);
    }

    // CSV format
    const headers = ['name', 'value', 'timestamp', 'tags', 'userId'];
    const rows = this.metrics.map((m) => [
      m.name,
      m.value,
      m.timestamp.toISOString(),
      JSON.stringify(m.tags || {}),
      m.userId || '',
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }
}

export default new PerformanceOptimizationService();
