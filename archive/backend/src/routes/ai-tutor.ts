/**
 * AI Tutor API Routes
 * "The Spirit of truth will guide you into all truth" - John 16:13
 * 
 * Comprehensive API endpoints for AI tutoring with:
 * - Session management (start, continue, end)
 * - Message handling (standard and streaming)
 * - Analytics and history retrieval
 */

import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { aiTutorService } from '../services/AITutorService';
import { logger } from '../utils/productionLogger';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * POST /api/ai-tutor/sessions/start
 * Start a new AI tutoring session
 */
router.post('/sessions/start', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { courseId, tutorType, learningObjectives } = req.body;

    if (!tutorType) {
      return res.status(400).json({
        success: false,
        error: 'Tutor type is required'
      });
    }

    const session = await aiTutorService.startSession(
      userId,
      courseId,
      tutorType,
      learningObjectives
    );

    res.json({
      success: true,
      data: session
    });
  } catch (error: any) {
    logger.error('Failed to start AI tutor session', { 
      error: error?.message,
      userId: (req as any).user.id 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to start tutoring session'
    });
  }
});

/**
 * POST /api/ai-tutor/sessions/:sessionId/continue
 * Continue an existing session
 */
router.post('/sessions/:sessionId/continue', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user.id;

    const session = await aiTutorService.continueSession(sessionId);

    // Verify user owns this session
    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to session'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error: any) {
    logger.error('Failed to continue AI tutor session', { 
      error: error?.message,
      sessionId: req.params.sessionId 
    });
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to continue session'
    });
  }
});

/**
 * POST /api/ai-tutor/sessions/:sessionId/message
 * Send a message to the AI tutor
 */
router.post('/sessions/:sessionId/message', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    const userId = (req as any).user.id;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Verify session ownership
    const session = await aiTutorService.continueSession(sessionId);
    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to session'
      });
    }

    const response = await aiTutorService.sendMessage(sessionId, message);

    res.json({
      success: true,
      data: response
    });
  } catch (error: any) {
    logger.error('Failed to send message to AI tutor', { 
      error: error?.message,
      sessionId: req.params.sessionId 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to process message'
    });
  }
});

/**
 * POST /api/ai-tutor/sessions/:sessionId/message/stream
 * Send a message with streaming response
 */
router.post('/sessions/:sessionId/message/stream', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    const userId = (req as any).user.id;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Verify session ownership
    const session = await aiTutorService.continueSession(sessionId);
    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to session'
      });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream response
    await aiTutorService.sendMessageStream(sessionId, message, (chunk) => {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    });

    res.end();
  } catch (error: any) {
    logger.error('Failed to stream message to AI tutor', { 
      error: error?.message,
      sessionId: req.params.sessionId 
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to stream message'
      });
    }
  }
});

/**
 * POST /api/ai-tutor/sessions/:sessionId/end
 * End a tutoring session
 */
router.post('/sessions/:sessionId/end', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { satisfactionRating, feedback } = req.body;
    const userId = (req as any).user.id;

    // Verify session ownership
    const session = await aiTutorService.continueSession(sessionId);
    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to session'
      });
    }

    const analytics = await aiTutorService.endSession(
      sessionId,
      satisfactionRating,
      feedback
    );

    res.json({
      success: true,
      data: { analytics }
    });
  } catch (error: any) {
    logger.error('Failed to end AI tutor session', { 
      error: error?.message,
      sessionId: req.params.sessionId 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to end session'
    });
  }
});

/**
 * GET /api/ai-tutor/sessions/:sessionId/history
 * Get session conversation history
 */
router.get('/sessions/:sessionId/history', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user.id;

    const history = await aiTutorService.getSessionHistory(sessionId);

    // Verify session ownership (check first message if available)
    const session = await aiTutorService.continueSession(sessionId);
    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to session'
      });
    }

    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    logger.error('Failed to get session history', { 
      error: error?.message,
      sessionId: req.params.sessionId 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get session history'
    });
  }
});

/**
 * GET /api/ai-tutor/analytics
 * Get user's AI tutor analytics
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const analytics = await aiTutorService.getUserTutorAnalytics(userId);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error: any) {
    logger.error('Failed to get user tutor analytics', { 
      error: error?.message,
      userId: (req as any).user.id 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics'
    });
  }
});

/**
 * GET /api/ai-tutor/tutor-types
 * Get available tutor types and their descriptions
 */
router.get('/tutor-types', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      tutorTypes: [
        {
          id: 'general',
          name: 'General ScrollDean',
          description: 'World-class general education tutor combining academic excellence with spiritual wisdom',
          icon: '🎓'
        },
        {
          id: 'math',
          name: 'Mathematics ScrollDean',
          description: 'Expert in rigorous mathematical reasoning, proofs, and applications',
          icon: '📐'
        },
        {
          id: 'science',
          name: 'Science ScrollDean',
          description: 'Specialist in scientific method, research, and God\'s design in creation',
          icon: '🔬'
        },
        {
          id: 'theology',
          name: 'Theology ScrollDean',
          description: 'Deep biblical scholarship with systematic theological framework',
          icon: '✝️'
        },
        {
          id: 'programming',
          name: 'Computer Science ScrollDean',
          description: 'Expert in algorithms, software engineering, and kingdom technology',
          icon: '💻'
        },
        {
          id: 'business',
          name: 'Business ScrollDean',
          description: 'Specialist in economics, strategy, and kingdom stewardship',
          icon: '💼'
        },
        {
          id: 'engineering',
          name: 'Engineering ScrollDean',
          description: 'Expert in design, systems thinking, and appropriate technology',
          icon: '⚙️'
        }
      ]
    }
  });
});

export default router;
