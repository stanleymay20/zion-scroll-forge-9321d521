/**
 * Course Recommendation Service Tests
 */

import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import CourseRecommendationService from '../CourseRecommendationService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    course: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null)
    },
    enrollment: {
      findMany: jest.fn().mockResolvedValue([])
    },
    submission: {
      findMany: jest.fn().mockResolvedValue([])
    }
  }))
}));

// Mock AI Gateway
jest.mock('../AIGatewayService', () => ({
  AIGatewayService: jest.fn().mockImplementation(() => ({
    generateText: jest.fn().mockResolvedValue({ text: 'AI response' })
  }))
}));

describe('CourseRecommendationService', () => {
  let service: CourseRecommendationService;

  beforeEach(() => {
    service = new CourseRecommendationService();
  });

  describe('recommendCourses', () => {
    it('should generate course recommendations', async () => {
      const request = {
        studentId: 'student-123',
        major: 'Computer Science',
        careerGoal: 'Software Engineer',
        currentSemester: 1
      };

      const response = await service.recommendCourses(request);

      expect(response.success).toBe(true);
      expect(response.degreePlan).toBeDefined();
      expect(response.degreePlan.studentId).toBe(request.studentId);
      expect(response.degreePlan.major).toBe(request.major);
    });

    it('should handle errors gracefully', async () => {
      const request = {
        studentId: '',
        major: '',
        currentSemester: 1
      };

      const response = await service.recommendCourses(request);

      // Service handles errors gracefully and returns a response
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.degreePlan).toBeDefined();
    });
  });

  describe('generateDegreePlan', () => {
    it('should generate a 4-year degree plan', async () => {
      const plan = await service.generateDegreePlan(
        'student-123',
        'Computer Science'
      );

      expect(plan).toBeDefined();
      expect(plan.studentId).toBe('student-123');
      expect(plan.major).toBe('Computer Science');
      expect(plan.courses).toBeInstanceOf(Array);
      expect(plan.milestones).toBeInstanceOf(Array);
    });
  });
});
