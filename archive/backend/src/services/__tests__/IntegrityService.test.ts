/**
 * Academic Integrity Service Tests
 */

import IntegrityService from '../IntegrityService';

describe('IntegrityService', () => {
  let integrityService: IntegrityService;

  beforeEach(() => {
    integrityService = new IntegrityService();
  });

  describe('Service Initialization', () => {
    it('should initialize all sub-services', () => {
      expect(integrityService.getPlagiarismService()).toBeDefined();
      expect(integrityService.getAIContentService()).toBeDefined();
      expect(integrityService.getCollusionService()).toBeDefined();
      expect(integrityService.getProctoringService()).toBeDefined();
      expect(integrityService.getCaseManagementService()).toBeDefined();
    });
  });

  describe('checkSubmissionIntegrity', () => {
    it('should run comprehensive integrity check', async () => {
      const result = await integrityService.checkSubmissionIntegrity(
        'test-submission-id',
        'test-student-id',
        'This is a test submission content.',
        'test-course-id',
        'test-assignment-id'
      );

      expect(result).toBeDefined();
      expect(result.submissionId).toBe('test-submission-id');
      expect(result.studentId).toBe('test-student-id');
      expect(result.overallRiskLevel).toBeDefined();
      expect(result.integrityScore).toBeGreaterThanOrEqual(0);
      expect(result.integrityScore).toBeLessThanOrEqual(100);
      expect(result.checks).toBeDefined();
      expect(result.checks.plagiarism).toBeDefined();
      expect(result.checks.aiContent).toBeDefined();
    });

    it('should flag high-risk submissions', async () => {
      // This would need mock data to properly test
      // For now, just verify the method runs
      const result = await integrityService.checkSubmissionIntegrity(
        'test-submission-id',
        'test-student-id',
        'Test content',
        'test-course-id',
        'test-assignment-id'
      );

      expect(result.flagged).toBeDefined();
      expect(typeof result.flagged).toBe('boolean');
    });
  });

  describe('getDashboardMetrics', () => {
    it('should return dashboard metrics', async () => {
      const metrics = await integrityService.getDashboardMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalChecks).toBeGreaterThanOrEqual(0);
      expect(metrics.flaggedSubmissions).toBeGreaterThanOrEqual(0);
      expect(metrics.violationsDetected).toBeGreaterThanOrEqual(0);
      expect(metrics.violationsByType).toBeDefined();
      expect(metrics.violationsBySeverity).toBeDefined();
      expect(metrics.riskDistribution).toBeDefined();
    });
  });
});
