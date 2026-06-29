/**
 * AI Data Service Tests
 * Tests for comprehensive AI database integration
 */

import AIDataService from '../AIDataService';

describe('AIDataService', () => {
  let service: AIDataService;

  beforeEach(() => {
    service = new AIDataService();
  });

  describe('Service Request Management', () => {
    it('should create AI service request', async () => {
      const requestData = {
        userId: 'test-user-id',
        serviceType: 'support_chatbot',
        endpoint: '/api/ai/chat',
        requestData: { message: 'Hello' },
        status: 'pending'
      };

      const result = await service.createServiceRequest(requestData);

      expect(result).toBeDefined();
      expect(result.userId).toBe(requestData.userId);
      expect(result.serviceType).toBe(requestData.serviceType);
      expect(result.status).toBe('pending');
    });

    it('should update service request with response', async () => {
      const requestData = {
        userId: 'test-user-id',
        serviceType: 'support_chatbot',
        endpoint: '/api/ai/chat',
        requestData: { message: 'Hello' }
      };

      const request = await service.createServiceRequest(requestData);

      const updated = await service.updateServiceRequest(request.id, {
        responseData: { reply: 'Hi there!' },
        status: 'completed',
        confidence: 0.95,
        cost: 0.05,
        processingTimeMs: 1500
      });

      expect(updated.status).toBe('completed');
      expect(updated.confidence).toBe(0.95);
      expect(updated.cost).toBe(0.05);
    });

    it('should get service requests with filters', async () => {
      const requests = await service.getServiceRequests({
        serviceType: 'support_chatbot',
        status: 'completed',
        limit: 10
      });

      expect(Array.isArray(requests)).toBe(true);
    });
  });

  describe('Conversation Management', () => {
    it('should create new conversation', async () => {
      const conversationData = {
        userId: 'test-user-id',
        serviceType: 'support_chatbot',
        conversationData: {
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' }
          ]
        },
        messageCount: 2,
        totalTokens: 50,
        totalCost: 0.01
      };

      const result = await service.upsertConversation(null, conversationData);

      expect(result).toBeDefined();
      expect(result.userId).toBe(conversationData.userId);
      expect(result.messageCount).toBe(2);
    });

    it('should update existing conversation', async () => {
      const conversationData = {
        userId: 'test-user-id',
        serviceType: 'support_chatbot',
        conversationData: { messages: [] },
        messageCount: 1
      };

      const conversation = await service.upsertConversation(null, conversationData);

      const updated = await service.upsertConversation(conversation.id, {
        ...conversationData,
        messageCount: 3,
        totalTokens: 150,
        totalCost: 0.03
      });

      expect(updated.messageCount).toBe(3);
      expect(updated.totalTokens).toBe(150);
    });

    it('should end conversation with rating', async () => {
      const conversationData = {
        userId: 'test-user-id',
        serviceType: 'support_chatbot',
        conversationData: { messages: [] }
      };

      const conversation = await service.upsertConversation(null, conversationData);
      const ended = await service.endConversation(conversation.id, 5);

      expect(ended.endedAt).toBeDefined();
      expect(ended.satisfactionRating).toBe(5);
    });

    it('should get active conversations for user', async () => {
      const conversations = await service.getActiveConversations('test-user-id');

      expect(Array.isArray(conversations)).toBe(true);
    });
  });

  describe('Generated Content Management', () => {
    it('should create generated content record', async () => {
      const contentData = {
        contentType: 'lecture',
        serviceType: 'content_creation',
        generatedByUserId: 'test-user-id',
        prompt: 'Create a lecture on AI ethics',
        generatedContent: {
          title: 'AI Ethics in Christian Context',
          content: 'Lecture content...'
        },
        confidence: 0.92,
        theologicalAlignmentScore: 0.95,
        qualityScore: 0.90
      };

      const result = await service.createGeneratedContent(contentData);

      expect(result).toBeDefined();
      expect(result.contentType).toBe('lecture');
      expect(result.confidence).toBe(0.92);
      expect(result.status).toBe('draft');
    });

    it('should review generated content', async () => {
      const contentData = {
        contentType: 'lecture',
        serviceType: 'content_creation',
        generatedByUserId: 'test-user-id',
        prompt: 'Create a lecture',
        generatedContent: { content: 'Test' }
      };

      const content = await service.createGeneratedContent(contentData);

      const reviewed = await service.reviewGeneratedContent(
        content.id,
        'reviewer-id',
        'approved',
        'Looks good!'
      );

      expect(reviewed.reviewStatus).toBe('approved');
      expect(reviewed.reviewedByUserId).toBe('reviewer-id');
    });

    it('should publish generated content', async () => {
      const contentData = {
        contentType: 'lecture',
        serviceType: 'content_creation',
        generatedByUserId: 'test-user-id',
        prompt: 'Create a lecture',
        generatedContent: { content: 'Test' }
      };

      const content = await service.createGeneratedContent(contentData);
      const published = await service.publishGeneratedContent(content.id);

      expect(published.status).toBe('published');
      expect(published.publishedAt).toBeDefined();
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log entry', async () => {
      const logData = {
        serviceType: 'support_chatbot',
        action: 'chat_response',
        userId: 'test-user-id',
        entityType: 'conversation',
        entityId: 'conv-123',
        inputData: { message: 'Hello' },
        outputData: { reply: 'Hi!' },
        confidence: 0.95,
        cost: 0.02,
        processingTimeMs: 1200
      };

      const result = await service.createAuditLog(logData);

      expect(result).toBeDefined();
      expect(result.serviceType).toBe('support_chatbot');
      expect(result.action).toBe('chat_response');
    });
  });

  describe('Cost Tracking', () => {
    it('should track AI service cost', async () => {
      const costData = {
        userId: 'test-user-id',
        serviceType: 'content_creation',
        operationType: 'lecture_generation',
        tokensUsed: 5000,
        cost: 1.50,
        modelUsed: 'gpt-4',
        requestId: 'req-123'
      };

      const result = await service.trackCost(costData);

      expect(result).toBeDefined();
      expect(result.cost).toBe(1.50);
      expect(result.tokensUsed).toBe(5000);
    });

    it('should get cost summary for service', async () => {
      const summary = await service.getCostSummary({
        serviceType: 'content_creation',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      });

      expect(summary).toBeDefined();
      expect(summary.totalCost).toBeDefined();
      expect(summary.totalTokens).toBeDefined();
      expect(summary.requestCount).toBeDefined();
    });

    it('should get cost summary for user', async () => {
      const summary = await service.getCostSummary({
        userId: 'test-user-id'
      });

      expect(summary).toBeDefined();
      expect(typeof summary.totalCost).toBe('number');
    });
  });

  describe('Quality Metrics', () => {
    it('should record quality metric', async () => {
      const metricData = {
        serviceType: 'automated_grading',
        requestId: 'req-123',
        accuracyScore: 0.95,
        confidenceScore: 0.92,
        humanAgreementScore: 0.90,
        theologicalAlignmentScore: 0.98,
        responseTimeMs: 2500,
        humanFeedback: 'Excellent grading'
      };

      const result = await service.recordQualityMetric(metricData);

      expect(result).toBeDefined();
      expect(result.accuracyScore).toBe(0.95);
      expect(result.confidenceScore).toBe(0.92);
    });

    it('should get quality metrics summary', async () => {
      const summary = await service.getQualityMetrics('automated_grading', 30);

      expect(summary).toBeDefined();
      expect(summary.serviceType).toBe('automated_grading');
      expect(summary.period).toBe('30 days');
    });
  });

  describe('Review Queue Management', () => {
    it('should add item to review queue', async () => {
      const queueData = {
        serviceType: 'automated_grading',
        requestId: 'req-123',
        priority: 'high',
        contentType: 'essay_grade',
        contentData: {
          submissionId: 'sub-123',
          grade: 85,
          feedback: 'Good work'
        },
        confidence: 0.75,
        reasonForReview: 'Low confidence score'
      };

      const result = await service.addToReviewQueue(queueData);

      expect(result).toBeDefined();
      expect(result.priority).toBe('high');
      expect(result.status).toBe('pending');
    });

    it('should get pending review queue items', async () => {
      const items = await service.getReviewQueue({
        serviceType: 'automated_grading',
        priority: 'high',
        limit: 10
      });

      expect(Array.isArray(items)).toBe(true);
    });

    it('should complete review queue item', async () => {
      const queueData = {
        serviceType: 'automated_grading',
        requestId: 'req-123',
        contentType: 'essay_grade',
        contentData: { grade: 85 }
      };

      const item = await service.addToReviewQueue(queueData);

      const completed = await service.completeReview(
        item.id,
        'approved',
        'Grade is accurate'
      );

      expect(completed.status).toBe('completed');
      expect(completed.reviewDecision).toBe('approved');
      expect(completed.reviewedAt).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should check and allow request within rate limit', async () => {
      const result = await service.checkRateLimit(
        'test-user-id',
        'support_chatbot',
        60
      );

      expect(result).toBeDefined();
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it('should track rate limit across multiple requests', async () => {
      const userId = 'rate-limit-test-user';
      const serviceType = 'support_chatbot';

      const result1 = await service.checkRateLimit(userId, serviceType);
      expect(result1.allowed).toBe(true);

      const result2 = await service.checkRateLimit(userId, serviceType);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBeLessThan(result1.remaining);
    });
  });

  describe('Service Configuration', () => {
    it('should get service configuration', async () => {
      const config = await service.getServiceConfig('support_chatbot');

      expect(config).toBeDefined();
      if (config) {
        expect(config.serviceType).toBe('support_chatbot');
        expect(typeof config.enabled).toBe('boolean');
      }
    });

    it('should update service configuration', async () => {
      const updates = {
        enabled: true,
        maxRequestsPerHour: 500,
        maxCostPerDay: 150.00,
        confidenceThreshold: 0.90,
        requireHumanReview: true
      };

      const config = await service.updateServiceConfig('test_service', updates);

      expect(config).toBeDefined();
      expect(config.maxRequestsPerHour).toBe(500);
      expect(config.confidenceThreshold).toBe(0.90);
    });
  });

  describe('Analytics Dashboard', () => {
    it('should get analytics dashboard data', async () => {
      const dashboard = await service.getAnalyticsDashboard(7);

      expect(dashboard).toBeDefined();
      expect(dashboard.period).toBe('7 days');
      expect(dashboard.usageSummary).toBeDefined();
      expect(dashboard.costSummary).toBeDefined();
      expect(dashboard.reviewQueueSummary).toBeDefined();
      expect(dashboard.qualitySummary).toBeDefined();
    });
  });

  describe('Data Cleanup', () => {
    it('should run data cleanup based on retention policies', async () => {
      const result = await service.runDataCleanup();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
