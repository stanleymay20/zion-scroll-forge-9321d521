/**
 * ScrollUniversity Admissions Predictive Analytics API Routes
 * "For I know the plans I have for you," declares the Lord - Jeremiah 29:11
 * 
 * API endpoints for predictive modeling and forecasting
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import PredictiveAnalyticsService from '../../services/admissions/PredictiveAnalyticsService';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { logger } from '../../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();
const predictiveAnalyticsService = new PredictiveAnalyticsService();

/**
 * Build admission success predictive model
 * POST /api/admissions/predictive-analytics/models/admission-success
 */
router.post('/models/admission-success', 
  authenticateToken, 
  requireRole(['ADMIN', 'ADMISSIONS_OFFICER']),
  async (req, res) => {
    try {
      logger.info('Building admission success model', { userId: req.user?.id });

      const model = await predictiveAnalyticsService.buildAdmissionSuccessModel();

      res.json({
        success: true,
        data: {
          model,
          message: 'Admission success model built successfully'
        }
      });
    } catch (error) {
      logger.error('Failed to build admission success model', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to build admission success model'
      });
    }
  }
);

/**
 * Predict admission success for specific applicant
 * GET /api/admissions/predictive-analytics/predict/admission-success/:applicantId
 */
router.get('/predict/admission-success/:applicantId',
  authenticateToken,
  requireRole(['ADMIN', 'ADMISSIONS_OFFICER', 'ADMISSIONS_COMMITTEE']),
  async (req, res) => {
    try {
      const { applicantId } = req.params;

      logger.info('Predicting admission success', { applicantId, userId: req.user?.id });

      const prediction = await predictiveAnalyticsService.predictAdmissionSuccess(applicantId);

      res.json({
        success: true,
        data: prediction
      });
    } catch (error) {
      logger.error('Failed to predict admission success', { 
        error, 
        applicantId: req.params.applicantId,
        userId: req.user?.id 
      });
      
      if (error instanceof Error && error.message === 'Application not found') {
        res.status(404).json({
          success: false,
          error: 'Application not found'
        });
      } else if (error instanceof Error && error.message === 'Admission success model not available') {
        res.status(503).json({
          success: false,
          error: 'Predictive model not available. Please build the model first.'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to predict admission success'
        });
      }
    }
  }
);

/**
 * Predict yield rates for programs
 * GET /api/admissions/predictive-analytics/predict/yield-rates
 * GET /api/admissions/predictive-analytics/predict/yield-rates?program=BACHELOR_THEOLOGY
 */
router.get('/predict/yield-rates',
  authenticateToken,
  requireRole(['ADMIN', 'ADMISSIONS_OFFICER']),
  async (req, res) => {
    try {
      const { program } = req.query;

      logger.info('Predicting yield rates', { program, userId: req.user?.id });

      const predictions = await predictiveAnalyticsService.predictYieldRates(program as string);

      res.json({
        success: true,
        data: {
          predictions,
          totalPrograms: predictions.length,
          averageYieldRate: predictions.reduce((sum, p) => sum + p.predictedYieldRate, 0) / predictions.length
        }
      });
    } catch (error) {
      logger.error('Failed to predict yield rates', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to predict yield rates'
      });
    }
  }
);

/**
 * Generate enrollment forecast
 * GET /api/admissions/predictive-analytics/forecast/enrollment/:period
 */
router.get('/forecast/enrollment/:period',
  authenticateToken,
  requireRole(['ADMIN', 'ADMISSIONS_OFFICER']),
  async (req, res) => {
    try {
      const { period } = req.params;

      logger.info('Generating enrollment forecast', { period, userId: req.user?.id });

      const forecast = await predictiveAnalyticsService.generateEnrollmentForecast(period);

      res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      logger.error('Failed to generate enrollment forecast', { 
        error, 
        period: req.params.period,
        userId: req.user?.id 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to generate enrollment forecast'
      });
    }
  }
);

