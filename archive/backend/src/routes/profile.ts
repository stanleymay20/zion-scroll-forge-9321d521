/**
 * User Profile and Settings Routes
 * "I praise you because I am fearfully and wonderfully made" - Psalm 139:14
 */

import express from 'express';
import multer from 'multer';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import { profileService } from '../services/ProfileService';
import { avatarUploadService } from '../services/AvatarUploadService';
import { preferencesService } from '../services/PreferencesService';
import { privacySettingsService } from '../services/PrivacySettingsService';
import { securitySettingsService } from '../services/SecuritySettingsService';
import { dataExportService } from '../services/DataExportService';
import { accountDeletionService } from '../services/AccountDeletionService';
import { logger } from '../utils/productionLogger';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Validation schemas
const profileUpdateSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  bio: Joi.string().max(500).optional().allow(''),
  dateOfBirth: Joi.date().optional(),
  phoneNumber: Joi.string().max(20).optional().allow(''),
  location: Joi.string().max(100).optional().allow(''),
  scrollCalling: Joi.string().max(500).optional().allow(''),
  spiritualGifts: Joi.array().items(Joi.string()).optional(),
  kingdomVision: Joi.string().max(1000).optional().allow('')
});

// ============================================================================
// PROFILE ENDPOINTS
// ============================================================================

/**
 * Get current user profile
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const profile = await profileService.getProfile(req.user!.id);

    res.json({
      success: true,
      data: { profile }
    });
  } catch (error) {
    logger.error('Failed to get profile', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile'
    });
  }
});

/**
 * Get user profile by ID
 */
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await profileService.getProfile(userId);

    res.json({
      success: true,
      data: { profile }
    });
  } catch (error) {
    logger.error('Failed to get profile', { error: error.message, userId: req.params.userId });
    res.status(404).json({
      success: false,
      error: 'Profile not found'
    });
  }
});

/**
 * Update user profile
 */
router.put('/me', authenticate, async (req, res) => {
  try {
    const { error, value } = profileUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details[0].message
      });
    }

    const profile = await profileService.updateProfile(req.user!.id, value);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { profile }
    });
  } catch (error) {
    logger.error('Failed to update profile', { error: error.message, userId: req.user?.id });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get profile completion status
 */
router.get('/me/completion', authenticate, async (req, res) => {
  try {
    const status = await profileService.getCompletionStatus(req.user!.id);

    res.json({
      success: true,
      data: { status }
    });
  } catch (error) {
    logger.error('Failed to get completion status', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve completion status'
    });
  }
});

/**
 * Search profiles
 */
router.get('/search/:query', authenticate, async (req, res) => {
  try {
    const { query } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const profiles = await profileService.searchProfiles(query, limit);

    res.json({
      success: true,
      data: { profiles, count: profiles.length }
    });
  } catch (error) {
    logger.error('Failed to search profiles', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to search profiles'
    });
  }
});

// ============================================================================
// AVATAR ENDPOINTS
// ============================================================================

/**
 * Upload avatar
 */
router.post('/me/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const result = await avatarUploadService.uploadAvatar(req.user!.id, {
      file: req.file.buffer,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: result
    });
  } catch (error) {
    logger.error('Failed to upload avatar', { error: error.message, userId: req.user?.id });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Delete avatar
 */
router.delete('/me/avatar', authenticate, async (req, res) => {
  try {
    await avatarUploadService.deleteAvatar(req.user!.id);

    res.json({
      success: true,
      message: 'Avatar deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete avatar', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete avatar'
    });
  }
});

// ============================================================================
// PREFERENCES ENDPOINTS
// ============================================================================

/**
 * Get user preferences
 */
router.get('/me/preferences', authenticate, async (req, res) => {
  try {
    const preferences = await preferencesService.getPreferences(req.user!.id);

    res.json({
      success: true,
      data: { preferences }
    });
  } catch (error) {
    logger.error('Failed to get preferences', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve preferences'
    });
  }
});

/**
 * Update user preferences
 */
