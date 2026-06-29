import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import SecurityMonitoringService from '../SecurityMonitoringService';
import AuditTrailService from '../AuditTrailService';
import DataProtectionService from '../DataProtectionService';
import AccessControlService from '../AccessControlService';
import SecurityIncidentResponseService from '../SecurityIncidentResponseService';
import SecurityComplianceService from '../SecurityComplianceService';

// Mock Prisma Client
jest.mock('@prisma/client');
const mockPrisma = {
  securityEvent: {
    create: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn()
  },
  auditEvent: {
    create: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn()
  },
  dataSubjectRequest: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn()
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn()
  },
  role: {
    create: jest.fn(),
    count: jest.fn()
  },
  permission: {
    create: jest.fn(),
    count: jest.fn()
  },
  accessLog: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  securityIncident: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn()
  },
  responseAction: {
    create: jest.fn(),
    update: jest.fn()
  },
  complianceReport: {
    create: jest.fn()
  }
};

(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma as any);

describe('Security Monitoring and Compliance System', () => {
  let securityMonitoring: SecurityMonitoringService;
  let auditTrail: AuditTrailService;
  let dataProtection: DataProtectionService;
  let accessControl: AccessControlService;
  let incidentResponse: SecurityIncidentResponseService;
  let securityCompliance: SecurityComplianceService;

  beforeEach(() => {
    jest.clearAllMocks();
    securityMonitoring = new SecurityMonitoringService();
    auditTrail = new AuditTrailService();
    dataProtection = new DataProtectionService();
    accessControl = new AccessControlService();
    incidentResponse = new SecurityIncidentResponseService();
    securityCompliance = new SecurityComplianceService();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('SecurityMonitoringService', () => {
    it('should log security events successfully', async () => {
      const mockEvent = {
        id: 'event-1',
        eventType: 'unauthorized_access',
        severity: 'high',
        userId: 'user-1',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        details: { attemptedResource: '/admin' },
        resolved: false
      };

      mockPrisma.securityEvent.create.mockResolvedValue(mockEvent);

      const eventId = await securityMonitoring.logSecurityEvent({
        eventType: 'unauthorized_access' as any,
        severity: 'high' as any,
        userId: 'user-1',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        details: { attemptedResource: '/admin' }
      });

      expect(eventId).toBe('event-1');
      expect(mockPrisma.securityEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'unauthorized_access',
          severity: 'high',
          userId: 'user-1',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          details: { attemptedResource: '/admin' },
          resolved: false
        })
      });
    });

    it('should retrieve security events with filters', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          eventType: 'unauthorized_access',
          severity: 'high',
          timestamp: new Date(),
          userId: 'user-1',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          details: {},
          resolved: false,
          resolvedAt: null,
          resolvedBy: null
        }
      ];

      mockPrisma.securityEvent.findMany.mockResolvedValue(mockEvents);

      const events = await securityMonitoring.getSecurityEvents({
        eventType: 'unauthorized_access' as any,
        severity: 'high' as any,
        limit: 10
      });

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('unauthorized_access');
      expect(mockPrisma.securityEvent.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          eventType: 'unauthorized_access',
          severity: 'high'
        }),
        orderBy: { timestamp: 'desc' },
        take: 10,
        skip: 0
      });
    });

    it('should generate security metrics', async () => {
      const mockEvents = [
        {
          eventType: 'unauthorized_access',
          severity: 'high',
          timestamp: new Date(),
          resolved: true,
          resolvedAt: new Date()
        },
        {
          eventType: 'fraud_attempt',
          severity: 'medium',
          timestamp: new Date(),
          resolved: false,
          resolvedAt: null
        }
      ];

      mockPrisma.securityEvent.findMany.mockResolvedValue(mockEvents);

      const metrics = await securityMonitoring.getSecurityMetrics({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date()
      });

      expect(metrics.totalEvents).toBe(2);
      expect(metrics.resolvedEvents).toBe(1);
      expect(metrics.pendingEvents).toBe(1);
      expect(metrics.eventsByType).toHaveProperty('unauthorized_access', 1);
      expect(metrics.eventsByType).toHaveProperty('fraud_attempt', 1);
    });
  });

  describe('AuditTrailService', () => {
    it('should log audit events successfully', async () => {
      const mockAuditEvent = {
        id: 'audit-1',
        action: 'create',
        entityType: 'application',
        entityId: 'app-1',
        userId: 'user-1',
        timestamp: new Date(),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        oldValues: {},
        newValues: { status: 'submitted' },
        metadata: {}
      };

      mockPrisma.auditEvent.create.mockResolvedValue(mockAuditEvent);

      const auditId = await auditTrail.logAuditEvent({
        action: 'create' as any,
        entityType: 'application' as any,
        entityId: 'app-1',
        userId: 'user-1',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        newValues: { status: 'submitted' },
        metadata: {}
      });

      expect(auditId).toBe('audit-1');
      expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'create',
          entityType: 'application',
          entityId: 'app-1',
          userId: 'user-1'
        })
      });
    });

    it('should generate compliance report', async () => {
      const mockEvents = [
        {
          action: 'create',
          entityType: 'application',
          timestamp: new Date(),
          userId: 'user-1',
          oldValues: {},
          newValues: { status: 'submitted' }
        },
        {
          action: 'update',
          entityType: 'application',
          timestamp: new Date(),
          userId: 'user-2',
          oldValues: { status: 'submitted' },
          newValues: { status: 'reviewed' }
        }
      ];

      mockPrisma.auditEvent.findMany.mockResolvedValue(mockEvents);

      const report = await auditTrail.generateComplianceReport({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date()
      });

      expect(report.totalEvents).toBe(2);
      expect(report.eventsByAction).toHaveProperty('create', 1);
      expect(report.eventsByAction).toHaveProperty('update', 1);
      expect(report.complianceScore).toBeGreaterThan(0);
    });
  });

  describe('DataProtectionService', () => {
    it('should encrypt and decrypt sensitive data', () => {
      const originalData = 'sensitive information';
      
      const encrypted = dataProtection.encryptSensitiveData(originalData);
      expect(encrypted).not.toBe(originalData);
      expect(encrypted).toBeTruthy();

      const decrypted = dataProtection.decryptSensitiveData(encrypted);
      expect(decrypted).toBe(originalData);
    });

    it('should process data subject requests', async () => {
      const mockRequest = {
        id: 'request-1',
        requestType: 'access',
        subjectId: 'user-1',
        subjectEmail: 'user@example.com',
        status: 'pending',
        requestDetails: {}
      };

      mockPrisma.dataSubjectRequest.create.mockResolvedValue(mockRequest);

      const requestId = await dataProtection.processDataSubjectRequest({
        requestType: 'access' as any,
        subjectId: 'user-1',
        subjectEmail: 'user@example.com',
        requestDetails: {}
      });

      expect(requestId).toBe('request-1');
      expect(mockPrisma.dataSubjectRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requestType: 'access',
          subjectId: 'user-1',
          subjectEmail: 'user@example.com',
          status: 'pending'
        })
      });
    });

    it('should generate privacy compliance report', async () => {
      mockPrisma.dataProtectionPolicy = { count: jest.fn().mockResolvedValue(5) };
      mockPrisma.dataSubjectRequest = {
        ...mockPrisma.dataSubjectRequest,
        count: jest.fn()
          .mockResolvedValueOnce(2) // active requests
          .mockResolvedValueOnce(8) // completed requests
      };
      mockPrisma.application = { count: jest.fn().mockResolvedValue(100) };

      const report = await dataProtection.generatePrivacyComplianceReport();

      expect(report.dataProtectionPolicies).toBe(5);
      expect(report.activeRequests).toBe(2);
      expect(report.completedRequests).toBe(8);
      expect(report.complianceScore).toBeGreaterThan(0);
    });
  });

  describe('AccessControlService', () => {
    it('should check user access permissions', async () => {
      const mockUser = {
        id: 'user-1',
        active: true,
        roles: [
          {
            role: {
              permissions: [
                {
                  resource: 'application',
                  action: 'read'
                }
              ]
            }
          }
        ]
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.accessRestriction = { findMany: jest.fn().mockResolvedValue([]) };
      mockPrisma.accessLog = { create: jest.fn() };

      const accessDecision = await accessControl.checkAccess({
        userId: 'user-1',
        resource: 'application',
        action: 'read',
        context: {
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date()
        }
      });

      expect(accessDecision.granted).toBe(true);
      expect(accessDecision.reason).toBe('Access granted');
    });

    it('should deny access for insufficient permissions', async () => {
      const mockUser = {
        id: 'user-1',
        active: true,
        roles: [
          {
            role: {
              permissions: [
                {
                  resource: 'application',
                  action: 'read'
                }
              ]
            }
          }
        ]
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.accessLog = { create: jest.fn() };

      const accessDecision = await accessControl.checkAccess({
        userId: 'user-1',
        resource: 'application',
        action: 'delete',
        context: {
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date()
        }
      });

      expect(accessDecision.granted).toBe(false);
      expect(accessDecision.reason).toBe('Insufficient permissions');
    });
  });

  describe('SecurityIncidentResponseService', () => {
    it('should report security incidents', async () => {
      const mockIncident = {
        id: 'incident-1',
        title: 'Unauthorized Access Attempt',
        severity: 'high',
        category: 'unauthorized_access',
        status: 'reported',
        reportedBy: 'security-system'
      };

      mockPrisma.securityIncident.create.mockResolvedValue(mockIncident);
      mockPrisma.incidentResponse = { create: jest.fn() };
      mockPrisma.responseAction = { create: jest.fn() };

      const incidentId = await incidentResponse.reportIncident({
        title: 'Unauthorized Access Attempt',
        description: 'Multiple failed login attempts detected',
        severity: 'high' as any,
        category: 'unauthorized_access' as any,
        reportedBy: 'security-system',
        affectedSystems: ['admissions-portal'],
        affectedUsers: ['user-1'],
        impactAssessment: {
          confidentialityImpact: 'medium' as any,
          integrityImpact: 'low' as any,
          availabilityImpact: 'none' as any,
          businessImpact: 'Minimal impact on operations',
          affectedDataTypes: ['login_credentials']
        }
      });

      expect(incidentId).toBe('incident-1');
      expect(mockPrisma.securityIncident.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Unauthorized Access Attempt',
          severity: 'high',
          category: 'unauthorized_access',
          status: 'reported'
        })
      });
    });

    it('should generate incident metrics', async () => {
      const mockIncidents = [
        {
          severity: 'high',
          category: 'unauthorized_access',
          reportedAt: new Date(),
          acknowledgedAt: new Date(Date.now() + 30 * 60 * 1000),
          resolvedAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
          status: 'resolved'
        },
        {
          severity: 'medium',
          category: 'data_breach',
          reportedAt: new Date(),
          acknowledgedAt: null,
          resolvedAt: null,
          status: 'reported'
        }
      ];

      mockPrisma.securityIncident.findMany.mockResolvedValue(mockIncidents);

      const metrics = await incidentResponse.getIncidentMetrics({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date()
      });

      expect(metrics.totalIncidents).toBe(2);
      expect(metrics.incidentsBySeverity).toHaveProperty('high', 1);
      expect(metrics.incidentsBySeverity).toHaveProperty('medium', 1);
      expect(metrics.openIncidents).toBe(1);
    });
  });

  describe('SecurityComplianceService', () => {
    it('should generate comprehensive compliance report', async () => {
      // Mock all the required service methods
      jest.spyOn(securityCompliance as any, 'gatherSecurityMetrics').mockResolvedValue({
        totalSecurityEvents: 50,
        resolvedIncidents: 8,
        auditCoverage: 85,
        dataProtectionScore: 90,
        accessControlScore: 88
      });

      jest.spyOn(securityCompliance as any, 'assessComplianceFrameworks').mockResolvedValue([
        {
          name: 'GDPR',
          complianceScore: 85,
          status: 'partially_compliant',
          requirements: [],
          assessmentDate: new Date()
        },
        {
          name: 'FERPA',
          complianceScore: 90,
          status: 'compliant',
          requirements: [],
          assessmentDate: new Date()
        }
      ]);

      mockPrisma.complianceReport = { create: jest.fn() };

      const report = await securityCompliance.generateComplianceReport();

      expect(report.overallScore).toBeGreaterThan(0);
      expect(report.frameworks).toHaveLength(2);
      expect(report.securityMetrics).toHaveProperty('totalSecurityEvents', 50);
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.riskAssessment).toHaveProperty('overallRisk');
    });

    it('should provide actionable recommendations', async () => {
      const mockFrameworks = [
        {
          name: 'GDPR',
          complianceScore: 65, // Below 80 threshold
          status: 'partially_compliant' as any,
          requirements: [
            {
              id: 'gdpr-1',
              name: 'Data Subject Rights',
              priority: 'critical' as any,
              status: 'partially_implemented' as any
            }
          ],
          assessmentDate: new Date()
        }
      ];

      const mockMetrics = {
        auditCoverage: 70, // Below 80 threshold
        dataProtectionScore: 85,
        accessControlScore: 75 // Below 80 threshold
      };

      const recommendations = await (securityCompliance as any).generateComplianceRecommendations(mockFrameworks, mockMetrics);

      expect(recommendations).toContain('Improve GDPR compliance by addressing partially implemented requirements');
      expect(recommendations).toContain('Improve audit trail coverage by implementing comprehensive logging for all critical operations');
      expect(recommendations).toContain('Strengthen access control implementation with regular permission reviews');
    });
  });

  describe('Integration Tests', () => {
    it('should handle security event escalation workflow', async () => {
      // Mock critical security event
      const mockEvent = {
        id: 'event-critical-1',
        eventType: 'data_breach_attempt',
        severity: 'critical'
      };

      mockPrisma.securityEvent.create.mockResolvedValue(mockEvent);
      mockPrisma.incidentResponse = { create: jest.fn() };

      // Log critical security event
      const eventId = await securityMonitoring.logSecurityEvent({
        eventType: 'data_breach_attempt' as any,
        severity: 'critical' as any,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        details: { attemptedData: 'student_records' }
      });

      expect(eventId).toBe('event-critical-1');
      
      // Verify incident response was triggered
      expect(mockPrisma.incidentResponse.create).toHaveBeenCalled();
    });

    it('should maintain audit trail for all security operations', async () => {
      mockPrisma.auditEvent.create.mockResolvedValue({ id: 'audit-1' });

      // Simulate security operation
      await auditTrail.logAuditEvent({
        action: 'update' as any,
        entityType: 'security_config' as any,
        entityId: 'config-1',
        userId: 'admin-1',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        oldValues: { setting: 'old_value' },
        newValues: { setting: 'new_value' },
        metadata: { reason: 'security_enhancement' }
      });

      expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'update',
          entityType: 'security_config',
          entityId: 'config-1',
          userId: 'admin-1',
          oldValues: { setting: 'old_value' },
          newValues: { setting: 'new_value' }
        })
      });
    });
  });
});