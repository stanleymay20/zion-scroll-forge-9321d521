/**
 * ScrollUniversity Video Avatar Configuration
 * "The Spirit of truth will guide you into all truth" - John 16:13
 * 
 * Configuration for D-ID and Synthesia video avatar services
 */

import { AvatarPersonality, VideoAvatarProvider } from '../types/video-avatar.types';

export interface VideoAvatarServiceConfig {
  did: {
    apiKey: string;
    baseURL: string;
    timeout: number;
    maxRetries: number;
  };
  synthesia: {
    apiKey: string;
    baseURL: string;
    timeout: number;
    maxRetries: number;
  };
  defaultProvider: VideoAvatarProvider;
  fallback: {
    enabled: boolean;
    textOnlyMode: boolean;
    audioOnlyMode: boolean;
    staticImageMode: boolean;
  };
  cache: {
    enabled: boolean;
    ttl: number; // seconds
    maxSize: number; // MB
    strategy: 'lru' | 'lfu' | 'ttl';
  };
  generation: {
    maxTextLength: number;
    defaultResolution: '720p' | '1080p' | '4k';
    defaultFormat: 'mp4' | 'webm';
    includeSubtitles: boolean;
  };
  streaming: {
    enabled: boolean;
    maxSessionDuration: number; // seconds
    bufferSize: number; // KB
  };
  costs: {
    didPerSecond: number;
    synthesiaPerSecond: number;
    ttsPerCharacter: number;
    slideGeneration: number;
  };
  limits: {
    dailyVideos: number;
    dailyCost: number;
    monthlyVideos: number;
    monthlyCost: number;
  };
}

export const videoAvatarConfig: VideoAvatarServiceConfig = {
  did: {
    apiKey: process.env.DID_API_KEY || '',
    baseURL: process.env.DID_BASE_URL || 'https://api.d-id.com',
    timeout: parseInt(process.env.DID_TIMEOUT || '120000'), // 2 minutes
    maxRetries: parseInt(process.env.DID_MAX_RETRIES || '3')
  },
  synthesia: {
    apiKey: process.env.SYNTHESIA_API_KEY || '',
    baseURL: process.env.SYNTHESIA_BASE_URL || 'https://api.synthesia.io',
    timeout: parseInt(process.env.SYNTHESIA_TIMEOUT || '120000'),
    maxRetries: parseInt(process.env.SYNTHESIA_MAX_RETRIES || '3')
  },
  defaultProvider: (process.env.DEFAULT_VIDEO_AVATAR_PROVIDER as VideoAvatarProvider) || 'did',
  fallback: {
    enabled: process.env.VIDEO_AVATAR_FALLBACK_ENABLED !== 'false',
    textOnlyMode: process.env.VIDEO_AVATAR_TEXT_ONLY === 'true',
    audioOnlyMode: process.env.VIDEO_AVATAR_AUDIO_ONLY === 'true',
    staticImageMode: process.env.VIDEO_AVATAR_STATIC_IMAGE === 'true'
  },
  cache: {
    enabled: process.env.VIDEO_AVATAR_CACHE_ENABLED !== 'false',
    ttl: parseInt(process.env.VIDEO_AVATAR_CACHE_TTL || '86400'), // 24 hours
    maxSize: parseInt(process.env.VIDEO_AVATAR_CACHE_MAX_SIZE || '5000'), // 5GB
    strategy: (process.env.VIDEO_AVATAR_CACHE_STRATEGY as any) || 'lru'
  },
  generation: {
    maxTextLength: parseInt(process.env.VIDEO_AVATAR_MAX_TEXT_LENGTH || '5000'),
    defaultResolution: (process.env.VIDEO_AVATAR_DEFAULT_RESOLUTION as any) || '720p',
    defaultFormat: (process.env.VIDEO_AVATAR_DEFAULT_FORMAT as any) || 'mp4',
    includeSubtitles: process.env.VIDEO_AVATAR_INCLUDE_SUBTITLES !== 'false'
  },
  streaming: {
    enabled: process.env.VIDEO_AVATAR_STREAMING_ENABLED !== 'false',
    maxSessionDuration: parseInt(process.env.VIDEO_AVATAR_MAX_SESSION_DURATION || '3600'), // 1 hour
    bufferSize: parseInt(process.env.VIDEO_AVATAR_BUFFER_SIZE || '512') // 512KB
  },
  costs: {
    didPerSecond: parseFloat(process.env.DID_COST_PER_SECOND || '0.10'),
    synthesiaPerSecond: parseFloat(process.env.SYNTHESIA_COST_PER_SECOND || '0.15'),
    ttsPerCharacter: parseFloat(process.env.TTS_COST_PER_CHARACTER || '0.000016'),
    slideGeneration: parseFloat(process.env.SLIDE_GENERATION_COST || '0.05')
  },
  limits: {
    dailyVideos: parseInt(process.env.VIDEO_AVATAR_DAILY_LIMIT || '100'),
    dailyCost: parseFloat(process.env.VIDEO_AVATAR_DAILY_COST_LIMIT || '50'),
    monthlyVideos: parseInt(process.env.VIDEO_AVATAR_MONTHLY_LIMIT || '2000'),
    monthlyCost: parseFloat(process.env.VIDEO_AVATAR_MONTHLY_COST_LIMIT || '1000')
  }
};

