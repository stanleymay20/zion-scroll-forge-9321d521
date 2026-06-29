/**
 * Quality Assurance Service Tests
 * Tests for QA testing framework, metrics, and review workflows
 */

import TestDatasetService from '../TestDatasetService';
import QualityMetricsService from '../QualityMetricsService';
import TheologicalAlignmentService from '../TheologicalAlignmentService';
import ReviewWorkflowService from '../ReviewWorkflowService';

describe('Quality Assurance Services', () => {
  describe('TestDatasetService', () => {
    const service = new TestDatasetService();

    it('should create a test case', async () => {
      const testCase = {
        serviceType: 'content_creation' as const,
        input: { topic: 'Test Topic' },
        expectedOutput: { hasContent: true },
        category: 'functional' as const,
        difficulty: 'medium' as const,
        tags: ['test'],
      };

      const result = await service.createTestCase(testCase);

      expect(result).toBeDefined();
      expect(result.serviceType).toBe('content_creation');
      expect(result.category).toBe('functional');
    });

    it('should get test cases for a service', async () => {
      const testCases = await service.getTestCases('content_creation', {
        limit: 10,
      });

      expect(Array.isArray(testCases)).toBe(true);
    });
  });

  describe('QualityMetricsService', () => {
    const service = new QualityMetricsService();

    it('should calculate quality metrics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      try {
        const metrics = await service.calculateMetrics(
          'content_creation',
          startDate,
          endDate
        );

        expect(metrics).toBeDefined();
        expect(metrics.serviceType).toBe('content_creation');
        expect(typeof metrics.accuracy).toBe('number');
        expect(typeof metrics.confidence).toBe('number');
      } catch (error: any) {
        // Expected if no test results exist
        expect(error.message).toContain('No test results found');
      }
    });

    it('should check if metrics meet thresholds', () => {
      const metrics = {
        serviceType: 'content_creation' as const,
        accuracy: 0.95,
        confidence: 0.90,
        humanAgreement: 0.88,
        theologicalAlignment: 0.97,
        responseTime: 3000,
        costPerRequest: 1.50,
        errorRate: 0.03,
        period: {
          start: new Date(),
          end: new Date(),
        },
      };

      const meetsThresholds = service.meetsThresholds(metrics);

      expect(typeof meetsThresholds).toBe('boolean');
      expect(meetsThresholds).toBe(true);
    });

    it('should detect metrics below thresholds', () => {
      const metrics = {
        serviceType: 'content_creation' as const,
        accuracy: 0.75, // Below threshold
        confidence: 0.90,
        humanAgreement: 0.88,
        theologicalAlignment: 0.97,
        responseTime: 3000,
        costPerRequest: 1.50,
        errorRate: 0.03,
        period: {
          start: new Date(),
          end: new Date(),
        },
      };

      const meetsThresholds = service.meetsThresholds(metrics);

      expect(meetsThresholds).toBe(false);
    });
  });

  describe('TheologicalAlignmentService', () => {
    const service = new TheologicalAlignmentService();

    it('should check theological alignment of content', async () => {
      const content = `
        The doctrine of the Trinity teaches that God exists as three persons 
        in one essence: Father, Son, and Holy Spirit. This is a foundational 
        belief of orthodox Christianity.
      `;

      const alignment = await service.checkAlignment(
        content,
        'content_creation',
        { topic: 'Trinity', audience: 'undergraduate' }
      );

      expect(alignment).toBeDefined();
      expect(typeof alignment.score).toBe('number');
      expect(alignment.score).toBeGreaterThanOrEqual(0);
      expect(alignment.score).toBeLessThanOrEqual(1);
      expect(typeof alignment.approved).toBe('boolean');
      expect(Array.isArray(alignment.concerns)).toBe(true);
    }, 30000); // Longer timeout for AI call

    it('should detect concerning theological content', async () => {
      const content = `
        God is not really three persons, that's just a metaphor. 
        The Trinity is a later invention of the church.
      `;

      const alignment = await service.checkAlignment(
        content,
        'content_creation',
        { topic: 'Trinity', audience: 'undergraduate' }
      );

      expect(alignment).toBeDefined();
      expect(alignment.score).toBeLessThan(0.95);
      expect(alignment.approved).toBe(false);
      expect(alignment.concerns.length).toBeGreaterThan(0);
    }, 30000);

    it('should batch check multiple content items', async () => {
      const items = [
        {
          content: 'Jesus Christ is the Son of God.',
          serviceType: 'content_creation' as const,
        },
        {
          content: 'The Bible is the inspired Word of God.',
          serviceType: 'content_creation' as const,
        },
      ];

      const alignments = await service.batchCheckAlignment(items);

      expect(Array.isArray(alignments)).toBe(true);
      expect(alignments.length).toBe(2);
      alignments.forEach(alignment => {
        expect(typeof alignment.score).toBe('number');
        expect(typeof alignment.approved).toBe('boolean');
      });
    }, 60000);
  });

  describe('ReviewWorkflowService', () => {
    const service = new ReviewWorkflowService();

    it('should create a review workflow item', async () => {
      const item = {
        itemId: 'test-item-123',
        itemType: 'ai_response' as const,
        serviceType: 'content_creation' as const,
        status: 'pending' as const,
        priority: 'medium' as const,
        submittedBy: 'user-123',
      };

      const result = await service.createReviewItem(item);

      expect(result).toBeDefined();
      expect(result.itemId).toBe('test-item-123');
      expect(result.status).toBe('pending');
    });

    it('should get pending reviews for a reviewer', async () => {
      const reviews = await service.getPendingReviews('reviewer-123', {
        limit: 10,
      });

      expect(Array.isArray(reviews)).toBe(true);
    });

    it('should calculate review statistics', async () => {
      const stats = await service.getReviewStatistics('reviewer-123');

      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.pending).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.averageReviewTime).toBe('number');
      expect(typeof stats.approvalRate).toBe('number');
    });

    it('should get reviewer performance metrics', async () => {
      const performance = await service.getReviewerPerformance('reviewer-123');

      expect(performance).toBeDefined();
      expect(typeof performance.totalReviews).toBe('number');
      expect(typeof performance.averageReviewTime).toBe('number');
      expect(typeof performance.approvalRate).toBe('number');
      expect(typeof performance.qualityScore).toBe('number');
    });
  });

  describe('Integration Tests', () => {
    it('should complete full QA workflow', async () => {
      const testDatasetService = new TestDatasetService();
      const qualityMetricsService = new QualityMetricsService();
      const theologicalAlignmentService = new TheologicalAlignmentService();
      const reviewWorkflowService = new ReviewWorkflowService();

      // 1. Create test case
      const testCase = await testDatasetService.createTestCase({
        serviceType: 'content_creation',
        input: { topic: 'Salvation by Grace' },
        expectedOutput: { hasTheology: true },
        category: 'theological',
        difficulty: 'medium',
        tags: ['theology', 'salvation'],
      });

      expect(testCase).toBeDefined();

      // 2. Check theological alignment
      const content = 'Salvation is by grace alone through faith alone in Christ alone.';
      const alignment = await theologicalAlignmentService.checkAlignment(
        content,
        'content_creation'
      );

      expect(alignment.score).toBeGreaterThan(0.9);
      expect(alignment.approved).toBe(true);

      // 3. Create review workflow if needed
      if (!alignment.approved) {
        const review = await reviewWorkflowService.createReviewItem({
          itemId: testCase.id,
          itemType: 'theological_content',
          serviceType: 'content_creation',
          status: 'pending',
          priority: 'high',
          submittedBy: 'system',
        });

        expect(review).toBeDefined();
      }

      // 4. Calculate metrics (if data exists)
      try {
        const metrics = await qualityMetricsService.calculateMetrics(
          'content_creation',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          new Date()
        );

        expect(metrics).toBeDefined();
      } catch (error: any) {
        // Expected if no test results exist yet
        expect(error.message).toContain('No test results found');
      }
    }, 60000);
  });
});
