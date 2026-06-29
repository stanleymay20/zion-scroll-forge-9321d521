import { PrismaClient } from '@prisma/client';
import { Logger } from '../../utils/logger';
import { LanguageAssessment, CheckStatus } from './EligibilityChecker';

export interface LanguageTest {
  type: string;
  name: string;
  minScore: number;
  maxScore: number;
  validityPeriod: number; // in months
  acceptedLevels: string[];
}

export interface LanguageProficiencyResult {
  applicationId: string;
  primaryLanguage: string;
  assessments: LanguageAssessment[];
  overallProficiency: string;
  accommodationsRecommended: string[];
  status: CheckStatus;
  recommendations: string[];
}

export interface LanguageAccommodation {
  type: string;
  description: string;
  cost: number;
  duration: string;
}

export class LanguageProficiencyValidator {
  private prisma: PrismaClient;
  private logger: Logger;
  private acceptedTests: LanguageTest[];
  private supportedLanguages: string[];

  constructor() {
    this.prisma = new PrismaClient();
    this.logger = new Logger('LanguageProficiencyValidator');
    this.initializeLanguageTests();
    this.initializeSupportedLanguages();
  }

  /**
   * Initialize accepted language proficiency tests
   */
  private initializeLanguageTests(): void {
    this.acceptedTests = [
      {
        type: 'TOEFL',
        name: 'Test of English as a Foreign Language',
        minScore: 80,
        maxScore: 120,
        validityPeriod: 24,
        acceptedLevels: ['Intermediate', 'Advanced', 'Proficient']
      },
      {
        type: 'IELTS',
        name: 'International English Language Testing System',
        minScore: 6.5,
        maxScore: 9.0,
        validityPeriod: 24,
        acceptedLevels: ['Intermediate', 'Advanced', 'Proficient']
      },
      {
        type: 'DUOLINGO',
        name: 'Duolingo English Test',
        minScore: 105,
        maxScore: 160,
        validityPeriod: 24,
        acceptedLevels: ['Intermediate', 'Advanced', 'Proficient']
      },
      {
        type: 'CAMBRIDGE',
        name: 'Cambridge English Assessment',
        minScore: 169,
        maxScore: 230,
        validityPeriod: 36,
        acceptedLevels: ['B2', 'C1', 'C2']
      },
      {
        type: 'SCROLL_ASSESSMENT',
        name: 'ScrollUniversity Language Assessment',
        minScore: 75,
        maxScore: 100,
        validityPeriod: 12,
        acceptedLevels: ['Intermediate', 'Advanced', 'Proficient']
      }
    ];
  }

  /**
   * Initialize supported languages for ScrollUniversity
   */
  private initializeSupportedLanguages(): void {
    this.supportedLanguages = [
      'English',
      'Spanish',
      'Portuguese',
      'French',
      'German',
      'Italian',
      'Dutch',
      'Russian',
      'Chinese (Mandarin)',
      'Japanese',
      'Korean',
      'Arabic',
      'Hebrew',
      'Hindi',
      'Swahili'
    ];
  }

