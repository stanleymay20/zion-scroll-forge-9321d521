/**
 * Comment Service
 * "Let your conversation be always full of grace" - Colossians 4:6
 */

import { PrismaClient } from '@prisma/client';
import {
  Comment,
  CommentWithAuthor,
  CreateCommentRequest
} from '../types/community.types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class CommentService {
  /**
   * Create a comment
   */
  async createComment(
    userId: string,
    data: CreateCommentRequest
  ): Promise<CommentWithAuthor> {
    try {
      // Create comment
      const comment = await prisma.$queryRaw<any[]>`
        INSERT INTO comments (post_id, author_id, content, parent_comment_id)
        VALUES (${data.postId}, ${userId}, ${data.content}, ${data.parentCommentId || null})
        RETURNING *
      `;

      // Update post comment count
      await prisma.$executeRaw`
        UPDATE posts SET comments_count = comments_count + 1 WHERE id = ${data.postId}
      `;

      // Create notification for post author
      await this.createCommentNotification(comment[0].id, data.postId, userId, data.parentCommentId);

      return await this.getCommentWithAuthor(comment[0].id, userId);
    } catch (error) {
      logger.error('Error creating comment:', error);
      throw new Error('Failed to create comment');
    }
  }

  /**
   * Update a comment
   */
  async updateComment(
    userId: string,
    commentId: string,
    content: string
  ): Promise<CommentWithAuthor> {
    try {
      // Verify ownership
      const comment = await prisma.$queryRaw<any[]>`
        SELECT * FROM comments WHERE id = ${commentId} AND author_id = ${userId}
      `;

      if (!comment || comment.length === 0) {
        throw new Error('Comment not found or unauthorized');
      }

      // Update comment
      await prisma.$executeRaw`
        UPDATE comments
        SET content = ${content}, is_edited = true, edited_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${commentId}
      `;

      return await this.getCommentWithAuthor(commentId, userId);
    } catch (error) {
      logger.error('Error updating comment:', error);
      throw error;
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(userId: string, commentId: string): Promise<void> {
    try {
      // Get comment details
      const comment = await prisma.$queryRaw<any[]>`
        SELECT c.*, p.author_id as post_author_id
        FROM comments c
        JOIN posts p ON c.post_id = p.id
        WHERE c.id = ${commentId}
      `;

      if (!comment || comment.length === 0) {
        throw new Error('Comment not found');
      }

      // Check authorization
      const user = await prisma.$queryRaw<any[]>`
        SELECT role FROM users WHERE id = ${userId}
      `;

      const isOwner = comment[0].author_id === userId;
      const isPostOwner = comment[0].post_author_id === userId;
      const isAdmin = user[0]?.role === 'ADMIN' || user[0]?.role === 'SCROLL_ELDER';

      if (!isOwner && !isPostOwner && !isAdmin) {
        throw new Error('Unauthorized to delete this comment');
      }

      // Delete comment
      await prisma.$executeRaw`
        DELETE FROM comments WHERE id = ${commentId}
      `;

      // Update post comment count
      await prisma.$executeRaw`
        UPDATE posts SET comments_count = comments_count - 1 WHERE id = ${comment[0].post_id}
      `;

      logger.info(`Comment ${commentId} deleted by user ${userId}`);
    } catch (error) {
      logger.error('Error deleting comment:', error);
      throw error;
    }
  }

  /**
   * Get comments for a post
   */
  async getComments(
    postId: string,
    currentUserId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ comments: CommentWithAuthor[]; total: number }> {
    try {
      // Get top-level comments
      const comments = await prisma.$queryRaw<any[]>`
        SELECT 
          c.*,
          u.id as author_id,
          u.username as author_username,
          u.first_name as author_first_name,
          u.last_name as author_last_name,
          u.avatar_url as author_avatar_url,
          EXISTS(SELECT 1 FROM likes l WHERE l.comment_id = c.id AND l.user_id = ${currentUserId}) as is_liked
        FROM comments c
        JOIN users u ON c.author_id = u.id
        WHERE c.post_id = ${postId} AND c.parent_comment_id IS NULL
        ORDER BY c.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const totalResult = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count
        FROM comments
        WHERE post_id = ${postId} AND parent_comment_id IS NULL
      `;

      const total = parseInt(totalResult[0]?.count || '0');

      // Get replies for each comment
      const formattedComments = await Promise.all(
        comments.map(async (comment) => {
          const replies = await this.getReplies(comment.id, currentUserId);
          return this.formatCommentWithAuthor(comment, replies);
        })
      );

      return { comments: formattedComments, total };
    } catch (error) {
      logger.error('Error getting comments:', error);
      throw new Error('Failed to get comments');
    }
  }

  /**
   * Get replies for a comment
   */
  private async getReplies(
    commentId: string,
    currentUserId: string
  ): Promise<CommentWithAuthor[]> {
    try {
      const replies = await prisma.$queryRaw<any[]>`
        SELECT 
          c.*,
          u.id as author_id,
          u.username as author_username,
          u.first_name as author_first_name,
          u.last_name as author_last_name,
          u.avatar_url as author_avatar_url,
          EXISTS(SELECT 1 FROM likes l WHERE l.comment_id = c.id AND l.user_id = ${currentUserId}) as is_liked
        FROM comments c
        JOIN users u ON c.author_id = u.id
        WHERE c.parent_comment_id = ${commentId}
        ORDER BY c.created_at ASC
      `;

      return replies.map(reply => this.formatCommentWithAuthor(reply, []));
    } catch (error) {
      logger.error('Error getting replies:', error);
      return [];
    }
  }

  /**
   * Get a single comment with author
   */
  private async getCommentWithAuthor(
    commentId: string,
    currentUserId: string
  ): Promise<CommentWithAuthor> {
    try {
      const comments = await prisma.$queryRaw<any[]>`
        SELECT 
          c.*,
          u.id as author_id,
          u.username as author_username,
          u.first_name as author_first_name,
          u.last_name as author_last_name,
          u.avatar_url as author_avatar_url,
          EXISTS(SELECT 1 FROM likes l WHERE l.comment_id = c.id AND l.user_id = ${currentUserId}) as is_liked
        FROM comments c
        JOIN users u ON c.author_id = u.id
        WHERE c.id = ${commentId}
      `;

      if (!comments || comments.length === 0) {
        throw new Error('Comment not found');
      }

      const replies = await this.getReplies(commentId, currentUserId);
      return this.formatCommentWithAuthor(comments[0], replies);
    } catch (error) {
      logger.error('Error getting comment:', error);
      throw error;
    }
  }

  /**
   * Create comment notification
   */
  private async createCommentNotification(
    commentId: string,
    postId: string,
    commenterId: string,
    parentCommentId?: string
  ): Promise<void> {
    try {
      if (parentCommentId) {
        // Notify parent comment author
        const parentComment = await prisma.$queryRaw<any[]>`
          SELECT author_id FROM comments WHERE id = ${parentCommentId}
        `;

        if (parentComment && parentComment.length > 0 && parentComment[0].author_id !== commenterId) {
          await prisma.$executeRaw`
            INSERT INTO notifications (user_id, type, title, message, data, action_url)
            VALUES (
              ${parentComment[0].author_id},
              'reply',
              'New reply to your comment',
              'Someone replied to your comment',
              ${JSON.stringify({ commentId, postId, commenterId })}::jsonb,
              ${`/community/posts/${postId}`}
            )
          `;
        }
      } else {
        // Notify post author
        const post = await prisma.$queryRaw<any[]>`
          SELECT author_id FROM posts WHERE id = ${postId}
        `;

        if (post && post.length > 0 && post[0].author_id !== commenterId) {
          await prisma.$executeRaw`
            INSERT INTO notifications (user_id, type, title, message, data, action_url)
            VALUES (
              ${post[0].author_id},
              'comment',
              'New comment on your post',
              'Someone commented on your post',
              ${JSON.stringify({ commentId, postId, commenterId })}::jsonb,
              ${`/community/posts/${postId}`}
            )
          `;
        }
      }
    } catch (error) {
      logger.error('Error creating comment notification:', error);
    }
  }

  /**
   * Format comment with author
   */
  private formatCommentWithAuthor(row: any, replies: CommentWithAuthor[]): CommentWithAuthor {
    return {
      id: row.id,
      postId: row.post_id,
      authorId: row.author_id,
      content: row.content,
      parentCommentId: row.parent_comment_id,
      isEdited: row.is_edited,
      editedAt: row.edited_at,
      likesCount: row.likes_count,
      flagged: row.flagged,
      moderationStatus: row.moderation_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      author: {
        id: row.author_id,
        username: row.author_username,
        firstName: row.author_first_name,
        lastName: row.author_last_name,
        avatarUrl: row.author_avatar_url
      },
      isLiked: row.is_liked || false,
      replies
    };
  }
}

export default new CommentService();
