/**
 * Interview Evaluation and Recording System Tests
 * "Test all things; hold fast what is good" (1 Thessalonians 5:21)
 */

import { InterviewEvaluator } from '../InterviewEvaluator';
import { VideoConferenceManager } from '../VideoConferenceManager';
import { InterviewAssessmentProcessor } from '../InterviewAssessmentProcessor';
import { FollowUpInterviewCoordinator } from '../FollowUpInterviewCoordinator';
import { InterviewType, InterviewFormat, RecommendationType } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    interviewRecord: {
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn()
    }
  })),
  InterviewType: {
    INITIAL_SCREENING: 'INITIAL_SCREENING',
    ACADEMIC_ASSESSMENT: 'ACADEMIC_ASSESSMENT',
    SPIRITUAL_EVALUATION: 'SPIRITUAL_EVALUATION',
    CHARACTER_INTERVIEW: 'CHARACTER_INTERVIEW',
    FINAL_INTERVIEW: 'FINAL_INTERVIEW',
    COMMITTEE_INTERVIEW: 'COMMITTEE_INTERVIEW'
  },
  InterviewFormat: {
    VIDEO_CONFERENCE: 'VIDEO_CONFERENCE',
    PHONE_CALL: 'PHONE_CALL',
    IN_PERSON: 'IN_PERSON',
    ASYNCHRONOUS_VIDEO: 'ASYNCHRONOUS_VIDEO'
  },
  RecommendationType: {
    STRONG_RECOMMEND: 'STRONG_RECOMMEND',
    RECOMMEND: 'RECOMMEND',
    NEUTRAL: 'NEUTRAL',
    NOT_RECOMMEND: 'NOT_RECOMMEND',
    STRONG_NOT_RECOMMEND: 'STRONG_NOT_RECOMMEND'
  }
}));

