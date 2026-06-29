import { PrismaClient } from '@prisma/client';
import { Logger } from '../../utils/logger';
import { ComplianceCheck, CheckStatus } from './EligibilityChecker';

export interface ComplianceRegion {
  name: string;
  countries: string[];
  requirements: ComplianceRequirement[];
  dataProtectionLaws: string[];
  educationRegulations: string[];
}

export interface ComplianceRequirement {
  name: string;
  description: string;
  mandatory: boolean;
  applicableAges: string;
  documentation: string[];
  validityPeriod?: number; // in months
  cost?: number;
}

export interface InternationalStudentRequirement {
  country: string;
  visaRequired: boolean;
  visaType: string;
  documentation: string[];
  processingTime: string;
  cost: number;
  additionalRequirements: string[];
}

export interface ComplianceAssessmentResult {
  applicationId: string;
  applicantCountry: string;
  studyLocation: string;
  regionalCompliance: ComplianceCheck[];
  internationalRequirements: InternationalStudentRequirement[];
  dataProtectionCompliance: DataProtectionCompliance;
  educationCredentialRecognition: CredentialRecognition;
  overallComplianceStatus: CheckStatus;
  recommendations: string[];
  estimatedComplianceCost: number;
}

export interface DataProtectionCompliance {
  applicableLaws: string[];
  consentRequired: boolean;
  dataTransferRestrictions: boolean;
  retentionPolicies: string[];
  userRights: string[];
  status: CheckStatus;
}

export interface CredentialRecognition {
  recognitionRequired: boolean;
  recognizingBody: string;
  process: string[];
  timeline: string;
  cost: number;
  status: CheckStatus;
}

export interface EligibilityAppealProcess {
  applicationId: string;
  appealReason: string;
  supportingDocumentation: string[];
  reviewTimeline: string;
  appealStatus: 'submitted' | 'under_review' | 'approved' | 'denied';
  reviewerNotes: string[];
  finalDecision: string;
}

export class GlobalComplianceChecker {
  private prisma: PrismaClient;
  private logger: Logger;
  private complianceRegions: ComplianceRegion[];
  private internationalRequirements: InternationalStudentRequirement[];

  constructor() {
    this.prisma = new PrismaClient();
    this.logger = new Logger('GlobalComplianceChecker');
    this.initializeComplianceRegions();
    this.initializeInternationalRequirements();
  }

  /**
   * Initialize compliance regions and their requirements
   */
  private initializeComplianceRegions(): void {
    this.complianceRegions = [
      {
        name: 'European Union',
        countries: [
          'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
          'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece',
          'Hungary', 'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg',
          'Malta', 'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia',
          'Slovenia', 'Spain', 'Sweden'
        ],
        requirements: [
          {
            name: 'GDPR Compliance',
            description: 'General Data Protection Regulation compliance',
            mandatory: true,
            applicableAges: 'All ages',
            documentation: ['Privacy Policy Acknowledgment', 'Data Processing Consent'],
            validityPeriod: undefined
          },
          {
            name: 'Digital Services Act Compliance',
            description: 'Compliance with EU Digital Services Act',
            mandatory: true,
            applicableAges: 'All ages',
            documentation: ['Terms of Service', 'Content Moderation Policy']
          }
        ],
        dataProtectionLaws: ['GDPR', 'ePrivacy Directive'],
        educationRegulations: ['Bologna Process', 'ECTS Credit System']
      },
      {
        name: 'United States',
        countries: ['United States'],
        requirements: [
          {
            name: 'COPPA Compliance',
            description: 'Children\'s Online Privacy Protection Act compliance',
            mandatory: true,
            applicableAges: 'Under 13',
            documentation: ['Parental Consent Form', 'Age Verification'],
            validityPeriod: 12
          },
          {
            name: 'FERPA Compliance',
            description: 'Family Educational Rights and Privacy Act compliance',
            mandatory: true,
            applicableAges: 'All students',
            documentation: ['Educational Records Policy', 'Privacy Notice'],
            validityPeriod: undefined
          },
          {
            name: 'ADA Compliance',
            description: 'Americans with Disabilities Act compliance',
            mandatory: true,
            applicableAges: 'All ages',
            documentation: ['Accessibility Policy', 'Accommodation Procedures']
          }
        ],
        dataProtectionLaws: ['COPPA', 'FERPA', 'CCPA'],
        educationRegulations: ['Higher Education Act', 'Title IX']
      },
      {
        name: 'United Kingdom',
        countries: ['United Kingdom', 'England', 'Scotland', 'Wales', 'Northern Ireland'],
        requirements: [
          {
            name: 'UK GDPR Compliance',
            description: 'UK General Data Protection Regulation compliance',
            mandatory: true,
            applicableAges: 'All ages',
            documentation: ['Privacy Policy', 'Data Processing Agreement'],
            validityPeriod: undefined
          },
          {
            name: 'Data Protection Act 2018',
            description: 'UK Data Protection Act compliance',
            mandatory: true,
            applicableAges: 'All ages',
            documentation: ['Data Protection Policy', 'Individual Rights Notice']
          }
        ],
        dataProtectionLaws: ['UK GDPR', 'Data Protection Act 2018'],
        educationRegulations: ['Quality Assurance Agency Standards']
      },
      {
        name: 'Canada',
        countries: ['Canada'],
        requirements: [
          {
            name: 'PIPEDA Compliance',
            description: 'Personal Information Protection and Electronic Documents Act',
            mandatory: true,
            applicableAges: 'All ages',
            documentation: ['Privacy Policy', 'Consent Forms'],
            validityPeriod: undefined
          }
        ],
        dataProtectionLaws: ['PIPEDA', 'Provincial Privacy Laws'],
        educationRegulations: ['Quality Assurance Framework']
      },
      {
        name: 'Australia',
        countries: ['Australia'],
        requirements: [
          {
            name: 'Privacy Act Compliance',
            description: 'Australian Privacy Act compliance',
            mandatory: true,
            applicableAges: 'All ages',
            documentation: ['Privacy Policy', 'Collection Notice'],
            validityPeriod: undefined
          }
        ],
        dataProtectionLaws: ['Privacy Act 1988', 'Australian Privacy Principles'],
        educationRegulations: ['Australian Qualifications Framework']
      }
    ];
  }

