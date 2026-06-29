/**
 * Risk Prediction Service
 * "Watch and pray so that you will not fall into temptation" - Matthew 26:41
 * 
 * Predicts student risk levels and recommends early interventions
 */

import { PrismaClient } from '@prisma/client';
import {
  RiskAssessment,
  RiskFactor,
  RiskFactorType,
  ProtectiveFactor,
  ProtectiveFactorType,
  RiskPrediction,
  PredictRiskRequest,
  PredictRiskResponse,
  InterventionAction,
  RiskLevel
} from '../types/personalization.types';
import { AIGatewayService } from './AIGatewayService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface StudentData {
  enrollments: any[];
  submissions: any[];
  attendance: number;
  gpa: number;
  engagement: number;
  financialAid: boolean;
  supportSystem: number;
}

export default class RiskPredictionService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Predict student risk and generate assessment
   */
  async predictRisk(request: PredictRiskRequest): Promise<PredictRiskResponse> {
    try {
      logger.info('Predicting student risk', { studentId: request.studentId });

      // Collect student data
      const studentData = await this.collectStudentData(request.studentId);

      // Identify risk factors
      const riskFactors = await this.identifyRiskFactors(studentData);

      // Identify protective factors
      const protectiveFactors = await this.identifyProtectiveFactors(studentData);

      // Calculate overall risk level
      const overallRiskLevel = this.calculateOverallRisk(
        riskFactors,
        protectiveFactors
      );

      // Generate predictions
      const predictions = await this.generatePredictions(
        studentData,
        riskFactors,
        protectiveFactors
      );

      // Calculate confidence
      const confidence = this.calculateConfidence(studentData);

      // Build risk assessment
      const riskAssessment: RiskAssessment = {
        studentId: request.studentId,
        assessmentDate: new Date(),
        overallRiskLevel,
        riskFactors,
        protectiveFactors,
        predictions,
        recommendedInterventions: [],
        confidence
      };

      // Generate interventions if requested
      if (request.includeInterventions) {
        riskAssessment.recommendedInterventions = await this.generateInterventions(
          riskAssessment
        );
      }

      // Identify urgent actions
      const urgentActions = this.identifyUrgentActions(riskAssessment);

      logger.info('Risk prediction completed', {
        studentId: request.studentId,
        riskLevel: overallRiskLevel,
        riskFactorsCount: riskFactors.length,
        urgentActionsCount: urgentActions.length
      });

      return {
        success: true,
        riskAssessment,
        urgentActions: urgentActions.length > 0 ? urgentActions : undefined
      };
    } catch (error) {
      logger.error('Error predicting risk', { error, request });
      return {
        success: false,
        riskAssessment: this.getEmptyAssessment(request.studentId),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Track intervention effectiveness
   */
  async trackInterventionEffectiveness(
    studentId: string,
    interventionId: string
  ): Promise<{ effective: boolean; improvement: number; notes: string }> {
    try {
      // Get baseline risk assessment (before intervention)
      const baseline = await this.getHistoricalAssessment(studentId, 'before', interventionId);

      // Get current risk assessment (after intervention)
      const current = await this.predictRisk({ studentId });

      if (!baseline || !current.success) {
        return {
          effective: false,
          improvement: 0,
          notes: 'Insufficient data to measure effectiveness'
        };
      }

      // Calculate improvement
      const baselineScore = this.riskLevelToScore(baseline.overallRiskLevel);
      const currentScore = this.riskLevelToScore(current.riskAssessment.overallRiskLevel);
      const improvement = baselineScore - currentScore;

      const effective = improvement > 0;

      // Log effectiveness
      await this.logInterventionEffectiveness(
        studentId,
        interventionId,
        effective,
        improvement
      );

      return {
        effective,
        improvement,
        notes: effective 
          ? `Risk level improved by ${improvement} points`
          : `No significant improvement detected`
      };
    } catch (error) {
      logger.error('Error tracking intervention effectiveness', { error, studentId });
      return {
        effective: false,
        improvement: 0,
        notes: 'Error tracking effectiveness'
      };
    }
  }

  /**
   * Collect student data for risk assessment
   */
  private async collectStudentData(studentId: string): Promise<StudentData> {
    // Get enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: studentId },
      include: {
        course: true,
        submissions: {
          include: {
            assignment: true
          }
        }
      }
    });

    // Get all submissions
    const submissions = enrollments.flatMap(e => e.submissions);

    // Calculate GPA
    const gpa = await this.calculateGPA(enrollments);

    // Calculate attendance
    const attendance = await this.calculateAttendance(studentId);

    // Calculate engagement
    const engagement = await this.calculateEngagement(studentId);

    // Check financial aid status
    const user = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        financialAid: true
      }
    });

    const financialAid = user?.financialAid !== null;

    // Assess support system
    const supportSystem = await this.assessSupportSystem(studentId);

    return {
      enrollments,
      submissions,
      attendance,
      gpa,
      engagement,
      financialAid,
      supportSystem
    };
  }

  /**
   * Identify risk factors
   */
  private async identifyRiskFactors(data: StudentData): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    // Low GPA
    if (data.gpa < 2.5) {
      factors.push({
        factorType: 'low_gpa',
        severity: Math.round((2.5 - data.gpa) * 40),
        description: `GPA of ${data.gpa.toFixed(2)} is below recommended level`,
        evidence: [
          `Current GPA: ${data.gpa.toFixed(2)}`,
          'Below 2.5 threshold'
        ],
        trend: this.calculateGPATrend(data.enrollments)
      });
    }

    // Poor attendance
    if (data.attendance < 80) {
      factors.push({
        factorType: 'poor_attendance',
        severity: Math.round(100 - data.attendance),
        description: 'Attendance rate is concerning',
        evidence: [
          `Attendance rate: ${data.attendance.toFixed(1)}%`,
          'Missing significant class time'
        ],
        trend: 'stable'
      });
    }

    // Low engagement
    if (data.engagement < 50) {
      factors.push({
        factorType: 'low_engagement',
        severity: Math.round(100 - data.engagement),
        description: 'Student engagement is low',
        evidence: [
          `Engagement score: ${data.engagement}`,
          'Limited participation in learning activities'
        ],
        trend: 'stable'
      });
    }

    // Academic struggles
    const recentScores = data.submissions
      .filter(s => s.score !== null)
      .slice(-10)
      .map(s => s.score as number);

    const avgRecentScore = recentScores.length > 0
      ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
      : 75;

    if (avgRecentScore < 70) {
      factors.push({
        factorType: 'academic_struggles',
        severity: Math.round(100 - avgRecentScore),
        description: 'Struggling with coursework',
        evidence: [
          `Recent average: ${avgRecentScore.toFixed(1)}%`,
          `${recentScores.filter(s => s < 60).length} failing grades`
        ],
        trend: this.calculateScoreTrend(recentScores)
      });
    }

    // Financial stress
    if (!data.financialAid && data.gpa < 3.0) {
      factors.push({
        factorType: 'financial_stress',
        severity: 60,
        description: 'Potential financial challenges',
        evidence: [
          'No financial aid on record',
          'May be working while studying'
        ],
        trend: 'stable'
      });
    }

    // Social isolation
    if (data.supportSystem < 40) {
      factors.push({
        factorType: 'social_isolation',
        severity: Math.round(100 - data.supportSystem),
        description: 'Limited support network',
        evidence: [
          'Low peer interaction',
          'Limited community engagement'
        ],
        trend: 'stable'
      });
    }

    return factors;
  }

  /**
   * Identify protective factors
   */
  private async identifyProtectiveFactors(data: StudentData): Promise<ProtectiveFactor[]> {
    const factors: ProtectiveFactor[] = [];

    // Strong support system
    if (data.supportSystem >= 70) {
      factors.push({
        factorType: 'strong_support_system',
        strength: data.supportSystem,
        description: 'Active support network'
      });
    }

    // High motivation (based on engagement)
    if (data.engagement >= 70) {
      factors.push({
        factorType: 'high_motivation',
        strength: data.engagement,
        description: 'Highly engaged and motivated'
      });
    }

    // Good study habits (based on submission patterns)
    const onTimeSubmissions = data.submissions.filter(s => {
      if (!s.assignment.dueDate) return true;
      return s.submittedAt <= s.assignment.dueDate;
    });

    const onTimeRate = data.submissions.length > 0
      ? (onTimeSubmissions.length / data.submissions.length) * 100
      : 100;

    if (onTimeRate >= 80) {
      factors.push({
        factorType: 'good_study_habits',
        strength: Math.round(onTimeRate),
        description: 'Consistent and timely work submission'
      });
    }

    // Financial stability
    if (data.financialAid) {
      factors.push({
        factorType: 'financial_stability',
        strength: 80,
        description: 'Financial aid support in place'
      });
    }

    // Clear goals (if GPA is good)
    if (data.gpa >= 3.0) {
      factors.push({
        factorType: 'clear_goals',
        strength: Math.round(data.gpa * 25),
        description: 'Demonstrating academic focus'
      });
    }

    return factors;
  }

  /**
   * Calculate overall risk level
   */
  private calculateOverallRisk(
    riskFactors: RiskFactor[],
    protectiveFactors: ProtectiveFactor[]
  ): RiskLevel {
    // Calculate risk score
    const riskScore = riskFactors.reduce((sum, f) => sum + f.severity, 0) / 
      Math.max(riskFactors.length, 1);

    // Calculate protective score
    const protectiveScore = protectiveFactors.reduce((sum, f) => sum + f.strength, 0) / 
      Math.max(protectiveFactors.length, 1);

    // Net risk (risk - protective)
    const netRisk = riskScore - (protectiveScore * 0.5);

    if (netRisk >= 70) return 'critical';
    if (netRisk >= 50) return 'high';
    if (netRisk >= 30) return 'medium';
    return 'low';
  }

  /**
   * Generate risk predictions
   */
  private async generatePredictions(
    data: StudentData,
    riskFactors: RiskFactor[],
    protectiveFactors: ProtectiveFactor[]
  ): Promise<RiskPrediction[]> {
    const predictions: RiskPrediction[] = [];

    // Dropout prediction
    const dropoutProbability = this.calculateDropoutProbability(
      data,
      riskFactors,
      protectiveFactors
    );

    if (dropoutProbability > 20) {
      predictions.push({
        outcomeType: 'dropout',
        probability: dropoutProbability,
        timeframe: 'within 1 semester',
        preventable: true,
        preventionStrategies: [
          'Increase advisor check-ins',
          'Connect with peer support groups',
          'Provide academic coaching',
          'Address financial concerns'
        ]
      });
    }

    // Academic probation prediction
    if (data.gpa < 2.5) {
      predictions.push({
        outcomeType: 'academic_probation',
        probability: Math.round((2.5 - data.gpa) * 50),
        timeframe: 'end of current semester',
        preventable: true,
        preventionStrategies: [
          'Intensive tutoring support',
          'Reduce course load',
          'Study skills workshop',
          'Regular progress monitoring'
        ]
      });
    }

    // Course failure prediction
    const failingCourses = data.enrollments.filter(e => {
      const avgScore = e.submissions
        .filter((s: any) => s.score !== null)
        .reduce((sum: number, s: any) => sum + (s.score || 0), 0) / 
        Math.max(e.submissions.length, 1);
      return avgScore < 60;
    });

    if (failingCourses.length > 0) {
      predictions.push({
        outcomeType: 'course_failure',
        probability: Math.min(failingCourses.length * 30, 90),
        timeframe: 'end of current semester',
        preventable: true,
        preventionStrategies: [
          'Course-specific tutoring',
          'Meet with instructor',
          'Form study group',
          'Consider course withdrawal if appropriate'
        ]
      });
    }

    // Delayed graduation prediction
    if (data.gpa < 3.0 && data.attendance < 85) {
      predictions.push({
        outcomeType: 'delayed_graduation',
        probability: 60,
        timeframe: '1-2 years',
        preventable: true,
        preventionStrategies: [
          'Optimize course sequencing',
          'Summer course enrollment',
          'Improve time management',
          'Address underlying challenges'
        ]
      });
    }

    return predictions;
  }

  /**
   * Generate intervention recommendations
   */
  private async generateInterventions(
    assessment: RiskAssessment
  ): Promise<InterventionAction[]> {
    const interventions: InterventionAction[] = [];

    // High-priority interventions for critical risk
    if (assessment.overallRiskLevel === 'critical') {
      interventions.push({
        actionType: 'advisor_notification',
        description: 'Immediate advisor meeting required',
        priority: 1,
        estimatedImpact: 90,
        resourcesRequired: ['Advisor availability', 'Counseling services'],
        autoExecutable: true
      });
    }

    // Address specific risk factors
    for (const factor of assessment.riskFactors) {
      switch (factor.factorType) {
        case 'low_gpa':
        case 'academic_struggles':
          interventions.push({
            actionType: 'schedule_tutoring',
            description: 'Academic support and tutoring',
            priority: 2,
            estimatedImpact: 80,
            resourcesRequired: ['Tutor availability'],
            autoExecutable: true
          });
          break;

        case 'poor_attendance':
          interventions.push({
            actionType: 'advisor_notification',
            description: 'Address attendance concerns',
            priority: 2,
            estimatedImpact: 70,
            resourcesRequired: ['Advisor availability'],
            autoExecutable: true
          });
          break;

        case 'low_engagement':
          interventions.push({
            actionType: 'form_study_group',
            description: 'Connect with peer support',
            priority: 3,
            estimatedImpact: 65,
            resourcesRequired: ['Compatible peers'],
            autoExecutable: false
          });
          break;

        case 'social_isolation':
          interventions.push({
            actionType: 'spiritual_counseling',
            description: 'Connect with spiritual advisor and community',
            priority: 2,
            estimatedImpact: 75,
            resourcesRequired: ['Spiritual advisor'],
            autoExecutable: true
          });
          break;
      }
    }

    // Remove duplicates and sort by priority
    const uniqueInterventions = this.deduplicateInterventions(interventions);
    return uniqueInterventions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Identify urgent actions
   */
  private identifyUrgentActions(assessment: RiskAssessment): InterventionAction[] {
    if (assessment.overallRiskLevel !== 'critical' && assessment.overallRiskLevel !== 'high') {
      return [];
    }

    return assessment.recommendedInterventions
      .filter(i => i.priority <= 2)
      .slice(0, 3);
  }

  /**
   * Helper methods
   */
  private async calculateGPA(enrollments: any[]): Promise<number> {
    const completedEnrollments = enrollments.filter(e => e.status === 'COMPLETED');

    if (completedEnrollments.length === 0) return 3.0;

    let totalPoints = 0;
    let totalCourses = 0;

    for (const enrollment of completedEnrollments) {
      const scores = enrollment.submissions
        .filter((s: any) => s.score !== null)
        .map((s: any) => s.score as number);

      if (scores.length > 0) {
        const avgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
        totalPoints += this.scoreToGPA(avgScore);
        totalCourses++;
      }
    }

    return totalCourses > 0 ? totalPoints / totalCourses : 3.0;
  }

  private scoreToGPA(score: number): number {
    if (score >= 93) return 4.0;
    if (score >= 90) return 3.7;
    if (score >= 87) return 3.3;
    if (score >= 83) return 3.0;
    if (score >= 80) return 2.7;
    if (score >= 77) return 2.3;
    if (score >= 73) return 2.0;
    if (score >= 70) return 1.7;
    if (score >= 67) return 1.3;
    if (score >= 60) return 1.0;
    return 0.0;
  }

  private async calculateAttendance(studentId: string): Promise<number> {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: studentId, status: 'ACTIVE' }
    });

    if (enrollments.length === 0) return 100;

    const avgProgress = enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length;
    return avgProgress;
  }

  private async calculateEngagement(studentId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const tutorSessions = await prisma.aITutorSession.count({
      where: {
        userId: studentId,
        createdAt: { gte: thirtyDaysAgo }
      }
    });

    const submissions = await prisma.submission.count({
      where: {
        userId: studentId,
        submittedAt: { gte: thirtyDaysAgo }
      }
    });

    return Math.min((tutorSessions * 10) + (submissions * 5), 100);
  }

  private async assessSupportSystem(studentId: string): Promise<number> {
    // Check for study group participation
    const studyGroups = await prisma.studyGroupMember.count({
      where: { studentId }
    });

    // Check for mentor relationships
    const user = await prisma.user.findUnique({
      where: { id: studentId },
      include: { advisor: true }
    });

    let score = 50; // Base score

    if (studyGroups > 0) score += 25;
    if (user?.advisor) score += 25;

    return Math.min(score, 100);
  }

  private calculateGPATrend(enrollments: any[]): 'increasing' | 'stable' | 'decreasing' {
    if (enrollments.length < 4) return 'stable';

    const sortedEnrollments = enrollments
      .filter(e => e.status === 'COMPLETED')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    if (sortedEnrollments.length < 4) return 'stable';

    const firstHalf = sortedEnrollments.slice(0, Math.floor(sortedEnrollments.length / 2));
    const secondHalf = sortedEnrollments.slice(Math.floor(sortedEnrollments.length / 2));

    const firstGPA = this.calculateGPAForEnrollments(firstHalf);
    const secondGPA = this.calculateGPAForEnrollments(secondHalf);

    if (secondGPA > firstGPA + 0.3) return 'increasing';
    if (secondGPA < firstGPA - 0.3) return 'decreasing';
    return 'stable';
  }

  private calculateGPAForEnrollments(enrollments: any[]): number {
    let totalPoints = 0;
    let count = 0;

    for (const enrollment of enrollments) {
      const scores = enrollment.submissions
        .filter((s: any) => s.score !== null)
        .map((s: any) => s.score as number);

      if (scores.length > 0) {
        const avgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
        totalPoints += this.scoreToGPA(avgScore);
        count++;
      }
    }

    return count > 0 ? totalPoints / count : 3.0;
  }

  private calculateScoreTrend(scores: number[]): 'increasing' | 'stable' | 'decreasing' {
    if (scores.length < 4) return 'stable';

    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (secondAvg > firstAvg + 10) return 'increasing';
    if (secondAvg < firstAvg - 10) return 'decreasing';
    return 'stable';
  }

  private calculateDropoutProbability(
    data: StudentData,
    riskFactors: RiskFactor[],
    protectiveFactors: ProtectiveFactor[]
  ): number {
    let probability = 0;

    // Base probability from GPA
    if (data.gpa < 2.0) probability += 40;
    else if (data.gpa < 2.5) probability += 20;

    // Attendance impact
    if (data.attendance < 70) probability += 30;
    else if (data.attendance < 80) probability += 15;

    // Engagement impact
    if (data.engagement < 40) probability += 20;

    // Risk factors impact
    const criticalFactors = riskFactors.filter(f => f.severity >= 70);
    probability += criticalFactors.length * 10;

    // Protective factors reduce probability
    const strongProtective = protectiveFactors.filter(f => f.strength >= 70);
    probability -= strongProtective.length * 15;

    return Math.max(0, Math.min(100, probability));
  }

  private calculateConfidence(data: StudentData): number {
    const dataPoints = 
      data.enrollments.length +
      data.submissions.length +
      (data.financialAid ? 1 : 0) +
      (data.supportSystem > 0 ? 1 : 0);

    if (dataPoints >= 20) return 95;
    if (dataPoints >= 10) return 85;
    if (dataPoints >= 5) return 75;
    return 60;
  }

  private deduplicateInterventions(interventions: InterventionAction[]): InterventionAction[] {
    const seen = new Set<string>();
    return interventions.filter(i => {
      const key = `${i.actionType}-${i.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private riskLevelToScore(level: RiskLevel): number {
    const scores: Record<RiskLevel, number> = {
      low: 25,
      medium: 50,
      high: 75,
      critical: 100
    };
    return scores[level];
  }

  private async getHistoricalAssessment(
    studentId: string,
    timing: 'before' | 'after',
    interventionId: string
  ): Promise<RiskAssessment | null> {
    // Simplified - would query historical assessments from database
    return null;
  }

  private async logInterventionEffectiveness(
    studentId: string,
    interventionId: string,
    effective: boolean,
    improvement: number
  ): Promise<void> {
    logger.info('Intervention effectiveness logged', {
      studentId,
      interventionId,
      effective,
      improvement
    });
  }

  private getEmptyAssessment(studentId: string): RiskAssessment {
    return {
      studentId,
      assessmentDate: new Date(),
      overallRiskLevel: 'low',
      riskFactors: [],
      protectiveFactors: [],
      predictions: [],
      recommendedInterventions: [],
      confidence: 0
    };
  }
}
