/**
 * ScrollUniversity Admissions Analytics API Routes
 * "The simple believe anything, but the prudent give thought to their steps" - Proverbs 14:15
 * 
 * Provides REST API endpoints for admissions analytics and performance tracking
 */

import express from 'express';
import { AdmissionsAnalyticsService } from '../../services/admissions/AdmissionsAnalyticsService';
import PerformanceTrackingService from '../../services/admissions/PerformanceTrackingService';
import { logger } from '../../utils/logger';

const router = express.Router();
const analyticsService = new AdmissionsAnalyticsService();
const performanceService = new PerformanceTrackingService();

/**
 * GET /api/admissions/analytics/volume
 * Generate application volume and trend analysis
 */
router.get('/volume', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const volumeAnalysis = await analyticsService.generateApplicationVolumeAnalysis(start, end);

    logger.info('Application volume analysis requested', {
      startDate: start,
      endDate: end,
      totalApplications: volumeAnalysis.totalApplications
    });

    res.json({
      success: true,
      data: volumeAnalysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to generate volume analysis', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate application volume analysis'
    });
  }
});

/**
 * GET /api/admissions/analytics/conversion
 * Generate conversion rate analysis across the admissions funnel
 */
router.get('/conversion', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const conversionAnalysis = await analyticsService.generateConversionRateAnalysis(start, end);

    logger.info('Conversion rate analysis requested', {
      startDate: start,
      endDate: end,
      overallConversionRate: conversionAnalysis.overallConversionRate
    });

    res.json({
      success: true,
      data: conversionAnalysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to generate conversion analysis', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate conversion rate analysis'
    });
  }
});

/**
 * GET /api/admissions/analytics/demographics
 * Generate demographic analysis and diversity reporting
 */
router.get('/demographics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const demographicAnalysis = await analyticsService.generateDemographicAnalysis(start, end);

    logger.info('Demographic analysis requested', {
      startDate: start,
      endDate: end,
      totalCountries: demographicAnalysis.diversityMetrics.totalCountries,
      diversityIndex: demographicAnalysis.diversityMetrics.culturalDiversityIndex
    });

    res.json({
      success: true,
      data: demographicAnalysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to generate demographic analysis', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate demographic analysis'
    });
  }
});

/**
 * GET /api/admissions/analytics/funnel
 * Analyze admissions funnel and identify bottlenecks
 */
router.get('/funnel', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const funnelAnalysis = await analyticsService.generateFunnelAnalysis(start, end);

    logger.info('Funnel analysis requested', {
      startDate: start,
      endDate: end,
      stageCount: funnelAnalysis.stages.length,
      bottleneckCount: funnelAnalysis.bottlenecks.length
    });

    res.json({
      success: true,
      data: funnelAnalysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to generate funnel analysis', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate funnel analysis'
    });
  }
});

/**
 * GET /api/admissions/analytics/performance
 * Generate comprehensive performance metrics dashboard
 */
router.get('/performance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const performanceMetrics = await analyticsService.generatePerformanceMetrics(start, end);

    logger.info('Performance metrics requested', {
      startDate: start,
      endDate: end,
      totalApplications: performanceMetrics.applicationVolume.totalApplications,
      conversionRate: performanceMetrics.conversionRates.overallConversionRate
    });

    res.json({
      success: true,
      data: performanceMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to generate performance metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate performance metrics'
    });
  }
});

/**
 * POST /api/admissions/analytics/reports
 * Store analytics report for historical tracking
 */
router.post('/reports', async (req, res) => {
  try {
    const { reportType, reportData } = req.body;

    if (!reportType || !reportData) {
      return res.status(400).json({
        success: false,
        error: 'Report type and data are required'
      });
    }

    const reportId = await analyticsService.storeAnalyticsReport(reportType, reportData);

    logger.info('Analytics report stored', {
      reportId,
      reportType
    });

    res.json({
      success: true,
      data: { reportId },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to store analytics report', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to store analytics report'
    });
  }
});

/**
 * GET /api/admissions/performance/volume-tracking
 * Track application volume performance metrics
 */
router.get('/performance/volume-tracking', async (req, res) => {
  try {
    const volumeMetrics = await performanceService.trackApplicationVolume();

    logger.info('Volume tracking metrics requested', {
      metricCount: volumeMetrics.length
    });

    res.json({
      success: true,
      data: volumeMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to track volume metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to track application volume metrics'
    });
  }
});

/**
 * GET /api/admissions/performance/conversion-tracking
 * Track conversion rate performance across funnel stages
 */
