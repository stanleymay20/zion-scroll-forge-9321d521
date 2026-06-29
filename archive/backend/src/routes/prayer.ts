/**
 * Prayer Journal and Requests API Routes
 * "The prayer of a righteous person is powerful and effective" - James 5:16
 */

import express, { Request, Response } from 'express';
import PrayerJournalService from '../services/PrayerJournalService';
import PrayerPartnerMatchingService from '../services/PrayerPartnerMatchingService';
import PrayerAnalyticsService from '../services/PrayerAnalyticsService';
import PrayerReminderService from '../services/PrayerReminderService';
import PrayerWallService from '../services/PrayerWallService';

const router = express.Router();

const prayerJournalService = new PrayerJournalService();
const partnerMatchingService = new PrayerPartnerMatchingService();
const analyticsService = new PrayerAnalyticsService();
const reminderService = new PrayerReminderService();
const wallService = new PrayerWallService();

// ============================================================================
// PRAYER JOURNAL ENTRIES
// ============================================================================

/**
 * @route   POST /api/prayer/entries
 * @desc    Create a new prayer journal entry
 * @access  Private
 */
router.post('/entries', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123'; // From auth middleware
    const entry = await prayerJournalService.createPrayerEntry(userId, req.body);
    
    res.status(201).json({
      success: true,
      data: entry
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create prayer entry'
    });
  }
});

/**
 * @route   GET /api/prayer/entries
 * @desc    Get user's prayer entries
 * @access  Private
 */
router.get('/entries', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    const { category, answered, tags, limit, offset } = req.query;
    
    const entries = await prayerJournalService.getUserPrayerEntries(userId, {
      category: category as any,
      answered: answered === 'true',
      tags: tags ? (tags as string).split(',') : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });
    
    res.json({
      success: true,
      data: entries
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve prayer entries'
    });
  }
});

/**
 * @route   GET /api/prayer/entries/:id
 * @desc    Get a specific prayer entry
 * @access  Private
 */
router.get('/entries/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    const entry = await prayerJournalService.getPrayerEntry(req.params.id, userId);
    
    res.json({
      success: true,
      data: entry
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve prayer entry'
    });
  }
});

/**
 * @route   PUT /api/prayer/entries/:id
 * @desc    Update a prayer entry
 * @access  Private
 */
router.put('/entries/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    const entry = await prayerJournalService.updatePrayerEntry(req.params.id, userId, req.body);
    
    res.json({
      success: true,
      data: entry
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update prayer entry'
    });
  }
});

/**
 * @route   DELETE /api/prayer/entries/:id
 * @desc    Delete a prayer entry
 * @access  Private
 */
router.delete('/entries/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    await prayerJournalService.deletePrayerEntry(req.params.id, userId);
    
    res.json({
      success: true,
      message: 'Prayer entry deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete prayer entry'
    });
  }
});

/**
 * @route   POST /api/prayer/entries/:id/answered
 * @desc    Mark prayer as answered
 * @access  Private
 */
router.post('/entries/:id/answered', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    const { testimony } = req.body;
    const entry = await prayerJournalService.markPrayerAnswered(req.params.id, userId, testimony);
    
    res.json({
      success: true,
      data: entry
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark prayer as answered'
    });
  }
});

// ============================================================================
// PRAYER REQUESTS
// ============================================================================

/**
 * @route   POST /api/prayer/requests
 * @desc    Create a new prayer request
 * @access  Private
 */
router.post('/requests', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    const request = await prayerJournalService.createPrayerRequest(userId, req.body);
    
    res.status(201).json({
      success: true,
      data: request
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create prayer request'
    });
  }
});

/**
 * @route   GET /api/prayer/requests/:id
 * @desc    Get a specific prayer request
 * @access  Private
 */
router.get('/requests/:id', async (req: Request, res: Response) => {
  try {
    const request = await prayerJournalService.getPrayerRequest(req.params.id);
    
    res.json({
      success: true,
      data: request
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve prayer request'
    });
  }
});

/**
 * @route   PUT /api/prayer/requests/:id
 * @desc    Update a prayer request
 * @access  Private
 */
router.put('/requests/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    const request = await prayerJournalService.updatePrayerRequest(req.params.id, userId, req.body);
    
    res.json({
      success: true,
      data: request
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update prayer request'
    });
  }
});

/**
 * @route   POST /api/prayer/requests/:id/pray
 * @desc    Pray for a request
 * @access  Private
 */
router.post('/requests/:id/pray', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    const { note } = req.body;
    const request = await prayerJournalService.prayForRequest(req.params.id, userId, note);
    
    res.json({
      success: true,
      data: request
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record prayer'
    });
  }
});

/**
 * @route   POST /api/prayer/requests/:id/updates
 * @desc    Add update to prayer request
 * @access  Private
 */
router.post('/requests/:id/updates', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    const { content, updateType } = req.body;
    await prayerJournalService.addPrayerUpdate(req.params.id, userId, content, updateType);
    
    res.json({
      success: true,
      message: 'Prayer update added successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add prayer update'
    });
  }
});

// ============================================================================
// PRAYER PARTNERS
// ============================================================================

/**
 * @route   GET /api/prayer/partners/potential
 * @desc    Find potential prayer partners
 * @access  Private
 */
router.get('/partners/potential', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    const { limit } = req.query;
    const matches = await partnerMatchingService.findPotentialPartners(
      userId,
      limit ? parseInt(limit as string) : undefined
    );
    
    res.json({
      success: true,
      data: matches
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to find potential partners'
    });
  }
});