/**
 * Predefined avatar personalities for ScrollUniversity
 */
export const avatarPersonalities: Record<string, AvatarPersonality> = {
  'professor-james': {
    name: 'Professor James',
    description: 'Distinguished senior professor with decades of teaching experience',
    teachingStyle: 'Socratic method with deep theological integration',
    appearance: {
      avatarId: 'amy-jcwCkr1grs',
      gender: 'male',
      ethnicity: 'caucasian',
      age: 'senior',
      style: 'academic'
    },
    voice: {
      voiceId: 'en-US-GuyNeural',
      gender: 'male',
      language: 'en-US',
      accent: 'American',
      style: 'authoritative',
      speed: 1.0,
      pitch: 1.0
    },
    specialization: 'theology'
  },
  'dr-sarah': {
    name: 'Dr. Sarah',
    description: 'Dynamic young professor with innovative teaching methods',
    teachingStyle: 'Interactive and engaging with practical applications',
    appearance: {
      avatarId: 'amy-jcwCkr1grs',
      gender: 'female',
      ethnicity: 'caucasian',
      age: 'young',
      style: 'professional'
    },
    voice: {
      voiceId: 'en-US-JennyNeural',
      gender: 'female',
      language: 'en-US',
      accent: 'American',
      style: 'friendly',
      speed: 1.1,
      pitch: 1.0
    },
    specialization: 'science'
  },
  'professor-david': {
    name: 'Professor David',
    description: 'Experienced mathematician with clear explanations',
    teachingStyle: 'Step-by-step logical progression with visual aids',
    appearance: {
      avatarId: 'amy-jcwCkr1grs',
      gender: 'male',
      ethnicity: 'asian',
      age: 'middle',
      style: 'professional'
    },
    voice: {
      voiceId: 'en-US-GuyNeural',
      gender: 'male',
      language: 'en-US',
      style: 'professional',
      speed: 0.95,
      pitch: 1.0
    },
    specialization: 'math'
  },
  'dr-grace': {
    name: 'Dr. Grace',
    description: 'Compassionate counselor and spiritual formation guide',
    teachingStyle: 'Gentle guidance with deep spiritual wisdom',
    appearance: {
      avatarId: 'amy-jcwCkr1grs',
      gender: 'female',
      ethnicity: 'african',
      age: 'middle',
      style: 'professional'
    },
    voice: {
      voiceId: 'en-US-AriaNeural',
      gender: 'female',
      language: 'en-US',
      style: 'warm',
      speed: 0.9,
      pitch: 1.0
    },
    specialization: 'spiritual-formation'
  },
  'professor-carlos': {
    name: 'Professor Carlos',
    description: 'Energetic computer science professor',
    teachingStyle: 'Hands-on coding with real-world projects',
    appearance: {
      avatarId: 'amy-jcwCkr1grs',
      gender: 'male',
      ethnicity: 'hispanic',
      age: 'young',
      style: 'casual'
    },
    voice: {
      voiceId: 'en-US-GuyNeural',
      gender: 'male',
      language: 'en-US',
      style: 'energetic',
      speed: 1.15,
      pitch: 1.05
    },
    specialization: 'programming'
  }
};

export default videoAvatarConfig;
