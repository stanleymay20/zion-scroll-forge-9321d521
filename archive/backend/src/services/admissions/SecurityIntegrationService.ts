import { logger } from '../../utils/logger';
import SecurityMonitoringService from './SecurityMonitoringService';
import AuditTrailService from './AuditTrailService';
import DataProtectionService from './DataProtectionService';
import AccessControlService from './AccessControlService';
import SecurityIncidentResponseService from './SecurityIncidentResponseService';
import SecurityComplianceService from './SecurityComplianceService';

interface SecurityContext {
  userId?: string;
  ipAddress: string;
  userAgent: string;
  resource: string;
  action: string;
  entityId?: string;
  additionalData?: Record<string, any>;
}

interface SecurityValidationResult {
  allowed: boolean;
  reason: string;
  auditId?: string;
  securityEventId?: string;
  restrictions?: string[];
}

export class SecurityIntegrationService {
  private securityMonitoring: SecurityMonitoringService;
  private auditTrail: AuditTrailService;
  private dataProtection: DataProtectionService;
  private accessControl: AccessControlService;
  private incidentResponse: SecurityIncidentResponseService;
  private securityCompliance: SecurityComplianceService;

  constructor() {
    this.securityMonitoring = new SecurityMonitoringService();
    this.auditTrail = new AuditTrailService();
    this.dataProtection = new DataProtectionService();
    this.accessControl = new AccessControlService();
    this.incidentResponse = new SecurityIncidentResponseService();
    this.securityCompliance = new SecurityComplianceService();
  }

