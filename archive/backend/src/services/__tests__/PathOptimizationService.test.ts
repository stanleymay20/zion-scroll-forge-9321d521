/**
 * Path Optimization Service Tests
 */

import PathOptimizationService from '../PathOptimizationService';
import { OptimizePathRequest, LearningGoal } from '../../types/personalization.types';

describe('PathOptimizationService', () => {
  let service: PathOptimizationService;

  beforeEach(() => {
    service = new PathOptimizationService();
  });

  describe('optimizePath', () => {
    it('should generate optimized learning path', async () => {
      const goals: LearningGoal = {
        goalType: 'degree',
        targetProgram: 'Computer Science',
        targetSkills: ['programming', 'algorithms', 'databases'],
        careerAlignment: 'Software Engineer'
      };

      const request: OptimizePathRequest = {
        studentId: 'test-student-1',
        goals
      };

      const response = await service.optimizePath(request);

      expect(response.success).toBe(true);
      expect(response.learningPath).toBeDefined();
      expect(response.learningPath.recommendedCourses).toBeDefined();
      expect(response.learningPath.milestones).toBeDefined();
      expect(response.learningPath.estimatedCompletion).toBeDefined();
    });

    it('should include course recommendations with prerequisites', async () => {
      const goals: LearningGoal = {
        goalType: 'degree',
        targetSkills: ['web development'],
        careerAlignment: 'Web Developer'
      };

      const request: OptimizePathRequest = {
        studentId: 'test-student-1',
        goals
      };

      const response = await service.optimizePath(request);

      expect(response.success).toBe(true);
      
      for (const course of response.learningPath.recommendedCourses) {
        expect(course.courseId).toBeDefined();
        expect(course.courseTitle).toBeDefined();
        expect(course.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(course.relevanceScore).toBeLessThanOrEqual(100);
        expect(course.prerequisitesMet).toBeDefined();
      }
    });

    it('should generate alternative paths', async () => {
      const goals: LearningGoal = {
        goalType: 'degree',
        targetSkills: ['data science'],
        careerAlignment: 'Data Scientist'
      };

      const request: OptimizePathRequest = {
        studentId: 'test-student-1',
        goals
      };

      const response = await service.optimizePath(request);

      expect(response.success).toBe(true);
      expect(response.alternativePaths).toBeDefined();
      expect(Array.isArray(response.alternativePaths)).toBe(true);
    });

    it('should respect course load constraints', async () => {
      const goals: LearningGoal = {
        goalType: 'degree',
        targetSkills: ['programming']
      };

      const request: OptimizePathRequest = {
        studentId: 'test-student-1',
        goals,
        constraints: {
          maxCoursesPerSemester: 3,
          preferredPace: 'slow'
        }
      };

      const response = await service.optimizePath(request);

      expect(response.success).toBe(true);
      expect(response.learningPath.recommendedCourses).toBeDefined();
    });
  });

  describe('adjustPacing', () => {
    it('should adjust pacing based on student performance', async () => {
      const adaptation = await service.adjustPacing(
        'test-student-1',
        'path-123'
      );

      expect(adaptation).toBeDefined();
      expect(adaptation.adaptationType).toBe('pace_adjustment');
      expect(adaptation.reason).toBeDefined();
      expect(adaptation.impact).toBeDefined();
      expect(adaptation.appliedDate).toBeDefined();
    });
  });

  describe('balanceCourseLoad', () => {
    it('should evaluate course load balance', async () => {
      const result = await service.balanceCourseLoad(
        'test-student-1',
        ['course-1', 'course-2', 'course-3']
      );

      expect(result).toBeDefined();
      expect(typeof result.balanced).toBe('boolean');
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide recommendations for heavy loads', async () => {
      const result = await service.balanceCourseLoad(
        'test-student-1',
        ['course-1', 'course-2', 'course-3', 'course-4', 'course-5', 'course-6']
      );

      expect(result.balanced).toBe(false);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('alignWithCareerGoals', () => {
    it('should recommend courses aligned with career goals', async () => {
      const recommendations = await service.alignWithCareerGoals(
        'test-student-1',
        'Software Engineer'
      );

      expect(Array.isArray(recommendations)).toBe(true);
      
      for (const rec of recommendations) {
        expect(rec.courseId).toBeDefined();
        expect(rec.courseTitle).toBeDefined();
        expect(rec.careerAlignment).toBeGreaterThanOrEqual(0);
        expect(rec.careerAlignment).toBeLessThanOrEqual(100);
        expect(rec.reasoning).toBeDefined();
      }
    });

    it('should sort recommendations by relevance', async () => {
      const recommendations = await service.alignWithCareerGoals(
        'test-student-1',
        'Data Scientist'
      );

      if (recommendations.length > 1) {
        expect(recommendations[0].relevanceScore).toBeGreaterThanOrEqual(
          recommendations[recommendations.length - 1].relevanceScore
        );
      }
    });
  });
});
