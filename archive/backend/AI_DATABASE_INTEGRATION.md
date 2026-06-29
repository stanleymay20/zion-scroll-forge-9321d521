# AI Database Integration Documentation
**"The Spirit of truth will guide you into all truth" - John 16:13**

## Overview

This document describes the comprehensive database integration for all AI automation services in ScrollUniversity. The system provides robust tracking, auditing, cost management, and quality assurance for all AI operations.

## Database Schema

### Core Tables

#### 1. ai_service_requests
Tracks all AI service interactions with comprehensive audit trail.

**Fields:**
- `id`: Unique identifier
- `userId`: User making the request
- `serviceType`: Type of AI service (chatbot, grading, content_creation, etc.)
- `endpoint`: API endpoint called
- `requestData`: Input data (JSONB)
- `responseData`: Output data (JSONB)
- `status`: Request status (pending, completed, failed)
- `confidence`: AI confidence score (0-1)
- `cost`: Cost in USD
- `processingTimeMs`: Processing time in milliseconds
- `humanReviewRequired`: Whether human review is needed
- `humanReviewed`: Whether human review was completed
- `humanReviewerId`: ID of reviewer
- `reviewOutcome`: Result of human review
- `reviewNotes`: Reviewer notes
- `errorMessage`: Error details if failed
- `createdAt`, `updatedAt`: Timestamps

**Indexes:**
- userId, serviceType, status, createdAt
- Composite index on (humanReviewRequired, humanReviewed)

#### 2. ai_conversations
Stores conversation histories for chatbot and support services.

**Fields:**
- `id`: Unique identifier
- `userId`: User in conversation
- `serviceType`: Service type
- `conversationData`: Full conversation history (JSONB)
- `messageCount`: Number of messages
- `totalTokens`: Total tokens used
- `totalCost`: Total cost
- `startedAt`, `lastMessageAt`, `endedAt`: Timestamps
- `escalated`: Whether escalated to human
- `escalationReason`: Reason for escalation
- `satisfactionRating`: User satisfaction (1-5)

**Indexes:**
- userId, serviceType, endedAt

#### 3. ai_generated_content
Tracks all AI-generated content with review workflow.

**Fields:**
- `id`: Unique identifier
- `contentType`: Type of content (lecture, assessment, etc.)
- `serviceType`: AI service used
- `generatedByUserId`: User who generated content
- `prompt`: Input prompt
- `generatedContent`: Generated content (JSONB)
- `metadata`: Additional metadata (JSONB)
- `confidence`: Generation confidence
- `theologicalAlignmentScore`: Theological accuracy score
- `qualityScore`: Overall quality score
- `status`: Content status (draft, review, published)
- `reviewedByUserId`: Reviewer ID
- `reviewStatus`: Review outcome
- `reviewNotes`: Review notes
- `publishedAt`: Publication timestamp
- `createdAt`, `updatedAt`: Timestamps

**Indexes:**
- contentType, serviceType, status, generatedByUserId, reviewStatus

#### 4. ai_audit_logs
Comprehensive audit trail for all AI operations.

**Fields:**
- `id`: Unique identifier
- `serviceType`: AI service
- `action`: Action performed
- `userId`: User (optional)
- `entityType`, `entityId`: Related entity
- `inputData`, `outputData`: Request/response data (JSONB)
- `confidence`: AI confidence
- `cost`: Operation cost
- `processingTimeMs`: Processing time
- `humanReviewed`: Whether reviewed
- `reviewOutcome`: Review result
- `ipAddress`, `userAgent`: Request metadata
- `createdAt`: Timestamp

**Indexes:**
- serviceType, action, userId, (entityType, entityId), createdAt

#### 5. ai_service_metrics
Performance and quality metrics for AI services.

**Fields:**
- `id`: Unique identifier
- `serviceType`: AI service
- `metricName`: Metric name
- `metricValue`: Metric value
- `metricUnit`: Unit of measurement
- `tags`: Additional tags (JSONB)
- `recordedAt`: Timestamp

**Indexes:**
- serviceType, metricName, recordedAt

#### 6. ai_cost_tracking
Detailed cost tracking for budget management.

**Fields:**
- `id`: Unique identifier
- `userId`: User (optional)
- `serviceType`: AI service
- `operationType`: Type of operation
- `tokensUsed`: Number of tokens
- `cost`: Cost in USD
- `modelUsed`: AI model used
- `requestId`: Related request ID
- `createdAt`: Timestamp

**Indexes:**
- userId, serviceType, createdAt