router.put('/me/preferences', authenticate, async (req, res) => {
  try {
    const preferences = await preferencesService.updatePreferences(req.user!.id, req.body);

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: { preferences }
    });
  } catch (error) {
    logger.error('Failed to update preferences', { error: error.message, userId: req.user?.id });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update notification preferences
 */
router.put('/me/preferences/notifications', authenticate, async (req, res) => {
  try {
    const { email, push, sms } = req.body;

    const preferences = await preferencesService.updateNotificationPreferences(
      req.user!.id,
      email,
      push,
      sms
    );

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: { preferences }
    });
  } catch (error) {
    logger.error('Failed to update notification preferences', { error: error.message, userId: req.user?.id });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Reset preferences to default
 */
router.post('/me/preferences/reset', authenticate, async (req, res) => {
  try {
    const preferences = await preferencesService.resetPreferences(req.user!.id);

    res.json({
      success: true,
      message: 'Preferences reset to default',
      data: { preferences }
    });
  } catch (error) {
    logger.error('Failed to reset preferences', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to reset preferences'
    });
  }
});

// ============================================================================
// PRIVACY SETTINGS ENDPOINTS
// ============================================================================

/**
 * Get privacy settings
 */
router.get('/me/privacy', authenticate, async (req, res) => {
  try {
    const settings = await privacySettingsService.getPrivacySettings(req.user!.id);

    res.json({
      success: true,
      data: { settings }
    });
  } catch (error) {
    logger.error('Failed to get privacy settings', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve privacy settings'
    });
  }
});

/**
 * Update privacy settings
 */
router.put('/me/privacy', authenticate, async (req, res) => {
  try {
    const settings = await privacySettingsService.updatePrivacySettings(req.user!.id, req.body);

    res.json({
      success: true,
      message: 'Privacy settings updated successfully',
      data: { settings }
    });
  } catch (error) {
    logger.error('Failed to update privacy settings', { error: error.message, userId: req.user?.id });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get consent management
 */
router.get('/me/privacy/consents', authenticate, async (req, res) => {
  try {
    const consents = await privacySettingsService.getConsentManagement(req.user!.id);

    res.json({
      success: true,
      data: { consents }
    });
  } catch (error) {
    logger.error('Failed to get consents', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve consents'
    });
  }
});

/**
 * Update consent
 */
router.put('/me/privacy/consents/:consentType', authenticate, async (req, res) => {
  try {
    const { consentType } = req.params;
    const { granted } = req.body;

    if (typeof granted !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'granted must be a boolean'
      });
    }

    const consents = await privacySettingsService.updateConsent(req.user!.id, consentType, granted);

    res.json({
      success: true,
      message: 'Consent updated successfully',
      data: { consents }
    });
  } catch (error) {
    logger.error('Failed to update consent', { error: error.message, userId: req.user?.id });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// SECURITY SETTINGS ENDPOINTS
// ============================================================================

/**
 * Get security settings
 */
router.get('/me/security', authenticate, async (req, res) => {
  try {
    const settings = await securitySettingsService.getSecuritySettings(req.user!.id);

    res.json({
      success: true,
      data: { settings }
    });
  } catch (error) {
    logger.error('Failed to get security settings', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security settings'
    });
  }
});

/**
 * Setup two-factor authentication
 */
router.post('/me/security/2fa/setup', authenticate, async (req, res) => {
  try {
    const result = await securitySettingsService.setupTwoFactor(req.user!.id, req.body);

    res.json({
      success: true,
      message: 'Two-factor authentication setup initiated',
      data: result
    });
  } catch (error) {
    logger.error('Failed to setup 2FA', { error: error.message, userId: req.user?.id });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Verify and enable two-factor authentication
 */
router.post('/me/security/2fa/verify', authenticate, async (req, res) => {
  try {
    const settings = await securitySettingsService.verifyAndEnableTwoFactor(req.user!.id, req.body);

    res.json({
      success: true,
      message: 'Two-factor authentication enabled successfully',
      data: { settings }
    });
  } catch (error) {
    logger.error('Failed to verify 2FA', { error: error.message, userId: req.user?.id });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Disable two-factor authentication
 */
router.post('/me/security/2fa/disable', authenticate, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password required'
      });
    }

    const settings = await securitySettingsService.disableTwoFactor(req.user!.id, password);

    res.json({
      success: true,
      message: 'Two-factor authentication disabled successfully',
      data: { settings }
    });
  } catch (error) {
    logger.error('Failed to disable 2FA', { error: error.message, userId: req.user?.id });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get active sessions
 */
router.get('/me/security/sessions', authenticate, async (req, res) => {
  try {
    const sessions = await securitySettingsService.getActiveSessions(req.user!.id);

    res.json({
      success: true,
      data: { sessions, count: sessions.length }
    });
  } catch (error) {
    logger.error('Failed to get sessions', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sessions'
    });
  }
});

/**
 * Terminate session(s)
 */
router.post('/me/security/sessions/terminate', authenticate, async (req, res) => {
  try {
    const { sessionId, terminateAll } = req.body;

    await securitySettingsService.terminateSessions({
      userId: req.user!.id,
      sessionId,
      terminateAll: terminateAll || false
    });

    res.json({
      success: true,
      message: terminateAll ? 'All sessions terminated' : 'Session terminated successfully'
    });
  } catch (error) {
    logger.error('Failed to terminate sessions', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to terminate sessions'
    });
  }
});

/**
 * Get login history
 */
router.get('/me/security/login-history', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await securitySettingsService.getLoginHistory(req.user!.id, limit);

    res.json({
      success: true,
      data: { history, count: history.length }
    });
  } catch (error) {
    logger.error('Failed to get login history', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve login history'
    });
  }
});

// ============================================================================
// DATA EXPORT ENDPOINTS (GDPR)
// ============================================================================

/**
 * Request data export
 */
router.post('/me/data-export', authenticate, async (req, res) => {
  try {
    const result = await dataExportService.requestDataExport({
      userId: req.user!.id,
      format: req.body.format || 'json',
      includePersonalInfo: req.body.includePersonalInfo !== false,
      includeAcademicRecords: req.body.includeAcademicRecords !== false,
      includeSpiritualFormation: req.body.includeSpiritualFormation !== false,
      includeCommunityActivity: req.body.includeCommunityActivity !== false,
      includeFinancialData: req.body.includeFinancialData !== false
    });

    res.json({
      success: true,
      message: 'Data export requested successfully',
      data: result
    });
  } catch (error) {
    logger.error('Failed to request data export', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to request data export'
    });
  }
});

