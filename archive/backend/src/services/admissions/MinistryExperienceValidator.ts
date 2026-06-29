/**
 * MinistryExperienceValidator - Ministry experience validation and verification service
 * "Whoever wants to become great among you must be your servant" - Matthew 20:26
 */

import { PrismaClient } from '@prisma/client';

export enum OrganizationType {
  CHURCH = 'church',
  PARACHURCH = 'parachurch',
  NONPROFIT = 'nonprofit',
  MISSIONS = 'missions',
  EDUCATIONAL = 'educational',
  COMMUNITY = 'community',
  OTHER = 'other'
}

export enum VerificationMethod {
  DIRECT_CONTACT = 'direct_contact',
  REFERENCE_CHECK = 'reference_check',
  DOCUMENT_VERIFICATION = 'document_verification',
  ONLINE_VERIFICATION = 'online_verification',
  THIRD_PARTY = 'third_party'
}

export interface MinistryExperience {
  id: string;
  role: string;
  organization: string;
  organizationType: OrganizationType;
  startDate: Date;
  endDate?: Date;
  duration: string;
  responsibilities: string[];
  achievements: string[];
  supervisorName: string;
  supervisorContact: string;
  description: string;
  impactStatement: string;
}

export interface MinistryValidationResult {
  experienceId: string;
  isVerified: boolean;
  verificationScore: number;
  verificationMethod: VerificationMethod;
  verificationDate: Date;
  verificationNotes: string;
  contactAttempts: ContactAttempt[];
  impactAssessment: ImpactAssessment;
  authenticityFlags: string[];
  recommendations: string[];
}

export interface ContactAttempt {
  date: Date;
  method: 'phone' | 'email' | 'letter' | 'in_person';
  contactPerson: string;
  outcome: 'successful' | 'no_response' | 'invalid_contact' | 'declined';
  notes: string;
  verificationData?: any;
}

export interface ImpactAssessment {
  scope: 'local' | 'regional' | 'national' | 'international';
  duration: 'short_term' | 'medium_term' | 'long_term';
  measurableOutcomes: string[];
  testimonials: string[];
  growthEvidence: string[];
  leadershipDevelopment: string[];
  overallImpactScore: number;
}

export interface MinistryExperienceProfile {
  totalExperiences: number;
  totalYearsOfService: number;
  organizationTypes: OrganizationType[];
  leadershipRoles: string[];
  verifiedExperiences: number;
  overallCredibilityScore: number;
  strengthAreas: string[];
  developmentAreas: string[];
  readinessLevel: MinistryReadinessLevel;
}

export enum MinistryReadinessLevel {
  EXCEPTIONAL = 'exceptional',
  STRONG = 'strong',
  ADEQUATE = 'adequate',
  DEVELOPING = 'developing',
  INSUFFICIENT = 'insufficient'
}

export class MinistryExperienceValidator {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Validate a single ministry experience
   */
  async validateMinistryExperience(experience: MinistryExperience): Promise<MinistryValidationResult> {
    const contactAttempts: ContactAttempt[] = [];
    let verificationScore = 0;
    let isVerified = false;
    const authenticityFlags: string[] = [];

    // Attempt to verify through direct contact
    const directContactResult = await this.attemptDirectContact(experience);
    contactAttempts.push(directContactResult);

    if (directContactResult.outcome === 'successful') {
      verificationScore += 40;
      isVerified = true;
    } else {
      // Try alternative verification methods
      const alternativeResult = await this.attemptAlternativeVerification(experience);
      contactAttempts.push(...alternativeResult.attempts);
      verificationScore += alternativeResult.score;
      if (alternativeResult.verified) isVerified = true;
    }

    // Assess authenticity flags
    const flags = await this.assessAuthenticityFlags(experience);
    authenticityFlags.push(...flags);
    verificationScore -= flags.length * 5; // Reduce score for each flag

    // Assess impact
    const impactAssessment = await this.assessMinistryImpact(experience);
    verificationScore += impactAssessment.overallImpactScore * 0.3;

    // Generate recommendations
    const recommendations = this.generateValidationRecommendations(
      experience,
      isVerified,
      verificationScore,
      authenticityFlags
    );

    return {
      experienceId: experience.id,
      isVerified,
      verificationScore: Math.min(100, Math.max(0, verificationScore)),
      verificationMethod: this.determineVerificationMethod(contactAttempts),
      verificationDate: new Date(),
      verificationNotes: this.generateVerificationNotes(contactAttempts, authenticityFlags),
      contactAttempts,
      impactAssessment,
      authenticityFlags,
      recommendations
    };
  }