/**
 * Generate process improvement recommendations
 * GET /api/admissions/predictive-analytics/recommendations/process-improvement
 */
router.get('/recommendations/process-improvement',
  authenticateToken,
  requireRole(['ADMIN', 'ADMISSIONS_OFFICER']),
  async (req, res) => {
    try {
      logger.info('Generating process improvement recommendations', { userId: req.user?.id });

      const recommendations = await predictiveAnalyticsService.generateProcessImprovementRecommendations();

      res.json({
        success: true,
        data: {
          recommendations,
          totalRecommendations: recommendations.length,
          highPriorityCount: recommendations.filter(r => 
            r.recommendations.some(rec => rec.priority >= 8)
          ).length
        }
      });
    } catch (error) {
      logger.error('Failed to generate process improvement recommendations', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to generate process improvement recommendations'
      });
    }
  }
);

/**
 * Generate quality assurance recommendations
 * GET /api/admissions/predictive-analytics/recommendations/quality-assurance
 */
router.get('/recommendations/quality-assurance',
  authenticateToken,
  requireRole(['ADMIN', 'ADMISSIONS_OFFICER']),
  async (req, res) => {
    try {
      logger.info('Generating quality assurance recommendations', { userId: req.user?.id });

      const recommendations = await predictiveAnalyticsService.generateQualityAssuranceRecommendations();

      res.json({
        success: true,
        data: {
          recommendations,
          totalAreas: recommendations.length,
          averageQualityGap: recommendations.reduce((sum, r) => 
            sum + (r.targetQualityScore - r.currentQualityScore), 0
          ) / recommendations.length
        }
      });
    } catch (error) {
      logger.error('Failed to generate quality assurance recommendations', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to generate quality assurance recommendations'
      });
    }
  }
);

/**
 * Get all predictive models
 * GET /api/admissions/predictive-analytics/models
 */
router.get('/models',
  authenticateToken,
  requireRole(['ADMIN', 'ADMISSIONS_OFFICER']),
  async (req, res) => {
    try {
      logger.info('Retrieving predictive models', { userId: req.user?.id });

      const models = await prisma.predictive_model.findMany({
        where: { is_active: true },
        orderBy: { last_trained: 'desc' }
      });

      res.json({
        success: true,
        data: {
          models,
          totalModels: models.length,
          modelTypes: [...new Set(models.map(m => m.model_type))]
        }
      });
    } catch (error) {
      logger.error('Failed to retrieve predictive models', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve predictive models'
      });
    }
  }
);

/**
 * Get model performance metrics
 * GET /api/admissions/predictive-analytics/models/:modelId/performance
 */
router.get('/models/:modelId/performance',
  authenticateToken,
  requireRole(['ADMIN', 'ADMISSIONS_OFFICER']),
  async (req, res) => {
    try {
      const { modelId } = req.params;

      logger.info('Retrieving model performance', { modelId, userId: req.user?.id });

      const performance = await prisma.model_performance_tracking.findMany({
        where: { model_id: modelId },
        orderBy: { evaluation_date: 'desc' },
        take: 10
      });

      if (performance.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No performance data found for this model'
        });
      }

      const latestPerformance = performance[0];
      const performanceTrend = performance.length > 1 ? 
        latestPerformance.accuracy_score - performance[1].accuracy_score : 0;

      res.json({
        success: true,
        data: {
          modelId,
          latestPerformance,
          performanceHistory: performance,
          performanceTrend,
          totalEvaluations: performance.length
        }
      });
    } catch (error) {
      logger.error('Failed to retrieve model performance', { 
        error, 
        modelId: req.params.modelId,
        userId: req.user?.id 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve model performance'
      });
    }
  }
);

/**
 * Batch predict admission success for multiple applicants
 * POST /api/admissions/predictive-analytics/predict/admission-success/batch
 */
