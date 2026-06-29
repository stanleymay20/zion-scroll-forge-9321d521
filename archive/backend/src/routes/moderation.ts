/**
 * Content Moderation API Routes
 * Endpoints for AI-powered content moderation system
 */

import express, { Request, Response } from 'express';
import ModerationAIService from '../services/ModerationAIService';
import ModerationAppealsService from '../services/ModerationAppealsService';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const moderationService = new ModerationAIService();
const appealsService = new ModerationAppealsService();

/**
 * POST /api/moderation/scan
 * Scan content for violations
 */
router.post('/scan', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { content, context, scanOptions } = req.body;

    if (!content || !content.content) {
      res.status(400).json({
        success: false,
        error: 'Content is required'
      });
      return;
    }

    const result = await moderationService.moderateContent({
      content,
      context,
      scanOptions
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error scanning content:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to scan content'
    });
  }
});

/**
 * POST /api/moderation/appeals
 * Submit an appeal for a moderation decision
 */
router.post('/appeals', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { moderationId, contentId, originalAction, appealReason } = req.body;
    const userId = (req as any).user?.id;

    if (!moderationId || !contentId || !originalAction || !appealReason) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
      return;
    }

    const appeal = await appealsService.submitAppeal(
      moderationId,
      userId,
      contentId,
      originalAction,
      appealReason
    );

    res.json({
      success: true,
      data: appeal
    });
  } catch (error: any) {
    console.error('Error submitting appeal:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit appeal'
    });
  }
});

/**
 * GET /api/moderation/appeals/:appealId
 * Get appeal details
 */
router.get('/appeals/:appealId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { appealId } = req.params;

    // Implementation would fetch appeal details
    res.json({
      success: true,
      data: { message: 'Appeal details endpoint' }
    });
  } catch (error: any) {
    console.error('Error getting appeal:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get appeal'
    });
  }
});

/**
 * POST /api/moderation/appeals/:appealId/decision
 * Process appeal decision (moderators only)
 */
router.post('/appeals/:appealId/decision', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { appealId } = req.params;
    const { decision, newAction, explanation } = req.body;
    const reviewerId = (req as any).user?.id;

    // Check if user is a moderator
    const userRole = (req as any).user?.role;
    if (userRole !== 'admin' && userRole !== 'moderator') {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
      return;
    }

    const appeal = await appealsService.processAppealDecision(
      appealId,
      reviewerId,
      decision,
      newAction,
      explanation
    );

    res.json({
      success: true,
      data: appeal
    });
  } catch (error: any) {
    console.error('Error processing appeal decision:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process appeal decision'
    });
  }
});

/**
 * GET /api/moderation/metrics
 * Get moderation system metrics
 */
router.get('/metrics', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const timeframe = (req.query.timeframe as 'day' | 'week' | 'month') || 'week';

    const metrics = await moderationService.getMetrics(timeframe);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error: any) {
    console.error('Error getting metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get metrics'
    });
  }
});

/**
 * GET /api/moderation/appeals/statistics
 * Get appeal statistics
 */
router.get('/appeals/statistics', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const timeframe = (req.query.timeframe as 'day' | 'week' | 'month' | 'all') || 'week';

    const statistics = await appealsService.getAppealStatistics(timeframe);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error: any) {
    console.error('Error getting appeal statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get appeal statistics'
    });
  }
});

export default router;
