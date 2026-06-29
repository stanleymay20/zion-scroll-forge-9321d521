/**
 * ScrollUniversity Role-Based Access Control (RBAC) Middleware
 * "To each is given the manifestation of the Spirit for the common good" - 1 Corinthians 12:7
 * 
 * Comprehensive RBAC system with role hierarchy, permissions, and resource-based access control
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/productionLogger';

const prisma = new PrismaClient();

// Role hierarchy (higher number = more permissions)
export enum UserRole {
  STUDENT = 'STUDENT',
  FACULTY = 'FACULTY',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.STUDENT]: 1,
  [UserRole.FACULTY]: 2,
  [UserRole.ADMIN]: 3,
  [UserRole.SUPER_ADMIN]: 4
};

// Permission definitions
export enum Permission {
  // Course permissions
  COURSE_VIEW = 'course:view',
  COURSE_CREATE = 'course:create',
  COURSE_EDIT = 'course:edit',
  COURSE_DELETE = 'course:delete',
  COURSE_ENROLL = 'course:enroll',
  
  // User permissions
  USER_VIEW = 'user:view',
  USER_CREATE = 'user:create',
  USER_EDIT = 'user:edit',
  USER_DELETE = 'user:delete',
  USER_MANAGE_ROLES = 'user:manage_roles',
  
  // Assessment permissions
  ASSESSMENT_VIEW = 'assessment:view',
  ASSESSMENT_CREATE = 'assessment:create',
  ASSESSMENT_GRADE = 'assessment:grade',
  ASSESSMENT_SUBMIT = 'assessment:submit',
  
  // Content permissions
  CONTENT_VIEW = 'content:view',
  CONTENT_CREATE = 'content:create',
  CONTENT_EDIT = 'content:edit',
  CONTENT_DELETE = 'content:delete',
  CONTENT_PUBLISH = 'content:publish',
  
  // Analytics permissions
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',
  
  // Financial permissions
  PAYMENT_VIEW = 'payment:view',
  PAYMENT_PROCESS = 'payment:process',
  PAYMENT_REFUND = 'payment:refund',
  SCROLLCOIN_MINT = 'scrollcoin:mint',
  SCROLLCOIN_TRANSFER = 'scrollcoin:transfer',
  
  // Spiritual formation permissions
  SPIRITUAL_VIEW = 'spiritual:view',
  SPIRITUAL_GUIDE = 'spiritual:guide',
  
  // Admin permissions
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_LOGS = 'system:logs',
  SYSTEM_BACKUP = 'system:backup'
}

// Define student permissions first
const STUDENT_PERMISSIONS: Permission[] = [
  Permission.COURSE_VIEW,
  Permission.COURSE_ENROLL,
  Permission.ASSESSMENT_VIEW,
  Permission.ASSESSMENT_SUBMIT,
  Permission.CONTENT_VIEW,
  Permission.SPIRITUAL_VIEW,
  Permission.SCROLLCOIN_TRANSFER,
  Permission.USER_VIEW
];

// Define faculty permissions (includes student permissions)
const FACULTY_PERMISSIONS: Permission[] = [
  ...STUDENT_PERMISSIONS,
  Permission.COURSE_CREATE,
  Permission.COURSE_EDIT,
  Permission.ASSESSMENT_CREATE,
  Permission.ASSESSMENT_GRADE,
  Permission.CONTENT_CREATE,
  Permission.CONTENT_EDIT,
  Permission.CONTENT_PUBLISH,
  Permission.ANALYTICS_VIEW,
  Permission.SPIRITUAL_GUIDE
];

// Define admin permissions (includes faculty permissions)
const ADMIN_PERMISSIONS: Permission[] = [
  ...FACULTY_PERMISSIONS,
  Permission.COURSE_DELETE,
  Permission.USER_CREATE,
  Permission.USER_EDIT,
  Permission.USER_DELETE,
  Permission.CONTENT_DELETE,
  Permission.ANALYTICS_EXPORT,
  Permission.PAYMENT_VIEW,
  Permission.PAYMENT_PROCESS,
  Permission.PAYMENT_REFUND,
  Permission.SCROLLCOIN_MINT,
  Permission.SYSTEM_LOGS
];

// Define super admin permissions (includes admin permissions)
const SUPER_ADMIN_PERMISSIONS: Permission[] = [
  ...ADMIN_PERMISSIONS,
  Permission.USER_MANAGE_ROLES,
  Permission.SYSTEM_CONFIG,
  Permission.SYSTEM_BACKUP
];

// Role-Permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.STUDENT]: STUDENT_PERMISSIONS,
  [UserRole.FACULTY]: FACULTY_PERMISSIONS,
  [UserRole.ADMIN]: ADMIN_PERMISSIONS,
  [UserRole.SUPER_ADMIN]: SUPER_ADMIN_PERMISSIONS
};

/**
 * Check if user has required role
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
      return;
    }

    const userRole = req.user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
      logger.warn('Role authorization failed', {
        userId: req.user.id,
        userRole,
        requiredRoles: allowedRoles,
        path: req.path
      });

      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
};

/**
 * Check if user has minimum role level
 */
