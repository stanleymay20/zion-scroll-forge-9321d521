import {Router, Request, Response} from 'express';
import {body, validationResult} from 'express-validator';
import {PrismaClient} from '@prisma/client';
import {authMiddleware} from '../../middleware/auth';
import {logger} from '../../utils/logger';

const router = Router();
const prisma = new PrismaClient();

interface FeedbackRequest {
  type: 'bug' | 'suggestion' | 'general' | 'usability';
  rating: number;
  category: string;
  title: string;
  description: string;
  currentStep?: number;
  userAgent: string;
  timestamp: string;
  userId?: string;
  applicationId?: string;
}

// Validation middleware
const validateFeedback = [
  body('type').isIn(['bug', 'suggestion', 'general', 'usability']).withMessage('Invalid feedback type'),
  body('rating').isInt({min: 1, max: 5}).withMessage('Rating must be between 1 and 5'),
  body('category').isLength({min: 1, max: 100}).withMessage('Category is required and must be less than 100 characters'),
  body('title').isLength({min: 1, max: 200}).withMessage('Title is required and must be less than 200 characters'),
  body('description').isLength({min: 1, max: 2000}).withMessage('Description is required and must be less than 2000 characters'),
  body('currentStep').optional().isInt({min: 0, max: 10}).withMessage('Current step must be a valid number'),
  body('userAgent').isLength({min: 1, max: 500}).withMessage('User agent is required'),
  body('timestamp').isISO8601().withMessage('Valid timestamp is required'),
  body('userId').optional().isUUID().withMessage('User ID must be a valid UUID'),
  body('applicationId').optional().isUUID().withMessage('Application ID must be a valid UUID'),
];

/**
 * @route POST /api/admissions/feedback
 * @desc Submit user feedback for the admissions process
 * @access Public (can be used by anonymous users)
 */
router.post('/', validateFeedback, async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
      return;
    }

    const feedbackData: FeedbackRequest = req.body;

    // Create feedback record
    const feedback = await prisma.admissionsFeedback.create({
      data: {
        type: feedbackData.type,
        rating: feedbackData.rating,
        category: feedbackData.category,
        title: feedbackData.title,
        description: feedbackData.description,
        currentStep: feedbackData.currentStep,
        userAgent: feedbackData.userAgent,
        timestamp: new Date(feedbackData.timestamp),
        userId: feedbackData.userId,
        applicationId: feedbackData.applicationId,
        ipAddress: req.ip,
        resolved: false,
        priority: calculatePriority(feedbackData),
      },
    });

    // Log feedback for monitoring
    logger.info('Admissions feedback submitted', {
      feedbackId: feedback.id,
      type: feedbackData.type,
      rating: feedbackData.rating,
      category: feedbackData.category,
      currentStep: feedbackData.currentStep,
      userId: feedbackData.userId,
    });

    // Send notification for high-priority feedback
    if (feedback.priority === 'HIGH') {
      await sendHighPriorityNotification(feedback);
    }

    res.status(201).json({
      success: true,
      data: {
        id: feedback.id,
        message: 'Feedback submitted successfully',
      },
    });
  } catch (error) {
    logger.error('Failed to submit feedback', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback',
    });
  }
});

/**
 * @route GET /api/admissions/feedback/analytics
 * @desc Get feedback analytics for admissions team
 * @access Private (Admin only)
 */
router.get('/analytics', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if user has admin permissions
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    const {startDate, endDate, type, category} = req.query;

    // Build filter conditions
    const where: any = {};
    
    if (startDate && endDate) {
      where.timestamp = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }
    
    if (type) {
      where.type = type;
    }
    
    if (category) {
      where.category = category;
    }

    // Get feedback analytics
    const [
      totalFeedback,
      averageRating,
      feedbackByType,
      feedbackByCategory,
      feedbackByStep,
      recentFeedback,
      priorityDistribution,
    ] = await Promise.all([
      prisma.admissionsFeedback.count({where}),
      
      prisma.admissionsFeedback.aggregate({
        where,
        _avg: {rating: true},
      }),
      
      prisma.admissionsFeedback.groupBy({
        by: ['type'],
        where,
        _count: {type: true},
        _avg: {rating: true},
      }),
      
      prisma.admissionsFeedback.groupBy({
        by: ['category'],
        where,
        _count: {category: true},
        _avg: {rating: true},
      }),
      
      prisma.admissionsFeedback.groupBy({
        by: ['currentStep'],
        where: {...where, currentStep: {not: null}},
        _count: {currentStep: true},
        _avg: {rating: true},
      }),
      
      prisma.admissionsFeedback.findMany({
        where,
        orderBy: {timestamp: 'desc'},
        take: 10,
        select: {
          id: true,
          type: true,
          rating: true,
          category: true,
          title: true,
          currentStep: true,
          timestamp: true,
          priority: true,
          resolved: true,
        },
      }),
      
      prisma.admissionsFeedback.groupBy({
        by: ['priority'],
        where,
        _count: {priority: true},
      }),
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalFeedback,
          averageRating: averageRating._avg.rating || 0,
        },
        distributions: {
          byType: feedbackByType,
          byCategory: feedbackByCategory,
          byStep: feedbackByStep,
          byPriority: priorityDistribution,
        },
        recentFeedback,
      },
    });
  } catch (error) {
    logger.error('Failed to get feedback analytics', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get feedback analytics',
    });
  }
});

/**
 * @route PUT /api/admissions/feedback/:id/resolve
 * @desc Mark feedback as resolved
 * @access Private (Admin only)
 */
router.put('/:id/resolve', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    const {id} = req.params;
    const {resolution, resolvedBy} = req.body;

    const feedback = await prisma.admissionsFeedback.update({
      where: {id},
      data: {
        resolved: true,
        resolution,
        resolvedBy,
        resolvedAt: new Date(),
      },
    });

    logger.info('Feedback resolved', {
      feedbackId: id,
      resolvedBy,
    });

    res.json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    logger.error('Failed to resolve feedback', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      error: 'Failed to resolve feedback',
    });
  }
});

// Helper functions
function calculatePriority(feedback: FeedbackRequest): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  // Critical: Bug reports with low ratings
  if (feedback.type === 'bug' && feedback.rating <= 2) {
    return 'CRITICAL';
  }
  
  // High: Usability issues or bugs with medium ratings
  if ((feedback.type === 'usability' || feedback.type === 'bug') && feedback.rating <= 3) {
    return 'HIGH';
  }
  
  // Medium: General feedback with low ratings or suggestions
  if (feedback.rating <= 3 || feedback.type === 'suggestion') {
    return 'MEDIUM';
  }
  
  // Low: Positive general feedback
  return 'LOW';
}

async function sendHighPriorityNotification(feedback: any): Promise<void> {
  try {
    // In a real implementation, this would send notifications via email, Slack, etc.
    logger.warn('High priority feedback received', {
      feedbackId: feedback.id,
      type: feedback.type,
      rating: feedback.rating,
      title: feedback.title,
      category: feedback.category,
    });
    
    // TODO: Implement actual notification system
    // - Send email to admissions team
    // - Post to Slack channel
    // - Create support ticket
  } catch (error) {
    logger.error('Failed to send high priority notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export default router;