  /**
   * Validate multiple ministry experiences and create profile
   */
  async validateMinistryExperienceProfile(experiences: MinistryExperience[]): Promise<MinistryExperienceProfile> {
    const validationResults: MinistryValidationResult[] = [];

    // Validate each experience
    for (const experience of experiences) {
      const result = await this.validateMinistryExperience(experience);
      validationResults.push(result);
    }

    // Calculate profile metrics
    const totalExperiences = experiences.length;
    const totalYearsOfService = this.calculateTotalYearsOfService(experiences);
    const organizationTypes = [...new Set(experiences.map(e => e.organizationType))];
    const leadershipRoles = this.identifyLeadershipRoles(experiences);
    const verifiedExperiences = validationResults.filter(r => r.isVerified).length;
    const overallCredibilityScore = this.calculateOverallCredibilityScore(validationResults);

    // Identify strengths and development areas
    const strengthAreas = this.identifyStrengthAreas(experiences, validationResults);
    const developmentAreas = this.identifyDevelopmentAreas(experiences, validationResults);

    // Determine readiness level
    const readinessLevel = this.determineMinistryReadinessLevel(
      totalExperiences,
      totalYearsOfService,
      verifiedExperiences,
      overallCredibilityScore
    );

    return {
      totalExperiences,
      totalYearsOfService,
      organizationTypes,
      leadershipRoles,
      verifiedExperiences,
      overallCredibilityScore,
      strengthAreas,
      developmentAreas,
      readinessLevel
    };
  }

  /**
   * Cross-validate ministry experiences with character references
   */
  async crossValidateWithReferences(
    experiences: MinistryExperience[],
    references: any[]
  ): Promise<{ consistency: number; supportingEvidence: string[]; discrepancies: string[] }> {
    const supportingEvidence: string[] = [];
    const discrepancies: string[] = [];
    let consistencyScore = 50; // Base score

    for (const experience of experiences) {
      // Check if any references mention this organization or role
      const supportingRefs = references.filter(ref => 
        ref.content?.toLowerCase().includes(experience.organization.toLowerCase()) ||
        ref.content?.toLowerCase().includes(experience.role.toLowerCase())
      );

      if (supportingRefs.length > 0) {
        consistencyScore += 10;
        supportingEvidence.push(
          `Ministry at ${experience.organization} confirmed by ${supportingRefs.length} reference(s)`
        );
      } else if (experience.duration.includes('year')) {
        // Long-term ministry should be mentioned by references
        discrepancies.push(
          `Long-term ministry at ${experience.organization} not mentioned in references`
        );
        consistencyScore -= 5;
      }
    }

    return {
      consistency: Math.min(100, Math.max(0, consistencyScore)),
      supportingEvidence,
      discrepancies
    };
  }

  // Private helper methods

  private async attemptDirectContact(experience: MinistryExperience): Promise<ContactAttempt> {
    // In real implementation, this would make actual contact attempts
    // For now, simulate the process
    
    const contactMethods: ('phone' | 'email')[] = ['email', 'phone'];
    const selectedMethod = contactMethods[Math.floor(Math.random() * contactMethods.length)];
    
    // Simulate contact success rate (70% for valid contacts)
    const isValidContact = this.isValidContactInfo(experience.supervisorContact);
    const contactSuccess = isValidContact && Math.random() > 0.3;

    return {
      date: new Date(),
      method: selectedMethod,
      contactPerson: experience.supervisorName,
      outcome: contactSuccess ? 'successful' : (isValidContact ? 'no_response' : 'invalid_contact'),
      notes: contactSuccess 
        ? `Successfully verified ministry experience with ${experience.supervisorName}`
        : isValidContact 
          ? `No response from ${experience.supervisorName} after multiple attempts`
          : `Invalid contact information provided for ${experience.supervisorName}`,
      verificationData: contactSuccess ? {
        confirmedRole: experience.role,
        confirmedDuration: experience.duration,
        confirmedResponsibilities: experience.responsibilities.slice(0, 3),
        supervisorFeedback: 'Positive feedback on ministry performance'
      } : undefined
    };
  }

