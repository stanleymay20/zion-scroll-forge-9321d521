import { logger } from '../../utils/logger';
import { PrismaClient } from '@prisma/client';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  level: number;
  active: boolean;
}

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: AccessCondition[];
}

interface AccessCondition {
  type: ConditionType;
  value: string;
  operator: ConditionOperator;
}

enum ConditionType {
  TIME_BASED = 'time_based',
  LOCATION_BASED = 'location_based',
  RESOURCE_BASED = 'resource_based',
  USER_ATTRIBUTE = 'user_attribute'
}

enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  IN = 'in'
}

interface AccessRequest {
  userId: string;
  resource: string;
  action: string;
  context: AccessContext;
}

interface AccessContext {
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  resourceId?: string;
  additionalData?: Record<string, any>;
}

interface AccessDecision {
  granted: boolean;
  reason: string;
  conditions?: string[];
  expiresAt?: Date;
}

export class AccessControlService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Check if user has access to perform an action on a resource
   */
  async checkAccess(request: AccessRequest): Promise<AccessDecision> {
    try {
      // Get user with roles and permissions
      const user = await this.prisma.user.findUnique({
        where: { id: request.userId },
        include: {
          roles: {
            include: {
              permissions: true
            }
          }
        }
      });

      if (!user) {
        return {
          granted: false,
          reason: 'User not found'
        };
      }

      if (!user.active) {
        return {
          granted: false,
          reason: 'User account is inactive'
        };
      }

      // Check if user has required permission
      const hasPermission = await this.hasPermission(user, request.resource, request.action);
      
      if (!hasPermission) {
        await this.logAccessAttempt(request, false, 'Insufficient permissions');
        return {
          granted: false,
          reason: 'Insufficient permissions'
        };
      }

      // Evaluate access conditions
      const conditionResult = await this.evaluateAccessConditions(user, request);
      
      if (!conditionResult.granted) {
        await this.logAccessAttempt(request, false, conditionResult.reason);
        return conditionResult;
      }

      // Check for temporary restrictions
      const restrictions = await this.checkTemporaryRestrictions(request.userId);
      
      if (restrictions.length > 0) {
        await this.logAccessAttempt(request, false, 'Temporary restrictions active');
        return {
          granted: false,
          reason: 'Access temporarily restricted',
          conditions: restrictions
        };
      }

      await this.logAccessAttempt(request, true, 'Access granted');
      
      return {
        granted: true,
        reason: 'Access granted',
        expiresAt: this.calculateSessionExpiry(user)
      };
    } catch (error) {
      logger.error('Failed to check access', { error, request });
      return {
        granted: false,
        reason: 'Access check failed'
      };
    }
  }

  /**
   * Create a new role with permissions
   */
  async createRole(roleData: Omit<Role, 'id'>): Promise<string> {
    try {
      const role = await this.prisma.role.create({
        data: {
          name: roleData.name,
          description: roleData.description,
          level: roleData.level,
          active: roleData.active,
          permissions: {
            connect: roleData.permissions.map(p => ({ id: p.id }))
          }
        }
      });

      logger.info('Role created', { roleId: role.id, name: roleData.name });
      return role.id;
    } catch (error) {
      logger.error('Failed to create role', { error, roleData });
      throw new Error('Role creation failed');
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleId: string, assignedBy: string): Promise<void> {
    try {
      await this.prisma.userRole.create({
        data: {
          userId,
          roleId,
          assignedBy,
          assignedAt: new Date()
        }
      });

      // Log role assignment
      await this.logRoleChange(userId, roleId, 'assigned', assignedBy);
      
      logger.info('Role assigned to user', { userId, roleId, assignedBy });
    } catch (error) {
      logger.error('Failed to assign role', { error, userId, roleId });
      throw new Error('Role assignment failed');
    }
  }

  /**
   * Revoke role from user
   */
  async revokeRole(userId: string, roleId: string, revokedBy: string): Promise<void> {
    try {
      await this.prisma.userRole.deleteMany({
        where: {
          userId,
          roleId
        }
      });

      // Log role revocation
      await this.logRoleChange(userId, roleId, 'revoked', revokedBy);
      
      logger.info('Role revoked from user', { userId, roleId, revokedBy });
    } catch (error) {
      logger.error('Failed to revoke role', { error, userId, roleId });
      throw new Error('Role revocation failed');
    }
  }

  /**
   * Create a new permission
   */
  async createPermission(permissionData: Omit<Permission, 'id'>): Promise<string> {
    try {
      const permission = await this.prisma.permission.create({
        data: {
          name: permissionData.name,
          resource: permissionData.resource,
          action: permissionData.action,
          conditions: permissionData.conditions || []
        }
      });

      logger.info('Permission created', { 
        permissionId: permission.id, 
        name: permissionData.name 
      });
      
      return permission.id;
    } catch (error) {
      logger.error('Failed to create permission', { error, permissionData });
      throw new Error('Permission creation failed');
    }
  }

  /**
   * Apply temporary access restriction to user
   */
  async applyTemporaryRestriction(
    userId: string, 
    reason: string, 
    duration: number, // in minutes
    appliedBy: string
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + duration * 60 * 1000);
      
      await this.prisma.accessRestriction.create({
        data: {
          userId,
          reason,
          appliedBy,
          expiresAt,
          active: true
        }
      });

      logger.warn('Temporary access restriction applied', {
        userId,
        reason,
        duration,
        appliedBy,
        expiresAt
      });
    } catch (error) {
      logger.error('Failed to apply temporary restriction', { error, userId });
      throw new Error('Temporary restriction application failed');
    }
  }

  /**
   * Get user permissions summary
   */
  async getUserPermissions(userId: string): Promise<{
    roles: Role[];
    permissions: Permission[];
    restrictions: any[];
  }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: true
                }
              }
            }
          },
          accessRestrictions: {
            where: {
              active: true,
              expiresAt: {
                gt: new Date()
              }
            }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const roles = user.roles.map(ur => ur.role);
      const permissions = roles.flatMap(role => role.permissions);
      
      // Remove duplicate permissions
      const uniquePermissions = permissions.filter((permission, index, self) =>
        index === self.findIndex(p => p.id === permission.id)
      );

      return {
        roles: roles as Role[],
        permissions: uniquePermissions as Permission[],
        restrictions: user.accessRestrictions
      };
    } catch (error) {
      logger.error('Failed to get user permissions', { error, userId });
      throw new Error('User permissions retrieval failed');
    }
  }

  /**
   * Generate access control report
   */
  async generateAccessControlReport(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalRoles: number;
    totalPermissions: number;
    activeRestrictions: number;
    accessAttempts: {
      granted: number;
      denied: number;
      total: number;
    };
  }> {
    try {
      const totalUsers = await this.prisma.user.count();
      const activeUsers = await this.prisma.user.count({
        where: { active: true }
      });
      
      const totalRoles = await this.prisma.role.count();
      const totalPermissions = await this.prisma.permission.count();
      
      const activeRestrictions = await this.prisma.accessRestriction.count({
        where: {
          active: true,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      // Get access attempts from last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const accessAttempts = await this.prisma.accessLog.findMany({
        where: {
          timestamp: {
            gte: yesterday
          }
        }
      });

      const granted = accessAttempts.filter(a => a.granted).length;
      const denied = accessAttempts.filter(a => !a.granted).length;

      return {
        totalUsers,
        activeUsers,
        totalRoles,
        totalPermissions,
        activeRestrictions,
        accessAttempts: {
          granted,
          denied,
          total: accessAttempts.length
        }
      };
    } catch (error) {
      logger.error('Failed to generate access control report', { error });
      throw new Error('Access control report generation failed');
    }
  }

  /**
   * Check if user has specific permission
   */
  private async hasPermission(user: any, resource: string, action: string): Promise<boolean> {
    try {
      for (const userRole of user.roles) {
        for (const permission of userRole.role.permissions) {
          if (permission.resource === resource && permission.action === action) {
            return true;
          }
          
          // Check for wildcard permissions
          if (permission.resource === '*' || permission.action === '*') {
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      logger.error('Failed to check permission', { error, resource, action });
      return false;
    }
  }

  /**
   * Evaluate access conditions
   */
  private async evaluateAccessConditions(user: any, request: AccessRequest): Promise<AccessDecision> {
    try {
      // Time-based conditions
      const now = new Date();
      const hour = now.getHours();
      
      // Business hours restriction for sensitive operations
      if (request.resource === 'application' && request.action === 'delete') {
        if (hour < 8 || hour > 18) {
          return {
            granted: false,
            reason: 'Sensitive operations only allowed during business hours'
          };
        }
      }

      // Location-based conditions (simplified)
      if (request.context.ipAddress.startsWith('192.168.')) {
        // Internal network access
      } else {
        // External access - additional checks
        if (request.resource === 'system_config') {
          return {
            granted: false,
            reason: 'System configuration access restricted to internal network'
          };
        }
      }

      return {
        granted: true,
        reason: 'Conditions satisfied'
      };
    } catch (error) {
      logger.error('Failed to evaluate access conditions', { error, request });
      return {
        granted: false,
        reason: 'Condition evaluation failed'
      };
    }
  }

  /**
   * Check for temporary restrictions
   */
  private async checkTemporaryRestrictions(userId: string): Promise<string[]> {
    try {
      const restrictions = await this.prisma.accessRestriction.findMany({
        where: {
          userId,
          active: true,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      return restrictions.map(r => r.reason);
    } catch (error) {
      logger.error('Failed to check temporary restrictions', { error, userId });
      return [];
    }
  }

  /**
   * Calculate session expiry based on user role
   */
  private calculateSessionExpiry(user: any): Date {
    // Admin users get longer sessions
    const isAdmin = user.roles.some((ur: any) => ur.role.name === 'admin');
    const sessionDuration = isAdmin ? 8 * 60 * 60 * 1000 : 4 * 60 * 60 * 1000; // 8h for admin, 4h for others
    
    return new Date(Date.now() + sessionDuration);
  }

  /**
   * Log access attempt
   */
  private async logAccessAttempt(request: AccessRequest, granted: boolean, reason: string): Promise<void> {
    try {
      await this.prisma.accessLog.create({
        data: {
          userId: request.userId,
          resource: request.resource,
          action: request.action,
          granted,
          reason,
          ipAddress: request.context.ipAddress,
          userAgent: request.context.userAgent,
          timestamp: request.context.timestamp
        }
      });
    } catch (error) {
      logger.error('Failed to log access attempt', { error, request });
    }
  }

  /**
   * Log role changes
   */
  private async logRoleChange(userId: string, roleId: string, action: string, changedBy: string): Promise<void> {
    try {
      await this.prisma.roleChangeLog.create({
        data: {
          userId,
          roleId,
          action,
          changedBy,
          timestamp: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to log role change', { error, userId, roleId, action });
    }
  }
}

export default AccessControlService;