describe('InterviewEvaluator', () => {
  let evaluator: InterviewEvaluator;

  beforeEach(() => {
    evaluator = new InterviewEvaluator();
    jest.clearAllMocks();
  });

  describe('createEvaluationForm', () => {
    it('should create evaluation form for spiritual evaluation', async () => {
      const criteria = await evaluator.createEvaluationForm(InterviewType.SPIRITUAL_EVALUATION);

      expect(criteria.interviewType).toBe(InterviewType.SPIRITUAL_EVALUATION);
      expect(criteria.weightings.spiritualMaturity).toBeGreaterThan(0.3); // Higher weight for spiritual evaluation
      expect(criteria.rubrics.spiritualMaturity).toBeDefined();
      expect(criteria.rubrics.spiritualMaturity.length).toBeGreaterThan(0);
      expect(criteria.requiredElements).toContain('Opening prayer');
      expect(criteria.requiredElements).toContain('Personal testimony');
    });

    it('should create evaluation form for academic assessment', async () => {
      const criteria = await evaluator.createEvaluationForm(InterviewType.ACADEMIC_ASSESSMENT);

      expect(criteria.interviewType).toBe(InterviewType.ACADEMIC_ASSESSMENT);
      expect(criteria.weightings.academicReadiness).toBeGreaterThan(0.3); // Higher weight for academic assessment
      expect(criteria.rubrics.academicReadiness).toBeDefined();
      expect(criteria.requiredElements).toContain('Academic transcript review');
    });

    it('should have proper rubric levels', async () => {
      const criteria = await evaluator.createEvaluationForm(InterviewType.INITIAL_SCREENING);

      const communicationRubric = criteria.rubrics.communication;
      expect(communicationRubric).toHaveLength(5); // 5 levels (2, 4, 6, 8, 10)
      
      const excellentLevel = communicationRubric.find(level => level.score === 10);
      expect(excellentLevel).toBeDefined();
      expect(excellentLevel!.description).toContain('Exceptional');
      expect(excellentLevel!.indicators.length).toBeGreaterThan(0);
    });
  });

  describe('submitEvaluation', () => {
    it('should successfully submit complete evaluation', async () => {
      const mockPrisma = require('@prisma/client').PrismaClient();
      mockPrisma.interviewRecord.update.mockResolvedValue({});

      const evaluation = {
        interviewId: 'interview-1',
        evaluatorId: 'evaluator-1',
        evaluatorName: 'John Smith',
        scores: {
          communication: 8,
          spiritualMaturity: 9,
          academicReadiness: 7,
          characterAssessment: 8,
          motivationLevel: 9,
          culturalFit: 8,
          overallScore: 8.2
        },
        observations: {
          strengths: ['Clear testimony', 'Strong calling'],
          concerns: ['Minor nervousness'],
          notableQuotes: ['God has called me to serve'],
          behavioralObservations: ['Professional demeanor'],
          spiritualInsights: ['Deep faith evident'],
          academicCapabilities: ['Strong analytical skills']
        },
        recommendation: {
          type: RecommendationType.RECOMMEND,
          confidence: 8,
          reasoning: 'Strong candidate with clear calling',
          conditions: [],
          nextSteps: ['Proceed to final interview']
        },
        followUpActions: [],
        completedAt: new Date()
      };

      await expect(evaluator.submitEvaluation(evaluation)).resolves.not.toThrow();

      expect(mockPrisma.interviewRecord.update).toHaveBeenCalledWith({
        where: { id: 'interview-1' },
        data: expect.objectContaining({
          communicationScore: 8,
          spiritualMaturityScore: 9,
          academicReadinessScore: 7,
          characterScore: 8,
          motivationScore: 9,
          culturalFitScore: 8,
          overallRecommendation: RecommendationType.RECOMMEND,
          status: 'COMPLETED'
        })
      });
    });

    it('should validate evaluation completeness', async () => {
      const incompleteEvaluation = {
        interviewId: 'interview-1',
        evaluatorId: 'evaluator-1',
        evaluatorName: 'John Smith',
        scores: {
          communication: 8,
          // Missing other scores
        },
        observations: {
          strengths: [],
          concerns: [],
          notableQuotes: [],
          behavioralObservations: [],
          spiritualInsights: [],
          academicCapabilities: []
        },
        recommendation: {
          type: RecommendationType.RECOMMEND,
          confidence: 8,
          reasoning: 'Test',
          conditions: [],
          nextSteps: []
        },
        followUpActions: [],
        completedAt: new Date()
      };

      await expect(evaluator.submitEvaluation(incompleteEvaluation as any))
        .rejects.toThrow('spiritualMaturity score is required');
    });

    it('should validate score ranges', async () => {
      const invalidEvaluation = {
        interviewId: 'interview-1',
        evaluatorId: 'evaluator-1',
        evaluatorName: 'John Smith',
        scores: {
          communication: 15, // Invalid score > 10
          spiritualMaturity: 9,
          academicReadiness: 7,
          characterAssessment: 8,
          motivationLevel: 9,
          culturalFit: 8,
          overallScore: 8.2
        },
        observations: {
          strengths: [],
          concerns: [],
          notableQuotes: [],
          behavioralObservations: [],
          spiritualInsights: [],
          academicCapabilities: []
        },
        recommendation: {
          type: RecommendationType.RECOMMEND,
          confidence: 8,
          reasoning: 'Test',
          conditions: [],
          nextSteps: []
        },
        followUpActions: [],
        completedAt: new Date()
      };

      await expect(evaluator.submitEvaluation(invalidEvaluation as any))
        .rejects.toThrow('communication score must be between 1 and 10');
    });
  });

  describe('generateEvaluationReport', () => {
    it('should generate comprehensive evaluation report', async () => {
      const mockInterviews = [
        {
          id: 'interview-1',
          interviewType: InterviewType.INITIAL_SCREENING,
          scheduledDate: new Date('2024-03-15T10:00:00Z'),
          status: 'COMPLETED',
          overallRecommendation: RecommendationType.RECOMMEND,
          communicationScore: 8,
          spiritualMaturityScore: 9,
          academicReadinessScore: 7,
          characterScore: 8,
          motivationScore: 9,
          culturalFitScore: 8
        },
        {
          id: 'interview-2',
          interviewType: InterviewType.SPIRITUAL_EVALUATION,
          scheduledDate: new Date('2024-03-16T14:00:00Z'),
          status: 'COMPLETED',
          overallRecommendation: RecommendationType.STRONG_RECOMMEND,
          communicationScore: 9,
          spiritualMaturityScore: 10,
          academicReadinessScore: 8,
          characterScore: 9,
          motivationScore: 9,
          culturalFitScore: 9
        }
      ];

      const mockPrisma = require('@prisma/client').PrismaClient();
      mockPrisma.interviewRecord.findMany.mockResolvedValue(mockInterviews);

      const report = await evaluator.generateEvaluationReport('app-1');

      expect(report.applicationId).toBe('app-1');
      expect(report.totalInterviews).toBe(2);
      expect(report.completedInterviews).toBe(2);
      expect(report.averageScores).toBeDefined();
      expect(report.averageScores.communication).toBe(8.5);
      expect(report.averageScores.spiritualMaturity).toBe(9.5);
      expect(report.overallRecommendation).toBe(RecommendationType.STRONG_RECOMMEND);
      expect(report.interviewSummaries).toHaveLength(2);
    });
  });
});

