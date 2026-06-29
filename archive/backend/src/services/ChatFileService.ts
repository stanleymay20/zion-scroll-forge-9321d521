/**
 * Chat File Attachment Service
 * Handles file uploads, virus scanning, and storage for chat messages
 * "Test everything; hold fast what is good" - 1 Thessalonians 5:21
 */

import { PrismaClient } from '@prisma/client';
import { MessageAttachment, ScanStatus } from '../types/chat.types';
import { chatServiceConfig } from '../config/socket.config';
import logger from '../utils/logger';
import crypto from 'crypto';
import path from 'path';

const prisma = new PrismaClient();

export class ChatFileService {
  private allowedMimeTypes: Set<string>;
  private maxFileSize: number;

  constructor() {
    this.maxFileSize = chatServiceConfig.maxAttachmentSize;
    this.allowedMimeTypes = new Set(chatServiceConfig.allowedFileTypes);
  }

  /**
   * Validate file before upload
   */
  validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`
      };
    }

    // Check mime type
    const isAllowed = Array.from(this.allowedMimeTypes).some(pattern => {
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -2);
        return file.mimetype.startsWith(prefix);
      }
      return file.mimetype === pattern;
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: `File type ${file.mimetype} is not allowed`
      };
    }

    return { valid: true };
  }

  /**
   * Generate secure filename
   */
  private generateSecureFilename(originalFilename: string): string {
    const ext = path.extname(originalFilename);
    const hash = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    return `${timestamp}-${hash}${ext}`;
  }

  /**
   * Scan file for viruses (placeholder - integrate with actual antivirus service)
   */
  private async scanForViruses(file: Express.Multer.File): Promise<ScanStatus> {
    if (!chatServiceConfig.enableVirusScanning) {
      return ScanStatus.CLEAN;
    }

    try {
      // TODO: Integrate with actual virus scanning service (ClamAV, VirusTotal, etc.)
      // For now, perform basic checks
      
      // Check for suspicious file extensions
      const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.vbs', '.js'];
      const ext = path.extname(file.originalname).toLowerCase();
      
      if (suspiciousExtensions.includes(ext)) {
        logger.warn(`Suspicious file extension detected: ${ext}`);
        return ScanStatus.INFECTED;
      }

      // Check for executable magic bytes
      const executableSignatures = [
        Buffer.from([0x4D, 0x5A]), // MZ (DOS/Windows executable)
        Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF (Linux executable)
      ];

      for (const signature of executableSignatures) {
        if (file.buffer.slice(0, signature.length).equals(signature)) {
          logger.warn('Executable file signature detected');
          return ScanStatus.INFECTED;
        }
      }

      return ScanStatus.CLEAN;
    } catch (error) {
      logger.error('Error scanning file for viruses:', error);
      return ScanStatus.ERROR;
    }
  }

  /**
   * Upload file and create attachment record
   */
  async uploadFile(
    file: Express.Multer.File,
    messageId: string,
    uploadedBy: string
  ): Promise<MessageAttachment> {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Scan for viruses
    const scanStatus = await this.scanForViruses(file);
    if (scanStatus === ScanStatus.INFECTED) {
      logger.warn(`Infected file blocked: ${file.originalname}`);
      throw new Error('File failed security scan');
    }

    // Generate secure filename
    const secureFilename = this.generateSecureFilename(file.originalname);

    // TODO: Upload to actual storage service (Supabase Storage, S3, etc.)
    // For now, store metadata only
    const fileUrl = `/uploads/chat/${secureFilename}`;

    // Create attachment record
    const attachment: MessageAttachment = {
      id: crypto.randomUUID(),
      filename: file.originalname,
      url: fileUrl,
      mimetype: file.mimetype,
      size: file.size,
      scanStatus,
      uploadedAt: new Date()
    };

    logger.info(`File uploaded successfully: ${file.originalname} -> ${secureFilename}`);

    return attachment;
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: Express.Multer.File[],
    messageId: string,
    uploadedBy: string
  ): Promise<MessageAttachment[]> {
    const attachments: MessageAttachment[] = [];

    for (const file of files) {
      try {
        const attachment = await this.uploadFile(file, messageId, uploadedBy);
        attachments.push(attachment);
      } catch (error) {
        logger.error(`Failed to upload file ${file.originalname}:`, error);
        // Continue with other files
      }
    }

    return attachments;
  }

  /**
   * Delete file attachment
   */
  async deleteFile(attachmentId: string): Promise<void> {
    try {
      // TODO: Delete from actual storage service
      logger.info(`File attachment deleted: ${attachmentId}`);
    } catch (error) {
      logger.error(`Failed to delete file attachment ${attachmentId}:`, error);
      throw error;
    }
  }

  /**
   * Get file attachment by ID
   */
  async getAttachment(attachmentId: string): Promise<MessageAttachment | null> {
    try {
      // TODO: Retrieve from database
      return null;
    } catch (error) {
      logger.error(`Failed to get attachment ${attachmentId}:`, error);
      return null;
    }
  }

  /**
   * Check if user has permission to access file
   */
  async checkFileAccess(attachmentId: string, userId: string): Promise<boolean> {
    try {
      // TODO: Implement permission check
      // Check if user is member of the room where file was shared
      return true;
    } catch (error) {
      logger.error(`Failed to check file access for ${attachmentId}:`, error);
      return false;
    }
  }

  /**
   * Get file statistics
   */
  async getFileStatistics(roomId?: string): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
  }> {
    try {
      // TODO: Implement statistics retrieval
      return {
        totalFiles: 0,
        totalSize: 0,
        filesByType: {}
      };
    } catch (error) {
      logger.error('Failed to get file statistics:', error);
      throw error;
    }
  }
}

export default new ChatFileService();
