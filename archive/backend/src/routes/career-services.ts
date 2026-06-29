/**
 * Career Services API Routes
 * RESTful endpoints for AI-powered career services
 */

import express, { Request, Response } from 'express';
import CareerServicesAIService from '../services/CareerServicesAIService';
import { MockInterviewService } from '../services/MockInterviewService';
import { EmployerMatchingService } from '../services/EmployerMatchingService';
import logger from '../utils/logger';

const router = express.Router();
const careerServicesAI = new CareerServicesAIService();
const mockInterviewService = new MockInterviewService();
const employerMatchingService = new EmployerMatchingService();

/**
 * POST /api/career-services/match-careers
 * Match student to career paths
 */
router.post('/match-careers', async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId, profile, preferences } = req.body;

    if (!studentId || !profile) {
      res.status(400).json({
        success: false,
        error: 'Student ID and profile are required',
      });
      return;
    }

    const response = await careerServicesAI.matchCareers({
      studentId,
      profile,
      preferences,
    });

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    logger.error('Error in match-careers endpoint', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to match careers',
    });
  }
});

/**
 * POST /api/career-services/review-resume
 * Review and provide feedback on resume
 */
router.post('/review-resume', async (req: Request, res: Response): Promise<void> => {
  try {
    const { resume, targetRole, targetIndustry } = req.body;

    if (!resume) {
      res.status(400).json({
        success: false,
        error: 'Resume is required',
      });
      return;
    }

    const response = await careerServicesAI.reviewResume({
      resume,
      targetRole,
      targetIndustry,
    });

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    logger.error('Error in review-resume endpoint', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to review resume',
    });
  }
});

/**
 * POST /api/career-services/mock-interview/create
 * Create new mock interview session
 */
router.post('/mock-interview/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId, role, questionCount, difficulty } = req.body;

    if (!studentId || !role) {
      res.status(400).json({
        success: false,
        error: 'Student ID and role are required',
      });
      return;
    }

    const response = await careerServicesAI.conductMockInterview({
      studentId,
      role,
      questionCount,
      difficulty,
    });

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    logger.error('Error in mock-interview/create endpoint', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to create mock interview session',
    });
  }
});

/**
 * POST /api/career-services/mock-interview/:sessionId/respond
 * Submit response to interview question
 */
router.post('/mock-interview/:sessionId/respond', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { questionId, response, duration } = req.body;

    if (!questionId || !response) {
      res.status(400).json({
        success: false,
        error: 'Question ID and response are required',
      });
      return;
    }

    await mockInterviewService.submitResponse(sessionId, questionId, response, duration || 0);

    res.json({
      success: true,
      message: 'Response submitted successfully',
    });
  } catch (error) {
    logger.error('Error in mock-interview respond endpoint', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to submit response',
    });
  }
});

/**
 * POST /api/career-services/mock-interview/:sessionId/complete
 * Complete interview and get feedback
 */
router.post('/mock-interview/:sessionId/complete', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const feedback = await mockInterviewService.completeInterview(sessionId);

    res.json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    logger.error('Error in mock-interview complete endpoint', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to complete interview',
    });
  }
});

/**
 * GET /api/career-services/mock-interview/:sessionId
 * Get interview session details
 */
router.get('/mock-interview/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const session = mockInterviewService.getSession(sessionId);

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Interview session not found',
      });
      return;
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    logger.error('Error in get mock-interview endpoint', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get interview session',
    });
  }
});

/**
 * POST /api/career-services/match-employers
 * Match student to employers and positions
 */
router.post('/match-employers', async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId, profile, preferences } = req.body;

    if (!studentId || !profile) {
      res.status(400).json({
        success: false,
        error: 'Student ID and profile are required',
      });
      return;
    }

    const response = await careerServicesAI.matchEmployers({
      studentId,
      profile,
      preferences,
    });

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    logger.error('Error in match-employers endpoint', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to match employers',
    });
  }
});

/**
 * POST /api/career-services/track-application
 * Track application outcome
 */
router.post('/track-application', async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId, employerId, positionId, status, feedback } = req.body;

    if (!studentId || !employerId || !positionId || !status) {
      res.status(400).json({
        success: false,
        error: 'Student ID, employer ID, position ID, and status are required',
      });
      return;
    }

    await employerMatchingService.trackApplicationOutcome(
      studentId,
      employerId,
      positionId,
      status,
      feedback
    );

    res.json({
      success: true,
      message: 'Application outcome tracked successfully',
    });
  } catch (error) {
    logger.error('Error in track-application endpoint', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to track application outcome',
    });
  }
});

/**
 * POST /api/career-services/analytics
 * Get career analytics
 */
router.post('/analytics', async (req: Request, res: Response): Promise<void> => {
  try {
    const { timeframe, major, industry } = req.body;

    if (!timeframe || !timeframe.startDate || !timeframe.endDate) {
      res.status(400).json({
        success: false,
        error: 'Timeframe with start and end dates is required',
      });
      return;
    }

    const response = await careerServicesAI.getCareerAnalytics({
      timeframe: {
        ...timeframe,
        startDate: new Date(timeframe.startDate),
        endDate: new Date(timeframe.endDate),
      },
      major,
      industry,
    });

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    logger.error('Error in analytics endpoint', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate career analytics',
    });
  }
});

/**
 * GET /api/career-services/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response): void => {
  res.json({
    success: true,
    message: 'Career Services AI is operational',
    timestamp: new Date().toISOString(),
  });
});

export default router;
