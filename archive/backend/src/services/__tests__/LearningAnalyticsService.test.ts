/**
 * Learning Analytics Service Tests
 * "Test everything; hold fast what is good" - 1 Thessalonians 5:21
 */

import { PrismaClient } from '@prisma/client';
import LearningAnalyticsService from '../LearningAnalyticsService';
import { AnalyzePerformanceRequest } from '../../types/personalization.types';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    enrollment: {
      findMany: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    }
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient)
  };
});

// Mock AIGatewayService
jest.mock('../AIGatewayService', () => {
  return {
    AIGatewayService: jest.fn().mockImplementation(() => ({
      generateCompletion: jest.fn()
    }))
  };
});

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('LearningAnalyticsService', () => {
  let service: LearningAnalyticsService;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LearningAnalyticsService();
    mockPrisma = new PrismaClient();
  });

  describe('analyzePerformance', () => {
    it('should analyze student performance successfully', async () => {
      // Mock data
      const mockUser = {
        id: 'student-1',
        scrollAlignment: 85,
        portalEnrollments: [],
        aiTutorSessions: []
      };

      const mockEnrollments = [
        {
          id: 'enrollment-1',
          userId: 'student-1',
          courseId: 'course-1',
          progress: 75,
          scrollXPEarned: 500,
          course: {
            id: 'course-1',
            title: 'Sacred AI Engineering'
          },
          submissions: [
            {
              id: 'sub-1',
              score: 90,
              status: 'GRADED',
              submittedAt: new Date('2024-01-15'),
              assignment: {
                type: 'QUIZ',
                dueDate: new Date('2024-01-16')
              },
              scrollAlignment: 85,
              kingdomImpact: 80
            },
            {
              id: 'sub-2',
              score: 85,
              status: 'GRADED',
              submittedAt: new Date('2024-01-20'),
              assignment: {
                type: 'PROJECT',
                dueDate: new Date('2024-01-21')
              },
              scrollAlignment: 90,
              kingdomImpact: 85
            },
            {
              id: 'sub-3',
              score: 88,
              status: 'GRADED',
              submittedAt: new Date('2024-01-25'),
              assignment: {
                type: 'ESSAY',
                dueDate: new Date('2024-01-26')
              },
              scrollAlignment: 87,
              kingdomImpact: 82
            }
          ]
        }
      ];

      mockPrisma.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request: AnalyzePerformanceRequest = {
        studentId: 'student-1',
        includeSpiritual: true
      };

      const result = await service.analyzePerformance(request);

      expect(result.success).toBe(true);
      expect(result.profile).toBeDefined();
      expect(result.profile.studentId).toBe('student-1');
      expect(result.profile.performanceMetrics.averageScore).toBeGreaterThan(0);
      expect(result.analysis).toBeDefined();
      expect(result.analysis.strengths.length).toBeGreaterThan(0);
    });

    it('should identify strengths correctly', async () => {
      const mockUser = {
        id: 'student-2',
        scrollAlignment: 90,
        portalEnrollments: [],
        aiTutorSessions: []
      };

      const mockEnrollments = [
        {
          id: 'enrollment-1',
          userId: 'student-2',
          courseId: 'course-1',
          progress: 90,
          scrollXPEarned: 800,
          course: {
            id: 'course-1',
            title: 'Advanced Theology'
          },
          submissions: [
            {
              id: 'sub-1',
              score: 95,
              status: 'GRADED',
              submittedAt: new Date(),
              assignment: { type: 'QUIZ', dueDate: new Date() },
              scrollAlignment: 95,
              kingdomImpact: 90
            },
            {
              id: 'sub-2',
              score: 92,
              status: 'GRADED',
              submittedAt: new Date(),
              assignment: { type: 'QUIZ', dueDate: new Date() },
              scrollAlignment: 93,
              kingdomImpact: 88
            },
            {
              id: 'sub-3',
              score: 94,
              status: 'GRADED',
              submittedAt: new Date(),
              assignment: { type: 'QUIZ', dueDate: new Date() },
              scrollAlignment: 94,
              kingdomImpact: 89
            }
          ]
        }
      ];

      mockPrisma.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request: AnalyzePerformanceRequest = {
        studentId: 'student-2'
      };

      const result = await service.analyzePerformance(request);

      expect(result.success).toBe(true);
      expect(result.analysis.strengths.length).toBeGreaterThan(0);
      expect(result.analysis.strengths[0].proficiencyLevel).toBeGreaterThan(85);
    });

    it('should identify weaknesses correctly', async () => {
      const mockUser = {
        id: 'student-3',
        scrollAlignment: 60,
        portalEnrollments: [],
        aiTutorSessions: []
      };

      const mockEnrollments = [
        {
          id: 'enrollment-1',
          userId: 'student-3',
          courseId: 'course-1',
          progress: 40,
          scrollXPEarned: 200,
          course: {
            id: 'course-1',
            title: 'Mathematics'
          },
          submissions: [
            {
              id: 'sub-1',
              score: 55,
              status: 'GRADED',
              submittedAt: new Date(),
              assignment: { type: 'QUIZ', dueDate: new Date() },
              scrollAlignment: 60,
              kingdomImpact: 55
            },
            {
              id: 'sub-2',
              score: 60,
              status: 'GRADED',
              submittedAt: new Date(),
              assignment: { type: 'QUIZ', dueDate: new Date() },
              scrollAlignment: 62,
              kingdomImpact: 58
            },
            {
              id: 'sub-3',
              score: 58,
              status: 'GRADED',
              submittedAt: new Date(),
              assignment: { type: 'QUIZ', dueDate: new Date() },
              scrollAlignment: 61,
              kingdomImpact: 57
            }
          ]
        }
      ];

      mockPrisma.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request: AnalyzePerformanceRequest = {
        studentId: 'student-3'
      };

      const result = await service.analyzePerformance(request);

      expect(result.success).toBe(true);
      expect(result.analysis.weaknesses.length).toBeGreaterThan(0);
      expect(result.analysis.weaknesses[0].proficiencyLevel).toBeLessThan(70);
      expect(result.analysis.weaknesses[0].recommendedActions.length).toBeGreaterThan(0);
    });

    it('should detect learning patterns', async () => {
      const mockUser = {
        id: 'student-4',
        scrollAlignment: 75,
        portalEnrollments: [],
        aiTutorSessions: [
          { id: 'session-1' },
          { id: 'session-2' },
          { id: 'session-3' }
        ]
      };

      const lateNightDate = new Date();
      lateNightDate.setHours(22); // 10 PM

      const mockEnrollments = [
        {
          id: 'enrollment-1',
          userId: 'student-4',
          courseId: 'course-1',
          progress: 60,
          scrollXPEarned: 400,
          course: {
            id: 'course-1',
            title: 'Computer Science'
          },
          submissions: [
            {
              id: 'sub-1',
              score: 75,
              status: 'GRADED',
              submittedAt: lateNightDate,
              assignment: { type: 'PROJECT', dueDate: new Date() },
              scrollAlignment: 75,
              kingdomImpact: 70
            },
            {
              id: 'sub-2',
              score: 78,
              status: 'GRADED',
              submittedAt: lateNightDate,
              assignment: { type: 'PROJECT', dueDate: new Date() },
              scrollAlignment: 76,
              kingdomImpact: 72
            }
          ]
        }
      ];

      mockPrisma.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request: AnalyzePerformanceRequest = {
        studentId: 'student-4'
      };

      const result = await service.analyzePerformance(request);

      expect(result.success).toBe(true);
      expect(result.analysis.patterns.length).toBeGreaterThan(0);
      
      // Should detect evening study pattern
      const eveningPattern = result.analysis.patterns.find(
        p => p.patternType === 'study_time_preference'
      );
      expect(eveningPattern).toBeDefined();
    });

    it('should assess risk level correctly', async () => {
      const mockUser = {
        id: 'student-5',
        scrollAlignment: 50,
        portalEnrollments: [],
        aiTutorSessions: []
      };

      const mockEnrollments = [
        {
          id: 'enrollment-1',
          userId: 'student-5',
          courseId: 'course-1',
          progress: 30,
          scrollXPEarned: 100,
          course: {
            id: 'course-1',
            title: 'Physics'
          },
          submissions: [
            {
              id: 'sub-1',
              score: 45,
              status: 'GRADED',
              submittedAt: new Date(),
              assignment: { type: 'QUIZ', dueDate: new Date() },
              scrollAlignment: 50,
              kingdomImpact: 45
            },
            {
              id: 'sub-2',
              score: 50,
              status: 'GRADED',
              submittedAt: new Date(),
              assignment: { type: 'QUIZ', dueDate: new Date() },
              scrollAlignment: 52,
              kingdomImpact: 48
            }
          ]
        }
      ];

      mockPrisma.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request: AnalyzePerformanceRequest = {
        studentId: 'student-5'
      };

      const result = await service.analyzePerformance(request);

      expect(result.success).toBe(true);
      expect(result.profile.riskLevel).toMatch(/high|critical/);
      expect(result.analysis.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.enrollment.findMany.mockRejectedValue(new Error('Database error'));

      const request: AnalyzePerformanceRequest = {
        studentId: 'student-error'
      };

      const result = await service.analyzePerformance(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.profile.studentId).toBe('student-error');
    });

    it('should calculate spiritual growth metrics when requested', async () => {
      const mockUser = {
        id: 'student-6',
        scrollAlignment: 88,
        portalEnrollments: [],
        aiTutorSessions: []
      };

      const mockEnrollments = [
        {
          id: 'enrollment-1',
          userId: 'student-6',
          courseId: 'course-1',
          progress: 80,
          scrollXPEarned: 600,
          course: {
            id: 'course-1',
            title: 'Spiritual Formation'
          },
          submissions: [
            {
              id: 'sub-1',
              score: 90,
              status: 'GRADED',
              submittedAt: new Date(),
              assignment: { type: 'ESSAY', dueDate: new Date() },
              scrollAlignment: 92,
              kingdomImpact: 88
            }
          ]
        }
      ];

      mockPrisma.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request: AnalyzePerformanceRequest = {
        studentId: 'student-6',
        includeSpiritual: true
      };

      const result = await service.analyzePerformance(request);

      expect(result.success).toBe(true);
      expect(result.profile.spiritualGrowth).toBeDefined();
      expect(result.profile.spiritualGrowth.scrollAlignment).toBeGreaterThan(0);
      expect(result.profile.spiritualGrowth.spiritualMaturity).toBeGreaterThan(0);
    });

    it('should generate appropriate recommendations', async () => {
      const mockUser = {
        id: 'student-7',
        scrollAlignment: 70,
        portalEnrollments: [],
        aiTutorSessions: []
      };

      const mockEnrollments = [
        {
          id: 'enrollment-1',
          userId: 'student-7',
          courseId: 'course-1',
          progress: 50,
          scrollXPEarned: 300,
          course: {
            id: 'course-1',
            title: 'Programming'
          },
          submissions: [
            {
              id: 'sub-1',
              score: 65,
              status: 'GRADED',
              submittedAt: new Date(),
              assignment: { type: 'PROJECT', dueDate: new Date() },
              scrollAlignment: 70,
              kingdomImpact: 65
            },
            {
              id: 'sub-2',
              score: 68,
              status: 'GRADED',
              submittedAt: new Date(),
              assignment: { type: 'PROJECT', dueDate: new Date() },
              scrollAlignment: 72,
              kingdomImpact: 67
            }
          ]
        }
      ];

      mockPrisma.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request: AnalyzePerformanceRequest = {
        studentId: 'student-7'
      };

      const result = await service.analyzePerformance(request);

      expect(result.success).toBe(true);
      expect(result.analysis.recommendations.length).toBeGreaterThan(0);
      expect(result.analysis.recommendations.some(r => r.includes('tutor') || r.includes('support'))).toBe(true);
    });
  });
});
