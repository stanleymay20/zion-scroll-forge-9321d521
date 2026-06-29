/**
 * ScrollUniversity Admissions - Identity Verification Service
 * "Many are called, but few are chosen" - Matthew 22:14
 * 
 * Comprehensive identity verification and background checking system
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import crypto from 'crypto';

export interface IdentityVerificationRequest {
  applicantId: string;
  personalInfo: PersonalInfo;
  documents: IdentityDocument[];
  biometricData?: BiometricData;
  verificationLevel: 'BASIC' | 'ENHANCED' | 'COMPREHENSIVE';
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: Date;
  placeOfBirth?: string;
  nationality: string;
  address: Address;
  phoneNumber: string;
  email: string;
  socialSecurityNumber?: string;
  passportNumber?: string;
  driversLicenseNumber?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IdentityDocument {
  type: 'PASSPORT' | 'DRIVERS_LICENSE' | 'NATIONAL_ID' | 'BIRTH_CERTIFICATE' | 'OTHER';
  documentNumber: string;
  issuingAuthority: string;
  issueDate: Date;
  expirationDate?: Date;
  documentImage: Buffer;
  extractedData: any;
}

export interface BiometricData {
  faceImage?: Buffer;
  fingerprints?: Buffer[];
  voiceSample?: Buffer;
  signatureSample?: Buffer;
}

export interface IdentityVerificationResult {
  applicantId: string;
  isVerified: boolean;
  verificationLevel: string;
  overallConfidence: number;
  verificationComponents: VerificationComponent[];
  riskFactors: RiskFactor[];
  recommendations: string[];
  backgroundCheckResults?: BackgroundCheckResult;
  verificationTimestamp: Date;
}

export interface VerificationComponent {
  component: string;
  status: 'PASSED' | 'FAILED' | 'PARTIAL' | 'PENDING';
  confidence: number;
  details: string;
  evidence: string[];
}

export interface RiskFactor {
  factor: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  impact: number;
}

export interface BackgroundCheckResult {
  criminalHistory: CriminalHistoryCheck;
  educationVerification: EducationVerificationCheck;
  employmentVerification: EmploymentVerificationCheck;
  creditCheck?: CreditCheck;
  sanctionsCheck: SanctionsCheck;
  overallClearance: 'CLEAR' | 'CONDITIONAL' | 'FLAGGED' | 'REJECTED';
}

export interface CriminalHistoryCheck {
  hasCriminalHistory: boolean;
  convictions: CriminalRecord[];
  pendingCharges: CriminalRecord[];
  clearanceLevel: 'CLEAR' | 'MINOR_ISSUES' | 'SIGNIFICANT_CONCERNS' | 'DISQUALIFYING';
}

export interface CriminalRecord {
  offense: string;
  date: Date;
  jurisdiction: string;
  disposition: string;
  severity: 'MISDEMEANOR' | 'FELONY' | 'INFRACTION';
}

export interface EducationVerificationCheck {
  institutions: EducationRecord[];
  overallVerification: 'VERIFIED' | 'PARTIAL' | 'UNVERIFIED' | 'FRAUDULENT';
}

export interface EducationRecord {
  institution: string;
  degree: string;
  graduationDate: Date;
  gpa?: number;
  verified: boolean;
  verificationSource: string;
}

export interface EmploymentVerificationCheck {
  employers: EmploymentRecord[];
  overallVerification: 'VERIFIED' | 'PARTIAL' | 'UNVERIFIED';
}

export interface EmploymentRecord {
  employer: string;
  position: string;
  startDate: Date;
  endDate?: Date;
  verified: boolean;
  verificationSource: string;
}

export interface CreditCheck {
  creditScore: number;
  creditHistory: string;
  bankruptcies: number;
  collections: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface SanctionsCheck {
  isOnSanctionsList: boolean;
  sanctionsFound: SanctionRecord[];
  watchlistMatches: WatchlistMatch[];
}

export interface SanctionRecord {
  listName: string;
  matchType: 'EXACT' | 'PARTIAL' | 'ALIAS';
  confidence: number;
  details: string;
}

export interface WatchlistMatch {
  listName: string;
  matchReason: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class IdentityVerificationService {
  private verificationProviders: Map<string, any> = new Map();
  private backgroundCheckProviders: Map<string, any> = new Map();

  constructor(private prisma: PrismaClient) {
    this.initializeProviders();
  }

  /**
   * Initialize verification service providers
   */
  private initializeProviders(): void {
    // In production, these would be actual service integrations
    this.verificationProviders.set('document_verification', {
      name: 'Document Verification Service',
      endpoint: process.env.DOCUMENT_VERIFICATION_ENDPOINT || 'https://api.documentverify.com',
      apiKey: process.env.DOCUMENT_VERIFICATION_API_KEY || 'test-key'
    });

    this.verificationProviders.set('biometric_verification', {
      name: 'Biometric Verification Service',
      endpoint: process.env.BIOMETRIC_VERIFICATION_ENDPOINT || 'https://api.biometricverify.com',
      apiKey: process.env.BIOMETRIC_VERIFICATION_API_KEY || 'test-key'
    });

    this.backgroundCheckProviders.set('criminal_background', {
      name: 'Criminal Background Check Service',
      endpoint: process.env.CRIMINAL_CHECK_ENDPOINT || 'https://api.criminalcheck.com',
      apiKey: process.env.CRIMINAL_CHECK_API_KEY || 'test-key'
    });

    this.backgroundCheckProviders.set('education_verification', {
      name: 'Education Verification Service',
      endpoint: process.env.EDUCATION_VERIFICATION_ENDPOINT || 'https://api.educationverify.com',
      apiKey: process.env.EDUCATION_VERIFICATION_API_KEY || 'test-key'
    });
  }

  /**
   * Perform comprehensive identity verification
   */
  async verifyIdentity(request: IdentityVerificationRequest): Promise<IdentityVerificationResult> {
    try {
      logger.info(`Starting identity verification for applicant ${request.applicantId}`);

      const verificationComponents: VerificationComponent[] = [];
      const riskFactors: RiskFactor[] = [];

      // Document verification
      const documentVerification = await this.verifyDocuments(request.documents);
      verificationComponents.push(documentVerification);

      // Personal information verification
      const personalInfoVerification = await this.verifyPersonalInformation(request.personalInfo);
      verificationComponents.push(personalInfoVerification);

      // Biometric verification (if available)
      if (request.biometricData) {
        const biometricVerification = await this.verifyBiometrics(request.biometricData, request.documents);
        verificationComponents.push(biometricVerification);
      }

      // Cross-reference verification
      const crossReferenceVerification = await this.performCrossReferenceVerification(
        request.personalInfo,
        request.documents
      );
      verificationComponents.push(crossReferenceVerification);

      // Background check (for enhanced/comprehensive verification)
      let backgroundCheckResults: BackgroundCheckResult | undefined;
      if (request.verificationLevel === 'ENHANCED' || request.verificationLevel === 'COMPREHENSIVE') {
        backgroundCheckResults = await this.performBackgroundCheck(request.personalInfo);
      }

      // Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(verificationComponents);

      // Identify risk factors
      const identifiedRiskFactors = this.identifyRiskFactors(verificationComponents, backgroundCheckResults);
      riskFactors.push(...identifiedRiskFactors);

      // Determine verification status
      const isVerified = this.determineVerificationStatus(overallConfidence, riskFactors);

      // Generate recommendations
      const recommendations = this.generateVerificationRecommendations(
        overallConfidence,
        riskFactors,
        verificationComponents
      );

      const result: IdentityVerificationResult = {
        applicantId: request.applicantId,
        isVerified,
        verificationLevel: request.verificationLevel,
        overallConfidence,
        verificationComponents,
        riskFactors,
        recommendations,
        backgroundCheckResults,
        verificationTimestamp: new Date()
      };

      // Log verification result
      await this.logVerificationResult(result);

      logger.info(`Identity verification completed for applicant ${request.applicantId}: ${isVerified ? 'VERIFIED' : 'NOT VERIFIED'}`);

      return result;
    } catch (error) {
      logger.error('Identity verification failed:', error);
      throw new Error(`Identity verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify identity documents
   */
  private async verifyDocuments(documents: IdentityDocument[]): Promise<VerificationComponent> {
    try {
      let totalConfidence = 0;
      const evidence: string[] = [];
      let passedCount = 0;

      for (const document of documents) {
        // Verify document authenticity
        const authenticity = await this.verifyDocumentAuthenticity(document);
        
        // Verify document data extraction
        const dataExtraction = await this.verifyDocumentDataExtraction(document);
        
        // Verify document against issuing authority
        const authorityVerification = await this.verifyWithIssuingAuthority(document);

        const documentConfidence = (authenticity + dataExtraction + authorityVerification) / 3;
        totalConfidence += documentConfidence;

        if (documentConfidence > 0.7) {
          passedCount++;
          evidence.push(`${document.type} verified with ${(documentConfidence * 100).toFixed(1)}% confidence`);
        } else {
          evidence.push(`${document.type} failed verification (${(documentConfidence * 100).toFixed(1)}% confidence)`);
        }
      }

      const overallConfidence = documents.length > 0 ? totalConfidence / documents.length : 0;
      const status = passedCount === documents.length ? 'PASSED' : 
                    passedCount > 0 ? 'PARTIAL' : 'FAILED';

      return {
        component: 'DOCUMENT_VERIFICATION',
        status,
        confidence: overallConfidence,
        details: `Verified ${passedCount}/${documents.length} documents`,
        evidence
      };
    } catch (error) {
      logger.error('Document verification failed:', error);
      return {
        component: 'DOCUMENT_VERIFICATION',
        status: 'FAILED',
        confidence: 0,
        details: 'Document verification service unavailable',
        evidence: ['Service error occurred during document verification']
      };
    }
  }

  /**
   * Verify personal information consistency
   */
  private async verifyPersonalInformation(personalInfo: PersonalInfo): Promise<VerificationComponent> {
    try {
      const evidence: string[] = [];
      let confidence = 0.5; // Base confidence

      // Verify name format and consistency
      if (this.isValidName(personalInfo.firstName) && this.isValidName(personalInfo.lastName)) {
        confidence += 0.1;
        evidence.push('Name format is valid');
      }

      // Verify date of birth reasonableness
      if (this.isReasonableDateOfBirth(personalInfo.dateOfBirth)) {
        confidence += 0.1;
        evidence.push('Date of birth is reasonable');
      }

      // Verify address format
      if (this.isValidAddress(personalInfo.address)) {
        confidence += 0.1;
        evidence.push('Address format is valid');
      }

      // Verify phone number format
      if (this.isValidPhoneNumber(personalInfo.phoneNumber)) {
        confidence += 0.1;
        evidence.push('Phone number format is valid');
      }

      // Verify email format
      if (this.isValidEmail(personalInfo.email)) {
        confidence += 0.1;
        evidence.push('Email format is valid');
      }

      // Cross-check with public records (if available)
      const publicRecordsMatch = await this.checkPublicRecords(personalInfo);
      if (publicRecordsMatch.found) {
        confidence += 0.1;
        evidence.push('Information matches public records');
      }

      const status = confidence > 0.7 ? 'PASSED' : confidence > 0.5 ? 'PARTIAL' : 'FAILED';

      return {
        component: 'PERSONAL_INFO_VERIFICATION',
        status,
        confidence: Math.min(1, confidence),
        details: 'Personal information consistency check',
        evidence
      };
    } catch (error) {
      logger.error('Personal information verification failed:', error);
      return {
        component: 'PERSONAL_INFO_VERIFICATION',
        status: 'FAILED',
        confidence: 0,
        details: 'Personal information verification failed',
        evidence: ['Error occurred during personal information verification']
      };
    }
  }

  /**
   * Verify biometric data
   */
  private async verifyBiometrics(
    biometricData: BiometricData,
    documents: IdentityDocument[]
  ): Promise<VerificationComponent> {
    try {
      const evidence: string[] = [];
      let confidence = 0;
      let verificationCount = 0;

      // Face verification against document photos
      if (biometricData.faceImage) {
        const faceMatch = await this.verifyFaceMatch(biometricData.faceImage, documents);
        confidence += faceMatch.confidence;
        verificationCount++;
        evidence.push(`Face verification: ${(faceMatch.confidence * 100).toFixed(1)}% match`);
      }

      // Signature verification
      if (biometricData.signatureSample) {
        const signatureMatch = await this.verifySignature(biometricData.signatureSample, documents);
        confidence += signatureMatch.confidence;
        verificationCount++;
        evidence.push(`Signature verification: ${(signatureMatch.confidence * 100).toFixed(1)}% match`);
      }

      const overallConfidence = verificationCount > 0 ? confidence / verificationCount : 0;
      const status = overallConfidence > 0.8 ? 'PASSED' : overallConfidence > 0.6 ? 'PARTIAL' : 'FAILED';

      return {
        component: 'BIOMETRIC_VERIFICATION',
        status,
        confidence: overallConfidence,
        details: `Biometric verification using ${verificationCount} methods`,
        evidence
      };
    } catch (error) {
      logger.error('Biometric verification failed:', error);
      return {
        component: 'BIOMETRIC_VERIFICATION',
        status: 'FAILED',
        confidence: 0,
        details: 'Biometric verification service unavailable',
        evidence: ['Error occurred during biometric verification']
      };
    }
  }

  /**
   * Perform cross-reference verification
   */
  private async performCrossReferenceVerification(
    personalInfo: PersonalInfo,
    documents: IdentityDocument[]
  ): Promise<VerificationComponent> {
    try {
      const evidence: string[] = [];
      let matchCount = 0;
      let totalChecks = 0;

      // Cross-check names across documents
      const nameConsistency = this.checkNameConsistency(personalInfo, documents);
      totalChecks++;
      if (nameConsistency.isConsistent) {
        matchCount++;
        evidence.push('Names are consistent across all documents');
      } else {
        evidence.push(`Name inconsistencies found: ${nameConsistency.issues.join(', ')}`);
      }

      // Cross-check dates of birth
      const dobConsistency = this.checkDateOfBirthConsistency(personalInfo, documents);
      totalChecks++;
      if (dobConsistency.isConsistent) {
        matchCount++;
        evidence.push('Date of birth is consistent across all documents');
      } else {
        evidence.push(`Date of birth inconsistencies found: ${dobConsistency.issues.join(', ')}`);
      }

      // Cross-check addresses (if available in documents)
      const addressConsistency = this.checkAddressConsistency(personalInfo, documents);
      if (addressConsistency.hasAddressData) {
        totalChecks++;
        if (addressConsistency.isConsistent) {
          matchCount++;
          evidence.push('Address information is consistent');
        } else {
          evidence.push(`Address inconsistencies found: ${addressConsistency.issues.join(', ')}`);
        }
      }

      const confidence = totalChecks > 0 ? matchCount / totalChecks : 0;
      const status = confidence > 0.8 ? 'PASSED' : confidence > 0.5 ? 'PARTIAL' : 'FAILED';

      return {
        component: 'CROSS_REFERENCE_VERIFICATION',
        status,
        confidence,
        details: `Cross-referenced ${totalChecks} data points with ${matchCount} matches`,
        evidence
      };
    } catch (error) {
      logger.error('Cross-reference verification failed:', error);
      return {
        component: 'CROSS_REFERENCE_VERIFICATION',
        status: 'FAILED',
        confidence: 0,
        details: 'Cross-reference verification failed',
        evidence: ['Error occurred during cross-reference verification']
      };
    }
  }

  /**
   * Perform comprehensive background check
   */
  private async performBackgroundCheck(personalInfo: PersonalInfo): Promise<BackgroundCheckResult> {
    try {
      logger.info('Starting background check');

      // Criminal history check
      const criminalHistory = await this.performCriminalHistoryCheck(personalInfo);

      // Education verification
      const educationVerification = await this.performEducationVerification(personalInfo);

      // Employment verification
      const employmentVerification = await this.performEmploymentVerification(personalInfo);

      // Sanctions and watchlist check
      const sanctionsCheck = await this.performSanctionsCheck(personalInfo);

      // Determine overall clearance
      const overallClearance = this.determineOverallClearance(
        criminalHistory,
        educationVerification,
        employmentVerification,
        sanctionsCheck
      );

      return {
        criminalHistory,
        educationVerification,
        employmentVerification,
        sanctionsCheck,
        overallClearance
      };
    } catch (error) {
      logger.error('Background check failed:', error);
      throw new Error(`Background check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper methods for document verification
  private async verifyDocumentAuthenticity(document: IdentityDocument): Promise<number> {
    // Placeholder for document authenticity verification
    // In production, this would integrate with document verification services
    return 0.85; // Mock confidence score
  }

  private async verifyDocumentDataExtraction(document: IdentityDocument): Promise<number> {
    // Placeholder for OCR/data extraction verification
    return 0.9; // Mock confidence score
  }

  private async verifyWithIssuingAuthority(document: IdentityDocument): Promise<number> {
    // Placeholder for issuing authority verification
    // In production, this would check with DMV, passport offices, etc.
    return 0.8; // Mock confidence score
  }

  // Helper methods for personal information verification
  private isValidName(name: string): boolean {
    return /^[a-zA-Z\s\-'\.]+$/.test(name) && name.length >= 2 && name.length <= 50;
  }

  private isReasonableDateOfBirth(dob: Date): boolean {
    const now = new Date();
    const age = now.getFullYear() - dob.getFullYear();
    return age >= 16 && age <= 100;
  }

  private isValidAddress(address: Address): boolean {
    return address.street.length > 0 && 
           address.city.length > 0 && 
           address.state.length > 0 && 
           address.country.length > 0;
  }

  private isValidPhoneNumber(phone: string): boolean {
    return /^\+?[\d\s\-\(\)]{10,15}$/.test(phone);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private async checkPublicRecords(personalInfo: PersonalInfo): Promise<{ found: boolean; confidence: number }> {
    // Placeholder for public records check
    return { found: true, confidence: 0.7 };
  }

  // Helper methods for biometric verification
  private async verifyFaceMatch(faceImage: Buffer, documents: IdentityDocument[]): Promise<{ confidence: number }> {
    // Placeholder for face matching
    return { confidence: 0.85 };
  }

  private async verifySignature(signatureSample: Buffer, documents: IdentityDocument[]): Promise<{ confidence: number }> {
    // Placeholder for signature verification
    return { confidence: 0.8 };
  }

  // Helper methods for cross-reference verification
  private checkNameConsistency(
    personalInfo: PersonalInfo,
    documents: IdentityDocument[]
  ): { isConsistent: boolean; issues: string[] } {
    const issues: string[] = [];
    
    for (const document of documents) {
      if (document.extractedData && document.extractedData.name) {
        const extractedName = document.extractedData.name.toLowerCase();
        const providedName = `${personalInfo.firstName} ${personalInfo.lastName}`.toLowerCase();
        
        if (!this.namesMatch(extractedName, providedName)) {
          issues.push(`Name mismatch in ${document.type}: ${document.extractedData.name}`);
        }
      }
    }

    return {
      isConsistent: issues.length === 0,
      issues
    };
  }

  private checkDateOfBirthConsistency(
    personalInfo: PersonalInfo,
    documents: IdentityDocument[]
  ): { isConsistent: boolean; issues: string[] } {
    const issues: string[] = [];
    
    for (const document of documents) {
      if (document.extractedData && document.extractedData.dateOfBirth) {
        const extractedDOB = new Date(document.extractedData.dateOfBirth);
        if (extractedDOB.getTime() !== personalInfo.dateOfBirth.getTime()) {
          issues.push(`Date of birth mismatch in ${document.type}`);
        }
      }
    }

    return {
      isConsistent: issues.length === 0,
      issues
    };
  }

  private checkAddressConsistency(
    personalInfo: PersonalInfo,
    documents: IdentityDocument[]
  ): { hasAddressData: boolean; isConsistent: boolean; issues: string[] } {
    const issues: string[] = [];
    let hasAddressData = false;
    
    for (const document of documents) {
      if (document.extractedData && document.extractedData.address) {
        hasAddressData = true;
        // Simplified address comparison
        if (!this.addressesMatch(document.extractedData.address, personalInfo.address)) {
          issues.push(`Address mismatch in ${document.type}`);
        }
      }
    }

    return {
      hasAddressData,
      isConsistent: issues.length === 0,
      issues
    };
  }

  private namesMatch(name1: string, name2: string): boolean {
    // Simplified name matching - in production would use more sophisticated algorithms
    const normalize = (name: string) => name.replace(/[^a-z\s]/g, '').trim();
    return normalize(name1) === normalize(name2);
  }

  private addressesMatch(addr1: any, addr2: Address): boolean {
    // Simplified address matching
    return addr1.city?.toLowerCase() === addr2.city.toLowerCase() &&
           addr1.state?.toLowerCase() === addr2.state.toLowerCase();
  }

  // Background check helper methods
  private async performCriminalHistoryCheck(personalInfo: PersonalInfo): Promise<CriminalHistoryCheck> {
    // Placeholder for criminal history check
    return {
      hasCriminalHistory: false,
      convictions: [],
      pendingCharges: [],
      clearanceLevel: 'CLEAR'
    };
  }

  private async performEducationVerification(personalInfo: PersonalInfo): Promise<EducationVerificationCheck> {
    // Placeholder for education verification
    return {
      institutions: [],
      overallVerification: 'VERIFIED'
    };
  }

  private async performEmploymentVerification(personalInfo: PersonalInfo): Promise<EmploymentVerificationCheck> {
    // Placeholder for employment verification
    return {
      employers: [],
      overallVerification: 'VERIFIED'
    };
  }

  private async performSanctionsCheck(personalInfo: PersonalInfo): Promise<SanctionsCheck> {
    // Placeholder for sanctions check
    return {
      isOnSanctionsList: false,
      sanctionsFound: [],
      watchlistMatches: []
    };
  }

  private determineOverallClearance(
    criminalHistory: CriminalHistoryCheck,
    educationVerification: EducationVerificationCheck,
    employmentVerification: EmploymentVerificationCheck,
    sanctionsCheck: SanctionsCheck
  ): 'CLEAR' | 'CONDITIONAL' | 'FLAGGED' | 'REJECTED' {
    if (sanctionsCheck.isOnSanctionsList) return 'REJECTED';
    if (criminalHistory.clearanceLevel === 'DISQUALIFYING') return 'REJECTED';
    if (criminalHistory.clearanceLevel === 'SIGNIFICANT_CONCERNS') return 'FLAGGED';
    if (educationVerification.overallVerification === 'FRAUDULENT') return 'REJECTED';
    if (criminalHistory.clearanceLevel === 'MINOR_ISSUES') return 'CONDITIONAL';
    
    return 'CLEAR';
  }

  // Result calculation methods
  private calculateOverallConfidence(components: VerificationComponent[]): number {
    if (components.length === 0) return 0;

    const weights = {
      'DOCUMENT_VERIFICATION': 0.4,
      'PERSONAL_INFO_VERIFICATION': 0.2,
      'BIOMETRIC_VERIFICATION': 0.3,
      'CROSS_REFERENCE_VERIFICATION': 0.1
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const component of components) {
      const weight = weights[component.component as keyof typeof weights] || 0.1;
      totalScore += component.confidence * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private identifyRiskFactors(
    components: VerificationComponent[],
    backgroundCheck?: BackgroundCheckResult
  ): RiskFactor[] {
    const riskFactors: RiskFactor[] = [];

    // Check for failed verification components
    for (const component of components) {
      if (component.status === 'FAILED') {
        riskFactors.push({
          factor: `${component.component}_FAILURE`,
          severity: 'HIGH',
          description: `${component.component} verification failed`,
          impact: 0.8
        });
      } else if (component.status === 'PARTIAL' && component.confidence < 0.6) {
        riskFactors.push({
          factor: `${component.component}_LOW_CONFIDENCE`,
          severity: 'MEDIUM',
          description: `${component.component} has low confidence score`,
          impact: 0.5
        });
      }
    }

    // Check background check results
    if (backgroundCheck) {
      if (backgroundCheck.overallClearance === 'FLAGGED') {
        riskFactors.push({
          factor: 'BACKGROUND_CHECK_FLAGGED',
          severity: 'HIGH',
          description: 'Background check raised concerns',
          impact: 0.7
        });
      } else if (backgroundCheck.overallClearance === 'CONDITIONAL') {
        riskFactors.push({
          factor: 'BACKGROUND_CHECK_CONDITIONAL',
          severity: 'MEDIUM',
          description: 'Background check has minor issues',
          impact: 0.4
        });
      }
    }

    return riskFactors;
  }

  private determineVerificationStatus(confidence: number, riskFactors: RiskFactor[]): boolean {
    // High confidence and no critical risk factors
    if (confidence > 0.8 && !riskFactors.some(rf => rf.severity === 'CRITICAL')) {
      return true;
    }

    // Medium confidence with no high-severity risk factors
    if (confidence > 0.6 && !riskFactors.some(rf => rf.severity === 'HIGH' || rf.severity === 'CRITICAL')) {
      return true;
    }

    return false;
  }

  private generateVerificationRecommendations(
    confidence: number,
    riskFactors: RiskFactor[],
    components: VerificationComponent[]
  ): string[] {
    const recommendations: string[] = [];

    if (confidence < 0.6) {
      recommendations.push('Manual review required due to low confidence score');
    }

    if (riskFactors.some(rf => rf.severity === 'CRITICAL')) {
      recommendations.push('Immediate rejection recommended due to critical risk factors');
    } else if (riskFactors.some(rf => rf.severity === 'HIGH')) {
      recommendations.push('Enhanced verification process required');
    }

    // Component-specific recommendations
    const failedComponents = components.filter(c => c.status === 'FAILED');
    if (failedComponents.length > 0) {
      recommendations.push(`Re-verify failed components: ${failedComponents.map(c => c.component).join(', ')}`);
    }

    const partialComponents = components.filter(c => c.status === 'PARTIAL');
    if (partialComponents.length > 0) {
      recommendations.push(`Request additional documentation for: ${partialComponents.map(c => c.component).join(', ')}`);
    }

    return recommendations;
  }

  private async logVerificationResult(result: IdentityVerificationResult): Promise<void> {
    try {
      await this.prisma.identityVerificationResult.create({
        data: {
          applicantId: result.applicantId,
          isVerified: result.isVerified,
          verificationLevel: result.verificationLevel,
          overallConfidence: result.overallConfidence,
          verificationComponents: JSON.stringify(result.verificationComponents),
          riskFactors: JSON.stringify(result.riskFactors),
          recommendations: JSON.stringify(result.recommendations),
          backgroundCheckResults: result.backgroundCheckResults ? JSON.stringify(result.backgroundCheckResults) : null,
          verifiedAt: result.verificationTimestamp
        }
      });
    } catch (error) {
      logger.error('Failed to log verification result:', error);
    }
  }
}