describe('VideoConferenceManager', () => {
  let manager: VideoConferenceManager;

  beforeEach(() => {
    manager = new VideoConferenceManager();
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create video conference session', async () => {
      const config = {
        platform: 'zoom' as any,
        duration: 60,
        recordingEnabled: true,
        transcriptionEnabled: true,
        waitingRoomEnabled: true,
        participantVideo: true,
        participantAudio: true,
        chatEnabled: true,
        screenSharingEnabled: true,
        securitySettings: {
          requirePassword: true,
          requireRegistration: false,
          allowJoinBeforeHost: false,
          muteParticipantsOnEntry: true,
          lockMeetingAfterStart: true,
          enableWaitingRoom: true
        }
      };

      const session = await manager.createSession('interview-1', config);

      expect(session.sessionId).toBeDefined();
      expect(session.interviewId).toBe('interview-1');
      expect(session.platform).toBe('zoom');
      expect(session.meetingUrl).toContain('zoom.us');
      expect(session.status).toBe('scheduled');
      expect(session.recording.recordingStatus).toBe('not_started');
    });

    it('should handle different platforms', async () => {
      const teamsConfig = {
        platform: 'teams' as any,
        duration: 45,
        recordingEnabled: true,
        transcriptionEnabled: false,
        waitingRoomEnabled: false,
        participantVideo: true,
        participantAudio: true,
        chatEnabled: true,
        screenSharingEnabled: true,
        securitySettings: {
          requirePassword: false,
          requireRegistration: false,
          allowJoinBeforeHost: true,
          muteParticipantsOnEntry: false,
          lockMeetingAfterStart: false,
          enableWaitingRoom: false
        }
      };

      const session = await manager.createSession('interview-2', teamsConfig);

      expect(session.platform).toBe('teams');
      expect(session.meetingUrl).toContain('teams.microsoft.com');
    });
  });

  describe('startSession', () => {
    it('should start video conference session', async () => {
      // Mock session retrieval
      const mockSession = {
        sessionId: 'session-1',
        interviewId: 'interview-1',
        platform: 'zoom',
        status: 'scheduled',
        recording: { recordingStatus: 'not_started' }
      };

      jest.spyOn(manager, 'getSession').mockResolvedValue(mockSession as any);
      jest.spyOn(manager as any, 'updateSession').mockResolvedValue(undefined);
      jest.spyOn(manager as any, 'initializePlatformSession').mockResolvedValue(undefined);
      jest.spyOn(manager, 'startRecording').mockResolvedValue(undefined);

      await expect(manager.startSession('session-1')).resolves.not.toThrow();
    });

    it('should handle session not found', async () => {
      jest.spyOn(manager, 'getSession').mockResolvedValue(null);

      await expect(manager.startSession('nonexistent')).rejects.toThrow('Session not found');
    });
  });

  describe('getTechnicalRequirements', () => {
    it('should return Zoom requirements', () => {
      const requirements = manager.getTechnicalRequirements('zoom' as any);

      expect(requirements.minimumBandwidth).toBe('1.5 Mbps up/down');
      expect(requirements.supportedBrowsers).toContain('Chrome');
      expect(requirements.systemRequirements.length).toBeGreaterThan(0);
    });

    it('should return Teams requirements', () => {
      const requirements = manager.getTechnicalRequirements('teams' as any);

      expect(requirements.minimumBandwidth).toBe('1.2 Mbps up/down');
      expect(requirements.supportedBrowsers).toContain('Edge');
    });
  });

  describe('testConnection', () => {
    it('should return connection quality assessment', async () => {
      const quality = await manager.testConnection('user-1');

      expect(['excellent', 'good', 'fair', 'poor']).toContain(quality);
    });
  });
});

