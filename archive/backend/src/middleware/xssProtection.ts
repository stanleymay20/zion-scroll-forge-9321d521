/**
 * XSS Protection Middleware
 * Enhanced input sanitization and output encoding
 * "Guard your heart, for everything you do flows from it" - Proverbs 4:23
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * HTML entities to escape
 */
const HTML_ENTITIES: { [key: string]: string } = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
};

/**
 * Escape HTML entities
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"'\/]/g, (char) => HTML_ENTITIES[char]);
}

/**
 * Remove script tags and event handlers
 */
export function removeScripts(text: string): string {
  // Remove script tags
  let cleaned = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers (onclick, onerror, etc.)
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: protocol
  cleaned = cleaned.replace(/javascript:/gi, '');
  
  // Remove data: protocol (can be used for XSS)
  cleaned = cleaned.replace(/data:text\/html/gi, '');
  
  return cleaned;
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, options: {
  allowHtml?: boolean;
  maxLength?: number;
  removeScripts?: boolean;
} = {}): string {
  const {
    allowHtml = false,
    maxLength = 10000,
    removeScripts: shouldRemoveScripts = true
  } = options;
  
  if (typeof input !== 'string') {
    return '';
  }
  
  let sanitized = input.trim();
  
  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Remove scripts
  if (shouldRemoveScripts) {
    sanitized = removeScripts(sanitized);
  }
  
  // Escape HTML if not allowed
  if (!allowHtml) {
    sanitized = escapeHtml(sanitized);
  }
  
  return sanitized;
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any, options: {
  allowHtml?: boolean;
  maxDepth?: number;
  currentDepth?: number;
} = {}): any {
  const {
    allowHtml = false,
    maxDepth = 10,
    currentDepth = 0
  } = options;
  
  // Prevent deep recursion
  if (currentDepth >= maxDepth) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj, { allowHtml });
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, {
      allowHtml,
      maxDepth,
      currentDepth: currentDepth + 1
    }));
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key], {
          allowHtml,
          maxDepth,
          currentDepth: currentDepth + 1
        });
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Detect potential XSS patterns
 */
export function detectXSS(input: string): boolean {
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i,
    /vbscript:/i,
    /data:text\/html/i
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * XSS protection middleware
 * Sanitizes request body, query, and params
 */
export function xssProtection(options: {
  allowHtml?: boolean;
  logSuspicious?: boolean;
} = {}) {
  const {
    allowHtml = false,
    logSuspicious = true
  } = options;
  
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Track if suspicious content was found
      let suspiciousFound = false;
      
      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        for (const key in req.query) {
          const value = req.query[key];
          if (typeof value === 'string') {
            if (detectXSS(value)) {
              suspiciousFound = true;
            }
            req.query[key] = sanitizeString(value, { allowHtml });
          }
        }
      }
      
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        // Check for XSS before sanitizing
        const bodyStr = JSON.stringify(req.body);
        if (detectXSS(bodyStr)) {
          suspiciousFound = true;
        }
        
        req.body = sanitizeObject(req.body, { allowHtml });
      }
      
      // Sanitize URL parameters
      if (req.params && typeof req.params === 'object') {
        for (const key in req.params) {
          const value = req.params[key];
          if (typeof value === 'string') {
            if (detectXSS(value)) {
              suspiciousFound = true;
            }
            req.params[key] = sanitizeString(value, { allowHtml });
          }
        }
      }
      
      // Log suspicious activity
      if (suspiciousFound && logSuspicious) {
        logger.warn('Potential XSS attempt detected', {
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          userId: req.user?.id
        });
      }
      
      next();
    } catch (error) {
      logger.error('XSS protection error', {
        error: error.message,
        path: req.path
      });
      next(error);
    }
  };
}

/**
 * Content Security Policy helper
 */
export function setCSPHeaders(res: Response): void {
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.openai.com https://api.anthropic.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', cspDirectives);
}

/**
 * Strict XSS protection middleware
 * Rejects requests with detected XSS patterns
 */
export function strictXSSProtection(req: Request, res: Response, next: NextFunction): void {
  const bodyStr = JSON.stringify(req.body || {});
  const queryStr = JSON.stringify(req.query || {});
  const paramsStr = JSON.stringify(req.params || {});
  
  const combinedInput = `${bodyStr}${queryStr}${paramsStr}`;
  
  if (detectXSS(combinedInput)) {
    logger.warn('XSS attempt blocked', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id
    });
    
    return res.status(400).json({
      success: false,
      error: 'Invalid input detected'
    });
  }
  
  next();
}

export default {
  escapeHtml,
  removeScripts,
  sanitizeString,
  sanitizeObject,
  detectXSS,
  xssProtection,
  setCSPHeaders,
  strictXSSProtection
};