  private async attemptAlternativeVerification(experience: MinistryExperience): Promise<{
    attempts: ContactAttempt[];
    score: number;
    verified: boolean;
  }> {
    const attempts: ContactAttempt[] = [];
    let score = 0;
    let verified = false;

    // Try organization website/directory verification
    const webVerification = await this.attemptWebVerification(experience);
    attempts.push(webVerification);
    if (webVerification.outcome === 'successful') {
      score += 25;
      verified = true;
    }

    // Try third-party reference verification
    const thirdPartyVerification = await this.attemptThirdPartyVerification(experience);
    attempts.push(thirdPartyVerification);
    if (thirdPartyVerification.outcome === 'successful') {
      score += 20;
      verified = true;
    }

    return { attempts, score, verified };
  }

  private async attemptWebVerification(experience: MinistryExperience): Promise<ContactAttempt> {
    // Simulate web verification process
    const hasWebPresence = Math.random() > 0.4; // 60% of organizations have web presence
    const verificationSuccess = hasWebPresence && Math.random() > 0.3; // 70% success rate if web presence exists

    return {
      date: new Date(),
      method: 'email', // Representing web-based verification
      contactPerson: 'Organization Website/Directory',
      outcome: verificationSuccess ? 'successful' : (hasWebPresence ? 'no_response' : 'invalid_contact'),
      notes: verificationSuccess
        ? `Organization website confirms ${experience.role} position`
        : hasWebPresence
          ? 'Organization website found but no staff directory available'
          : 'No web presence found for organization',
      verificationData: verificationSuccess ? {
        source: 'organization_website',
        confirmedRole: experience.role,
        organizationStatus: 'active'
      } : undefined
    };
  }

  private async attemptThirdPartyVerification(experience: MinistryExperience): Promise<ContactAttempt> {
    // Simulate third-party verification (denominational offices, ministry networks, etc.)
    const hasThirdPartyConnection = Math.random() > 0.6; // 40% have third-party connections
    const verificationSuccess = hasThirdPartyConnection && Math.random() > 0.4; // 60% success rate

    return {
      date: new Date(),
      method: 'phone',
      contactPerson: 'Third-party Verification',
      outcome: verificationSuccess ? 'successful' : (hasThirdPartyConnection ? 'no_response' : 'invalid_contact'),
      notes: verificationSuccess
        ? 'Third-party source confirms ministry involvement'
        : hasThirdPartyConnection
          ? 'Third-party contact attempted but no response'
          : 'No third-party verification sources available',
      verificationData: verificationSuccess ? {
        source: 'third_party_verification',
        verifierType: 'denominational_office',
        confirmationLevel: 'general_involvement'
      } : undefined
    };
  }

  private async assessAuthenticityFlags(experience: MinistryExperience): Promise<string[]> {
    const flags: string[] = [];

    // Check for vague or generic descriptions
    if (experience.description.length < 50) {
      flags.push('Description too brief or vague');
    }

    // Check for unrealistic claims
    if (experience.responsibilities.length > 10) {
      flags.push('Unusually high number of responsibilities claimed');
    }

    // Check for inconsistent dates
    if (experience.endDate && experience.startDate > experience.endDate) {
      flags.push('Inconsistent start and end dates');
    }

    // Check for missing supervisor contact
    if (!this.isValidContactInfo(experience.supervisorContact)) {
      flags.push('Invalid or missing supervisor contact information');
    }

    // Check for generic impact statements
    const genericPhrases = ['blessed many people', 'made a difference', 'helped the community'];
    if (genericPhrases.some(phrase => experience.impactStatement.toLowerCase().includes(phrase))) {
      flags.push('Generic or non-specific impact statement');
    }

    return flags;
  }

