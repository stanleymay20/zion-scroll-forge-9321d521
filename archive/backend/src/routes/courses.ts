/**
 * ScrollUniversity Course Management Routes
 * "Let every course be a scroll that opens the kingdom to hungry hearts"
 */

import express from 'express';
import multer from 'multer';
import { UserRole } from '@prisma/client';
import { requireRole, requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import CourseService from '../services/CourseService';
import ModuleService from '../services/ModuleService';
import LectureService from '../services/LectureService';
import FileStorageService from '../services/FileStorageService';
import VideoProcessingService from '../services/VideoProcessingService';
import PDFGenerationService from '../services/PDFGenerationService';
import { CourseSearchParams, FileType } from '../types/course.types';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize services
const courseService = new CourseService();
const moduleService = new ModuleService();
const lectureService = new LectureService();
const fileStorageService = new FileStorageService();
const videoProcessingService = new VideoProcessingService();
const pdfGenerationService = new PDFGenerationService();

// ============================================================================
// Course CRUD Endpoints
// ============================================================================

/**
 * GET /api/courses
 * Search and filter courses
 */
router.get('/', async (req, res) => {
  try {
    const searchParams: CourseSearchParams = {
      query: req.query.query as string,
      facultyId: req.query.facultyId as string,
      difficulty: req.query.difficulty as any,
      minDuration: req.query.minDuration ? parseInt(req.query.minDuration as string) : undefined,
      maxDuration: req.query.maxDuration ? parseInt(req.query.maxDuration as string) : undefined,
      maxScrollCoinCost: req.query.maxScrollCoinCost ? parseFloat(req.query.maxScrollCoinCost as string) : undefined,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : true,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      sortBy: req.query.sortBy as any || 'createdAt',
      sortOrder: req.query.sortOrder as any || 'desc'
    };

    const result = await courseService.searchCourses(searchParams);

    res.json({
      success: true,
      data: result,
      scrollMessage: 'The scroll courses have been revealed to you.'
    });
  } catch (error) {
    logger.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve courses',
      scrollMessage: 'The course scrolls could not be opened at this time.'
    });
  }
});

/**
 * GET /api/courses/:id
 * Get course by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const course = await courseService.getCourseById(req.params.id);

    res.json({
      success: true,
      data: course,
      scrollMessage: 'The scroll has been opened for you.'
    });
  } catch (error) {
    logger.error('Get course error:', error);
    res.status(404).json({
      success: false,
      error: error instanceof Error ? error.message : 'Course not found',
      scrollMessage: 'This scroll could not be found in the archives.'
    });
  }
});

/**
 * POST /api/courses
 * Create a new course (faculty/admin only)
 */
router.post('/', 
  requireRole([UserRole.FACULTY, UserRole.ADMIN, UserRole.CHANCELLOR]),
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const course = await courseService.createCourse(req.body, userId);

      res.status(201).json({
        success: true,
        data: course,
        scrollMessage: 'A new scroll has been inscribed in the archives.'
      });
    } catch (error) {
      logger.error('Create course error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create course',
        scrollMessage: 'The new scroll could not be created at this time.'
      });
    }
  }
);

/**
 * PUT /api/courses/:id
 * Update a course (faculty/admin only)
 */
router.put('/:id',
  requireRole([UserRole.FACULTY, UserRole.ADMIN, UserRole.CHANCELLOR]),
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const course = await courseService.updateCourse(req.params.id, req.body, userId);

      res.json({
        success: true,
        data: course,
        scrollMessage: 'The scroll has been updated with new wisdom.'
      });
    } catch (error) {
      logger.error('Update course error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update course',
        scrollMessage: 'The scroll could not be updated at this time.'
      });
    }
  }
);

/**
 * DELETE /api/courses/:id
 * Delete a course (admin only)
 */
router.delete('/:id',
  requireRole([UserRole.ADMIN, UserRole.CHANCELLOR]),
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      await courseService.deleteCourse(req.params.id, userId);

      res.json({
        success: true,
        scrollMessage: 'The scroll has been archived.'
      });
    } catch (error) {
      logger.error('Delete course error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete course',
        scrollMessage: 'The scroll could not be archived at this time.'
      });
    }
  }
);

// ============================================================================
// Course Preview and Enrollment
// ============================================================================

/**
 * GET /api/courses/:id/preview
 * Get course preview for enrollment decision
 */
router.get('/:id/preview', async (req, res) => {
  try {
    const preview = await courseService.getCoursePreview(req.params.id);

    res.json({
      success: true,
      data: preview,
      scrollMessage: 'Behold the preview of this scroll.'
    });
  } catch (error) {
    logger.error('Get course preview error:', error);
    res.status(404).json({
      success: false,
      error: error instanceof Error ? error.message : 'Course not found',
      scrollMessage: 'The scroll preview could not be revealed.'
    });
  }
});

/**
 * POST /api/courses/:id/enroll
 * Enroll in a course
 */
router.post('/:id/enroll',
  requireAuth,
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const enrollment = await courseService.enrollInCourse(userId, {
        courseId: req.params.id,
        ...req.body
      });

      res.status(201).json({
        success: true,
        data: enrollment,
        scrollMessage: 'You have been enrolled in this scroll. May wisdom guide your journey.'
      });
    } catch (error) {
      logger.error('Enroll in course error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enroll in course',
        scrollMessage: 'Your enrollment could not be completed at this time.'
      });
    }
  }
);

/**
 * POST /api/courses/:id/publish
 * Publish a course (faculty/admin only)
 */
