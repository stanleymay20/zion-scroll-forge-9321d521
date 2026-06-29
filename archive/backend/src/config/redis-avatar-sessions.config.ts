/**
 * Redis Configuration for Avatar Sessions
 * Manages real-time session state and caching for AI avatar interactions
 */

import Redis from 'ioredis';

export interface AvatarSessionRedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  keepAlive: number;
  family: number;
  connectTimeout: number;
  commandTimeout: number;
}

export class AvatarSessionRedisManager {
  private redis: Redis;
  private subscriber: Redis;
  private publisher: Redis;

  constructor(private config: AvatarSessionRedisConfig) {
    this.initializeConnections();
  }

  private initializeConnections(): void {
    const redisOptions = {
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
      keyPrefix: this.config.keyPrefix,
      retryDelayOnFailover: this.config.retryDelayOnFailover,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      lazyConnect: this.config.lazyConnect,
      keepAlive: this.config.keepAlive,
      family: this.config.family,
      connectTimeout: this.config.connectTimeout,
      commandTimeout: this.config.commandTimeout
    };

    // Main Redis connection for general operations
    this.redis = new Redis(redisOptions);

    // Dedicated subscriber connection for real-time updates
    this.subscriber = new Redis({
      ...redisOptions,
      keyPrefix: '' // No prefix for pub/sub
    });

    // Dedicated publisher connection for real-time updates
    this.publisher = new Redis({
      ...redisOptions,
      keyPrefix: '' // No prefix for pub/sub
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('Avatar Sessions Redis connected');
    });

    this.redis.on('error', (error) => {
      console.error('Avatar Sessions Redis error:', error);
    });

    this.subscriber.on('connect', () => {
      console.log('Avatar Sessions Redis subscriber connected');
    });

    this.publisher.on('connect', () => {
      console.log('Avatar Sessions Redis publisher connected');
    });
  }

  // Session Management
  async createSession(sessionId: string, sessionData: any, ttl: number = 3600): Promise<void> {
    const key = `session:${sessionId}`;
    await this.redis.setex(key, ttl, JSON.stringify(sessionData));
  }

