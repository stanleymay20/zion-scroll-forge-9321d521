import { logger } from '../../utils/logger';
import { PrismaClient } from '@prisma/client';

interface AuditEvent {
  id: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  userId?: string;
  userRole?: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata: Record<string, any>;
}

enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
  IMPORT = 'import',
  APPROVE = 'approve',
  REJECT = 'reject',
  SUBMIT = 'submit'
}

enum EntityType {
  APPLICATION = 'application',
  USER = 'user',
  DOCUMENT = 'document',
  ASSESSMENT = 'assessment',
  INTERVIEW = 'interview',
  DECISION = 'decision',
  ENROLLMENT = 'enrollment',
  SYSTEM_CONFIG = 'system_config'
}

interface AuditQuery {
  action?: AuditAction;
  entityType?: EntityType;
  entityId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AuditTrailService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Log an audit event for compliance and tracking
   */
  async logAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<string> {
    try {
      const auditEvent = await this.prisma.auditEvent.create({
        data: {
          action: event.action,
          entityType: event.entityType,
          entityId: event.entityId,
          userId: event.userId,
          userRole: event.userRole,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          oldValues: event.oldValues || {},
          newValues: event.newValues || {},
          metadata: event.metadata
        }
      });

      // Log sensitive operations at higher level
      if (this.isSensitiveOperation(event.action, event.entityType)) {
        logger.warn('Sensitive operation logged', {
          auditId: auditEvent.id,
          action: event.action,
          entityType: event.entityType,
          userId: event.userId
        });
      }

      return auditEvent.id;
    } catch (error) {
      logger.error('Failed to log audit event', { error, event });
      throw new Error('Audit logging failed');
    }
  }

  /**
   * Retrieve audit events with filtering
   */
  async getAuditEvents(query: AuditQuery): Promise<AuditEvent[]> {
    try {
      const events = await this.prisma.auditEvent.findMany({
        where: {
          action: query.action,
          entityType: query.entityType,
          entityId: query.entityId,
          userId: query.userId,
          timestamp: {
            gte: query.startDate,
            lte: query.endDate
          }
        },
        orderBy: { timestamp: 'desc' },
        take: query.limit || 100,
        skip: query.offset || 0
      });

      return events.map(event => ({
        id: event.id,
        action: event.action as AuditAction,
        entityType: event.entityType as EntityType,
        entityId: event.entityId,
        userId: event.userId || undefined,
        userRole: event.userRole || undefined,
        timestamp: event.timestamp,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        oldValues: event.oldValues as Record<string, any>,
        newValues: event.newValues as Record<string, any>,
        metadata: event.metadata as Record<string, any>
      }));
    } catch (error) {
      logger.error('Failed to retrieve audit events', { error, query });
      throw new Error('Audit events retrieval failed');
    }
  }

  /**
   * Get audit trail for a specific entity
   */
  async getEntityAuditTrail(entityType: EntityType, entityId: string): Promise<AuditEvent[]> {
    try {
      return await this.getAuditEvents({
        entityType,
        entityId,
        limit: 1000
      });
    } catch (error) {
      logger.error('Failed to get entity audit trail', { error, entityType, entityId });
      throw new Error('Entity audit trail retrieval failed');
    }
  }

  /**
   * Get user activity audit trail
   */
  async getUserActivityTrail(userId: string, timeRange?: { startDate: Date; endDate: Date }): Promise<AuditEvent[]> {
    try {
      return await this.getAuditEvents({
        userId,
        startDate: timeRange?.startDate,
        endDate: timeRange?.endDate,
        limit: 1000
      });
    } catch (error) {
      logger.error('Failed to get user activity trail', { error, userId });
      throw new Error('User activity trail retrieval failed');
    }
  }

