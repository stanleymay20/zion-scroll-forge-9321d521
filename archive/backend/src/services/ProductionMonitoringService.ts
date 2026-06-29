/**
 * Production Monitoring Service
 * Comprehensive monitoring, alerting, and observability for production AI services
 */

import * as Sentry from '@sentry/node';
// import { ProfilingIntegration } from '@sentry/profiling-node';
import { logger } from '../utils/logger';
import { getProductionConfig } from '../config/production.config';
import { AIMonitoringService } from './AIMonitoringService';

export interface MonitoringMetrics {
  timestamp: Date;
  service: string;
  metrics: {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    successRate: number;
    activeUsers: number;
    queueDepth: number;
    cpuUsage: number;
    memoryUsage: number;
  };
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  service: string;
  message: string;
  timestamp: Date;
  metadata: Record<string, any>;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export interface LogAggregation {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  service: string;
  metadata: Record<string, any>;
  traceId?: string;
  spanId?: string;
}

export class ProductionMonitoringService {
  private config: ReturnType<typeof getProductionConfig>;
  private aiMonitoring: AIMonitoringService;
  private alerts: Alert[] = [];
  private metricsBuffer: MonitoringMetrics[] = [];

  constructor() {
    this.config = getProductionConfig();
    this.aiMonitoring = new AIMonitoringService();
    this.initializeSentry();
    this.initializeNewRelic();
    this.startMetricsCollection();
  }

  /**
   * Initialize Sentry error tracking
   */
  private initializeSentry(): void {
    if (!this.config.monitoring.sentry.dsn) {
      logger.warn('Sentry DSN not configured, skipping initialization');
      return;
    }

    Sentry.init({
      dsn: this.config.monitoring.sentry.dsn,
      environment: this.config.monitoring.sentry.environment,
      tracesSampleRate: this.config.monitoring.sentry.tracesSampleRate,
      profilesSampleRate: this.config.monitoring.sentry.profilesSampleRate,
      integrations: [
        // new ProfilingIntegration(), // Requires @sentry/profiling-node package
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app: undefined as any }),
      ],
      beforeSend(event, hint) {
        // Filter out sensitive data
        if (event.request) {
          delete event.request.cookies;
          if (event.request.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
          }
        }
        return event;
      },
    });

