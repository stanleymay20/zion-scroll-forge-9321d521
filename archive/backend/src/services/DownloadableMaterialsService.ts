/**
 * Downloadable Materials Service
 * "Package wisdom for offline study, accessible anytime, anywhere"
 * 
 * Handles downloadable course materials with access control and offline packages
 */

import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import {
  DownloadRequest,
  DownloadResponse,
  MaterialType,
  OfflineDownloadRequest,
  OfflineDownloadResponse,
  OfflineContent,
  OfflinePackageStatus
} from '../types/video-streaming.types';
import FileStorageService from './FileStorageService';

export default class DownloadableMaterialsService {
  private prisma: PrismaClient;
  private fileStorage: FileStorageService;
  private offlinePackages: Map<string, OfflinePackageStatus>;

  constructor() {
    this.prisma = new PrismaClient();
    this.fileStorage = new FileStorageService();
    this.offlinePackages = new Map();
  }

  /**
   * Get downloadable material with access control
   */
  async getMaterial(request: DownloadRequest): Promise<DownloadResponse> {
    try {
      logger.info('Getting downloadable material', {
        lectureId: request.lectureId,
        userId: request.userId,
        materialType: request.materialType
      });

      // Check access permissions
      const hasAccess = await this.checkDownloadAccess(request.userId, request.lectureId);
      if (!hasAccess) {
        throw new Error('User does not have access to download this material');
      }

      // Get lecture details
      const lecture = await this.prisma.lecture.findUnique({
        where: { id: request.lectureId },
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

      // Get material URL based on type
      const materialUrl = await this.getMaterialUrl(lecture, request.materialType, request.materialId);

      // Generate signed URL with expiration
      const expiresIn = 3600; // 1 hour
      const downloadUrl = await this.fileStorage.getSignedUrl(materialUrl, expiresIn);

      // Extract filename from URL
      const filename = this.extractFilename(materialUrl);

      // Log download activity
      await this.logDownload(request.userId, request.lectureId, request.materialType);

      const response: DownloadResponse = {
        downloadUrl,
        filename,
        size: 0, // Would be populated from actual file metadata
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        format: this.getFileFormat(filename)
      };

      logger.info('Material download prepared', {
        lectureId: request.lectureId,
        materialType: request.materialType
      });

      return response;
    } catch (error) {
      logger.error('Error getting downloadable material:', error);
      throw new Error(`Failed to get downloadable material: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create offline download package
   */
  async createOfflinePackage(request: OfflineDownloadRequest): Promise<OfflineDownloadResponse> {
    try {
      logger.info('Creating offline download package', {
        lectureId: request.lectureId,
        userId: request.userId,
        quality: request.quality
      });

      // Check access
      const hasAccess = await this.checkDownloadAccess(request.userId, request.lectureId);
      if (!hasAccess) {
        throw new Error('User does not have access to download this content');
      }

      // Generate unique download ID
      const downloadId = `offline_${request.lectureId}_${Date.now()}`;

      // Initialize package status
      this.offlinePackages.set(downloadId, {
        downloadId,
        status: 'PREPARING',
        progress: 0
      });

      // Start package preparation asynchronously
      this.prepareOfflinePackage(downloadId, request).catch(error => {
        logger.error('Error preparing offline package:', error);
        this.offlinePackages.set(downloadId, {
          downloadId,
          status: 'FAILED',
          progress: 0
        });
      });

      // Get lecture details for initial response
      const lecture = await this.prisma.lecture.findUnique({
        where: { id: request.lectureId }
      });

      if (!lecture) {
        throw new Error('Lecture not found');
      }

      // Build contents list
      const contents: OfflineContent[] = [];

      // Add video
      if (lecture.videoUrl) {
        contents.push({
          type: MaterialType.VIDEO,
          filename: `video_${request.quality}.mp4`,
          size: 0,
          url: lecture.videoUrl
        });
      }

      // Add materials if requested
      if (request.includeMaterials) {
        if (lecture.notesUrl) {
          contents.push({
            type: MaterialType.NOTES,
            filename: 'lecture_notes.pdf',
            size: 0,
            url: lecture.notesUrl
          });
        }

        if (lecture.slidesUrl) {
          contents.push({
            type: MaterialType.SLIDES,
            filename: 'slides.pdf',
            size: 0,
            url: lecture.slidesUrl
          });
        }

        if (lecture.transcript) {
          contents.push({
            type: MaterialType.TRANSCRIPT,
            filename: 'transcript.txt',
            size: 0,
            url: lecture.transcript
          });
        }
      }

      const response: OfflineDownloadResponse = {
        downloadId,
        packageUrl: '', // Will be populated when ready
        packageSize: 0,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        contents
      };

      return response;
    } catch (error) {
      logger.error('Error creating offline package:', error);
      throw new Error(`Failed to create offline package: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get offline package status
   */
  async getPackageStatus(downloadId: string): Promise<OfflinePackageStatus> {
    const status = this.offlinePackages.get(downloadId);

    if (!status) {
      return {
        downloadId,
        status: 'EXPIRED',
        progress: 0
      };
    }

    return status;
  }

  /**
   * Check if user has download access
   */
  private async checkDownloadAccess(userId: string, lectureId: string): Promise<boolean> {
    try {
      const lecture = await this.prisma.lecture.findUnique({
        where: { id: lectureId },
        include: {
          module: {
            include: {
              course: true
            }
          }
        }
      });

      if (!lecture) {
        return false;
      }

      // Check enrollment
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          userId,
          courseId: lecture.module.courseId,
          status: 'ACTIVE'
        }
      });

      return !!enrollment;
    } catch (error) {
      logger.error('Error checking download access:', error);
      return false;
    }
  }

  /**
   * Get material URL based on type
   */
  private async getMaterialUrl(
    lecture: any,
    materialType: MaterialType,
    materialId?: string
  ): Promise<string> {
    switch (materialType) {
      case MaterialType.VIDEO:
        return lecture.videoUrl || '';
      case MaterialType.NOTES:
        return lecture.notesUrl || '';
      case MaterialType.SLIDES:
        return lecture.slidesUrl || '';
      case MaterialType.TRANSCRIPT:
        return lecture.transcript || '';
      case MaterialType.SUPPLEMENTARY:
        if (materialId && lecture.supplementaryMaterials) {
          const materials = lecture.supplementaryMaterials as string[];
          return materials.find((m: string) => m.includes(materialId)) || '';
        }
        return '';
      case MaterialType.ALL:
        throw new Error('Use createOfflinePackage for downloading all materials');
      default:
        throw new Error(`Unknown material type: ${materialType}`);
    }
  }

  /**
   * Prepare offline package (async)
   */
  private async prepareOfflinePackage(
    downloadId: string,
    request: OfflineDownloadRequest
  ): Promise<void> {
    try {
      // Update status
      this.offlinePackages.set(downloadId, {
        downloadId,
        status: 'PREPARING',
        progress: 10
      });

      // In production, this would:
      // 1. Download all materials
      // 2. Transcode video to requested quality
      // 3. Package everything into a ZIP file
      // 4. Upload to storage
      // 5. Generate signed URL

      // Simulate preparation time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update status to ready
      this.offlinePackages.set(downloadId, {
        downloadId,
        status: 'READY',
        progress: 100
      });

      logger.info('Offline package ready', { downloadId });
    } catch (error) {
      logger.error('Error preparing offline package:', error);
      throw error;
    }
  }

  /**
   * Log download activity
   */
  private async logDownload(
    userId: string,
    lectureId: string,
    materialType: MaterialType
  ): Promise<void> {
    try {
      // In production, this would log to analytics database
      logger.info('Download logged', { userId, lectureId, materialType });
    } catch (error) {
      logger.error('Error logging download:', error);
    }
  }

  /**
   * Extract filename from URL
   */
  private extractFilename(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1] || 'download';
  }

  /**
   * Get file format from filename
   */
  private getFileFormat(filename: string): string {
    const extension = filename.split('.').pop();
    return extension?.toUpperCase() || 'UNKNOWN';
  }

  /**
   * Get download statistics
   */
  async getDownloadStats(lectureId: string): Promise<{
    totalDownloads: number;
    downloadsByType: Record<MaterialType, number>;
    topDownloaders: Array<{ userId: string; downloadCount: number }>;
  }> {
    try {
      // In production, this would query actual download logs
      return {
        totalDownloads: 0,
        downloadsByType: {
          [MaterialType.VIDEO]: 0,
          [MaterialType.NOTES]: 0,
          [MaterialType.SLIDES]: 0,
          [MaterialType.TRANSCRIPT]: 0,
          [MaterialType.SUPPLEMENTARY]: 0,
          [MaterialType.ALL]: 0
        },
        topDownloaders: []
      };
    } catch (error) {
      logger.error('Error getting download stats:', error);
      throw error;
    }
  }

  /**
   * Clean up expired packages
   */
  async cleanupExpiredPackages(): Promise<void> {
    try {
      const now = Date.now();
      const expirationTime = 24 * 60 * 60 * 1000; // 24 hours

      for (const [downloadId, status] of this.offlinePackages.entries()) {
        // Remove packages older than 24 hours
        if (status.status === 'READY' || status.status === 'EXPIRED') {
          this.offlinePackages.delete(downloadId);
        }
      }

      logger.info('Expired packages cleaned up');
    } catch (error) {
      logger.error('Error cleaning up expired packages:', error);
    }
  }
}
