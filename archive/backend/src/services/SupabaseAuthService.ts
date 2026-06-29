/**
 * ScrollUniversity Supabase Authentication Service
 * "The Lord is my light and my salvation" - Psalm 27:1
 * 
 * Integrates Supabase Auth with JWT token management, refresh token rotation,
 * and comprehensive session management for production-ready authentication.
 */

import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { cacheService } from './CacheService';
import { logger } from '../utils/productionLogger';

const prisma = new PrismaClient();

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
}

export interface UserPayload {
  id: string;
  email: string;
  role: string;
  supabaseId?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
  metadata?: Record<string, any>;
}

export interface SocialAuthProvider {
  provider: 'google' | 'microsoft' | 'github' | 'facebook';
  redirectTo?: string;
}

export class SupabaseAuthService {
  private supabase: SupabaseClient;
  private readonly REFRESH_TOKEN_PREFIX = 'refresh_token:';
  private readonly SESSION_PREFIX = 'session:';
  private readonly BLACKLIST_PREFIX = 'token_blacklist:';

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Anon Key must be provided');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false, // We manage sessions in Redis
        detectSessionInUrl: true
      }
    });

    logger.info('Supabase Auth Service initialized');
  }

  /**
   * Register new user with Supabase Auth and sync to database
   */
  async register(data: RegisterData): Promise<{ user: any; tokens: AuthTokens }> {
    try {
      // Register with Supabase Auth
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            username: data.username,
            ...data.metadata
          },
          emailRedirectTo: process.env.EMAIL_REDIRECT_URL
        }
      });

      if (authError) {
        throw new Error(`Supabase registration failed: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('User creation failed');
      }

      // Check if user already exists in our database
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

      // Create user in our database
      const user = await prisma.user.create({
        data: {
          email: data.email,
          username: data.username,
          passwordHash: '', // Managed by Supabase
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'STUDENT',
          enrollmentStatus: 'ACTIVE',
          academicLevel: 'SCROLL_OPEN',
          scrollCoinBalance: 10.0,
          scrollAlignment: 0.1,
          supabaseUserId: authData.user.id
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          scrollCoinBalance: true,
          scrollAlignment: true,
          supabaseUserId: true,
          createdAt: true
        }
      });

      // Award welcome ScrollCoin
      await prisma.scrollCoinTransaction.create({
        data: {
          userId: user.id,
          amount: 10.0,
          type: 'BONUS',
          description: 'Welcome to ScrollUniversity - Divine enrollment bonus',
          activityType: 'DAILY_XP_STREAK'
        }
      });

      // Extract tokens from Supabase session
      const tokens = this.extractTokensFromSession(authData.session!);

      // Store refresh token and session
      await this.storeRefreshToken(user.id, tokens.refreshToken);
      await this.storeSession(user.id, {
        userId: user.id,
        email: user.email,
        role: user.role,
        supabaseId: authData.user.id
      });

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        supabaseId: authData.user.id
      });

      return { user, tokens };
    } catch (error) {
      logger.error('Registration failed', { error: error.message, email: data.email });
      throw error;
    }
  }

  /**
   * Login user with Supabase Auth
   */
  async login(email: string, password: string): Promise<{ user: any; tokens: AuthTokens }> {
    try {
      // Authenticate with Supabase
      const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        throw new Error(`Login failed: ${authError.message}`);
      }

      if (!authData.user || !authData.session) {
        throw new Error('Authentication failed');
      }

      // Get user from our database
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { supabaseUserId: authData.user.id }
          ]
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          enrollmentStatus: true,
          scrollCoinBalance: true,
          scrollAlignment: true,
          supabaseUserId: true,
          lastLoginAt: true
        }
      });

      if (!user) {
        throw new Error('User not found in database');
      }

      // Check enrollment status
      if (user.enrollmentStatus === 'SUSPENDED') {
        throw new Error('Account is suspended. Please contact support.');
      }

      // Extract tokens
      const tokens = this.extractTokensFromSession(authData.session);

      // Store refresh token and session with rotation
      await this.rotateRefreshToken(user.id, tokens.refreshToken);
      await this.storeSession(user.id, {
        userId: user.id,
        email: user.email,
        role: user.role,
        supabaseId: authData.user.id
      });

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        supabaseId: authData.user.id
      });

      return { user, tokens };
    } catch (error) {
      logger.error('Login failed', { error: error.message, email });
      throw error;
    }
  }

  /**
   * Refresh access token with automatic rotation
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Refresh session with Supabase
      const { data: authData, error: authError } = await this.supabase.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (authError || !authData.session) {
        throw new Error(`Token refresh failed: ${authError?.message || 'No session returned'}`);
      }

      // Get user from session
      const user = await prisma.user.findFirst({
        where: { supabaseUserId: authData.user?.id },
        select: { id: true, email: true, role: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify stored refresh token matches
      const storedToken = await this.getStoredRefreshToken(user.id);
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Extract new tokens
      const tokens = this.extractTokensFromSession(authData.session);

      // Rotate refresh token
      await this.rotateRefreshToken(user.id, tokens.refreshToken);

      logger.info('Token refreshed successfully', { userId: user.id });

      return tokens;
    } catch (error) {
      logger.error('Token refresh failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Logout user and invalidate tokens
   */
  async logout(userId: string): Promise<void> {
    try {
      // Sign out from Supabase
      await this.supabase.auth.signOut();

      // Remove refresh token and session from cache
      await this.removeRefreshToken(userId);
      await this.removeSession(userId);

      logger.info('User logged out successfully', { userId });
    } catch (error) {
      logger.error('Logout failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Social authentication (Google, Microsoft, etc.)
   */
  async socialAuth(config: SocialAuthProvider): Promise<{ url: string }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: config.provider,
        options: {
          redirectTo: config.redirectTo || process.env.OAUTH_REDIRECT_URL
        }
      });

      if (error) {
        throw new Error(`Social auth failed: ${error.message}`);
      }

      logger.info('Social auth initiated', { provider: config.provider });

      return { url: data.url };
    } catch (error) {
      logger.error('Social auth failed', { error: error.message, provider: config.provider });
      throw error;
    }
  }

  /**
   * Handle OAuth callback and sync user
   */
  async handleOAuthCallback(code: string): Promise<{ user: any; tokens: AuthTokens }> {
    try {
      // Exchange code for session
      const { data: authData, error: authError } = await this.supabase.auth.exchangeCodeForSession(code);

      if (authError || !authData.session || !authData.user) {
        throw new Error(`OAuth callback failed: ${authError?.message || 'No session'}`);
      }

      // Check if user exists in our database
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: authData.user.email! },
            { supabaseUserId: authData.user.id }
          ]
        }
      });

      // Create user if doesn't exist
      if (!user) {
        const metadata = authData.user.user_metadata;
        user = await prisma.user.create({
          data: {
            email: authData.user.email!,
            username: metadata.preferred_username || metadata.email?.split('@')[0] || `user_${Date.now()}`,
            passwordHash: '', // OAuth users don't have passwords
            firstName: metadata.given_name || metadata.first_name || '',
            lastName: metadata.family_name || metadata.last_name || '',
            role: 'STUDENT',
            enrollmentStatus: 'ACTIVE',
            academicLevel: 'SCROLL_OPEN',
            scrollCoinBalance: 10.0,
            scrollAlignment: 0.1,
            supabaseUserId: authData.user.id
          }
        });

        // Award welcome bonus
        await prisma.scrollCoinTransaction.create({
          data: {
            userId: user.id,
            amount: 10.0,
            type: 'BONUS',
            description: 'Welcome to ScrollUniversity - OAuth enrollment bonus',
            activityType: 'DAILY_XP_STREAK'
          }
        });
      }

      // Extract tokens
      const tokens = this.extractTokensFromSession(authData.session);

      // Store session
      await this.storeRefreshToken(user.id, tokens.refreshToken);
      await this.storeSession(user.id, {
        userId: user.id,
        email: user.email,
        role: user.role,
        supabaseId: authData.user.id
      });

      logger.info('OAuth callback handled successfully', { userId: user.id });

      return { user, tokens };
    } catch (error) {
      logger.error('OAuth callback failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: process.env.PASSWORD_RESET_REDIRECT_URL
      });

      if (error) {
        throw new Error(`Password reset request failed: ${error.message}`);
      }

      logger.info('Password reset requested', { email });
    } catch (error) {
      logger.error('Password reset request failed', { error: error.message, email });
      // Don't throw to prevent email enumeration
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(accessToken: string, newPassword: string): Promise<void> {
    try {
      // Set session with access token
      const { error: sessionError } = await this.supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: '' // Not needed for password reset
      });

      if (sessionError) {
        throw new Error(`Session setup failed: ${sessionError.message}`);
      }

      // Update password
      const { error: updateError } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw new Error(`Password update failed: ${updateError.message}`);
      }

      logger.info('Password reset successfully');
    } catch (error) {
      logger.error('Password reset failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<UserPayload> {
    try {
      // Verify with Supabase
      const { data: { user }, error } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        throw new Error('Invalid or expired access token');
      }

      // Get user from database
      const dbUser = await prisma.user.findFirst({
        where: { supabaseUserId: user.id },
        select: { id: true, email: true, role: true }
      });

      if (!dbUser) {
        throw new Error('User not found in database');
      }

      return {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        supabaseId: user.id
      };
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string, type: 'signup' | 'email_change'): Promise<void> {
    try {
      const { error } = await this.supabase.auth.verifyOtp({
        token_hash: token,
        type
      });

      if (error) {
        throw new Error(`Email verification failed: ${error.message}`);
      }

      logger.info('Email verified successfully');
    } catch (error) {
      logger.error('Email verification failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Blacklist token (for logout or security)
   */
  async blacklistToken(token: string, expiresIn: number): Promise<void> {
    const key = `${this.BLACKLIST_PREFIX}${token}`;
    await cacheService.set(key, true, { ttl: expiresIn });
    logger.info('Token blacklisted');
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `${this.BLACKLIST_PREFIX}${token}`;
    const blacklisted = await cacheService.get<boolean>(key);
    return blacklisted === true;
  }

  /**
   * Extract tokens from Supabase session
   */
  private extractTokensFromSession(session: Session): AuthTokens {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in || 3600,
      expiresAt: session.expires_at || Date.now() / 1000 + 3600
    };
  }

  /**
   * Store refresh token with rotation
   */
  private async rotateRefreshToken(userId: string, newToken: string): Promise<void> {
    // Invalidate old token
    const oldToken = await this.getStoredRefreshToken(userId);
    if (oldToken) {
      await this.blacklistToken(oldToken, 300); // Blacklist for 5 minutes
    }

    // Store new token
    await this.storeRefreshToken(userId, newToken);
  }

  /**
   * Store refresh token in Redis
   */
  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${userId}`;
    await cacheService.set(key, refreshToken, { ttl: 7 * 24 * 60 * 60 }); // 7 days
  }

  /**
   * Get stored refresh token
   */
  private async getStoredRefreshToken(userId: string): Promise<string | null> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${userId}`;
    return await cacheService.get<string>(key);
  }

  /**
   * Remove refresh token
   */
  private async removeRefreshToken(userId: string): Promise<void> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${userId}`;
    await cacheService.delete(key);
  }

  /**
   * Store session in Redis
   */
  private async storeSession(userId: string, sessionData: any): Promise<void> {
    const key = `${this.SESSION_PREFIX}${userId}`;
    await cacheService.set(key, sessionData, { ttl: 24 * 60 * 60 }); // 24 hours
  }

  /**
   * Get session from Redis
   */
  async getSession(userId: string): Promise<any | null> {
    const key = `${this.SESSION_PREFIX}${userId}`;
    return await cacheService.get(key);
  }

  /**
   * Remove session
   */
  private async removeSession(userId: string): Promise<void> {
    const key = `${this.SESSION_PREFIX}${userId}`;
    await cacheService.delete(key);
  }
}

export const supabaseAuthService = new SupabaseAuthService();
