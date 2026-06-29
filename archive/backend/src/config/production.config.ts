/**
 * Production Configuration
 * Comprehensive production environment settings with security and performance optimizations
 */

export interface ProductionConfig {
  environment: EnvironmentConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  security: SecurityConfig;
  ai: AIProductionConfig;
  monitoring: MonitoringConfig;
  backup: BackupConfig;
  performance: PerformanceConfig;
  compliance: ComplianceConfig;
}

export interface EnvironmentConfig {
  nodeEnv: string;
  port: number;
  host: string;
  deploymentVersion: string;
  deploymentTimestamp: string;
  commitSha: string;
}

export interface DatabaseConfig {
  url: string;
  poolMin: number;
  poolMax: number;
  idleTimeout: number;
  connectionTimeout: number;
  sslEnabled: boolean;
  pointInTimeRecovery: boolean;
}

export interface RedisConfig {
  url: string;
  password: string;
  tlsEnabled: boolean;
  clusterMode: boolean;
  maxRetries: number;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  bcryptRounds: number;
  helmetEnabled: boolean;
  trustProxy: boolean;
  corsOrigins: string[];
  corsCredentials: boolean;
  rateLimitWindow: number;
  rateLimitMax: number;
}

export interface AIProductionConfig {
  openai: {
    apiKey: string;
    organization: string;
    timeout: number;
    maxRetries: number;
    modelPrimary: string;
    modelFallback: string;
  };
  anthropic: {
    apiKey: string;
    timeout: number;
    maxRetries: number;
    modelPrimary: string;
    modelFallback: string;
  };
  rateLimits: {
    rpm: number;
    tpm: number;
    rpd: number;
    concurrent: number;
  };
  budget: {
    daily: number;
    monthly: number;
    yearly: number;
    alertThreshold: number;
    criticalThreshold: number;
    autoThrottle: boolean;
    emergencyFallback: boolean;
  };
  cache: {
    enabled: boolean;
    ttl: number;
    semanticEnabled: boolean;
    semanticThreshold: number;
    compression: boolean;
    maxSize: number;
  };
  retry: {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  fallback: {
    enabled: boolean;
    circuitBreakerEnabled: boolean;
    circuitBreakerThreshold: number;
    circuitBreakerTimeout: number;
  };
}

export interface MonitoringConfig {
  sentry: {
    dsn: string;
    environment: string;
    tracesSampleRate: number;
    profilesSampleRate: number;
  };
  logging: {
    level: string;
    format: string;
    rotation: string;
    maxFiles: number;
    maxSize: string;
  };
  metrics: {
    enabled: boolean;
    port: number;
    prometheusEnabled: boolean;
  };
  apm: {
    enabled: boolean;
    newRelicKey: string;
    appName: string;
  };
}

export interface BackupConfig {
  enabled: boolean;
  schedule: string;
  retentionDays: number;
  s3Bucket: string;
  encryption: boolean;
  database: {
    enabled: boolean;
    schedule: string;
  };
  redis: {
    enabled: boolean;
    schedule: string;
  };
}

export interface PerformanceConfig {
  clustering: {
    enabled: boolean;
    workers: string | number;
  };
  compression: {
    enabled: boolean;
    level: number;
  };
  cdn: {
    enabled: boolean;
    url: string;
  };
}

export interface ComplianceConfig {
  gdpr: boolean;
  ferpa: boolean;
  coppa: boolean;
  dataRetentionDays: number;
  auditLogRetentionDays: number;
}

/**
 * Load production configuration from environment variables
 */
export function loadProductionConfig(): ProductionConfig {
  return {
    environment: {
      nodeEnv: process.env.NODE_ENV || 'production',
      port: parseInt(process.env.PORT || '3000', 10),
      host: process.env.HOST || '0.0.0.0',
      deploymentVersion: process.env.DEPLOYMENT_VERSION || '1.0.0',
      deploymentTimestamp: process.env.DEPLOYMENT_TIMESTAMP || new Date().toISOString(),
      commitSha: process.env.DEPLOYMENT_COMMIT_SHA || 'unknown',
    },

    database: {
      url: process.env.DATABASE_URL || '',
      poolMin: parseInt(process.env.DATABASE_POOL_MIN || '10', 10),
      poolMax: parseInt(process.env.DATABASE_POOL_MAX || '50', 10),
      idleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000', 10),
      connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '10000', 10),
      sslEnabled: process.env.DATABASE_SSL_ENABLED === 'true',
      pointInTimeRecovery: process.env.DB_POINT_IN_TIME_RECOVERY === 'true',
    },

    redis: {
      url: process.env.REDIS_URL || '',
      password: process.env.REDIS_PASSWORD || '',
      tlsEnabled: process.env.REDIS_TLS_ENABLED === 'true',
      clusterMode: process.env.REDIS_CLUSTER_MODE === 'true',
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '5', 10),
    },

