/**
 * Monitoring Routes
 * API endpoints for monitoring, health checks, and metrics
 */

import express, { Request, Response } from 'express';
import ProductionMonitoringService from '../services/ProductionMonitoringService';
import { AIMonitoringService } from '../services/AIMonitoringService';
import { logger } from '../utils/logger';

const router = express.Router();
const monitoringService = ProductionMonitoringService;
const aiMonitoring = new AIMonitoringService();

/**
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.DEPLOYMENT_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    res.status(200).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Readiness check endpoint
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if all critical services are ready
    // In production, this would check actual service readiness
    const allReady = true;

    if (allReady) {
      res.status(200).json({
        status: 'ready',
        services: 15, // Number of AI services
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        message: 'Services not initialized',
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Liveness check endpoint
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Prometheus metrics endpoint
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const dashboard = await monitoringService.getPerformanceDashboard();

    // Format metrics in Prometheus format
    let metrics = '';

    // Overview metrics
    metrics += `# HELP scrolluniversity_requests_total Total number of requests\n`;
    metrics += `# TYPE scrolluniversity_requests_total counter\n`;
    metrics += `scrolluniversity_requests_total ${dashboard.overview.totalRequests}\n\n`;

    metrics += `# HELP scrolluniversity_errors_total Total number of errors\n`;
    metrics += `# TYPE scrolluniversity_errors_total counter\n`;
    metrics += `scrolluniversity_errors_total ${dashboard.overview.totalErrors}\n\n`;

    metrics += `# HELP scrolluniversity_response_time_ms Average response time in milliseconds\n`;
    metrics += `# TYPE scrolluniversity_response_time_ms gauge\n`;
    metrics += `scrolluniversity_response_time_ms ${dashboard.overview.averageResponseTime}\n\n`;

    metrics += `# HELP scrolluniversity_uptime_percent System uptime percentage\n`;
    metrics += `# TYPE scrolluniversity_uptime_percent gauge\n`;
    metrics += `scrolluniversity_uptime_percent ${dashboard.overview.uptime}\n\n`;

    // Service metrics
    for (const service of dashboard.services) {
      metrics += `# HELP scrolluniversity_service_requests_total Total requests per service\n`;
      metrics += `# TYPE scrolluniversity_service_requests_total counter\n`;
      metrics += `scrolluniversity_service_requests_total{service="${service.name}"} ${service.requestCount}\n\n`;

      metrics += `# HELP scrolluniversity_service_error_rate Error rate per service\n`;
      metrics += `# TYPE scrolluniversity_service_error_rate gauge\n`;
      metrics += `scrolluniversity_service_error_rate{service="${service.name}"} ${service.errorRate}\n\n`;

      metrics += `# HELP scrolluniversity_service_response_time_ms Response time per service\n`;
      metrics += `# TYPE scrolluniversity_service_response_time_ms gauge\n`;
      metrics += `scrolluniversity_service_response_time_ms{service="${service.name}"} ${service.responseTime}\n\n`;

      metrics += `# HELP scrolluniversity_service_status Service status (0=down, 1=degraded, 2=healthy)\n`;
      metrics += `# TYPE scrolluniversity_service_status gauge\n`;
      const statusValue = service.status === 'healthy' ? 2 : service.status === 'degraded' ? 1 : 0;
      metrics += `scrolluniversity_service_status{service="${service.name}"} ${statusValue}\n\n`;
    }

    // Alert metrics
    metrics += `# HELP scrolluniversity_alerts_active Active alerts by severity\n`;
    metrics += `# TYPE scrolluniversity_alerts_active gauge\n`;
    metrics += `scrolluniversity_alerts_active{severity="critical"} ${dashboard.alerts.critical}\n`;
    metrics += `scrolluniversity_alerts_active{severity="error"} ${dashboard.alerts.error}\n`;
    metrics += `scrolluniversity_alerts_active{severity="warning"} ${dashboard.alerts.warning}\n`;
    metrics += `scrolluniversity_alerts_active{severity="info"} ${dashboard.alerts.info}\n\n`;

    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    logger.error('Failed to generate metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate metrics',
    });
  }
});

/**
 * Get performance dashboard
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const dashboard = await monitoringService.getPerformanceDashboard();

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    logger.error('Failed to get dashboard', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard',
    });
  }
});

/**
 * Get active alerts
 */
router.get('/alerts', (req: Request, res: Response) => {
  try {
    const { severity, service } = req.query;

    let alerts = monitoringService.getActiveAlerts();

    if (severity) {
      alerts = monitoringService.getAlertsBySeverity(severity as any);
    }

    if (service) {
      alerts = monitoringService.getAlertsByService(service as string);
    }

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    logger.error('Failed to get alerts', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get alerts',
    });
  }
});

/**
 * Acknowledge alert
 */
router.post('/alerts/:alertId/acknowledge', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { acknowledgedBy } = req.body;

    await monitoringService.acknowledgeAlert(alertId, acknowledgedBy);

    res.json({
      success: true,
      message: 'Alert acknowledged',
    });
  } catch (error) {
    logger.error('Failed to acknowledge alert', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert',
    });
  }
});

/**
 * Resolve alert
 */
router.post('/alerts/:alertId/resolve', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { resolvedBy } = req.body;

    await monitoringService.resolveAlert(alertId, resolvedBy);

    res.json({
      success: true,
      message: 'Alert resolved',
    });
  } catch (error) {
    logger.error('Failed to resolve alert', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
    });
  }
});

/**
 * Get logs
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const { service, level, startTime, endTime, limit } = req.query;

    const logs = await monitoringService.aggregateLogs({
      service: service as string,
      level: level as any,
      startTime: startTime ? new Date(startTime as string) : undefined,
      endTime: endTime ? new Date(endTime as string) : undefined,
      limit: limit ? parseInt(limit as string, 10) : 100,
    });

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    logger.error('Failed to get logs', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get logs',
    });
  }
});

/**
 * Track custom event
 */
router.post('/events', (req: Request, res: Response) => {
  try {
    const { name, service, metadata } = req.body;

    monitoringService.trackEvent({
      name,
      service,
      metadata,
    });

    res.json({
      success: true,
      message: 'Event tracked',
    });
  } catch (error) {
    logger.error('Failed to track event', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to track event',
    });
  }
});

export default router;
