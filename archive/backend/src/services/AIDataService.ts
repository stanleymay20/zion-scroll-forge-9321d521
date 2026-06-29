/**
 * AI Data Service
 * "The Spirit of truth will guide you into all truth" - John 16:13
 * 
 * Comprehensive data service for AI integration system
 * Handles all database operations for AI services including:
 * - Service requests tracking
 * - Conversation history management
 * - Generated content storage
 * - Audit logging
 * - Cost tracking
 * - Quality metrics
 * - Data retention policies
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/productionLogger';

const prisma = new PrismaClient();

export interface AIServiceRequestData {
  userId: string;
  serviceType: string;
  endpoint: string;
  requestData: any;
  responseData?: any;
  status?: string;
  confidence?: number;
  cost?: number;
  processingTimeMs?: number;
  humanReviewRequired?: boolean;
  errorMessage?: string;
}

export interface AIConversationData {
  userId: string;
  serviceType: string;
  conversationData: any;
  messageCount?: number;
  totalTokens?: number;
  totalCost?: number;
  escalated?: boolean;
  escalationReason?: string;
  satisfactionRating?: number;
}

export interface AIGeneratedContentData {
  contentType: string;
  serviceType: string;
  generatedByUserId: string;
  prompt: string;
  generatedContent: any;
  metadata?: any;
  confidence?: number;
  theologicalAlignmentScore?: number;
  qualityScore?: number;
  status?: string;
}

export interface AIAuditLogData {
  serviceType: string;
  action: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  inputData?: any;
  outputData?: any;
  confidence?: number;
  cost?: number;
  processingTimeMs?: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface AICostTrackingData {
  userId?: string;
  serviceType: string;
  operationType: string;
  tokensUsed?: number;
  cost: number;
  modelUsed?: string;
  requestId?: string;
}

export interface AIQualityMetricData {
  serviceType: string;
  requestId: string;
  accuracyScore?: number;
  confidenceScore?: number;
  humanAgreementScore?: number;
  theologicalAlignmentScore?: number;
  responseTimeMs?: number;
  humanFeedback?: string;
}

export interface AIReviewQueueData {
  serviceType: string;
  requestId: string;
  priority?: string;
  contentType: string;
  contentData: any;
  aiRecommendation?: any;
  confidence?: number;
  reasonForReview?: string;
  assignedToUserId?: string;
}

export default class AIDataService {
  /**
   * Create a new AI service request record
   */
  async createServiceRequest(data: AIServiceRequestData): Promise<any> {
    try {
      const request = await prisma.aIServiceRequest.create({
        data: {
          userId: data.userId,
          serviceType: data.serviceType,
          endpoint: data.endpoint,
          requestData: data.requestData,
          responseData: data.responseData,
          status: data.status || 'pending',
          confidence: data.confidence,
          cost: data.cost,
          processingTimeMs: data.processingTimeMs,
          humanReviewRequired: data.humanReviewRequired || false,
          errorMessage: data.errorMessage,
          updatedAt: new Date()
        }
      });

      logger.info('AI service request created', {
        requestId: request.id,
        serviceType: data.serviceType,
        userId: data.userId
      });

      return request;
    } catch (error) {
      logger.error('Error creating AI service request', { error, data });
      throw error;
    }
  }

  /**
   * Update an existing AI service request
   */
  async updateServiceRequest(
    requestId: string,
    updates: Partial<AIServiceRequestData>
  ): Promise<any> {
    try {
      const request = await prisma.aIServiceRequest.update({
        where: { id: requestId },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      });

      logger.info('AI service request updated', { requestId, updates });
      return request;
    } catch (error) {
      logger.error('Error updating AI service request', { error, requestId, updates });
      throw error;
    }
  }

  /**
   * Get AI service requests with filtering
   */
  async getServiceRequests(filters: {
    userId?: string;
    serviceType?: string;
    status?: string;
    humanReviewRequired?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      const where: any = {};
      if (filters.userId) where.userId = filters.userId;
      if (filters.serviceType) where.serviceType = filters.serviceType;
      if (filters.status) where.status = filters.status;
      if (filters.humanReviewRequired !== undefined) {
        where.humanReviewRequired = filters.humanReviewRequired;
      }

      const requests = await prisma.aIServiceRequest.findMany({
        where,
        take: filters.limit || 100,
        skip: filters.offset || 0,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      return requests;
    } catch (error) {
      logger.error('Error getting AI service requests', { error, filters });
      throw error;
    }
  }

  /**
   * Create or update AI conversation
   */
  async upsertConversation(
    conversationId: string | null,
    data: AIConversationData
  ): Promise<any> {
    try {
      if (conversationId) {
        // Update existing conversation
        const conversation = await prisma.aIConversation.update({
          where: { id: conversationId },
          data: {
            conversationData: data.conversationData,
            messageCount: data.messageCount,
            totalTokens: data.totalTokens,
            totalCost: data.totalCost,
            lastMessageAt: new Date(),
            escalated: data.escalated,
            escalationReason: data.escalationReason,
            satisfactionRating: data.satisfactionRating
          }
        });
        return conversation;
      } else {
        // Create new conversation
        const conversation = await prisma.aIConversation.create({
          data: {
            userId: data.userId,
            serviceType: data.serviceType,
            conversationData: data.conversationData,
            messageCount: data.messageCount || 0,
            totalTokens: data.totalTokens || 0,
            totalCost: data.totalCost || 0
          }
        });
        return conversation;
      }
    } catch (error) {
      logger.error('Error upserting AI conversation', { error, conversationId, data });
      throw error;
    }
  }

  /**
   * End an AI conversation
   */
  async endConversation(
    conversationId: string,
    satisfactionRating?: number
  ): Promise<any> {
    try {
      const conversation = await prisma.aIConversation.update({
        where: { id: conversationId },
        data: {
          endedAt: new Date(),
          satisfactionRating
        }
      });

      logger.info('AI conversation ended', { conversationId, satisfactionRating });
      return conversation;
    } catch (error) {
      logger.error('Error ending AI conversation', { error, conversationId });
      throw error;
    }
  }

  /**
   * Get active conversations for a user
   */
  async getActiveConversations(userId: string, serviceType?: string): Promise<any[]> {
    try {
      const where: any = {
        userId,
        endedAt: null
      };
      if (serviceType) where.serviceType = serviceType;

      const conversations = await prisma.aIConversation.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' }
      });

      return conversations;
    } catch (error) {
      logger.error('Error getting active conversations', { error, userId, serviceType });
      throw error;
    }
  }

  /**
   * Create AI generated content record
   */
  async createGeneratedContent(data: AIGeneratedContentData): Promise<any> {
    try {
      const content = await prisma.aIGeneratedContent.create({
        data: {
          contentType: data.contentType,
          serviceType: data.serviceType,
          generatedByUserId: data.generatedByUserId,
          prompt: data.prompt,
          generatedContent: data.generatedContent,
          metadata: data.metadata,
          confidence: data.confidence,
          theologicalAlignmentScore: data.theologicalAlignmentScore,
          qualityScore: data.qualityScore,
          status: data.status || 'draft',
          updatedAt: new Date()
        }
      });

      logger.info('AI generated content created', {
        contentId: content.id,
        contentType: data.contentType,
        serviceType: data.serviceType
      });

      return content;
    } catch (error) {
      logger.error('Error creating AI generated content', { error, data });
      throw error;
    }
  }

  /**
   * Update AI generated content review status
   */
  async reviewGeneratedContent(
    contentId: string,
    reviewedByUserId: string,
    reviewStatus: string,
    reviewNotes?: string
  ): Promise<any> {
    try {
      const content = await prisma.aIGeneratedContent.update({
        where: { id: contentId },
        data: {
          reviewedByUserId,
          reviewStatus,
          reviewNotes,
          updatedAt: new Date()
        }
      });

      logger.info('AI generated content reviewed', {
        contentId,
        reviewedByUserId,
        reviewStatus
      });

      return content;
    } catch (error) {
      logger.error('Error reviewing AI generated content', {
        error,
        contentId,
        reviewedByUserId
      });
      throw error;
    }
  }

  /**
   * Publish AI generated content
   */
  async publishGeneratedContent(contentId: string): Promise<any> {
    try {
      const content = await prisma.aIGeneratedContent.update({
        where: { id: contentId },
        data: {
          status: 'published',
          publishedAt: new Date(),
          updatedAt: new Date()
        }
      });

      logger.info('AI generated content published', { contentId });
      return content;
    } catch (error) {
      logger.error('Error publishing AI generated content', { error, contentId });
      throw error;
    }
  }

  /**
   * Create audit log entry
   */
  async createAuditLog(data: AIAuditLogData): Promise<any> {
    try {
      const log = await prisma.aIAuditLog.create({
        data: {
          serviceType: data.serviceType,
          action: data.action,
          userId: data.userId,
          entityType: data.entityType,
          entityId: data.entityId,
          inputData: data.inputData,
          outputData: data.outputData,
          confidence: data.confidence,
          cost: data.cost,
          processingTimeMs: data.processingTimeMs,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent
        }
      });

      return log;
    } catch (error) {
      logger.error('Error creating audit log', { error, data });
      throw error;
    }
  }

  /**
   * Track AI service cost
   */
  async trackCost(data: AICostTrackingData): Promise<any> {
    try {
      const costRecord = await prisma.aICostTracking.create({
        data: {
          userId: data.userId,
          serviceType: data.serviceType,
          operationType: data.operationType,
          tokensUsed: data.tokensUsed,
          cost: data.cost,
          modelUsed: data.modelUsed,
          requestId: data.requestId
        }
      });

      return costRecord;
    } catch (error) {
      logger.error('Error tracking AI cost', { error, data });
      throw error;
    }
  }

  /**
   * Get cost summary for a service or user
   */
  async getCostSummary(filters: {
    serviceType?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    try {
      const where: any = {};
      if (filters.serviceType) where.serviceType = filters.serviceType;
      if (filters.userId) where.userId = filters.userId;
      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      const summary = await prisma.aICostTracking.aggregate({
        where,
        _sum: {
          cost: true,
          tokensUsed: true
        },
        _count: true
      });

      return {
        totalCost: summary._sum.cost || 0,
        totalTokens: summary._sum.tokensUsed || 0,
        requestCount: summary._count
      };
    } catch (error) {
      logger.error('Error getting cost summary', { error, filters });
      throw error;
    }
  }

  /**
   * Record quality metrics
   */
  async recordQualityMetric(data: AIQualityMetricData): Promise<any> {
    try {
      const metric = await prisma.aIQualityMetric.create({
        data: {
          serviceType: data.serviceType,
          requestId: data.requestId,
          accuracyScore: data.accuracyScore,
          confidenceScore: data.confidenceScore,
          humanAgreementScore: data.humanAgreementScore,
          theologicalAlignmentScore: data.theologicalAlignmentScore,
          responseTimeMs: data.responseTimeMs,
          humanFeedback: data.humanFeedback
        }
      });

      return metric;
    } catch (error) {
      logger.error('Error recording quality metric', { error, data });
      throw error;
    }
  }

  /**
   * Get quality metrics summary
   */
  async getQualityMetrics(serviceType: string, days: number = 30): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const metrics = await prisma.aIQualityMetric.aggregate({
        where: {
          serviceType,
          createdAt: { gte: startDate }
        },
        _avg: {
          accuracyScore: true,
          confidenceScore: true,
          humanAgreementScore: true,
          theologicalAlignmentScore: true,
          responseTimeMs: true
        },
        _count: true
      });

      return {
        serviceType,
        period: `${days} days`,
        avgAccuracy: metrics._avg.accuracyScore,
        avgConfidence: metrics._avg.confidenceScore,
        avgHumanAgreement: metrics._avg.humanAgreementScore,
        avgTheologicalAlignment: metrics._avg.theologicalAlignmentScore,
        avgResponseTime: metrics._avg.responseTimeMs,
        sampleSize: metrics._count
      };
    } catch (error) {
      logger.error('Error getting quality metrics', { error, serviceType, days });
      throw error;
    }
  }

  /**
   * Add item to review queue
   */
  async addToReviewQueue(data: AIReviewQueueData): Promise<any> {
    try {
      const queueItem = await prisma.aIReviewQueue.create({
        data: {
          serviceType: data.serviceType,
          requestId: data.requestId,
          priority: data.priority || 'medium',
          contentType: data.contentType,
          contentData: data.contentData,
          aiRecommendation: data.aiRecommendation,
          confidence: data.confidence,
          reasonForReview: data.reasonForReview,
          assignedToUserId: data.assignedToUserId,
          updatedAt: new Date()
        }
      });

      logger.info('Item added to AI review queue', {
        queueItemId: queueItem.id,
        serviceType: data.serviceType,
        priority: data.priority
      });

      return queueItem;
    } catch (error) {
      logger.error('Error adding to review queue', { error, data });
      throw error;
    }
  }

  /**
   * Get pending review queue items
   */
  async getReviewQueue(filters: {
    serviceType?: string;
    assignedToUserId?: string;
    priority?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      const where: any = { status: 'pending' };
      if (filters.serviceType) where.serviceType = filters.serviceType;
      if (filters.assignedToUserId) where.assignedToUserId = filters.assignedToUserId;
      if (filters.priority) where.priority = filters.priority;

      const items = await prisma.aIReviewQueue.findMany({
        where,
        take: filters.limit || 50,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      return items;
    } catch (error) {
      logger.error('Error getting review queue', { error, filters });
      throw error;
    }
  }

  /**
   * Complete review queue item
   */
  async completeReview(
    queueItemId: string,
    reviewDecision: string,
    reviewNotes?: string
  ): Promise<any> {
    try {
      const item = await prisma.aIReviewQueue.update({
        where: { id: queueItemId },
        data: {
          status: 'completed',
          reviewedAt: new Date(),
          reviewDecision,
          reviewNotes,
          updatedAt: new Date()
        }
      });

      logger.info('Review queue item completed', {
        queueItemId,
        reviewDecision
      });

      return item;
    } catch (error) {
      logger.error('Error completing review', { error, queueItemId });
      throw error;
    }
  }

  /**
   * Check and update rate limits
   */
  async checkRateLimit(
    userId: string,
    serviceType: string,
    windowMinutes: number = 60
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    try {
      const windowStart = new Date();
      windowStart.setMinutes(windowStart.getMinutes() - windowMinutes);
      const windowEnd = new Date();
      windowEnd.setMinutes(windowEnd.getMinutes() + windowMinutes);

      // Get service config
      const config = await prisma.aIServiceConfig.findUnique({
        where: { serviceType }
      });

      const maxRequests = config?.maxRequestsPerHour || 100;

      // Get or create rate limit record
      let rateLimit = await prisma.aIRateLimit.findFirst({
        where: {
          userId,
          serviceType,
          windowStart: { gte: windowStart },
          windowEnd: { lte: windowEnd }
        }
      });

      if (!rateLimit) {
        rateLimit = await prisma.aIRateLimit.create({
          data: {
            userId,
            serviceType,
            requestCount: 1,
            windowStart: new Date(),
            windowEnd,
            updatedAt: new Date()
          }
        });

        return {
          allowed: true,
          remaining: maxRequests - 1,
          resetAt: windowEnd
        };
      }

      // Check if limit exceeded
      if (rateLimit.requestCount >= maxRequests) {
        await prisma.aIRateLimit.update({
          where: { id: rateLimit.id },
          data: { limitExceeded: true, updatedAt: new Date() }
        });

        return {
          allowed: false,
          remaining: 0,
          resetAt: rateLimit.windowEnd
        };
      }

      // Increment request count
      await prisma.aIRateLimit.update({
        where: { id: rateLimit.id },
        data: {
          requestCount: { increment: 1 },
          updatedAt: new Date()
        }
      });

      return {
        allowed: true,
        remaining: maxRequests - rateLimit.requestCount - 1,
        resetAt: rateLimit.windowEnd
      };
    } catch (error) {
      logger.error('Error checking rate limit', { error, userId, serviceType });
      throw error;
    }
  }

  /**
   * Get service configuration
   */
  async getServiceConfig(serviceType: string): Promise<any> {
    try {
      const config = await prisma.aIServiceConfig.findUnique({
        where: { serviceType }
      });

      return config;
    } catch (error) {
      logger.error('Error getting service config', { error, serviceType });
      throw error;
    }
  }

  /**
   * Update service configuration
   */
  async updateServiceConfig(
    serviceType: string,
    updates: Partial<{
      enabled: boolean;
      maxRequestsPerHour: number;
      maxCostPerDay: number;
      confidenceThreshold: number;
      requireHumanReview: boolean;
      configData: any;
    }>
  ): Promise<any> {
    try {
      const config = await prisma.aIServiceConfig.upsert({
        where: { serviceType },
        update: {
          ...updates,
          updatedAt: new Date()
        },
        create: {
          serviceType,
          enabled: updates.enabled ?? true,
          maxRequestsPerHour: updates.maxRequestsPerHour ?? 100,
          maxCostPerDay: updates.maxCostPerDay,
          confidenceThreshold: updates.confidenceThreshold ?? 0.85,
          requireHumanReview: updates.requireHumanReview ?? false,
          configData: updates.configData,
          updatedAt: new Date()
        }
      });

      logger.info('Service config updated', { serviceType, updates });
      return config;
    } catch (error) {
      logger.error('Error updating service config', { error, serviceType, updates });
      throw error;
    }
  }

  /**
   * Run data cleanup based on retention policies
   */
  async runDataCleanup(): Promise<any> {
    try {
      // Execute the cleanup function
      const result = await prisma.$queryRaw`SELECT * FROM cleanup_ai_data()`;

      logger.info('AI data cleanup completed', { result });
      return result;
    } catch (error) {
      logger.error('Error running data cleanup', { error });
      throw error;
    }
  }

  /**
   * Get analytics dashboard data
   */
  async getAnalyticsDashboard(days: number = 7): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get service usage summary
      const usageSummary = await prisma.$queryRaw`
        SELECT * FROM ai_service_usage_summary
      `;

      // Get daily cost summary
      const costSummary = await prisma.$queryRaw`
        SELECT * FROM ai_daily_cost_summary
        WHERE date >= ${startDate}
        ORDER BY date DESC
      `;

      // Get review queue summary
      const reviewQueueSummary = await prisma.$queryRaw`
        SELECT * FROM ai_review_queue_summary
      `;

      // Get quality summary
      const qualitySummary = await prisma.$queryRaw`
        SELECT * FROM ai_quality_summary
      `;

      return {
        period: `${days} days`,
        usageSummary,
        costSummary,
        reviewQueueSummary,
        qualitySummary
      };
    } catch (error) {
      logger.error('Error getting analytics dashboard', { error, days });
      throw error;
    }
  }

  /**
   * Get usage statistics for a service
   */
  async getUsageStats(
    serviceType?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalRequests: number;
    successRate: number;
    avgConfidence: number;
    avgProcessingTime: number;
    totalCost: number;
  }> {
    try {
      const where: any = {};
      if (serviceType) where.serviceType = serviceType;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const requests = await prisma.aIServiceRequest.findMany({
        where,
        select: {
          status: true,
          confidence: true,
          processingTimeMs: true,
          cost: true
        }
      });

      const totalRequests = requests.length;
      const successfulRequests = requests.filter(r => r.status === 'completed').length;
      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
      
      const confidenceValues = requests.filter(r => r.confidence !== null).map(r => r.confidence!);
      const avgConfidence = confidenceValues.length > 0 
        ? confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length 
        : 0;
      
      const processingTimes = requests.filter(r => r.processingTimeMs !== null).map(r => r.processingTimeMs!);
      const avgProcessingTime = processingTimes.length > 0
        ? processingTimes.reduce((sum, val) => sum + val, 0) / processingTimes.length
        : 0;
      
      const costs = requests.filter(r => r.cost !== null).map(r => r.cost!);
      const totalCost = costs.reduce((sum, val) => sum + val, 0);

      return {
        totalRequests,
        successRate,
        avgConfidence,
        avgProcessingTime,
        totalCost
      };
    } catch (error) {
      logger.error('Error getting usage stats', { error, serviceType });
      throw error;
    }
  }

  /**
   * Get pending reviews
   */
  async getPendingReviews(serviceType?: string, limit: number = 50): Promise<any[]> {
    try {
      const where: any = { status: 'pending' };
      if (serviceType) where.serviceType = serviceType;

      const reviews = await prisma.aIReviewQueue.findMany({
        where,
        take: limit,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      return reviews;
    } catch (error) {
      logger.error('Error getting pending reviews', { error, serviceType });
      throw error;
    }
  }

  /**
   * Log audit entry
   */
  async logAudit(data: AIAuditLogData): Promise<any> {
    try {
      return await this.createAuditLog(data);
    } catch (error) {
      logger.error('Error logging audit', { error, data });
      throw error;
    }
  }
}
