/**
 * ScrollUniversity AI Cache Service
 * "Store up treasures in heaven" - Matthew 6:20
 * 
 * Specialized caching for AI responses with semantic similarity
 */

import { cacheService } from './CacheService';
import { aiGatewayService } from './AIGatewayService';
import { logger } from '../utils/productionLogger';
import { AIRequestOptions, AIResponse } from '../types/ai.types';
import { aiConfig } from '../config/ai.config';

export interface SemanticCacheEntry {
    key: string;
    query: string;
    embedding: number[];
    response: AIResponse;
    timestamp: Date;
    hitCount: number;
}

export class AICacheService {
    private semanticCachePrefix = 'ai:semantic:';
    private responseCachePrefix = 'ai:response:';
    private embeddingCachePrefix = 'ai:embedding:';

    /**
     * Get cached AI response with exact match
     */
    async getCachedResponse(options: AIRequestOptions): Promise<AIResponse | null> {
        if (!aiConfig.cache.enabled) {
            return null;
        }

        try {
            const cacheKey = this.generateCacheKey(options);
            const cached = await cacheService.get<AIResponse>(
                `${this.responseCachePrefix}${cacheKey}`
            );

            if (cached) {
                logger.debug('AI response cache hit (exact)', {
                    model: options.model,
                    cacheKey
                });
                return cached;
            }

            return null;
        } catch (error: any) {
            logger.error('Failed to get cached AI response', {
                error: error.message
            });
            return null;
        }
    }

    /**
     * Cache AI response
     */
    async cacheResponse(options: AIRequestOptions, response: AIResponse): Promise<void> {
        if (!aiConfig.cache.enabled) {
            return;
        }

        try {
            const cacheKey = this.generateCacheKey(options);
            await cacheService.set(
                `${this.responseCachePrefix}${cacheKey}`,
                response,
                {
                    ttl: aiConfig.cache.ttl,
                    tags: ['ai-response', `model:${options.model}`]
                }
            );

            logger.debug('AI response cached', {
                model: options.model,
                cacheKey,
                ttl: aiConfig.cache.ttl
            });
        } catch (error: any) {
            logger.error('Failed to cache AI response', {
                error: error.message
            });
        }
    }

