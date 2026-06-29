/**
 * Analytics Routes
 * "The wise store up knowledge" - Proverbs 10:14
 * 
 * API endpoints for analytics dashboard, reports, and data export
 */

import express, { Request, Response } from 'express';
import AnalyticsDashboardService from '../services/AnalyticsDashboardService';
import DataAggregationService from '../services/DataAggregationService';
import ReportGenerationService from '../services/ReportGenerationService';
import DataExportService from '../services/DataExportService';
import PredictiveAnalyticsService from '../services/PredictiveAnalyticsService';
import { authenticateToken, requireRole } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();

// Initialize services
const analyticsService = new AnalyticsDashboardService();
const aggregationService = new DataAggregationService();
const reportService = new ReportGenerationService();
const exportService = new DataExportService();
const predictiveService = new PredictiveAnalyticsService();

/**
 * @route GET /api/analytics/real-time
 * @desc Get real-time metrics
 * @access Admin, Faculty
 */
router.get(
  '/real-time',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response) => {
    try {
      const metrics = await analyticsService.getRealTimeMetrics();
      res.json({ success: true, metrics });
    } catch (error) {
      logger.error('Error fetching real-time metrics:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch real-time metrics',
      });
    }
  }
);

/**
 * @route GET /api/analytics/student/:studentId
 * @desc Get student analytics
 * @access Admin, Faculty, Student (own data)
 */
router.get(
  '/student/:studentId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;
      const { startDate, endDate } = req.query;

      // Authorization check
      const user = (req as any).user;
      if (user.role !== 'ADMIN' && user.role !== 'FACULTY' && user.id !== studentId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to view this student data',
        });
      }

      const timeRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      } : undefined;

      const analytics = await analyticsService.getStudentAnalytics(studentId, timeRange);
      res.json({ success: true, analytics });
    } catch (error) {
      logger.error('Error fetching student analytics:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch student analytics',
      });
    }
  }
);

/**
 * @route GET /api/analytics/course/:courseId
 * @desc Get course analytics
 * @access Admin, Faculty
 */
router.get(
  '/course/:courseId',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      const { startDate, endDate } = req.query;

      const timeRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      } : undefined;

      const analytics = await analyticsService.getCourseAnalytics(courseId, timeRange);
      res.json({ success: true, analytics });
    } catch (error) {
      logger.error('Error fetching course analytics:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch course analytics',
      });
    }
  }
);

/**
 * @route GET /api/analytics/financial
 * @desc Get financial analytics
 * @access Admin
 */
router.get(
  '/financial',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Start date and end date are required',
        });
      }

      const timeRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };

      const analytics = await analyticsService.getFinancialAnalytics(timeRange);
      res.json({ success: true, analytics });
    } catch (error) {
      logger.error('Error fetching financial analytics:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch financial analytics',
      });
    }
  }
);

/**
 * @route GET /api/analytics/spiritual-formation
 * @desc Get spiritual formation analytics
 * @access Admin, Faculty
 */
router.get(
  '/spiritual-formation',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Start date and end date are required',
        });
      }

      const timeRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };

      const analytics = await analyticsService.getSpiritualFormationAnalytics(timeRange);
      res.json({ success: true, analytics });
    } catch (error) {
      logger.error('Error fetching spiritual formation analytics:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch spiritual formation analytics',
      });
    }
  }
);

/**
 * @route GET /api/analytics/system
 * @desc Get system analytics
 * @access Admin
 */
router.get(
  '/system',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Start date and end date are required',
        });
      }

      const timeRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };

      const analytics = await analyticsService.getSystemAnalytics(timeRange);
      res.json({ success: true, analytics });
    } catch (error) {
      logger.error('Error fetching system analytics:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch system analytics',
      });
    }
  }
);

/**
 * @route POST /api/analytics/metrics
 * @desc Get multiple metrics
 * @access Admin, Faculty
 */
router.post(
  '/metrics',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response) => {
    try {
      const request = req.body;

      if (!request.metrics || !Array.isArray(request.metrics)) {
        return res.status(400).json({
          success: false,
          error: 'Metrics array is required',
        });
      }

      if (!request.timeRange || !request.timeRange.startDate || !request.timeRange.endDate) {
        return res.status(400).json({
          success: false,
          error: 'Time range with start and end dates is required',
        });
      }

      const result = await analyticsService.getMetrics(request);
      res.json(result);
    } catch (error) {
      logger.error('Error fetching metrics:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch metrics',
      });
    }
  }
);

/**
 * @route POST /api/analytics/reports/generate
 * @desc Generate a report
 * @access Admin, Faculty
 */
