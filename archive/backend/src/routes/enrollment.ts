// Enrollment and Onboarding Routes
// "Commit your work to the LORD, and your plans will be established" - Proverbs 16:3

import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import EnrollmentService from '../services/EnrollmentService';
import StudentProfileService from '../services/StudentProfileService';
import OnboardingWorkflowService from '../services/OnboardingWorkflowService';
import CourseRecommendationEngineService from '../services/CourseRecommendationEngineService';
import AcademicAdvisorService from '../services/AcademicAdvisorService';
import OrientationModuleService from '../services/OrientationModuleService';
import StudentSuccessTrackingService from '../services/StudentSuccessTrackingService';
import logger from '../utils/logger';

const router = express.Router();

// ============================================================================
// ENROLLMENT ENDPOINTS
// ============================================================================

/**
 * Create a new enrollment
 * POST /api/enrollment
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { courseId, paymentMethod, scholarshipId, notes } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'Course ID is required'
      });
    }

    const enrollment = await EnrollmentService.createEnrollment({
      userId,
      courseId,
      paymentMethod,
      scholarshipId,
      notes
    });

    res.json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    logger.error('Error creating enrollment', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create enrollment'
    });
  }
});

/**
 * Get enrollment by ID
 * GET /api/enrollment/:enrollmentId
 */
router.get('/:enrollmentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { enrollmentId } = req.params;

    const enrollment = await EnrollmentService.getEnrollment(enrollmentId);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: 'Enrollment not found'
      });
    }

    res.json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    logger.error('Error getting enrollment', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get enrollment'
    });
  }
});

/**
 * Get user's enrollments
 * GET /api/enrollment/user/:userId
 */
router.get('/user/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const enrollments = await EnrollmentService.getUserEnrollments(userId);

    res.json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    logger.error('Error getting user enrollments', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get enrollments'
    });
  }
});

/**
 * Update enrollment progress
 * PUT /api/enrollment/:enrollmentId/progress
 */
router.put('/:enrollmentId/progress', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { enrollmentId } = req.params;
    const { progress, currentModule } = req.body;

    if (progress === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Progress is required'
      });
    }

    const enrollment = await EnrollmentService.updateProgress(
      enrollmentId,
      progress,
      currentModule
    );

    res.json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    logger.error('Error updating enrollment progress', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to update progress'
    });
  }
});

/**
 * Withdraw from enrollment
 * POST /api/enrollment/:enrollmentId/withdraw
 */
router.post('/:enrollmentId/withdraw', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { enrollmentId } = req.params;
    const { reason } = req.body;

    await EnrollmentService.withdrawEnrollment(enrollmentId, reason);

    res.json({
      success: true,
      message: 'Enrollment withdrawn successfully'
    });
  } catch (error) {
    logger.error('Error withdrawing enrollment', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to withdraw enrollment'
    });
  }
});

/**
 * Bulk enroll users
 * POST /api/enrollment/bulk
 */
router.post('/bulk', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await EnrollmentService.bulkEnroll(req.body);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error bulk enrolling', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to bulk enroll'
    });
  }
});

/**
 * Get enrollment statistics
 * GET /api/enrollment/stats/:courseId?
 */
router.get('/stats/:courseId?', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    const stats = await EnrollmentService.getEnrollmentStats(courseId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting enrollment stats', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get stats'
    });
  }
});

// ============================================================================
// STUDENT PROFILE ENDPOINTS
// ============================================================================

/**
 * Get student profile
 * GET /api/enrollment/profile/:userId
 */
router.get('/profile/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const profile = await StudentProfileService.getProfile(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('Error getting profile', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
});

/**
 * Create student profile
 * POST /api/enrollment/profile
 */
router.post('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const profile = await StudentProfileService.createProfile(req.body);

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('Error creating profile', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create profile'
    });
  }
});

/**
 * Update student profile
 * PUT /api/enrollment/profile/:userId
 */
router.put('/profile/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const profile = await StudentProfileService.updateProfile(userId, req.body);

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('Error updating profile', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

/**
 * Verify student profile
 * GET /api/enrollment/profile/:userId/verify
 */
router.get('/profile/:userId/verify', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const verification = await StudentProfileService.verifyProfile(userId);

    res.json({
      success: true,
      data: verification
    });
  } catch (error) {
    logger.error('Error verifying profile', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to verify profile'
    });
  }
});

// ============================================================================
// ONBOARDING ENDPOINTS
// ============================================================================

/**
 * Initialize onboarding
 * POST /api/enrollment/onboarding/initialize
 */