    security: {
      jwtSecret: process.env.JWT_SECRET || '',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
      jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '14', 10),
      helmetEnabled: process.env.HELMET_ENABLED !== 'false',
      trustProxy: process.env.TRUST_PROXY === 'true',
      corsOrigins: (process.env.CORS_ORIGIN || '').split(','),
      corsCredentials: process.env.CORS_CREDENTIALS === 'true',
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10),
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
    },

    ai: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        organization: process.env.OPENAI_ORGANIZATION || '',
        timeout: parseInt(process.env.OPENAI_TIMEOUT || '120000', 10),
        maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '5', 10),
        modelPrimary: process.env.OPENAI_MODEL_PRIMARY || 'gpt-4-turbo-preview',
        modelFallback: process.env.OPENAI_MODEL_FALLBACK || 'gpt-3.5-turbo',
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        timeout: parseInt(process.env.ANTHROPIC_TIMEOUT || '120000', 10),
        maxRetries: parseInt(process.env.ANTHROPIC_MAX_RETRIES || '5', 10),
        modelPrimary: process.env.ANTHROPIC_MODEL_PRIMARY || 'claude-3-opus-20240229',
        modelFallback: process.env.ANTHROPIC_MODEL_FALLBACK || 'claude-3-sonnet-20240229',
      },
      rateLimits: {
        rpm: parseInt(process.env.AI_RATE_LIMIT_RPM || '500', 10),
        tpm: parseInt(process.env.AI_RATE_LIMIT_TPM || '500000', 10),
        rpd: parseInt(process.env.AI_RATE_LIMIT_RPD || '100000', 10),
        concurrent: parseInt(process.env.AI_RATE_LIMIT_CONCURRENT || '50', 10),
      },
      budget: {
        daily: parseFloat(process.env.AI_DAILY_BUDGET || '300'),
        monthly: parseFloat(process.env.AI_MONTHLY_BUDGET || '8000'),
        yearly: parseFloat(process.env.AI_YEARLY_BUDGET || '96000'),
        alertThreshold: parseFloat(process.env.AI_BUDGET_ALERT_THRESHOLD || '0.8'),
        criticalThreshold: parseFloat(process.env.AI_BUDGET_CRITICAL_THRESHOLD || '0.95'),
        autoThrottle: process.env.AI_BUDGET_AUTO_THROTTLE === 'true',
        emergencyFallback: process.env.AI_BUDGET_EMERGENCY_FALLBACK === 'true',
      },
      cache: {
        enabled: process.env.AI_CACHE_ENABLED !== 'false',
        ttl: parseInt(process.env.AI_CACHE_TTL || '7200', 10),
        semanticEnabled: process.env.AI_SEMANTIC_CACHE_ENABLED === 'true',
        semanticThreshold: parseFloat(process.env.AI_SEMANTIC_CACHE_THRESHOLD || '0.95'),
        compression: process.env.AI_CACHE_COMPRESSION === 'true',
        maxSize: parseInt(process.env.AI_CACHE_MAX_SIZE || '10000', 10),
      },
      retry: {
        maxAttempts: parseInt(process.env.AI_RETRY_MAX_ATTEMPTS || '5', 10),
        initialDelay: parseInt(process.env.AI_RETRY_INITIAL_DELAY || '2000', 10),
        maxDelay: parseInt(process.env.AI_RETRY_MAX_DELAY || '30000', 10),
        backoffMultiplier: parseFloat(process.env.AI_RETRY_BACKOFF_MULTIPLIER || '2'),
      },
      fallback: {
        enabled: process.env.AI_FALLBACK_ENABLED === 'true',
        circuitBreakerEnabled: process.env.AI_CIRCUIT_BREAKER_ENABLED === 'true',
        circuitBreakerThreshold: parseInt(process.env.AI_CIRCUIT_BREAKER_THRESHOLD || '10', 10),
        circuitBreakerTimeout: parseInt(process.env.AI_CIRCUIT_BREAKER_TIMEOUT || '60000', 10),
      },
    },

    monitoring: {
      sentry: {
        dsn: process.env.SENTRY_DSN || '',
        environment: process.env.SENTRY_ENVIRONMENT || 'production',
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
        profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
      },
      logging: {
        level: process.env.LOG_LEVEL || 'warn',
        format: process.env.LOG_FORMAT || 'json',
        rotation: process.env.LOG_ROTATION || 'daily',
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '30', 10),
        maxSize: process.env.LOG_MAX_SIZE || '100m',
      },
      metrics: {
        enabled: process.env.ENABLE_METRICS === 'true',
        port: parseInt(process.env.METRICS_PORT || '9090', 10),
        prometheusEnabled: process.env.PROMETHEUS_ENABLED === 'true',
      },
      apm: {
        enabled: process.env.APM_ENABLED === 'true',
        newRelicKey: process.env.NEW_RELIC_LICENSE_KEY || '',
        appName: process.env.NEW_RELIC_APP_NAME || 'ScrollUniversity-Production',
      },
    },

    backup: {
      enabled: process.env.BACKUP_ENABLED === 'true',
      schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '90', 10),
      s3Bucket: process.env.BACKUP_S3_BUCKET || '',
      encryption: process.env.BACKUP_ENCRYPTION === 'true',
      database: {
        enabled: process.env.DB_BACKUP_ENABLED === 'true',
        schedule: process.env.DB_BACKUP_SCHEDULE || '0 */6 * * *',
      },
      redis: {
        enabled: process.env.REDIS_BACKUP_ENABLED === 'true',
        schedule: process.env.REDIS_BACKUP_SCHEDULE || '0 4 * * *',
      },
    },

    performance: {
      clustering: {
        enabled: process.env.CLUSTER_ENABLED === 'true',
        workers: process.env.CLUSTER_WORKERS || 'auto',
      },
      compression: {
        enabled: process.env.COMPRESSION_ENABLED === 'true',
        level: parseInt(process.env.COMPRESSION_LEVEL || '6', 10),
      },
      cdn: {
        enabled: process.env.CDN_ENABLED === 'true',
        url: process.env.CDN_URL || '',
      },
    },

    compliance: {
      gdpr: process.env.GDPR_ENABLED === 'true',
      ferpa: process.env.FERPA_ENABLED === 'true',
      coppa: process.env.COPPA_ENABLED === 'true',
      dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '2555', 10),
      auditLogRetentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '2555', 10),
    },
  };
}

