import { logger } from '../../utils/logger';
import { PrismaClient } from '@prisma/client';

interface SecurityEvent {
  id: string;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  timestamp: Date;
  userId?: string;
  applicationId?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

enum SecurityEventType {
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  SUSPICIOUS_LOGIN = 'suspicious_login',
  DATA_BREACH_ATTEMPT = 'data_breach_attempt',
  DOCUMENT_TAMPERING = 'document_tampering',
  FRAUD_ATTEMPT = 'fraud_attempt',
  PRIVACY_VIOLATION = 'privacy_violation',
  ACCESS_CONTROL_VIOLATION = 'access_control_violation',
  SYSTEM_INTRUSION = 'system_intrusion'
}

enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<SecuritySeverity, number>;
  resolvedEvents: number;
  pendingEvents: number;
  averageResolutionTime: number;
}

export class SecurityMonitoringService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Log a security event for monitoring and analysis
   */
  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>): Promise<string> {
    try {
      const securityEvent = await this.prisma.securityEvent.create({
        data: {
          eventType: event.eventType,
          severity: event.severity,
          userId: event.userId,
          applicationId: event.applicationId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          details: event.details,
          resolved: false
        }
      });

      // Log critical events immediately
      if (event.severity === SecuritySeverity.CRITICAL) {
        logger.error('CRITICAL SECURITY EVENT', {
          eventId: securityEvent.id,
          eventType: event.eventType,
          details: event.details
        });
        
        // Trigger immediate incident response
        await this.triggerIncidentResponse(securityEvent.id);
      }

      return securityEvent.id;
    } catch (error) {
      logger.error('Failed to log security event', { error, event });
      throw new Error('Security event logging failed');
    }
  }

  /**
   * Get security events with filtering and pagination
   */
  async getSecurityEvents(filters: {
    eventType?: SecurityEventType;
    severity?: SecuritySeverity;
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<SecurityEvent[]> {
    try {
      const events = await this.prisma.securityEvent.findMany({
        where: {
          eventType: filters.eventType,
          severity: filters.severity,
          resolved: filters.resolved,
          timestamp: {
            gte: filters.startDate,
            lte: filters.endDate
          }
        },
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0
      });

      return events.map(event => ({
        id: event.id,
        eventType: event.eventType as SecurityEventType,
        severity: event.severity as SecuritySeverity,
        timestamp: event.timestamp,
        userId: event.userId || undefined,
        applicationId: event.applicationId || undefined,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        details: event.details as Record<string, any>,
        resolved: event.resolved,
        resolvedAt: event.resolvedAt || undefined,
        resolvedBy: event.resolvedBy || undefined
      }));
    } catch (error) {
      logger.error('Failed to retrieve security events', { error, filters });
      throw new Error('Security events retrieval failed');
    }
  }

  /**
   * Resolve a security event
   */
  async resolveSecurityEvent(eventId: string, resolvedBy: string, resolution: string): Promise<void> {
    try {
      await this.prisma.securityEvent.update({
        where: { id: eventId },
        data: {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy,
          details: {
            resolution
          }
        }
      });

      logger.info('Security event resolved', { eventId, resolvedBy, resolution });
    } catch (error) {
      logger.error('Failed to resolve security event', { error, eventId });
      throw new Error('Security event resolution failed');
    }
  }

  /**
   * Get security metrics and analytics
   */
  async getSecurityMetrics(timeRange: { startDate: Date; endDate: Date }): Promise<SecurityMetrics> {
    try {
      const events = await this.prisma.securityEvent.findMany({
        where: {
          timestamp: {
            gte: timeRange.startDate,
            lte: timeRange.endDate
          }
        }
      });

      const eventsByType = events.reduce((acc, event) => {
        acc[event.eventType as SecurityEventType] = (acc[event.eventType as SecurityEventType] || 0) + 1;
        return acc;
      }, {} as Record<SecurityEventType, number>);

      const eventsBySeverity = events.reduce((acc, event) => {
        acc[event.severity as SecuritySeverity] = (acc[event.severity as SecuritySeverity] || 0) + 1;
        return acc;
      }, {} as Record<SecuritySeverity, number>);

      const resolvedEvents = events.filter(e => e.resolved).length;
      const pendingEvents = events.length - resolvedEvents;

      // Calculate average resolution time
      const resolvedEventsWithTime = events.filter(e => e.resolved && e.resolvedAt);
      const averageResolutionTime = resolvedEventsWithTime.length > 0
        ? resolvedEventsWithTime.reduce((acc, event) => {
            const resolutionTime = event.resolvedAt!.getTime() - event.timestamp.getTime();
            return acc + resolutionTime;
          }, 0) / resolvedEventsWithTime.length
        : 0;

      return {
        totalEvents: events.length,
        eventsByType,
        eventsBySeverity,
        resolvedEvents,
        pendingEvents,
        averageResolutionTime: Math.round(averageResolutionTime / (1000 * 60 * 60)) // Convert to hours
      };
    } catch (error) {
      logger.error('Failed to get security metrics', { error, timeRange });
      throw new Error('Security metrics retrieval failed');
    }
  }

  /**
   * Trigger incident response for critical security events
   */
  private async triggerIncidentResponse(eventId: string): Promise<void> {
    try {
      // Create incident response record
      await this.prisma.incidentResponse.create({
        data: {
          securityEventId: eventId,
          status: 'initiated',
          priority: 'high',
          assignedTo: process.env.SECURITY_TEAM_LEAD || 'security-team',
          createdAt: new Date()
        }
      });

      // Send alerts to security team
      logger.warn('Incident response triggered', { eventId });
      
      // In production, this would send notifications to security team
      // await this.sendSecurityAlert(eventId);
    } catch (error) {
      logger.error('Failed to trigger incident response', { error, eventId });
    }
  }

  /**
   * Monitor for suspicious patterns in security events
   */
  async detectSuspiciousPatterns(): Promise<void> {
    try {
      const recentEvents = await this.getSecurityEvents({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        limit: 1000
      });

      // Detect multiple failed login attempts from same IP
      const ipAttempts = recentEvents
        .filter(e => e.eventType === SecurityEventType.SUSPICIOUS_LOGIN)
        .reduce((acc, event) => {
          acc[event.ipAddress] = (acc[event.ipAddress] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      for (const [ip, attempts] of Object.entries(ipAttempts)) {
        if (attempts >= 5) {
          await this.logSecurityEvent({
            eventType: SecurityEventType.SYSTEM_INTRUSION,
            severity: SecuritySeverity.HIGH,
            ipAddress: ip,
            userAgent: 'Pattern Detection',
            details: {
              pattern: 'multiple_failed_logins',
              attempts,
              timeframe: '24_hours'
            }
          });
        }
      }

      logger.info('Suspicious pattern detection completed', { 
        eventsAnalyzed: recentEvents.length,
        suspiciousIPs: Object.keys(ipAttempts).filter(ip => ipAttempts[ip] >= 5).length
      });
    } catch (error) {
      logger.error('Failed to detect suspicious patterns', { error });
    }
  }
}

export default SecurityMonitoringService;