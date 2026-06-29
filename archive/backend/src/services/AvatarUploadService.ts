/**
 * Avatar Upload Service
 * "The LORD does not look at the things people look at" - 1 Samuel 16:7
 */

import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { logger } from '../utils/productionLogger';
import { AvatarUploadRequest, AvatarUploadResponse } from '../types/profile.types';
import { fileStorageService } from './FileStorageService';

const prisma = new PrismaClient();

export class AvatarUploadService {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  private readonly AVATAR_SIZE = 400; // pixels
  private readonly THUMBNAIL_SIZE = 100; // pixels

  /**
   * Upload and process avatar image
   */
  async uploadAvatar(userId: string, request: AvatarUploadRequest): Promise<AvatarUploadResponse> {
    try {
      // Validate file
      this.validateFile(request);

      // Process image
      const processedImage = await this.processImage(request.file);
      const thumbnail = await this.createThumbnail(request.file);

      // Generate unique filenames
      const timestamp = Date.now();
      const avatarFilename = `avatars/${userId}/${timestamp}-avatar.webp`;
      const thumbnailFilename = `avatars/${userId}/${timestamp}-thumbnail.webp`;

      // Upload to storage
      const avatarUrl = await fileStorageService.uploadFile(
        avatarFilename,
        processedImage,
        'image/webp'
      );

      const thumbnailUrl = await fileStorageService.uploadFile(
        thumbnailFilename,
        thumbnail,
        'image/webp'
      );

      // Update user record
      await prisma.user.update({
        where: { id: userId },
        data: {
          avatarUrl,
          updatedAt: new Date()
        }
      });

      // Delete old avatar if exists
      await this.deleteOldAvatar(userId, avatarUrl);

      logger.info('Avatar uploaded successfully', { userId, avatarUrl });

      return {
        avatarUrl,
        thumbnailUrl,
        uploadedAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to upload avatar', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Delete user avatar
   */
  async deleteAvatar(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true }
      });

      if (!user || !user.avatarUrl) {
        return;
      }

      // Delete from storage
      await fileStorageService.deleteFile(user.avatarUrl);

      // Update user record
      await prisma.user.update({
        where: { id: userId },
        data: {
          avatarUrl: null,
          updatedAt: new Date()
        }
      });

      logger.info('Avatar deleted successfully', { userId });
    } catch (error) {
      logger.error('Failed to delete avatar', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(request: AvatarUploadRequest): void {
    // Check file size
    if (request.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Check file type
    if (!this.ALLOWED_TYPES.includes(request.mimetype)) {
      throw new Error(`Invalid file type. Allowed types: ${this.ALLOWED_TYPES.join(', ')}`);
    }

    // Check if file buffer exists
    if (!request.file || request.file.length === 0) {
      throw new Error('No file data provided');
    }
  }

  /**
   * Process image (resize, optimize, convert to WebP)
   */
  private async processImage(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(this.AVATAR_SIZE, this.AVATAR_SIZE, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 85 })
        .toBuffer();
    } catch (error) {
      logger.error('Failed to process image', { error: error.message });
      throw new Error('Failed to process image');
    }
  }

  /**
   * Create thumbnail
   */
  private async createThumbnail(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(this.THUMBNAIL_SIZE, this.THUMBNAIL_SIZE, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 80 })
        .toBuffer();
    } catch (error) {
      logger.error('Failed to create thumbnail', { error: error.message });
      throw new Error('Failed to create thumbnail');
    }
  }

  /**
   * Delete old avatar files
   */
  private async deleteOldAvatar(userId: string, newAvatarUrl: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true }
      });

      if (user && user.avatarUrl && user.avatarUrl !== newAvatarUrl) {
        await fileStorageService.deleteFile(user.avatarUrl);
        logger.info('Old avatar deleted', { userId, oldAvatarUrl: user.avatarUrl });
      }
    } catch (error) {
      logger.error('Failed to delete old avatar', { error: error.message, userId });
      // Don't throw - this is a cleanup operation
    }
  }

  /**
   * Get avatar URL
   */
  async getAvatarUrl(userId: string): Promise<string | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true }
      });

      return user?.avatarUrl || null;
    } catch (error) {
      logger.error('Failed to get avatar URL', { error: error.message, userId });
      throw error;
    }
  }
}

export const avatarUploadService = new AvatarUploadService();