    /**
     * Get semantically similar cached response
     */
    async getSemanticallySimilarResponse(
        query: string,
        model: string
    ): Promise<AIResponse | null> {
        if (!aiConfig.cache.enabled) {
            return null;
        }

        try {
            // Generate embedding for query
            const embeddingResponse = await aiGatewayService.generateEmbeddings({
                input: query
            });
            const queryEmbedding = embeddingResponse.embeddings[0];

            // Get all semantic cache entries for this model
            const pattern = `${this.semanticCachePrefix}${model}:*`;
            const entries = await this.getSemanticCacheEntries(pattern);

            // Find most similar entry
            let bestMatch: SemanticCacheEntry | null = null;
            let bestSimilarity = 0;

            for (const entry of entries) {
                const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);
                
                if (similarity > bestSimilarity && similarity >= aiConfig.cache.semanticCacheThreshold) {
                    bestSimilarity = similarity;
                    bestMatch = entry;
                }
            }

            if (bestMatch) {
                // Increment hit count
                await this.incrementCacheHitCount(bestMatch.key);

                logger.info('AI semantic cache hit', {
                    model,
                    similarity: bestSimilarity,
                    originalQuery: bestMatch.query.substring(0, 50),
                    newQuery: query.substring(0, 50)
                });

                return bestMatch.response;
            }

            return null;
        } catch (error: any) {
            logger.error('Failed to get semantically similar response', {
                error: error.message
            });
            return null;
        }
    }

    /**
     * Cache response with semantic indexing
     */
    async cacheSemanticResponse(
        query: string,
        model: string,
        response: AIResponse
    ): Promise<void> {
        if (!aiConfig.cache.enabled) {
            return;
        }

        try {
            // Generate embedding for query
            const embeddingResponse = await aiGatewayService.generateEmbeddings({
                input: query
            });
            const queryEmbedding = embeddingResponse.embeddings[0];

            // Create cache entry
            const cacheKey = `${this.semanticCachePrefix}${model}:${this.hashString(query)}`;
            const entry: SemanticCacheEntry = {
                key: cacheKey,
                query,
                embedding: queryEmbedding,
                response,
                timestamp: new Date(),
                hitCount: 0
            };

            await cacheService.set(cacheKey, entry, {
                ttl: aiConfig.cache.ttl * 2, // Longer TTL for semantic cache
                tags: ['ai-semantic', `model:${model}`]
            });

            logger.debug('AI semantic response cached', {
                model,
                query: query.substring(0, 50),
                cacheKey
            });
        } catch (error: any) {
            logger.error('Failed to cache semantic response', {
                error: error.message
            });
        }
    }

    /**
     * Get cached embeddings
     */
    async getCachedEmbedding(text: string): Promise<number[] | null> {
        if (!aiConfig.cache.enabled) {
            return null;
        }

        try {
            const cacheKey = `${this.embeddingCachePrefix}${this.hashString(text)}`;
            const cached = await cacheService.get<number[]>(cacheKey);

            if (cached) {
                logger.debug('Embedding cache hit', {
                    textLength: text.length
                });
                return cached;
            }

            return null;
        } catch (error: any) {
            logger.error('Failed to get cached embedding', {
                error: error.message
            });
            return null;
        }
    }

    /**
     * Cache embeddings
     */
    async cacheEmbedding(text: string, embedding: number[]): Promise<void> {
        if (!aiConfig.cache.enabled) {
            return;
        }

        try {
            const cacheKey = `${this.embeddingCachePrefix}${this.hashString(text)}`;
            await cacheService.set(cacheKey, embedding, {
                ttl: aiConfig.cache.ttl * 3, // Longer TTL for embeddings
                tags: ['ai-embedding']
            });

            logger.debug('Embedding cached', {
                textLength: text.length,
                cacheKey
            });
        } catch (error: any) {
            logger.error('Failed to cache embedding', {
                error: error.message
            });
        }
    }

    /**
     * Invalidate cache by model
     */
    async invalidateByModel(model: string): Promise<number> {
        try {
            const deletedCount = await cacheService.invalidateByTags([`model:${model}`]);
            
            logger.info('AI cache invalidated by model', {
                model,
                deletedCount
            });

            return deletedCount;
        } catch (error: any) {
            logger.error('Failed to invalidate cache by model', {
                error: error.message,
                model
            });
            return 0;
        }
    }

    /**
     * Invalidate all AI cache
     */
    async invalidateAll(): Promise<number> {
        try {
            const deletedCount = await cacheService.invalidateByTags([
                'ai-response',
                'ai-semantic',
                'ai-embedding'
            ]);

            logger.info('All AI cache invalidated', { deletedCount });
            return deletedCount;
        } catch (error: any) {
            logger.error('Failed to invalidate all AI cache', {
                error: error.message
            });
            return 0;
        }
    }

    /**
     * Get cache statistics
     */
    async getCacheStats(): Promise<any> {
        try {
            const stats = await cacheService.getStats();
            
            // TODO: Add AI-specific stats like hit rates, semantic matches, etc.
            
            return {
                ...stats,
                aiSpecific: {
                    responseCache: 'enabled',
                    semanticCache: 'enabled',
                    embeddingCache: 'enabled'
                }
            };
        } catch (error: any) {
            logger.error('Failed to get cache stats', {
                error: error.message
            });
            return null;
        }
    }

    /**
     * Generate cache key from request options
     */
    private generateCacheKey(options: AIRequestOptions): string {
        const content = JSON.stringify({
            model: options.model,
            messages: options.messages,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            topP: options.topP,
            frequencyPenalty: options.frequencyPenalty,
            presencePenalty: options.presencePenalty
        });

        return this.hashString(content);
    }

    /**
     * Hash string to generate cache key
     */
    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error('Vectors must have same length');
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
     * Get semantic cache entries by pattern
     */
    private async getSemanticCacheEntries(pattern: string): Promise<SemanticCacheEntry[]> {
        // This is a simplified implementation
        // In production, you'd want to use Redis SCAN or maintain an index
        // For now, we'll return empty array as this requires Redis key scanning
        return [];
    }

    /**
     * Increment cache hit count
     */
    private async incrementCacheHitCount(key: string): Promise<void> {
        try {
            const entry = await cacheService.get<SemanticCacheEntry>(key);
            if (entry) {
                entry.hitCount += 1;
                await cacheService.set(key, entry, {
                    ttl: aiConfig.cache.ttl * 2,
                    tags: ['ai-semantic']
                });
            }
        } catch (error: any) {
            logger.error('Failed to increment cache hit count', {
                error: error.message,
                key
            });
        }
    }
}

// Singleton instance
export const aiCacheService = new AICacheService();