#### 7. ai_quality_metrics
Quality assurance metrics for AI outputs.

**Fields:**
- `id`: Unique identifier
- `serviceType`: AI service
- `requestId`: Related request
- `accuracyScore`: Accuracy (0-1)
- `confidenceScore`: Confidence (0-1)
- `humanAgreementScore`: Human agreement rate (0-1)
- `theologicalAlignmentScore`: Theological accuracy (0-1)
- `responseTimeMs`: Response time
- `humanFeedback`: Feedback text
- `createdAt`: Timestamp

**Indexes:**
- serviceType, requestId, createdAt

#### 8. ai_rate_limits
Rate limiting for AI service usage.

**Fields:**
- `id`: Unique identifier
- `userId`: User
- `serviceType`: AI service
- `requestCount`: Number of requests in window
- `windowStart`, `windowEnd`: Time window
- `limitExceeded`: Whether limit was exceeded
- `createdAt`, `updatedAt`: Timestamps

**Unique Constraint:**
- (userId, serviceType, windowStart)

**Indexes:**
- userId, serviceType, windowEnd

#### 9. ai_review_queue
Human review queue for low-confidence AI outputs.

**Fields:**
- `id`: Unique identifier
- `serviceType`: AI service
- `requestId`: Related request
- `priority`: Priority level (high, medium, low)
- `contentType`: Type of content
- `contentData`: Content to review (JSONB)
- `aiRecommendation`: AI's recommendation (JSONB)
- `confidence`: AI confidence
- `reasonForReview`: Why review is needed
- `assignedToUserId`: Assigned reviewer
- `status`: Review status (pending, completed)
- `reviewedAt`: Review timestamp
- `reviewDecision`: Review decision
- `reviewNotes`: Review notes
- `createdAt`, `updatedAt`: Timestamps

**Indexes:**
- serviceType, status, priority, assignedToUserId, createdAt

#### 10. ai_data_retention
Data retention policies for GDPR/FERPA compliance.

**Fields:**
- `id`: Unique identifier
- `dataType`: Type of data (unique)
- `retentionDays`: Days to retain
- `lastCleanupAt`: Last cleanup timestamp
- `createdAt`, `updatedAt`: Timestamps

#### 11. ai_service_config
Configuration settings for each AI service.

**Fields:**
- `id`: Unique identifier
- `serviceType`: AI service (unique)
- `enabled`: Whether service is enabled
- `maxRequestsPerHour`: Rate limit
- `maxCostPerDay`: Daily cost limit
- `confidenceThreshold`: Minimum confidence for auto-approval
- `requireHumanReview`: Whether human review is required
- `configData`: Additional config (JSONB)
- `createdAt`, `updatedAt`: Timestamps

## Default Configurations

### Data Retention Policies

| Data Type | Retention Period |
|-----------|-----------------|
| ai_conversations | 365 days (1 year) |
| ai_audit_logs | 730 days (2 years) |
| ai_service_requests | 180 days (6 months) |
| ai_generated_content | 1095 days (3 years) |
| ai_cost_tracking | 1095 days (3 years) |
| ai_quality_metrics | 365 days (1 year) |
| ai_rate_limits | 90 days (3 months) |
| ai_review_queue | 180 days (6 months) |

### Service Configurations

| Service | Max Requests/Hour | Max Cost/Day | Confidence Threshold | Requires Review |
|---------|------------------|--------------|---------------------|-----------------|
| support_chatbot | 1000 | $100 | 0.80 | No |
| automated_grading | 500 | $200 | 0.85 | Yes |
| content_creation | 200 | $150 | 0.85 | Yes |
| personalized_learning | 2000 | $50 | 0.75 | No |
| academic_integrity | 1000 | $100 | 0.90 | Yes |
| admissions_processing | 100 | $75 | 0.85 | Yes |
| research_assistant | 300 | $100 | 0.80 | No |
| course_recommendation | 500 | $30 | 0.80 | No |
| faculty_support | 800 | $80 | 0.80 | No |
| translation_localization | 400 | $60 | 0.85 | No |
| spiritual_formation | 300 | $40 | 0.85 | Yes |
| fundraising_donor | 200 | $50 | 0.80 | No |
| career_services | 400 | $70 | 0.80 | No |
| content_moderation | 2000 | $80 | 0.90 | Yes |
| accessibility_compliance | 500 | $60 | 0.85 | No |

## Database Views

### ai_service_usage_summary
Aggregated usage statistics by service type.

**Columns:**
- serviceType
- totalRequests
- avgConfidence
- totalCost
- avgProcessingTime
- reviewRequiredCount
- completedCount
- failedCount

