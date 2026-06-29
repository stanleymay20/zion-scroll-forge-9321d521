/**
 * ScrollUniversity Production Cache Service
 * "Store up treasures in heaven" - Matthew 6:20
 */

import Redis from 'ioredis';
import { logger, PerformanceMonitor } from '../utils/productionLogger';

export interface CacheOptions {
    ttl?: number; // Time to live in seconds
    compress?: boolean;
    tags?: string[];
}

// Helper function to safely extract error message
function getErrorMessage(error: unknown): string {
    return error instanceof Error ? getErrorMessage(error) : String(error);
}

export class CacheService {
    private redis: Redis;
    private defaultTTL: number = 3600; // 1 hour

    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0'),
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            keepAlive: 30000,
            family: 4,
            retryStrategy: (times: number) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });

        this.redis.on('connect', () => {
            logger.info('Redis connected successfully');
        });

        this.redis.on('error', (error) => {
            logger.error('Redis connection error', { error: getErrorMessage(error) });
        });

        this.redis.on('close', () => {
            logger.warn('Redis connection closed');
        });
    }

    /**
     * Get value from cache
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const result = await PerformanceMonitor.measure(
                `cache_get_${key}`,
                async () => {
                    const value = await this.redis.get(this.formatKey(key));
                    return value ? JSON.parse(value) : null;
                }
            );

            if (result) {
                logger.debug('Cache hit', { key });
            } else {
                logger.debug('Cache miss', { key });
            }

            return result;
        } catch (error) {
            logger.error('Cache get error', { key, error: getErrorMessage(error) });
            return null;
        }
    }

    /**
     * Set value in cache
     */
    async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
        try {
            const ttl = options.ttl || this.defaultTTL;
            const serializedValue = JSON.stringify(value);

            await PerformanceMonitor.measure(
                `cache_set_${key}`,
                async () => {
                    await this.redis.setex(this.formatKey(key), ttl, serializedValue);

                    // Store tags for cache invalidation
                    if (options.tags && options.tags.length > 0) {
                        await this.addToTags(key, options.tags);
                    }
                }
            );

            logger.debug('Cache set', { key, ttl, tags: options.tags });
            return true;
        } catch (error) {
            logger.error('Cache set error', { key, error: getErrorMessage(error) });
            return false;
        }
    }

    /**
     * Delete value from cache
     */
    async delete(key: string): Promise<boolean> {
        try {
            const result = await this.redis.del(this.formatKey(key));
            logger.debug('Cache delete', { key, deleted: result > 0 });
            return result > 0;
        } catch (error) {
            logger.error('Cache delete error', { key, error: getErrorMessage(error) });
            return false;
        }
    }

    /**
     * Check if key exists in cache
     */
    async exists(key: string): Promise<boolean> {
        try {
            const result = await this.redis.exists(this.formatKey(key));
            return result === 1;
        } catch (error) {
            logger.error('Cache exists error', { key, error: getErrorMessage(error) });
            return false;
        }
    }

    /**
     * Get or set pattern - get from cache or execute function and cache result
     */
    async getOrSet<T>(
        key: string,
        fn: () => Promise<T>,
        options: CacheOptions = {}
    ): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        const result = await fn();
        await this.set(key, result, options);
        return result;
    }

    /**
     * Increment counter in cache
     */
    async increment(key: string, amount: number = 1): Promise<number> {
        try {
            const result = await this.redis.incrby(this.formatKey(key), amount);
            logger.debug('Cache increment', { key, amount, result });
            return result;
        } catch (error) {
            logger.error('Cache increment error', { key, error: getErrorMessage(error) });
            return 0;
        }
    }

    /**
     * Set expiration for existing key
     */
    async expire(key: string, ttl: number): Promise<boolean> {
        try {
            const result = await this.redis.expire(this.formatKey(key), ttl);
            return result === 1;
        } catch (error) {
            logger.error('Cache expire error', { key, error: getErrorMessage(error) });
            return false;
        }
    }

    /**
     * Get multiple keys at once
     */
    async mget<T>(keys: string[]): Promise<(T | null)[]> {
        try {
            const formattedKeys = keys.map(key => this.formatKey(key));
            const values = await this.redis.mget(...formattedKeys);

            return values.map(value => value ? JSON.parse(value) : null);
        } catch (error) {
            logger.error('Cache mget error', { keys, error: getErrorMessage(error) });
            return keys.map(() => null);
        }
    }

    /**
     * Set multiple keys at once
     */
    async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<boolean> {
        try {
            const pipeline = this.redis.pipeline();

            Object.entries(keyValuePairs).forEach(([key, value]) => {
                const formattedKey = this.formatKey(key);
                const serializedValue = JSON.stringify(value);

                if (ttl) {
                    pipeline.setex(formattedKey, ttl, serializedValue);
                } else {
                    pipeline.set(formattedKey, serializedValue);
                }
            });

            await pipeline.exec();
            logger.debug('Cache mset', { count: Object.keys(keyValuePairs).length, ttl });
            return true;
        } catch (error) {
            logger.error('Cache mset error', { error: getErrorMessage(error) });
            return false;
        }
    }

    /**
     * Invalidate cache by tags
     */
    async invalidateByTags(tags: string[]): Promise<number> {
        try {
            let deletedCount = 0;

            for (const tag of tags) {
                const tagKey = this.formatTagKey(tag);
                const keys = await this.redis.smembers(tagKey);

                if (keys.length > 0) {
                    const formattedKeys = keys.map(key => this.formatKey(key));
                    const deleted = await this.redis.del(...formattedKeys);
                    deletedCount += deleted;

                    // Remove the tag set
                    await this.redis.del(tagKey);
                }
            }

            logger.info('Cache invalidated by tags', { tags, deletedCount });
            return deletedCount;
        } catch (error) {
            logger.error('Cache invalidate by tags error', { tags, error: getErrorMessage(error) });
            return 0;
        }
    }

    /**
     * Clear all cache
     */
    async clear(): Promise<boolean> {
        try {
            await this.redis.flushdb();
            logger.info('Cache cleared');
            return true;
        } catch (error) {
            logger.error('Cache clear error', { error: getErrorMessage(error) });
            return false;
        }
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<any> {
        try {
            const info = await this.redis.info('memory');
            const keyspace = await this.redis.info('keyspace');

            return {
                memory: this.parseRedisInfo(info),
                keyspace: this.parseRedisInfo(keyspace),
                connected: this.redis.status === 'ready'
            };
        } catch (error) {
            logger.error('Cache stats error', { error: getErrorMessage(error) });
            return null;
        }
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<boolean> {
        try {
            const result = await this.redis.ping();
            return result === 'PONG';
        } catch (error) {
            logger.error('Cache health check failed', { error: getErrorMessage(error) });
            return false;
        }
    }

    /**
     * Close connection
     */
    async close(): Promise<void> {
        await this.redis.quit();
        logger.info('Cache connection closed');
    }

    /**
     * Format cache key with prefix
     */
    private formatKey(key: string): string {
        const prefix = process.env.CACHE_PREFIX || 'scroll_university';
        return `${prefix}:${key}`;
    }

    /**
     * Format tag key
     */
    private formatTagKey(tag: string): string {
        return this.formatKey(`tag:${tag}`);
    }

    /**
     * Add key to tags for invalidation
     */
    private async addToTags(key: string, tags: string[]): Promise<void> {
        const pipeline = this.redis.pipeline();

        tags.forEach(tag => {
            const tagKey = this.formatTagKey(tag);
            pipeline.sadd(tagKey, key);
            pipeline.expire(tagKey, 86400); // Expire tag sets after 24 hours
        });

        await pipeline.exec();
    }

    /**
     * Parse Redis info string
     */
    private parseRedisInfo(info: string): Record<string, any> {
        const result: Record<string, any> = {};

        info.split('\r\n').forEach(line => {
            if (line && !line.startsWith('#')) {
                const [key, value] = line.split(':');
                if (key && value) {
                    result[key] = isNaN(Number(value)) ? value : Number(value);
                }
            }
        });

        return result;
    }
}

// Singleton instance
export const cacheService = new CacheService();

// Cache decorators
export function Cacheable(key: string | ((...args: any[]) => string), options: CacheOptions = {}) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const cacheKey = typeof key === 'function' ? key(...args) : key;

            return await cacheService.getOrSet(
                cacheKey,
                () => method.apply(this, args),
                options
            );
        };
    };
}

export function CacheEvict(tags: string[]) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const result = await method.apply(this, args);
            await cacheService.invalidateByTags(tags);
            return result;
        };
    };
}

