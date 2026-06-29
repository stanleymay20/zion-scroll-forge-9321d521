/**
 * Unified AI API Layer
 * "The Spirit of truth will guide you into all truth" - John 16:13
 * 
 * Consolidated API for all AI automation services with:
 * - Consistent request/response formats
 * - Authentication and authorization
 * - Rate limiting per user/service
 * - Comprehensive error handling
 */

import express, { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import AIGatewayService from '../services/AIGatewayService';
import SupportChatbotService from '../services/SupportChatbotService';
import GradingService from '../services/GradingService';
import ContentCreationService from '../services/ContentCreationService';
import PersonalizationService from '../services/PersonalizationService';
import IntegrityService from '../services/IntegrityService';
import AdmissionsAIService from '../services/AdmissionsAIService';
import ResearchAssistantService from '../services/ResearchAssistantService';
import CourseRecommendationService from '../services/CourseRecommendationService';
import FacultyAssistantService from '../services/FacultyAssistantService';
import TranslationService from '../services/TranslationService';
import SpiritualFormationAIService from '../services/SpiritualFormationAIService';
import FundraisingAIService from '../services/FundraisingAIService';
import CareerServicesAIService from '../services/CareerServicesAIService';
import ModerationAIService from '../services/ModerationAIService';
import AccessibilityAIService from '../services/AccessibilityAIService';
import { logger } from '../utils/productionLogger';

const router = express.Router();

// Services are imported as singletons
const aiGateway = AIGatewayService;
const chatbot = SupportChatbotService;
const grading = GradingService;
const contentCreation = ContentCreationService;
const personalization = PersonalizationService;
const integrity = IntegrityService;
const admissions = AdmissionsAIService;
const research = ResearchAssistantService;
const courseRec = CourseRecommendationService;
const facultyAssist = FacultyAssistantService;
const translation = TranslationService;
const spiritualFormation = SpiritualFormationAIService;
const fundraising = FundraisingAIService;
const careerServices = CareerServicesAIService;
const moderation = ModerationAIService;
const accessibility = AccessibilityAIService;

// Helper function for role-based access
const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    next();
  };
};

/**
 * Standard AI Response Format
 */
interface AIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    service: string;
    confidence?: number;
    cost?: number;
    processingTime?: number;
    humanReviewRequired?: boolean;
  };
}

/**
 * Rate limiting middleware for AI services
 */
const aiRateLimiter = (maxRequests: number = 100) => {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id || req.ip;
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    
    const userRequests = requests.get(userId);
    
    if (!userRequests || now > userRequests.resetTime) {
      requests.set(userId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (userRequests.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'AI service rate limit exceeded. Please try again later.',
        metadata: {
          resetTime: new Date(userRequests.resetTime).toISOString()
        }
      });
    }
    
    userRequests.count++;
    next();
  };
};

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(aiRateLimiter(100));

/**
 * GET /api/ai-unified/services
 * List all available AI services
 */
router.get('/services', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      services: [
        { id: 'chatbot', name: 'Student Support Chatbot', status: 'active' },
        { id: 'grading', name: 'Automated Grading', status: 'active' },
        { id: 'content-creation', name: 'Content Creation', status: 'active' },
        { id: 'personalization', name: 'Personalized Learning', status: 'active' },
        { id: 'integrity', name: 'Academic Integrity', status: 'active' },
        { id: 'admissions', name: 'Admissions Processing', status: 'active' },
        { id: 'research', name: 'Research Assistant', status: 'active' },
        { id: 'course-recommendation', name: 'Course Recommendation', status: 'active' },
        { id: 'faculty-assistant', name: 'Faculty Support', status: 'active' },
        { id: 'translation', name: 'Translation & Localization', status: 'active' },
        { id: 'spiritual-formation', name: 'Spiritual Formation', status: 'active' },
        { id: 'fundraising', name: 'Fundraising & Donor Management', status: 'active' },
        { id: 'career-services', name: 'Career Services', status: 'active' },
        { id: 'moderation', name: 'Content Moderation', status: 'active' },
        { id: 'accessibility', name: 'Accessibility Compliance', status: 'active' }
      ]
    }
  });
});