  async getSession(sessionId: string): Promise<any | null> {
    const key = `session:${sessionId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async updateSession(sessionId: string, updates: any, ttl: number = 3600): Promise<void> {
    const key = `session:${sessionId}`;
    const existingData = await this.getSession(sessionId);
    if (existingData) {
      const updatedData = { ...existingData, ...updates, updatedAt: new Date().toISOString() };
      await this.redis.setex(key, ttl, JSON.stringify(updatedData));
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.redis.del(key);
  }

  async extendSessionTTL(sessionId: string, ttl: number = 3600): Promise<void> {
    const key = `session:${sessionId}`;
    await this.redis.expire(key, ttl);
  }

  // Participant Management
  async addParticipant(sessionId: string, userId: string, participantData: any): Promise<void> {
    const key = `session:${sessionId}:participants`;
    await this.redis.hset(key, userId, JSON.stringify(participantData));
    await this.redis.expire(key, 3600); // 1 hour TTL
  }

  async removeParticipant(sessionId: string, userId: string): Promise<void> {
    const key = `session:${sessionId}:participants`;
    await this.redis.hdel(key, userId);
  }

  async getParticipants(sessionId: string): Promise<Record<string, any>> {
    const key = `session:${sessionId}:participants`;
    const participants = await this.redis.hgetall(key);
    const result: Record<string, any> = {};
    
    for (const [userId, data] of Object.entries(participants)) {
      result[userId] = JSON.parse(data);
    }
    
    return result;
  }

  async getParticipantCount(sessionId: string): Promise<number> {
    const key = `session:${sessionId}:participants`;
    return await this.redis.hlen(key);
  }

  // Q&A Queue Management
  async addQuestionToQueue(sessionId: string, questionId: string, questionData: any): Promise<void> {
    const key = `session:${sessionId}:qa_queue`;
    const score = questionData.priority === 'urgent' ? 4 : 
                  questionData.priority === 'high' ? 3 :
                  questionData.priority === 'medium' ? 2 : 1;
    
    await this.redis.zadd(key, score, JSON.stringify({ id: questionId, ...questionData }));
    await this.redis.expire(key, 3600);
  }

  async getQAQueue(sessionId: string): Promise<any[]> {
    const key = `session:${sessionId}:qa_queue`;
    const questions = await this.redis.zrevrange(key, 0, -1);
    return questions.map(q => JSON.parse(q));
  }

  async removeQuestionFromQueue(sessionId: string, questionId: string): Promise<void> {
    const key = `session:${sessionId}:qa_queue`;
    const questions = await this.redis.zrange(key, 0, -1);
    
    for (const questionStr of questions) {
      const question = JSON.parse(questionStr);
      if (question.id === questionId) {
        await this.redis.zrem(key, questionStr);
        break;
      }
    }
  }

  async getQueuePosition(sessionId: string, questionId: string): Promise<number> {
    const key = `session:${sessionId}:qa_queue`;
    const questions = await this.redis.zrevrange(key, 0, -1);
    
    for (let i = 0; i < questions.length; i++) {
      const question = JSON.parse(questions[i]);
      if (question.id === questionId) {
        return i + 1;
      }
    }
    
    return -1; // Not found
  }

  // Chat History Management
  async addChatMessage(sessionId: string, messageData: any): Promise<void> {
    const key = `session:${sessionId}:chat`;
    await this.redis.lpush(key, JSON.stringify(messageData));
    await this.redis.ltrim(key, 0, 999); // Keep last 1000 messages
    await this.redis.expire(key, 3600);
  }

  async getChatHistory(sessionId: string, limit: number = 50): Promise<any[]> {
    const key = `session:${sessionId}:chat`;
    const messages = await this.redis.lrange(key, 0, limit - 1);
    return messages.map(m => JSON.parse(m)).reverse(); // Reverse to get chronological order
  }

  // Avatar State Management
  async setAvatarState(avatarId: string, sessionId: string, state: any): Promise<void> {
    const key = `avatar:${avatarId}:session:${sessionId}:state`;
    await this.redis.setex(key, 3600, JSON.stringify(state));
  }

  async getAvatarState(avatarId: string, sessionId: string): Promise<any | null> {
    const key = `avatar:${avatarId}:session:${sessionId}:state`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async updateAvatarState(avatarId: string, sessionId: string, updates: any): Promise<void> {
    const key = `avatar:${avatarId}:session:${sessionId}:state`;
    const existingState = await this.getAvatarState(avatarId, sessionId);
    if (existingState) {
      const updatedState = { ...existingState, ...updates, updatedAt: new Date().toISOString() };
      await this.redis.setex(key, 3600, JSON.stringify(updatedState));
    }
  }

  // Conversation Context Caching
  async cacheConversationContext(userId: string, sessionId: string, context: any, ttl: number = 1800): Promise<void> {
    const key = `context:${userId}:${sessionId}`;
    await this.redis.setex(key, ttl, JSON.stringify(context));
  }

  async getConversationContext(userId: string, sessionId: string): Promise<any | null> {
    const key = `context:${userId}:${sessionId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  // Response Caching
  async cacheResponse(cacheKey: string, response: any, ttl: number = 3600): Promise<void> {
    const key = `response:${cacheKey}`;
    await this.redis.setex(key, ttl, JSON.stringify(response));
  }

  async getCachedResponse(cacheKey: string): Promise<any | null> {
    const key = `response:${cacheKey}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  // Real-time Pub/Sub
  async publishSessionUpdate(sessionId: string, updateType: string, data: any): Promise<void> {
    const channel = `session:${sessionId}:updates`;
    const message = JSON.stringify({
      type: updateType,
      data,
      timestamp: new Date().toISOString()
    });
    await this.publisher.publish(channel, message);
  }

  async subscribeToSessionUpdates(sessionId: string, callback: (message: any) => void): Promise<void> {
    const channel = `session:${sessionId}:updates`;
    await this.subscriber.subscribe(channel);
    
    this.subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          console.error('Error parsing session update message:', error);
        }
      }
    });
  }

  async unsubscribeFromSessionUpdates(sessionId: string): Promise<void> {
    const channel = `session:${sessionId}:updates`;
    await this.subscriber.unsubscribe(channel);
  }

  // Analytics and Metrics
  async incrementMetric(metricName: string, sessionId?: string): Promise<void> {
    const key = sessionId ? `metrics:${sessionId}:${metricName}` : `metrics:global:${metricName}`;
    await this.redis.incr(key);
    await this.redis.expire(key, 86400); // 24 hours TTL
  }

  async getMetric(metricName: string, sessionId?: string): Promise<number> {
    const key = sessionId ? `metrics:${sessionId}:${metricName}` : `metrics:global:${metricName}`;
    const value = await this.redis.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  async setMetric(metricName: string, value: number, sessionId?: string, ttl: number = 86400): Promise<void> {
    const key = sessionId ? `metrics:${sessionId}:${metricName}` : `metrics:global:${metricName}`;
    await this.redis.setex(key, ttl, value.toString());
  }

  // Session Discovery
  async getActiveSessions(): Promise<string[]> {
    const pattern = `${this.config.keyPrefix}session:*`;
    const keys = await this.redis.keys(pattern);
    return keys
      .filter(key => !key.includes(':participants') && !key.includes(':qa_queue') && !key.includes(':chat'))
      .map(key => key.replace(`${this.config.keyPrefix}session:`, ''));
  }

  async getSessionsByAvatar(avatarId: string): Promise<string[]> {
    const activeSessions = await this.getActiveSessions();
    const avatarSessions: string[] = [];
    
    for (const sessionId of activeSessions) {
      const session = await this.getSession(sessionId);
      if (session && session.avatarId === avatarId) {
        avatarSessions.push(sessionId);
      }
    }
    
    return avatarSessions;
  }

  // Cleanup and Maintenance
  async cleanupExpiredSessions(): Promise<number> {
    const activeSessions = await this.getActiveSessions();
    let cleanedCount = 0;
    
    for (const sessionId of activeSessions) {
      const session = await this.getSession(sessionId);
      if (!session) {
        // Session expired, clean up related keys
        await this.deleteSession(sessionId);
        await this.redis.del(`session:${sessionId}:participants`);
        await this.redis.del(`session:${sessionId}:qa_queue`);
        await this.redis.del(`session:${sessionId}:chat`);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  async getConnectionStatus(): Promise<{
    redis: string;
    subscriber: string;
    publisher: string;
  }> {
    return {
      redis: this.redis.status,
      subscriber: this.subscriber.status,
      publisher: this.publisher.status
    };
  }

  async disconnect(): Promise<void> {
    await Promise.all([
      this.redis.disconnect(),
      this.subscriber.disconnect(),
      this.publisher.disconnect()
    ]);
  }
}

// Default configuration factory
export function createAvatarSessionRedisConfig(): AvatarSessionRedisConfig {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_AVATAR_DB || '2', 10),
    keyPrefix: 'avatar_sessions:',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
    connectTimeout: 10000,
    commandTimeout: 5000
  };
}

// Singleton instance
let avatarSessionRedisManager: AvatarSessionRedisManager | null = null;

export function getAvatarSessionRedisManager(): AvatarSessionRedisManager {
  if (!avatarSessionRedisManager) {
    const config = createAvatarSessionRedisConfig();
    avatarSessionRedisManager = new AvatarSessionRedisManager(config);
  }
  return avatarSessionRedisManager;
}

export default AvatarSessionRedisManager;