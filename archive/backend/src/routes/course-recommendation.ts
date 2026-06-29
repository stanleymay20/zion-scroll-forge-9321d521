/**
 * Course Recommendation API Routes
 * "I will instruct you and teach you in the way you should go" - Psalm 32:8
 */

import express, { Request, Response } from 'express';
import CourseRecommendationService from '../services/CourseRecommendationService';
import { logger } from '../utils/logger';

const router = express.Router();
const courseRecommendationService = new CourseRecommendationService();

/**
 * POST /api/course-recommendation/recommend
 * Generate comprehensive course recommendations
 */
router.post('/recommend', async (req: Request, res: Response) => {
  try {
    const { studentId, major, careerGoal, currentSemester, constraints } = req.body;

    if (!studentId || !major) {
      return res.status(400).json({
        success: false,
        error: 'studentId and major are required'
      });
    }

    const response = await courseRecommendationService.recommendCourses({
      studentId,
      major,
      careerGoal,
      currentSemester,
      constraints
    });

    res.json(response);
  } catch (error) {
    logger.error('Error in course recommendation endpoint', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/course-recommendation/degree-plan
 * Generate 4-year degree plan
 */
router.post('/degree-plan', async (req: Request, res: Response) => {
  try {
    const { studentId, major, careerGoal } = req.body;

    if (!studentId || !major) {
      return res.status(400).json({
        success: false,
        error: 'studentId and major are required'
      });
    }

    const degreePlan = await courseRecommendationService.generateDegreePlan(
      studentId,
      major,
      careerGoal
    );

    res.json({
      success: true,
      degreePlan
    });
  } catch (error) {
    logger.error('Error generating degree plan', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/course-recommendation/transfer-credits
 * Map transfer credits
 */
router.post('/transfer-credits', async (req: Request, res: Response) => {
  try {
    const { studentId, transcripts, targetMajor } = req.body;

    if (!studentId || !transcripts || !targetMajor) {
      return res.status(400).json({
        success: false,
        error: 'studentId, transcripts, and targetMajor are required'
      });
    }

    const mapping = await courseRecommendationService.mapTransferCredits(
      studentId,
      transcripts,
      targetMajor
    );

    res.json({
      success: true,
      mapping
    });
  } catch (error) {
    logger.error('Error mapping transfer credits', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/course-recommendation/career-alignment/:studentId/:careerGoal
 * Analyze career alignment
 */
router.get('/career-alignment/:studentId/:careerGoal', async (req: Request, res: Response) => {
  try {
    const { studentId, careerGoal } = req.params;

    // Get student's degree plan first
    const user = await courseRecommendationService['degreePlanService']['prisma'].user.findUnique({
      where: { id: studentId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Generate degree plan for analysis
    const degreePlan = await courseRecommendationService.generateDegreePlan(
      studentId,
      'General Studies' // Default major
    );

    const analysis = await courseRecommendationService.analyzeCareerAlignment(
      studentId,
      decodeURIComponent(careerGoal),
      degreePlan
    );

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    logger.error('Error analyzing career alignment', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
