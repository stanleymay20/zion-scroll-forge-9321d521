/**
 * ScrollUniversity Eligibility Assessment Service
 * "Test all things; hold fast what is good" - 1 Thessalonians 5:21
 * 
 * Automated eligibility assessment for admissions applications
 */

import { PrismaClient, ProgramType, EligibilityStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  EligibilityAssessmentRequest,
  EligibilityAssessmentResult,
  RequirementCheck,
  AccessibilityAssessment,
  ComplianceCheck
} from '../types/admissions.types';

const prisma = new PrismaClient();

export class EligibilityAssessmentService {
  /**
   * Assess application eligibility
   */
  async assessEligibility(request: EligibilityAssessmentRequest): Promise<EligibilityAssessmentResult> {
    try {
      logger.info(`Assessing eligibility for application ${request.applicationId}`);

      // Check basic requirements
      const basicRequirements = this.checkBasicRequirements(request);

      // Check academic prerequisites
      const academicPrerequisites = this.checkAcademicPrerequisites(request);

      // Check language proficiency
      const languageProficiency = this.checkLanguageProficiency(request);

      // Check technical requirements
      const technicalRequirements = this.checkTechnicalRequirements(request);

      // Assess accessibility needs
      const accessibilityNeeds = this.assessAccessibilityNeeds(request);

      // Check global compliance
      const globalCompliance = this.checkGlobalCompliance(request);

      // Determine overall eligibility
      const overallEligibility = this.determineOverallEligibility({
        basicRequirements,
        academicPrerequisites,
        languageProficiency,
        technicalRequirements
      });

      // Generate assessment notes
      const assessmentNotes = this.generateAssessmentNotes({
        basicRequirements,
        academicPrerequisites,
        languageProficiency,
        technicalRequirements,
        overallEligibility
      });

      const result: EligibilityAssessmentResult = {
        applicationId: request.applicationId,
        overallEligibility,
        basicRequirements,
        academicPrerequisites,
        languageProficiency,
        technicalRequirements,
        accessibilityNeeds,
        globalCompliance,
        assessmentNotes,
        assessedAt: new Date()
      };

      // Save to database
      await this.saveEligibilityAssessment(result);

      logger.info(`Eligibility assessment completed: ${request.applicationId} - ${overallEligibility}`);

      return result;

    } catch (error) {
      logger.error('Error assessing eligibility:', error);
      throw new Error(`Failed to assess eligibility: ${(error as Error).message}`);
    }
  }

  /**
   * Get eligibility assessment by application ID
   */
  async getEligibilityAssessment(applicationId: string): Promise<EligibilityAssessmentResult | null> {
    try {
      const assessment = await prisma.eligibilityAssessment.findUnique({
        where: { applicationId }
      });

      if (!assessment) {
        return null;
      }

      const result: EligibilityAssessmentResult = {
        applicationId: assessment.applicationId,
        overallEligibility: assessment.overallEligibility,
        basicRequirements: JSON.parse(assessment.basicRequirements as string),
        academicPrerequisites: JSON.parse(assessment.academicPrerequisites as string),
        languageProficiency: JSON.parse(assessment.languageProficiency as string),
        technicalRequirements: JSON.parse(assessment.technicalRequirements as string),
        accessibilityNeeds: JSON.parse(assessment.accessibilityNeeds as string),
        globalCompliance: JSON.parse(assessment.globalCompliance as string),
        assessmentNotes: assessment.assessmentNotes || '',
        assessedAt: assessment.assessedAt
      };

      return result;

    } catch (error) {
      logger.error('Error fetching eligibility assessment:', error);
      throw new Error(`Failed to fetch eligibility assessment: ${(error as Error).message}`);
    }
  }

  // Private helper methods

  private checkBasicRequirements(request: EligibilityAssessmentRequest): RequirementCheck {
    const missingItems: string[] = [];
    let score = 100;

    // Check for required personal information
    if (!request.applicationData.responses.firstName) {
      missingItems.push('First name');
      score -= 20;
    }
    if (!request.applicationData.responses.lastName) {
      missingItems.push('Last name');
      score -= 20;
    }
    if (!request.applicationData.responses.email) {
      missingItems.push('Email address');
      score -= 20;
    }
    if (!request.applicationData.responses.dateOfBirth) {
      missingItems.push('Date of birth');
      score -= 20;
    }

    // Check for required documents
    const hasTranscript = request.documents.some(doc => doc.documentType === 'TRANSCRIPT');
    if (!hasTranscript) {
      missingItems.push('Official transcript');
      score -= 20;
    }

    const met = missingItems.length === 0;
    const details = met 
      ? 'All basic requirements met' 
      : `Missing: ${missingItems.join(', ')}`;

    return {
      met,
      details,
      missingItems: met ? undefined : missingItems,
      score: Math.max(0, score)
    };
  }