  /**
   * Generate compliance report for audit purposes
   */
  async generateComplianceReport(timeRange: { startDate: Date; endDate: Date }): Promise<{
    totalEvents: number;
    eventsByAction: Record<AuditAction, number>;
    eventsByEntity: Record<EntityType, number>;
    sensitiveOperations: number;
    userActivity: Record<string, number>;
    complianceScore: number;
  }> {
    try {
      const events = await this.getAuditEvents({
        startDate: timeRange.startDate,
        endDate: timeRange.endDate,
        limit: 10000
      });

      const eventsByAction = events.reduce((acc, event) => {
        acc[event.action] = (acc[event.action] || 0) + 1;
        return acc;
      }, {} as Record<AuditAction, number>);

      const eventsByEntity = events.reduce((acc, event) => {
        acc[event.entityType] = (acc[event.entityType] || 0) + 1;
        return acc;
      }, {} as Record<EntityType, number>);

      const sensitiveOperations = events.filter(event => 
        this.isSensitiveOperation(event.action, event.entityType)
      ).length;

      const userActivity = events.reduce((acc, event) => {
        if (event.userId) {
          acc[event.userId] = (acc[event.userId] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Calculate compliance score based on audit coverage
      const complianceScore = this.calculateComplianceScore(events);

      return {
        totalEvents: events.length,
        eventsByAction,
        eventsByEntity,
        sensitiveOperations,
        userActivity,
        complianceScore
      };
    } catch (error) {
      logger.error('Failed to generate compliance report', { error, timeRange });
      throw new Error('Compliance report generation failed');
    }
  }

  /**
   * Check if an operation is considered sensitive for compliance
   */
  private isSensitiveOperation(action: AuditAction, entityType: EntityType): boolean {
    const sensitiveOperations = [
      { action: AuditAction.DELETE, entityType: EntityType.APPLICATION },
      { action: AuditAction.UPDATE, entityType: EntityType.DECISION },
      { action: AuditAction.EXPORT, entityType: EntityType.APPLICATION },
      { action: AuditAction.DELETE, entityType: EntityType.DOCUMENT },
      { action: AuditAction.UPDATE, entityType: EntityType.ASSESSMENT }
    ];

    return sensitiveOperations.some(op => 
      op.action === action && op.entityType === entityType
    );
  }

  /**
   * Calculate compliance score based on audit coverage
   */
  private calculateComplianceScore(events: AuditEvent[]): number {
    if (events.length === 0) return 0;

    // Check for required audit coverage
    const requiredActions = [
      AuditAction.CREATE,
      AuditAction.UPDATE,
      AuditAction.DELETE,
      AuditAction.LOGIN
    ];

    const requiredEntities = [
      EntityType.APPLICATION,
      EntityType.USER,
      EntityType.DOCUMENT,
      EntityType.DECISION
    ];

    const actionCoverage = requiredActions.filter(action =>
      events.some(event => event.action === action)
    ).length / requiredActions.length;

    const entityCoverage = requiredEntities.filter(entityType =>
      events.some(event => event.entityType === entityType)
    ).length / requiredEntities.length;

    // Check for complete audit trails (events with both old and new values)
    const completeTrails = events.filter(event =>
      event.action === AuditAction.UPDATE && 
      event.oldValues && 
      Object.keys(event.oldValues).length > 0
    ).length;

    const trailCompleteness = events.length > 0 ? completeTrails / events.length : 0;

    // Calculate overall compliance score (0-100)
    const score = (actionCoverage * 0.3 + entityCoverage * 0.3 + trailCompleteness * 0.4) * 100;
    return Math.round(score);
  }

  /**
   * Archive old audit events for long-term storage
   */
  async archiveOldEvents(cutoffDate: Date): Promise<number> {
    try {
      const result = await this.prisma.auditEvent.updateMany({
        where: {
          timestamp: {
            lt: cutoffDate
          },
          archived: false
        },
        data: {
          archived: true,
          archivedAt: new Date()
        }
      });

      logger.info('Audit events archived', { 
        count: result.count, 
        cutoffDate 
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to archive audit events', { error, cutoffDate });
      throw new Error('Audit event archival failed');
    }
  }
}

export default AuditTrailService;