/**
 * ScrollUniversity Admissions - Document Verification and Fraud Detection Tests
 * "Many are called, but few are chosen" - Matthew 22:14
 */

import { PrismaClient } from '@prisma/client';
import { DocumentVerificationService } from '../DocumentVerificationService';
import { FraudDetectionService } from '../FraudDetectionService';
import { IdentityVerificationService } from '../IdentityVerificationService';
import { SuspiciousActivityMonitoringService } from '../SuspiciousActivityMonitoringService';
import crypto from 'crypto';

// Mock Prisma Client
const mockPrisma = {
  documentVerificationLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
    count: jest.fn()
  },
  identityVerificationLog: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  identityVerificationResult: {
    create: jest.fn()
  },
  fraudAnalysisLog: {
    create: jest.fn()
  },
  fraudAlert: {
    create: jest.fn()
  },
  suspiciousActivityAlert: {
    create: jest.fn()
  },
  suspiciousActivity: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  monitoringAlert: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  },
  applicantBlock: {
    create: jest.fn()
  },
  investigationCase: {
    create: jest.fn()
  },
  userSession: {
    findMany: jest.fn()
  }
} as unknown as PrismaClient;

describe('DocumentVerificationService', () => {
  let documentVerificationService: DocumentVerificationService;

  beforeEach(() => {
    documentVerificationService = new DocumentVerificationService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('verifyDocumentAuthenticity', () => {
    it('should verify authentic document successfully', async () => {
      // Mock a legitimate PDF document
      const mockDocument = Buffer.from('Mock PDF content with legitimate markers');
      const applicantId = 'test-applicant-123';
      const documentType = 'transcript';

      mockPrisma.documentVerificationLog.create.mockResolvedValue({
        id: 'log-123',
        applicantId,
        documentType,
        isAuthentic: true
      });

      const result = await documentVerificationService.verifyDocumentAuthenticity(
        mockDocument,
        documentType,
        applicantId
      );

      expect(result.isAuthentic).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.metadata.fileHash).toBeDefined();
      expect(result.flags).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(mockPrisma.documentVerificationLog.create).toHaveBeenCalled();
    });

    it('should detect fraudulent document', async () => {
      // Mock a document with suspicious patterns
      const mockDocument = Buffer.from('Mock PDF with [TEMPLATE] text and suspicious patterns');
      const applicantId = 'test-applicant-456';
      const documentType = 'diploma';

      mockPrisma.documentVerificationLog.create.mockResolvedValue({
        id: 'log-456',
        applicantId,
        documentType,
        isAuthentic: false
      });

      const result = await documentVerificationService.verifyDocumentAuthenticity(
        mockDocument,
        documentType,
        applicantId
      );

      expect(result.isAuthentic).toBe(false);
      expect(result.confidence).toBeLessThan(0.7);
      expect(result.flags.length).toBeGreaterThan(0);
      expect(result.recommendations).toContain('Manual review required due to low confidence score');
    });

    it('should handle document verification errors gracefully', async () => {
      const mockDocument = Buffer.from('Invalid document');
      const applicantId = 'test-applicant-error';
      const documentType = 'transcript';

      mockPrisma.documentVerificationLog.create.mockRejectedValue(new Error('Database error'));

      await expect(
        documentVerificationService.verifyDocumentAuthenticity(mockDocument, documentType, applicantId)
      ).rejects.toThrow('Document verification failed');
    });
  });

  describe('verifyIdentity', () => {
    it('should verify identity successfully with matching documents', async () => {
      const applicantId = 'test-applicant-identity';
      const documentData = {
        name: 'John Doe',
        dateOfBirth: new Date('1990-01-01'),
        documentNumber: 'ABC123456'
      };
      const personalInfo = {
        name: 'John Doe',
        dateOfBirth: new Date('1990-01-01')
      };

      mockPrisma.identityVerificationLog.create.mockResolvedValue({
        id: 'identity-log-123',
        applicantId,
        isVerified: true
      });

      const result = await documentVerificationService.verifyIdentity(
        applicantId,
        documentData,
        personalInfo
      );

      expect(result.isVerified).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.verificationMethods).toContain('NAME_MATCHING');
      expect(result.verificationMethods).toContain('DOB_VERIFICATION');
    });

    it('should flag identity verification with mismatched information', async () => {
      const applicantId = 'test-applicant-mismatch';
      const documentData = {
        name: 'John Doe',
        dateOfBirth: new Date('1990-01-01'),
        documentNumber: 'INVALID123'
      };
      const personalInfo = {
        name: 'Jane Smith',
        dateOfBirth: new Date('1985-05-15')
      };

      mockPrisma.identityVerificationLog.create.mockResolvedValue({
        id: 'identity-log-456',
        applicantId,
        isVerified: false
      });

      const result = await documentVerificationService.verifyIdentity(
        applicantId,
        documentData,
        personalInfo
      );

      expect(result.isVerified).toBe(false);
      expect(result.confidence).toBeLessThan(0.8);
      expect(result.flags.length).toBeGreaterThan(0);
    });
  });

  describe('monitorSuspiciousActivity', () => {
    it('should detect rapid multiple submissions', async () => {
      const applicantId = 'test-rapid-submitter';
      const activityData = {
        documentHash: 'hash123',
        accessPattern: { suspicious: false }
      };

      // Mock recent submissions
      mockPrisma.documentVerificationLog.findMany.mockResolvedValue([
        { id: '1', applicantId, verifiedAt: new Date() },
        { id: '2', applicantId, verifiedAt: new Date() },
        { id: '3', applicantId, verifiedAt: new Date() },
        { id: '4', applicantId, verifiedAt: new Date() },
        { id: '5', applicantId, verifiedAt: new Date() },
        { id: '6', applicantId, verifiedAt: new Date() }
      ]);

      mockPrisma.suspiciousActivityAlert.create.mockResolvedValue({
        id: 'alert-123',
        applicantId,
        type: 'RAPID_SUBMISSIONS'
      });

      await documentVerificationService.monitorSuspiciousActivity(applicantId, activityData);

      expect(mockPrisma.suspiciousActivityAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          applicantId,
          type: 'RAPID_SUBMISSIONS',
          severity: 'MEDIUM'
        })
      });
    });

    it('should detect duplicate documents', async () => {
      const applicantId = 'test-duplicate-detector';
      const activityData = {
        documentHash: 'duplicate-hash-123'
      };

      // Mock duplicate document detection
      mockPrisma.documentVerificationLog.findMany.mockResolvedValue([
        { applicantId: 'other-applicant-1' },
        { applicantId: 'other-applicant-2' }
      ]);

      mockPrisma.suspiciousActivityAlert.create.mockResolvedValue({
        id: 'alert-duplicate',
        applicantId,
        type: 'DUPLICATE_DOCUMENT'
      });

      await documentVerificationService.monitorSuspiciousActivity(applicantId, activityData);

      expect(mockPrisma.suspiciousActivityAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          applicantId,
          type: 'DUPLICATE_DOCUMENT',
          severity: 'HIGH'
        })
      });
    });
  });
});

