/**
 * Spiritual Formation AI Routes
 * API endpoints for spiritual formation tracking and analysis
 */

import express, { Request, Response } from 'express';
import SpiritualFormationAIService from '../services/SpiritualFormationAIService';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const spiritualFormationService = new SpiritualFormationAIService();

/**
 * POST /api/spiritual-formation/check-in
 * Submit and analyze a spiritual check-in
 */
router.post('/check-in', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { responses, mood, spiritualTemperature } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    if (!responses || !Array.isArray(responses)) {
      res.status(400).json({ success: false, error: 'Responses array is required' });
      return;
    }

    // Create check-in object
    const checkIn = {
      id: `checkin_${Date.now()}`,
      userId,
      timestamp: new Date(),
      responses,
      mood,
      spiritualTemperature
    };

    // Analyze check-in
    const analysis = await spiritualFormationService.analyzeCheckIn(checkIn);

    res.json({
      success: true,
      data: {
        checkIn,
        analysis
      }
    });
  } catch (error) {
    console.error('Error processing check-in:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process spiritual check-in'
    });
  }
});

/**
 * POST /api/spiritual-formation/prayer
 * Submit and categorize a prayer request
 */
router.post('/prayer', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { request, isPrivate = true } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    if (!request) {
      res.status(400).json({ success: false, error: 'Prayer request text is required' });
      return;
    }

    // Create prayer request object
    const prayer = {
      id: `prayer_${Date.now()}`,
      userId,
      request,
      isPrivate,
      timestamp: new Date(),
      status: 'active' as const
    };

    // Categorize prayer
    const categories = await spiritualFormationService.categorizePrayer(prayer);

    res.json({
      success: true,
      data: {
        prayer,
        categories
      }
    });
  } catch (error) {
    console.error('Error processing prayer request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process prayer request'
    });
  }
});

/**
 * POST /api/spiritual-formation/journal
 * Submit and analyze a journal entry
 */
router.post('/journal', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { content, mood, isPrivate = true } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    if (!content) {
      res.status(400).json({ success: false, error: 'Journal content is required' });
      return;
    }

    // Create journal entry object
    const entry = {
      id: `journal_${Date.now()}`,
      userId,
      content,
      mood,
      isPrivate,
      timestamp: new Date()
    };

    // Analyze journal entry
    const insights = await spiritualFormationService.analyzeJournal(entry);

    res.json({
      success: true,
      data: {
        entry,
        insights
      }
    });
  } catch (error) {
    console.error('Error processing journal entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process journal entry'
    });
  }
});

/**
 * GET /api/spiritual-formation/recommendations
 * Get personalized spiritual practice recommendations
 */
router.get('/recommendations', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    // Get user's spiritual profile (would come from database in real implementation)
    const profile = {
      userId,
      strengths: ['prayer', 'scripture study'],
      growthAreas: ['fasting', 'solitude'],
      spiritualGifts: ['teaching', 'encouragement'],
      callingIndicators: ['ministry', 'education'],
      disciplinePreferences: ['morning devotions', 'journaling'],
      mentorshipNeeds: ['spiritual direction', 'accountability'],
      lastUpdated: new Date()
    };

    // Get recommendations
    const recommendations = await spiritualFormationService.recommendPractices(profile);

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get spiritual practice recommendations'
    });
  }
});

/**
 * POST /api/spiritual-formation/crisis-check
 * Check for spiritual or emotional crisis indicators
 */
router.post('/crisis-check', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    // Detect crisis
    const crisis = await spiritualFormationService.detectCrisis(userId, {});

    if (crisis) {
      res.json({
        success: true,
        data: {
          crisisDetected: true,
          crisis
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          crisisDetected: false
        }
      });
    }
  } catch (error) {
    console.error('Error checking for crisis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check for crisis indicators'
    });
  }
});

/**
 * GET /api/spiritual-formation/profile
 * Get user's spiritual profile
 */
router.get('/profile', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    // Get profile from database (placeholder implementation)
    const profile = {
      userId,
      strengths: [],
      growthAreas: [],
      spiritualGifts: [],
      callingIndicators: [],
      disciplinePreferences: [],
      mentorshipNeeds: [],
      lastUpdated: new Date()
    };

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get spiritual profile'
    });
  }
});

/**
 * GET /api/spiritual-formation/history
 * Get user's spiritual formation history
 */
router.get('/history', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { type, limit = 10 } = req.query;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    // Get history from database (placeholder implementation)
    const history = {
      checkIns: [],
      prayers: [],
      journals: [],
      analyses: []
    };

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error getting history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get spiritual formation history'
    });
  }
});

export default router;
