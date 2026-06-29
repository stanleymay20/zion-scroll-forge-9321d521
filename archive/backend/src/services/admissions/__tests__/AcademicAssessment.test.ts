import { PrismaClient } from '@prisma/client';
import { AcademicEvaluator, CoreSkill, SkillLevel } from '../AcademicEvaluator';
import { SkillAssessor } from '../SkillAssessor';
import { PotentialAnalyzer } from '../PotentialAnalyzer';
import { IntellectualReadinessAssessor, ReadinessLevel } from '../IntellectualReadinessAssessor';

// Mock Prisma Client
const mockPrisma = {
  application: {
    findUnique: jest.fn(),
  },
  academicEvaluation: {
    create: jest.fn(),
  },
  learningPotentialAnalysis: {
    create: jest.fn(),
  },
  intellectualReadinessAssessment: {
    create: jest.fn(),
  },
} as unknown as PrismaClient;

describe('Academic Assessment System', () => {
  let academicEvaluator: AcademicEvaluator;
  let skillAssessor: SkillAssessor;
  let potentialAnalyzer: PotentialAnalyzer;
  let readinessAssessor: IntellectualReadinessAssessor;

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
          transcriptVerified: true
        }
      ],
      testScores: [
        {
          type: 'SAT',
          score: 1400,
          maxScore: 1600,
          percentile: 85,
          date: '2022-10-15'
        }
      ],
      achievements: [
        {
          type: 'academic',
          title: 'Dean\'s List',
          description: 'Achieved Dean\'s List for 3 consecutive semesters',
          date: '2023-05-15',
          verified: true
        }
      ],
      research: [
        {
          title: 'Machine Learning Applications',
          institution: 'Test University',
          supervisor: 'Dr. Smith',
          duration: '6 months',
          description: 'Research on ML applications in healthcare',
          outcomes: ['Published paper', 'Conference presentation']
        }
      ],
      publications: [
        {
          title: 'ML in Healthcare: A Survey',
          journal: 'Tech Journal',
          date: '2023-03-01',
          authors: ['John Doe', 'Dr. Smith'],
          citations: 5
        }
      ],
      spiritualFormation: {
        biblicalStudies: true
      },
      selfDirectedLearning: true,
      passionForLearning: true,
      challengesOvercome: [
        {
          challenge: 'Financial difficulties',
          response: 'adaptive',
          outcome: 'overcome',
          severity: 'high'
        }
      ],
      longTermCommitments: [
        'Volunteer tutoring for 2 years'
      ],
      consistentImprovement: true,
      highMotivation: true,
      improvingTrend: true,
      timeManagement: true,
      organizationalSkills: true,
      technologySkills: ['Python', 'JavaScript', 'SQL'],
      digitalLiteracy: true,
      onlineLearning: true,
      culturalExposure: true,
      diverseInterests: true,
      selfReflection: true,
      learningStrategies: true,
      teamwork: true,
      seeksFeedback: true,
      clearGoals: true,
      goalPersistence: true
    },
    applicant: {
      id: 'user_456',
      name: 'John Doe'
    },
    documents: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    academicEvaluator = new AcademicEvaluator(mockPrisma);
    skillAssessor = new SkillAssessor(mockPrisma);
    potentialAnalyzer = new PotentialAnalyzer(mockPrisma);
    readinessAssessor = new IntellectualReadinessAssessor(mockPrisma);

    (mockPrisma.application.findUnique as jest.Mock).mockResolvedValue(mockApplication);
    (mockPrisma.academicEvaluation.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.learningPotentialAnalysis.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.intellectualReadinessAssessment.create as jest.Mock).mockResolvedValue({});
  });

  describe('AcademicEvaluator', () => {
    it('should evaluate academic performance successfully', async () => {
      const evaluation = await academicEvaluator.evaluateAcademicPerformance('app_123');

      expect(evaluation).toBeDefined();
      expect(evaluation.applicationId).toBe('app_123');
      expect(evaluation.previousEducation).toHaveLength(1);
      expect(evaluation.previousEducation[0].institution).toBe('Test University');
      expect(evaluation.academicPerformance.overallGPA).toBe(3.5);
      expect(evaluation.coreSkills).toHaveLength(8); // All core skills
      expect(evaluation.learningPotential).toBeDefined();
      expect(evaluation.intellectualCapacity).toBeDefined();
      expect(evaluation.recommendedLevel).toBeDefined();
      expect(evaluation.supportNeeds).toBeDefined();
    });

    it('should calculate overall GPA correctly', async () => {
      const evaluation = await academicEvaluator.evaluateAcademicPerformance('app_123');
      expect(evaluation.academicPerformance.overallGPA).toBe(3.5);
    });

    it('should assess all core skills', async () => {
      const evaluation = await academicEvaluator.evaluateAcademicPerformance('app_123');
      
      const skillTypes = evaluation.coreSkills.map(s => s.skill);
      expect(skillTypes).toContain(CoreSkill.MATHEMATICS);
      expect(skillTypes).toContain(CoreSkill.CRITICAL_THINKING);
      expect(skillTypes).toContain(CoreSkill.WRITTEN_COMMUNICATION);
      expect(skillTypes).toContain(CoreSkill.BIBLICAL_LITERACY);
      expect(skillTypes).toContain(CoreSkill.RESEARCH_METHODOLOGY);
      expect(skillTypes).toContain(CoreSkill.ANALYTICAL_REASONING);
      expect(skillTypes).toContain(CoreSkill.SCIENCE);
      expect(skillTypes).toContain(CoreSkill.LANGUAGE_ARTS);
    });

    it('should determine appropriate academic level', async () => {
      const evaluation = await academicEvaluator.evaluateAcademicPerformance('app_123');
      
      // With good GPA and skills, should recommend undergraduate or higher
      expect(['undergraduate', 'graduate']).toContain(evaluation.recommendedLevel);
    });

    it('should identify support needs for low-performing skills', async () => {
      // Mock application with lower performance
      const lowPerformanceApp = {
        ...mockApplication,
        applicationData: {
          ...mockApplication.applicationData,
          education: [
            {
              ...mockApplication.applicationData.education[0],
              gpa: 2.0
            }
          ]
        }
      };

      (mockPrisma.application.findUnique as jest.Mock).mockResolvedValue(lowPerformanceApp);

      const evaluation = await academicEvaluator.evaluateAcademicPerformance('app_123');
      
      // Should identify support needs for low GPA
      expect(evaluation.supportNeeds.length).toBeGreaterThan(0);
    });

    it('should handle missing application data gracefully', async () => {
      (mockPrisma.application.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(academicEvaluator.evaluateAcademicPerformance('app_123'))
        .rejects.toThrow('Application app_123 not found');
    });
  });

  describe('SkillAssessor', () => {
    it('should assess core skills successfully', async () => {
      const skills = await skillAssessor.assessCoreSkills('app_123');

      expect(skills).toHaveLength(8);
      expect(skills[0]).toHaveProperty('skill');
      expect(skills[0]).toHaveProperty('currentLevel');
      expect(skills[0]).toHaveProperty('assessment');
      expect(skills[0]).toHaveProperty('developmentPlan');
    });

    it('should generate appropriate skill tests', async () => {
      const mathSkill = await skillAssessor.assessSkill(CoreSkill.MATHEMATICS, mockApplication);
      
      expect(mathSkill.skill).toBe(CoreSkill.MATHEMATICS);
      expect(mathSkill.currentLevel).toBeDefined();
      expect(mathSkill.assessment.score).toBeGreaterThanOrEqual(0);
      expect(mathSkill.assessment.score).toBeLessThanOrEqual(100);
      expect(mathSkill.developmentPlan.recommendedCourses).toBeDefined();
    });

    it('should provide development plans for each skill', async () => {
      const skills = await skillAssessor.assessCoreSkills('app_123');

      skills.forEach(skill => {
        expect(skill.developmentPlan).toBeDefined();
        expect(skill.developmentPlan.targetLevel).toBeDefined();
        expect(skill.developmentPlan.recommendedCourses).toBeDefined();
        expect(skill.developmentPlan.estimatedTimeframe).toBeDefined();
        expect(skill.developmentPlan.resources).toBeDefined();
      });
    });

    it('should adjust scores based on application data', async () => {
      // Test biblical literacy with spiritual formation background
      const biblicalSkill = await skillAssessor.assessSkill(CoreSkill.BIBLICAL_LITERACY, mockApplication);
      
      // Should have higher score due to biblical studies background
      expect(biblicalSkill.assessment.score).toBeGreaterThan(50);
    });
  });

  describe('PotentialAnalyzer', () => {
    it('should analyze learning potential successfully', async () => {
      const mockPerformance = {
        overallGPA: 3.5,
        standardizedTestScores: [
          {
            testType: 'SAT',
            score: 1400,
            maxScore: 1600,
            percentile: 85,
            testDate: new Date('2022-10-15')
          }
        ],
        academicAchievements: [
          {
            type: 'academic',
            title: 'Dean\'s List',
            description: 'Achieved Dean\'s List',
            dateReceived: new Date('2023-05-15'),
            verificationStatus: 'verified'
          }
        ],
        researchExperience: [
          {
            title: 'ML Research',
            institution: 'Test University',
            supervisor: 'Dr. Smith',
            duration: '6 months',
            description: 'Research project',
            outcomes: ['Paper published']
          }
        ],
        publicationHistory: [
          {
            title: 'ML Survey',
            journal: 'Tech Journal',
            publicationDate: new Date('2023-03-01'),
            authors: ['John Doe'],
            citationCount: 5
          }
        ]
      };

      const mockSkills = [
        {
          skill: CoreSkill.CRITICAL_THINKING,
          currentLevel: SkillLevel.ADVANCED,
          assessment: {
            score: 85,
            maxScore: 100,
            percentile: 85,
            strengths: ['Strong analytical skills'],
            weaknesses: [],
            recommendations: ['Continue advanced work']
          },
          developmentPlan: {
            targetLevel: SkillLevel.EXPERT,
            recommendedCourses: ['Advanced Logic'],
            estimatedTimeframe: '6 months',
            prerequisites: [],
            resources: ['Academic resources']
          }
        }
      ];

      const report = await potentialAnalyzer.analyzeLearningPotential('app_123', mockPerformance, mockSkills);

      expect(report).toBeDefined();
      expect(report.applicantId).toBe('user_456');
      expect(report.overallPotential).toBeDefined();
      expect(report.learningPatterns).toBeDefined();
      expect(report.growthIndicators).toBeDefined();
      expect(report.intellectualCapacity).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.riskFactors).toBeDefined();
      expect(report.successPredictors).toBeDefined();
    });

    it('should calculate potential scores correctly', async () => {
      const mockPerformance = {
        overallGPA: 3.8,
        standardizedTestScores: [
          {
            testType: 'SAT',
            score: 1500,
            maxScore: 1600,
            percentile: 95,
            testDate: new Date('2022-10-15')
          }
        ],
        academicAchievements: [],
        researchExperience: [],
        publicationHistory: []
      };

      const mockSkills = [
        {
          skill: CoreSkill.MATHEMATICS,
          currentLevel: SkillLevel.ADVANCED,
          assessment: {
            score: 90,
            maxScore: 100,
            percentile: 90,
            strengths: ['Excellent problem solving'],
            weaknesses: [],
            recommendations: []
          },
          developmentPlan: {
            targetLevel: SkillLevel.EXPERT,
            recommendedCourses: [],
            estimatedTimeframe: '6 months',
            prerequisites: [],
            resources: []
          }
        }
      ];

      const report = await potentialAnalyzer.analyzeLearningPotential('app_123', mockPerformance, mockSkills);

      expect(report.overallPotential.overallScore).toBeGreaterThan(70);
      expect(report.overallPotential.learningAgility).toBeGreaterThan(0);
      expect(report.overallPotential.adaptability).toBeGreaterThan(0);
      expect(report.overallPotential.problemSolving).toBeGreaterThan(0);
      expect(report.overallPotential.creativity).toBeGreaterThan(0);
      expect(report.overallPotential.persistence).toBeGreaterThan(0);
    });

    it('should identify success predictors', async () => {
      const mockPerformance = {
        overallGPA: 3.9,
        standardizedTestScores: [],
        academicAchievements: [],
        researchExperience: [],
        publicationHistory: []
      };

      const mockSkills = [
        {
          skill: CoreSkill.CRITICAL_THINKING,
          currentLevel: SkillLevel.EXPERT,
          assessment: {
            score: 95,
            maxScore: 100,
            percentile: 95,
            strengths: [],
            weaknesses: [],
            recommendations: []
          },
          developmentPlan: {
            targetLevel: SkillLevel.EXPERT,
            recommendedCourses: [],
            estimatedTimeframe: '',
            prerequisites: [],
            resources: []
          }
        }
      ];

      const report = await potentialAnalyzer.analyzeLearningPotential('app_123', mockPerformance, mockSkills);

      expect(report.successPredictors.length).toBeGreaterThan(0);
      expect(report.successPredictors[0]).toHaveProperty('predictor');
      expect(report.successPredictors[0]).toHaveProperty('strength');
      expect(report.successPredictors[0]).toHaveProperty('evidence');
      expect(report.successPredictors[0]).toHaveProperty('correlation');
    });
  });

  describe('IntellectualReadinessAssessor', () => {
    it('should assess intellectual readiness successfully', async () => {
      const mockSkills = [
        {
          skill: CoreSkill.CRITICAL_THINKING,
          currentLevel: SkillLevel.ADVANCED,
          assessment: {
            score: 80,
            maxScore: 100,
            percentile: 80,
            strengths: [],
            weaknesses: [],
            recommendations: []
          },
          developmentPlan: {
            targetLevel: SkillLevel.EXPERT,
            recommendedCourses: [],
            estimatedTimeframe: '6 months',
            prerequisites: [],
            resources: []
          }
        }
      ];

      const mockPotential = {
        overallScore: 85,
        learningAgility: 80,
        adaptability: 85,
        problemSolving: 80,
        creativity: 75,
        persistence: 90
      };

      const mockCapacity = {
        intellectualCuriosity: 85,
        abstractThinking: 80,
        synthesisAbility: 75,
        criticalAnalysis: 80,
        informationProcessing: 85,
        conceptualUnderstanding: 80
      };

      const assessment = await readinessAssessor.assessIntellectualReadiness(
        'app_123',
        mockSkills,
        mockPotential,
        mockCapacity
      );

      expect(assessment).toBeDefined();
      expect(assessment.applicantId).toBe('user_456');
      expect(assessment.overallReadiness).toBeDefined();
      expect(assessment.cognitiveReadiness).toBeDefined();
      expect(assessment.academicPreparation).toBeDefined();
      expect(assessment.intellectualMaturity).toBeDefined();
      expect(assessment.learningReadiness).toBeDefined();
      expect(assessment.recommendedLevel).toBeDefined();
      expect(assessment.readinessScore).toBeGreaterThanOrEqual(0);
      expect(assessment.readinessScore).toBeLessThanOrEqual(100);
      expect(assessment.recommendations).toBeDefined();
      expect(assessment.interventions).toBeDefined();
    });

    it('should determine appropriate readiness level', async () => {
      const mockSkills = [
        {
          skill: CoreSkill.CRITICAL_THINKING,
          currentLevel: SkillLevel.EXPERT,
          assessment: {
            score: 95,
            maxScore: 100,
            percentile: 95,
            strengths: [],
            weaknesses: [],
            recommendations: []
          },
          developmentPlan: {
            targetLevel: SkillLevel.EXPERT,
            recommendedCourses: [],
            estimatedTimeframe: '',
            prerequisites: [],
            resources: []
          }
        }
      ];

      const mockPotential = {
        overallScore: 95,
        learningAgility: 90,
        adaptability: 95,
        problemSolving: 90,
        creativity: 85,
        persistence: 95
      };

      const mockCapacity = {
        intellectualCuriosity: 95,
        abstractThinking: 90,
        synthesisAbility: 85,
        criticalAnalysis: 90,
        informationProcessing: 95,
        conceptualUnderstanding: 90
      };

      const assessment = await readinessAssessor.assessIntellectualReadiness(
        'app_123',
        mockSkills,
        mockPotential,
        mockCapacity
      );

      expect(assessment.overallReadiness).toBe(ReadinessLevel.HIGHLY_READY);
      expect(assessment.readinessScore).toBeGreaterThan(80);
    });

    it('should generate appropriate recommendations for low readiness', async () => {
      const mockSkills = [
        {
          skill: CoreSkill.MATHEMATICS,
          currentLevel: SkillLevel.BEGINNER,
          assessment: {
            score: 40,
            maxScore: 100,
            percentile: 40,
            strengths: [],
            weaknesses: ['Needs improvement'],
            recommendations: ['Study fundamentals']
          },
          developmentPlan: {
            targetLevel: SkillLevel.INTERMEDIATE,
            recommendedCourses: ['Basic Math'],
            estimatedTimeframe: '6 months',
            prerequisites: [],
            resources: []
          }
        }
      ];

      const mockPotential = {
        overallScore: 45,
        learningAgility: 40,
        adaptability: 45,
        problemSolving: 40,
        creativity: 50,
        persistence: 45
      };

      const mockCapacity = {
        intellectualCuriosity: 50,
        abstractThinking: 40,
        synthesisAbility: 45,
        criticalAnalysis: 40,
        informationProcessing: 45,
        conceptualUnderstanding: 40
      };

      const assessment = await readinessAssessor.assessIntellectualReadiness(
        'app_123',
        mockSkills,
        mockPotential,
        mockCapacity
      );

      expect(assessment.overallReadiness).toBe(ReadinessLevel.NOT_READY);
      expect(assessment.recommendations.length).toBeGreaterThan(0);
      expect(assessment.interventions.length).toBeGreaterThan(0);
      
      // Should have high priority recommendations
      const highPriorityRecs = assessment.recommendations.filter(r => r.priority === 'high' || r.priority === 'critical');
      expect(highPriorityRecs.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full academic assessment workflow', async () => {
      // Step 1: Academic Evaluation
      const evaluation = await academicEvaluator.evaluateAcademicPerformance('app_123');
      expect(evaluation).toBeDefined();

      // Step 2: Skill Assessment
      const skills = await skillAssessor.assessCoreSkills('app_123');
      expect(skills).toHaveLength(8);

      // Step 3: Potential Analysis
      const potentialReport = await potentialAnalyzer.analyzeLearningPotential(
        'app_123',
        evaluation.academicPerformance,
        skills
      );
      expect(potentialReport).toBeDefined();

      // Step 4: Readiness Assessment
      const readinessAssessment = await readinessAssessor.assessIntellectualReadiness(
        'app_123',
        skills,
        evaluation.learningPotential,
        evaluation.intellectualCapacity
      );
      expect(readinessAssessment).toBeDefined();

      // Verify data consistency
      expect(evaluation.applicationId).toBe('app_123');
      expect(potentialReport.applicantId).toBe('user_456');
      expect(readinessAssessment.applicantId).toBe('user_456');
    });

    it('should handle database storage correctly', async () => {
      await academicEvaluator.evaluateAcademicPerformance('app_123');

      expect(mockPrisma.academicEvaluation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          applicationId: 'app_123',
          previousEducation: expect.any(Array),
          academicPerformance: expect.any(Object),
          coreSkills: expect.any(Array),
          learningPotential: expect.any(Number),
          intellectualCapacity: expect.any(Object),
          recommendedLevel: expect.any(String),
          supportNeeds: expect.any(Array),
          evaluatedAt: expect.any(Date)
        })
      });
    });
  });
});