describe('FraudDetectionService', () => {
  let fraudDetectionService: FraudDetectionService;

  beforeEach(() => {
    fraudDetectionService = new FraudDetectionService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('analyzeFraudRisk', () => {
    it('should analyze fraud risk and return low risk for legitimate applicant', async () => {
      const applicantId = 'legitimate-applicant';
      const applicationData = {
        documents: [
          {
            hash: 'unique-hash-123',
            metadata: {
              creationDate: new Date('2023-01-01'),
              producer: 'Adobe Acrobat'
            }
          }
        ],
        personalInfo: {
          name: 'John Doe',
          email: 'john@example.com'
        },
        behaviorData: {
          interactionMetrics: {
            clickPatterns: [100, 150, 120, 180],
            typingSpeed: 45,
            pausePatterns: [500, 1000, 750, 1200]
          }
        }
      };

      // Mock no duplicates found
      mockPrisma.documentVerificationLog.findMany.mockResolvedValue([]);
      mockPrisma.identityVerificationLog.findMany.mockResolvedValue([]);

      mockPrisma.fraudAnalysisLog.create.mockResolvedValue({
        id: 'fraud-analysis-123',
        applicantId,
        overallRiskScore: 0.2
      });

      const result = await fraudDetectionService.analyzeFraudRisk(applicantId, applicationData);

      expect(result.overallRiskScore).toBeLessThan(0.5);
      expect(result.riskLevel).toBe('LOW');
      expect(result.requiresManualReview).toBe(false);
      expect(result.autoReject).toBe(false);
      expect(mockPrisma.fraudAnalysisLog.create).toHaveBeenCalled();
    });

    it('should detect high fraud risk for suspicious applicant', async () => {
      const applicantId = 'suspicious-applicant';
      const applicationData = {
        documents: [
          {
            hash: 'duplicate-hash-456',
            metadata: {
              creationDate: new Date('2025-01-01'), // Future date
              producer: 'FAKE_PRODUCER'
            }
          }
        ],
        personalInfo: {
          name: 'Suspicious User',
          email: 'fake@test.com'
        },
        behaviorData: {
          interactionMetrics: {
            clickPatterns: [50, 50, 50, 50], // Too consistent
            typingSpeed: 300, // Too fast
            pausePatterns: [100, 100, 100, 100] // No variation
          }
        }
      };

      // Mock duplicates found
      mockPrisma.documentVerificationLog.findMany.mockResolvedValue([
        { applicantId: 'other-applicant-1' },
        { applicantId: 'other-applicant-2' }
      ]);

      mockPrisma.fraudAnalysisLog.create.mockResolvedValue({
        id: 'fraud-analysis-456',
        applicantId,
        overallRiskScore: 0.9
      });

      mockPrisma.fraudAlert.create.mockResolvedValue({
        id: 'fraud-alert-456',
        applicantId,
        riskLevel: 'CRITICAL'
      });

      const result = await fraudDetectionService.analyzeFraudRisk(applicantId, applicationData);

      expect(result.overallRiskScore).toBeGreaterThan(0.7);
      expect(result.riskLevel).toBe('CRITICAL');
      expect(result.requiresManualReview).toBe(true);
      expect(result.autoReject).toBe(true);
      expect(result.detectedPatterns.length).toBeGreaterThan(0);
      expect(mockPrisma.fraudAlert.create).toHaveBeenCalled();
    });

    it('should handle network analysis in fraud detection', async () => {
      const applicantId = 'network-test-applicant';
      const applicationData = {
        documents: [],
        personalInfo: { name: 'Test User' },
        behaviorData: {}
      };
      const networkData = {
        ipAddress: '192.168.1.1', // Private IP
        location: 'Unknown',
        isp: 'Suspicious ISP',
        isProxy: true,
        isVPN: true,
        riskScore: 0.8,
        previousSessions: 0,
        concurrentSessions: 5,
        locationConsistency: 0.2,
        accessPatterns: [],
        suspiciousConnections: ['proxy-server.com'],
        deviceFingerprint: 'test-device-fingerprint'
      };

      mockPrisma.documentVerificationLog.findMany.mockResolvedValue([]);
      mockPrisma.fraudAnalysisLog.create.mockResolvedValue({
        id: 'network-fraud-analysis',
        applicantId,
        overallRiskScore: 0.6
      });

      const result = await fraudDetectionService.analyzeFraudRisk(
        applicantId,
        applicationData,
        networkData
      );

      expect(result.detectedPatterns.some(p => p.category === 'NETWORK')).toBe(true);
      expect(result.riskLevel).toBe('MEDIUM');
    });
  });
});

describe('IdentityVerificationService', () => {
  let identityVerificationService: IdentityVerificationService;

  beforeEach(() => {
    identityVerificationService = new IdentityVerificationService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('verifyIdentity', () => {
    it('should perform comprehensive identity verification', async () => {
      const request = {
        applicantId: 'identity-test-applicant',
        personalInfo: {
          firstName: 'John',
          lastName: 'Doe',
          middleName: 'Michael',
          dateOfBirth: new Date('1990-01-01'),
          nationality: 'US',
          address: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            postalCode: '12345',
            country: 'USA'
          },
          phoneNumber: '+1-555-123-4567',
          email: 'john.doe@example.com'
        },
        documents: [
          {
            type: 'PASSPORT' as const,
            documentNumber: 'P123456789',
            issuingAuthority: 'US State Department',
            issueDate: new Date('2020-01-01'),
            expirationDate: new Date('2030-01-01'),
            documentImage: Buffer.from('mock passport image'),
            extractedData: {
              name: 'John Michael Doe',
              dateOfBirth: new Date('1990-01-01'),
              documentNumber: 'P123456789'
            }
          }
        ],
        biometricData: {
          faceImage: Buffer.from('mock face image'),
          signatureSample: Buffer.from('mock signature')
        },
        verificationLevel: 'COMPREHENSIVE' as const
      };

      mockPrisma.identityVerificationResult.create.mockResolvedValue({
        id: 'identity-result-123',
        applicantId: request.applicantId,
        isVerified: true
      });

      const result = await identityVerificationService.verifyIdentity(request);

      expect(result.isVerified).toBe(true);
      expect(result.overallConfidence).toBeGreaterThan(0.8);
      expect(result.verificationComponents.length).toBeGreaterThan(0);
      expect(result.backgroundCheckResults).toBeDefined();
      expect(mockPrisma.identityVerificationResult.create).toHaveBeenCalled();
    });

    it('should fail verification with inconsistent documents', async () => {
      const request = {
        applicantId: 'inconsistent-applicant',
        personalInfo: {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: new Date('1990-01-01'),
          nationality: 'US',
          address: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            postalCode: '12345',
            country: 'USA'
          },
          phoneNumber: '+1-555-123-4567',
          email: 'john.doe@example.com'
        },
        documents: [
          {
            type: 'PASSPORT' as const,
            documentNumber: 'P123456789',
            issuingAuthority: 'US State Department',
            issueDate: new Date('2020-01-01'),
            documentImage: Buffer.from('mock passport image'),
            extractedData: {
              name: 'Jane Smith', // Different name
              dateOfBirth: new Date('1985-05-15'), // Different DOB
              documentNumber: 'P123456789'
            }
          }
        ],
        verificationLevel: 'ENHANCED' as const
      };

      mockPrisma.identityVerificationResult.create.mockResolvedValue({
        id: 'identity-result-456',
        applicantId: request.applicantId,
        isVerified: false
      });

      const result = await identityVerificationService.verifyIdentity(request);

      expect(result.isVerified).toBe(false);
      expect(result.overallConfidence).toBeLessThan(0.8);
      expect(result.riskFactors.length).toBeGreaterThan(0);
      expect(result.recommendations).toContain('Manual review required due to low confidence score');
    });
  });
});

describe('SuspiciousActivityMonitoringService', () => {
  let monitoringService: SuspiciousActivityMonitoringService;

  beforeEach(() => {
    monitoringService = new SuspiciousActivityMonitoringService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('monitorUserActivity', () => {
    it('should monitor user activity and detect no suspicious behavior', async () => {
      const applicantId = 'normal-user';
      const activityData = {
        sessionDuration: 1800, // 30 minutes
        interactionMetrics: {
          clickPatterns: [100, 150, 120, 180, 200],
          typingSpeed: 45,
          pausePatterns: [500, 1000, 750, 1200, 800]
        }
      };

      // Mock normal submission count
      mockPrisma.documentVerificationLog.count.mockResolvedValue(2);

      await monitoringService.monitorUserActivity(applicantId, activityData);

      // Should not create any suspicious activity alerts
      expect(mockPrisma.suspiciousActivity.create).not.toHaveBeenCalled();
    });

    it('should detect and process rapid submissions', async () => {
      const applicantId = 'rapid-submitter';
      const activityData = {
        sessionDuration: 300 // 5 minutes
      };

      // Mock high submission count
      mockPrisma.documentVerificationLog.count.mockResolvedValue(6);
      mockPrisma.suspiciousActivity.create.mockResolvedValue({
        id: 'suspicious-activity-123',
        applicantId,
        activityType: 'RAPID_SUBMISSIONS'
      });
      mockPrisma.monitoringAlert.create.mockResolvedValue({
        id: 'alert-123',
        applicantId
      });

      await monitoringService.monitorUserActivity(applicantId, activityData);

      expect(mockPrisma.suspiciousActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          applicantId,
          activityType: 'RAPID_SUBMISSIONS',
          severity: 'MEDIUM'
        })
      });
      expect(mockPrisma.monitoringAlert.create).toHaveBeenCalled();
    });

    it('should detect behavioral anomalies', async () => {
      const applicantId = 'anomalous-user';
      const activityData = {
        sessionDuration: 60, // Very short session
        interactionMetrics: {
          clickPatterns: [50, 50, 50, 50], // Too consistent
          typingSpeed: 300, // Unusually fast
          pausePatterns: [100, 100, 100, 100] // No variation
        }
      };

      // Set up behavioral baseline
      const baseline = {
        applicantId,
        sessionDuration: [1800, 2100, 1950], // Normal durations
        clickPatterns: [],
        navigationPaths: [],
        typingPatterns: [],
        timePatterns: [],
        deviceFingerprints: [],
        ipAddresses: []
      };

      // Mock the baseline exists
      (monitoringService as any).behavioralBaselines.set(applicantId, baseline);

      mockPrisma.documentVerificationLog.count.mockResolvedValue(1);
      mockPrisma.suspiciousActivity.create.mockResolvedValue({
        id: 'behavioral-anomaly-123',
        applicantId,
        activityType: 'BEHAVIORAL_ANOMALY'
      });
      mockPrisma.monitoringAlert.create.mockResolvedValue({
        id: 'behavioral-alert-123',
        applicantId
      });

      await monitoringService.monitorUserActivity(applicantId, activityData);

      expect(mockPrisma.suspiciousActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          applicantId,
          activityType: 'BEHAVIORAL_ANOMALY'
        })
      });
    });

    it('should detect suspicious network activity', async () => {
      const applicantId = 'network-suspicious-user';
      const activityData = {};
      const networkData = {
        ipAddress: '10.0.0.1', // Private IP
        location: 'Unknown',
        isp: 'Suspicious ISP',
        isProxy: true,
        isVPN: true,
        riskScore: 0.9,
        previousSessions: 0,
        concurrentSessions: 5,
        locationConsistency: 0.1,
        accessPatterns: [],
        suspiciousConnections: [],
        deviceFingerprint: 'test-device-fingerprint'
      };

      mockPrisma.documentVerificationLog.count.mockResolvedValue(1);
      mockPrisma.userSession.findMany.mockResolvedValue([
        { location: 'New York' },
        { location: 'London' },
        { location: 'Tokyo' }
      ]);
      mockPrisma.suspiciousActivity.create.mockResolvedValue({
        id: 'network-suspicious-123',
        applicantId,
        activityType: 'SUSPICIOUS_IP'
      });
      mockPrisma.monitoringAlert.create.mockResolvedValue({
        id: 'network-alert-123',
        applicantId
      });

      await monitoringService.monitorUserActivity(applicantId, activityData, networkData);

      expect(mockPrisma.suspiciousActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          applicantId,
          activityType: 'SUSPICIOUS_IP',
          severity: 'HIGH'
        })
      });
    });
  });

  describe('getSuspiciousActivities', () => {
    it('should retrieve suspicious activities for an applicant', async () => {
      const applicantId = 'test-applicant';
      const mockActivities = [
        {
          id: 'activity-1',
          applicantId,
          activityType: 'RAPID_SUBMISSIONS',
          severity: 'MEDIUM',
          description: 'Rapid submissions detected',
          evidence: JSON.stringify([]),
          riskScore: 0.6,
          detectedAt: new Date(),
          status: 'ACTIVE',
          investigatorId: null,
          resolution: null,
          metadata: JSON.stringify({})
        }
      ];

      mockPrisma.suspiciousActivity.findMany.mockResolvedValue(mockActivities);

      const result = await monitoringService.getSuspiciousActivities(applicantId);

      expect(result).toHaveLength(1);
      expect(result[0].applicantId).toBe(applicantId);
      expect(result[0].activityType).toBe('RAPID_SUBMISSIONS');
      expect(mockPrisma.suspiciousActivity.findMany).toHaveBeenCalledWith({
        where: { applicantId },
        orderBy: { detectedAt: 'desc' }
      });
    });
  });

  describe('getMonitoringAlerts', () => {
    it('should retrieve monitoring alerts', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          applicantId: 'test-applicant',
          alertType: 'RAPID_SUBMISSIONS',
          severity: 'MEDIUM',
          title: 'Rapid Submissions Alert',
          description: 'Multiple rapid submissions detected',
          evidence: JSON.stringify([]),
          recommendedActions: JSON.stringify(['Review submission timeline']),
          createdAt: new Date(),
          acknowledgedAt: null,
          acknowledgedBy: null,
          status: 'PENDING'
        }
      ];

      mockPrisma.monitoringAlert.findMany.mockResolvedValue(mockAlerts);

      const result = await monitoringService.getMonitoringAlerts();

      expect(result).toHaveLength(1);
      expect(result[0].alertType).toBe('RAPID_SUBMISSIONS');
      expect(result[0].status).toBe('PENDING');
    });

    it('should filter alerts by status', async () => {
      mockPrisma.monitoringAlert.findMany.mockResolvedValue([]);

      await monitoringService.getMonitoringAlerts('PENDING');

      expect(mockPrisma.monitoringAlert.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge a monitoring alert', async () => {
      const alertId = 'alert-123';
      const acknowledgedBy = 'admin-user';

      mockPrisma.monitoringAlert.update.mockResolvedValue({
        id: alertId,
        status: 'ACKNOWLEDGED'
      });

      await monitoringService.acknowledgeAlert(alertId, acknowledgedBy);

      expect(mockPrisma.monitoringAlert.update).toHaveBeenCalledWith({
        where: { id: alertId },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedAt: expect.any(Date),
          acknowledgedBy
        }
      });
    });
  });
});

