/**
 * ScrollUniversity Authentication Routes
 * Divine access control for kingdom education
 */

import express from 'express';
import Joi from 'joi';
import { supabaseAuthService } from '../services/SupabaseAuthService';
import { authService } from '../services/AuthService';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/productionLogger';

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  location: Joi.string().max(100).optional(),
  phoneNumber: Joi.string().max(20).optional(),
  scrollCalling: Joi.string().max(500).optional(),
  spiritualGifts: Joi.array().items(Joi.string()).optional(),
  kingdomVision: Joi.string().max(1000).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Generate JWT token
const generateToken = (user: any): string => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    scrollAlignment: user.scrollAlignment
  };
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
};

// Register new ScrollStudent
router.post('/register', async (req, res, next) => {
  try {
    // Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      throw new ScrollValidationError(
        error.details[0].message,
        'The scroll registration requires proper divine formatting',
        'Ensure all required fields are filled with kingdom standards'
      );
    }
    
    const {
      email,
      username,
      password,
      firstName,
      lastName,
      location,
      phoneNumber,
      scrollCalling,
      spiritualGifts,
      kingdomVision
    } = value;
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });
    
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'A ScrollStudent with this email or username already exists',
        scrollMessage: 'Each scroll son must have a unique identity in the kingdom'
      });
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        firstName,
        lastName,
        location,
        phoneNumber,
        scrollCalling,
        spiritualGifts: spiritualGifts || [],
        kingdomVision,
        role: 'STUDENT',
        enrollmentStatus: 'ACTIVE',
        academicLevel: 'SCROLL_OPEN',
        scrollCoinBalance: 10.0, // Welcome bonus
        scrollAlignment: 0.1 // Starting alignment
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
        createdAt: true
      }
    });
    
    // Award welcome ScrollCoin
    await prisma.scrollCoinTransaction.create({
      data: {
        userId: newUser.id,
        amount: 10.0,
        type: 'BONUS',
        description: 'Welcome to ScrollUniversity - Divine enrollment bonus',
        activityType: 'DAILY_XP_STREAK'
      }
    });
    
    // Generate token
    const token = generateToken(newUser);
    
    logger.scroll('New ScrollStudent registered', {
      userId: newUser.id,
      email: newUser.email,
      username: newUser.username
    });
    
    res.status(201).json({
      message: 'ScrollStudent successfully enrolled in the kingdom',
      scrollMessage: 'Welcome to Zion\'s Academic Government on Earth',
      user: newUser,
      token,
      kingdomGuidance: 'Begin your journey with ScrollOpen courses and daily XP streaks'
    });
    
  } catch (error) {
    next(error);
  }
});

// Login ScrollStudent
router.post('/login', async (req, res, next) => {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      throw new ScrollValidationError(
        error.details[0].message,
        'Divine login requires proper credentials',
        'Provide valid email and password for kingdom access'
      );
    }
    
    const { email, password } = value;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: true,
        enrollmentStatus: true,
        scrollCoinBalance: true,
        scrollAlignment: true,
        lastLoginAt: true
      }
    });
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'ScrollStudent not found in the kingdom database',
        scrollMessage: 'Verify your divine credentials and try again'
      });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Password does not match kingdom records',
        scrollMessage: 'The divine password is incorrect'
      });
    }
    
    // Check enrollment status
    if (user.enrollmentStatus !== 'ACTIVE') {
      return res.status(403).json({
        error: 'Account not active',
        message: `ScrollStudent enrollment status: ${user.enrollmentStatus}`,
        scrollMessage: 'Your kingdom access has been restricted',
        kingdomGuidance: 'Contact ScrollUniversity administration for account restoration'
      });
    }
    
    // Generate token
    const token = generateToken(user);
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });
    
    // Remove password hash from response
    const { passwordHash, ...userResponse } = user;
    
    logger.scroll('ScrollStudent logged in', {
      userId: user.id,
      email: user.email,
      lastLogin: user.lastLoginAt
    });
    
    res.json({
      message: 'ScrollStudent successfully authenticated',
      scrollMessage: 'Welcome back to the kingdom',
      user: userResponse,
      token,
      kingdomGuidance: 'Continue your divine education journey'
    });
    
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        scrollMessage: 'Divine token renewal requires proper credentials'
      });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;
    
    // Get fresh user data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        scrollAlignment: true,
        enrollmentStatus: true
      }
    });
    
    if (!user || user.enrollmentStatus !== 'ACTIVE') {
      return res.status(401).json({
        error: 'Invalid refresh token',
        scrollMessage: 'Kingdom access has been revoked'
      });
    }
    
    // Generate new token
    const newToken = generateToken(user);
    
    res.json({
      message: 'Token successfully renewed',
      scrollMessage: 'Divine authorization extended',
      token: newToken
    });
    
  } catch (error) {
    next(error);
  }
});

