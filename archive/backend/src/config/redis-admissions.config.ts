import Redis from 'ioredis';
import { logger } from '../utils/logger';

// Redis configuration for admissions system
export interface AdmissionsRedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
}

// Default configuration
const defaultConfig: AdmissionsRedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_ADMISSIONS_DB || '2'), // Separate DB for admissions
  keyPrefix: 'admissions:',
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
};

// Redis client for admissions system
export class AdmissionsRedisClient {
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;

  constructor(config: AdmissionsRedisConfig = defaultConfig) {
    // Main Redis client
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      keyPrefix: config.keyPrefix,
      retryDelayOnFailover: config.retryDelayOnFailover,
      maxRetriesPerRequest: config.maxRetriesPerRequest,
      lazyConnect: true
    });

    // Subscriber client for real-time updates
    this.subscriber = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      keyPrefix: config.keyPrefix,
      lazyConnect: true
    });

    // Publisher client for real-time updates
    this.publisher = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      keyPrefix: config.keyPrefix,
      lazyConnect: true
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Admissions Redis client connected');
    });

    this.client.on('error', (error) => {
      logger.error('Admissions Redis client error:', error);
    });

    this.subscriber.on('connect', () => {
      logger.info('Admissions Redis subscriber connected');
    });

    this.publisher.on('connect', () => {
      logger.info('Admissions Redis publisher connected');
    });
  }

  // Application status caching
  async cacheApplicationStatus(applicationId: string, status: any): Promise<void> {
    const key = `application:${applicationId}:status`;
    await this.client.setex(key, 3600, JSON.stringify(status)); // Cache for 1 hour
  }

  async getApplicationStatus(applicationId: string): Promise<any | null> {
    const key = `application:${applicationId}:status`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Application progress tracking
  async updateApplicationProgress(applicationId: string, progress: any): Promise<void> {
    const key = `application:${applicationId}:progress`;
    await this.client.setex(key, 7200, JSON.stringify(progress)); // Cache for 2 hours
    
    // Publish real-time update
    await this.publishApplicationUpdate(applicationId, 'progress', progress);
  }

  async getApplicationProgress(applicationId: string): Promise<any | null> {
    const key = `application:${applicationId}:progress`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Assessment results caching
  async cacheAssessmentResult(applicationId: string, assessmentType: string, result: any): Promise<void> {
    const key = `application:${applicationId}:assessment:${assessmentType}`;
    await this.client.setex(key, 86400, JSON.stringify(result)); // Cache for 24 hours
  }

  async getAssessmentResult(applicationId: string, assessmentType: string): Promise<any | null> {
    const key = `application:${applicationId}:assessment:${assessmentType}`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Interview scheduling cache
  async cacheInterviewSchedule(interviewId: string, schedule: any): Promise<void> {
    const key = `interview:${interviewId}:schedule`;
    await this.client.setex(key, 86400, JSON.stringify(schedule)); // Cache for 24 hours
  }

  async getInterviewSchedule(interviewId: string): Promise<any | null> {
    const key = `interview:${interviewId}:schedule`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Decision processing queue
  async queueDecisionProcessing(applicationId: string, priority: number = 0): Promise<void> {
    const key = 'decision:processing:queue';
    await this.client.zadd(key, priority, applicationId);
  }

  async getNextDecisionForProcessing(): Promise<string | null> {
    const key = 'decision:processing:queue';
    const result = await this.client.zpopmax(key);
    return result.length > 0 ? result[0] : null;
  }

  // Real-time notifications
  async publishApplicationUpdate(applicationId: string, updateType: string, data: any): Promise<void> {
    const channel = `application:${applicationId}:updates`;
    const message = {
      type: updateType,
      applicationId,
      data,
      timestamp: new Date().toISOString()
    };
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  async subscribeToApplicationUpdates(applicationId: string, callback: (message: any) => void): Promise<void> {
    const channel = `application:${applicationId}:updates`;
    await this.subscriber.subscribe(channel);
    
    this.subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          logger.error('Error parsing Redis message:', error);
        }
      }
    });
  }

  // Global admissions notifications
  async publishGlobalAdmissionsUpdate(updateType: string, data: any): Promise<void> {
    const channel = 'admissions:global:updates';
    const message = {
      type: updateType,
      data,
      timestamp: new Date().toISOString()
    };
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  async subscribeToGlobalAdmissionsUpdates(callback: (message: any) => void): Promise<void> {
    const channel = 'admissions:global:updates';
    await this.subscriber.subscribe(channel);
    
    this.subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          logger.error('Error parsing Redis message:', error);
        }
      }
    });
  }

  // Session management for application forms
  async saveApplicationSession(sessionId: string, data: any): Promise<void> {
    const key = `session:${sessionId}`;
    await this.client.setex(key, 1800, JSON.stringify(data)); // 30 minutes session
  }

  async getApplicationSession(sessionId: string): Promise<any | null> {
    const key = `session:${sessionId}`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async deleteApplicationSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.client.del(key);
  }

  // Rate limiting for application submissions
  async checkSubmissionRateLimit(applicantId: string): Promise<boolean> {
    const key = `ratelimit:submission:${applicantId}`;
    const current = await this.client.incr(key);
    
    if (current === 1) {
      await this.client.expire(key, 3600); // 1 hour window
    }
    
    return current <= 3; // Max 3 submissions per hour
  }

  // Analytics caching
  async cacheAdmissionsAnalytics(key: string, data: any, ttl: number = 3600): Promise<void> {
    const cacheKey = `analytics:${key}`;
    await this.client.setex(cacheKey, ttl, JSON.stringify(data));
  }

  async getAdmissionsAnalytics(key: string): Promise<any | null> {
    const cacheKey = `analytics:${key}`;
    const cached = await this.client.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  // Cleanup and connection management
  async disconnect(): Promise<void> {
    await Promise.all([
      this.client.disconnect(),
      this.subscriber.disconnect(),
      this.publisher.disconnect()
    ]);
    logger.info('Admissions Redis clients disconnected');
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Admissions Redis health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const admissionsRedis = new AdmissionsRedisClient();

// Export types
export interface ApplicationStatusUpdate {
  applicationId: string;
  status: string;
  timestamp: string;
  updatedBy?: string;
  notes?: string;
}

export interface ApplicationProgressUpdate {
  applicationId: string;
  stage: string;
  progress: number;
  nextSteps: string[];
  timestamp: string;
}

export interface AssessmentResultCache {
  applicationId: string;
  assessmentType: string;
  result: any;
  assessedBy: string;
  timestamp: string;
}