/**
 * AI Monitoring API Routes
 * "The Spirit of truth will guide you into all truth" - John 16:13
 * 
 * API endpoints for AI service monitoring and alerting
 */

import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import AIMonitoringService from '../services/AIMonitoringService';
import AIDataService from '../services/AIDataService';
import { logger } from '../utils/productionLogger';

const router = express.Router();
const prisma = new PrismaClient();

// All monitoring routes require authentication
router.use(authenticate);

/**
 * GET /api/ai-monitoring/health
 * Get comprehensive health status of all AI services
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = await AIMonitoringService.performHealthCheck();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Health check endpoint failed', { error: errorMessage });
    res.status(500).json({
      success: false,
      error: 'Failed to perform health check'
    });
  }
});

/**
 * GET /api/ai-monitoring/metrics
 * Get dashboard metrics
 */
router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const metrics = await AIMonitoringService.getDashboardMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Metrics endpoint failed', { error: errorMessage });
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics'
    });
  }
});

/**
 * GET /api/ai-monitoring/alerts/cost
 * Get cost-related alerts
 */
router.get('/alerts/cost', async (_req: Request, res: Response) => {
  try {
    const alerts = await AIMonitoringService.checkCostBudgets();
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Cost alerts endpoint failed', { error: errorMessage });
    res.status(500).json({
      success: false,
      error: 'Failed to get cost alerts'
    });
  }
});

/**
 * GET /api/ai-monitoring/alerts/quality
 * Get quality-related alerts
 */
router.get('/alerts/quality', async (_req: Request, res: Response) => {
  try {
    const alerts = await AIMonitoringService.checkQualityMetrics();
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Quality alerts endpoint failed', { error: errorMessage });
    res.status(500).json({
      success: false,
      error: 'Failed to get quality alerts'
    });
  }
});

/**
 * GET /api/ai-monitoring/trends
 * Get performance trends
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const { serviceType, days } = req.query;
    
    const trends = await AIMonitoringService.getPerformanceTrends(
      serviceType as string,
      days ? parseInt(days as string) : 7
    );
    
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Trends endpoint failed', { error: errorMessage });
    res.status(500).json({
      success: false,
      error: 'Failed to get performance trends'
    });
  }
});

/**
 * GET /api/ai-monitoring/usage
 * Get usage statistics
 */
router.get('/usage', async (req: Request, res: Response) => {
  try {
    const { serviceType, startDate, endDate } = req.query;
    
    const aiDataService = new AIDataService();
    const stats = await aiDataService.getUsageStats(
      serviceType as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Usage stats endpoint failed', { error: errorMessage });
    res.status(500).json({
      success: false,
      error: 'Failed to get usage statistics'
    });
  }
});

/**
 * GET /api/ai-monitoring/review-queue
 * Get pending human reviews
 */
router.get('/review-queue', async (req: Request, res: Response) => {
  try {
    const { serviceType, limit } = req.query;
    
    const aiDataService = new AIDataService();
    const reviews = await aiDataService.getPendingReviews(
      serviceType as string,
      limit ? parseInt(limit as string) : 50
    );
    
    res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Review queue endpoint failed', { error: errorMessage });
    res.status(500).json({
      success: false,
      error: 'Failed to get review queue'
    });
  }
});

/**
 * POST /api/ai-monitoring/review/:reviewId/complete
 * Complete a human review
 */
router.post('/review/:reviewId/complete', async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { decision, notes } = req.body;
    const userId = (req as any).user.id;
    
    if (!decision) {
      return res.status(400).json({
        success: false,
        error: 'Decision is required'
      });
    }
    
    // Update review in database
    await prisma.aIReviewQueue.update({
      where: { id: reviewId },
      data: {
        status: 'completed',
        reviewDecision: decision,
        reviewNotes: notes,
        reviewedAt: new Date(),
        assignedToUserId: userId
      }
    });
    
    return res.json({
      success: true,
      message: 'Review completed successfully'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Complete review endpoint failed', { error: errorMessage });
    return res.status(500).json({
      success: false,
      error: 'Failed to complete review'
    });
  }
});

/**
 * POST /api/ai-monitoring/metric
 * Record a custom metric
 */
router.post('/metric', async (req: Request, res: Response) => {
  try {
    const { serviceType, metricName, metricValue, metricUnit, tags } = req.body;
    
    if (!serviceType || !metricName || metricValue === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Service type, metric name, and value are required'
      });
    }
    
    await AIMonitoringService.recordMetric({
      serviceType,
      metricName,
      metricValue,
      metricUnit,
      tags
    });
    
    return res.json({
      success: true,
      message: 'Metric recorded successfully'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Record metric endpoint failed', { error: errorMessage });
    return res.status(500).json({
      success: false,
      error: 'Failed to record metric'
    });
  }
});

/**
 * GET /api/ai-monitoring/config/:serviceType
 * Get service configuration
 */
router.get('/config/:serviceType', async (req: Request, res: Response) => {
  try {
    const { serviceType } = req.params;
    
    const aiDataService = new AIDataService();
    const config = await aiDataService.getServiceConfig(serviceType);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Service configuration not found'
      });
    }
    
    return res.json({
      success: true,
      data: config
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Get config endpoint failed', { error: errorMessage });
    return res.status(500).json({
      success: false,
      error: 'Failed to get service configuration'
    });
  }
});

/**
 * PUT /api/ai-monitoring/config/:serviceType
 * Update service configuration
 */
router.put('/config/:serviceType', async (req: Request, res: Response) => {
  try {
    const { serviceType } = req.params;
    const updates = req.body;
    
    await prisma.aIServiceConfig.update({
      where: { serviceType },
      data: updates
    });
    
    return res.json({
      success: true,
      message: 'Service configuration updated successfully'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Update config endpoint failed', { error: errorMessage });
    return res.status(500).json({
      success: false,
      error: 'Failed to update service configuration'
    });
  }
});

export default router;