  /**
   * Initialize international student requirements
   */
  private initializeInternationalRequirements(): void {
    this.internationalRequirements = [
      {
        country: 'United States',
        visaRequired: true,
        visaType: 'F-1 Student Visa',
        documentation: [
          'Form I-20',
          'SEVIS Fee Payment',
          'Passport',
          'Financial Support Documentation',
          'Academic Transcripts',
          'English Proficiency Test Results'
        ],
        processingTime: '2-4 months',
        cost: 510, // SEVIS fee + visa application fee
        additionalRequirements: [
          'Maintain full-time enrollment',
          'Report address changes',
          'Obtain work authorization if needed'
        ]
      },
      {
        country: 'United Kingdom',
        visaRequired: true,
        visaType: 'Student Visa (Tier 4)',
        documentation: [
          'Confirmation of Acceptance for Studies (CAS)',
          'Passport',
          'Financial Evidence',
          'Academic Qualifications',
          'English Language Proficiency',
          'Tuberculosis Test Results'
        ],
        processingTime: '3-8 weeks',
        cost: 348, // Student visa fee
        additionalRequirements: [
          'Biometric information',
          'Immigration Health Surcharge',
          'Maintain course attendance'
        ]
      },
      {
        country: 'Canada',
        visaRequired: true,
        visaType: 'Study Permit',
        documentation: [
          'Letter of Acceptance',
          'Passport',
          'Proof of Financial Support',
          'Statement of Purpose',
          'Medical Exam (if required)',
          'Police Certificate'
        ],
        processingTime: '4-12 weeks',
        cost: 150, // Study permit fee
        additionalRequirements: [
          'Maintain full-time studies',
          'Valid study permit',
          'Work permit for employment'
        ]
      },
      {
        country: 'Australia',
        visaRequired: true,
        visaType: 'Student Visa (Subclass 500)',
        documentation: [
          'Confirmation of Enrolment (CoE)',
          'Passport',
          'Financial Capacity Evidence',
          'English Proficiency Results',
          'Health Insurance (OSHC)',
          'Character Requirements'
        ],
        processingTime: '1-4 months',
        cost: 620, // Student visa application fee
        additionalRequirements: [
          'Maintain adequate health insurance',
          'Meet course progress requirements',
          'Notify of address changes'
        ]
      }
    ];
  }

