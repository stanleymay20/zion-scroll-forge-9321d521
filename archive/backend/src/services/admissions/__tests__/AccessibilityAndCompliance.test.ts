import { AccessibilityAssessmentService } from '../AccessibilityAssessmentService';
import { GlobalComplianceChecker } from '../GlobalComplianceChecker';
import { CheckStatus } from '../EligibilityChecker';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client');
const mockPrisma = {
  applications: {
    findUnique: jest.fn(),
  },
  accommodation_plans: {
    create: jest.fn(),
  },
  compliance_assessments: {
    create: jest.fn(),
  },
  eligibility_appeals: {
    create: jest.fn(),
  },
};

// Mock Logger
jest.mock('../../../utils/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('AccessibilityAssessmentService', () => {
  let accessibilityService: AccessibilityAssessmentService;

  beforeEach(() => {
    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
    accessibilityService = new AccessibilityAssessmentService();
    jest.clearAllMocks();
  });

  describe('assessAccessibilityNeeds', () => {
    const mockApplicationWithAccessibilityNeeds = {
      id: 'test-app-123',
      application_data: {
        accessibility: {
          hasSpecialNeeds: true,
          disabilities: [
            {
              type: 'Visual',
              description: 'Legally blind, uses screen reader',
              severity: 'high'
            }
          ],
          accommodationsRequested: [
            {
              type: 'Alternative Format Materials',
              description: 'All materials in accessible digital format',
              priority: 'high'
            }
          ],
          assistiveTechnologyUsed: [
            {
              name: 'JAWS Screen Reader',
              type: 'Screen Reader',
              essential: true
            }
          ]
        }
      }
    };

    it('should assess accessibility needs successfully', async () => {
      mockPrisma.applications.findUnique.mockResolvedValue(mockApplicationWithAccessibilityNeeds);
      mockPrisma.accommodation_plans.create.mockResolvedValue({});

      const result = await accessibilityService.assessAccessibilityNeeds('test-app-123');

      expect(result).toBeDefined();
      expect(result.applicationId).toBe('test-app-123');
      expect(result.needs.length).toBeGreaterThan(0);
      expect(result.recommendedAccommodations.length).toBeGreaterThan(0);
      // Status should be either passed or pending for valid accessibility needs
      expect([CheckStatus.PASSED, CheckStatus.PENDING]).toContain(result.status);
      expect(mockPrisma.accommodation_plans.create).toHaveBeenCalled();
    });

    it('should handle application with no accessibility needs', async () => {
      const mockApplicationNoNeeds = {
        id: 'test-app-456',
        application_data: {
          accessibility: {
            hasSpecialNeeds: false
          }
        }
      };

      mockPrisma.applications.findUnique.mockResolvedValue(mockApplicationNoNeeds);
      mockPrisma.accommodation_plans.create.mockResolvedValue({});

      const result = await accessibilityService.assessAccessibilityNeeds('test-app-456');

      expect(result.needs).toHaveLength(0);
      expect(result.status).toBe(CheckStatus.PASSED);
      expect(result.totalEstimatedCost).toBe(0);
    });

    it('should categorize visual disability correctly', async () => {
      mockPrisma.applications.findUnique.mockResolvedValue(mockApplicationWithAccessibilityNeeds);
      mockPrisma.accommodation_plans.create.mockResolvedValue({});

      const result = await accessibilityService.assessAccessibilityNeeds('test-app-123');

      const visualNeed = result.needs.find(need => need.category === 'Visual');
      expect(visualNeed).toBeDefined();
      expect(visualNeed?.accommodations).toContain('Alternative Format Materials');
      expect(visualNeed?.assistiveTechnology).toContain('Screen Readers');
    });

    it('should calculate total cost correctly', async () => {
      mockPrisma.applications.findUnique.mockResolvedValue(mockApplicationWithAccessibilityNeeds);
      mockPrisma.accommodation_plans.create.mockResolvedValue({});

      const result = await accessibilityService.assessAccessibilityNeeds('test-app-123');

      expect(result.totalEstimatedCost).toBeGreaterThan(0);
      expect(typeof result.totalEstimatedCost).toBe('number');
    });
  });

  describe('evaluateSpecialCircumstances', () => {
    it('should evaluate medical emergency correctly', async () => {
      const circumstances = [
        {
          type: 'Medical Emergency',
          description: 'Hospitalization during application period',
          severity: 'high'
        }
      ];

      const result = await accessibilityService.evaluateSpecialCircumstances('test-app-123', circumstances);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('Medical Emergency');
      expect(result[0].impact).toBe('high');
      expect(result[0].reviewRequired).toBe(true);
      expect(result[0].accommodationsRequired).toContain('Extended Deadlines');
    });

    it('should evaluate financial hardship correctly', async () => {
      const circumstances = [
        {
          type: 'Financial Hardship',
          description: 'Job loss affecting ability to pay tuition'
        }
      ];

      const result = await accessibilityService.evaluateSpecialCircumstances('test-app-123', circumstances);

      expect(result[0].accommodationsRequired).toContain('Payment Plan Options');
      expect(result[0].documentation).toContain('Financial Statements');
    });
  });
});