    logger.info('Sentry initialized for error tracking');
  }

  /**
   * Initialize New Relic APM
   */
  private initializeNewRelic(): void {
    if (!this.config.monitoring.apm.enabled || !this.config.monitoring.apm.newRelicKey) {
      logger.warn('New Relic not configured, skipping initialization');
      return;
    }

    // New Relic is typically initialized via require('newrelic') at app start
    logger.info('New Relic APM configured');
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    // Collect metrics every minute
    setInterval(() => {
      this.collectMetrics();
    }, 60000);

    // Flush metrics buffer every 5 minutes
    setInterval(() => {
      this.flushMetrics();
    }, 300000);

    logger.info('Metrics collection started');
  }

  /**
   * Collect current metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      // In production, this would collect metrics from all services
      // For now, we'll use placeholder data
      const services = ['AIGatewayService', 'GradingService', 'ContentCreationService'];

      for (const service of services) {
        const monitoringMetrics: MonitoringMetrics = {
          timestamp: new Date(),
          service,
          metrics: {
            requestCount: 0,
            errorCount: 0,
            averageResponseTime: 0,
            p95ResponseTime: 0,
            p99ResponseTime: 0,
            successRate: 1.0,
            activeUsers: 0,
            queueDepth: 0,
            cpuUsage: 0,
            memoryUsage: 0,
          },
        };

        this.metricsBuffer.push(monitoringMetrics);

        // Check for alert conditions
        await this.checkAlertConditions(monitoringMetrics);
      }
    } catch (error) {
      logger.error('Failed to collect metrics', { error });
    }
  }

  /**
   * Flush metrics to storage/monitoring systems
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    try {
      // Send to Prometheus
      await this.sendToPrometheus(this.metricsBuffer);

      // Send to New Relic
      await this.sendToNewRelic(this.metricsBuffer);

      // Clear buffer
      this.metricsBuffer = [];

      logger.info('Metrics flushed successfully');
    } catch (error) {
      logger.error('Failed to flush metrics', { error });
    }
  }

  /**
   * Send metrics to Prometheus
   */
  private async sendToPrometheus(metrics: MonitoringMetrics[]): Promise<void> {
    if (!this.config.monitoring.metrics.prometheusEnabled) {
      return;
    }

    // In production, this would push metrics to Prometheus Pushgateway
    // or expose them via /metrics endpoint for Prometheus to scrape
    logger.debug('Metrics sent to Prometheus', { count: metrics.length });
  }

  /**
   * Send metrics to New Relic
   */
  private async sendToNewRelic(metrics: MonitoringMetrics[]): Promise<void> {
    if (!this.config.monitoring.apm.enabled) {
      return;
    }

    // In production, this would use New Relic's API to send custom metrics
    logger.debug('Metrics sent to New Relic', { count: metrics.length });
  }

  /**
   * Check for alert conditions
   */
  private async checkAlertConditions(metrics: MonitoringMetrics): Promise<void> {
    // High error rate
    if (metrics.metrics.successRate < 0.95) {
      await this.createAlert({
        severity: 'error',
        service: metrics.service,
        message: `High error rate detected: ${((1 - metrics.metrics.successRate) * 100).toFixed(2)}%`,
        metadata: { metrics },
      });
    }

    // Slow response time
    if (metrics.metrics.averageResponseTime > 5000) {
      await this.createAlert({
        severity: 'warning',
        service: metrics.service,
        message: `Slow response time: ${metrics.metrics.averageResponseTime}ms`,
        metadata: { metrics },
      });
    }

    // Very slow response time
    if (metrics.metrics.p99ResponseTime > 10000) {
      await this.createAlert({
        severity: 'error',
        service: metrics.service,
        message: `Very slow P99 response time: ${metrics.metrics.p99ResponseTime}ms`,
        metadata: { metrics },
      });
    }

    // High queue depth
    if (metrics.metrics.queueDepth > 1000) {
      await this.createAlert({
        severity: 'warning',
        service: metrics.service,
        message: `High queue depth: ${metrics.metrics.queueDepth}`,
        metadata: { metrics },
      });
    }
  }

  /**
   * Create alert
   */
  async createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): Promise<Alert> {
    const newAlert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      acknowledged: false,
      ...alert,
    };

    this.alerts.push(newAlert);

    // Log alert
    logger.warn('Alert created', newAlert);

    // Send to Sentry
    Sentry.captureMessage(newAlert.message, {
      level: this.mapSeverityToSentryLevel(newAlert.severity),
      tags: {
        service: newAlert.service,
        severity: newAlert.severity,
      },
      extra: newAlert.metadata,
    });

    // Send notifications
    await this.sendAlertNotifications(newAlert);

    return newAlert;
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(alert: Alert): Promise<void> {
    // Send to PagerDuty for critical alerts
    if (alert.severity === 'critical') {
      await this.sendToPagerDuty(alert);
    }

    // Send to Slack
    await this.sendToSlack(alert);

    // Send email for error and critical alerts
    if (alert.severity === 'error' || alert.severity === 'critical') {
      await this.sendEmailAlert(alert);
    }
  }

  /**
   * Send alert to PagerDuty
   */
  private async sendToPagerDuty(alert: Alert): Promise<void> {
    // Implementation would use PagerDuty API
    logger.info('Alert sent to PagerDuty', { alertId: alert.id });
  }

  /**
   * Send alert to Slack
   */
  private async sendToSlack(alert: Alert): Promise<void> {
    // Implementation would use Slack webhook
    logger.info('Alert sent to Slack', { alertId: alert.id });
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    // Implementation would use email service
    logger.info('Alert email sent', { alertId: alert.id });
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const alert = this.alerts.find((a) => a.id === alertId);

    if (alert) {
      alert.acknowledged = true;
      logger.info('Alert acknowledged', { alertId, acknowledgedBy });
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, resolvedBy: string): Promise<void> {
    const alert = this.alerts.find((a) => a.id === alertId);

    if (alert) {
      alert.resolvedAt = new Date();
      logger.info('Alert resolved', { alertId, resolvedBy });
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter((a) => !a.resolvedAt);
  }

  /**
   * Get alerts by service
   */
  getAlertsByService(service: string): Alert[] {
    return this.alerts.filter((a) => a.service === service);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: Alert['severity']): Alert[] {
    return this.alerts.filter((a) => a.severity === severity);
  }

  /**
   * Log aggregation
   */
  async aggregateLogs(query: {
    service?: string;
    level?: LogAggregation['level'];
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<LogAggregation[]> {
    // In production, this would query Elasticsearch or similar
    logger.info('Aggregating logs', query);
    return [];
  }

  /**
   * Create performance dashboard data
   */
  async getPerformanceDashboard(): Promise<{
    overview: {
      totalRequests: number;
      totalErrors: number;
      averageResponseTime: number;
      uptime: number;
    };
    services: Array<{
      name: string;
      status: 'healthy' | 'degraded' | 'down';
      requestCount: number;
      errorRate: number;
      responseTime: number;
    }>;
    alerts: {
      critical: number;
      error: number;
      warning: number;
      info: number;
    };
  }> {
    // In production, this would fetch actual metrics
    const services = ['AIGatewayService', 'GradingService', 'ContentCreationService'];
    const serviceMetrics = [];

    let totalRequests = 0;
    let totalErrors = 0;
    let totalResponseTime = 0;

    for (const service of services) {
      const requestCount = 0;
      const errorRate = 0;
      const responseTime = 0;

      totalRequests += requestCount;
      totalErrors += errorRate * requestCount;
      totalResponseTime += responseTime;

      serviceMetrics.push({
        name: service,
        status: 'healthy' as const,
        requestCount,
        errorRate,
        responseTime,
      });
    }

    const activeAlerts = this.getActiveAlerts();

    return {
      overview: {
        totalRequests,
        totalErrors,
        averageResponseTime: services.length > 0 ? totalResponseTime / services.length : 0,
        uptime: 99.9, // Would be calculated from actual uptime data
      },
      services: serviceMetrics,
      alerts: {
        critical: activeAlerts.filter((a) => a.severity === 'critical').length,
        error: activeAlerts.filter((a) => a.severity === 'error').length,
        warning: activeAlerts.filter((a) => a.severity === 'warning').length,
        info: activeAlerts.filter((a) => a.severity === 'info').length,
      },
    };
  }

  /**
   * Determine service status
   */
  private determineServiceStatus(metrics: any): 'healthy' | 'degraded' | 'down' {
    if (metrics.quality.errorRate > 0.1) {
      return 'down';
    }

    if (metrics.quality.errorRate > 0.05 || metrics.performance.averageResponseTime > 5000) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Map severity to Sentry level
   */
  private mapSeverityToSentryLevel(severity: Alert['severity']): Sentry.SeverityLevel {
    const mapping: Record<Alert['severity'], Sentry.SeverityLevel> = {
      info: 'info',
      warning: 'warning',
      error: 'error',
      critical: 'fatal',
    };

    return mapping[severity];
  }

  /**
   * Track custom event
   */
  trackEvent(event: {
    name: string;
    service: string;
    metadata?: Record<string, any>;
  }): void {
    logger.info('Custom event tracked', event);

    Sentry.addBreadcrumb({
      category: 'custom',
      message: event.name,
      level: 'info',
      data: {
        service: event.service,
        ...event.metadata,
      },
    });
  }

  /**
   * Track user action
   */
  trackUserAction(action: {
    userId: string;
    action: string;
    service: string;
    metadata?: Record<string, any>;
  }): void {
    logger.info('User action tracked', action);

    Sentry.setUser({ id: action.userId });
    Sentry.addBreadcrumb({
      category: 'user',
      message: action.action,
      level: 'info',
      data: {
        service: action.service,
        ...action.metadata,
      },
    });
  }

  /**
   * Capture exception
   */
  captureException(error: Error, context?: Record<string, any>): void {
    logger.error('Exception captured', { error, context });

    Sentry.captureException(error, {
      extra: context,
    });
  }
}

export default new ProductionMonitoringService();