### ai_daily_cost_summary
Daily cost breakdown by service.

**Columns:**
- date
- serviceType
- dailyCost
- requestCount
- totalTokens

### ai_review_queue_summary
Review queue statistics.

**Columns:**
- serviceType
- status
- priority
- itemCount
- avgConfidence
- oldestItem
- newestItem

### ai_quality_summary
Quality metrics aggregated by service.

**Columns:**
- serviceType
- totalEvaluations
- avgAccuracy
- avgConfidence
- avgHumanAgreement
- avgTheologicalAlignment
- avgResponseTime

## Database Functions

### cleanup_ai_data()
Automated cleanup function that removes old data based on retention policies.

**Returns:**
- Table of (data_type, records_deleted)

**Usage:**
```sql
SELECT * FROM cleanup_ai_data();
```

**Scheduling:**
Should be run daily via cron job or scheduled task.

## AIDataService API

### Service Request Management

```typescript
// Create service request
await aiDataService.createServiceRequest({
  userId: 'user-123',
  serviceType: 'support_chatbot',
  endpoint: '/api/ai/chat',
  requestData: { message: 'Hello' }
});

// Update service request
await aiDataService.updateServiceRequest(requestId, {
  responseData: { reply: 'Hi!' },
  status: 'completed',
  confidence: 0.95,
  cost: 0.05
});

// Get service requests
const requests = await aiDataService.getServiceRequests({
  userId: 'user-123',
  serviceType: 'support_chatbot',
  status: 'completed',
  limit: 10
});
```

### Conversation Management

```typescript
// Create/update conversation
const conversation = await aiDataService.upsertConversation(null, {
  userId: 'user-123',
  serviceType: 'support_chatbot',
  conversationData: { messages: [...] },
  messageCount: 5,
  totalTokens: 250,
  totalCost: 0.05
});

// End conversation
await aiDataService.endConversation(conversationId, 5); // 5-star rating

// Get active conversations
const active = await aiDataService.getActiveConversations('user-123');
```

### Generated Content Management

```typescript
// Create generated content
const content = await aiDataService.createGeneratedContent({
  contentType: 'lecture',
  serviceType: 'content_creation',
  generatedByUserId: 'user-123',
  prompt: 'Create lecture on AI ethics',
  generatedContent: { title: '...', content: '...' },
  confidence: 0.92,
  theologicalAlignmentScore: 0.95
});

// Review content
await aiDataService.reviewGeneratedContent(
  contentId,
  'reviewer-123',
  'approved',
  'Excellent content'
);

// Publish content
await aiDataService.publishGeneratedContent(contentId);
```

### Audit Logging

```typescript
await aiDataService.createAuditLog({
  serviceType: 'support_chatbot',
  action: 'chat_response',
  userId: 'user-123',
  entityType: 'conversation',
  entityId: 'conv-123',
  inputData: { message: 'Hello' },
  outputData: { reply: 'Hi!' },
  confidence: 0.95,
  cost: 0.02
});
```

### Cost Tracking

```typescript
// Track cost
await aiDataService.trackCost({
  userId: 'user-123',
  serviceType: 'content_creation',
  operationType: 'lecture_generation',
  tokensUsed: 5000,
  cost: 1.50,
  modelUsed: 'gpt-4'
});

// Get cost summary
const summary = await aiDataService.getCostSummary({
  serviceType: 'content_creation',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31')
});
```

### Quality Metrics

```typescript
// Record quality metric
await aiDataService.recordQualityMetric({
  serviceType: 'automated_grading',
  requestId: 'req-123',
  accuracyScore: 0.95,
  confidenceScore: 0.92,
  humanAgreementScore: 0.90,
  theologicalAlignmentScore: 0.98,
  responseTimeMs: 2500
});

// Get quality summary
const quality = await aiDataService.getQualityMetrics('automated_grading', 30);
```

### Review Queue Management

```typescript
// Add to review queue
await aiDataService.addToReviewQueue({
  serviceType: 'automated_grading',
  requestId: 'req-123',
  priority: 'high',
  contentType: 'essay_grade',
  contentData: { grade: 85, feedback: '...' },
  confidence: 0.75,
  reasonForReview: 'Low confidence score'
});

// Get review queue
const queue = await aiDataService.getReviewQueue({
  serviceType: 'automated_grading',
  priority: 'high',
  limit: 10
});

// Complete review
await aiDataService.completeReview(
  queueItemId,
  'approved',
  'Grade is accurate'
);
```

