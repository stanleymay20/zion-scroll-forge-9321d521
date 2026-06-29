import { logger } from '../../utils/logger';
import { PrismaClient } from '@prisma/client';

interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  status: IncidentStatus;
  reportedBy: string;
  assignedTo?: string;
  reportedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  affectedSystems: string[];
  affectedUsers: string[];
  impactAssessment: ImpactAssessment;
  responseActions: ResponseAction[];
  rootCause?: string;
  preventiveMeasures?: string[];
}

enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

enum IncidentCategory {
  DATA_BREACH = 'data_breach',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  SYSTEM_COMPROMISE = 'system_compromise',
  MALWARE = 'malware',
  PHISHING = 'phishing',
  DENIAL_OF_SERVICE = 'denial_of_service',
  INSIDER_THREAT = 'insider_threat',
  PRIVACY_VIOLATION = 'privacy_violation'
}

enum IncidentStatus {
  REPORTED = 'reported',
  ACKNOWLEDGED = 'acknowledged',
  INVESTIGATING = 'investigating',
  CONTAINING = 'containing',
  ERADICATING = 'eradicating',
  RECOVERING = 'recovering',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

interface ImpactAssessment {
  confidentialityImpact: ImpactLevel;
  integrityImpact: ImpactLevel;
  availabilityImpact: ImpactLevel;
  businessImpact: string;
  estimatedCost?: number;
  affectedDataTypes: string[];
}

enum ImpactLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

interface ResponseAction {
  id: string;
  action: string;
  assignedTo: string;
  status: ActionStatus;
  dueDate: Date;
  completedAt?: Date;
  notes?: string;
}

enum ActionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

interface IncidentMetrics {
  totalIncidents: number;
  incidentsBySeverity: Record<IncidentSeverity, number>;
  incidentsByCategory: Record<IncidentCategory, number>;
  averageResponseTime: number;
  averageResolutionTime: number;
  openIncidents: number;
}

export class SecurityIncidentResponseService {
  private prisma: PrismaClient;
  private escalationMatrix: Map<IncidentSeverity, string[]>;

  constructor() {
    this.prisma = new PrismaClient();
    this.initializeEscalationMatrix();
  }

  /**
   * Report a new security incident
   */
  async reportIncident(incidentData: Omit<SecurityIncident, 'id' | 'reportedAt' | 'status' | 'responseActions'>): Promise<string> {
    try {
      const incident = await this.prisma.securityIncident.create({
        data: {
          title: incidentData.title,
          description: incidentData.description,
          severity: incidentData.severity,
          category: incidentData.category,
          status: IncidentStatus.REPORTED,
          reportedBy: incidentData.reportedBy,
          affectedSystems: incidentData.affectedSystems,
          affectedUsers: incidentData.affectedUsers,
          impactAssessment: incidentData.impactAssessment
        }
      });

      // Auto-assign based on severity and category
      const assignedTo = await this.autoAssignIncident(incidentData.severity, incidentData.category);
      if (assignedTo) {
        await this.assignIncident(incident.id, assignedTo);
      }

      // Trigger immediate response for critical incidents
      if (incidentData.severity === IncidentSeverity.CRITICAL) {
        await this.triggerEmergencyResponse(incident.id);
      }

      // Create initial response actions
      await this.createInitialResponseActions(incident.id, incidentData.severity, incidentData.category);

      logger.error('Security incident reported', {
        incidentId: incident.id,
        severity: incidentData.severity,
        category: incidentData.category,
        title: incidentData.title
      });

      return incident.id;
    } catch (error) {
      logger.error('Failed to report security incident', { error, incidentData });
      throw new Error('Security incident reporting failed');
    }
  }

