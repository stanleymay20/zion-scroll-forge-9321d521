/**
 * Avatar Lecturers API Routes
 * RESTful endpoints for managing AI avatar lecturers and sessions
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import AvatarLecturerService from '../../services/AvatarLecturerService';
import ConversationAIService from '../../services/ConversationAIService';
import { getAvatarSessionRedisManager } from '../config/redis-avatar-sessions.config';
import { auth } from '../middleware/auth';
import { errorHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// Initialize services
const redisManager = getAvatarSessionRedisManager();
const conversationAI = new ConversationAIService({
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  claudeApiKey: process.env.CLAUDE_API_KEY || '',
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  cacheEnabled: true,
  maxCacheSize: 1000
}, logger);

const avatarService = new AvatarLecturerService(
  conversationAI,
  null, // AvatarRenderingService - to be implemented
  null, // SpiritualAlignmentValidator - to be implemented
  redisManager,
  logger
);

// Validation middleware
const validateRequest = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Avatar Management Routes

/**
 * GET /api/avatar-lecturers
 * List all avatar lecturers with optional filtering
 */
router.get('/', 
  auth,
  [
    query('subjects').optional().isArray(),
    query('languages').optional().isArray(),
    query('isActive').optional().isBoolean(),
    query('createdBy').optional().isString()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const filters = {
        subjects: req.query.subjects as string[],
        languages: req.query.languages as string[],
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        createdBy: req.query.createdBy as string
      };

      const avatars = await avatarService.listAvatars(filters);
      
      res.json({
        success: true,
        data: avatars,
        count: avatars.length
      });
    } catch (error) {
      logger.error('Failed to list avatars', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve avatars'
      });
    }
  }
);

/**
 * GET /api/avatar-lecturers/:id
 * Get a specific avatar lecturer by ID
 */
router.get('/:id',
  auth,
  [param('id').isString().notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const avatar = await avatarService.getAvatar(req.params.id);
      
      if (!avatar) {
        return res.status(404).json({
          success: false,
          error: 'Avatar not found'
        });
      }

      res.json({
        success: true,
        data: avatar
      });
    } catch (error) {
      logger.error('Failed to get avatar', { error: error.message, avatarId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve avatar'
      });
    }
  }
);

/**
 * POST /api/avatar-lecturers
 * Create a new avatar lecturer
 */
router.post('/',
  auth,
  [
    body('appearance').isObject().notEmpty(),
    body('personality').isObject().notEmpty(),
    body('voice').isObject().notEmpty(),
    body('capabilities').isArray().notEmpty(),
    body('spiritualSettings').isObject().notEmpty(),
    body('culturalSettings').isObject().notEmpty()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const config = {
        appearance: req.body.appearance,
        personality: req.body.personality,
        voice: req.body.voice,
        capabilities: req.body.capabilities,
        spiritualSettings: req.body.spiritualSettings,
        culturalSettings: req.body.culturalSettings,
        createdBy: req.user?.id || 'system'
      };

      const avatar = await avatarService.createAvatar(config);
      
      res.status(201).json({
        success: true,
        data: avatar,
        message: 'Avatar created successfully'
      });
    } catch (error) {
      logger.error('Failed to create avatar', { error: error.message, config: req.body });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create avatar'
      });
    }
  }
);

/**
 * PUT /api/avatar-lecturers/:id
 * Update an existing avatar lecturer
 */
router.put('/:id',
  auth,
  [
    param('id').isString().notEmpty(),
    body('appearance').optional().isObject(),
    body('personality').optional().isObject(),
    body('voice').optional().isObject(),
    body('capabilities').optional().isArray(),
    body('spiritualSettings').optional().isObject(),
    body('culturalSettings').optional().isObject()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const updates = {
        appearance: req.body.appearance,
        personality: req.body.personality,
        voice: req.body.voice,
        capabilities: req.body.capabilities,
        spiritualSettings: req.body.spiritualSettings,
        culturalSettings: req.body.culturalSettings
      };

      // Remove undefined values
      Object.keys(updates).forEach(key => {
        if (updates[key] === undefined) {
          delete updates[key];
        }
      });

      await avatarService.updateAvatar(req.params.id, updates);
      
      res.json({
        success: true,
        message: 'Avatar updated successfully'
      });
    } catch (error) {
      logger.error('Failed to update avatar', { 
        error: error.message, 
        avatarId: req.params.id,
        updates: req.body 
      });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update avatar'
      });
    }
  }
);

/**
 * DELETE /api/avatar-lecturers/:id
 * Delete an avatar lecturer
 */
router.delete('/:id',
  auth,
  [param('id').isString().notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      await avatarService.deleteAvatar(req.params.id);
      
      res.json({
        success: true,
        message: 'Avatar deleted successfully'
      });
    } catch (error) {
      logger.error('Failed to delete avatar', { error: error.message, avatarId: req.params.id });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete avatar'
      });
    }
  }
);

