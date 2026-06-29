/**
 * Quality Assurance Routes
 * API endpoints for QA testing, metrics, and review workflows
 */

import express, { Request, Response } from 'express';
import TestDatasetService from '../services/TestDatasetService';
import QualityMetricsService from '../services/QualityMetricsService';
import TheologicalAlignmentService from '../services/TheologicalAlignmentService';
import ReviewWorkflowService from '../services/ReviewWorkflowService';
import { authenticateToken, requireRole } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();

// Initialize services
const testDatasetService = new TestDatasetService();
const qualityMetricsService = new QualityMetricsService();
const theologicalAlignmentService = new TheologicalAlignmentService();
const reviewWorkflowService = new ReviewWorkflowService();

// Test Dataset Routes

/**
 * Initialize test datasets
 * POST /api/qa/test-datasets/initialize
 */
router.post(
  '/test-datasets/initialize',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await testDatasetService.initializeTestDatasets();

      res.json({
        success: true,
        message: 'Test datasets initialized successfully',
      });
    } catch (error) {
      logger.error('Error initializing test datasets', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to initialize test datasets',
      });
    }
  }
);

/**
 * Get test cases for a service
 * GET /api/qa/test-datasets/:serviceType
 */
router.get(
  '/test-datasets/:serviceType',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { serviceType } = req.params;
      const { category, difficulty, limit } = req.query;

      const testCases = await testDatasetService.getTestCases(serviceType as any, {
        category: category as any,
        difficulty: difficulty as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({
        success: true,
        data: testCases,
      });
    } catch (error) {
      logger.error('Error fetching test cases', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch test cases',
      });
    }
  }
);

// Quality Metrics Routes

/**
 * Calculate quality metrics
 * POST /api/qa/metrics/calculate
 */
router.post(
  '/metrics/calculate',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { serviceType, startDate, endDate } = req.body;

      const metrics = await qualityMetricsService.calculateMetrics(
        serviceType,
        new Date(startDate),
        new Date(endDate)
      );

      const meetsThresholds = qualityMetricsService.meetsThresholds(metrics);

      res.json({
        success: true,
        data: {
          metrics,
          meetsThresholds,
        },
      });
    } catch (error) {
      logger.error('Error calculating quality metrics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to calculate quality metrics',
      });
    }
  }
);

/**
 * Get metrics history
 * GET /api/qa/metrics/:serviceType/history
 */
router.get(
  '/metrics/:serviceType/history',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { serviceType } = req.params;
      const { limit } = req.query;

      const history = await qualityMetricsService.getMetricsHistory(
        serviceType as any,
        limit ? parseInt(limit as string) : undefined
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Error fetching metrics history', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch metrics history',
      });
    }
  }
);

/**
 * Analyze metric trends
 * GET /api/qa/metrics/:serviceType/trends/:metricName
 */
router.get(
  '/metrics/:serviceType/trends/:metricName',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { serviceType, metricName } = req.params;
      const { periods } = req.query;

      const trend = await qualityMetricsService.analyzeMetricTrends(
        serviceType as any,
        metricName as any,
        periods ? parseInt(periods as string) : undefined
      );

      res.json({
        success: true,
        data: trend,
      });
    } catch (error) {
      logger.error('Error analyzing metric trends', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to analyze metric trends',
      });
    }
  }
);

/**
 * Get continuous improvement data
 * GET /api/qa/metrics/:serviceType/improvement
 */
router.get(
  '/metrics/:serviceType/improvement',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { serviceType } = req.params;

      const improvement = await qualityMetricsService.getContinuousImprovement(
        serviceType as any
      );

      res.json({
        success: true,
        data: improvement,
      });
    } catch (error) {
      logger.error('Error fetching continuous improvement data', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch continuous improvement data',
      });
    }
  }
);

/**
 * Generate quality report
 * POST /api/qa/metrics/report
 */
router.post(
  '/metrics/report',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { serviceType, startDate, endDate } = req.body;

      const report = await qualityMetricsService.generateQualityReport(
        serviceType,
        new Date(startDate),
        new Date(endDate)
      );

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error('Error generating quality report', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to generate quality report',
      });
    }
  }
);

// Theological Alignment Routes

/**
 * Check theological alignment
 * POST /api/qa/theological/check
 */
router.post(
  '/theological/check',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { content, serviceType, context } = req.body;

      const alignment = await theologicalAlignmentService.checkAlignment(
        content,
        serviceType,
        context
      );

      res.json({
        success: true,
        data: alignment,
      });
    } catch (error) {
      logger.error('Error checking theological alignment', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to check theological alignment',
      });
    }
  }
);

/**
 * Batch check theological alignment
 * POST /api/qa/theological/batch-check
 */
router.post(
  '/theological/batch-check',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { items } = req.body;

      const alignments = await theologicalAlignmentService.batchCheckAlignment(items);

      res.json({
        success: true,
        data: alignments,
      });
    } catch (error) {
      logger.error('Error in batch theological alignment check', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to check theological alignment',
      });
    }
  }
);

/**
 * Get alignment history
 * GET /api/qa/theological/:serviceType/history
 */
