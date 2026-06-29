import { logger } from '../../utils/logger';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

interface DataProtectionPolicy {
  id: string;
  name: string;
  description: string;
  dataTypes: DataType[];
  retentionPeriod: number; // in days
  encryptionRequired: boolean;
  accessRestrictions: AccessRestriction[];
  complianceFrameworks: ComplianceFramework[];
  active: boolean;
}

enum DataType {
  PERSONAL_INFORMATION = 'personal_information',
  ACADEMIC_RECORDS = 'academic_records',
  FINANCIAL_DATA = 'financial_data',
  SPIRITUAL_ASSESSMENT = 'spiritual_assessment',
  INTERVIEW_RECORDINGS = 'interview_recordings',
  DOCUMENTS = 'documents',
  BIOMETRIC_DATA = 'biometric_data',
  COMMUNICATION_LOGS = 'communication_logs'
}

enum ComplianceFramework {
  GDPR = 'gdpr',
  FERPA = 'ferpa',
  CCPA = 'ccpa',
  PIPEDA = 'pipeda',
  LGPD = 'lgpd'
}

interface AccessRestriction {
  role: string;
  permissions: Permission[];
  conditions?: string[];
}

enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  EXPORT = 'export',
  SHARE = 'share'
}

interface DataSubjectRequest {
  id: string;
  requestType: DataSubjectRequestType;
  subjectId: string;
  subjectEmail: string;
  requestDate: Date;
  status: RequestStatus;
  completedDate?: Date;
  requestDetails: Record<string, any>;
  responseData?: Record<string, any>;
}

enum DataSubjectRequestType {
  ACCESS = 'access',
  RECTIFICATION = 'rectification',
  ERASURE = 'erasure',
  PORTABILITY = 'portability',
  RESTRICTION = 'restriction',
  OBJECTION = 'objection'
}

enum RequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected'
}

