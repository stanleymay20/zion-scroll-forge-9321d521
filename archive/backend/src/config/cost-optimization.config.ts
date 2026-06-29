/**
 * Cost Optimization Configuration
 * Central configuration for all cost optimization features
 */

import {
  PromptOptimizationConfig,
  CacheConfig,
  BudgetConfig
} from '../types/cost-optimization.types';

export const promptOptimizationConfig: PromptOptimizationConfig = {
  maxTokens: 4000,
  temperature: 0.7,
  compressionEnabled: true,
  useSystemPrompts: true,
  removeRedundancy: true
};

export const cacheConfig: CacheConfig = {
  enabled: true,
  ttl: 3600, // 1 hour default
  maxSize: 10000, // Maximum cache entries
  strategy: 'semantic', // 'lru' | 'lfu' | 'semantic'
  semanticThreshold: 0.9 // 90% similarity for semantic cache hits
};

export const budgetConfig: BudgetConfig = {
  dailyLimit: 320, // $320 per day (~$9,600/month)
  monthlyLimit: 9600, // $9,600 per month (~$115,200/year, with buffer)
  perServiceLimits: {
    'support-chatbot': 500, // $500/month
    'grading': 2500, // $2,500/month
    'content-creation': 1500, // $1,500/month
    'personalization': 800, // $800/month
    'integrity': 600, // $600/month
    'admissions': 800, // $800/month
    'research': 600, // $600/month
    'course-recommendation': 400, // $400/month
    'faculty-support': 500, // $500/month
    'translation': 600, // $600/month
    'spiritual-formation': 300, // $300/month
    'fundraising': 200, // $200/month
    'career-services': 400, // $400/month
    'moderation': 300, // $300/month
    'accessibility': 300 // $300/month
  },
  alertThresholds: [80, 90, 95], // Alert at 80%, 90%, 95% of budget
  throttleThreshold: 95, // Throttle at 95% of budget
  emergencyThreshold: 100 // Emergency alert at 100% of budget
};

export const batchProcessingConfig = {
  batchSize: 10, // Process 10 requests at a time
  batchTimeout: 5000, // Wait 5 seconds before processing batch
  maxQueueSize: 1000, // Maximum queue size
  priorityWeights: {
    high: 3,
    medium: 2,
    low: 1
  }
};

export const modelSelectionConfig = {
  // Model selection based on task complexity and cost
  models: {
    simple: {
      name: 'gpt-3.5-turbo',
      costPer1kTokens: 0.002,
      maxTokens: 4096,
      useCases: ['simple-qa', 'basic-grading', 'simple-translation']
    },
    standard: {
      name: 'gpt-4',
      costPer1kTokens: 0.03,
      maxTokens: 8192,
      useCases: ['content-creation', 'essay-grading', 'research-assistance']
    },
    advanced: {
      name: 'gpt-4-turbo',
      costPer1kTokens: 0.01,
      maxTokens: 128000,
      useCases: ['complex-content', 'comprehensive-analysis', 'large-documents']
    },
    specialized: {
      name: 'claude-3-opus',
      costPer1kTokens: 0.015,
      maxTokens: 200000,
      useCases: ['theological-analysis', 'spiritual-formation', 'deep-reasoning']
    }
  },
  selectionRules: {
    'support-chatbot': 'simple',
    'grading': 'standard',
    'content-creation': 'standard',
    'personalization': 'simple',
    'integrity': 'standard',
    'admissions': 'standard',
    'research': 'advanced',
    'course-recommendation': 'simple',
    'faculty-support': 'simple',
    'translation': 'simple',
    'spiritual-formation': 'specialized',
    'fundraising': 'simple',
    'career-services': 'simple',
    'moderation': 'simple',
    'accessibility': 'simple'
  }
};

export const costOptimizationStrategies = {
  // Strategies for different optimization scenarios
  aggressive: {
    caching: {
      enabled: true,
      ttl: 7200, // 2 hours
      strategy: 'semantic',
      semanticThreshold: 0.85 // Lower threshold for more cache hits
    },
    batching: {
      enabled: true,
      batchSize: 20,
      batchTimeout: 10000 // Wait longer to accumulate more requests
    },
    promptOptimization: {
      compressionEnabled: true,
      useSystemPrompts: true,
      removeRedundancy: true
    }
  },
  balanced: {
    caching: {
      enabled: true,
      ttl: 3600, // 1 hour
      strategy: 'semantic',
      semanticThreshold: 0.9
    },
    batching: {
      enabled: true,
      batchSize: 10,
      batchTimeout: 5000
    },
    promptOptimization: {
      compressionEnabled: true,
      useSystemPrompts: true,
      removeRedundancy: true
    }
  },
  quality: {
    caching: {
      enabled: true,
      ttl: 1800, // 30 minutes
      strategy: 'semantic',
      semanticThreshold: 0.95 // Higher threshold for quality
    },
    batching: {
      enabled: false // Disable batching for immediate responses
    },
    promptOptimization: {
      compressionEnabled: false, // Preserve full prompts
      useSystemPrompts: true,
      removeRedundancy: false
    }
  }
};

export const monitoringConfig = {
  metricsInterval: 60000, // Collect metrics every minute
  reportingInterval: 3600000, // Generate reports every hour
  alertChannels: ['email', 'slack', 'sms'],
  dashboardRefreshRate: 30000 // Refresh dashboard every 30 seconds
};
