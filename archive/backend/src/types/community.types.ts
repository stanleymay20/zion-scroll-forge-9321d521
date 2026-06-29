/**
 * Community Feed and Social Features Types
 * "Let us consider how we may spur one another on toward love and good deeds" - Hebrews 10:24
 */

// ============================================================================
// Core Types
// ============================================================================

export interface Post {
  id: string;
  authorId: string;
  content: string;
  type: PostType;
  media: MediaItem[];
  visibility: PostVisibility;
  isPinned: boolean;
  isEdited: boolean;
  editedAt?: Date;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  flagged: boolean;
  moderationStatus: ModerationStatus;
  moderationNotes?: string;
  moderatedAt?: Date;
  moderatedBy?: string;
  isPrayerRequest: boolean;
  scriptureReferences: ScriptureReference[];
  hashtags: string[];
  mentions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum PostType {
  TEXT = 'text',
  QUESTION = 'question',
  ANNOUNCEMENT = 'announcement',
  TESTIMONY = 'testimony',
  PRAYER_REQUEST = 'prayer_request',
  RESOURCE = 'resource',
  POLL = 'poll'
}

export enum PostVisibility {
  PUBLIC = 'public',
  FOLLOWERS = 'followers',
  PRIVATE = 'private',
  COURSE = 'course'
}

export enum ModerationStatus {
  APPROVED = 'approved',
  PENDING = 'pending',
  REJECTED = 'rejected',
  FLAGGED = 'flagged'
}

export interface MediaItem {
  id: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  mimetype: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  uploadedAt: Date;
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document'
}

export interface ScriptureReference {
  reference: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  translation?: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  parentCommentId?: string;
  isEdited: boolean;
  editedAt?: Date;
  likesCount: number;
  flagged: boolean;
  moderationStatus: ModerationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Like {
  id: string;
  userId: string;
  postId?: string;
  commentId?: string;
  createdAt: Date;
}

export interface Share {
  id: string;
  userId: string;
  postId: string;
  shareMessage?: string;
  createdAt: Date;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

export interface PostReport {
  id: string;
  postId: string;
  reporterId: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  actionTaken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ReportReason {
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  FALSE_INFORMATION = 'false_information',
  HATE_SPEECH = 'hate_speech',
  VIOLENCE = 'violence',
  THEOLOGICAL_CONCERN = 'theological_concern',
  OTHER = 'other'
}

export enum ReportStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}

export interface TrendingTopic {
  id: string;
  hashtag: string;
  postCount: number;
  engagementScore: number;
  trendingSince: Date;
  lastUpdated: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  actionUrl?: string;
  createdAt: Date;
}

export enum NotificationType {
  LIKE = 'like',
  COMMENT = 'comment',
  SHARE = 'share',
  FOLLOW = 'follow',
  MENTION = 'mention',
  REPLY = 'reply',
  POST_APPROVED = 'post_approved',
  POST_REJECTED = 'post_rejected',
  PRAYER_ANSWERED = 'prayer_answered',
  SYSTEM = 'system'
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CreatePostRequest {
  content: string;
  type?: PostType;
  media?: Express.Multer.File[];
  visibility?: PostVisibility;
  isPrayerRequest?: boolean;
  scriptureReferences?: ScriptureReference[];
  hashtags?: string[];
  mentions?: string[];
}

export interface CreatePostResponse {
  success: boolean;
  post: PostWithAuthor;
}

export interface UpdatePostRequest {
  postId: string;
  content?: string;
  visibility?: PostVisibility;
  isPinned?: boolean;
}

export interface UpdatePostResponse {
  success: boolean;
  post: PostWithAuthor;
}

export interface DeletePostRequest {
  postId: string;
}

export interface DeletePostResponse {
  success: boolean;
  message: string;
}

export interface GetFeedRequest {
  userId?: string;
  type?: PostType;
  visibility?: PostVisibility;
  hashtag?: string;
  limit?: number;
  offset?: number;
  sortBy?: FeedSortOption;
}

export enum FeedSortOption {
  RECENT = 'recent',
  POPULAR = 'popular',
  TRENDING = 'trending',
  FOLLOWING = 'following'
}

export interface GetFeedResponse {
  success: boolean;
  posts: PostWithAuthor[];
  total: number;
  hasMore: boolean;
}

export interface PostWithAuthor extends Post {
  author: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    role: string;
  };
  isLiked?: boolean;
  isFollowing?: boolean;
}

export interface CreateCommentRequest {
  postId: string;
  content: string;
  parentCommentId?: string;
}

export interface CreateCommentResponse {
  success: boolean;
  comment: CommentWithAuthor;
}

export interface CommentWithAuthor extends Comment {
  author: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  isLiked?: boolean;
  replies?: CommentWithAuthor[];
}

export interface GetCommentsRequest {
  postId: string;
  limit?: number;
  offset?: number;
}

export interface GetCommentsResponse {
  success: boolean;
  comments: CommentWithAuthor[];
  total: number;
}

export interface LikePostRequest {
  postId: string;
}

export interface LikeCommentRequest {
  commentId: string;
}

export interface LikeResponse {
  success: boolean;
  liked: boolean;
  likesCount: number;
}

export interface SharePostRequest {
  postId: string;
  shareMessage?: string;
}

export interface SharePostResponse {
  success: boolean;
  share: Share;
}

export interface FollowUserRequest {
  userId: string;
}

export interface FollowUserResponse {
  success: boolean;
  following: boolean;
}

export interface GetFollowersRequest {
  userId: string;
  limit?: number;
  offset?: number;
}

export interface GetFollowersResponse {
  success: boolean;
  followers: UserProfile[];
  total: number;
}

export interface GetFollowingRequest {
  userId: string;
  limit?: number;
  offset?: number;
}

export interface GetFollowingResponse {
  success: boolean;
  following: UserProfile[];
  total: number;
}

export interface UserProfile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  bio?: string;
  role: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing?: boolean;
}

export interface ReportPostRequest {
  postId: string;
  reason: ReportReason;
  description?: string;
}

export interface ReportPostResponse {
  success: boolean;
  report: PostReport;
}

export interface SearchPostsRequest {
  query: string;
  type?: PostType;
  hashtag?: string;
  authorId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface SearchPostsResponse {
  success: boolean;
  posts: PostWithAuthor[];
  total: number;
}

export interface SearchUsersRequest {
  query: string;
  role?: string;
  limit?: number;
  offset?: number;
}

export interface SearchUsersResponse {
  success: boolean;
  users: UserProfile[];
  total: number;
}

export interface GetTrendingTopicsRequest {
  limit?: number;
  timeRange?: TrendingTimeRange;
}

export enum TrendingTimeRange {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month'
}

export interface GetTrendingTopicsResponse {
  success: boolean;
  topics: TrendingTopic[];
}

export interface GetNotificationsRequest {
  userId: string;
  type?: NotificationType;
  isRead?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetNotificationsResponse {
  success: boolean;
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

export interface MarkNotificationReadRequest {
  notificationId: string;
}

export interface MarkAllNotificationsReadRequest {
  userId: string;
}

export interface NotificationResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// Moderation Types
// ============================================================================

export interface ModerationQueueRequest {
  status?: ModerationStatus;
  type?: PostType;
  limit?: number;
  offset?: number;
}

export interface ModerationQueueResponse {
  success: boolean;
  posts: PostWithAuthor[];
  total: number;
}

export interface ModeratePostRequest {
  postId: string;
  action: ModerationAction;
  notes?: string;
}

export enum ModerationAction {
  APPROVE = 'approve',
  REJECT = 'reject',
  FLAG = 'flag',
  REMOVE = 'remove'
}

export interface ModeratePostResponse {
  success: boolean;
  post: Post;
}

export interface AIContentFlagResult {
  isFlagged: boolean;
  confidence: number;
  reasons: string[];
  categories: ContentCategory[];
  severity: SeverityLevel;
  recommendations: string[];
}

export enum ContentCategory {
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  HATE_SPEECH = 'hate_speech',
  VIOLENCE = 'violence',
  SEXUAL_CONTENT = 'sexual_content',
  MISINFORMATION = 'misinformation',
  THEOLOGICAL_CONCERN = 'theological_concern',
  SAFE = 'safe'
}

export enum SeverityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface CommunityAnalytics {
  totalPosts: number;
  totalComments: number;
  totalLikes: number;
  totalShares: number;
  totalUsers: number;
  activeUsers: number;
  engagementRate: number;
  topContributors: UserProfile[];
  trendingTopics: TrendingTopic[];
  postsByType: Record<PostType, number>;
  moderationStats: {
    pending: number;
    approved: number;
    rejected: number;
    flagged: number;
  };
}

export interface UserEngagementMetrics {
  userId: string;
  postsCreated: number;
  commentsCreated: number;
  likesGiven: number;
  likesReceived: number;
  sharesReceived: number;
  followersCount: number;
  followingCount: number;
  engagementScore: number;
  lastActiveAt: Date;
}

// ============================================================================
// Service Configuration Types
// ============================================================================

export interface CommunityServiceConfig {
  maxPostLength: number;
  maxCommentLength: number;
  maxMediaSize: number;
  maxMediaPerPost: number;
  allowedMediaTypes: string[];
  enableAIModeration: boolean;
  autoApproveThreshold: number;
  trendingTopicThreshold: number;
  notificationBatchSize: number;
}