/**
 * POST /api/ai-unified/chatbot/query
 * Student support chatbot query
 */
router.post('/chatbot/query', async (req: Request, res: Response) => {
  try {
    const { query, conversationId } = req.body;
    const userId = (req as any).user.id;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }
    
    const startTime = Date.now();
    const response = await chatbot.handleQuery(query, userId, conversationId);
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: response,
      metadata: {
        service: 'chatbot',
        confidence: response.confidence,
        processingTime,
        humanReviewRequired: response.needsEscalation
      }
    });
  } catch (error: any) {
    logger.error('Chatbot query failed', { error: error?.message, userId: (req as any).user.id });
    res.status(500).json({
      success: false,
      error: 'Failed to process chatbot query'
    });
  }
});

/**
 * POST /api/ai-unified/grading/submit
 * Submit assignment for AI grading
 */
router.post('/grading/submit', async (req: Request, res: Response) => {
  try {
    const { assignmentId, submission, type } = req.body;
    const userId = (req as any).user.id;
    
    if (!assignmentId || !submission || !type) {
      return res.status(400).json({
        success: false,
        error: 'Assignment ID, submission, and type are required'
      });
    }
    
    const startTime = Date.now();
    let result;
    
    switch (type) {
      case 'code':
        result = await grading.gradeCode(submission, assignmentId);
        break;
      case 'essay':
        result = await grading.gradeEssay(submission, assignmentId);
        break;
      case 'math':
        result = await grading.gradeMath(submission, assignmentId);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid submission type'
        });
    }
    
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: result,
      metadata: {
        service: 'grading',
        confidence: result.confidence,
        processingTime,
        humanReviewRequired: result.confidence < 0.85
      }
    });
  } catch (error) {
    logger.error('Grading submission failed', { error: error.message, userId: (req as any).user.id });
    res.status(500).json({
      success: false,
      error: 'Failed to grade submission'
    });
  }
});

/**
 * POST /api/ai-unified/content/generate-lecture
 * Generate lecture content (faculty only)
 */
router.post('/content/generate-lecture', requireRole(['FACULTY', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { outline, objectives, courseId } = req.body;
    
    if (!outline || !objectives) {
      return res.status(400).json({
        success: false,
        error: 'Outline and objectives are required'
      });
    }
    
    const startTime = Date.now();
    const content = await contentCreation.generateLecture(outline, objectives, courseId);
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: content,
      metadata: {
        service: 'content-creation',
        processingTime,
        humanReviewRequired: true // Always require faculty review
      }
    });
  } catch (error) {
    logger.error('Lecture generation failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to generate lecture content'
    });
  }
});

/**
 * POST /api/ai-unified/content/generate-assessment
 * Generate assessment content (faculty only)
 */
router.post('/content/generate-assessment', requireRole(['FACULTY', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { topic, difficulty, count, type } = req.body;
    
    if (!topic || !difficulty || !count) {
      return res.status(400).json({
        success: false,
        error: 'Topic, difficulty, and count are required'
      });
    }
    
    const startTime = Date.now();
    const assessments = await contentCreation.generateAssessment(topic, difficulty, count, type);
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: assessments,
      metadata: {
        service: 'content-creation',
        processingTime,
        humanReviewRequired: true
      }
    });
  } catch (error) {
    logger.error('Assessment generation failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to generate assessment'
    });
  }
});

/**
 * GET /api/ai-unified/personalization/profile
 * Get personalized learning profile
 */
router.get('/personalization/profile', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const startTime = Date.now();
    const profile = await personalization.analyzePerformance(userId);
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: profile,
      metadata: {
        service: 'personalization',
        processingTime
      }
    });
  } catch (error) {
    logger.error('Profile analysis failed', { error: error.message, userId: (req as any).user.id });
    res.status(500).json({
      success: false,
      error: 'Failed to analyze learning profile'
    });
  }
});

/**
 * POST /api/ai-unified/personalization/recommendations
 * Get personalized resource recommendations
 */