  /**
   * Acknowledge an incident
   */
  async acknowledgeIncident(incidentId: string, acknowledgedBy: string): Promise<void> {
    try {
      await this.prisma.securityIncident.update({
        where: { id: incidentId },
        data: {
          status: IncidentStatus.ACKNOWLEDGED,
          acknowledgedAt: new Date(),
          assignedTo: acknowledgedBy
        }
      });

      logger.info('Security incident acknowledged', { incidentId, acknowledgedBy });
    } catch (error) {
      logger.error('Failed to acknowledge incident', { error, incidentId });
      throw new Error('Incident acknowledgment failed');
    }
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(incidentId: string, status: IncidentStatus, updatedBy: string, notes?: string): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedBy,
        updatedAt: new Date()
      };

      if (status === IncidentStatus.RESOLVED) {
        updateData.resolvedAt = new Date();
      }

      await this.prisma.securityIncident.update({
        where: { id: incidentId },
        data: updateData
      });

      // Log status change
      await this.logIncidentActivity(incidentId, `Status changed to ${status}`, updatedBy, notes);

      logger.info('Incident status updated', { incidentId, status, updatedBy });
    } catch (error) {
      logger.error('Failed to update incident status', { error, incidentId, status });
      throw new Error('Incident status update failed');
    }
  }

  /**
   * Add response action to incident
   */
  async addResponseAction(incidentId: string, action: Omit<ResponseAction, 'id' | 'status'>): Promise<string> {
    try {
      const responseAction = await this.prisma.responseAction.create({
        data: {
          incidentId,
          action: action.action,
          assignedTo: action.assignedTo,
          status: ActionStatus.PENDING,
          dueDate: action.dueDate,
          notes: action.notes
        }
      });

      logger.info('Response action added', {
        incidentId,
        actionId: responseAction.id,
        action: action.action
      });

      return responseAction.id;
    } catch (error) {
      logger.error('Failed to add response action', { error, incidentId, action });
      throw new Error('Response action creation failed');
    }
  }

  /**
   * Complete response action
   */
  async completeResponseAction(actionId: string, completedBy: string, notes?: string): Promise<void> {
    try {
      await this.prisma.responseAction.update({
        where: { id: actionId },
        data: {
          status: ActionStatus.COMPLETED,
          completedAt: new Date(),
          notes
        }
      });

      logger.info('Response action completed', { actionId, completedBy });
    } catch (error) {
      logger.error('Failed to complete response action', { error, actionId });
      throw new Error('Response action completion failed');
    }
  }

  /**
   * Get incident details with response actions
   */
  async getIncident(incidentId: string): Promise<SecurityIncident | null> {
    try {
      const incident = await this.prisma.securityIncident.findUnique({
        where: { id: incidentId },
        include: {
          responseActions: true,
          activityLog: true
        }
      });

      if (!incident) {
        return null;
      }

      return {
        id: incident.id,
        title: incident.title,
        description: incident.description,
        severity: incident.severity as IncidentSeverity,
        category: incident.category as IncidentCategory,
        status: incident.status as IncidentStatus,
        reportedBy: incident.reportedBy,
        assignedTo: incident.assignedTo || undefined,
        reportedAt: incident.reportedAt,
        acknowledgedAt: incident.acknowledgedAt || undefined,
        resolvedAt: incident.resolvedAt || undefined,
        affectedSystems: incident.affectedSystems as string[],
        affectedUsers: incident.affectedUsers as string[],
        impactAssessment: incident.impactAssessment as ImpactAssessment,
        responseActions: incident.responseActions.map(action => ({
          id: action.id,
          action: action.action,
          assignedTo: action.assignedTo,
          status: action.status as ActionStatus,
          dueDate: action.dueDate,
          completedAt: action.completedAt || undefined,
          notes: action.notes || undefined
        })),
        rootCause: incident.rootCause || undefined,
        preventiveMeasures: incident.preventiveMeasures as string[] || undefined
      };
    } catch (error) {
      logger.error('Failed to get incident', { error, incidentId });
      throw new Error('Incident retrieval failed');
    }
  }

  /**
   * Get incident metrics and analytics
   */
  async getIncidentMetrics(timeRange: { startDate: Date; endDate: Date }): Promise<IncidentMetrics> {
    try {
      const incidents = await this.prisma.securityIncident.findMany({
        where: {
          reportedAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate
          }
        }
      });

      const incidentsBySeverity = incidents.reduce((acc, incident) => {
        acc[incident.severity as IncidentSeverity] = (acc[incident.severity as IncidentSeverity] || 0) + 1;
        return acc;
      }, {} as Record<IncidentSeverity, number>);

      const incidentsByCategory = incidents.reduce((acc, incident) => {
        acc[incident.category as IncidentCategory] = (acc[incident.category as IncidentCategory] || 0) + 1;
        return acc;
      }, {} as Record<IncidentCategory, number>);

      // Calculate average response time (time to acknowledgment)
      const acknowledgedIncidents = incidents.filter(i => i.acknowledgedAt);
      const averageResponseTime = acknowledgedIncidents.length > 0
        ? acknowledgedIncidents.reduce((acc, incident) => {
            const responseTime = incident.acknowledgedAt!.getTime() - incident.reportedAt.getTime();
            return acc + responseTime;
          }, 0) / acknowledgedIncidents.length
        : 0;

      // Calculate average resolution time
      const resolvedIncidents = incidents.filter(i => i.resolvedAt);
      const averageResolutionTime = resolvedIncidents.length > 0
        ? resolvedIncidents.reduce((acc, incident) => {
            const resolutionTime = incident.resolvedAt!.getTime() - incident.reportedAt.getTime();
            return acc + resolutionTime;
          }, 0) / resolvedIncidents.length
        : 0;

      const openIncidents = incidents.filter(i => 
        ![IncidentStatus.RESOLVED, IncidentStatus.CLOSED].includes(i.status as IncidentStatus)
      ).length;

      return {
        totalIncidents: incidents.length,
        incidentsBySeverity,
        incidentsByCategory,
        averageResponseTime: Math.round(averageResponseTime / (1000 * 60)), // Convert to minutes
        averageResolutionTime: Math.round(averageResolutionTime / (1000 * 60 * 60)), // Convert to hours
        openIncidents
      };
    } catch (error) {
      logger.error('Failed to get incident metrics', { error, timeRange });
      throw new Error('Incident metrics retrieval failed');
    }
  }

  /**
   * Generate incident response report
   */
  async generateIncidentReport(incidentId: string): Promise<{
    incident: SecurityIncident;
    timeline: any[];
    lessonsLearned: string[];
    recommendations: string[];
  }> {
    try {
      const incident = await this.getIncident(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }

      const timeline = await this.prisma.incidentActivity.findMany({
        where: { incidentId },
        orderBy: { timestamp: 'asc' }
      });

      // Generate lessons learned and recommendations based on incident data
      const lessonsLearned = this.generateLessonsLearned(incident);
      const recommendations = this.generateRecommendations(incident);

      return {
        incident,
        timeline,
        lessonsLearned,
        recommendations
      };
    } catch (error) {
      logger.error('Failed to generate incident report', { error, incidentId });
      throw new Error('Incident report generation failed');
    }
  }

  /**
   * Initialize escalation matrix for incident assignment
   */
  private initializeEscalationMatrix(): void {
    this.escalationMatrix = new Map([
      [IncidentSeverity.LOW, ['security-analyst']],
      [IncidentSeverity.MEDIUM, ['security-analyst', 'security-lead']],
      [IncidentSeverity.HIGH, ['security-lead', 'security-manager']],
      [IncidentSeverity.CRITICAL, ['security-manager', 'ciso', 'cto']]
    ]);
  }

  /**
   * Auto-assign incident based on severity and category
   */
  private async autoAssignIncident(severity: IncidentSeverity, category: IncidentCategory): Promise<string | null> {
    try {
      const escalationList = this.escalationMatrix.get(severity);
      if (!escalationList || escalationList.length === 0) {
        return null;
      }

      // For now, assign to the first person in the escalation list
      // In production, this would check availability and workload
      return escalationList[0];
    } catch (error) {
      logger.error('Failed to auto-assign incident', { error, severity, category });
      return null;
    }
  }

  /**
   * Trigger emergency response for critical incidents
   */
  private async triggerEmergencyResponse(incidentId: string): Promise<void> {
    try {
      // Create emergency response team notification
      await this.prisma.emergencyResponse.create({
        data: {
          incidentId,
          status: 'activated',
          activatedAt: new Date(),
          teamMembers: ['security-manager', 'ciso', 'cto', 'legal-counsel']
        }
      });

      // In production, this would send immediate notifications
      logger.error('EMERGENCY RESPONSE ACTIVATED', { incidentId });
    } catch (error) {
      logger.error('Failed to trigger emergency response', { error, incidentId });
    }
  }

  /**
   * Create initial response actions based on incident type
   */
  private async createInitialResponseActions(incidentId: string, severity: IncidentSeverity, category: IncidentCategory): Promise<void> {
    try {
      const actions: Omit<ResponseAction, 'id' | 'status'>[] = [];

      // Common actions for all incidents
      actions.push({
        action: 'Initial assessment and triage',
        assignedTo: 'security-analyst',
        dueDate: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      });

      // Category-specific actions
      switch (category) {
        case IncidentCategory.DATA_BREACH:
          actions.push({
            action: 'Identify scope of data exposure',
            assignedTo: 'security-analyst',
            dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
          });
          actions.push({
            action: 'Notify legal and compliance teams',
            assignedTo: 'security-manager',
            dueDate: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
          });
          break;

        case IncidentCategory.SYSTEM_COMPROMISE:
          actions.push({
            action: 'Isolate affected systems',
            assignedTo: 'security-analyst',
            dueDate: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
          });
          break;

        case IncidentCategory.UNAUTHORIZED_ACCESS:
          actions.push({
            action: 'Review access logs and disable compromised accounts',
            assignedTo: 'security-analyst',
            dueDate: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
          });
          break;
      }

      // Create all actions
      for (const action of actions) {
        await this.addResponseAction(incidentId, action);
      }
    } catch (error) {
      logger.error('Failed to create initial response actions', { error, incidentId });
    }
  }

  /**
   * Assign incident to a team member
   */
  private async assignIncident(incidentId: string, assignedTo: string): Promise<void> {
    try {
      await this.prisma.securityIncident.update({
        where: { id: incidentId },
        data: { assignedTo }
      });

      await this.logIncidentActivity(incidentId, `Incident assigned to ${assignedTo}`, 'system');
    } catch (error) {
      logger.error('Failed to assign incident', { error, incidentId, assignedTo });
    }
  }

  /**
   * Log incident activity
   */
  private async logIncidentActivity(incidentId: string, activity: string, performedBy: string, notes?: string): Promise<void> {
    try {
      await this.prisma.incidentActivity.create({
        data: {
          incidentId,
          activity,
          performedBy,
          notes,
          timestamp: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to log incident activity', { error, incidentId, activity });
    }
  }

  /**
   * Generate lessons learned from incident
   */
  private generateLessonsLearned(incident: SecurityIncident): string[] {
    const lessons: string[] = [];

    if (incident.severity === IncidentSeverity.CRITICAL) {
      lessons.push('Critical incidents require immediate escalation and emergency response activation');
    }

    if (incident.category === IncidentCategory.DATA_BREACH) {
      lessons.push('Data classification and encryption are crucial for minimizing breach impact');
    }

    if (incident.category === IncidentCategory.UNAUTHORIZED_ACCESS) {
      lessons.push('Regular access reviews and strong authentication mechanisms are essential');
    }

    return lessons;
  }

  /**
   * Generate recommendations from incident
   */
  private generateRecommendations(incident: SecurityIncident): string[] {
    const recommendations: string[] = [];

    recommendations.push('Conduct regular security awareness training');
    recommendations.push('Implement continuous monitoring and alerting');
    recommendations.push('Review and update incident response procedures');

    if (incident.category === IncidentCategory.PHISHING) {
      recommendations.push('Deploy advanced email security solutions');
      recommendations.push('Implement user behavior analytics');
    }

    return recommendations;
  }
}

export default SecurityIncidentResponseService;