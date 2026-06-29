/**
 * Prophetic Check-in API Routes
 * Routes for prophetic check-ins and spiritual growth tracking
 */

import express, { Request, Response } from 'express';
import PropheticCheckInService from '../services/PropheticCheckInService';
import SpiritualGiftIdentificationService from '../services/SpiritualGiftIdentificationService';
import CallingDiscernmentService from '../services/CallingDiscernmentService';
import SpiritualMentorMatchingService from '../services/SpiritualMentorMatchingService';
import SpiritualGrowthAnalyticsService from '../services/SpiritualGrowthAnalyticsService';
import {
  PropheticCheckInRequest,
  SpiritualGiftAssessmentRequest,
  CallingDiscernmentRequest,
  MentorMatchRequest,
  GrowthAnalyticsRequest
} from '../types/prophetic-checkin.types';

const router = express.Router();

// Initialize services
const propheticCheckInService = new PropheticCheckInService();
const giftIdentificationService = new SpiritualGiftIdentificationService();
const callingDiscernmentService = new CallingDiscernmentService();
const mentorMatchingService = new SpiritualMentorMatchingService();
const growthAnalyticsService = new SpiritualGrowthAnalyticsService();

/**
 * @route POST /api/prophetic-checkin/submit
 * @desc Submit a prophetic check-in
 * @access Private
 */
router.post('/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    const request: PropheticCheckInRequest = req.body;

    // Validate request
    if (!request.userId || !request.questionnaire || !request.spiritualTemperature) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, questionnaire, spiritualTemperature'
      });
      return;
    }

    const response = await propheticCheckInService.submitCheckIn(request);

    if (response.success) {
      res.status(201).json(response);
    } else {
      res.status(500).json(response);
    }
  } catch (error) {
    console.error('Error in prophetic check-in submission:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route GET /api/prophetic-checkin/history/:userId
 * @desc Get check-in history for a user
 * @access Private
 */
router.get('/history/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const checkIns = await propheticCheckInService.getCheckInHistory(userId, limit);

    res.status(200).json({
      success: true,
      data: checkIns
    });
  } catch (error) {
    console.error('Error fetching check-in history:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route GET /api/prophetic-checkin/growth-tracking/:userId
 * @desc Get growth tracking for a user
 * @access Private
 */
router.get('/growth-tracking/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const tracking = await propheticCheckInService.getGrowthTracking(userId, limit);

    res.status(200).json({
      success: true,
      data: tracking
    });
  } catch (error) {
    console.error('Error fetching growth tracking:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route GET /api/prophetic-checkin/guidance/:userId
 * @desc Get prophetic guidance for a user
 * @access Private
 */
router.get('/guidance/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const guidance = await propheticCheckInService.getPropheticGuidance(userId, limit);

    res.status(200).json({
      success: true,
      data: guidance
    });
  } catch (error) {
    console.error('Error fetching prophetic guidance:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route POST /api/prophetic-checkin/spiritual-gifts/assess
 * @desc Assess spiritual gifts
 * @access Private
 */
router.post('/spiritual-gifts/assess', async (req: Request, res: Response): Promise<void> => {
  try {
    const request: SpiritualGiftAssessmentRequest = req.body;

    // Validate request
    if (!request.userId || !request.assessmentResponses) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, assessmentResponses'
      });
      return;
    }

    const response = await giftIdentificationService.assessSpiritualGifts(request);

    if (response.success) {
      res.status(201).json(response);
    } else {
      res.status(500).json(response);
    }
  } catch (error) {
    console.error('Error in spiritual gift assessment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route GET /api/prophetic-checkin/spiritual-gifts/:userId
 * @desc Get spiritual gift identification history
 * @access Private
 */
router.get('/spiritual-gifts/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const identifications = await giftIdentificationService.getGiftIdentificationHistory(userId);

    res.status(200).json({
      success: true,
      data: identifications
    });
  } catch (error) {
    console.error('Error fetching gift identification history:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route GET /api/prophetic-checkin/spiritual-gifts/:userId/latest
 * @desc Get latest spiritual gift identification
 * @access Private
 */
router.get('/spiritual-gifts/:userId/latest', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const identification = await giftIdentificationService.getLatestGiftIdentification(userId);

    if (identification) {
      res.status(200).json({
        success: true,
        data: identification
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'No gift identification found'
      });
    }
  } catch (error) {
    console.error('Error fetching latest gift identification:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route POST /api/prophetic-checkin/calling/discern
 * @desc Discern calling
 * @access Private
 */
router.post('/calling/discern', async (req: Request, res: Response): Promise<void> => {
  try {
    const request: CallingDiscernmentRequest = req.body;

    // Validate request
    if (!request.userId || !request.currentUnderstanding) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, currentUnderstanding'
      });
      return;
    }

    const response = await callingDiscernmentService.discernCalling(request);

    if (response.success) {
      res.status(201).json(response);
    } else {
      res.status(500).json(response);
    }
  } catch (error) {
    console.error('Error in calling discernment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route GET /api/prophetic-checkin/calling/:userId
 * @desc Get calling discernment history
 * @access Private
 */
router.get('/calling/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const discernments = await callingDiscernmentService.getCallingHistory(userId);

    res.status(200).json({
      success: true,
      data: discernments
    });
  } catch (error) {
    console.error('Error fetching calling history:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route GET /api/prophetic-checkin/calling/:userId/latest
 * @desc Get latest calling discernment
 * @access Private
 */
router.get('/calling/:userId/latest', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const discernment = await callingDiscernmentService.getLatestCalling(userId);

    if (discernment) {
      res.status(200).json({
        success: true,
        data: discernment
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'No calling discernment found'
      });
    }
  } catch (error) {
    console.error('Error fetching latest calling:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route POST /api/prophetic-checkin/mentor/match
 * @desc Find mentor matches
 * @access Private
 */
router.post('/mentor/match', async (req: Request, res: Response): Promise<void> => {
  try {
    const request: MentorMatchRequest = req.body;

    // Validate request
    if (!request.userId || !request.mentorshipNeeds || !request.growthGoals) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, mentorshipNeeds, growthGoals'
      });
      return;
    }

    const response = await mentorMatchingService.findMentorMatches(request);

    if (response.success) {
      res.status(201).json(response);
    } else {
      res.status(500).json(response);
    }
  } catch (error) {
    console.error('Error in mentor matching:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route GET /api/prophetic-checkin/mentor/:userId
 * @desc Get mentor match history
 * @access Private
 */
router.get('/mentor/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const matches = await mentorMatchingService.getMentorMatchHistory(userId);

    res.status(200).json({
      success: true,
      data: matches
    });
  } catch (error) {
    console.error('Error fetching mentor match history:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route POST /api/prophetic-checkin/analytics/generate
 * @desc Generate growth analytics
 * @access Private
 */
router.post('/analytics/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const request: GrowthAnalyticsRequest = req.body;

    // Validate request
    if (!request.userId || !request.periodStart || !request.periodEnd) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, periodStart, periodEnd'
      });
      return;
    }

    // Convert date strings to Date objects
    request.periodStart = new Date(request.periodStart);
    request.periodEnd = new Date(request.periodEnd);

    const response = await growthAnalyticsService.generateAnalytics(request);

    if (response.success) {
      res.status(201).json(response);
    } else {
      res.status(500).json(response);
    }
  } catch (error) {
    console.error('Error generating analytics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route GET /api/prophetic-checkin/analytics/:userId
 * @desc Get analytics history
 * @access Private
 */
router.get('/analytics/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const analytics = await growthAnalyticsService.getAnalyticsHistory(userId, limit);

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching analytics history:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;
