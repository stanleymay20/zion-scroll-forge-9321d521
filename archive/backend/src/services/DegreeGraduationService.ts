/**
 * ScrollUniversity Degree and Graduation Service
 * "For I know the plans I have for you, declares the LORD" - Jeremiah 29:11
 * 
 * Main orchestration service for degree progress and graduation management
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/productionLogger';
import { DegreeAuditService } from './DegreeAuditService';
import { GraduationEligibilityService } from './GraduationEligibilityService';
import { DiplomaGenerationService } from './DiplomaGenerationService';
import { OfficialTranscriptService } from './OfficialTranscriptService';
import { GraduationCeremonyService } from './GraduationCeremonyService';
import { AlumniTransitionService } from './AlumniTransitionService';

const prisma = new PrismaClient();

export class DegreeGraduationService {
  private degreeAuditService: DegreeAuditService;
  private eligibilityService: GraduationEligibilityService;
  private diplomaService: DiplomaGenerationService;
  private transcriptService: OfficialTranscriptService;
  private ceremonyService: GraduationCeremonyService;
  private alumniService: AlumniTransitionService;

  constructor() {
    this.degreeAuditService = new DegreeAuditService();
    this.eligibilityService = new GraduationEligibilityService();
    this.diplomaService = new DiplomaGenerationService();
    this.transcriptService = new OfficialTranscriptService();
    this.ceremonyService = new GraduationCeremonyService();
    this.alumniService = new AlumniTransitionService();
  }

  /**
   * Get comprehensive degree progress for student
   */
  async getDegreeProgress(studentId: string, degreeProgramId: string) {
    try {
      logger.info('Getting degree progress', { studentId, degreeProgramId });

      const audit = await this.degreeAuditService.getDegreeAudit(studentId, degreeProgramId);
      const eligibility = await this.eligibilityService.checkEligibility(studentId, degreeProgramId);

      return {
        audit,
        eligibility,
        lastUpdated: new Date()
      };

    } catch (error: any) {
      logger.error('Get degree progress error', { error: error.message, studentId });
      throw error;
    }
  }

  /**
   * Process graduation for eligible student
   */
  async processGraduation(studentId: string, degreeProgramId: string, graduationDate: Date) {
    try {
      logger.info('Processing graduation', { studentId, degreeProgramId });

      // Step 1: Check eligibility
      const eligibility = await this.eligibilityService.checkEligibility(studentId, degreeProgramId);

      if (!eligibility.eligible) {
        throw new Error(
          `Student not eligible for graduation: ${eligibility.missingRequirements.join(', ')}`
        );
      }

      // Step 2: Approve for graduation
      await this.eligibilityService.approveForGraduation(studentId, degreeProgramId);

      // Step 3: Generate diploma
      const diploma = await this.diplomaService.generateDiploma(
        studentId,
        degreeProgramId,
        graduationDate
      );

      // Step 4: Generate official transcript
      const transcript = await this.transcriptService.generateOfficialTranscript(studentId);

      // Step 5: Initialize alumni transition
      const alumniTransition = await this.alumniService.initializeTransition(
        studentId,
        graduationDate
      );

      // Step 6: Send welcome email
      await this.alumniService.sendWelcomeEmail(studentId);

      logger.info('Graduation processed successfully', {
        studentId,
        diplomaId: diploma.id,
        transcriptId: transcript.id
      });

      return {
        success: true,
        diploma,
        transcript,
        alumniTransition,
        message: 'Congratulations on your graduation!'
      };

    } catch (error: any) {
      logger.error('Process graduation error', { error: error.message, studentId });
      throw error;
    }
  }

  /**
   * Track course completion and update degree progress
   */
  async trackCourseCompletion(studentId: string, courseId: string) {
    try {
      logger.info('Tracking course completion', { studentId, courseId });

      // Update degree audit
      await this.degreeAuditService.trackCourseCompletion(studentId, courseId);

      logger.info('Course completion tracked', { studentId, courseId });

    } catch (error: any) {
      logger.error('Track course completion error', { error: error.message, studentId });
      throw error;
    }
  }

  /**
   * Get student's diploma
   */
  async getDiploma(studentId: string, degreeProgramId: string) {
    try {
      return await this.diplomaService.getDiploma(studentId, degreeProgramId);
    } catch (error: any) {
      logger.error('Get diploma error', { error: error.message, studentId });
      throw error;
    }
  }

  /**
   * Get student's official transcript
   */
  async getOfficialTranscript(studentId: string) {
    try {
      return await this.transcriptService.generateOfficialTranscript(studentId);
    } catch (error: any) {
      logger.error('Get official transcript error', { error: error.message, studentId });
      throw error;
    }
  }

  /**
   * Verify diploma authenticity
   */
  async verifyDiploma(blockchainHash: string) {
    try {
      return await this.diplomaService.verifyDiploma(blockchainHash);
    } catch (error: any) {
      logger.error('Verify diploma error', { error: error.message });
      throw error;
    }
  }

  /**
   * Verify transcript authenticity
   */
  async verifyTranscript(blockchainHash: string) {
    try {
      return await this.transcriptService.verifyTranscript(blockchainHash);
    } catch (error: any) {
      logger.error('Verify transcript error', { error: error.message });
      throw error;
    }
  }

  /**
   * Register for graduation ceremony
   */
  async registerForCeremony(
    studentId: string,
    ceremonyId: string,
    guestCount: number,
    specialAccommodations?: string
  ) {
    try {
      return await this.ceremonyService.registerForCeremony(
        studentId,
        ceremonyId,
        guestCount,
        specialAccommodations
      );
    } catch (error: any) {
      logger.error('Register for ceremony error', { error: error.message, studentId });
      throw error;
    }
  }

  /**
   * Get upcoming graduation ceremonies
   */
  async getUpcomingCeremonies() {
    try {
      return await this.ceremonyService.getUpcomingCeremonies();
    } catch (error: any) {
      logger.error('Get upcoming ceremonies error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get alumni transition status
   */
  async getAlumniTransition(studentId: string) {
    try {
      return await this.alumniService.getTransition(studentId);
    } catch (error: any) {
      logger.error('Get alumni transition error', { error: error.message, studentId });
      throw error;
    }
  }

  /**
   * Update alumni profile
   */
  async updateAlumniProfile(studentId: string, profileData: any) {
    try {
      return await this.alumniService.updateAlumniProfile(studentId, profileData);
    } catch (error: any) {
      logger.error('Update alumni profile error', { error: error.message, studentId });
      throw error;
    }
  }
}

export default DegreeGraduationService;