/**
 * Get export status
 */
router.get('/me/data-export/:exportId', authenticate, async (req, res) => {
  try {
    const { exportId } = req.params;
    const status = await dataExportService.getExportStatus(exportId);

    res.json({
      success: true,
      data: { status }
    });
  } catch (error) {
    logger.error('Failed to get export status', { error: error.message, exportId: req.params.exportId });
    res.status(404).json({
      success: false,
      error: 'Export not found'
    });
  }
});

/**
 * Get GDPR compliance data
 */
router.get('/me/gdpr-compliance', authenticate, async (req, res) => {
  try {
    const data = await dataExportService.getGDPRComplianceData(req.user!.id);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Failed to get GDPR compliance data', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve GDPR compliance data'
    });
  }
});

// ============================================================================
// ACCOUNT DELETION ENDPOINTS
// ============================================================================

/**
 * Request account deletion
 */
router.post('/me/delete', authenticate, async (req, res) => {
  try {
    const { confirmPassword, reason, feedback } = req.body;

    if (!confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Password confirmation required'
      });
    }

    const result = await accountDeletionService.requestAccountDeletion({
      userId: req.user!.id,
      confirmPassword,
      reason,
      feedback
    });

    res.json({
      success: true,
      message: 'Account deletion scheduled',
      data: result
    });
  } catch (error) {
    logger.error('Failed to request account deletion', { error: error.message, userId: req.user?.id });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Cancel account deletion
 */
router.post('/me/delete/cancel', authenticate, async (req, res) => {
  try {
    const { deletionId } = req.body;

    if (!deletionId) {
      return res.status(400).json({
        success: false,
        error: 'Deletion ID required'
      });
    }

    await accountDeletionService.cancelAccountDeletion(deletionId, req.user!.id);

    res.json({
      success: true,
      message: 'Account deletion cancelled successfully'
    });
  } catch (error) {
    logger.error('Failed to cancel account deletion', { error: error.message, userId: req.user?.id });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get deletion status
 */
router.get('/me/delete/status', authenticate, async (req, res) => {
  try {
    const status = await accountDeletionService.getDeletionStatus(req.user!.id);

    res.json({
      success: true,
      data: { status }
    });
  } catch (error) {
    logger.error('Failed to get deletion status', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve deletion status'
    });
  }
});

// ============================================================================
// ACADEMIC TRANSCRIPT ENDPOINTS
// ============================================================================

/**
 * Get academic transcript
 */
router.get('/:userId/transcript', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const transcript = await profileService.getAcademicTranscript(userId);

    res.json({
      success: true,
      data: transcript
    });
  } catch (error) {
    logger.error('Failed to get transcript', { error: error.message, userId: req.params.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve transcript'
    });
  }
});

/**
 * Download academic transcript
 */
router.get('/:userId/transcript/download', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const format = (req.query.format as string) || 'pdf';

    const result = await profileService.downloadTranscript(userId, format);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (error) {
    logger.error('Failed to download transcript', { error: error.message, userId: req.params.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to download transcript'
    });
  }
});

