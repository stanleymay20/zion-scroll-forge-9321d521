/**
 * ScrollUniversity Authentication Middleware
 * "Guard the good deposit that was entrusted to you" - 2 Timothy 1:14
 */

import { Request, Response, NextFunction } from 'express';
import { supabaseAuthService } from '../services/SupabaseAuthService';
import { authService } from '../services/AuthService';
import { logger } from '../utils/productionLogger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        supabaseId?: string;
      };
    }
  }
}

/**
 * Authenticate user from JWT token (Supabase or legacy)
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No authentication token provided'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Check if token is blacklisted
    const isBlacklisted = await supabaseAuthService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        error: 'Token has been revoked'
      });
      return;
    }

    // Try Supabase auth first
    try {
      const payload = await supabaseAuthService.verifyAccessToken(token);
      req.user = payload;
      next();
      return;
    } catch (supabaseError) {
      // Fallback to legacy auth
      try {
        const payload = await authService.verifyAccessToken(token);
        req.user = payload;
        next();
        return;
      } catch (legacyError) {
        throw new Error('Invalid or expired authentication token');
      }
    }
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error.message,
      ip: req.ip,
      path: req.path
    });

    res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token'
    });
  }
};

/**
 * Authorize user based on roles
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path
      });

      res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await authService.verifyAccessToken(token);
      req.user = payload;
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Require authentication (alias for authenticate)
 */
export const requireAuth = authenticate;

/**
 * Require specific role(s)
 */
export const requireRole = (roles: string[]) => {
  return [authenticate, authorize(...roles)];
};
