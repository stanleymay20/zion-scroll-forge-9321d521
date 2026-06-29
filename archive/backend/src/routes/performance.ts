/**
 * Performance Monitoring Routes
 * API endpoints for performance metrics and optimization
 */

import express from 'express';
import PerformanceOptimizationService from '../services/PerformanceOptimizationService';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/productionLogger';

const router = express.Router();

/**
 * Record performance metric
 * POST /api/performance/metrics
 */
router.post('/metrics', async (req, res) => {
  try {
    const { name, value, tags, userId } = req.body;

    if (!name || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Name and value are required',
      });
    }

    await PerformanceOptimizationService.recordMetric({
      name,
      value,
      tags,
      userId,
    });

    res.json({
      success: true,
      message: 'Metric recorded successfully',
    });
  } catch (error) {
    logger.error('Failed to record performance metric', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to record metric',
    });
  }
});

/**
 * Get performance report
 * GET /api/performance/report
 */
router.get('/report', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 3600000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const report = await PerformanceOptimizationService.getPerformanceReport(start, end);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Failed to get performance report', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get performance report',
    });
  }
});

/**
 * Get metrics by name
 * GET /api/performance/metrics/:name
 */
router.get('/metrics/:name', authenticate, async (req, res) => {
  try {
    const { name } = req.params;
    const { limit } = req.query;

    const metrics = await PerformanceOptimizationService.getMetricsByName(
      name,
      limit ? parseInt(limit as string) : 100
    );

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Failed to get metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics',
    });
  }
});

/**
 * Get slow queries
 * GET /api/performance/slow-queries
 */
router.get('/slow-queries', authenticate, async (req, res) => {
  try {
    const { threshold } = req.query;

    const slowQueries = await PerformanceOptimizationService.getSlowQueries(
      threshold ? parseInt(threshold as string) : 1000
    );

    res.json({
      success: true,
      data: slowQueries,
    });
  } catch (error) {
    logger.error('Failed to get slow queries', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get slow queries',
    });
  }
});

/**
 * Get query optimization recommendations
 * GET /api/performance/optimize/queries
 */
router.get('/optimize/queries', authenticate, async (req, res) => {
  try {
    const result = await PerformanceOptimizationService.optimizeQueries();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Failed to optimize queries', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to optimize queries',
    });
  }
});

/**
 * Get cache statistics
 * GET /api/performance/cache/stats
 */
router.get('/cache/stats', authenticate, async (req, res) => {
  try {
    const stats = await PerformanceOptimizationService.getCacheStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get cache stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get cache stats',
    });
  }
});

/**
 * Get cache optimization recommendations
 * GET /api/performance/optimize/cache
 */
router.get('/optimize/cache', authenticate, async (req, res) => {
  try {
    const result = await PerformanceOptimizationService.optimizeCacheStrategy();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Failed to optimize cache', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to optimize cache',
    });
  }
});

/**
 * Get bundle optimization recommendations
 * GET /api/performance/optimize/bundle
 */
router.get('/optimize/bundle', authenticate, async (req, res) => {
  try {
    const result = await PerformanceOptimizationService.getBundleOptimizations();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Failed to get bundle optimizations', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get bundle optimizations',
    });
  }
});

/**
 * Export metrics
 * GET /api/performance/export
 */
router.get('/export', authenticate, async (req, res) => {
  try {
    const { format } = req.query;

    const data = await PerformanceOptimizationService.exportMetrics(
      format === 'csv' ? 'csv' : 'json'
    );

    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    const filename = `performance-metrics-${Date.now()}.${format || 'json'}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  } catch (error) {
    logger.error('Failed to export metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to export metrics',
    });
  }
});

/**
 * Clear old metrics
 * DELETE /api/performance/metrics
 */
router.delete('/metrics', authenticate, async (req, res) => {
  try {
    const { olderThan } = req.query;

    const date = olderThan
      ? new Date(olderThan as string)
      : new Date(Date.now() - 7 * 24 * 3600000); // 7 days ago

    const deleted = await PerformanceOptimizationService.clearOldMetrics(date);

    res.json({
      success: true,
      data: {
        deleted,
        message: `Deleted ${deleted} old metrics`,
      },
    });
  } catch (error) {
    logger.error('Failed to clear old metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to clear old metrics',
    });
  }
});

export default router;