export class DataProtectionService {
  private prisma: PrismaClient;
  private encryptionKey: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.encryptionKey = process.env.DATA_ENCRYPTION_KEY || 'default-key-change-in-production';
  }

  /**
   * Encrypt sensitive data before storage
   */
  encryptSensitiveData(data: string): string {
    try {
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      logger.error('Failed to encrypt data', { error });
      throw new Error('Data encryption failed');
    }
  }

  /**
   * Decrypt sensitive data for authorized access
   */
  decryptSensitiveData(encryptedData: string): string {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt data', { error });
      throw new Error('Data decryption failed');
    }
  }

  /**
   * Check if user has permission to access specific data
   */
  async checkDataAccess(userId: string, dataType: DataType, permission: Permission, entityId?: string): Promise<boolean> {
    try {
      // Get user role and permissions
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: true }
      });

      if (!user) {
        return false;
      }

      // Get applicable data protection policies
      const policies = await this.prisma.dataProtectionPolicy.findMany({
        where: {
          active: true,
          dataTypes: {
            has: dataType
          }
        }
      });

      // Check if user has required permissions
      for (const policy of policies) {
        const accessRestrictions = policy.accessRestrictions as AccessRestriction[];
        
        for (const userRole of user.roles) {
          const restriction = accessRestrictions.find(r => r.role === userRole.name);
          
          if (restriction && restriction.permissions.includes(permission)) {
            // Check additional conditions if any
            if (restriction.conditions) {
              const conditionsMet = await this.evaluateAccessConditions(
                restriction.conditions, 
                userId, 
                entityId
              );
              if (!conditionsMet) {
                continue;
              }
            }
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      logger.error('Failed to check data access', { error, userId, dataType, permission });
      return false;
    }
  }

  /**
   * Process data subject requests (GDPR, CCPA compliance)
   */
  async processDataSubjectRequest(request: Omit<DataSubjectRequest, 'id' | 'requestDate' | 'status'>): Promise<string> {
    try {
      const dataRequest = await this.prisma.dataSubjectRequest.create({
        data: {
          requestType: request.requestType,
          subjectId: request.subjectId,
          subjectEmail: request.subjectEmail,
          status: RequestStatus.PENDING,
          requestDetails: request.requestDetails
        }
      });

      // Auto-process certain request types
      if (request.requestType === DataSubjectRequestType.ACCESS) {
        await this.processAccessRequest(dataRequest.id);
      }

      logger.info('Data subject request created', {
        requestId: dataRequest.id,
        type: request.requestType,
        subjectId: request.subjectId
      });

      return dataRequest.id;
    } catch (error) {
      logger.error('Failed to process data subject request', { error, request });
      throw new Error('Data subject request processing failed');
    }
  }

  /**
   * Process access request (Right to Access)
   */
  private async processAccessRequest(requestId: string): Promise<void> {
    try {
      const request = await this.prisma.dataSubjectRequest.findUnique({
        where: { id: requestId }
      });

      if (!request) {
        throw new Error('Request not found');
      }

      // Collect all data for the subject
      const userData = await this.collectUserData(request.subjectId);

      await this.prisma.dataSubjectRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.COMPLETED,
          completedDate: new Date(),
          responseData: userData
        }
      });

      logger.info('Access request processed', { requestId, subjectId: request.subjectId });
    } catch (error) {
      logger.error('Failed to process access request', { error, requestId });
      
      await this.prisma.dataSubjectRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.REJECTED }
      });
    }
  }

  /**
   * Collect all data for a user (for access requests)
   */
  private async collectUserData(userId: string): Promise<Record<string, any>> {
    try {
      const userData: Record<string, any> = {};

      // User profile data
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          applications: true,
          auditEvents: true
        }
      });

      if (user) {
        userData.profile = {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        };

        userData.applications = user.applications.map(app => ({
          id: app.id,
          status: app.status,
          submissionDate: app.submissionDate,
          programApplied: app.programApplied
        }));

        userData.auditTrail = user.auditEvents.map(event => ({
          action: event.action,
          timestamp: event.timestamp,
          entityType: event.entityType
        }));
      }

      return userData;
    } catch (error) {
      logger.error('Failed to collect user data', { error, userId });
      throw new Error('User data collection failed');
    }
  }

  /**
   * Anonymize or delete user data (Right to Erasure)
   */
  async processErasureRequest(userId: string, requestId: string): Promise<void> {
    try {
      // Check if user has active applications or legal holds
      const activeApplications = await this.prisma.application.count({
        where: {
          applicantId: userId,
          status: {
            in: ['submitted', 'under_review', 'assessment_pending']
          }
        }
      });

      if (activeApplications > 0) {
        throw new Error('Cannot erase data with active applications');
      }

      // Anonymize user data instead of deletion for audit trail integrity
      await this.anonymizeUserData(userId);

      await this.prisma.dataSubjectRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.COMPLETED,
          completedDate: new Date()
        }
      });

      logger.info('Erasure request processed', { userId, requestId });
    } catch (error) {
      logger.error('Failed to process erasure request', { error, userId, requestId });
      
      await this.prisma.dataSubjectRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.REJECTED }
      });
    }
  }

  /**
   * Anonymize user data while preserving audit trail
   */
  private async anonymizeUserData(userId: string): Promise<void> {
    try {
      const anonymizedEmail = `anonymized_${crypto.randomBytes(8).toString('hex')}@example.com`;
      const anonymizedName = `Anonymized User ${crypto.randomBytes(4).toString('hex')}`;

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          email: anonymizedEmail,
          name: anonymizedName,
          anonymized: true,
          anonymizedAt: new Date()
        }
      });

      logger.info('User data anonymized', { userId });
    } catch (error) {
      logger.error('Failed to anonymize user data', { error, userId });
      throw new Error('User data anonymization failed');
    }
  }

  /**
   * Generate privacy compliance report
   */
  async generatePrivacyComplianceReport(): Promise<{
    dataProtectionPolicies: number;
    activeRequests: number;
    completedRequests: number;
    encryptedDataPercentage: number;
    complianceScore: number;
  }> {
    try {
      const policies = await this.prisma.dataProtectionPolicy.count({
        where: { active: true }
      });

      const activeRequests = await this.prisma.dataSubjectRequest.count({
        where: { status: { in: [RequestStatus.PENDING, RequestStatus.IN_PROGRESS] } }
      });

      const completedRequests = await this.prisma.dataSubjectRequest.count({
        where: { status: RequestStatus.COMPLETED }
      });

      // Calculate encrypted data percentage (simplified)
      const totalApplications = await this.prisma.application.count();
      const encryptedApplications = await this.prisma.application.count({
        where: { encrypted: true }
      });

      const encryptedDataPercentage = totalApplications > 0 
        ? Math.round((encryptedApplications / totalApplications) * 100)
        : 0;

      // Calculate compliance score
      const complianceScore = this.calculatePrivacyComplianceScore({
        policies,
        activeRequests,
        completedRequests,
        encryptedDataPercentage
      });

      return {
        dataProtectionPolicies: policies,
        activeRequests,
        completedRequests,
        encryptedDataPercentage,
        complianceScore
      };
    } catch (error) {
      logger.error('Failed to generate privacy compliance report', { error });
      throw new Error('Privacy compliance report generation failed');
    }
  }

  /**
   * Calculate privacy compliance score
   */
  private calculatePrivacyComplianceScore(metrics: {
    policies: number;
    activeRequests: number;
    completedRequests: number;
    encryptedDataPercentage: number;
  }): number {
    let score = 0;

    // Policy coverage (25%)
    score += Math.min(metrics.policies / 5, 1) * 25;

    // Request processing efficiency (25%)
    const totalRequests = metrics.activeRequests + metrics.completedRequests;
    if (totalRequests > 0) {
      score += (metrics.completedRequests / totalRequests) * 25;
    } else {
      score += 25; // No requests is good
    }

    // Data encryption (50%)
    score += (metrics.encryptedDataPercentage / 100) * 50;

    return Math.round(score);
  }

  /**
   * Evaluate access conditions for data protection policies
   */
  private async evaluateAccessConditions(conditions: string[], userId: string, entityId?: string): Promise<boolean> {
    try {
      for (const condition of conditions) {
        switch (condition) {
          case 'same_user':
            if (entityId && entityId !== userId) {
              return false;
            }
            break;
          case 'business_hours':
            const now = new Date();
            const hour = now.getHours();
            if (hour < 8 || hour > 18) {
              return false;
            }
            break;
          case 'secure_network':
            // In production, this would check network security
            break;
          default:
            logger.warn('Unknown access condition', { condition });
        }
      }
      return true;
    } catch (error) {
      logger.error('Failed to evaluate access conditions', { error, conditions });
      return false;
    }
  }
}

export default DataProtectionService;