describe('InterviewAssessmentProcessor', () => {
  let processor: InterviewAssessmentProcessor;

  beforeEach(() => {
    processor = new InterviewAssessmentProcessor();
    jest.clearAllMocks();
  });

  describe('processAssessment', () => {
    it('should process comprehensive assessment', async () => {
      const mockVideoSession = {
        sessionId: 'session-1',
        recording: {
          recordingUrl: 'https://example.com/recording.mp4',
          transcriptUrl: 'https://example.com/transcript.txt'
        }
      };

      const mockEvaluation = {
        interviewId: 'interview-1',
        scores: {
          communication: 8,
          spiritualMaturity: 9,
          academicReadiness: 7,
          characterAssessment: 8,
          motivationLevel: 9,
          culturalFit: 8
        },
        observations: {
          strengths: ['Clear testimony'],
          concerns: ['Minor nervousness']
        },
        recommendation: {
          type: RecommendationType.RECOMMEND,
          confidence: 8
        }
      };

      const assessment = await processor.processAssessment(
        'interview-1',
        mockVideoSession as any,
        mockEvaluation as any
      );

      expect(assessment.interviewId).toBe('interview-1');
      expect(assessment.analysisId).toBeDefined();
      expect(assessment.analysisType.length).toBeGreaterThan(0);
      expect(assessment.results.transcriptAnalysis).toBeDefined();
      expect(assessment.results.videoAnalysis).toBeDefined();
      expect(assessment.results.audioAnalysis).toBeDefined();
      expect(assessment.insights.strengths.length).toBeGreaterThan(0);
      expect(assessment.recommendations.overallRecommendation).toBeDefined();
      expect(assessment.confidence).toBeGreaterThan(0);
    });

    it('should handle missing video session', async () => {
      const mockEvaluation = {
        interviewId: 'interview-1',
        scores: {
          communication: 8,
          spiritualMaturity: 9,
          academicReadiness: 7,
          characterAssessment: 8,
          motivationLevel: 9,
          culturalFit: 8
        },
        observations: {
          strengths: ['Clear testimony'],
          concerns: []
        },
        recommendation: {
          type: RecommendationType.RECOMMEND,
          confidence: 8
        }
      };

      const assessment = await processor.processAssessment(
        'interview-1',
        undefined,
        mockEvaluation as any
      );

      expect(assessment.interviewId).toBe('interview-1');
      expect(assessment.results.transcriptAnalysis).toBeUndefined();
      expect(assessment.results.videoAnalysis).toBeUndefined();
      expect(assessment.results.behavioralAnalysis).toBeDefined();
      expect(assessment.results.sentimentAnalysis).toBeDefined();
    });
  });

  describe('generateAssessmentReport', () => {
    it('should generate comprehensive assessment report', async () => {
      const report = await processor.generateAssessmentReport('interview-1');

      expect(report.interviewId).toBe('interview-1');
      expect(report.reportGeneratedAt).toBeDefined();
      expect(report.executiveSummary).toBeDefined();
      expect(report.executiveSummary.overallScore).toBeDefined();
      expect(report.executiveSummary.recommendation).toBeDefined();
      expect(report.executiveSummary.keyStrengths).toBeInstanceOf(Array);
      expect(report.executiveSummary.keyConcerns).toBeInstanceOf(Array);
      expect(report.detailedAnalysis).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });
  });

  describe('compareWithBenchmarks', () => {
    it('should compare assessment with benchmarks', async () => {
      const mockAssessment = {
        analysisId: 'analysis-1',
        interviewId: 'interview-1',
        recommendations: {
          overallRecommendation: RecommendationType.RECOMMEND
        }
      };

      const comparison = await processor.compareWithBenchmarks(mockAssessment as any);

      expect(comparison.overallPerformance).toBeDefined();
      expect(comparison.overallPerformance.percentile).toBeGreaterThan(0);
      expect(comparison.categoryComparisons).toBeInstanceOf(Array);
      expect(comparison.categoryComparisons.length).toBeGreaterThan(0);
      expect(comparison.cohortComparison).toBeDefined();
      expect(comparison.cohortComparison.totalApplicants).toBeGreaterThan(0);
    });
  });
});