/**
 * Validate production configuration
 */
export function validateProductionConfig(config: ProductionConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Critical validations
  if (!config.database.url) {
    errors.push('DATABASE_URL is required');
  }

  if (!config.redis.url) {
    errors.push('REDIS_URL is required');
  }

  if (!config.security.jwtSecret || config.security.jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  }

  if (!config.ai.openai.apiKey) {
    errors.push('OPENAI_API_KEY is required');
  }

  if (!config.monitoring.sentry.dsn) {
    errors.push('SENTRY_DSN is required for production monitoring');
  }

  // Security validations
  if (config.security.bcryptRounds < 12) {
    errors.push('BCRYPT_ROUNDS should be at least 12 for production');
  }

  if (!config.security.trustProxy && config.environment.host === '0.0.0.0') {
    errors.push('TRUST_PROXY should be enabled when binding to 0.0.0.0');
  }

  // Performance validations
  if (config.database.poolMax < 20) {
    errors.push('DATABASE_POOL_MAX should be at least 20 for production');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get production configuration singleton
 */
let productionConfigInstance: ProductionConfig | null = null;

export function getProductionConfig(): ProductionConfig {
  if (!productionConfigInstance) {
    productionConfigInstance = loadProductionConfig();
    
    // Validate in production
    if (process.env.NODE_ENV === 'production') {
      const validation = validateProductionConfig(productionConfigInstance);
      if (!validation.valid) {
        throw new Error(`Production configuration validation failed:\n${validation.errors.join('\n')}`);
      }
    }
  }

  return productionConfigInstance;
}

export default {
  loadProductionConfig,
  validateProductionConfig,
  getProductionConfig,
};
