/**
 * Academic Integrity Service
 * Main orchestration service for academic integrity system
 * "The LORD detests dishonest scales, but accurate weights find favor with him" - Proverbs 11:1
 */

import { PrismaClient } from '@prisma/client';
import {
  IntegrityCheckResult,
  PlagiarismCheckRequest,
  AIContentDetectionRequest,
  CollusionDetectionRequest,
  ProctoringSessionRequest,
  IntegrityDashboardMetrics,
  RiskLevel,
  ViolationType,
  ViolationSeverity,
} from '../types/integrity.types';
import { INTEGRITY_SCORE_WEIGHTS } from '../config/integrity.config';
import PlagiarismDetectionService from './PlagiarismDetectionService';
import AIContentDetectionService from './AIContentDetectionService';
import CollusionDetectionService from './CollusionDetectionService';
import ProctoringAnalysisService from './ProctoringAnalysisService';
import IntegrityCaseManagementService from './IntegrityCaseManagementService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export default class IntegrityService {
  private plagiarismService: PlagiarismDetectionService;
  private aiContentService: AIContentDetectionService;
  private collusionService: CollusionDetectionService;
  private proctoringService: ProctoringAnalysisService;
  private caseManagementService: IntegrityCaseManagementService;

  constructor() {
    this.plagiarismService = new PlagiarismDetectionService();
    this.aiContentService = new AIContentDetectionService();
    this.collusionService = new CollusionDetectionService();
    this.proctoringService = new ProctoringAnalysisService();
    this.caseManagementService = new IntegrityCaseManagementService();
  }

  /**
   * Run comprehensive integrity check on submission
   */
  async checkSubmissionIntegrity(
    submissionId: string,
    studentId: string,
    content: string,
    courseId?: string,
    assignmentId?: string
  ): Promise<IntegrityCheckResult> {
    try {
      logger.info('Starting comprehensive integrity check', {
        submissionId,
        studentId,
      });

      // Run all checks in parallel
      const [plagiarismReport, aiDetectionResult, studentBaseline] = await Promise.all([
        this.plagiarismService.checkPlagiarism({
          submissionId,
          studentId,
          content,
          contentType: 'text',
          courseId,
          assignmentId,
        }),
        this.aiContentService.detectAIContent({
          content,
          studentId,
        }),
        this.aiContentService.getStudentBaseline(studentId),
      ]);

      // Analyze style deviation if baseline available
      const styleDeviation = studentBaseline
        ? await this.aiContentService.analyzeStyleDeviation(content, studentBaseline)
        : undefined;

      // Calculate overall integrity score
      const integrityScore = this.calculateOverallIntegrityScore(
        plagiarismReport,
        aiDetectionResult,
        styleDeviation
      );

      // Determine overall risk level
      const overallRiskLevel = this.determineOverallRiskLevel(
        plagiarismReport.overallRiskLevel,
        aiDetectionResult.recommendation,
        styleDeviation?.flagged || false
      );

      // Determine if flagged
      const flagged = this.shouldFlagSubmission(
        plagiarismReport.flagged,
        aiDetectionResult.recommendation,
        styleDeviation?.flagged || false
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        plagiarismReport,
        aiDetectionResult,
        styleDeviation,
        overallRiskLevel
      );

      // Determine if requires human review
      const requiresHumanReview = this.requiresHumanReview(overallRiskLevel, flagged);

      // If flagged, create violation case
      if (flagged && requiresHumanReview) {
        await this.createViolationCase(
          submissionId,
          studentId,
          courseId,
          assignmentId,
          plagiarismReport,
          aiDetectionResult,
          overallRiskLevel
        );
      }

      // Update student baseline with this submission
      await this.aiContentService.updateStudentBaseline(studentId, content);

      const result: IntegrityCheckResult = {
        submissionId,
        studentId,
        overallRiskLevel,
        integrityScore,
        flagged,
        checks: {
          plagiarism: plagiarismReport,
          aiContent: aiDetectionResult,
          styleDeviation,
        },
        recommendations,
        requiresHumanReview,
        checkedAt: new Date(),
      };

      logger.info('Integrity check completed', {
        submissionId,
        flagged,
        riskLevel: overallRiskLevel,
        requiresReview: requiresHumanReview,
      });

      return result;
    } catch (error) {
      logger.error('Error in integrity check', { error, submissionId });
      throw error;
    }
  }

  /**
   * Check for collusion across multiple submissions
   */
  async checkCollusion(
    assignmentId: string,
    courseId: string,
    submissionIds?: string[]
  ): Promise<void> {
    try {
      logger.info('Checking for collusion', { assignmentId, courseId });

      // Get submissions for the assignment using raw SQL
      let submissions: any[];
      if (submissionIds && submissionIds.length > 0) {
        submissions = await prisma.$queryRawUnsafe<any[]>(`
          SELECT id, student_id, content, submitted_at
          FROM public.submissions
          WHERE assignment_id = $1 AND id = ANY($2::uuid[])
        `, assignmentId, submissionIds);
      } else {
        submissions = await prisma.$queryRawUnsafe<any[]>(`
          SELECT id, student_id, content, submitted_at
          FROM public.submissions
          WHERE assignment_id = $1
        `, assignmentId);
      }

      if (submissions.length < 2) {
        logger.info('Not enough submissions for collusion detection');
        return;
      }

      // Run collusion detection
      const collusionResult = await this.collusionService.detectCollusion({
        submissions: submissions.map((s) => ({
          submissionId: s.id,
          studentId: s.student_id,
          content: s.content || '',
          submittedAt: s.submitted_at,
        })),
        assignmentId,
        courseId,
      });

      // Create violation cases for high-risk pairs
      for (const pair of collusionResult.collusionPairs) {
        if (pair.riskLevel === 'high' || pair.riskLevel === 'critical') {
          // Create violations for both students
          await this.caseManagementService.createViolation(
            {
              studentId: pair.student1Id,
              violationType: 'collusion',
              severity: pair.riskLevel === 'critical' ? 'severe' : 'major',
              courseId,
              assignmentId,
              description: `High similarity detected with another student's submission (${(pair.similarityScore * 100).toFixed(1)}% similar)`,
              evidence: {
                collusionPair: pair,
              },
              detectionMethod: 'automated_collusion_detection',
            },
            'system'
          );

          await this.caseManagementService.createViolation(
            {
              studentId: pair.student2Id,
              violationType: 'collusion',
              severity: pair.riskLevel === 'critical' ? 'severe' : 'major',
              courseId,
              assignmentId,
              description: `High similarity detected with another student's submission (${(pair.similarityScore * 100).toFixed(1)}% similar)`,
              evidence: {
                collusionPair: pair,
              },
              detectionMethod: 'automated_collusion_detection',
            },
            'system'
          );
        }
      }

      logger.info('Collusion check completed', {
        assignmentId,
        pairsFound: collusionResult.collusionPairs.length,
        highRiskPairs: collusionResult.collusionPairs.filter(
          (p) => p.riskLevel === 'high' || p.riskLevel === 'critical'
        ).length,
      });
    } catch (error) {
      logger.error('Error checking collusion', { error, assignmentId });
      throw error;
    }
  }

  /**
   * Create proctoring session for exam
   */
  async createProctoringSession(request: ProctoringSessionRequest): Promise<string> {
    try {
      const session = await this.proctoringService.createSession(request);
      return session.id;
    } catch (error) {
      logger.error('Error creating proctoring session', { error });
      throw error;
    }
  }

  /**
   * Calculate overall integrity score
   */
  private calculateOverallIntegrityScore(
    plagiarismReport: any,
    aiDetectionResult: any,
    styleDeviation?: any
  ): number {
    // Start with perfect score
    let score = 100;

    // Deduct for plagiarism
    if (plagiarismReport.turnitinScore) {
      score -= plagiarismReport.turnitinScore * INTEGRITY_SCORE_WEIGHTS.plagiarism;
    }
    if (plagiarismReport.internalSimilarityScore) {
      score -= plagiarismReport.internalSimilarityScore * 100 * INTEGRITY_SCORE_WEIGHTS.plagiarism;
    }

    // Deduct for AI content
    score -= aiDetectionResult.aiProbability * 100 * INTEGRITY_SCORE_WEIGHTS.aiContent;

    // Deduct for style deviation
    if (styleDeviation) {
      score -= styleDeviation.deviationScore * 10 * INTEGRITY_SCORE_WEIGHTS.styleDeviation;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine overall risk level
   */
  private determineOverallRiskLevel(
    plagiarismRisk: RiskLevel,
    aiRecommendation: 'clear' | 'review' | 'flag',
    styleDeviation: boolean
  ): RiskLevel {
    // Map AI recommendation to risk level
    const aiRisk: RiskLevel =
      aiRecommendation === 'flag' ? 'high' : aiRecommendation === 'review' ? 'medium' : 'low';

    // Take the highest risk level
    const risks = [plagiarismRisk, aiRisk];
    if (styleDeviation) risks.push('medium');

    if (risks.includes('critical')) return 'critical';
    if (risks.includes('high')) return 'high';
    if (risks.includes('medium')) return 'medium';
    return 'low';
  }

  /**
   * Determine if submission should be flagged
   */
  private shouldFlagSubmission(
    plagiarismFlagged: boolean,
    aiRecommendation: 'clear' | 'review' | 'flag',
    styleDeviation: boolean
  ): boolean {
    return plagiarismFlagged || aiRecommendation === 'flag' || styleDeviation;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    plagiarismReport: any,
    aiDetectionResult: any,
    styleDeviation: any,
    overallRiskLevel: RiskLevel
  ): string[] {
    const recommendations: string[] = [];

    if (overallRiskLevel === 'critical' || overallRiskLevel === 'high') {
      recommendations.push('Immediate faculty review required');
      recommendations.push('Interview student about submission process');
    }

    if (plagiarismReport.flagged) {
      recommendations.push('Review plagiarism report and matched sources');
    }

    if (aiDetectionResult.recommendation === 'flag') {
      recommendations.push('High probability of AI-generated content - verify authenticity');
    }

    if (styleDeviation?.flagged) {
      recommendations.push('Writing style significantly different from baseline - investigate');
    }

    if (overallRiskLevel === 'medium') {
      recommendations.push('Monitor student for patterns in future submissions');
    }

    return recommendations;
  }

  /**
   * Determine if requires human review
   */
  private requiresHumanReview(riskLevel: RiskLevel, flagged: boolean): boolean {
    return riskLevel === 'critical' || riskLevel === 'high' || flagged;
  }

  /**
   * Create violation case
   */
  private async createViolationCase(
    submissionId: string,
    studentId: string,
    courseId: string | undefined,
    assignmentId: string | undefined,
    plagiarismReport: any,
    aiDetectionResult: any,
    riskLevel: RiskLevel
  ): Promise<void> {
    try {
      // Determine violation type and severity
      let violationType: ViolationType = 'plagiarism';
      let severity: ViolationSeverity = 'minor';

      if (plagiarismReport.flagged && aiDetectionResult.recommendation === 'flag') {
        violationType = 'plagiarism';
        severity = riskLevel === 'critical' ? 'severe' : 'major';
      } else if (plagiarismReport.flagged) {
        violationType = 'plagiarism';
        severity = riskLevel === 'critical' ? 'severe' : 'major';
      } else if (aiDetectionResult.recommendation === 'flag') {
        violationType = 'ai_misuse';
        severity = riskLevel === 'critical' ? 'severe' : 'major';
      }

      // Create violation
      const violation = await this.caseManagementService.createViolation(
        {
          studentId,
          violationType,
          severity,
          courseId,
          assignmentId,
          description: `Automated integrity check flagged submission for review`,
          evidence: {
            submissionId,
            plagiarismReport,
            aiDetectionResult,
          },
          detectionMethod: 'automated_integrity_check',
        },
        'system'
      );

      // Generate evidence package
      await this.caseManagementService.generateEvidencePackage(
        violation.id,
        plagiarismReport,
        aiDetectionResult
      );

      logger.info('Violation case created', { violationId: violation.id, studentId });
    } catch (error) {
      logger.error('Error creating violation case', { error, submissionId });
      // Don't throw - we don't want to fail the integrity check if case creation fails
    }
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<IntegrityDashboardMetrics> {
    try {
      const where: any = {};
      if (startDate) {
        where.checked_at = { gte: startDate };
      }
      if (endDate) {
        where.checked_at = { ...where.checked_at, lte: endDate };
      }

      // Get plagiarism checks using raw SQL
      let checks: any[];
      if (startDate || endDate) {
        checks = await prisma.$queryRawUnsafe<any[]>(`
          SELECT * FROM public.plagiarism_checks
          WHERE checked_at >= $1 AND checked_at <= $2
        `, startDate || new Date(0), endDate || new Date());
      } else {
        checks = await prisma.$queryRawUnsafe<any[]>(`
          SELECT * FROM public.plagiarism_checks
        `);
      }

      const totalChecks = checks.length;
      const flaggedSubmissions = checks.filter((c: any) => c.flagged).length;

      // Get violations using raw SQL
      let violations: any[];
      if (startDate || endDate) {
        violations = await prisma.$queryRawUnsafe<any[]>(`
          SELECT * FROM public.integrity_violations
          WHERE reported_at >= $1 AND reported_at <= $2
        `, startDate || new Date(0), endDate || new Date());
      } else {
        violations = await prisma.$queryRawUnsafe<any[]>(`
          SELECT * FROM public.integrity_violations
        `);
      }

      const violationsDetected = violations.length;

      // Calculate false positive rate (would need manual review data)
      const falsePositiveRate = 0.05; // Placeholder

      // Calculate average processing time
      const averageProcessingTime = 2.5; // Placeholder (seconds)

      // Count violations by type
      const violationsByType: Record<string, number> = {};
      violations.forEach((v: any) => {
        violationsByType[v.violation_type] = (violationsByType[v.violation_type] || 0) + 1;
      });

      // Count violations by severity
      const violationsBySeverity: Record<string, number> = {};
      violations.forEach((v: any) => {
        violationsBySeverity[v.severity] = (violationsBySeverity[v.severity] || 0) + 1;
      });

      // Count risk distribution
      const riskDistribution: Record<string, number> = {};
      checks.forEach((c: any) => {
        riskDistribution[c.overall_risk_level] = (riskDistribution[c.overall_risk_level] || 0) + 1;
      });

      return {
        totalChecks,
        flaggedSubmissions,
        violationsDetected,
        falsePositiveRate,
        averageProcessingTime,
        violationsByType: violationsByType as any,
        violationsBySeverity: violationsBySeverity as any,
        riskDistribution: riskDistribution as any,
      };
    } catch (error) {
      logger.error('Error getting dashboard metrics', { error });
      throw error;
    }
  }

  /**
   * Get service instances for direct access
   */
  getPlagiarismService(): PlagiarismDetectionService {
    return this.plagiarismService;
  }

  getAIContentService(): AIContentDetectionService {
    return this.aiContentService;
  }

  getCollusionService(): CollusionDetectionService {
    return this.collusionService;
  }

  getProctoringService(): ProctoringAnalysisService {
    return this.proctoringService;
  }

  getCaseManagementService(): IntegrityCaseManagementService {
    return this.caseManagementService;
  }
}
