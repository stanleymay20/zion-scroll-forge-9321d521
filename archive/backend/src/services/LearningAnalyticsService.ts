/**
 * Learning Analytics Service
 * "The heart of the discerning acquires knowledge" - Proverbs 18:15
 * 
 * Analyzes student performance data to identify strengths, weaknesses, and learning patterns
 */

import { PrismaClient } from '@prisma/client';
import {
  LearningProfile,
  PerformanceAnalysis,
  PerformanceMetrics,
  SpiritualGrowthMetrics,
  StrengthArea,
  WeaknessArea,
  LearningPattern,
  LearningStyle,
  LearningPace,
  RiskLevel,
  AnalysisTimeframe,
  AnalyzePerformanceRequest,
  AnalyzePerformanceResponse
} from '../types/personalization.types';
import { AIGatewayService } from './AIGatewayService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface PerformanceData {
  enrollments: any[];
  submissions: any[];
  user: any;
  portalEnrollments: any[];
  aiTutorSessions: any[];
}

export default class LearningAnalyticsService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Analyze student performance and generate learning profile
   */
  async analyzePerformance(request: AnalyzePerformanceRequest): Promise<AnalyzePerformanceResponse> {
    try {
      logger.info('Analyzing student performance', { studentId: request.studentId });

      // Collect student performance data
      const performanceData = await this.collectPerformanceData(
        request.studentId,
        request.courseId,
        request.timeframe
      );

      // Calculate performance metrics
      const performanceMetrics = await this.calculatePerformanceMetrics(performanceData);

      // Identify strengths and weaknesses
      const strengths = await this.identifyStrengths(performanceData, performanceMetrics);
      const weaknesses = await this.identifyWeaknesses(performanceData, performanceMetrics);

      // Detect learning patterns
      const patterns = await this.detectLearningPatterns(performanceData);

      // Determine learning style
      const learningStyle = await this.determineLearningStyle(performanceData, patterns);

      // Calculate learning pace
      const pace = this.calculateLearningPace(performanceMetrics);

      // Calculate engagement score
      const engagement = this.calculateEngagement(performanceData, performanceMetrics);

      // Assess risk level
      const riskLevel = this.assessRiskLevel(performanceMetrics, engagement);

      // Get spiritual growth metrics if requested
      const spiritualGrowth = request.includeSpiritual
        ? await this.calculateSpiritualGrowth(performanceData)
        : {
            scrollAlignment: 0,
            spiritualMaturity: 0,
            kingdomFocus: 0,
            characterDevelopment: 0
          };

      // Build learning profile
      const profile: LearningProfile = {
        studentId: request.studentId,
        strengths: strengths.map(s => s.topic),
        weaknesses: weaknesses.map(w => w.topic),
        learningStyle,
        pace,
        engagement,
        riskLevel,
        lastAnalyzed: new Date(),
        performanceMetrics,
        spiritualGrowth
      };

      // Generate AI-powered recommendations
      const recommendations = await this.generateRecommendations(
        profile,
        strengths,
        weaknesses,
        patterns
      );

      // Build performance analysis
      const analysis: PerformanceAnalysis = {
        studentId: request.studentId,
        courseId: request.courseId,
        timeframe: request.timeframe || this.getDefaultTimeframe(),
        strengths,
        weaknesses,
        patterns,
        recommendations,
        confidence: this.calculateConfidence(performanceData)
      };

      logger.info('Performance analysis completed', {
        studentId: request.studentId,
        riskLevel,
        engagement,
        strengthsCount: strengths.length,
        weaknessesCount: weaknesses.length
      });

      return {
        success: true,
        profile,
        analysis
      };
    } catch (error) {
      logger.error('Error analyzing student performance', { error, request });
      return {
        success: false,
        profile: this.getEmptyProfile(request.studentId),
        analysis: this.getEmptyAnalysis(request.studentId),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Collect student performance data from database
   */
  private async collectPerformanceData(
    studentId: string,
    courseId?: string,
    timeframe?: AnalysisTimeframe
  ): Promise<PerformanceData> {
    const whereClause: any = { userId: studentId };
    
    if (timeframe) {
      whereClause.createdAt = {
        gte: timeframe.startDate,
        lte: timeframe.endDate
      };
    }

    // Get enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: courseId ? { ...whereClause, courseId } : whereClause,
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

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        portalEnrollments: {
          include: {
            portalCourse: true
          }
        },
        aiTutorSessions: true
      }
    });

    return {
      enrollments,
      submissions,
      user: user || {},
      portalEnrollments: user?.portalEnrollments || [],
      aiTutorSessions: user?.aiTutorSessions || []
    };
  }

  /**
   * Calculate performance metrics
   */
  private async calculatePerformanceMetrics(data: PerformanceData): Promise<PerformanceMetrics> {
    const submissions = data.submissions;
    const gradedSubmissions = submissions.filter(s => s.score !== null);

    // Calculate average score
    const averageScore = gradedSubmissions.length > 0
      ? gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubmissions.length
      : 0;

    // Calculate completion rate
    const totalAssignments = submissions.length;
    const completedAssignments = submissions.filter(s => s.status === 'GRADED' || s.status === 'RETURNED').length;
    const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

    // Calculate submission rate
    const assignmentSubmissionRate = totalAssignments > 0 ? (submissions.filter(s => s.status !== 'DRAFT').length / totalAssignments) * 100 : 0;

    // Calculate time on task (from portal enrollments and AI tutor sessions)
    const timeOnTask = this.calculateTimeOnTask(data);

    // Calculate quiz performance
    const quizSubmissions = submissions.filter(s => s.assignment.type === 'QUIZ');
    const quizPerformance = quizSubmissions.length > 0
      ? quizSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / quizSubmissions.length
      : 0;

    // Calculate project quality
    const projectSubmissions = submissions.filter(s => s.assignment.type === 'PROJECT');
    const projectQuality = projectSubmissions.length > 0
      ? projectSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / projectSubmissions.length
      : 0;

    // Calculate participation score (based on AI tutor sessions and engagement)
    const participationScore = this.calculateParticipationScore(data);

    // Determine improvement trend
    const improvementTrend = this.calculateImprovementTrend(submissions);

    return {
      averageScore,
      completionRate,
      timeOnTask,
      assignmentSubmissionRate,
      quizPerformance,
      projectQuality,
      participationScore,
      improvementTrend
    };
  }

  /**
   * Identify student strengths
   */
  private async identifyStrengths(
    data: PerformanceData,
    metrics: PerformanceMetrics
  ): Promise<StrengthArea[]> {
    const strengths: StrengthArea[] = [];

    // Analyze by assignment type
    const assignmentTypes = ['QUIZ', 'ESSAY', 'PROJECT', 'LAB_WORK'];
    
    for (const type of assignmentTypes) {
      const typeSubmissions = data.submissions.filter(s => s.assignment.type === type && s.score !== null);
      
      if (typeSubmissions.length >= 3) {
        const avgScore = typeSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / typeSubmissions.length;
        
        if (avgScore >= 85) {
          strengths.push({
            topic: this.getTopicName(type),
            proficiencyLevel: avgScore,
            evidence: [
              `Completed ${typeSubmissions.length} ${type.toLowerCase()} assignments`,
              `Average score: ${avgScore.toFixed(1)}%`,
              `Consistent high performance`
            ],
            lastDemonstrated: new Date(Math.max(...typeSubmissions.map(s => s.submittedAt.getTime())))
          });
        }
      }
    }

    // Analyze by course
    for (const enrollment of data.enrollments) {
      if (enrollment.submissions.length >= 3) {
        const courseSubmissions = enrollment.submissions.filter((s: any) => s.score !== null);
        const avgScore = courseSubmissions.reduce((sum: number, s: any) => sum + (s.score || 0), 0) / courseSubmissions.length;
        
        if (avgScore >= 85) {
          strengths.push({
            topic: enrollment.course.title,
            proficiencyLevel: avgScore,
            evidence: [
              `Course progress: ${enrollment.progress}%`,
              `Average score: ${avgScore.toFixed(1)}%`,
              `ScrollXP earned: ${enrollment.scrollXPEarned}`
            ],
            lastDemonstrated: new Date()
          });
        }
      }
    }

    return strengths;
  }

  /**
   * Identify student weaknesses
   */
  private async identifyWeaknesses(
    data: PerformanceData,
    metrics: PerformanceMetrics
  ): Promise<WeaknessArea[]> {
    const weaknesses: WeaknessArea[] = [];

    // Analyze by assignment type
    const assignmentTypes = ['QUIZ', 'ESSAY', 'PROJECT', 'LAB_WORK'];
    
    for (const type of assignmentTypes) {
      const typeSubmissions = data.submissions.filter(s => s.assignment.type === type && s.score !== null);
      
      if (typeSubmissions.length >= 2) {
        const avgScore = typeSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / typeSubmissions.length;
        
        if (avgScore < 70) {
          weaknesses.push({
            topic: this.getTopicName(type),
            proficiencyLevel: avgScore,
            strugglingIndicators: [
              `Low average score: ${avgScore.toFixed(1)}%`,
              `${typeSubmissions.filter(s => (s.score || 0) < 70).length} assignments below 70%`,
              'Needs additional support'
            ],
            recommendedActions: [
              `Schedule tutoring for ${type.toLowerCase()} skills`,
              'Review foundational concepts',
              'Practice with additional exercises',
              'Seek peer study group support'
            ],
            priority: avgScore < 60 ? 'high' : avgScore < 70 ? 'medium' : 'low'
          });
        }
      }
    }

    // Check for late submissions
    const lateSubmissions = data.submissions.filter(s => {
      if (!s.assignment.dueDate) return false;
      return s.submittedAt > s.assignment.dueDate;
    });

    if (lateSubmissions.length > data.submissions.length * 0.3) {
      weaknesses.push({
        topic: 'Time Management',
        proficiencyLevel: 50,
        strugglingIndicators: [
          `${lateSubmissions.length} late submissions`,
          `${((lateSubmissions.length / data.submissions.length) * 100).toFixed(1)}% of assignments submitted late`
        ],
        recommendedActions: [
          'Create a study schedule',
          'Set reminders for due dates',
          'Break assignments into smaller tasks',
          'Seek academic coaching'
        ],
        priority: 'high'
      });
    }

    return weaknesses;
  }

  /**
   * Detect learning patterns
   */
  private async detectLearningPatterns(data: PerformanceData): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];

    // Analyze submission timing patterns
    const submissionHours = data.submissions.map(s => s.submittedAt.getHours());
    const eveningSubmissions = submissionHours.filter(h => h >= 18 || h <= 6).length;
    
    if (eveningSubmissions > data.submissions.length * 0.6) {
      patterns.push({
        patternType: 'study_time_preference',
        description: 'Prefers studying and submitting work in the evening/night',
        frequency: eveningSubmissions / data.submissions.length,
        impact: 'neutral',
        actionable: true
      });
    }

    // Analyze procrastination patterns
    const lastMinuteSubmissions = data.submissions.filter(s => {
      if (!s.assignment.dueDate) return false;
      const hoursBefore = (s.assignment.dueDate.getTime() - s.submittedAt.getTime()) / (1000 * 60 * 60);
      return hoursBefore < 24;
    });

    if (lastMinuteSubmissions.length > data.submissions.length * 0.4) {
      patterns.push({
        patternType: 'assignment_procrastination',
        description: 'Tends to submit assignments close to deadline',
        frequency: lastMinuteSubmissions.length / data.submissions.length,
        impact: 'negative',
        actionable: true
      });
    }

    // Analyze quiz performance patterns
    const quizzes = data.submissions.filter(s => s.assignment.type === 'QUIZ' && s.score !== null);
    if (quizzes.length >= 3) {
      const avgQuizScore = quizzes.reduce((sum, s) => sum + (s.score || 0), 0) / quizzes.length;
      const avgOtherScore = data.submissions
        .filter(s => s.assignment.type !== 'QUIZ' && s.score !== null)
        .reduce((sum, s) => sum + (s.score || 0), 0) / 
        data.submissions.filter(s => s.assignment.type !== 'QUIZ' && s.score !== null).length;

      if (avgQuizScore < avgOtherScore - 10) {
        patterns.push({
          patternType: 'quiz_anxiety',
          description: 'Performs significantly better on projects than timed quizzes',
          frequency: 1.0,
          impact: 'negative',
          actionable: true
        });
      }
    }

    // Analyze AI tutor usage
    if (data.aiTutorSessions.length > 0) {
      patterns.push({
        patternType: 'resource_preference',
        description: 'Actively uses AI tutor for learning support',
        frequency: data.aiTutorSessions.length / Math.max(data.enrollments.length, 1),
        impact: 'positive',
        actionable: false
      });
    }

    return patterns;
  }

  /**
   * Determine learning style
   */
  private async determineLearningStyle(
    data: PerformanceData,
    patterns: LearningPattern[]
  ): Promise<LearningStyle> {
    // Use AI to analyze learning style based on patterns and performance
    const aiTutorUsage = data.aiTutorSessions.length;
    const videoEngagement = data.portalEnrollments.reduce((sum, e) => sum + e.progressPercentage, 0);
    
    // Simple heuristic - in production, this would use more sophisticated AI analysis
    if (aiTutorUsage > 10) {
      return 'reading-writing';
    } else if (videoEngagement > 50) {
      return 'visual';
    } else {
      return 'multimodal';
    }
  }

  /**
   * Calculate learning pace
   */
  private calculateLearningPace(metrics: PerformanceMetrics): LearningPace {
    if (metrics.completionRate >= 90 && metrics.averageScore >= 85) {
      return 'fast';
    } else if (metrics.completionRate >= 70 && metrics.averageScore >= 70) {
      return 'moderate';
    } else {
      return 'slow';
    }
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagement(data: PerformanceData, metrics: PerformanceMetrics): number {
    let engagement = 0;

    // Submission rate (30%)
    engagement += (metrics.assignmentSubmissionRate / 100) * 30;

    // Completion rate (30%)
    engagement += (metrics.completionRate / 100) * 30;

    // AI tutor usage (20%)
    const tutorScore = Math.min(data.aiTutorSessions.length / 10, 1) * 20;
    engagement += tutorScore;

    // Time on task (20%)
    const timeScore = Math.min(metrics.timeOnTask / 600, 1) * 20; // 600 minutes = 10 hours per week
    engagement += timeScore;

    return Math.round(engagement);
  }

  /**
   * Assess risk level
   */
  private assessRiskLevel(metrics: PerformanceMetrics, engagement: number): RiskLevel {
    const riskScore = 
      (100 - metrics.averageScore) * 0.3 +
      (100 - metrics.completionRate) * 0.3 +
      (100 - engagement) * 0.2 +
      (100 - metrics.assignmentSubmissionRate) * 0.2;

    if (riskScore >= 60) return 'critical';
    if (riskScore >= 40) return 'high';
    if (riskScore >= 20) return 'medium';
    return 'low';
  }

  /**
   * Calculate spiritual growth metrics
   */
  private async calculateSpiritualGrowth(data: PerformanceData): Promise<SpiritualGrowthMetrics> {
    const user = data.user;
    
    return {
      scrollAlignment: user.scrollAlignment || 0,
      spiritualMaturity: this.calculateSpiritualMaturity(data),
      kingdomFocus: this.calculateKingdomFocus(data),
      characterDevelopment: this.calculateCharacterDevelopment(data)
    };
  }

  /**
   * Generate AI-powered recommendations
   */
  private async generateRecommendations(
    profile: LearningProfile,
    strengths: StrengthArea[],
    weaknesses: WeaknessArea[],
    patterns: LearningPattern[]
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Risk-based recommendations
    if (profile.riskLevel === 'critical' || profile.riskLevel === 'high') {
      recommendations.push('Schedule immediate meeting with academic advisor');
      recommendations.push('Consider reducing course load for better focus');
    }

    // Weakness-based recommendations
    for (const weakness of weaknesses.slice(0, 3)) {
      recommendations.push(...weakness.recommendedActions.slice(0, 2));
    }

    // Pattern-based recommendations
    for (const pattern of patterns) {
      if (pattern.impact === 'negative' && pattern.actionable) {
        if (pattern.patternType === 'assignment_procrastination') {
          recommendations.push('Use time management tools to start assignments earlier');
        } else if (pattern.patternType === 'quiz_anxiety') {
          recommendations.push('Practice timed quizzes to build confidence');
        }
      }
    }

    // Learning style recommendations
    if (profile.learningStyle === 'visual') {
      recommendations.push('Focus on video lectures and visual diagrams');
    } else if (profile.learningStyle === 'reading-writing') {
      recommendations.push('Take detailed notes and create written summaries');
    }

    return recommendations.slice(0, 10); // Limit to top 10
  }

  /**
   * Helper methods
   */
  private calculateTimeOnTask(data: PerformanceData): number {
    // Estimate based on portal enrollments and AI tutor sessions
    const portalTime = data.portalEnrollments.reduce((sum, e) => sum + (e.progressPercentage * 2), 0);
    const tutorTime = data.aiTutorSessions.length * 30; // Assume 30 min per session
    return portalTime + tutorTime;
  }

  private calculateParticipationScore(data: PerformanceData): number {
    const tutorSessions = data.aiTutorSessions.length;
    const enrollments = data.enrollments.length;
    
    if (enrollments === 0) return 0;
    
    return Math.min((tutorSessions / enrollments) * 20, 100);
  }

  private calculateImprovementTrend(submissions: any[]): 'improving' | 'stable' | 'declining' {
    if (submissions.length < 4) return 'stable';

    const sortedSubmissions = submissions
      .filter((s: any) => s.score !== null)
      .sort((a: any, b: any) => a.submittedAt.getTime() - b.submittedAt.getTime());

    const firstHalf = sortedSubmissions.slice(0, Math.floor(sortedSubmissions.length / 2));
    const secondHalf = sortedSubmissions.slice(Math.floor(sortedSubmissions.length / 2));

    const firstAvg = firstHalf.reduce((sum: number, s: any) => sum + (s.score || 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum: number, s: any) => sum + (s.score || 0), 0) / secondHalf.length;

    if (secondAvg > firstAvg + 5) return 'improving';
    if (secondAvg < firstAvg - 5) return 'declining';
    return 'stable';
  }

  private calculateSpiritualMaturity(data: PerformanceData): number {
    // Analyze spiritual formation submissions and engagement
    const spiritualSubmissions = data.submissions.filter(s => 
      s.scrollAlignment !== null && s.scrollAlignment > 0
    );
    
    if (spiritualSubmissions.length === 0) return 50;
    
    return spiritualSubmissions.reduce((sum, s) => sum + (s.scrollAlignment || 0), 0) / spiritualSubmissions.length;
  }

  private calculateKingdomFocus(data: PerformanceData): number {
    const kingdomSubmissions = data.submissions.filter(s => 
      s.kingdomImpact !== null && s.kingdomImpact > 0
    );
    
    if (kingdomSubmissions.length === 0) return 50;
    
    return kingdomSubmissions.reduce((sum, s) => sum + (s.kingdomImpact || 0), 0) / kingdomSubmissions.length;
  }

  private calculateCharacterDevelopment(data: PerformanceData): number {
    // Based on consistency, integrity in submissions, and growth over time
    const onTimeSubmissions = data.submissions.filter(s => {
      if (!s.assignment.dueDate) return true;
      return s.submittedAt <= s.assignment.dueDate;
    });
    
    return (onTimeSubmissions.length / Math.max(data.submissions.length, 1)) * 100;
  }

  private getTopicName(assignmentType: string): string {
    const names: Record<string, string> = {
      'QUIZ': 'Timed Assessments',
      'ESSAY': 'Written Communication',
      'PROJECT': 'Project-Based Learning',
      'LAB_WORK': 'Practical Application',
      'SCROLL_MISSION': 'Mission Work',
      'SCROLL_DEFENSE': 'Scroll Defense'
    };
    return names[assignmentType] || assignmentType;
  }

  private calculateConfidence(data: PerformanceData): number {
    // Confidence based on data availability
    const dataPoints = data.submissions.length + data.enrollments.length + data.aiTutorSessions.length;
    
    if (dataPoints >= 20) return 95;
    if (dataPoints >= 10) return 85;
    if (dataPoints >= 5) return 75;
    return 60;
  }

  private getDefaultTimeframe(): AnalysisTimeframe {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3); // Last 3 months
    
    return {
      startDate,
      endDate,
      period: 'semester'
    };
  }

  private getEmptyProfile(studentId: string): LearningProfile {
    return {
      studentId,
      strengths: [],
      weaknesses: [],
      learningStyle: 'multimodal',
      pace: 'moderate',
      engagement: 0,
      riskLevel: 'low',
      lastAnalyzed: new Date(),
      performanceMetrics: {
        averageScore: 0,
        completionRate: 0,
        timeOnTask: 0,
        assignmentSubmissionRate: 0,
        quizPerformance: 0,
        projectQuality: 0,
        participationScore: 0,
        improvementTrend: 'stable'
      },
      spiritualGrowth: {
        scrollAlignment: 0,
        spiritualMaturity: 0,
        kingdomFocus: 0,
        characterDevelopment: 0
      }
    };
  }

  private getEmptyAnalysis(studentId: string): PerformanceAnalysis {
    return {
      studentId,
      timeframe: this.getDefaultTimeframe(),
      strengths: [],
      weaknesses: [],
      patterns: [],
      recommendations: [],
      confidence: 0
    };
  }
}