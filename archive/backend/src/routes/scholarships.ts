/**
 * Scholarship Management API Routes
 * "For the Lord gives wisdom; from his mouth come knowledge and understanding" - Proverbs 2:6
 */

import express, { Request, Response } from 'express';
import ScholarshipService from '../services/ScholarshipService';
import ScholarshipApplicationService from '../services/ScholarshipApplicationService';
import EligibilityCheckService from '../services/EligibilityCheckService';
import ScholarshipDisbursementService from '../services/ScholarshipDisbursementService';
import ScholarshipAnalyticsService from '../services/ScholarshipAnalyticsService';
import ScholarshipRecommendationService from '../services/ScholarshipRecommendationService';
import ScholarshipNotificationService from '../services/ScholarshipNotificationService';
import { authenticateToken, requireRole } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();

// Initialize services
const scholarshipService = new ScholarshipService();
const applicationService = new ScholarshipApplicationService();
const eligibilityService = new EligibilityCheckService();
const disbursementService = new ScholarshipDisbursementService();
const analyticsService = new ScholarshipAnalyticsService();
const recommendationService = new ScholarshipRecommendationService();
const notificationService = new ScholarshipNotificationService();

// ============================================================================
// SCHOLARSHIP MANAGEMENT ROUTES
// ============================================================================

/**
 * Create new scholarship (Admin/Faculty only)
 */
router.post(
  '/scholarships',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId;
      const scholarship = await scholarshipService.createScholarship(req.body, userId);
      
      res.status(201).json({
        success: true,
        data: scholarship
      });
    } catch (error) {
      logger.error('Error creating scholarship', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create scholarship'
      });
    }
  }
);

/**
 * Get scholarship by ID
 */
router.get(
  '/scholarships/:id',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const scholarship = await scholarshipService.getScholarshipById(req.params.id);
      
      if (!scholarship) {
        res.status(404).json({
          success: false,
          error: 'Scholarship not found'
        });
        return;
      }

      res.json({
        success: true,
        data: scholarship
      });
    } catch (error) {
      logger.error('Error fetching scholarship', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch scholarship'
      });
    }
  }
);

/**
 * Search scholarships
 */
router.get(
  '/scholarships',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = {
        type: req.query.type ? (Array.isArray(req.query.type) ? req.query.type : [req.query.type]) : undefined,
        status: req.query.status ? (Array.isArray(req.query.status) ? req.query.status : [req.query.status]) : undefined,
        minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
        maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : undefined,
        deadlineAfter: req.query.deadlineAfter ? new Date(req.query.deadlineAfter as string) : undefined,
        deadlineBefore: req.query.deadlineBefore ? new Date(req.query.deadlineBefore as string) : undefined
      };

      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await scholarshipService.searchScholarships(filters, page, limit);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error searching scholarships', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search scholarships'
      });
    }
  }
);

/**
 * Update scholarship (Admin/Creator only)
 */
router.put(
  '/scholarships/:id',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const scholarship = await scholarshipService.updateScholarship(req.params.id, req.body);
      
      res.json({
        success: true,
        data: scholarship
      });
    } catch (error) {
      logger.error('Error updating scholarship', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update scholarship'
      });
    }
  }
);

/**
 * Delete scholarship (Admin only)
 */
router.delete(
  '/scholarships/:id',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await scholarshipService.deleteScholarship(req.params.id);
      
      res.json({
        success: true,
        message: 'Scholarship deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting scholarship', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete scholarship'
      });
    }
  }
);

// ============================================================================
// APPLICATION ROUTES
// ============================================================================

/**
 * Submit scholarship application
 */
router.post(
  '/applications',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId;
      const application = await applicationService.submitApplication(userId, req.body);
      
      res.status(201).json({
        success: true,
        data: application
      });
    } catch (error) {
      logger.error('Error submitting application', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit application'
      });
    }
  }
);

/**
 * Get user's applications
 */
router.get(
  '/applications/my-applications',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId;
      const applications = await applicationService.getApplicationsByUser(userId);
      
      res.json({
        success: true,
        data: applications
      });
    } catch (error) {
      logger.error('Error fetching user applications', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch applications'
      });
    }
  }
);

/**
 * Get application by ID
 */
router.get(
  '/applications/:id',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const application = await applicationService.getApplicationById(req.params.id);
      
      if (!application) {
        res.status(404).json({
          success: false,
          error: 'Application not found'
        });
        return;
      }

      res.json({
        success: true,
        data: application
      });
    } catch (error) {
      logger.error('Error fetching application', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch application'
      });
    }
  }
);

/**
 * Get applications for a scholarship (Admin/Faculty only)
 */
router.get(
  '/scholarships/:scholarshipId/applications',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const applications = await applicationService.getApplicationsByScholarship(
        req.params.scholarshipId,
        req.query as any
      );
      
      res.json({
        success: true,
        data: applications
      });
    } catch (error) {
      logger.error('Error fetching scholarship applications', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch applications'
      });
    }
  }
);

/**
 * Review application (Admin/Faculty only)
 */
router.post(
  '/applications/:id/review',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const reviewerId = (req as any).user.userId;
      const application = await applicationService.reviewApplication(reviewerId, {
        applicationId: req.params.id,
        ...req.body
      });
      
      res.json({
        success: true,
        data: application
      });
    } catch (error) {
      logger.error('Error reviewing application', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to review application'
      });
    }
  }
);

