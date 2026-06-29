/**
 * ScrollUniversity Degree and Graduation Routes
 * "The LORD will fulfill his purpose for me" - Psalm 138:8
 * 
 * API endpoints for degree progress, graduation, and alumni management
 */

import express, { Request, Response } from 'express';
import { DegreeGraduationService } from '../services/DegreeGraduationService';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/productionLogger';

const router = express.Router();
const degreeGraduationService = new DegreeGraduationService();

/**
 * GET /api/degree-graduation/audit/:studentId/:degreeProgramId
 * Get degree audit for student
 */
router.get('/audit/:studentId/:degreeProgramId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { studentId, degreeProgramId } = req.params;

    const progress = await degreeGraduationService.getDegreeProgress(studentId, degreeProgramId);

    res.json({
      success: true,
      data: progress
    });

  } catch (error: any) {
    logger.error('Get degree audit error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/degree-graduation/track-completion
 * Track course completion for degree progress
 */
router.post('/track-completion', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID and course ID are required'
      });
    }

    await degreeGraduationService.trackCourseCompletion(studentId, courseId);

    res.json({
      success: true,
      message: 'Course completion tracked successfully'
    });

  } catch (error: any) {
    logger.error('Track completion error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/degree-graduation/process-graduation
 * Process graduation for eligible student
 */
router.post('/process-graduation', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { studentId, degreeProgramId, graduationDate } = req.body;

    if (!studentId || !degreeProgramId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID and degree program ID are required'
      });
    }

    const result = await degreeGraduationService.processGraduation(
      studentId,
      degreeProgramId,
      graduationDate ? new Date(graduationDate) : new Date()
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    logger.error('Process graduation error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/degree-graduation/diploma/:studentId/:degreeProgramId
 * Get student's diploma
 */
router.get('/diploma/:studentId/:degreeProgramId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { studentId, degreeProgramId } = req.params;

    const diploma = await degreeGraduationService.getDiploma(studentId, degreeProgramId);

    if (!diploma) {
      return res.status(404).json({
        success: false,
        error: 'Diploma not found'
      });
    }

    res.json({
      success: true,
      data: diploma
    });

  } catch (error: any) {
    logger.error('Get diploma error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/degree-graduation/transcript/:studentId
 * Get student's official transcript
 */
router.get('/transcript/:studentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const transcript = await degreeGraduationService.getOfficialTranscript(studentId);

    res.json({
      success: true,
      data: transcript
    });

  } catch (error: any) {
    logger.error('Get transcript error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/degree-graduation/verify-diploma
 * Verify diploma authenticity
 */
router.post('/verify-diploma', async (req: Request, res: Response) => {
  try {
    const { blockchainHash } = req.body;

    if (!blockchainHash) {
      return res.status(400).json({
        success: false,
        error: 'Blockchain hash is required'
      });
    }

    const result = await degreeGraduationService.verifyDiploma(blockchainHash);

    res.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    logger.error('Verify diploma error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/degree-graduation/verify-transcript
 * Verify transcript authenticity
 */
router.post('/verify-transcript', async (req: Request, res: Response) => {
  try {
    const { blockchainHash } = req.body;

    if (!blockchainHash) {
      return res.status(400).json({
        success: false,
        error: 'Blockchain hash is required'
      });
    }

    const result = await degreeGraduationService.verifyTranscript(blockchainHash);

    res.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    logger.error('Verify transcript error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/degree-graduation/ceremonies
 * Get upcoming graduation ceremonies
 */
router.get('/ceremonies', authenticateToken, async (req: Request, res: Response) => {
  try {
    const ceremonies = await degreeGraduationService.getUpcomingCeremonies();

    res.json({
      success: true,
      data: ceremonies
    });

  } catch (error: any) {
    logger.error('Get ceremonies error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/degree-graduation/register-ceremony
 * Register for graduation ceremony
 */
router.post('/register-ceremony', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { studentId, ceremonyId, guestCount, specialAccommodations } = req.body;

    if (!studentId || !ceremonyId || guestCount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Student ID, ceremony ID, and guest count are required'
      });
    }

    const registration = await degreeGraduationService.registerForCeremony(
      studentId,
      ceremonyId,
      guestCount,
      specialAccommodations
    );

    res.json({
      success: true,
      data: registration
    });

  } catch (error: any) {
    logger.error('Register ceremony error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/degree-graduation/alumni/:studentId
 * Get alumni transition status
 */
router.get('/alumni/:studentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const transition = await degreeGraduationService.getAlumniTransition(studentId);

    res.json({
      success: true,
      data: transition
    });

  } catch (error: any) {
    logger.error('Get alumni transition error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/degree-graduation/alumni/:studentId
 * Update alumni profile
 */
router.put('/alumni/:studentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const profileData = req.body;

    await degreeGraduationService.updateAlumniProfile(studentId, profileData);

    res.json({
      success: true,
      message: 'Alumni profile updated successfully'
    });

  } catch (error: any) {
    logger.error('Update alumni profile error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