router.post('/personalization/recommendations', async (req: Request, res: Response) => {
  try {
    const { topic, courseId } = req.body;
    const userId = (req as any).user.id;
    
    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required'
      });
    }
    
    const startTime = Date.now();
    const recommendations = await personalization.recommendResources(userId, topic, courseId);
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: recommendations,
      metadata: {
        service: 'personalization',
        processingTime
      }
    });
  } catch (error) {
    logger.error('Recommendations failed', { error: error.message, userId: (req as any).user.id });
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations'
    });
  }
});

/**
 * POST /api/ai-unified/integrity/check
 * Check submission for academic integrity issues
 */
router.post('/integrity/check', requireRole(['FACULTY', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { submissionId, content, studentId } = req.body;
    
    if (!submissionId || !content || !studentId) {
      return res.status(400).json({
        success: false,
        error: 'Submission ID, content, and student ID are required'
      });
    }
    
    const startTime = Date.now();
    const report = await integrity.checkSubmission(submissionId, content, studentId);
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: report,
      metadata: {
        service: 'integrity',
        processingTime,
        humanReviewRequired: report.recommendation !== 'clear'
      }
    });
  } catch (error) {
    logger.error('Integrity check failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to check academic integrity'
    });
  }
});

/**
 * POST /api/ai-unified/admissions/score
 * Score admissions application (admissions staff only)
 */
router.post('/admissions/score', requireRole(['ADMISSIONS_OFFICER', 'ADMISSIONS_COMMITTEE', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.body;
    
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        error: 'Application ID is required'
      });
    }
    
    const startTime = Date.now();
    const score = await admissions.scoreApplication(applicationId);
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: score,
      metadata: {
        service: 'admissions',
        processingTime,
        humanReviewRequired: score.overallScore >= 40 && score.overallScore <= 85
      }
    });
  } catch (error) {
    logger.error('Application scoring failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to score application'
    });
  }
});

/**
 * POST /api/ai-unified/research/literature-review
 * Conduct literature review
 */
router.post('/research/literature-review', async (req: Request, res: Response) => {
  try {
    const { topic, scope } = req.body;
    const userId = (req as any).user.id;
    
    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required'
      });
    }
    
    const startTime = Date.now();
    const review = await research.conductLiteratureReview(topic, scope || 'comprehensive');
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: review,
      metadata: {
        service: 'research',
        processingTime
      }
    });
  } catch (error) {
    logger.error('Literature review failed', { error: error.message, userId: (req as any).user.id });
    res.status(500).json({
      success: false,
      error: 'Failed to conduct literature review'
    });
  }
});

/**
 * POST /api/ai-unified/courses/recommend
 * Get course recommendations
 */
router.post('/courses/recommend', async (req: Request, res: Response) => {
  try {
    const { semester, major, goals } = req.body;
    const userId = (req as any).user.id;
    
    const startTime = Date.now();
    const recommendations = await courseRec.recommendCourses(userId, semester, major, goals);
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: recommendations,
      metadata: {
        service: 'course-recommendation',
        processingTime
      }
    });
  } catch (error) {
    logger.error('Course recommendation failed', { error: error.message, userId: (req as any).user.id });
    res.status(500).json({
      success: false,
      error: 'Failed to generate course recommendations'
    });
  }
});

/**
 * POST /api/ai-unified/faculty/answer-question
 * AI teaching assistant answers student question (faculty only)
 */
router.post('/faculty/answer-question', requireRole(['FACULTY', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { question, courseId } = req.body;
    
    if (!question || !courseId) {
      return res.status(400).json({
        success: false,
        error: 'Question and course ID are required'
      });
    }
    
    const startTime = Date.now();
    const answer = await facultyAssist.answerQuestion(question, courseId);
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: answer,
      metadata: {
        service: 'faculty-assistant',
        confidence: answer.confidence,
        processingTime,
        humanReviewRequired: answer.professorReviewNeeded
      }
    });
  } catch (error) {
    logger.error('Question answering failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to answer question'
    });
  }
});

/**
 * POST /api/ai-unified/translation/translate
 * Translate content
 */