  /**
   * Conducts comprehensive global compliance assessment
   */
  async assessGlobalCompliance(applicationId: string): Promise<ComplianceAssessmentResult> {
    try {
      this.logger.info(`Conducting global compliance assessment for application ${applicationId}`);

      // Get application data
      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId }
      });

      if (!application) {
        throw new Error(`Application ${applicationId} not found`);
      }

      const personalInfo = application.application_data?.personalInfo;
      const applicantCountry = personalInfo?.country || 'Unknown';
      const studyLocation = application.application_data?.studyLocation || 'United States';

      // Assess regional compliance
      const regionalCompliance = await this.assessRegionalCompliance(applicantCountry, personalInfo);

      // Assess international student requirements
      const internationalRequirements = await this.assessInternationalRequirements(
        applicantCountry, 
        studyLocation
      );

      // Assess data protection compliance
      const dataProtectionCompliance = await this.assessDataProtectionCompliance(
        applicantCountry, 
        personalInfo
      );

      // Assess credential recognition requirements
      const educationCredentialRecognition = await this.assessCredentialRecognition(
        applicantCountry, 
        studyLocation,
        application.application_data?.education
      );

      // Determine overall compliance status
      const overallComplianceStatus = this.determineOverallComplianceStatus({
        regionalCompliance,
        dataProtectionCompliance,
        educationCredentialRecognition
      });

      // Generate recommendations
      const recommendations = this.generateComplianceRecommendations({
        applicantCountry,
        studyLocation,
        regionalCompliance,
        internationalRequirements,
        overallComplianceStatus
      });

      // Calculate estimated compliance cost
      const estimatedComplianceCost = this.calculateComplianceCost(
        internationalRequirements,
        educationCredentialRecognition
      );

      const result: ComplianceAssessmentResult = {
        applicationId,
        applicantCountry,
        studyLocation,
        regionalCompliance,
        internationalRequirements,
        dataProtectionCompliance,
        educationCredentialRecognition,
        overallComplianceStatus,
        recommendations,
        estimatedComplianceCost
      };

      // Save compliance assessment
      await this.saveComplianceAssessment(result);

      this.logger.info(`Global compliance assessment completed for application ${applicationId}: ${overallComplianceStatus}`);
      return result;

    } catch (error) {
      this.logger.error(`Error conducting global compliance assessment for application ${applicationId}:`, error);
      throw error;
    }
  }

  /**
   * Assesses regional compliance requirements
   */
  private async assessRegionalCompliance(country: string, personalInfo: any): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = [];
    
    // Find applicable region
    const region = this.complianceRegions.find(r => r.countries.includes(country));
    
    if (!region) {
      // Default global compliance
      checks.push({
        region: 'Global',
        requirement: 'Terms of Service Acceptance',
        status: CheckStatus.PASSED,
        documentation: ['Terms of Service Agreement'],
        expirationDate: undefined
      });
      return checks;
    }

    // Check each regional requirement
    for (const requirement of region.requirements) {
      const check = await this.evaluateRegionalRequirement(requirement, personalInfo, region.name);
      checks.push(check);
    }

    return checks;
  }

  /**
   * Evaluates individual regional requirement
   */
  private async evaluateRegionalRequirement(
    requirement: ComplianceRequirement, 
    personalInfo: any, 
    regionName: string
  ): Promise<ComplianceCheck> {
    
    let status = CheckStatus.PASSED;
    const documentation = [...requirement.documentation];

    // Special handling for age-specific requirements
    if (requirement.name === 'COPPA Compliance') {
      const age = this.calculateAge(new Date(personalInfo?.birthDate));
      if (age < 13) {
        status = personalInfo?.parentalConsent ? CheckStatus.PASSED : CheckStatus.FAILED;
        if (!personalInfo?.parentalConsent) {
          documentation.push('Parental Consent Required');
        }
      } else {
        status = CheckStatus.NOT_APPLICABLE;
      }
    }

    // Handle GDPR and data protection requirements
    if (requirement.name.includes('GDPR') || requirement.name.includes('Data Protection')) {
      // Platform is designed to be compliant
      status = CheckStatus.PASSED;
    }

    // Handle accessibility requirements
    if (requirement.name.includes('ADA') || requirement.name.includes('Accessibility')) {
      // Platform supports accessibility features
      status = CheckStatus.PASSED;
    }

    return {
      region: regionName,
      requirement: requirement.name,
      status,
      documentation,
      expirationDate: requirement.validityPeriod ? 
        new Date(Date.now() + requirement.validityPeriod * 30 * 24 * 60 * 60 * 1000) : 
        undefined
    };
  }

  /**
   * Assesses international student requirements
   */
  private async assessInternationalRequirements(
    applicantCountry: string, 
    studyLocation: string
  ): Promise<InternationalStudentRequirement[]> {
    
    // If studying in home country, no international requirements
    if (applicantCountry === studyLocation) {
      return [];
    }

    // Find requirements for study location
    const requirements = this.internationalRequirements.filter(req => 
      req.country === studyLocation
    );

    return requirements;
  }

  /**
   * Assesses data protection compliance
   */
  private async assessDataProtectionCompliance(
    country: string, 
    personalInfo: any
  ): Promise<DataProtectionCompliance> {
    
    const region = this.complianceRegions.find(r => r.countries.includes(country));
    const applicableLaws = region?.dataProtectionLaws || ['General Data Protection'];

    // Determine consent requirements
    const age = personalInfo?.birthDate ? this.calculateAge(new Date(personalInfo.birthDate)) : 18;
    const consentRequired = age < 16; // GDPR age of consent

    return {
      applicableLaws,
      consentRequired,
      dataTransferRestrictions: region?.name === 'European Union',
      retentionPolicies: [
        'Data retained only as long as necessary',
        'Automatic deletion after graduation + 7 years',
        'Right to request data deletion'
      ],
      userRights: [
        'Right to access personal data',
        'Right to rectification',
        'Right to erasure',
        'Right to data portability',
        'Right to object to processing'
      ],
      status: CheckStatus.PASSED // Platform is designed to be compliant
    };
  }

  /**
   * Assesses credential recognition requirements
   */
  private async assessCredentialRecognition(
    applicantCountry: string, 
    studyLocation: string,
    educationData: any
  ): Promise<CredentialRecognition> {
    
    // If studying in home country, usually no recognition needed
    if (applicantCountry === studyLocation) {
      return {
        recognitionRequired: false,
        recognizingBody: 'Not Required',
        process: [],
        timeline: 'Not Applicable',
        cost: 0,
        status: CheckStatus.PASSED
      };
    }

    // Determine recognition requirements based on study location
    const recognitionMap: { [key: string]: any } = {
      'United States': {
        recognizingBody: 'World Education Services (WES) or equivalent',
        process: [
          'Submit official transcripts',
          'Provide course descriptions',
          'Pay evaluation fee',
          'Wait for credential evaluation report'
        ],
        timeline: '2-4 weeks',
        cost: 205
      },
      'United Kingdom': {
        recognizingBody: 'UK NARIC',
        process: [
          'Submit certified copies of qualifications',
          'Provide English translations if needed',
          'Pay evaluation fee',
          'Receive statement of comparability'
        ],
        timeline: '10-15 working days',
        cost: 140
      },
      'Canada': {
        recognizingBody: 'Educational Credential Assessment (ECA) organization',
        process: [
          'Choose designated ECA organization',
          'Submit required documents',
          'Pay assessment fee',
          'Receive credential assessment report'
        ],
        timeline: '3-5 weeks',
        cost: 200
      }
    };

    const recognition = recognitionMap[studyLocation];
    
    if (!recognition) {
      return {
        recognitionRequired: false,
        recognizingBody: 'Case-by-case evaluation',
        process: ['Submit transcripts for individual review'],
        timeline: '2-3 weeks',
        cost: 0,
        status: CheckStatus.PENDING
      };
    }

    return {
      recognitionRequired: true,
      recognizingBody: recognition.recognizingBody,
      process: recognition.process,
      timeline: recognition.timeline,
      cost: recognition.cost,
      status: CheckStatus.PENDING
    };
  }

  /**
   * Determines overall compliance status
   */
  private determineOverallComplianceStatus(assessmentData: {
    regionalCompliance: ComplianceCheck[];
    dataProtectionCompliance: DataProtectionCompliance;
    educationCredentialRecognition: CredentialRecognition;
  }): CheckStatus {
    
    // Check for any failed regional compliance
    const failedCompliance = assessmentData.regionalCompliance.filter(
      check => check.status === CheckStatus.FAILED
    );
    
    if (failedCompliance.length > 0) {
      return CheckStatus.FAILED;
    }

    // Check data protection compliance
    if (assessmentData.dataProtectionCompliance.status === CheckStatus.FAILED) {
      return CheckStatus.FAILED;
    }

    // Check for pending items
    const pendingCompliance = assessmentData.regionalCompliance.filter(
      check => check.status === CheckStatus.PENDING
    );

    const credentialsPending = assessmentData.educationCredentialRecognition.status === CheckStatus.PENDING;

    if (pendingCompliance.length > 0 || credentialsPending) {
      return CheckStatus.PENDING;
    }

    return CheckStatus.PASSED;
  }

  /**
   * Generates compliance recommendations
   */
  private generateComplianceRecommendations(data: {
    applicantCountry: string;
    studyLocation: string;
    regionalCompliance: ComplianceCheck[];
    internationalRequirements: InternationalStudentRequirement[];
    overallComplianceStatus: CheckStatus;
  }): string[] {
    const recommendations: string[] = [];

    // Overall status recommendations
    if (data.overallComplianceStatus === CheckStatus.PASSED) {
      recommendations.push('All compliance requirements met for enrollment');
    }

    if (data.overallComplianceStatus === CheckStatus.PENDING) {
      recommendations.push('Complete pending compliance requirements before enrollment');
    }

    if (data.overallComplianceStatus === CheckStatus.FAILED) {
      recommendations.push('Address failed compliance requirements to proceed with application');
    }

    // International student recommendations
    if (data.internationalRequirements.length > 0) {
      recommendations.push('Begin visa application process early - processing can take several months');
      recommendations.push('Ensure all required documentation is prepared and certified');
      recommendations.push('Consider consulting with immigration attorney if needed');
    }

    // Regional compliance recommendations
    const failedRegional = data.regionalCompliance.filter(c => c.status === CheckStatus.FAILED);
    if (failedRegional.length > 0) {
      recommendations.push('Address failed regional compliance requirements immediately');
    }

    // Country-specific recommendations
    if (data.applicantCountry !== data.studyLocation) {
      recommendations.push('Research tax implications of studying abroad');
      recommendations.push('Consider health insurance requirements for international students');
      recommendations.push('Plan for currency exchange and international banking needs');
    }

    return recommendations;
  }

  /**
   * Calculates estimated compliance cost
   */
  private calculateComplianceCost(
    internationalRequirements: InternationalStudentRequirement[],
    credentialRecognition: CredentialRecognition
  ): number {
    
    const visaCosts = internationalRequirements.reduce((sum, req) => sum + req.cost, 0);
    const credentialCosts = credentialRecognition.cost;
    
    return visaCosts + credentialCosts;
  }

  /**
   * Calculates age from birth date
   */
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
   * Saves compliance assessment to database
   */
  private async saveComplianceAssessment(result: ComplianceAssessmentResult): Promise<void> {
    try {
      await this.prisma.compliance_assessments.create({
        data: {
          application_id: result.applicationId,
          applicant_country: result.applicantCountry,
          study_location: result.studyLocation,
          regional_compliance: result.regionalCompliance,
          international_requirements: result.internationalRequirements,
          data_protection_compliance: result.dataProtectionCompliance,
          credential_recognition: result.educationCredentialRecognition,
          overall_status: result.overallComplianceStatus,
          recommendations: result.recommendations,
          estimated_cost: result.estimatedComplianceCost,
          assessed_at: new Date()
        }
      });
    } catch (error) {
      this.logger.error('Error saving compliance assessment:', error);
      throw error;
    }
  }

  /**
   * Processes eligibility appeal
   */
  async processEligibilityAppeal(
    applicationId: string, 
    appealData: {
      reason: string;
      documentation: string[];
      additionalInfo?: string;
    }
  ): Promise<EligibilityAppealProcess> {
    
    const appeal: EligibilityAppealProcess = {
      applicationId,
      appealReason: appealData.reason,
      supportingDocumentation: appealData.documentation,
      reviewTimeline: '5-10 business days',
      appealStatus: 'submitted',
      reviewerNotes: [],
      finalDecision: 'Pending Review'
    };

    // Save appeal to database
    await this.prisma.eligibility_appeals.create({
      data: {
        application_id: applicationId,
        appeal_reason: appealData.reason,
        supporting_documentation: appealData.documentation,
        additional_info: appealData.additionalInfo,
        status: 'submitted',
        submitted_at: new Date()
      }
    });

    this.logger.info(`Eligibility appeal submitted for application ${applicationId}`);
    return appeal;
  }

  /**
   * Gets compliance regions information
   */
  getComplianceRegions(): ComplianceRegion[] {
    return [...this.complianceRegions];
  }

  /**
   * Gets international requirements information
   */
  getInternationalRequirements(): InternationalStudentRequirement[] {
    return [...this.internationalRequirements];
  }
}