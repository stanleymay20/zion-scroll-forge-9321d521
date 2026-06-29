/**
 * ScrollUniversity AI Configuration
 * "The Spirit of truth will guide you into all truth" - John 16:13
 */

export interface AIModelConfig {
    name: string;
    provider: 'openai' | 'anthropic';
    maxTokens: number;
    temperature: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    costPer1kInputTokens: number;
    costPer1kOutputTokens: number;
}

export interface AIServiceConfig {
    openai: {
        apiKey: string;
        organization?: string;
        baseURL?: string;
        timeout: number;
        maxRetries: number;
    };
    anthropic: {
        apiKey: string;
        baseURL?: string;
        timeout: number;
        maxRetries: number;
    };
    models: {
        [key: string]: AIModelConfig;
    };
    rateLimit: {
        requestsPerMinute: number;
        tokensPerMinute: number;
        requestsPerDay: number;
    };
    budget: {
        dailyLimit: number;
        monthlyLimit: number;
        alertThreshold: number;
    };
    cache: {
        enabled: boolean;
        ttl: number;
        semanticCacheThreshold: number;
    };
    retry: {
        maxAttempts: number;
        initialDelay: number;
        maxDelay: number;
        backoffMultiplier: number;
    };
    logging: {
        logRequests: boolean;
        logResponses: boolean;
        logTokenUsage: boolean;
        logCosts: boolean;
    };
}

export const aiConfig: AIServiceConfig = {
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        organization: process.env.OPENAI_ORGANIZATION,
        baseURL: process.env.OPENAI_BASE_URL,
        timeout: parseInt(process.env.OPENAI_TIMEOUT || '60000'),
        maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3')
    },
    anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        baseURL: process.env.ANTHROPIC_BASE_URL,
        timeout: parseInt(process.env.ANTHROPIC_TIMEOUT || '60000'),
        maxRetries: parseInt(process.env.ANTHROPIC_MAX_RETRIES || '3')
    },
    models: {
        'gpt-4-turbo': {
            name: 'gpt-4-turbo-preview',
            provider: 'openai',
            maxTokens: 128000,
            temperature: 0.7,
            topP: 1.0,
            frequencyPenalty: 0.0,
            presencePenalty: 0.0,
            costPer1kInputTokens: 0.01,
            costPer1kOutputTokens: 0.03
        },
        'gpt-4': {
            name: 'gpt-4',
            provider: 'openai',
            maxTokens: 8192,
            temperature: 0.7,
            topP: 1.0,
            frequencyPenalty: 0.0,
            presencePenalty: 0.0,
            costPer1kInputTokens: 0.03,
            costPer1kOutputTokens: 0.06
        },
        'gpt-3.5-turbo': {
            name: 'gpt-3.5-turbo',
            provider: 'openai',
            maxTokens: 16385,
            temperature: 0.7,
            topP: 1.0,
            frequencyPenalty: 0.0,
            presencePenalty: 0.0,
            costPer1kInputTokens: 0.0005,
            costPer1kOutputTokens: 0.0015
        },
        'claude-3-opus': {
            name: 'claude-3-opus-20240229',
            provider: 'anthropic',
            maxTokens: 200000,
            temperature: 0.7,
            costPer1kInputTokens: 0.015,
            costPer1kOutputTokens: 0.075
        },
        'claude-3-sonnet': {
            name: 'claude-3-sonnet-20240229',
            provider: 'anthropic',
            maxTokens: 200000,
            temperature: 0.7,
            costPer1kInputTokens: 0.003,
            costPer1kOutputTokens: 0.015
        },
        'claude-3-haiku': {
            name: 'claude-3-haiku-20240307',
            provider: 'anthropic',
            maxTokens: 200000,
            temperature: 0.7,
            costPer1kInputTokens: 0.00025,
            costPer1kOutputTokens: 0.00125
        }
    },
    rateLimit: {
        requestsPerMinute: parseInt(process.env.AI_RATE_LIMIT_RPM || '60'),
        tokensPerMinute: parseInt(process.env.AI_RATE_LIMIT_TPM || '90000'),
        requestsPerDay: parseInt(process.env.AI_RATE_LIMIT_RPD || '10000')
    },
    budget: {
        dailyLimit: parseFloat(process.env.AI_DAILY_BUDGET || '300'),
        monthlyLimit: parseFloat(process.env.AI_MONTHLY_BUDGET || '8000'),
        alertThreshold: parseFloat(process.env.AI_BUDGET_ALERT_THRESHOLD || '0.8')
    },
    cache: {
        enabled: process.env.AI_CACHE_ENABLED !== 'false',
        ttl: parseInt(process.env.AI_CACHE_TTL || '3600'),
        semanticCacheThreshold: parseFloat(process.env.AI_SEMANTIC_CACHE_THRESHOLD || '0.95')
    },
    retry: {
        maxAttempts: parseInt(process.env.AI_RETRY_MAX_ATTEMPTS || '3'),
        initialDelay: parseInt(process.env.AI_RETRY_INITIAL_DELAY || '1000'),
        maxDelay: parseInt(process.env.AI_RETRY_MAX_DELAY || '10000'),
        backoffMultiplier: parseFloat(process.env.AI_RETRY_BACKOFF_MULTIPLIER || '2')
    },
    logging: {
        logRequests: process.env.AI_LOG_REQUESTS !== 'false',
        logResponses: process.env.AI_LOG_RESPONSES !== 'false',
        logTokenUsage: process.env.AI_LOG_TOKEN_USAGE !== 'false',
        logCosts: process.env.AI_LOG_COSTS !== 'false'
    }
};

export default aiConfig;