router.get('/performance/conversion-tracking', async (req, res) => {
  try {
    const conversionMetrics = await performanceService.trackConversionRates();

    logger.info('Conversion tracking metrics requested', {
      metricCount: conversionMetrics.length
    });

    res.json({
      success: true,
      data: conversionMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to track conversion metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to track conversion rate metrics'
    });
  }
});

/**
 * GET /api/admissions/performance/demographic-tracking
 * Track demographic diversity and representation metrics
 */
router.get('/performance/demographic-tracking', async (req, res) => {
  try {
    const demographicMetrics = await performanceService.trackDemographicMetrics();

    logger.info('Demographic tracking metrics requested', {
      metricCount: demographicMetrics.length
    });

    res.json({
      success: true,
      data: demographicMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to track demographic metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to track demographic metrics'
    });
  }
});

/**
 * GET /api/admissions/performance/bottlenecks
 * Identify bottlenecks in the admissions funnel
 */
router.get('/performance/bottlenecks', async (req, res) => {
  try {
    const bottlenecks = await performanceService.identifyFunnelBottlenecks();

    logger.info('Bottleneck analysis requested', {
      bottleneckCount: bottlenecks.length,
      criticalCount: bottlenecks.filter(b => b.severity === 'CRITICAL').length
    });

    res.json({
      success: true,
      data: bottlenecks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to identify bottlenecks', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to identify funnel bottlenecks'
    });
  }
});

/**
 * GET /api/admissions/performance/trends
 * Generate trend analysis for key performance indicators
 */
router.get('/performance/trends', async (req, res) => {
  try {
    const { metrics, days } = req.query;
    
    const metricNames = metrics ? (metrics as string).split(',') : [
      'application_volume_30_days',
      'overall_conversion_rate',
      'daily_application_average'
    ];
    
    const analysisDays = days ? parseInt(days as string) : 30;

    const trends = await performanceService.generateTrendAnalysis(metricNames, analysisDays);

    logger.info('Trend analysis requested', {
      metricNames,
      analysisDays,
      trendCount: trends.length
    });

    res.json({
      success: true,
      data: trends,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to generate trend analysis', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate trend analysis'
    });
  }
});

/**
 * GET /api/admissions/performance/optimization
 * Generate optimization recommendations based on performance data
 */
router.get('/performance/optimization', async (req, res) => {
  try {
    const recommendations = await performanceService.generateOptimizationRecommendations();

    logger.info('Optimization recommendations requested', {
      recommendationCount: recommendations.length,
      highPriorityCount: recommendations.filter(r => r.priority >= 8).length
    });

    res.json({
      success: true,
      data: recommendations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to generate optimization recommendations', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate optimization recommendations'
    });
  }
});

/**
 * GET /api/admissions/analytics/dashboard
 * Get comprehensive analytics dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    // Get all analytics data in parallel
    const [
      performanceMetrics,
      volumeTracking,
      conversionTracking,
      bottlenecks,
      trends,
      optimizationRecommendations
    ] = await Promise.all([
      analyticsService.generatePerformanceMetrics(start, end),
      performanceService.trackApplicationVolume(),
      performanceService.trackConversionRates(),
      performanceService.identifyFunnelBottlenecks(),
      performanceService.generateTrendAnalysis([
        'application_volume_30_days',
        'overall_conversion_rate',
        'daily_application_average'
      ]),
      performanceService.generateOptimizationRecommendations()
    ]);

    const dashboardData = {
      overview: {
        totalApplications: performanceMetrics.applicationVolume.totalApplications,
        conversionRate: performanceMetrics.conversionRates.overallConversionRate,
        averageProcessingTime: performanceMetrics.funnelAnalysis.processEfficiency.averageProcessingTime,
        diversityIndex: performanceMetrics.demographics.diversityMetrics.culturalDiversityIndex
      },
      performanceMetrics,
      realTimeTracking: {
        volume: volumeTracking,
        conversion: conversionTracking
      },
      alerts: {
        bottlenecks: bottlenecks.filter(b => b.severity === 'HIGH' || b.severity === 'CRITICAL'),
        trends: trends.filter(t => t.significance === 'HIGH' || t.significance === 'CRITICAL')
      },
      recommendations: optimizationRecommendations.slice(0, 5) // Top 5 recommendations
    };

    logger.info('Analytics dashboard requested', {
      startDate: start,
      endDate: end,
      totalApplications: dashboardData.overview.totalApplications,
      alertCount: dashboardData.alerts.bottlenecks.length + dashboardData.alerts.trends.length
    });

    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to generate analytics dashboard', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate analytics dashboard'
    });
  }
});

export default router;