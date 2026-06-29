/**
 * ScrollUniversity Error Handler
 * Divine error management with kingdom wisdom
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface ScrollError extends Error {
  statusCode?: number;
  scrollMessage?: string;
  kingdomGuidance?: string;
}

export const errorHandler = (
  error: ScrollError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error with scroll context
  logger.error('ScrollUniversity Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });
  
  // Default error response
  let statusCode = error.statusCode || 500;
  let message = error.message || 'An unexpected error occurred';
  let scrollMessage = error.scrollMessage;
  let kingdomGuidance = error.kingdomGuidance;
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    scrollMessage = 'The scroll requires proper formatting and divine alignment';
    kingdomGuidance = 'Review your submission and ensure it meets kingdom standards';
  }
  
  if (error.name === 'PrismaClientKnownRequestError') {
    statusCode = 400;
    message = 'Database operation failed';
    scrollMessage = 'The kingdom database rejected this operation';
    kingdomGuidance = 'Check your data and try again with proper formatting';
  }
  
  if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    scrollMessage = 'Divine authorization is required for this sacred operation';
    kingdomGuidance = 'Seek proper credentials and return with kingdom authority';
  }
  
  // Construct error response
  const errorResponse: any = {
    error: true,
    message,
    statusCode,
    timestamp: new Date().toISOString()
  };
  
  // Add scroll-specific guidance
  if (scrollMessage) {
    errorResponse.scrollMessage = scrollMessage;
  }
  
  if (kingdomGuidance) {
    errorResponse.kingdomGuidance = kingdomGuidance;
  }
  
  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }
  
  // Add request context for debugging
  if (process.env.NODE_ENV === 'development') {
    errorResponse.requestContext = {
      url: req.url,
      method: req.method,
      headers: req.headers,
      body: req.body
    };
  }
  
  res.status(statusCode).json(errorResponse);
};

// Custom error classes for ScrollUniversity
export class ScrollValidationError extends Error {
  statusCode = 400;
  scrollMessage: string;
  kingdomGuidance: string;
  
  constructor(message: string, scrollMessage?: string, kingdomGuidance?: string) {
    super(message);
    this.name = 'ScrollValidationError';
    this.scrollMessage = scrollMessage || 'The scroll requires proper divine alignment';
    this.kingdomGuidance = kingdomGuidance || 'Review kingdom standards and resubmit';
  }
}

export class ScrollAuthorizationError extends Error {
  statusCode = 403;
  scrollMessage: string;
  kingdomGuidance: string;
  
  constructor(message: string, scrollMessage?: string, kingdomGuidance?: string) {
    super(message);
    this.name = 'ScrollAuthorizationError';
    this.scrollMessage = scrollMessage || 'Insufficient kingdom authority for this operation';
    this.kingdomGuidance = kingdomGuidance || 'Seek greater anointing and return with proper credentials';
  }
}

export class ScrollCoinError extends Error {
  statusCode = 400;
  scrollMessage: string;
  kingdomGuidance: string;
  
  constructor(message: string, scrollMessage?: string, kingdomGuidance?: string) {
    super(message);
    this.name = 'ScrollCoinError';
    this.scrollMessage = scrollMessage || 'ScrollCoin transaction failed';
    this.kingdomGuidance = kingdomGuidance || 'Check your ScrollCoin balance and try again';
  }
}

export class PropheticValidationError extends Error {
  statusCode = 422;
  scrollMessage: string;
  kingdomGuidance: string;
  
  constructor(message: string, scrollMessage?: string, kingdomGuidance?: string) {
    super(message);
    this.name = 'PropheticValidationError';
    this.scrollMessage = scrollMessage || 'Content failed prophetic validation';
    this.kingdomGuidance = kingdomGuidance || 'Align your content with scroll principles and resubmit';
  }
}