// Content Creation API Routes
// "The Spirit of truth will guide you into all truth" - John 16:13

import express, { Request, Response } from 'express';
import ContentCreationService from '../services/ContentCreationService';
import FacultyReviewService from '../services/FacultyReviewService';
import { authenticateToken, requireRole } from '../middleware/auth';
import logger from '../utils/logger';
import {
  LectureGenerationRequest,
  AssessmentGenerationRequest,
  ResourceCurationRequest
} from '../types/content-creation.types';

const router = express.Router();
const contentService = new ContentCreationService();
const reviewService = new FacultyReviewService();

/**
 * Generate lecture content
 * POST /api/content-creation/lectures/generate
 */
router.post(
  '/lectures/generate',
  authenticateToken,
  requireRole(['FACULTY', 'ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const request: LectureGenerationRequest = req.body;

      logger.info('Lecture generation requested', {
        userId: (req as any).user?.id,
        course: request.courseOutline.title
      });

      const result = await contentService.generateLecture(request);

      res.json({
        success: result.success,
        data: result.content,
        confidence: result.confidence,
        cost: result.cost,
        processingTime: result.processingTime,
        reviewRequired: result.reviewRequired,
        warnings: result.warnings,
        error: result.error
      });
    } catch (error) {
      logger.error('Error in lecture generation endpoint', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to generate lecture content'
      });
    }
  }
);

/**
 * Generate assessment
 * POST /api/content-creation/assessments/generate
 */
router.post(
  '/assessments/generate',
  authenticateToken,
  requireRole(['FACULTY', 'ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const request: AssessmentGenerationRequest = req.body;

      logger.info('Assessment generation requested', {
        userId: (req as any).user?.id,
        topic: request.topic,
        type: request.assessmentType
      });

      const result = await contentService.generateAssessment(request);

      res.json({
        success: result.success,
        data: result.content,
        confidence: result.confidence,
        cost: result.cost,
        processingTime: result.processingTime,
        reviewRequired: result.reviewRequired,
        warnings: result.warnings,
        error: result.error
      });
    } catch (error) {
      logger.error('Error in assessment generation endpoint', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to generate assessment'
      });
    }
  }
);

/**
 * Generate unique problem set for student
 * POST /api/content-creation/assessments/unique-problems
 */
router.post(
  '/assessments/unique-problems',
  authenticateToken,
  requireRole(['FACULTY', 'ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { request, studentId, count } = req.body;

      logger.info('Unique problem set requested', {
        userId: (req as any).user?.id,
        studentId,
        count
      });

      const problems = await contentService.generateUniqueProblemSet(
        request,
        studentId,
        count
      );

      res.json({
        success: true,
        data: problems
      });
    } catch (error) {
      logger.error('Error generating unique problems', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to generate unique problems'
      });
    }
  }
);

/**
 * Curate resources
 * POST /api/content-creation/resources/curate
 */
router.post(
  '/resources/curate',
  authenticateToken,
  requireRole(['FACULTY', 'ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const request: ResourceCurationRequest = req.body;

      logger.info('Resource curation requested', {
        userId: (req as any).user?.id,
        topic: request.topic
      });

      const result = await contentService.curateResources(request);

      res.json({
        success: result.success,
        data: result.content,
        confidence: result.confidence,
        cost: result.cost,
        processingTime: result.processingTime,
        error: result.error
      });
    } catch (error) {
      logger.error('Error in resource curation endpoint', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to curate resources'
      });
    }
  }
);

/**
 * Submit content for review
 * POST /api/content-creation/reviews/submit
 */
router.post(
  '/reviews/submit',
  authenticateToken,
  requireRole(['FACULTY', 'ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { contentId, contentType, content } = req.body;
      const userId = (req as any).user?.id;

      logger.info('Content submitted for review', {
        userId,
        contentId,
        contentType
      });

      const review = await reviewService.submitForReview(
        contentId,
        contentType,
        content,
        userId
      );

      res.json({
        success: true,
        data: review
      });
    } catch (error) {
      logger.error('Error submitting content for review', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to submit content for review'
      });
    }
  }
);

/**
 * Get reviews for reviewer
 * GET /api/content-creation/reviews/my-reviews
 */
