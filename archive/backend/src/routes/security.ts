/**
 * Security Routes
 * API endpoints for security management
 * "The Lord is my rock, my fortress and my deliverer" - Psalm 18:2
 */

import express, { Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { auditLogger, AuditEventType, queryAuditLogs } from '../middleware/auditLogging';
import securityService from '../services/SecurityService';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * Get security metrics
 * GET /api/security/metrics
 */
router.get(
  '/metrics',
  authenticate,
  authorize('ADMIN'),
  auditLogger({ eventType: AuditEventType.DATA_ACCESSED, resourceType: 'security' }),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const metrics = await securityService.getSecurityMetrics(start, end);
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Failed to get security metrics', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve security metrics'
      });
    }
  }
);

/**
 * Query audit logs
 * GET /api/security/audit-logs
 */
router.get(
  '/audit-logs',
  authenticate,
  authorize('ADMIN'),
  auditLogger({ eventType: AuditEventType.DATA_ACCESSED, resourceType: 'audit-log' }),
  async (req: Request, res: Response) => {
    try {
      const {
        userId,
        eventType,
        startDate,
        endDate,
        resourceType,
        success,
        limit,
        offset
      } = req.query;
      
      const filters: any = {
        userId: userId as string,
        eventType: eventType as any,
        resourceType: resourceType as string,
        success: success === 'true' ? true : success === 'false' ? false : undefined,
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0
      };
      
      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }
      
      const logs = await queryAuditLogs(filters);
      
      res.json({
        success: true,
        data: logs,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: logs.length
        }
      });
    } catch (error) {
      logger.error('Failed to query audit logs', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit logs'
      });
    }
  }
);

/**
 * Validate password strength
 * POST /api/security/validate-password
 */
router.post(
  '/validate-password',
  async (req: Request, res: Response) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Password is required'
        });
      }
      
      const validation = securityService.validatePassword(password);
      
      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      logger.error('Password validation failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Password validation failed'
      });
    }
  }
);

/**
 * Generate API key
 * POST /api/security/api-keys
 */
router.post(
  '/api-keys',
  authenticate,
  authorize('ADMIN'),
  auditLogger({ eventType: AuditEventType.SYSTEM_CONFIG_CHANGED, resourceType: 'api-key' }),
  async (req: Request, res: Response) => {
    try {
      const apiKey = securityService.generateAPIKey();
      
      // In production, store hashed API key in database
      const hashedKey = securityService.hashAPIKey(apiKey);
      
      logger.info('API key generated', {
        userId: req.user?.id,
        keyHash: hashedKey.substring(0, 8)
      });
      
      res.json({
        success: true,
        data: {
          apiKey,
          message: 'Store this API key securely. It will not be shown again.'
        }
      });
    } catch (error) {
      logger.error('Failed to generate API key', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to generate API key'
      });
    }
  }
);

/**
 * Blacklist IP address
 * POST /api/security/blacklist-ip
 */
router.post(
  '/blacklist-ip',
  authenticate,
  authorize('ADMIN'),
  auditLogger({ eventType: AuditEventType.SYSTEM_CONFIG_CHANGED, resourceType: 'ip-blacklist' }),
  async (req: Request, res: Response) => {
    try {
      const { ip, reason } = req.body;
      
      if (!ip || !reason) {
        return res.status(400).json({
          success: false,
          error: 'IP address and reason are required'
        });
      }
      
      if (!securityService.isValidIP(ip)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid IP address format'
        });
      }
      
      await securityService.blacklistIP(ip, reason);
      
      res.json({
        success: true,
        message: 'IP address blacklisted successfully'
      });
    } catch (error) {
      logger.error('Failed to blacklist IP', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to blacklist IP address'
      });
    }
  }
);

/**
 * Check IP blacklist status
 * GET /api/security/check-ip/:ip
 */
router.get(
  '/check-ip/:ip',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const { ip } = req.params;
      
      if (!securityService.isValidIP(ip)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid IP address format'
        });
      }
      
      const isBlacklisted = await securityService.isIPBlacklisted(ip);
      
      res.json({
        success: true,
        data: {
          ip,
          blacklisted: isBlacklisted
        }
      });
    } catch (error) {
      logger.error('Failed to check IP status', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to check IP status'
      });
    }
  }
);

/**
 * Generate 2FA secret
 * POST /api/security/2fa/generate
 */
router.post(
  '/2fa/generate',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const secret = securityService.generate2FASecret();
      
      // In production, store secret in database associated with user
      
      res.json({
        success: true,
        data: {
          secret,
          qrCode: `otpauth://totp/ScrollUniversity:${req.user?.email}?secret=${secret}&issuer=ScrollUniversity`
        }
      });
    } catch (error) {
      logger.error('Failed to generate 2FA secret', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to generate 2FA secret'
      });
    }
  }
);

/**
 * Verify 2FA token
 * POST /api/security/2fa/verify
 */
router.post(
  '/2fa/verify',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { token, secret } = req.body;
      
      if (!token || !secret) {
        return res.status(400).json({
          success: false,
          error: 'Token and secret are required'
        });
      }
      
      const isValid = securityService.verify2FAToken(secret, token);
      
      res.json({
        success: true,
        data: {
          valid: isValid
        }
      });
    } catch (error) {
      logger.error('Failed to verify 2FA token', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to verify 2FA token'
      });
    }
  }
);

/**
 * Get security configuration (sanitized)
 * GET /api/security/config
 */
router.get(
  '/config',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const { getSecurityConfig } = require('../config/security.config');
      const config = getSecurityConfig();
      
      // Remove sensitive information
      const sanitizedConfig = {
        csrf: {
          enabled: config.csrf.enabled,
          tokenExpiration: config.csrf.tokenExpiration
        },
        xss: {
          enabled: config.xss.enabled,
          strictMode: config.xss.strictMode
        },
        rateLimit: config.rateLimit,
        fileUpload: {
          enabled: config.fileUpload.enabled,
          maxFileSize: config.fileUpload.maxFileSize,
          maxFiles: config.fileUpload.maxFiles
        },
        auditLog: config.auditLog,
        password: config.password
      };
      
      res.json({
        success: true,
        data: sanitizedConfig
      });
    } catch (error) {
      logger.error('Failed to get security config', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve security configuration'
      });
    }
  }
);

export default router;