router.post('/predict/admission-success/batch',
  authenticateToken,
  requireRole(['ADMIN', 'ADMISSIONS_OFFICER']),
  async (req, res) => {
    try {
      const { applicantIds } = req.body;

      if (!Array.isArray(applicantIds) || applicantIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'applicantIds must be a non-empty array'
        });
      }

      if (applicantIds.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 100 applicants can be processed in a single batch'
        });
      }

      logger.info('Batch predicting admission success', { 
        applicantCount: applicantIds.length,
        userId: req.user?.id 
      });

      const predictions = [];
      const errors = [];

      for (const applicantId of applicantIds) {
        try {
          const prediction = await predictiveAnalyticsService.predictAdmissionSuccess(applicantId);
          predictions.push(prediction);
        } catch (error) {
          errors.push({
            applicantId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({
        success: true,
        data: {
          predictions,
          errors,
          totalProcessed: applicantIds.length,
          successfulPredictions: predictions.length,
          failedPredictions: errors.length
        }
      });
    } catch (error) {
      logger.error('Failed to batch predict admission success', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to batch predict admission success'
      });
    }
  }
);

/**
 * Get predictive analytics dashboard data
 * GET /api/admissions/predictive-analytics/dashboard
 */
router.get('/dashboard',
  authenticateToken,
  requireRole(['ADMIN', 'ADMISSIONS_OFFICER']),
  async (req, res) => {
    try {
      logger.info('Retrieving predictive analytics dashboard', { userId: req.user?.id });

      // Get recent predictions
      const recentPredictions = await prisma.admission_success_prediction.findMany({
        where: { is_current: true },
        orderBy: { prediction_date: 'desc' },
        take: 10,
        include: {
          application: {
            select: {
              id: true,
              applicant_id: true,
              program_applied: true,
              status: true
            }
          }
        }
      });

      // Get model statistics
      const models = await prisma.predictive_model.findMany({
        where: { is_active: true }
      });

      // Get recent recommendations
      const processRecommendations = await prisma.process_improvement_recommendation.findMany({
        where: { status: 'PENDING' },
        orderBy: { implementation_priority: 'desc' },
        take: 5
      });

      const qualityRecommendations = await prisma.quality_assurance_recommendation.findMany({
        where: { status: 'PENDING' },
        orderBy: { priority_level: 'desc' },
        take: 5
      });

      // Calculate summary statistics
      const highSuccessPredictions = recentPredictions.filter(p => p.success_probability > 0.8).length;
      const averageSuccessProbability = recentPredictions.length > 0 ?
        recentPredictions.reduce((sum, p) => sum + p.success_probability, 0) / recentPredictions.length : 0;

      res.json({
        success: true,
        data: {
          summary: {
            totalModels: models.length,
            recentPredictions: recentPredictions.length,
            highSuccessPredictions,
            averageSuccessProbability: Math.round(averageSuccessProbability * 100) / 100,
            pendingProcessRecommendations: processRecommendations.length,
            pendingQualityRecommendations: qualityRecommendations.length
          },
          recentPredictions: recentPredictions.map(p => ({
            applicantId: p.applicant_id,
            successProbability: p.success_probability,
            confidenceLevel: p.confidence_level,
            predictionDate: p.prediction_date,
            programApplied: p.application?.program_applied,
            applicationStatus: p.application?.status
          })),
          models: models.map(m => ({
            modelId: m.model_id,
            modelType: m.model_type,
            accuracy: m.accuracy,
            lastTrained: m.last_trained,
            isActive: m.is_active
          })),
          recommendations: {
            process: processRecommendations.map(r => ({
              area: r.process_area,
              currentEfficiency: r.current_efficiency,
              predictedImprovement: r.predicted_improvement,
              priority: r.implementation_priority,
              estimatedImpact: r.estimated_impact
            })),
            quality: qualityRecommendations.map(r => ({
              area: r.area,
              currentScore: r.current_quality_score,
              targetScore: r.target_quality_score,
              priority: r.priority_level
            }))
          }
        }
      });
    } catch (error) {
      logger.error('Failed to retrieve predictive analytics dashboard', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard data'
      });
    }
  }
);

export default router;