/**
 * ScrollUniversity Production Monitoring Service
 * "Watch and pray" - Matthew 26:41
 */

import { EventEmitter } from 'events';
import { logger, MetricsLogger, SecurityLogger, ErrorTracker } from '../utils/productionLogger';
import { cacheService } from './CacheService';
import { healthCheckService } from './HealthCheckService';

export interface MetricData {
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
  timestamp?: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // seconds
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  channels: string[]; // email, slack, webhook
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  triggeredAt: Date;
  resolvedAt?: Date;
  status: 'active' | 'resolved' | 'acknowledged';
}

export class MonitoringService extends EventEmitter {
  private metrics: Map<string, MetricData[]> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private metricsRetentionHours = 24;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    super();
    this.setupDefaultAlertRules();
    this.startCleanupTask();
    this.startHealthMonitoring();
  }

  /**
   * Record a metric
   */
  recordMetric(data: MetricData): void {
    const key = `${data.name}:${JSON.stringify(data.tags || {})}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const metricData = {
      ...data,
      timestamp: data.timestamp || new Date()
    };
    
    this.metrics.get(key)!.push(metricData);
    
    // Log metric
    MetricsLogger.logSystemMetric(data.name, data.value, data.unit);
    
    // Check alert rules
    this.checkAlertRules(data);
    
    // Emit metric event
    this.emit('metric', metricData);
  }

  /**
   * Get metrics for a specific name and time range
   */
  getMetrics(name: string, startTime?: Date, endTime?: Date, tags?: Record<string, string>): MetricData[] {
    const key = `${name}:${JSON.stringify(tags || {})}`;
    const metrics = this.metrics.get(key) || [];
    
    if (!startTime && !endTime) {
      return metrics;
    }
    
    return metrics.filter(metric => {
      const time = metric.timestamp!;
      if (startTime && time < startTime) return false;
      if (endTime && time > endTime) return false;
      return true;
    });
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(
    name: string, 
    aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count',
    startTime?: Date,
    endTime?: Date,
    tags?: Record<string, string>
  ): number {
    const metrics = this.getMetrics(name, startTime, endTime, tags);
    
    if (metrics.length === 0) return 0;
    
    const values = metrics.map(m => m.value);
    
    switch (aggregation) {
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      default:
        return 0;
    }
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    logger.info('Alert rule added', { ruleId: rule.id, ruleName: rule.name });
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
    logger.info('Alert rule removed', { ruleId });
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.status === 'active');
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert && alert.status === 'active') {
      alert.status = 'acknowledged';
      logger.info('Alert acknowledged', { alertId, ruleName: alert.ruleName });
      this.emit('alertAcknowledged', alert);
    }
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert && alert.status !== 'resolved') {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      logger.info('Alert resolved', { alertId, ruleName: alert.ruleName });
      this.emit('alertResolved', alert);
    }
  }

  /**
   * Record application event
   */
  recordEvent(event: string, data: any, userId?: string): void {
    const eventData = {
      event,
      data,
      userId,
      timestamp: new Date()
    };
    
    logger.info('Application event', eventData);
    MetricsLogger.logUserAction(userId || 'system', event, data);
    
    // Record as metric
    this.recordMetric({
      name: 'events.count',
      value: 1,
      unit: 'count',
      tags: { event }
    });
    
    this.emit('event', eventData);
  }

  /**
   * Record error
   */
  recordError(error: Error, context?: any): void {
    ErrorTracker.trackError(error, context);
    
    this.recordMetric({
      name: 'errors.count',
      value: 1,
      unit: 'count',
      tags: { 
        type: error.constructor.name,
        message: error.message.substring(0, 50)
      }
    });
    
    this.emit('error', { error, context, timestamp: new Date() });
  }

  /**
   * Record performance metric
   */
  recordPerformance(operation: string, duration: number, success: boolean = true): void {
    this.recordMetric({
      name: 'performance.duration',
      value: duration,
      unit: 'ms',
      tags: { operation, success: success.toString() }
    });
    
    this.recordMetric({
      name: 'performance.count',
      value: 1,
      unit: 'count',
      tags: { operation, success: success.toString() }
    });
  }

  /**
   * Record security event
   */
  recordSecurityEvent(type: string, details: any, userId?: string, ip?: string): void {
    SecurityLogger.logSuspiciousActivity(type, details, ip || 'unknown');
    
    this.recordMetric({
      name: 'security.events',
      value: 1,
      unit: 'count',
      tags: { type, userId: userId || 'anonymous' }
    });
    
    this.emit('securityEvent', {
      type,
      details,
      userId,
      ip,
      timestamp: new Date()
    });
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<any> {
    const health = await healthCheckService.performHealthCheck();
    
    // Record health metrics
    this.recordMetric({
      name: 'system.health.database',
      value: health.checks.database.status === 'healthy' ? 1 : 0,
      unit: 'boolean'
    });
    
    this.recordMetric({
      name: 'system.health.cache',
      value: health.checks.cache.status === 'healthy' ? 1 : 0,
      unit: 'boolean'
    });
    
    this.recordMetric({
      name: 'system.uptime',
      value: health.uptime,
      unit: 'seconds'
    });
    
    return health;
  }

  /**
   * Get dashboard metrics
   */
  getDashboardMetrics(): any {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    return {
      requests: {
        total: this.getAggregatedMetrics('http.requests', 'sum', oneHourAgo, now),
        errors: this.getAggregatedMetrics('http.errors', 'sum', oneHourAgo, now),
        avgResponseTime: this.getAggregatedMetrics('http.response_time', 'avg', oneHourAgo, now)
      },
      users: {
        active: this.getAggregatedMetrics('users.active', 'max', oneHourAgo, now),
        registrations: this.getAggregatedMetrics('users.registrations', 'sum', oneHourAgo, now)
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      alerts: {
        active: this.getActiveAlerts().length,
        critical: this.getActiveAlerts().filter(a => a.severity === 'critical').length
      }
    };
  }

  /**
   * Setup default alert rules
   */
  private setupDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        metric: 'errors.count',
        condition: 'gt',
        threshold: 10,
        duration: 300, // 5 minutes
        severity: 'high',
        enabled: true,
        channels: ['email', 'slack']
      },
      {
        id: 'high-response-time',
        name: 'High Response Time',
        metric: 'performance.duration',
        condition: 'gt',
        threshold: 5000, // 5 seconds
        duration: 300,
        severity: 'medium',
        enabled: true,
        channels: ['email']
      },
      {
        id: 'database-unhealthy',
        name: 'Database Unhealthy',
        metric: 'system.health.database',
        condition: 'eq',
        threshold: 0,
        duration: 60,
        severity: 'critical',
        enabled: true,
        channels: ['email', 'slack', 'webhook']
      },
      {
        id: 'cache-unhealthy',
        name: 'Cache Unhealthy',
        metric: 'system.health.cache',
        condition: 'eq',
        threshold: 0,
        duration: 300,
        severity: 'medium',
        enabled: true,
        channels: ['email']
      },
      {
        id: 'high-security-events',
        name: 'High Security Events',
        metric: 'security.events',
        condition: 'gt',
        threshold: 5,
        duration: 300,
        severity: 'high',
        enabled: true,
        channels: ['email', 'slack']
      }
    ];
    
    defaultRules.forEach(rule => this.addAlertRule(rule));
  }

  /**
   * Check alert rules against new metric
   */
  private checkAlertRules(metric: MetricData): void {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled || rule.metric !== metric.name) continue;
      
      const now = new Date();
      const startTime = new Date(now.getTime() - rule.duration * 1000);
      
      // Get recent metrics for this rule
      const recentMetrics = this.getMetrics(rule.metric, startTime, now, metric.tags);
      
      if (recentMetrics.length === 0) continue;
      
      // Calculate aggregated value (using average for simplicity)
      const avgValue = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;
      
      // Check condition
      let triggered = false;
      switch (rule.condition) {
        case 'gt':
          triggered = avgValue > rule.threshold;
          break;
        case 'gte':
          triggered = avgValue >= rule.threshold;
          break;
        case 'lt':
          triggered = avgValue < rule.threshold;
          break;
        case 'lte':
          triggered = avgValue <= rule.threshold;
          break;
        case 'eq':
          triggered = avgValue === rule.threshold;
          break;
      }
      
      if (triggered) {
        this.triggerAlert(rule, avgValue);
      } else {
        // Check if we should resolve existing alert
        const existingAlert = Array.from(this.alerts.values())
          .find(a => a.ruleId === rule.id && a.status === 'active');
        
        if (existingAlert) {
          this.resolveAlert(existingAlert.id);
        }
      }
    }
  }

  /**
   * Trigger alert
   */
  private triggerAlert(rule: AlertRule, value: number): void {
    // Check if alert already exists and is active
    const existingAlert = Array.from(this.alerts.values())
      .find(a => a.ruleId === rule.id && a.status === 'active');
    
    if (existingAlert) return; // Don't create duplicate alerts
    
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      metric: rule.metric,
      value,
      threshold: rule.threshold,
      severity: rule.severity,
      message: `${rule.name}: ${rule.metric} is ${value} (threshold: ${rule.threshold})`,
      triggeredAt: new Date(),
      status: 'active'
    };
    
    this.alerts.set(alert.id, alert);
    
    logger.warn('Alert triggered', {
      alertId: alert.id,
      ruleName: rule.name,
      metric: rule.metric,
      value,
      threshold: rule.threshold,
      severity: rule.severity
    });
    
    this.emit('alertTriggered', alert);
    
    // Send notifications
    this.sendAlertNotifications(alert, rule.channels);
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(alert: Alert, channels: string[]): Promise<void> {
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmailAlert(alert);
            break;
          case 'slack':
            await this.sendSlackAlert(alert);
            break;
          case 'webhook':
            await this.sendWebhookAlert(alert);
            break;
        }
      } catch (error) {
        logger.error('Failed to send alert notification', {
          channel,
          alertId: alert.id,
          error: error.message
        });
      }
    }
  }

  /**
   * Send email alert (placeholder)
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    // Implementation would integrate with email service
    logger.info('Email alert sent', { alertId: alert.id });
  }

  /**
   * Send Slack alert (placeholder)
   */
  private async sendSlackAlert(alert: Alert): Promise<void> {
    // Implementation would integrate with Slack API
    logger.info('Slack alert sent', { alertId: alert.id });
  }

  /**
   * Send webhook alert (placeholder)
   */
  private async sendWebhookAlert(alert: Alert): Promise<void> {
    // Implementation would send HTTP POST to webhook URL
    logger.info('Webhook alert sent', { alertId: alert.id });
  }

  /**
   * Start cleanup task for old metrics
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - this.metricsRetentionHours * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [key, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(m => m.timestamp! > cutoffTime);
      
      if (filteredMetrics.length !== metrics.length) {
        this.metrics.set(key, filteredMetrics);
        cleanedCount += metrics.length - filteredMetrics.length;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info('Cleaned up old metrics', { count: cleanedCount });
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        await this.getSystemHealth();
      } catch (error) {
        logger.error('Health monitoring failed', { error: error.message });
      }
    }, 60 * 1000); // Check every minute
  }

  /**
   * Shutdown monitoring service
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    logger.info('Monitoring service shutdown');
  }
}

export const monitoringService = new MonitoringService();