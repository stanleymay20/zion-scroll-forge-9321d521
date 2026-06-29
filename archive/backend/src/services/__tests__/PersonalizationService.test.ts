/**
 * Personalization Service Tests
 */

import PersonalizationService from '../PersonalizationService';

describe('PersonalizationService', () => {
  let service: PersonalizationService;

  beforeEach(() => {
    service = new PersonalizationService();
  });

  describe('analyzeStudent', () => {
    it('should perform comprehensive student analysis', async () => {
      const result = await service.analyzeStudent('test-student-1');

      expect(result).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.risk).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.interventions).toBeDefined();
      expect(Array.isArray(result.interventions)).toBe(true);
    });

    it('should include performance analysis', async () => {
      const result = await service.analyzeStudent('test-student-1');

      expect(result.performance.success).toBe(true);
      expect(result.performance.profile).toBeDefined();
      expect(result.performance.analysis).toBeDefined();
    });

    it('should include risk assessment', async () => {
      const result = await service.analyzeStudent('test-student-1');

      expect(result.risk.success).toBe(true);
      expect(result.risk.riskAssessment).toBeDefined();
      expect(result.risk.riskAssessment.overallRiskLevel).toMatch(/low|medium|high|critical/);
    });

    it('should include personalized recommendations', async () => {
      const result = await service.analyzeStudent('test-student-1');

      expect(result.recommendations.success).toBe(true);
      expect(Array.isArray(result.recommendations.recommendations)).toBe(true);
    });
  });

  describe('analyzePerformance', () => {
    it('should analyze student performance', async () => {
      const result = await service.analyzePerformance({
        studentId: 'test-student-1',
        includeSpiritual: true
      });

      expect(result.success).toBe(true);
      expect(result.profile).toBeDefined();
      expect(result.analysis).toBeDefined();
    });
  });

  describe('recommendResources', () => {
    it('should recommend resources for student', async () => {
      const result = await service.recommendResources({
        studentId: 'test-student-1',
        topic: 'Programming',
        maxRecommendations: 5
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('suggestPracticeProblems', () => {
    it('should suggest practice problems', async () => {
      const problems = await service.suggestPracticeProblems(
        'test-student-1',
        'Algorithms',
        5
      );

      expect(Array.isArray(problems)).toBe(true);
    });
  });

  describe('recommendStudyStrategies', () => {
    it('should recommend study strategies', async () => {
      const strategies = await service.recommendStudyStrategies('test-student-1');

      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBeGreaterThan(0);
    });
  });

  describe('detectAndIntervene', () => {
    it('should detect struggles and trigger interventions', async () => {
      const interventions = await service.detectAndIntervene('test-student-1');

      expect(Array.isArray(interventions)).toBe(true);
    });
  });

  describe('scheduleTutoring', () => {
    it('should schedule tutoring session', async () => {
      const result = await service.scheduleTutoring(
        'test-student-1',
        'Data Structures',
        'high'
      );

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });
  });

  describe('optimizePath', () => {
    it('should optimize learning path', async () => {
      const result = await service.optimizePath({
        studentId: 'test-student-1',
        goals: {
          goalType: 'degree',
          targetSkills: ['programming', 'databases'],
          careerAlignment: 'Software Engineer'
        }
      });

      expect(result.success).toBe(true);
      expect(result.learningPath).toBeDefined();
    });
  });

  describe('adjustPacing', () => {
    it('should adjust learning pace', async () => {
      const result = await service.adjustPacing('test-student-1', 'path-123');

      expect(result).toBeDefined();
      expect(result.adaptationType).toBe('pace_adjustment');
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
    });
  });

  describe('alignWithCareerGoals', () => {
    it('should align courses with career goals', async () => {
      const courses = await service.alignWithCareerGoals(
        'test-student-1',
        'Software Engineer'
      );

      expect(Array.isArray(courses)).toBe(true);
    });
  });

  describe('predictRisk', () => {
    it('should predict student risk', async () => {
      const result = await service.predictRisk({
        studentId: 'test-student-1',
        includeInterventions: true
      });

      expect(result.success).toBe(true);
      expect(result.riskAssessment).toBeDefined();
    });
  });

  describe('trackInterventionEffectiveness', () => {
    it('should track intervention effectiveness', async () => {
      const result = await service.trackInterventionEffectiveness(
        'test-student-1',
        'intervention-123'
      );

      expect(result).toBeDefined();
      expect(typeof result.effective).toBe('boolean');
    });
  });

  describe('getPersonalizedDashboard', () => {
    it('should generate personalized dashboard data', async () => {
      const dashboard = await service.getPersonalizedDashboard('test-student-1');

      expect(dashboard).toBeDefined();
      expect(dashboard.profile).toBeDefined();
      expect(dashboard.riskLevel).toBeDefined();
      expect(Array.isArray(dashboard.recommendations)).toBe(true);
      expect(Array.isArray(dashboard.upcomingMilestones)).toBe(true);
      expect(Array.isArray(dashboard.recentInterventions)).toBe(true);
    });

    it('should include risk level in dashboard', async () => {
      const dashboard = await service.getPersonalizedDashboard('test-student-1');

      expect(dashboard.riskLevel).toMatch(/low|medium|high|critical/);
    });
  });
});
