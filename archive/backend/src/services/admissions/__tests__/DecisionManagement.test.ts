/**
 * ScrollUniversity Admissions Decision Management System Tests
 * "Test everything; hold fast what is good" - 1 Thessalonians 5:21
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import DecisionProcessor from '../DecisionProcessor';
import CommitteeCoordinator from '../CommitteeCoordinator';
import DecisionReasoningDocumentor from '../DecisionReasoningDocumentor';
import DecisionNotificationManager from '../DecisionNotificationManager';
import DecisionManagementService from '../DecisionManagementService';

// Mock Prisma Client
jest.mock('@prisma/client');
const mockPrisma = {
  applications: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn()
  },
  admission_decisions: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn()
  },
  users: {
    findMany: jest.fn()
  },
  admissions_configuration: {
    findMany: jest.fn()
  }
};

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Decision Management System', () => {
  let decisionProcessor: DecisionProcessor;
  let committeeCoordinator: CommitteeCoordinator;
  let reasoningDocumentor: DecisionReasoningDocumentor;
  let notificationManager: DecisionNotificationManager;
  let decisionManagementService: DecisionManagementService;

  const mockApplication = {
    id: 'app_123',
    applicantId: 'user_123',
    status: 'DECISION_PENDING',
    programApplied: 'SCROLL_DEGREE',
    intendedStartDate: new Date('2024-09-01'),
    applicant: {
      id: 'user_123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com'
    },
    eligibilityAssessments: [{
      id: 'eligibility_123',
      overallEligibility: 'ELIGIBLE',
      basicRequirements: { education: { status: 'PASSED' } }
    }],
    spiritualEvaluations: [{
      id: 'spiritual_123',
      overallScore: 85,
      scrollAlignment: 0.8,
      spiritualMaturity: 'MATURE',
      authenticityScore: 90,
      clarityScore: 85,
      characterTraits: [
        { name: 'integrity', score: 90 },
        { name: 'humility', score: 85 }
      ]
    }],
    academicEvaluations: [{
      id: 'academic_123',
      academicReadiness: 80,
      learningPotential: 8.5,
      potentialScore: 85,
      skillProficiency: { mathematics: 80, writing: 85 }
    }],
    interviewRecords: [{
      id: 'interview_123',
      status: 'COMPLETED',
      overallRecommendation: 'RECOMMEND',
      communicationScore: 85,
      spiritualMaturityScore: 80,
      academicReadinessScore: 82,
      characterScore: 88,
      motivationScore: 90,
      culturalFitScore: 85
    }]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Prisma mocks
    (PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma as any);
    
    decisionProcessor = new DecisionProcessor();
    committeeCoordinator = new CommitteeCoordinator();
    reasoningDocumentor = new DecisionReasoningDocumentor();
    notificationManager = new DecisionNotificationManager();
    decisionManagementService = new DecisionManagementService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('DecisionProcessor', () => {
    it('should calculate component scores correctly', async () => {
      const decisionInput = {
        applicationId: 'app_123',
        spiritualEvaluation: mockApplication.spiritualEvaluations[0],
        academicEvaluation: mockApplication.academicEvaluations[0],
        interviewResults: mockApplication.interviewRecords,
        eligibilityResult: mockApplication.eligibilityAssessments[0]
      };

      mockPrisma.admissions_configuration.findMany.mockResolvedValue([]);

      const result = await decisionProcessor.processDecision(decisionInput);

      expect(result).toBeDefined();
      expect(result.decision).toBeOneOf(['ACCEPTED', 'REJECTED', 'WAITLISTED', 'CONDITIONAL_ACCEPTANCE']);
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.componentScores).toHaveProperty('spiritual');
      expect(result.componentScores).toHaveProperty('academic');
      expect(result.componentScores).toHaveProperty('character');
      expect(result.componentScores).toHaveProperty('interview');
      expect(result.componentScores).toHaveProperty('eligibility');
    });

    it('should make ACCEPTED decision for high-scoring applicant', async () => {
      const highScoringInput = {
        applicationId: 'app_123',
        spiritualEvaluation: {
          ...mockApplication.spiritualEvaluations[0],
          overallScore: 95,
          scrollAlignment: 0.95,
          authenticityScore: 95
        },
        academicEvaluation: {
          ...mockApplication.academicEvaluations[0],
          academicReadiness: 95,
          learningPotential: 9.5
        },
        interviewResults: [{
          ...mockApplication.interviewRecords[0],
          overallRecommendation: 'STRONG_RECOMMEND',
          communicationScore: 95
        }],
        eligibilityResult: mockApplication.eligibilityAssessments[0]
      };

      mockPrisma.admissions_configuration.findMany.mockResolvedValue([]);

      const result = await decisionProcessor.processDecision(highScoringInput);

      expect(result.decision).toBe('ACCEPTED');
      expect(result.overallScore).toBeGreaterThan(85);
      expect(result.confidence).toBeGreaterThan(80);
    });

    it('should make REJECTED decision for low-scoring applicant', async () => {
      const lowScoringInput = {
        applicationId: 'app_123',
        spiritualEvaluation: {
          ...mockApplication.spiritualEvaluations[0],
          overallScore: 40,
          scrollAlignment: 0.3,
          authenticityScore: 35
        },
        academicEvaluation: {
          ...mockApplication.academicEvaluations[0],
          academicReadiness: 35,
          learningPotential: 4.0
        },
        interviewResults: [{
          ...mockApplication.interviewRecords[0],
          overallRecommendation: 'NOT_RECOMMEND',
          communicationScore: 40
        }],
        eligibilityResult: mockApplication.eligibilityAssessments[0]
      };

      mockPrisma.admissions_configuration.findMany.mockResolvedValue([]);

      const result = await decisionProcessor.processDecision(lowScoringInput);

      expect(result.decision).toBe('REJECTED');
      expect(result.overallScore).toBeLessThan(60);
    });

    it('should provide detailed reasoning for decisions', async () => {
      const decisionInput = {
        applicationId: 'app_123',
        spiritualEvaluation: mockApplication.spiritualEvaluations[0],
        academicEvaluation: mockApplication.academicEvaluations[0],
        interviewResults: mockApplication.interviewRecords,
        eligibilityResult: mockApplication.eligibilityAssessments[0]
      };

      mockPrisma.admissions_configuration.findMany.mockResolvedValue([]);

      const result = await decisionProcessor.processDecision(decisionInput);

      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(50);
      expect(result.strengths).toBeInstanceOf(Array);
      expect(result.concerns).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('CommitteeCoordinator', () => {
    const mockCommitteeMembers = [
      {
        id: 'member_1',
        firstName: 'Elder',
        lastName: 'Smith',
        email: 'elder.smith@scrolluniversity.org',
        role: 'SCROLL_ELDER'
      },
      {
        id: 'member_2',
        firstName: 'Dr.',
        lastName: 'Johnson',
        email: 'dr.johnson@scrolluniversity.org',
        role: 'ADMISSIONS_COMMITTEE'
      },
      {
        id: 'member_3',
        firstName: 'Prophet',
        lastName: 'Williams',
        email: 'prophet.williams@scrolluniversity.org',
        role: 'PROPHET'
      }
    ];

    it('should create voting session with appropriate committee members', async () => {
      mockPrisma.applications.findUnique.mockResolvedValue(mockApplication);
      mockPrisma.users.findMany.mockResolvedValue(mockCommitteeMembers);

      const session = await committeeCoordinator.createVotingSession('app_123');

      expect(session).toBeDefined();
      expect(session.applicationId).toBe('app_123');
      expect(session.members.length).toBeGreaterThanOrEqual(3);
      expect(session.requiredQuorum).toBeGreaterThanOrEqual(3);
      expect(session.chairpersonId).toBeDefined();
    });

    it('should process committee votes correctly', async () => {
      const mockVotes = [
        {
          memberId: 'member_1',
          memberName: 'Elder Smith',
          vote: 'ACCEPT' as const,
          confidence: 0.9,
          reasoning: 'Strong spiritual maturity and alignment',
          spiritualDiscernment: 'Sense of peace about this decision',
          timestamp: new Date(),
          weight: 1.5
        },
        {
          memberId: 'member_2',
          memberName: 'Dr. Johnson',
          vote: 'ACCEPT' as const,
          confidence: 0.8,
          reasoning: 'Good academic preparation',
          timestamp: new Date(),
          weight: 1.0
        },
        {
          memberId: 'member_3',
          memberName: 'Prophet Williams',
          vote: 'CONDITIONAL' as const,
          confidence: 0.7,
          reasoning: 'Needs additional spiritual formation',
          spiritualDiscernment: 'Some concerns about readiness',
          timestamp: new Date(),
          weight: 1.5
        }
      ];

      const result = await committeeCoordinator.processCommitteeVotes('session_123', mockVotes);

      expect(result).toBeDefined();
      expect(result.totalVotes).toBe(3);
      expect(result.quorumMet).toBe(true);
      expect(result.decision).toBeOneOf(['ACCEPTED', 'REJECTED', 'WAITLISTED', 'CONDITIONAL_ACCEPTANCE', 'NO_CONSENSUS']);
      expect(result.voteBreakdown).toHaveProperty('accept');
      expect(result.voteBreakdown).toHaveProperty('reject');
      expect(result.voteBreakdown).toHaveProperty('waitlist');
      expect(result.voteBreakdown).toHaveProperty('conditional');
    });

    it('should require spiritual alignment for decisions', async () => {
      const mockVotesWithoutAlignment = [
        {
          memberId: 'member_1',
          memberName: 'Elder Smith',
          vote: 'ACCEPT' as const,
          confidence: 0.9,
          reasoning: 'Good candidate',
          spiritualDiscernment: 'Concerns about spiritual readiness',
          timestamp: new Date(),
          weight: 1.5
        },
        {
          memberId: 'member_3',
          memberName: 'Prophet Williams',
          vote: 'ACCEPT' as const,
          confidence: 0.8,
          reasoning: 'Acceptable',
          spiritualDiscernment: 'Lack of peace about this decision',
          timestamp: new Date(),
          weight: 1.5
        }
      ];

      const result = await committeeCoordinator.processCommitteeVotes('session_123', mockVotesWithoutAlignment);

      expect(result.spiritualAlignment).toBe(false);
    });
  });

  describe('DecisionReasoningDocumentor', () => {
    it('should generate comprehensive decision justification', async () => {
      mockPrisma.applications.findUnique.mockResolvedValue(mockApplication);

      const mockDecisionResult = {
        decision: 'ACCEPTED',
        overallScore: 85,
        componentScores: {
          spiritual: 85,
          academic: 80,
          character: 88,
          interview: 85,
          eligibility: 100
        },
        strengths: ['Strong spiritual maturity', 'Good academic preparation'],
        concerns: ['Minor communication improvements needed'],
        recommendations: ['Assign experienced mentor'],
        reasoning: 'Well-rounded candidate with strong alignment',
        confidence: 90
      };

      const justification = await reasoningDocumentor.generateDecisionJustification(
        'app_123',
        mockDecisionResult,
        mockApplication
      );

      expect(justification).toBeDefined();
      expect(justification.applicationId).toBe('app_123');
      expect(justification.decisionType).toBe('ACCEPTED');
      expect(justification.componentAnalysis).toBeDefined();
      expect(justification.strengthsAnalysis).toBeDefined();
      expect(justification.concernsAnalysis).toBeDefined();
      expect(justification.decisionRationale).toBeDefined();
    });

    it('should analyze component scores in detail', async () => {
      mockPrisma.applications.findUnique.mockResolvedValue(mockApplication);

      const mockDecisionResult = {
        decision: 'CONDITIONAL_ACCEPTANCE',
        overallScore: 72,
        componentScores: {
          spiritual: 65, // Below threshold
          academic: 85,
          character: 75,
          interview: 70,
          eligibility: 100
        },
        strengths: ['Strong academic potential'],
        concerns: ['Spiritual development needed'],
        recommendations: ['Complete spiritual formation program'],
        reasoning: 'Good potential with conditions',
        confidence: 75
      };

      const justification = await reasoningDocumentor.generateDecisionJustification(
        'app_123',
        mockDecisionResult,
        mockApplication
      );

      expect(justification.componentAnalysis.spiritual.concerns).toContain('Spiritual maturity and alignment need development');
      expect(justification.componentAnalysis.academic.strengths).toContain('Excellent academic preparation and readiness');
    });
  });

  describe('DecisionNotificationManager', () => {
    it('should send decision notification successfully', async () => {
      mockPrisma.applications.findUnique.mockResolvedValue(mockApplication);

      const mockDecisionData = {
        decision: 'ACCEPTED',
        overallScore: 85,
        strengths: ['Strong spiritual alignment', 'Good academic preparation'],
        concerns: [],
        recommendations: ['Connect with ScrollMentor'],
        reasoning: 'Excellent candidate for ScrollUniversity'
      };

      const result = await notificationManager.sendDecisionNotification(
        'app_123',
        mockDecisionData
      );

      expect(result).toBeDefined();
      expect(result.status).toBeOneOf(['SUCCESS', 'PARTIAL', 'FAILED']);
      expect(result.deliveryDetails).toBeInstanceOf(Array);
      expect(result.deliveryDetails.length).toBeGreaterThan(0);
    });

    it('should personalize notification content', async () => {
      mockPrisma.applications.findUnique.mockResolvedValue(mockApplication);

      const mockDecisionData = {
        decision: 'ACCEPTED',
        overallScore: 85,
        strengths: ['Strong spiritual alignment'],
        concerns: [],
        recommendations: ['Prepare for orientation'],
        reasoning: 'Excellent fit for our community'
      };

      // This would test the internal personalization logic
      // In a real implementation, we'd have access to the personalized content
      const result = await notificationManager.sendDecisionNotification(
        'app_123',
        mockDecisionData,
        'We are excited to welcome you to our community!'
      );

      expect(result.status).not.toBe('FAILED');
    });
  });

  describe('DecisionManagementService Integration', () => {
    it('should process complete admission decision workflow', async () => {
      // Setup mocks
      mockPrisma.applications.findUnique.mockResolvedValue(mockApplication);
      mockPrisma.admission_decisions.findFirst.mockResolvedValue(null);
      mockPrisma.users.findMany.mockResolvedValue([]);
      mockPrisma.admissions_configuration.findMany.mockResolvedValue([]);
      mockPrisma.admission_decisions.create.mockResolvedValue({});
      mockPrisma.applications.update.mockResolvedValue({});

      const decisionRequest = {
        applicationId: 'app_123',
        requestType: 'AUTOMATED' as const,
        requesterRole: 'ADMISSIONS_OFFICER',
        requesterId: 'officer_123',
        priority: 'MEDIUM' as const
      };

      const result = await decisionManagementService.processAdmissionDecision(decisionRequest);

      expect(result).toBeDefined();
      expect(result.applicationId).toBe('app_123');
      expect(result.decision).toBeOneOf(['ACCEPTED', 'REJECTED', 'WAITLISTED', 'CONDITIONAL_ACCEPTANCE']);
      expect(result.decisionScore).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.justification).toBeDefined();
      expect(result.nextSteps).toBeInstanceOf(Array);
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('should handle committee review for complex cases', async () => {
      // Create a complex case that requires committee review
      const complexApplication = {
        ...mockApplication,
        spiritualEvaluations: [{
          ...mockApplication.spiritualEvaluations[0],
          scrollAlignment: 0.5, // Low alignment triggers committee review
          overallScore: 60
        }]
      };

      mockPrisma.applications.findUnique.mockResolvedValue(complexApplication);
      mockPrisma.admission_decisions.findFirst.mockResolvedValue(null);
      mockPrisma.users.findMany.mockResolvedValue([
        { id: 'elder_1', firstName: 'Elder', lastName: 'Smith', role: 'SCROLL_ELDER', email: 'elder@test.com' },
        { id: 'committee_1', firstName: 'Dr.', lastName: 'Johnson', role: 'ADMISSIONS_COMMITTEE', email: 'dr@test.com' }
      ]);
      mockPrisma.admissions_configuration.findMany.mockResolvedValue([]);
      mockPrisma.admission_decisions.create.mockResolvedValue({});
      mockPrisma.applications.update.mockResolvedValue({});

      const decisionRequest = {
        applicationId: 'app_123',
        requestType: 'AUTOMATED' as const,
        requesterRole: 'ADMISSIONS_OFFICER',
        requesterId: 'officer_123',
        priority: 'HIGH' as const
      };

      const result = await decisionManagementService.processAdmissionDecision(decisionRequest);

      expect(result.processType).toBe('COMMITTEE');
      expect(result.decisionMakers.length).toBeGreaterThan(1);
    });

    it('should validate decision requests properly', async () => {
      // Test with non-existent application
      mockPrisma.applications.findUnique.mockResolvedValue(null);

      const invalidRequest = {
        applicationId: 'nonexistent_app',
        requestType: 'AUTOMATED' as const,
        requesterRole: 'ADMISSIONS_OFFICER',
        requesterId: 'officer_123',
        priority: 'MEDIUM' as const
      };

      await expect(
        decisionManagementService.processAdmissionDecision(invalidRequest)
      ).rejects.toThrow('Application not found');
    });

    it('should prevent duplicate decisions', async () => {
      mockPrisma.applications.findUnique.mockResolvedValue(mockApplication);
      mockPrisma.admission_decisions.findFirst.mockResolvedValue({
        id: 'existing_decision',
        applicationId: 'app_123',
        decision: 'ACCEPTED'
      });

      const duplicateRequest = {
        applicationId: 'app_123',
        requestType: 'AUTOMATED' as const,
        requesterRole: 'ADMISSIONS_OFFICER',
        requesterId: 'officer_123',
        priority: 'MEDIUM' as const
      };

      await expect(
        decisionManagementService.processAdmissionDecision(duplicateRequest)
      ).rejects.toThrow('Decision already exists for this application');
    });
  });

  describe('Decision Analytics', () => {
    it('should generate decision metrics', async () => {
      const mockDecisions = [
        { decision: 'ACCEPTED', decisionDate: new Date('2024-01-15') },
        { decision: 'REJECTED', decisionDate: new Date('2024-01-16') },
        { decision: 'WAITLISTED', decisionDate: new Date('2024-01-17') },
        { decision: 'CONDITIONAL_ACCEPTANCE', decisionDate: new Date('2024-01-18') },
        { decision: 'ACCEPTED', decisionDate: new Date('2024-01-19') }
      ];

      mockPrisma.admission_decisions.findMany.mockResolvedValue(mockDecisions);

      const timeframe = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const metrics = await decisionManagementService.getDecisionMetrics(timeframe);

      expect(metrics.totalDecisions).toBe(5);
      expect(metrics.decisionBreakdown.accepted).toBe(2);
      expect(metrics.decisionBreakdown.rejected).toBe(1);
      expect(metrics.decisionBreakdown.waitlisted).toBe(1);
      expect(metrics.decisionBreakdown.conditional).toBe(1);
    });
  });
});

// Helper function for test expectations
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}