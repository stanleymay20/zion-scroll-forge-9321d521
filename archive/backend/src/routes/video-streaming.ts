/**
 * Video Streaming Routes
 * "API endpoints for streaming the scrolls of wisdom"
 */

import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import VideoStreamingService from '../services/VideoStreamingService';
import TranscriptGenerationService from '../services/TranscriptGenerationService';
import VideoProgressTrackingService from '../services/VideoProgressTrackingService';
import VideoAnalyticsService from '../services/VideoAnalyticsService';
import DownloadableMaterialsService from '../services/DownloadableMaterialsService';
import CDNIntegrationService from '../services/CDNIntegrationService';
import { logger } from '../utils/logger';

const router = express.Router();

// Initialize services
const streamingService = new VideoStreamingService();
const transcriptService = new TranscriptGenerationService();
const progressService = new VideoProgressTrackingService();
const analyticsService = new VideoAnalyticsService();
const materialsService = new DownloadableMaterialsService();
const cdnService = new CDNIntegrationService();

// ============================================================================
// Video Streaming Endpoints
// ============================================================================

/**
 * GET /api/video-streaming/stream/:lectureId
 * Get video stream with adaptive bitrate
 */
router.get('/stream/:lectureId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { lectureId } = req.params;
    const { quality, startTime } = req.query;
    const userId = (req as any).user.userId;

    const stream = await streamingService.getVideoStream({
      videoId: lectureId,
      userId,
      quality: quality as any,
      startTime: startTime ? parseInt(startTime as string) : undefined
    });

    res.json({
      success: true,
      data: stream
    });
  } catch (error) {
    logger.error('Error getting video stream:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get video stream'
    });
  }
});

/**
 * GET /api/video-streaming/access/:lectureId
 * Check video access permissions
 */
router.get('/access/:lectureId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { lectureId } = req.params;
    const userId = (req as any).user.userId;

    const lecture = await streamingService['prisma'].lecture.findUnique({
      where: { id: lectureId },
      include: { module: true }
    });

    if (!lecture) {
      return res.status(404).json({
        success: false,
        error: 'Lecture not found'
      });
    }

    const access = await streamingService.checkVideoAccess({
      userId,
      lectureId,
      courseId: lecture.module.courseId
    });

    res.json({
      success: true,
      data: access
    });
  } catch (error) {
    logger.error('Error checking video access:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check video access'
    });
  }
});

// ============================================================================
// Transcript and Caption Endpoints
// ============================================================================

/**
 * POST /api/video-streaming/transcript/generate
 * Generate transcript from video
 */
router.post('/transcript/generate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const transcript = await transcriptService.generateTranscript(req.body);

    res.json({
      success: true,
      data: transcript
    });
  } catch (error) {
    logger.error('Error generating transcript:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate transcript'
    });
  }
});

/**
 * PUT /api/video-streaming/captions/:captionUrl
 * Update existing captions
 */
router.put('/captions/update', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { captionUrl, updates } = req.body;

    const updatedUrl = await transcriptService.updateCaptions(captionUrl, updates);

    res.json({
      success: true,
      data: { captionUrl: updatedUrl }
    });
  } catch (error) {
    logger.error('Error updating captions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update captions'
    });
  }
});

/**
 * POST /api/video-streaming/captions/translate
 * Translate captions to another language
 */
router.post('/captions/translate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { captionUrl, targetLanguage } = req.body;

    const translatedCaption = await transcriptService.translateCaptions(captionUrl, targetLanguage);

    res.json({
      success: true,
      data: translatedCaption
    });
  } catch (error) {
    logger.error('Error translating captions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to translate captions'
    });
  }
});

// ============================================================================
// Progress Tracking Endpoints
// ============================================================================

/**
 * POST /api/video-streaming/progress
 * Update video progress
 */
router.post('/progress', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const progress = await progressService.updateProgress({
      ...req.body,
      userId
    });

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    logger.error('Error updating progress:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update progress'
    });
  }
});

/**
 * GET /api/video-streaming/progress/:lectureId
 * Get video progress
 */
