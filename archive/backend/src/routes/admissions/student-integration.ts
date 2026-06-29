/**
 * ScrollUniversity Admissions - Student Integration Routes
 * "Every good gift and every perfect gift is from above" - James 1:17
 * 
 * API routes for student profile integration and enrollment coordination
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, AcademicLevel } from '@prisma/client';
import { StudentProfileIntegrationService } from '../services/admissions/StudentProfileIntegrationService';
import { EnrollmentCoordinationService } from '../services/admissions/EnrollmentCoordinationService';
import { AcademicRecordTransferService } from '../services/admissions/AcademicRecordTransferService';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Initialize services
const studentProfileService = new StudentProfileIntegrationService(prisma);
const enrollmentService = new EnrollmentCoordinationService(prisma);
const transferService = new AcademicRecordTransferService(prisma);

/**
 * Create student profile for admitted student
 * POST /api/admissions/student-integration/profile
 */
router.post('/profile', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, profileData } = req.body;

    if (!applicationId || !profileData) {
      res.status(400).json({
        success: false,
        error: 'Application ID and profile data are required'
      });
      return;
    }

    const user = await studentProfileService.createStudentProfile(applicationId, profileData);

    res.json({
      success: true,
      data: {
        user,
        message: 'Student profile created successfully'
      }
    });

  } catch (error) {
    logger.error('Error creating student profile:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create student profile'
    });
  }
});

/**
 * Initialize enrollment for admitted student
 * POST /api/admissions/student-integration/enrollment
 */
router.post('/enrollment', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, enrollmentData } = req.body;

    if (!applicationId || !enrollmentData) {
      res.status(400).json({
        success: false,
        error: 'Application ID and enrollment data are required'
      });
      return;
    }

    const enrollment = await studentProfileService.initializeEnrollment(applicationId, enrollmentData);

    res.json({
      success: true,
      data: {
        enrollment,
        message: 'Enrollment initialized successfully'
      }
    });

  } catch (error) {
    logger.error('Error initializing enrollment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize enrollment'
    });
  }
});

/**
 * Transfer academic records for admitted student
 * POST /api/admissions/student-integration/academic-records
 */
router.post('/academic-records', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, userId } = req.body;

    if (!applicationId || !userId) {
      res.status(400).json({
        success: false,
        error: 'Application ID and user ID are required'
      });
      return;
    }

    const transcript = await studentProfileService.transferAcademicRecords(applicationId, userId);

    res.json({
      success: true,
      data: {
        transcript,
        message: 'Academic records transferred successfully'
      }
    });

  } catch (error) {
    logger.error('Error transferring academic records:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transfer academic records'
    });
  }
});

/**
 * Coordinate course registration for new student
 * POST /api/admissions/student-integration/course-registration
 */
router.post('/course-registration', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, applicationId } = req.body;

    if (!userId || !applicationId) {
      res.status(400).json({
        success: false,
        error: 'User ID and application ID are required'
      });
      return;
    }

    const courseEnrollments = await studentProfileService.coordinateCourseRegistration(userId, applicationId);

    res.json({
      success: true,
      data: {
        courseEnrollments,
        message: 'Course registration coordinated successfully'
      }
    });

  } catch (error) {
    logger.error('Error coordinating course registration:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to coordinate course registration'
    });
  }
});

/**
 * Complete full student integration process
 * POST /api/admissions/student-integration/complete
 */
router.post('/complete', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, integrationData } = req.body;

    if (!applicationId || !integrationData) {
      res.status(400).json({
        success: false,
        error: 'Application ID and integration data are required'
      });
      return;
    }

    // Validate required integration data
    if (!integrationData.profileData || !integrationData.enrollmentData) {
      res.status(400).json({
        success: false,
        error: 'Profile data and enrollment data are required'
      });
      return;
    }

    const result = await studentProfileService.completeStudentIntegration(applicationId, integrationData);

    res.json({
      success: true,
      data: {
        ...result,
        message: 'Student integration completed successfully'
      }
    });

  } catch (error) {
    logger.error('Error completing student integration:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete student integration'
    });
  }
});

