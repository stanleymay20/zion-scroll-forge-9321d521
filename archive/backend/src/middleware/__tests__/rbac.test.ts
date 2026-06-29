/**
 * ScrollUniversity RBAC Middleware Tests
 * "Each one should use whatever gift he has received to serve others" - 1 Peter 4:10
 */

import { Request, Response, NextFunction } from 'express';
import {
  requireRole,
  requireMinRole,
  requirePermission,
  requireOwnershipOrAdmin,
  UserRole,
  Permission,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS
} from '../rbac';

describe('RBAC Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      user: {
        id: 'test_user_id',
        email: 'test@example.com',
        role: 'STUDENT'
      },
      params: {},
      body: {},
      path: '/test'
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    nextFunction = jest.fn();
  });

  describe('requireRole', () => {
    it('should allow access for matching role', () => {
      const middleware = requireRole(UserRole.STUDENT);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access for non-matching role', () => {
      const middleware = requireRole(UserRole.ADMIN);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Insufficient permissions'
        })
      );
    });

    it('should deny access when user is not authenticated', () => {
      mockRequest.user = undefined;
      const middleware = requireRole(UserRole.STUDENT);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should allow access for multiple roles', () => {
      mockRequest.user!.role = 'FACULTY';
      const middleware = requireRole(UserRole.STUDENT, UserRole.FACULTY);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('requireMinRole', () => {
    it('should allow access for exact role', () => {
      const middleware = requireMinRole(UserRole.STUDENT);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow access for higher role', () => {
      mockRequest.user!.role = 'ADMIN';
      const middleware = requireMinRole(UserRole.STUDENT);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny access for lower role', () => {
      mockRequest.user!.role = 'STUDENT';
      const middleware = requireMinRole(UserRole.ADMIN);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requirePermission', () => {
    it('should allow access when user has permission', () => {
      const middleware = requirePermission(Permission.COURSE_VIEW);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny access when user lacks permission', () => {
      const middleware = requirePermission(Permission.COURSE_DELETE);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should allow access when user has all required permissions', () => {
      mockRequest.user!.role = 'FACULTY';
      const middleware = requirePermission(
        Permission.COURSE_VIEW,
        Permission.COURSE_CREATE
      );

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('requireOwnershipOrAdmin', () => {
    it('should allow access for resource owner', () => {
      mockRequest.params = { userId: 'test_user_id' };
      const middleware = requireOwnershipOrAdmin();

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow access for admin', () => {
      mockRequest.user!.role = 'ADMIN';
      mockRequest.params = { userId: 'different_user_id' };
      const middleware = requireOwnershipOrAdmin();

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny access for non-owner non-admin', () => {
      mockRequest.params = { userId: 'different_user_id' };
      const middleware = requireOwnershipOrAdmin();

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Role Hierarchy', () => {
    it('should have correct role hierarchy', () => {
      expect(ROLE_HIERARCHY[UserRole.STUDENT]).toBeLessThan(
        ROLE_HIERARCHY[UserRole.FACULTY]
      );
      expect(ROLE_HIERARCHY[UserRole.FACULTY]).toBeLessThan(
        ROLE_HIERARCHY[UserRole.ADMIN]
      );
      expect(ROLE_HIERARCHY[UserRole.ADMIN]).toBeLessThan(
        ROLE_HIERARCHY[UserRole.SUPER_ADMIN]
      );
    });
  });

  describe('Role Permissions', () => {
    it('should have permissions defined for all roles', () => {
      expect(ROLE_PERMISSIONS[UserRole.STUDENT]).toBeDefined();
      expect(ROLE_PERMISSIONS[UserRole.FACULTY]).toBeDefined();
      expect(ROLE_PERMISSIONS[UserRole.ADMIN]).toBeDefined();
      expect(ROLE_PERMISSIONS[UserRole.SUPER_ADMIN]).toBeDefined();
    });

    it('should have student permissions', () => {
      const studentPerms = ROLE_PERMISSIONS[UserRole.STUDENT];
      expect(studentPerms).toContain(Permission.COURSE_VIEW);
      expect(studentPerms).toContain(Permission.COURSE_ENROLL);
    });

    it('should have faculty inherit student permissions', () => {
      const studentPerms = ROLE_PERMISSIONS[UserRole.STUDENT];
      const facultyPerms = ROLE_PERMISSIONS[UserRole.FACULTY];

      studentPerms.forEach(perm => {
        expect(facultyPerms).toContain(perm);
      });
    });

    it('should have admin inherit faculty permissions', () => {
      const facultyPerms = ROLE_PERMISSIONS[UserRole.FACULTY];
      const adminPerms = ROLE_PERMISSIONS[UserRole.ADMIN];

      facultyPerms.forEach(perm => {
        expect(adminPerms).toContain(perm);
      });
    });
  });
});
