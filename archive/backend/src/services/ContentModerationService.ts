/**
 * Content Moderation Service
 * "Test everything; hold fast what is good" - 1 Thessalonians 5:21
 */

import { PrismaClient } from '@prisma/client';
import {
  PostReport,
  ReportReason,
  ReportStatus,
  ModerationAction,
  ModerationStatus,
  AIContentFlagResult,
  ContentCategory,
  SeverityLevel
} from '../types/community.types';
import logger from '../utils/logger';
import AIGatewayService from './AIGatewayService';

const prisma = new PrismaClient();

export class ContentModerationService {
  /**
   * Flag content using AI
   */
  async flagContentWithAI(content: string): Promise<AIContentFlagResult> {
    try {
      const prompt = `Analyze the following content for inappropriate material. Check for:
- Spam or promotional content
- Harassment or bullying
- Hate speech or discrimination
- Violence or threats
- Sexual content
- Misinformation
- Theological concerns (heresy, false teaching)

Content: "${content}"

Respond with a JSON object containing:
{
  "isFlagged": boolean,
  "confidence": number (0-1),
  "reasons": string[],
  "categories": string[] (from: spam, harassment, hate_speech, violence, sexual_content, misinformation, theological_concern, safe),
  "severity": string (low, medium, high, critical),
  "recommendations": string[]
}`;

      const response = await AIGatewayService.generateCompletion({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a content moderation AI for a Christian educational platform. Be thorough but fair in your analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        maxTokens: 500
      });

      const result = JSON.parse(response.content);

      return {
        isFlagged: result.isFlagged,
        confidence: result.confidence,
        reasons: result.reasons || [],
        categories: result.categories || [ContentCategory.SAFE],
        severity: result.severity || SeverityLevel.LOW,
        recommendations: result.recommendations || []
      };
    } catch (error) {
      logger.error('Error flagging content with AI:', error);
      // Return safe result on error
      return {
        isFlagged: false,
        confidence: 0,
        reasons: [],
        categories: [ContentCategory.SAFE],
        severity: SeverityLevel.LOW,
        recommendations: []
      };
    }
  }

  /**
   * Report a post
   */
  async reportPost(
    reporterId: string,
    postId: string,
    reason: ReportReason,
    description?: string
  ): Promise<PostReport> {
    try {
      // Check if post exists
      const post = await prisma.$queryRaw<any[]>`
        SELECT id FROM posts WHERE id = ${postId}
      `;

      if (!post || post.length === 0) {
        throw new Error('Post not found');
      }

      // Create report
      const report = await prisma.$queryRaw<any[]>`
        INSERT INTO post_reports (post_id, reporter_id, reason, description)
        VALUES (${postId}, ${reporterId}, ${reason}, ${description || null})
        RETURNING *
      `;

      // Flag the post
      await prisma.$executeRaw`
        UPDATE posts SET flagged = true WHERE id = ${postId}
      `;

      logger.info(`Post ${postId} reported by user ${reporterId} for ${reason}`);

      return report[0];
    } catch (error) {
      logger.error('Error reporting post:', error);
      throw new Error('Failed to report post');
    }
  }