router.get(
  '/theological/:serviceType/history',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { serviceType } = req.params;
      const { limit } = req.query;

      const history = await theologicalAlignmentService.getAlignmentHistory(
        serviceType as any,
        limit ? parseInt(limit as string) : undefined
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Error fetching alignment history', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch alignment history',
      });
    }
  }
);

/**
 * Review theological alignment
 * POST /api/qa/theological/:alignmentId/review
 */
router.post(
  '/theological/:alignmentId/review',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { alignmentId } = req.params;
      const { decision, notes } = req.body;
      const reviewerId = (req as any).user.userId;

      await theologicalAlignmentService.reviewAlignment(
        alignmentId,
        reviewerId,
        decision,
        notes
      );

      res.json({
        success: true,
        message: 'Theological alignment reviewed successfully',
      });
    } catch (error) {
      logger.error('Error reviewing theological alignment', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to review theological alignment',
      });
    }
  }
);

/**
 * Get common theological issues
 * GET /api/qa/theological/common-issues
 */
router.get(
  '/theological/common-issues',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { serviceType, limit } = req.query;

      const issues = await theologicalAlignmentService.getCommonIssues(
        serviceType as any,
        limit ? parseInt(limit as string) : undefined
      );

      res.json({
        success: true,
        data: issues,
      });
    } catch (error) {
      logger.error('Error fetching common theological issues', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch common theological issues',
      });
    }
  }
);

// Review Workflow Routes

/**
 * Get pending reviews for current user
 * GET /api/qa/reviews/pending
 */
router.get(
  '/reviews/pending',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const reviewerId = (req as any).user.userId;
      const { itemType, priority, limit } = req.query;

      const reviews = await reviewWorkflowService.getPendingReviews(reviewerId, {
        itemType: itemType as any,
        priority: priority as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      logger.error('Error fetching pending reviews', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pending reviews',
      });
    }
  }
);

/**
 * Get all pending reviews (admin)
 * GET /api/qa/reviews/all-pending
 */
router.get(
  '/reviews/all-pending',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { itemType, serviceType, priority, limit } = req.query;

      const reviews = await reviewWorkflowService.getAllPendingReviews({
        itemType: itemType as any,
        serviceType: serviceType as any,
        priority: priority as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      logger.error('Error fetching all pending reviews', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pending reviews',
      });
    }
  }
);

/**
 * Start a review
 * POST /api/qa/reviews/:reviewId/start
 */
router.post(
  '/reviews/:reviewId/start',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { reviewId } = req.params;
      const reviewerId = (req as any).user.userId;

      await reviewWorkflowService.startReview(reviewId, reviewerId);

      res.json({
        success: true,
        message: 'Review started successfully',
      });
    } catch (error) {
      logger.error('Error starting review', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to start review',
      });
    }
  }
);

/**
 * Complete a review
 * POST /api/qa/reviews/:reviewId/complete
 */
router.post(
  '/reviews/:reviewId/complete',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { reviewId } = req.params;
      const { outcome } = req.body;
      const reviewerId = (req as any).user.userId;

      await reviewWorkflowService.completeReview(reviewId, reviewerId, outcome);

      res.json({
        success: true,
        message: 'Review completed successfully',
      });
    } catch (error) {
      logger.error('Error completing review', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to complete review',
      });
    }
  }
);

/**
 * Escalate a review
 * POST /api/qa/reviews/:reviewId/escalate
 */
router.post(
  '/reviews/:reviewId/escalate',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { reviewId } = req.params;
      const { reason, escalateTo } = req.body;

      await reviewWorkflowService.escalateReview(reviewId, reason, escalateTo);

      res.json({
        success: true,
        message: 'Review escalated successfully',
      });
    } catch (error) {
      logger.error('Error escalating review', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to escalate review',
      });
    }
  }
);

/**
 * Get review statistics
 * GET /api/qa/reviews/statistics
 */
router.get(
  '/reviews/statistics',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { reviewerId, startDate, endDate } = req.query;

      const stats = await reviewWorkflowService.getReviewStatistics(
        reviewerId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error fetching review statistics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch review statistics',
      });
    }
  }
);

/**
 * Auto-assign reviews
 * POST /api/qa/reviews/auto-assign
 */
router.post(
  '/reviews/auto-assign',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const assignedCount = await reviewWorkflowService.autoAssignReviews();

      res.json({
        success: true,
        data: { assignedCount },
        message: `${assignedCount} reviews auto-assigned successfully`,
      });
    } catch (error) {
      logger.error('Error auto-assigning reviews', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to auto-assign reviews',
      });
    }
  }
);

/**
 * Get reviewer performance
 * GET /api/qa/reviews/performance/:reviewerId
 */
router.get(
  '/reviews/performance/:reviewerId',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { reviewerId } = req.params;
      const { startDate, endDate } = req.query;

      const performance = await reviewWorkflowService.getReviewerPerformance(
        reviewerId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: performance,
      });
    } catch (error) {
      logger.error('Error fetching reviewer performance', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reviewer performance',
      });
    }
  }
);

export default router;
