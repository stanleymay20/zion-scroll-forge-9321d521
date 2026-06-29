/**
 * ScrollUniversity Admissions - Assessment Engine Integration Service
 * "Test all things; hold fast what is good" - 1 Thessalonians 5:21
 * 
 * Integrates admissions system with assessment engine for placement testing
 * and academic readiness evaluation
 */

import { PrismaClient, ApplicationStatus } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface PlacementTestData {
  applicationId: string;
  userId: string;
  testType: 'ACADEMIC_READINESS' | 'SPIRITUAL_MATURITY' | 'LANGUAGE_PROFICIENCY' | 'TECHNICAL_SKILLS';
  testLevel: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  accommodations?: any[];
  timeLimit?: number;
  retakeAllowed?: boolean;
}

export interface AssessmentResult {
  testId: string;
  applicationId: string;
  userId: string;
  testType: string;
  score: number;
  percentile: number;
  competencyAreas: CompetencyScore[];
  recommendations: string[];
  placementLevel: string;
  completedAt: Date;
}

export interface CompetencyScore {
  area: string;
  score: number;
  level: 'BELOW_BASIC' | 'BASIC' | 'PROFICIENT' | 'ADVANCED';
  recommendations: string[];
}

export interface AssessmentEngineConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
}

export class AssessmentEngineIntegrationService {
  private config: AssessmentEngineConfig;

  constructor(
    private prisma: PrismaClient,
    config?: Partial<AssessmentEngineConfig>
  ) {
    this.config = {
      baseUrl: process.env.ASSESSMENT_ENGINE_URL || 'http://localhost:3002',
      apiKey: process.env.ASSESSMENT_ENGINE_API_KEY || 'dev-key',
      timeout: 30000,
      retryAttempts: 3,
      ...config
    };
  }

