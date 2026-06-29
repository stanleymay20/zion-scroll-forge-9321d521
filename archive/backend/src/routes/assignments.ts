/**
 * ScrollUniversity Assignment and Grading Routes
 * "Whatever you do, work at it with all your heart, as working for the Lord" - Colossians 3:23
 * 
 * Complete assessment and grading engine with automated and manual grading
 */

import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, requireRole } from '../middleware/auth';
import { gradingService } from '../services/GradingService';
import PlagiarismDetectionService from '../services/PlagiarismDetectionService';
import { AssignmentSubmissionService } from '../services/AssignmentSubmissionService';
import { FeedbackGenerationService } from '../services/FeedbackGenerationService';
import { TranscriptService } from '../services/TranscriptService';
import { logger } from '../utils/productionLogger';

const router = express.Router();
const plagiarismService = new PlagiarismDetectionService();
const submissionService = new AssignmentSubmissionService();
const feedbackService = new FeedbackGenerationService();
const transcriptService = new TranscriptService();

/**
 * POST /api/assignments/submit
 * Submit an assignment for grading
 */
router.post(
  '/submit',
  authenticateToken,
  [
    body('assignmentId').notEmpty().withMessage('Assignment ID is required'),
    body('enrollmentId').notEmpty().withMessage('Enrollment ID is required'),
    body('content').notEmpty().withMessage('Content is required'),
    body('attachments').optional().isArray(),
    body('submissionType').isIn(['code', 'essay', 'math', 'project', 'quiz']).withMessage('Invalid submission type')
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array()
        });
        return;
      }

      const userId = req.user!.id;
      const { assignmentId, enrollmentId, content, attachments, submissionType } = req.body;

      logger.info('Assignment submission received', {
        userId,
        assignmentId,
        submissionType
      });

      // Create submission record
      const submission = await submissionService.createSubmission({
        assignmentId,
        enrollmentId,
        userId,
        content,
        attachments: attachments || [],
        submissionType
      });

      res.status(201).json({
        success: true,
        data: submission,
        message: 'Assignment submitted successfully',
        scrollMessage: 'Your work has been received. May the Lord bless your efforts.'
      });

    } catch (error: any) {
      logger.error('Assignment submission error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/assignments/:submissionId/grade
 * Grade a submission (automated or manual)
 */
router.post(
  '/:submissionId/grade',
  authenticateToken,
  requireRole(['FACULTY', 'ADMIN']),
  [
    param('submissionId').notEmpty(),
    body('gradingType').isIn(['automated', 'manual']).withMessage('Invalid grading type'),
    body('rubric').optional().isObject(),
    body('manualGrade').optional().isObject()
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array()
        });
        return;
      }

      const { submissionId } = req.params;
      const { gradingType, rubric, manualGrade } = req.body;
      const graderId = req.user!.id;

      // Get submission details
      const submission = await submissionService.getSubmission(submissionId);
      if (!submission) {
        res.status(404).json({
          success: false,
          error: 'Submission not found'
        });
        return;
      }

      let gradeResult;

      if (gradingType === 'automated') {
        // Automated grading based on submission type
        gradeResult = await submissionService.gradeSubmission(
          submission,
          rubric,
          graderId
        );
      } else {
        // Manual grading by faculty
        gradeResult = await submissionService.applyManualGrade(
          submissionId,
          manualGrade,
          graderId
        );
      }

      // Generate feedback
      const feedback = await feedbackService.generateFeedback(
        submission,
        gradeResult
      );

      // Update transcript
      await transcriptService.updateGrade(
        submission.userId,
        submission.assignmentId,
        gradeResult.grade.overallScore
      );

      res.json({
        success: true,
        data: {
          gradeResult,
          feedback
        },
        message: 'Assignment graded successfully',
        scrollMessage: 'The assessment has been completed with wisdom and grace.'
      });

    } catch (error: any) {
      logger.error('Grading error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/assignments/:submissionId/check-plagiarism
 * Check submission for plagiarism
 */
router.post(
  '/:submissionId/check-plagiarism',
  authenticateToken,
  requireRole(['FACULTY', 'ADMIN']),
  param('submissionId').notEmpty(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { submissionId } = req.params;

      const submission = await submissionService.getSubmission(submissionId);
      if (!submission) {
        res.status(404).json({
          success: false,
          error: 'Submission not found'
        });
        return;
      }

      // Run plagiarism check
      const plagiarismReport = await plagiarismService.checkPlagiarism({
        submissionId: submission.id,
        studentId: submission.userId,
        content: submission.content,
        courseId: submission.courseId,
        assignmentId: submission.assignmentId
      });

      res.json({
        success: true,
        data: plagiarismReport,
        message: 'Plagiarism check completed'
      });

    } catch (error: any) {
      logger.error('Plagiarism check error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/assignments/:assignmentId/submissions
 * Get all submissions for an assignment (faculty only)
 */
router.get(
  '/:assignmentId/submissions',
  authenticateToken,
  requireRole(['FACULTY', 'ADMIN']),
  [
    param('assignmentId').notEmpty(),
    query('status').optional().isIn(['DRAFT', 'SUBMITTED', 'GRADED', 'RETURNED']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { assignmentId } = req.params;
      const { status, page = 1, limit = 20 } = req.query;

      const submissions = await submissionService.getAssignmentSubmissions(
        assignmentId,
        {
          status: status as string,
          page: Number(page),
          limit: Number(limit)
        }
      );

      res.json({
        success: true,
        data: submissions
      });

    } catch (error: any) {
      logger.error('Get submissions error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/assignments/submissions/:submissionId
 * Get submission details with grade and feedback
 */
router.get(
  '/submissions/:submissionId',
  authenticateToken,
  param('submissionId').notEmpty(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { submissionId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const submission = await submissionService.getSubmissionWithDetails(submissionId);
      
      if (!submission) {
        res.status(404).json({
          success: false,
          error: 'Submission not found'
        });
        return;
      }

      // Check authorization
      if (submission.userId !== userId && !['FACULTY', 'ADMIN'].includes(userRole)) {
        res.status(403).json({
          success: false,
          error: 'Not authorized to view this submission'
        });
        return;
      }

      res.json({
        success: true,
        data: submission
      });

    } catch (error: any) {
      logger.error('Get submission error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/assignments/:submissionId/feedback
 * Add additional feedback to a graded submission
 */
router.post(
  '/:submissionId/feedback',
  authenticateToken,
  requireRole(['FACULTY', 'ADMIN']),
  [
    param('submissionId').notEmpty(),
    body('feedback').notEmpty().withMessage('Feedback is required'),
    body('feedbackType').optional().isIn(['general', 'improvement', 'encouragement', 'correction'])
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { submissionId } = req.params;
      const { feedback, feedbackType = 'general' } = req.body;
      const facultyId = req.user!.id;

      const updatedSubmission = await submissionService.addFeedback(
        submissionId,
        feedback,
        feedbackType,
        facultyId
      );

      res.json({
        success: true,
        data: updatedSubmission,
        message: 'Feedback added successfully',
        scrollMessage: 'Your wisdom has been shared to guide the student.'
      });

    } catch (error: any) {
      logger.error('Add feedback error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/assignments/bulk-grade
 * Grade multiple submissions at once (for quizzes with objective answers)
 */
router.post(
  '/bulk-grade',
  authenticateToken,
  requireRole(['FACULTY', 'ADMIN']),
  [
    body('submissionIds').isArray().withMessage('Submission IDs must be an array'),
    body('rubric').isObject().withMessage('Rubric is required')
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { submissionIds, rubric } = req.body;
      const graderId = req.user!.id;

      const results = await submissionService.bulkGradeSubmissions(
        submissionIds,
        rubric,
        graderId
      );

      res.json({
        success: true,
        data: results,
        message: `Successfully graded ${results.length} submissions`
      });

    } catch (error: any) {
      logger.error('Bulk grading error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/assignments/student/:userId/grades
 * Get all grades for a student
 */
router.get(
  '/student/:userId/grades',
  authenticateToken,
  param('userId').notEmpty(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const requesterId = req.user!.id;
      const requesterRole = req.user!.role;

      // Check authorization
      if (userId !== requesterId && !['FACULTY', 'ADMIN'].includes(requesterRole)) {
        res.status(403).json({
          success: false,
          error: 'Not authorized to view these grades'
        });
        return;
      }

      const grades = await submissionService.getStudentGrades(userId);

      res.json({
        success: true,
        data: grades
      });

    } catch (error: any) {
      logger.error('Get student grades error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

export default router;
