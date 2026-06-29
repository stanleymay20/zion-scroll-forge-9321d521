/**
 * ScrollUniversity Video Avatar Service
 * "The Spirit of truth will guide you into all truth" - John 16:13
 * 
 * Comprehensive video avatar service integrating D-ID and Synthesia for:
 * - Real-time video avatar generation
 * - Text-to-speech with natural voice synthesis
 * - Streaming video responses
 * - Video caching for cost optimization
 * - Fallback to text-only mode
 * - Avatar customization
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/productionLogger';
import { videoAvatarConfig, avatarPersonalities } from '../config/video-avatar.config';
import {
  VideoAvatarProvider,
  VideoGenerationRequest,
  VideoGenerationResponse,
  StreamingVideoSession,
  VideoCacheEntry,
  TextToSpeechRequest,
  TextToSpeechResponse,
  AvatarPersonality,
  VideoAvatarAnalytics,
  FallbackConfig,
  ProviderHealth
} from '../types/video-avatar.types';

const prisma = new PrismaClient();

// Redis client for video caching
let redisClient: RedisClientType | null = null;

async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error (Video Avatar)', { error: err.message });
    });

    await redisClient.connect();
    logger.info('Redis connected for Video Avatar Service');
  }
  return redisClient;
}

export class VideoAvatarService {
  private didClient: AxiosInstance;
  private synthesiaClient: AxiosInstance;
  private fallbackMode: FallbackConfig;

  constructor() {
    // Initialize D-ID client
    this.didClient = axios.create({
      baseURL: videoAvatarConfig.did.baseURL,
      timeout: videoAvatarConfig.did.timeout,
      headers: {
        'Authorization': `Basic ${videoAvatarConfig.did.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    // Initialize Synthesia client
    this.synthesiaClient = axios.create({
      baseURL: videoAvatarConfig.synthesia.baseURL,
      timeout: videoAvatarConfig.synthesia.timeout,
      headers: {
        'Authorization': `Bearer ${videoAvatarConfig.synthesia.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    // Initialize fallback configuration
    this.fallbackMode = videoAvatarConfig.fallback;
  }

  /**
   * Generate video with avatar speaking the provided text
   */
  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    const startTime = Date.now();

    try {
      // Check cache first
      if (videoAvatarConfig.cache.enabled) {
        const cached = await this.getCachedVideo(request);
        if (cached) {
          logger.info('Video avatar cache hit', { 
            cacheKey: cached.cacheKey,
            provider: request.provider 
          });
          return {
            videoId: cached.cacheKey,
            status: 'completed',
            videoUrl: cached.videoUrl,
            thumbnailUrl: cached.thumbnailUrl,
            duration: cached.duration,
            provider: request.provider,
            metadata: {
              generatedAt: cached.createdAt,
              textLength: request.text.length,
              estimatedDuration: this.estimateDuration(request.text),
              actualDuration: cached.duration,
              cost: 0, // Cached, no cost
              provider: request.provider,
              cached: true
            }
          };
        }
      }

      // Check if we should use fallback mode
      if (this.shouldUseFallback()) {
        return await this.generateFallbackResponse(request);
      }

      // Generate video based on provider
      let response: VideoGenerationResponse;
      
      try {
        if (request.provider === 'did') {
          response = await this.generateWithDID(request);
        } else if (request.provider === 'synthesia') {
          response = await this.generateWithSynthesia(request);
        } else {
          throw new Error(`Unsupported provider: ${request.provider}`);
        }
      } catch (providerError: any) {
        logger.warn('Primary provider failed, attempting fallback', {
          provider: request.provider,
          error: providerError.message
        });
        
        // Try alternate provider
        const alternateProvider = request.provider === 'did' ? 'synthesia' : 'did';
        request.provider = alternateProvider;
        
        if (alternateProvider === 'did') {
          response = await this.generateWithDID(request);
        } else {
          response = await this.generateWithSynthesia(request);
        }
      }

      // Cache the result
      if (videoAvatarConfig.cache.enabled && response.status === 'completed') {
        await this.cacheVideo(request, response);
      }

      // Track analytics
      await this.trackVideoGeneration(request, response, Date.now() - startTime);

      logger.info('Video avatar generated successfully', {
        videoId: response.videoId,
        provider: response.provider,
        duration: response.duration,
        generationTime: Date.now() - startTime
      });

      return response;
    } catch (error: any) {
      logger.error('Failed to generate video avatar', {
        error: error.message,
        provider: request.provider
      });

      // Final fallback to text-only mode
      if (this.fallbackMode.enabled) {
        return await this.generateFallbackResponse(request);
      }

      throw new Error('Failed to generate video avatar');
    }
  }

  /**
   * Generate video using D-ID API
   */
  private async generateWithDID(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    try {
      // Create talk (video generation)
      const createResponse = await this.didClient.post('/talks', {
        source_url: this.getAvatarImageUrl(request.avatarId),
        script: {
          type: 'text',
          input: request.text,
          provider: {
            type: 'microsoft',
            voice_id: request.voiceId
          }
        },
        config: {
          fluent: true,
          pad_audio: 0,
          stitch: true
        }
      });

      const talkId = createResponse.data.id;

      // Poll for completion
      let status = 'created';
      let videoUrl = '';
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes max

      while (status !== 'done' && attempts < maxAttempts) {
        await this.sleep(2000); // Wait 2 seconds
        
        const statusResponse = await this.didClient.get(`/talks/${talkId}`);
        status = statusResponse.data.status;
        
        if (status === 'done') {
          videoUrl = statusResponse.data.result_url;
          break;
        } else if (status === 'error') {
          throw new Error('D-ID video generation failed');
        }
        
        attempts++;
      }

      if (status !== 'done') {
        throw new Error('D-ID video generation timeout');
      }

      const duration = this.estimateDuration(request.text);
      const cost = duration * videoAvatarConfig.costs.didPerSecond;

      return {
        videoId: talkId,
        status: 'completed',
        videoUrl,
        thumbnailUrl: videoUrl.replace('.mp4', '_thumbnail.jpg'),
        duration,
        provider: 'did',
        metadata: {
          generatedAt: new Date(),
          textLength: request.text.length,
          estimatedDuration: duration,
          actualDuration: duration,
          cost,
          provider: 'did',
          cached: false
        }
      };
    } catch (error: any) {
      logger.error('D-ID video generation failed', {
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Generate video using Synthesia API
   */
  private async generateWithSynthesia(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    try {
      // Create video
      const createResponse = await this.synthesiaClient.post('/v2/videos', {
        test: false,
        input: [{
          avatarSettings: {
            horizontalAlign: 'center',
            scale: 1,
            style: 'rectangular',
            seamless: false
          },
          avatar: request.avatarId,
          backgroundSettings: {
            videoSettings: {
              shortBackgroundContentMatchMode: 'freeze',
              longBackgroundContentMatchMode: 'trim'
            }
          },
          scriptText: request.text,
          voice: request.voiceId
        }],
        title: `ScrollUniversity Lecture ${Date.now()}`
      });

      const videoId = createResponse.data.id;

      // Poll for completion
      let status = 'in_progress';
      let videoUrl = '';
      let attempts = 0;
      const maxAttempts = 120; // 4 minutes max

      while (status === 'in_progress' && attempts < maxAttempts) {
        await this.sleep(2000);
        
        const statusResponse = await this.synthesiaClient.get(`/v2/videos/${videoId}`);
        status = statusResponse.data.status;
        
        if (status === 'complete') {
          videoUrl = statusResponse.data.download;
          break;
        } else if (status === 'failed') {
          throw new Error('Synthesia video generation failed');
        }
        
        attempts++;
      }

      if (status !== 'complete') {
        throw new Error('Synthesia video generation timeout');
      }

      const duration = this.estimateDuration(request.text);
      const cost = duration * videoAvatarConfig.costs.synthesiaPerSecond;

      return {
        videoId,
        status: 'completed',
        videoUrl,
        thumbnailUrl: videoUrl.replace('.mp4', '_thumbnail.jpg'),
        duration,
        provider: 'synthesia',
        metadata: {
          generatedAt: new Date(),
          textLength: request.text.length,
          estimatedDuration: duration,
          actualDuration: duration,
          cost,
          provider: 'synthesia',
          cached: false
        }
      };
    } catch (error: any) {
      logger.error('Synthesia video generation failed', {
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Generate text-to-speech audio (fallback or audio-only mode)
   */
  async generateTextToSpeech(request: TextToSpeechRequest): Promise<TextToSpeechResponse> {
    try {
      // Use Azure Cognitive Services for TTS
      const response = await axios.post(
        `https://${process.env.AZURE_SPEECH_REGION || 'eastus'}.tts.speech.microsoft.com/cognitiveservices/v1`,
        `<speak version='1.0' xml:lang='${request.language || 'en-US'}'>
          <voice name='${request.voiceId}'>
            <prosody rate='${request.speed || 1.0}' pitch='${request.pitch || 1.0}'>
              ${request.text}
            </prosody>
          </voice>
        </speak>`,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY || '',
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': `audio-${request.format || 'mp3'}`
          },
          responseType: 'arraybuffer'
        }
      );

      // In production, upload to storage and return URL
      const audioUrl = `https://storage.scrolluniversity.com/tts/${Date.now()}.${request.format || 'mp3'}`;
      const duration = this.estimateDuration(request.text);
      const cost = request.text.length * videoAvatarConfig.costs.ttsPerCharacter;

      return {
        audioId: `tts_${Date.now()}`,
        audioUrl,
        duration,
        format: request.format || 'mp3',
        cost
      };
    } catch (error: any) {
      logger.error('Text-to-speech generation failed', {
        error: error.message
      });
      throw new Error('Failed to generate audio');
    }
  }

  /**
   * Start streaming video session for real-time interaction
   */
  async startStreamingSession(
    avatarId: string,
    voiceId: string,
    provider: VideoAvatarProvider = 'did'
  ): Promise<StreamingVideoSession> {
    try {
      // D-ID supports streaming via WebRTC
      if (provider === 'did') {
        const response = await this.didClient.post('/talks/streams', {
          source_url: this.getAvatarImageUrl(avatarId),
          driver_url: 'bank://lively'
        });

        return {
          sessionId: response.data.id,
          avatarId,
          voiceId,
          provider: 'did',
          streamUrl: response.data.stream_url,
          status: 'active',
          startedAt: new Date()
        };
      }

      throw new Error('Streaming not supported for this provider');
    } catch (error: any) {
      logger.error('Failed to start streaming session', {
        error: error.message,
        provider
      });
      throw new Error('Failed to start streaming session');
    }
  }

  /**
   * Send text to streaming session for real-time avatar response
   */
  async streamText(sessionId: string, text: string, voiceId: string): Promise<void> {
    try {
      await this.didClient.post(`/talks/streams/${sessionId}`, {
        script: {
          type: 'text',
          input: text,
          provider: {
            type: 'microsoft',
            voice_id: voiceId
          }
        },
        config: {
          fluent: true,
          pad_audio: 0
        }
      });

      logger.info('Text streamed to avatar session', { sessionId, textLength: text.length });
    } catch (error: any) {
      logger.error('Failed to stream text to avatar', {
        error: error.message,
        sessionId
      });
      throw new Error('Failed to stream text');
    }
  }

  /**
   * End streaming session
   */
  async endStreamingSession(sessionId: string): Promise<void> {
    try {
      await this.didClient.delete(`/talks/streams/${sessionId}`);
      logger.info('Streaming session ended', { sessionId });
    } catch (error: any) {
      logger.error('Failed to end streaming session', {
        error: error.message,
        sessionId
      });
    }
  }

  /**
   * Get available avatar personalities
   */
  getAvatarPersonalities(): Record<string, AvatarPersonality> {
    return avatarPersonalities;
  }

  /**
   * Get specific avatar personality
   */
  getAvatarPersonality(personalityId: string): AvatarPersonality | null {
    return avatarPersonalities[personalityId] || null;
  }

  /**
   * Check provider health status
   */
  async checkProviderHealth(provider: VideoAvatarProvider): Promise<ProviderHealth> {
    const startTime = Date.now();
    
    try {
      if (provider === 'did') {
        await this.didClient.get('/credits');
      } else if (provider === 'synthesia') {
        await this.synthesiaClient.get('/v2/videos');
      }

      const latency = Date.now() - startTime;

      return {
        provider,
        status: 'healthy',
        latency,
        errorRate: 0,
        lastCheck: new Date()
      };
    } catch (error: any) {
      return {
        provider,
        status: 'down',
        latency: Date.now() - startTime,
        errorRate: 1,
        lastCheck: new Date(),
        message: error.message
      };
    }
  }

  /**
   * Get video avatar analytics
   */
  async getAnalytics(userId?: string): Promise<VideoAvatarAnalytics> {
    try {
      // Query from database (placeholder - implement based on your tracking)
      return {
        totalVideosGenerated: 0,
        totalDuration: 0,
        totalCost: 0,
        cacheHitRate: 0,
        averageGenerationTime: 0,
        providerUsage: {
          did: 0,
          synthesia: 0,
          fallback: 0
        },
        popularAvatars: [],
        popularVoices: []
      };
    } catch (error: any) {
      logger.error('Failed to get video avatar analytics', { error: error.message });
      throw new Error('Failed to get analytics');
    }
  }

  /**
   * Generate fallback response (text-only, audio-only, or static image)
   */
  private async generateFallbackResponse(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    logger.info('Using fallback mode for video avatar', {
      textOnlyMode: this.fallbackMode.textOnlyMode,
      audioOnlyMode: this.fallbackMode.audioOnlyMode
    });

    const duration = this.estimateDuration(request.text);

    // Generate audio if audio-only mode
    let audioUrl = '';
    if (this.fallbackMode.audioOnlyMode) {
      const tts = await this.generateTextToSpeech({
        text: request.text,
        voiceId: request.voiceId
      });
      audioUrl = tts.audioUrl;
    }

    return {
      videoId: `fallback_${Date.now()}`,
      status: 'completed',
      videoUrl: audioUrl || '',
      thumbnailUrl: this.getAvatarImageUrl(request.avatarId),
      duration,
      provider: 'fallback',
      metadata: {
        generatedAt: new Date(),
        textLength: request.text.length,
        estimatedDuration: duration,
        actualDuration: duration,
        cost: 0,
        provider: 'fallback',
        cached: false
      }
    };
  }

  /**
   * Check if should use fallback mode
   */
  private shouldUseFallback(): boolean {
    return this.fallbackMode.enabled && (
      this.fallbackMode.textOnlyMode ||
      this.fallbackMode.audioOnlyMode ||
      this.fallbackMode.staticImageMode
    );
  }

  /**
   * Get cached video
   */
  private async getCachedVideo(request: VideoGenerationRequest): Promise<VideoCacheEntry | null> {
    try {
      const redis = await getRedisClient();
      const cacheKey = this.generateCacheKey(request);
      const cached = await redis.get(`video:cache:${cacheKey}`);

      if (cached) {
        const entry: VideoCacheEntry = JSON.parse(cached);
        
        // Update access stats
        entry.accessCount++;
        entry.lastAccessedAt = new Date();
        await redis.setEx(
          `video:cache:${cacheKey}`,
          videoAvatarConfig.cache.ttl,
          JSON.stringify(entry)
        );

        return entry;
      }

      return null;
    } catch (error: any) {
      logger.error('Failed to get cached video', { error: error.message });
      return null;
    }
  }

  /**
   * Cache video
   */
  private async cacheVideo(
    request: VideoGenerationRequest,
    response: VideoGenerationResponse
  ): Promise<void> {
    try {
      const redis = await getRedisClient();
      const cacheKey = this.generateCacheKey(request);

      const entry: VideoCacheEntry = {
        cacheKey,
        text: request.text,
        avatarId: request.avatarId,
        voiceId: request.voiceId,
        videoUrl: response.videoUrl || '',
        thumbnailUrl: response.thumbnailUrl || '',
        duration: response.duration || 0,
        createdAt: new Date(),
        accessCount: 1,
        lastAccessedAt: new Date(),
        expiresAt: new Date(Date.now() + videoAvatarConfig.cache.ttl * 1000)
      };

      await redis.setEx(
        `video:cache:${cacheKey}`,
        videoAvatarConfig.cache.ttl,
        JSON.stringify(entry)
      );

      logger.info('Video cached successfully', { cacheKey });
    } catch (error: any) {
      logger.error('Failed to cache video', { error: error.message });
    }
  }

  /**
   * Generate cache key for video
   */
  private generateCacheKey(request: VideoGenerationRequest): string {
    const data = `${request.text}:${request.avatarId}:${request.voiceId}:${request.provider}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Estimate video duration from text length
   */
  private estimateDuration(text: string): number {
    // Average speaking rate: 150 words per minute = 2.5 words per second
    const words = text.split(/\s+/).length;
    return Math.ceil(words / 2.5);
  }

  /**
   * Get avatar image URL
   */
  private getAvatarImageUrl(avatarId: string): string {
    // In production, this would return actual avatar image URLs
    return `https://storage.scrolluniversity.com/avatars/${avatarId}.jpg`;
  }

  /**
   * Track video generation for analytics
   */
  private async trackVideoGeneration(
    request: VideoGenerationRequest,
    response: VideoGenerationResponse,
    generationTime: number
  ): Promise<void> {
    try {
      // Store in database for analytics (implement based on your schema)
      logger.info('Video generation tracked', {
        provider: response.provider,
        duration: response.duration,
        cost: response.metadata.cost,
        generationTime
      });
    } catch (error: any) {
      logger.error('Failed to track video generation', { error: error.message });
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const videoAvatarService = new VideoAvatarService();
