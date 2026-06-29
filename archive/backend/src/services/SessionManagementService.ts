/**
 * ScrollUniversity Session Management Service
 * "Where two or three gather in my name, there am I with them" - Matthew 18:20
 * 
 * Comprehensive session management with Redis for scalability,
 * session tracking, and security features.
 */

import { cacheService } from './CacheService';
import { logger } from '../utils/productionLogger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  supabaseId?: string;
  deviceInfo?: DeviceInfo;
  ipAddress?: string;
  userAgent?: string;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
}

export interface DeviceInfo {
  type: 'web' | 'mobile' | 'tablet' | 'desktop';
  os?: string;
  browser?: string;
  version?: string;
}

export interface SessionListItem {
  sessionId: string;
  deviceInfo?: DeviceInfo;
  ipAddress?: string;
  createdAt: number;
  lastActivity: number;
  isCurrent: boolean;
}

export class SessionManagementService {
  private readonly SESSION_PREFIX = 'session:';
  private readonly USER_SESSIONS_PREFIX = 'user_sessions:';
  private readonly SESSION_TTL = 24 * 60 * 60; // 24 hours
  private readonly MAX_SESSIONS_PER_USER = 5;

  /**
   * Create new session
   */
  async createSession(
    userId: string,
    sessionData: Omit<SessionData, 'createdAt' | 'lastActivity' | 'expiresAt'>
  ): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      const now = Date.now();

      const session: SessionData = {
        ...sessionData,
        createdAt: now,
        lastActivity: now,
        expiresAt: now + this.SESSION_TTL * 1000
      };

      // Store session
      await cacheService.set(
        `${this.SESSION_PREFIX}${sessionId}`,
        session,
        { ttl: this.SESSION_TTL }
      );

      // Add to user's session list
      await this.addUserSession(userId, sessionId);

      // Enforce max sessions limit
      await this.enforceSessionLimit(userId);

      logger.info('Session created', {
        userId,
        sessionId,
        deviceType: sessionData.deviceInfo?.type
      });