// Session Management Routes

/**
 * POST /api/avatar-lecturers/:id/sessions
 * Start a new lecture session with the avatar
 */
router.post('/:id/sessions',
  auth,
  [
    param('id').isString().notEmpty(),
    body('courseId').isString().notEmpty(),
    body('config').isObject().notEmpty()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const session = await avatarService.startLectureSession(
        req.params.id,
        req.body.courseId,
        req.body.config
      );
      
      res.status(201).json({
        success: true,
        data: session,
        message: 'Lecture session started successfully'
      });
    } catch (error) {
      logger.error('Failed to start session', { 
        error: error.message, 
        avatarId: req.params.id,
        courseId: req.body.courseId 
      });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to start session'
      });
    }
  }
);

/**
 * POST /api/sessions/:sessionId/join
 * Join a lecture session
 */
router.post('/sessions/:sessionId/join',
  auth,
  [param('sessionId').isString().notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const participant = await avatarService.joinSession(
        req.params.sessionId,
        req.user?.id || 'anonymous'
      );
      
      res.json({
        success: true,
        data: participant,
        message: 'Joined session successfully'
      });
    } catch (error) {
      logger.error('Failed to join session', { 
        error: error.message, 
        sessionId: req.params.sessionId,
        userId: req.user?.id 
      });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to join session'
      });
    }
  }
);

/**
 * POST /api/sessions/:sessionId/leave
 * Leave a lecture session
 */
router.post('/sessions/:sessionId/leave',
  auth,
  [param('sessionId').isString().notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      await avatarService.leaveSession(
        req.params.sessionId,
        req.user?.id || 'anonymous'
      );
      
      res.json({
        success: true,
        message: 'Left session successfully'
      });
    } catch (error) {
      logger.error('Failed to leave session', { 
        error: error.message, 
        sessionId: req.params.sessionId,
        userId: req.user?.id 
      });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to leave session'
      });
    }
  }
);

/**
 * POST /api/sessions/:sessionId/end
 * End a lecture session
 */
router.post('/sessions/:sessionId/end',
  auth,
  [param('sessionId').isString().notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const summary = await avatarService.endLectureSession(req.params.sessionId);
      
      res.json({
        success: true,
        data: summary,
        message: 'Session ended successfully'
      });
    } catch (error) {
      logger.error('Failed to end session', { 
        error: error.message, 
        sessionId: req.params.sessionId 
      });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to end session'
      });
    }
  }
);

// Interaction Routes

/**
 * POST /api/sessions/:sessionId/message
 * Send a message to the avatar in a session
 */
router.post('/sessions/:sessionId/message',
  auth,
  [
    param('sessionId').isString().notEmpty(),
    body('message').isString().notEmpty()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const response = await avatarService.sendMessage(
        req.params.sessionId,
        req.user?.id || 'anonymous',
        req.body.message
      );
      
      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      logger.error('Failed to send message', { 
        error: error.message, 
        sessionId: req.params.sessionId,
        userId: req.user?.id,
        message: req.body.message 
      });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to send message'
      });
    }
  }
);

/**
 * POST /api/sessions/:sessionId/question
 * Ask a question in the Q&A queue
 */
router.post('/sessions/:sessionId/question',
  auth,
  [
    param('sessionId').isString().notEmpty(),
    body('question').isString().notEmpty()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const response = await avatarService.askQuestion(
        req.params.sessionId,
        req.user?.id || 'anonymous',
        req.body.question
      );
      
      res.json({
        success: true,
        data: response,
        message: 'Question submitted to Q&A queue'
      });
    } catch (error) {
      logger.error('Failed to submit question', { 
        error: error.message, 
        sessionId: req.params.sessionId,
        userId: req.user?.id,
        question: req.body.question 
      });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to submit question'
      });
    }
  }
);

/**
 * GET /api/sessions/:sessionId/status
 * Get session status and metrics
 */
router.get('/sessions/:sessionId/status',
  auth,
  [param('sessionId').isString().notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const session = await redisManager.getSession(req.params.sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      const participants = await redisManager.getParticipants(req.params.sessionId);
      const qaQueue = await redisManager.getQAQueue(req.params.sessionId);
      const chatHistory = await redisManager.getChatHistory(req.params.sessionId, 10);

      res.json({
        success: true,
        data: {
          session,
          participantCount: Object.keys(participants).length,
          participants,
          qaQueueLength: qaQueue.length,
          recentMessages: chatHistory
        }
      });
    } catch (error) {
      logger.error('Failed to get session status', { 
        error: error.message, 
        sessionId: req.params.sessionId 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve session status'
      });
    }
  }
);

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'Avatar Lecturers API',
    timestamp: new Date().toISOString(),
    redis: redisManager ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
router.use(errorHandler);

export default router;