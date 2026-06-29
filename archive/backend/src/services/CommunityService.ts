/**
 * Community Feed Service
 * "Let us consider how we may spur one another on toward love and good deeds" - Hebrews 10:24
 */

import { PrismaClient } from '@prisma/client';
import {
  Post,
  PostWithAuthor,
  CreatePostRequest,
  UpdatePostRequest,
  GetFeedRequest,
  FeedSortOption,
  PostType,
  PostVisibility,
  ModerationStatus,
  UserProfile
} from '../types/community.types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class CommunityService {
  /**
   * Create a new post
   */
  async createPost(
    userId: string,
    data: CreatePostRequest
  ): Promise<PostWithAuthor> {
    try {
      // Extract hashtags from content
      const hashtags = this.extractHashtags(data.content);
      
      // Extract mentions from content
      const mentions = this.extractMentions(data.content);

      // Create post
      const post = await prisma.$queryRaw<any[]>`
        INSERT INTO posts (
          author_id, content, type, media, visibility,
          is_prayer_request, scripture_references, hashtags, mentions
        ) VALUES (
          ${userId},
          ${data.content},
          ${data.type || PostType.TEXT},
          ${JSON.stringify(data.media || [])}::jsonb,
          ${data.visibility || PostVisibility.PUBLIC},
          ${data.isPrayerRequest || false},
          ${JSON.stringify(data.scriptureReferences || [])}::jsonb,
          ${hashtags}::text[],
          ${mentions}::text[]
        )
        RETURNING *
      `;

      // Update trending topics
      if (hashtags.length > 0) {
        await this.updateTrendingTopics(hashtags);
      }

      // Create notifications for mentions
      if (mentions.length > 0) {
        await this.createMentionNotifications(post[0].id, userId, mentions);
      }

      // Get post with author
      return await this.getPostWithAuthor(post[0].id, userId);
    } catch (error) {
      logger.error('Error creating post:', error);
      throw new Error('Failed to create post');
    }
  }

  /**
   * Update a post
   */
  async updatePost(
    userId: string,
    postId: string,
    data: UpdatePostRequest
  ): Promise<PostWithAuthor> {
    try {
      // Verify ownership
      const post = await prisma.$queryRaw<any[]>`
        SELECT * FROM posts WHERE id = ${postId} AND author_id = ${userId}
      `;

      if (!post || post.length === 0) {
        throw new Error('Post not found or unauthorized');
      }

      // Update post
      const updates: string[] = [];
      const values: any[] = [];

      if (data.content !== undefined) {
        updates.push(`content = $${values.length + 1}`);
        values.push(data.content);
        
        // Update hashtags and mentions
        const hashtags = this.extractHashtags(data.content);
        const mentions = this.extractMentions(data.content);
        
        updates.push(`hashtags = $${values.length + 1}::text[]`);
        values.push(hashtags);
        
        updates.push(`mentions = $${values.length + 1}::text[]`);
        values.push(mentions);
      }

      if (data.visibility !== undefined) {
        updates.push(`visibility = $${values.length + 1}`);
        values.push(data.visibility);
      }

      if (data.isPinned !== undefined) {
        updates.push(`is_pinned = $${values.length + 1}`);
        values.push(data.isPinned);
      }

      updates.push(`is_edited = true`);
      updates.push(`edited_at = CURRENT_TIMESTAMP`);
      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      await prisma.$executeRawUnsafe(`
        UPDATE posts
        SET ${updates.join(', ')}
        WHERE id = '${postId}'
      `, ...values);

      return await this.getPostWithAuthor(postId, userId);
    } catch (error) {
      logger.error('Error updating post:', error);
      throw error;
    }
  }

  /**
   * Delete a post
   */
  async deletePost(userId: string, postId: string): Promise<void> {
    try {
      // Verify ownership or admin
      const user = await prisma.$queryRaw<any[]>`
        SELECT role FROM users WHERE id = ${userId}
      `;

      const post = await prisma.$queryRaw<any[]>`
        SELECT author_id FROM posts WHERE id = ${postId}
      `;

      if (!post || post.length === 0) {
        throw new Error('Post not found');
      }

      const isOwner = post[0].author_id === userId;
      const isAdmin = user[0]?.role === 'ADMIN' || user[0]?.role === 'SCROLL_ELDER';

      if (!isOwner && !isAdmin) {
        throw new Error('Unauthorized to delete this post');
      }

      // Delete post (cascade will handle comments, likes, etc.)
      await prisma.$executeRaw`
        DELETE FROM posts WHERE id = ${postId}
      `;

      logger.info(`Post ${postId} deleted by user ${userId}`);
    } catch (error) {
      logger.error('Error deleting post:', error);
      throw error;
    }
  }

  /**
   * Get feed posts
   */
  async getFeed(
    currentUserId: string,
    params: GetFeedRequest
  ): Promise<{ posts: PostWithAuthor[]; total: number; hasMore: boolean }> {
    try {
      const limit = params.limit || 20;
      const offset = params.offset || 0;

      let whereClause = `WHERE p.moderation_status = 'approved'`;
      const queryParams: any[] = [];

      if (params.type) {
        queryParams.push(params.type);
        whereClause += ` AND p.type = $${queryParams.length}`;
      }

      if (params.visibility) {
        queryParams.push(params.visibility);
        whereClause += ` AND p.visibility = $${queryParams.length}`;
      }

      if (params.hashtag) {
        queryParams.push(params.hashtag);
        whereClause += ` AND $${queryParams.length} = ANY(p.hashtags)`;
      }

      if (params.userId) {
        queryParams.push(params.userId);
        whereClause += ` AND p.author_id = $${queryParams.length}`;
      }

      // Sort order
      let orderBy = 'p.created_at DESC';
      if (params.sortBy === FeedSortOption.POPULAR) {
        orderBy = '(p.likes_count + p.comments_count + p.shares_count) DESC, p.created_at DESC';
      } else if (params.sortBy === FeedSortOption.TRENDING) {
        orderBy = `(p.likes_count + p.comments_count * 2 + p.shares_count * 3) / 
                   EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - p.created_at)) DESC`;
      } else if (params.sortBy === FeedSortOption.FOLLOWING) {
        whereClause += ` AND EXISTS (
          SELECT 1 FROM follows f 
          WHERE f.follower_id = '${currentUserId}' 
          AND f.following_id = p.author_id
        )`;
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
          EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = '${currentUserId}') as is_liked,
          EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = '${currentUserId}' AND f.following_id = p.author_id) as is_following
        FROM posts p
        JOIN users u ON p.author_id = u.id
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${queryParams.length - 1}
        OFFSET $${queryParams.length}
      `, ...queryParams);

      const totalResult = await prisma.$queryRawUnsafe<any[]>(`
        SELECT COUNT(*) as count
        FROM posts p
        ${whereClause}
      `, ...queryParams.slice(0, -2));

      const total = parseInt(totalResult[0]?.count || '0');
      const hasMore = offset + limit < total;

      const formattedPosts = posts.map(this.formatPostWithAuthor);

      return { posts: formattedPosts, total, hasMore };
    } catch (error) {
      logger.error('Error getting feed:', error);
      throw new Error('Failed to get feed');
    }
  }

  /**
   * Get a single post with author
   */
  async getPostWithAuthor(postId: string, currentUserId: string): Promise<PostWithAuthor> {
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
        WHERE p.id = ${postId}
      `;

      if (!posts || posts.length === 0) {
        throw new Error('Post not found');
      }

      // Increment view count
      await prisma.$executeRaw`
        UPDATE posts SET views_count = views_count + 1 WHERE id = ${postId}
      `;

      return this.formatPostWithAuthor(posts[0]);
    } catch (error) {
      logger.error('Error getting post:', error);
      throw error;
    }
  }

  /**
   * Search posts
   */
  async searchPosts(
    currentUserId: string,
    query: string,
    filters: any = {}
  ): Promise<{ posts: PostWithAuthor[]; total: number }> {
    try {
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;

      let whereClause = `WHERE p.moderation_status = 'approved' AND (
        p.content ILIKE $1 OR
        EXISTS(SELECT 1 FROM unnest(p.hashtags) h WHERE h ILIKE $1)
      )`;
      const queryParams: any[] = [`%${query}%`];

      if (filters.type) {
        queryParams.push(filters.type);
        whereClause += ` AND p.type = $${queryParams.length}`;
      }

      if (filters.authorId) {
        queryParams.push(filters.authorId);
        whereClause += ` AND p.author_id = $${queryParams.length}`;
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
          EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = '${currentUserId}') as is_liked,
          EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = '${currentUserId}' AND f.following_id = p.author_id) as is_following
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
      const formattedPosts = posts.map(this.formatPostWithAuthor);

      return { posts: formattedPosts, total };
    } catch (error) {
      logger.error('Error searching posts:', error);
      throw new Error('Failed to search posts');
    }
  }

  /**
   * Search users
   */
  async searchUsers(
    query: string,
    filters: any = {}
  ): Promise<{ users: UserProfile[]; total: number }> {
    try {
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;

      let whereClause = `WHERE (
        u.username ILIKE $1 OR
        u.first_name ILIKE $1 OR
        u.last_name ILIKE $1 OR
        CONCAT(u.first_name, ' ', u.last_name) ILIKE $1
      )`;
      const queryParams: any[] = [`%${query}%`];

      if (filters.role) {
        queryParams.push(filters.role);
        whereClause += ` AND u.role = $${queryParams.length}`;
      }

      queryParams.push(limit);
      queryParams.push(offset);

      const users = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          u.id,
          u.username,
          u.first_name,
          u.last_name,
          u.avatar_url,
          u.bio,
          u.role,
          (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
          (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
          (SELECT COUNT(*) FROM posts WHERE author_id = u.id) as posts_count
        FROM users u
        ${whereClause}
        ORDER BY u.username
        LIMIT $${queryParams.length - 1}
        OFFSET $${queryParams.length}
      `, ...queryParams);

      const totalResult = await prisma.$queryRawUnsafe<any[]>(`
        SELECT COUNT(*) as count
        FROM users u
        ${whereClause}
      `, ...queryParams.slice(0, -2));

      const total = parseInt(totalResult[0]?.count || '0');

      return { users, total };
    } catch (error) {
      logger.error('Error searching users:', error);
      throw new Error('Failed to search users');
    }
  }

  /**
   * Extract hashtags from content
   */
  private extractHashtags(content: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = content.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1).toLowerCase()) : [];
  }

  /**
   * Extract mentions from content
   */
  private extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const matches = content.match(mentionRegex);
    return matches ? matches.map(mention => mention.substring(1).toLowerCase()) : [];
  }

  /**
   * Update trending topics
   */
  private async updateTrendingTopics(hashtags: string[]): Promise<void> {
    try {
      for (const hashtag of hashtags) {
        await prisma.$executeRaw`
          INSERT INTO trending_topics (hashtag, post_count, engagement_score, last_updated)
          VALUES (${hashtag}, 1, 1.0, CURRENT_TIMESTAMP)
          ON CONFLICT (hashtag)
          DO UPDATE SET
            post_count = trending_topics.post_count + 1,
            engagement_score = trending_topics.engagement_score + 1.0,
            last_updated = CURRENT_TIMESTAMP
        `;
      }
    } catch (error) {
      logger.error('Error updating trending topics:', error);
    }
  }

  /**
   * Create mention notifications
   */
  private async createMentionNotifications(
    postId: string,
    authorId: string,
    mentions: string[]
  ): Promise<void> {
    try {
      for (const mention of mentions) {
        // Find user by username
        const users = await prisma.$queryRaw<any[]>`
          SELECT id FROM users WHERE LOWER(username) = ${mention.toLowerCase()}
        `;

        if (users && users.length > 0) {
          const userId = users[0].id;
          
          await prisma.$executeRaw`
            INSERT INTO notifications (user_id, type, title, message, data, action_url)
            VALUES (
              ${userId},
              'mention',
              'You were mentioned in a post',
              'Someone mentioned you in their post',
              ${JSON.stringify({ postId, authorId })}::jsonb,
              ${`/community/posts/${postId}`}
            )
          `;
        }
      }
    } catch (error) {
      logger.error('Error creating mention notifications:', error);
    }
  }

  /**
   * Format post with author
   */
  private formatPostWithAuthor(row: any): PostWithAuthor {
    return {
      id: row.id,
      authorId: row.author_id,
      content: row.content,
      type: row.type,
      media: row.media || [],
      visibility: row.visibility,
      isPinned: row.is_pinned,
      isEdited: row.is_edited,
      editedAt: row.edited_at,
      likesCount: row.likes_count,
      commentsCount: row.comments_count,
      sharesCount: row.shares_count,
      viewsCount: row.views_count,
      flagged: row.flagged,
      moderationStatus: row.moderation_status,
      moderationNotes: row.moderation_notes,
      moderatedAt: row.moderated_at,
      moderatedBy: row.moderated_by,
      isPrayerRequest: row.is_prayer_request,
      scriptureReferences: row.scripture_references || [],
      hashtags: row.hashtags || [],
      mentions: row.mentions || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      author: {
        id: row.author_id,
        username: row.author_username,
        firstName: row.author_first_name,
        lastName: row.author_last_name,
        avatarUrl: row.author_avatar_url,
        role: row.author_role
      },
      isLiked: row.is_liked || false,
      isFollowing: row.is_following || false
    };
  }
}

export default new CommunityService();