router.post(
  '/reports/generate',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response) => {
    try {
      const configuration = req.body;

      if (!configuration.type || !configuration.format) {
        return res.status(400).json({
          success: false,
          error: 'Report type and format are required',
        });
      }

      const report = await reportService.generateReport(configuration);
      res.json({ success: true, report });
    } catch (error) {
      logger.error('Error generating report:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
      });
    }
  }
);

/**
 * @route POST /api/analytics/reports/schedule
 * @desc Schedule a recurring report
 * @access Admin
 */
router.post(
  '/reports/schedule',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { configuration, schedule } = req.body;

      if (!configuration || !schedule) {
        return res.status(400).json({
          success: false,
          error: 'Configuration and schedule are required',
        });
      }

      const scheduleId = await reportService.scheduleReport(configuration, schedule);
      res.json({
        success: true,
        scheduleId,
        message: 'Report scheduled successfully',
      });
    } catch (error) {
      logger.error('Error scheduling report:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule report',
      });
    }
  }
);

/**
 * @route POST /api/analytics/export
 * @desc Export data
 * @access Admin, Faculty
 */
router.post(
  '/export',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response) => {
    try {
      const request = req.body;

      if (!request.dataType || !request.format) {
        return res.status(400).json({
          success: false,
          error: 'Data type and format are required',
        });
      }

      const result = await exportService.exportData(request);
      res.json({ success: true, export: result });
    } catch (error) {
      logger.error('Error exporting data:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export data',
      });
    }
  }
);

/**
 * @route GET /api/analytics/predictions/student-success/:studentId
 * @desc Predict student success
 * @access Admin, Faculty, Student (own data)
 */
router.get(
  '/predictions/student-success/:studentId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;

      // Authorization check
      const user = (req as any).user;
      if (user.role !== 'ADMIN' && user.role !== 'FACULTY' && user.id !== studentId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to view this prediction',
        });
      }

      const prediction = await predictiveService.predictStudentSuccess(studentId);
      res.json({ success: true, prediction });
    } catch (error) {
      logger.error('Error predicting student success:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to predict student success',
      });
    }
  }
);

/**
 * @route GET /api/analytics/predictions/course-completion/:courseId/:studentId
 * @desc Predict course completion
 * @access Admin, Faculty, Student (own data)
 */
router.get(
  '/predictions/course-completion/:courseId/:studentId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { courseId, studentId } = req.params;

      // Authorization check
      const user = (req as any).user;
      if (user.role !== 'ADMIN' && user.role !== 'FACULTY' && user.id !== studentId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to view this prediction',
        });
      }

      const prediction = await predictiveService.predictCourseCompletion(courseId, studentId);
      res.json({ success: true, prediction });
    } catch (error) {
      logger.error('Error predicting course completion:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to predict course completion',
      });
    }
  }
);

/**
 * @route GET /api/analytics/predictions/revenue-forecast
 * @desc Forecast revenue
 * @access Admin
 */
router.get(
  '/predictions/revenue-forecast',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { months } = req.query;
      const monthsToForecast = months ? parseInt(months as string) : 3;

      const forecast = await predictiveService.forecastRevenue(monthsToForecast);
      res.json({ success: true, forecast });
    } catch (error) {
      logger.error('Error forecasting revenue:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to forecast revenue',
      });
    }
  }
);

/**
 * @route GET /api/analytics/predictions/enrollment-trends
 * @desc Predict enrollment trends
 * @access Admin, Faculty
 */
router.get(
  '/predictions/enrollment-trends',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response) => {
    try {
      const { courseId } = req.query;

      const prediction = await predictiveService.predictEnrollmentTrends(
        courseId as string | undefined
      );
      res.json({ success: true, prediction });
    } catch (error) {
      logger.error('Error predicting enrollment trends:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to predict enrollment trends',
      });
    }
  }
);

/**
 * @route GET /api/analytics/predictions/models
 * @desc Get available predictive models
 * @access Admin, Faculty
 */
router.get(
  '/predictions/models',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response) => {
    try {
      const models = await predictiveService.getAvailableModels();
      res.json({ success: true, models });
    } catch (error) {
      logger.error('Error fetching predictive models:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch predictive models',
      });
    }
  }
);

/**
 * @route POST /api/analytics/aggregation/initialize
 * @desc Initialize aggregation jobs
 * @access Admin
 */
router.post(
  '/aggregation/initialize',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      await aggregationService.initializeJobs();
      res.json({
        success: true,
        message: 'Aggregation jobs initialized successfully',
      });
    } catch (error) {
      logger.error('Error initializing aggregation jobs:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize aggregation jobs',
      });
    }
  }
);

export default router;
