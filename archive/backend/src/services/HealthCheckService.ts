/**
 * ScrollUniversity Production Health Check Service
 * "Beloved, I pray that you may prosper in all things and be in health" - 3 John 1:2
 */

import { PrismaClient } from '@prisma/client';
import { cacheService } from './CacheService';
import { logger, HealthMonitor } from '../utils/productionLogger';
import os from 'os';
import fs from 'fs/promises';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: HealthCheckResult;
    cache: HealthCheckResult;
    memory: HealthCheckResult;
    disk: HealthCheckResult;
    external: HealthCheckResult;
  };
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  message?: string;
  details?: any;
}

export class HealthCheckService {
  private prisma: PrismaClient;
  private readonly thresholds = {
    memory: 0.9, // 90% memory usage threshold
    disk: 0.9,   // 90% disk usage threshold
    responseTime: 5000 // 5 second response time threshold
  };

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      const [database, cache, memory, disk, external] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkCache(),
        this.checkMemory(),
        this.checkDisk(),
        this.checkExternalServices()
      ]);

      const checks = {
        database: this.getResultFromSettled(database),
        cache: this.getResultFromSettled(cache),
        memory: this.getResultFromSettled(memory),
        disk: this.getResultFromSettled(disk),
        external: this.getResultFromSettled(external)
      };

      const overallStatus = this.determineOverallStatus(checks);
      
      const healthStatus: HealthStatus = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        checks
      };

      // Log health status
      HealthMonitor.logHealthCheck('application', overallStatus, {
        responseTime: Date.now() - startTime,
        checks: Object.entries(checks).map(([name, result]) => ({
          name,
          status: result.status,
          responseTime: result.responseTime
        }))
      });

      return healthStatus;
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        checks: {
          database: { status: 'unhealthy', responseTime: 0, message: 'Health check failed' },
          cache: { status: 'unhealthy', responseTime: 0, message: 'Health check failed' },
          memory: { status: 'unhealthy', responseTime: 0, message: 'Health check failed' },
          disk: { status: 'unhealthy', responseTime: 0, message: 'Health check failed' },
          external: { status: 'unhealthy', responseTime: 0, message: 'Health check failed' }
        }
      };
    }
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Test a simple query
      const userCount = await this.prisma.user.count();
      
      const responseTime = Date.now() - startTime;
      
      if (responseTime > this.thresholds.responseTime) {
        return {
          status: 'degraded',
          responseTime,
          message: 'Database response time is slow',
          details: { userCount, threshold: this.thresholds.responseTime }
        };
      }
      
      return {
        status: 'healthy',
        responseTime,
        details: { userCount }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: error.message
      };
    }
  }

  /**
   * Check cache service health
   */
  private async checkCache(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await cacheService.healthCheck();
      const responseTime = Date.now() - startTime;
      
      if (!isHealthy) {
        return {
          status: 'unhealthy',
          responseTime,
          message: 'Cache service is not responding'
        };
      }
      
      // Test cache operations
      const testKey = 'health_check_test';
      const testValue = { timestamp: Date.now() };
      
      await cacheService.set(testKey, testValue, { ttl: 60 });
      const retrieved = await cacheService.get(testKey);
      await cacheService.delete(testKey);
      
      if (!retrieved || retrieved.timestamp !== testValue.timestamp) {
        return {
          status: 'degraded',
          responseTime,
          message: 'Cache operations are not working correctly'
        };
      }
      
      const stats = await cacheService.getStats();
      
      return {
        status: 'healthy',
        responseTime,
        details: stats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: error.message
      };
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUtilization = usedMemory / totalMemory;
      
      const responseTime = Date.now() - startTime;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message: string | undefined;
      
      if (memoryUtilization > this.thresholds.memory) {
        status = 'unhealthy';
        message = `Memory usage is critical: ${(memoryUtilization * 100).toFixed(2)}%`;
      } else if (memoryUtilization > this.thresholds.memory * 0.8) {
        status = 'degraded';
        message = `Memory usage is high: ${(memoryUtilization * 100).toFixed(2)}%`;
      }
      
      // Log resource usage
      HealthMonitor.logResourceUsage(
        0, // CPU not checked here
        memoryUtilization * 100,
        0  // Disk not checked here
      );
      
      return {
        status,
        responseTime,
        message,
        details: {
          process: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
            external: Math.round(memoryUsage.external / 1024 / 1024) // MB
          },
          system: {
            total: Math.round(totalMemory / 1024 / 1024), // MB
            free: Math.round(freeMemory / 1024 / 1024), // MB
            used: Math.round(usedMemory / 1024 / 1024), // MB
            utilization: Math.round(memoryUtilization * 100) // %
          }
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: error.message
      };
    }
  }

  /**
   * Check disk usage
   */
  private async checkDisk(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const stats = await fs.stat('.');
      const diskUsage = await this.getDiskUsage();
      
      const responseTime = Date.now() - startTime;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message: string | undefined;
      
      if (diskUsage.utilization > this.thresholds.disk) {
        status = 'unhealthy';
        message = `Disk usage is critical: ${(diskUsage.utilization * 100).toFixed(2)}%`;
      } else if (diskUsage.utilization > this.thresholds.disk * 0.8) {
        status = 'degraded';
        message = `Disk usage is high: ${(diskUsage.utilization * 100).toFixed(2)}%`;
      }
      
      return {
        status,
        responseTime,
        message,
        details: diskUsage
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: error.message
      };
    }
  }

  /**
   * Check external services
   */
  private async checkExternalServices(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const checks = [];
      
      // Check blockchain service if configured
      if (process.env.BLOCKCHAIN_RPC_URL) {
        checks.push(this.checkBlockchainService());
      }
      
      // Check email service if configured
      if (process.env.SMTP_HOST) {
        checks.push(this.checkEmailService());
      }
      
      // Check file storage service if configured
      if (process.env.AWS_S3_BUCKET) {
        checks.push(this.checkFileStorageService());
      }
      
      if (checks.length === 0) {
        return {
          status: 'healthy',
          responseTime: Date.now() - startTime,
          message: 'No external services configured'
        };
      }
      
      const results = await Promise.allSettled(checks);
      const responseTime = Date.now() - startTime;
      
      const failedChecks = results.filter(result => 
        result.status === 'rejected' || 
        (result.status === 'fulfilled' && result.value.status === 'unhealthy')
      );
      
      if (failedChecks.length === results.length) {
        return {
          status: 'unhealthy',
          responseTime,
          message: 'All external services are failing'
        };
      } else if (failedChecks.length > 0) {
        return {
          status: 'degraded',
          responseTime,
          message: `${failedChecks.length} of ${results.length} external services are failing`
        };
      }
      
      return {
        status: 'healthy',
        responseTime,
        message: 'All external services are healthy'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: error.message
      };
    }
  }

  /**
   * Get disk usage information
   */
  private async getDiskUsage(): Promise<any> {
    // This is a simplified implementation
    // In production, you might want to use a library like 'node-disk-info'
    return {
      total: 100 * 1024 * 1024 * 1024, // 100GB placeholder
      free: 50 * 1024 * 1024 * 1024,   // 50GB placeholder
      used: 50 * 1024 * 1024 * 1024,   // 50GB placeholder
      utilization: 0.5 // 50% placeholder
    };
  }

  /**
   * Check blockchain service connectivity
   */
  private async checkBlockchainService(): Promise<{ status: string }> {
    // Placeholder implementation
    return { status: 'healthy' };
  }

  /**
   * Check email service connectivity
   */
  private async checkEmailService(): Promise<{ status: string }> {
    // Placeholder implementation
    return { status: 'healthy' };
  }

  /**
   * Check file storage service connectivity
   */
  private async checkFileStorageService(): Promise<{ status: string }> {
    // Placeholder implementation
    return { status: 'healthy' };
  }

  /**
   * Extract result from Promise.allSettled
   */
  private getResultFromSettled(settled: PromiseSettledResult<HealthCheckResult>): HealthCheckResult {
    if (settled.status === 'fulfilled') {
      return settled.value;
    } else {
      return {
        status: 'unhealthy',
        responseTime: 0,
        message: settled.reason?.message || 'Check failed'
      };
    }
  }

  /**
   * Determine overall health status
   */
  private determineOverallStatus(checks: Record<string, HealthCheckResult>): 'healthy' | 'unhealthy' | 'degraded' {
    const statuses = Object.values(checks).map(check => check.status);
    
    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    } else if (statuses.includes('degraded')) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export const healthCheckService = new HealthCheckService();