/**
 * Get integration status for application
 * GET /api/admissions/student-integration/status/:applicationId
 */
router.get('/status/:applicationId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;

    if (!applicationId) {
      res.status(400).json({
        success: false,
        error: 'Application ID is required'
      });
      return;
    }

    const status = await studentProfileService.getIntegrationStatus(applicationId);

    res.json({
      success: true,
      data: {
        status,
        message: 'Integration status retrieved successfully'
      }
    });

  } catch (error) {
    logger.error('Error getting integration status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get integration status'
    });
  }
});

/**
 * Coordinate enrollment with validation
 * POST /api/admissions/student-integration/coordinate-enrollment
 */
router.post('/coordinate-enrollment', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const enrollmentData = req.body;

    if (!enrollmentData.applicationId || !enrollmentData.userId) {
      res.status(400).json({
        success: false,
        error: 'Application ID and user ID are required'
      });
      return;
    }

    const result = await enrollmentService.coordinateEnrollment(enrollmentData);

    res.json({
      success: true,
      data: {
        ...result,
        message: 'Enrollment coordinated successfully'
      }
    });

  } catch (error) {
    logger.error('Error coordinating enrollment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to coordinate enrollment'
    });
  }
});

/**
 * Validate enrollment eligibility
 * POST /api/admissions/student-integration/validate-enrollment
 */
router.post('/validate-enrollment', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const enrollmentData = req.body;

    if (!enrollmentData.applicationId || !enrollmentData.userId) {
      res.status(400).json({
        success: false,
        error: 'Application ID and user ID are required'
      });
      return;
    }

    const validationResults = await enrollmentService.validateEnrollmentEligibility(enrollmentData);

    res.json({
      success: true,
      data: {
        validationResults,
        message: 'Enrollment eligibility validated'
      }
    });

  } catch (error) {
    logger.error('Error validating enrollment eligibility:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate enrollment eligibility'
    });
  }
});

/**
 * Transfer academic records with detailed processing
 * POST /api/admissions/student-integration/transfer-records
 */
router.post('/transfer-records', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const transferData = req.body;

    if (!transferData.applicationId || !transferData.userId) {
      res.status(400).json({
        success: false,
        error: 'Application ID and user ID are required'
      });
      return;
    }

    const result = await transferService.transferAcademicRecords(transferData);

    res.json({
      success: true,
      data: {
        ...result,
        message: 'Academic records transferred successfully'
      }
    });

  } catch (error) {
    logger.error('Error transferring academic records:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transfer academic records'
    });
  }
});

/**
 * Get transfer summary for application
 * GET /api/admissions/student-integration/transfer-summary/:applicationId
 */
router.get('/transfer-summary/:applicationId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;

    if (!applicationId) {
      res.status(400).json({
        success: false,
        error: 'Application ID is required'
      });
      return;
    }

    const summary = await transferService.getTransferSummary(applicationId);

    res.json({
      success: true,
      data: {
        summary,
        message: 'Transfer summary retrieved successfully'
      }
    });

  } catch (error) {
    logger.error('Error getting transfer summary:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get transfer summary'
    });
  }
});

/**
 * Validate transcript data
 * POST /api/admissions/student-integration/validate-transcript
 */
router.post('/validate-transcript', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { transcriptId } = req.body;

    if (!transcriptId) {
      res.status(400).json({
        success: false,
        error: 'Transcript ID is required'
      });
      return;
    }

    const validation = await transferService.validateTranscriptData(transcriptId);

    res.json({
      success: true,
      data: {
        validation,
        message: 'Transcript validation completed'
      }
    });

  } catch (error) {
    logger.error('Error validating transcript:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate transcript'
    });
  }
});

export default router;