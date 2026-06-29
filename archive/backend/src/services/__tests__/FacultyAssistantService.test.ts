/**
 * Faculty Assistant Service Tests
 * Tests AI teaching assistant, discussion grading, quiz generation,
 * extension management, and office hours scheduling
 */

import FacultyAssistantService from '../FacultyAssistantService';
import {
  TeachingAssistantQuery,
  ProfessorTeachingStyle,
  DiscussionPost,
  DiscussionGradingCriteria,
  QuizGenerationRequest,
  ExtensionRequest,
  ExtensionPolicy
} from '../../types/faculty-support.types';

// Mock dependencies
jest.mock('../AIGatewayService');
jest.mock('../VectorStoreService');
jest.mock('../AICacheService');

describe('FacultyAssistantService', () => {
  let service: FacultyAssistantService;

  beforeEach(() => {
    service = new FacultyAssistantService();
    jest.clearAllMocks();
  });

  // ============================================================================
  // Teaching Assistant Tests
  // ============================================================================

  describe('answerStudentQuestion', () => {
    it('should answer student question using course materials', async () => {
      const query: TeachingAssistantQuery = {
        question: 'What is the difference between supervised and unsupervised learning?',
        courseId: 'course_123',
        studentId: 'student_456'
      };

      const teachingStyle: ProfessorTeachingStyle = {
        tone: 'encouraging',
        responseLength: 'detailed',
        exampleUsage: 'frequent',
        scriptureIntegration: 'contextual'
      };

      const response = await service.answerStudentQuestion(query, teachingStyle);

      expect(response).toBeDefined();
      expect(response.answer).toBeDefined();
      expect(response.confidence).toBeGreaterThanOrEqual(0);
      expect(response.confidence).toBeLessThanOrEqual(1);
      expect(response.sources).toBeInstanceOf(Array);
      expect(typeof response.professorReviewNeeded).toBe('boolean');
    });

    it('should flag low confidence answers for professor review', async () => {
      const query: TeachingAssistantQuery = {
        question: 'Obscure technical question with no course materials',
        courseId: 'course_123',
        studentId: 'student_456'
      };

      const teachingStyle: ProfessorTeachingStyle = {
        tone: 'formal',
        responseLength: 'concise',
        exampleUsage: 'minimal',
        scriptureIntegration: 'minimal'
      };

      const response = await service.answerStudentQuestion(query, teachingStyle);

      if (response.confidence < 0.85) {
        expect(response.professorReviewNeeded).toBe(true);
      }
    });

    it('should include sources in response', async () => {
      const query: TeachingAssistantQuery = {
        question: 'Explain neural networks',
        courseId: 'course_123',
        studentId: 'student_456'
      };

      const teachingStyle: ProfessorTeachingStyle = {
        tone: 'casual',
        responseLength: 'detailed',
        exampleUsage: 'frequent',
        scriptureIntegration: 'often'
      };

      const response = await service.answerStudentQuestion(query, teachingStyle);

      expect(response.sources).toBeDefined();
      expect(response.sources.length).toBeGreaterThanOrEqual(0);
      expect(response.sources.length).toBeLessThanOrEqual(3);
    });

    it('should generate follow-up questions', async () => {
      const query: TeachingAssistantQuery = {
        question: 'What is machine learning?',
        courseId: 'course_123',
        studentId: 'student_456'
      };

      const teachingStyle: ProfessorTeachingStyle = {
        tone: 'socratic',
        responseLength: 'comprehensive',
        exampleUsage: 'frequent',
        scriptureIntegration: 'always'
      };

      const response = await service.answerStudentQuestion(query, teachingStyle);

      expect(response.suggestedFollowUp).toBeDefined();
      expect(response.suggestedFollowUp).toBeInstanceOf(Array);
    });
  });

  // ============================================================================
  // Discussion Grading Tests
  // ============================================================================

  describe('gradeDiscussionParticipation', () => {
    const criteria: DiscussionGradingCriteria = {
      participationWeight: 0.25,
      criticalThinkingWeight: 0.35,
      peerEngagementWeight: 0.20,
      substantiveContributionWeight: 0.20,
      minimumPosts: 3,
      minimumWordCount: 150
    };

    it('should grade discussion participation', async () => {
      const posts: DiscussionPost[] = [
        {
          id: 'post_1',
          studentId: 'student_123',
          courseId: 'course_456',
          discussionId: 'disc_789',
          content: 'This is a thoughtful response that demonstrates critical thinking about the topic. I believe that the integration of AI in education presents both opportunities and challenges. On one hand, it can personalize learning experiences. On the other hand, we must be careful to maintain human connection and spiritual formation.',
          timestamp: new Date(),
          wordCount: 52
        },
        {
          id: 'post_2',
          studentId: 'student_123',
          courseId: 'course_456',
          discussionId: 'disc_789',
          content: 'Building on the previous discussion, I would add that biblical wisdom should guide our use of technology. As Proverbs 4:7 says, "Wisdom is the principal thing." We need wisdom to discern how to use AI tools effectively while maintaining our focus on Christ.',
          timestamp: new Date(),
          wordCount: 48
        },
        {
          id: 'post_3',
          studentId: 'student_123',
          courseId: 'course_456',
          discussionId: 'disc_789',
          content: '@peer Great point about the ethical considerations. I agree that we need to think carefully about bias in AI systems and ensure they align with Christian values of justice and equity.',
          timestamp: new Date(),
          wordCount: 35
        }
      ];

      const grade = await service.gradeDiscussionParticipation(
        posts,
        criteria,
        'student_123'
      );

      expect(grade).toBeDefined();
      expect(grade.studentId).toBe('student_123');
      expect(grade.overallScore).toBeGreaterThanOrEqual(0);
      expect(grade.overallScore).toBeLessThanOrEqual(100);
      expect(grade.participationScore).toBeDefined();
      expect(grade.criticalThinkingScore).toBeDefined();
      expect(grade.peerEngagementScore).toBeDefined();
      expect(grade.substantiveContributionScore).toBeDefined();
      expect(grade.feedback).toBeDefined();
      expect(grade.strengths).toBeInstanceOf(Array);
      expect(grade.areasForImprovement).toBeInstanceOf(Array);
      expect(grade.postCount).toBe(3);
    });

    it('should return zero grade for no posts', async () => {
      const posts: DiscussionPost[] = [];

      const grade = await service.gradeDiscussionParticipation(
        posts,
        criteria,
        'student_123'
      );

      expect(grade.overallScore).toBe(0);
      expect(grade.postCount).toBe(0);
      expect(grade.feedback).toContain('No posts');
    });

    it('should calculate participation score based on post count', async () => {
      const posts: DiscussionPost[] = [
        {
          id: 'post_1',
          studentId: 'student_123',
          courseId: 'course_456',
          discussionId: 'disc_789',
          content: 'Short post',
          timestamp: new Date(),
          wordCount: 10
        }
      ];

      const grade = await service.gradeDiscussionParticipation(
        posts,
        criteria,
        'student_123'
      );

      expect(grade.participationScore).toBeLessThan(1.0);
    });

    it('should evaluate peer engagement', async () => {
      const posts: DiscussionPost[] = [
        {
          id: 'post_1',
          studentId: 'student_123',
          courseId: 'course_456',
          discussionId: 'disc_789',
          content: '@peer1 Great point! I agree with your analysis.',
          timestamp: new Date(),
          wordCount: 20
        },
        {
          id: 'post_2',
          studentId: 'student_123',
          courseId: 'course_456',
          discussionId: 'disc_789',
          content: '@peer2 I have a different perspective on this issue.',
          timestamp: new Date(),
          wordCount: 20
        }
      ];

      const grade = await service.gradeDiscussionParticipation(
        posts,
        criteria,
        'student_123'
      );

      expect(grade.peerEngagementScore).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Quiz Generation Tests
  // ============================================================================

  describe('generateQuiz', () => {
    it('should generate quiz with specified parameters', async () => {
      const request: QuizGenerationRequest = {
        courseId: 'course_123',
        topics: ['Machine Learning', 'Neural Networks'],
        learningObjectives: [
          'Understand supervised learning',
          'Explain neural network architecture'
        ],
        difficulty: 'medium',
        questionCount: 5,
        questionTypes: ['multiple-choice', 'short-answer'],
        includeScripture: true
      };

      const quiz = await service.generateQuiz(request);

      expect(quiz).toBeDefined();
      expect(quiz.title).toBeDefined();
      expect(quiz.description).toBeDefined();
      expect(quiz.questions).toBeInstanceOf(Array);
      expect(quiz.questions.length).toBeGreaterThan(0);
      expect(quiz.questions.length).toBeLessThanOrEqual(request.questionCount);
      expect(quiz.estimatedTime).toBeGreaterThan(0);
      expect(quiz.totalPoints).toBeGreaterThan(0);
      expect(quiz.answerKey).toBeDefined();
    });

    it('should generate questions of specified difficulty', async () => {
      const request: QuizGenerationRequest = {
        courseId: 'course_123',
        topics: ['AI Ethics'],
        learningObjectives: ['Understand ethical implications of AI'],
        difficulty: 'hard',
        questionCount: 3,
        questionTypes: ['essay'],
        includeScripture: true
      };

      const quiz = await service.generateQuiz(request);

      quiz.questions.forEach(question => {
        expect(question.difficulty).toBe('hard');
      });
    });

    it('should include answer key', async () => {
      const request: QuizGenerationRequest = {
        courseId: 'course_123',
        topics: ['Deep Learning'],
        learningObjectives: ['Understand backpropagation'],
        difficulty: 'medium',
        questionCount: 2,
        questionTypes: ['multiple-choice'],
        includeScripture: false
      };

      const quiz = await service.generateQuiz(request);

      expect(quiz.answerKey).toBeDefined();
      expect(quiz.answerKey.questions).toBeInstanceOf(Array);
      expect(quiz.answerKey.questions.length).toBe(quiz.questions.length);
    });

    it('should generate multiple question types', async () => {
      const request: QuizGenerationRequest = {
        courseId: 'course_123',
        topics: ['Computer Vision'],
        learningObjectives: ['Understand image processing'],
        difficulty: 'easy',
        questionCount: 4,
        questionTypes: ['multiple-choice', 'true-false', 'short-answer'],
        includeScripture: false
      };

      const quiz = await service.generateQuiz(request);

      const types = new Set(quiz.questions.map(q => q.type));
      expect(types.size).toBeGreaterThan(1);
    });
  });

  // ============================================================================
  // Extension Management Tests
  // ============================================================================

  describe('evaluateExtensionRequest', () => {
    const policy: ExtensionPolicy = {
      maxExtensionDays: 7,
      maxExtensionsPerCourse: 2,
      autoApprovalThreshold: 0.85,
      requiresDocumentation: true
    };

    const studentHistory = {
      totalExtensionsRequested: 1,
      totalExtensionsApproved: 1,
      academicStanding: 'good'
    };

    it('should evaluate extension request', async () => {
      const request: ExtensionRequest = {
        id: 'ext_123',
        studentId: 'student_456',
        courseId: 'course_789',
        assignmentId: 'assign_101',
        requestDate: new Date(),
        originalDueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        requestedDueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        reason: 'I have been dealing with a family emergency that has required my attention. I have documentation from my advisor.'
      };

      const decision = await service.evaluateExtensionRequest(
        request,
        policy,
        studentHistory
      );

      expect(decision).toBeDefined();
      expect(typeof decision.approved).toBe('boolean');
      expect(decision.reasoning).toBeDefined();
      expect(decision.confidence).toBeGreaterThanOrEqual(0);
      expect(decision.confidence).toBeLessThanOrEqual(1);
      expect(typeof decision.requiresHumanReview).toBe('boolean');
      expect(decision.responseMessage).toBeDefined();
    });

    it('should deny extension exceeding max days', async () => {
      const request: ExtensionRequest = {
        id: 'ext_123',
        studentId: 'student_456',
        courseId: 'course_789',
        assignmentId: 'assign_101',
        requestDate: new Date(),
        originalDueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        requestedDueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        reason: 'Need more time'
      };

      const decision = await service.evaluateExtensionRequest(
        request,
        policy,
        studentHistory
      );

      expect(decision.approved).toBe(false);
      expect(decision.reasoning).toContain('exceeds maximum');
    });

    it('should deny extension when max extensions reached', async () => {
      const request: ExtensionRequest = {
        id: 'ext_123',
        studentId: 'student_456',
        courseId: 'course_789',
        assignmentId: 'assign_101',
        requestDate: new Date(),
        originalDueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        requestedDueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        reason: 'Need more time'
      };

      const maxedHistory = {
        totalExtensionsRequested: 2,
        totalExtensionsApproved: 2,
        academicStanding: 'good'
      };

      const decision = await service.evaluateExtensionRequest(
        request,
        policy,
        maxedHistory
      );

      expect(decision.approved).toBe(false);
      expect(decision.reasoning).toContain('Maximum extensions');
    });

    it('should flag low confidence decisions for human review', async () => {
      const request: ExtensionRequest = {
        id: 'ext_123',
        studentId: 'student_456',
        courseId: 'course_789',
        assignmentId: 'assign_101',
        requestDate: new Date(),
        originalDueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        requestedDueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        reason: 'Vague reason without details'
      };

      const decision = await service.evaluateExtensionRequest(
        request,
        policy,
        studentHistory
      );

      if (decision.confidence < 0.80) {
        expect(decision.requiresHumanReview).toBe(true);
      }
    });
  });

  // ============================================================================
  // Office Hours Scheduling Tests
  // ============================================================================

  describe('scheduleAppointment', () => {
    it('should schedule office hours appointment', async () => {
      const appointment = {
        studentId: 'student_123',
        facultyId: 'faculty_456',
        courseId: 'course_789',
        scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        duration: 30,
        topic: 'Discuss assignment feedback',
        priority: 'medium' as const
      };

      const scheduled = await service.scheduleAppointment(appointment);

      expect(scheduled).toBeDefined();
      expect(scheduled.id).toBeDefined();
      expect(scheduled.status).toBe('scheduled');
      expect(scheduled.studentId).toBe(appointment.studentId);
      expect(scheduled.facultyId).toBe(appointment.facultyId);
    });
  });

  describe('sendAppointmentReminder', () => {
    it('should send appointment reminder', async () => {
      const reminder = await service.sendAppointmentReminder('appt_123');

      expect(reminder).toBeDefined();
      expect(reminder.appointmentId).toBe('appt_123');
      expect(reminder.sentAt).toBeDefined();
    });
  });

  describe('prepareStudentBriefing', () => {
    it('should prepare student briefing for office hours', async () => {
      const briefing = await service.prepareStudentBriefing(
        'student_123',
        'faculty_456'
      );

      expect(briefing).toBeDefined();
      expect(briefing.studentId).toBe('student_123');
      expect(briefing.name).toBeDefined();
      expect(briefing.courseEnrollments).toBeInstanceOf(Array);
      expect(briefing.recentPerformance).toBeDefined();
      expect(briefing.recentQuestions).toBeInstanceOf(Array);
      expect(briefing.upcomingDeadlines).toBeInstanceOf(Array);
      expect(briefing.concernAreas).toBeInstanceOf(Array);
      expect(briefing.strengths).toBeInstanceOf(Array);
      expect(briefing.recommendedTopics).toBeInstanceOf(Array);
    });
  });

  describe('recordMeetingOutcome', () => {
    it('should record meeting outcome', async () => {
      const outcome = {
        appointmentId: 'appt_123',
        attendanceStatus: 'attended' as const,
        topicsDiscussed: ['Assignment feedback', 'Study strategies'],
        actionItems: ['Review chapter 5', 'Complete practice problems'],
        followUpNeeded: true,
        facultyNotes: 'Student is making good progress'
      };

      await expect(service.recordMeetingOutcome(outcome)).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // Metrics Tests
  // ============================================================================

  describe('getMetrics', () => {
    it('should retrieve faculty assistant metrics', async () => {
      const metrics = await service.getMetrics('faculty_123', 'course_456');

      expect(metrics).toBeDefined();
      expect(typeof metrics.totalQuestions).toBe('number');
      expect(typeof metrics.autoResponded).toBe('number');
      expect(typeof metrics.flaggedForReview).toBe('number');
      expect(typeof metrics.averageConfidence).toBe('number');
      expect(typeof metrics.averageResponseTime).toBe('number');
      expect(typeof metrics.studentSatisfaction).toBe('number');
      expect(typeof metrics.facultySatisfaction).toBe('number');
    });
  });

  describe('updateConfig', () => {
    it('should update faculty assistant configuration', async () => {
      const config = {
        facultyId: 'faculty_123',
        courseId: 'course_456',
        teachingStyle: {
          tone: 'encouraging' as const,
          responseLength: 'detailed' as const,
          exampleUsage: 'frequent' as const,
          scriptureIntegration: 'contextual' as const
        },
        autoResponseEnabled: true,
        confidenceThreshold: 0.85,
        maxResponseTime: 5000
      };

      await expect(service.updateConfig(config)).resolves.not.toThrow();
    });
  });
});
