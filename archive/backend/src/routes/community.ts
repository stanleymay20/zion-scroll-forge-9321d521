/**
 * Community Feed and Social Features Routes
 * "Let us consider how we may spur one another on toward love and good deeds" - Hebrews 10:24
 */

import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import CommunityService from '../services/CommunityService';
import CommentService from '../services/CommentService';
import SocialInteractionService from '../services/SocialInteractionService';
import ContentModerationService from '../services/ContentModerationService';
import NotificationService from '../services/NotificationService';
import TrendingTopicsService from '../services/TrendingTopicsService';
import {
  CreatePostRequest,
  UpdatePostRequest,
  GetFeedRequest,
  CreateCommentRequest,
  ReportPostRequest,
  ModerationAction,
  TrendingTimeRange
} from '../types/community.types';
import logger from '../utils/logger';

const router = express.Router();

// ============================================================================
// Post Routes
// ============================================================================

/**
 * Create a new post
 * POST /api/community/posts
 */
router.post('/posts', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const data: CreatePostRequest = req.body;

    // AI content moderation
    const flagResult = await ContentModerationService.flagContentWithAI(data.content);
    
    if (flagResult.isFlagged && flagResult.confidence > 0.8) {
      res.status(400).json({
        success: false,
        error: 'Content flagged by moderation system',
        details: flagResult
      });
      return;
    }

    const post = await CommunityService.createPost(userId, data);

    res.status(201).json({
      success: true,
      post
    });
  } catch (error) {
    logger.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create post'
    });
  }
});

/**
 * Get feed
 * GET /api/community/feed
 */
router.get('/feed', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const params: GetFeedRequest = {
      type: req.query.type as any,
      visibility: req.query.visibility as any,
      hashtag: req.query.hashtag as string,
      userId: req.query.userId as string,
      limit: parseInt(req.query.limit as string) || 20,
      offset: parseInt(req.query.offset as string) || 0,
      sortBy: req.query.sortBy as any
    };

    const result = await CommunityService.getFeed(userId, params);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error getting feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feed'
    });
  }
});

/**
 * Get a single post
 * GET /api/community/posts/:postId
 */
router.get('/posts/:postId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { postId } = req.params;

    const post = await CommunityService.getPostWithAuthor(postId, userId);

    res.json({
      success: true,
      post
    });
  } catch (error) {
    logger.error('Error getting post:', error);
    res.status(404).json({
      success: false,
      error: 'Post not found'
    });
  }
});

/**
 * Update a post
 * PUT /api/community/posts/:postId
 */
router.put('/posts/:postId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { postId } = req.params;
    const data: UpdatePostRequest = { ...req.body, postId };

    const post = await CommunityService.updatePost(userId, postId, data);

    res.json({
      success: true,
      post
    });
  } catch (error) {
    logger.error('Error updating post:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update post'
    });
  }
});

/**
 * Delete a post
 * DELETE /api/community/posts/:postId
 */
router.delete('/posts/:postId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { postId } = req.params;

    await CommunityService.deletePost(userId, postId);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting post:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete post'
    });
  }
});

/**
 * Search posts
 * GET /api/community/posts/search
 */
router.get('/posts/search', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const query = req.query.q as string;
    const filters = {
      type: req.query.type,
      authorId: req.query.authorId,
      limit: parseInt(req.query.limit as string) || 20,
      offset: parseInt(req.query.offset as string) || 0
    };

    const result = await CommunityService.searchPosts(userId, query, filters);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error searching posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search posts'
    });
  }
});

// ============================================================================
// Comment Routes
// ============================================================================

/**
 * Create a comment
 * POST /api/community/comments
 */
router.post('/comments', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const data: CreateCommentRequest = req.body;

    const comment = await CommentService.createComment(userId, data);

    res.status(201).json({
      success: true,
      comment
    });
  } catch (error) {
    logger.error('Error creating comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create comment'
    });
  }
});

/**
 * Get comments for a post
 * GET /api/community/posts/:postId/comments
 */
router.get('/posts/:postId/comments', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { postId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await CommentService.getComments(postId, userId, limit, offset);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error getting comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get comments'
    });
  }
});

/**
 * Update a comment
 * PUT /api/community/comments/:commentId
 */
router.put('/comments/:commentId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { commentId } = req.params;
    const { content } = req.body;

    const comment = await CommentService.updateComment(userId, commentId, content);

    res.json({
      success: true,
      comment
    });
  } catch (error) {
    logger.error('Error updating comment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update comment'
    });
  }
});

/**
 * Delete a comment
 * DELETE /api/community/comments/:commentId
 */
router.delete('/comments/:commentId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { commentId } = req.params;

    await CommentService.deleteComment(userId, commentId);

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete comment'
    });
  }
});

// ============================================================================
// Social Interaction Routes
// ============================================================================

/**
 * Like a post
 * POST /api/community/posts/:postId/like
 */
router.post('/posts/:postId/like', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { postId } = req.params;

    const result = await SocialInteractionService.likePost(userId, postId);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error liking post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like post'
    });
  }
});

/**
 * Like a comment
 * POST /api/community/comments/:commentId/like
 */
router.post('/comments/:commentId/like', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { commentId } = req.params;

    const result = await SocialInteractionService.likeComment(userId, commentId);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error liking comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like comment'
    });
  }
});

