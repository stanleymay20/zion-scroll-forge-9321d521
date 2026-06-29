/**
 * Video Streaming Service
 * "Stream the scrolls with adaptive wisdom, reaching every device and bandwidth"
 * 
 * Handles video streaming with adaptive bitrate, HLS/DASH manifests, and quality selection
 */

import { logger } from '../utils/logger';
import {
  VideoStreamRequest,
  VideoStreamResponse,
  VideoQuality,
  VideoQualityOption,
  ABRManifest,
  ABRVariant,
  VideoAccessCheck,
  VideoAccessResponse,
  WatermarkConfig
} from '../types/video-streaming.types';
import { PrismaClient } from '@prisma/client';

export default class VideoStreamingService {
  private prisma: PrismaClient;
  private cdnBaseUrl: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.cdnBaseUrl = process.env.CDN_BASE_URL || process.env.SUPABASE_URL || '';
  }

  /**
   * Get video stream with adaptive bitrate support
   */
  async getVideoStream(request: VideoStreamRequest): Promise<VideoStreamResponse> {
    try {
      logger.info('Getting video stream', {
        videoId: request.videoId,
        userId: request.userId,
        quality: request.quality
      });

      // Check access permissions
      const lecture = await this.prisma.lecture.findUnique({
        where: { id: request.videoId },
        include: {
          module: {
            include: {
              course: true
            }
          }
        }
      });

      if (!lecture) {
        throw new Error('Lecture not found');
      }

      const hasAccess = await this.checkVideoAccess({
        userId: request.userId,
        lectureId: request.videoId,
        courseId: lecture.module.courseId
      });

      if (!hasAccess.hasAccess) {
        throw new Error(hasAccess.reason || 'Access denied');
      }

      // Get video URL and generate adaptive streaming manifest
      const videoUrl = lecture.videoUrl || '';
      const manifest = await this.generateABRManifest(videoUrl, lecture.id);

      // Get available quality options
      const qualities = this.getQualityOptions(videoUrl);

      // Get caption tracks
      const captions = await this.getCaptionTracks(lecture.id);

      const response: VideoStreamResponse = {
        streamUrl: this.selectQualityUrl(qualities, request.quality),
        manifestUrl: manifest.masterPlaylistUrl,
        qualities,
        duration: lecture.duration * 60, // Convert minutes to seconds
        currentTime: request.startTime || 0,
        captions,
        thumbnails: this.generateThumbnailsUrl(videoUrl)
      };

      logger.info('Video stream prepared', { lectureId: request.videoId });

      return response;
    } catch (error) {
      logger.error('Error getting video stream:', error);
      throw new Error(`Failed to get video stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if user has access to video
   */
  async checkVideoAccess(check: VideoAccessCheck): Promise<VideoAccessResponse> {
    try {
      // Check if user is enrolled in the course
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          userId: check.userId,
          courseId: check.courseId,
          status: 'ACTIVE'
        }
      });

      if (!enrollment) {
        return {
          hasAccess: false,
          reason: 'User is not enrolled in this course'
        };
      }

      // Check if enrollment is still valid
      if (enrollment.expiresAt && enrollment.expiresAt < new Date()) {
        return {
          hasAccess: false,
          reason: 'Course enrollment has expired'
        };
      }

      return {
        hasAccess: true,
        expiresAt: enrollment.expiresAt || undefined
      };
    } catch (error) {
      logger.error('Error checking video access:', error);
      return {
        hasAccess: false,
        reason: 'Error checking access permissions'
      };
    }
  }

  /**
   * Generate adaptive bitrate streaming manifest (HLS/DASH)
   */
  private async generateABRManifest(videoUrl: string, lectureId: string): Promise<ABRManifest> {
    try {
      // In production, this would generate actual HLS/DASH manifests
      // For now, we'll create a structure that represents the manifest

      const variants: ABRVariant[] = [
        {
          quality: VideoQuality.LOW,
          bandwidth: 800000,
          resolution: '640x360',
          codecs: 'avc1.42E01E,mp4a.40.2',
          playlistUrl: `${this.cdnBaseUrl}/videos/${lectureId}/360p/playlist.m3u8`
        },
        {
          quality: VideoQuality.MEDIUM,
          bandwidth: 1400000,
          resolution: '854x480',
          codecs: 'avc1.42E01E,mp4a.40.2',
          playlistUrl: `${this.cdnBaseUrl}/videos/${lectureId}/480p/playlist.m3u8`
        },
        {
          quality: VideoQuality.HIGH,
          bandwidth: 2800000,
          resolution: '1280x720',
          codecs: 'avc1.4D401F,mp4a.40.2',
          playlistUrl: `${this.cdnBaseUrl}/videos/${lectureId}/720p/playlist.m3u8`
        },
        {
          quality: VideoQuality.FULL_HD,
          bandwidth: 5000000,
          resolution: '1920x1080',
          codecs: 'avc1.640028,mp4a.40.2',
          playlistUrl: `${this.cdnBaseUrl}/videos/${lectureId}/1080p/playlist.m3u8`
        }
      ];

      return {
        type: 'HLS',
        masterPlaylistUrl: `${this.cdnBaseUrl}/videos/${lectureId}/master.m3u8`,
        variants
      };
    } catch (error) {
      logger.error('Error generating ABR manifest:', error);
      throw error;
    }
  }

  /**
   * Get available quality options for video
   */
  private getQualityOptions(videoUrl: string): VideoQualityOption[] {
    // In production, this would analyze the video and return actual available qualities
    return [
      {
        quality: VideoQuality.LOW,
        bitrate: 800,
        resolution: '640x360',
        url: videoUrl.replace('.mp4', '_360p.mp4')
      },
      {
        quality: VideoQuality.MEDIUM,
        bitrate: 1400,
        resolution: '854x480',
        url: videoUrl.replace('.mp4', '_480p.mp4')
      },
      {
        quality: VideoQuality.HIGH,
        bitrate: 2800,
        resolution: '1280x720',
        url: videoUrl.replace('.mp4', '_720p.mp4')
      },
      {
        quality: VideoQuality.FULL_HD,
        bitrate: 5000,
        resolution: '1920x1080',
        url: videoUrl
      }
    ];
  }

  /**
   * Select appropriate quality URL based on request
   */
  private selectQualityUrl(qualities: VideoQualityOption[], requestedQuality?: VideoQuality): string {
    if (!requestedQuality || requestedQuality === VideoQuality.AUTO) {
      // Return highest quality by default
      return qualities[qualities.length - 1].url;
    }

    const selected = qualities.find(q => q.quality === requestedQuality);
    return selected?.url || qualities[qualities.length - 1].url;
  }

  /**
   * Get caption tracks for video
   */
  private async getCaptionTracks(lectureId: string): Promise<Array<{
    language: string;
    languageCode: string;
    url: string;
    format: 'VTT' | 'SRT' | 'TTML';
    isDefault: boolean;
  }>> {
    try {
      const lecture = await this.prisma.lecture.findUnique({
        where: { id: lectureId }
      });

      if (!lecture?.closedCaptions) {
        return [];
      }

      // Parse caption URL or generate caption tracks
      // In production, this would support multiple languages
      return [
        {
          language: 'English',
          languageCode: 'en',
          url: lecture.closedCaptions,
          format: 'VTT',
          isDefault: true
        }
      ];
    } catch (error) {
      logger.error('Error getting caption tracks:', error);
      return [];
    }
  }

  /**
   * Generate thumbnails sprite URL for video scrubbing
   */
  private generateThumbnailsUrl(videoUrl: string): string {
    // In production, this would generate actual thumbnail sprites
    return videoUrl.replace('.mp4', '_thumbnails.jpg');
  }

  /**
   * Apply watermark to video stream
   */
  async applyWatermark(videoUrl: string, config: WatermarkConfig): Promise<string> {
    try {
      if (!config.enabled) {
        return videoUrl;
      }

      logger.info('Applying watermark to video', { videoUrl, config });

      // In production, this would use FFmpeg or a video processing service
      // to overlay the watermark on the video
      // For now, return the original URL

      return videoUrl;
    } catch (error) {
      logger.error('Error applying watermark:', error);
      return videoUrl;
    }
  }

  /**
   * Get video streaming statistics
   */
  async getStreamingStats(lectureId: string): Promise<{
    totalStreams: number;
    activeStreams: number;
    bandwidth: number;
    qualityDistribution: Record<VideoQuality, number>;
  }> {
    try {
      // In production, this would query actual streaming analytics
      return {
        totalStreams: 0,
        activeStreams: 0,
        bandwidth: 0,
        qualityDistribution: {
          [VideoQuality.AUTO]: 0,
          [VideoQuality.LOW]: 0,
          [VideoQuality.MEDIUM]: 0,
          [VideoQuality.HIGH]: 0,
          [VideoQuality.FULL_HD]: 0,
          [VideoQuality.ULTRA_HD]: 0
        }
      };
    } catch (error) {
      logger.error('Error getting streaming stats:', error);
      throw error;
    }
  }
}
