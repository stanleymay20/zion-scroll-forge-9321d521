/**
 * Accessibility AI Routes
 * WCAG 2.1 AA Compliance and Accommodation Management
 */

import express, { Request, Response } from 'express';
import { AccessibilityAIService } from '../services/AccessibilityAIService';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();
const accessibilityService = new AccessibilityAIService();

/**
 * Generate alt text for an image
 * POST /api/accessibility/alt-text
 */
router.post('/alt-text', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageUrl, context, courseId, contentType } = req.body;

    if (!imageUrl) {
      res.status(400).json({
        success: false,
        error: 'Image URL is required'
      });
      return;
    }

    const result = await accessibilityService.generateAltText({
      imageUrl,
      context,
      courseId,
      contentType
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in alt text generation endpoint', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate alt text'
    });
  }
});

/**
 * Generate captions for a video
 * POST /api/accessibility/captions
 */
router.post('/captions', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { videoUrl, audioUrl, language, includeSpeakerIdentification } = req.body;

    if (!videoUrl && !audioUrl) {
      res.status(400).json({
        success: false,
        error: 'Video URL or audio URL is required'
      });
      return;
    }

    const result = await accessibilityService.generateCaptions({
      videoUrl,
      audioUrl,
      language,
      includeSpeakerIdentification
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in caption generation endpoint', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate captions'
    });
  }
});

/**
 * Check WCAG compliance
 * POST /api/accessibility/compliance-check
 */
router.post('/compliance-check', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { contentUrl, htmlContent, contentType, wcagLevel } = req.body;

    if (!contentUrl && !htmlContent) {
      res.status(400).json({
        success: false,
        error: 'Content URL or HTML content is required'
      });
      return;
    }

    const report = await accessibilityService.checkCompliance({
      contentUrl,
      htmlContent,
      contentType: contentType || 'webpage',
      wcagLevel: wcagLevel || 'AA'
    });

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error in compliance check endpoint', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check compliance'
    });
  }
});

/**
 * Apply automated accessibility fixes
 * POST /api/accessibility/apply-fixes
 */
router.post('/apply-fixes', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { contentId, htmlContent, violations } = req.body;

    if (!contentId || !htmlContent || !violations) {
      res.status(400).json({
        success: false,
        error: 'Content ID, HTML content, and violations are required'
      });
      return;
    }

    const result = await accessibilityService.applyAutomatedFixes(
      contentId,
      htmlContent,
      violations
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in apply fixes endpoint', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to apply fixes'
    });
  }
});

/**
 * Recommend accommodations for a student
 * POST /api/accessibility/accommodations/recommend
 */
router.post('/accommodations/recommend', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId, disability, courseId, assessmentId, specificNeeds } = req.body;

    if (!studentId || !disability || !courseId) {
      res.status(400).json({
        success: false,
        error: 'Student ID, disability type, and course ID are required'
      });
      return;
    }

    const recommendation = await accessibilityService.recommendAccommodations({
      studentId,
      disability,
      courseId,
      assessmentId,
      specificNeeds
    });

    res.json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    logger.error('Error in accommodation recommendation endpoint', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to recommend accommodations'
    });
  }
});

/**
 * Get accessibility metrics
 * GET /api/accessibility/metrics
 */
router.get('/metrics', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const timeframe = (req.query.timeframe as 'day' | 'week' | 'month') || 'week';

    const metrics = await accessibilityService.getAccessibilityMetrics(timeframe);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error in metrics endpoint', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get metrics'
    });
  }
});

/**
 * Batch generate alt text for multiple images
 * POST /api/accessibility/alt-text/batch
 */
router.post('/alt-text/batch', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { images } = req.body;

    if (!images || !Array.isArray(images)) {
      res.status(400).json({
        success: false,
        error: 'Images array is required'
      });
      return;
    }

    // Process in batches to avoid overwhelming the API
    const batchSize = 10;
    const results = [];

    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((img: any) => accessibilityService.generateAltText(img))
      );
      results.push(...batchResults);
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Error in batch alt text generation endpoint', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate alt text'
    });
  }
});

/**
 * Batch generate captions for multiple videos
 * POST /api/accessibility/captions/batch
 */
router.post('/captions/batch', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { videos } = req.body;

    if (!videos || !Array.isArray(videos)) {
      res.status(400).json({
        success: false,
        error: 'Videos array is required'
      });
      return;
    }

    // Process in batches
    const batchSize = 5;
    const results = [];

    for (let i = 0; i < videos.length; i += batchSize) {
      const batch = videos.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((video: any) => accessibilityService.generateCaptions(video))
      );
      results.push(...batchResults);
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Error in batch caption generation endpoint', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate captions'
    });
  }
});

export default router;
