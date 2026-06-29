/**
 * Integrity Case Management Service
 * Manages academic integrity violations and evidence packages
 * "The LORD detests dishonest scales, but accurate weights find favor with him" - Proverbs 11:1
 */

import { PrismaClient } from '@prisma/client';
import {
  IntegrityViolation,
  CreateViolationRequest,
  EvidencePackage,
  ViolationType,
  ViolationSeverity,
  Determination,
  PlagiarismReport,
  AIContentDetectionResult,
  CollusionDetectionResult,
  ProctoringSession,
} from '../types/integrity.types';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export default class IntegrityCaseManagementService {
  /**
   * Create a new integrity violation case
   */
  async createViolation(request: CreateViolationRequest, reportedBy: string): Promise<IntegrityViolation> {
    try {
      logger.info('Creating integrity violation', {
        studentId: request.studentId,
        violationType: request.violationType,
        severity: request.severity,
      });

      // Use raw SQL since Prisma schema doesn't have this table yet
      const result = await prisma.$queryRawUnsafe<any[]>(`
        INSERT INTO public.integrity_violations (
          student_id, violation_type, severity, course_id, assignment_id,
          description, evidence, detection_method, reported_by, reported_at,
          consequences, appeal_filed, restoration_complete
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), '[]'::jsonb, false, false)
        RETURNING *
      `,
        request.studentId,
        request.violationType,
        request.severity,
        request.courseId || null,
        request.assignmentId || null,
        request.description,
        JSON.stringify(request.evidence),
        request.detectionMethod,
        reportedBy
      );

      const violation = result[0];
      logger.info('Integrity violation created', { violationId: violation.id });

      return this.mapViolationFromDB(violation);
    } catch (error) {
      logger.error('Error creating integrity violation', { error });
      throw error;
    }
  }

  /**
   * Generate comprehensive evidence package for a violation
   */
  async generateEvidencePackage(
    violationId: string,
    plagiarismReport?: PlagiarismReport,
    aiDetectionResult?: AIContentDetectionResult,
    collusionResult?: CollusionDetectionResult,
    proctoringSession?: ProctoringSession
  ): Promise<EvidencePackage> {
    try {
      logger.info('Generating evidence package', { violationId });

      const violation = await this.getViolation(violationId);
      if (!violation) {
        throw new Error('Violation not found');
      }

      const additionalEvidence: Record<string, any> = { ...violation.evidence };
      const summary = this.generateEvidenceSummary(
        violation,
        plagiarismReport,
        aiDetectionResult,
        collusionResult,
        proctoringSession
      );
      const recommendations = this.generateRecommendations(
        violation,
        plagiarismReport,
        aiDetectionResult,
        collusionResult,
        proctoringSession
      );

      const evidencePackage: EvidencePackage = {
        violationId,
        studentId: violation.studentId,
        violationType: violation.violationType,
        severity: violation.severity,
        plagiarismReport,
        aiDetectionResult,
        collusionResult,
        proctoringSession,
        additionalEvidence,
        summary,
        recommendations,
        generatedAt: new Date(),
      };

      await prisma.$queryRawUnsafe(`
        UPDATE public.integrity_violations 
        SET evidence = $1::jsonb
        WHERE id = $2
      `, JSON.stringify(evidencePackage), violationId);

      logger.info('Evidence package generated', { violationId });
      return evidencePackage;
    } catch (error) {
      logger.error('Error generating evidence package', { error, violationId });
      throw error;
    }
  }

  private generateEvidenceSummary(
    violation: IntegrityViolation,
    plagiarismReport?: PlagiarismReport,
    aiDetectionResult?: AIContentDetectionResult,
    collusionResult?: CollusionDetectionResult,
    proctoringSession?: ProctoringSession
  ): string {
    const lines: string[] = [
      '=== ACADEMIC INTEGRITY VIOLATION EVIDENCE SUMMARY ===',
      '',
      `Violation ID: ${violation.id}`,
      `Student ID: ${violation.studentId}`,
      `Type: ${violation.violationType}`,
      `Severity: ${violation.severity}`,
      `Reported: ${violation.reportedAt.toISOString()}`,
      `Detection Method: ${violation.detectionMethod}`,
      '',
      'DESCRIPTION:',
      violation.description,
      ''
    ];

    if (plagiarismReport) {
      lines.push('PLAGIARISM DETECTION:');
      if (plagiarismReport.turnitinScore) {
        lines.push(`  Turnitin Score: ${plagiarismReport.turnitinScore}%`);
      }
      lines.push(`  Internal Similarity: ${(plagiarismReport.internalSimilarityScore * 100).toFixed(1)}%`);
      lines.push(`  Risk Level: ${plagiarismReport.overallRiskLevel.toUpperCase()}`);
      if (plagiarismReport.flagReasons.length > 0) {
        lines.push('  Reasons:');
        plagiarismReport.flagReasons.forEach((reason) => lines.push(`    - ${reason}`));
      }
      lines.push('');
    }

    if (aiDetectionResult) {
      lines.push('AI CONTENT DETECTION:');
      lines.push(`  AI Probability: ${(aiDetectionResult.aiProbability * 100).toFixed(1)}%`);
      lines.push(`  Confidence: ${(aiDetectionResult.confidence * 100).toFixed(1)}%`);
      lines.push(`  Recommendation: ${aiDetectionResult.recommendation.toUpperCase()}`);
      if (aiDetectionResult.flaggedSections.length > 0) {
        lines.push(`  Flagged Sections: ${aiDetectionResult.flaggedSections.length}`);
      }
      lines.push('');
    }

    if (collusionResult) {
      lines.push('COLLUSION DETECTION:');
      lines.push(`  Collusion Pairs Found: ${collusionResult.collusionPairs.length}`);
      lines.push(`  Suspicious Groups: ${collusionResult.suspiciousGroups.length}`);
      lines.push(`  Overall Risk: ${collusionResult.overallRisk.toUpperCase()}`);
      lines.push('');
    }

    if (proctoringSession) {
      lines.push('PROCTORING ANALYSIS:');
      lines.push(`  Integrity Score: ${proctoringSession.integrityScore}/100`);
      lines.push(`  Risk Level: ${proctoringSession.riskLevel.toUpperCase()}`);
      lines.push(`  Flags: ${proctoringSession.flagCount}`);
      lines.push(`  Requires Review: ${proctoringSession.requiresReview ? 'YES' : 'NO'}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  private generateRecommendations(
    violation: IntegrityViolation,
    plagiarismReport?: PlagiarismReport,
    aiDetectionResult?: AIContentDetectionResult,
    collusionResult?: CollusionDetectionResult,
    proctoringSession?: ProctoringSession
  ): string[] {
    const recommendations: string[] = [];

    if (violation.severity === 'severe') {
      recommendations.push('Immediate faculty review required');
      recommendations.push('Consider referral to Academic Integrity Committee');
      recommendations.push('Potential consequences: Course failure or suspension');
    } else if (violation.severity === 'major') {
      recommendations.push('Faculty review required');
      recommendations.push('Interview student to understand circumstances');
      recommendations.push('Potential consequences: Zero on assignment or course failure');
    } else {
      recommendations.push('Faculty review recommended');
      recommendations.push('Consider educational intervention');
      recommendations.push('Potential consequences: Warning or assignment redo');
    }

    if (plagiarismReport && plagiarismReport.overallRiskLevel === 'critical') {
      recommendations.push('High plagiarism score - review matched sources carefully');
    }

    if (aiDetectionResult && aiDetectionResult.aiProbability > 0.8) {
      recommendations.push('High AI content probability - interview student about writing process');
    }

    if (collusionResult && collusionResult.suspiciousGroups.length > 0) {
      recommendations.push('Multiple students involved - coordinate investigation');
    }

    if (proctoringSession && proctoringSession.flagCount >= 5) {
      recommendations.push('Multiple proctoring flags - review session recording');
    }

    recommendations.push('Document all evidence and student communications');
    recommendations.push('Provide student opportunity to respond');
    recommendations.push('Follow university academic integrity policy');

    return recommendations;
  }

  async reviewViolation(
    violationId: string,
    reviewedBy: string,
    determination: Determination,
    reviewNotes: string,
    consequences: string[]
  ): Promise<IntegrityViolation> {
    try {
      logger.info('Reviewing violation', { violationId, determination });

      await prisma.$queryRawUnsafe(`
        UPDATE public.integrity_violations 
        SET reviewed_by = $1, reviewed_at = NOW(), determination = $2, 
            review_notes = $3, consequences = $4::jsonb
        WHERE id = $5
      `, reviewedBy, determination, reviewNotes, JSON.stringify(consequences), violationId);

      const updated = await this.getViolation(violationId);
      if (!updated) throw new Error('Violation not found after update');

      logger.info('Violation reviewed', { violationId, determination });
      return updated;
    } catch (error) {
      logger.error('Error reviewing violation', { error, violationId });
      throw error;
    }
  }

  async fileAppeal(violationId: string, appealNotes: string): Promise<IntegrityViolation> {
    try {
      logger.info('Filing appeal', { violationId });

      await prisma.$queryRawUnsafe(`
        UPDATE public.integrity_violations 
        SET appeal_filed = true, appeal_status = 'pending', appeal_notes = $1
        WHERE id = $2
      `, appealNotes, violationId);

      const updated = await this.getViolation(violationId);
      if (!updated) throw new Error('Violation not found after update');

      logger.info('Appeal filed', { violationId });
      return updated;
    } catch (error) {
      logger.error('Error filing appeal', { error, violationId });
      throw error;
    }
  }

  async resolveAppeal(violationId: string, approved: boolean, resolutionNotes: string): Promise<IntegrityViolation> {
    try {
      logger.info('Resolving appeal', { violationId, approved });

      await prisma.$queryRawUnsafe(`
        UPDATE public.integrity_violations 
        SET appeal_status = $1, review_notes = $2
        WHERE id = $3
      `, approved ? 'approved' : 'denied', resolutionNotes, violationId);

      const updated = await this.getViolation(violationId);
      if (!updated) throw new Error('Violation not found after update');

      logger.info('Appeal resolved', { violationId, approved });
      return updated;
    } catch (error) {
      logger.error('Error resolving appeal', { error, violationId });
      throw error;
    }
  }

  async createRestorationPlan(
    violationId: string,
    plan: { steps: string[]; requirements: string[]; timeline: string; supportResources: string[] }
  ): Promise<IntegrityViolation> {
    try {
      logger.info('Creating restoration plan', { violationId });

      await prisma.$queryRawUnsafe(`
        UPDATE public.integrity_violations 
        SET restoration_plan = $1::jsonb
        WHERE id = $2
      `, JSON.stringify(plan), violationId);

      const updated = await this.getViolation(violationId);
      if (!updated) throw new Error('Violation not found after update');

      logger.info('Restoration plan created', { violationId });
      return updated;
    } catch (error) {
      logger.error('Error creating restoration plan', { error, violationId });
      throw error;
    }
  }

  async completeRestoration(violationId: string): Promise<IntegrityViolation> {
    try {
      logger.info('Completing restoration', { violationId });

      await prisma.$queryRawUnsafe(`
        UPDATE public.integrity_violations 
        SET restoration_complete = true, restoration_date = NOW()
        WHERE id = $1
      `, violationId);

      const updated = await this.getViolation(violationId);
      if (!updated) throw new Error('Violation not found after update');

      logger.info('Restoration completed', { violationId });
      return updated;
    } catch (error) {
      logger.error('Error completing restoration', { error, violationId });
      throw error;
    }
  }

  async getViolation(violationId: string): Promise<IntegrityViolation | null> {
    try {
      const violations = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM public.integrity_violations WHERE id = $1
      `, violationId);

      if (!violations || violations.length === 0) return null;
      return this.mapViolationFromDB(violations[0]);
    } catch (error) {
      logger.error('Error getting violation', { error, violationId });
      throw error;
    }
  }

  async getStudentViolations(studentId: string): Promise<IntegrityViolation[]> {
    try {
      const violations = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM public.integrity_violations 
        WHERE student_id = $1 
        ORDER BY reported_at DESC
      `, studentId);

      return violations.map((v: any) => this.mapViolationFromDB(v));
    } catch (error) {
      logger.error('Error getting student violations', { error, studentId });
      throw error;
    }
  }

  async getViolationsRequiringReview(): Promise<IntegrityViolation[]> {
    try {
      const violations = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM public.integrity_violations 
        WHERE reviewed_by IS NULL 
        ORDER BY reported_at DESC 
        LIMIT 100
      `);

      return violations.map((v: any) => this.mapViolationFromDB(v));
    } catch (error) {
      logger.error('Error getting violations requiring review', { error });
      throw error;
    }
  }

  async getPendingAppeals(): Promise<IntegrityViolation[]> {
    try {
      const violations = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM public.integrity_violations 
        WHERE appeal_filed = true AND appeal_status = 'pending'
        ORDER BY reported_at DESC
      `);

      return violations.map((v: any) => this.mapViolationFromDB(v));
    } catch (error) {
      logger.error('Error getting pending appeals', { error });
      throw error;
    }
  }

  async generateStudentIntegrityReport(studentId: string): Promise<{
    studentId: string;
    integrityScore: number;
    violations: IntegrityViolation[];
    violationsByType: Record<ViolationType, number>;
    violationsBySeverity: Record<ViolationSeverity, number>;
    restorationStatus: { total: number; completed: number; pending: number };
    summary: string;
  }> {
    try {
      logger.info('Generating student integrity report', { studentId });

      const violations = await this.getStudentViolations(studentId);
      const integrityScore = await this.calculateStudentIntegrityScore(studentId);

      const violationsByType: Record<string, number> = {};
      violations.forEach((v) => {
        violationsByType[v.violationType] = (violationsByType[v.violationType] || 0) + 1;
      });

      const violationsBySeverity: Record<string, number> = {};
      violations.forEach((v) => {
        violationsBySeverity[v.severity] = (violationsBySeverity[v.severity] || 0) + 1;
      });

      const restorationStatus = {
        total: violations.filter((v) => v.restorationPlan).length,
        completed: violations.filter((v) => v.restorationComplete).length,
        pending: violations.filter((v) => v.restorationPlan && !v.restorationComplete).length,
      };

      const summary = this.generateStudentSummary(studentId, integrityScore, violations, restorationStatus);

      return {
        studentId,
        integrityScore,
        violations,
        violationsByType: violationsByType as any,
        violationsBySeverity: violationsBySeverity as any,
        restorationStatus,
        summary,
      };
    } catch (error) {
      logger.error('Error generating student integrity report', { error, studentId });
      throw error;
    }
  }

  private async calculateStudentIntegrityScore(studentId: string): Promise<number> {
    try {
      const result = await prisma.$queryRaw<Array<{ calculate_integrity_score: number }>>`
        SELECT calculate_integrity_score(${studentId}::uuid) as calculate_integrity_score
      `;

      if (result && result.length > 0) {
        return Number(result[0].calculate_integrity_score);
      }

      const violations = await this.getStudentViolations(studentId);
      let score = 100;
      violations.forEach((v) => {
        if (v.severity === 'minor') score -= 5;
        if (v.severity === 'major') score -= 20;
        if (v.severity === 'severe') score -= 50;
      });

      return Math.max(0, score);
    } catch (error) {
      logger.error('Error calculating integrity score', { error, studentId });
      return 100;
    }
  }

  private generateStudentSummary(
    studentId: string,
    integrityScore: number,
    violations: IntegrityViolation[],
    restorationStatus: { total: number; completed: number; pending: number }
  ): string {
    const lines: string[] = [
      '=== STUDENT INTEGRITY REPORT ===',
      '',
      `Student ID: ${studentId}`,
      `Integrity Score: ${integrityScore}/100`,
      `Total Violations: ${violations.length}`,
      ''
    ];

    if (violations.length > 0) {
      lines.push('VIOLATIONS:');
      violations.forEach((v, i) => {
        lines.push(`  ${i + 1}. [${v.severity.toUpperCase()}] ${v.violationType} - ${v.reportedAt.toISOString()}`);
      });
      lines.push('');
    }

    if (restorationStatus.total > 0) {
      lines.push('RESTORATION:');
      lines.push(`  Total Plans: ${restorationStatus.total}`);
      lines.push(`  Completed: ${restorationStatus.completed}`);
      lines.push(`  Pending: ${restorationStatus.pending}`);
      lines.push('');
    }

    if (integrityScore >= 90) {
      lines.push('STATUS: Excellent standing');
    } else if (integrityScore >= 70) {
      lines.push('STATUS: Good standing with minor concerns');
    } else if (integrityScore >= 50) {
      lines.push('STATUS: Probation - improvement required');
    } else {
      lines.push('STATUS: Critical - immediate intervention required');
    }

    return lines.join('\n');
  }

  async trackResolutionOutcome(
    violationId: string,
    outcome: {
      finalDetermination: Determination;
      consequencesApplied: string[];
      studentResponse: string;
      lessonsLearned: string[];
      preventiveMeasures: string[];
    }
  ): Promise<void> {
    try {
      logger.info('Tracking resolution outcome', { violationId });

      const violation = await this.getViolation(violationId);
      if (!violation) throw new Error('Violation not found');

      await prisma.$queryRawUnsafe(`
        UPDATE public.integrity_violations 
        SET evidence = $1::jsonb
        WHERE id = $2
      `, JSON.stringify({ ...violation.evidence, resolutionOutcome: outcome }), violationId);

      logger.info('Resolution outcome tracked', { violationId });
    } catch (error) {
      logger.error('Error tracking resolution outcome', { error, violationId });
      throw error;
    }
  }

  private mapViolationFromDB(violation: any): IntegrityViolation {
    return {
      id: violation.id,
      studentId: violation.student_id,
      violationType: violation.violation_type as ViolationType,
      severity: violation.severity as ViolationSeverity,
      courseId: violation.course_id,
      assignmentId: violation.assignment_id,
      description: violation.description,
      evidence: typeof violation.evidence === 'string' ? JSON.parse(violation.evidence) : (violation.evidence || {}),
      detectionMethod: violation.detection_method,
      reportedBy: violation.reported_by,
      reportedAt: violation.reported_at,
      reviewedBy: violation.reviewed_by,
      reviewedAt: violation.reviewed_at,
      determination: violation.determination as Determination | undefined,
      reviewNotes: violation.review_notes,
      consequences: typeof violation.consequences === 'string' ? JSON.parse(violation.consequences) : (violation.consequences || []),
      appealFiled: violation.appeal_filed,
      appealStatus: violation.appeal_status,
      restorationPlan: typeof violation.restoration_plan === 'string' ? JSON.parse(violation.restoration_plan) : violation.restoration_plan,
      restorationComplete: violation.restoration_complete,
    };
  }
}
