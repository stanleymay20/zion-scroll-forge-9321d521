/**
 * ScrollUniversity Admissions - Document Processor
 * "Many are called, but few are chosen" - Matthew 22:14
 * 
 * Document upload, validation, and storage system
 */

import { logger } from '../../utils/logger';
import crypto from 'crypto';
import path from 'path';

export interface DocumentUploadData {
  applicationId: string;
  documentType: string;
  fileName: string;
  fileData: string; // Base64 encoded file data
  fileSize: number;
  uploadedBy: string;
}

export interface ProcessedDocument {
  id: string;
  applicationId: string;
  documentType: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  storageUrl: string;
  checksum: string;
  uploadedBy: string;
  uploadedAt: Date;
  validationStatus: 'PENDING' | 'VALID' | 'INVALID';
  validationErrors: string[];
  metadata: any;
}

export class DocumentProcessor {
  private readonly allowedDocumentTypes = [
    'TRANSCRIPT',
    'DIPLOMA',
    'RECOMMENDATION_LETTER',
    'PERSONAL_STATEMENT',
    'SPIRITUAL_TESTIMONY',
    'IDENTIFICATION',
    'PORTFOLIO',
    'CERTIFICATE',
    'OTHER'
  ];

  private readonly allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  /**
   * Process and validate uploaded document
   */
  async processDocument(data: DocumentUploadData): Promise<ProcessedDocument> {
    try {
      logger.info(`Processing document for application ${data.applicationId}`);

      // Validate document type
      if (!this.allowedDocumentTypes.includes(data.documentType)) {
        throw new Error(`Invalid document type: ${data.documentType}`);
      }

      // Validate file size
      if (data.fileSize > this.maxFileSize) {
        throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize / (1024 * 1024)}MB`);
      }

      // Decode base64 file data
      const fileBuffer = Buffer.from(data.fileData, 'base64');
      
      // Verify actual file size matches reported size
      if (fileBuffer.length !== data.fileSize) {
        throw new Error('File size mismatch');
      }

      // Detect MIME type from file content
      const mimeType = this.detectMimeType(fileBuffer, data.fileName);
      
      // Validate MIME type
      if (!this.allowedMimeTypes.includes(mimeType)) {
        throw new Error(`Invalid file type: ${mimeType}`);
      }

      // Generate unique file ID and checksum
      const documentId = crypto.randomUUID();
      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Generate secure file name
      const fileExtension = path.extname(data.fileName);
      const secureFileName = `${documentId}${fileExtension}`;

      // Store file (in production, this would be AWS S3, Azure Blob, etc.)
      const storageUrl = await this.storeFile(fileBuffer, secureFileName, data.applicationId);

      // Validate document content
      const validationResult = await this.validateDocumentContent(fileBuffer, mimeType, data.documentType);

      // Extract metadata
      const metadata = await this.extractMetadata(fileBuffer, mimeType);

      const processedDocument: ProcessedDocument = {
        id: documentId,
        applicationId: data.applicationId,
        documentType: data.documentType,
        fileName: secureFileName,
        originalFileName: data.fileName,
        fileSize: data.fileSize,
        mimeType,
        storageUrl,
        checksum,
        uploadedBy: data.uploadedBy,
        uploadedAt: new Date(),
        validationStatus: validationResult.isValid ? 'VALID' : 'INVALID',
        validationErrors: validationResult.errors,
        metadata
      };

      logger.info(`Document processed successfully: ${documentId}`);
      return processedDocument;

    } catch (error) {
      logger.error('Error processing document:', error);
      throw error;
    }
  }

  /**
   * Detect MIME type from file content and extension
   */
  private detectMimeType(fileBuffer: Buffer, fileName: string): string {
    const extension = path.extname(fileName).toLowerCase();
    
    // Check file signature (magic numbers)
    const signature = fileBuffer.subarray(0, 8);
    
    // PDF
    if (signature.subarray(0, 4).toString() === '%PDF') {
      return 'application/pdf';
    }
    
    // JPEG
    if (signature[0] === 0xFF && signature[1] === 0xD8 && signature[2] === 0xFF) {
      return 'image/jpeg';
    }
    
    // PNG
    if (signature.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
      return 'image/png';
    }
    
    // GIF
    if (signature.subarray(0, 6).toString() === 'GIF87a' || signature.subarray(0, 6).toString() === 'GIF89a') {
      return 'image/gif';
    }
    
    // DOCX (ZIP-based)
    if (signature.subarray(0, 4).equals(Buffer.from([0x50, 0x4B, 0x03, 0x04]))) {
      if (extension === '.docx') {
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }
    }
    
    // DOC
    if (signature.subarray(0, 8).equals(Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]))) {
      return 'application/msword';
    }
    
    // Fallback to extension-based detection
    switch (extension) {
      case '.pdf': return 'application/pdf';
      case '.jpg':
      case '.jpeg': return 'image/jpeg';
      case '.png': return 'image/png';
      case '.gif': return 'image/gif';
      case '.doc': return 'application/msword';
      case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case '.txt': return 'text/plain';
      default: throw new Error(`Unsupported file type: ${extension}`);
    }
  }

  /**
   * Store file in secure storage
   */
  private async storeFile(fileBuffer: Buffer, fileName: string, applicationId: string): Promise<string> {
    try {
      // In production, this would integrate with cloud storage (AWS S3, Azure Blob, etc.)
      // For now, we'll simulate storage and return a URL
      
      const storagePath = `admissions/applications/${applicationId}/documents/${fileName}`;
      
      // TODO: Implement actual file storage
      // await cloudStorage.upload(fileBuffer, storagePath);
      
      // Return simulated storage URL
      const baseUrl = process.env.DOCUMENT_STORAGE_URL || 'https://storage.scrolluniversity.edu';
      return `${baseUrl}/${storagePath}`;

    } catch (error) {
      logger.error('Error storing file:', error);
      throw new Error('Failed to store document');
    }
  }

  /**
   * Validate document content based on type
   */
  private async validateDocumentContent(
    fileBuffer: Buffer, 
    mimeType: string, 
    documentType: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    let isValid = true;

    try {
      // Basic file integrity checks
      if (fileBuffer.length === 0) {
        errors.push('File is empty');
        isValid = false;
      }

      // PDF-specific validation
      if (mimeType === 'application/pdf') {
        const pdfValidation = this.validatePDF(fileBuffer);
        if (!pdfValidation.isValid) {
          errors.push(...pdfValidation.errors);
          isValid = false;
        }
      }

      // Image-specific validation
      if (mimeType.startsWith('image/')) {
        const imageValidation = this.validateImage(fileBuffer, mimeType);
        if (!imageValidation.isValid) {
          errors.push(...imageValidation.errors);
          isValid = false;
        }
      }

      // Document type-specific validation
      switch (documentType) {
        case 'TRANSCRIPT':
          if (!mimeType.includes('pdf') && !mimeType.includes('image')) {
            errors.push('Transcripts must be in PDF or image format');
            isValid = false;
          }
          break;
        
        case 'IDENTIFICATION':
          if (!mimeType.includes('image') && !mimeType.includes('pdf')) {
            errors.push('Identification documents must be in image or PDF format');
            isValid = false;
          }
          break;
        
        case 'PERSONAL_STATEMENT':
        case 'SPIRITUAL_TESTIMONY':
          if (!mimeType.includes('pdf') && !mimeType.includes('word') && !mimeType.includes('text')) {
            errors.push('Text documents must be in PDF, Word, or text format');
            isValid = false;
          }
          break;
      }

      return { isValid, errors };

    } catch (error) {
      logger.error('Error validating document content:', error);
      return { isValid: false, errors: ['Document validation failed'] };
    }
  }

  /**
   * Validate PDF file
   */
  private validatePDF(fileBuffer: Buffer): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    let isValid = true;

    // Check PDF header
    if (!fileBuffer.subarray(0, 4).toString().startsWith('%PDF')) {
      errors.push('Invalid PDF header');
      isValid = false;
    }

    // Check for PDF trailer
    const fileContent = fileBuffer.toString('binary');
    if (!fileContent.includes('%%EOF')) {
      errors.push('PDF file appears to be corrupted (missing EOF marker)');
      isValid = false;
    }

    // Check minimum file size (empty PDF is around 100 bytes)
    if (fileBuffer.length < 100) {
      errors.push('PDF file appears to be too small or corrupted');
      isValid = false;
    }

    return { isValid, errors };
  }

  /**
   * Validate image file
   */
  private validateImage(fileBuffer: Buffer, mimeType: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    let isValid = true;

    // Check minimum dimensions and file size
    if (fileBuffer.length < 1000) {
      errors.push('Image file appears to be too small');
      isValid = false;
    }

    // Additional format-specific checks could be added here
    // For now, we rely on MIME type detection

    return { isValid, errors };
  }

  /**
   * Extract metadata from document
   */
  private async extractMetadata(fileBuffer: Buffer, mimeType: string): Promise<any> {
    const metadata: any = {
      fileSize: fileBuffer.length,
      mimeType,
      extractedAt: new Date().toISOString()
    };

    try {
      // PDF metadata extraction
      if (mimeType === 'application/pdf') {
        // Basic PDF info extraction
        const content = fileBuffer.toString('binary');
        
        // Extract creation date if present
        const creationDateMatch = content.match(/\/CreationDate\s*\(([^)]+)\)/);
        if (creationDateMatch) {
          metadata.creationDate = creationDateMatch[1];
        }
        
        // Extract title if present
        const titleMatch = content.match(/\/Title\s*\(([^)]+)\)/);
        if (titleMatch) {
          metadata.title = titleMatch[1];
        }
        
        // Extract author if present
        const authorMatch = content.match(/\/Author\s*\(([^)]+)\)/);
        if (authorMatch) {
          metadata.author = authorMatch[1];
        }
      }

      // Image metadata extraction
      if (mimeType.startsWith('image/')) {
        // Basic image info
        metadata.imageType = mimeType.split('/')[1];
        
        // For JPEG, extract basic EXIF data if present
        if (mimeType === 'image/jpeg') {
          const exifMarker = fileBuffer.indexOf(Buffer.from([0xFF, 0xE1]));
          if (exifMarker !== -1) {
            metadata.hasExifData = true;
          }
        }
      }

      return metadata;

    } catch (error) {
      logger.error('Error extracting metadata:', error);
      return metadata;
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string): Promise<ProcessedDocument | null> {
    try {
      // In a real implementation, this would query a database
      // For now, we'll return null as documents are stored in application records
      return null;
    } catch (error) {
      logger.error('Error retrieving document:', error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      logger.info(`Deleting document ${documentId}`);
      
      // In production, this would delete from cloud storage
      // TODO: Implement actual file deletion
      // await cloudStorage.delete(documentPath);
      
      logger.info(`Document deleted successfully: ${documentId}`);
      return true;

    } catch (error) {
      logger.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Validate document authenticity (fraud detection)
   */
  async validateDocumentAuthenticity(document: ProcessedDocument): Promise<{
    isAuthentic: boolean;
    confidence: number;
    flags: string[];
  }> {
    try {
      const flags: string[] = [];
      let confidence = 1.0;

      // Basic fraud detection checks
      
      // Check for duplicate checksums (same document uploaded multiple times)
      // This would require database integration
      
      // Check file metadata for suspicious patterns
      if (document.metadata.creationDate) {
        const creationDate = new Date(document.metadata.creationDate);
        const now = new Date();
        
        // Flag documents created in the future
        if (creationDate > now) {
          flags.push('Document creation date is in the future');
          confidence -= 0.2;
        }
        
        // Flag very recent documents for transcripts/diplomas
        if (document.documentType === 'TRANSCRIPT' || document.documentType === 'DIPLOMA') {
          const daysSinceCreation = (now.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceCreation < 1) {
            flags.push('Academic document created very recently');
            confidence -= 0.1;
          }
        }
      }

      // Check file size patterns
      if (document.fileSize < 10000 && document.documentType === 'TRANSCRIPT') {
        flags.push('Transcript file size is unusually small');
        confidence -= 0.1;
      }

      const isAuthentic = confidence > 0.7 && flags.length < 3;

      return {
        isAuthentic,
        confidence: Math.max(0, confidence),
        flags
      };

    } catch (error) {
      logger.error('Error validating document authenticity:', error);
      return {
        isAuthentic: false,
        confidence: 0,
        flags: ['Authentication validation failed']
      };
    }
  }
}