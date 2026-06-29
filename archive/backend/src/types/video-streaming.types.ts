/**
 * Video Streaming and Content Delivery Types
 * "Stream the scrolls of wisdom to every corner of the earth"
 */

// ============================================================================
// Video Streaming Types
// ============================================================================

export interface VideoStreamRequest {
  videoId: string;
  userId: string;
  quality?: VideoQuality;
  startTime?: number; // in seconds
}

export interface VideoStreamResponse {
  streamUrl: string;
  manifestUrl?: string; // For HLS/DASH
  qualities: VideoQualityOption[];
  duration: number;
  currentTime: number;
  captions: CaptionTrack[];
  thumbnails?: string;
}

export enum VideoQuality {
  AUTO = 'AUTO',
  LOW = '360p',
  MEDIUM = '480p',
  HIGH = '720p',
  FULL_HD = '1080p',
  ULTRA_HD = '4K'
}

export interface VideoQualityOption {
  quality: VideoQuality;
  bitrate: number; // in kbps
  resolution: string;
  url: string;
}

// ============================================================================
// Caption and Transcript Types
// ============================================================================

export interface CaptionTrack {
  language: string;
  languageCode: string;
  url: string;
  format: 'VTT' | 'SRT' | 'TTML';
  isDefault: boolean;
}

export interface TranscriptGenerationRequest {
  videoUrl: string;
  language?: string;
  includeTimestamps?: boolean;
  includeSpeakerLabels?: boolean;
}

export interface TranscriptGenerationResponse {
  transcript: string;
  captionUrl: string;
  language: string;
  duration: number;
  wordCount: number;
  segments: TranscriptSegment[];
}

export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  confidence?: number;
}

// ============================================================================
// Progress Tracking Types
// ============================================================================

export interface VideoProgressUpdate {
  userId: string;
  lectureId: string;
  currentTime: number;
  duration: number;
  completed: boolean;
  watchedSegments?: WatchedSegment[];
}

export interface WatchedSegment {
  startTime: number;
  endTime: number;
}

export interface VideoProgressResponse {
  lectureId: string;
  userId: string;
  currentTime: number;
  duration: number;
  percentComplete: number;
  completed: boolean;
  lastWatchedAt: Date;
  totalWatchTime: number; // in seconds
  watchCount: number;
}

// ============================================================================
// Video Analytics Types
// ============================================================================

export interface VideoAnalytics {
  lectureId: string;
  totalViews: number;
  uniqueViewers: number;
  averageWatchTime: number;
  completionRate: number;
  rewatchRate: number;
  dropOffPoints: DropOffPoint[];
  engagementScore: number;
  qualityDistribution: Record<VideoQuality, number>;
  deviceDistribution: Record<string, number>;
}

export interface DropOffPoint {
  timestamp: number;
  dropOffRate: number; // percentage of viewers who stopped watching
}

export interface VideoAnalyticsQuery {
  lectureId?: string;
  courseId?: string;
  moduleId?: string;
  startDate?: Date;
  endDate?: Date;
  groupBy?: 'day' | 'week' | 'month';
}

// ============================================================================
// Downloadable Materials Types
// ============================================================================

export interface DownloadRequest {
  lectureId: string;
  userId: string;
  materialType: MaterialType;
  materialId?: string;
}

export interface DownloadResponse {
  downloadUrl: string;
  filename: string;
  size: number;
  expiresAt: Date;
  format: string;
}

export enum MaterialType {
  VIDEO = 'VIDEO',
  NOTES = 'NOTES',
  SLIDES = 'SLIDES',
  TRANSCRIPT = 'TRANSCRIPT',
  SUPPLEMENTARY = 'SUPPLEMENTARY',
  ALL = 'ALL'
}

// ============================================================================
// CDN Integration Types
// ============================================================================

export interface CDNConfig {
  provider: 'CLOUDFLARE' | 'CLOUDFRONT' | 'FASTLY' | 'CUSTOM';
  baseUrl: string;
  apiKey?: string;
  zoneId?: string;
  distributionId?: string;
}

export interface CDNPurgeRequest {
  urls?: string[];
  tags?: string[];
  purgeAll?: boolean;
}

export interface CDNPurgeResponse {
  success: boolean;
  purgedUrls: string[];
  purgedAt: Date;
}

export interface CDNAnalytics {
  totalRequests: number;
  bandwidth: number; // in bytes
  cacheHitRate: number;
  topCountries: Record<string, number>;
  topFiles: Array<{ url: string; requests: number }>;
}

// ============================================================================
// Offline Download Types
// ============================================================================

export interface OfflineDownloadRequest {
  lectureId: string;
  userId: string;
  quality: VideoQuality;
  includeMaterials: boolean;
}

export interface OfflineDownloadResponse {
  downloadId: string;
  packageUrl: string;
  packageSize: number;
  expiresAt: Date;
  contents: OfflineContent[];
}

export interface OfflineContent {
  type: MaterialType;
  filename: string;
  size: number;
  url: string;
}

export interface OfflinePackageStatus {
  downloadId: string;
  status: 'PREPARING' | 'READY' | 'EXPIRED' | 'FAILED';
  progress: number;
  estimatedTimeRemaining?: number;
}

// ============================================================================
// Adaptive Bitrate Streaming Types
// ============================================================================

export interface ABRManifest {
  type: 'HLS' | 'DASH';
  masterPlaylistUrl: string;
  variants: ABRVariant[];
}

export interface ABRVariant {
  quality: VideoQuality;
  bandwidth: number;
  resolution: string;
  codecs: string;
  playlistUrl: string;
}

// ============================================================================
// Video Access Control Types
// ============================================================================

export interface VideoAccessCheck {
  userId: string;
  lectureId: string;
  courseId: string;
}

export interface VideoAccessResponse {
  hasAccess: boolean;
  reason?: string;
  expiresAt?: Date;
  remainingViews?: number;
}

// ============================================================================
// Video Watermark Types
// ============================================================================

export interface WatermarkConfig {
  enabled: boolean;
  text?: string;
  imageUrl?: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number;
  userId?: string;
}
