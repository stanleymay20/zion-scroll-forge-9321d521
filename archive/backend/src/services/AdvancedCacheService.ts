/**
 * Advanced Cache Service
 * Implements intelligent caching with semantic similarity and multiple strategies
 */

import {
  CacheConfig,
  CacheEntry,
  CacheMetrics
} from '../types/cost-optimization.types';
import logger from '../utils/logger';
import { VectorStoreService } from './VectorStoreService';

export default class AdvancedCacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private vectorStore: VectorStoreService;
  private config: CacheConfig;
  private metrics: CacheMetrics;

  constructor(config: CacheConfig) {
    this.config = config;
    this.vectorStore = new VectorStoreService();
    this.metrics = {
      hitRate: 0,
      missRate: 0,
      totalHits: 0,
      totalMisses: 0,
      costSaved: 0,
      averageResponseTime: 0,
      cacheSize: 0
    };

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Get cached value or return null
   */
  async get(key: string, query?: string): Promise<any | null> {
    try {
      if (!this.config.enabled) {
        return null;
      }

      // Try exact match first
      const exactMatch = this.cache.get(key);
      if (exactMatch && !this.isExpired(exactMatch)) {
        exactMatch.hits++;
        this.recordHit(exactMatch.cost);
        return exactMatch.value;
      }

      // Try semantic match if query provided
      if (query && this.config.strategy === 'semantic') {
        const semanticMatch = await this.findSemanticMatch(query);
        if (semanticMatch) {
          semanticMatch.hits++;
          this.recordHit(semanticMatch.cost);
          return semanticMatch.value;
        }
      }

      this.recordMiss();
      return null;
    } catch (error) {
      logger.error('Error getting from cache:', error);
      return null;
    }
  }

  /**
   * Set cache value
   */
  async set(
    key: string,
    value: any,
    cost: number,
    query?: string
  ): Promise<void> {
    try {
      if (!this.config.enabled) {
        return;
      }

      // Check cache size limit
      if (this.cache.size >= this.config.maxSize) {
        await this.evict();
      }

      const entry: CacheEntry = {
        key,
        value,
        timestamp: new Date(),
        hits: 0,
        cost,
        ttl: this.config.ttl
      };

      // Generate embedding for semantic caching
      if (query && this.config.strategy === 'semantic') {
        entry.embedding = await this.vectorStore.generateEmbedding(query);
      }

      this.cache.set(key, entry);
      this.metrics.cacheSize = this.cache.size;

      logger.debug(`Cached entry: ${key}`);
    } catch (error) {
      logger.error('Error setting cache:', error);
    }
  }

  /**
   * Find semantically similar cached entry
   */
  private async findSemanticMatch(query: string): Promise<CacheEntry | null> {
    try {
      const queryEmbedding = await this.vectorStore.generateEmbedding(query);
      let bestMatch: CacheEntry | null = null;
      let bestSimilarity = 0;

      for (const entry of this.cache.values()) {
        if (!entry.embedding || this.isExpired(entry)) {
          continue;
        }

        const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);
        if (
          similarity > bestSimilarity &&
          similarity >= (this.config.semanticThreshold || 0.9)
        ) {
          bestSimilarity = similarity;
          bestMatch = entry;
        }
      }

      return bestMatch;
    } catch (error) {
      logger.error('Error finding semantic match:', error);
      return null;
    }
  }

  /**
   * Calculate cosine similarity between embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const now = new Date().getTime();
    const entryTime = entry.timestamp.getTime();
    return now - entryTime > entry.ttl * 1000;
  }

  /**
   * Evict entries based on strategy
   */
  private async evict(): Promise<void> {
    try {
      let keyToEvict: string | null = null;

      if (this.config.strategy === 'lru') {
        // Least Recently Used
        let oldestTime = Date.now();
        for (const [key, entry] of this.cache.entries()) {
          if (entry.timestamp.getTime() < oldestTime) {
            oldestTime = entry.timestamp.getTime();
            keyToEvict = key;
          }
        }
      } else if (this.config.strategy === 'lfu') {
        // Least Frequently Used
        let lowestHits = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.hits < lowestHits) {
            lowestHits = entry.hits;
            keyToEvict = key;
          }
        }
      }

      if (keyToEvict) {
        this.cache.delete(keyToEvict);
        logger.debug(`Evicted cache entry: ${keyToEvict}`);
      }
    } catch (error) {
      logger.error('Error evicting cache:', error);
    }
  }

  /**
   * Record cache hit
   */
  private recordHit(costSaved: number): void {
    this.metrics.totalHits++;
    this.metrics.costSaved += costSaved;
    this.updateHitRate();
  }

  /**
   * Record cache miss
   */
  private recordMiss(): void {
    this.metrics.totalMisses++;
    this.updateHitRate();
  }

  /**
   * Update hit rate metrics
   */
  private updateHitRate(): void {
    const total = this.metrics.totalHits + this.metrics.totalMisses;
    if (total > 0) {
      this.metrics.hitRate = this.metrics.totalHits / total;
      this.metrics.missRate = this.metrics.totalMisses / total;
    }
  }

  /**
   * Get cache metrics
   */
  async getMetrics(): Promise<CacheMetrics> {
    return { ...this.metrics };
  }

  /**
   * Clear cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.metrics.cacheSize = 0;
    logger.info('Cache cleared');
  }

  /**
   * Clear expired entries
   */
  private async clearExpired(): Promise<void> {
    try {
      const keysToDelete: string[] = [];

      for (const [key, entry] of this.cache.entries()) {
        if (this.isExpired(entry)) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        this.cache.delete(key);
      }

      if (keysToDelete.length > 0) {
        this.metrics.cacheSize = this.cache.size;
        logger.debug(`Cleared ${keysToDelete.length} expired entries`);
      }
    } catch (error) {
      logger.error('Error clearing expired entries:', error);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.clearExpired();
    }, 60000); // Run every minute
  }

  /**
   * Get optimal TTL for service
   */
  async getOptimalTTL(service: string): Promise<number> {
    // Different services have different optimal TTLs
    const ttlMap: Record<string, number> = {
      'support-chatbot': 3600, // 1 hour
      'grading': 86400, // 24 hours
      'content-creation': 604800, // 7 days
      'research': 2592000, // 30 days
      'course-recommendation': 86400, // 24 hours
      'admissions': 604800, // 7 days
      'translation': 2592000, // 30 days
      'default': 3600 // 1 hour
    };

    return ttlMap[service] || ttlMap['default'];
  }

  /**
   * Warm cache with common queries
   */
  async warmCache(commonQueries: Array<{ key: string; value: any; cost: number }>): Promise<void> {
    try {
      for (const query of commonQueries) {
        await this.set(query.key, query.value, query.cost);
      }
      logger.info(`Warmed cache with ${commonQueries.length} entries`);
    } catch (error) {
      logger.error('Error warming cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStatistics(): Promise<{
    size: number;
    hitRate: number;
    missRate: number;
    costSaved: number;
    topEntries: Array<{ key: string; hits: number }>;
  }> {
    const entries = Array.from(this.cache.entries());
    const topEntries = entries
      .sort((a, b) => b[1].hits - a[1].hits)
      .slice(0, 10)
      .map(([key, entry]) => ({ key, hits: entry.hits }));

    return {
      size: this.cache.size,
      hitRate: this.metrics.hitRate,
      missRate: this.metrics.missRate,
      costSaved: this.metrics.costSaved,
      topEntries
    };
  }
}