router.post('/onboarding/initialize', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const progress = await OnboardingWorkflowService.initializeOnboarding(userId);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    logger.error('Error initializing onboarding', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to initialize onboarding'
    });
  }
});

/**
 * Get onboarding progress
 * GET /api/enrollment/onboarding/progress
 */
router.get('/onboarding/progress', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const progress = await OnboardingWorkflowService.getOnboardingProgress(userId);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    logger.error('Error getting onboarding progress', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get onboarding progress'
    });
  }
});

/**
 * Complete onboarding step
 * POST /api/enrollment/onboarding/step/:stepId/complete
 */
router.post('/onboarding/step/:stepId/complete', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { stepId } = req.params;

    const progress = await OnboardingWorkflowService.completeStep(userId, stepId);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    logger.error('Error completing onboarding step', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to complete step'
    });
  }
});

/**
 * Send welcome email
 * POST /api/enrollment/onboarding/welcome-email
 */
router.post('/onboarding/welcome-email', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    await OnboardingWorkflowService.sendWelcomeEmail(userId);

    res.json({
      success: true,
      message: 'Welcome email sent'
    });
  } catch (error) {
    logger.error('Error sending welcome email', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to send welcome email'
    });
  }
});

// ============================================================================
// COURSE RECOMMENDATION ENDPOINTS
// ============================================================================

/**
 * Get course recommendations
 * POST /api/enrollment/recommendations
 */
router.post('/recommendations', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const criteria = { ...req.body, userId };

    const recommendations = await CourseRecommendationEngineService.getRecommendations(criteria);

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('Error getting recommendations', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations'
    });
  }
});

/**
 * Get trending courses
 * GET /api/enrollment/recommendations/trending
 */
router.get('/recommendations/trending', authenticateToken, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;

    const trending = await CourseRecommendationEngineService.getTrendingCourses(limit);

    res.json({
      success: true,
      data: trending
    });
  } catch (error) {
    logger.error('Error getting trending courses', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get trending courses'
    });
  }
});

/**
 * Get recommended learning path
 * GET /api/enrollment/recommendations/path/:goalType
 */
router.get('/recommendations/path/:goalType', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { goalType } = req.params;

    const path = await CourseRecommendationEngineService.getRecommendedPath(
      userId,
      goalType as any
    );

    res.json({
      success: true,
      data: path
    });
  } catch (error) {
    logger.error('Error getting learning path', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get learning path'
    });
  }
});

// ============================================================================
// ACADEMIC ADVISOR ENDPOINTS
// ============================================================================

/**
 * Assign academic advisor
 * POST /api/enrollment/advisor/assign
 */
router.post('/advisor/assign', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { advisorId, assignmentReason } = req.body;

    const assignment = await AcademicAdvisorService.assignAdvisor(
      userId,
      advisorId,
      assignmentReason
    );

    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    logger.error('Error assigning advisor', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to assign advisor'
    });
  }
});

/**
 * Get student's advisor
 * GET /api/enrollment/advisor
 */
router.get('/advisor', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const advisor = await AcademicAdvisorService.getStudentAdvisor(userId);

    res.json({
      success: true,
      data: advisor
    });
  } catch (error) {
    logger.error('Error getting advisor', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get advisor'
    });
  }
});

// ============================================================================
// ORIENTATION ENDPOINTS
// ============================================================================

/**
 * Initialize orientation
 * POST /api/enrollment/orientation/initialize
 */
router.post('/orientation/initialize', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const progress = await OrientationModuleService.initializeOrientation(userId);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    logger.error('Error initializing orientation', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to initialize orientation'
    });
  }
});

/**
 * Get orientation progress
 * GET /api/enrollment/orientation/progress
 */
router.get('/orientation/progress', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const progress = await OrientationModuleService.getOrientationProgress(userId);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    logger.error('Error getting orientation progress', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get orientation progress'
    });
  }
});

/**
 * Complete orientation module
 * POST /api/enrollment/orientation/module/:moduleId/complete
 */
router.post('/orientation/module/:moduleId/complete', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { moduleId } = req.params;
    const { score } = req.body;

    const progress = await OrientationModuleService.completeModule(userId, moduleId, score);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    logger.error('Error completing orientation module', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete module'
    });
  }
});

// ============================================================================
// STUDENT SUCCESS TRACKING ENDPOINTS
// ============================================================================

/**
 * Get student success metrics
 * GET /api/enrollment/success/:userId
 */
router.get('/success/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const metrics = await StudentSuccessTrackingService.getSuccessMetrics(userId);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting success metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get success metrics'
    });
  }
});

export default router;
