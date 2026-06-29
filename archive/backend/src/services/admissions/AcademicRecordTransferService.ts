/**
 * ScrollUniversity Admissions - Academic Record Transfer Service
 * "Every good gift and every perfect gift is from above" - James 1:17
 * 
 * Handles transfer and initialization of academic records for admitted students
 * ensuring comprehensive tracking of educational journey and achievements
 */

import { PrismaClient, Application, User, AcademicLevel } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface PreviousEducationRecord {
  institutionName: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate: Date;
  endDate?: Date;
  gpa?: number;
  creditsEarned?: number;
  transcriptVerified: boolean;
  documents: string[];
}

export interface AcademicTransferData {
  applicationId: string;
  userId: string;
  previousEducation: PreviousEducationRecord[];
  academicEvaluations: any[];
  spiritualEvaluations: any[];
  transcriptData: any;
}

export interface TransferResult {
  transcriptId: string;
  creditsTransferred: number;
  academicLevel: AcademicLevel;
  supportNeeds: any[];
  recommendations: string[];
}

export class AcademicRecordTransferService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Transfer academic records from application to student profile
   */
  async transferAcademicRecords(data: AcademicTransferData): Promise<TransferResult> {
    try {
      logger.info(`Transferring academic records for application ${data.applicationId}`);

      // Get application with evaluations
      const application = await this.prisma.applications.findUnique({
        where: { id: data.applicationId },
        include: {
          academicEvaluations: true,
          spiritualEvaluations: true
        }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      // Create ScrollTranscript record
      const transcript = await this.createScrollTranscript(data, application);

      // Process previous education records
      const creditsTransferred = await this.processPreviousEducation(
        data.previousEducation, 
        transcript.id
      );

      // Determine academic level and support needs
      const academicLevel = this.determineAcademicLevel(application.academicEvaluations);
      const supportNeeds = this.extractSupportNeeds(application.academicEvaluations);

      // Generate recommendations
      const recommendations = this.generateAcademicRecommendations(
        application.academicEvaluations,
        application.spiritualEvaluations
      );

      logger.info(`Academic records transferred successfully for user ${data.userId}`);

      return {
        transcriptId: transcript.id,
        creditsTransferred,
        academicLevel,
        supportNeeds,
        recommendations
      };

    } catch (error) {
      logger.error('Error transferring academic records:', error);
      throw error;
    }
  }

  /**
   * Create ScrollTranscript record
   */
  private async createScrollTranscript(
    data: AcademicTransferData, 
    application: any
  ): Promise<any> {
    try {
      const transcript = await this.prisma.scrollTranscript.create({
        data: {
          studentId: data.userId,
          institutionId: 'scroll-university',
          accreditationId: 'scroll-accreditation-001',
          gpa: 0.0,
          creditHours: 0,
          courses: data.previousEducation || [],
          scrollXP: 0,
          innovationScore: {},
          propheticDefense: {},
          communityImpact: {},
          blockchainCredentialsJson: [],
          verificationHashes: [],
          researchPublications: [],
          projects: [],
          certifications: []
        }
      });

      return transcript;

    } catch (error) {
      logger.error('Error creating ScrollTranscript:', error);
      throw error;
    }
  }

  /**
   * Process previous education records
   */
  private async processPreviousEducation(
    previousEducation: PreviousEducationRecord[],
    transcriptId: string
  ): Promise<number> {
    let totalCreditsTransferred = 0;

    for (const education of previousEducation) {
      try {
        // Validate and process each education record
        const creditsEarned = education.creditsEarned || 0;
        
        if (education.transcriptVerified && creditsEarned > 0) {
          totalCreditsTransferred += creditsEarned;
        }

        // Log processing
        logger.info(`Processed education record from ${education.institutionName}`, {
          transcriptId,
          creditsEarned,
          verified: education.transcriptVerified
        });

      } catch (error) {
        logger.warn(`Error processing education record from ${education.institutionName}:`, error);
      }
    }

    return totalCreditsTransferred;
  }

  /**
   * Determine academic level based on evaluations
   */
  private determineAcademicLevel(academicEvaluations: any[]): AcademicLevel {
    if (!academicEvaluations || academicEvaluations.length === 0) {
      return AcademicLevel.SCROLL_OPEN;
    }

    const evaluation = academicEvaluations[0];
    return evaluation.recommendedLevel || AcademicLevel.SCROLL_OPEN;
  }

  /**
   * Extract support needs from evaluations
   */
  private extractSupportNeeds(academicEvaluations: any[]): any[] {
    if (!academicEvaluations || academicEvaluations.length === 0) {
      return [];
    }

    const evaluation = academicEvaluations[0];
    return evaluation.supportNeeds || [];
  }

  /**
   * Generate academic recommendations
   */
  private generateAcademicRecommendations(
    academicEvaluations: any[],
    spiritualEvaluations: any[]
  ): string[] {
    const recommendations: string[] = [];

    // Academic recommendations
    if (academicEvaluations && academicEvaluations.length > 0) {
      const academic = academicEvaluations[0];
      
      if (academic.academicReadiness < 0.7) {
        recommendations.push('Consider foundational courses to strengthen academic readiness');
      }
      
      if (academic.supportNeeds && academic.supportNeeds.length > 0) {
        recommendations.push('Academic support services recommended based on assessment');
      }
    }

    // Spiritual recommendations
    if (spiritualEvaluations && spiritualEvaluations.length > 0) {
      const spiritual = spiritualEvaluations[0];
      
      if (spiritual.scrollAlignment < 0.8) {
        recommendations.push('Additional spiritual formation courses recommended');
      }
      
      if (spiritual.callingClarity && spiritual.callingClarity.clarity < 0.7) {
        recommendations.push('Calling discernment sessions recommended');
      }
    }

    return recommendations;
  }

  /**
   * Initialize academic progress tracking
   */
  async initializeAcademicProgress(
    userId: string,
    transcriptId: string,
    academicLevel: AcademicLevel
  ): Promise<void> {
    try {
      // Log academic progress initialization (would be implemented separately)
      logger.info(`Academic progress tracking initialized for user ${userId}`, {
        transcriptId,
        academicLevel
      });

    } catch (error) {
      logger.warn('Error initializing academic progress:', error);
    }
  }

  /**
   * Validate transcript data integrity
   */
  async validateTranscriptData(transcriptId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      const transcript = await this.prisma.scrollTranscript.findUnique({
        where: { id: transcriptId }
      });

      if (!transcript) {
        errors.push('Transcript not found');
        return { isValid: false, errors, warnings };
      }

      // Validate required fields
      if (!transcript.studentId) {
        errors.push('Student ID is required');
      }

      if (!transcript.institutionId) {
        errors.push('Institution ID is required');
      }

      if (!transcript.accreditationId) {
        errors.push('Accreditation ID is required');
      }

      // Validate data consistency
      if (transcript.gpa < 0 || transcript.gpa > 4.0) {
        warnings.push('GPA value appears to be outside normal range');
      }

      if (transcript.creditHours < 0) {
        warnings.push('Credit hours cannot be negative');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      logger.error('Error validating transcript data:', error);
      return {
        isValid: false,
        errors: ['Validation process failed'],
        warnings: []
      };
    }
  }

  /**
   * Get transfer summary for application
   */
  async getTransferSummary(applicationId: string): Promise<{
    transcriptCreated: boolean;
    creditsTransferred: number;
    academicLevel: AcademicLevel;
    supportNeeds: any[];
    recommendations: string[];
  }> {
    try {
      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId },
        include: {
          applicant: {
            include: {
              scrollTranscripts: true
            }
          },
          academicEvaluations: true,
          spiritualEvaluations: true
        }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const transcriptCreated = application.applicant.scrollTranscripts.length > 0;
      const academicLevel = this.determineAcademicLevel(application.academicEvaluations);
      const supportNeeds = this.extractSupportNeeds(application.academicEvaluations);
      const recommendations = this.generateAcademicRecommendations(
        application.academicEvaluations,
        application.spiritualEvaluations
      );

      // Calculate credits transferred (simplified)
      const creditsTransferred = application.academicHistory?.reduce(
        (total: number, record: any) => total + (record.creditsEarned || 0), 
        0
      ) || 0;

      return {
        transcriptCreated,
        creditsTransferred,
        academicLevel,
        supportNeeds,
        recommendations
      };

    } catch (error) {
      logger.error('Error getting transfer summary:', error);
      throw error;
    }
  }
}