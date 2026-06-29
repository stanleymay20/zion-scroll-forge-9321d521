import { PrismaClient } from '@prisma/client';
import { Logger } from '../../utils/logger';

export interface RequirementCheck {
  requirement: string;
  status: CheckStatus;
  evidence: string[];
  notes: string;
}

export interface EligibilityAssessment {
  id: string;
  applicationId: string;
  basicRequirements: RequirementCheck[];
  academicPrerequisites: PrerequisiteCheck[];
  languageProficiency: LanguageAssessment;
  technicalRequirements: TechnicalCheck[];
  accessibilityNeeds: AccessibilityAssessment;
  globalCompliance: ComplianceCheck[];
  overallEligibility: EligibilityStatus;
}

export enum CheckStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  PENDING = 'pending',
  NOT_APPLICABLE = 'not_applicable'
}

export enum EligibilityStatus {
  ELIGIBLE = 'eligible',
  INELIGIBLE = 'ineligible',
  CONDITIONAL = 'conditional',
  PENDING_REVIEW = 'pending_review'
}

export interface PrerequisiteCheck {
  subject: string;
  requiredLevel: string;
  currentLevel: string;
  status: CheckStatus;
  evidence: string[];
  remedialRequired: boolean;
}

export interface LanguageAssessment {
  primaryLanguage: string;
  proficiencyLevel: string;
  testScore?: number;
  testType?: string;
  status: CheckStatus;
  accommodationsNeeded: boolean;
}

export interface TechnicalCheck {
  requirement: string;
  description: string;
  status: CheckStatus;
  deviceCompatibility: boolean;
  internetRequirements: boolean;
  softwareRequirements: boolean;
}

export interface AccessibilityAssessment {
  hasSpecialNeeds: boolean;
  accommodationsRequired: string[];
  assistiveTechnology: string[];
  status: CheckStatus;
}

export interface ComplianceCheck {
  region: string;
  requirement: string;
  status: CheckStatus;
  documentation: string[];
  expirationDate?: Date;
}

export class EligibilityChecker {
  private prisma: PrismaClient;
  private logger: Logger;

  constructor() {
    this.prisma = new PrismaClient();
    this.logger = new Logger('EligibilityChecker');
  }