/**
 * @route   POST /api/prayer/partners/request
 * @desc    Send prayer partner request
 * @access  Private
 */
router.post('/partners/request', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    const partnership = await partnerMatchingService.sendPartnerRequest(userId, req.body);
    
    res.status(201).json({
      success: true,
      data: partnership
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send partner request'
    });
  }
});

/**
 * @route   POST /api/prayer/partners/:id/accept
 * @desc    Accept prayer partner request
 * @access  Private
 */
router.post('/partners/:id/accept', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    const partnership = await partnerMatchingService.acceptPartnerRequest(userId, req.params.id);
    
    res.json({
      success: true,
      data: partnership
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to accept partner request'
    });
  }
});

/**
 * @route   POST /api/prayer/partners/:id/decline
 * @desc    Decline prayer partner request
 * @access  Private
 */
router.post('/partners/:id/decline', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    await partnerMatchingService.declinePartnerRequest(userId, req.params.id);
    
    res.json({
      success: true,
      message: 'Partner request declined'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to decline partner request'
    });
  }
});

/**
 * @route   GET /api/prayer/partners
 * @desc    Get user's prayer partners
 * @access  Private
 */
router.get('/partners', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    const { status } = req.query;
    const partners = await partnerMatchingService.getUserPartners(userId, status as any);
    
    res.json({
      success: true,
      data: partners
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve partners'
    });
  }
});

/**
 * @route   DELETE /api/prayer/partners/:partnerId
 * @desc    Remove prayer partner
 * @access  Private
 */
router.delete('/partners/:partnerId', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    await partnerMatchingService.removePartner(userId, req.params.partnerId);
    
    res.json({
      success: true,
      message: 'Prayer partner removed'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to remove partner'
    });
  }
});

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * @route   GET /api/prayer/analytics
 * @desc    Get prayer analytics
 * @access  Private
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    const analytics = await analyticsService.getUserAnalytics(userId);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve analytics'
    });
  }
});

/**
 * @route   GET /api/prayer/analytics/insights
 * @desc    Get prayer insights and recommendations
 * @access  Private
 */
router.get('/analytics/insights', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    const insights = await analyticsService.generateInsights(userId);
    
    res.json({
      success: true,
      data: insights
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate insights'
    });
  }
});

// ============================================================================
// REMINDERS
// ============================================================================

/**
 * @route   POST /api/prayer/reminders
 * @desc    Create a prayer reminder
 * @access  Private
 */
router.post('/reminders', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    const reminder = await reminderService.createReminder(userId, req.body);
    
    res.status(201).json({
      success: true,
      data: reminder
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create reminder'
    });
  }
});

/**
 * @route   GET /api/prayer/reminders
 * @desc    Get user's reminders
 * @access  Private
 */
router.get('/reminders', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    const { activeOnly } = req.query;
    const reminders = await reminderService.getUserReminders(userId, activeOnly === 'true');
    
    res.json({
      success: true,
      data: reminders
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve reminders'
    });
  }
});

/**
 * @route   PUT /api/prayer/reminders/:id
 * @desc    Update a reminder
 * @access  Private
 */
router.put('/reminders/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    const reminder = await reminderService.updateReminder(req.params.id, userId, req.body);
    
    res.json({
      success: true,
      data: reminder
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update reminder'
    });
  }
});

/**
 * @route   DELETE /api/prayer/reminders/:id
 * @desc    Delete a reminder
 * @access  Private
 */
router.delete('/reminders/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    await reminderService.deleteReminder(req.params.id, userId);
    
    res.json({
      success: true,
      message: 'Reminder deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete reminder'
    });
  }
});

// ============================================================================
// PRAYER WALLS
// ============================================================================

/**
 * @route   POST /api/prayer/walls
 * @desc    Create a prayer wall
 * @access  Private
 */
router.post('/walls', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    const wall = await wallService.createPrayerWall(userId, req.body);
    
    res.status(201).json({
      success: true,
      data: wall
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create prayer wall'
    });
  }
});

/**
 * @route   GET /api/prayer/walls
 * @desc    Get all prayer walls
 * @access  Public
 */
router.get('/walls', async (req: Request, res: Response) => {
  try {
    const { type, isPublic, limit, offset } = req.query;
    const walls = await wallService.getAllPrayerWalls({
      type: type as any,
      isPublic: isPublic === 'true',
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });
    
    res.json({
      success: true,
      data: walls
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve prayer walls'
    });
  }
});

/**
 * @route   GET /api/prayer/walls/:id
 * @desc    Get a specific prayer wall
 * @access  Public
 */
router.get('/walls/:id', async (req: Request, res: Response) => {
  try {
    const wall = await wallService.getPrayerWall(req.params.id);
    
    res.json({
      success: true,
      data: wall
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve prayer wall'
    });
  }
});

/**
 * @route   POST /api/prayer/walls/:id/requests
 * @desc    Add request to prayer wall
 * @access  Private
 */
router.post('/walls/:id/requests', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    const { requestId } = req.body;
    await wallService.addRequestToWall(req.params.id, requestId, userId);
    
    res.json({
      success: true,
      message: 'Request added to prayer wall'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add request to wall'
    });
  }
});

/**
 * @route   GET /api/prayer/dashboard
 * @desc    Get prayer dashboard
 * @access  Private
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'user_123';
    const dashboard = await prayerJournalService.getPrayerDashboard(userId);
    
    res.json({
      success: true,
      data: dashboard
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve dashboard'
    });
  }
});

export default router;
