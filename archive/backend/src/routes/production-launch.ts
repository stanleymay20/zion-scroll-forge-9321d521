/**
 * Production Launch Routes
 * API endpoints for production launch preparation
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 15.5
 */

import express, { Request, Response } from 'express';
import SecurityAuditService from '../services/SecurityAuditService';
import LoadTestingService from '../services/LoadTestingService';
import DisasterRecoveryService from '../services/DisasterRecoveryService';
import UserOnboardingService from '../services/UserOnboardingService';
import FeatureFlagService from '../services/FeatureFlagService';
import StatusPageService from '../services/StatusPageService';
import LaunchMaterialsService from '../services/LaunchMaterialsService';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Initialize services
const securityAuditService = new SecurityAuditService();
const loadTestingService = new LoadTestingService();
const disasterRecoveryService = new DisasterRecoveryService();
const userOnboardingService = new UserOnboardingService();
const featureFlagService = new FeatureFlagService();
const statusPageService = new StatusPageService();
const launchMaterialsService = new LaunchMaterialsService();

/**
 * Security Audit Routes
 */

// Perform security audit
router.post('/security-audit', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await securityAuditService.performSecurityAudit();
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Security audit failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to perform security audit'
    });
  }
});

// Generate security audit report
router.get('/security-audit/report', authenticate, async (req: Request, res: Response) => {
  try {
    const auditResult = await securityAuditService.performSecurityAudit();
    const report = await securityAuditService.generateAuditReport(auditResult);
    
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', 'attachment; filename="security-audit-report.md"');
    res.send(report);
  } catch (error) {
    logger.error('Failed to generate security audit report', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate security audit report'
    });
  }
});

/**
 * Load Testing Routes
 */

// Run load test
router.post('/load-test', authenticate, async (req: Request, res: Response) => {
  try {
    const config = req.body;
    const result = await loadTestingService.runLoadTest(config);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Load test failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to run load test'
    });
  }
});

// Run stress test
router.post('/load-test/stress', authenticate, async (req: Request, res: Response) => {
  try {
    const config = req.body;
    const result = await loadTestingService.runStressTest(config);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Stress test failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to run stress test'
    });
  }
});

// Generate load test report
router.get('/load-test/report/:testId', authenticate, async (req: Request, res: Response) => {
  try {
    // In production, fetch test result from database
    const config = {
      targetURL: process.env.API_URL || 'http://localhost:3000',
      duration: 60,
      virtualUsers: 100,
      rampUpTime: 10,
      endpoints: [
        { method: 'GET' as const, path: '/api/health', weight: 20 },
        { method: 'GET' as const, path: '/api/courses', weight: 30 },
        { method: 'POST' as const, path: '/api/auth/login', weight: 10 }
      ]
    };
    
    const result = await loadTestingService.runLoadTest(config);
    const report = await loadTestingService.generateLoadTestReport(result);
    
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', 'attachment; filename="load-test-report.md"');
    res.send(report);
  } catch (error) {
    logger.error('Failed to generate load test report', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate load test report'
    });
  }
});

/**
 * Disaster Recovery Routes
 */

// Get disaster recovery plan
router.get('/disaster-recovery/plan', authenticate, async (req: Request, res: Response) => {
  try {
    const plan = await disasterRecoveryService.getDisasterRecoveryPlan();
    res.json({ success: true, data: plan });
  } catch (error) {
    logger.error('Failed to get disaster recovery plan', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get disaster recovery plan'
    });
  }
});

// Test disaster recovery
router.post('/disaster-recovery/test', authenticate, async (req: Request, res: Response) => {
  try {
    const { planId, scenarioId } = req.body;
    const result = await disasterRecoveryService.testDisasterRecovery(planId, scenarioId);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Disaster recovery test failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to test disaster recovery'
    });
  }
});

// Generate DR documentation
router.get('/disaster-recovery/documentation', authenticate, async (req: Request, res: Response) => {
  try {
    const plan = await disasterRecoveryService.getDisasterRecoveryPlan();
    const documentation = await disasterRecoveryService.generateDRDocumentation(plan);
    
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', 'attachment; filename="disaster-recovery-plan.md"');
    res.send(documentation);
  } catch (error) {
    logger.error('Failed to generate DR documentation', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate DR documentation'
    });
  }
});

/**
 * User Onboarding Routes
 */

// Start onboarding
router.post('/onboarding/start', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId, userType, userData } = req.body;
    const flow = await userOnboardingService.startOnboarding(userId, userType, userData);
    res.json({ success: true, data: flow });
  } catch (error) {
    logger.error('Failed to start onboarding', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to start onboarding'
    });
  }
});

// Complete onboarding step
router.post('/onboarding/step/complete', authenticate, async (req: Request, res: Response) => {
  try {
    const { flowId, stepId, stepData } = req.body;
    const flow = await userOnboardingService.completeStep(flowId, stepId, stepData);
    res.json({ success: true, data: flow });
  } catch (error) {
    logger.error('Failed to complete onboarding step', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to complete onboarding step'
    });
  }
});

// Get onboarding progress
router.get('/onboarding/progress/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const progress = await userOnboardingService.getOnboardingProgress(userId);
    res.json({ success: true, data: progress });
  } catch (error) {
    logger.error('Failed to get onboarding progress', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get onboarding progress'
    });
  }
});

