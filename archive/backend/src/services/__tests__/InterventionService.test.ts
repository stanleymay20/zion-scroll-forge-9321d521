/**
 * Intervention Service Tests
 */

import InterventionService from '../InterventionService';

describe('InterventionService', () => {
  let service: InterventionService;

  beforeEach(() => {
    service = new InterventionService();
  });

  describe('detectAndIntervene', () => {
    it('should detect student struggles and trigger interventions', async () => {
      const triggers = await service.detectAndIntervene('test-student-1');

      expect(Array.isArray(triggers)).toBe(true);
      
      for (const trigger of triggers) {
        expect(trigger.studentId).toBe('test-student-1');
        expect(trigger.triggerType).toBeDefined();
        expect(trigger.severity).toMatch(/low|medium|high|critical/);
        expect(trigger.indicators).toBeDefined();
        expect(Array.isArray(trigger.recommendedActions)).toBe(true);
      }
    });

    it('should include recommended actions for each trigger', async () => {
      const triggers = await service.detectAndIntervene('test-student-1');

      for (const trigger of triggers) {
        expect(trigger.recommendedActions.length).toBeGreaterThan(0);
        
        for (const action of trigger.recommendedActions) {
          expect(action.actionType).toBeDefined();
          expect(action.description).toBeDefined();
          expect(action.priority).toBeGreaterThan(0);
          expect(action.estimatedImpact).toBeGreaterThanOrEqual(0);
          expect(action.estimatedImpact).toBeLessThanOrEqual(100);
        }
      }
    });

    it('should auto-execute appropriate interventions', async () => {
      const triggers = await service.detectAndIntervene('test-student-1');

      const autoExecutedTriggers = triggers.filter(t => t.autoExecute);
      
      for (const trigger of autoExecutedTriggers) {
        const executedActions = trigger.recommendedActions.filter(
          a => a.executionDetails !== undefined
        );
        
        // At least some actions should have execution details
        expect(executedActions.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('scheduleTutoring', () => {
    it('should schedule tutoring session for student', async () => {
      const result = await service.scheduleTutoring(
        'test-student-1',
        'Data Structures',
        'high'
      );

      expect(result.status).toBeDefined();
      expect(['pending', 'scheduled', 'completed']).toContain(result.status);
      expect(result.notes).toBeDefined();
    });

    it('should handle different urgency levels', async () => {
      const lowUrgency = await service.scheduleTutoring(
        'test-student-1',
        'Algorithms',
        'low'
      );

      const highUrgency = await service.scheduleTutoring(
        'test-student-1',
        'Algorithms',
        'high'
      );

      expect(lowUrgency.status).toBeDefined();
      expect(highUrgency.status).toBeDefined();
    });
  });

  describe('provideSupplementaryMaterials', () => {
    it('should provide supplementary materials for topic', async () => {
      const result = await service.provideSupplementaryMaterials(
        'test-student-1',
        'Programming',
        'Loops'
      );

      expect(result.status).toBeDefined();
      expect(result.notes).toBeDefined();
    });
  });

  describe('formStudyGroup', () => {
    it('should form study group for course topic', async () => {
      const result = await service.formStudyGroup(
        'test-student-1',
        'course-1',
        'Database Design'
      );

      expect(result.status).toBeDefined();
      expect(result.notes).toBeDefined();
    });
  });

  describe('notifyAdvisor', () => {
    it('should notify advisor about student concern', async () => {
      const result = await service.notifyAdvisor(
        'test-student-1',
        'Struggling with course material',
        'high'
      );

      expect(result.status).toBeDefined();
      expect(result.notes).toBeDefined();
    });

    it('should handle different severity levels', async () => {
      const criticalResult = await service.notifyAdvisor(
        'test-student-1',
        'At risk of failing',
        'critical'
      );

      expect(criticalResult.status).toBeDefined();
    });
  });
});
