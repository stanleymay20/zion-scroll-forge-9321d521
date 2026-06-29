/**
 * Socket.io Service
 * Manages WebSocket connections and real-time events
 * "Be quick to listen, slow to speak" - James 1:19
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { socketConfig } from '../config/socket.config';
import socketRedisAdapter from './SocketRedisAdapter';
import ChatService from './ChatService';
import logger from '../utils/logger';
import jwt from 'jsonwebtoken';
import {
  SocketAuthPayload,
  SocketJoinRoomPayload,
  SocketLeaveRoomPayload,
  SocketSendMessagePayload,
  SocketTypingPayload,
  UserStatus
} from '../types/chat.types';

export class SocketService {
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  /**
   * Initialize Socket.io server
   */
  async initialize(httpServer: HTTPServer): Promise<void> {
    try {
      // Connect Redis adapter
      await socketRedisAdapter.connect();

      // Create Socket.io server
      this.io = new SocketIOServer(httpServer, socketConfig);

      // Attach Redis adapter for scaling
      this.io.adapter(socketRedisAdapter.getAdapter());

      // Setup authentication middleware
      this.io.use(this.authenticationMiddleware.bind(this));

      // Setup connection handler
      this.io.on('connection', this.handleConnection.bind(this));

      logger.info('Socket.io server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Socket.io server:', error);
      throw error;
    }
  }

  /**
   * Authentication middleware
   */
  private async authenticationMiddleware(socket: Socket, next: (err?: Error) => void): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      
      // Attach user info to socket
      socket.data.userId = decoded.userId || decoded.id;
      socket.data.userRole = decoded.role;

      next();
    } catch (error) {
      logger.error('Socket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  }

  /**
   * Handle new connection
   */
  private handleConnection(socket: Socket): void {
    const userId = socket.data.userId;
    
    logger.info(`User ${userId} connected via socket ${socket.id}`);

    // Track connected user
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId)!.add(socket.id);

    // Update online status
    this.updateUserStatus(userId, UserStatus.ONLINE);

    // Setup event handlers
    this.setupEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', () => this.handleDisconnection(socket));
  }

  /**
   * Setup event handlers for socket
   */
  private setupEventHandlers(socket: Socket): void {
    const userId = socket.data.userId;

    // Join room
    socket.on('join_room', async (payload: SocketJoinRoomPayload) => {
      try {
        const result = await ChatService.joinRoom(userId, { roomId: payload.roomId });
        
        // Join socket room
        socket.join(payload.roomId);
        
        // Notify room members
        socket.to(payload.roomId).emit('user_joined', {
          roomId: payload.roomId,
          user: {
            id: userId,
            name: socket.data.userName || 'User'
          }
        });

        // Send confirmation to user
        socket.emit('room_joined', {
          room: result.room,
          member: result.member,
          recentMessages: result.recentMessages
        });

        logger.info(`User ${userId} joined room ${payload.roomId} via socket`);
      } catch (error) {
        logger.error('Error joining room via socket:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Leave room
    socket.on('leave_room', async (payload: SocketLeaveRoomPayload) => {
      try {
        await ChatService.leaveRoom(userId, payload.roomId);
        
        // Leave socket room
        socket.leave(payload.roomId);
        
        // Notify room members
        socket.to(payload.roomId).emit('user_left', {
          roomId: payload.roomId,
          userId
        });

        socket.emit('room_left', { roomId: payload.roomId });

        logger.info(`User ${userId} left room ${payload.roomId} via socket`);
      } catch (error) {
        logger.error('Error leaving room via socket:', error);
        socket.emit('error', { message: 'Failed to leave room' });
      }
    });

    // Send message
    socket.on('send_message', async (payload: SocketSendMessagePayload) => {
      try {
        const message = await ChatService.sendMessage(userId, {
          roomId: payload.roomId,
          content: payload.content,
          type: payload.type,
          replyToId: payload.replyToId
        });

        // Broadcast message to room
        this.io!.to(payload.roomId).emit('message_received', {
          message,
          sender: {
            id: userId,
            name: socket.data.userName || 'User'
          }
        });

        // Increment unread counts for other members
        await this.incrementUnreadCounts(payload.roomId, userId);

        logger.info(`Message sent in room ${payload.roomId} by user ${userId}`);
      } catch (error) {
        logger.error('Error sending message via socket:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', async (payload: SocketTypingPayload) => {
      try {
        if (payload.isTyping) {
          await socketRedisAdapter.setTypingIndicator(
            payload.roomId,
            userId,
            socket.data.userName || 'User'
          );
        }

        // Broadcast typing indicator to room (except sender)
        socket.to(payload.roomId).emit('typing_indicator', {
          roomId: payload.roomId,
          user: {
            id: userId,
            name: socket.data.userName || 'User'
          },
          isTyping: payload.isTyping
        });
      } catch (error) {
        logger.error('Error handling typing indicator:', error);
      }
    });

    // Mark as read
    socket.on('mark_as_read', async (payload: { roomId?: string; messageId?: string }) => {
      try {
        if (payload.messageId) {
          await ChatService.markAsRead(userId, payload.messageId);
        }

        if (payload.roomId) {
          await socketRedisAdapter.resetUnreadCount(userId, payload.roomId);
        }

        // Broadcast read receipt
        if (payload.messageId) {
          socket.to(payload.roomId || '').emit('read_receipt', {
            messageId: payload.messageId,
            userId,
            readAt: new Date()
          });
        }
      } catch (error) {
        logger.error('Error marking as read:', error);
      }
    });

    // Update status
    socket.on('update_status', async (payload: { status: UserStatus }) => {
      try {
        await this.updateUserStatus(userId, payload.status);
        
        // Broadcast status update
        socket.broadcast.emit('status_updated', {
          userId,
          status: payload.status,
          lastSeen: new Date()
        });
      } catch (error) {
        logger.error('Error updating status:', error);
      }
    });
  }

  /**
   * Handle disconnection
   */
  private async handleDisconnection(socket: Socket): Promise<void> {
    const userId = socket.data.userId;
    
    logger.info(`User ${userId} disconnected from socket ${socket.id}`);

    // Remove socket from connected users
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      
      // If user has no more connections, update status to offline
      if (userSockets.size === 0) {
        this.connectedUsers.delete(userId);
        await this.updateUserStatus(userId, UserStatus.OFFLINE);
      }
    }
  }

  /**
   * Update user online status
   */
  private async updateUserStatus(userId: string, status: UserStatus): Promise<void> {
    try {
      await socketRedisAdapter.setOnlineStatus(userId, status);
      
      // Broadcast status update
      this.io?.emit('status_updated', {
        userId,
        status,
        lastSeen: new Date()
      });
    } catch (error) {
      logger.error('Error updating user status:', error);
    }
  }

  /**
   * Increment unread counts for room members
   */
  private async incrementUnreadCounts(roomId: string, senderId: string): Promise<void> {
    try {
      const members = await ChatService.getRoomMembers(roomId);
      
      for (const member of members) {
        if (member.userId !== senderId) {
          await socketRedisAdapter.incrementUnreadCount(member.userId, roomId);
        }
      }
    } catch (error) {
      logger.error('Error incrementing unread counts:', error);
    }
  }

  /**
   * Send notification to specific user
   */
  async sendToUser(userId: string, event: string, data: any): Promise<void> {
    try {
      const userSockets = this.connectedUsers.get(userId);
      if (userSockets) {
        for (const socketId of userSockets) {
          this.io?.to(socketId).emit(event, data);
        }
      }
    } catch (error) {
      logger.error('Error sending to user:', error);
    }
  }

  /**
   * Send notification to room
   */
  async sendToRoom(roomId: string, event: string, data: any): Promise<void> {
    try {
      this.io?.to(roomId).emit(event, data);
    } catch (error) {
      logger.error('Error sending to room:', error);
    }
  }

  /**
   * Broadcast to all connected clients
   */
  async broadcast(event: string, data: any): Promise<void> {
    try {
      this.io?.emit(event, data);
    } catch (error) {
      logger.error('Error broadcasting:', error);
    }
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Shutdown Socket.io server
   */
  async shutdown(): Promise<void> {
    try {
      if (this.io) {
        this.io.close();
        this.io = null;
      }
      
      await socketRedisAdapter.disconnect();
      
      this.connectedUsers.clear();
      
      logger.info('Socket.io server shut down successfully');
    } catch (error) {
      logger.error('Error shutting down Socket.io server:', error);
      throw error;
    }
  }
}

export default new SocketService();
