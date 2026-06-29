/**
 * Advanced Rate Limiting Middleware
 * Sophisticated rate limiting for sensitive endpoints
 * "Be wise as serpents and innocent as doves" - Matthew 10:16
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { logger } from '../utils/logger';

// Redis client for distributed rate limiting
let redisClient: ReturnType<typeof createClient> | null = null;

/**
 * Initialize Redis client for rate limiting
 */
async function initializeRedis(): Promise<void> {
  if (process.env.REDIS_URL) {
    try {
      redisClient = createClient({
        url: process.env.REDIS_URL
      });
      
      await redisClient.connect();
      logger.info('Redis connected for rate limiting');
    } catch (error) {
      logger.error('Redis connection failed for rate limiting', { error: error.message });
      redisClient = null;
    }
  }
}

// Initialize Redis on module load
initializeRedis();

/**
 * Create rate limiter with Redis store if available
 */
function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}): RateLimitRequestHandler {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later',
    keyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;
  
  const config: any = {
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userId: req.user?.id
      });
      
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: res.getHeader('Retry-After')
      });
    }
  };
  
  // Use Redis store if available
  if (redisClient) {
    config.store = new RedisStore({
      client: redisClient as any,
      prefix: 'rl:'
    });
  }
  
  // Custom key generator
  if (keyGenerator) {
    config.keyGenerator = keyGenerator;
  }
  
  return rateLimit(config);
}

/**
 * Authentication rate limiter
 * Strict limits for login/register endpoints
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later',
  keyGenerator: (req: Request) => {
    // Rate limit by IP and email combination
    const email = req.body?.email || 'unknown';
    return `${req.ip}-${email}`;
  },
  skipSuccessfulRequests: true // Only count failed attempts
});

/**
 * Password reset rate limiter
 */
export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: 'Too many password reset requests, please try again later',
  keyGenerator: (req: Request) => {
    const email = req.body?.email || req.ip;
    return `pwd-reset-${email}`;
  }
});

/**
 * API rate limiter
 * General API endpoint protection
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'API rate limit exceeded',
  keyGenerator: (req: Request) => {
    return req.user?.id || req.ip || 'anonymous';
  }
});

/**
 * AI endpoint rate limiter
 * Strict limits for expensive AI operations
 */
export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'AI request rate limit exceeded',
  keyGenerator: (req: Request) => {
    return `ai-${req.user?.id || req.ip}`;
  }
});

/**
 * File upload rate limiter
 */
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: 'Upload rate limit exceeded',
  keyGenerator: (req: Request) => {
    return `upload-${req.user?.id || req.ip}`;
  }
});

/**
 * Payment endpoint rate limiter
 */
export const paymentRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 payment attempts per hour
  message: 'Payment rate limit exceeded',
  keyGenerator: (req: Request) => {
    return `payment-${req.user?.id || req.ip}`;
  }
});

/**
 * Admin endpoint rate limiter
 */
export const adminRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Higher limit for admin users
  message: 'Admin rate limit exceeded',
  keyGenerator: (req: Request) => {
    return `admin-${req.user?.id || req.ip}`;
  }
});

/**
 * Search rate limiter
 */
export const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: 'Search rate limit exceeded',
  keyGenerator: (req: Request) => {
    return `search-${req.user?.id || req.ip}`;
  }
});

/**
 * Adaptive rate limiter
 * Adjusts limits based on user behavior
 */
export function adaptiveRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  
  // Different limits based on user role
  let maxRequests = 100;
  
  if (userRole === 'ADMIN') {
    maxRequests = 500;
  } else if (userRole === 'FACULTY') {
    maxRequests = 300;
  } else if (userRole === 'STUDENT') {
    maxRequests = 150;
  }
  
  // Apply dynamic rate limit
  const limiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: maxRequests,
    keyGenerator: (req: Request) => {
      return `adaptive-${userId || req.ip}`;
    }
  });
  
  limiter(req, res, next);
}

/**
 * Sliding window rate limiter
 * More accurate than fixed window
 */
export class SlidingWindowRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;
  
  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }
  
  public middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = req.user?.id || req.ip || 'anonymous';
      const now = Date.now();
      
      // Get existing timestamps
      const timestamps = this.requests.get(key) || [];
      
      // Filter to only include timestamps within window
      const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);
      
      // Check if limit exceeded
      if (validTimestamps.length >= this.maxRequests) {
        logger.warn('Sliding window rate limit exceeded', {
          key,
          count: validTimestamps.length,
          max: this.maxRequests
        });
        
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((validTimestamps[0] + this.windowMs - now) / 1000)
        });
      }
      
      // Add current timestamp
      validTimestamps.push(now);
      this.requests.set(key, validTimestamps);
      
      next();
    };
  }
}

/**
 * Token bucket rate limiter
 * Allows bursts but maintains average rate
 */
export class TokenBucketRateLimiter {
  private buckets: Map<string, { tokens: number; lastRefill: number }> = new Map();
  private capacity: number;
  private refillRate: number; // tokens per second
  
  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
  }
  
  private refillBucket(key: string): void {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      this.buckets.set(key, { tokens: this.capacity, lastRefill: Date.now() });
      return;
    }
    
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;
    
    bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }
  
  public middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = req.user?.id || req.ip || 'anonymous';
      
      this.refillBucket(key);
      
      const bucket = this.buckets.get(key)!;
      
      if (bucket.tokens < 1) {
        logger.warn('Token bucket rate limit exceeded', {
          key,
          tokens: bucket.tokens
        });
        
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((1 - bucket.tokens) / this.refillRate)
        });
      }
      
      bucket.tokens -= 1;
      next();
    };
  }
}

export default {
  authRateLimiter,
  passwordResetRateLimiter,
  apiRateLimiter,
  aiRateLimiter,
  uploadRateLimiter,
  paymentRateLimiter,
  adminRateLimiter,
  searchRateLimiter,
  adaptiveRateLimiter,
  SlidingWindowRateLimiter,
  TokenBucketRateLimiter
};
