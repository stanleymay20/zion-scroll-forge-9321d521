/**
 * Audit Logging Middleware
 * Comprehensive logging for sensitive operations
 * "Nothing is hidden that will not be made manifest" - Luke 8:17
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Audit event types
 */
export enum AuditEventType {
  // Authentication events
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  
  // User management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  
  // Data access
  DATA_ACCESSED = 'DATA_ACCESSED',
  DATA_EXPORTED = 'DATA_EXPORTED',
  SENSITIVE_DATA_VIEWED = 'SENSITIVE_DATA_VIEWED',
  
  // Financial operations
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  REFUND_ISSUED = 'REFUND_ISSUED',
  SCHOLARSHIP_AWARDED = 'SCHOLARSHIP_AWARDED',
  
  // Academic operations
  GRADE_CHANGED = 'GRADE_CHANGED',
  COURSE_ENROLLED = 'COURSE_ENROLLED',
  COURSE_COMPLETED = 'COURSE_COMPLETED',
  ASSIGNMENT_SUBMITTED = 'ASSIGNMENT_SUBMITTED',
  
  // Administrative actions
  SYSTEM_CONFIG_CHANGED = 'SYSTEM_CONFIG_CHANGED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',
  
  // Security events
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  ACCESS_DENIED = 'ACCESS_DENIED',
  
  // Content moderation
  CONTENT_FLAGGED = 'CONTENT_FLAGGED',
  CONTENT_REMOVED = 'CONTENT_REMOVED',
  USER_BANNED = 'USER_BANNED',
  
  // Blockchain operations
  SCROLLCOIN_MINTED = 'SCROLLCOIN_MINTED',
  SCROLLCOIN_TRANSFERRED = 'SCROLLCOIN_TRANSFERRED',
  SCROLLBADGE_ISSUED = 'SCROLLBADGE_ISSUED'
}

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  eventType: AuditEventType;
  userId?: string;
  targetUserId?: string;
  resourceType?: string;
  resourceId?: string;
  action: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * Create audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        eventType: entry.eventType,
        userId: entry.userId,
        targetUserId: entry.targetUserId,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        action: entry.action,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        success: entry.success,
        errorMessage: entry.errorMessage,
        timestamp: new Date()
      }
    });
    
    // Also log to application logger
    logger.info('Audit log created', {
      eventType: entry.eventType,
      userId: entry.userId,
      action: entry.action,
      success: entry.success
    });
  } catch (error) {
    // Don't fail the request if audit logging fails
    logger.error('Failed to create audit log', {
      error: error.message,
      entry
    });
  }
}

/**
 * Audit logging middleware
 * Logs all requests to sensitive endpoints
 */
export function auditLogger(options: {
  eventType: AuditEventType;
  resourceType?: string;
  includeBody?: boolean;
  includeResponse?: boolean;
} = { eventType: AuditEventType.DATA_ACCESSED }) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    
    // Capture original res.json to intercept response
    const originalJson = res.json.bind(res);
    let responseData: any = null;
    
    if (options.includeResponse) {
      res.json = function(data: any) {
        responseData = data;
        return originalJson(data);
      };
    }
    
    // Wait for response to complete
    res.on('finish', async () => {
      const duration = Date.now() - startTime;
      
      const entry: AuditLogEntry = {
        eventType: options.eventType,
        userId: req.user?.id,
        resourceType: options.resourceType || req.baseUrl.split('/')[2],
        resourceId: req.params.id,
        action: `${req.method} ${req.path}`,
        details: {
          method: req.method,
          path: req.path,
          query: req.query,
          ...(options.includeBody && { body: sanitizeBody(req.body) }),
          ...(options.includeResponse && { response: sanitizeResponse(responseData) }),
          duration
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: res.statusCode < 400
      };
      
      if (res.statusCode >= 400) {
        entry.errorMessage = `HTTP ${res.statusCode}`;
      }
      
      await createAuditLog(entry);
    });
    
    next();
  };
}

/**
 * Sanitize request body for logging
 * Remove sensitive fields
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Sanitize response for logging
 */
function sanitizeResponse(response: any): any {
  if (!response || typeof response !== 'object') {
    return response;
  }
  
  // Only log success status and basic info
  return {
    success: response.success,
    recordCount: Array.isArray(response.data) ? response.data.length : undefined
  };
}