  /**
   * Assesses language proficiency for an application
   */
  async assessLanguageProficiency(applicationId: string): Promise<LanguageProficiencyResult> {
    try {
      this.logger.info(`Assessing language proficiency for application ${applicationId}`);

      // Get application data
      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId }
      });

      if (!application) {
        throw new Error(`Application ${applicationId} not found`);
      }

      const languageData = application.application_data?.language;
      if (!languageData) {
        throw new Error('Language data not found in application');
      }

      // Determine primary language
      const primaryLanguage = languageData.primaryLanguage || 'English';

      // Assess each language proficiency
      const assessments = await this.evaluateLanguageAssessments(languageData);

      // Determine overall proficiency
      const overallProficiency = this.determineOverallProficiency(assessments);

      // Check if accommodations are needed
      const accommodationsRecommended = await this.recommendAccommodations(
        primaryLanguage, 
        assessments
      );

      // Determine overall status
      const status = this.determineLanguageStatus(assessments, primaryLanguage);

      // Generate recommendations
      const recommendations = this.generateLanguageRecommendations(
        assessments, 
        primaryLanguage, 
        status
      );

      const result: LanguageProficiencyResult = {
        applicationId,
        primaryLanguage,
        assessments,
        overallProficiency,
        accommodationsRecommended,
        status,
        recommendations
      };

      this.logger.info(`Language proficiency assessment completed for application ${applicationId}: ${status}`);
      return result;

    } catch (error) {
      this.logger.error(`Error assessing language proficiency for application ${applicationId}:`, error);
      throw error;
    }
  }

  /**
   * Evaluates language assessments from application data
   */
  private async evaluateLanguageAssessments(languageData: any): Promise<LanguageAssessment[]> {
    const assessments: LanguageAssessment[] = [];

    // Process native language
    if (languageData.nativeLanguage) {
      assessments.push({
        primaryLanguage: languageData.nativeLanguage,
        proficiencyLevel: 'Native',
        status: CheckStatus.PASSED,
        accommodationsNeeded: false
      });
    }

    // Process English proficiency if not native
    if (languageData.englishProficiency && languageData.nativeLanguage !== 'English') {
      const englishAssessment = await this.evaluateEnglishProficiency(languageData.englishProficiency);
      assessments.push(englishAssessment);
    }

    // Process additional languages
    if (languageData.additionalLanguages) {
      for (const lang of languageData.additionalLanguages) {
        const assessment = await this.evaluateAdditionalLanguage(lang);
        assessments.push(assessment);
      }
    }

    return assessments;
  }

  /**
   * Evaluates English proficiency specifically
   */
  private async evaluateEnglishProficiency(englishData: any): Promise<LanguageAssessment> {
    const assessment: LanguageAssessment = {
      primaryLanguage: 'English',
      proficiencyLevel: englishData.selfAssessedLevel || 'Unknown',
      status: CheckStatus.PENDING,
      accommodationsNeeded: false
    };

    // Check for standardized test scores
    if (englishData.testScore && englishData.testType) {
      const testInfo = this.acceptedTests.find(test => 
        test.type.toLowerCase() === englishData.testType.toLowerCase()
      );

      if (testInfo) {
        assessment.testScore = englishData.testScore;
        assessment.testType = englishData.testType;

        // Check if score meets minimum requirement
        const meetsMinimum = englishData.testScore >= testInfo.minScore;
        
        // Check if test is still valid
        const testDate = new Date(englishData.testDate);
        const monthsOld = this.getMonthsDifference(testDate, new Date());
        const isValid = monthsOld <= testInfo.validityPeriod;

        if (meetsMinimum && isValid) {
          assessment.status = CheckStatus.PASSED;
          assessment.proficiencyLevel = this.mapScoreToProficiency(
            englishData.testScore, 
            testInfo
          );
        } else if (!meetsMinimum) {
          assessment.status = CheckStatus.FAILED;
          assessment.accommodationsNeeded = true;
        } else if (!isValid) {
          assessment.status = CheckStatus.PENDING;
          assessment.accommodationsNeeded = true;
        }
      }
    } else {
      // No test score provided - may need assessment
      assessment.status = CheckStatus.PENDING;
      assessment.accommodationsNeeded = true;
    }

    return assessment;
  }

  /**
   * Evaluates additional language proficiency
   */
  private async evaluateAdditionalLanguage(languageData: any): Promise<LanguageAssessment> {
    return {
      primaryLanguage: languageData.language,
      proficiencyLevel: languageData.level || 'Basic',
      status: this.supportedLanguages.includes(languageData.language) ? 
        CheckStatus.PASSED : CheckStatus.NOT_APPLICABLE,
      accommodationsNeeded: false
    };
  }

  /**
   * Maps test score to proficiency level
   */
  private mapScoreToProficiency(score: number, testInfo: LanguageTest): string {
    const percentage = (score - testInfo.minScore) / (testInfo.maxScore - testInfo.minScore);
    
    if (percentage >= 0.8) return 'Proficient';
    if (percentage >= 0.6) return 'Advanced';
    if (percentage >= 0.4) return 'Intermediate';
    return 'Basic';
  }

  /**
   * Calculates months difference between two dates
   */
  private getMonthsDifference(date1: Date, date2: Date): number {
    const yearDiff = date2.getFullYear() - date1.getFullYear();
    const monthDiff = date2.getMonth() - date1.getMonth();
    return yearDiff * 12 + monthDiff;
  }

  /**
   * Determines overall proficiency level
   */
  private determineOverallProficiency(assessments: LanguageAssessment[]): string {
    const englishAssessment = assessments.find(a => a.primaryLanguage === 'English');
    
    if (!englishAssessment) {
      return 'Unknown';
    }

    return englishAssessment.proficiencyLevel;
  }

  /**
   * Recommends language accommodations
   */
  private async recommendAccommodations(
    primaryLanguage: string, 
    assessments: LanguageAssessment[]
  ): Promise<string[]> {
    const accommodations: string[] = [];

    const englishAssessment = assessments.find(a => a.primaryLanguage === 'English');
    
    if (!englishAssessment || englishAssessment.status !== CheckStatus.PASSED) {
      accommodations.push('English Language Support Program');
      accommodations.push('Extended time for assessments');
      accommodations.push('Multilingual dictionary access');
    }

    if (englishAssessment?.proficiencyLevel === 'Intermediate') {
      accommodations.push('Writing support services');
      accommodations.push('Conversation practice sessions');
    }

    if (primaryLanguage !== 'English' && this.supportedLanguages.includes(primaryLanguage)) {
      accommodations.push(`Native language support in ${primaryLanguage}`);
      accommodations.push('Bilingual academic advisor');
    }

    return accommodations;
  }

  /**
   * Determines overall language status
   */
  private determineLanguageStatus(
    assessments: LanguageAssessment[], 
    primaryLanguage: string
  ): CheckStatus {
    
    // If English is native language, automatically pass
    if (primaryLanguage === 'English') {
      return CheckStatus.PASSED;
    }

    // Check English proficiency for non-native speakers
    const englishAssessment = assessments.find(a => a.primaryLanguage === 'English');
    
    if (!englishAssessment) {
      return CheckStatus.PENDING; // Need English assessment
    }

    if (englishAssessment.status === CheckStatus.FAILED) {
      return CheckStatus.FAILED;
    }

    if (englishAssessment.status === CheckStatus.PENDING) {
      return CheckStatus.PENDING;
    }

    // Check if proficiency level is sufficient
    const sufficientLevels = ['Advanced', 'Proficient', 'Native'];
    if (sufficientLevels.includes(englishAssessment.proficiencyLevel)) {
      return CheckStatus.PASSED;
    }

    // Intermediate level may be conditional
    if (englishAssessment.proficiencyLevel === 'Intermediate') {
      return CheckStatus.PENDING; // Conditional with support
    }

    return CheckStatus.FAILED;
  }

  /**
   * Generates language-related recommendations
   */
  private generateLanguageRecommendations(
    assessments: LanguageAssessment[],
    primaryLanguage: string,
    status: CheckStatus
  ): string[] {
    const recommendations: string[] = [];

    if (status === CheckStatus.PASSED) {
      recommendations.push('Language proficiency requirements met.');
      
      if (primaryLanguage !== 'English') {
        recommendations.push('Consider joining international student support groups.');
      }
    }

    if (status === CheckStatus.PENDING) {
      recommendations.push('Complete English proficiency assessment before enrollment.');
      recommendations.push('Consider enrolling in English preparation courses.');
      
      if (this.supportedLanguages.includes(primaryLanguage)) {
        recommendations.push(`Native language support available in ${primaryLanguage}.`);
      }
    }

    if (status === CheckStatus.FAILED) {
      recommendations.push('English proficiency improvement required before admission.');
      recommendations.push('Enroll in intensive English language program.');
      recommendations.push('Retake standardized English proficiency test.');
    }

    // Specific recommendations based on proficiency level
    const englishAssessment = assessments.find(a => a.primaryLanguage === 'English');
    if (englishAssessment) {
      if (englishAssessment.proficiencyLevel === 'Intermediate') {
        recommendations.push('Focus on academic writing and presentation skills.');
        recommendations.push('Practice theological and biblical terminology.');
      }
      
      if (englishAssessment.proficiencyLevel === 'Basic') {
        recommendations.push('Complete foundational English courses before applying.');
        recommendations.push('Develop conversational fluency through practice groups.');
      }
    }

    return recommendations;
  }

  /**
   * Gets available language accommodations
   */
  getAvailableAccommodations(): LanguageAccommodation[] {
    return [
      {
        type: 'English Language Support',
        description: 'Comprehensive English language support program',
        cost: 500,
        duration: '1 semester'
      },
      {
        type: 'Extended Assessment Time',
        description: 'Additional time for exams and assignments',
        cost: 0,
        duration: 'As needed'
      },
      {
        type: 'Writing Support Services',
        description: 'Academic writing assistance and tutoring',
        cost: 200,
        duration: 'Ongoing'
      },
      {
        type: 'Conversation Practice',
        description: 'Regular conversation practice sessions',
        cost: 150,
        duration: '1 semester'
      },
      {
        type: 'Bilingual Academic Advisor',
        description: 'Academic advisor who speaks student\'s native language',
        cost: 0,
        duration: 'Ongoing'
      }
    ];
  }

  /**
   * Gets accepted language tests information
   */
  getAcceptedTests(): LanguageTest[] {
    return [...this.acceptedTests];
  }

  /**
   * Gets supported languages
   */
  getSupportedLanguages(): string[] {
    return [...this.supportedLanguages];
  }
}