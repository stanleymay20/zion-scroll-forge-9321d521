import { ScrollLibraryConfig } from '../types/scroll-library.types';

/**
 * ScrollLibrary Configuration Management
 * Centralized configuration for all ScrollLibrary services
 */

export const scrollLibraryConfig: ScrollLibraryConfig = {
  aiServices: {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    claudeApiKey: process.env.CLAUDE_API_KEY || '',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000'),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7')
  },
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/scrolluniversity',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20')
  },
  
  storage: {
    cdnUrl: process.env.CDN_URL || 'https://cdn.scrolluniversity.org',
    bucketName: process.env.STORAGE_BUCKET || 'scroll-library-content'
  },
  
  search: {
    vectorDatabaseUrl: process.env.VECTOR_DB_URL || 'http://localhost:6333',
    knowledgeGraphUrl: process.env.NEO4J_URL || 'bolt://localhost:7687'
  },
  
  features: {
    propheticSearchEnabled: process.env.PROPHETIC_SEARCH_ENABLED === 'true',
    offlineAccessEnabled: process.env.OFFLINE_ACCESS_ENABLED !== 'false',
    audioNarrationEnabled: process.env.AUDIO_NARRATION_ENABLED !== 'false'
  }
};

/**
 * Validates configuration and throws error if required values are missing
 */
export function validateScrollLibraryConfig(): void {
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'DATABASE_URL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

/**
 * Agent-specific configurations
 */
export const agentConfigs = {
  scrollAuthorGPT: {
    model: 'gpt-4',
    maxTokens: 4000,
    temperature: 0.7,
    systemPromptVersion: '1.0'
  },
  
  scrollProfessorGPT: {
    model: 'gpt-4',
    maxTokens: 3000,
    temperature: 0.6,
    systemPromptVersion: '1.0'
  },
  
  scrollScribeGPT: {
    model: 'gpt-4',
    maxTokens: 2000,
    temperature: 0.5,
    systemPromptVersion: '1.0'
  },
  
  scrollResearcherGPT: {
    model: 'gpt-4',
    maxTokens: 3000,
    temperature: 0.4,
    systemPromptVersion: '1.0'
  },
  
  scrollIntegritySeal: {
    model: 'claude-3-opus',
    maxTokens: 2000,
    temperature: 0.3,
    systemPromptVersion: '1.0'
  }
};

/**
 * Content generation settings
 */
export const contentSettings = {
  textbook: {
    minChapters: 8,
    maxChapters: 20,
    wordsPerChapter: 3000,
    readingTimeTarget: 15 // minutes per chapter
  },
  
  studyPack: {
    summaryLength: 500, // words
    practiceQuestionsCount: 10,
    flashcardsCount: 20,
    quizzesCount: 3
  },
  
  qualityThresholds: {
    minQualityScore: 0.8,
    minTheologicalAlignment: 0.9,
    maxValidationRetries: 3
  }
};

/**
 * Search and indexing settings
 */
export const searchSettings = {
  embedding: {
    model: 'text-embedding-ada-002',
    dimensions: 1536,
    batchSize: 100
  },
  
  search: {
    maxResults: 50,
    semanticWeight: 0.7,
    propheticWeight: 0.3,
    minRelevanceScore: 0.5
  },
  
  knowledgeGraph: {
    maxRelationships: 10,
    minRelationshipStrength: 0.3,
    conceptExtractionThreshold: 0.6
  }
};

/**
 * Export format settings
 */
export const exportSettings = {
  pdf: {
    pageSize: 'A4',
    fontSize: 12,
    lineHeight: 1.5,
    margins: { top: 72, bottom: 72, left: 72, right: 72 }
  },
  
  epub: {
    version: '3.0',
    includeImages: true,
    includeDiagrams: true,
    compression: 'deflate'
  },
  
  html: {
    responsive: true,
    includeCSS: true,
    includeJS: true,
    optimizeImages: true
  }
};

/**
 * Performance and caching settings
 */
export const performanceSettings = {
  cache: {
    embeddings: {
      ttl: 7 * 24 * 60 * 60, // 7 days in seconds
      maxSize: 10000
    },
    searchResults: {
      ttl: 60 * 60, // 1 hour in seconds
      maxSize: 1000
    },
    exports: {
      ttl: 24 * 60 * 60, // 24 hours in seconds
      maxSize: 100
    }
  },
  
  rateLimit: {
    generation: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10
    },
    search: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100
    },
    export: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 5
    }
  }
};

/**
 * Monitoring and logging settings
 */
export const monitoringSettings = {
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    includeTimestamp: true,
    includeMetadata: true
  },
  
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    endpoint: process.env.METRICS_ENDPOINT || '/metrics',
    collectInterval: 30000 // 30 seconds
  },
  
  alerts: {
    enabled: process.env.ALERTS_ENABLED !== 'false',
    webhookUrl: process.env.ALERT_WEBHOOK_URL || '',
    thresholds: {
      errorRate: 0.05, // 5%
      responseTime: 5000, // 5 seconds
      queueDepth: 100
    }
  }
};

export default scrollLibraryConfig;