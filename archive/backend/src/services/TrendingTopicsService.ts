/**
 * Trending Topics Service
 * "What is trending in the Kingdom?" - Inspired by Matthew 6:33
 */

import { PrismaClient } from '@prisma/client';
import { TrendingTopic, TrendingTimeRange } from '../types/community.types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class TrendingTopicsService {
  /**
   * Get trending topics
   */
  async getTrendingTopics(
    limit: number = 10,
    timeRange: TrendingTimeRange = TrendingTimeRange.DAY
  ): Promise<TrendingTopic[]> {
    try {
      // Calculate time threshold
      let hoursAgo = 24;
      switch (timeRange) {
        case TrendingTimeRange.HOUR:
          hoursAgo = 1;
          break;
        case TrendingTimeRange.DAY:
          hoursAgo = 24;
          break;
        case TrendingTimeRange.WEEK:
          hoursAgo = 168;
          break;
        case TrendingTimeRange.MONTH:
          hoursAgo = 720;
          break;
      }

      const topics = await prisma.$queryRaw<any[]>`
        SELECT *
        FROM trending_topics
        WHERE is_active = true
          AND last_updated >= CURRENT_TIMESTAMP - INTERVAL '${hoursAgo} hours'
        ORDER BY engagement_score DESC, post_count DESC
        LIMIT ${limit}
      `;

      return topics;
    } catch (error) {
      logger.error('Error getting trending topics:', error);
      throw new Error('Failed to get trending topics');
    }
  }

  /**
   * Update trending topics (called periodically)
   */
  async updateTrendingTopics(): Promise<void> {
    try {
      // Calculate engagement scores based on recent activity
      await prisma.$executeRaw`
        UPDATE trending_topics t
        SET 
          engagement_score = (
            SELECT COALESCE(
              SUM(
                (p.likes_count * 1.0) +
                (p.comments_count * 2.0) +
                (p.shares_count * 3.0)
              ) / EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - p.created_at)) * 3600,
              0
            )
            FROM posts p
            WHERE t.hashtag = ANY(p.hashtags)
              AND p.created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
              AND p.moderation_status = 'approved'
          ),
          post_count = (
            SELECT COUNT(*)
            FROM posts p
            WHERE t.hashtag = ANY(p.hashtags)
              AND p.created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
              AND p.moderation_status = 'approved'
          ),
          last_updated = CURRENT_TIMESTAMP
        WHERE last_updated < CURRENT_TIMESTAMP - INTERVAL '1 hour'
      `;

      // Deactivate topics with no recent activity
      await prisma.$executeRaw`
        UPDATE trending_topics
        SET is_active = false
        WHERE last_updated < CURRENT_TIMESTAMP - INTERVAL '7 days'
          OR post_count = 0
      `;

      logger.info('Trending topics updated successfully');
    } catch (error) {
      logger.error('Error updating trending topics:', error);
    }
  }

  /**
   * Get posts by hashtag
   */
  async getPostsByHashtag(
    hashtag: string,
    currentUserId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ posts: any[]; total: number }> {
    try {
      const posts = await prisma.$queryRaw<any[]>`
        SELECT 
          p.*,
          u.id as author_id,
          u.username as author_username,
          u.first_name as author_first_name,
          u.last_name as author_last_name,
          u.avatar_url as author_avatar_url,
          u.role as author_role,
          EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ${currentUserId}) as is_liked,
          EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = ${currentUserId} AND f.following_id = p.author_id) as is_following
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE ${hashtag.toLowerCase()} = ANY(p.hashtags)
          AND p.moderation_status = 'approved'
        ORDER BY p.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const totalResult = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count
        FROM posts
        WHERE ${hashtag.toLowerCase()} = ANY(hashtags)
          AND moderation_status = 'approved'
      `;

      const total = parseInt(totalResult[0]?.count || '0');

      return { posts, total };
    } catch (error) {
      logger.error('Error getting posts by hashtag:', error);
      throw new Error('Failed to get posts by hashtag');
    }
  }

  /**
   * Get related hashtags
   */
  async getRelatedHashtags(hashtag: string, limit: number = 5): Promise<string[]> {
    try {
      // Find posts with the given hashtag
      const relatedHashtags = await prisma.$queryRaw<any[]>`
        SELECT DISTINCT unnest(hashtags) as hashtag, COUNT(*) as count
        FROM posts
        WHERE ${hashtag.toLowerCase()} = ANY(hashtags)
          AND moderation_status = 'approved'
          AND created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
        GROUP BY hashtag
        HAVING hashtag != ${hashtag.toLowerCase()}
        ORDER BY count DESC
        LIMIT ${limit}
      `;

      return relatedHashtags.map(row => row.hashtag);
    } catch (error) {
      logger.error('Error getting related hashtags:', error);
      return [];
    }
  }

  /**
   * Search hashtags
   */
  async searchHashtags(query: string, limit: number = 10): Promise<TrendingTopic[]> {
    try {
      const topics = await prisma.$queryRaw<any[]>`
        SELECT *
        FROM trending_topics
        WHERE hashtag ILIKE ${`%${query}%`}
          AND is_active = true
        ORDER BY engagement_score DESC, post_count DESC
        LIMIT ${limit}
      `;

      return topics;
    } catch (error) {
      logger.error('Error searching hashtags:', error);
      throw new Error('Failed to search hashtags');
    }
  }
}

export default new TrendingTopicsService();