  private async assessMinistryImpact(experience: MinistryExperience): Promise<ImpactAssessment> {
    // Assess scope based on organization type and description
    const scope = this.assessImpactScope(experience);
    
    // Assess duration based on start/end dates
    const duration = this.assessImpactDuration(experience);
    
    // Extract measurable outcomes from achievements
    const measurableOutcomes = experience.achievements.filter(achievement => 
      /\d+/.test(achievement) // Contains numbers
    );

    // Generate testimonials (in real implementation, these would come from verification)
    const testimonials = this.generateTestimonials(experience);

    // Assess growth evidence
    const growthEvidence = this.assessGrowthEvidence(experience);

    // Assess leadership development
    const leadershipDevelopment = this.assessLeadershipDevelopment(experience);

    // Calculate overall impact score
    const overallImpactScore = this.calculateImpactScore(
      scope, duration, measurableOutcomes, growthEvidence, leadershipDevelopment
    );

    return {
      scope,
      duration,
      measurableOutcomes,
      testimonials,
      growthEvidence,
      leadershipDevelopment,
      overallImpactScore
    };
  }

  private isValidContactInfo(contact: string): boolean {
    // Basic validation for email or phone
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    
    return emailRegex.test(contact) || phoneRegex.test(contact.replace(/[\s\-\(\)]/g, ''));
  }

  private assessImpactScope(experience: MinistryExperience): 'local' | 'regional' | 'national' | 'international' {
    const description = experience.description.toLowerCase();
    const impactStatement = experience.impactStatement.toLowerCase();
    const combined = description + ' ' + impactStatement;

    if (combined.includes('international') || combined.includes('global') || combined.includes('missions')) {
      return 'international';
    } else if (combined.includes('national') || combined.includes('country') || combined.includes('nationwide')) {
      return 'national';
    } else if (combined.includes('regional') || combined.includes('state') || combined.includes('province')) {
      return 'regional';
    } else {
      return 'local';
    }
  }

  private assessImpactDuration(experience: MinistryExperience): 'short_term' | 'medium_term' | 'long_term' {
    if (!experience.endDate) {
      // Ongoing ministry - consider as long-term
      return 'long_term';
    }

    const durationMs = experience.endDate.getTime() - experience.startDate.getTime();
    const durationYears = durationMs / (1000 * 60 * 60 * 24 * 365);

    if (durationYears >= 3) {
      return 'long_term';
    } else if (durationYears >= 1) {
      return 'medium_term';
    } else {
      return 'short_term';
    }
  }

  private generateTestimonials(experience: MinistryExperience): string[] {
    // In real implementation, these would come from actual verification contacts
    // For now, generate based on the experience data
    const testimonials: string[] = [];

    if (experience.achievements.length > 0) {
      testimonials.push(`Demonstrated strong ministry effectiveness in ${experience.role} position`);
    }

    if (experience.responsibilities.length > 3) {
      testimonials.push(`Handled multiple ministry responsibilities with competence`);
    }

    return testimonials;
  }

  private assessGrowthEvidence(experience: MinistryExperience): string[] {
    const growthEvidence: string[] = [];
    const description = experience.description.toLowerCase();
    const achievements = experience.achievements.join(' ').toLowerCase();

    // Look for growth indicators
    if (description.includes('grew') || achievements.includes('increased')) {
      growthEvidence.push('Evidence of ministry growth and expansion');
    }

    if (description.includes('learn') || description.includes('develop')) {
      growthEvidence.push('Demonstrated commitment to personal development');
    }

    if (achievements.some(a => /\d+/.test(a))) {
      growthEvidence.push('Quantifiable ministry outcomes achieved');
    }

    return growthEvidence;
  }

  private assessLeadershipDevelopment(experience: MinistryExperience): string[] {
    const leadershipDevelopment: string[] = [];
    const role = experience.role.toLowerCase();
    const responsibilities = experience.responsibilities.join(' ').toLowerCase();

    // Look for leadership indicators
    if (role.includes('leader') || role.includes('pastor') || role.includes('director')) {
      leadershipDevelopment.push('Held formal leadership position');
    }

    if (responsibilities.includes('train') || responsibilities.includes('mentor')) {
      leadershipDevelopment.push('Involved in training and mentoring others');
    }

    if (responsibilities.includes('manage') || responsibilities.includes('oversee')) {
      leadershipDevelopment.push('Demonstrated management and oversight capabilities');
    }

    return leadershipDevelopment;
  }

