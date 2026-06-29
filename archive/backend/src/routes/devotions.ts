/**
 * Daily Devotion Routes
 * API endpoints for daily devotion system
 */

import express, { Request, Response } from 'express';
import DailyDevotionService from '../services/DailyDevotionService';
import ScriptureIntegrationService from '../services/ScriptureIntegrationService';
import DevotionAudioService from '../services/DevotionAudioService';
import DevotionRecommendationService from '../services/DevotionRecommendationService';
import DevotionContentManagementService from '../services/DevotionContentManagementService';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Initialize services
const devotionService = new DailyDevotionService();
const scriptureService = new ScriptureIntegrationService();
const audioService = new DevotionAudioService();
const recommendationService = new DevotionRecommendationService();
const contentManagementService = new DevotionContentManagementService();

/**
 * GET /api/devotions/today
 * Get today's devotion for the authenticated user
 */
router.get('/today', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const timezone = (req.query.timezone as string) || 'UTC';

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const devotionContent = await devotionService.getTodaysDevotion(userId, timezone);

    res.json({
      success: true,
      data: devotionContent
    });
  } catch (error) {
    console.error('Error getting today\'s devotion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve today\'s devotion'
    });
  }
});

/**
 * GET /api/devotions/:date
 * Get devotion for a specific date
 */
router.get('/:date', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.params;
    const devotionDate = new Date(date);

    if (isNaN(devotionDate.getTime())) {
      res.status(400).json({ success: false, error: 'Invalid date format' });
      return;
    }

    const devotion = await devotionService.getDevotionByDate(devotionDate);

    if (!devotion) {
      res.status(404).json({ success: false, error: 'Devotion not found for this date' });
      return;
    }

    res.json({
      success: true,
      data: devotion
    });
  } catch (error) {
    console.error('Error getting devotion by date:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve devotion'
    });
  }
});

/**
 * POST /api/devotions/:devotionId/complete
 * Mark a devotion as completed
 */
router.post('/:devotionId/complete', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { devotionId } = req.params;
    const { notes, rating, timeSpent } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const completion = await devotionService.completeDevotion(
      userId,
      devotionId,
      notes,
      rating,
      timeSpent
    );

    // Get updated streak
    const streak = await devotionService.getUserStreak(userId);

    res.json({
      success: true,
      data: {
        completion,
        streak
      }
    });
  } catch (error) {
    console.error('Error completing devotion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete devotion'
    });
  }
});

/**
 * GET /api/devotions/streak
 * Get user's devotion streak
 */
router.get('/user/streak', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const streak = await devotionService.getUserStreak(userId);

    res.json({
      success: true,
      data: streak
    });
  } catch (error) {
    console.error('Error getting streak:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve streak data'
    });
  }
});

/**
 * GET /api/devotions/user/preferences
 * Get user's devotion preferences
 */
router.get('/user/preferences', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const preferences = await devotionService.getUserPreferences(userId);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve preferences'
    });
  }
});

/**
 * PUT /api/devotions/user/preferences
 * Update user's devotion preferences
 */
router.put('/user/preferences', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const preferences = req.body;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const updated = await devotionService.updateUserPreferences(userId, preferences);

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

/**
 * GET /api/devotions/user/analytics
 * Get user's devotion analytics
 */
router.get('/user/analytics', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const analytics = await devotionService.getUserAnalytics(userId);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analytics'
    });
  }
});

/**
 * GET /api/devotions/user/history
 * Get user's devotion history
 */
router.get('/user/history', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const limit = parseInt(req.query.limit as string) || 30;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const history = await devotionService.getUserHistory(userId, limit, offset);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error getting history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve history'
    });
  }
});

/**
 * POST /api/devotions/:devotionId/discussions
 * Add a discussion comment to a devotion
 */
