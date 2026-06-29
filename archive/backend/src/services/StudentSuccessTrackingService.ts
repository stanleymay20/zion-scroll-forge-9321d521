// Student Success Tracking Service
// "For I know the plans I have for you, declares the LORD" - Jeremiah 29:11

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import {
  StudentSuccessMetrics,
  SuccessTrackingConfig
} from '../types/enrollment.types';

const prisma = new PrismaClient();

export class StudentSuccessTrackingService {
  private readonly defaultConfig: SuccessTrackingConfig = {
    trackingStartDate: new Date(),
    metricsToTrack: [
      'loginFrequency',
      'courseProgress',
      'assignmentCompletion',
      'spiritualGrowth',
      'communityEngagement'
    ],
    alertThresholds: {
      lowEngagement: 2, // logins per week
      failingGrades: 60, // percentage
      inactivityDays: 7,
      atRiskScore: 70
    },
    interventionTriggers: [
      {
        condition: 'loginFrequency < 2',
        action: 'send_engagement_reminder'
      },
      {
        condition: 'averageGrade < 60',
        action: 'assign_tutor'
      },
      {
        condition: 'inactivityDays > 7',
        action: 'advisor_outreach'
      }
    ]
  };

  /**
   * Get comprehensive success metrics for a student
   */
  async getSuccessMetrics(userId: string): Promise<StudentSuccessMetrics> {
    try {
      logger.info('Getting student success metrics', { userId });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          enrollments: {
            include: {
              course: true,
              submissions: true
            }
          },
          scrollCoinTransactions: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Calculate enrollment date (first enrollment or user creation)
      const enrollmentDate = user.enrollments.length > 0
        ? user.enrollments[0].startedAt
        : user.createdAt;

      // Engagement Metrics
      const loginFrequency = await this.calculateLoginFrequency(userId);
      const lastLoginDate = user.lastLoginAt || user.createdAt;
      const totalTimeSpent = await this.calculateTotalTimeSpent(userId);

      // Academic Progress
      const coursesEnrolled = user.enrollments.length;
      const coursesCompleted = user.enrollments.filter(e => e.completedAt).length;
      const coursesInProgress = user.enrollments.filter(
        e => !e.completedAt && e.status === 'ACTIVE'
      ).length;
      const averageProgress = this.calculateAverageProgress(user.enrollments);
      const averageGrade = await this.calculateAverageGrade(user.enrollments);

      // Learning Metrics
      const assignmentsSubmitted = user.enrollments.reduce(
        (sum, e) => sum + e.submissions.length,
        0
      );
      const assignmentsCompleted = user.enrollments.reduce(
        (sum, e) => sum + e.submissions.filter(s => s.status === 'GRADED').length,
        0
      );
      const quizzesCompleted = await this.countQuizzesCompleted(userId);
      const averageQuizScore = await this.calculateAverageQuizScore(userId);

      // Spiritual Growth
      const devotionsCompleted = await this.countDevotionsCompleted(userId);
      const prayerJournalEntries = await this.countPrayerEntries(userId);
      const scriptureMemoryProgress = await this.getScriptureMemoryProgress(userId);
      const propheticCheckIns = await this.countPropheticCheckIns(userId);
      const spiritualGrowthScore = this.calculateSpiritualGrowthScore({
        devotionsCompleted,
        prayerJournalEntries,
        scriptureMemoryProgress,
        propheticCheckIns
      });

      // Community Engagement
      const forumPosts = await this.countForumPosts(userId);
      const studyGroupParticipation = await this.countStudyGroupParticipation(userId);
      const peerInteractions = await this.countPeerInteractions(userId);

      // ScrollCoin Economy
      const scrollCoinsEarned = user.scrollCoinTransactions
        .filter(t => t.type === 'EARNED')
        .reduce((sum, t) => sum + t.amount, 0);
      const scrollCoinsSpent = user.scrollCoinTransactions
        .filter(t => t.type === 'SPENT')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const scrollCoinBalance = user.scrollCoinBalance;

      // Risk Assessment
      const atRiskScore = this.calculateAtRiskScore({
        loginFrequency,
        averageGrade,
        averageProgress,
        lastLoginDate,
        assignmentsCompleted,
        assignmentsSubmitted
      });
      const riskFactors = this.identifyRiskFactors({
        loginFrequency,
        averageGrade,
        averageProgress,
        lastLoginDate,
        atRiskScore
      });
      const interventionsNeeded = this.determineInterventions(riskFactors);

      // Success Indicators
      const successScore = this.calculateSuccessScore({
        averageGrade,
        averageProgress,
        loginFrequency,
        spiritualGrowthScore,
        coursesCompleted
      });
      const strengths = this.identifyStrengths({
        averageGrade,
        spiritualGrowthScore,
        communityEngagement: forumPosts + studyGroupParticipation,
        coursesCompleted
      });
      const achievements = await this.getAchievements(userId);

      const metrics: StudentSuccessMetrics = {
        userId,
        enrollmentDate,
        
        loginFrequency,
        lastLoginDate,
        totalTimeSpent,
        
        coursesEnrolled,
        coursesCompleted,
        coursesInProgress,
        averageProgress,
        averageGrade,
        
        assignmentsSubmitted,
        assignmentsCompleted,
        quizzesCompleted,
        averageQuizScore,
        
        devotionsCompleted,
        prayerJournalEntries,
        scriptureMemoryProgress,
        propheticCheckIns,
        spiritualGrowthScore,
        
        forumPosts,
        studyGroupParticipation,
        peerInteractions,
        
        scrollCoinsEarned,
        scrollCoinsSpent,
        scrollCoinBalance,
        
        atRiskScore,
        riskFactors,
        interventionsNeeded,
        
        successScore,
        strengths,
        achievements
      };

      logger.info('Student success metrics calculated', { userId, successScore, atRiskScore });
      return metrics;
    } catch (error) {
      logger.error('Error getting success metrics', { error, userId });
      throw error;
    }
  }

