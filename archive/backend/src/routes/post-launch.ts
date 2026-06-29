/**
 * Post-Launch Monitoring and Optimization Routes
 * API endpoints for monitoring, feedback, A/B testing, and continuous improvement
 */

import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import PostLaunchMonitoringService from '../services/PostLaunchMonitoringService';
import UserFeedbackService from '../services/UserFeedbackService';
import ABTestingService from '../services/ABTestingService';
import BugFeatureManagementService from '../services/BugFeatureManagementService';
import PerformanceReportingService from '../services/PerformanceReportingService';
import { logger } from '../utils/logger';

const router = express.Router();

const monitoringService = new PostLaunchMonitoringService();
const feedbackService = new UserFeedbackService();
const abTestingService = new ABTestingService();
const bugFeatureService = new BugFeatureManagementService();
const reportingService = new PerformanceReportingService();

// ============================================================================
// Monitoring Dashboard Routes
// ============================================================================

router.get('/monitoring/metrics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { metricNames, startDate, endDate } = req.query;

    const timeRange = startDate && endDate
      ? { start: new Date(startDate as string), end: new Date(endDate as string) }
      : undefined;

    const metrics = await monitoringService.getRealTimeMetrics(
      metricNames ? (metricNames as string).split(',') : undefined,
      timeRange
    );

    res.json({ success: true, data: metrics });
  } catch (error: any) {
    logger.error('Error fetching metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/monitoring/metrics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, value, unit, tags } = req.body;

    await monitoringService.recordMetric(name, value, unit, tags);

    res.json({ success: true, message: 'Metric recorded successfully' });
  } catch (error: any) {
    logger.error('Error recording metric:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/monitoring/dashboards/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const dashboard = await monitoringService.getDashboard(req.params.id);

    if (!dashboard) {
      return res.status(404).json({ success: false, error: 'Dashboard not found' });
    }

    res.json({ success: true, data: dashboard });
  } catch (error: any) {
    logger.error('Error fetching dashboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/monitoring/dashboards', authenticateToken, async (req: Request, res: Response) => {
  try {
    const dashboard = await monitoringService.createDashboard(req.body);

    res.json({ success: true, data: dashboard });
  } catch (error: any) {
    logger.error('Error creating dashboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/monitoring/alerts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { severity } = req.query;

    const alerts = await monitoringService.getActiveAlerts(severity as string);

    res.json({ success: true, data: alerts });
  } catch (error: any) {
    logger.error('Error fetching alerts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/monitoring/alerts/:id/acknowledge', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    await monitoringService.acknowledgeAlert(req.params.id, userId);

    res.json({ success: true, message: 'Alert acknowledged' });
  } catch (error: any) {
    logger.error('Error acknowledging alert:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/monitoring/alerts/:id/resolve', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    await monitoringService.resolveAlert(req.params.id, userId);

    res.json({ success: true, message: 'Alert resolved' });
  } catch (error: any) {
    logger.error('Error resolving alert:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/monitoring/health', async (req: Request, res: Response) => {
  try {
    const health = await monitoringService.getSystemHealth();

    res.json({ success: true, data: health });
  } catch (error: any) {
    logger.error('Error fetching system health:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// User Feedback Routes
// ============================================================================

router.post('/feedback', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const feedback = await feedbackService.submitFeedback(userId, req.body);

    res.json({ success: true, data: feedback });
  } catch (error: any) {
    logger.error('Error submitting feedback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/feedback', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { type, category, status, severity, limit, offset } = req.query;

    const result = await feedbackService.getAllFeedback({
      type: type as string,
      category: category as any,
      status: status as any,
      severity: severity as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Error fetching feedback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/feedback/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const feedback = await feedbackService.getFeedback(req.params.id);

    if (!feedback) {
      return res.status(404).json({ success: false, error: 'Feedback not found' });
    }

    res.json({ success: true, data: feedback });
  } catch (error: any) {
    logger.error('Error fetching feedback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/feedback/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status, assignedTo } = req.body;

    await feedbackService.updateFeedbackStatus(req.params.id, status, assignedTo);

    res.json({ success: true, message: 'Feedback status updated' });
  } catch (error: any) {
    logger.error('Error updating feedback status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/feedback/:id/vote', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    await feedbackService.voteFeedback(req.params.id, userId);

    res.json({ success: true, message: 'Vote recorded' });
  } catch (error: any) {
    logger.error('Error voting on feedback:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/feedback/:id/comments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { content } = req.body;

    await feedbackService.addComment(req.params.id, userId, content);

    res.json({ success: true, message: 'Comment added' });
  } catch (error: any) {
    logger.error('Error adding comment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/feedback/analytics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const timeRange = startDate && endDate
      ? { start: new Date(startDate as string), end: new Date(endDate as string) }
      : undefined;

    const analytics = await feedbackService.getFeedbackAnalytics(timeRange);

    res.json({ success: true, data: analytics });
  } catch (error: any) {
    logger.error('Error fetching feedback analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// A/B Testing Routes
// ============================================================================

router.post('/ab-tests', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const test = await abTestingService.createTest(userId, req.body);

    res.json({ success: true, data: test });
  } catch (error: any) {
    logger.error('Error creating A/B test:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/ab-tests', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status, feature, limit, offset } = req.query;

    const result = await abTestingService.getAllTests({
      status: status as any,
      feature: feature as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Error fetching A/B tests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/ab-tests/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const test = await abTestingService.getTest(req.params.id);

    if (!test) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }

    res.json({ success: true, data: test });
  } catch (error: any) {
    logger.error('Error fetching A/B test:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/ab-tests/:id/start', authenticateToken, async (req: Request, res: Response) => {
  try {
    await abTestingService.startTest(req.params.id);

    res.json({ success: true, message: 'Test started' });
  } catch (error: any) {
    logger.error('Error starting A/B test:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/ab-tests/:id/pause', authenticateToken, async (req: Request, res: Response) => {
  try {
    await abTestingService.pauseTest(req.params.id);

    res.json({ success: true, message: 'Test paused' });
  } catch (error: any) {
    logger.error('Error pausing A/B test:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/ab-tests/:id/complete', authenticateToken, async (req: Request, res: Response) => {
  try {
    await abTestingService.completeTest(req.params.id);

    res.json({ success: true, message: 'Test completed' });
  } catch (error: any) {
    logger.error('Error completing A/B test:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/ab-tests/:id/assign', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const assignment = await abTestingService.assignUserToVariant(userId, req.params.id);

    res.json({ success: true, data: assignment });
  } catch (error: any) {
    logger.error('Error assigning user to variant:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/ab-tests/:id/conversion', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { value } = req.body;

    await abTestingService.recordConversion(userId, req.params.id, value);

    res.json({ success: true, message: 'Conversion recorded' });
  } catch (error: any) {
    logger.error('Error recording conversion:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Bug Tracking Routes
// ============================================================================

router.post('/bugs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const bug = await bugFeatureService.createBug(userId, req.body);

    res.json({ success: true, data: bug });
  } catch (error: any) {
    logger.error('Error creating bug:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/bugs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { severity, priority, status, assignedTo, limit, offset } = req.query;

    const result = await bugFeatureService.getAllBugs({
      severity: severity as any,
      priority: priority as any,
      status: status as any,
      assignedTo: assignedTo as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Error fetching bugs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/bugs/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const bug = await bugFeatureService.getBug(req.params.id);

    if (!bug) {
      return res.status(404).json({ success: false, error: 'Bug not found' });
    }

    res.json({ success: true, data: bug });
  } catch (error: any) {
    logger.error('Error fetching bug:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/bugs/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status, assignedTo, fixedInVersion } = req.body;

    await bugFeatureService.updateBugStatus(req.params.id, status, assignedTo, fixedInVersion);

    res.json({ success: true, message: 'Bug status updated' });
  } catch (error: any) {
    logger.error('Error updating bug status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/bugs/analytics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const timeRange = startDate && endDate
      ? { start: new Date(startDate as string), end: new Date(endDate as string) }
      : undefined;

    const analytics = await bugFeatureService.getBugAnalytics(timeRange);

    res.json({ success: true, data: analytics });
  } catch (error: any) {
    logger.error('Error fetching bug analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Feature Request Routes
// ============================================================================

router.post('/feature-requests', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const feature = await bugFeatureService.createFeatureRequest(userId, req.body);

    res.json({ success: true, data: feature });
  } catch (error: any) {
    logger.error('Error creating feature request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/feature-requests', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status, priority, category, limit, offset } = req.query;

    const result = await bugFeatureService.getAllFeatureRequests({
      status: status as any,
      priority: priority as any,
      category: category as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Error fetching feature requests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/feature-requests/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const feature = await bugFeatureService.getFeatureRequest(req.params.id);

    if (!feature) {
      return res.status(404).json({ success: false, error: 'Feature request not found' });
    }

    res.json({ success: true, data: feature });
  } catch (error: any) {
    logger.error('Error fetching feature request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/feature-requests/:id/vote', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    await bugFeatureService.voteFeatureRequest(req.params.id, userId);

    res.json({ success: true, message: 'Vote recorded' });
  } catch (error: any) {
    logger.error('Error voting on feature request:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

router.patch('/feature-requests/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status, assignedTo, targetRelease } = req.body;

    await bugFeatureService.updateFeatureRequestStatus(
      req.params.id,
      status,
      assignedTo,
      targetRelease
    );

    res.json({ success: true, message: 'Feature request status updated' });
  } catch (error: any) {
    logger.error('Error updating feature request status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Performance Reporting Routes
// ============================================================================

router.post('/reports/generate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const report = await reportingService.generateReport(req.body, userId);

    res.json({ success: true, data: report });
  } catch (error: any) {
    logger.error('Error generating report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { type, limit, offset } = req.query;

    const result = await reportingService.getAllReports({
      type: type as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Error fetching reports:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const report = await reportingService.getReport(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    res.json({ success: true, data: report });
  } catch (error: any) {
    logger.error('Error fetching report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/reports/schedules', authenticateToken, async (req: Request, res: Response) => {
  try {
    const schedule = await reportingService.createReportSchedule(req.body);

    res.json({ success: true, data: schedule });
  } catch (error: any) {
    logger.error('Error creating report schedule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Continuous Improvement Routes
// ============================================================================

router.post('/initiatives', authenticateToken, async (req: Request, res: Response) => {
  try {
    const initiative = await reportingService.createInitiative(req.body);

    res.json({ success: true, data: initiative });
  } catch (error: any) {
    logger.error('Error creating initiative:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/initiatives/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status, results } = req.body;

    await reportingService.updateInitiativeStatus(req.params.id, status, results);

    res.json({ success: true, message: 'Initiative status updated' });
  } catch (error: any) {
    logger.error('Error updating initiative status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/retrospectives', authenticateToken, async (req: Request, res: Response) => {
  try {
    const retrospective = await reportingService.createRetrospective(req.body);

    res.json({ success: true, data: retrospective });
  } catch (error: any) {
    logger.error('Error creating retrospective:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
