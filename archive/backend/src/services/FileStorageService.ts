/**
 * File Storage Service
 * "Store the scrolls in the cloud, accessible to all who seek wisdom"
 * 
 * Handles file uploads, storage, and retrieval using Supabase Storage
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import {
  FileUploadRequest,
  FileUploadResponse,
  FileType
} from '../types/course.types';

export default class FileStorageService {
  private supabase: SupabaseClient;
  private readonly bucketName = 'course-content';

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      logger.warn('Supabase credentials not configured, file storage will not work');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Upload file to Supabase Storage
   */
  async uploadFile(request: FileUploadRequest): Promise<FileUploadResponse> {
    try {
      logger.info('Uploading file', {
        filename: request.filename,
        type: request.type,
        size: request.file.length
      });

      // Validate file type
      this.validateFileType(request.mimetype, request.type);

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedFilename = this.sanitizeFilename(request.filename);
      const path = this.generateFilePath(request, sanitizedFilename, timestamp);

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(path, request.file, {
          contentType: request.mimetype,
          upsert: false
        });

      if (error) {
        throw new Error(`Supabase upload error: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(path);

      const response: FileUploadResponse = {
        url: urlData.publicUrl,
        filename: sanitizedFilename,
        size: request.file.length,
        mimetype: request.mimetype,
        uploadedAt: new Date()
      };

      logger.info('File uploaded successfully', { url: response.url });

      return response;
    } catch (error) {
      logger.error('Error uploading file:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      logger.info('Deleting file', { filePath });

      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        throw new Error(`Supabase delete error: ${error.message}`);
      }

      logger.info('File deleted successfully', { filePath });
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get signed URL for private file access
   */
  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        throw new Error(`Supabase signed URL error: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      logger.error('Error getting signed URL:', error);
      throw new Error(`Failed to get signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(path: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(path);

      if (error) {
        throw new Error(`Supabase list error: ${error.message}`);
      }

      return data.map(file => file.name);
    } catch (error) {
      logger.error('Error listing files:', error);
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Move file to a new location
   */
  async moveFile(fromPath: string, toPath: string): Promise<void> {
    try {
      logger.info('Moving file', { fromPath, toPath });

      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .move(fromPath, toPath);

      if (error) {
        throw new Error(`Supabase move error: ${error.message}`);
      }

      logger.info('File moved successfully');
    } catch (error) {
      logger.error('Error moving file:', error);
      throw new Error(`Failed to move file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private validateFileType(mimetype: string, expectedType: FileType): void {
    const validMimetypes: Record<FileType, string[]> = {
      VIDEO: ['video/mp4', 'video/webm', 'video/ogg'],
      PDF: ['application/pdf'],
      IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      DOCUMENT: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
      ARCHIVE: ['application/zip', 'application/x-rar-compressed']
    };

    const allowed = validMimetypes[expectedType];
    if (!allowed.includes(mimetype)) {
      throw new Error(`Invalid file type. Expected ${expectedType}, got ${mimetype}`);
    }
  }

  private sanitizeFilename(filename: string): string {
    // Remove special characters and spaces
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  private generateFilePath(request: FileUploadRequest, filename: string, timestamp: number): string {
    const parts: string[] = [];

    // Add entity-specific path
    if (request.courseId) {
      parts.push('courses', request.courseId);
    }
    if (request.moduleId) {
      parts.push('modules', request.moduleId);
    }
    if (request.lectureId) {
      parts.push('lectures', request.lectureId);
    }

    // Add file type directory
    parts.push(request.type.toLowerCase());

    // Add timestamped filename
    const extension = filename.split('.').pop();
    const nameWithoutExt = filename.replace(`.${extension}`, '');
    parts.push(`${nameWithoutExt}_${timestamp}.${extension}`);

    return parts.join('/');
  }
}
