/**
 * CSRF Protection Middleware
 * "Be alert and of sober mind. Your enemy the devil prowls around" - 1 Peter 5:8
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';

// Store for CSRF tokens (in production, use Redis)
const tokenStore = new Map<string, { token: string; expires: number }>();

// Token expiration time (1 hour)
const TOKEN_EXPIRATION = 60 * 60 * 1000;

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store CSRF token for session
 */
function storeToken(sessionId: string, token: string): void {
  tokenStore.set(sessionId, {
    token,
    expires: Date.now() + TOKEN_EXPIRATION
  });
}

/**
 * Verify CSRF token
 */
function verifyToken(sessionId: string, token: string): boolean {
  const stored = tokenStore.get(sessionId);
  
  if (!stored) {
    return false;
  }
  
  // Check if token expired
  if (Date.now() > stored.expires) {
    tokenStore.delete(sessionId);
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(stored.token),
    Buffer.from(token)
  );
}

/**
 * Clean up expired tokens
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [sessionId, data] of tokenStore.entries()) {
    if (now > data.expires) {
      tokenStore.delete(sessionId);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredTokens, 5 * 60 * 1000);

/**
 * CSRF token generation middleware
 * Generates and attaches CSRF token to response
 */
export function csrfTokenGenerator(req: Request, res: Response, next: NextFunction): void {
  // Get or create session ID
  const sessionId = req.user?.id || req.sessionID || req.ip || 'anonymous';
  
  // Generate new token
  const token = generateCSRFToken();
  storeToken(sessionId, token);
  
  // Attach token to response
  res.locals.csrfToken = token;
  
  // Set token in cookie (httpOnly, secure, sameSite)
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false, // Allow JavaScript to read for AJAX requests
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRATION
  });
  
  next();
}

/**
 * CSRF protection middleware
 * Validates CSRF token for state-changing operations
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF check for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF check for API endpoints with Bearer token
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return next();
  }
  
  // Get session ID
  const sessionId = req.user?.id || req.sessionID || req.ip || 'anonymous';
  
  // Get token from header or body
  const token = req.headers['x-csrf-token'] as string || 
                req.headers['x-xsrf-token'] as string ||
                req.body._csrf ||
                req.query._csrf as string;
  
  if (!token) {
    logger.warn('CSRF token missing', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userId: req.user?.id
    });
    
    return res.status(403).json({
      success: false,
      error: 'CSRF token missing'
    });
  }
  
  // Verify token
  if (!verifyToken(sessionId, token)) {
    logger.warn('CSRF token invalid', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userId: req.user?.id
    });
    
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token'
    });
  }
  
  next();
}

/**
 * Double submit cookie pattern
 * Alternative CSRF protection using cookie comparison
 */
export function doubleSubmitCookie(req: Request, res: Response, next: NextFunction): void {
  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Get token from cookie and header
  const cookieToken = req.cookies['XSRF-TOKEN'];
  const headerToken = req.headers['x-xsrf-token'] as string;
  
  if (!cookieToken || !headerToken) {
    logger.warn('Double submit cookie check failed - missing tokens', {
      method: req.method,
      path: req.path,
      ip: req.ip
    });
    
    return res.status(403).json({
      success: false,
      error: 'CSRF protection failed'
    });
  }
  
  // Compare tokens using constant-time comparison
  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    logger.warn('Double submit cookie check failed - token mismatch', {
      method: req.method,
      path: req.path,
      ip: req.ip
    });
    
    return res.status(403).json({
      success: false,
      error: 'CSRF protection failed'
    });
  }
  
  next();
}

export default {
  generateCSRFToken,
  csrfTokenGenerator,
  csrfProtection,
  doubleSubmitCookie
};
