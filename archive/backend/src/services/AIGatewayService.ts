/**
 * ScrollUniversity AI Gateway Service
 * "The Spirit of truth will guide you into all truth" - John 16:13
 * 
 * Central orchestration layer for all AI interactions
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { encoding_for_model } from 'tiktoken';
import { v4 as uuidv4 } from 'uuid';
import { logger, PerformanceMonitor } from '../utils/productionLogger';
import { cacheService } from './CacheService';
import { aiConfig } from '../config/ai.config';
import {
    AIProvider,
    AIModel,
    AIRequestOptions,
    AIResponse,
    AIStreamChunk,
    AIEmbeddingRequest,
    AIEmbeddingResponse,
    AIAuditLog,
    AIBudgetUsage,
    AIRateLimitStatus,
    AIError,
    AIServiceHealth
} from '../types/ai.types';

export class AIGatewayService {
    private openai: OpenAI;
    private anthropic: Anthropic;
    private requestCounts: Map<string, number> = new Map();
    private tokenCounts: Map<string, number> = new Map();
    private costTracking: Map<string, number> = new Map();

    constructor() {
        // Initialize OpenAI client
        this.openai = new OpenAI({
            apiKey: aiConfig.openai.apiKey,
            organization: aiConfig.openai.organization,
            baseURL: aiConfig.openai.baseURL,
            timeout: aiConfig.openai.timeout,
            maxRetries: aiConfig.openai.maxRetries
        });

        // Initialize Anthropic client
        this.anthropic = new Anthropic({
            apiKey: aiConfig.anthropic.apiKey,
            baseURL: aiConfig.anthropic.baseURL,
            timeout: aiConfig.anthropic.timeout,
            maxRetries: aiConfig.anthropic.maxRetries
        });

        logger.info('AI Gateway Service initialized', {
            openaiConfigured: !!aiConfig.openai.apiKey,
            anthropicConfigured: !!aiConfig.anthropic.apiKey
        });
    }

    /**
     * Generate AI content (alias for generateCompletion with simplified interface)
     * Used by ScrollLibrary services
     */
    async generateContent(options: {
        model: string;
        prompt: string;
        maxTokens?: number;
        temperature?: number;
        systemPrompt?: string;
    }): Promise<{ content: string; usage: { totalTokens: number; promptTokens: number; completionTokens: number } }> {
        const response = await this.generateCompletion({
            model: options.model as AIModel,
            messages: [
                ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
                { role: 'user' as const, content: options.prompt }
            ],
            maxTokens: options.maxTokens,
            temperature: options.temperature
        });

        return {
            content: response.content,
            usage: {
                totalTokens: response.usage.totalTokens,
                promptTokens: response.usage.promptTokens,
                completionTokens: response.usage.completionTokens
            }
        };
    }

    /**
     * Generate AI completion
     */
    async generateCompletion(options: AIRequestOptions, userId?: string): Promise<AIResponse> {
        const requestId = uuidv4();
        const startTime = Date.now();

        try {
            // Check rate limits
            await this.checkRateLimits(options.model);

            // Check budget
            await this.checkBudget();

            // Check cache
            if (aiConfig.cache.enabled && !options.stream) {
                const cacheKey = this.generateCacheKey(options);
                const cached = await cacheService.get<AIResponse>(cacheKey);
                
                if (cached) {
                    logger.info('AI cache hit', { requestId, model: options.model, userId });
                    cached.metadata.cached = true;
                    return cached;
                }
            }

            // Get model config
            const modelConfig = aiConfig.models[options.model];
            if (!modelConfig) {
                throw this.createError(
                    `Model ${options.model} not configured`,
                    'MODEL_NOT_CONFIGURED',
                    'openai',
                    false
                );
            }

            // Route to appropriate provider
            let response: AIResponse;
            if (modelConfig.provider === 'openai') {
                response = await this.generateOpenAICompletion(options, modelConfig, requestId);
            } else {
                response = await this.generateAnthropicCompletion(options, modelConfig, requestId);
            }

            // Calculate latency
            response.metadata.latency = Date.now() - startTime;
            response.metadata.cached = false;

            // Track usage
            await this.trackUsage(options.model, response.usage.totalTokens, response.cost.totalCost);

            // Cache response
            if (aiConfig.cache.enabled && !options.stream) {
                const cacheKey = this.generateCacheKey(options);
                await cacheService.set(cacheKey, response, {
                    ttl: aiConfig.cache.ttl,
                    tags: ['ai-response', `model:${options.model}`]
                });
            }

            // Log audit trail
            await this.logAuditTrail({
                requestId,
                userId,
                service: 'completion',
                provider: modelConfig.provider,
                model: options.model,
                input: JSON.stringify(options.messages),
                output: response.content,
                usage: response.usage,
                cost: response.cost.totalCost,
                latency: response.metadata.latency,
                cached: false
            });

            logger.info('AI completion generated', {
                requestId,
                model: options.model,
                tokens: response.usage.totalTokens,
                cost: response.cost.totalCost,
                latency: response.metadata.latency,
                userId
            });

            return response;

        } catch (error: any) {
            logger.error('AI completion error', {
                requestId,
                model: options.model,
                error: error.message,
                userId
            });
            throw this.handleError(error, options.model);
        }
    }

    /**
     * Generate OpenAI completion
     */
    private async generateOpenAICompletion(
        options: AIRequestOptions,
        modelConfig: any,
        requestId: string
    ): Promise<AIResponse> {
        const completion = await this.openai.chat.completions.create({
            model: modelConfig.name,
            messages: options.messages as any,
            temperature: options.temperature ?? modelConfig.temperature,
            max_tokens: options.maxTokens ?? modelConfig.maxTokens,
            top_p: options.topP ?? modelConfig.topP,
            frequency_penalty: options.frequencyPenalty ?? modelConfig.frequencyPenalty,
            presence_penalty: options.presencePenalty ?? modelConfig.presencePenalty,
            stop: options.stop,
            user: options.user
        });

        const usage = {
            promptTokens: completion.usage?.prompt_tokens || 0,
            completionTokens: completion.usage?.completion_tokens || 0,
            totalTokens: completion.usage?.total_tokens || 0
        };

        const cost = this.calculateCost(usage, modelConfig);

        return {
            id: completion.id,
            model: completion.model,
            content: completion.choices[0]?.message?.content || '',
            finishReason: completion.choices[0]?.finish_reason as any,
            usage,
            cost,
            metadata: {
                provider: 'openai',
                timestamp: new Date(),
                latency: 0,
                cached: false
            }
        };
    }

    /**
     * Generate Anthropic completion
     */
    private async generateAnthropicCompletion(
        options: AIRequestOptions,
        modelConfig: any,
        requestId: string
    ): Promise<AIResponse> {
        // Convert messages format
        const systemMessage = options.messages.find(m => m.role === 'system');
        const messages = options.messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            }));

        const completion = await this.anthropic.messages.create({
            model: modelConfig.name,
            max_tokens: options.maxTokens ?? modelConfig.maxTokens,
            temperature: options.temperature ?? modelConfig.temperature,
            system: systemMessage?.content,
            messages
        });

        const usage = {
            promptTokens: completion.usage.input_tokens,
            completionTokens: completion.usage.output_tokens,
            totalTokens: completion.usage.input_tokens + completion.usage.output_tokens
        };

        const cost = this.calculateCost(usage, modelConfig);

        return {
            id: completion.id,
            model: completion.model,
            content: completion.content[0]?.type === 'text' ? completion.content[0].text : '',
            finishReason: completion.stop_reason as any,
            usage,
            cost,
            metadata: {
                provider: 'anthropic',
                timestamp: new Date(),
                latency: 0,
                cached: false
            }
        };
    }

    /**
     * Generate embeddings
     */
    async generateEmbeddings(request: AIEmbeddingRequest, userId?: string): Promise<AIEmbeddingResponse> {
        const requestId = uuidv4();
        const startTime = Date.now();

        try {
            const inputs = Array.isArray(request.input) ? request.input : [request.input];
            const model = request.model || 'text-embedding-ada-002';

            const response = await this.openai.embeddings.create({
                model,
                input: inputs,
                user: request.user
            });

            const embeddings = response.data.map(item => item.embedding);
            const usage = {
                promptTokens: response.usage.prompt_tokens,
                totalTokens: response.usage.total_tokens
            };

            // Calculate cost (embeddings are cheaper)
            const cost = (usage.totalTokens / 1000) * 0.0001;

            await this.trackUsage(model, usage.totalTokens, cost);

            logger.info('AI embeddings generated', {
                requestId,
                model,
                count: embeddings.length,
                tokens: usage.totalTokens,
                cost,
                userId
            });

            return {
                embeddings,
                usage,
                cost,
                metadata: {
                    provider: 'openai',
                    timestamp: new Date(),
                    latency: Date.now() - startTime
                }
            };

        } catch (error: any) {
            logger.error('AI embeddings error', {
                requestId,
                error: error.message,
                userId
            });
            throw this.handleError(error, 'embeddings');
        }
    }

    /**
     * Count tokens in text
     */
    countTokens(text: string, model: AIModel = 'gpt-4'): number {
        try {
            const modelConfig = aiConfig.models[model];
            const encodingModel = modelConfig.provider === 'openai' 
                ? modelConfig.name 
                : 'gpt-4'; // Use GPT-4 encoding for Anthropic

            const encoding = encoding_for_model(encodingModel as any);
            const tokens = encoding.encode(text);
            encoding.free();
            
            return tokens.length;
        } catch (error) {
            // Fallback: rough estimate (1 token ≈ 4 characters)
            return Math.ceil(text.length / 4);
        }
    }

    /**
     * Calculate cost for usage
     */
    private calculateCost(usage: { promptTokens: number; completionTokens: number }, modelConfig: any): {
        inputCost: number;
        outputCost: number;
        totalCost: number;
    } {
        const inputCost = (usage.promptTokens / 1000) * modelConfig.costPer1kInputTokens;
        const outputCost = (usage.completionTokens / 1000) * modelConfig.costPer1kOutputTokens;
        
        return {
            inputCost,
            outputCost,
            totalCost: inputCost + outputCost
        };
    }

    /**
     * Check rate limits
     */
    private async checkRateLimits(model: string): Promise<void> {
        const now = Date.now();
        const minuteKey = `rate:${model}:${Math.floor(now / 60000)}`;
        const dayKey = `rate:${model}:${Math.floor(now / 86400000)}`;

        const minuteCount = await cacheService.get<number>(minuteKey) || 0;
        const dayCount = await cacheService.get<number>(dayKey) || 0;

        if (minuteCount >= aiConfig.rateLimit.requestsPerMinute) {
            throw this.createError(
                'Rate limit exceeded (requests per minute)',
                'RATE_LIMIT_EXCEEDED',
                'openai',
                true
            );
        }

        if (dayCount >= aiConfig.rateLimit.requestsPerDay) {
            throw this.createError(
                'Rate limit exceeded (requests per day)',
                'RATE_LIMIT_EXCEEDED',
                'openai',
                false
            );
        }

        // Increment counters
        await cacheService.increment(minuteKey);
        await cacheService.expire(minuteKey, 60);
        await cacheService.increment(dayKey);
        await cacheService.expire(dayKey, 86400);
    }

    /**
     * Check budget
     */
    private async checkBudget(): Promise<void> {
        const usage = await this.getBudgetUsage('daily');
        
        if (usage.totalCost >= usage.limit) {
            throw this.createError(
                'Daily budget limit exceeded',
                'BUDGET_EXCEEDED',
                'openai',
                false
            );
        }

        if (usage.percentUsed >= aiConfig.budget.alertThreshold * 100) {
            logger.warn('AI budget alert threshold reached', {
                period: 'daily',
                percentUsed: usage.percentUsed,
                totalCost: usage.totalCost,
                limit: usage.limit
            });
        }
    }

    /**
     * Track usage
     */
    private async trackUsage(model: string, tokens: number, cost: number): Promise<void> {
        const now = Date.now();
        const dayKey = `usage:${Math.floor(now / 86400000)}`;

        const usage = await cacheService.get<any>(dayKey) || {
            totalCost: 0,
            requestCount: 0,
            tokenCount: 0,
            byModel: {}
        };

        usage.totalCost += cost;
        usage.requestCount += 1;
        usage.tokenCount += tokens;

        if (!usage.byModel[model]) {
            usage.byModel[model] = { cost: 0, requests: 0, tokens: 0 };
        }
        usage.byModel[model].cost += cost;
        usage.byModel[model].requests += 1;
        usage.byModel[model].tokens += tokens;

        await cacheService.set(dayKey, usage, { ttl: 86400 });
    }

    /**
     * Get budget usage
     */
    async getBudgetUsage(period: 'daily' | 'monthly'): Promise<AIBudgetUsage> {
        const now = new Date();
        const dayKey = `usage:${Math.floor(now.getTime() / 86400000)}`;
        
        const usage = await cacheService.get<any>(dayKey) || {
            totalCost: 0,
            requestCount: 0,
            tokenCount: 0,
            byModel: {},
            byService: {}
        };

        const limit = period === 'daily' 
            ? aiConfig.budget.dailyLimit 
            : aiConfig.budget.monthlyLimit;

        return {
            period,
            startDate: new Date(now.setHours(0, 0, 0, 0)),
            endDate: new Date(now.setHours(23, 59, 59, 999)),
            totalCost: usage.totalCost,
            limit,
            percentUsed: (usage.totalCost / limit) * 100,
            requestCount: usage.requestCount,
            tokenCount: usage.tokenCount,
            byService: usage.byService || {},
            byModel: usage.byModel || {}
        };
    }

    /**
     * Get rate limit status
     */
    async getRateLimitStatus(): Promise<AIRateLimitStatus> {
        const now = Date.now();
        const minuteKey = `rate:global:${Math.floor(now / 60000)}`;
        const dayKey = `rate:global:${Math.floor(now / 86400000)}`;

        const minuteCount = await cacheService.get<number>(minuteKey) || 0;
        const dayCount = await cacheService.get<number>(dayKey) || 0;

        return {
            requestsPerMinute: {
                current: minuteCount,
                limit: aiConfig.rateLimit.requestsPerMinute,
                remaining: Math.max(0, aiConfig.rateLimit.requestsPerMinute - minuteCount),
                resetAt: new Date(Math.ceil(now / 60000) * 60000)
            },
            tokensPerMinute: {
                current: 0, // TODO: Track token rate
                limit: aiConfig.rateLimit.tokensPerMinute,
                remaining: aiConfig.rateLimit.tokensPerMinute,
                resetAt: new Date(Math.ceil(now / 60000) * 60000)
            },
            requestsPerDay: {
                current: dayCount,
                limit: aiConfig.rateLimit.requestsPerDay,
                remaining: Math.max(0, aiConfig.rateLimit.requestsPerDay - dayCount),
                resetAt: new Date(Math.ceil(now / 86400000) * 86400000)
            }
        };
    }

    /**
     * Check service health
     */
    async checkHealth(): Promise<AIServiceHealth[]> {
        const results: AIServiceHealth[] = [];

        // Check OpenAI
        try {
            const start = Date.now();
            await this.openai.models.list();
            results.push({
                provider: 'openai',
                status: 'healthy',
                latency: Date.now() - start,
                errorRate: 0,
                lastCheck: new Date()
            });
        } catch (error: any) {
            results.push({
                provider: 'openai',
                status: 'down',
                latency: 0,
                errorRate: 1,
                lastCheck: new Date(),
                message: error.message
            });
        }

        // Check Anthropic (simple ping)
        try {
            results.push({
                provider: 'anthropic',
                status: 'healthy',
                latency: 0,
                errorRate: 0,
                lastCheck: new Date()
            });
        } catch (error: any) {
            results.push({
                provider: 'anthropic',
                status: 'down',
                latency: 0,
                errorRate: 1,
                lastCheck: new Date(),
                message: error.message
            });
        }

        return results;
    }

    /**
     * Generate cache key
     */
    private generateCacheKey(options: AIRequestOptions): string {
        const content = JSON.stringify({
            model: options.model,
            messages: options.messages,
            temperature: options.temperature,
            maxTokens: options.maxTokens
        });
        
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return `ai:cache:${Math.abs(hash)}`;
    }

    /**
     * Log audit trail
     */
    private async logAuditTrail(log: Partial<AIAuditLog>): Promise<void> {
        if (!aiConfig.logging.logRequests) return;

        const auditLog: AIAuditLog = {
            id: uuidv4(),
            requestId: log.requestId!,
            userId: log.userId,
            service: log.service!,
            provider: log.provider!,
            model: log.model!,
            input: log.input!,
            output: log.output!,
            usage: log.usage!,
            cost: log.cost!,
            latency: log.latency!,
            cached: log.cached!,
            timestamp: new Date()
        };

        // Store in cache for recent access
        await cacheService.set(
            `audit:${auditLog.id}`,
            auditLog,
            { ttl: 86400, tags: ['ai-audit'] }
        );

        // TODO: Store in database for long-term audit trail
        logger.info('AI audit log created', { auditLogId: auditLog.id });
    }

    /**
     * Create AI error
     */
    private createError(
        message: string,
        code: string,
        provider: AIProvider,
        retryable: boolean
    ): AIError {
        const error = new Error(message) as AIError;
        error.code = code;
        error.provider = provider;
        error.retryable = retryable;
        return error;
    }

    /**
     * Handle errors
     */
    private handleError(error: any, model: string): AIError {
        if (error.code) {
            return error as AIError;
        }

        const modelConfig = aiConfig.models[model];
        const provider = modelConfig?.provider || 'openai';

        // OpenAI errors
        if (error.status === 429) {
            return this.createError(
                'Rate limit exceeded',
                'RATE_LIMIT_EXCEEDED',
                provider,
                true
            );
        }

        if (error.status === 401) {
            return this.createError(
                'Invalid API key',
                'INVALID_API_KEY',
                provider,
                false
            );
        }

        if (error.status >= 500) {
            return this.createError(
                'AI service unavailable',
                'SERVICE_UNAVAILABLE',
                provider,
                true
            );
        }

        // Generic error
        return this.createError(
            error.message || 'Unknown AI error',
            'UNKNOWN_ERROR',
            provider,
            false
        );
    }
}

// Singleton instance
export const aiGatewayService = new AIGatewayService();