// ============================================================================
// DEGREE AUDIT ENDPOINTS
// ============================================================================

/**
 * Get degree audit
 */
router.get('/:userId/degree-audit', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const audit = await profileService.getDegreeAudit(userId);

    res.json({
      success: true,
      data: audit
    });
  } catch (error) {
    logger.error('Failed to get degree audit', { error: error.message, userId: req.params.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve degree audit'
    });
  }
});

// ============================================================================
// COURSE HISTORY ENDPOINTS
// ============================================================================

/**
 * Get course history
 */
router.get('/:userId/course-history', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await profileService.getCourseHistory(userId);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Failed to get course history', { error: error.message, userId: req.params.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve course history'
    });
  }
});

// ============================================================================
// ACHIEVEMENTS ENDPOINTS
// ============================================================================

/**
 * Get achievements
 */
router.get('/:userId/achievements', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const achievements = await profileService.getAchievements(userId);

    res.json({
      success: true,
      data: achievements
    });
  } catch (error) {
    logger.error('Failed to get achievements', { error: error.message, userId: req.params.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve achievements'
    });
  }
});

/**
 * Toggle achievement pin status
 */
router.put('/:userId/achievements/:achievementId/pin', authenticate, async (req, res) => {
  try {
    const { userId, achievementId } = req.params;
    const { isPinned } = req.body;

    // Verify user can only pin their own achievements
    if (userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const achievement = await profileService.toggleAchievementPin(achievementId, isPinned);

    res.json({
      success: true,
      data: achievement
    });
  } catch (error) {
    logger.error('Failed to toggle achievement pin', { error: error.message, achievementId: req.params.achievementId });
    res.status(500).json({
      success: false,
      error: 'Failed to update achievement'
    });
  }
});

// ============================================================================
// SKILLS ENDPOINTS
// ============================================================================

/**
 * Get skills
 */
router.get('/:userId/skills', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const skills = await profileService.getSkills(userId);

    res.json({
      success: true,
      data: skills
    });
  } catch (error) {
    logger.error('Failed to get skills', { error: error.message, userId: req.params.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve skills'
    });
  }
});

/**
 * Add skill
 */
router.post('/:userId/skills', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { skillName, category, proficiencyLevel } = req.body;

    // Verify user can only add skills to their own profile
    if (userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const skill = await profileService.addSkill(userId, {
      skillName,
      category,
      proficiencyLevel
    });

    res.json({
      success: true,
      data: skill
    });
  } catch (error) {
    logger.error('Failed to add skill', { error: error.message, userId: req.params.userId });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Endorse skill
 */
router.post('/:userId/skills/:skillId/endorse', authenticate, async (req, res) => {
  try {
    const { userId, skillId } = req.params;
    const { comment } = req.body;

    const skill = await profileService.endorseSkill(skillId, {
      endorserId: req.user!.id,
      comment
    });

    res.json({
      success: true,
      data: skill
    });
  } catch (error) {
    logger.error('Failed to endorse skill', { error: error.message, skillId: req.params.skillId });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// RESUME/CV ENDPOINTS
// ============================================================================

/**
 * Get resume data
 */
router.get('/:userId/resume-data', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const resumeData = await profileService.getResumeData(userId);

    res.json({
      success: true,
      data: resumeData
    });
  } catch (error) {
    logger.error('Failed to get resume data', { error: error.message, userId: req.params.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve resume data'
    });
  }
});

/**
 * Generate resume
 */
router.post('/:userId/resume/generate', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { template, format } = req.body;

    const result = await profileService.generateResume(userId, {
      template: template || 'professional',
      format: format || 'pdf'
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (error) {
    logger.error('Failed to generate resume', { error: error.message, userId: req.params.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to generate resume'
    });
  }
});

/**
 * Preview resume
 */
router.get('/:userId/resume/preview', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const template = (req.query.template as string) || 'professional';

    const html = await profileService.previewResume(userId, template);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Failed to preview resume', { error: error.message, userId: req.params.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to preview resume'
    });
  }
});

/**
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Profile service is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;
