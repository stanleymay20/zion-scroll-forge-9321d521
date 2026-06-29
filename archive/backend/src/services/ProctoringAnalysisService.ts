/**
 * Proctoring Analysis Service
 * Analyzes proctoring sessions for suspicious behavior
 * "The LORD detests dishonest scales, but accurate weights find favor with him" - Proverbs 11:1
 */

import { PrismaClient } from '@prisma/client';
import {
  ProctoringSessionRequest,
  ProctoringSession,
  ProctoringFlag,
  ProctoringAnalysisResult,
  BehaviorAnalysis,
  EyeMovementPattern,
  SuspiciousBehavior,
  DeviceDetection,
  EnvironmentChange,
  RiskLevel,
  ViolationSeverity,
} from '../types/integrity.types';
import { integrityConfig, PROCTORING_FLAG_SCORES, MAX_PROCTORING_FLAGS } from '../config/integrity.config';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export default class ProctoringAnalysisService {
  /**
   * Create a new proctoring session
   */
  async createSession(request: ProctoringSessionRequest): Promise<ProctoringSession> {
    try {
      logger.info('Creating proctoring session', {
        studentId: request.studentId,
        examId: request.examId,
      });

      if (!integrityConfig.proctoring.enabled) {
        throw new Error('Proctoring is not enabled');
      }

      // Generate unique session token
      const sessionToken = this.generateSessionToken();

      // Create session in database using raw SQL
      const sessions = await prisma.$queryRawUnsafe<any[]>(`
        INSERT INTO public.proctoring_sessions (
          student_id, exam_id, proctoring_type, session_token,
          id_verified, environment_verified, flags, flag_count,
          integrity_score, risk_level, requires_review, started_at
        ) VALUES ($1, $2, $3, $4, false, false, '[]'::jsonb, 0, 100, 'low', false, NOW())
        RETURNING *
      `,
        request.studentId,
        request.examId,
        request.proctoringType,
        sessionToken
      );

      return this.mapSessionFromDB(sessions[0]);
    } catch (error) {
      logger.error('Error creating proctoring session', { error });
      throw error;
    }
  }

  /**
   * Verify student ID
   */
  async verifyStudentID(
    sessionId: string,
    idImageUrl: string,
    faceImageUrl: string
  ): Promise<{ verified: boolean; confidence: number }> {
    try {
      logger.info('Verifying student ID', { sessionId });

      // In production, would use facial recognition API
      // For now, simulate verification
      const verified = true;
      const confidence = 0.95;

      // Update session
      await prisma.$queryRawUnsafe(`
        UPDATE public.proctoring_sessions
        SET id_verified = $1, id_verification_method = 'facial_recognition',
            id_verification_timestamp = NOW()
        WHERE id = $2
      `, verified, sessionId);

      logger.info('Student ID verified', { sessionId, verified, confidence });

      return { verified, confidence };
    } catch (error) {
      logger.error('Error verifying student ID', { error, sessionId });
      throw error;
    }
  }

  /**
   * Verify exam environment
   */
  async verifyEnvironment(
    sessionId: string,
    environmentScanUrl: string
  ): Promise<{ verified: boolean; issues: string[] }> {
    try {
      logger.info('Verifying environment', { sessionId });

      // In production, would analyze 360° room scan
      // Check for: other people, unauthorized materials, multiple screens, etc.
      const verified = true;
      const issues: string[] = [];

      // Update session
      await prisma.$queryRawUnsafe(`
        UPDATE public.proctoring_sessions
        SET environment_verified = $1, environment_scan_url = $2,
            environment_scan_timestamp = NOW()
        WHERE id = $3
      `, verified, environmentScanUrl, sessionId);

      logger.info('Environment verified', { sessionId, verified, issues });

      return { verified, issues };
    } catch (error) {
      logger.error('Error verifying environment', { error, sessionId });
      throw error;
    }
  }

  /**
   * Analyze proctoring session for suspicious behavior
   */
  async analyzeSession(sessionId: string): Promise<ProctoringAnalysisResult> {
    try {
      logger.info('Analyzing proctoring session', { sessionId });

      // Get session from database
      const sessions = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM public.proctoring_sessions WHERE id = $1
      `, sessionId);

      if (!sessions || sessions.length === 0) {
        throw new Error('Proctoring session not found');
      }

      const session = sessions[0];

      // Get flags separately
      const proctoring_flags = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM public.proctoring_flags WHERE session_id = $1
      `, sessionId);

      session.proctoring_flags = proctoring_flags;

      // Analyze behavior patterns
      const behaviorAnalysis = await this.analyzeBehavior(sessionId);

      // Get all flags
      const flags = session.proctoring_flags.map((flag: any) => this.mapFlagFromDB(flag));

      // Calculate integrity score
      const integrityScore = this.calculateIntegrityScore(flags, behaviorAnalysis);

      // Determine risk level
      const riskLevel = this.determineRiskLevel(integrityScore, flags.length);

      // Determine if requires review
      const requiresReview = this.requiresHumanReview(riskLevel, flags.length);

      // Generate recommendations
      const recommendations = this.generateRecommendations(flags, behaviorAnalysis, riskLevel);

      // Update session with analysis results
      await prisma.$queryRawUnsafe(`
        UPDATE public.proctoring_sessions
        SET ai_analysis = $1::jsonb, integrity_score = $2,
            risk_level = $3, requires_review = $4
        WHERE id = $5
      `, JSON.stringify(behaviorAnalysis), integrityScore, riskLevel, requiresReview, sessionId);

      return {
        flags,
        behaviorAnalysis,
        integrityScore,
        riskLevel,
        requiresReview,
        recommendations,
      };
    } catch (error) {
      logger.error('Error analyzing proctoring session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Add a flag to proctoring session
   */
  async addFlag(
    sessionId: string,
    flagType: string,
    severity: ViolationSeverity,
    description: string,
    videoTimestamp?: number,
    screenshotUrl?: string,
    aiConfidence?: number
  ): Promise<ProctoringFlag> {
    try {
      logger.info('Adding proctoring flag', { sessionId, flagType, severity });

      // Create flag
      const flags = await prisma.$queryRawUnsafe<any[]>(`
        INSERT INTO public.proctoring_flags (
          session_id, flag_type, severity, description, timestamp,
          video_timestamp, screenshot_url, ai_confidence
        ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)
        RETURNING *
      `, sessionId, flagType, severity, description, videoTimestamp || null, screenshotUrl || null, aiConfidence || null);

      // Update session flag count
      await prisma.$queryRawUnsafe(`
        UPDATE public.proctoring_sessions
        SET flag_count = flag_count + 1
        WHERE id = $1
      `, sessionId);

      return this.mapFlagFromDB(flags[0]);
    } catch (error) {
      logger.error('Error adding proctoring flag', { error, sessionId });
      throw error;
    }
  }

  /**
   * Analyze behavior patterns during session
   */
  private async analyzeBehavior(sessionId: string): Promise<BehaviorAnalysis> {
    try {
      // In production, would analyze video/audio recordings
      // For now, return simulated analysis

      const eyeMovementPatterns: EyeMovementPattern[] = [];
      const suspiciousBehaviors: SuspiciousBehavior[] = [];
      const deviceDetection: DeviceDetection = {
        multipleDevicesDetected: false,
        devices: ['laptop'],
        confidence: 0.9,
      };
      const environmentChanges: EnvironmentChange[] = [];

      return {
        eyeMovementPatterns,
        suspiciousBehaviors,
        deviceDetection,
        environmentChanges,
      };
    } catch (error) {
      logger.error('Error analyzing behavior', { error, sessionId });
      throw error;
    }
  }

  /**
   * Analyze webcam feed for suspicious behavior
   */
  async analyzeWebcamFeed(
    sessionId: string,
    frameData: string,
    timestamp: number
  ): Promise<{
    flags: Array<{
      type: string;
      severity: ViolationSeverity;
      description: string;
      confidence: number;
    }>;
  }> {
    try {
      // In production, would use computer vision to detect:
      // - Multiple faces
      // - Looking away from screen
      // - Using phone
      // - Reading from notes
      // - Talking to someone

      const flags: Array<{
        type: string;
        severity: ViolationSeverity;
        description: string;
        confidence: number;
      }> = [];

      // Simulate detection
      // TODO: Implement actual computer vision analysis

      return { flags };
    } catch (error) {
      logger.error('Error analyzing webcam feed', { error, sessionId });
      throw error;
    }
  }

  /**
   * Analyze eye tracking data
   */
  async analyzeEyeTracking(
    sessionId: string,
    eyeTrackingData: Array<{ x: number; y: number; timestamp: number }>
  ): Promise<{
    lookingAwayCount: number;
    averageLookAwayDuration: number;
    suspiciousPatterns: string[];
  }> {
    try {
      logger.info('Analyzing eye tracking', { sessionId });

      // Analyze eye movement patterns
      let lookingAwayCount = 0;
      let totalLookAwayDuration = 0;
      const suspiciousPatterns: string[] = [];

      // In production, would analyze actual eye tracking data
      // Look for: frequent looking away, reading from notes, etc.

      return {
        lookingAwayCount,
        averageLookAwayDuration: lookingAwayCount > 0 ? totalLookAwayDuration / lookingAwayCount : 0,
        suspiciousPatterns,
      };
    } catch (error) {
      logger.error('Error analyzing eye tracking', { error, sessionId });
      throw error;
    }
  }

  /**
   * Detect multiple devices
   */
  async detectMultipleDevices(
    sessionId: string,
    networkData: any
  ): Promise<DeviceDetection> {
    try {
      logger.info('Detecting multiple devices', { sessionId });

      // In production, would analyze network traffic, bluetooth connections, etc.
      // For now, return simulated result

      return {
        multipleDevicesDetected: false,
        devices: ['laptop'],
        confidence: 0.9,
      };
    } catch (error) {
      logger.error('Error detecting multiple devices', { error, sessionId });
      throw error;
    }
  }

  /**
   * Calculate integrity score based on flags and behavior
   */
  private calculateIntegrityScore(
    flags: ProctoringFlag[],
    behaviorAnalysis: BehaviorAnalysis
  ): number {
    let score = 100;

    // Deduct points for each flag based on severity
    for (const flag of flags) {
      const severityScore = PROCTORING_FLAG_SCORES[flag.severity as keyof typeof PROCTORING_FLAG_SCORES] || 0;
      score -= severityScore;
    }

    // Deduct points for suspicious behaviors
    score -= behaviorAnalysis.suspiciousBehaviors.length * 2;

    // Deduct points for multiple devices
    if (behaviorAnalysis.deviceDetection.multipleDevicesDetected) {
      score -= 10;
    }

    // Deduct points for environment changes
    score -= behaviorAnalysis.environmentChanges.length * 3;

    // Ensure score doesn't go below 0
    return Math.max(0, score);
  }

  /**
   * Determine risk level based on integrity score and flag count
   */
  private determineRiskLevel(integrityScore: number, flagCount: number): RiskLevel {
    if (integrityScore < 50 || flagCount >= MAX_PROCTORING_FLAGS) {
      return 'critical';
    }

    if (integrityScore < 70 || flagCount >= 3) {
      return 'high';
    }

    if (integrityScore < 85 || flagCount >= 1) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Determine if session requires human review
   */
  private requiresHumanReview(riskLevel: RiskLevel, flagCount: number): boolean {
    return riskLevel === 'critical' || riskLevel === 'high' || flagCount >= integrityConfig.proctoring.flagThreshold;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    flags: ProctoringFlag[],
    behaviorAnalysis: BehaviorAnalysis,
    riskLevel: RiskLevel
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical') {
      recommendations.push('Immediate human review required');
      recommendations.push('Consider invalidating exam results');
      recommendations.push('Interview student about flagged behaviors');
    } else if (riskLevel === 'high') {
      recommendations.push('Human review recommended');
      recommendations.push('Review flagged sections of recording');
      recommendations.push('Compare exam performance to student baseline');
    } else if (riskLevel === 'medium') {
      recommendations.push('Monitor for patterns in future exams');
      recommendations.push('Consider brief review of flagged sections');
    }

    // Specific recommendations based on flags
    const flagTypes = new Set(flags.map((f) => f.flagType));

    if (flagTypes.has('looking_away')) {
      recommendations.push('Review sections where student looked away from screen');
    }

    if (flagTypes.has('multiple_faces')) {
      recommendations.push('Verify no unauthorized assistance was provided');
    }

    if (flagTypes.has('phone_detected')) {
      recommendations.push('Check if phone was used to access unauthorized materials');
    }

    if (behaviorAnalysis.deviceDetection.multipleDevicesDetected) {
      recommendations.push('Investigate use of multiple devices during exam');
    }

    return recommendations;
  }

  /**
   * End proctoring session
   */
  async endSession(sessionId: string): Promise<ProctoringSession> {
    try {
      logger.info('Ending proctoring session', { sessionId });

      const endedAt = new Date();

      // Get session to calculate duration
      const sessions = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM public.proctoring_sessions WHERE id = $1
      `, sessionId);

      if (!sessions || sessions.length === 0) {
        throw new Error('Proctoring session not found');
      }

      const session = sessions[0];
      const durationMinutes = Math.round(
        (endedAt.getTime() - new Date(session.started_at).getTime()) / (1000 * 60)
      );

      // Update session
      await prisma.$queryRawUnsafe(`
        UPDATE public.proctoring_sessions
        SET ended_at = $1, duration_minutes = $2
        WHERE id = $3
      `, endedAt, durationMinutes, sessionId);

      const updated = sessions[0];
      updated.ended_at = endedAt;
      updated.duration_minutes = durationMinutes;

      // Analyze session
      await this.analyzeSession(sessionId);

      return this.mapSessionFromDB(updated);
    } catch (error) {
      logger.error('Error ending proctoring session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get proctoring session
   */
  async getSession(sessionId: string): Promise<ProctoringSession | null> {
    try {
      const sessions = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM public.proctoring_sessions WHERE id = $1
      `, sessionId);

      if (!sessions || sessions.length === 0) return null;

      return this.mapSessionFromDB(sessions[0]);
    } catch (error) {
      logger.error('Error getting proctoring session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get sessions requiring review
   */
  async getSessionsRequiringReview(): Promise<ProctoringSession[]> {
    try {
      const sessions = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM public.proctoring_sessions
        WHERE requires_review = true AND ended_at IS NOT NULL
        ORDER BY ended_at DESC
        LIMIT 100
      `);

      return sessions.map((s: any) => this.mapSessionFromDB(s));
    } catch (error) {
      logger.error('Error getting sessions requiring review', { error });
      throw error;
    }
  }

  /**
   * Generate proctoring report
   */
  async generateReport(sessionId: string): Promise<{
    session: ProctoringSession;
    analysis: ProctoringAnalysisResult;
    flags: ProctoringFlag[];
    summary: string;
  }> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Proctoring session not found');
      }

      const analysis = await this.analyzeSession(sessionId);

      const flags = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM public.proctoring_flags
        WHERE session_id = $1
        ORDER BY timestamp ASC
      `, sessionId);

      const mappedFlags = flags.map((f: any) => this.mapFlagFromDB(f));

      // Generate summary
      const summary = this.generateSummary(session, analysis, mappedFlags);

      return {
        session,
        analysis,
        flags: mappedFlags,
        summary,
      };
    } catch (error) {
      logger.error('Error generating proctoring report', { error, sessionId });
      throw error;
    }
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(
    session: ProctoringSession,
    analysis: ProctoringAnalysisResult,
    flags: ProctoringFlag[]
  ): string {
    const lines: string[] = [];

    lines.push(`Proctoring Session Report`);
    lines.push(`Session ID: ${session.id}`);
    lines.push(`Student ID: ${session.studentId}`);
    lines.push(`Duration: ${session.durationMinutes || 0} minutes`);
    lines.push(`Integrity Score: ${analysis.integrityScore}/100`);
    lines.push(`Risk Level: ${analysis.riskLevel.toUpperCase()}`);
    lines.push('');

    if (flags.length > 0) {
      lines.push(`Flags: ${flags.length}`);
      flags.forEach((flag, i) => {
        lines.push(`  ${i + 1}. [${flag.severity.toUpperCase()}] ${flag.description}`);
      });
      lines.push('');
    }

    if (analysis.recommendations.length > 0) {
      lines.push('Recommendations:');
      analysis.recommendations.forEach((rec, i) => {
        lines.push(`  ${i + 1}. ${rec}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Generate unique session token
   */
  private generateSessionToken(): string {
    return `proc_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Map database session to type
   */
  private mapSessionFromDB(session: any): ProctoringSession {
    return {
      id: session.id,
      studentId: session.student_id,
      examId: session.exam_id,
      proctoringType: session.proctoring_type,
      sessionToken: session.session_token,
      idVerified: session.id_verified,
      environmentVerified: session.environment_verified,
      flags: (session.flags as any) || [],
      flagCount: session.flag_count,
      integrityScore: Number(session.integrity_score),
      riskLevel: session.risk_level as RiskLevel,
      requiresReview: session.requires_review,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      durationMinutes: session.duration_minutes,
    };
  }

  /**
   * Map database flag to type
   */
  private mapFlagFromDB(flag: any): ProctoringFlag {
    return {
      id: flag.id,
      sessionId: flag.session_id,
      flagType: flag.flag_type,
      severity: flag.severity as ViolationSeverity,
      description: flag.description,
      timestamp: flag.timestamp,
      videoTimestamp: flag.video_timestamp,
      screenshotUrl: flag.screenshot_url,
      aiConfidence: flag.ai_confidence ? Number(flag.ai_confidence) : 0,
    };
  }
}