/**
 * Withdraw application
 */
router.post(
  '/applications/:id/withdraw',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId;
      await applicationService.withdrawApplication(req.params.id, userId);
      
      res.json({
        success: true,
        message: 'Application withdrawn successfully'
      });
    } catch (error) {
      logger.error('Error withdrawing application', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to withdraw application'
      });
    }
  }
);

/**
 * Get pending applications (Admin/Faculty only)
 */
router.get(
  '/applications/pending/review',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const applications = await applicationService.getPendingApplications(limit);
      
      res.json({
        success: true,
        data: applications
      });
    } catch (error) {
      logger.error('Error fetching pending applications', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch pending applications'
      });
    }
  }
);

// ============================================================================
// ELIGIBILITY ROUTES
// ============================================================================

/**
 * Check eligibility for a scholarship
 */
router.post(
  '/scholarships/:id/check-eligibility',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId;
      const scholarship = await scholarshipService.getScholarshipById(req.params.id);
      
      if (!scholarship) {
        res.status(404).json({
          success: false,
          error: 'Scholarship not found'
        });
        return;
      }

      const eligibilityResult = await eligibilityService.checkEligibility(
        userId,
        scholarship.eligibilityCriteria
      );
      
      res.json({
        success: true,
        data: eligibilityResult
      });
    } catch (error) {
      logger.error('Error checking eligibility', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check eligibility'
      });
    }
  }
);

// ============================================================================
// DISBURSEMENT ROUTES
// ============================================================================

/**
 * Create disbursement (Admin only)
 */
router.post(
  '/disbursements',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const disbursement = await disbursementService.createDisbursement(req.body);
      
      res.status(201).json({
        success: true,
        data: disbursement
      });
    } catch (error) {
      logger.error('Error creating disbursement', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create disbursement'
      });
    }
  }
);

/**
 * Process disbursement (Admin only)
 */
router.post(
  '/disbursements/:id/process',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const disbursement = await disbursementService.processDisbursement(req.params.id);
      
      res.json({
        success: true,
        data: disbursement
      });
    } catch (error) {
      logger.error('Error processing disbursement', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process disbursement'
      });
    }
  }
);

/**
 * Get user's disbursements
 */
router.get(
  '/disbursements/my-disbursements',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId;
      const disbursements = await disbursementService.getDisbursementsByRecipient(userId);
      
      res.json({
        success: true,
        data: disbursements
      });
    } catch (error) {
      logger.error('Error fetching user disbursements', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch disbursements'
      });
    }
  }
);

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

/**
 * Get scholarship analytics (Admin/Faculty only)
 */
router.get(
  '/scholarships/:id/analytics',
  authenticateToken,
  requireRole(['ADMIN', 'FACULTY']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const analytics = await analyticsService.getScholarshipAnalytics(req.params.id);
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error fetching scholarship analytics', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics'
      });
    }
  }
);

/**
 * Get system-wide analytics (Admin only)
 */
router.get(
  '/analytics/system',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const analytics = await analyticsService.getSystemAnalytics();
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error fetching system analytics', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch system analytics'
      });
    }
  }
);

/**
 * Get user statistics
 */
router.get(
  '/analytics/my-statistics',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId;
      const statistics = await analyticsService.getUserStatistics(userId);
      
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('Error fetching user statistics', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch statistics'
      });
    }
  }
);

// ============================================================================
// RECOMMENDATION ROUTES
// ============================================================================

/**
 * Get personalized recommendations
 */
router.get(
  '/recommendations',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const recommendations = await recommendationService.getRecommendations(userId, limit);
      
      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      logger.error('Error fetching recommendations', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch recommendations'
      });
    }
  }
);

/**
 * Get trending scholarships
 */
router.get(
  '/scholarships/trending/list',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 5;
      const scholarships = await recommendationService.getTrendingScholarships(limit);
      
      res.json({
        success: true,
        data: scholarships
      });
    } catch (error) {
      logger.error('Error fetching trending scholarships', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trending scholarships'
      });
    }
  }
);

/**
 * Get scholarships expiring soon
 */
router.get(
  '/scholarships/expiring/soon',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const days = req.query.days ? Number(req.query.days) : 7;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const scholarships = await recommendationService.getExpiringSoon(days, limit);
      
      res.json({
        success: true,
        data: scholarships
      });
    } catch (error) {
      logger.error('Error fetching expiring scholarships', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch expiring scholarships'
      });
    }
  }
);

// ============================================================================
// NOTIFICATION ROUTES
// ============================================================================

/**
 * Get unread notifications
 */
router.get(
  '/notifications/unread',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId;
      const notifications = await notificationService.getUnreadNotifications(userId);
      
      res.json({
        success: true,
        data: notifications
      });
    } catch (error) {
      logger.error('Error fetching unread notifications', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch notifications'
      });
    }
  }
);

/**
 * Mark notification as read
 */
router.post(
  '/notifications/:id/read',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      await notificationService.markAsRead(req.params.id);
      
      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      logger.error('Error marking notification as read', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark notification as read'
      });
    }
  }
);

export default router;