  /**
   * Performs comprehensive eligibility assessment for an application
   */
  async assessEligibility(applicationId: string): Promise<EligibilityAssessment> {
    try {
      this.logger.info(`Starting eligibility assessment for application ${applicationId}`);

      // Get application data
      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId },
        include: {
          applicant: true
        }
      });

      if (!application) {
        throw new Error(`Application ${applicationId} not found`);
      }

      // Perform all eligibility checks
      const basicRequirements = await this.checkBasicRequirements(application);
      const academicPrerequisites = await this.checkAcademicPrerequisites(application);
      const languageProficiency = await this.assessLanguageProficiency(application);
      const technicalRequirements = await this.checkTechnicalRequirements(application);
      const accessibilityNeeds = await this.assessAccessibilityNeeds(application);
      const globalCompliance = await this.checkGlobalCompliance(application);

      // Determine overall eligibility
      const overallEligibility = this.determineOverallEligibility({
        basicRequirements,
        academicPrerequisites,
        languageProficiency,
        technicalRequirements,
        accessibilityNeeds,
        globalCompliance
      });

      const assessment: EligibilityAssessment = {
        id: `eligibility_${applicationId}_${Date.now()}`,
        applicationId,
        basicRequirements,
        academicPrerequisites,
        languageProficiency,
        technicalRequirements,
        accessibilityNeeds,
        globalCompliance,
        overallEligibility
      };

      // Save assessment to database
      await this.saveEligibilityAssessment(assessment);

      this.logger.info(`Eligibility assessment completed for application ${applicationId}: ${overallEligibility}`);
      return assessment;

    } catch (error) {
      this.logger.error(`Error assessing eligibility for application ${applicationId}:`, error);
      throw error;
    }
  }

  /**
   * Checks basic admission requirements
   */
  private async checkBasicRequirements(application: any): Promise<RequirementCheck[]> {
    const checks: RequirementCheck[] = [];

    // Age requirement (18+ or equivalent)
    const ageCheck = await this.checkAgeRequirement(application);
    checks.push(ageCheck);

    // High school completion or equivalent
    const educationCheck = await this.checkEducationRequirement(application);
    checks.push(educationCheck);

    // Spiritual foundation requirement
    const spiritualCheck = await this.checkSpiritualFoundation(application);
    checks.push(spiritualCheck);

    // Character references requirement
    const referencesCheck = await this.checkCharacterReferences(application);
    checks.push(referencesCheck);

    return checks;
  }

  private async checkAgeRequirement(application: any): Promise<RequirementCheck> {
    const applicantData = application.application_data;
    const birthDate = applicantData?.personalInfo?.birthDate;
    
    if (!birthDate) {
      return {
        requirement: 'Age Verification',
        status: CheckStatus.PENDING,
        evidence: [],
        notes: 'Birth date not provided'
      };
    }

    const age = this.calculateAge(new Date(birthDate));
    const isEligible = age >= 18;

    return {
      requirement: 'Age Verification',
      status: isEligible ? CheckStatus.PASSED : CheckStatus.FAILED,
      evidence: [`Birth date: ${birthDate}`, `Calculated age: ${age}`],
      notes: isEligible ? 'Meets minimum age requirement' : 'Does not meet minimum age requirement (18+)'
    };
  }

  private async checkEducationRequirement(application: any): Promise<RequirementCheck> {
    const educationData = application.application_data?.education;
    
    if (!educationData || !educationData.highSchoolCompleted) {
      return {
        requirement: 'High School Completion',
        status: CheckStatus.FAILED,
        evidence: [],
        notes: 'High school completion not verified'
      };
    }

    return {
      requirement: 'High School Completion',
      status: CheckStatus.PASSED,
      evidence: [
        `High school: ${educationData.highSchoolName}`,
        `Graduation date: ${educationData.graduationDate}`,
        `GPA: ${educationData.gpa || 'Not provided'}`
      ],
      notes: 'High school completion verified'
    };
  }

  private async checkSpiritualFoundation(application: any): Promise<RequirementCheck> {
    const spiritualData = application.application_data?.spiritual;
    
    if (!spiritualData?.salvationTestimony) {
      return {
        requirement: 'Spiritual Foundation',
        status: CheckStatus.FAILED,
        evidence: [],
        notes: 'Salvation testimony required'
      };
    }

    const hasTestimony = spiritualData.salvationTestimony.length > 100;
    const hasChurchAffiliation = spiritualData.churchAffiliation;

    return {
      requirement: 'Spiritual Foundation',
      status: hasTestimony && hasChurchAffiliation ? CheckStatus.PASSED : CheckStatus.CONDITIONAL,
      evidence: [
        `Testimony length: ${spiritualData.salvationTestimony.length} characters`,
        `Church affiliation: ${hasChurchAffiliation ? 'Yes' : 'No'}`
      ],
      notes: hasTestimony && hasChurchAffiliation ? 
        'Spiritual foundation verified' : 
        'Spiritual foundation needs additional review'
    };
  }

  private async checkCharacterReferences(application: any): Promise<RequirementCheck> {
    const references = application.application_data?.references || [];
    const requiredReferences = 3;
    const hasEnoughReferences = references.length >= requiredReferences;

    return {
      requirement: 'Character References',
      status: hasEnoughReferences ? CheckStatus.PASSED : CheckStatus.FAILED,
      evidence: references.map((ref: any) => `${ref.name} - ${ref.relationship}`),
      notes: `${references.length} of ${requiredReferences} required references provided`
    };
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Determines overall eligibility based on all checks
   */
  private determineOverallEligibility(assessmentData: {
    basicRequirements: RequirementCheck[];
    academicPrerequisites: PrerequisiteCheck[];
    languageProficiency: LanguageAssessment;
    technicalRequirements: TechnicalCheck[];
    accessibilityNeeds: AccessibilityAssessment;
    globalCompliance: ComplianceCheck[];
  }): EligibilityStatus {
    
    // Check if any basic requirements failed
    const failedBasicRequirements = assessmentData.basicRequirements.filter(
      req => req.status === CheckStatus.FAILED
    );
    
    if (failedBasicRequirements.length > 0) {
      return EligibilityStatus.INELIGIBLE;
    }

    // Check if any critical prerequisites failed
    const failedPrerequisites = assessmentData.academicPrerequisites.filter(
      req => req.status === CheckStatus.FAILED && !req.remedialRequired
    );
    
    if (failedPrerequisites.length > 0) {
      return EligibilityStatus.INELIGIBLE;
    }

    // Check for conditional status
    const conditionalRequirements = assessmentData.basicRequirements.filter(
      req => req.status === CheckStatus.PENDING
    );
    
    const remedialRequired = assessmentData.academicPrerequisites.some(
      req => req.remedialRequired
    );

    if (conditionalRequirements.length > 0 || remedialRequired) {
      return EligibilityStatus.CONDITIONAL;
    }

    // Check for pending reviews
    const pendingChecks = [
      ...assessmentData.basicRequirements,
      ...assessmentData.academicPrerequisites,
      ...assessmentData.technicalRequirements,
      ...assessmentData.globalCompliance
    ].filter(check => check.status === CheckStatus.PENDING);

    if (pendingChecks.length > 0) {
      return EligibilityStatus.PENDING_REVIEW;
    }

    return EligibilityStatus.ELIGIBLE;
  }

  /**
   * Saves eligibility assessment to database
   */
  private async saveEligibilityAssessment(assessment: EligibilityAssessment): Promise<void> {
    try {
      await this.prisma.eligibility_assessments.create({
        data: {
          id: assessment.id,
          application_id: assessment.applicationId,
          basic_requirements: assessment.basicRequirements,
          academic_prerequisites: assessment.academicPrerequisites,
          language_proficiency: assessment.languageProficiency,
          technical_requirements: assessment.technicalRequirements,
          accessibility_needs: assessment.accessibilityNeeds,
          global_compliance: assessment.globalCompliance,
          overall_eligibility: assessment.overallEligibility,
          assessed_at: new Date()
        }
      });
    } catch (error) {
      this.logger.error('Error saving eligibility assessment:', error);
      throw error;
    }
  }

  /**
   * Retrieves existing eligibility assessment
   */
  async getEligibilityAssessment(applicationId: string): Promise<EligibilityAssessment | null> {
    try {
      const assessment = await this.prisma.eligibility_assessments.findFirst({
        where: { application_id: applicationId },
        orderBy: { assessed_at: 'desc' }
      });

      if (!assessment) {
        return null;
      }

      return {
        id: assessment.id,
        applicationId: assessment.application_id,
        basicRequirements: assessment.basic_requirements as RequirementCheck[],
        academicPrerequisites: assessment.academic_prerequisites as PrerequisiteCheck[],
        languageProficiency: assessment.language_proficiency as LanguageAssessment,
        technicalRequirements: assessment.technical_requirements as TechnicalCheck[],
        accessibilityNeeds: assessment.accessibility_needs as AccessibilityAssessment,
        globalCompliance: assessment.global_compliance as ComplianceCheck[],
        overallEligibility: assessment.overall_eligibility as EligibilityStatus
      };
    } catch (error) {
      this.logger.error(`Error retrieving eligibility assessment for application ${applicationId}:`, error);
      throw error;
    }
  }

  /**
   * Checks academic prerequisites for an application
   */
  private async checkAcademicPrerequisites(application: any): Promise<PrerequisiteCheck[]> {
    // Import and use the AcademicPrerequisiteValidator
    const { AcademicPrerequisiteValidator } = await import('./AcademicPrerequisiteValidator');
    const validator = new AcademicPrerequisiteValidator();
    
    try {
      const result = await validator.validatePrerequisites(application.id);
      return result.subjectChecks;
    } catch (error) {
      this.logger.error('Error validating academic prerequisites:', error);
      // Return basic failed checks if validation fails
      return [
        {
          subject: 'Academic Prerequisites',
          requiredLevel: 'High School Completion',
          currentLevel: 'Unknown',
          status: CheckStatus.PENDING,
          evidence: [],
          remedialRequired: true
        }
      ];
    }
  }

  /**
   * Assesses language proficiency for an application
   */
  private async assessLanguageProficiency(application: any): Promise<LanguageAssessment> {
    // Import and use the LanguageProficiencyValidator
    const { LanguageProficiencyValidator } = await import('./LanguageProficiencyValidator');
    const validator = new LanguageProficiencyValidator();
    
    try {
      const result = await validator.assessLanguageProficiency(application.id);
      return result.assessments[0] || {
        primaryLanguage: 'English',
        proficiencyLevel: 'Unknown',
        status: CheckStatus.PENDING,
        accommodationsNeeded: true
      };
    } catch (error) {
      this.logger.error('Error assessing language proficiency:', error);
      return {
        primaryLanguage: 'English',
        proficiencyLevel: 'Unknown',
        status: CheckStatus.PENDING,
        accommodationsNeeded: true
      };
    }
  }

  /**
   * Checks technical requirements for an application
   */
  private async checkTechnicalRequirements(application: any): Promise<TechnicalCheck[]> {
    // Import and use the TechnicalRequirementsChecker
    const { TechnicalRequirementsChecker } = await import('./TechnicalRequirementsChecker');
    const checker = new TechnicalRequirementsChecker();
    
    try {
      const result = await checker.assessTechnicalRequirements(application.id);
      
      // Convert technical assessment to TechnicalCheck format
      const checks: TechnicalCheck[] = [
        {
          requirement: 'Device Compatibility',
          description: 'Compatible device for learning platform',
          status: result.deviceCompatibility.some(d => d.compatible) ? CheckStatus.PASSED : CheckStatus.FAILED,
          deviceCompatibility: result.deviceCompatibility.some(d => d.compatible),
          internetRequirements: result.internetRequirements.status === CheckStatus.PASSED,
          softwareRequirements: result.softwareRequirements.every(s => s.status === CheckStatus.PASSED)
        },
        {
          requirement: 'Internet Connection',
          description: 'Adequate internet speed and stability',
          status: result.internetRequirements.status,
          deviceCompatibility: true,
          internetRequirements: result.internetRequirements.status === CheckStatus.PASSED,
          softwareRequirements: true
        },
        {
          requirement: 'Software Requirements',
          description: 'Required software and applications',
          status: result.softwareRequirements.every(s => s.status === CheckStatus.PASSED) ? CheckStatus.PASSED : CheckStatus.PENDING,
          deviceCompatibility: true,
          internetRequirements: true,
          softwareRequirements: result.softwareRequirements.every(s => s.status === CheckStatus.PASSED)
        }
      ];

      return checks;
    } catch (error) {
      this.logger.error('Error checking technical requirements:', error);
      return [
        {
          requirement: 'Technical Requirements',
          description: 'Basic technical setup for learning',
          status: CheckStatus.PENDING,
          deviceCompatibility: false,
          internetRequirements: false,
          softwareRequirements: false
        }
      ];
    }
  }

  /**
   * Assesses accessibility needs for an application
   */
  private async assessAccessibilityNeeds(application: any): Promise<AccessibilityAssessment> {
    const accessibilityData = application.application_data?.accessibility;
    
    if (!accessibilityData) {
      return {
        hasSpecialNeeds: false,
        accommodationsRequired: [],
        assistiveTechnology: [],
        status: CheckStatus.PASSED
      };
    }

    const hasSpecialNeeds = accessibilityData.hasSpecialNeeds || false;
    const accommodationsRequired = accessibilityData.accommodationsRequired || [];
    const assistiveTechnology = accessibilityData.assistiveTechnology || [];

    // Check if all requested accommodations can be provided
    const unsupportedAccommodations = accommodationsRequired.filter((accommodation: string) => {
      return !this.isSupportedAccommodation(accommodation);
    });

    const status = unsupportedAccommodations.length === 0 ? CheckStatus.PASSED : CheckStatus.PENDING;

    return {
      hasSpecialNeeds,
      accommodationsRequired,
      assistiveTechnology,
      status
    };
  }

  /**
   * Checks if accommodation is supported
   */
  private isSupportedAccommodation(accommodation: string): boolean {
    const supportedAccommodations = [
      'extended time',
      'screen reader support',
      'keyboard navigation',
      'high contrast display',
      'closed captions',
      'text-to-speech',
      'alternative formats',
      'assistive technology support'
    ];

    return supportedAccommodations.some(supported => 
      accommodation.toLowerCase().includes(supported.toLowerCase())
    );
  }

  /**
   * Checks global compliance requirements for an application
   */
  private async checkGlobalCompliance(application: any): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = [];
    const applicantData = application.application_data;
    const country = applicantData?.personalInfo?.country || 'Unknown';

    // GDPR compliance for EU residents
    if (this.isEUCountry(country)) {
      checks.push({
        region: 'European Union',
        requirement: 'GDPR Data Protection Compliance',
        status: CheckStatus.PASSED, // Platform is GDPR compliant
        documentation: ['Privacy Policy Acknowledgment', 'Data Processing Consent'],
        expirationDate: undefined
      });
    }

    // COPPA compliance for US minors
    if (country === 'United States') {
      const age = this.calculateAge(new Date(applicantData?.personalInfo?.birthDate));
      if (age < 18) {
        checks.push({
          region: 'United States',
          requirement: 'COPPA Parental Consent',
          status: applicantData?.parentalConsent ? CheckStatus.PASSED : CheckStatus.FAILED,
          documentation: ['Parental Consent Form'],
          expirationDate: undefined
        });
      }
    }

    // International student visa requirements
    if (country !== 'United States' && applicantData?.studyLocation === 'United States') {
      checks.push({
        region: 'International',
        requirement: 'Student Visa Documentation',
        status: CheckStatus.PENDING,
        documentation: ['Passport', 'Visa Application', 'I-20 Form'],
        expirationDate: undefined
      });
    }

    // Default compliance check if no specific requirements
    if (checks.length === 0) {
      checks.push({
        region: 'Global',
        requirement: 'Terms of Service Acceptance',
        status: CheckStatus.PASSED,
        documentation: ['Terms of Service Agreement'],
        expirationDate: undefined
      });
    }

    return checks;
  }

  /**
   * Checks if country is in the European Union
   */
  private isEUCountry(country: string): boolean {
    const euCountries = [
      'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
      'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece',
      'Hungary', 'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg',
      'Malta', 'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia',
      'Slovenia', 'Spain', 'Sweden'
    ];
    
    return euCountries.includes(country);
  }
}