  private checkAcademicPrerequisites(request: EligibilityAssessmentRequest): RequirementCheck {
    const missingItems: string[] = [];
    let score = 100;

    // Check education level based on program
    const highestDegree = request.applicationData.responses.highestDegree;
    
    switch (request.programType) {
      case ProgramType.SCROLL_DEGREE:
        if (!highestDegree || highestDegree === 'High School') {
          missingItems.push('Bachelor\'s degree or equivalent');
          score -= 50;
        }
        break;
      case ProgramType.SCROLL_DOCTORATE:
        if (!highestDegree || !['Master', 'Doctorate'].includes(highestDegree)) {
          missingItems.push('Master\'s degree or equivalent');
          score -= 50;
        }
        break;
    }

    // Check GPA if provided
    const gpa = request.applicationData.responses.gpa;
    if (gpa && gpa < 2.5) {
      missingItems.push('Minimum GPA of 2.5');
      score -= 30;
    }

    const met = missingItems.length === 0;
    const details = met 
      ? 'Academic prerequisites met' 
      : `Requirements not met: ${missingItems.join(', ')}`;

    return {
      met,
      details,
      missingItems: met ? undefined : missingItems,
      score: Math.max(0, score)
    };
  }

  private checkLanguageProficiency(request: EligibilityAssessmentRequest): RequirementCheck {
    // For now, assume English proficiency
    // In production, would check TOEFL/IELTS scores for international students
    
    const country = request.applicationData.responses.country;
    const englishSpeakingCountries = ['United States', 'Canada', 'United Kingdom', 'Australia'];
    
    const met = englishSpeakingCountries.includes(country) || true; // Assume met for now
    const details = met 
      ? 'Language proficiency requirements met' 
      : 'English proficiency test scores required';

    return {
      met,
      details,
      score: met ? 100 : 0
    };
  }

  private checkTechnicalRequirements(request: EligibilityAssessmentRequest): RequirementCheck {
    // Check for basic technical requirements
    // In production, would verify internet access, device capabilities, etc.
    
    const met = true; // Assume met for now
    const details = 'Technical requirements met (internet access, computer/device)';

    return {
      met,
      details,
      score: 100
    };
  }

  private assessAccessibilityNeeds(request: EligibilityAssessmentRequest): AccessibilityAssessment {
    // Check for accessibility needs from application data
    const needsIdentified: string[] = [];
    const accommodationsRequired: string[] = [];

    // In production, would parse accessibility information from application
    // For now, return default assessment

    return {
      needsIdentified,
      accommodationsRequired,
      supportLevel: 'none'
    };
  }

  private checkGlobalCompliance(request: EligibilityAssessmentRequest): ComplianceCheck {
    // Check compliance with regional regulations
    const country = request.applicationData.responses.country;
    
    return {
      compliant: true,
      region: country || 'Unknown',
      regulations: ['FERPA', 'GDPR'],
      issues: []
    };
  }

  private determineOverallEligibility(checks: {
    basicRequirements: RequirementCheck;
    academicPrerequisites: RequirementCheck;
    languageProficiency: RequirementCheck;
    technicalRequirements: RequirementCheck;
  }): EligibilityStatus {
    const allMet = Object.values(checks).every(check => check.met);
    
    if (allMet) {
      return EligibilityStatus.ELIGIBLE;
    }

    // Check if conditionally eligible
    const criticalChecksMet = checks.basicRequirements.met && checks.languageProficiency.met;
    if (criticalChecksMet) {
      return EligibilityStatus.CONDITIONALLY_ELIGIBLE;
    }

    return EligibilityStatus.INELIGIBLE;
  }

  private generateAssessmentNotes(data: any): string {
    const notes: string[] = [];

    if (data.overallEligibility === EligibilityStatus.ELIGIBLE) {
      notes.push('Applicant meets all eligibility requirements.');
    } else if (data.overallEligibility === EligibilityStatus.CONDITIONALLY_ELIGIBLE) {
      notes.push('Applicant is conditionally eligible pending completion of missing requirements.');
      if (!data.academicPrerequisites.met) {
        notes.push('Academic prerequisites need to be addressed.');
      }
    } else {
      notes.push('Applicant does not meet eligibility requirements at this time.');
      if (!data.basicRequirements.met) {
        notes.push('Basic requirements are incomplete.');
      }
    }

    return notes.join(' ');
  }

  private async saveEligibilityAssessment(result: EligibilityAssessmentResult): Promise<void> {
    try {
      await prisma.eligibilityAssessment.upsert({
        where: { applicationId: result.applicationId },
        update: {
          overallEligibility: result.overallEligibility,
          basicRequirements: JSON.stringify(result.basicRequirements),
          academicPrerequisites: JSON.stringify(result.academicPrerequisites),
          languageProficiency: JSON.stringify(result.languageProficiency),
          technicalRequirements: JSON.stringify(result.technicalRequirements),
          accessibilityNeeds: JSON.stringify(result.accessibilityNeeds),
          globalCompliance: JSON.stringify(result.globalCompliance),
          assessmentNotes: result.assessmentNotes,
          updatedAt: new Date()
        },
        create: {
          applicationId: result.applicationId,
          overallEligibility: result.overallEligibility,
          basicRequirements: JSON.stringify(result.basicRequirements),
          academicPrerequisites: JSON.stringify(result.academicPrerequisites),
          languageProficiency: JSON.stringify(result.languageProficiency),
          technicalRequirements: JSON.stringify(result.technicalRequirements),
          accessibilityNeeds: JSON.stringify(result.accessibilityNeeds),
          globalCompliance: JSON.stringify(result.globalCompliance),
          assessmentNotes: result.assessmentNotes,
          assessedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error saving eligibility assessment:', error);
      throw error;
    }
  }
}

export default EligibilityAssessmentService;
