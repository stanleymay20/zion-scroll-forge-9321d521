/**
 * Plagiarism Detection Service
 * Integrates Turnitin API and custom vector similarity checking
 * "The LORD detests dishonest scales, but accurate weights find favor with him" - Proverbs 11:1
 */

import { PrismaClient } from '@prisma/client';
import {
  PlagiarismCheckRequest,
  PlagiarismReport,
  TurnitinResult,
  TurnitinSource,
  MatchedSection,
  VectorSimilarityResult,
  SimilarSubmission,
  RiskLevel,
} from '../types/integrity.types';
import { integrityConfig, RISK_THRESHOLDS } from '../config/integrity.config';
import { VectorStoreService } from './VectorStoreService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export default class PlagiarismDetectionService {
  private vectorStore: VectorStoreService;

  constructor() {
    this.vectorStore = new VectorStoreService();
  }

  /**
   * Run comprehensive plagiarism check on submission
   */
  async checkPlagiarism(request: PlagiarismCheckRequest): Promise<PlagiarismReport> {
    try {
      logger.info('Starting plagiarism check', {
        submissionId: request.submissionId,
        studentId: request.studentId,
      });

      // Run checks in parallel
      const [turnitinResult, vectorSimilarityResult] = await Promise.all([
        this.checkTurnitin(request),
        this.checkVectorSimilarity(request),
      ]);

      // Calculate overall risk level
      const overallRiskLevel = this.calculateRiskLevel(
        turnitinResult?.score || 0,
        vectorSimilarityResult.maxSimilarity
      );

      // Determine if should be flagged
      const flagged = this.shouldFlag(turnitinResult, vectorSimilarityResult);
      const flagReasons = this.generateFlagReasons(turnitinResult, vectorSimilarityResult);

      // Create plagiarism report
      const report: PlagiarismReport = {
        checkId: '', // Will be set after DB insert
        submissionId: request.submissionId,
        studentId: request.studentId,
        turnitinScore: turnitinResult?.score,
        turnitinReportUrl: turnitinResult?.reportUrl,
        turnitinSources: turnitinResult?.sources || [],
        internalSimilarityScore: vectorSimilarityResult.maxSimilarity,
        similarSubmissions: vectorSimilarityResult.similarSubmissions,
        overallRiskLevel,
        flagged,
        flagReasons,
        checkedAt: new Date(),
      };

      // Save to database
      const savedReport = await this.savePlagiarismCheck(report);

      logger.info('Plagiarism check completed', {
        submissionId: request.submissionId,
        flagged,
        riskLevel: overallRiskLevel,
      });

      return savedReport;
    } catch (error) {
      logger.error('Error in plagiarism check', {
        error,
        submissionId: request.submissionId,
      });
      throw error;
    }
  }

  /**
   * Check against Turnitin database
   */
  private async checkTurnitin(request: PlagiarismCheckRequest): Promise<TurnitinResult | null> {
    if (!integrityConfig.plagiarism.turnitinEnabled) {
      logger.info('Turnitin check skipped (disabled)');
      return null;
    }

    try {
      // In production, this would call the actual Turnitin API
      // For now, we'll simulate the response
      logger.info('Checking Turnitin', { submissionId: request.submissionId });

      // Simulate API call
      const mockResult: TurnitinResult = {
        score: 0,
        reportUrl: '',
        sources: [],
        matchedSections: [],
      };

      // TODO: Implement actual Turnitin API integration
      // const response = await axios.post('https://api.turnitin.com/v1/submissions', {
      //   content: request.content,
      //   author: request.studentId,
      //   title: `Submission ${request.submissionId}`,
      // }, {
      //   headers: {
      //     'Authorization': `Bearer ${integrityConfig.plagiarism.turnitinApiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      // });

      return mockResult;
    } catch (error) {
      logger.error('Error checking Turnitin', { error });
      return null;
    }
  }

  /**
   * Check similarity against internal submission database using vector embeddings
   */
  private async checkVectorSimilarity(
    request: PlagiarismCheckRequest
  ): Promise<VectorSimilarityResult> {
    try {
      logger.info('Checking vector similarity', { submissionId: request.submissionId });

      // Generate embedding for current submission
      const embedding = await this.vectorStore.generateEmbedding(request.content);

      // Search for similar submissions in vector database
      const similarDocs = await this.vectorStore.searchSimilar(embedding, {
        namespace: 'submissions',
        topK: 10,
        filter: {
          courseId: request.courseId,
          assignmentId: request.assignmentId,
          // Exclude current submission
          submissionId: { $ne: request.submissionId },
        },
      });

      // Convert to similar submissions
      const similarSubmissions: SimilarSubmission[] = similarDocs.map((doc) => ({
        submissionId: doc.metadata.submissionId as string,
        studentId: doc.metadata.studentId as string,
        studentName: doc.metadata.studentName as string,
        similarity: doc.score,
        matchedSections: [], // Would need detailed text comparison for this
        submittedAt: new Date(doc.metadata.submittedAt as string),
      }));

      const maxSimilarity = similarSubmissions.length > 0 
        ? Math.max(...similarSubmissions.map((s) => s.similarity))
        : 0;

      const averageSimilarity = similarSubmissions.length > 0
        ? similarSubmissions.reduce((sum, s) => sum + s.similarity, 0) / similarSubmissions.length
        : 0;

      return {
        similarSubmissions,
        maxSimilarity,
        averageSimilarity,
      };
    } catch (error) {
      logger.error('Error checking vector similarity', { error });
      return {
        similarSubmissions: [],
        maxSimilarity: 0,
        averageSimilarity: 0,
      };
    }
  }

  /**
   * Calculate overall risk level based on all checks
   */
  private calculateRiskLevel(turnitinScore: number, vectorSimilarity: number): RiskLevel {
    // Normalize scores to 0-1 range
    const normalizedTurnitin = turnitinScore / 100;
    const normalizedVector = vectorSimilarity;

    // Take the maximum of the two scores
    const maxScore = Math.max(normalizedTurnitin, normalizedVector);

    if (maxScore >= RISK_THRESHOLDS.critical) return 'critical';
    if (maxScore >= RISK_THRESHOLDS.high) return 'high';
    if (maxScore >= RISK_THRESHOLDS.medium) return 'medium';
    return 'low';
  }

  /**
   * Determine if submission should be flagged for review
   */
  private shouldFlag(
    turnitinResult: TurnitinResult | null,
    vectorSimilarityResult: VectorSimilarityResult
  ): boolean {
    const { flagThreshold } = integrityConfig.plagiarism;

    // Flag if Turnitin score exceeds threshold
    if (turnitinResult && turnitinResult.score >= flagThreshold) {
      return true;
    }

    // Flag if vector similarity exceeds threshold
    if (vectorSimilarityResult.maxSimilarity >= flagThreshold / 100) {
      return true;
    }

    return false;
  }

  /**
   * Generate human-readable flag reasons
   */
  private generateFlagReasons(
    turnitinResult: TurnitinResult | null,
    vectorSimilarityResult: VectorSimilarityResult
  ): string[] {
    const reasons: string[] = [];

    if (turnitinResult && turnitinResult.score >= integrityConfig.plagiarism.flagThreshold) {
      reasons.push(
        `High Turnitin similarity score: ${turnitinResult.score}% (threshold: ${integrityConfig.plagiarism.flagThreshold}%)`
      );
    }

    if (vectorSimilarityResult.maxSimilarity >= integrityConfig.plagiarism.flagThreshold / 100) {
      reasons.push(
        `High similarity to internal submission: ${(vectorSimilarityResult.maxSimilarity * 100).toFixed(1)}%`
      );
    }

    if (vectorSimilarityResult.similarSubmissions.length > 3) {
      reasons.push(
        `Multiple similar submissions found: ${vectorSimilarityResult.similarSubmissions.length}`
      );
    }

    return reasons;
  }

  /**
   * Save plagiarism check results to database
   */
  private async savePlagiarismCheck(report: PlagiarismReport): Promise<PlagiarismReport> {
    try {
      const saved = await prisma.$queryRawUnsafe<any[]>(`
        INSERT INTO public.plagiarism_checks (
          submission_id, student_id, turnitin_score, turnitin_report_url,
          turnitin_sources, internal_similarity_score, similar_submissions,
          overall_risk_level, flagged, flag_reasons, checked_at
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8, $9, $10, $11)
        RETURNING *
      `,
        report.submissionId,
        report.studentId,
        report.turnitinScore || null,
        report.turnitinReportUrl || null,
        JSON.stringify(report.turnitinSources),
        report.internalSimilarityScore,
        JSON.stringify(report.similarSubmissions),
        report.overallRiskLevel,
        report.flagged,
        report.flagReasons,
        report.checkedAt
      );

      return {
        ...report,
        checkId: saved[0].id,
      };
    } catch (error) {
      logger.error('Error saving plagiarism check', { error });
      throw error;
    }
  }

  /**
   * Get plagiarism check by submission ID
   */
  async getPlagiarismCheck(submissionId: string): Promise<PlagiarismReport | null> {
    try {
      const checks = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM public.plagiarism_checks
        WHERE submission_id = $1
        ORDER BY checked_at DESC
        LIMIT 1
      `, submissionId);

      if (!checks || checks.length === 0) return null;
      const check = checks[0];

      return {
        checkId: check.id,
        submissionId: check.submission_id,
        studentId: check.student_id,
        turnitinScore: check.turnitin_score ? Number(check.turnitin_score) : undefined,
        turnitinReportUrl: check.turnitin_report_url || undefined,
        turnitinSources: (check.turnitin_sources as any) || [],
        internalSimilarityScore: Number(check.internal_similarity_score),
        similarSubmissions: (check.similar_submissions as any) || [],
        overallRiskLevel: check.overall_risk_level as RiskLevel,
        flagged: check.flagged,
        flagReasons: check.flag_reasons || [],
        checkedAt: check.checked_at,
      };
    } catch (error) {
      logger.error('Error getting plagiarism check', { error, submissionId });
      throw error;
    }
  }

  /**
   * Get all flagged submissions for review
   */
  async getFlaggedSubmissions(courseId?: string): Promise<PlagiarismReport[]> {
    try {
      const checks = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM public.plagiarism_checks
        WHERE flagged = true AND reviewed = false
        ORDER BY checked_at DESC
        LIMIT 100
      `);

      return checks.map((check: any) => ({
        checkId: check.id,
        submissionId: check.submission_id,
        studentId: check.student_id,
        turnitinScore: check.turnitin_score ? Number(check.turnitin_score) : undefined,
        turnitinReportUrl: check.turnitin_report_url || undefined,
        turnitinSources: (check.turnitin_sources as any) || [],
        internalSimilarityScore: Number(check.internal_similarity_score),
        similarSubmissions: (check.similar_submissions as any) || [],
        overallRiskLevel: check.overall_risk_level as RiskLevel,
        flagged: check.flagged,
        flagReasons: check.flag_reasons || [],
        checkedAt: check.checked_at,
      }));
    } catch (error) {
      logger.error('Error getting flagged submissions', { error });
      throw error;
    }
  }

  /**
   * Mark plagiarism check as reviewed
   */
  async markAsReviewed(
    checkId: string,
    reviewedBy: string,
    outcome: 'cleared' | 'warning' | 'violation',
    notes?: string
  ): Promise<void> {
    try {
      await prisma.$queryRawUnsafe(`
        UPDATE public.plagiarism_checks
        SET reviewed = true, reviewed_by = $1, reviewed_at = NOW(),
            review_outcome = $2, review_notes = $3
        WHERE id = $4
      `, reviewedBy, outcome, notes || null, checkId);

      logger.info('Plagiarism check marked as reviewed', { checkId, outcome });
    } catch (error) {
      logger.error('Error marking plagiarism check as reviewed', { error, checkId });
      throw error;
    }
  }

  /**
   * Generate detailed similarity report with highlighted sections
   */
  async generateDetailedReport(submissionId: string): Promise<{
    report: PlagiarismReport;
    highlightedSections: MatchedSection[];
  }> {
    try {
      const report = await this.getPlagiarismCheck(submissionId);
      if (!report) {
        throw new Error('Plagiarism check not found');
      }

      // In a full implementation, this would perform detailed text comparison
      // to identify and highlight specific matching sections
      const highlightedSections: MatchedSection[] = [];

      // TODO: Implement detailed text comparison algorithm
      // This would involve:
      // 1. Breaking text into sentences/paragraphs
      // 2. Comparing each section against sources
      // 3. Identifying exact matches and paraphrases
      // 4. Calculating similarity scores for each section

      return {
        report,
        highlightedSections,
      };
    } catch (error) {
      logger.error('Error generating detailed report', { error, submissionId });
      throw error;
    }
  }
}