  /**
   * Get moderation queue
   */
  async getModerationQueue(
    status?: ModerationStatus,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ posts: any[]; total: number }> {
    try {
      let whereClause = 'WHERE p.flagged = true';
      const queryParams: any[] = [];

      if (status) {
        queryParams.push(status);
        whereClause += ` AND p.moderation_status = $${queryParams.length}`;
      }

      queryParams.push(limit);
      queryParams.push(offset);

      const posts = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          p.*,
          u.id as author_id,
          u.username as author_username,
          u.first_name as author_first_name,
          u.last_name as author_last_name,
          u.avatar_url as author_avatar_url,
          u.role as author_role,
          (SELECT COUNT(*) FROM post_reports WHERE post_id = p.id) as report_count,
          (SELECT json_agg(json_build_object(
            'id', pr.id,
            'reason', pr.reason,
            'description', pr.description,
            'reporter_id', pr.reporter_id,
            'created_at', pr.created_at
          )) FROM post_reports pr WHERE pr.post_id = p.id) as reports
        FROM posts p
        JOIN users u ON p.author_id = u.id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $${queryParams.length - 1}
        OFFSET $${queryParams.length}
      `, ...queryParams);

      const totalResult = await prisma.$queryRawUnsafe<any[]>(`
        SELECT COUNT(*) as count
        FROM posts p
        ${whereClause}
      `, ...queryParams.slice(0, -2));

      const total = parseInt(totalResult[0]?.count || '0');

      return { posts, total };
    } catch (error) {
      logger.error('Error getting moderation queue:', error);
      throw new Error('Failed to get moderation queue');
    }
  }

  /**
   * Moderate a post
   */
  async moderatePost(
    moderatorId: string,
    postId: string,
    action: ModerationAction,
    notes?: string
  ): Promise<void> {
    try {
      let moderationStatus: ModerationStatus;
      let shouldDelete = false;

      switch (action) {
        case ModerationAction.APPROVE:
          moderationStatus = ModerationStatus.APPROVED;
          break;
        case ModerationAction.REJECT:
          moderationStatus = ModerationStatus.REJECTED;
          break;
        case ModerationAction.FLAG:
          moderationStatus = ModerationStatus.FLAGGED;
          break;
        case ModerationAction.REMOVE:
          shouldDelete = true;
          moderationStatus = ModerationStatus.REJECTED;
          break;
        default:
          throw new Error('Invalid moderation action');
      }

      if (shouldDelete) {
        // Delete the post
        await prisma.$executeRaw`
          DELETE FROM posts WHERE id = ${postId}
        `;
      } else {
        // Update moderation status
        await prisma.$executeRaw`
          UPDATE posts
          SET 
            moderation_status = ${moderationStatus},
            moderation_notes = ${notes || null},
            moderated_at = CURRENT_TIMESTAMP,
            moderated_by = ${moderatorId},
            flagged = ${action === ModerationAction.FLAG}
          WHERE id = ${postId}
        `;

        // Update all reports for this post
        await prisma.$executeRaw`
          UPDATE post_reports
          SET 
            status = 'resolved',
            reviewed_by = ${moderatorId},
            reviewed_at = CURRENT_TIMESTAMP,
            action_taken = ${action}
          WHERE post_id = ${postId} AND status = 'pending'
        `;

        // Notify post author
        const post = await prisma.$queryRaw<any[]>`
          SELECT author_id FROM posts WHERE id = ${postId}
        `;

        if (post && post.length > 0) {
          const notificationType = action === ModerationAction.APPROVE ? 'post_approved' : 'post_rejected';
          const title = action === ModerationAction.APPROVE ? 'Post approved' : 'Post moderated';
          const message = action === ModerationAction.APPROVE 
            ? 'Your post has been approved and is now visible'
            : `Your post has been ${action}ed by a moderator`;

          await prisma.$executeRaw`
            INSERT INTO notifications (user_id, type, title, message, data, action_url)
            VALUES (
              ${post[0].author_id},
              ${notificationType},
              ${title},
              ${message},
              ${JSON.stringify({ postId, action, notes })}::jsonb,
              ${`/community/posts/${postId}`}
            )
          `;
        }
      }

      logger.info(`Post ${postId} moderated with action ${action} by ${moderatorId}`);
    } catch (error) {
      logger.error('Error moderating post:', error);
      throw new Error('Failed to moderate post');
    }
  }

  /**
   * Get reports for a post
   */
  async getPostReports(postId: string): Promise<PostReport[]> {
    try {
      const reports = await prisma.$queryRaw<any[]>`
        SELECT 
          pr.*,
          u.username as reporter_username,
          u.first_name as reporter_first_name,
          u.last_name as reporter_last_name
        FROM post_reports pr
        JOIN users u ON pr.reporter_id = u.id
        WHERE pr.post_id = ${postId}
        ORDER BY pr.created_at DESC
      `;

      return reports;
    } catch (error) {
      logger.error('Error getting post reports:', error);
      throw new Error('Failed to get post reports');
    }
  }

  /**
   * Dismiss a report
   */
  async dismissReport(moderatorId: string, reportId: string): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE post_reports
        SET 
          status = 'dismissed',
          reviewed_by = ${moderatorId},
          reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ${reportId}
      `;

      logger.info(`Report ${reportId} dismissed by ${moderatorId}`);
    } catch (error) {
      logger.error('Error dismissing report:', error);
      throw new Error('Failed to dismiss report');
    }
  }
}

export default new ContentModerationService();
