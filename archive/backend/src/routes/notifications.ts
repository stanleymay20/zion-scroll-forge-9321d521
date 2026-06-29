/**
 * Notification Routes
 * API endpoints for notification management
 */

import express, { Request, Response } from 'express';
import NotificationService from '../services/NotificationService';
import NotificationBatchingService from '../services/NotificationBatchingService';
import NotificationTemplateService from '../services/NotificationTemplateService';
import NotificationAnalyticsService from '../services/NotificationAnalyticsService';
import { authenticate } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();
const notificationService = new NotificationService();
const batchingService = new NotificationBatchingService();
const templateService = new NotificationTemplateService();
const analyticsService = new NotificationAnalyticsService();

/**
 * @route   POST /api/notifications
 * @desc    Create a new notification
 * @access  Private
 */
router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const notification = await notificationService.createNotification(req.body);

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    logger.error('Error creating notification', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
    });
  }
});

/**
 * @route   POST /api/notifications/bulk
 * @desc    Send bulk notifications
 * @access  Private (Admin only)
 */
router.post('/bulk', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await notificationService.sendBulkNotifications(req.body);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error sending bulk notifications', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to send bulk notifications',
    });
  }
});

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = {
      userId: req.user?.id,
      category: req.query.category as any,
      status: req.query.status as any,
      priority: req.query.priority as any,
      isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const notifications = await notificationService.getUserNotifications(filter);

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    logger.error('Error getting notifications', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications',
    });
  }
});

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await notificationService.markAsRead(req.params.id);

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    logger.error('Error marking notification as read', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
    });
  }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await notificationService.deleteNotification(req.params.id);

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    logger.error('Error deleting notification', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
    });
  }
});

/**
 * @route   POST /api/notifications/:id/engagement
 * @desc    Track notification engagement
 * @access  Private
 */
router.post('/:id/engagement', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await notificationService.trackEngagement({
      notificationId: req.params.id,
      userId: req.user!.id,
      action: req.body.action,
      timestamp: new Date(),
      metadata: req.body.metadata,
    });

    res.json({
      success: true,
      message: 'Engagement tracked',
    });
  } catch (error) {
    logger.error('Error tracking engagement', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to track engagement',
    });
  }
});

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get user notification preferences
 * @access  Private
 */
router.get('/preferences', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const preferences = await notificationService.getUserPreferences(req.user!.id);

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.error('Error getting preferences', { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to get preferences',
    });
  }
});

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update user notification preferences
 * @access  Private
 */
router.put('/preferences', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const preferences = await notificationService.updatePreferences(req.user!.id, req.body);

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.error('Error updating preferences', { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
    });
  }
});

/**
 * @route   GET /api/notifications/templates
 * @desc    Get all notification templates
 * @access  Private
 */
router.get('/templates', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const category = req.query.category as any;
    const templates = await templateService.getAllTemplates(category);

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    logger.error('Error getting templates', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to get templates',
    });
  }
});

/**
 * @route   GET /api/notifications/templates/:id
 * @desc    Get template by ID
 * @access  Private
 */
router.get('/templates/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const template = await templateService.getTemplate(req.params.id);

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    logger.error('Error getting template', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to get template',
    });
  }
});

/**
 * @route   POST /api/notifications/templates/:id/preview
 * @desc    Preview template with variables
 * @access  Private
 */
router.post('/templates/:id/preview', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const preview = await templateService.previewTemplate(req.params.id, req.body.variables);

    res.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    logger.error('Error previewing template', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to preview template',
    });
  }
});

/**
 * @route   GET /api/notifications/analytics
 * @desc    Get notification analytics
 * @access  Private
 */
router.get('/analytics', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = {
      userId: req.query.userId as string,
      category: req.query.category as any,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    };

    const analytics = await analyticsService.getAnalytics(filter);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error getting analytics', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics',
    });
  }
});

/**
 * @route   GET /api/notifications/analytics/channel/:channel
 * @desc    Get channel performance
 * @access  Private
 */
router.get('/analytics/channel/:channel', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = {
      userId: req.query.userId as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    };

    const performance = await analyticsService.getChannelPerformance(req.params.channel as any, filter);

    res.json({
      success: true,
      data: performance,
    });
  } catch (error) {
    logger.error('Error getting channel performance', { error, channel: req.params.channel });
    res.status(500).json({
      success: false,
      error: 'Failed to get channel performance',
    });
  }
});

/**
 * @route   GET /api/notifications/analytics/category/:category
 * @desc    Get category performance
 * @access  Private
 */
router.get('/analytics/category/:category', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = {
      userId: req.query.userId as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    };

    const performance = await analyticsService.getCategoryPerformance(req.params.category as any, filter);

    res.json({
      success: true,
      data: performance,
    });
  } catch (error) {
    logger.error('Error getting category performance', { error, category: req.params.category });
    res.status(500).json({
      success: false,
      error: 'Failed to get category performance',
    });
  }
});

/**
 * @route   GET /api/notifications/analytics/engagement
 * @desc    Get user engagement metrics
 * @access  Private
 */
router.get('/analytics/engagement', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    };

    const engagement = await analyticsService.getUserEngagement(req.user!.id, filter);

    res.json({
      success: true,
      data: engagement,
    });
  } catch (error) {
    logger.error('Error getting user engagement', { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to get user engagement',
    });
  }
});

/**
 * @route   GET /api/notifications/analytics/trends
 * @desc    Get notification trends
 * @access  Private
 */
router.get('/analytics/trends', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const period = (req.query.period as 'day' | 'week' | 'month') || 'day';
    const filter = {
      userId: req.query.userId as string,
      category: req.query.category as any,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    };

    const trends = await analyticsService.getNotificationTrends(period, filter);

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    logger.error('Error getting notification trends', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to get notification trends',
    });
  }
});

/**
 * @route   GET /api/notifications/analytics/funnel
 * @desc    Get engagement funnel
 * @access  Private
 */
router.get('/analytics/funnel', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = {
      userId: req.query.userId as string,
      category: req.query.category as any,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    };

    const funnel = await analyticsService.getEngagementFunnel(filter);

    res.json({
      success: true,
      data: funnel,
    });
  } catch (error) {
    logger.error('Error getting engagement funnel', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to get engagement funnel',
    });
  }
});

export default router;
