/**
 * Socket.io Configuration for Real-time Chat
 * "Where two or three gather in my name, there am I with them" - Matthew 18:20
 */

import { SocketConfig } from '../types/chat.types';

export const socketConfig: SocketConfig = {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
  },
  pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT || '60000'),
  pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL || '25000'),
  maxHttpBufferSize: parseInt(process.env.SOCKET_MAX_BUFFER_SIZE || '1048576'), // 1MB
  transports: ['websocket', 'polling']
};

export const chatServiceConfig = {
  maxMessageLength: parseInt(process.env.CHAT_MAX_MESSAGE_LENGTH || '5000'),
  maxAttachmentSize: parseInt(process.env.CHAT_MAX_ATTACHMENT_SIZE || '10485760'), // 10MB
  allowedFileTypes: (process.env.CHAT_ALLOWED_FILE_TYPES || 'image/*,application/pdf,text/*,video/*,audio/*').split(','),
  messageRetentionDays: parseInt(process.env.CHAT_MESSAGE_RETENTION_DAYS || '365'),
  typingIndicatorTimeout: parseInt(process.env.CHAT_TYPING_TIMEOUT || '3000'),
  onlineStatusTimeout: parseInt(process.env.CHAT_ONLINE_STATUS_TIMEOUT || '300000'), // 5 minutes
  maxRoomMembers: parseInt(process.env.CHAT_MAX_ROOM_MEMBERS || '500'),
  enableEncryption: process.env.CHAT_ENABLE_ENCRYPTION !== 'false',
  enableVirusScanning: process.env.CHAT_ENABLE_VIRUS_SCANNING !== 'false'
};

export default { socketConfig, chatServiceConfig };
