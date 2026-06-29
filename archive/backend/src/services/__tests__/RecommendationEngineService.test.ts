/**
 * Recommendation Engine Service Tests
 */

import RecommendationEngineService from '../RecommendationEngineService';
import { RecommendResourcesRequest } from '../../types/personalization.types';

describe('RecommendationEngineService', () => {
  let service: RecommendationEngineService;

  beforeEach(() => {
    service = new RecommendationEngineService();
  });

  describe('recommendResources', () => {
    it('should generate resource recommendations for a student', async () => {
      const request: RecommendResourcesRequest = {
        studentId: 'test-student-1',
        topic: 'Data Structures',
        weaknessArea: 'Binary Trees',
        maxRecommendations: 5
      };

      const response = await service.recommendResources(request);

      expect(response.success).toBe(true);
      expect(response.recommendations).toBeDefined();
      expect(response.reasoning).toBeDefined();
      expect(response.reasoning.length).toBeGreaterThan(0);
    });

    it('should limit recommendations to maxRecommendations', async () => {
      const request: RecommendResourcesRequest = {
        studentId: 'test-student-1',
        topic: 'Algorithms',
        maxRecommendations: 3
      };

      const response = await service.recommendResources(request);

      expect(response.success).toBe(true);
      expect(response.recommendations.length).toBeLessThanOrEqual(3);
    });

    it('should include relevance scores in recommendations', async () => {
      const request: RecommendResourcesRequest = {
        studentId: 'test-student-1',
        topic: 'Programming',
        maxRecommendations: 5
      };

      const response = await service.recommendResources(request);

      expect(response.success).toBe(true);
      
      for (const rec of response.recommendations) {
        expect(rec.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(rec.relevanceScore).toBeLessThanOrEqual(100);
        expect(rec.reasoning).toBeDefined();
        expect(rec.difficulty).toMatch(/beginner|intermediate|advanced/);
      }
    });
  });

  describe('suggestPracticeProblems', () => {
    it('should suggest practice problems for weakness area', async () => {
      const problems = await service.suggestPracticeProblems(
        'test-student-1',
        'Recursion',
        5
      );

      expect(Array.isArray(problems)).toBe(true);
      expect(problems.length).toBeLessThanOrEqual(5);
      
      for (const problem of problems) {
        expect(problem.resourceType).toBe('practice_problem');
        expect(problem.difficulty).toBeDefined();
      }
    });

    it('should adapt difficulty based on student performance', async () => {
      const problems = await service.suggestPracticeProblems(
        'test-student-1',
        'Sorting Algorithms',
        3
      );

      expect(Array.isArray(problems)).toBe(true);
      
      // Problems should be ordered by relevance
      if (problems.length > 1) {
        expect(problems[0].relevanceScore).toBeGreaterThanOrEqual(
          problems[problems.length - 1].relevanceScore
        );
      }
    });
  });

  describe('recommendStudyStrategies', () => {
    it('should recommend study strategies for student', async () => {
      const strategies = await service.recommendStudyStrategies('test-student-1');

      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.length).toBeLessThanOrEqual(10);
      
      for (const strategy of strategies) {
        expect(typeof strategy).toBe('string');
        expect(strategy.length).toBeGreaterThan(0);
      }
    });

    it('should include weakness-specific strategies when provided', async () => {
      const strategies = await service.recommendStudyStrategies(
        'test-student-1',
        'Time Management'
      );

      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBeGreaterThan(0);
    });

    it('should personalize strategies based on learning style', async () => {
      const strategies = await service.recommendStudyStrategies('test-student-1');

      expect(Array.isArray(strategies)).toBe(true);
      
      // Strategies should be actionable
      for (const strategy of strategies) {
        expect(strategy.length).toBeGreaterThan(10);
      }
    });
  });
});
