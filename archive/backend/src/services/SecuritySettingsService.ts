/**
 * Security Settings Service
 * "The name of the LORD is a fortified tower" - Proverbs 18:10
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { cacheService } from './CacheService';
import { logger } from '../utils/productionLogger';
import {
  SecuritySettings,
  TwoFactorSetupRequest,
  TwoFactorSetupResponse,
  TwoFactorVerificationRequest,
  ActiveSession,
  LoginHistoryEntry,
  SessionTerminationRequest,
  DeviceInfo
} from '../types/profile.types';

const prisma = new PrismaClient();

export class SecuritySettingsService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly CACHE_PREFIX = 'security:';
  private readonly SESSION_PREFIX = 'session:';
  private readonly MAX_LOGIN_HISTORY = 50;

  /**
   * Get security settings
   */
  async getSecuritySettings(userId: string): Promise<SecuritySettings> {
    try {
      const settings = await prisma.securitySettings.findUnique({
        where: { userId }
      });

      if (!settings) {
        return await this.createDefaultSettings(userId);
      }

      // Get active sessions
      const activeSessions = await this.getActiveSessions(userId);

      // Get login history
      const loginHistory = await this.getLoginHistory(userId);

      return {
        ...settings,
        activeSessions,
        loginHistory
      } as SecuritySettings;
    } catch (error) {
      logger.error('Failed to get security settings', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Setup two-factor authentication
   */
  async setupTwoFactor(
    userId: string,
    request: TwoFactorSetupRequest
  ): Promise<TwoFactorSetupResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, username: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      let secret: string | undefined;
      let qrCode: string | undefined;

      if (request.method === 'authenticator') {
        // Generate secret for authenticator app
        const secretObj = speakeasy.generateSecret({
          name: `ScrollUniversity (${user.email})`,
          issuer: 'ScrollUniversity'
        });

        secret = secretObj.base32;

        // Generate QR code
        qrCode = await QRCode.toDataURL(secretObj.otpauth_url!);
      }

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store 2FA settings
      await prisma.securitySettings.upsert({
        where: { userId },
        update: {
          twoFactorEnabled: false, // Not enabled until verified
          twoFactorMethod: request.method,
          twoFactorSecret: secret,
          twoFactorBackupCodes: backupCodes,
          updatedAt: new Date()
        },
        create: {
          userId,
          twoFactorEnabled: false,
          twoFactorMethod: request.method,
          twoFactorSecret: secret,
          twoFactorBackupCodes: backupCodes,
          maxConcurrentSessions: 5,
          sessionTimeout: 60,
          passwordExpiryDays: 90,
          updatedAt: new Date()
        }
      });

      logger.info('Two-factor authentication setup initiated', { userId, method: request.method });

      return {
        method: request.method,
        secret,
        qrCode,
        backupCodes
      };
    } catch (error) {
      logger.error('Failed to setup two-factor authentication', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Verify and enable two-factor authentication
   */
  async verifyAndEnableTwoFactor(
    userId: string,
    request: TwoFactorVerificationRequest
  ): Promise<SecuritySettings> {
    try {
      const settings = await prisma.securitySettings.findUnique({
        where: { userId }
      });

      if (!settings) {
        throw new Error('Security settings not found');
      }

      let isValid = false;

      if (request.backupCode) {
        // Verify backup code
        isValid = settings.twoFactorBackupCodes?.includes(request.backupCode) || false;

        if (isValid) {
          // Remove used backup code
          const updatedCodes = settings.twoFactorBackupCodes?.filter(
            code => code !== request.backupCode
          );

          await prisma.securitySettings.update({
            where: { userId },
            data: { twoFactorBackupCodes: updatedCodes }
          });
        }
      } else if (settings.twoFactorMethod === 'authenticator' && settings.twoFactorSecret) {
        // Verify TOTP code
        isValid = speakeasy.totp.verify({
          secret: settings.twoFactorSecret,
          encoding: 'base32',
          token: request.code,
          window: 2
        });
      } else {
        // For SMS/Email, verify code from cache
        const storedCode = await cacheService.get(`2fa:${userId}`);
        isValid = storedCode === request.code;
      }

      if (!isValid) {
        throw new Error('Invalid verification code');
      }

      // Enable 2FA
      await prisma.securitySettings.update({
        where: { userId },
        data: {
          twoFactorEnabled: true,
          updatedAt: new Date()
        }
      });

      logger.info('Two-factor authentication enabled', { userId });

      return await this.getSecuritySettings(userId);
    } catch (error) {
      logger.error('Failed to verify two-factor authentication', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(userId: string, password: string): Promise<SecuritySettings> {
    try {
      // Verify password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const bcrypt = require('bcryptjs');
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        throw new Error('Invalid password');
      }

      // Disable 2FA
      await prisma.securitySettings.update({
        where: { userId },
        data: {
          twoFactorEnabled: false,
          twoFactorMethod: null,
          twoFactorSecret: null,
          twoFactorBackupCodes: null,
          updatedAt: new Date()
        }
      });

      logger.info('Two-factor authentication disabled', { userId });

      return await this.getSecuritySettings(userId);
    } catch (error) {
      logger.error('Failed to disable two-factor authentication', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get active sessions
   */
  async getActiveSessions(userId: string): Promise<ActiveSession[]> {
    try {
      const sessionKeys = await cacheService.keys(`${this.SESSION_PREFIX}${userId}:*`);
      const sessions: ActiveSession[] = [];

      for (const key of sessionKeys) {
        const sessionData = await cacheService.get(key);
        if (sessionData) {
          sessions.push(JSON.parse(sessionData));
        }
      }

      return sessions.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
    } catch (error) {
      logger.error('Failed to get active sessions', { error: error.message, userId });
      return [];
    }
  }

  /**
   * Terminate session(s)
   */
  async terminateSessions(request: SessionTerminationRequest): Promise<void> {
    try {
      const { userId, sessionId, terminateAll } = request;

      if (terminateAll) {
        // Terminate all sessions
        const sessionKeys = await cacheService.keys(`${this.SESSION_PREFIX}${userId}:*`);
        for (const key of sessionKeys) {
          await cacheService.delete(key);
        }
        logger.info('All sessions terminated', { userId });
      } else if (sessionId) {
        // Terminate specific session
        await cacheService.delete(`${this.SESSION_PREFIX}${userId}:${sessionId}`);
        logger.info('Session terminated', { userId, sessionId });
      }
    } catch (error) {
      logger.error('Failed to terminate sessions', { error: error.message });
      throw error;
    }
  }

  /**
   * Get login history
   */
  async getLoginHistory(userId: string, limit: number = 50): Promise<LoginHistoryEntry[]> {
    try {
      const history = await prisma.loginHistory.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      return history.map(entry => ({
        id: entry.id,
        userId: entry.userId,
        timestamp: entry.timestamp,
        ipAddress: entry.ipAddress,
        location: entry.location,
        deviceInfo: entry.deviceInfo as DeviceInfo,
        success: entry.success,
        failureReason: entry.failureReason,
        suspicious: entry.suspicious
      }));
    } catch (error) {
      logger.error('Failed to get login history', { error: error.message, userId });
      return [];
    }
  }

  /**
   * Log login attempt
   */
  async logLoginAttempt(
    userId: string,
    ipAddress: string,
    deviceInfo: DeviceInfo,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    try {
      // Detect suspicious activity
      const suspicious = await this.detectSuspiciousActivity(userId, ipAddress);

      await prisma.loginHistory.create({
        data: {
          userId,
          timestamp: new Date(),
          ipAddress,
          deviceInfo: deviceInfo as any,
          success,
          failureReason,
          suspicious
        }
      });

      // Clean up old history
      await this.cleanupLoginHistory(userId);

      if (suspicious) {
        logger.warn('Suspicious login attempt detected', { userId, ipAddress });
        // TODO: Send security alert email
      }
    } catch (error) {
      logger.error('Failed to log login attempt', { error: error.message, userId });
      // Don't throw - logging failure shouldn't break login
    }
  }

  /**
   * Detect suspicious activity
   */
  private async detectSuspiciousActivity(userId: string, ipAddress: string): Promise<boolean> {
    try {
      // Get recent login history
      const recentLogins = await prisma.loginHistory.findMany({
        where: {
          userId,
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 10
      });

      // Check for multiple failed attempts
      const failedAttempts = recentLogins.filter(login => !login.success).length;
      if (failedAttempts >= 5) {
        return true;
      }

      // Check for login from new location
      const knownIPs = recentLogins
        .filter(login => login.success)
        .map(login => login.ipAddress);

      if (!knownIPs.includes(ipAddress)) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to detect suspicious activity', { error: error.message, userId });
      return false;
    }
  }

  /**
   * Clean up old login history
   */
  private async cleanupLoginHistory(userId: string): Promise<void> {
    try {
      const count = await prisma.loginHistory.count({
        where: { userId }
      });

      if (count > this.MAX_LOGIN_HISTORY) {
        // Delete oldest entries
        const toDelete = count - this.MAX_LOGIN_HISTORY;
        const oldestEntries = await prisma.loginHistory.findMany({
          where: { userId },
          orderBy: { timestamp: 'asc' },
          take: toDelete,
          select: { id: true }
        });

        await prisma.loginHistory.deleteMany({
          where: {
            id: {
              in: oldestEntries.map(e => e.id)
            }
          }
        });
      }
    } catch (error) {
      logger.error('Failed to cleanup login history', { error: error.message, userId });
      // Don't throw - cleanup failure shouldn't break the main operation
    }
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  }

  /**
   * Create default security settings
   */
  private async createDefaultSettings(userId: string): Promise<SecuritySettings> {
    try {
      const settings = await prisma.securitySettings.create({
        data: {
          userId,
          twoFactorEnabled: false,
          maxConcurrentSessions: 5,
          sessionTimeout: 60,
          passwordExpiryDays: 90,
          requirePasswordChange: false,
          accountLocked: false,
          suspiciousActivityDetected: false,
          passwordLastChanged: new Date(),
          updatedAt: new Date()
        }
      });

      return {
        ...settings,
        activeSessions: [],
        loginHistory: []
      } as SecuritySettings;
    } catch (error) {
      logger.error('Failed to create default security settings', { error: error.message, userId });
      throw error;
    }
  }
}

export const securitySettingsService = new SecuritySettingsService();
