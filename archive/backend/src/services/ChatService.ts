/**
 * Chat Service
 * Core business logic for real-time chat and messaging
 * "Let the message of Christ dwell among you richly" - Colossians 3:16
 */

import { PrismaClient } from '@prisma/client';
import {
  ChatRoom,
  ChatMessage,
  ChatMember,
  DirectMessage,
  ChatRoomType,
  MessageType,
  MemberRole,
  CreateRoomRequest,
  JoinRoomRequest,
  SendMessageRequest,
  SendDirectMessageRequest,
  GetMessagesRequest,
  SearchMessagesRequest,
  MessageAttachment
} from '../types/chat.types';
import { chatServiceConfig } from '../config/socket.config';
import ChatFileService from './ChatFileService';
import logger from '../utils/logger';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class ChatService {
  /**
   * Create a new chat room
   */
  async createRoom(userId: string, request: CreateRoomRequest): Promise<{ room: ChatRoom; members: ChatMember[] }> {
    try {
      // Validate room type
      if (!Object.values(ChatRoomType).includes(request.type)) {
        throw new Error('Invalid room type');
      }

      // Create room
      const room = await prisma.chatRoom.create({
        data: {
          name: request.name,
          type: request.type,
          description: request.description,
          courseId: request.courseId,
          createdBy: userId,
          isPrivate: request.isPrivate,
          maxMembers: request.maxMembers || chatServiceConfig.maxRoomMembers
        }
      });

      // Add creator as owner
      const ownerMember = await prisma.chatMember.create({
        data: {
          roomId: room.id,
          userId,
          role: MemberRole.OWNER
        }
      });

      // Add additional members if specified
      const members: ChatMember[] = [ownerMember as any];
      
      if (request.memberIds && request.memberIds.length > 0) {
        for (const memberId of request.memberIds) {
          if (memberId !== userId) {
            const member = await prisma.chatMember.create({
              data: {
                roomId: room.id,
                userId: memberId,
                role: MemberRole.MEMBER
              }
            });
            members.push(member as any);
          }
        }
      }

      logger.info(`Chat room created: ${room.id} by user ${userId}`);

      return { room: room as any, members };
    } catch (error) {
      logger.error('Error creating chat room:', error);
      throw error;
    }
  }

  /**
   * Join a chat room
   */
  async joinRoom(userId: string, request: JoinRoomRequest): Promise<{ room: ChatRoom; member: ChatMember; recentMessages: ChatMessage[] }> {
    try {
      // Get room
      const room = await prisma.chatRoom.findUnique({
        where: { id: request.roomId }
      });

      if (!room) {
        throw new Error('Room not found');
      }

      // Check if already a member
      const existingMember = await prisma.chatMember.findFirst({
        where: {
          roomId: request.roomId,
          userId
        }
      });

      if (existingMember) {
        // Get recent messages
        const recentMessages = await this.getMessages({
          roomId: request.roomId,
          limit: 50
        });

        return {
          room: room as any,
          member: existingMember as any,
          recentMessages: recentMessages.messages
        };
      }

      // Check room capacity
      const memberCount = await prisma.chatMember.count({
        where: { roomId: request.roomId }
      });

      if (room.maxMembers && memberCount >= room.maxMembers) {
        throw new Error('Room is full');
      }

      // Add member
      const member = await prisma.chatMember.create({
        data: {
          roomId: request.roomId,
          userId,
          role: MemberRole.MEMBER
        }
      });

      // Get recent messages
      const recentMessages = await this.getMessages({
        roomId: request.roomId,
        limit: 50
      });

      logger.info(`User ${userId} joined room ${request.roomId}`);

      return {
        room: room as any,
        member: member as any,
        recentMessages: recentMessages.messages
      };
    } catch (error) {
      logger.error('Error joining chat room:', error);
      throw error;
    }
  }

  /**
   * Leave a chat room
   */
  async leaveRoom(userId: string, roomId: string): Promise<void> {
    try {
      await prisma.chatMember.deleteMany({
        where: {
          roomId,
          userId
        }
      });

      logger.info(`User ${userId} left room ${roomId}`);
    } catch (error) {
      logger.error('Error leaving chat room:', error);
      throw error;
    }
  }

  /**
   * Delete a chat room
   */
  async deleteRoom(userId: string, roomId: string): Promise<void> {
    try {
      // Check if user is owner
      const member = await prisma.chatMember.findFirst({
        where: {
          roomId,
          userId,
          role: MemberRole.OWNER
        }
      });

      if (!member) {
        throw new Error('Only room owner can delete the room');
      }

      // Delete all messages
      await prisma.chatMessage.deleteMany({
        where: { roomId }
      });

      // Delete all members
      await prisma.chatMember.deleteMany({
        where: { roomId }
      });

      // Delete room
      await prisma.chatRoom.delete({
        where: { id: roomId }
      });

      logger.info(`Room ${roomId} deleted by user ${userId}`);
    } catch (error) {
      logger.error('Error deleting chat room:', error);
      throw error;
    }
  }

  /**
   * Send a message to a room
   */
  async sendMessage(userId: string, request: SendMessageRequest, files?: Express.Multer.File[]): Promise<ChatMessage> {
    try {
      // Validate message length
      if (request.content.length > chatServiceConfig.maxMessageLength) {
        throw new Error(`Message exceeds maximum length of ${chatServiceConfig.maxMessageLength} characters`);
      }

      // Check if user is member of room
      const member = await prisma.chatMember.findFirst({
        where: {
          roomId: request.roomId,
          userId
        }
      });

      if (!member) {
        throw new Error('User is not a member of this room');
      }

      // Handle file attachments
      let attachments: MessageAttachment[] = [];
      if (files && files.length > 0) {
        const messageId = crypto.randomUUID();
        attachments = await ChatFileService.uploadFiles(files, messageId, userId);
      }

      // Create message
      const message = await prisma.chatMessage.create({
        data: {
          roomId: request.roomId,
          senderId: userId,
          content: request.content,
          type: request.type || MessageType.TEXT,
          attachments: attachments as any,
          replyToId: request.replyToId
        }
      });

      logger.info(`Message sent in room ${request.roomId} by user ${userId}`);

      return message as any;
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get messages from a room
   */
  async getMessages(request: GetMessagesRequest): Promise<{ messages: ChatMessage[]; hasMore: boolean; total: number }> {
    try {
      const limit = request.limit || 50;
      
      const where: any = {
        roomId: request.roomId,
        isDeleted: false
      };

      if (request.before) {
        where.createdAt = { lt: new Date(request.before) };
      }

      if (request.after) {
        where.createdAt = { gt: new Date(request.after) };
      }

      const [messages, total] = await Promise.all([
        prisma.chatMessage.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit + 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }),
        prisma.chatMessage.count({ where })
      ]);

      const hasMore = messages.length > limit;
      const resultMessages = hasMore ? messages.slice(0, limit) : messages;

      return {
        messages: resultMessages as any,
        hasMore,
        total
      };
    } catch (error) {
      logger.error('Error getting messages:', error);
      throw error;
    }
  }

  /**
   * Send a direct message
   */
  async sendDirectMessage(userId: string, request: SendDirectMessageRequest, files?: Express.Multer.File[]): Promise<DirectMessage> {
    try {
      // Handle file attachments
      let attachments: MessageAttachment[] = [];
      if (files && files.length > 0) {
        const messageId = crypto.randomUUID();
        attachments = await ChatFileService.uploadFiles(files, messageId, userId);
      }

      // Create direct message
      const message = await prisma.directMessage.create({
        data: {
          senderId: userId,
          recipientId: request.recipientId,
          content: request.content,
          attachments: attachments as any,
          isEncrypted: request.encrypt || false
        }
      });

      logger.info(`Direct message sent from ${userId} to ${request.recipientId}`);

      return message as any;
    } catch (error) {
      logger.error('Error sending direct message:', error);
      throw error;
    }
  }

  /**
   * Get direct messages between two users
   */
  async getDirectMessages(userId: string, otherUserId: string, limit: number = 50): Promise<DirectMessage[]> {
    try {
      const messages = await prisma.directMessage.findMany({
        where: {
          OR: [
            { senderId: userId, recipientId: otherUserId },
            { senderId: otherUserId, recipientId: userId }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return messages as any;
    } catch (error) {
      logger.error('Error getting direct messages:', error);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(userId: string, messageId: string): Promise<void> {
    try {
      await prisma.directMessage.updateMany({
        where: {
          id: messageId,
          recipientId: userId
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      logger.info(`Message ${messageId} marked as read by user ${userId}`);
    } catch (error) {
      logger.error('Error marking message as read:', error);
      throw error;
    }
  }

  /**
   * Update message
   */
  async updateMessage(userId: string, messageId: string, content: string): Promise<ChatMessage> {
    try {
      // Check if user is the sender
      const message = await prisma.chatMessage.findUnique({
        where: { id: messageId }
      });

      if (!message) {
        throw new Error('Message not found');
      }

      if (message.senderId !== userId) {
        throw new Error('Only message sender can edit the message');
      }

      // Update message
      const updatedMessage = await prisma.chatMessage.update({
        where: { id: messageId },
        data: {
          content,
          isEdited: true
        }
      });

      logger.info(`Message ${messageId} updated by user ${userId}`);

      return updatedMessage as any;
    } catch (error) {
      logger.error('Error updating message:', error);
      throw error;
    }
  }

  /**
   * Delete message
   */
  async deleteMessage(userId: string, messageId: string, deleteForEveryone: boolean = false): Promise<void> {
    try {
      const message = await prisma.chatMessage.findUnique({
        where: { id: messageId }
      });

      if (!message) {
        throw new Error('Message not found');
      }

      if (message.senderId !== userId && !deleteForEveryone) {
        throw new Error('Only message sender can delete the message');
      }

      // Soft delete
      await prisma.chatMessage.update({
        where: { id: messageId },
        data: {
          isDeleted: true,
          content: deleteForEveryone ? '[Message deleted]' : '[Message deleted by sender]'
        }
      });

      logger.info(`Message ${messageId} deleted by user ${userId}`);
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Search messages
   */
  async searchMessages(request: SearchMessagesRequest): Promise<{ messages: ChatMessage[]; total: number }> {
    try {
      const where: any = {
        isDeleted: false,
        content: {
          contains: request.query,
          mode: 'insensitive'
        }
      };

      if (request.roomId) {
        where.roomId = request.roomId;
      }

      if (request.senderId) {
        where.senderId = request.senderId;
      }

      if (request.startDate || request.endDate) {
        where.createdAt = {};
        if (request.startDate) {
          where.createdAt.gte = request.startDate;
        }
        if (request.endDate) {
          where.createdAt.lte = request.endDate;
        }
      }

      const [messages, total] = await Promise.all([
        prisma.chatMessage.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: request.limit || 50,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }),
        prisma.chatMessage.count({ where })
      ]);

      return { messages: messages as any, total };
    } catch (error) {
      logger.error('Error searching messages:', error);
      throw error;
    }
  }

  /**
   * Get user's rooms
   */
  async getUserRooms(userId: string): Promise<ChatRoom[]> {
    try {
      const memberships = await prisma.chatMember.findMany({
        where: { userId },
        include: {
          room: true
        }
      });

      return memberships.map(m => m.room) as any;
    } catch (error) {
      logger.error('Error getting user rooms:', error);
      throw error;
    }
  }

  /**
   * Get room members
   */
  async getRoomMembers(roomId: string): Promise<ChatMember[]> {
    try {
      const members = await prisma.chatMember.findMany({
        where: { roomId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return members as any;
    } catch (error) {
      logger.error('Error getting room members:', error);
      throw error;
    }
  }
}

export default new ChatService();
