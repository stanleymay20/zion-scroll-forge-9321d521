/**
 * Real-time Chat and Messaging System Types
 * "Let your conversation be always full of grace" - Colossians 4:6
 */

export interface ChatRoom {
  id: string;
  name: string;
  type: ChatRoomType;
  description?: string;
  courseId?: string;
  createdBy: string;
  isPrivate: boolean;
  maxMembers?: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum ChatRoomType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  COURSE = 'COURSE',
  STUDY_GROUP = 'STUDY_GROUP',
  DIRECT_MESSAGE = 'DIRECT_MESSAGE'
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  type: MessageType;
  attachments: MessageAttachment[];
  replyToId?: string;
  isEdited: boolean;
  isDeleted: boolean;
  reactions: MessageReaction[];
  createdAt: Date;
  updatedAt: Date;
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  SYSTEM = 'SYSTEM'
}

export interface MessageAttachment {
  id: string;
  filename: string;
  url: string;
  mimetype: string;
  size: number;
  scanStatus: ScanStatus;
  uploadedAt: Date;
}

export enum ScanStatus {
  PENDING = 'PENDING',
  CLEAN = 'CLEAN',
  INFECTED = 'INFECTED',
  ERROR = 'ERROR'
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  createdAt: Date;
}

export interface ChatMember {
  id: string;
  roomId: string;
  userId: string;
  role: MemberRole;
  joinedAt: Date;
  lastReadAt?: Date;
  isMuted: boolean;
  isBlocked: boolean;
}

export enum MemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  MEMBER = 'MEMBER'
}

export interface DirectMessage {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  attachments: MessageAttachment[];
  isEncrypted: boolean;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TypingIndicator {
  roomId: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface ReadReceipt {
  messageId: string;
  userId: string;
  readAt: Date;
}

export interface OnlineStatus {
  userId: string;
  status: UserStatus;
  lastSeen: Date;
}

export enum UserStatus {
  ONLINE = 'ONLINE',
  AWAY = 'AWAY',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE'
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CreateRoomRequest {
  name: string;
  type: ChatRoomType;
  description?: string;
  courseId?: string;
  isPrivate: boolean;
  maxMembers?: number;
  memberIds?: string[];
}

export interface CreateRoomResponse {
  room: ChatRoom;
  members: ChatMember[];
}

export interface JoinRoomRequest {
  roomId: string;
  password?: string;
}

export interface JoinRoomResponse {
  room: ChatRoom;
  member: ChatMember;
  recentMessages: ChatMessage[];
}

export interface SendMessageRequest {
  roomId: string;
  content: string;
  type?: MessageType;
  attachments?: Express.Multer.File[];
  replyToId?: string;
}

export interface SendMessageResponse {
  message: ChatMessage;
  room: ChatRoom;
}

export interface SendDirectMessageRequest {
  recipientId: string;
  content: string;
  attachments?: Express.Multer.File[];
  encrypt?: boolean;
}

export interface SendDirectMessageResponse {
  message: DirectMessage;
}

export interface GetMessagesRequest {
  roomId: string;
  limit?: number;
  before?: string;
  after?: string;
}

export interface GetMessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  total: number;
}

export interface UpdateMessageRequest {
  messageId: string;
  content: string;
}

export interface DeleteMessageRequest {
  messageId: string;
  deleteForEveryone?: boolean;
}

export interface AddReactionRequest {
  messageId: string;
  emoji: string;
}

export interface RemoveReactionRequest {
  messageId: string;
  emoji: string;
}

export interface UpdateRoomRequest {
  roomId: string;
  name?: string;
  description?: string;
  isPrivate?: boolean;
  maxMembers?: number;
}

export interface AddMemberRequest {
  roomId: string;
  userId: string;
  role?: MemberRole;
}

export interface RemoveMemberRequest {
  roomId: string;
  userId: string;
}

export interface UpdateMemberRoleRequest {
  roomId: string;
  userId: string;
  role: MemberRole;
}

export interface MarkAsReadRequest {
  roomId?: string;
  messageId?: string;
}

export interface SearchMessagesRequest {
  query: string;
  roomId?: string;
  senderId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface SearchMessagesResponse {
  messages: ChatMessage[];
  total: number;
}

// ============================================================================
// WebSocket Event Types
// ============================================================================

export interface SocketAuthPayload {
  token: string;
}

export interface SocketJoinRoomPayload {
  roomId: string;
}

export interface SocketLeaveRoomPayload {
  roomId: string;
}

export interface SocketSendMessagePayload {
  roomId: string;
  content: string;
  type?: MessageType;
  replyToId?: string;
}

export interface SocketTypingPayload {
  roomId: string;
  isTyping: boolean;
}

export interface SocketMessageReceivedPayload {
  message: ChatMessage;
  sender: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

export interface SocketUserJoinedPayload {
  roomId: string;
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

export interface SocketUserLeftPayload {
  roomId: string;
  userId: string;
}

export interface SocketTypingIndicatorPayload {
  roomId: string;
  user: {
    id: string;
    name: string;
  };
  isTyping: boolean;
}

export interface SocketReadReceiptPayload {
  messageId: string;
  userId: string;
  readAt: Date;
}

export interface SocketOnlineStatusPayload {
  userId: string;
  status: UserStatus;
  lastSeen: Date;
}

// ============================================================================
// Service Configuration Types
// ============================================================================

export interface ChatServiceConfig {
  maxMessageLength: number;
  maxAttachmentSize: number;
  allowedFileTypes: string[];
  messageRetentionDays: number;
  typingIndicatorTimeout: number;
  onlineStatusTimeout: number;
  maxRoomMembers: number;
  enableEncryption: boolean;
  enableVirusScanning: boolean;
}

export interface SocketConfig {
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  pingTimeout: number;
  pingInterval: number;
  maxHttpBufferSize: number;
  transports: string[];
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface ChatAnalytics {
  roomId: string;
  totalMessages: number;
  totalMembers: number;
  activeMembers: number;
  averageResponseTime: number;
  peakActivityHours: number[];
  topContributors: {
    userId: string;
    messageCount: number;
  }[];
  messagesByType: {
    [key in MessageType]: number;
  };
}

export interface UserChatAnalytics {
  userId: string;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  activeRooms: number;
  averageResponseTime: number;
  mostActiveRooms: {
    roomId: string;
    roomName: string;
    messageCount: number;
  }[];
}