router.get('/progress/:lectureId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { lectureId } = req.params;
    const userId = (req as any).user.userId;

    const progress = await progressService.getProgress(userId, lectureId);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    logger.error('Error getting progress:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get progress'
    });
  }
});

/**
 * GET /api/video-streaming/progress/course/:courseId
 * Get all progress for a course
 */
router.get('/progress/course/:courseId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = (req as any).user.userId;

    const progress = await progressService.getCourseProgress(userId, courseId);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    logger.error('Error getting course progress:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get course progress'
    });
  }
});

/**
 * DELETE /api/video-streaming/progress/:lectureId
 * Reset video progress
 */
router.delete('/progress/:lectureId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { lectureId } = req.params;
    const userId = (req as any).user.userId;

    await progressService.resetProgress(userId, lectureId);

    res.json({
      success: true,
      message: 'Progress reset successfully'
    });
  } catch (error) {
    logger.error('Error resetting progress:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset progress'
    });
  }
});

// ============================================================================
// Analytics Endpoints
// ============================================================================

/**
 * GET /api/video-streaming/analytics
 * Get video analytics
 */
router.get('/analytics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const analytics = await analyticsService.getVideoAnalytics(req.query as any);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error getting analytics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get analytics'
    });
  }
});

/**
 * GET /api/video-streaming/analytics/trending
 * Get trending videos
 */
router.get('/analytics/trending', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const trending = await analyticsService.getTrendingVideos(
      limit ? parseInt(limit as string) : undefined
    );

    res.json({
      success: true,
      data: trending
    });
  } catch (error) {
    logger.error('Error getting trending videos:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get trending videos'
    });
  }
});

/**
 * POST /api/video-streaming/analytics/compare
 * Compare multiple videos
 */
router.post('/analytics/compare', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { lectureIds } = req.body;
    const comparison = await analyticsService.compareVideos(lectureIds);

    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    logger.error('Error comparing videos:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compare videos'
    });
  }
});

/**
 * GET /api/video-streaming/analytics/export
 * Export analytics data
 */
router.get('/analytics/export', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { format, ...query } = req.query;
    const data = await analyticsService.exportAnalytics(
      query as any,
      (format as 'CSV' | 'JSON') || 'JSON'
    );

    if (format === 'CSV') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
    } else {
      res.setHeader('Content-Type', 'application/json');
    }

    res.send(data);
  } catch (error) {
    logger.error('Error exporting analytics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export analytics'
    });
  }
});

// ============================================================================
// Downloadable Materials Endpoints
// ============================================================================

/**
 * POST /api/video-streaming/download
 * Get downloadable material
 */
router.post('/download', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const download = await materialsService.getMaterial({
      ...req.body,
      userId
    });

    res.json({
      success: true,
      data: download
    });
  } catch (error) {
    logger.error('Error getting downloadable material:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get downloadable material'
    });
  }
});

/**
 * POST /api/video-streaming/offline/create
 * Create offline download package
 */
router.post('/offline/create', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const package_ = await materialsService.createOfflinePackage({
      ...req.body,
      userId
    });

    res.json({
      success: true,
      data: package_
    });
  } catch (error) {
    logger.error('Error creating offline package:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create offline package'
    });
  }
});

/**
 * GET /api/video-streaming/offline/status/:downloadId
 * Get offline package status
 */
router.get('/offline/status/:downloadId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { downloadId } = req.params;
    const status = await materialsService.getPackageStatus(downloadId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error getting package status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get package status'
    });
  }
});

// ============================================================================
// CDN Endpoints
// ============================================================================

/**
 * POST /api/video-streaming/cdn/purge
 * Purge CDN cache
 */
router.post('/cdn/purge', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check admin permissions
    const userRole = (req as any).user.role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const result = await cdnService.purgeCache(req.body);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error purging CDN cache:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to purge CDN cache'
    });
  }
});

/**
 * GET /api/video-streaming/cdn/analytics
 * Get CDN analytics
 */
router.get('/cdn/analytics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const analytics = await cdnService.getAnalytics(
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error getting CDN analytics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get CDN analytics'
    });
  }
});

export default router;
