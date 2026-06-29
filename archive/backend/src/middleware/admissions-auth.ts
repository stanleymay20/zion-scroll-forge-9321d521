import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Admissions system roles
export enum AdmissionsRole {
  ADMISSIONS_ADMIN = 'admissions_admin',
  ADMISSIONS_OFFICER = 'admissions_officer',
  SPIRITUAL_EVALUATOR = 'spiritual_evaluator',
  ACADEMIC_EVALUATOR = 'academic_evaluator',
  INTERVIEWER = 'interviewer',
  COMMITTEE_MEMBER = 'committee_member',
  DOCUMENT_VERIFIER = 'document_verifier',
  APPLICANT = 'applicant'
}

// Admissions system permissions
export enum AdmissionsPermission {
  // Application permissions
  VIEW_APPLICATION = 'view_application',
  EDIT_APPLICATION = 'edit_application',
  SUBMIT_APPLICATION = 'submit_application',
  DELETE_APPLICATION = 'delete_application',
  
  // Assessment permissions
  CONDUCT_ELIGIBILITY_ASSESSMENT = 'conduct_eligibility_assessment',
  CONDUCT_SPIRITUAL_EVALUATION = 'conduct_spiritual_evaluation',
  CONDUCT_ACADEMIC_EVALUATION = 'conduct_academic_evaluation',
  VIEW_ASSESSMENT_RESULTS = 'view_assessment_results',
  
  // Interview permissions
  SCHEDULE_INTERVIEW = 'schedule_interview',
  CONDUCT_INTERVIEW = 'conduct_interview',
  VIEW_INTERVIEW_RESULTS = 'view_interview_results',
  
  // Decision permissions
  MAKE_ADMISSION_DECISION = 'make_admission_decision',
  APPROVE_ADMISSION_DECISION = 'approve_admission_decision',
  PROCESS_APPEALS = 'process_appeals',
  
  // Administrative permissions
  MANAGE_ADMISSIONS_SYSTEM = 'manage_admissions_system',
  VIEW_ADMISSIONS_ANALYTICS = 'view_admissions_analytics',
  MANAGE_COMMITTEE_MEMBERS = 'manage_committee_members',
  
  // Document permissions
  VERIFY_DOCUMENTS = 'verify_documents',
  UPLOAD_DOCUMENTS = 'upload_documents',
  
  // Global permissions
  VIEW_ALL_APPLICATIONS = 'view_all_applications',
  EXPORT_ADMISSIONS_DATA = 'export_admissions_data'
}

// Role-Permission mapping
const rolePermissions: Record<AdmissionsRole, AdmissionsPermission[]> = {
  [AdmissionsRole.ADMISSIONS_ADMIN]: [
    AdmissionsPermission.MANAGE_ADMISSIONS_SYSTEM,
    AdmissionsPermission.VIEW_ALL_APPLICATIONS,
    AdmissionsPermission.VIEW_ADMISSIONS_ANALYTICS,
    AdmissionsPermission.MANAGE_COMMITTEE_MEMBERS,
    AdmissionsPermission.EXPORT_ADMISSIONS_DATA,
    AdmissionsPermission.MAKE_ADMISSION_DECISION,
    AdmissionsPermission.APPROVE_ADMISSION_DECISION,
    AdmissionsPermission.PROCESS_APPEALS
  ],
  
  [AdmissionsRole.ADMISSIONS_OFFICER]: [
    AdmissionsPermission.VIEW_APPLICATION,
    AdmissionsPermission.EDIT_APPLICATION,
    AdmissionsPermission.CONDUCT_ELIGIBILITY_ASSESSMENT,
    AdmissionsPermission.VIEW_ASSESSMENT_RESULTS,
    AdmissionsPermission.SCHEDULE_INTERVIEW,
    AdmissionsPermission.VIEW_INTERVIEW_RESULTS,
    AdmissionsPermission.VERIFY_DOCUMENTS,
    AdmissionsPermission.MAKE_ADMISSION_DECISION
  ],
  
  [AdmissionsRole.SPIRITUAL_EVALUATOR]: [
    AdmissionsPermission.VIEW_APPLICATION,
    AdmissionsPermission.CONDUCT_SPIRITUAL_EVALUATION,
    AdmissionsPermission.VIEW_ASSESSMENT_RESULTS,
    AdmissionsPermission.CONDUCT_INTERVIEW
  ],
  
  [AdmissionsRole.ACADEMIC_EVALUATOR]: [
    AdmissionsPermission.VIEW_APPLICATION,
    AdmissionsPermission.CONDUCT_ACADEMIC_EVALUATION,
    AdmissionsPermission.VIEW_ASSESSMENT_RESULTS,
    AdmissionsPermission.CONDUCT_INTERVIEW,
    AdmissionsPermission.VERIFY_DOCUMENTS
  ],
  
  [AdmissionsRole.INTERVIEWER]: [
    AdmissionsPermission.VIEW_APPLICATION,
    AdmissionsPermission.CONDUCT_INTERVIEW,
    AdmissionsPermission.VIEW_INTERVIEW_RESULTS
  ],
  
  [AdmissionsRole.COMMITTEE_MEMBER]: [
    AdmissionsPermission.VIEW_APPLICATION,
    AdmissionsPermission.VIEW_ASSESSMENT_RESULTS,
    AdmissionsPermission.VIEW_INTERVIEW_RESULTS,
    AdmissionsPermission.MAKE_ADMISSION_DECISION,
    AdmissionsPermission.APPROVE_ADMISSION_DECISION
  ],
  
  [AdmissionsRole.DOCUMENT_VERIFIER]: [
    AdmissionsPermission.VIEW_APPLICATION,
    AdmissionsPermission.VERIFY_DOCUMENTS
  ],
  
  [AdmissionsRole.APPLICANT]: [
    AdmissionsPermission.VIEW_APPLICATION,
    AdmissionsPermission.EDIT_APPLICATION,
    AdmissionsPermission.SUBMIT_APPLICATION,
    AdmissionsPermission.UPLOAD_DOCUMENTS
  ]
};