### Rate Limiting

```typescript
const rateLimit = await aiDataService.checkRateLimit(
  'user-123',
  'support_chatbot',
  60 // window in minutes
);

if (!rateLimit.allowed) {
  throw new Error(`Rate limit exceeded. Reset at ${rateLimit.resetAt}`);
}
```

### Service Configuration

```typescript
// Get config
const config = await aiDataService.getServiceConfig('support_chatbot');

// Update config
await aiDataService.updateServiceConfig('support_chatbot', {
  enabled: true,
  maxRequestsPerHour: 500,
  maxCostPerDay: 150.00,
  confidenceThreshold: 0.90
});
```

### Analytics Dashboard

```typescript
const dashboard = await aiDataService.getAnalyticsDashboard(7); // 7 days

// Returns:
// {
//   period: '7 days',
//   usageSummary: [...],
//   costSummary: [...],
//   reviewQueueSummary: [...],
//   qualitySummary: [...]
// }
```

### Data Cleanup

```typescript
// Run cleanup (should be scheduled daily)
const result = await aiDataService.runDataCleanup();
// Returns array of { data_type, records_deleted }
```

## Integration with AI Services

All AI services should integrate with AIDataService:

```typescript
import AIDataService from './AIDataService';

class SupportChatbotService {
  private aiDataService: AIDataService;

  constructor() {
    this.aiDataService = new AIDataService();
  }

  async handleChat(userId: string, message: string): Promise<any> {
    // Check rate limit
    const rateLimit = await this.aiDataService.checkRateLimit(
      userId,
      'support_chatbot'
    );
    if (!rateLimit.allowed) {
      throw new Error('Rate limit exceeded');
    }

    // Create service request
    const request = await this.aiDataService.createServiceRequest({
      userId,
      serviceType: 'support_chatbot',
      endpoint: '/api/ai/chat',
      requestData: { message }
    });

    try {
      // Process with AI
      const response = await this.processWithAI(message);

      // Update request with response
      await this.aiDataService.updateServiceRequest(request.id, {
        responseData: response,
        status: 'completed',
        confidence: response.confidence,
        cost: response.cost,
        processingTimeMs: response.processingTime
      });

      // Track cost
      await this.aiDataService.trackCost({
        userId,
        serviceType: 'support_chatbot',
        operationType: 'chat_response',
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        modelUsed: 'gpt-4',
        requestId: request.id
      });

      // Create audit log
      await this.aiDataService.createAuditLog({
        serviceType: 'support_chatbot',
        action: 'chat_response',
        userId,
        inputData: { message },
        outputData: response,
        confidence: response.confidence,
        cost: response.cost
      });

      return response;
    } catch (error) {
      // Update request with error
      await this.aiDataService.updateServiceRequest(request.id, {
        status: 'failed',
        errorMessage: error.message
      });
      throw error;
    }
  }
}
```

## Compliance and Security

### GDPR Compliance
- Data retention policies automatically enforced
- User data can be deleted on request
- Audit trail for all data access
- Encryption at rest and in transit

### FERPA Compliance
- Student data protected with access controls
- Audit logs for all student data access
- Data retention policies for educational records
- Secure storage and transmission

### Security Best Practices
- All sensitive data encrypted
- Role-based access control
- Rate limiting to prevent abuse
- Comprehensive audit logging
- Regular security audits

## Monitoring and Alerts

### Key Metrics to Monitor
1. **Cost Metrics**
   - Daily cost by service
   - Cost per user
   - Budget utilization

2. **Performance Metrics**
   - Average response time
   - Request success rate
   - Error rate

3. **Quality Metrics**
   - Average confidence scores
   - Human agreement rates
   - Theological alignment scores

4. **Usage Metrics**
   - Requests per service
   - Active users
   - Rate limit violations

### Alert Thresholds
- Daily cost exceeds 80% of budget
- Error rate exceeds 5%
- Average confidence below threshold
- Review queue backlog exceeds 100 items
- Rate limit violations spike

## Maintenance Tasks

### Daily
- Run data cleanup function
- Monitor cost and usage
- Review high-priority queue items

### Weekly
- Analyze quality metrics
- Review rate limit patterns
- Check for anomalies

### Monthly
- Generate comprehensive reports
- Review and adjust configurations
- Audit data retention compliance

## Conclusion

The AI database integration provides a robust foundation for tracking, managing, and optimizing all AI services in ScrollUniversity. It ensures compliance, maintains quality, controls costs, and provides comprehensive visibility into AI operations.
