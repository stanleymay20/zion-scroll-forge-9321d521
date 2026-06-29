/**
 * Socket.io Redis Adapter Service
 * Enables horizontal scaling of WebSocket connections across multiple servers
 * "As iron sharpens iron, so one person sharpens another" - Proverbs 27:17
 */

import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, RedisClientType } from 'redis';
import logger from '../utils/logger';

export class SocketRedisAdapter {
  private pubClient: RedisClientType;
  private subClient: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    // Create publisher client
    this.pubClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    });

    // Create subscriber client (must be separate for pub/sub)
    this.subClient = this.pubClient.duplicate();

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.pubClient.on('error', (err) => {
      logger.error('Socket.io Redis Publisher Error:', err);
    });

    this.pubClient.on('connect', () => {
      logger.info('Socket.io Redis Publisher connected');
    });

    this.subClient.on('error', (err) => {
      logger.error('Socket.io Redis Subscriber Error:', err);
    });

    this.subClient.on('connect', () => {
      logger.info('Socket.io Redis Subscriber connected');
      this.isConnected = true;
    });

    this.subClient.on('disconnect', () => {
      logger.warn('Socket.io Redis Subscriber disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    try {
      await Promise.all([
        this.pubClient.connect(),
        this.subClient.connect()
      ]);
      logger.info('Socket.io Redis Adapter connected successfully');
    } catch (error) {
      logger.error('Failed to connect Socket.io Redis Adapter:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await Promise.all([
        this.pubClient.quit(),
        this.subClient.quit()
      ]);
      this.isConnected = false;
      logger.info('Socket.io Redis Adapter disconnected');
    } catch (error) {
      logger.error('Error disconnecting Socket.io Redis Adapter:', error);
      throw error;
    }
  }

  getAdapter(): any {
    if (!this.isConnected) {
      throw new Error('Redis adapter not connected. Call connect() first.');
    }
    return createAdapter(this.pubClient, this.subClient);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.pubClient.ping();
      await this.subClient.ping();
      return true;
    } catch (error) {
      logger.error('Socket.io Redis Adapter health check failed:', error);
      return false;
    }
  }

  // Cache typing indicators
  async setTypingIndicator(roomId: string, userId: string, userName: string): Promise<void> {
    const key = `chat:typing:${roomId}:${userId}`;
    await this.pubClient.setEx(key, 5, JSON.stringify({ userId, userName, timestamp: new Date() }));
  }

  async getTypingIndicators(roomId: string): Promise<any[]> {
    const pattern = `chat:typing:${roomId}:*`;
    const keys = await this.pubClient.keys(pattern);
    
    if (keys.length === 0) return [];

    const values = await Promise.all(
      keys.map(key => this.pubClient.get(key))
    );

    return values
      .filter(v => v !== null)
      .map(v => JSON.parse(v as string));
  }

  // Cache online status
  async setOnlineStatus(userId: string, status: string): Promise<void> {
    const key = `chat:online:${userId}`;
    await this.pubClient.setEx(key, 300, JSON.stringify({ status, lastSeen: new Date() }));
  }

  async getOnlineStatus(userId: string): Promise<any | null> {
    const key = `chat:online:${userId}`;
    const value = await this.pubClient.get(key);
    return value ? JSON.parse(value) : null;
  }

  // Cache room members for quick access
  async cacheRoomMembers(roomId: string, memberIds: string[]): Promise<void> {
    const key = `chat:room:${roomId}:members`;
    await this.pubClient.setEx(key, 3600, JSON.stringify(memberIds));
  }

  async getRoomMembers(roomId: string): Promise<string[] | null> {
    const key = `chat:room:${roomId}:members`;
    const value = await this.pubClient.get(key);
    return value ? JSON.parse(value) : null;
  }

  // Cache unread message counts
  async incrementUnreadCount(userId: string, roomId: string): Promise<number> {
    const key = `chat:unread:${userId}:${roomId}`;
    return await this.pubClient.incr(key);
  }

  async resetUnreadCount(userId: string, roomId: string): Promise<void> {
    const key = `chat:unread:${userId}:${roomId}`;
    await this.pubClient.del(key);
  }

  async getUnreadCount(userId: string, roomId: string): Promise<number> {
    const key = `chat:unread:${userId}:${roomId}`;
    const value = await this.pubClient.get(key);
    return value ? parseInt(value) : 0;
  }
}

export default new SocketRedisAdapter();