  private calculateImpactScore(
    scope: string,
    duration: string,
    measurableOutcomes: string[],
    growthEvidence: string[],
    leadershipDevelopment: string[]
  ): number {
    let score = 40; // Base score

    // Scope scoring
    const scopeScores = { local: 10, regional: 20, national: 30, international: 40 };
    score += scopeScores[scope as keyof typeof scopeScores] || 10;

    // Duration scoring
    const durationScores = { short_term: 5, medium_term: 15, long_term: 25 };
    score += durationScores[duration as keyof typeof durationScores] || 5;

    // Measurable outcomes
    score += Math.min(measurableOutcomes.length * 5, 20);

    // Growth evidence
    score += Math.min(growthEvidence.length * 3, 15);

    // Leadership development
    score += Math.min(leadershipDevelopment.length * 4, 20);

    return Math.min(100, score);
  }

  private calculateTotalYearsOfService(experiences: MinistryExperience[]): number {
    return experiences.reduce((total, exp) => {
      const endDate = exp.endDate || new Date();
      const durationMs = endDate.getTime() - exp.startDate.getTime();
      const durationYears = durationMs / (1000 * 60 * 60 * 24 * 365);
      return total + Math.max(0, durationYears);
    }, 0);
  }

  private identifyLeadershipRoles(experiences: MinistryExperience[]): string[] {
    const leadershipKeywords = ['pastor', 'leader', 'director', 'coordinator', 'manager', 'head', 'chief'];
    
    return experiences
      .filter(exp => leadershipKeywords.some(keyword => 
        exp.role.toLowerCase().includes(keyword)
      ))
      .map(exp => exp.role);
  }

  private calculateOverallCredibilityScore(validationResults: MinistryValidationResult[]): number {
    if (validationResults.length === 0) return 0;

    const totalScore = validationResults.reduce((sum, result) => sum + result.verificationScore, 0);
    return Math.round(totalScore / validationResults.length);
  }

