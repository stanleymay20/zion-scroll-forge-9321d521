/**
 * Scripture Memory API Routes
 * Endpoints for scripture memorization with spaced repetition
 */

import express, { Request, Response } from 'express';
import scriptureMemoryService from '../services/ScriptureMemoryService';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   POST /api/scripture-memory/verses
 * @desc    Create a new verse in the library
 * @access  Private (Admin/Faculty)
 */
router.post('/verses', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await scriptureMemoryService.createVerse(req.body);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in POST /verses:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/scripture-memory/verses
 * @desc    Get verses with filtering and pagination
 * @access  Private
 */
router.get('/verses', async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = {
      category: req.query.category as string,
      difficulty: req.query.difficulty as any,
      translation: req.query.translation as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      searchQuery: req.query.search as string,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };

    const result = await scriptureMemoryService.getVerses(filters);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in GET /verses:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/scripture-memory/verses/:verseId
 * @desc    Get a specific verse by ID
 * @access  Private
 */
router.get('/verses/:verseId', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await scriptureMemoryService.getVerseById(req.params.verseId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    logger.error('Error in GET /verses/:verseId:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/scripture-memory/progress/:verseId
 * @desc    Get user's progress on a specific verse
 * @access  Private
 */
router.get('/progress/:verseId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const result = await scriptureMemoryService.getVerseProgress(userId, req.params.verseId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in GET /progress/:verseId:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * @route   PUT /api/scripture-memory/progress
 * @desc    Update verse progress after practice
 * @access  Private
 */
router.put('/progress', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const result = await scriptureMemoryService.updateProgress(userId, req.body);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in PUT /progress:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/scripture-memory/due
 * @desc    Get verses due for review
 * @access  Private
 */
router.get('/due', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const result = await scriptureMemoryService.getDueVerses(userId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in GET /due:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * @route   POST /api/scripture-memory/quiz/:verseId
 * @desc    Generate a quiz for a verse
 * @access  Private
 */
router.post('/quiz/:verseId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { format } = req.body;
    const result = await scriptureMemoryService.generateQuiz(req.params.verseId, format);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in POST /quiz/:verseId:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * @route   POST /api/scripture-memory/quiz/submit
 * @desc    Submit a quiz attempt
 * @access  Private
 */
router.post('/quiz/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { verseId, quizId, userAnswer, timeSpent, hintsUsed } = req.body;
    
    const result = await scriptureMemoryService.submitQuizAttempt(
      userId,
      verseId,
      quizId,
      userAnswer,
      timeSpent || 0,
      hintsUsed || 0
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in POST /quiz/submit:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * @route   POST /api/scripture-memory/challenges
 * @desc    Create a memorization challenge
 * @access  Private
 */
router.post('/challenges', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const result = await scriptureMemoryService.createChallenge(userId, req.body);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in POST /challenges:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/scripture-memory/challenges
 * @desc    Get active challenges
 * @access  Private
 */
router.get('/challenges', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await scriptureMemoryService.getActiveChallenges();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in GET /challenges:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * @route   POST /api/scripture-memory/challenges/:challengeId/join
 * @desc    Join a memorization challenge
 * @access  Private
 */
router.post('/challenges/:challengeId/join', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const result = await scriptureMemoryService.joinChallenge(userId, req.params.challengeId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in POST /challenges/:challengeId/join:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/scripture-memory/statistics
 * @desc    Get user's scripture memory statistics
 * @access  Private
 */
router.get('/statistics', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const result = await scriptureMemoryService.getUserStatistics(userId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in GET /statistics:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * @route   POST /api/scripture-memory/share
 * @desc    Share a memorized verse
 * @access  Private
 */
router.post('/share', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { verseId, caption, isPublic } = req.body;
    
    const result = await scriptureMemoryService.shareVerse(userId, verseId, caption, isPublic);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in POST /share:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/scripture-memory/shared
 * @desc    Get shared verses feed
 * @access  Private
 */
router.get('/shared', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    const result = await scriptureMemoryService.getSharedVerses(limit, offset);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in GET /shared:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