describe('GlobalComplianceChecker', () => {
  let complianceChecker: GlobalComplianceChecker;

  beforeEach(() => {
    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
    complianceChecker = new GlobalComplianceChecker();
    jest.clearAllMocks();
  });

  describe('assessGlobalCompliance', () => {
    const mockEUApplication = {
      id: 'test-app-eu-123',
      application_data: {
        personalInfo: {
          birthDate: '1995-01-01',
          country: 'Germany'
        },
        studyLocation: 'United States'
      }
    };

    const mockUSApplication = {
      id: 'test-app-us-123',
      application_data: {
        personalInfo: {
          birthDate: '2010-01-01', // Minor
          country: 'United States'
        },
        studyLocation: 'United States'
      }
    };

    it('should assess EU applicant compliance correctly', async () => {
      mockPrisma.applications.findUnique.mockResolvedValue(mockEUApplication);
      mockPrisma.compliance_assessments.create.mockResolvedValue({});

      const result = await complianceChecker.assessGlobalCompliance('test-app-eu-123');

      expect(result).toBeDefined();
      expect(result.applicantCountry).toBe('Germany');
      expect(result.studyLocation).toBe('United States');
      expect(result.regionalCompliance.length).toBeGreaterThan(0);
      
      // Should have GDPR compliance
      const gdprCheck = result.regionalCompliance.find(check => 
        check.requirement.includes('GDPR')
      );
      expect(gdprCheck).toBeDefined();
      expect(gdprCheck?.status).toBe(CheckStatus.PASSED);
    });

    it('should assess US minor applicant correctly', async () => {
      mockPrisma.applications.findUnique.mockResolvedValue(mockUSApplication);
      mockPrisma.compliance_assessments.create.mockResolvedValue({});

      const result = await complianceChecker.assessGlobalCompliance('test-app-us-123');

      // Should have COPPA compliance check
      const coppaCheck = result.regionalCompliance.find(check => 
        check.requirement.includes('COPPA')
      );
      expect(coppaCheck).toBeDefined();
    });

    it('should identify international student requirements', async () => {
      mockPrisma.applications.findUnique.mockResolvedValue(mockEUApplication);
      mockPrisma.compliance_assessments.create.mockResolvedValue({});

      const result = await complianceChecker.assessGlobalCompliance('test-app-eu-123');

      // German student studying in US should have visa requirements
      expect(result.internationalRequirements.length).toBeGreaterThan(0);
      const visaReq = result.internationalRequirements.find(req => 
        req.visaType.includes('F-1')
      );
      expect(visaReq).toBeDefined();
    });

    it('should assess data protection compliance', async () => {
      mockPrisma.applications.findUnique.mockResolvedValue(mockEUApplication);
      mockPrisma.compliance_assessments.create.mockResolvedValue({});

      const result = await complianceChecker.assessGlobalCompliance('test-app-eu-123');

      expect(result.dataProtectionCompliance).toBeDefined();
      expect(result.dataProtectionCompliance.applicableLaws).toContain('GDPR');
      expect(result.dataProtectionCompliance.status).toBe(CheckStatus.PASSED);
    });

    it('should calculate compliance costs correctly', async () => {
      mockPrisma.applications.findUnique.mockResolvedValue(mockEUApplication);
      mockPrisma.compliance_assessments.create.mockResolvedValue({});

      const result = await complianceChecker.assessGlobalCompliance('test-app-eu-123');

      expect(result.estimatedComplianceCost).toBeGreaterThan(0);
      expect(typeof result.estimatedComplianceCost).toBe('number');
    });

    it('should generate appropriate recommendations', async () => {
      mockPrisma.applications.findUnique.mockResolvedValue(mockEUApplication);
      mockPrisma.compliance_assessments.create.mockResolvedValue({});

      const result = await complianceChecker.assessGlobalCompliance('test-app-eu-123');

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(rec => 
        rec.includes('visa') || rec.includes('documentation')
      )).toBe(true);
    });
  });

  describe('processEligibilityAppeal', () => {
    it('should process appeal correctly', async () => {
      mockPrisma.eligibility_appeals.create.mockResolvedValue({});

      const appealData = {
        reason: 'Medical circumstances affected application completion',
        documentation: ['Medical Records', 'Doctor Statement'],
        additionalInfo: 'Hospitalization during application period'
      };

      const result = await complianceChecker.processEligibilityAppeal('test-app-123', appealData);

      expect(result).toBeDefined();
      expect(result.applicationId).toBe('test-app-123');
      expect(result.appealReason).toBe(appealData.reason);
      expect(result.appealStatus).toBe('submitted');
      expect(result.reviewTimeline).toBe('5-10 business days');
      expect(mockPrisma.eligibility_appeals.create).toHaveBeenCalled();
    });
  });

  describe('credential recognition assessment', () => {
    it('should require credential recognition for international students', async () => {
      const mockInternationalApplication = {
        id: 'test-app-intl-123',
        application_data: {
          personalInfo: {
            birthDate: '1995-01-01',
            country: 'India'
          },
          studyLocation: 'United States',
          education: {
            highSchoolCompleted: true,
            country: 'India'
          }
        }
      };

      mockPrisma.applications.findUnique.mockResolvedValue(mockInternationalApplication);
      mockPrisma.compliance_assessments.create.mockResolvedValue({});

      const result = await complianceChecker.assessGlobalCompliance('test-app-intl-123');

      expect(result.educationCredentialRecognition.recognitionRequired).toBe(true);
      expect(result.educationCredentialRecognition.cost).toBeGreaterThan(0);
      expect(result.educationCredentialRecognition.recognizingBody).toContain('WES');
    });

    it('should not require credential recognition for domestic students', async () => {
      const mockDomesticApplication = {
        id: 'test-app-domestic-123',
        application_data: {
          personalInfo: {
            birthDate: '1995-01-01',
            country: 'United States'
          },
          studyLocation: 'United States',
          education: {
            highSchoolCompleted: true,
            country: 'United States'
          }
        }
      };

      mockPrisma.applications.findUnique.mockResolvedValue(mockDomesticApplication);
      mockPrisma.compliance_assessments.create.mockResolvedValue({});

      const result = await complianceChecker.assessGlobalCompliance('test-app-domestic-123');

      expect(result.educationCredentialRecognition.recognitionRequired).toBe(false);
      expect(result.educationCredentialRecognition.cost).toBe(0);
    });
  });
});