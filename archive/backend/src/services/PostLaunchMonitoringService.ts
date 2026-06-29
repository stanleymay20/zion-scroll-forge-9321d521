/**
 * Post-Launch Monitoring Service
 * Comprehensive monitoring, feedback collection, and continuous improvement
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  MonitoringDashboard,
  RealTimeMetric,
  MonitoringAlert,
  AlertRule,
  TimeRange,
} from '../types/post-launch.types';

const prisma = new PrismaClient();

export default class PostLaunchMonitoringService {
  /**
   * Get real-time metrics for monitoring dashboard
   */
  async getRealTimeMetrics(
    metricNames?: string[],
    timeRange?: TimeRange
  ): Promise<RealTimeMetric[]> {
    try {
      const whereClause: any = {};

      if (metricNames && metricNames.length > 0) {
        whereClause.name = { in: metricNames };
      }

      if (timeRange) {
        whereClause.timestamp = {
          gte: timeRange.start,
          lte: timeRange.end,
        };
      }

      const metrics = await prisma.$queryRaw<any[]>`
        SELECT 
          name,
          value,
          unit,
          tags,
          timestamp
        FROM real_time_metrics
        ${metricNames && metricNames.length > 0 ? `WHERE name = ANY(${metricNames})` : ''}
        ${timeRange ? `AND timestamp BETWEEN ${timeRange.start} AND ${timeRange.end}` : ''}
        ORDER BY timestamp DESC
        LIMIT 1000
      `;

      return metrics.map((m) => ({
        name: m.name,
        value: parseFloat(m.value),
        unit: m.unit,
        timestamp: m.timestamp,
        tags: m.tags || {},
      }));
    } catch (error) {
      logger.error('Error fetching real-time metrics:', error);
      throw new Error('Failed to fetch real-time metrics');
    }
  }

  /**
   * Record a real-time metric
   */
  async recordMetric(
    name: string,
    value: number,
    unit: string,
    tags?: Record<string, string>
  ): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO real_time_metrics (id, name, value, unit, tags, timestamp)
        VALUES (
          gen_random_uuid()::text,
          ${name},
          ${value},
          ${unit},
          ${JSON.stringify(tags || {})}::jsonb,
          NOW()
        )
      `;

      // Check alert rules
      await this.checkAlertRules(name, value);
    } catch (error) {
      logger.error('Error recording metric:', error);
      throw new Error('Failed to record metric');
    }
  }

  /**
   * Get monitoring dashboard configuration
   */
  async getDashboard(dashboardId: string): Promise<MonitoringDashboard | null> {
    try {
      const dashboard = await prisma.$queryRaw<any[]>`
        SELECT * FROM monitoring_dashboards
        WHERE id = ${dashboardId}
      `;

      if (dashboard.length === 0) {
        return null;
      }

      return {
        id: dashboard[0].id,
        name: dashboard[0].name,
        description: dashboard[0].description,
        widgets: dashboard[0].widgets,
        refreshInterval: dashboard[0].refresh_interval,
        createdAt: dashboard[0].created_at,
        updatedAt: dashboard[0].updated_at,
      };
    } catch (error) {
      logger.error('Error fetching dashboard:', error);
      throw new Error('Failed to fetch dashboard');
    }
  }

  /**
   * Create a monitoring dashboard
   */
  async createDashboard(
    dashboard: Omit<MonitoringDashboard, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MonitoringDashboard> {
    try {
      const result = await prisma.$queryRaw<any[]>`
        INSERT INTO monitoring_dashboards (
          id, name, description, widgets, refresh_interval, created_at, updated_at
        )
        VALUES (
          gen_random_uuid()::text,
          ${dashboard.name},
          ${dashboard.description},
          ${JSON.stringify(dashboard.widgets)}::jsonb,
          ${dashboard.refreshInterval},
          NOW(),
          NOW()
        )
        RETURNING *
      `;

      return {
        id: result[0].id,
        name: result[0].name,
        description: result[0].description,
        widgets: result[0].widgets,
        refreshInterval: result[0].refresh_interval,
        createdAt: result[0].created_at,
        updatedAt: result[0].updated_at,
      };
    } catch (error) {
      logger.error('Error creating dashboard:', error);
      throw new Error('Failed to create dashboard');
    }
  }

  /**
   * Get active monitoring alerts
   */
  async getActiveAlerts(severity?: string): Promise<MonitoringAlert[]> {
    try {
      const whereClause = severity ? `AND severity = '${severity}'` : '';

      const alerts = await prisma.$queryRaw<any[]>`
        SELECT * FROM monitoring_alerts
        WHERE status = 'active' ${whereClause}
        ORDER BY created_at DESC
      `;

      return alerts.map((a) => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        title: a.title,
        message: a.message,
        metric: a.metric,
        threshold: parseFloat(a.threshold),
        currentValue: parseFloat(a.current_value),
        status: a.status,
        acknowledgedBy: a.acknowledged_by,
        acknowledgedAt: a.acknowledged_at,
        resolvedBy: a.resolved_by,
        resolvedAt: a.resolved_at,
        notificationsSent: a.notifications_sent || [],
        createdAt: a.created_at,
      }));
    } catch (error) {
      logger.error('Error fetching active alerts:', error);
      throw new Error('Failed to fetch active alerts');
    }
  }

  /**
   * Create a monitoring alert
   */
  async createAlert(
    alert: Omit<MonitoringAlert, 'id' | 'createdAt' | 'status' | 'notificationsSent'>
  ): Promise<MonitoringAlert> {
    try {
      const result = await prisma.$queryRaw<any[]>`
        INSERT INTO monitoring_alerts (
          id, type, severity, title, message, metric, threshold, current_value,
          status, notifications_sent, created_at
        )
        VALUES (
          gen_random_uuid()::text,
          ${alert.type},
          ${alert.severity},
          ${alert.title},
          ${alert.message},
          ${alert.metric},
          ${alert.threshold},
          ${alert.currentValue},
          'active',
          ARRAY[]::text[],
          NOW()
        )
        RETURNING *
      `;

      logger.warn(`Alert created: ${alert.title}`, {
        severity: alert.severity,
        metric: alert.metric,
        threshold: alert.threshold,
        currentValue: alert.currentValue,
      });

      return {
        id: result[0].id,
        type: result[0].type,
        severity: result[0].severity,
        title: result[0].title,
        message: result[0].message,
        metric: result[0].metric,
        threshold: parseFloat(result[0].threshold),
        currentValue: parseFloat(result[0].current_value),
        status: result[0].status,
        notificationsSent: result[0].notifications_sent || [],
        createdAt: result[0].created_at,
      };
    } catch (error) {
      logger.error('Error creating alert:', error);
      throw new Error('Failed to create alert');
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE monitoring_alerts
        SET 
          status = 'acknowledged',
          acknowledged_by = ${userId},
          acknowledged_at = NOW()
        WHERE id = ${alertId}
      `;

      logger.info(`Alert acknowledged: ${alertId} by user ${userId}`);
    } catch (error) {
      logger.error('Error acknowledging alert:', error);
      throw new Error('Failed to acknowledge alert');
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, userId: string): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE monitoring_alerts
        SET 
          status = 'resolved',
          resolved_by = ${userId},
          resolved_at = NOW()
        WHERE id = ${alertId}
      `;

      logger.info(`Alert resolved: ${alertId} by user ${userId}`);
    } catch (error) {
      logger.error('Error resolving alert:', error);
      throw new Error('Failed to resolve alert');
    }
  }

  /**
   * Get alert rules
   */
  async getAlertRules(enabled?: boolean): Promise<AlertRule[]> {
    try {
      const whereClause = enabled !== undefined ? `WHERE enabled = ${enabled}` : '';

      const rules = await prisma.$queryRaw<any[]>`
        SELECT * FROM alert_rules
        ${whereClause}
        ORDER BY created_at DESC
      `;

      return rules.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        metric: r.metric,
        condition: r.condition,
        severity: r.severity,
        notificationChannels: r.notification_channels || [],
        enabled: r.enabled,
        cooldownPeriod: r.cooldown_period,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch (error) {
      logger.error('Error fetching alert rules:', error);
      throw new Error('Failed to fetch alert rules');
    }
  }

  /**
   * Create an alert rule
   */
  async createAlertRule(
    rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AlertRule> {
    try {
      const result = await prisma.$queryRaw<any[]>`
        INSERT INTO alert_rules (
          id, name, description, metric, condition, severity,
          notification_channels, enabled, cooldown_period, created_at, updated_at
        )
        VALUES (
          gen_random_uuid()::text,
          ${rule.name},
          ${rule.description},
          ${rule.metric},
          ${JSON.stringify(rule.condition)}::jsonb,
          ${rule.severity},
          ARRAY[${rule.notificationChannels.join(',')}]::text[],
          ${rule.enabled},
          ${rule.cooldownPeriod},
          NOW(),
          NOW()
        )
        RETURNING *
      `;

      return {
        id: result[0].id,
        name: result[0].name,
        description: result[0].description,
        metric: result[0].metric,
        condition: result[0].condition,
        severity: result[0].severity,
        notificationChannels: result[0].notification_channels || [],
        enabled: result[0].enabled,
        cooldownPeriod: result[0].cooldown_period,
        createdAt: result[0].created_at,
        updatedAt: result[0].updated_at,
      };
    } catch (error) {
      logger.error('Error creating alert rule:', error);
      throw new Error('Failed to create alert rule');
    }
  }

  /**
   * Check alert rules against a metric value
   */
  private async checkAlertRules(metricName: string, value: number): Promise<void> {
    try {
      const rules = await this.getAlertRules(true);
      const matchingRules = rules.filter((r) => r.metric === metricName);

      for (const rule of matchingRules) {
        const condition = rule.condition;
        let triggered = false;

        switch (condition.operator) {
          case '>':
            triggered = value > condition.threshold;
            break;
          case '<':
            triggered = value < condition.threshold;
            break;
          case '>=':
            triggered = value >= condition.threshold;
            break;
          case '<=':
            triggered = value <= condition.threshold;
            break;
          case '==':
            triggered = value === condition.threshold;
            break;
          case '!=':
            triggered = value !== condition.threshold;
            break;
        }

        if (triggered) {
          // Check if there's already an active alert for this rule (cooldown)
          const recentAlerts = await prisma.$queryRaw<any[]>`
            SELECT * FROM monitoring_alerts
            WHERE metric = ${metricName}
              AND status = 'active'
              AND created_at > NOW() - INTERVAL '${rule.cooldownPeriod} minutes'
          `;

          if (recentAlerts.length === 0) {
            await this.createAlert({
              type: 'custom',
              severity: rule.severity,
              title: `Alert: ${rule.name}`,
              message: `Metric ${metricName} triggered alert rule: ${rule.description}`,
              metric: metricName,
              threshold: condition.threshold,
              currentValue: value,
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error checking alert rules:', error);
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    metrics: Record<string, any>;
    alerts: number;
  }> {
    try {
      // Get recent metrics
      const recentMetrics = await this.getRealTimeMetrics(
        ['cpu_usage', 'memory_usage', 'response_time', 'error_rate'],
        {
          start: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
          end: new Date(),
        }
      );

      // Get active alerts
      const activeAlerts = await this.getActiveAlerts();
      const criticalAlerts = activeAlerts.filter((a) => a.severity === 'critical');

      // Determine system status
      let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (criticalAlerts.length > 0) {
        status = 'critical';
      } else if (activeAlerts.length > 5) {
        status = 'degraded';
      }

      // Aggregate metrics
      const metrics: Record<string, any> = {};
      for (const metric of recentMetrics) {
        if (!metrics[metric.name]) {
          metrics[metric.name] = {
            current: metric.value,
            unit: metric.unit,
            samples: 1,
          };
        } else {
          metrics[metric.name].samples++;
        }
      }

      return {
        status,
        metrics,
        alerts: activeAlerts.length,
      };
    } catch (error) {
      logger.error('Error getting system health:', error);
      throw new Error('Failed to get system health');
    }
  }

  /**
   * Clean up old metrics (data retention)
   */
  async cleanupOldMetrics(daysToKeep: number = 30): Promise<number> {
    try {
      const result = await prisma.$executeRaw`
        DELETE FROM real_time_metrics
        WHERE timestamp < NOW() - INTERVAL '${daysToKeep} days'
      `;

      logger.info(`Cleaned up ${result} old metrics`);
      return result as number;
    } catch (error) {
      logger.error('Error cleaning up old metrics:', error);
      throw new Error('Failed to cleanup old metrics');
    }
  }
}
