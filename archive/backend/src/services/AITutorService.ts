/**
 * ScrollUniversity AI Tutor Service
 * "The Spirit of truth will guide you into all truth" - John 16:13
 * 
 * Comprehensive AI Tutor Backend Service with:
 * - GPT-4o+ integration for world-class tutoring
 * - Redis caching for conversation context management
 * - Prompt engineering system for different tutor personalities
 * - Streaming responses for real-time interaction
 * - Conversation history persistence
 * - Analytics tracking (response time, satisfaction, effectiveness)
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/productionLogger';
import { aiConfig } from '../config/ai.config';

const prisma = new PrismaClient();

// Redis client for conversation context caching
let redisClient: RedisClientType | null = null;

// Initialize Redis connection
async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error', { error: err.message });
    });

    await redisClient.connect();
    logger.info('Redis connected for AI Tutor Service');
  }
  return redisClient;
}

interface TutorSession {
  id: string;
  userId: string;
  courseId?: string;
  tutorType: string;
  conversationHistory: Message[];
  metadata: SessionMetadata;
  analytics: SessionAnalytics;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens?: number;
  responseTime?: number;
}

interface SessionMetadata {
  startedAt: Date;
  lastActivityAt: Date;
  messageCount: number;
  topicsDiscussed: string[];
  learningObjectives?: string[];
  facultyContext?: string;
}

interface SessionAnalytics {
  totalResponseTime: number;
  averageResponseTime: number;
  totalTokensUsed: number;
  satisfactionRating?: number;
  effectiveness?: number;
  questionsAnswered: number;
  clarificationsNeeded: number;
}

interface TutorResponse {
  message: string;
  suggestions?: string[];
  resources?: any[];
  needsClarification?: boolean;
  confidence?: number;
  responseTime: number;
  tokensUsed: number;
}

interface StreamChunk {
  delta: string;
  done: boolean;
}

export class AITutorService {
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
  private readonly MODEL = 'gpt-4o';
  private readonly MAX_CONTEXT_MESSAGES = 20;
  private readonly CONTEXT_CACHE_TTL = 3600; // 1 hour
  private readonly SESSION_CACHE_TTL = 7200; // 2 hours

  /**
   * Start a new tutoring session with comprehensive initialization
   */
  async startSession(
    userId: string,
    courseId?: string,
    tutorType: string = 'general',
    learningObjectives?: string[]
  ): Promise<TutorSession> {
    const startTime = Date.now();
    
    try {
      // Initialize session metadata
      const metadata: SessionMetadata = {
        startedAt: new Date(),
        lastActivityAt: new Date(),
        messageCount: 0,
        topicsDiscussed: [],
        learningObjectives,
        facultyContext: courseId ? await this.getFacultyContext(courseId) : undefined
      };

      // Initialize analytics
      const analytics: SessionAnalytics = {
        totalResponseTime: 0,
        averageResponseTime: 0,
        totalTokensUsed: 0,
        questionsAnswered: 0,
        clarificationsNeeded: 0
      };

      // Create session in database
      const session = await prisma.aITutorSession.create({
        data: {
          userId,
          portalCourseId: courseId,
          tutorType,
          conversationHistory: [],
          sessionData: {
            metadata,
            analytics
          },
          status: 'active'
        }
      });

      // Cache session in Redis for fast access
      const redis = await getRedisClient();
      await redis.setEx(
        `tutor:session:${session.sessionId}`,
        this.SESSION_CACHE_TTL,
        JSON.stringify({
          id: session.sessionId,
          userId: session.userId,
          courseId: session.portalCourseId,
          tutorType: session.tutorType,
          conversationHistory: [],
          metadata,
          analytics
        })
      );

      const initTime = Date.now() - startTime;
      logger.info('AI Tutor session started', { 
        sessionId: session.sessionId, 
        userId, 
        tutorType,
        initTime 
      });

      return {
        id: session.sessionId,
        userId: session.userId,
        courseId: session.portalCourseId || undefined,
        tutorType: session.tutorType,
        conversationHistory: [],
        metadata,
        analytics
      };
    } catch (error: any) {
      logger.error('Failed to start tutor session', { 
        error: error?.message, 
        userId,
        tutorType 
      });
      throw new Error('Failed to start tutoring session');
    }
  }

  /**
   * Send message to AI tutor with comprehensive response handling
   */
  async sendMessage(
    sessionId: string,
    userMessage: string
  ): Promise<TutorResponse> {
    const startTime = Date.now();
    
    try {
      // Try to get session from Redis cache first
      const redis = await getRedisClient();
      let cachedSession = await redis.get(`tutor:session:${sessionId}`);
      let session: TutorSession;

      if (cachedSession) {
        session = JSON.parse(cachedSession);
      } else {
        // Fallback to database
        const dbSession = await prisma.aITutorSession.findUnique({
          where: { sessionId }
        });

        if (!dbSession) {
          throw new Error('Session not found');
        }

        session = {
          id: dbSession.sessionId,
          userId: dbSession.userId,
          courseId: dbSession.portalCourseId || undefined,
          tutorType: dbSession.tutorType,
          conversationHistory: (dbSession.conversationHistory as any[]) || [],
          metadata: (dbSession.sessionData as any)?.metadata || {},
          analytics: (dbSession.sessionData as any)?.analytics || {}
        };
      }

      // Check conversation context in Redis
      const contextKey = `tutor:context:${sessionId}`;
      const cachedContext = await redis.get(contextKey);
      
      // Add user message
      const userMsg: Message = {
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      };

      // Build context for AI with caching
      const messages = await this.buildContextWithCache(
        session,
        userMsg,
        cachedContext
      );

      // Call OpenAI API with response time tracking
      const apiStartTime = Date.now();
      const { content: aiResponse, tokensUsed } = await this.callOpenAI(messages);
      const responseTime = Date.now() - apiStartTime;

      // Add assistant response
      const assistantMsg: Message = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        tokens: tokensUsed,
        responseTime
      };

      // Update conversation history
      session.conversationHistory.push(userMsg, assistantMsg);

      // Update metadata
      session.metadata.lastActivityAt = new Date();
      session.metadata.messageCount += 2;
      session.metadata.topicsDiscussed = this.extractTopics(
        session.metadata.topicsDiscussed,
        userMessage,
        aiResponse
      );

      // Update analytics
      session.analytics.totalResponseTime += responseTime;
      session.analytics.averageResponseTime = 
        session.analytics.totalResponseTime / (session.metadata.messageCount / 2);
      session.analytics.totalTokensUsed += tokensUsed;
      session.analytics.questionsAnswered += 1;
      if (this.needsClarification(aiResponse)) {
        session.analytics.clarificationsNeeded += 1;
      }

      // Update database
      await prisma.aITutorSession.update({
        where: { sessionId },
        data: {
          conversationHistory: session.conversationHistory as any,
          sessionData: {
            metadata: session.metadata,
            analytics: session.analytics
          },
          updatedAt: new Date()
        }
      });

      // Update Redis cache
      await redis.setEx(
        `tutor:session:${sessionId}`,
        this.SESSION_CACHE_TTL,
        JSON.stringify(session)
      );

      // Cache conversation context (last N messages)
      const recentContext = session.conversationHistory.slice(-this.MAX_CONTEXT_MESSAGES);
      await redis.setEx(
        contextKey,
        this.CONTEXT_CACHE_TTL,
        JSON.stringify(recentContext)
      );

      const totalTime = Date.now() - startTime;
      logger.info('AI Tutor message processed', { 
        sessionId, 
        responseTime,
        totalTime,
        tokensUsed,
        messageLength: userMessage.length 
      });

      return {
        message: aiResponse,
        suggestions: this.generateSuggestions(aiResponse, session.tutorType),
        resources: await this.findRelevantResources(userMessage, session.courseId),
        needsClarification: this.needsClarification(aiResponse),
        confidence: this.calculateConfidence(aiResponse),
        responseTime,
        tokensUsed
      };
    } catch (error: any) {
      logger.error('Failed to process tutor message', { 
        error: error?.message, 
        sessionId 
      });
      throw new Error('Failed to process message');
    }
  }

  /**
   * Send message with streaming response for real-time interaction
   */
  async sendMessageStream(
    sessionId: string,
    userMessage: string,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Get session from cache or database
      const redis = await getRedisClient();
      let cachedSession = await redis.get(`tutor:session:${sessionId}`);
      let session: TutorSession;

      if (cachedSession) {
        session = JSON.parse(cachedSession);
      } else {
        const dbSession = await prisma.aITutorSession.findUnique({
          where: { sessionId }
        });

        if (!dbSession) {
          throw new Error('Session not found');
        }

        session = {
          id: dbSession.sessionId,
          userId: dbSession.userId,
          courseId: dbSession.portalCourseId || undefined,
          tutorType: dbSession.tutorType,
          conversationHistory: (dbSession.conversationHistory as any[]) || [],
          metadata: (dbSession.sessionData as any)?.metadata || {},
          analytics: (dbSession.sessionData as any)?.analytics || {}
        };
      }

      // Add user message
      const userMsg: Message = {
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      };

      // Build context
      const contextKey = `tutor:context:${sessionId}`;
      const cachedContext = await redis.get(contextKey);
      const messages = await this.buildContextWithCache(
        session,
        userMsg,
        cachedContext
      );

      // Stream response from OpenAI
      let fullResponse = '';
      let tokensUsed = 0;

      await this.callOpenAIStream(messages, (chunk) => {
        fullResponse += chunk.delta;
        onChunk(chunk);
      });

      const responseTime = Date.now() - startTime;

      // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
      tokensUsed = Math.ceil((userMessage.length + fullResponse.length) / 4);

      // Add assistant response
      const assistantMsg: Message = {
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
        tokens: tokensUsed,
        responseTime
      };

      // Update session
      session.conversationHistory.push(userMsg, assistantMsg);
      session.metadata.lastActivityAt = new Date();
      session.metadata.messageCount += 2;
      session.analytics.totalResponseTime += responseTime;
      session.analytics.averageResponseTime = 
        session.analytics.totalResponseTime / (session.metadata.messageCount / 2);
      session.analytics.totalTokensUsed += tokensUsed;
      session.analytics.questionsAnswered += 1;

      // Update database
      await prisma.aITutorSession.update({
        where: { sessionId },
        data: {
          conversationHistory: session.conversationHistory as any,
          sessionData: {
            metadata: session.metadata,
            analytics: session.analytics
          },
          updatedAt: new Date()
        }
      });

      // Update cache
      await redis.setEx(
        `tutor:session:${sessionId}`,
        this.SESSION_CACHE_TTL,
        JSON.stringify(session)
      );

      const recentContext = session.conversationHistory.slice(-this.MAX_CONTEXT_MESSAGES);
      await redis.setEx(
        contextKey,
        this.CONTEXT_CACHE_TTL,
        JSON.stringify(recentContext)
      );

      logger.info('AI Tutor streaming message completed', { 
        sessionId, 
        responseTime,
        tokensUsed 
      });

      // Send final chunk
      onChunk({ delta: '', done: true });
    } catch (error: any) {
      logger.error('Failed to stream tutor message', { 
        error: error?.message, 
        sessionId 
      });
      throw new Error('Failed to stream message');
    }
  }

  /**
   * End tutoring session with comprehensive analytics
   */
  async endSession(
    sessionId: string, 
    satisfactionRating?: number,
    feedback?: string
  ): Promise<SessionAnalytics> {
    try {
      // Get session for final analytics
      const session = await prisma.aITutorSession.findUnique({
        where: { sessionId }
      });

      if (!session) {
        throw new Error('Session not found');
      }

      const analytics = (session.sessionData as any)?.analytics || {};
      
      // Calculate effectiveness score based on multiple factors
      const effectiveness = this.calculateEffectiveness(
        analytics,
        satisfactionRating
      );

      // Update session with final data
      await prisma.aITutorSession.update({
        where: { sessionId },
        data: {
          endedAt: new Date(),
          satisfactionRating,
          status: 'completed',
          sessionData: {
            ...(session.sessionData as any),
            analytics: {
              ...analytics,
              satisfactionRating,
              effectiveness
            },
            feedback
          }
        }
      });

      // Clear Redis cache
      const redis = await getRedisClient();
      await redis.del(`tutor:session:${sessionId}`);
      await redis.del(`tutor:context:${sessionId}`);

      // Log analytics for monitoring
      logger.info('AI Tutor session ended', { 
        sessionId, 
        satisfactionRating,
        effectiveness,
        totalMessages: analytics.questionsAnswered,
        avgResponseTime: analytics.averageResponseTime,
        totalTokens: analytics.totalTokensUsed
      });

      return {
        ...analytics,
        satisfactionRating,
        effectiveness
      };
    } catch (error: any) {
      logger.error('Failed to end tutor session', { 
        error: error?.message, 
        sessionId 
      });
      throw new Error('Failed to end session');
    }
  }

  /**
   * Get session history with analytics
   */
  async getSessionHistory(sessionId: string): Promise<{
    messages: Message[];
    analytics: SessionAnalytics;
    metadata: SessionMetadata;
  }> {
    try {
      // Try Redis cache first
      const redis = await getRedisClient();
      const cached = await redis.get(`tutor:session:${sessionId}`);

      if (cached) {
        const session = JSON.parse(cached);
        return {
          messages: session.conversationHistory,
          analytics: session.analytics,
          metadata: session.metadata
        };
      }

      // Fallback to database
      const session = await prisma.aITutorSession.findUnique({
        where: { sessionId }
      });

      if (!session) {
        throw new Error('Session not found');
      }

      return {
        messages: (session.conversationHistory as any[]) || [],
        analytics: (session.sessionData as any)?.analytics || {},
        metadata: (session.sessionData as any)?.metadata || {}
      };
    } catch (error: any) {
      logger.error('Failed to get session history', { 
        error: error?.message, 
        sessionId 
      });
      throw new Error('Failed to get session history');
    }
  }

  /**
   * Get tutor analytics for a user
   */
  async getUserTutorAnalytics(userId: string): Promise<{
    totalSessions: number;
    totalMessages: number;
    averageSatisfaction: number;
    averageEffectiveness: number;
    totalTokensUsed: number;
    averageResponseTime: number;
    topTopics: string[];
    tutorTypeUsage: Record<string, number>;
  }> {
    try {
      const sessions = await prisma.aITutorSession.findMany({
        where: { userId, status: 'completed' }
      });

      if (sessions.length === 0) {
        return {
          totalSessions: 0,
          totalMessages: 0,
          averageSatisfaction: 0,
          averageEffectiveness: 0,
          totalTokensUsed: 0,
          averageResponseTime: 0,
          topTopics: [],
          tutorTypeUsage: {}
        };
      }

      let totalMessages = 0;
      let totalSatisfaction = 0;
      let totalEffectiveness = 0;
      let totalTokens = 0;
      let totalResponseTime = 0;
      let satisfactionCount = 0;
      const allTopics: string[] = [];
      const tutorTypeUsage: Record<string, number> = {};

      for (const session of sessions) {
        const analytics = (session.sessionData as any)?.analytics || {};
        const metadata = (session.sessionData as any)?.metadata || {};

        totalMessages += analytics.questionsAnswered || 0;
        totalTokens += analytics.totalTokensUsed || 0;
        totalResponseTime += analytics.totalResponseTime || 0;

        if (analytics.satisfactionRating) {
          totalSatisfaction += analytics.satisfactionRating;
          satisfactionCount++;
        }

        if (analytics.effectiveness) {
          totalEffectiveness += analytics.effectiveness;
        }

        if (metadata.topicsDiscussed) {
          allTopics.push(...metadata.topicsDiscussed);
        }

        tutorTypeUsage[session.tutorType] = (tutorTypeUsage[session.tutorType] || 0) + 1;
      }

      // Get top 10 most discussed topics
      const topicCounts = allTopics.reduce((acc, topic) => {
        acc[topic] = (acc[topic] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topTopics = Object.entries(topicCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([topic]) => topic);

      return {
        totalSessions: sessions.length,
        totalMessages,
        averageSatisfaction: satisfactionCount > 0 ? totalSatisfaction / satisfactionCount : 0,
        averageEffectiveness: sessions.length > 0 ? totalEffectiveness / sessions.length : 0,
        totalTokensUsed: totalTokens,
        averageResponseTime: totalMessages > 0 ? totalResponseTime / totalMessages : 0,
        topTopics,
        tutorTypeUsage
      };
    } catch (error: any) {
      logger.error('Failed to get user tutor analytics', { 
        error: error?.message, 
        userId 
      });
      throw new Error('Failed to get analytics');
    }
  }

  /**
   * Continue an existing session
   */
  async continueSession(sessionId: string): Promise<TutorSession> {
    try {
      // Try Redis cache first
      const redis = await getRedisClient();
      const cached = await redis.get(`tutor:session:${sessionId}`);

      if (cached) {
        const session = JSON.parse(cached);
        // Extend cache TTL
        await redis.expire(`tutor:session:${sessionId}`, this.SESSION_CACHE_TTL);
        return session;
      }

      // Fallback to database
      const dbSession = await prisma.aITutorSession.findUnique({
        where: { sessionId }
      });

      if (!dbSession) {
        throw new Error('Session not found');
      }

      if (dbSession.status === 'completed') {
        throw new Error('Session has already ended');
      }

      const session: TutorSession = {
        id: dbSession.sessionId,
        userId: dbSession.userId,
        courseId: dbSession.portalCourseId || undefined,
        tutorType: dbSession.tutorType,
        conversationHistory: (dbSession.conversationHistory as any[]) || [],
        metadata: (dbSession.sessionData as any)?.metadata || {},
        analytics: (dbSession.sessionData as any)?.analytics || {}
      };

      // Cache for future requests
      await redis.setEx(
        `tutor:session:${sessionId}`,
        this.SESSION_CACHE_TTL,
        JSON.stringify(session)
      );

      return session;
    } catch (error: any) {
      logger.error('Failed to continue session', { 
        error: error?.message, 
        sessionId 
      });
      throw new Error('Failed to continue session');
    }
  }

  /**
   * Build context for AI with Redis caching
   */
  private async buildContextWithCache(
    session: TutorSession,
    newMessage: Message,
    cachedContext: string | null
  ): Promise<any[]> {
    const systemPrompt = this.getSystemPrompt(
      session.tutorType, 
      session.courseId,
      session.metadata.learningObjectives
    );

    let recentHistory: Message[];

    if (cachedContext) {
      // Use cached context
      recentHistory = JSON.parse(cachedContext);
    } else {
      // Build from session history
      recentHistory = session.conversationHistory.slice(-this.MAX_CONTEXT_MESSAGES);
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: newMessage.content }
    ];

    return messages;
  }

  /**
   * Get faculty context for course-specific tutoring
   */
  private async getFacultyContext(courseId: string): Promise<string> {
    try {
      const course = await prisma.portalCourse.findUnique({
        where: { portalCourseId: courseId },
        include: { faculty: true }
      });

      if (!course) {
        return '';
      }

      return `Course: ${course.title}
Faculty: ${course.faculty?.name || 'General'}
Level: ${course.level}
Description: ${course.description || ''}`;
    } catch (error) {
      logger.error('Failed to get faculty context', { error, courseId });
      return '';
    }
  }

  /**
   * Get system prompt based on tutor type (WORLD-CLASS STANDARDS)
   * Enhanced with learning objectives and personality engineering
   */
  private getSystemPrompt(
    tutorType: string, 
    courseId?: string,
    learningObjectives?: string[]
  ): string {
    let objectivesSection = '';
    if (learningObjectives && learningObjectives.length > 0) {
      objectivesSection = `\n\nLEARNING OBJECTIVES FOR THIS SESSION:
${learningObjectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

Focus your teaching on helping the student achieve these specific objectives.`;
    }
    const worldClassBase = `You are a ScrollDean - an AI tutor representing the pinnacle of educational excellence, combining:
- The academic rigor of Harvard and MIT
- The depth of scholarship of Oxford and Cambridge  
- The innovation of Stanford
- The theological excellence of Yale Divinity
- Divine wisdom that secular institutions lack

TEACHING PHILOSOPHY:
1. DEPTH OVER BREADTH: Go deep into concepts, never settle for surface-level understanding
2. SOCRATIC METHOD: Ask probing questions that force critical thinking and self-discovery
3. RIGOROUS STANDARDS: Expect excellence, challenge mediocrity, push students beyond comfort zones
4. INTERDISCIPLINARY: Connect concepts across fields - show the unity of all truth
5. SPIRITUAL INTEGRATION: Demonstrate how all truth points to the Creator
6. PRACTICAL APPLICATION: Every concept must be applied to real-world problems
7. ORIGINAL THOUGHT: Encourage students to think for themselves, not just memorize

YOUR KNOWLEDGE BASE:
- Complete academic literature in your field (10,000+ papers)
- Historical context and philosophical foundations
- Latest research and cutting-edge developments
- Biblical and theological perspectives
- Multiple cultural and global viewpoints
- Real-world case studies and applications
- Professional industry standards

TEACHING METHODS:
- Start with foundational questions that reveal assumptions
- Build complexity progressively through guided discovery
- Use Socratic dialogue: "What do you mean by...?" "What evidence supports that?" "What are the implications?"
- Provide multiple perspectives on controversial topics
- Challenge assumptions and encourage intellectual debate
- Give examples from history, science, theology, and current events
- Connect to Scripture and show God's design in creation
- Assign challenging problems that require synthesis
- Provide detailed, constructive feedback that pushes growth
- Celebrate intellectual breakthroughs and "aha moments"

YOUR STANDARDS:
- Never accept shallow or incomplete answers
- Require evidence, reasoning, and proper citations
- Expect clear, precise, professional communication
- Insist on original thinking, not regurgitation
- Maintain absolute academic integrity
- Foster intellectual humility and openness to correction
- Push students to publication-quality work
- Prepare students for graduate school and professional excellence

RESPONSE STRUCTURE:
1. Acknowledge the question and its depth
2. Provide foundational context (historical, theoretical, biblical)
3. Explain core concepts with rigor and precision
4. Give multiple examples from different domains
5. Present alternative viewpoints and debates
6. Ask Socratic questions to deepen understanding
7. Connect to practical application
8. Suggest further reading (actual papers/books)
9. Assign challenging follow-up problems

You are not just teaching information - you are forming world-class minds that will shape nations and advance the Kingdom of God. Every interaction should elevate the student's thinking and push them toward excellence.`;

    const typePrompts: Record<string, string> = {
      general: worldClassBase,
      
      math: `${worldClassBase}

MATHEMATICS SPECIALIZATION:
You are a world-class mathematician combining:
- Rigorous proof-based reasoning
- Intuitive geometric understanding
- Computational proficiency
- Historical development of concepts
- Applications across sciences
- Beauty and elegance of mathematical truth

Teaching approach:
- Always start with "Why?" before "How?"
- Derive formulas from first principles
- Show multiple solution methods
- Connect to real-world applications
- Reveal the beauty and order of God's mathematical design
- Assign proof-writing exercises
- Expect LaTeX-formatted solutions
- Reference actual mathematical papers

Never just give answers - guide students to discover solutions themselves.`,

      science: `${worldClassBase}

SCIENCE SPECIALIZATION:
You are a world-class scientist combining:
- Rigorous experimental methodology
- Deep theoretical understanding
- Historical development of scientific thought
- Philosophical foundations of science
- Integration of faith and science
- Cutting-edge research awareness

Teaching approach:
- Emphasize the scientific method and critical thinking
- Distinguish between observation, inference, and interpretation
- Present multiple theoretical frameworks
- Show how science reveals God's design in creation
- Discuss limitations and uncertainties in scientific knowledge
- Reference actual research papers and data
- Assign experiments and data analysis
- Expect professional-quality lab reports

Science is thinking God's thoughts after Him - show students the wonder of His creation.`,

      theology: `${worldClassBase}

THEOLOGY SPECIALIZATION:
You are a world-class theologian combining:
- Deep biblical scholarship (Hebrew, Greek, Aramaic)
- Systematic theological framework
- Church history and historical theology
- Philosophical theology and apologetics
- Practical application and spiritual formation
- Global and cultural perspectives

Teaching approach:
- Always ground in Scripture (cite chapter and verse)
- Show historical development of doctrines
- Present multiple theological traditions fairly
- Engage with objections and counterarguments
- Connect theology to daily life and ministry
- Reference church fathers, reformers, and modern scholars
- Assign exegetical papers and theological essays
- Expect rigorous biblical interpretation

Theology is the queen of sciences - help students know God more deeply through rigorous study.`,

      programming: `${worldClassBase}

COMPUTER SCIENCE SPECIALIZATION:
You are a world-class computer scientist combining:
- Deep algorithmic and theoretical foundations
- Professional software engineering practices
- System design and architecture expertise
- Latest technologies and frameworks
- Ethical considerations in technology
- Kingdom applications of technology

Teaching approach:
- Emphasize fundamentals: data structures, algorithms, complexity
- Teach professional coding standards and best practices
- Show multiple implementation approaches
- Discuss trade-offs and design decisions
- Connect to real-world systems and applications
- Reference actual codebases and technical papers
- Assign projects that solve real problems
- Expect production-quality, well-documented code
- Review code with professional standards

Technology is a tool for kingdom purposes - teach students to build systems that bless communities.`,

      business: `${worldClassBase}

BUSINESS & ECONOMICS SPECIALIZATION:
You are a world-class business scholar combining:
- Economic theory and market analysis
- Strategic management frameworks
- Financial analysis and modeling
- Entrepreneurship and innovation
- Business ethics and kingdom economics
- Global business perspectives

Teaching approach:
- Ground in economic principles and data
- Analyze real companies and case studies
- Show multiple business models and strategies
- Discuss ethical implications of business decisions
- Connect to kingdom principles of stewardship
- Reference Harvard Business Review cases
- Assign business plans and financial models
- Expect professional-quality deliverables

Business is stewardship of God's resources - teach students to create value that serves others.`,

      engineering: `${worldClassBase}

ENGINEERING SPECIALIZATION:
You are a world-class engineer combining:
- Rigorous mathematical and scientific foundations
- Professional engineering standards and practices
- Design thinking and problem-solving
- Systems thinking and optimization
- Ethical considerations and safety
- Sustainable and appropriate technology

Teaching approach:
- Emphasize first principles and fundamental laws
- Teach professional engineering methodology
- Show real-world constraints and trade-offs
- Discuss failure analysis and lessons learned
- Connect to serving underserved communities
- Reference actual engineering projects and papers
- Assign design projects with real specifications
- Expect professional drawings and documentation

Engineering is applying God's natural laws to serve humanity - teach students to build solutions that bless.`
    };

    const basePrompt = typePrompts[tutorType] || worldClassBase;
    return basePrompt + objectivesSection;
  }

  /**
   * Call OpenAI API with token tracking
   */
  private async callOpenAI(messages: any[]): Promise<{
    content: string;
    tokensUsed: number;
  }> {
    try {
      if (!this.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await axios.post(
        this.OPENAI_API_URL,
        {
          model: this.MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 2000,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 second timeout
        }
      );

      const content = response.data.choices[0].message.content;
      const tokensUsed = response.data.usage?.total_tokens || 0;

      return { content, tokensUsed };
    } catch (error: any) {
      if (error.response) {
        logger.error('OpenAI API call failed', { 
          status: error.response.status,
          error: error.response.data 
        });
      } else {
        logger.error('OpenAI API call failed', { error: error?.message });
      }
      throw new Error('Failed to get AI response');
    }
  }

  /**
   * Call OpenAI API with streaming for real-time responses
   */
  private async callOpenAIStream(
    messages: any[],
    onChunk: (chunk: StreamChunk) => void
  ): Promise<void> {
    try {
      if (!this.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await axios.post(
        this.OPENAI_API_URL,
        {
          model: this.MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 2000,
          stream: true
        },
        {
          headers: {
            'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          responseType: 'stream',
          timeout: 60000
        }
      );

      return new Promise((resolve, reject) => {
        let buffer = '';

        response.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                onChunk({ delta: '', done: true });
                resolve();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices[0]?.delta?.content || '';
                if (delta) {
                  onChunk({ delta, done: false });
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        });

        response.data.on('end', () => {
          resolve();
        });

        response.data.on('error', (error: Error) => {
          logger.error('OpenAI streaming error', { error: error.message });
          reject(new Error('Streaming failed'));
        });
      });
    } catch (error: any) {
      logger.error('OpenAI streaming call failed', { error: error?.message });
      throw new Error('Failed to stream AI response');
    }
  }

  /**
   * Generate intelligent follow-up suggestions based on response and tutor type
   */
  private generateSuggestions(response: string, tutorType: string): string[] {
    const suggestions: string[] = [];

    // Context-aware suggestions based on response content
    if (response.includes('example') || response.includes('instance')) {
      suggestions.push('Can you provide another example?');
    }
    if (response.includes('practice') || response.includes('exercise')) {
      suggestions.push('What practice problems do you recommend?');
    }
    if (response.includes('concept') || response.includes('theory')) {
      suggestions.push('Can you explain this concept in simpler terms?');
    }
    if (response.includes('application') || response.includes('real-world')) {
      suggestions.push('How is this applied in real-world scenarios?');
    }
    if (response.includes('Scripture') || response.includes('biblical')) {
      suggestions.push('What other biblical principles relate to this?');
    }

    // Tutor-type specific suggestions
    switch (tutorType) {
      case 'math':
        suggestions.push('Can you show me the step-by-step solution?');
        suggestions.push('What are common mistakes to avoid?');
        break;
      case 'programming':
        suggestions.push('Can you show me the code implementation?');
        suggestions.push('What are best practices for this?');
        break;
      case 'theology':
        suggestions.push('What do different traditions say about this?');
        suggestions.push('How does this apply to ministry?');
        break;
      case 'science':
        suggestions.push('What experiments demonstrate this?');
        suggestions.push('What are the latest research findings?');
        break;
    }

    // Return top 3-5 unique suggestions
    return [...new Set(suggestions)].slice(0, 5);
  }

  /**
   * Check if AI needs clarification
   */
  private needsClarification(response: string): boolean {
    const clarificationPhrases = [
      'could you clarify',
      'what do you mean',
      'can you be more specific',
      'which part',
      'do you mean',
      'could you elaborate',
      'i need more information',
      'unclear about'
    ];

    return clarificationPhrases.some(phrase => 
      response.toLowerCase().includes(phrase)
    );
  }

  /**
   * Calculate confidence score based on response characteristics
   */
  private calculateConfidence(response: string): number {
    let confidence = 0.8; // Base confidence

    // Increase confidence for detailed responses
    if (response.length > 500) confidence += 0.05;
    if (response.length > 1000) confidence += 0.05;

    // Decrease confidence for uncertainty markers
    const uncertaintyMarkers = ['might', 'maybe', 'possibly', 'perhaps', 'unclear'];
    const uncertaintyCount = uncertaintyMarkers.filter(marker => 
      response.toLowerCase().includes(marker)
    ).length;
    confidence -= uncertaintyCount * 0.05;

    // Increase confidence for citations and examples
    if (response.includes('example') || response.includes('for instance')) {
      confidence += 0.05;
    }
    if (response.includes('research') || response.includes('study')) {
      confidence += 0.05;
    }

    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Extract topics from conversation
   */
  private extractTopics(
    existingTopics: string[],
    userMessage: string,
    aiResponse: string
  ): string[] {
    const combined = `${userMessage} ${aiResponse}`.toLowerCase();
    const newTopics: string[] = [];

    // Simple keyword extraction (in production, use NLP)
    const keywords = [
      'algorithm', 'data structure', 'programming', 'theology', 'scripture',
      'mathematics', 'calculus', 'algebra', 'physics', 'chemistry',
      'biology', 'history', 'philosophy', 'ethics', 'ministry',
      'prayer', 'worship', 'discipleship', 'evangelism', 'leadership'
    ];

    for (const keyword of keywords) {
      if (combined.includes(keyword) && !existingTopics.includes(keyword)) {
        newTopics.push(keyword);
      }
    }

    return [...existingTopics, ...newTopics].slice(-20); // Keep last 20 topics
  }

  /**
   * Find relevant resources based on question and course
   */
  private async findRelevantResources(
    question: string,
    courseId?: string
  ): Promise<any[]> {
    // Placeholder for resource recommendation
    // In production, this would query a knowledge base or course materials
    return [];
  }

  /**
   * Calculate effectiveness score
   */
  private calculateEffectiveness(
    analytics: SessionAnalytics,
    satisfactionRating?: number
  ): number {
    let effectiveness = 0;

    // Factor 1: Satisfaction rating (40% weight)
    if (satisfactionRating) {
      effectiveness += (satisfactionRating / 5) * 0.4;
    }

    // Factor 2: Response time (20% weight) - faster is better, up to a point
    const avgResponseTime = analytics.averageResponseTime || 0;
    if (avgResponseTime > 0) {
      const responseScore = Math.max(0, 1 - (avgResponseTime / 10000)); // 10s baseline
      effectiveness += responseScore * 0.2;
    }

    // Factor 3: Clarification ratio (20% weight) - fewer clarifications is better
    const clarificationRatio = analytics.questionsAnswered > 0
      ? analytics.clarificationsNeeded / analytics.questionsAnswered
      : 0;
    effectiveness += (1 - clarificationRatio) * 0.2;

    // Factor 4: Engagement (20% weight) - more questions is better
    const engagementScore = Math.min(1, analytics.questionsAnswered / 10);
    effectiveness += engagementScore * 0.2;

    return Math.max(0, Math.min(1, effectiveness));
  }
}

export const aiTutorService = new AITutorService();