// Logout (client-side token removal, but we can log the event)
router.post('/logout', async (req, res) => {
  // In a more complex system, we might maintain a token blacklist
  // For now, we just log the logout event
  
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      logger.scroll('ScrollStudent logged out', {
        userId: decoded.userId,
        email: decoded.email
      });
    } catch (error) {
      // Token might be invalid, but that's okay for logout
    }
  }
  
  res.json({
    message: 'ScrollStudent successfully logged out',
    scrollMessage: 'May the kingdom peace be with you',
    kingdomGuidance: 'Return anytime to continue your divine education'
  });
});

export default router;

// ============================================================================
// SUPABASE AUTHENTICATION ROUTES
// ============================================================================

/**
 * Register with Supabase Auth
 */
router.post('/supabase/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details[0].message
      });
    }

    const result = await supabaseAuthService.register(value);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Supabase registration failed', { error: error.message });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Login with Supabase Auth
 */
router.post('/supabase/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details[0].message
      });
    }

    const result = await supabaseAuthService.login(value.email, value.password);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Supabase login failed', { error: error.message });
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Refresh access token
 */
router.post('/supabase/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    const tokens = await supabaseAuthService.refreshToken(refreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: { tokens }
    });
  } catch (error) {
    logger.error('Token refresh failed', { error: error.message });
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Logout
 */
router.post('/supabase/logout', authenticate, async (req, res) => {
  try {
    await supabaseAuthService.logout(req.user!.id);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

/**
 * Social authentication - initiate OAuth flow
 */
router.post('/supabase/social/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { redirectTo } = req.body;

    if (!['google', 'microsoft', 'github', 'facebook'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider'
      });
    }

    const result = await supabaseAuthService.socialAuth({
      provider: provider as any,
      redirectTo
    });

    res.json({
      success: true,
      message: 'OAuth flow initiated',
      data: { url: result.url }
    });
  } catch (error) {
    logger.error('Social auth failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * OAuth callback handler
 */
router.get('/supabase/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Authorization code required'
      });
    }

    const result = await supabaseAuthService.handleOAuthCallback(code);

    // Redirect to frontend with tokens
    const redirectUrl = new URL(process.env.FRONTEND_URL || 'http://localhost:3001');
    redirectUrl.searchParams.set('access_token', result.tokens.accessToken);
    redirectUrl.searchParams.set('refresh_token', result.tokens.refreshToken);

    res.redirect(redirectUrl.toString());
  } catch (error) {
    logger.error('OAuth callback failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Request password reset
 */
router.post('/supabase/password-reset/request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email required'
      });
    }

    await supabaseAuthService.requestPasswordReset(email);

    res.json({
      success: true,
      message: 'Password reset email sent if account exists'
    });
  } catch (error) {
    logger.error('Password reset request failed', { error: error.message });
    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'Password reset email sent if account exists'
    });
  }
});

/**
 * Reset password with token
 */
router.post('/supabase/password-reset/confirm', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token and new password required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
      });
    }

    await supabaseAuthService.resetPassword(token, newPassword);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Password reset failed', { error: error.message });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Verify email
 */
router.post('/supabase/verify-email', async (req, res) => {
  try {
    const { token, type } = req.body;

    if (!token || !type) {
      return res.status(400).json({
        success: false,
        error: 'Token and type required'
      });
    }

    await supabaseAuthService.verifyEmail(token, type);

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    logger.error('Email verification failed', { error: error.message });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get current user session
 */
router.get('/supabase/session', authenticate, async (req, res) => {
  try {
    const session = await supabaseAuthService.getSession(req.user!.id);

    res.json({
      success: true,
      data: { session }
    });
  } catch (error) {
    logger.error('Get session failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session'
    });
  }
});

/**
 * Change password (authenticated)
 */
router.post('/supabase/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current and new password required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters'
      });
    }

    await authService.changePassword(req.user!.id, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Password change failed', { error: error.message });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Authentication service is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;
