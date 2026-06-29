/**
 * Chat API Routes
 * REST endpoints for chat and messaging functionality
 * "Let your speech always be gracious, seasoned with salt" - Colossians 4:6
 */

import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import ChatService from '../services/ChatService';
import SocketService from '../services/SocketService';
import {
  CreateRoomRequest,
  JoinRoomRequest,
  SendMessageRequest,
  SendDirectMessageRequest,
  GetMessagesRequest,
  SearchMessagesRequest,
  UpdateMessageRequest,
  DeleteMessageRequest,
  AddReactionRequest,
  UpdateRoomRequest,
  AddMemberRequest,
  RemoveMemberRequest,
  MarkAsReadRequest
} from '../types/chat.types';
import logger from '../utils/logger';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// ============================================================================
// Room Management Routes
// ============================================================================

/**
 * Create a new chat room
 * POST /api/chat/rooms
 */
router.post('/rooms', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const request: CreateRoomRequest = req.body;

    const result = await ChatService.createRoom(userId, request);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error creating room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create room'
    });
  }
});

/**
 * Get user's rooms
 * GET /api/chat/rooms
 */
router.get('/rooms', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const rooms = await ChatService.getUserRooms(userId);

    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    logger.error('Error getting rooms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rooms'
    });
  }
});

/**
 * Join a room
 * POST /api/chat/rooms/:roomId/join
 */
router.post('/rooms/:roomId/join', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { roomId } = req.params;

    const result = await ChatService.joinRoom(userId, { roomId });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error joining room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join room'
    });
  }
});

/**
 * Leave a room
 * POST /api/chat/rooms/:roomId/leave
 */
router.post('/rooms/:roomId/leave', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { roomId } = req.params;

    await ChatService.leaveRoom(userId, roomId);

    res.json({
      success: true,
      message: 'Left room successfully'
    });
  } catch (error) {
    logger.error('Error leaving room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to leave room'
    });
  }
});

/**
 * Delete a room
 * DELETE /api/chat/rooms/:roomId
 */
router.delete('/rooms/:roomId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { roomId } = req.params;

    await ChatService.deleteRoom(userId, roomId);

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete room'
    });
  }
});

/**
 * Get room members
 * GET /api/chat/rooms/:roomId/members
 */
router.get('/rooms/:roomId/members', authenticate, async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    const members = await ChatService.getRoomMembers(roomId);

    res.json({
      success: true,
      data: members
    });
  } catch (error) {
    logger.error('Error getting room members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get room members'
    });
  }
});

// ============================================================================
// Message Routes
// ============================================================================

/**
 * Send a message
 * POST /api/chat/messages
 */
router.post('/messages', authenticate, upload.array('attachments', 5), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const request: SendMessageRequest = req.body;
    const files = req.files as Express.Multer.File[];

    const message = await ChatService.sendMessage(userId, request, files);

    // Broadcast via WebSocket
    await SocketService.sendToRoom(request.roomId, 'message_received', {
      message,
      sender: {
        id: userId,
        name: req.user!.name
      }
    });

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

/**
 * Get messages from a room
 * GET /api/chat/rooms/:roomId/messages
 */
router.get('/rooms/:roomId/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { limit, before, after } = req.query;

    const request: GetMessagesRequest = {
      roomId,
      limit: limit ? parseInt(limit as string) : undefined,
      before: before as string,
      after: after as string
    };

    const result = await ChatService.getMessages(request);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages'
    });
  }
});

/**
 * Update a message
 * PUT /api/chat/messages/:messageId
 */
router.put('/messages/:messageId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await ChatService.updateMessage(userId, messageId, content);

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    logger.error('Error updating message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update message'
    });
  }
});

/**
 * Delete a message
 * DELETE /api/chat/messages/:messageId
 */
router.delete('/messages/:messageId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { messageId } = req.params;
    const { deleteForEveryone } = req.query;

    await ChatService.deleteMessage(userId, messageId, deleteForEveryone === 'true');

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message'
    });
  }
});

/**
 * Search messages
 * GET /api/chat/messages/search
 */
router.get('/messages/search', authenticate, async (req: Request, res: Response) => {
  try {
    const { query, roomId, senderId, startDate, endDate, limit } = req.query;

    const request: SearchMessagesRequest = {
      query: query as string,
      roomId: roomId as string,
      senderId: senderId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    };

    const result = await ChatService.searchMessages(request);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error searching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search messages'
    });
  }
});

// ============================================================================
// Direct Message Routes
// ============================================================================

/**
 * Send a direct message
 * POST /api/chat/direct-messages
 */
router.post('/direct-messages', authenticate, upload.array('attachments', 5), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const request: SendDirectMessageRequest = req.body;
    const files = req.files as Express.Multer.File[];

    const message = await ChatService.sendDirectMessage(userId, request, files);

    // Notify recipient via WebSocket
    await SocketService.sendToUser(request.recipientId, 'direct_message_received', {
      message,
      sender: {
        id: userId,
        name: req.user!.name
      }
    });

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    logger.error('Error sending direct message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send direct message'
    });
  }
});

/**
 * Get direct messages with a user
 * GET /api/chat/direct-messages/:userId
 */
router.get('/direct-messages/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user!.id;
    const { userId } = req.params;
    const { limit } = req.query;

    const messages = await ChatService.getDirectMessages(
      currentUserId,
      userId,
      limit ? parseInt(limit as string) : undefined
    );

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    logger.error('Error getting direct messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get direct messages'
    });
  }
});

/**
 * Mark message as read
 * POST /api/chat/messages/:messageId/read
 */
router.post('/messages/:messageId/read', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { messageId } = req.params;

    await ChatService.markAsRead(userId, messageId);

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    logger.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark message as read'
    });
  }
});

// ============================================================================
// Status Routes
// ============================================================================

/**
 * Get online users count
 * GET /api/chat/status/online-count
 */
router.get('/status/online-count', authenticate, async (req: Request, res: Response) => {
  try {
    const count = SocketService.getConnectedUsersCount();

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    logger.error('Error getting online count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get online count'
    });
  }
});

/**
 * Check if user is online
 * GET /api/chat/status/:userId
 */
router.get('/status/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const isOnline = SocketService.isUserOnline(userId);

    res.json({
      success: true,
      data: { userId, isOnline }
    });
  } catch (error) {
    logger.error('Error checking user status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check user status'
    });
  }
});

export default router;