/**
 * Authentication audit middleware
 */
export function auditAuthentication(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  
  res.json = function(data: any) {
    const success = data.success === true;
    const eventType = success ? AuditEventType.LOGIN : AuditEventType.LOGIN_FAILED;
    
    createAuditLog({
      eventType,
      userId: success ? data.user?.id : undefined,
      action: 'LOGIN_ATTEMPT',
      details: {
        email: req.body.email,
        method: req.body.provider || 'email'
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success,
      errorMessage: success ? undefined : data.error
    });
    
    return originalJson(data);
  };
  
  next();
}

/**
 * Data access audit middleware
 */
export function auditDataAccess(resourceType: string) {
  return auditLogger({
    eventType: AuditEventType.DATA_ACCESSED,
    resourceType,
    includeResponse: false
  });
}

/**
 * Sensitive data access audit
 */
export function auditSensitiveDataAccess(resourceType: string) {
  return auditLogger({
    eventType: AuditEventType.SENSITIVE_DATA_VIEWED,
    resourceType,
    includeBody: true,
    includeResponse: false
  });
}

/**
 * Financial operation audit
 */
export function auditFinancialOperation(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  
  res.json = function(data: any) {
    createAuditLog({
      eventType: AuditEventType.PAYMENT_PROCESSED,
      userId: req.user?.id,
      resourceType: 'payment',
      resourceId: data.paymentId,
      action: 'PROCESS_PAYMENT',
      details: {
        amount: req.body.amount,
        currency: req.body.currency,
        method: req.body.paymentMethod
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: data.success === true,
      errorMessage: data.success ? undefined : data.error
    });
    
    return originalJson(data);
  };
  
  next();
}

/**
 * Grade change audit
 */
export function auditGradeChange(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  
  res.json = function(data: any) {
    createAuditLog({
      eventType: AuditEventType.GRADE_CHANGED,
      userId: req.user?.id,
      targetUserId: req.body.studentId,
      resourceType: 'grade',
      resourceId: req.params.id,
      action: 'UPDATE_GRADE',
      details: {
        assignmentId: req.body.assignmentId,
        oldGrade: req.body.oldGrade,
        newGrade: req.body.newGrade,
        reason: req.body.reason
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: data.success === true
    });
    
    return originalJson(data);
  };
  
  next();
}

/**
 * System configuration change audit
 */
export function auditConfigChange(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  
  res.json = function(data: any) {
    createAuditLog({
      eventType: AuditEventType.SYSTEM_CONFIG_CHANGED,
      userId: req.user?.id,
      resourceType: 'config',
      action: 'UPDATE_CONFIG',
      details: {
        configKey: req.body.key,
        oldValue: req.body.oldValue,
        newValue: req.body.newValue
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: data.success === true
    });
    
    return originalJson(data);
  };
  
  next();
}

/**
 * Security violation audit
 */
export async function auditSecurityViolation(
  req: Request,
  violationType: string,
  details: any
): Promise<void> {
  await createAuditLog({
    eventType: AuditEventType.SECURITY_VIOLATION,
    userId: req.user?.id,
    action: violationType,
    details,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    success: false
  });
}

/**
 * Query audit logs
 */
export async function queryAuditLogs(filters: {
  userId?: string;
  eventType?: AuditEventType;
  startDate?: Date;
  endDate?: Date;
  resourceType?: string;
  success?: boolean;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const where: any = {};
  
  if (filters.userId) where.userId = filters.userId;
  if (filters.eventType) where.eventType = filters.eventType;
  if (filters.resourceType) where.resourceType = filters.resourceType;
  if (filters.success !== undefined) where.success = filters.success;
  
  if (filters.startDate || filters.endDate) {
    where.timestamp = {};
    if (filters.startDate) where.timestamp.gte = filters.startDate;
    if (filters.endDate) where.timestamp.lte = filters.endDate;
  }
  
  return await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: filters.limit || 100,
    skip: filters.offset || 0
  });
}

export default {
  AuditEventType,
  createAuditLog,
  auditLogger,
  auditAuthentication,
  auditDataAccess,
  auditSensitiveDataAccess,
  auditFinancialOperation,
  auditGradeChange,
  auditConfigChange,
  auditSecurityViolation,
  queryAuditLogs
};
