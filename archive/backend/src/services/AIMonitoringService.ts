/**
 * AI Monitoring Service
 * "The Spirit of truth will guide you into all truth" - John 16:13
 * 
 * Comprehensive monitoring and alerting for AI services including:
 * - Service health monitoring
 * - Cost tracking and budget alerts
 * - Quality metrics tracking
 * - Performance monitoring
 * - Alert system for issues
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/productionLogger';
import AIDataService from './AIDataService';

const prisma = new PrismaClient();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, ServiceHealth>;
  timestamp: Date;
}

interface ServiceHealth {
  status: 'operational' | 'degraded' | 'down';
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
}

interface CostAlert {
  type: 'budget_warning' | 'budget_exceeded' | 'unusual_spike';
  service: string;
  currentCost: number;
  threshold: number;
  message: string;
}

interface QualityAlert {
  type: 'low_confidence' | 'high_error_rate' | 'slow_response';
  service: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
}

export class AIMonitoringService {
  private alertThresholds = {
    costWarning: 0.8, // 80% of budget
    costCritical: 0.95, // 95% of budget
    confidenceMin: 0.85,
    errorRateMax: 0.05, // 5%
    responseTimeMax: 3000, // 3 seconds
    successRateMin: 0.95 // 95%
  };

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthStatus> {
    try {
      const services = await this.checkAllServices();
      const overallStatus = this.determineOverallStatus(services);

      const healthStatus: HealthStatus = {
        status: overallStatus,
        services,
        timestamp: new Date()
      };

      // Log health check
      const aiDataService = new AIDataService();
      await aiDataService.logAudit({
        serviceType: 'monitoring',
        action: 'health_check',
        outputData: healthStatus
      });

      return healthStatus;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Health check failed', { error: errorMessage });
      return {
        status: 'unhealthy',
        services: {},
        timestamp: new Date()
      };
    }
  }

  /**
   * Check all AI services
   */
  private async checkAllServices(): Promise<Record<string, ServiceHealth>> {
    const services = [
      'chatbot',
      'grading',
      'content-creation',
      'personalization',
      'integrity',
      'admissions',
      'research',
      'course-recommendation',
      'faculty-assistant',
      'translation',
      'spiritual-formation',
      'fundraising',
      'career-services',
      'moderation',
      'accessibility'
    ];

    const healthChecks: Record<string, ServiceHealth> = {};

    for (const service of services) {
      healthChecks[service] = await this.checkServiceHealth(service);
    }

    return healthChecks;
  }

  /**
   * Check individual service health
   */
  private async checkServiceHealth(serviceType: string): Promise<ServiceHealth> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get recent requests for this service
      const recentRequests = await prisma.aIServiceRequest.findMany({
        where: {
          serviceType,
          createdAt: { gte: oneHourAgo }
        },
        select: {
          status: true,
          processingTimeMs: true
        }
      });

      if (recentRequests.length === 0) {
        return {
          status: 'operational',
          responseTime: 0,
          errorRate: 0,
          lastCheck: now
        };
      }

      const errorCount = recentRequests.filter(r => r.status === 'error').length;
      const errorRate = errorCount / recentRequests.length;
      const avgResponseTime = recentRequests.reduce((sum, r) => sum + (r.processingTimeMs || 0), 0) / recentRequests.length;

      let status: 'operational' | 'degraded' | 'down' = 'operational';
      if (errorRate > 0.1 || avgResponseTime > 5000) {
        status = 'degraded';
      }
      if (errorRate > 0.3) {
        status = 'down';
      }

      return {
        status,
        responseTime: avgResponseTime,
        errorRate,
        lastCheck: now
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Service health check failed', { error: errorMessage, serviceType });
      return {
        status: 'down',
        responseTime: 0,
        errorRate: 1,
        lastCheck: new Date()
      };
    }
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(services: Record<string, ServiceHealth>): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(services).map(s => s.status);
    
    if (statuses.some(s => s === 'down')) {
      return 'unhealthy';
    }
    if (statuses.some(s => s === 'degraded')) {
      return 'degraded';
    }
    return 'healthy';
  }

  /**
   * Check cost budgets and generate alerts
   */
  async checkCostBudgets(): Promise<CostAlert[]> {
    try {
      const alerts: CostAlert[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get service configurations with budget limits
      const configs = await prisma.aIServiceConfig.findMany({
        where: {
          maxCostPerDay: { not: null }
        }
      });

      for (const config of configs) {
        if (!config.maxCostPerDay) continue;

        // Get today's cost for this service
        const costData = await prisma.aICostTracking.aggregate({
          where: {
            serviceType: config.serviceType,
            createdAt: { gte: today }
          },
          _sum: { cost: true }
        });

        const currentCost = costData._sum.cost || 0;
        const budget = config.maxCostPerDay;
        const percentage = currentCost / budget;

        if (percentage >= this.alertThresholds.costCritical) {
          alerts.push({
            type: 'budget_exceeded',
            service: config.serviceType,
            currentCost,
            threshold: budget,
            message: `${config.serviceType} has exceeded ${(percentage * 100).toFixed(0)}% of daily budget ($${currentCost.toFixed(2)} / $${budget.toFixed(2)})`
          });
        } else if (percentage >= this.alertThresholds.costWarning) {
          alerts.push({
            type: 'budget_warning',
            service: config.serviceType,
            currentCost,
            threshold: budget,
            message: `${config.serviceType} has reached ${(percentage * 100).toFixed(0)}% of daily budget ($${currentCost.toFixed(2)} / $${budget.toFixed(2)})`
          });
        }
      }

      // Check for unusual cost spikes
      const unusualSpikes = await this.detectCostSpikes();
      alerts.push(...unusualSpikes);

      // Log alerts
      if (alerts.length > 0) {
        const aiDataService = new AIDataService();
        await aiDataService.logAudit({
          serviceType: 'monitoring',
          action: 'cost_alerts',
          outputData: alerts
        });

        // Send notifications
        await this.sendAlertNotifications(alerts);
      }

      return alerts;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Cost budget check failed', { error: errorMessage });
      return [];
    }
  }

  /**
   * Detect unusual cost spikes
   */
  private async detectCostSpikes(): Promise<CostAlert[]> {
    const alerts: CostAlert[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      const services = await prisma.aIServiceConfig.findMany();

      for (const service of services) {
        // Get last hour cost
        const lastHourCost = await prisma.aICostTracking.aggregate({
          where: {
            serviceType: service.serviceType,
            createdAt: { gte: oneHourAgo }
          },
          _sum: { cost: true }
        });

        // Get average hourly cost from last 24 hours
        const last24HoursCost = await prisma.aICostTracking.aggregate({
          where: {
            serviceType: service.serviceType,
            createdAt: { gte: oneDayAgo, lt: oneHourAgo }
          },
          _sum: { cost: true }
        });

        const currentHourlyCost = lastHourCost._sum.cost || 0;
        const avgHourlyCost = (last24HoursCost._sum.cost || 0) / 23; // 23 hours

        // Alert if current hour is 3x average
        if (avgHourlyCost > 0 && currentHourlyCost > avgHourlyCost * 3) {
          alerts.push({
            type: 'unusual_spike',
            service: service.serviceType,
            currentCost: currentHourlyCost,
            threshold: avgHourlyCost * 3,
            message: `${service.serviceType} cost spike detected: $${currentHourlyCost.toFixed(2)} in last hour (3x average of $${avgHourlyCost.toFixed(2)})`
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Cost spike detection failed', { error: errorMessage });
    }

    return alerts;
  }

  /**
   * Check quality metrics and generate alerts
   */
  async checkQualityMetrics(): Promise<QualityAlert[]> {
    try {
      const alerts: QualityAlert[] = [];
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Get recent quality metrics
      const services = await prisma.aIServiceConfig.findMany();

      const aiDataService = new AIDataService();
      for (const service of services) {
        const stats = await aiDataService.getUsageStats(
          service.serviceType,
          oneHourAgo,
          new Date()
        );

        // Check confidence
        if (stats.avgConfidence < this.alertThresholds.confidenceMin) {
          alerts.push({
            type: 'low_confidence',
            service: service.serviceType,
            metric: 'confidence',
            value: stats.avgConfidence,
            threshold: this.alertThresholds.confidenceMin,
            message: `${service.serviceType} average confidence is ${(stats.avgConfidence * 100).toFixed(1)}% (below ${(this.alertThresholds.confidenceMin * 100).toFixed(0)}% threshold)`
          });
        }

        // Check error rate
        const errorRate = 1 - (stats.successRate / 100);
        if (errorRate > this.alertThresholds.errorRateMax) {
          alerts.push({
            type: 'high_error_rate',
            service: service.serviceType,
            metric: 'error_rate',
            value: errorRate,
            threshold: this.alertThresholds.errorRateMax,
            message: `${service.serviceType} error rate is ${(errorRate * 100).toFixed(1)}% (above ${(this.alertThresholds.errorRateMax * 100).toFixed(0)}% threshold)`
          });
        }

        // Check response time
        if (stats.avgProcessingTime > this.alertThresholds.responseTimeMax) {
          alerts.push({
            type: 'slow_response',
            service: service.serviceType,
            metric: 'response_time',
            value: stats.avgProcessingTime,
            threshold: this.alertThresholds.responseTimeMax,
            message: `${service.serviceType} average response time is ${stats.avgProcessingTime.toFixed(0)}ms (above ${this.alertThresholds.responseTimeMax}ms threshold)`
          });
        }
      }

      // Log alerts
      if (alerts.length > 0) {
        const aiDataService = new AIDataService();
        await aiDataService.logAudit({
          serviceType: 'monitoring',
          action: 'quality_alerts',
          outputData: alerts
        });

        // Send notifications
        await this.sendAlertNotifications(alerts);
      }

      return alerts;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Quality metrics check failed', { error: errorMessage });
      return [];
    }
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(): Promise<any> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const aiDataService = new AIDataService();
      const [
        overallStats,
        healthStatus,
        costAlerts,
        qualityAlerts,
        pendingReviews
      ] = await Promise.all([
        aiDataService.getUsageStats(undefined, oneDayAgo, now),
        this.performHealthCheck(),
        this.checkCostBudgets(),
        this.checkQualityMetrics(),
        aiDataService.getPendingReviews(undefined, 10)
      ]);

      return {
        overall: overallStats,
        health: healthStatus,
        alerts: {
          cost: costAlerts,
          quality: qualityAlerts
        },
        pendingReviews: pendingReviews.length,
        timestamp: now
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get dashboard metrics', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(alerts: (CostAlert | QualityAlert)[]): Promise<void> {
    try {
      // Log alerts
      for (const alert of alerts) {
        logger.warn('AI Service Alert', alert);
      }

      // TODO: Implement email/SMS notifications
      // TODO: Integrate with monitoring systems (PagerDuty, Slack, etc.)
      
      // For now, just log to monitoring service
      const aiDataService = new AIDataService();
      await aiDataService.logAudit({
        serviceType: 'monitoring',
        action: 'alerts_sent',
        outputData: { alertCount: alerts.length, alerts }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send alert notifications', { error: errorMessage });
    }
  }

  /**
   * Record service metric
   */
  async recordMetric(data: {
    serviceType: string;
    metricName: string;
    metricValue: number;
    metricUnit?: string;
    tags?: Record<string, string>;
  }): Promise<void> {
    try {
      await prisma.aIServiceMetric.create({
        data: {
          serviceType: data.serviceType,
          metricName: data.metricName,
          metricValue: data.metricValue,
          metricUnit: data.metricUnit || null,
          tags: data.tags || null
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to record metric', { error: errorMessage, data });
      // Don't throw - metrics recording should not break the main flow
    }
  }

  /**
   * Get performance trends
   */
  async getPerformanceTrends(serviceType?: string, days: number = 7): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const aiDataService = new AIDataService();
      const dailyStats = [];
      for (let i = 0; i < days; i++) {
        const dayStart = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        const stats = await aiDataService.getUsageStats(serviceType, dayStart, dayEnd);
        dailyStats.push({
          date: dayStart.toISOString().split('T')[0],
          ...stats
        });
      }

      return dailyStats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get performance trends', { error: errorMessage, serviceType });
      throw error;
    }
  }

  /**
   * Start monitoring loop
   */
  startMonitoring(intervalMinutes: number = 5): NodeJS.Timeout {
    logger.info('Starting AI monitoring service', { intervalMinutes });

    return setInterval(async () => {
      try {
        await this.performHealthCheck();
        await this.checkCostBudgets();
        await this.checkQualityMetrics();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Monitoring loop error', { error: errorMessage });
      }
    }, intervalMinutes * 60 * 1000);
  }
}

export default new AIMonitoringService();
