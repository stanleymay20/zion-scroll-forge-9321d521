/**
 * User Feedback Service
 * Comprehensive feedback collection, surveys, and user sentiment analysis
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  UserFeedback,
  FeedbackSurvey,
  CreateFeedbackRequest,
  FeedbackCategory,
  FeedbackStatus,
} from '../types/post-launch.types';

const prisma = new PrismaClient();

export default class UserFeedbackService {
  /**
   * Submit user feedback
   */
  async submitFeedback(
    userId: string,
    request: CreateFeedbackRequest
  ): Promise<UserFeedback> {
    try {
      // Create feedback
      const feedbackResult = await prisma.$queryRaw<any[]>`
        INSERT INTO user_feedback (
          id, user_id, type, category, title, description, severity, status, created_at, updated_at
        )
        VALUES (
          gen_random_uuid()::text,
          ${userId},
          ${request.type},
          ${request.category},
          ${request.title},
          ${request.description},
          ${request.severity || null},
          'submitted',
          NOW(),
          NOW()
        )
        RETURNING *
      `;

      const feedback = feedbackResult[0];

      // Store metadata
      await prisma.$executeRaw`
        INSERT INTO feedback_metadata (
          id, feedback_id, user_agent, platform, screen_resolution, url, session_id,
          browser_name, browser_version, device_type, os, os_version, created_at
        )
        VALUES (
          gen_random_uuid()::text,
          ${feedback.id},
          ${request.metadata.userAgent},
          ${request.metadata.platform},
          ${request.metadata.screenResolution},
          ${request.metadata.url},
          ${request.metadata.sessionId},
          ${request.metadata.browserInfo?.name || null},
          ${request.metadata.browserInfo?.version || null},
          ${request.metadata.deviceInfo?.type || null},
          ${request.metadata.deviceInfo?.os || null},
          ${request.metadata.deviceInfo?.osVersion || null},
          NOW()
        )
      `;

      logger.info(`Feedback submitted: ${feedback.id} by user ${userId}`);

      return {
        id: feedback.id,
        userId: feedback.user_id,
        type: feedback.type,
        category: feedback.category,
        title: feedback.title,
        description: feedback.description,
        severity: feedback.severity,
        priority: feedback.priority,
        status: feedback.status,
        votes: feedback.votes,
        comments: [],
        createdAt: feedback.created_at,
        updatedAt: feedback.updated_at,
        metadata: request.metadata,
      };
    } catch (error) {
      logger.error('Error submitting feedback:', error);
      throw new Error('Failed to submit feedback');
    }
  }

  /**
   * Get feedback by ID
   */
  async getFeedback(feedbackId: string): Promise<UserFeedback | null> {
    try {
      const feedback = await prisma.$queryRaw<any[]>`
        SELECT 
          f.*,
          m.user_agent, m.platform, m.screen_resolution, m.url, m.session_id,
          m.browser_name, m.browser_version, m.device_type, m.os, m.os_version
        FROM user_feedback f
        LEFT JOIN feedback_metadata m ON f.id = m.feedback_id
        WHERE f.id = ${feedbackId}
      `;

      if (feedback.length === 0) {
        return null;
      }

      const f = feedback[0];

      // Get comments
      const comments = await prisma.$queryRaw<any[]>`
        SELECT * FROM feedback_comments
        WHERE feedback_id = ${feedbackId}
        ORDER BY created_at ASC
      `;

      return {
        id: f.id,
        userId: f.user_id,
        type: f.type,
        category: f.category,
        title: f.title,
        description: f.description,
        severity: f.severity,
        priority: f.priority,
        status: f.status,
        votes: f.votes,
        assignedTo: f.assigned_to,
        resolvedAt: f.resolved_at,
        comments: comments.map((c) => ({
          id: c.id,
          userId: c.user_id,
          content: c.content,
          createdAt: c.created_at,
        })),
        createdAt: f.created_at,
        updatedAt: f.updated_at,
        metadata: {
          userAgent: f.user_agent,
          platform: f.platform,
          screenResolution: f.screen_resolution,
          url: f.url,
          sessionId: f.session_id,
          browserInfo: {
            name: f.browser_name,
            version: f.browser_version,
            engine: '',
          },
          deviceInfo: {
            type: f.device_type,
            os: f.os,
            osVersion: f.os_version,
          },
        },
      };
    } catch (error) {
      logger.error('Error fetching feedback:', error);
      throw new Error('Failed to fetch feedback');
    }
  }

  /**
   * Get all feedback with filters
   */
  async getAllFeedback(filters?: {
    type?: string;
    category?: FeedbackCategory;
    status?: FeedbackStatus;
    severity?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ feedback: UserFeedback[]; total: number }> {
    try {
      const conditions: string[] = [];
      if (filters?.type) conditions.push(`f.type = '${filters.type}'`);
      if (filters?.category) conditions.push(`f.category = '${filters.category}'`);
      if (filters?.status) conditions.push(`f.status = '${filters.status}'`);
      if (filters?.severity) conditions.push(`f.severity = '${filters.severity}'`);
      if (filters?.userId) conditions.push(`f.user_id = '${filters.userId}'`);

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;

      const feedback = await prisma.$queryRaw<any[]>`
        SELECT 
          f.*,
          m.user_agent, m.platform, m.screen_resolution, m.url, m.session_id,
          m.browser_name, m.browser_version, m.device_type, m.os, m.os_version
        FROM user_feedback f
        LEFT JOIN feedback_metadata m ON f.id = m.feedback_id
        ${whereClause}
        ORDER BY f.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM user_feedback f ${whereClause}
      `;

      return {
        feedback: feedback.map((f) => ({
          id: f.id,
          userId: f.user_id,
          type: f.type,
          category: f.category,
          title: f.title,
          description: f.description,
          severity: f.severity,
          priority: f.priority,
          status: f.status,
          votes: f.votes,
          assignedTo: f.assigned_to,
          resolvedAt: f.resolved_at,
          comments: [],
          createdAt: f.created_at,
          updatedAt: f.updated_at,
          metadata: {
            userAgent: f.user_agent,
            platform: f.platform,
            screenResolution: f.screen_resolution,
            url: f.url,
            sessionId: f.session_id,
            browserInfo: {
              name: f.browser_name,
              version: f.browser_version,
              engine: '',
            },
            deviceInfo: {
              type: f.device_type,
              os: f.os,
              osVersion: f.os_version,
            },
          },
        })),
        total: parseInt(countResult[0].count),
      };
    } catch (error) {
      logger.error('Error fetching all feedback:', error);
      throw new Error('Failed to fetch feedback');
    }
  }

  /**
   * Update feedback status
   */
  async updateFeedbackStatus(
    feedbackId: string,
    status: FeedbackStatus,
    assignedTo?: string
  ): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE user_feedback
        SET 
          status = ${status},
          assigned_to = ${assignedTo || null},
          resolved_at = ${status === 'completed' ? new Date() : null},
          updated_at = NOW()
        WHERE id = ${feedbackId}
      `;

      logger.info(`Feedback ${feedbackId} status updated to ${status}`);
    } catch (error) {
      logger.error('Error updating feedback status:', error);
      throw new Error('Failed to update feedback status');
    }
  }

  /**
   * Vote on feedback
   */
  async voteFeedback(feedbackId: string, userId: string): Promise<void> {
    try {
      // Check if user already voted
      const existingVote = await prisma.$queryRaw<any[]>`
        SELECT * FROM feedback_votes
        WHERE feedback_id = ${feedbackId} AND user_id = ${userId}
      `;

      if (existingVote.length > 0) {
        throw new Error('User already voted on this feedback');
      }

      // Add vote
      await prisma.$executeRaw`
        INSERT INTO feedback_votes (id, feedback_id, user_id, created_at)
        VALUES (gen_random_uuid()::text, ${feedbackId}, ${userId}, NOW())
      `;

      // Update vote count
      await prisma.$executeRaw`
        UPDATE user_feedback
        SET votes = votes + 1, updated_at = NOW()
        WHERE id = ${feedbackId}
      `;

      logger.info(`User ${userId} voted on feedback ${feedbackId}`);
    } catch (error) {
      logger.error('Error voting on feedback:', error);
      throw error;
    }
  }

  /**
   * Add comment to feedback
   */
  async addComment(feedbackId: string, userId: string, content: string): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO feedback_comments (id, feedback_id, user_id, content, created_at)
        VALUES (gen_random_uuid()::text, ${feedbackId}, ${userId}, ${content}, NOW())
      `;

      logger.info(`Comment added to feedback ${feedbackId} by user ${userId}`);
    } catch (error) {
      logger.error('Error adding comment:', error);
      throw new Error('Failed to add comment');
    }
  }

  /**
   * Create feedback survey
   */
  async createSurvey(
    survey: Omit<FeedbackSurvey, 'id' | 'responses' | 'createdAt'>
  ): Promise<FeedbackSurvey> {
    try {
      const result = await prisma.$queryRaw<any[]>`
        INSERT INTO feedback_surveys (
          id, title, description, questions, target_audience, schedule, active, responses, created_at, updated_at
        )
        VALUES (
          gen_random_uuid()::text,
          ${survey.title},
          ${survey.description},
          ${JSON.stringify(survey.questions)}::jsonb,
          ${JSON.stringify(survey.targetAudience)}::jsonb,
          ${JSON.stringify(survey.schedule)}::jsonb,
          ${survey.active},
          0,
          NOW(),
          NOW()
        )
        RETURNING *
      `;

      return {
        id: result[0].id,
        title: result[0].title,
        description: result[0].description,
        questions: result[0].questions,
        targetAudience: result[0].target_audience,
        schedule: result[0].schedule,
        active: result[0].active,
        responses: result[0].responses,
        createdAt: result[0].created_at,
      };
    } catch (error) {
      logger.error('Error creating survey:', error);
      throw new Error('Failed to create survey');
    }
  }

  /**
   * Submit survey response
   */
  async submitSurveyResponse(
    surveyId: string,
    userId: string,
    answers: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO survey_responses (id, survey_id, user_id, answers, completed_at)
        VALUES (gen_random_uuid()::text, ${surveyId}, ${userId}, ${JSON.stringify(answers)}::jsonb, NOW())
      `;

      // Update response count
      await prisma.$executeRaw`
        UPDATE feedback_surveys
        SET responses = responses + 1, updated_at = NOW()
        WHERE id = ${surveyId}
      `;

      logger.info(`Survey response submitted for survey ${surveyId} by user ${userId}`);
    } catch (error) {
      logger.error('Error submitting survey response:', error);
      throw new Error('Failed to submit survey response');
    }
  }

  /**
   * Get feedback analytics
   */
  async getFeedbackAnalytics(timeRange?: { start: Date; end: Date }): Promise<{
    totalFeedback: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    averageResolutionTime: number;
    topVoted: UserFeedback[];
  }> {
    try {
      const whereClause = timeRange
        ? `WHERE created_at BETWEEN '${timeRange.start.toISOString()}' AND '${timeRange.end.toISOString()}'`
        : '';

      const total = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM user_feedback ${whereClause}
      `;

      const byType = await prisma.$queryRaw<any[]>`
        SELECT type, COUNT(*) as count FROM user_feedback ${whereClause} GROUP BY type
      `;

      const byCategory = await prisma.$queryRaw<any[]>`
        SELECT category, COUNT(*) as count FROM user_feedback ${whereClause} GROUP BY category
      `;

      const byStatus = await prisma.$queryRaw<any[]>`
        SELECT status, COUNT(*) as count FROM user_feedback ${whereClause} GROUP BY status
      `;

      const resolutionTime = await prisma.$queryRaw<any[]>`
        SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as avg_hours
        FROM user_feedback
        WHERE resolved_at IS NOT NULL ${timeRange ? `AND created_at BETWEEN '${timeRange.start.toISOString()}' AND '${timeRange.end.toISOString()}'` : ''}
      `;

      const topVoted = await this.getAllFeedback({
        limit: 10,
        offset: 0,
      });

      return {
        totalFeedback: parseInt(total[0].count),
        byType: Object.fromEntries(byType.map((t) => [t.type, parseInt(t.count)])),
        byCategory: Object.fromEntries(byCategory.map((c) => [c.category, parseInt(c.count)])),
        byStatus: Object.fromEntries(byStatus.map((s) => [s.status, parseInt(s.count)])),
        averageResolutionTime: parseFloat(resolutionTime[0]?.avg_hours || '0'),
        topVoted: topVoted.feedback.sort((a, b) => b.votes - a.votes).slice(0, 10),
      };
    } catch (error) {
      logger.error('Error fetching feedback analytics:', error);
      throw new Error('Failed to fetch feedback analytics');
    }
  }
}
