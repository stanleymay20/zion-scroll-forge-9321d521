/**
 * ScrollUniversity AI Types
 * "The Spirit of truth will guide you into all truth" - John 16:13
 */

export type AIProvider = 'openai' | 'anthropic';

export type AIModel = 
    | 'gpt-4-turbo'
    | 'gpt-4'
    | 'gpt-3.5-turbo'
    | 'claude-3-opus'
    | 'claude-3-sonnet'
    | 'claude-3-haiku';

export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    name?: string;
}

export interface AIRequestOptions {
    model: AIModel;
    messages: AIMessage[];
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
    stream?: boolean;
    user?: string;
}

export interface AIResponse {
    id: string;
    model: string;
    content: string;
    finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | null;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    cost: {
        inputCost: number;
        outputCost: number;
        totalCost: number;
    };
    metadata: {
        provider: AIProvider;
        timestamp: Date;
        latency: number;
        cached: boolean;
    };
}

export interface AIStreamChunk {
    id: string;
    model: string;
    delta: string;
    finishReason: 'stop' | 'length' | 'content_filter' | null;
}

export interface AIEmbeddingRequest {
    input: string | string[];
    model?: string;
    user?: string;
}

export interface AIEmbeddingResponse {
    embeddings: number[][];
    usage: {
        promptTokens: number;
        totalTokens: number;
    };
    cost: number;
    metadata: {
        provider: AIProvider;
        timestamp: Date;
        latency: number;
    };
}

export interface AIAuditLog {
    id: string;
    requestId: string;
    userId?: string;
    service: string;
    provider: AIProvider;
    model: string;
    input: string;
    output: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    cost: number;
    latency: number;
    cached: boolean;
    confidence?: number;
    humanReviewed?: boolean;
    reviewOutcome?: 'approved' | 'modified' | 'rejected';
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface AIBudgetUsage {
    period: 'daily' | 'monthly';
    startDate: Date;
    endDate: Date;
    totalCost: number;
    limit: number;
    percentUsed: number;
    requestCount: number;
    tokenCount: number;
    byService: Record<string, {
        cost: number;
        requests: number;
        tokens: number;
    }>;
    byModel: Record<string, {
        cost: number;
        requests: number;
        tokens: number;
    }>;
}

export interface AIRateLimitStatus {
    requestsPerMinute: {
        current: number;
        limit: number;
        remaining: number;
        resetAt: Date;
    };
    tokensPerMinute: {
        current: number;
        limit: number;
        remaining: number;
        resetAt: Date;
    };
    requestsPerDay: {
        current: number;
        limit: number;
        remaining: number;
        resetAt: Date;
    };
}

export interface AIQualityMetrics {
    service: string;
    accuracy: number;
    confidence: number;
    humanAgreement: number;
    theologicalAlignment: number;
    responseTime: number;
    costPerRequest: number;
    sampleSize: number;
    period: {
        start: Date;
        end: Date;
    };
}

export interface AIError extends Error {
    code: string;
    provider: AIProvider;
    model?: string;
    retryable: boolean;
    statusCode?: number;
    originalError?: any;
}

export interface AIServiceHealth {
    provider: AIProvider;
    status: 'healthy' | 'degraded' | 'down';
    latency: number;
    errorRate: number;
    lastCheck: Date;
    message?: string;
}

export interface TheologicalAlignment {
    score: number;
    concerns: string[];
    recommendations: string[];
    approved: boolean;
    reviewedBy?: string;
    reviewedAt?: Date;
}

export interface AIContentValidation {
    appropriate: boolean;
    theologicallySound: boolean;
    culturallySensitive: boolean;
    academicallyRigorous: boolean;
    issues: string[];
    confidence: number;
}