  /**
   * Calculate login frequency (logins per week)
   */
  private async calculateLoginFrequency(userId: string): Promise<number> {
    // Get analytics data for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const loginEvents = await prisma.portalAnalytics.count({
      where: {
        userId,
        eventType: 'login',
        timestamp: {
          gte: thirtyDaysAgo
        }
      }
    });

    // Calculate weekly average
    return (loginEvents / 30) * 7;
  }

  /**
   * Calculate total time spent on platform
   */
  private async calculateTotalTimeSpent(userId: string): Promise<number> {
    // Estimate based on session analytics
    const sessions = await prisma.portalAnalytics.findMany({
      where: {
        userId,
        eventType: 'session'
      }
    });

    // Rough estimate: 30 minutes per session
    return sessions.length * 0.5;
  }

  /**
   * Calculate average progress across all enrollments
   */
  private calculateAverageProgress(enrollments: any[]): number {
    if (enrollments.length === 0) return 0;
    
    const totalProgress = enrollments.reduce((sum, e) => sum + e.progress, 0);
    return Math.round(totalProgress / enrollments.length);
  }

  /**
   * Calculate average grade
   */
  private async calculateAverageGrade(enrollments: any[]): Promise<number> {
    const allSubmissions = enrollments.flatMap(e => e.submissions);
    const gradedSubmissions = allSubmissions.filter(s => s.score !== null);

    if (gradedSubmissions.length === 0) return 0;

    const totalScore = gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0);
    return Math.round(totalScore / gradedSubmissions.length);
  }

  /**
   * Count completed quizzes
   */
  private async countQuizzesCompleted(userId: string): Promise<number> {
    return prisma.submission.count({
      where: {
        enrollment: {
          userId
        },
        assignment: {
          type: 'QUIZ'
        },
        status: 'GRADED'
      }
    });
  }

  /**
   * Calculate average quiz score
   */
  private async calculateAverageQuizScore(userId: string): Promise<number> {
    const quizSubmissions = await prisma.submission.findMany({
      where: {
        enrollment: {
          userId
        },
        assignment: {
          type: 'QUIZ'
        },
        status: 'GRADED',
        score: {
          not: null
        }
      }
    });

    if (quizSubmissions.length === 0) return 0;

    const totalScore = quizSubmissions.reduce((sum, s) => sum + (s.score || 0), 0);
    return Math.round(totalScore / quizSubmissions.length);
  }

  /**
   * Count devotions completed
   */
  private async countDevotionsCompleted(userId: string): Promise<number> {
    // TODO: Integrate with devotion service
    return 0;
  }

  /**
   * Count prayer journal entries
   */
  private async countPrayerEntries(userId: string): Promise<number> {
    // TODO: Integrate with prayer journal service
    return 0;
  }

  /**
   * Get scripture memory progress
   */
  private async getScriptureMemoryProgress(userId: string): Promise<number> {
    // TODO: Integrate with scripture memory service
    return 0;
  }

  /**
   * Count prophetic check-ins
   */
  private async countPropheticCheckIns(userId: string): Promise<number> {
    // TODO: Integrate with prophetic check-in service
    return 0;
  }

  /**
   * Calculate spiritual growth score
   */
  private calculateSpiritualGrowthScore(data: {
    devotionsCompleted: number;
    prayerJournalEntries: number;
    scriptureMemoryProgress: number;
    propheticCheckIns: number;
  }): number {
    const weights = {
      devotions: 0.3,
      prayer: 0.3,
      scripture: 0.2,
      prophetic: 0.2
    };

    const score =
      (Math.min(data.devotionsCompleted / 30, 1) * weights.devotions +
        Math.min(data.prayerJournalEntries / 20, 1) * weights.prayer +
        (data.scriptureMemoryProgress / 100) * weights.scripture +
        Math.min(data.propheticCheckIns / 10, 1) * weights.prophetic) *
      100;

    return Math.round(score);
  }

  /**
   * Count forum posts
   */
  private async countForumPosts(userId: string): Promise<number> {
    // TODO: Integrate with community service
    return 0;
  }

  /**
   * Count study group participation
   */
  private async countStudyGroupParticipation(userId: string): Promise<number> {
    // TODO: Integrate with study group service
    return 0;
  }

  /**
   * Count peer interactions
   */
  private async countPeerInteractions(userId: string): Promise<number> {
    // TODO: Integrate with chat/community services
    return 0;
  }

  /**
   * Calculate at-risk score (0-100, higher = more at risk)
   */
  private calculateAtRiskScore(data: {
    loginFrequency: number;
    averageGrade: number;
    averageProgress: number;
    lastLoginDate: Date;
    assignmentsCompleted: number;
    assignmentsSubmitted: number;
  }): number {
    let riskScore = 0;

    // Low login frequency
    if (data.loginFrequency < 2) {
      riskScore += 25;
    } else if (data.loginFrequency < 4) {
      riskScore += 10;
    }

    // Low grades
    if (data.averageGrade < 60) {
      riskScore += 30;
    } else if (data.averageGrade < 70) {
      riskScore += 15;
    }

    // Low progress
    if (data.averageProgress < 30) {
      riskScore += 20;
    } else if (data.averageProgress < 50) {
      riskScore += 10;
    }

    // Inactivity
    const daysSinceLogin = Math.floor(
      (Date.now() - data.lastLoginDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLogin > 14) {
      riskScore += 25;
    } else if (daysSinceLogin > 7) {
      riskScore += 15;
    }

    // Low assignment completion
    if (data.assignmentsSubmitted > 0) {
      const completionRate = data.assignmentsCompleted / data.assignmentsSubmitted;
      if (completionRate < 0.5) {
        riskScore += 10;
      }
    }

    return Math.min(riskScore, 100);
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(data: {
    loginFrequency: number;
    averageGrade: number;
    averageProgress: number;
    lastLoginDate: Date;
    atRiskScore: number;
  }): string[] {
    const factors: string[] = [];

    if (data.loginFrequency < 2) {
      factors.push('Low engagement - infrequent logins');
    }

    if (data.averageGrade < 60) {
      factors.push('Failing grades');
    } else if (data.averageGrade < 70) {
      factors.push('Below average grades');
    }

    if (data.averageProgress < 30) {
      factors.push('Very low course progress');
    }

    const daysSinceLogin = Math.floor(
      (Date.now() - data.lastLoginDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLogin > 7) {
      factors.push(`Inactive for ${daysSinceLogin} days`);
    }

    return factors;
  }

  /**
   * Determine needed interventions
   */
  private determineInterventions(riskFactors: string[]): string[] {
    const interventions: string[] = [];

    if (riskFactors.some(f => f.includes('infrequent logins') || f.includes('Inactive'))) {
      interventions.push('Advisor outreach');
      interventions.push('Engagement reminder emails');
    }

    if (riskFactors.some(f => f.includes('grades'))) {
      interventions.push('Assign AI tutor');
      interventions.push('Academic support resources');
    }

    if (riskFactors.some(f => f.includes('progress'))) {
      interventions.push('Study skills workshop');
      interventions.push('Time management coaching');
    }

    return interventions;
  }

  /**
   * Calculate success score (0-100)
   */
  private calculateSuccessScore(data: {
    averageGrade: number;
    averageProgress: number;
    loginFrequency: number;
    spiritualGrowthScore: number;
    coursesCompleted: number;
  }): number {
    const weights = {
      grades: 0.3,
      progress: 0.2,
      engagement: 0.2,
      spiritual: 0.2,
      completion: 0.1
    };

    const score =
      (data.averageGrade / 100) * weights.grades +
      (data.averageProgress / 100) * weights.progress +
      Math.min(data.loginFrequency / 7, 1) * weights.engagement +
      (data.spiritualGrowthScore / 100) * weights.spiritual +
      Math.min(data.coursesCompleted / 5, 1) * weights.completion;

    return Math.round(score * 100);
  }

  /**
   * Identify student strengths
   */
  private identifyStrengths(data: {
    averageGrade: number;
    spiritualGrowthScore: number;
    communityEngagement: number;
    coursesCompleted: number;
  }): string[] {
    const strengths: string[] = [];

    if (data.averageGrade >= 90) {
      strengths.push('Excellent academic performance');
    } else if (data.averageGrade >= 80) {
      strengths.push('Strong academic performance');
    }

    if (data.spiritualGrowthScore >= 80) {
      strengths.push('Exceptional spiritual growth');
    } else if (data.spiritualGrowthScore >= 60) {
      strengths.push('Good spiritual formation');
    }

    if (data.communityEngagement >= 20) {
      strengths.push('Highly engaged in community');
    } else if (data.communityEngagement >= 10) {
      strengths.push('Active community participant');
    }

    if (data.coursesCompleted >= 5) {
      strengths.push('Consistent course completion');
    }

    return strengths;
  }

  /**
   * Get student achievements
   */
  private async getAchievements(userId: string): Promise<string[]> {
    const achievements: string[] = [];

    // Check for ScrollBadges
    const badges = await prisma.scrollBadge.count({
      where: { studentId: userId }
    });

    if (badges > 0) {
      achievements.push(`Earned ${badges} ScrollBadge${badges > 1 ? 's' : ''}`);
    }

    // Check for course completions
    const completedCourses = await prisma.enrollment.count({
      where: {
        userId,
        completedAt: { not: null }
      }
    });

    if (completedCourses >= 10) {
      achievements.push('Completed 10+ courses');
    } else if (completedCourses >= 5) {
      achievements.push('Completed 5+ courses');
    }

    return achievements;
  }

  /**
   * Track success metrics over time
   */
  async trackMetricsOverTime(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    try {
      // TODO: Implement time-series tracking
      logger.info('Tracking metrics over time', { userId, startDate, endDate });
      return [];
    } catch (error) {
      logger.error('Error tracking metrics over time', { error, userId });
      throw error;
    }
  }
}

export default new StudentSuccessTrackingService();
