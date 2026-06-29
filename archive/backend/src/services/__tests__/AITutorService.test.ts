/**
 * AI Tutor Service Tests
 * "Test all things; hold fast what is good" - 1 Thessalonians 5:21
 */

import { PrismaClient } from '@prisma/client';
import { aiTutorService } from '../AITutorService';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    aITutorSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn()
    },
    portalCourse: {
      findUnique: jest.fn()
    },
    $connect: jest.fn(),
    $disconnect: jest.fn()
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    on: jest.fn(),
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    expire: jest.fn()
  }))
}));

// Mock axios for OpenAI calls
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger
jest.mock('../../utils/productionLogger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('AITutorService', () => {
  let prisma: any;

  beforeEach(() => {
    prisma = new PrismaClient();
    jest.clearAllMocks();
  });

  describe('startSession', () => {
    it('should create a new tutoring session successfully', async () => {
      const mockSession = {
        sessionId: 'test-session-id',
        userId: 'test-user-id',
        portalCourseId: null,
        tutorType: 'general',
        conversationHistory: [],
        sessionData: {
          metadata: {
            startedAt: new Date(),
            lastActivityAt: new Date(),
            messageCount: 0,
            topicsDiscussed: []
          },
          analytics: {
            totalResponseTime: 0,
            averageResponseTime: 0,
            totalTokensUsed: 0,
            questionsAnswered: 0,
            clarificationsNeeded: 0
          }
        },
        status: 'active'
      };

      prisma.aITutorSession.create.mockResolvedValue(mockSession);

      const session = await aiTutorService.startSession(
        'test-user-id',
        undefined,
        'general'
      );

      expect(session).toBeDefined();
      expect(session.id).toBe('test-session-id');
      expect(session.userId).toBe('test-user-id');
      expect(session.tutorType).toBe('general');
      expect(prisma.aITutorSession.create).toHaveBeenCalledTimes(1);
    });

    it('should create session with course context', async () => {
      const mockCourse = {
        portalCourseId: 'course-123',
        title: 'Test Course',
        faculty: { name: 'Test Faculty' },
        level: 'Intermediate',
        description: 'Test description'
      };

      const mockSession = {
        sessionId: 'test-session-id',
        userId: 'test-user-id',
        portalCourseId: 'course-123',
        tutorType: 'math',
        conversationHistory: [],
        sessionData: {},
        status: 'active'
      };

      prisma.portalCourse.findUnique.mockResolvedValue(mockCourse);
      prisma.aITutorSession.create.mockResolvedValue(mockSession);

      const session = await aiTutorService.startSession(
        'test-user-id',
        'course-123',
        'math'
      );

      expect(session.courseId).toBe('course-123');
      expect(prisma.portalCourse.findUnique).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      prisma.aITutorSession.create.mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        aiTutorService.startSession('test-user-id', undefined, 'general')
      ).rejects.toThrow('Failed to start tutoring session');
    });
  });

  describe('sendMessage', () => {
    it('should process message and return response', async () => {
      const mockSession = {
        sessionId: 'test-session-id',
        userId: 'test-user-id',
        portalCourseId: null,
        tutorType: 'general',
        conversationHistory: [],
        sessionData: {
          metadata: {
            startedAt: new Date(),
            lastActivityAt: new Date(),
            messageCount: 0,
            topicsDiscussed: []
          },
          analytics: {
            totalResponseTime: 0,
            averageResponseTime: 0,
            totalTokensUsed: 0,
            questionsAnswered: 0,
            clarificationsNeeded: 0
          }
        }
      };

      prisma.aITutorSession.findUnique.mockResolvedValue(mockSession);
      prisma.aITutorSession.update.mockResolvedValue(mockSession);

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: 'This is a test response from the AI tutor.'
            }
          }],
          usage: {
            total_tokens: 150
          }
        }
      });

      const response = await aiTutorService.sendMessage(
        'test-session-id',
        'What is calculus?'
      );

      expect(response).toBeDefined();
      expect(response.message).toBe('This is a test response from the AI tutor.');
      expect(response.tokensUsed).toBe(150);
      expect(response.responseTime).toBeGreaterThanOrEqual(0);
      expect(prisma.aITutorSession.update).toHaveBeenCalled();
    });

    it('should handle session not found', async () => {
      prisma.aITutorSession.findUnique.mockResolvedValue(null);

      await expect(
        aiTutorService.sendMessage('invalid-session', 'test message')
      ).rejects.toThrow();
    });

    it('should track analytics correctly', async () => {
      const mockSession = {
        sessionId: 'test-session-id',
        userId: 'test-user-id',
        tutorType: 'general',
        conversationHistory: [],
        sessionData: {
          metadata: {
            messageCount: 0,
            topicsDiscussed: []
          },
          analytics: {
            totalResponseTime: 0,
            averageResponseTime: 0,
            totalTokensUsed: 0,
            questionsAnswered: 0,
            clarificationsNeeded: 0
          }
        }
      };

      prisma.aITutorSession.findUnique.mockResolvedValue(mockSession);
      prisma.aITutorSession.update.mockResolvedValue(mockSession);

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Response' } }],
          usage: { total_tokens: 100 }
        }
      });

      await aiTutorService.sendMessage('test-session-id', 'test');

      const updateCall = prisma.aITutorSession.update.mock.calls[0][0];
      const analytics = updateCall.data.sessionData.analytics;

      expect(analytics.questionsAnswered).toBe(1);
      expect(analytics.totalTokensUsed).toBe(100);
      expect(analytics.totalResponseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('endSession', () => {
    it('should end session with analytics', async () => {
      const mockSession = {
        sessionId: 'test-session-id',
        sessionData: {
          analytics: {
            totalResponseTime: 5000,
            averageResponseTime: 2500,
            totalTokensUsed: 500,
            questionsAnswered: 2,
            clarificationsNeeded: 0
          }
        }
      };

      prisma.aITutorSession.findUnique.mockResolvedValue(mockSession);
      prisma.aITutorSession.update.mockResolvedValue(mockSession);

      const analytics = await aiTutorService.endSession(
        'test-session-id',
        5,
        'Great session!'
      );

      expect(analytics).toBeDefined();
      expect(analytics.satisfactionRating).toBe(5);
      expect(analytics.effectiveness).toBeGreaterThan(0);
      expect(prisma.aITutorSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: 'test-session-id' },
          data: expect.objectContaining({
            endedAt: expect.any(Date),
            satisfactionRating: 5,
            status: 'completed'
          })
        })
      );
    });
  });

  describe('getUserTutorAnalytics', () => {
    it('should calculate user analytics correctly', async () => {
      const mockSessions = [
        {
          tutorType: 'math',
          sessionData: {
            analytics: {
              questionsAnswered: 5,
              totalTokensUsed: 500,
              totalResponseTime: 10000,
              satisfactionRating: 5,
              effectiveness: 0.9
            },
            metadata: {
              topicsDiscussed: ['calculus', 'algebra']
            }
          }
        },
        {
          tutorType: 'programming',
          sessionData: {
            analytics: {
              questionsAnswered: 3,
              totalTokensUsed: 300,
              totalResponseTime: 6000,
              satisfactionRating: 4,
              effectiveness: 0.8
            },
            metadata: {
              topicsDiscussed: ['algorithms', 'data structure']
            }
          }
        }
      ];

      prisma.aITutorSession.findMany.mockResolvedValue(mockSessions);

      const analytics = await aiTutorService.getUserTutorAnalytics('test-user-id');

      expect(analytics.totalSessions).toBe(2);
      expect(analytics.totalMessages).toBe(8);
      expect(analytics.averageSatisfaction).toBe(4.5);
      expect(analytics.totalTokensUsed).toBe(800);
      expect(analytics.tutorTypeUsage).toEqual({
        math: 1,
        programming: 1
      });
      expect(analytics.topTopics).toContain('calculus');
    });

    it('should handle user with no sessions', async () => {
      prisma.aITutorSession.findMany.mockResolvedValue([]);

      const analytics = await aiTutorService.getUserTutorAnalytics('test-user-id');

      expect(analytics.totalSessions).toBe(0);
      expect(analytics.totalMessages).toBe(0);
      expect(analytics.averageSatisfaction).toBe(0);
    });
  });

  describe('Prompt Engineering', () => {
    it('should generate appropriate system prompts for different tutor types', async () => {
      const tutorTypes = ['general', 'math', 'science', 'theology', 'programming'];

      for (const type of tutorTypes) {
        const mockSession = {
          sessionId: `session-${type}`,
          userId: 'test-user',
          tutorType: type,
          conversationHistory: [],
          sessionData: {}
        };

        prisma.aITutorSession.create.mockResolvedValue(mockSession);

        const session = await aiTutorService.startSession(
          'test-user',
          undefined,
          type
        );

        expect(session.tutorType).toBe(type);
      }
    });
  });

  describe('Context Management', () => {
    it('should limit conversation history to MAX_CONTEXT_MESSAGES', async () => {
      const longHistory = Array(30).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: new Date()
      }));

      const mockSession = {
        sessionId: 'test-session',
        userId: 'test-user',
        tutorType: 'general',
        conversationHistory: longHistory,
        sessionData: {
          metadata: { messageCount: 30, topicsDiscussed: [] },
          analytics: {
            totalResponseTime: 0,
            averageResponseTime: 0,
            totalTokensUsed: 0,
            questionsAnswered: 0,
            clarificationsNeeded: 0
          }
        }
      };

      prisma.aITutorSession.findUnique.mockResolvedValue(mockSession);
      prisma.aITutorSession.update.mockResolvedValue(mockSession);

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Response' } }],
          usage: { total_tokens: 100 }
        }
      });

      await aiTutorService.sendMessage('test-session', 'New message');

      // Verify that OpenAI was called with limited context
      const apiCall = mockedAxios.post.mock.calls[0];
      const messages = apiCall[1].messages;

      // Should have system prompt + max context + new message
      expect(messages.length).toBeLessThanOrEqual(22); // 1 system + 20 context + 1 new
    });
  });
});