/**
 * Share a post
 * POST /api/community/posts/:postId/share
 */
router.post('/posts/:postId/share', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { postId } = req.params;
    const { shareMessage } = req.body;

    await SocialInteractionService.sharePost(userId, postId, shareMessage);

    res.json({
      success: true,
      message: 'Post shared successfully'
    });
  } catch (error) {
    logger.error('Error sharing post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share post'
    });
  }
});

/**
 * Follow a user
 * POST /api/community/users/:userId/follow
 */
router.post('/users/:userId/follow', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const followerId = (req as any).user.id;
    const { userId: followingId } = req.params;

    const result = await SocialInteractionService.followUser(followerId, followingId);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error following user:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to follow user'
    });
  }
});

/**
 * Get followers
 * GET /api/community/users/:userId/followers
 */
router.get('/users/:userId/followers', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await SocialInteractionService.getFollowers(userId, limit, offset);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error getting followers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get followers'
    });
  }
});

/**
 * Get following
 * GET /api/community/users/:userId/following
 */
router.get('/users/:userId/following', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await SocialInteractionService.getFollowing(userId, limit, offset);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error getting following:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get following'
    });
  }
});

/**
 * Get user profile
 * GET /api/community/users/:userId/profile
 */
router.get('/users/:userId/profile', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUserId = (req as any).user.id;
    const { userId } = req.params;

    const profile = await SocialInteractionService.getUserProfile(userId, currentUserId);

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    logger.error('Error getting user profile:', error);
    res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }
});

/**
 * Search users
 * GET /api/community/users/search
 */
router.get('/users/search', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    const filters = {
      role: req.query.role,
      limit: parseInt(req.query.limit as string) || 20,
      offset: parseInt(req.query.offset as string) || 0
    };

    const result = await CommunityService.searchUsers(query, filters);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search users'
    });
  }
});

// ============================================================================
// Moderation Routes
// ============================================================================

/**
 * Report a post
 * POST /api/community/posts/:postId/report
 */
router.post('/posts/:postId/report', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const reporterId = (req as any).user.id;
    const { postId } = req.params;
    const { reason, description }: ReportPostRequest = req.body;

    const report = await ContentModerationService.reportPost(reporterId, postId, reason, description);

    res.status(201).json({
      success: true,
      report
    });
  } catch (error) {
    logger.error('Error reporting post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report post'
    });
  }
});

/**
 * Get moderation queue (admin only)
 * GET /api/community/moderation/queue
 */
router.get('/moderation/queue', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    // Check if user is admin or moderator
    if (user.role !== 'ADMIN' && user.role !== 'SCROLL_ELDER') {
      res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
      return;
    }

    const status = req.query.status as any;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await ContentModerationService.getModerationQueue(status, limit, offset);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error getting moderation queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get moderation queue'
    });
  }
});

/**
 * Moderate a post (admin only)
 * POST /api/community/moderation/posts/:postId
 */
router.post('/moderation/posts/:postId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    // Check if user is admin or moderator
    if (user.role !== 'ADMIN' && user.role !== 'SCROLL_ELDER') {
      res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
      return;
    }

    const { postId } = req.params;
    const { action, notes } = req.body;

    await ContentModerationService.moderatePost(user.id, postId, action as ModerationAction, notes);

    res.json({
      success: true,
      message: 'Post moderated successfully'
    });
  } catch (error) {
    logger.error('Error moderating post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to moderate post'
    });
  }
});

// ============================================================================
// Notification Routes
// ============================================================================

/**
 * Get notifications
 * GET /api/community/notifications
 */
router.get('/notifications', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const type = req.query.type as any;
    const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await NotificationService.getNotifications(userId, type, isRead, limit, offset);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications'
    });
  }
});

/**
 * Mark notification as read
 * PUT /api/community/notifications/:notificationId/read
 */
router.put('/notifications/:notificationId/read', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { notificationId } = req.params;

    await NotificationService.markAsRead(notificationId);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

/**
 * Mark all notifications as read
 * PUT /api/community/notifications/read-all
 */
router.put('/notifications/read-all', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    await NotificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read'
    });
  }
});

// ============================================================================
// Trending Topics Routes
// ============================================================================

/**
 * Get trending topics
 * GET /api/community/trending
 */
router.get('/trending', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const timeRange = (req.query.timeRange as TrendingTimeRange) || TrendingTimeRange.DAY;

    const topics = await TrendingTopicsService.getTrendingTopics(limit, timeRange);

    res.json({
      success: true,
      topics
    });
  } catch (error) {
    logger.error('Error getting trending topics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending topics'
    });
  }
});

/**
 * Get posts by hashtag
 * GET /api/community/hashtags/:hashtag/posts
 */
router.get('/hashtags/:hashtag/posts', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { hashtag } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await TrendingTopicsService.getPostsByHashtag(hashtag, userId, limit, offset);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error getting posts by hashtag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get posts by hashtag'
    });
  }
});

/**
 * Search hashtags
 * GET /api/community/hashtags/search
 */
router.get('/hashtags/search', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;

    const topics = await TrendingTopicsService.searchHashtags(query, limit);

    res.json({
      success: true,
      topics
    });
  } catch (error) {
    logger.error('Error searching hashtags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search hashtags'
    });
  }
});

export default router;
