/**
 * Production Security Middleware
 * Enhanced security measures for production environment
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { getProductionConfig } from '../config/production.config';
import { logger } from '../utils/logger';

/**
 * Configure Helmet security headers for production
 */
export function configureHelmet() {
  const config = getProductionConfig();

  if (!config.security.helmetEnabled) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", 'https://api.openai.com', 'https://api.anthropic.com'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: 'deny',
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  });
}

/**
 * Configure rate limiting for production
 */
export function configureRateLimit() {
  const config = getProductionConfig();

  return rateLimit({
    windowMs: config.security.rateLimitWindow * 60 * 1000,
    max: config.security.rateLimitMax,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

      res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: res.getHeader('Retry-After'),
      });
    },
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/ready' || req.path === '/live';
    },
  });
}

/**
 * Configure AI-specific rate limiting
 */
export function configureAIRateLimit() {
  const config = getProductionConfig();

  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: config.ai.rateLimits.rpm,
    message: 'AI request rate limit exceeded.',
    keyGenerator: (req: Request) => {
      // Rate limit per user for AI requests
      return req.user?.id || req.ip || 'anonymous';
    },
    handler: (req: Request, res: Response) => {
      logger.warn('AI rate limit exceeded', {
        userId: req.user?.id,
        ip: req.ip,
        path: req.path,
      });

      res.status(429).json({
        success: false,
        error: 'AI request rate limit exceeded. Please try again later.',
        retryAfter: res.getHeader('Retry-After'),
      });
    },
  });
}

/**
 * Request sanitization middleware
 */
export function sanitizeRequest(req: Request, res: Response, next: NextFunction): void {
  // Remove potentially dangerous characters from query parameters
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = (req.query[key] as string)
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, '')
          .trim();
      }
    });
  }

  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  next();
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): void {
  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === 'string') {
      obj[key] = obj[key]
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  });
}

/**
 * Security headers middleware
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
}

/**
 * Request logging middleware for production
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
    });

    // Log slow requests
    if (duration > 5000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration,
        userId: req.user?.id,
      });
    }
  });

  next();
}

/**
 * Error boundary middleware
 */
export function errorBoundary(err: Error, req: Request, res: Response, next: NextFunction): Response | void {
  // Log error
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
  });

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  return res.status(500).json({
    success: false,
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
  });
}

/**
 * CORS configuration for production
 */
export function configureCORS() {
  const config = getProductionConfig();

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (config.security.corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS origin rejected', { origin });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: config.security.corsCredentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours
  };
}

/**
 * IP whitelist middleware (for admin routes)
 */
export function ipWhitelist(allowedIPs: string[]) {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    const clientIP = req.ip || req.connection.remoteAddress || '';

    if (allowedIPs.includes(clientIP)) {
      return next();
    } else {
      logger.warn('IP whitelist rejection', {
        ip: clientIP,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }
  };
}

/**
 * Request size limiter
 */
export function requestSizeLimiter(maxSize: string = '10mb') {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    const contentLength = req.get('content-length');

    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const maxSizeInBytes = parseSize(maxSize);

      if (sizeInBytes > maxSizeInBytes) {
        logger.warn('Request size exceeded', {
          size: sizeInBytes,
          maxSize: maxSizeInBytes,
          path: req.path,
        });

        return res.status(413).json({
          success: false,
          error: 'Request entity too large',
        });
      }
    }

    return next();
  };
}

/**
 * Parse size string to bytes
 */
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);
  if (!match) {
    return parseInt(size, 10);
  }

  const value = parseFloat(match[1]);
  const unit = match[2];

  return value * (units[unit] || 1);
}

/**
 * Maintenance mode middleware
 */
export function maintenanceMode(req: Request, res: Response, next: NextFunction): void {
  const isMaintenanceMode = process.env.ENABLE_MAINTENANCE_MODE === 'true';

  if (isMaintenanceMode) {
    // Allow health checks during maintenance
    if (req.path === '/health' || req.path === '/ready') {
      return next();
    }

    return res.status(503).json({
      success: false,
      error: 'Service temporarily unavailable for maintenance',
      retryAfter: 3600, // 1 hour
    });
  }

  next();
}

export default {
  configureHelmet,
  configureRateLimit,
  configureAIRateLimit,
  sanitizeRequest,
  securityHeaders,
  requestLogger,
  errorBoundary,
  configureCORS,
  ipWhitelist,
  requestSizeLimiter,
  maintenanceMode,
};
