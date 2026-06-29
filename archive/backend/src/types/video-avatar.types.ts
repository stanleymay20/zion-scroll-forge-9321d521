/**
 * ScrollUniversity Video Avatar Types
 * "The Spirit of truth will guide you into all truth" - John 16:13
 * 
 * Type definitions for AI video avatar integration with D-ID and Synthesia
 */

export type VideoAvatarProvider = 'did' | 'synthesia' | 'fallback';

export type VideoAvatarGender = 'male' | 'female';

export type VideoAvatarEthnicity = 
  | 'caucasian'
  | 'african'
  | 'asian'
  | 'hispanic'
  | 'middle-eastern'
  | 'mixed';

export type VoiceGender = 'male' | 'female';

export type VoiceStyle = 
  | 'professional'
  | 'friendly'
  | 'authoritative'
  | 'warm'
  | 'energetic'
  | 'calm';

export interface AvatarAppearance {
  avatarId: string;
  gender: VideoAvatarGender;
  ethnicity: VideoAvatarEthnicity;
  age: 'young' | 'middle' | 'senior';
  style: 'professional' | 'casual' | 'academic';
  customImageUrl?: string;
}

export interface VoiceConfig {
  voiceId: string;
  gender: VoiceGender;
  language: string;
  accent?: string;
  style: VoiceStyle;
  speed: number; // 0.5 to 2.0
  pitch: number; // 0.5 to 2.0
}

export interface AvatarPersonality {
  name: string;
  description: string;
  teachingStyle: string;
  appearance: AvatarAppearance;
  voice: VoiceConfig;
  specialization?: string;
}

export interface VideoGenerationRequest {
  text: string;
  avatarId: string;
  voiceId: string;
  provider: VideoAvatarProvider;
  options?: VideoGenerationOptions;
}

export interface VideoGenerationOptions {
  speed?: number;
  pitch?: number;
  emotion?: 'neutral' | 'happy' | 'serious' | 'excited';
  background?: string;
  resolution?: '720p' | '1080p' | '4k';
  format?: 'mp4' | 'webm';
  includeSubtitles?: boolean;
}

export interface VideoGenerationResponse {
  videoId: string;
  status: 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  provider: VideoAvatarProvider;
  metadata: VideoMetadata;
}

export interface VideoMetadata {
  generatedAt: Date;
  textLength: number;
  estimatedDuration: number;
  actualDuration?: number;
  cost: number;
  provider: VideoAvatarProvider;
  cached: boolean;
}

export interface StreamingVideoSession {
  sessionId: string;
  avatarId: string;
  voiceId: string;
  provider: VideoAvatarProvider;
  streamUrl: string;
  status: 'active' | 'paused' | 'ended';
  startedAt: Date;
}

export interface SlideGenerationRequest {
  content: string;
  topic: string;
  style?: 'academic' | 'simple' | 'visual' | 'detailed';
  includeImages?: boolean;
  includeCode?: boolean;
}

export interface SlideGenerationResponse {
  slideId: string;
  imageUrl: string;
  content: {
    title: string;
    points: string[];
    images?: string[];
    code?: string;
  };
  format: 'png' | 'jpg' | 'svg';
}

export interface VideoCacheEntry {
  cacheKey: string;
  text: string;
  avatarId: string;
  voiceId: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  createdAt: Date;
  accessCount: number;
  lastAccessedAt: Date;
  expiresAt: Date;
}

export interface TextToSpeechRequest {
  text: string;
  voiceId: string;
  language?: string;
  speed?: number;
  pitch?: number;
  format?: 'mp3' | 'wav' | 'ogg';
}

export interface TextToSpeechResponse {
  audioId: string;
  audioUrl: string;
  duration: number;
  format: string;
  cost: number;
}

export interface AvatarCustomization {
  userId: string;
  preferredAvatarId?: string;
  preferredVoiceId?: string;
  preferredProvider?: VideoAvatarProvider;
  customSettings?: {
    speed?: number;
    pitch?: number;
    emotion?: string;
    background?: string;
  };
}

export interface VideoAvatarAnalytics {
  totalVideosGenerated: number;
  totalDuration: number;
  totalCost: number;
  cacheHitRate: number;
  averageGenerationTime: number;
  providerUsage: Record<VideoAvatarProvider, number>;
  popularAvatars: Array<{
    avatarId: string;
    usageCount: number;
  }>;
  popularVoices: Array<{
    voiceId: string;
    usageCount: number;
  }>;
}

export interface VideoAvatarError extends Error {
  code: string;
  provider: VideoAvatarProvider;
  retryable: boolean;
  statusCode?: number;
  originalError?: any;
}

export interface ProviderHealth {
  provider: VideoAvatarProvider;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  errorRate: number;
  lastCheck: Date;
  message?: string;
}

export interface FallbackConfig {
  enabled: boolean;
  textOnlyMode: boolean;
  audioOnlyMode: boolean;
  staticImageMode: boolean;
  message?: string;
}
