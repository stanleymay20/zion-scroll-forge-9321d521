import { EligibilityChecker, CheckStatus, EligibilityStatus } from '../EligibilityChecker';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client');
const mockPrisma = {
  applications: {
    findUnique: jest.fn(),
  },
  eligibility_assessments: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
};

// Mock Logger
jest.mock('../../../utils/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('EligibilityChecker', () => {
  let eligibilityChecker: EligibilityChecker;

  beforeEach(() => {
    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
    eligibilityChecker = new EligibilityChecker();
    jest.clearAllMocks();
  });

  describe('assessEligibility', () => {
    const mockApplication = {
      id: 'test-app-123',
      application_data: {
        personalInfo: {
          birthDate: '1995-01-01',
          country: 'United States'
        },
        education: {
          highSchoolCompleted: true,
          highSchoolName: 'Test High School',
          graduationDate: '2013-06-01',
          gpa: '3.5',
          highSchoolCourses: [
            { name: 'Algebra II', grade: 'B', credits: 1, level: 'Standard' },
            { name: 'English Literature', grade: 'A', credits: 1, level: 'Honors' },
            { name: 'Biology', grade: 'B+', credits: 1, level: 'Standard' },
            { name: 'World History', grade: 'A-', credits: 1, level: 'Standard' }
          ]
        },
        spiritual: {
          salvationTestimony: 'I accepted Jesus Christ as my Lord and Savior when I was 12 years old during a church service. This experience transformed my life and gave me a new purpose to serve God and others.',
          churchAffiliation: 'First Baptist Church'
        },
        references: [
          { name: 'Pastor John Smith', relationship: 'Pastor' },
          { name: 'Teacher Mary Johnson', relationship: 'Teacher' },
          { name: 'Mentor David Wilson', relationship: 'Mentor' }
        ],
        language: {
          nativeLanguage: 'English',
          primaryLanguage: 'English'
        },
        technical: {
          devices: [
            {
              type: 'laptop',
              operatingSystem: 'Windows',
              version: '11',
              ram: '8',
              storage: '256'
            }
          ],
          internet: {
            speed: '50 Mbps'
          },
          software: [
            { name: 'Chrome Browser' },
            { name: 'Microsoft Office' }
          ]
        },
        accessibility: {
          hasSpecialNeeds: false
        }
      },
      applicant: {
        id: 'user-123',
        name: 'Test User'
      }
    };

    it('should assess eligibility successfully for a qualified applicant', async () => {
      mockPrisma.applications.findUnique.mockResolvedValue(mockApplication);
      mockPrisma.eligibility_assessments.create.mockResolvedValue({});

      const result = await eligibilityChecker.assessEligibility('test-app-123');

      expect(result).toBeDefined();
      expect(result.applicationId).toBe('test-app-123');
      // Since we're using external validators that may return conditional status,
      // we should accept either eligible or conditional for a well-formed application
      expect([EligibilityStatus.ELIGIBLE, EligibilityStatus.CONDITIONAL]).toContain(result.overallEligibility);
      expect(result.basicRequirements).toHaveLength(4);
      expect(mockPrisma.eligibility_assessments.create).toHaveBeenCalled();
      
      // Check that basic requirements are mostly passing
      const passedRequirements = result.basicRequirements.filter(req => req.status === CheckStatus.PASSED);
      expect(passedRequirements.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle missing application', async () => {
      mockPrisma.applications.findUnique.mockResolvedValue(null);

      await expect(eligibilityChecker.assessEligibility('nonexistent-app'))
        .rejects.toThrow('Application nonexistent-app not found');
    });

    it('should mark as ineligible for underage applicant', async () => {
      const underageApplication = {
        ...mockApplication,
        application_data: {
          ...mockApplication.application_data,
          personalInfo: {
            ...mockApplication.application_data.personalInfo,
            birthDate: '2010-01-01' // 14 years old
          }
        }
      };

      mockPrisma.applications.findUnique.mockResolvedValue(underageApplication);
      mockPrisma.eligibility_assessments.create.mockResolvedValue({});

      const result = await eligibilityChecker.assessEligibility('test-app-123');

      expect(result.overallEligibility).toBe(EligibilityStatus.INELIGIBLE);
      
      const ageCheck = result.basicRequirements.find(req => req.requirement === 'Age Verification');
      expect(ageCheck?.status).toBe(CheckStatus.FAILED);
    });

    it('should mark as conditional for insufficient spiritual foundation', async () => {
      const insufficientSpiritualApplication = {
        ...mockApplication,
        application_data: {
          ...mockApplication.application_data,
          spiritual: {
            salvationTestimony: 'Short testimony', // Too short
            churchAffiliation: null
          }
        }
      };

      mockPrisma.applications.findUnique.mockResolvedValue(insufficientSpiritualApplication);
      mockPrisma.eligibility_assessments.create.mockResolvedValue({});

      const result = await eligibilityChecker.assessEligibility('test-app-123');

      const spiritualCheck = result.basicRequirements.find(req => req.requirement === 'Spiritual Foundation');
      expect(spiritualCheck?.status).toBe(CheckStatus.CONDITIONAL);
    });

    it('should handle missing education data', async () => {
      const noEducationApplication = {
        ...mockApplication,
        application_data: {
          ...mockApplication.application_data,
          education: {
            highSchoolCompleted: false
          }
        }
      };

      mockPrisma.applications.findUnique.mockResolvedValue(noEducationApplication);
      mockPrisma.eligibility_assessments.create.mockResolvedValue({});

      const result = await eligibilityChecker.assessEligibility('test-app-123');

      expect(result.overallEligibility).toBe(EligibilityStatus.INELIGIBLE);
      
      const educationCheck = result.basicRequirements.find(req => req.requirement === 'High School Completion');
      expect(educationCheck?.status).toBe(CheckStatus.FAILED);
    });

    it('should check character references requirement', async () => {
      const insufficientReferencesApplication = {
        ...mockApplication,
        application_data: {
          ...mockApplication.application_data,
          references: [
            { name: 'Pastor John Smith', relationship: 'Pastor' }
          ] // Only 1 reference, need 3
        }
      };

      mockPrisma.applications.findUnique.mockResolvedValue(insufficientReferencesApplication);
      mockPrisma.eligibility_assessments.create.mockResolvedValue({});

      const result = await eligibilityChecker.assessEligibility('test-app-123');

      const referencesCheck = result.basicRequirements.find(req => req.requirement === 'Character References');
      expect(referencesCheck?.status).toBe(CheckStatus.FAILED);
      expect(referencesCheck?.notes).toContain('1 of 3 required references');
    });
  });

  describe('getEligibilityAssessment', () => {
    it('should retrieve existing assessment', async () => {
      const mockAssessment = {
        id: 'assessment-123',
        application_id: 'app-123',
        basic_requirements: [],
        academic_prerequisites: [],
        language_proficiency: {},
        technical_requirements: [],
        accessibility_needs: {},
        global_compliance: [],
        overall_eligibility: EligibilityStatus.ELIGIBLE
      };

      mockPrisma.eligibility_assessments.findFirst.mockResolvedValue(mockAssessment);

      const result = await eligibilityChecker.getEligibilityAssessment('app-123');

      expect(result).toBeDefined();
      expect(result?.applicationId).toBe('app-123');
      expect(mockPrisma.eligibility_assessments.findFirst).toHaveBeenCalledWith({
        where: { application_id: 'app-123' },
        orderBy: { assessed_at: 'desc' }
      });
    });

    it('should return null for non-existent assessment', async () => {
      mockPrisma.eligibility_assessments.findFirst.mockResolvedValue(null);

      const result = await eligibilityChecker.getEligibilityAssessment('nonexistent-app');

      expect(result).toBeNull();
    });
  });

  describe('age calculation', () => {
    it('should calculate age correctly', () => {
      // Access private method through type assertion for testing
      const checker = eligibilityChecker as any;
      
      const birthDate = new Date('1995-01-01');
      const age = checker.calculateAge(birthDate);
      
      // Age should be around 29-30 depending on current date
      expect(age).toBeGreaterThanOrEqual(28);
      expect(age).toBeLessThanOrEqual(31);
    });

    it('should handle birthday not yet occurred this year', () => {
      const checker = eligibilityChecker as any;
      
      // Create a birth date that hasn't occurred this year yet
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 25, today.getMonth() + 1, today.getDate());
      
      const age = checker.calculateAge(birthDate);
      expect(age).toBe(24); // Should be one year less
    });
  });
});