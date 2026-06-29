/**
 * Social Interaction Service
 * "Love one another as I have loved you" - John 13:34
 */

import { PrismaClient } from '@prisma/client';
import { UserProfile } from '../types/community.types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class SocialInteractionService {
  /**
   * Like a post
   */
  async likePost(
    userId: string,
    postId: string
  ): Promise<{ liked: boolean; likesCount: number }> {
    try {
      // Check if already liked
      const existing = await prisma.$queryRaw<any[]>`
        SELECT id FROM likes WHERE user_id = ${userId} AND post_id = ${postId}
      `;

      if (existing && existing.length > 0) {
        // Unlike
        await prisma.$executeRaw`
          DELETE FROM likes WHERE user_id = ${userId} AND post_id = ${postId}
        `;

        await prisma.$executeRaw`
          UPDATE posts SET likes_count = likes_count - 1 WHERE id = ${postId}
        `;

        const post = await prisma.$queryRaw<any[]>`
          SELECT likes_count FROM posts WHERE id = ${postId}
        `;

        return { liked: false, likesCount: post[0]?.likes_count || 0 };
      } else {
        // Like
        await prisma.$executeRaw`
          INSERT INTO likes (user_id, post_id) VALUES (${userId}, ${postId})
        `;

        await prisma.$executeRaw`
          UPDATE posts SET likes_count = likes_count + 1 WHERE id = ${postId}
        `;

        // Create notification
        const post = await prisma.$queryRaw<any[]>`
          SELECT author_id, likes_count FROM posts WHERE id = ${postId}
        `;

        if (post && post.length > 0 && post[0].author_id !== userId) {
          await prisma.$executeRaw`
            INSERT INTO notifications (user_id, type, title, message, data, action_url)
            VALUES (
              ${post[0].author_id},
              'like',
              'Someone liked your post',
              'Your post received a new like',
              ${JSON.stringify({ postId, likerId: userId })}::jsonb,
              ${`/community/posts/${postId}`}
            )
          `;
        }

        return { liked: true, likesCount: post[0]?.likes_count || 0 };
      }
    } catch (error) {
      logger.error('Error liking post:', error);
      throw new Error('Failed to like post');
    }
  }

  /**
   * Like a comment
   */
  async likeComment(
    userId: string,
    commentId: string
  ): Promise<{ liked: boolean; likesCount: number }> {
    try {
      // Check if already liked
      const existing = await prisma.$queryRaw<any[]>`
        SELECT id FROM likes WHERE user_id = ${userId} AND comment_id = ${commentId}
      `;

      if (existing && existing.length > 0) {
        // Unlike
        await prisma.$executeRaw`
          DELETE FROM likes WHERE user_id = ${userId} AND comment_id = ${commentId}
        `;

        await prisma.$executeRaw`
          UPDATE comments SET likes_count = likes_count - 1 WHERE id = ${commentId}
        `;

        const comment = await prisma.$queryRaw<any[]>`
          SELECT likes_count FROM comments WHERE id = ${commentId}
        `;

        return { liked: false, likesCount: comment[0]?.likes_count || 0 };
      } else {
        // Like
        await prisma.$executeRaw`
          INSERT INTO likes (user_id, comment_id) VALUES (${userId}, ${commentId})
        `;

        await prisma.$executeRaw`
          UPDATE comments SET likes_count = likes_count + 1 WHERE id = ${commentId}
        `;

        const comment = await prisma.$queryRaw<any[]>`
          SELECT author_id, likes_count FROM comments WHERE id = ${commentId}
        `;

        return { liked: true, likesCount: comment[0]?.likes_count || 0 };
      }
    } catch (error) {
      logger.error('Error liking comment:', error);
      throw new Error('Failed to like comment');
    }
  }

  /**
   * Share a post
   */
  async sharePost(
    userId: string,
    postId: string,
    shareMessage?: string
  ): Promise<void> {
    try {
      // Create share record
      await prisma.$executeRaw`
        INSERT INTO shares (user_id, post_id, share_message)
        VALUES (${userId}, ${postId}, ${shareMessage || null})
      `;

      // Update post share count
      await prisma.$executeRaw`
        UPDATE posts SET shares_count = shares_count + 1 WHERE id = ${postId}
      `;

      // Create notification
      const post = await prisma.$queryRaw<any[]>`
        SELECT author_id FROM posts WHERE id = ${postId}
      `;

      if (post && post.length > 0 && post[0].author_id !== userId) {
        await prisma.$executeRaw`
          INSERT INTO notifications (user_id, type, title, message, data, action_url)
          VALUES (
            ${post[0].author_id},
            'share',
            'Someone shared your post',
            'Your post was shared',
            ${JSON.stringify({ postId, sharerId: userId })}::jsonb,
            ${`/community/posts/${postId}`}
          )
        `;
      }

      logger.info(`Post ${postId} shared by user ${userId}`);
    } catch (error) {
      logger.error('Error sharing post:', error);
      throw new Error('Failed to share post');
    }
  }

  /**
   * Follow a user
   */
  async followUser(
    followerId: string,
    followingId: string
  ): Promise<{ following: boolean }> {
    try {
      if (followerId === followingId) {
        throw new Error('Cannot follow yourself');
      }

      // Check if already following
      const existing = await prisma.$queryRaw<any[]>`
        SELECT id FROM follows WHERE follower_id = ${followerId} AND following_id = ${followingId}
      `;

      if (existing && existing.length > 0) {
        // Unfollow
        await prisma.$executeRaw`
          DELETE FROM follows WHERE follower_id = ${followerId} AND following_id = ${followingId}
        `;

        return { following: false };
      } else {
        // Follow
        await prisma.$executeRaw`
          INSERT INTO follows (follower_id, following_id) VALUES (${followerId}, ${followingId})
        `;

        // Create notification
        await prisma.$executeRaw`
          INSERT INTO notifications (user_id, type, title, message, data, action_url)
          VALUES (
            ${followingId},
            'follow',
            'New follower',
            'Someone started following you',
            ${JSON.stringify({ followerId })}::jsonb,
            ${`/community/users/${followerId}`}
          )
        `;

        return { following: true };
      }
    } catch (error) {
      logger.error('Error following user:', error);
      throw error;
    }
  }

  /**
   * Get followers
   */
  async getFollowers(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ followers: UserProfile[]; total: number }> {
    try {
      const followers = await prisma.$queryRaw<any[]>`
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
        JOIN follows f ON u.id = f.follower_id
        WHERE f.following_id = ${userId}
        ORDER BY f.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const totalResult = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count
        FROM follows
        WHERE following_id = ${userId}
      `;

      const total = parseInt(totalResult[0]?.count || '0');

      return { followers, total };
    } catch (error) {
      logger.error('Error getting followers:', error);
      throw new Error('Failed to get followers');
    }
  }

  /**
   * Get following
   */
  async getFollowing(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ following: UserProfile[]; total: number }> {
    try {
      const following = await prisma.$queryRaw<any[]>`
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
        JOIN follows f ON u.id = f.following_id
        WHERE f.follower_id = ${userId}
        ORDER BY f.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const totalResult = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count
        FROM follows
        WHERE follower_id = ${userId}
      `;

      const total = parseInt(totalResult[0]?.count || '0');

      return { following, total };
    } catch (error) {
      logger.error('Error getting following:', error);
      throw new Error('Failed to get following');
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(
    userId: string,
    currentUserId: string
  ): Promise<UserProfile> {
    try {
      const users = await prisma.$queryRaw<any[]>`
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
          (SELECT COUNT(*) FROM posts WHERE author_id = u.id) as posts_count,
          EXISTS(SELECT 1 FROM follows WHERE follower_id = ${currentUserId} AND following_id = u.id) as is_following
        FROM users u
        WHERE u.id = ${userId}
      `;

      if (!users || users.length === 0) {
        throw new Error('User not found');
      }

      return users[0];
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw error;
    }
  }
}

export default new SocialInteractionService();