describe('Integration Tests', () => {
  let documentVerificationService: DocumentVerificationService;
  let fraudDetectionService: FraudDetectionService;
  let identityVerificationService: IdentityVerificationService;
  let monitoringService: SuspiciousActivityMonitoringService;

  beforeEach(() => {
    documentVerificationService = new DocumentVerificationService(mockPrisma);
    fraudDetectionService = new FraudDetectionService(mockPrisma);
    identityVerificationService = new IdentityVerificationService(mockPrisma);
    monitoringService = new SuspiciousActivityMonitoringService(mockPrisma);
    jest.clearAllMocks();
  });

  it('should integrate document verification with fraud detection', async () => {
    const applicantId = 'integration-test-applicant';
    const mockDocument = Buffer.from('Mock document content');
    const documentType = 'transcript';

    // Mock document verification
    mockPrisma.documentVerificationLog.create.mockResolvedValue({
      id: 'doc-log-123',
      applicantId,
      isAuthentic: false,
      confidence: 0.3
    });

    // Mock fraud detection
    mockPrisma.documentVerificationLog.findMany.mockResolvedValue([]);
    mockPrisma.fraudAnalysisLog.create.mockResolvedValue({
      id: 'fraud-log-123',
      applicantId,
      overallRiskScore: 0.8
    });
    mockPrisma.fraudAlert.create.mockResolvedValue({
      id: 'fraud-alert-123',
      applicantId
    });

    // Verify document
    const verificationResult = await documentVerificationService.verifyDocumentAuthenticity(
      mockDocument,
      documentType,
      applicantId
    );

    // Analyze fraud risk based on verification result
    const applicationData = {
      documents: [{ 
        hash: verificationResult.metadata.fileHash,
        metadata: verificationResult.metadata 
      }],
      personalInfo: { name: 'Test User' },
      behaviorData: {}
    };

    const fraudResult = await fraudDetectionService.analyzeFraudRisk(applicantId, applicationData);

    expect(verificationResult.isAuthentic).toBe(false);
    expect(fraudResult.overallRiskScore).toBeGreaterThan(0.5);
    expect(fraudResult.requiresManualReview).toBe(true);
  });

  it('should integrate identity verification with suspicious activity monitoring', async () => {
    const applicantId = 'identity-monitoring-test';
    
    // Mock identity verification failure
    const identityRequest = {
      applicantId,
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        nationality: 'US',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          postalCode: '12345',
          country: 'USA'
        },
        phoneNumber: '+1-555-123-4567',
        email: 'john.doe@example.com'
      },
      documents: [],
      verificationLevel: 'BASIC' as const
    };

    mockPrisma.identityVerificationResult.create.mockResolvedValue({
      id: 'identity-result-456',
      applicantId,
      isVerified: false
    });

    // Mock suspicious activity monitoring
    mockPrisma.documentVerificationLog.count.mockResolvedValue(1);
    mockPrisma.suspiciousActivity.create.mockResolvedValue({
      id: 'suspicious-456',
      applicantId,
      activityType: 'IDENTITY_MISMATCH'
    });
    mockPrisma.monitoringAlert.create.mockResolvedValue({
      id: 'alert-456',
      applicantId
    });

    // Perform identity verification
    const identityResult = await identityVerificationService.verifyIdentity(identityRequest);

    // Monitor activity based on failed identity verification
    const activityData = {
      identityVerificationFailed: true,
      verificationConfidence: identityResult.overallConfidence
    };

    await monitoringService.monitorUserActivity(applicantId, activityData);

    expect(identityResult.isVerified).toBe(false);
    // Monitoring should detect the failed identity verification as suspicious
    expect(mockPrisma.suspiciousActivity.create).toHaveBeenCalled();
  });
});