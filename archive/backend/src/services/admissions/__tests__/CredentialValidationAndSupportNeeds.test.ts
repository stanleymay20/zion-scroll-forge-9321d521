import { PrismaClient } from '@prisma/client';
import { CredentialValidator, ValidationStatus, RecognitionStatus } from '../CredentialValidator';
import { SupportNeedsAssessor, SupportPriority } from '../SupportNeedsAssessor';
import { ReadinessLevel } from '../IntellectualReadinessAssessor';
import { SkillLevel, CoreSkill } from '../AcademicEvaluator';

// Mock Prisma Client
const mockPrisma = {
  application: {
    findUnique: jest.fn(),
  },
  credentialValidation: {
    create: jest.fn(),
  },
  supportNeedsAssessment: {
    create: jest.fn(),
  },
} as unknown as PrismaClient;

describe('Credential Validation and Support Needs Assessment', () => {
  let credentialValidator: CredentialValidator;
  let supportNeedsAssessor: SupportNeedsAssessor;
  let mockCredentialValidation: any;

  const mockApplication = {
    id: 'app_123',
    applicantId: 'user_456',
    applicationData: {
      education: [
        {
          institution: 'Test University',
          degree: 'Bachelor of Science',
          fieldOfStudy: 'Computer Science',
          gpa: 3.5,
          graduationDate: '2023-05-15',
          accreditation: 'ABET',
          transcriptVerified: true,
          country: 'United States'
        },
        {
          institution: 'International University',
          degree: 'Master of Engineering',
          fieldOfStudy: 'Software Engineering',
          gpa: 3.8,
          graduationDate: '2024-01-15',
          accreditation: 'Unknown',
          transcriptVerified: false,
          country: 'Canada'
        }
      ],
      certifications: [
        {
          name: 'AWS Certified Solutions Architect',
          issuer: 'Amazon Web Services',
          issueDate: '2023-06-01',
          expirationDate: '2026-06-01',
          credentialId: 'AWS-123456'
        },
        {
          name: 'Project Management Professional',
          issuer: 'PMI',
          issueDate: '2022-03-15',
          credentialId: 'PMI-789012'
        }
      ],
      disabilities: [
        {
          type: 'cognitive',
          subtype: 'dyslexia',
          accommodations: ['Extended time', 'Alternative formats'],
          assistiveTechnology: ['Text-to-speech software']
        }
      ],
      financialNeed: 'medium',
      internationalStudent: false,
      nativeLanguage: 'English',
      technologySkills: ['Python', 'JavaScript'],
      hasLaptop: false,
      timeManagement: false,
      digitalLiteracy: true,
      learningDisability: true
    },
    applicant: {
      id: 'user_456',
      name: 'John Doe'
    },
    documents: [
      {
        type: 'transcript',
        filename: 'transcript.pdf',
        uploadDate: '2024-01-01'
      }
    ]
  };

  const mockSkills = [
    {
      skill: CoreSkill.MATHEMATICS,
      currentLevel: SkillLevel.INTERMEDIATE,
      assessment: {
        score: 65,
        maxScore: 100,
        percentile: 65,
        strengths: ['Good problem solving'],
        weaknesses: ['Needs practice with advanced concepts'],
        recommendations: ['Take advanced math course']
      },
      developmentPlan: {
        targetLevel: SkillLevel.ADVANCED,
        recommendedCourses: ['Calculus II', 'Linear Algebra'],
        estimatedTimeframe: '6 months',
        prerequisites: ['Calculus I'],
        resources: ['Math tutoring', 'Online resources']
      }
    },
    {
      skill: CoreSkill.WRITTEN_COMMUNICATION,
      currentLevel: SkillLevel.BEGINNER,
      assessment: {
        score: 45,
        maxScore: 100,
        percentile: 45,
        strengths: ['Basic grammar'],
        weaknesses: ['Organization', 'Clarity'],
        recommendations: ['Writing workshop', 'Grammar review']
      },
      developmentPlan: {
        targetLevel: SkillLevel.INTERMEDIATE,
        recommendedCourses: ['Composition I', 'Technical Writing'],
        estimatedTimeframe: '4 months',
        prerequisites: [],
        resources: ['Writing center', 'Peer tutoring']
      }
    }
  ];

  const mockReadinessAssessment = {
    applicantId: 'user_456',
    overallReadiness: ReadinessLevel.CONDITIONALLY_READY,
    cognitiveReadiness: {
      abstractThinking: 70,
      logicalReasoning: 65,
      criticalAnalysis: 68,
      problemSolving: 72,
      informationProcessing: 75,
      memoryAndRetention: 60,
      attentionAndFocus: 55,
      overallCognitive: 66
    },
    academicPreparation: {
      foundationalKnowledge: 70,
      studySkills: 50,
      researchCapabilities: 60,
      writingProficiency: 45,
      quantitativeSkills: 65,
      technicalLiteracy: 80,
      overallPreparation: 62
    },
    intellectualMaturity: {
      curiosityLevel: 75,
      openMindedness: 70,
      intellectualHumility: 65,
      persistenceInLearning: 80,
      abilityToSynthesis: 60,
      metacognition: 55,
      overallMaturity: 68
    },
    learningReadiness: {
      motivationLevel: 85,
      selfDirectedLearning: 70,
      adaptabilityToNewConcepts: 75,
      collaborativeLearning: 80,
      feedbackReceptivity: 85,
      goalOrientation: 90,
      overallLearningReadiness: 81
    },
    recommendedLevel: 'foundation',
    readinessScore: 69,
    recommendations: [],
    interventions: [],
    assessedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    credentialValidator = new CredentialValidator(mockPrisma);
    supportNeedsAssessor = new SupportNeedsAssessor(mockPrisma);

    (mockPrisma.application.findUnique as jest.Mock).mockResolvedValue(mockApplication);
    (mockPrisma.credentialValidation.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.supportNeedsAssessment.create as jest.Mock).mockResolvedValue({});
  });

  describe('CredentialValidator', () => {
    it('should validate credentials successfully', async () => {
      const validation = await credentialValidator.validateCredentials('app_123');

      expect(validation).toBeDefined();
      expect(validation.applicationId).toBe('app_123');
      expect(validation.educationRecords).toHaveLength(2);
      expect(validation.professionalCertifications).toHaveLength(2);
      expect(validation.internationalCredentials).toHaveLength(1); // Canadian degree
      expect(validation.credentialAuthenticity).toBeDefined();
      expect(validation.overallValidation).toBeDefined();
    });

    it('should validate education records correctly', async () => {
      const validation = await credentialValidator.validateCredentials('app_123');

      const usRecord = validation.educationRecords.find(r => r.institution === 'Test University');
      const intlRecord = validation.educationRecords.find(r => r.institution === 'International University');

      expect(usRecord).toBeDefined();
      expect(usRecord?.validationStatus).toBe(ValidationStatus.VERIFIED);
      expect(usRecord?.credentialRecognition).toBe(RecognitionStatus.FULLY_RECOGNIZED);

      expect(intlRecord).toBeDefined();
      expect(intlRecord?.credentialRecognition).toBe(RecognitionStatus.REQUIRES_EVALUATION);
    });

    it('should validate professional certifications', async () => {
      const validation = await credentialValidator.validateCredentials('app_123');

      const awsCert = validation.professionalCertifications.find(c => c.certificationName.includes('AWS'));
      const pmpCert = validation.professionalCertifications.find(c => c.certificationName.includes('Project Management'));

      expect(awsCert).toBeDefined();
      expect(awsCert?.validationStatus).toBeDefined();
      expect(awsCert?.industryRecognition).toBeDefined();
      expect(awsCert?.relevanceScore).toBeGreaterThan(0);

      expect(pmpCert).toBeDefined();
      expect(pmpCert?.validationStatus).toBeDefined();
    });

    it('should assess international credentials', async () => {
      const validation = await credentialValidator.validateCredentials('app_123');

      expect(validation.internationalCredentials).toHaveLength(1);
      
      const canadianAssessment = validation.internationalCredentials[0];
      expect(canadianAssessment.country).toBe('Canada');
      expect(canadianAssessment.educationSystem).toBe('Canadian System');
      expect(canadianAssessment.credentials).toHaveLength(1);
      expect(canadianAssessment.overallAssessment).toBeDefined();
      expect(canadianAssessment.recommendedEvaluation).toBeDefined();
    });

    it('should perform authenticity assessment', async () => {
      const validation = await credentialValidator.validateCredentials('app_123');

      expect(validation.credentialAuthenticity).toBeDefined();
      expect(validation.credentialAuthenticity.overallAuthenticity).toBeDefined();
      expect(validation.credentialAuthenticity.documentIntegrity).toBeDefined();
      expect(validation.credentialAuthenticity.fraudIndicators).toBeDefined();
      expect(validation.credentialAuthenticity.verificationSources).toBeDefined();
      expect(validation.credentialAuthenticity.riskAssessment).toBeDefined();
    });

    it('should determine overall validation status', async () => {
      const validation = await credentialValidator.validateCredentials('app_123');

      expect(validation.overallValidation).toBeDefined();
      expect([
        ValidationStatus.VERIFIED,
        ValidationStatus.CONDITIONAL,
        ValidationStatus.UNDER_REVIEW,
        ValidationStatus.REJECTED
      ]).toContain(validation.overallValidation);
    });

    it('should generate appropriate validation notes', async () => {
      const validation = await credentialValidator.validateCredentials('app_123');

      expect(validation.notes).toBeDefined();
      expect(Array.isArray(validation.notes)).toBe(true);
    });

    it('should handle missing application gracefully', async () => {
      (mockPrisma.application.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(credentialValidator.validateCredentials('app_123'))
        .rejects.toThrow('Application app_123 not found');
    });
  });

  describe('SupportNeedsAssessor', () => {
    beforeEach(() => {
      mockCredentialValidation = {
        id: 'cred_val_123',
        applicationId: 'app_123',
        educationRecords: [
          {
            institution: 'Test University',
            degree: 'Bachelor of Science',
            validationStatus: ValidationStatus.VERIFIED,
            equivalencyAssessment: {
              additionalRequirements: []
            }
          }
        ],
        professionalCertifications: [],
        internationalCredentials: [],
        credentialAuthenticity: {
          overallAuthenticity: 'authentic',
          fraudIndicators: [],
          riskAssessment: 'low'
        },
        overallValidation: ValidationStatus.VERIFIED
      };
    });

    it('should assess support needs successfully', async () => {
      const assessment = await supportNeedsAssessor.assessSupportNeeds(
        'app_123',
        mockSkills,
        mockReadinessAssessment,
        mockCredentialValidation
      );

      expect(assessment).toBeDefined();
      expect(assessment.applicationId).toBe('app_123');
      expect(assessment.applicantId).toBe('user_456');
      expect(assessment.academicSupport).toBeDefined();
      expect(assessment.learningSupport).toBeDefined();
      expect(assessment.accessibilitySupport).toBeDefined();
      expect(assessment.technicalSupport).toBeDefined();
      expect(assessment.financialSupport).toBeDefined();
      expect(assessment.culturalSupport).toBeDefined();
      expect(assessment.remedialRequirements).toBeDefined();
      expect(assessment.accommodationPlan).toBeDefined();
      expect(assessment.supportPriority).toBeDefined();
      expect(assessment.estimatedCosts).toBeDefined();
      expect(assessment.recommendedServices).toBeDefined();
      expect(assessment.monitoringPlan).toBeDefined();
    });

    it('should identify academic support needs', async () => {
      const assessment = await supportNeedsAssessor.assessSupportNeeds(
        'app_123',
        mockSkills,
        mockReadinessAssessment,
        mockCredentialValidation
      );

      expect(assessment.academicSupport.tutoringNeeds.length).toBeGreaterThan(0);
      expect(assessment.academicSupport.studySkillsSupport).toBe(true); // Based on low study skills score
      expect(assessment.academicSupport.writingCenterSupport).toBe(true); // Based on low writing score
      expect(assessment.academicSupport.timeManagementSupport).toBe(true); // Based on application data
    });

    it('should identify learning support needs', async () => {
      const assessment = await supportNeedsAssessor.assessSupportNeeds(
        'app_123',
        mockSkills,
        mockReadinessAssessment,
        mockCredentialValidation
      );

      expect(assessment.learningSupport.learningDisabilitySupport).toBe(true); // Specified in application data
      expect(assessment.learningSupport.memorySupport).toBe(false); // memoryAndRetention is 60, not < 60
      expect(assessment.learningSupport.executiveFunctionSupport).toBe(true); // Based on low attention score (55 < 60)
      expect(assessment.learningSupport.metacognitionSupport).toBe(true); // Based on low metacognition score (55 < 65)
    });

    it('should identify accessibility support needs', async () => {
      const assessment = await supportNeedsAssessor.assessSupportNeeds(
        'app_123',
        mockSkills,
        mockReadinessAssessment,
        mockCredentialValidation
      );

      // Should identify learning disability support based on application data
      expect(assessment.accessibilitySupport.cognitiveDisabilitySupport.length).toBeGreaterThan(0);
      
      const learningSupport = assessment.accessibilitySupport.cognitiveDisabilitySupport[0];
      expect(learningSupport.type).toBe('dyslexia');
      expect(learningSupport.accommodations).toContain('Extended time');
    });

    it('should identify technical support needs', async () => {
      const assessment = await supportNeedsAssessor.assessSupportNeeds(
        'app_123',
        mockSkills,
        mockReadinessAssessment,
        mockCredentialValidation
      );

      expect(assessment.technicalSupport.computerSkillsTraining).toBe(true); // Based on limited tech skills
      expect(assessment.technicalSupport.deviceSupport.length).toBeGreaterThan(0); // Needs laptop
      
      const laptopSupport = assessment.technicalSupport.deviceSupport.find(d => d.deviceType === 'laptop');
      expect(laptopSupport).toBeDefined();
      expect(laptopSupport?.provided).toBe(true);
    });

    it('should identify financial support needs', async () => {
      const assessment = await supportNeedsAssessor.assessSupportNeeds(
        'app_123',
        mockSkills,
        mockReadinessAssessment,
        mockCredentialValidation
      );

      expect(assessment.financialSupport.tuitionAssistance).toBe(true); // Based on medium financial need
      expect(assessment.financialSupport.textbookVouchers).toBe(true); // Based on financial need
      expect(assessment.financialSupport.scholarshipEligibility).toBeDefined();
    });

    it('should identify cultural support needs', async () => {
      const assessment = await supportNeedsAssessor.assessSupportNeeds(
        'app_123',
        mockSkills,
        mockReadinessAssessment,
        mockCredentialValidation
      );

      expect(assessment.culturalSupport.languageSupport.eslSupport).toBe(false); // Native English speaker
      expect(assessment.culturalSupport.internationalStudentSupport).toBe(false); // Not international
      expect(assessment.culturalSupport.culturalOrientationNeeds).toBe(false);
    });

    it('should determine remedial requirements', async () => {
      const assessment = await supportNeedsAssessor.assessSupportNeeds(
        'app_123',
        mockSkills,
        mockReadinessAssessment,
        mockCredentialValidation
      );

      // Should identify remedial needs for written communication (score < 50)
      expect(assessment.remedialRequirements.length).toBeGreaterThan(0);
      
      const writingRemedial = assessment.remedialRequirements.find(r => r.area.includes('written communication'));
      expect(writingRemedial).toBeDefined();
      expect(writingRemedial?.coursework.length).toBeGreaterThan(0);
    });

    it('should create accommodation plan', async () => {
      const assessment = await supportNeedsAssessor.assessSupportNeeds(
        'app_123',
        mockSkills,
        mockReadinessAssessment,
        mockCredentialValidation
      );

      expect(assessment.accommodationPlan).toBeDefined();
      expect(assessment.accommodationPlan.academicAccommodations).toBeDefined();
      expect(assessment.accommodationPlan.testingAccommodations).toBeDefined();
      expect(assessment.accommodationPlan.classroomAccommodations).toBeDefined();
      expect(assessment.accommodationPlan.technologyAccommodations).toBeDefined();
    });

    it('should determine appropriate support priority', async () => {
      const assessment = await supportNeedsAssessor.assessSupportNeeds(
        'app_123',
        mockSkills,
        mockReadinessAssessment,
        mockCredentialValidation
      );

      expect(assessment.supportPriority).toBeDefined();
      expect([
        SupportPriority.CRITICAL,
        SupportPriority.HIGH,
        SupportPriority.MEDIUM,
        SupportPriority.LOW
      ]).toContain(assessment.supportPriority);

      // Should be HIGH, MEDIUM, or CRITICAL due to learning disability, cognitive disability, and academic needs
      expect([SupportPriority.CRITICAL, SupportPriority.HIGH, SupportPriority.MEDIUM]).toContain(assessment.supportPriority);
    });

    it('should estimate support costs accurately', async () => {
      const assessment = await supportNeedsAssessor.assessSupportNeeds(
        'app_123',
        mockSkills,
        mockReadinessAssessment,
        mockCredentialValidation
      );

      expect(assessment.estimatedCosts).toBeDefined();
      expect(assessment.estimatedCosts.totalEstimatedCost).toBeGreaterThan(0);
      expect(assessment.estimatedCosts.academicSupportCost).toBeGreaterThan(0);
      expect(assessment.estimatedCosts.technicalSupportCost).toBeGreaterThan(0);
      expect(assessment.estimatedCosts.remedialCourseworkCost).toBeGreaterThan(0);
      
      // Total should equal sum of components
      const expectedTotal = 
        assessment.estimatedCosts.academicSupportCost +
        assessment.estimatedCosts.accessibilitySupportCost +
        assessment.estimatedCosts.technicalSupportCost +
        assessment.estimatedCosts.remedialCourseworkCost +
        assessment.estimatedCosts.accommodationCost;
      
      expect(assessment.estimatedCosts.totalEstimatedCost).toBe(expectedTotal);
    });

    it('should recommend appropriate services', async () => {
      const assessment = await supportNeedsAssessor.assessSupportNeeds(
        'app_123',
        mockSkills,
        mockReadinessAssessment,
        mockCredentialValidation
      );

      expect(assessment.recommendedServices.length).toBeGreaterThan(0);
      
      // Should recommend study skills workshop
      const studySkillsService = assessment.recommendedServices.find(s => 
        s.serviceName.includes('Study Skills')
      );
      expect(studySkillsService).toBeDefined();
      
      // Should recommend computer skills training
      const computerSkillsService = assessment.recommendedServices.find(s => 
        s.serviceName.includes('Computer Skills')
      );
      expect(computerSkillsService).toBeDefined();
      
      // Should recommend remedial services
      const remedialService = assessment.recommendedServices.find(s => 
        s.serviceType === 'remedial'
      );
      expect(remedialService).toBeDefined();
    });

    it('should create monitoring plan', async () => {
      const assessment = await supportNeedsAssessor.assessSupportNeeds(
        'app_123',
        mockSkills,
        mockReadinessAssessment,
        mockCredentialValidation
      );

      expect(assessment.monitoringPlan).toBeDefined();
      expect(assessment.monitoringPlan.checkInFrequency).toBeDefined();
      expect(assessment.monitoringPlan.assessmentSchedule.length).toBeGreaterThan(0);
      expect(assessment.monitoringPlan.progressMetrics.length).toBeGreaterThan(0);
      expect(assessment.monitoringPlan.alertTriggers.length).toBeGreaterThan(0);
      expect(assessment.monitoringPlan.reviewSchedule.length).toBeGreaterThan(0);
      
      // Check-in frequency should match support priority
      if (assessment.supportPriority === SupportPriority.HIGH) {
        expect(assessment.monitoringPlan.checkInFrequency).toBe('bi-weekly');
      }
    });

    it('should handle high-priority support needs', async () => {
      // Modify application to have more severe needs
      const highNeedsApp = {
        ...mockApplication,
        applicationData: {
          ...mockApplication.applicationData,
          disabilities: [
            {
              type: 'physical',
              subtype: 'mobility',
              accommodations: ['Wheelchair accessible'],
              personalAssistance: true
            },
            {
              type: 'visual',
              subtype: 'blindness',
              assistiveTechnology: ['Screen reader', 'Braille display'],
              navigationSupport: true
            }
          ]
        }
      };

      (mockPrisma.application.findUnique as jest.Mock).mockResolvedValue(highNeedsApp);

      const assessment = await supportNeedsAssessor.assessSupportNeeds(
        'app_123',
        mockSkills,
        mockReadinessAssessment,
        mockCredentialValidation
      );

      expect(assessment.supportPriority).toBe(SupportPriority.CRITICAL);
      expect(assessment.accessibilitySupport.physicalDisabilitySupport.length).toBeGreaterThan(0);
      expect(assessment.accessibilitySupport.visualImpairmentSupport.length).toBeGreaterThan(0);
      expect(assessment.estimatedCosts.accessibilitySupportCost).toBeGreaterThan(0);
      expect(assessment.monitoringPlan.checkInFrequency).toBe('weekly');
    });

    it('should handle missing application gracefully', async () => {
      (mockPrisma.application.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(supportNeedsAssessor.assessSupportNeeds(
        'app_123',
        mockSkills,
        mockReadinessAssessment,
        mockCredentialValidation
      )).rejects.toThrow('Application app_123 not found');
    });
  });

  describe('Integration Tests', () => {
    it('should complete full credential validation and support needs workflow', async () => {
      // Step 1: Credential Validation
      const credentialValidation = await credentialValidator.validateCredentials('app_123');
      expect(credentialValidation).toBeDefined();

      // Step 2: Support Needs Assessment
      const supportAssessment = await supportNeedsAssessor.assessSupportNeeds(
        'app_123',
        mockSkills,
        mockReadinessAssessment,
        credentialValidation
      );
      expect(supportAssessment).toBeDefined();

      // Verify data consistency
      expect(credentialValidation.applicationId).toBe('app_123');
      expect(supportAssessment.applicationId).toBe('app_123');
      expect(supportAssessment.applicantId).toBe('user_456');
    });

    it('should handle database storage correctly', async () => {
      await credentialValidator.validateCredentials('app_123');
      await supportNeedsAssessor.assessSupportNeeds(
        'app_123',
        mockSkills,
        mockReadinessAssessment,
        mockCredentialValidation
      );

      expect(mockPrisma.credentialValidation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          applicationId: 'app_123',
          educationRecords: expect.any(Array),
          professionalCertifications: expect.any(Array),
          internationalCredentials: expect.any(Array),
          credentialAuthenticity: expect.any(Object),
          overallValidation: expect.any(String),
          validatedAt: expect.any(Date),
          validatedBy: expect.any(String),
          notes: expect.any(Array)
        })
      });

      expect(mockPrisma.supportNeedsAssessment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          applicationId: 'app_123',
          applicantId: 'user_456',
          academicSupport: expect.any(Object),
          learningSupport: expect.any(Object),
          accessibilitySupport: expect.any(Object),
          technicalSupport: expect.any(Object),
          financialSupport: expect.any(Object),
          culturalSupport: expect.any(Object),
          remedialRequirements: expect.any(Array),
          accommodationPlan: expect.any(Object),
          supportPriority: expect.any(String),
          estimatedCosts: expect.any(Object),
          recommendedServices: expect.any(Array),
          monitoringPlan: expect.any(Object),
          assessedAt: expect.any(Date)
        })
      });
    });
  });
});