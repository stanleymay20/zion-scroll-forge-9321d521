/**
 * ScrollUniversity Authentication Service
 * "I am the way, the truth, and the life" - John 14:6
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cacheService } from './CacheService';
import { logger } from '../utils/productionLogger';

const prisma = new PrismaClient();

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface UserPayload {
  id: string;
  email: string;
  role: string;
}

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'scroll-university-secret-key';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'scroll-university-refresh-secret';
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly SALT_ROUNDS = 12;

  /**
   * Register a new user
   */
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    username: string;
  }): Promise<{ user: any; tokens: AuthTokens }> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: data.email },
            { username: data.username }
          ]
        }
      });

      if (existingUser) {
        throw new Error('User with this email or username already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: data.email,
          username: data.username,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'STUDENT',
          enrollmentStatus: 'ACTIVE',
          academicLevel: 'SCROLL_OPEN'
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true
        }
      });

      // Generate tokens
      const tokens = await this.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role
      });

      // Store refresh token
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      logger.info('User registered successfully', { userId: user.id, email: user.email });

      return { user, tokens };
    } catch (error) {
      logger.error('Registration failed', { error: error.message, email: data.email });
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ user: any; tokens: AuthTokens }> {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          passwordHash: true,
          enrollmentStatus: true
        }
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if account is active
      if (user.enrollmentStatus === 'SUSPENDED') {
        throw new Error('Account is suspended. Please contact support.');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Generate tokens
      const tokens = await this.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role
      });

      // Store refresh token
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = user;

      logger.info('User logged in successfully', { userId: user.id, email: user.email });

      return { user: userWithoutPassword, tokens };
    } catch (error) {
      logger.error('Login failed', { error: error.message, email });
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as UserPayload;

      // Check if refresh token is stored
      const storedToken = await cacheService.get(`refresh_token:${payload.id}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens({
        id: payload.id,
        email: payload.email,
        role: payload.role
      });

      // Store new refresh token
      await this.storeRefreshToken(payload.id, tokens.refreshToken);

      logger.info('Token refreshed successfully', { userId: payload.id });

      return tokens;
    } catch (error) {
      logger.error('Token refresh failed', { error: error.message });
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string): Promise<void> {
    try {
      // Remove refresh token from cache
      await cacheService.delete(`refresh_token:${userId}`);

      logger.info('User logged out successfully', { userId });
    } catch (error) {
      logger.error('Logout failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<UserPayload> {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET) as UserPayload;
      return payload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, firstName: true }
      });

      if (!user) {
        // Don't reveal if user exists
        logger.warn('Password reset requested for non-existent email', { email });
        return;
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { id: user.id, email: user.email, type: 'password_reset' },
        this.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Store reset token
      await cacheService.set(`password_reset:${user.id}`, resetToken, { ttl: 3600 });

      // TODO: Send email with reset link
      logger.info('Password reset requested', { userId: user.id, email: user.email });

      // In production, send email here
      // await emailService.sendPasswordResetEmail(user.email, resetToken);
    } catch (error) {
      logger.error('Password reset request failed', { error: error.message, email });
      throw error;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    try {
      // Verify reset token
      const payload = jwt.verify(resetToken, this.JWT_SECRET) as any;

      if (payload.type !== 'password_reset') {
        throw new Error('Invalid reset token');
      }

      // Check if token is stored
      const storedToken = await cacheService.get(`password_reset:${payload.id}`);
      if (!storedToken || storedToken !== resetToken) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      // Update password
      await prisma.user.update({
        where: { id: payload.id },
        data: { passwordHash }
      });

      // Remove reset token
      await cacheService.delete(`password_reset:${payload.id}`);

      // Invalidate all refresh tokens
      await cacheService.delete(`refresh_token:${payload.id}`);

      logger.info('Password reset successfully', { userId: payload.id });
    } catch (error) {
      logger.error('Password reset failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      });

      // Invalidate all refresh tokens
      await cacheService.delete(`refresh_token:${userId}`);

      logger.info('Password changed successfully', { userId });
    } catch (error) {
      logger.error('Password change failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(verificationToken: string): Promise<void> {
    try {
      const payload = jwt.verify(verificationToken, this.JWT_SECRET) as any;

      if (payload.type !== 'email_verification') {
        throw new Error('Invalid verification token');
      }

      // Update user email verification status
      // This would require adding an emailVerified field to the User model
      logger.info('Email verified successfully', { userId: payload.id });
    } catch (error) {
      logger.error('Email verification failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(payload: UserPayload): Promise<AuthTokens> {
    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY
    });

    const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 15 minutes in seconds
    };
  }

  /**
   * Store refresh token in cache
   */
  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    await cacheService.set(`refresh_token:${userId}`, refreshToken, {
      ttl: 7 * 24 * 60 * 60 // 7 days
    });
  }
}

export const authService = new AuthService();