describe('FollowUpInterviewCoordinator', () => {
  let coordinator: FollowUpInterviewCoordinator;

  beforeEach(() => {
    coordinator = new FollowUpInterviewCoordinator();
    jest.clearAllMocks();
  });

  describe('generateFollowUpRecommendations', () => {
    it('should generate recommendations for low scores', async () => {
      const mockEvaluation = {
        interviewId: 'interview-1',
        scores: {
          communication: 8,
          spiritualMaturity: 5, // Low score
          academicReadiness: 4, // Low score
          characterAssessment: 8,
          motivationLevel: 9,
          culturalFit: 8
        },
        observations: {
          strengths: ['Good motivation'],
          concerns: ['Communication issues', 'Academic preparation']
        },
        recommendation: {
          type: RecommendationType.NEUTRAL,
          confidence: 6
        }
      };

      const recommendations = await coordinator.generateFollowUpRecommendations(
        'interview-1',
        mockEvaluation as any
      );

      expect(recommendations.length).toBeGreaterThan(0);
      
      // Should have spiritual evaluation follow-up
      const spiritualFollowUp = recommendations.find(r => 
        r.suggestedInterviewType === InterviewType.SPIRITUAL_EVALUATION
      );
      expect(spiritualFollowUp).toBeDefined();
      expect(spiritualFollowUp!.priority).toBe('high');

      // Should have academic assessment follow-up
      const academicFollowUp = recommendations.find(r => 
        r.suggestedInterviewType === InterviewType.ACADEMIC_ASSESSMENT
      );
      expect(academicFollowUp).toBeDefined();
      expect(academicFollowUp!.priority).toBe('high');

      // Should have committee review for neutral recommendation
      const committeeReview = recommendations.find(r => 
        r.recommendationType === 'committee_review'
      );
      expect(committeeReview).toBeDefined();
    });

    it('should generate recommendations for concerns', async () => {
      const mockEvaluation = {
        interviewId: 'interview-1',
        scores: {
          communication: 8,
          spiritualMaturity: 8,
          academicReadiness: 8,
          characterAssessment: 8,
          motivationLevel: 8,
          culturalFit: 8
        },
        observations: {
          strengths: ['Strong overall performance'],
          concerns: ['Communication clarity issues']
        },
        recommendation: {
          type: RecommendationType.RECOMMEND,
          confidence: 8
        }
      };

      const recommendations = await coordinator.generateFollowUpRecommendations(
        'interview-1',
        mockEvaluation as any
      );

      const communicationFollowUp = recommendations.find(r => 
        r.specificFocus.includes('Communication skills')
      );
      expect(communicationFollowUp).toBeDefined();
      expect(communicationFollowUp!.priority).toBe('medium');
    });

    it('should generate final confirmation for strong recommendations', async () => {
      const mockEvaluation = {
        interviewId: 'interview-1',
        scores: {
          communication: 9,
          spiritualMaturity: 10,
          academicReadiness: 9,
          characterAssessment: 9,
          motivationLevel: 9,
          culturalFit: 9
        },
        observations: {
          strengths: ['Exceptional candidate'],
          concerns: []
        },
        recommendation: {
          type: RecommendationType.STRONG_RECOMMEND,
          confidence: 10
        }
      };

      const recommendations = await coordinator.generateFollowUpRecommendations(
        'interview-1',
        mockEvaluation as any
      );

      const finalConfirmation = recommendations.find(r => 
        r.recommendationType === 'final_confirmation'
      );
      expect(finalConfirmation).toBeDefined();
      expect(finalConfirmation!.suggestedInterviewType).toBe(InterviewType.FINAL_INTERVIEW);
      expect(finalConfirmation!.priority).toBe('low');
    });
  });

  describe('scheduleFollowUpInterviews', () => {
    it('should schedule follow-up interviews based on recommendations', async () => {
      const mockRecommendations = [
        {
          recommendationId: 'rec-1',
          originalInterviewId: 'interview-1',
          recommendationType: 'deep_dive' as any,
          priority: 'high' as any,
          reasoning: ['Low spiritual maturity score'],
          suggestedInterviewType: InterviewType.SPIRITUAL_EVALUATION,
          suggestedTimeframe: '3-5 days',
          specificFocus: ['Personal testimony'],
          requiredParticipants: [
            {
              role: 'spiritual_advisor' as any,
              required: true,
              reason: 'Spiritual assessment needed'
            }
          ],
          preparationRequirements: ['Prepare testimony'],
          successCriteria: ['Clear testimony']
        }
      ];

      const schedule = await coordinator.scheduleFollowUpInterviews(mockRecommendations);

      expect(schedule.scheduleId).toBeDefined();
      expect(schedule.originalInterviewId).toBe('interview-1');
      expect(schedule.followUpInterviews).toHaveLength(1);
      expect(schedule.overallTimeline.length).toBeGreaterThan(0);
      expect(schedule.status).toBe('scheduled');

      const followUp = schedule.followUpInterviews[0];
      expect(followUp.interviewType).toBe(InterviewType.SPIRITUAL_EVALUATION);
      expect(followUp.participants.length).toBeGreaterThan(0);
      expect(followUp.preparationMaterials.length).toBeGreaterThan(0);
    });

    it('should prioritize urgent recommendations first', async () => {
      const mockRecommendations = [
        {
          recommendationId: 'rec-1',
          originalInterviewId: 'interview-1',
          recommendationType: 'clarification' as any,
          priority: 'medium' as any,
          reasoning: ['Medium priority'],
          suggestedInterviewType: InterviewType.CHARACTER_INTERVIEW,
          suggestedTimeframe: '5-7 days',
          specificFocus: ['Character'],
          requiredParticipants: [],
          preparationRequirements: [],
          successCriteria: []
        },
        {
          recommendationId: 'rec-2',
          originalInterviewId: 'interview-1',
          recommendationType: 'deep_dive' as any,
          priority: 'urgent' as any,
          reasoning: ['Urgent concern'],
          suggestedInterviewType: InterviewType.SPIRITUAL_EVALUATION,
          suggestedTimeframe: '1-2 days',
          specificFocus: ['Spiritual maturity'],
          requiredParticipants: [],
          preparationRequirements: [],
          successCriteria: []
        }
      ];

      const schedule = await coordinator.scheduleFollowUpInterviews(mockRecommendations);

      expect(schedule.followUpInterviews).toHaveLength(2);
      
      // First interview should be the urgent one
      expect(schedule.followUpInterviews[0].interviewType).toBe(InterviewType.SPIRITUAL_EVALUATION);
      expect(schedule.followUpInterviews[1].interviewType).toBe(InterviewType.CHARACTER_INTERVIEW);
    });
  });

  describe('coordinateCommitteeReview', () => {
    it('should coordinate standard committee review', async () => {
      const committeeMembers = ['member-1', 'member-2', 'member-3'];

      const review = await coordinator.coordinateCommitteeReview(
        'interview-1',
        committeeMembers,
        'standard'
      );

      expect(review.followUpId).toBeDefined();
      expect(review.interviewType).toBe(InterviewType.COMMITTEE_INTERVIEW);
      expect(review.duration).toBe(60);
      expect(review.participants).toHaveLength(3);
      expect(review.focus).toContain('Overall assessment');
      expect(review.preparationMaterials.length).toBeGreaterThan(0);
    });

    it('should coordinate expedited committee review', async () => {
      const committeeMembers = ['member-1', 'member-2'];

      const review = await coordinator.coordinateCommitteeReview(
        'interview-1',
        committeeMembers,
        'expedited'
      );

      expect(review.duration).toBe(30);
      expect(review.focus).toContain('Quick decision');
    });

    it('should coordinate comprehensive committee review', async () => {
      const committeeMembers = ['member-1', 'member-2', 'member-3', 'member-4'];

      const review = await coordinator.coordinateCommitteeReview(
        'interview-1',
        committeeMembers,
        'comprehensive'
      );

      expect(review.duration).toBe(90);
      expect(review.focus).toContain('Detailed review');
      expect(review.focus).toContain('Final decision');
    });
  });

  describe('completeFollowUpInterview', () => {
    it('should complete follow-up interview and check for additional needs', async () => {
      const mockEvaluation = {
        interviewId: 'followup-1',
        scores: {
          communication: 8,
          spiritualMaturity: 8,
          academicReadiness: 8,
          characterAssessment: 8,
          motivationLevel: 8,
          culturalFit: 8
        },
        observations: {
          strengths: ['Improved performance'],
          concerns: []
        },
        recommendation: {
          type: RecommendationType.RECOMMEND,
          confidence: 8
        }
      };

      await expect(coordinator.completeFollowUpInterview(
        'followup-1',
        mockEvaluation as any
      )).resolves.not.toThrow();
    });
  });
});