router.post('/:devotionId/discussions', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { devotionId } = req.params;
    const { content, parentId } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    if (!content) {
      res.status(400).json({ success: false, error: 'Content is required' });
      return;
    }

    const discussion = await devotionService.addDiscussion(devotionId, userId, content, parentId);

    res.json({
      success: true,
      data: discussion
    });
  } catch (error) {
    console.error('Error adding discussion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add discussion'
    });
  }
});

/**
 * GET /api/devotions/:devotionId/discussions
 * Get discussions for a devotion
 */
router.get('/:devotionId/discussions', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { devotionId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const discussions = await devotionService.getDevotionDiscussions(devotionId, limit);

    res.json({
      success: true,
      data: discussions
    });
  } catch (error) {
    console.error('Error getting discussions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve discussions'
    });
  }
});

/**
 * POST /api/devotions/:devotionId/share
 * Share a devotion
 */
router.post('/:devotionId/share', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { devotionId } = req.params;
    const { platform } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const result = await devotionService.shareDevotion(userId, devotionId, platform || 'general');

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error sharing devotion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share devotion'
    });
  }
});

/**
 * GET /api/devotions/recommendations
 * Get personalized devotion recommendations
 */
router.get('/user/recommendations', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const limit = parseInt(req.query.limit as string) || 5;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const preferences = await devotionService.getUserPreferences(userId);
    const analytics = await devotionService.getUserAnalytics(userId);

    const recommendations = await recommendationService.getRecommendations(
      userId,
      preferences,
      analytics,
      limit
    );

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations'
    });
  }
});

/**
 * GET /api/devotions/scripture/:reference
 * Get scripture passage with translation
 */
router.get('/scripture/:reference', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { reference } = req.params;
    const translation = (req.query.translation as any) || 'NIV';

    const scripture = await scriptureService.getScripture(reference, translation);

    res.json({
      success: true,
      data: scripture
    });
  } catch (error) {
    console.error('Error getting scripture:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve scripture'
    });
  }
});

/**
 * GET /api/devotions/scripture/translations
 * Get available Bible translations
 */
router.get('/scripture/translations/list', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const translations = scriptureService.getAvailableTranslations();

    res.json({
      success: true,
      data: translations
    });
  } catch (error) {
    console.error('Error getting translations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve translations'
    });
  }
});

/**
 * GET /api/devotions/audio/voices
 * Get available audio voices
 */
router.get('/audio/voices', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const voices = await audioService.getAvailableVoices();

    res.json({
      success: true,
      data: voices
    });
  } catch (error) {
    console.error('Error getting voices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve voices'
    });
  }
});

/**
 * POST /api/devotions/admin/create
 * Create a new devotion (admin only)
 */
router.post('/admin/create', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req as any).user?.role;

    if (userRole !== 'admin' && userRole !== 'faculty') {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    const request = req.body;

    const devotion = await contentManagementService.createDevotion(request);

    res.json({
      success: true,
      data: devotion
    });
  } catch (error) {
    console.error('Error creating devotion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create devotion'
    });
  }
});

/**
 * PUT /api/devotions/admin/:devotionId
 * Update a devotion (admin only)
 */
router.put('/admin/:devotionId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req as any).user?.role;

    if (userRole !== 'admin' && userRole !== 'faculty') {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    const { devotionId } = req.params;
    const updates = req.body;

    const devotion = await contentManagementService.updateDevotion(devotionId, updates);

    res.json({
      success: true,
      data: devotion
    });
  } catch (error) {
    console.error('Error updating devotion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update devotion'
    });
  }
});

/**
 * DELETE /api/devotions/admin/:devotionId
 * Delete a devotion (admin only)
 */
router.delete('/admin/:devotionId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req as any).user?.role;

    if (userRole !== 'admin') {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    const { devotionId } = req.params;

    await contentManagementService.deleteDevotion(devotionId);

    res.json({
      success: true,
      message: 'Devotion deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting devotion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete devotion'
    });
  }
});

export default router;