// Extended Request interface
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: AdmissionsRole[];
    permissions: AdmissionsPermission[];
  };
  application?: {
    id: string;
    applicantId: string;
  };
}

// JWT token verification middleware
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Fetch user with admissions roles
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        admissionsCommitteeMembers: {
          where: { active: true }
        }
      }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Determine user roles
    const roles: AdmissionsRole[] = [];
    const permissions: AdmissionsPermission[] = [];

    // Add applicant role if user has applications
    const hasApplications = await prisma.application.findFirst({
      where: { applicantId: user.id }
    });
    
    if (hasApplications) {
      roles.push(AdmissionsRole.APPLICANT);
    }

    // Add committee roles
    user.admissionsCommitteeMembers.forEach(member => {
      const role = member.role as AdmissionsRole;
      if (Object.values(AdmissionsRole).includes(role)) {
        roles.push(role);
      }
    });

    // Add admin role if user is admin
    if (user.role === 'admin' || user.role === 'super_admin') {
      roles.push(AdmissionsRole.ADMISSIONS_ADMIN);
    }

    // Collect permissions from roles
    roles.forEach(role => {
      const rolePerms = rolePermissions[role] || [];
      rolePerms.forEach(perm => {
        if (!permissions.includes(perm)) {
          permissions.push(perm);
        }
      });
    });

    req.user = {
      id: user.id,
      email: user.email,
      roles,
      permissions
    };

    next();
  } catch (error) {
    logger.error('Token authentication error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based authorization middleware
export const requireRole = (requiredRoles: AdmissionsRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const hasRequiredRole = requiredRoles.some(role => 
      req.user!.roles.includes(role)
    );

    if (!hasRequiredRole) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: requiredRoles,
        current: req.user.roles
      });
      return;
    }

    next();
  };
};

// Permission-based authorization middleware
export const requirePermission = (requiredPermissions: AdmissionsPermission[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const hasRequiredPermission = requiredPermissions.some(permission => 
      req.user!.permissions.includes(permission)
    );

    if (!hasRequiredPermission) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: requiredPermissions,
        current: req.user.permissions
      });
      return;
    }

    next();
  };
};

// Application ownership middleware
export const requireApplicationOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const applicationId = req.params.applicationId || req.body.applicationId;
    
    if (!applicationId) {
      res.status(400).json({ error: 'Application ID required' });
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    // Check if user owns the application or has admin permissions
    const isOwner = application.applicantId === req.user!.id;
    const hasAdminAccess = req.user!.permissions.includes(AdmissionsPermission.VIEW_ALL_APPLICATIONS);

    if (!isOwner && !hasAdminAccess) {
      res.status(403).json({ error: 'Access denied to this application' });
      return;
    }

    req.application = {
      id: application.id,
      applicantId: application.applicantId
    };

    next();
  } catch (error) {
    logger.error('Application ownership check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Committee member validation middleware
export const requireActiveCommitteeMember = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const committeeMember = await prisma.admissionsCommitteeMember.findFirst({
      where: {
        userId: req.user!.id,
        active: true
      }
    });

    if (!committeeMember) {
      res.status(403).json({ error: 'Active committee membership required' });
      return;
    }

    next();
  } catch (error) {
    logger.error('Committee member validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Rate limiting middleware for applications
export const applicationRateLimit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check recent application submissions
    const recentSubmissions = await prisma.application.count({
      where: {
        applicantId: userId,
        submissionDate: {
          gte: oneHourAgo
        }
      }
    });

    if (recentSubmissions >= 3) {
      res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'Maximum 3 application submissions per hour'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Application rate limit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Utility functions
export const hasRole = (user: AuthenticatedRequest['user'], role: AdmissionsRole): boolean => {
  return user?.roles.includes(role) || false;
};

export const hasPermission = (user: AuthenticatedRequest['user'], permission: AdmissionsPermission): boolean => {
  return user?.permissions.includes(permission) || false;
};

export const hasAnyRole = (user: AuthenticatedRequest['user'], roles: AdmissionsRole[]): boolean => {
  return roles.some(role => hasRole(user, role));
};

export const hasAnyPermission = (user: AuthenticatedRequest['user'], permissions: AdmissionsPermission[]): boolean => {
  return permissions.some(permission => hasPermission(user, permission));
};

// Export middleware combinations
export const admissionsAuth = {
  authenticate: authenticateToken,
  requireRole,
  requirePermission,
  requireApplicationOwnership,
  requireActiveCommitteeMember,
  applicationRateLimit
};

export default admissionsAuth;