export const requireMinRole = (minRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const userRole = req.user.role as UserRole;
    const userLevel = ROLE_HIERARCHY[userRole];
    const minLevel = ROLE_HIERARCHY[minRole];

    if (userLevel < minLevel) {
      logger.warn('Minimum role authorization failed', {
        userId: req.user.id,
        userRole,
        userLevel,
        minRole,
        minLevel,
        path: req.path
      });

      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `This action requires at least ${minRole} role`
      });
      return;
    }

    next();
  };
};

/**
 * Check if user has specific permission
 */
export const requirePermission = (...requiredPermissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const userRole = req.user.role as UserRole;
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];

    const hasPermission = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      logger.warn('Permission authorization failed', {
        userId: req.user.id,
        userRole,
        requiredPermissions,
        path: req.path
      });

      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: 'You do not have the required permissions for this action'
      });
      return;
    }

    next();
  };
};

/**
 * Check if user owns the resource or has admin privileges
 */
export const requireOwnershipOrAdmin = (resourceUserIdParam: string = 'userId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const userRole = req.user.role as UserRole;
    const resourceUserId = req.params[resourceUserIdParam] || req.body[resourceUserIdParam];

    // Admins can access any resource
    if (ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[UserRole.ADMIN]) {
      next();
      return;
    }

    // Check ownership
    if (req.user.id !== resourceUserId) {
      logger.warn('Ownership authorization failed', {
        userId: req.user.id,
        resourceUserId,
        path: req.path
      });

      res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only access your own resources'
      });
      return;
    }

    next();
  };
};

/**
 * Check if user is enrolled in a course
 */
export const requireCourseEnrollment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  const courseId = req.params.courseId || req.body.courseId;

  if (!courseId) {
    res.status(400).json({
      success: false,
      error: 'Course ID required'
    });
    return;
  }

  try {
    // Faculty and admins can access any course
    const userRole = req.user.role as UserRole;
    if (ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[UserRole.FACULTY]) {
      next();
      return;
    }

    // Check enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: req.user.id,
        courseId,
        status: 'ACTIVE'
      }
    });

    if (!enrollment) {
      logger.warn('Course enrollment check failed', {
        userId: req.user.id,
        courseId,
        path: req.path
      });

      res.status(403).json({
        success: false,
        error: 'Not enrolled',
        message: 'You must be enrolled in this course to access this resource'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Course enrollment check error', {
      error: error.message,
      userId: req.user.id,
      courseId
    });

    res.status(500).json({
      success: false,
      error: 'Authorization check failed'
    });
  }
};

/**
 * Check if user is course instructor
 */
export const requireCourseInstructor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  const courseId = req.params.courseId || req.body.courseId;

  if (!courseId) {
    res.status(400).json({
      success: false,
      error: 'Course ID required'
    });
    return;
  }

  try {
    // Admins can access any course
    const userRole = req.user.role as UserRole;
    if (ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[UserRole.ADMIN]) {
      next();
      return;
    }

    // Check if user is instructor
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        instructorId: req.user.id
      }
    });

    if (!course) {
      logger.warn('Course instructor check failed', {
        userId: req.user.id,
        courseId,
        path: req.path
      });

      res.status(403).json({
        success: false,
        error: 'Not authorized',
        message: 'You must be the course instructor to perform this action'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Course instructor check error', {
      error: error.message,
      userId: req.user.id,
      courseId
    });

    res.status(500).json({
      success: false,
      error: 'Authorization check failed'
    });
  }
};

/**
 * Check account status
 */
export const requireActiveAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { enrollmentStatus: true }
    });

    if (!user || user.enrollmentStatus !== 'ACTIVE') {
      logger.warn('Account status check failed', {
        userId: req.user.id,
        status: user?.enrollmentStatus,
        path: req.path
      });

      res.status(403).json({
        success: false,
        error: 'Account not active',
        message: 'Your account is not active. Please contact support.'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Account status check error', {
      error: error.message,
      userId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Authorization check failed'
    });
  }
};

/**
 * Combine multiple authorization checks
 */
export const requireAll = (...middlewares: any[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    for (const middleware of middlewares) {
      await new Promise<void>((resolve, reject) => {
        middleware(req, res, (err?: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    next();
  };
};

/**
 * Check if user has any of the specified permissions
 */
export const requireAnyPermission = (...permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const userRole = req.user.role as UserRole;
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];

    const hasAnyPermission = permissions.some(permission =>
      userPermissions.includes(permission)
    );

    if (!hasAnyPermission) {
      logger.warn('Any permission authorization failed', {
        userId: req.user.id,
        userRole,
        requiredPermissions: permissions,
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