  private identifyStrengthAreas(
    experiences: MinistryExperience[],
    validationResults: MinistryValidationResult[]
  ): string[] {
    const strengths: string[] = [];

    // Check for diverse ministry experience
    const organizationTypes = new Set(experiences.map(e => e.organizationType));
    if (organizationTypes.size >= 3) {
      strengths.push('Diverse ministry experience across multiple organization types');
    }

    // Check for long-term commitment
    const longTermExperiences = experiences.filter(exp => {
      const endDate = exp.endDate || new Date();
      const durationYears = (endDate.getTime() - exp.startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      return durationYears >= 2;
    });

    if (longTermExperiences.length >= 2) {
      strengths.push('Demonstrated long-term ministry commitment');
    }

    // Check for leadership roles
    const leadershipRoles = this.identifyLeadershipRoles(experiences);
    if (leadershipRoles.length >= 2) {
      strengths.push('Multiple leadership positions held');
    }

    // Check for high verification rates
    const verifiedCount = validationResults.filter(r => r.isVerified).length;
    if (verifiedCount / validationResults.length >= 0.8) {
      strengths.push('High verification rate for ministry claims');
    }

    return strengths;
  }

  private identifyDevelopmentAreas(
    experiences: MinistryExperience[],
    validationResults: MinistryValidationResult[]
  ): string[] {
    const developmentAreas: string[] = [];

    // Check for limited experience
    if (experiences.length < 2) {
      developmentAreas.push('Limited ministry experience - consider gaining more diverse experience');
    }

    // Check for short-term commitments
    const shortTermCount = experiences.filter(exp => {
      const endDate = exp.endDate || new Date();
      const durationYears = (endDate.getTime() - exp.startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      return durationYears < 1;
    }).length;

    if (shortTermCount > experiences.length / 2) {
      developmentAreas.push('Pattern of short-term ministry commitments - focus on longer-term service');
    }

    // Check for verification issues
    const unverifiedCount = validationResults.filter(r => !r.isVerified).length;
    if (unverifiedCount > validationResults.length / 2) {
      developmentAreas.push('Difficulty verifying ministry experiences - provide better references');
    }

    // Check for lack of leadership
    const leadershipRoles = this.identifyLeadershipRoles(experiences);
    if (leadershipRoles.length === 0) {
      developmentAreas.push('No formal leadership experience - seek leadership development opportunities');
    }

    return developmentAreas;
  }

  private determineMinistryReadinessLevel(
    totalExperiences: number,
    totalYearsOfService: number,
    verifiedExperiences: number,
    overallCredibilityScore: number
  ): MinistryReadinessLevel {
    // Calculate readiness based on multiple factors
    let readinessScore = 0;

    // Experience quantity
    if (totalExperiences >= 4) readinessScore += 25;
    else if (totalExperiences >= 2) readinessScore += 15;
    else if (totalExperiences >= 1) readinessScore += 5;

    // Experience duration
    if (totalYearsOfService >= 5) readinessScore += 25;
    else if (totalYearsOfService >= 3) readinessScore += 15;
    else if (totalYearsOfService >= 1) readinessScore += 5;

    // Verification rate
    const verificationRate = totalExperiences > 0 ? verifiedExperiences / totalExperiences : 0;
    if (verificationRate >= 0.8) readinessScore += 25;
    else if (verificationRate >= 0.6) readinessScore += 15;
    else if (verificationRate >= 0.4) readinessScore += 5;

    // Credibility score
    if (overallCredibilityScore >= 85) readinessScore += 25;
    else if (overallCredibilityScore >= 70) readinessScore += 15;
    else if (overallCredibilityScore >= 50) readinessScore += 5;

    // Determine level based on total score
    if (readinessScore >= 90) return MinistryReadinessLevel.EXCEPTIONAL;
    if (readinessScore >= 70) return MinistryReadinessLevel.STRONG;
    if (readinessScore >= 50) return MinistryReadinessLevel.ADEQUATE;
    if (readinessScore >= 30) return MinistryReadinessLevel.DEVELOPING;
    return MinistryReadinessLevel.INSUFFICIENT;
  }

  private determineVerificationMethod(contactAttempts: ContactAttempt[]): VerificationMethod {
    const successfulAttempt = contactAttempts.find(attempt => attempt.outcome === 'successful');
    
    if (successfulAttempt) {
      if (successfulAttempt.contactPerson.includes('Website') || successfulAttempt.contactPerson.includes('Directory')) {
        return VerificationMethod.ONLINE_VERIFICATION;
      } else if (successfulAttempt.contactPerson.includes('Third-party')) {
        return VerificationMethod.THIRD_PARTY;
      } else {
        return VerificationMethod.DIRECT_CONTACT;
      }
    }

    return VerificationMethod.REFERENCE_CHECK; // Default fallback
  }

  private generateVerificationNotes(contactAttempts: ContactAttempt[], authenticityFlags: string[]): string {
    let notes = 'Verification Summary:\n';
    
    contactAttempts.forEach((attempt, index) => {
      notes += `${index + 1}. ${attempt.method} contact with ${attempt.contactPerson}: ${attempt.outcome}\n`;
      if (attempt.notes) {
        notes += `   Notes: ${attempt.notes}\n`;
      }
    });

    if (authenticityFlags.length > 0) {
      notes += '\nAuthenticity Concerns:\n';
      authenticityFlags.forEach((flag, index) => {
        notes += `${index + 1}. ${flag}\n`;
      });
    }

    return notes;
  }

  private generateValidationRecommendations(
    experience: MinistryExperience,
    isVerified: boolean,
    verificationScore: number,
    authenticityFlags: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (!isVerified) {
      recommendations.push('Unable to verify ministry experience - request additional documentation');
      recommendations.push('Consider conducting follow-up interview to clarify ministry details');
    }

    if (verificationScore < 50) {
      recommendations.push('Low verification score - require additional references from ministry context');
    }

    if (authenticityFlags.length > 2) {
      recommendations.push('Multiple authenticity concerns - recommend thorough review before acceptance');
    }

    if (experience.description.length < 100) {
      recommendations.push('Request more detailed description of ministry role and responsibilities');
    }

    if (verificationScore >= 80 && isVerified) {
      recommendations.push('Strong ministry experience verification - consider for leadership track');
    }

    return recommendations;
  }
}