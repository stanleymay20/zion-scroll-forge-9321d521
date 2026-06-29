/**
 * Data Export Service (GDPR Compliance)
 * "The truth will set you free" - John 8:32
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/productionLogger';
import {
  DataExportRequest,
  DataExportResponse,
  GDPRComplianceData
} from '../types/profile.types';

const prisma = new PrismaClient();

export class DataExportService {
  /**
   * Request data export
   */
  async requestDataExport(request: DataExportRequest): Promise<DataExportResponse> {
    try {
      const { userId, format } = request;

      // Create export record
      const exportRecord = await prisma.dataExport.create({
        data: {
          userId,
          format,
          status: 'pending',
          includePersonalInfo: request.includePersonalInfo,
          includeAcademicRecords: request.includeAcademicRecords,
          includeSpiritualFormation: request.includeSpiritualFormation,
          includeCommunityActivity: request.includeCommunityActivity,
          includeFinancialData: request.includeFinancialData,
          createdAt: new Date()
        }
      });

      // Start export process asynchronously
      this.processDataExport(exportRecord.id, request).catch(error => {
        logger.error('Data export processing failed', { error: error.message, exportId: exportRecord.id });
      });

      logger.info('Data export requested', { userId, exportId: exportRecord.id, format });

      return {
        exportId: exportRecord.id,
        status: 'pending',
        createdAt: exportRecord.createdAt
      };
    } catch (error) {
      logger.error('Failed to request data export', { error: error.message, userId: request.userId });
      throw error;
    }
  }

  /**
   * Get export status
   */
  async getExportStatus(exportId: string): Promise<DataExportResponse> {
    try {
      const exportRecord = await prisma.dataExport.findUnique({
        where: { id: exportId }
      });

      if (!exportRecord) {
        throw new Error('Export not found');
      }

      return {
        exportId: exportRecord.id,
        status: exportRecord.status as any,
        downloadUrl: exportRecord.downloadUrl,
        expiresAt: exportRecord.expiresAt,
        fileSize: exportRecord.fileSize,
        createdAt: exportRecord.createdAt
      };
    } catch (error) {
      logger.error('Failed to get export status', { error: error.message, exportId });
      throw error;
    }
  }

  /**
   * Process data export
   */
  private async processDataExport(exportId: string, request: DataExportRequest): Promise<void> {
    try {
      // Update status to processing
      await prisma.dataExport.update({
        where: { id: exportId },
        data: { status: 'processing' }
      });

      // Collect data
      const data = await this.collectUserData(request);

      // Generate export file
      const { downloadUrl, fileSize } = await this.generateExportFile(data, request.format);

      // Update export record
      await prisma.dataExport.update({
        where: { id: exportId },
        data: {
          status: 'completed',
          downloadUrl,
          fileSize,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      logger.info('Data export completed', { exportId, fileSize });
    } catch (error) {
      logger.error('Data export processing failed', { error: error.message, exportId });

      await prisma.dataExport.update({
        where: { id: exportId },
        data: { status: 'failed' }
      });
    }
  }

  /**
   * Collect user data
   */
  private async collectUserData(request: DataExportRequest): Promise<any> {
    const { userId } = request;
    const data: any = {};

    try {
      // Personal Information
      if (request.includePersonalInfo) {
        data.personalInfo = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            bio: true,
            dateOfBirth: true,
            phoneNumber: true,
            location: true,
            avatarUrl: true,
            createdAt: true,
            updatedAt: true
          }
        });

        data.preferences = await prisma.userPreferences.findUnique({
          where: { userId }
        });

        data.privacySettings = await prisma.privacySettings.findUnique({
          where: { userId }
        });
      }

      // Academic Records
      if (request.includeAcademicRecords) {
        data.enrollments = await prisma.enrollment.findMany({
          where: { userId },
          include: {
            course: {
              select: {
                title: true,
                description: true,
                faculty: true
              }
            }
          }
        });

        data.assignments = await prisma.assignmentSubmission.findMany({
          where: { userId },
          include: {
            assignment: {
              select: {
                title: true,
                description: true
              }
            }
          }
        });

        data.grades = await prisma.grade.findMany({
          where: { userId }
        });
      }

      // Spiritual Formation
      if (request.includeSpiritualFormation) {
        data.prayerJournal = await prisma.prayerEntry.findMany({
          where: { userId }
        });

        data.scriptureMemory = await prisma.scriptureMemoryProgress.findMany({
          where: { userId }
        });

        data.propheticCheckIns = await prisma.propheticCheckIn.findMany({
          where: { userId }
        });

        data.devotions = await prisma.devotionCompletion.findMany({
          where: { userId }
        });
      }

      // Community Activity
      if (request.includeCommunityActivity) {
        data.posts = await prisma.post.findMany({
          where: { authorId: userId }
        });

        data.comments = await prisma.comment.findMany({
          where: { userId }
        });

        data.messages = await prisma.message.findMany({
          where: { senderId: userId }
        });

        data.studyGroups = await prisma.studyGroupMember.findMany({
          where: { userId },
          include: {
            studyGroup: {
              select: {
                name: true,
                description: true
              }
            }
          }
        });
      }

      // Financial Data
      if (request.includeFinancialData) {
        data.payments = await prisma.payment.findMany({
          where: { userId }
        });

        data.scrollCoinTransactions = await prisma.scrollCoinTransaction.findMany({
          where: { userId }
        });

        data.scholarships = await prisma.scholarshipApplication.findMany({
          where: { userId }
        });
      }

      return data;
    } catch (error) {
      logger.error('Failed to collect user data', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Generate export file
   */
  private async generateExportFile(
    data: any,
    format: 'json' | 'csv' | 'pdf'
  ): Promise<{ downloadUrl: string; fileSize: number }> {
    try {
      let fileContent: string | Buffer;
      let contentType: string;

      switch (format) {
        case 'json':
          fileContent = JSON.stringify(data, null, 2);
          contentType = 'application/json';
          break;

        case 'csv':
          fileContent = this.convertToCSV(data);
          contentType = 'text/csv';
          break;

        case 'pdf':
          fileContent = await this.convertToPDF(data);
          contentType = 'application/pdf';
          break;

        default:
          throw new Error('Unsupported format');
      }

      // In production, upload to storage service (S3, Supabase Storage, etc.)
      // For now, we'll simulate the upload
      const downloadUrl = `https://storage.scrolluniversity.com/exports/${Date.now()}.${format}`;
      const fileSize = Buffer.byteLength(fileContent);

      logger.info('Export file generated', { format, fileSize });

      return { downloadUrl, fileSize };
    } catch (error) {
      logger.error('Failed to generate export file', { error: error.message, format });
      throw error;
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any): string {
    // Simple CSV conversion - in production, use a proper CSV library
    const sections: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length > 0) {
        sections.push(`\n${key.toUpperCase()}\n`);
        const headers = Object.keys(value[0]).join(',');
        sections.push(headers);

        for (const item of value) {
          const row = Object.values(item).map(v => 
            typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v
          ).join(',');
          sections.push(row);
        }
      }
    }

    return sections.join('\n');
  }

  /**
   * Convert data to PDF format
   */
  private async convertToPDF(data: any): Promise<Buffer> {
    // In production, use a PDF library like pdfkit or puppeteer
    // For now, return a placeholder
    return Buffer.from('PDF content would be generated here');
  }

  /**
   * Get GDPR compliance data
   */
  async getGDPRComplianceData(userId: string): Promise<GDPRComplianceData> {
    try {
      return {
        userId,
        dataCollected: [
          {
            category: 'Personal Information',
            description: 'Basic profile and contact information',
            dataPoints: ['name', 'email', 'phone', 'date of birth', 'location'],
            sensitive: false
          },
          {
            category: 'Academic Records',
            description: 'Course enrollments, grades, and assignments',
            dataPoints: ['enrollments', 'grades', 'assignments', 'transcripts'],
            sensitive: false
          },
          {
            category: 'Spiritual Formation',
            description: 'Prayer journal, scripture memory, and spiritual growth',
            dataPoints: ['prayer entries', 'scripture progress', 'prophetic check-ins'],
            sensitive: true
          },
          {
            category: 'Financial Data',
            description: 'Payment history and ScrollCoin transactions',
            dataPoints: ['payments', 'scrollcoin transactions', 'scholarships'],
            sensitive: true
          }
        ],
        dataProcessingPurposes: [
          'Service delivery and platform functionality',
          'Academic progress tracking and reporting',
          'Personalized learning recommendations',
          'Communication and support',
          'Analytics and platform improvement'
        ],
        dataRetentionPeriod: '7 years after account closure or as required by law',
        thirdPartySharing: [
          {
            party: 'Payment Processors (Stripe)',
            purpose: 'Payment processing',
            dataShared: ['name', 'email', 'payment information'],
            userConsent: true
          },
          {
            party: 'Email Service Provider',
            purpose: 'Transactional and marketing emails',
            dataShared: ['name', 'email'],
            userConsent: true
          }
        ],
        userRights: [
          {
            right: 'Right to Access',
            description: 'Request a copy of your personal data',
            howToExercise: 'Use the data export feature in your account settings'
          },
          {
            right: 'Right to Rectification',
            description: 'Correct inaccurate personal data',
            howToExercise: 'Update your profile information in account settings'
          },
          {
            right: 'Right to Erasure',
            description: 'Request deletion of your personal data',
            howToExercise: 'Use the account deletion feature in account settings'
          },
          {
            right: 'Right to Data Portability',
            description: 'Receive your data in a machine-readable format',
            howToExercise: 'Use the data export feature and select JSON format'
          },
          {
            right: 'Right to Object',
            description: 'Object to processing of your personal data',
            howToExercise: 'Contact privacy@scrolluniversity.com'
          }
        ],
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Failed to get GDPR compliance data', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Delete old exports
   */
  async cleanupExpiredExports(): Promise<void> {
    try {
      const expiredExports = await prisma.dataExport.findMany({
        where: {
          expiresAt: {
            lt: new Date()
          },
          status: 'completed'
        }
      });

      for (const exportRecord of expiredExports) {
        // Delete file from storage
        // await storageService.deleteFile(exportRecord.downloadUrl);

        // Delete record
        await prisma.dataExport.delete({
          where: { id: exportRecord.id }
        });
      }

      logger.info('Expired exports cleaned up', { count: expiredExports.length });
    } catch (error) {
      logger.error('Failed to cleanup expired exports', { error: error.message });
      // Don't throw - cleanup failure shouldn't break the system
    }
  }
}

export const dataExportService = new DataExportService();