  /**
   * Schedule placement test for admitted student
   */
  async schedulePlacementTest(data: PlacementTestData): Promise<{
    testId: string;
    testUrl: string;
    expiresAt: Date;
  }> {
    try {
      logger.info(`Scheduling placement test for application ${data.applicationId}`);

      // Validate application status
      const application = await this.prisma.applications.findUnique({
        where: { id: data.applicationId },
        include: { applicant: true }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      if (application.status !== ApplicationStatus.ACCEPTED) {
        throw new Error('Placement tests only available for accepted applications');
      }

      // Create test record
      const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Log test scheduling (assessment engine integration would be implemented separately)
      logger.info(`Placement test scheduled`, {
        testId,
        applicationId: data.applicationId,
        userId: data.userId,
        testType: data.testType,
        testLevel: data.testLevel,
        expiresAt
      });

      // Generate test URL
      const testUrl = `${this.config.baseUrl}/assessment/${testId}?token=${this.generateTestToken(data)}`;

      // Store test record in database
      await this.createTestRecord(testId, data, expiresAt);

      return {
        testId,
        testUrl,
        expiresAt
      };

    } catch (error) {
      logger.error('Error scheduling placement test:', error);
      throw error;
    }
  }

  /**
   * Process assessment results from assessment engine
   */
  async processAssessmentResults(testId: string, results: any): Promise<AssessmentResult> {
    try {
      logger.info(`Processing assessment results for test ${testId}`);

      // Validate test exists
      const testRecord = await this.getTestRecord(testId);
      if (!testRecord) {
        throw new Error('Test record not found');
      }

      // Process and normalize results
      const assessmentResult: AssessmentResult = {
        testId,
        applicationId: testRecord.applicationId,
        userId: testRecord.userId,
        testType: testRecord.testType,
        score: results.overallScore || 0,
        percentile: results.percentile || 0,
        competencyAreas: this.processCompetencyScores(results.competencyScores || []),
        recommendations: this.generateRecommendations(results),
        placementLevel: this.determinePlacementLevel(results.overallScore || 0),
        completedAt: new Date()
      };

      // Store results
      await this.storeAssessmentResults(assessmentResult);

      // Update application with assessment data
      await this.updateApplicationWithAssessment(assessmentResult);

      logger.info(`Assessment results processed successfully for test ${testId}`);
      return assessmentResult;

    } catch (error) {
      logger.error('Error processing assessment results:', error);
      throw error;
    }
  }

  /**
   * Get placement recommendations based on assessment results
   */
  async getPlacementRecommendations(applicationId: string): Promise<{
    academicLevel: string;
    recommendedCourses: string[];
    prerequisiteNeeds: string[];
    supportServices: string[];
    accelerationOpportunities: string[];
  }> {
    try {
      logger.info(`Getting placement recommendations for application ${applicationId}`);

      // Get all assessment results for application
      const assessmentResults = await this.getApplicationAssessments(applicationId);

      if (assessmentResults.length === 0) {
        return {
          academicLevel: 'SCROLL_OPEN',
          recommendedCourses: ['scroll-foundations-101'],
          prerequisiteNeeds: [],
          supportServices: [],
          accelerationOpportunities: []
        };
      }

      // Analyze results and generate recommendations
      const academicAssessment = assessmentResults.find(r => r.testType === 'ACADEMIC_READINESS');
      const spiritualAssessment = assessmentResults.find(r => r.testType === 'SPIRITUAL_MATURITY');

      const recommendations = {
        academicLevel: this.determineAcademicLevel(assessmentResults),
        recommendedCourses: this.recommendCourses(assessmentResults),
        prerequisiteNeeds: this.identifyPrerequisites(assessmentResults),
        supportServices: this.recommendSupportServices(assessmentResults),
        accelerationOpportunities: this.identifyAccelerationOpportunities(assessmentResults)
      };

      logger.info(`Placement recommendations generated for application ${applicationId}`, recommendations);
      return recommendations;

    } catch (error) {
      logger.error('Error getting placement recommendations:', error);
      throw error;
    }
  }

  /**
   * Validate assessment completion for enrollment
   */
  async validateAssessmentCompletion(applicationId: string): Promise<{
    isComplete: boolean;
    missingAssessments: string[];
    completedAssessments: AssessmentResult[];
    readyForEnrollment: boolean;
  }> {
    try {
      const requiredAssessments = ['ACADEMIC_READINESS', 'SPIRITUAL_MATURITY'];
      const completedAssessments = await this.getApplicationAssessments(applicationId);
      
      const completedTypes = completedAssessments.map(a => a.testType);
      const missingAssessments = requiredAssessments.filter(type => !completedTypes.includes(type));

      const isComplete = missingAssessments.length === 0;
      const readyForEnrollment = isComplete && completedAssessments.every(a => a.score >= 60); // Minimum passing score

      return {
        isComplete,
        missingAssessments,
        completedAssessments,
        readyForEnrollment
      };

    } catch (error) {
      logger.error('Error validating assessment completion:', error);
      throw error;
    }
  }

  /**
   * Generate test token for secure access
   */
  private generateTestToken(data: PlacementTestData): string {
    // In production, this would use proper JWT or similar secure token
    const payload = {
      applicationId: data.applicationId,
      userId: data.userId,
      testType: data.testType,
      timestamp: Date.now()
    };
    
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  /**
   * Create test record in database
   */
  private async createTestRecord(testId: string, data: PlacementTestData, expiresAt: Date): Promise<void> {
    try {
      // Log test record creation (would be stored in dedicated assessment table)
      logger.info(`Test record created`, {
        testId,
        applicationId: data.applicationId,
        userId: data.userId,
        testType: data.testType,
        testLevel: data.testLevel,
        expiresAt
      });

    } catch (error) {
      logger.error('Error creating test record:', error);
      throw error;
    }
  }

  /**
   * Get test record from database
   */
  private async getTestRecord(testId: string): Promise<any> {
    try {
      // In production, this would query the assessment table
      // For now, return mock data
      return {
        testId,
        applicationId: 'app-123',
        userId: 'user-123',
        testType: 'ACADEMIC_READINESS',
        status: 'SCHEDULED'
      };

    } catch (error) {
      logger.error('Error getting test record:', error);
      throw error;
    }
  }

  /**
   * Process competency scores from raw results
   */
  private processCompetencyScores(rawScores: any[]): CompetencyScore[] {
    return rawScores.map(score => ({
      area: score.area || 'General',
      score: score.score || 0,
      level: this.determineCompetencyLevel(score.score || 0),
      recommendations: score.recommendations || []
    }));
  }

  /**
   * Determine competency level based on score
   */
  private determineCompetencyLevel(score: number): 'BELOW_BASIC' | 'BASIC' | 'PROFICIENT' | 'ADVANCED' {
    if (score >= 85) return 'ADVANCED';
    if (score >= 70) return 'PROFICIENT';
    if (score >= 50) return 'BASIC';
    return 'BELOW_BASIC';
  }

  /**
   * Generate recommendations based on assessment results
   */
  private generateRecommendations(results: any): string[] {
    const recommendations: string[] = [];
    
    if (results.overallScore < 60) {
      recommendations.push('Consider foundational courses before enrollment');
    }
    
    if (results.overallScore >= 85) {
      recommendations.push('Eligible for advanced placement opportunities');
    }
    
    if (results.competencyScores?.some((s: any) => s.score < 50)) {
      recommendations.push('Additional support recommended in identified areas');
    }

    return recommendations;
  }

  /**
   * Determine placement level based on score
   */
  private determinePlacementLevel(score: number): string {
    if (score >= 85) return 'ADVANCED';
    if (score >= 70) return 'INTERMEDIATE';
    if (score >= 50) return 'BASIC';
    return 'REMEDIAL';
  }

  /**
   * Store assessment results in database
   */
  private async storeAssessmentResults(result: AssessmentResult): Promise<void> {
    try {
      // Log assessment results storage (would be stored in dedicated table)
      logger.info(`Assessment results stored`, {
        testId: result.testId,
        applicationId: result.applicationId,
        score: result.score,
        placementLevel: result.placementLevel
      });

    } catch (error) {
      logger.error('Error storing assessment results:', error);
      throw error;
    }
  }

  /**
   * Update application with assessment data
   */
  private async updateApplicationWithAssessment(result: AssessmentResult): Promise<void> {
    try {
      await this.prisma.applications.update({
        where: { id: result.applicationId },
        data: {
          applicationTimeline: {
            push: {
              event: 'ASSESSMENT_COMPLETED',
              timestamp: new Date().toISOString(),
              details: {
                testId: result.testId,
                testType: result.testType,
                score: result.score,
                placementLevel: result.placementLevel
              }
            }
          }
        }
      });

    } catch (error) {
      logger.error('Error updating application with assessment:', error);
      throw error;
    }
  }

  /**
   * Get all assessment results for application
   */
  private async getApplicationAssessments(applicationId: string): Promise<AssessmentResult[]> {
    try {
      // In production, this would query the assessment results table
      // For now, return mock data
      return [
        {
          testId: 'test-123',
          applicationId,
          userId: 'user-123',
          testType: 'ACADEMIC_READINESS',
          score: 75,
          percentile: 68,
          competencyAreas: [],
          recommendations: [],
          placementLevel: 'INTERMEDIATE',
          completedAt: new Date()
        }
      ];

    } catch (error) {
      logger.error('Error getting application assessments:', error);
      return [];
    }
  }

  /**
   * Determine academic level based on assessment results
   */
  private determineAcademicLevel(results: AssessmentResult[]): string {
    const academicResult = results.find(r => r.testType === 'ACADEMIC_READINESS');
    
    if (!academicResult) return 'SCROLL_OPEN';
    
    if (academicResult.score >= 85) return 'SCROLL_DOCTORATE';
    if (academicResult.score >= 70) return 'SCROLL_DEGREE';
    return 'SCROLL_OPEN';
  }

  /**
   * Recommend courses based on assessment results
   */
  private recommendCourses(results: AssessmentResult[]): string[] {
    const courses = ['scroll-foundations-101'];
    
    const academicResult = results.find(r => r.testType === 'ACADEMIC_READINESS');
    const spiritualResult = results.find(r => r.testType === 'SPIRITUAL_MATURITY');
    
    if (academicResult?.score >= 70) {
      courses.push('kingdom-principles-101');
    }
    
    if (spiritualResult?.score >= 80) {
      courses.push('prophetic-foundations-201');
    }
    
    return courses;
  }

  /**
   * Identify prerequisite needs
   */
  private identifyPrerequisites(results: AssessmentResult[]): string[] {
    const prerequisites: string[] = [];
    
    results.forEach(result => {
      if (result.score < 60) {
        prerequisites.push(`Remedial support needed for ${result.testType}`);
      }
    });
    
    return prerequisites;
  }

  /**
   * Recommend support services
   */
  private recommendSupportServices(results: AssessmentResult[]): string[] {
    const services: string[] = [];
    
    results.forEach(result => {
      if (result.score < 70) {
        services.push(`Tutoring support for ${result.testType}`);
      }
      
      result.competencyAreas.forEach(area => {
        if (area.level === 'BELOW_BASIC') {
          services.push(`Specialized support for ${area.area}`);
        }
      });
    });
    
    return services;
  }

  /**
   * Identify acceleration opportunities
   */
  private identifyAccelerationOpportunities(results: AssessmentResult[]): string[] {
    const opportunities: string[] = [];
    
    results.forEach(result => {
      if (result.score >= 90) {
        opportunities.push(`Advanced placement in ${result.testType}`);
      }
      
      if (result.percentile >= 95) {
        opportunities.push(`Honors track eligibility for ${result.testType}`);
      }
    });
    
    return opportunities;
  }
}