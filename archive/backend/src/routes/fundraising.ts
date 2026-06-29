/**
 * Fundraising & Donor Management Routes
 * API endpoints for AI-powered fundraising and donor intelligence
 */

import express, { Request, Response } from 'express';
import { FundraisingAIService } from '../services/FundraisingAIService';
import {
  DonorAnalysisRequest,
  AppealRequest,
  ReportPeriod,
  ProspectSource
} from '../types/fundraising.types';
import logger from '../utils/logger';

const router = express.Router();
const fundraisingService = new FundraisingAIService();

/**
 * POST /api/fundraising/analyze-donor
 * Analyze donor and generate intelligence
 */
router.post('/analyze-donor', async (req: Request, res: Response): Promise<void> => {
  try {
    const request: DonorAnalysisRequest = req.body;

    if (!request.donorId) {
      res.status(400).json({
        success: false,
        error: 'Donor ID is required'
      });
      return;
    }

    const result = await fundraisingService.analyzeDonor(request);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in analyze-donor endpoint', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to analyze donor'
    });
  }
});

/**
 * POST /api/fundraising/generate-appeal
 * Generate personalized donation appeal
 */
router.post('/generate-appeal', async (req: Request, res: Response): Promise<void> => {
  try {
    const request: AppealRequest = req.body;

    if (!request.donorId) {
      res.status(400).json({
        success: false,
        error: 'Donor ID is required'
      });
      return;
    }

    const result = await fundraisingService.generateAppeal(request);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in generate-appeal endpoint', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate appeal'
    });
  }
});

/**
 * POST /api/fundraising/engagement-plan
 * Create engagement plan for donor
 */
router.post('/engagement-plan', async (req: Request, res: Response): Promise<void> => {
  try {
    const { donorId } = req.body;

    if (!donorId) {
      res.status(400).json({
        success: false,
        error: 'Donor ID is required'
      });
      return;
    }

    const result = await fundraisingService.createEngagementPlan(donorId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in engagement-plan endpoint', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to create engagement plan'
    });
  }
});

/**
 * GET /api/fundraising/identify-prospects
 * Identify and prioritize donor prospects
 */
router.get('/identify-prospects', async (req: Request, res: Response): Promise<void> => {
  try {
    const source = req.query.source as ProspectSource | undefined;
    const minCapacity = req.query.minCapacity 
      ? parseInt(req.query.minCapacity as string) 
      : undefined;

    const result = await fundraisingService.identifyProspects(source, minCapacity);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in identify-prospects endpoint', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to identify prospects'
    });
  }
});

/**
 * POST /api/fundraising/impact-report
 * Generate personalized impact report
 */
router.post('/impact-report', async (req: Request, res: Response): Promise<void> => {
  try {
    const { donorId, period } = req.body;

    if (!donorId || !period) {
      res.status(400).json({
        success: false,
        error: 'Donor ID and period are required'
      });
      return;
    }

    const reportPeriod: ReportPeriod = {
      startDate: new Date(period.startDate),
      endDate: new Date(period.endDate),
      label: period.label
    };

    const result = await fundraisingService.generateImpactReport(donorId, reportPeriod);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in impact-report endpoint', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate impact report'
    });
  }
});

/**
 * GET /api/fundraising/donor-profile/:donorId
 * Get comprehensive donor profile
 */
router.get('/donor-profile/:donorId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { donorId } = req.params;

    if (!donorId) {
      res.status(400).json({
        success: false,
        error: 'Donor ID is required'
      });
      return;
    }

    const result = await fundraisingService.getDonorProfile(donorId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in donor-profile endpoint', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get donor profile'
    });
  }
});

/**
 * POST /api/fundraising/campaign-donors
 * Process multiple donors for campaign
 */
router.post('/campaign-donors', async (req: Request, res: Response): Promise<void> => {
  try {
    const { donorIds, campaignId } = req.body;

    if (!donorIds || !Array.isArray(donorIds) || donorIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Donor IDs array is required'
      });
      return;
    }

    if (!campaignId) {
      res.status(400).json({
        success: false,
        error: 'Campaign ID is required'
      });
      return;
    }

    const result = await fundraisingService.processCampaignDonors(donorIds, campaignId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in campaign-donors endpoint', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to process campaign donors'
    });
  }
});

/**
 * GET /api/fundraising/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response): void => {
  res.json({
    success: true,
    message: 'Fundraising AI service is operational',
    timestamp: new Date().toISOString()
  });
});

export default router;