/**
 * Feature Flag Routes
 */

// Get all feature flags
router.get('/feature-flags', authenticate, async (req: Request, res: Response) => {
  try {
    const flags = await featureFlagService.getAllFlags();
    res.json({ success: true, data: flags });
  } catch (error) {
    logger.error('Failed to get feature flags', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get feature flags'
    });
  }
});

// Get feature flag
router.get('/feature-flags/:flagId', async (req: Request, res: Response) => {
  try {
    const { flagId } = req.params;
    const flag = await featureFlagService.getFlag(flagId);
    res.json({ success: true, data: flag });
  } catch (error) {
    logger.error('Failed to get feature flag', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get feature flag'
    });
  }
});

// Check if feature is enabled
router.post('/feature-flags/check', async (req: Request, res: Response) => {
  try {
    const { flagId, userId, userRole, environment } = req.body;
    const enabled = await featureFlagService.isEnabled(flagId, userId, userRole, environment);
    res.json({ success: true, data: { enabled } });
  } catch (error) {
    logger.error('Failed to check feature flag', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to check feature flag'
    });
  }
});

// Update feature flag
router.put('/feature-flags/:flagId', authenticate, async (req: Request, res: Response) => {
  try {
    const { flagId } = req.params;
    const updates = req.body;
    const flag = await featureFlagService.updateFlag(flagId, updates);
    res.json({ success: true, data: flag });
  } catch (error) {
    logger.error('Failed to update feature flag', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to update feature flag'
    });
  }
});

// Get flags for user
router.get('/feature-flags/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { userRole, environment } = req.query;
    const flags = await featureFlagService.getFlagsForUser(
      userId,
      userRole as string,
      environment as string
    );
    res.json({ success: true, data: flags });
  } catch (error) {
    logger.error('Failed to get flags for user', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get flags for user'
    });
  }
});

/**
 * Status Page Routes
 */

// Get system status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await statusPageService.getSystemStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error('Failed to get system status', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get system status'
    });
  }
});

// Get status page HTML
router.get('/status/page', async (req: Request, res: Response) => {
  try {
    const html = await statusPageService.generateStatusPageHTML();
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Failed to generate status page', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate status page'
    });
  }
});

// Create incident
router.post('/status/incidents', authenticate, async (req: Request, res: Response) => {
  try {
    const { title, description, severity, affectedComponents } = req.body;
    const incident = await statusPageService.createIncident(
      title,
      description,
      severity,
      affectedComponents
    );
    res.json({ success: true, data: incident });
  } catch (error) {
    logger.error('Failed to create incident', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to create incident'
    });
  }
});

// Update incident
router.put('/status/incidents/:incidentId', authenticate, async (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    const { status, message, author } = req.body;
    const incident = await statusPageService.updateIncident(incidentId, status, message, author);
    res.json({ success: true, data: incident });
  } catch (error) {
    logger.error('Failed to update incident', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to update incident'
    });
  }
});

/**
 * Launch Materials Routes
 */

// Get landing page
router.get('/launch/landing-page', async (req: Request, res: Response) => {
  try {
    const page = await launchMaterialsService.getLandingPage();
    res.json({ success: true, data: page });
  } catch (error) {
    logger.error('Failed to get landing page', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get landing page'
    });
  }
});

// Get landing page HTML
router.get('/launch/landing-page/html', async (req: Request, res: Response) => {
  try {
    const html = await launchMaterialsService.generateLandingPageHTML();
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Failed to generate landing page HTML', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate landing page HTML'
    });
  }
});

// Get press release
router.get('/launch/press-release', authenticate, async (req: Request, res: Response) => {
  try {
    const pressRelease = await launchMaterialsService.generatePressRelease();
    res.json({ success: true, data: pressRelease });
  } catch (error) {
    logger.error('Failed to generate press release', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate press release'
    });
  }
});

// Get social media content
router.get('/launch/social-media', authenticate, async (req: Request, res: Response) => {
  try {
    const content = await launchMaterialsService.generateSocialMediaContent();
    res.json({ success: true, data: content });
  } catch (error) {
    logger.error('Failed to generate social media content', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate social media content'
    });
  }
});

// Get email campaign
router.get('/launch/email-campaign', authenticate, async (req: Request, res: Response) => {
  try {
    const campaign = await launchMaterialsService.generateEmailCampaign();
    res.json({ success: true, data: campaign });
  } catch (error) {
    logger.error('Failed to generate email campaign', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate email campaign'
    });
  }
});

// Get all launch materials
router.get('/launch/materials', authenticate, async (req: Request, res: Response) => {
  try {
    const materials = await launchMaterialsService.getAllLaunchMaterials();
    res.json({ success: true, data: materials });
  } catch (error) {
    logger.error('Failed to get launch materials', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get launch materials'
    });
  }
});

// Track launch metrics
router.get('/launch/metrics', authenticate, async (req: Request, res: Response) => {
  try {
    const metrics = await launchMaterialsService.trackLaunchMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error('Failed to track launch metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to track launch metrics'
    });
  }
});

export default router;
