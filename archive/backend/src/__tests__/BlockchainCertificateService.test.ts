/**
 * Comprehensive Tests for Blockchain Certificate Operations
 * "We test with the precision of divine truth and empirical rigor"
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  BlockchainCertificateService, 
  CertificateIssuanceRequest, 
  CertificateType, 
  CertificateStatus,
  ValidationStatus,
  CertificateRenewalRequest,
  CertificateRevocationRequest
} from '../services/BlockchainCertificateService';
import { ScrollAccreditationBlockchainService } from '../services/ScrollAccreditationBlockchainService';
import { IPFSService } from '../services/IPFSService';

// Mock the dependencies
jest.mock('../services/ScrollAccreditationBlockchainService');
jest.mock('../services/IPFSService');

describe('BlockchainCertificateService', () => {
  let certificateService: BlockchainCertificateService;
  let mockBlockchainService: jest.Mocked<ScrollAccreditationBlockchainService>;
  let mockIPFSService: jest.Mocked<IPFSService>;

  const mockInstitutionId = 'SCROLL_UNIVERSITY_001';
  const mockRecipientAddress = '0x1234567890123456789012345678901234567890';
  const mockCertificateData = {
    title: 'Bachelor of Scroll Engineering (B.Scroll)',
    description: 'Comprehensive degree in kingdom-aligned engineering principles',
    achievements: [
      {
        id: 'ACH_001',
        title: 'Prophetic Defense Excellence',
        description: 'Successfully defended thesis on divine algorithms',
        dateAchieved: new Date('2024-12-01'),
        evidence: ['ipfs://evidence1', 'ipfs://evidence2'],
        verificationStatus: 'verified' as const
      }
    ],
    competencies: [
      {
        domain: 'Spiritual Engineering',
        level: 'advanced' as const,
        skills: ['Divine Algorithm Design', 'Prophetic System Architecture'],
        assessmentResults: [
          {
            assessmentId: 'ASSESS_001',
            score: 95,
            maxScore: 100,
            assessmentDate: new Date('2024-11-15'),
            assessorId: 'PROF_001'
          }
        ]
      }
    ],
    spiritualAlignment: {
      revelationIntegrity: 98,
      kingdomPrinciples: ['Truth', 'Justice', 'Mercy', 'Wisdom'],
      propheticDefenseOutcome: {
        defenseDate: new Date('2024-12-01'),
        topic: 'Divine Algorithms in Modern Computing',
        outcome: 'passed' as const,
        score: 95,
        feedback: 'Exceptional integration of spiritual and technical principles',
        validators: ['PROPHET_001', 'PROPHET_002']
      },
      spiritualGrowthMetrics: [
        {
          metric: 'Prophetic Understanding',
          value: 92,
          measurementDate: new Date('2024-12-01'),
          notes: 'Significant growth in discernment'
        }
      ]
    },
    empiricalEvidence: {
      dataQuality: 96,
      reproducibility: 94,
      methodologicalRigor: 98,
      peerReviewStatus: 'reviewed' as const,
      citations: [
        {
          title: 'Divine Algorithms: A New Paradigm',
          authors: ['Dr. Scroll', 'Prof. Kingdom'],
          publication: 'Journal of Spiritual Computing',
          year: 2024,
          doi: '10.1000/scroll.2024.001'
        }
      ],
      datasets: [
        {
          name: 'Prophetic Accuracy Dataset',
          source: 'ScrollResearch Institute',
          accessDate: new Date('2024-11-01'),
          checksum: 'sha256:abcd1234...'
        }
      ]
    },
    metadata: {
      graduationDate: '2024-12-15',
      honors: 'Summa Cum Laude',
      specializations: ['Divine Computing', 'Prophetic Systems']
    }
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create service instance
    certificateService = new BlockchainCertificateService();
    
    // Get mock instances
    mockBlockchainService = jest.mocked(ScrollAccreditationBlockchainService.prototype);
    mockIPFSService = jest.mocked(IPFSService.prototype);

    // Setup default mock responses
    mockBlockchainService.isInstitutionAccredited.mockResolvedValue(true);
    mockIPFSService.uploadAccreditationDocument.mockResolvedValue({
      hash: 'QmTestHash123',
      url: 'https://ipfs.io/ipfs/QmTestHash123',
      size: 1024,
      timestamp: new Date()
    });
    mockBlockchainService.issueCredential.mockResolvedValue({
      credentialId: 'CERT_TEST123',
      studentAddress: mockRecipientAddress,
      institutionId: mockInstitutionId,
      credentialType: 1,
      blockchainHash: '0xabcd1234...',
      smartContractAddress: '0x9876543210...',
      verificationUrl: 'https://scrolluniversity.com/verify/CERT_TEST123',
      issueDate: new Date(),
      status: 0,
      metadata: {}
    });
    mockBlockchainService.generateVerificationUrl.mockReturnValue('https://scrolluniversity.com/verify/CERT_TEST123');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Certificate Issuance', () => {
    it('should successfully issue a certificate with all required components', async () => {
      const request: CertificateIssuanceRequest = {
        institutionId: mockInstitutionId,
        certificateType: CertificateType.B_SCROLL_CERTIFICATION,
        recipientAddress: mockRecipientAddress,
        certificateData: mockCertificateData,
        validityPeriod: 60, // 5 years
        requiresJointValidation: true
      };

      const result = await certificateService.issueCertificate(request);

      expect(result).toBeDefined();
      expect(result.certificateId).toMatch(/^CERT_[A-F0-9]{16}$/);
      expect(result.status).toBe(CertificateStatus.PENDING_VALIDATION);
      expect(result.validationStatus).toBe(ValidationStatus.PENDING);
      expect(result.blockchainHash).toBe('0xabcd1234...');
      expect(result.ipfsHash).toBe('QmTestHash123');
      expect(result.verificationUrl).toContain('verify');
      expect(result.qrCode).toBeDefined();

      // Verify blockchain service was called correctly
      expect(mockBlockchainService.isInstitutionAccredited).toHaveBeenCalledWith(mockInstitutionId);
      expect(mockIPFSService.uploadAccreditationDocument).toHaveBeenCalled();
      expect(mockBlockchainService.issueCredential).toHaveBeenCalled();
    });

    it('should reject certificate issuance for non-accredited institution', async () => {
      mockBlockchainService.isInstitutionAccredited.mockResolvedValue(false);

      const request: CertificateIssuanceRequest = {
        institutionId: 'NON_ACCREDITED_INST',
        certificateType: CertificateType.SCROLL_TRANSCRIPT,
        recipientAddress: mockRecipientAddress,
        certificateData: mockCertificateData,
        requiresJointValidation: false
      };

      await expect(certificateService.issueCertificate(request)).rejects.toThrow(
        'Institution NON_ACCREDITED_INST is not accredited'
      );
    });

    it('should handle IPFS upload failure gracefully', async () => {
      mockIPFSService.uploadAccreditationDocument.mockRejectedValue(new Error('IPFS network error'));

      const request: CertificateIssuanceRequest = {
        institutionId: mockInstitutionId,
        certificateType: CertificateType.COURSE_COMPLETION,
        recipientAddress: mockRecipientAddress,
        certificateData: mockCertificateData,
        requiresJointValidation: false
      };

      await expect(certificateService.issueCertificate(request)).rejects.toThrow(
        'Failed to issue certificate: IPFS network error'
      );
    });

    it('should handle blockchain transaction failure', async () => {
      mockBlockchainService.issueCredential.mockRejectedValue(new Error('Insufficient gas'));

      const request: CertificateIssuanceRequest = {
        institutionId: mockInstitutionId,
        certificateType: CertificateType.INNOVATION_CERTIFICATE,
        recipientAddress: mockRecipientAddress,
        certificateData: mockCertificateData,
        requiresJointValidation: false
      };

      await expect(certificateService.issueCertificate(request)).rejects.toThrow(
        'Failed to issue certificate: Insufficient gas'
      );
    });

    it('should issue certificate without joint validation for course completion', async () => {
      const request: CertificateIssuanceRequest = {
        institutionId: mockInstitutionId,
        certificateType: CertificateType.COURSE_COMPLETION,
        recipientAddress: mockRecipientAddress,
        certificateData: mockCertificateData,
        requiresJointValidation: false
      };

      const result = await certificateService.issueCertificate(request);

      expect(result.status).toBe(CertificateStatus.ACTIVE);
      expect(result.validationStatus).toBe(ValidationStatus.BOTH_APPROVED);
    });
  });

  describe('Smart Contract Deployment', () => {
    it('should return existing contract address when already deployed', async () => {
      process.env.SCROLL_CREDENTIAL_CONTRACT_ADDRESS = '0xContractAddress123';

      const contractAddress = await certificateService.deployAccreditationContract();

      expect(contractAddress).toBe('0xContractAddress123');
    });

    it('should throw error when contract address is not configured', async () => {
      delete process.env.SCROLL_CREDENTIAL_CONTRACT_ADDRESS;

      await expect(certificateService.deployAccreditationContract()).rejects.toThrow(
        'Smart contract not deployed'
      );
    });
  });

  describe('Immutable Storage Creation', () => {
    it('should create immutable storage with IPFS and blockchain', async () => {
      const certificateId = 'CERT_IMMUTABLE_TEST';
      
      const result = await certificateService.createImmutableStorage(certificateId, mockCertificateData);

      expect(result.ipfsHash).toBe('QmTestHash123');
      expect(mockIPFSService.uploadAccreditationDocument).toHaveBeenCalled();
      expect(mockIPFSService.pinDocument).toHaveBeenCalledWith('QmTestHash123');
    });

    it('should handle IPFS pinning failure', async () => {
      mockIPFSService.pinDocument.mockRejectedValue(new Error('Pinning failed'));

      await expect(
        certificateService.createImmutableStorage('CERT_PIN_FAIL', mockCertificateData)
      ).rejects.toThrow('Failed to create immutable storage: Pinning failed');
    });
  });

  describe('Public Verification System', () => {
    beforeEach(() => {
      // Mock certificate in service
      const mockCertificate = {
        certificateId: 'CERT_VERIFY_TEST',
        blockchainHash: '0xverifytest123',
        smartContractAddress: '0xcontract123',
        ipfsHash: 'QmVerifyTest123',
        verificationUrl: 'https://scrolluniversity.com/verify/CERT_VERIFY_TEST',
        qrCode: 'mock_qr_code',
        issueDate: new Date(),
        status: CertificateStatus.ACTIVE,
        validationStatus: ValidationStatus.BOTH_APPROVED
      };

      // Mock the getCertificate method
      jest.spyOn(certificateService, 'getCertificate').mockResolvedValue(mockCertificate);
    });

    it('should verify accreditation status with complete validation', async () => {
      mockBlockchainService.verifyCredential.mockResolvedValue({
        isValid: true,
        credentialType: 1,
        status: 0,
        validationStatus: 3,
        issueDate: new Date(),
        institutionId: mockInstitutionId
      });

      mockIPFSService.retrieveDocument.mockResolvedValue({
        content: mockCertificateData
      });

      mockIPFSService.verifyDocumentIntegrity.mockResolvedValue(true);

      const result = await certificateService.verifyAccreditationStatus('CERT_VERIFY_TEST');

      expect(result.isValid).toBe(true);
      expect(result.certificateData).toBeDefined();
      expect(result.blockchainVerification.isValid).toBe(true);
      expect(result.ipfsVerification.isValid).toBe(true);
      expect(result.validationHistory).toBeDefined();
    });

    it('should detect invalid certificates', async () => {
      mockBlockchainService.verifyCredential.mockResolvedValue({
        isValid: false,
        credentialType: 1,
        status: 2, // REVOKED
        validationStatus: 4, // REJECTED
        issueDate: new Date(),
        institutionId: mockInstitutionId
      });

      const result = await certificateService.verifyAccreditationStatus('CERT_INVALID_TEST');

      expect(result.isValid).toBe(false);
      expect(result.blockchainVerification.isValid).toBe(false);
    });

    it('should handle IPFS data integrity failure', async () => {
      mockBlockchainService.verifyCredential.mockResolvedValue({
        isValid: true,
        credentialType: 1,
        status: 0,
        validationStatus: 3,
        issueDate: new Date(),
        institutionId: mockInstitutionId
      });

      mockIPFSService.retrieveDocument.mockResolvedValue({
        content: mockCertificateData
      });

      mockIPFSService.verifyDocumentIntegrity.mockResolvedValue(false);

      const result = await certificateService.verifyAccreditationStatus('CERT_INTEGRITY_FAIL');

      expect(result.isValid).toBe(false);
      expect(result.ipfsVerification.isValid).toBe(false);
      expect(result.ipfsVerification.error).toBe('Data integrity check failed');
    });
  });

  describe('Certificate Renewal', () => {
    beforeEach(() => {
      // Mock existing certificate
      const existingCertificate = {
        certificateId: 'CERT_RENEWAL_TEST',
        blockchainHash: '0xrenewaltest123',
        smartContractAddress: mockRecipientAddress,
        ipfsHash: 'QmRenewalTest123',
        verificationUrl: 'https://scrolluniversity.com/verify/CERT_RENEWAL_TEST',
        qrCode: 'mock_qr_code',
        issueDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: CertificateStatus.ACTIVE,
        validationStatus: ValidationStatus.BOTH_APPROVED
      };

      jest.spyOn(certificateService, 'getCertificate').mockResolvedValue(existingCertificate);
      jest.spyOn(certificateService, 'verifyAccreditationStatus').mockResolvedValue({
        isValid: true,
        certificateData: { content: mockCertificateData },
        blockchainVerification: { isValid: true },
        ipfsVerification: { isValid: true },
        validationHistory: []
      });
    });

    it('should successfully renew a valid certificate', async () => {
      const renewalRequest: CertificateRenewalRequest = {
        certificateId: 'CERT_RENEWAL_TEST',
        newValidityPeriod: 36, // 3 years
        renewalReason: 'Standard renewal before expiry',
        updatedData: {
          metadata: {
            ...mockCertificateData.metadata,
            renewalDate: new Date().toISOString()
          }
        }
      };

      const result = await certificateService.renewCertificate(renewalRequest);

      expect(result.certificateId).toMatch(/^CERT_RENEWAL_TEST_renewed_\d+$/);
      expect(result.status).toBe(CertificateStatus.ACTIVE);
      expect(result.validationStatus).toBe(ValidationStatus.BOTH_APPROVED);
      expect(result.expiryDate).toBeDefined();
      
      // Verify new certificate was issued on blockchain
      expect(mockBlockchainService.issueCredential).toHaveBeenCalled();
      expect(mockIPFSService.uploadAccreditationDocument).toHaveBeenCalled();
    });

    it('should reject renewal of invalid certificate', async () => {
      jest.spyOn(certificateService, 'verifyAccreditationStatus').mockResolvedValue({
        isValid: false,
        certificateData: null,
        blockchainVerification: { isValid: false },
        ipfsVerification: { isValid: false },
        validationHistory: []
      });

      const renewalRequest: CertificateRenewalRequest = {
        certificateId: 'CERT_INVALID_RENEWAL',
        newValidityPeriod: 12,
        renewalReason: 'Attempted renewal of invalid certificate'
      };

      await expect(certificateService.renewCertificate(renewalRequest)).rejects.toThrow(
        'Cannot renew invalid certificate'
      );
    });

    it('should reject renewal of non-existent certificate', async () => {
      jest.spyOn(certificateService, 'getCertificate').mockResolvedValue(null);

      const renewalRequest: CertificateRenewalRequest = {
        certificateId: 'CERT_NONEXISTENT',
        newValidityPeriod: 12,
        renewalReason: 'Attempted renewal of non-existent certificate'
      };

      await expect(certificateService.renewCertificate(renewalRequest)).rejects.toThrow(
        'Certificate CERT_NONEXISTENT not found'
      );
    });
  });

  describe('Certificate Revocation', () => {
    beforeEach(() => {
      // Mock existing certificate
      const existingCertificate = {
        certificateId: 'CERT_REVOCATION_TEST',
        blockchainHash: '0xrevocationtest123',
        smartContractAddress: '0xcontract123',
        ipfsHash: 'QmRevocationTest123',
        verificationUrl: 'https://scrolluniversity.com/verify/CERT_REVOCATION_TEST',
        qrCode: 'mock_qr_code',
        issueDate: new Date(),
        status: CertificateStatus.ACTIVE,
        validationStatus: ValidationStatus.BOTH_APPROVED
      };

      jest.spyOn(certificateService, 'getCertificate').mockResolvedValue(existingCertificate);
    });

    it('should successfully revoke a certificate', async () => {
      const revocationRequest: CertificateRevocationRequest = {
        certificateId: 'CERT_REVOCATION_TEST',
        reason: 'Academic misconduct discovered',
        revokedBy: 'ADMIN_001',
        effectiveDate: new Date()
      };

      await certificateService.revokeCertificate(revocationRequest);

      // Verify blockchain revocation was called
      expect(mockBlockchainService.revokeCredential).toHaveBeenCalledWith(
        'CERT_REVOCATION_TEST',
        'Academic misconduct discovered'
      );

      // Verify revocation record was uploaded to IPFS
      expect(mockIPFSService.uploadAccreditationDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'revocation_CERT_REVOCATION_TEST',
          metadata: expect.objectContaining({
            type: 'REVOCATION_RECORD'
          })
        })
      );
    });

    it('should reject revocation of non-existent certificate', async () => {
      jest.spyOn(certificateService, 'getCertificate').mockResolvedValue(null);

      const revocationRequest: CertificateRevocationRequest = {
        certificateId: 'CERT_NONEXISTENT',
        reason: 'Test revocation',
        revokedBy: 'ADMIN_001'
      };

      await expect(certificateService.revokeCertificate(revocationRequest)).rejects.toThrow(
        'Certificate CERT_NONEXISTENT not found'
      );
    });

    it('should handle blockchain revocation failure', async () => {
      mockBlockchainService.revokeCredential.mockRejectedValue(new Error('Blockchain error'));

      const revocationRequest: CertificateRevocationRequest = {
        certificateId: 'CERT_REVOCATION_TEST',
        reason: 'Test revocation',
        revokedBy: 'ADMIN_001'
      };

      await expect(certificateService.revokeCertificate(revocationRequest)).rejects.toThrow(
        'Failed to revoke certificate: Blockchain error'
      );
    });
  });

  describe('Batch Operations', () => {
    it('should batch verify multiple certificates', async () => {
      const certificateIds = ['CERT_001', 'CERT_002', 'CERT_003'];
      
      mockBlockchainService.batchVerifyCredentials.mockResolvedValue([true, false, true]);

      const result = await certificateService.batchVerifyCertificates(certificateIds);

      expect(result).toEqual({
        'CERT_001': true,
        'CERT_002': false,
        'CERT_003': true
      });

      expect(mockBlockchainService.batchVerifyCredentials).toHaveBeenCalledWith(certificateIds);
    });

    it('should handle batch verification errors', async () => {
      mockBlockchainService.batchVerifyCredentials.mockRejectedValue(new Error('Batch error'));

      await expect(
        certificateService.batchVerifyCertificates(['CERT_001', 'CERT_002'])
      ).rejects.toThrow('Failed to batch verify certificates: Batch error');
    });
  });

  describe('Certificate Retrieval', () => {
    it('should get certificates for recipient', async () => {
      const mockCredentialIds = ['CERT_001', 'CERT_002'];
      mockBlockchainService.getStudentCredentials.mockResolvedValue(mockCredentialIds);

      const mockCertificates = [
        {
          certificateId: 'CERT_001',
          blockchainHash: '0xhash001',
          smartContractAddress: '0xcontract',
          ipfsHash: 'QmHash001',
          verificationUrl: 'https://verify/CERT_001',
          qrCode: 'qr001',
          issueDate: new Date(),
          status: CertificateStatus.ACTIVE,
          validationStatus: ValidationStatus.BOTH_APPROVED
        },
        {
          certificateId: 'CERT_002',
          blockchainHash: '0xhash002',
          smartContractAddress: '0xcontract',
          ipfsHash: 'QmHash002',
          verificationUrl: 'https://verify/CERT_002',
          qrCode: 'qr002',
          issueDate: new Date(),
          status: CertificateStatus.ACTIVE,
          validationStatus: ValidationStatus.BOTH_APPROVED
        }
      ];

      jest.spyOn(certificateService, 'getCertificate')
        .mockResolvedValueOnce(mockCertificates[0])
        .mockResolvedValueOnce(mockCertificates[1]);

      const result = await certificateService.getCertificatesForRecipient(mockRecipientAddress);

      expect(result).toHaveLength(2);
      expect(result[0].certificateId).toBe('CERT_001');
      expect(result[1].certificateId).toBe('CERT_002');
    });

    it('should handle empty certificate list for recipient', async () => {
      mockBlockchainService.getStudentCredentials.mockResolvedValue([]);

      const result = await certificateService.getCertificatesForRecipient(mockRecipientAddress);

      expect(result).toHaveLength(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network connectivity issues', async () => {
      mockBlockchainService.isInstitutionAccredited.mockRejectedValue(new Error('Network timeout'));

      const request: CertificateIssuanceRequest = {
        institutionId: mockInstitutionId,
        certificateType: CertificateType.SCROLL_TRANSCRIPT,
        recipientAddress: mockRecipientAddress,
        certificateData: mockCertificateData,
        requiresJointValidation: false
      };

      await expect(certificateService.issueCertificate(request)).rejects.toThrow(
        'Failed to issue certificate: Network timeout'
      );
    });

    it('should validate certificate ID format', async () => {
      const request: CertificateIssuanceRequest = {
        institutionId: mockInstitutionId,
        certificateType: CertificateType.DSGEI_DEGREE,
        recipientAddress: mockRecipientAddress,
        certificateData: mockCertificateData,
        requiresJointValidation: true
      };

      const result = await certificateService.issueCertificate(request);

      expect(result.certificateId).toMatch(/^CERT_[A-F0-9]{16}$/);
    });

    it('should handle malformed certificate data', async () => {
      const malformedData = {
        ...mockCertificateData,
        achievements: null, // Invalid data
        competencies: undefined // Invalid data
      };

      const request: CertificateIssuanceRequest = {
        institutionId: mockInstitutionId,
        certificateType: CertificateType.INNOVATION_CERTIFICATE,
        recipientAddress: mockRecipientAddress,
        certificateData: malformedData as any,
        requiresJointValidation: false
      };

      // Should still process but handle gracefully
      const result = await certificateService.issueCertificate(request);
      expect(result).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should complete full certificate lifecycle', async () => {
      // 1. Issue certificate
      const issuanceRequest: CertificateIssuanceRequest = {
        institutionId: mockInstitutionId,
        certificateType: CertificateType.B_SCROLL_CERTIFICATION,
        recipientAddress: mockRecipientAddress,
        certificateData: mockCertificateData,
        validityPeriod: 36,
        requiresJointValidation: true
      };

      const issuedCertificate = await certificateService.issueCertificate(issuanceRequest);
      expect(issuedCertificate.status).toBe(CertificateStatus.PENDING_VALIDATION);

      // 2. Verify certificate
      jest.spyOn(certificateService, 'getCertificate').mockResolvedValue(issuedCertificate);
      jest.spyOn(certificateService, 'verifyAccreditationStatus').mockResolvedValue({
        isValid: true,
        certificateData: { content: mockCertificateData },
        blockchainVerification: { isValid: true },
        ipfsVerification: { isValid: true },
        validationHistory: []
      });

      const verification = await certificateService.verifyAccreditationStatus(issuedCertificate.certificateId);
      expect(verification.isValid).toBe(true);

      // 3. Renew certificate
      const renewalRequest: CertificateRenewalRequest = {
        certificateId: issuedCertificate.certificateId,
        newValidityPeriod: 48,
        renewalReason: 'Standard renewal'
      };

      const renewedCertificate = await certificateService.renewCertificate(renewalRequest);
      expect(renewedCertificate.certificateId).not.toBe(issuedCertificate.certificateId);
      expect(renewedCertificate.status).toBe(CertificateStatus.ACTIVE);

      // 4. Revoke original certificate
      const revocationRequest: CertificateRevocationRequest = {
        certificateId: issuedCertificate.certificateId,
        reason: 'Replaced by renewed certificate',
        revokedBy: 'SYSTEM'
      };

      await expect(certificateService.revokeCertificate(revocationRequest)).resolves.not.toThrow();
    });
  });
});