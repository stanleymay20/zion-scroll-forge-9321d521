/**
 * ScrollUniversity Production Logger
 * "Let all things be done decently and in order" - 1 Corinthians 14:40
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ElasticsearchTransport } from 'winston-elasticsearch';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Custom format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      service: 'scroll-university',
      environment: process.env.NODE_ENV || 'development',
      ...meta
    });
  })
);

// Console transport for development
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `${timestamp} [${level}]: ${message} ${metaStr}`;
    })
  )
});

// File transport for all environments
const fileTransport = new DailyRotateFile({
  filename: 'logs/scroll-university-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat
});

// Error file transport
const errorFileTransport = new DailyRotateFile({
  filename: 'logs/scroll-university-error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '30d',
  format: logFormat
});

// Elasticsearch transport for production
const elasticsearchTransport = process.env.ELASTICSEARCH_URL ? new ElasticsearchTransport({
  level: 'info',
  clientOpts: {
    node: process.env.ELASTICSEARCH_URL,
    auth: {
      username: process.env.ELASTICSEARCH_USERNAME || '',
      password: process.env.ELASTICSEARCH_PASSWORD || ''
    }
  },
  index: 'scroll-university-logs',
  indexTemplate: {
    name: 'scroll-university-logs',
    body: {
      index_patterns: ['scroll-university-logs-*'],
      settings: {
        number_of_shards: 1,
        number_of_replicas: 1
      },
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          level: { type: 'keyword' },
          message: { type: 'text' },
          service: { type: 'keyword' },
          environment: { type: 'keyword' }
        }
      }
    }
  }
}) : null;

// Create logger instance
const transports: winston.transport[] = [fileTransport, errorFileTransport];

if (isDevelopment) {
  transports.push(consoleTransport);
}

if (isProduction && elasticsearchTransport) {
  transports.push(elasticsearchTransport);
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  format: logFormat,
  transports,
  exitOnError: false
});

// Performance monitoring
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();

  static start(operation: string): void {
    this.timers.set(operation, Date.now());
  }

  static end(operation: string, metadata?: any): void {
    const startTime = this.timers.get(operation);
    if (startTime) {
      const duration = Date.now() - startTime;
      logger.info(`Performance: ${operation}`, {
        operation,
        duration,
        ...metadata
      });
      this.timers.delete(operation);
    }
  }

  static async measure<T>(operation: string, fn: () => Promise<T>, metadata?: any): Promise<T> {
    this.start(operation);
    try {
      const result = await fn();
      this.end(operation, { ...metadata, success: true });
      return result;
    } catch (error) {
      this.end(operation, { ...metadata, success: false, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}

// Security event logger
export class SecurityLogger {
  static logAuthAttempt(userId: string, success: boolean, ip: string, userAgent?: string): void {
    logger.info('Authentication attempt', {
      event: 'auth_attempt',
      userId,
      success,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }

  static logSuspiciousActivity(type: string, details: any, ip: string): void {
    logger.warn('Suspicious activity detected', {
      event: 'suspicious_activity',
      type,
      details,
      ip,
      timestamp: new Date().toISOString()
    });
  }

  static logDataAccess(userId: string, resource: string, action: string): void {
    logger.info('Data access', {
      event: 'data_access',
      userId,
      resource,
      action,
      timestamp: new Date().toISOString()
    });
  }

  static logSecurityViolation(violation: string, details: any, ip: string): void {
    logger.error('Security violation', {
      event: 'security_violation',
      violation,
      details,
      ip,
      timestamp: new Date().toISOString()
    });
  }
}

// Application metrics
export class MetricsLogger {
  static logUserAction(userId: string, action: string, metadata?: any): void {
    logger.info('User action', {
      event: 'user_action',
      userId,
      action,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  }

  static logSystemMetric(metric: string, value: number, unit: string): void {
    logger.info('System metric', {
      event: 'system_metric',
      metric,
      value,
      unit,
      timestamp: new Date().toISOString()
    });
  }

  static logBusinessEvent(event: string, data: any): void {
    logger.info('Business event', {
      event: 'business_event',
      eventType: event,
      data,
      timestamp: new Date().toISOString()
    });
  }
}

// Error tracking
export class ErrorTracker {
  static trackError(error: Error, context?: any): void {
    logger.error('Application error', {
      event: 'application_error',
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }

  static trackDatabaseError(error: Error, query?: string): void {
    logger.error('Database error', {
      event: 'database_error',
      message: error.message,
      stack: error.stack,
      query,
      timestamp: new Date().toISOString()
    });
  }

  static trackAPIError(error: Error, endpoint: string, method: string): void {
    logger.error('API error', {
      event: 'api_error',
      message: error.message,
      stack: error.stack,
      endpoint,
      method,
      timestamp: new Date().toISOString()
    });
  }
}

// Health monitoring
export class HealthMonitor {
  static logHealthCheck(service: string, status: 'healthy' | 'unhealthy', details?: any): void {
    const level = status === 'healthy' ? 'info' : 'error';
    logger.log(level, 'Health check', {
      event: 'health_check',
      service,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }

  static logResourceUsage(cpu: number, memory: number, disk: number): void {
    logger.info('Resource usage', {
      event: 'resource_usage',
      cpu,
      memory,
      disk,
      timestamp: new Date().toISOString()
    });
  }
}

// Graceful shutdown logging
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
});

export default logger;