router.get(
  '/reviews/my-reviews',
  authenticateToken,
  requireRole(['FACULTY', 'ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const status = req.query.status as any;

      logger.info('Getting reviews for reviewer', { userId, status });

      const reviews = await reviewService.getReviewsForReviewer(userId, status);

      res.json({
        success: true,
        data: reviews
      });
    } catch (error) {
      logger.error('Error getting reviews', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get reviews'
      });
    }
  }
);

/**
 * Submit review feedback
 * POST /api/content-creation/reviews/:reviewId/submit
 */
router.post(
  '/reviews/:reviewId/submit',
  authenticateToken,
  requireRole(['FACULTY', 'ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { reviewId } = req.params;
      const { feedback, overallRating, status, modifications } = req.body;

      logger.info('Submitting review', {
        userId: (req as any).user?.id,
        reviewId,
        status
      });

      const review = await reviewService.submitReview(
        reviewId,
        feedback,
        overallRating,
        status,
        modifications
      );

      res.json({
        success: true,
        data: review
      });
    } catch (error) {
      logger.error('Error submitting review', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to submit review'
      });
    }
  }
);

/**
 * Approve content
 * POST /api/content-creation/reviews/:reviewId/approve
 */
router.post(
  '/reviews/:reviewId/approve',
  authenticateToken,
  requireRole(['FACULTY', 'ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { reviewId } = req.params;
      const { feedback, overallRating, modifications } = req.body;

      logger.info('Approving content', {
        userId: (req as any).user?.id,
        reviewId
      });

      const review = modifications
        ? await reviewService.approveWithChanges(
            reviewId,
            feedback,
            overallRating,
            modifications
          )
        : await reviewService.approveContent(reviewId, feedback, overallRating);

      res.json({
        success: true,
        data: review
      });
    } catch (error) {
      logger.error('Error approving content', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to approve content'
      });
    }
  }
);

/**
 * Request revision
 * POST /api/content-creation/reviews/:reviewId/request-revision
 */
router.post(
  '/reviews/:reviewId/request-revision',
  authenticateToken,
  requireRole(['FACULTY', 'ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { reviewId } = req.params;
      const { revisionRequests, feedback } = req.body;

      logger.info('Requesting revision', {
        userId: (req as any).user?.id,
        reviewId
      });

      const review = await reviewService.requestRevision(
        reviewId,
        revisionRequests,
        feedback
      );

      res.json({
        success: true,
        data: review
      });
    } catch (error) {
      logger.error('Error requesting revision', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to request revision'
      });
    }
  }
);

/**
 * Reject content
 * POST /api/content-creation/reviews/:reviewId/reject
 */
router.post(
  '/reviews/:reviewId/reject',
  authenticateToken,
  requireRole(['FACULTY', 'ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { reviewId } = req.params;
      const { feedback, rejectionReason } = req.body;

      logger.info('Rejecting content', {
        userId: (req as any).user?.id,
        reviewId
      });

      const review = await reviewService.rejectContent(
        reviewId,
        feedback,
        rejectionReason
      );

      res.json({
        success: true,
        data: review
      });
    } catch (error) {
      logger.error('Error rejecting content', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to reject content'
      });
    }
  }
);

/**
 * Get review statistics
 * GET /api/content-creation/reviews/statistics
 */
router.get(
  '/reviews/statistics',
  authenticateToken,
  requireRole(['FACULTY', 'ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;

      logger.info('Getting review statistics', { userId });

      const stats = await reviewService.getReviewStatistics(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting review statistics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get review statistics'
      });
    }
  }
);

/**
 * Get version history
 * GET /api/content-creation/content/:contentId/versions
 */
router.get(
  '/content/:contentId/versions',
  authenticateToken,
  requireRole(['FACULTY', 'ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { contentId } = req.params;

      logger.info('Getting version history', {
        userId: (req as any).user?.id,
        contentId
      });

      const versions = await reviewService.getVersionHistory(contentId);

      res.json({
        success: true,
        data: versions
      });
    } catch (error) {
      logger.error('Error getting version history', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get version history'
      });
    }
  }
);

export default router;