  /**
   * Comprehensive security validation for all admissions operations
   */
  async validateSecurityContext(context: SecurityContext): Promise<SecurityValidationResult> {
    try {
      logger.info('Validating security context', {
        userId: context.userId,
        resource: context.resource,
        action: context.action
      });

      // Step 1: Check access control permissions
      if (context.userId) {
        const accessDecision = await this.accessControl.checkAccess({
          userId: context.userId,
          resource: context.resource,
          action: context.action,
          context: {
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            timestamp: new Date(),
            resourceId: context.entityId,
            additionalData: context.additionalData
          }
        });

        if (!accessDecision.granted) {
          // Log security event for denied access
          const securityEventId = await this.securityMonitoring.logSecurityEvent({
            eventType: 'unauthorized_access' as any,
            severity: 'medium' as any,
            userId: context.userId,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            details: {
              resource: context.resource,
              action: context.action,
              reason: accessDecision.reason
            }
          });

          return {
            allowed: false,
            reason: accessDecision.reason,
            securityEventId,
            restrictions: accessDecision.conditions
          };
        }
      }

      // Step 2: Check data protection requirements
      if (this.isSensitiveDataOperation(context.resource, context.action)) {
        const dataAccessAllowed = await this.validateDataProtectionRequirements(context);
        
        if (!dataAccessAllowed.allowed) {
          return dataAccessAllowed;
        }
      }

      // Step 3: Log audit trail for the operation
      const auditId = await this.auditTrail.logAuditEvent({
        action: context.action as any,
        entityType: context.resource as any,
        entityId: context.entityId || 'unknown',
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: context.additionalData || {}
      });

      // Step 4: Monitor for suspicious patterns
      await this.monitorForSuspiciousActivity(context);

      return {
        allowed: true,
        reason: 'Security validation passed',
        auditId
      };
    } catch (error) {
      logger.error('Security validation failed', { error, context });
      
      // Log security event for validation failure
      const securityEventId = await this.securityMonitoring.logSecurityEvent({
        eventType: 'system_intrusion' as any,
        severity: 'high' as any,
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          context
        }
      });

      return {
        allowed: false,
        reason: 'Security validation error',
        securityEventId
      };
    }
  }

  /**
   * Handle security incidents with integrated response
   */
  async handleSecurityIncident(
    title: string,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    category: string,
    context: SecurityContext
  ): Promise<string> {
    try {
      // Report the incident
      const incidentId = await this.incidentResponse.reportIncident({
        title,
        description,
        severity: severity as any,
        category: category as any,
        reportedBy: context.userId || 'system',
        affectedSystems: [context.resource],
        affectedUsers: context.userId ? [context.userId] : [],
        impactAssessment: {
          confidentialityImpact: 'medium' as any,
          integrityImpact: 'low' as any,
          availabilityImpact: 'none' as any,
          businessImpact: 'Security incident detected in admissions system',
          affectedDataTypes: [context.resource]
        }
      });

      // Log security event
      await this.securityMonitoring.logSecurityEvent({
        eventType: 'security_incident' as any,
        severity: severity as any,
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        details: {
          incidentId,
          title,
          category,
          context
        }
      });

      // Log audit event
      await this.auditTrail.logAuditEvent({
        action: 'create' as any,
        entityType: 'security_incident' as any,
        entityId: incidentId,
        userId: context.userId || 'system',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        newValues: { title, severity, category },
        metadata: { automated: true }
      });

      logger.warn('Security incident handled', {
        incidentId,
        severity,
        category,
        title
      });

      return incidentId;
    } catch (error) {
      logger.error('Failed to handle security incident', { error, title, severity });
      throw new Error('Security incident handling failed');
    }
  }

  /**
   * Perform comprehensive security health check
   */
  async performSecurityHealthCheck(): Promise<{
    overallHealth: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      component: string;
      status: 'pass' | 'warning' | 'fail';
      message: string;
      score?: number;
    }>;
    recommendations: string[];
  }> {
    try {
      const checks = [];
      let overallScore = 0;
      let totalChecks = 0;

      // Check security monitoring
      try {
        const securityMetrics = await this.securityMonitoring.getSecurityMetrics({
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          endDate: new Date()
        });

        const criticalEvents = Object.entries(securityMetrics.eventsBySeverity)
          .filter(([severity]) => severity === 'critical')
          .reduce((sum, [, count]) => sum + count, 0);

        if (criticalEvents === 0) {
          checks.push({
            component: 'Security Monitoring',
            status: 'pass' as const,
            message: 'No critical security events in last 24 hours',
            score: 100
          });
          overallScore += 100;
        } else {
          checks.push({
            component: 'Security Monitoring',
            status: 'warning' as const,
            message: `${criticalEvents} critical security events detected`,
            score: Math.max(0, 100 - (criticalEvents * 20))
          });
          overallScore += Math.max(0, 100 - (criticalEvents * 20));
        }
        totalChecks++;
      } catch (error) {
        checks.push({
          component: 'Security Monitoring',
          status: 'fail' as const,
          message: 'Security monitoring check failed'
        });
        totalChecks++;
      }

      // Check audit trail coverage
      try {
        const auditReport = await this.auditTrail.generateComplianceReport({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        });

        if (auditReport.complianceScore >= 90) {
          checks.push({
            component: 'Audit Trail',
            status: 'pass' as const,
            message: 'Excellent audit trail coverage',
            score: auditReport.complianceScore
          });
        } else if (auditReport.complianceScore >= 70) {
          checks.push({
            component: 'Audit Trail',
            status: 'warning' as const,
            message: 'Audit trail coverage needs improvement',
            score: auditReport.complianceScore
          });
        } else {
          checks.push({
            component: 'Audit Trail',
            status: 'fail' as const,
            message: 'Poor audit trail coverage',
            score: auditReport.complianceScore
          });
        }
        overallScore += auditReport.complianceScore;
        totalChecks++;
      } catch (error) {
        checks.push({
          component: 'Audit Trail',
          status: 'fail' as const,
          message: 'Audit trail check failed'
        });
        totalChecks++;
      }

      // Check data protection compliance
      try {
        const privacyReport = await this.dataProtection.generatePrivacyComplianceReport();

        if (privacyReport.complianceScore >= 90) {
          checks.push({
            component: 'Data Protection',
            status: 'pass' as const,
            message: 'Strong data protection compliance',
            score: privacyReport.complianceScore
          });
        } else if (privacyReport.complianceScore >= 70) {
          checks.push({
            component: 'Data Protection',
            status: 'warning' as const,
            message: 'Data protection compliance needs attention',
            score: privacyReport.complianceScore
          });
        } else {
          checks.push({
            component: 'Data Protection',
            status: 'fail' as const,
            message: 'Data protection compliance is inadequate',
            score: privacyReport.complianceScore
          });
        }
        overallScore += privacyReport.complianceScore;
        totalChecks++;
      } catch (error) {
        checks.push({
          component: 'Data Protection',
          status: 'fail' as const,
          message: 'Data protection check failed'
        });
        totalChecks++;
      }

      // Check access control
      try {
        const accessReport = await this.accessControl.generateAccessControlReport();
        const accessScore = accessReport.accessAttempts.total > 0 
          ? (accessReport.accessAttempts.granted / accessReport.accessAttempts.total) * 100
          : 100;

        if (accessScore >= 95) {
          checks.push({
            component: 'Access Control',
            status: 'pass' as const,
            message: 'Access control functioning properly',
            score: accessScore
          });
        } else if (accessScore >= 85) {
          checks.push({
            component: 'Access Control',
            status: 'warning' as const,
            message: 'Some access control issues detected',
            score: accessScore
          });
        } else {
          checks.push({
            component: 'Access Control',
            status: 'fail' as const,
            message: 'Significant access control problems',
            score: accessScore
          });
        }
        overallScore += accessScore;
        totalChecks++;
      } catch (error) {
        checks.push({
          component: 'Access Control',
          status: 'fail' as const,
          message: 'Access control check failed'
        });
        totalChecks++;
      }

      // Determine overall health
      const averageScore = totalChecks > 0 ? overallScore / totalChecks : 0;
      let overallHealth: 'healthy' | 'warning' | 'critical';
      
      if (averageScore >= 90) {
        overallHealth = 'healthy';
      } else if (averageScore >= 70) {
        overallHealth = 'warning';
      } else {
        overallHealth = 'critical';
      }

      // Generate recommendations
      const recommendations = this.generateHealthCheckRecommendations(checks);

      return {
        overallHealth,
        checks,
        recommendations
      };
    } catch (error) {
      logger.error('Security health check failed', { error });
      return {
        overallHealth: 'critical',
        checks: [{
          component: 'System',
          status: 'fail',
          message: 'Security health check system failure'
        }],
        recommendations: ['Investigate security health check system failure']
      };
    }
  }

  /**
   * Check if operation involves sensitive data
   */
  private isSensitiveDataOperation(resource: string, action: string): boolean {
    const sensitiveResources = ['application', 'document', 'assessment', 'interview'];
    const sensitiveActions = ['read', 'export', 'delete'];
    
    return sensitiveResources.includes(resource) && sensitiveActions.includes(action);
  }

  /**
   * Validate data protection requirements
   */
  private async validateDataProtectionRequirements(context: SecurityContext): Promise<SecurityValidationResult> {
    try {
      if (!context.userId) {
        return {
          allowed: false,
          reason: 'User authentication required for sensitive data access'
        };
      }

      // Check data access permissions
      const hasAccess = await this.dataProtection.checkDataAccess(
        context.userId,
        context.resource as any,
        context.action as any,
        context.entityId
      );

      if (!hasAccess) {
        const securityEventId = await this.securityMonitoring.logSecurityEvent({
          eventType: 'privacy_violation' as any,
          severity: 'high' as any,
          userId: context.userId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: {
            resource: context.resource,
            action: context.action,
            entityId: context.entityId
          }
        });

        return {
          allowed: false,
          reason: 'Data protection policy violation',
          securityEventId
        };
      }

      return {
        allowed: true,
        reason: 'Data protection requirements satisfied'
      };
    } catch (error) {
      logger.error('Data protection validation failed', { error, context });
      return {
        allowed: false,
        reason: 'Data protection validation error'
      };
    }
  }

  /**
   * Monitor for suspicious activity patterns
   */
  private async monitorForSuspiciousActivity(context: SecurityContext): Promise<void> {
    try {
      // This would implement pattern detection logic
      // For now, we'll trigger the existing pattern detection
      await this.securityMonitoring.detectSuspiciousPatterns();
    } catch (error) {
      logger.error('Suspicious activity monitoring failed', { error, context });
    }
  }

  /**
   * Generate recommendations based on health check results
   */
  private generateHealthCheckRecommendations(checks: any[]): string[] {
    const recommendations: string[] = [];

    const failedChecks = checks.filter(check => check.status === 'fail');
    const warningChecks = checks.filter(check => check.status === 'warning');

    if (failedChecks.length > 0) {
      recommendations.push('Immediately address failed security components');
      failedChecks.forEach(check => {
        recommendations.push(`Fix ${check.component}: ${check.message}`);
      });
    }

    if (warningChecks.length > 0) {
      recommendations.push('Review and improve components with warnings');
      warningChecks.forEach(check => {
        recommendations.push(`Improve ${check.component}: ${check.message}`);
      });
    }

    // General recommendations
    recommendations.push('Conduct regular security training for all staff');
    recommendations.push('Implement continuous monitoring and alerting');
    recommendations.push('Perform regular security assessments and penetration testing');

    return recommendations;
  }
}

export default SecurityIntegrationService;