router.post('/translation/translate', async (req: Request, res: Response) => {
  try {
    const { content, targetLanguage, contentType } = req.body;
    
    if (!content || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Content and target language are required'
      });
    }
    
    const startTime = Date.now();
    const translated = await translation.translateContent(content, targetLanguage, contentType);
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: translated,
      metadata: {
        service: 'translation',
        confidence: translated.confidence,
        processingTime,
        humanReviewRequired: translated.reviewRequired
      }
    });
  } catch (error) {
    logger.error('Translation failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to translate content'
    });
  }
});

/**
 * POST /api/ai-unified/spiritual/analyze-checkin
 * Analyze spiritual check-in
 */
router.post('/spiritual/analyze-checkin', async (req: Request, res: Response) => {
  try {
    const { checkIn } = req.body;
    const userId = (req as any).user.id;
    
    if (!checkIn) {
      return res.status(400).json({
        success: false,
        error: 'Check-in data is required'
      });
    }
    
    const startTime = Date.now();
    const analysis = await spiritualFormation.analyzeCheckIn(checkIn, userId);
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: analysis,
      metadata: {
        service: 'spiritual-formation',
        processingTime,
        humanReviewRequired: analysis.advisorAlert
      }
    });
  } catch (error) {
    logger.error('Spiritual check-in analysis failed', { error: error.message, userId: (req as any).user.id });
    res.status(500).json({
      success: false,
      error: 'Failed to analyze spiritual check-in'
    });
  }
});

/**
 * POST /api/ai-unified/fundraising/analyze-donor
 * Analyze donor (development staff only)
 */
router.post('/fundraising/analyze-donor', requireRole(['ADMIN', 'SCROLL_ELDER']), async (req: Request, res: Response) => {
  try {
    const { donorId } = req.body;
    
    if (!donorId) {
      return res.status(400).json({
        success: false,
        error: 'Donor ID is required'
      });
    }
    
    const startTime = Date.now();
    const intelligence = await fundraising.analyzeDonor(donorId);
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: intelligence,
      metadata: {
        service: 'fundraising',
        processingTime
      }
    });
  } catch (error) {
    logger.error('Donor analysis failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to analyze donor'
    });
  }
});

/**
 * POST /api/ai-unified/career/match
 * Match student to careers
 */
router.post('/career/match', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const startTime = Date.now();
    const matches = await careerServices.matchCareers(userId);
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: matches,
      metadata: {
        service: 'career-services',
        processingTime
      }
    });
  } catch (error) {
    logger.error('Career matching failed', { error: error.message, userId: (req as any).user.id });
    res.status(500).json({
      success: false,
      error: 'Failed to match careers'
    });
  }
});

/**
 * POST /api/ai-unified/moderation/check
 * Check content for moderation issues
 */
router.post('/moderation/check', requireRole(['FACULTY', 'ADMIN', 'SCROLL_ELDER']), async (req: Request, res: Response) => {
  try {
    const { content, contentType } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }
    
    const startTime = Date.now();
    const result = await moderation.moderateContent(content, contentType);
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: result,
      metadata: {
        service: 'moderation',
        processingTime,
        humanReviewRequired: !result.approved
      }
    });
  } catch (error) {
    logger.error('Content moderation failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to moderate content'
    });
  }
});

/**
 * POST /api/ai-unified/accessibility/generate-alt-text
 * Generate alt text for image
 */
router.post('/accessibility/generate-alt-text', async (req: Request, res: Response) => {
  try {
    const { imageUrl, context } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Image URL is required'
      });
    }
    
    const startTime = Date.now();
    const altText = await accessibility.generateAltText(imageUrl, context);
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: altText,
      metadata: {
        service: 'accessibility',
        processingTime
      }
    });
  } catch (error) {
    logger.error('Alt text generation failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to generate alt text'
    });
  }
});

/**
 * GET /api/ai-unified/health
 * Health check for all AI services
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await aiGateway.healthCheck();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('AI health check failed', { error: error.message });
    res.status(503).json({
      success: false,
      error: 'AI services health check failed'
    });
  }
});

export default router;
