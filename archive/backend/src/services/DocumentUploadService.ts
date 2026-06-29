/**
 * ScrollUniversity Document Upload and Verification Service
 * "Test all things; hold fast what is good" - 1 Thessalonians 5:21
 * 
 * Handles document uploads, storage, and verification for admissions
 */

import { PrismaClient, DocumentType, FraudRiskLevel } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  DocumentUploadRequest,
  DocumentUploadResult,
  DocumentVerificationRequest,
  DocumentVerificationResult,
  ApplicationDocument
} from '../types/admissions.types';
import { AdmissionsAIService } from './AdmissionsAIService';

const prisma = new PrismaClient();

export class DocumentUploadService {
  private admissionsAI: AdmissionsAIService;

  constructor() {
    this.admissionsAI = new AdmissionsAIService();
  }

  /**
   * Upload document for application
   */
  async uploadDocument(request: DocumentUploadRequest): Promise<DocumentUploadResult> {
    try {
      logger.info(`Uploading ${request.documentType} for application ${request.applicationId}`);

      // Validate file
      this.validateFile(request);

      // Generate document ID
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // In production, upload to Supabase Storage or S3
      // For now, simulate upload
      const documentUrl = `https://storage.scrolluniversity.com/admissions/${request.applicationId}/${documentId}`;

      // Create document verification record
      await prisma.documentVerification.create({
        data: {
          id: documentId,
          applicationId: request.applicationId,
          documentType: request.documentType,
          documentUrl,
          uploadedAt: new Date()
        }
      });

      // Update application documents
      const application = await prisma.application.findUnique({
        where: { id: request.applicationId }
      });

      if (application) {
        const documents = JSON.parse(application.documents as string || '[]');
        documents.push({
          id: documentId,
          type: request.documentType,
          url: documentUrl,
          fileName: request.fileName,
          uploadedAt: new Date()
        });

        await prisma.application.update({
          where: { id: request.applicationId },
          data: {
            documents: JSON.stringify(documents)
          }
        });
      }

      const result: DocumentUploadResult = {
        documentId,
        documentUrl,
        uploadedAt: new Date(),
        verificationStatus: 'pending'
      };

      logger.info(`Document uploaded successfully: ${documentId}`);

      // Trigger async verification
      this.verifyDocumentAsync(documentId, request.documentType, documentUrl, request.applicationId);

      return result;

    } catch (error) {
      logger.error('Error uploading document:', error);
      throw new Error(`Failed to upload document: ${(error as Error).message}`);
    }
  }

  /**
   * Verify document authenticity
   */
  async verifyDocument(request: DocumentVerificationRequest): Promise<DocumentVerificationResult> {
    try {
      logger.info(`Verifying document ${request.documentId}`);

      // Use AI service to extract and verify document
      const extractionResult = await this.admissionsAI.extractDocumentData({
        documentId: request.documentId,
        documentType: request.documentType as any,
        documentUrl: request.documentUrl,
        applicationId: request.applicationId
      });

      // Perform fraud detection
      const fraudRiskLevel = this.assessFraudRisk(extractionResult);

      // Determine authenticity
      const isAuthentic = extractionResult.confidence > 70 && fraudRiskLevel !== FraudRiskLevel.HIGH;

      const result: DocumentVerificationResult = {
        documentId: request.documentId,
        isAuthentic,
        verificationScore: extractionResult.confidence,
        fraudRiskLevel,
        verificationMethod: 'AI_ANALYSIS',
        flaggedIssues: extractionResult.validationErrors,
        verifiedAt: new Date(),
        verificationNotes: isAuthentic 
          ? 'Document verified successfully' 
          : 'Document requires manual review'
      };

      // Update verification record
      await prisma.documentVerification.update({
        where: { id: request.documentId },
        data: {
          isAuthentic,
          verificationScore: extractionResult.confidence,
          fraudRiskLevel,
          verificationMethod: 'AI_ANALYSIS',
          flaggedIssues: JSON.stringify(extractionResult.validationErrors),
          verifiedAt: new Date(),
          verificationNotes: result.verificationNotes
        }
      });

      logger.info(`Document verification completed: ${request.documentId} - ${isAuthentic ? 'VERIFIED' : 'FLAGGED'}`);

      return result;

    } catch (error) {
      logger.error('Error verifying document:', error);
      throw new Error(`Failed to verify document: ${(error as Error).message}`);
    }
  }

  /**
   * Get documents for application
   */
  async getApplicationDocuments(applicationId: string): Promise<ApplicationDocument[]> {
    try {
      const verifications = await prisma.documentVerification.findMany({
        where: { applicationId }
      });

      const documents: ApplicationDocument[] = verifications.map(verification => ({
        id: verification.id,
        applicationId: verification.applicationId,
        documentType: verification.documentType,
        documentUrl: verification.documentUrl,
        fileName: `${verification.documentType}_${verification.id}`,
        fileSize: 0, // Would be stored in actual implementation
        uploadedAt: verification.uploadedAt,
        verificationStatus: verification.isAuthentic === null 
          ? 'pending' 
          : verification.isAuthentic 
            ? 'verified' 
            : 'rejected',
        verificationResult: verification.isAuthentic !== null ? {
          documentId: verification.id,
          isAuthentic: verification.isAuthentic,
          verificationScore: verification.verificationScore || 0,
          fraudRiskLevel: verification.fraudRiskLevel || FraudRiskLevel.LOW,
          verificationMethod: verification.verificationMethod || 'AI_ANALYSIS',
          flaggedIssues: JSON.parse(verification.flaggedIssues as string || '[]'),
          verifiedAt: verification.verifiedAt || new Date(),
          verificationNotes: verification.verificationNotes
        } : undefined
      }));

      return documents;

    } catch (error) {
      logger.error('Error fetching application documents:', error);
      throw new Error(`Failed to fetch application documents: ${(error as Error).message}`);
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      logger.info(`Deleting document ${documentId}`);

      // Delete from storage (in production)
      // await storageService.delete(documentUrl);

      // Delete verification record
      await prisma.documentVerification.delete({
        where: { id: documentId }
      });

      logger.info(`Document deleted successfully: ${documentId}`);

    } catch (error) {
      logger.error('Error deleting document:', error);
      throw new Error(`Failed to delete document: ${(error as Error).message}`);
    }
  }

  // Private helper methods

  private validateFile(request: DocumentUploadRequest): void {
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (request.fileSize > maxSize) {
      throw new Error('File size exceeds maximum allowed size of 10MB');
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(request.mimeType)) {
      throw new Error('File type not allowed. Please upload PDF, JPEG, PNG, or Word documents');
    }
  }

  private assessFraudRisk(extractionResult: any): FraudRiskLevel {
    // Simple fraud risk assessment based on confidence
    if (extractionResult.confidence < 50) {
      return FraudRiskLevel.HIGH;
    } else if (extractionResult.confidence < 70) {
      return FraudRiskLevel.MEDIUM;
    } else {
      return FraudRiskLevel.LOW;
    }
  }

  private async verifyDocumentAsync(
    documentId: string,
    documentType: DocumentType,
    documentUrl: string,
    applicationId: string
  ): Promise<void> {
    try {
      // Perform verification asynchronously
      await this.verifyDocument({
        documentId,
        documentType,
        documentUrl,
        applicationId
      });
    } catch (error) {
      logger.error('Error in async document verification:', error);
    }
  }
}

export default DocumentUploadService;