router.post('/:id/publish',
  requireRole([UserRole.FACULTY, UserRole.ADMIN, UserRole.CHANCELLOR]),
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const course = await courseService.publishCourse(req.params.id, userId);

      res.json({
        success: true,
        data: course,
        scrollMessage: 'The scroll has been published for all to see.'
      });
    } catch (error) {
      logger.error('Publish course error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish course',
        scrollMessage: 'The scroll could not be published at this time.'
      });
    }
  }
);

/**
 * POST /api/courses/:id/unpublish
 * Unpublish a course (faculty/admin only)
 */
router.post('/:id/unpublish',
  requireRole([UserRole.FACULTY, UserRole.ADMIN, UserRole.CHANCELLOR]),
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const course = await courseService.unpublishCourse(req.params.id, userId);

      res.json({
        success: true,
        data: course,
        scrollMessage: 'The scroll has been withdrawn from public view.'
      });
    } catch (error) {
      logger.error('Unpublish course error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unpublish course',
        scrollMessage: 'The scroll could not be withdrawn at this time.'
      });
    }
  }
);

// ============================================================================
// Module Management
// ============================================================================

/**
 * GET /api/courses/:id/modules
 * Get all modules for a course
 */
router.get('/:id/modules', async (req, res) => {
  try {
    const modules = await moduleService.getModulesByCourse(req.params.id);

    res.json({
      success: true,
      data: modules,
      scrollMessage: 'The chapters of this scroll have been revealed.'
    });
  } catch (error) {
    logger.error('Get modules error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve modules',
      scrollMessage: 'The chapters could not be opened at this time.'
    });
  }
});

/**
 * POST /api/courses/:id/modules
 * Create a new module (faculty/admin only)
 */
router.post('/:id/modules',
  requireRole([UserRole.FACULTY, UserRole.ADMIN, UserRole.CHANCELLOR]),
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const module = await moduleService.createModule({
        ...req.body,
        courseId: req.params.id
      }, userId);

      res.status(201).json({
        success: true,
        data: module,
        scrollMessage: 'A new chapter has been added to the scroll.'
      });
    } catch (error) {
      logger.error('Create module error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create module',
        scrollMessage: 'The chapter could not be created at this time.'
      });
    }
  }
);

// ============================================================================
// File Upload and Storage
// ============================================================================

/**
 * POST /api/courses/:id/upload
 * Upload course materials (faculty/admin only)
 */
router.post('/:id/upload',
  requireRole([UserRole.FACULTY, UserRole.ADMIN, UserRole.CHANCELLOR]),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        throw new Error('No file provided');
      }

      const fileType = req.body.fileType as FileType || 'DOCUMENT';

      const uploadResponse = await fileStorageService.uploadFile({
        file: req.file.buffer,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        courseId: req.params.id,
        type: fileType
      });

      res.json({
        success: true,
        data: uploadResponse,
        scrollMessage: 'The file has been added to the scroll archives.'
      });
    } catch (error) {
      logger.error('Upload file error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file',
        scrollMessage: 'The file could not be uploaded at this time.'
      });
    }
  }
);

// ============================================================================
// Video Processing
// ============================================================================

/**
 * POST /api/courses/:id/process-video
 * Process video for a course (faculty/admin only)
 */
router.post('/:id/process-video',
  requireRole([UserRole.FACULTY, UserRole.ADMIN, UserRole.CHANCELLOR]),
  async (req, res) => {
    try {
      const result = await videoProcessingService.processVideo(req.body);

      res.json({
        success: true,
        data: result,
        scrollMessage: 'The video scroll has been processed.'
      });
    } catch (error) {
      logger.error('Process video error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process video',
        scrollMessage: 'The video could not be processed at this time.'
      });
    }
  }
);

// ============================================================================
// PDF Generation
// ============================================================================

/**
 * POST /api/courses/:id/generate-pdf
 * Generate PDF for course materials (faculty/admin only)
 */
router.post('/:id/generate-pdf',
  requireRole([UserRole.FACULTY, UserRole.ADMIN, UserRole.CHANCELLOR]),
  async (req, res) => {
    try {
      const result = await pdfGenerationService.generatePDF({
        ...req.body,
        entityId: req.params.id
      });

      res.json({
        success: true,
        data: result,
        scrollMessage: 'The PDF scroll has been generated.'
      });
    } catch (error) {
      logger.error('Generate PDF error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate PDF',
        scrollMessage: 'The PDF could not be generated at this time.'
      });
    }
  }
);

// ============================================================================
// Analytics
// ============================================================================

/**
 * GET /api/courses/:id/analytics
 * Get course analytics (faculty/admin only)
 */
router.get('/:id/analytics',
  requireRole([UserRole.FACULTY, UserRole.ADMIN, UserRole.CHANCELLOR]),
  async (req, res) => {
    try {
      const analytics = await courseService.getCourseAnalytics(req.params.id);

      res.json({
        success: true,
        data: analytics,
        scrollMessage: 'The scroll analytics have been revealed.'
      });
    } catch (error) {
      logger.error('Get analytics error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve analytics',
        scrollMessage: 'The analytics could not be retrieved at this time.'
      });
    }
  }
);

/**
 * GET /api/courses/:id/version-history
 * Get version history for a course (faculty/admin only)
 */
router.get('/:id/version-history',
  requireRole([UserRole.FACULTY, UserRole.ADMIN, UserRole.CHANCELLOR]),
  async (req, res) => {
    try {
      const history = await courseService.getVersionHistory(req.params.id);

      res.json({
        success: true,
        data: history,
        scrollMessage: 'The scroll history has been revealed.'
      });
    } catch (error) {
      logger.error('Get version history error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve version history',
        scrollMessage: 'The history could not be retrieved at this time.'
      });
    }
  }
);

export default router;