/**
 * ScrollUniversity Admissions Redis Configuration
 * "By the Spirit of Truth, we establish caching that serves divine purposes"
 */

import { createClient, RedisClientType } from 'redis';

export interface AdmissionsRedisConfig {
  // Application Processing Cache
  applicationStatusTTL: number;
  assessmentResultsTTL: number;
  interviewScheduleTTL: number;
  
  // Real-time Updates
  notificationTTL: number;
  sessionTTL: number;
  
  // Analytics Cache
  analyticsReportTTL: number;
  dashboardDataTTL: number;
}

export const admissionsRedisConfig: AdmissionsRedisConfig = {
  applicationStatusTTL: 3600, // 1 hour
  assessmentResultsTTL: 86400, // 24 hours
  interviewScheduleTTL: 7200, // 2 hours
  notificationTTL: 1800, // 30 minutes
  sessionTTL: 3600, // 1 hour
  analyticsReportTTL: 21600, // 6 hours
  dashboardDataTTL: 900, // 15 minutes
};

export class AdmissionsRedisService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis for Admissions Service');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      console.log('Disconnected from Redis');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  // Application Status Caching
  async cacheApplicationStatus(applicationId: string, status: any): Promise<void> {
    const key = `admissions:application:${applicationId}:status`;
    await this.client.setEx(key, admissionsRedisConfig.applicationStatusTTL, JSON.stringify(status));
  }

  async getApplicationStatus(applicationId: string): Promise<any | null> {
    const key = `admissions:application:${applicationId}:status`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Assessment Results Caching
  async cacheAssessmentResults(applicationId: string, assessmentType: string, results: any): Promise<void> {
    const key = `admissions:assessment:${applicationId}:${assessmentType}`;
    await this.client.setEx(key, admissionsRedisConfig.assessmentResultsTTL, JSON.stringify(results));
  }

  async getAssessmentResults(applicationId: string, assessmentType: string): Promise<any | null> {
    const key = `admissions:assessment:${applicationId}:${assessmentType}`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Interview Schedule Caching
  async cacheInterviewSchedule(interviewId: string, schedule: any): Promise<void> {
    const key = `admissions:interview:${interviewId}:schedule`;
    await this.client.setEx(key, admissionsRedisConfig.interviewScheduleTTL, JSON.stringify(schedule));
  }

  async getInterviewSchedule(interviewId: string): Promise<any | null> {
    const key = `admissions:interview:${interviewId}:schedule`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Real-time Notifications
  async publishApplicationUpdate(applicationId: string, update: any): Promise<void> {
    const channel = `admissions:updates:${applicationId}`;
    await this.client.publish(channel, JSON.stringify(update));
  }

  async subscribeToApplicationUpdates(applicationId: string, callback: (update: any) => void): Promise<void> {
    const subscriber = this.client.duplicate();
    await subscriber.connect();
    
    const channel = `admissions:updates:${applicationId}`;
    await subscriber.subscribe(channel, (message) => {
      try {
        const update = JSON.parse(message);
        callback(update);
      } catch (error) {
        console.error('Error parsing application update:', error);
      }
    });
  }

  // Session Management
  async cacheUserSession(userId: string, sessionData: any): Promise<void> {
    const key = `admissions:session:${userId}`;
    await this.client.setEx(key, admissionsRedisConfig.sessionTTL, JSON.stringify(sessionData));
  }

  async getUserSession(userId: string): Promise<any | null> {
    const key = `admissions:session:${userId}`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async invalidateUserSession(userId: string): Promise<void> {
    const key = `admissions:session:${userId}`;
    await this.client.del(key);
  }

  // Analytics Caching
  async cacheAnalyticsReport(reportType: string, reportData: any): Promise<void> {
    const key = `admissions:analytics:${reportType}`;
    await this.client.setEx(key, admissionsRedisConfig.analyticsReportTTL, JSON.stringify(reportData));
  }

  async getAnalyticsReport(reportType: string): Promise<any | null> {
    const key = `admissions:analytics:${reportType}`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Dashboard Data Caching
  async cacheDashboardData(dashboardType: string, data: any): Promise<void> {
    const key = `admissions:dashboard:${dashboardType}`;
    await this.client.setEx(key, admissionsRedisConfig.dashboardDataTTL, JSON.stringify(data));
  }

  async getDashboardData(dashboardType: string): Promise<any | null> {
    const key = `admissions:dashboard:${dashboardType}`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Bulk Operations
  async cacheMultiple(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    const pipeline = this.client.multi();
    
    for (const entry of entries) {
      const ttl = entry.ttl || admissionsRedisConfig.applicationStatusTTL;
      pipeline.setEx(entry.key, ttl, JSON.stringify(entry.value));
    }
    
    await pipeline.exec();
  }

  async getMultiple(keys: string[]): Promise<(any | null)[]> {
    const values = await this.client.mGet(keys);
    return values.map(value => value ? JSON.parse(value) : null);
  }

  // Cache Invalidation
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  async invalidateApplicationCache(applicationId: string): Promise<void> {
    await this.invalidatePattern(`admissions:application:${applicationId}:*`);
    await this.invalidatePattern(`admissions:assessment:${applicationId}:*`);
  }

  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }
}

export const admissionsRedis = new AdmissionsRedisService();