      return sessionId;
    } catch (error) {
      logger.error('Session creation failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const session = await cacheService.get<SessionData>(
        `${this.SESSION_PREFIX}${sessionId}`
      );

      if (!session) {
        return null;
      }

      // Check if session is expired
      if (session.expiresAt < Date.now()) {
        await this.deleteSession(sessionId);
        return null;
      }

      return session;
    } catch (error) {
      logger.error('Get session failed', { error: error.message, sessionId });
      return null;
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);

      if (!session) {
        return;
      }

      session.lastActivity = Date.now();

      await cacheService.set(
        `${this.SESSION_PREFIX}${sessionId}`,
        session,
        { ttl: this.SESSION_TTL }
      );
    } catch (error) {
      logger.error('Update session activity failed', { error: error.message, sessionId });
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);

      if (session) {
        // Remove from user's session list
        await this.removeUserSession(session.userId, sessionId);
      }

      // Delete session
      await cacheService.delete(`${this.SESSION_PREFIX}${sessionId}`);

      logger.info('Session deleted', { sessionId });
    } catch (error) {
      logger.error('Delete session failed', { error: error.message, sessionId });
      throw error;
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteAllUserSessions(userId: string): Promise<void> {
    try {
      const sessionIds = await this.getUserSessions(userId);

      for (const sessionId of sessionIds) {
        await cacheService.delete(`${this.SESSION_PREFIX}${sessionId}`);
      }

      await cacheService.delete(`${this.USER_SESSIONS_PREFIX}${userId}`);

      logger.info('All user sessions deleted', { userId, count: sessionIds.length });
    } catch (error) {
      logger.error('Delete all user sessions failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Delete all sessions except current
   */
  async deleteOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    try {
      const sessionIds = await this.getUserSessions(userId);

      for (const sessionId of sessionIds) {
        if (sessionId !== currentSessionId) {
          await cacheService.delete(`${this.SESSION_PREFIX}${sessionId}`);
        }
      }

      // Update user sessions list to only include current session
      await cacheService.set(
        `${this.USER_SESSIONS_PREFIX}${userId}`,
        [currentSessionId],
        { ttl: this.SESSION_TTL }
      );

      logger.info('Other user sessions deleted', {
        userId,
        kept: currentSessionId,
        deleted: sessionIds.length - 1
      });
    } catch (error) {
      logger.error('Delete other sessions failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getActiveUserSessions(userId: string): Promise<SessionListItem[]> {
    try {
      const sessionIds = await this.getUserSessions(userId);
      const sessions: SessionListItem[] = [];

      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId);

        if (session) {
          sessions.push({
            sessionId,
            deviceInfo: session.deviceInfo,
            ipAddress: session.ipAddress,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            isCurrent: false // Will be set by caller
          });
        }
      }

      return sessions.sort((a, b) => b.lastActivity - a.lastActivity);
    } catch (error) {
      logger.error('Get active user sessions failed', { error: error.message, userId });
      return [];
    }
  }

  /**
   * Validate session and update activity
   */
  async validateSession(sessionId: string): Promise<SessionData | null> {
    try {
      const session = await this.getSession(sessionId);

      if (!session) {
        return null;
      }

      // Update activity
      await this.updateSessionActivity(sessionId);

      return session;
    } catch (error) {
      logger.error('Validate session failed', { error: error.message, sessionId });
      return null;
    }
  }

  /**
   * Get session statistics for a user
   */
  async getUserSessionStats(userId: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    devices: Record<string, number>;
    lastActivity: number;
  }> {
    try {
      const sessions = await this.getActiveUserSessions(userId);

      const devices: Record<string, number> = {};
      let lastActivity = 0;

      for (const session of sessions) {
        const deviceType = session.deviceInfo?.type || 'unknown';
        devices[deviceType] = (devices[deviceType] || 0) + 1;

        if (session.lastActivity > lastActivity) {
          lastActivity = session.lastActivity;
        }
      }

      return {
        totalSessions: sessions.length,
        activeSessions: sessions.length,
        devices,
        lastActivity
      };
    } catch (error) {
      logger.error('Get user session stats failed', { error: error.message, userId });
      return {
        totalSessions: 0,
        activeSessions: 0,
        devices: {},
        lastActivity: 0
      };
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      // This would typically be run as a background job
      // For now, sessions are automatically cleaned up by Redis TTL
      logger.info('Session cleanup completed');
      return 0;
    } catch (error) {
      logger.error('Session cleanup failed', { error: error.message });
      return 0;
    }
  }

  /**
   * Track login attempt
   */
  async trackLoginAttempt(
    userId: string,
    success: boolean,
    ipAddress?: string
  ): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastLoginAt: success ? new Date() : undefined
        }
      });

      logger.info('Login attempt tracked', { userId, success, ipAddress });
    } catch (error) {
      logger.error('Track login attempt failed', { error: error.message, userId });
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get user's session IDs
   */
  private async getUserSessions(userId: string): Promise<string[]> {
    const sessions = await cacheService.get<string[]>(
      `${this.USER_SESSIONS_PREFIX}${userId}`
    );
    return sessions || [];
  }

  /**
   * Add session to user's session list
   */
  private async addUserSession(userId: string, sessionId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    sessions.push(sessionId);

    await cacheService.set(
      `${this.USER_SESSIONS_PREFIX}${userId}`,
      sessions,
      { ttl: this.SESSION_TTL }
    );
  }

  /**
   * Remove session from user's session list
   */
  private async removeUserSession(userId: string, sessionId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    const filtered = sessions.filter(id => id !== sessionId);

    if (filtered.length > 0) {
      await cacheService.set(
        `${this.USER_SESSIONS_PREFIX}${userId}`,
        filtered,
        { ttl: this.SESSION_TTL }
      );
    } else {
      await cacheService.delete(`${this.USER_SESSIONS_PREFIX}${userId}`);
    }
  }

  /**
   * Enforce maximum sessions per user
   */
  private async enforceSessionLimit(userId: string): Promise<void> {
    const sessions = await this.getActiveUserSessions(userId);

    if (sessions.length > this.MAX_SESSIONS_PER_USER) {
      // Remove oldest sessions
      const toRemove = sessions
        .sort((a, b) => a.lastActivity - b.lastActivity)
        .slice(0, sessions.length - this.MAX_SESSIONS_PER_USER);

      for (const session of toRemove) {
        await this.deleteSession(session.sessionId);
      }

      logger.info('Session limit enforced', {
        userId,
        removed: toRemove.length
      });
    }
  }
}

export const sessionManagementService = new SessionManagementService();
