/**
 * Analytics Dashboard Service
 * "The wise store up knowledge" - Proverbs 10:14
 * 
 * Comprehensive analytics and reporting system for ScrollUniversity
 * Provides real-time metrics, predictive analytics, and custom dashboards
 */

import { PrismaClient } from '@prisma/client';
import {
  AnalyticsMetric,
  TimeRange,
  RealTimeMetrics,
  StudentAnalytics,
  CourseAnalytics,
  FinancialAnalytics,
  SpiritualFormationAnalytics,
  SystemAnalytics,
  DashboardConfiguration,
  GetMetricsRequest,
  GetMetricsResponse,
} from '../types/analytics.types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export default class AnalyticsDashboardService {
  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      logger.info('Fetching real-time metrics');

      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Get active users (logged in within last 5 minutes)
      const activeUsers = await prisma.user.count({
        where: {
          lastLoginAt: {
            gte: fiveMinutesAgo,
          },
        },
      });

      // Get active sessions
      const activeSessions = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM sessions
        WHERE expires_at > NOW()
      `;

      // Get current enrollments (active courses)
      const currentEnrollments = await prisma.enrollment.count({
        where: {
          status: 'ACTIVE',
        },
      });

      // Get ongoing assessments (submitted in last hour)
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const ongoingAssessments = await prisma.assignmentSubmission.count({
        where: {
          submittedAt: {
            gte: oneHourAgo,
          },
        },
      });

      // System load metrics (mock data - in production, get from monitoring service)
      const systemLoad = {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        database: Math.random() * 100,
      };

      // API metrics (mock data - in production, get from API gateway)
      const apiMetrics = {
        requestsPerMinute: Math.floor(Math.random() * 1000),
        averageResponseTime: Math.random() * 500,
        errorRate: Math.random() * 5,
      };

      return {
        timestamp: now,
        activeUsers,
        activeSessions: Number(activeSessions[0]?.count || 0),
        currentEnrollments,
        ongoingAssessments,
        systemLoad,
        apiMetrics,
      };
    } catch (error) {
      logger.error('Error fetching real-time metrics:', error);
      throw new Error(`Failed to fetch real-time metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get student analytics
   */
  async getStudentAnalytics(studentId: string, timeRange?: TimeRange): Promise<StudentAnalytics> {
    try {
      logger.info('Fetching student analytics', { studentId });

      // Get enrollment metrics
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: studentId },
        include: { course: true },
      });

      const totalCourses = enrollments.length;
      const activeCourses = enrollments.filter(e => e.status === 'ACTIVE').length;
      const completedCourses = enrollments.filter(e => e.status === 'COMPLETED').length;
      const averageProgress = enrollments.length > 0
        ? enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length
        : 0;

      // Get performance metrics
      const submissions = await prisma.assignmentSubmission.findMany({
        where: { studentId },
        include: { assignment: true },
      });

      const gradedSubmissions = submissions.filter(s => s.grade !== null);
      const averageGrade = gradedSubmissions.length > 0
        ? gradedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) / gradedSubmissions.length
        : 0;

      const assignmentsCompleted = submissions.filter(s => s.status === 'GRADED').length;
      const assignmentsOnTime = submissions.filter(s => 
        s.submittedAt && s.assignment.dueDate && s.submittedAt <= s.assignment.dueDate
      ).length;
      const lateSubmissionRate = submissions.length > 0
        ? ((submissions.length - assignmentsOnTime) / submissions.length) * 100
        : 0;

      // Get engagement metrics
      const user = await prisma.user.findUnique({
        where: { id: studentId },
      });

      const loginFrequency = await this.calculateLoginFrequency(studentId, timeRange);
      const averageSessionDuration = await this.calculateAverageSessionDuration(studentId, timeRange);
      
      // Forum participation
      const forumParticipation = await prisma.post.count({
        where: { authorId: studentId },
      });

      // Video watch time
      const videoWatchTime = await prisma.lectureProgress.aggregate({
        where: { userId: studentId },
        _sum: { totalWatchTime: true },
      });

      // Learning patterns
      const learningPatterns = await this.analyzeLearningPatterns(studentId);

      // Predictions
      const predictions = await this.predictStudentOutcomes(studentId);

      return {
        studentId,
        enrollmentMetrics: {
          totalCourses,
          activeCourses,
          completedCourses,
          averageProgress,
        },
        performanceMetrics: {
          overallGPA: averageGrade / 25, // Convert to 4.0 scale
          averageGrade,
          assignmentsCompleted,
          assignmentsOnTime,
          lateSubmissionRate,
        },
        engagementMetrics: {
          loginFrequency,
          averageSessionDuration,
          forumParticipation,
          videoWatchTime: videoWatchTime._sum.totalWatchTime || 0,
          lastActive: user?.lastLoginAt || new Date(),
        },
        learningPatterns,
        predictions,
      };
    } catch (error) {
      logger.error('Error fetching student analytics:', error);
      throw new Error(`Failed to fetch student analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get course analytics
   */
  async getCourseAnalytics(courseId: string, timeRange?: TimeRange): Promise<CourseAnalytics> {
    try {
      logger.info('Fetching course analytics', { courseId });

      // Get enrollment metrics
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId },
      });

      const totalEnrollments = enrollments.length;
      const activeStudents = enrollments.filter(e => e.status === 'ACTIVE').length;
      const completedEnrollments = enrollments.filter(e => e.status === 'COMPLETED').length;
      const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;
      const dropoutRate = 100 - completionRate;

      // Calculate average completion time
      const completedWithDates = enrollments.filter(e => 
        e.status === 'COMPLETED' && e.completedAt && e.enrolledAt
      );
      const averageCompletionTime = completedWithDates.length > 0
        ? completedWithDates.reduce((sum, e) => {
            const days = (e.completedAt!.getTime() - e.enrolledAt.getTime()) / (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / completedWithDates.length
        : 0;

      // Get performance metrics
      const assignments = await prisma.assignment.findMany({
        where: { 
          lecture: {
            module: { courseId },
          },
        },
        include: {
          submissions: true,
        },
      });

      const allSubmissions = assignments.flatMap(a => a.submissions);
      const gradedSubmissions = allSubmissions.filter(s => s.grade !== null);
      const averageGrade = gradedSubmissions.length > 0
        ? gradedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) / gradedSubmissions.length
        : 0;

      const passRate = gradedSubmissions.length > 0
        ? (gradedSubmissions.filter(s => (s.grade || 0) >= 60).length / gradedSubmissions.length) * 100
        : 0;

      // Get engagement metrics
      const lectures = await prisma.lecture.findMany({
        where: {
          module: { courseId },
        },
        include: {
          progress: true,
        },
      });

      const allProgress = lectures.flatMap(l => l.progress);
      const averageVideoWatchTime = allProgress.length > 0
        ? allProgress.reduce((sum, p) => sum + p.totalWatchTime, 0) / allProgress.length
        : 0;

      const videoCompletionRate = allProgress.length > 0
        ? (allProgress.filter(p => p.completed).length / allProgress.length) * 100
        : 0;

      // Forum activity
      const forumActivity = await prisma.post.count({
        where: {
          courseId,
        },
      });

      // Content metrics
      const mostViewedLectures = await this.getMostViewedLectures(courseId, 5);
      const leastEngagingContent = await this.getLeastEngagingContent(courseId, 5);
      const dropOffPoints = await this.getDropOffPoints(courseId);

      // Satisfaction metrics
      const reviews = await prisma.courseReview.findMany({
        where: { courseId },
      });

      const averageRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      const npsScore = await this.calculateNPS(courseId);

      return {
        courseId,
        enrollmentMetrics: {
          totalEnrollments,
          activeStudents,
          completionRate,
          dropoutRate,
          averageCompletionTime,
        },
        performanceMetrics: {
          averageGrade,
          passRate,
          averageAssignmentScore: averageGrade,
          averageQuizScore: averageGrade, // Simplified
        },
        engagementMetrics: {
          averageVideoWatchTime,
          videoCompletionRate,
          forumActivity,
          resourceDownloads: 0, // TODO: Implement
          averageTimeSpent: averageVideoWatchTime,
        },
        contentMetrics: {
          mostViewedLectures,
          leastEngagingContent,
          dropOffPoints,
        },
        satisfactionMetrics: {
          averageRating,
          totalReviews: reviews.length,
          npsScore,
          studentFeedback: reviews.slice(0, 10).map(r => ({
            rating: r.rating,
            comment: r.comment || '',
            date: r.createdAt,
          })),
        },
      };
    } catch (error) {
      logger.error('Error fetching course analytics:', error);
      throw new Error(`Failed to fetch course analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get financial analytics
   */
  async getFinancialAnalytics(timeRange: TimeRange): Promise<FinancialAnalytics> {
    try {
      logger.info('Fetching financial analytics', { timeRange });

      // Get payments within time range
      const payments = await prisma.payment.findMany({
        where: {
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
          status: 'COMPLETED',
        },
      });

      const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

      // Revenue by source
      const revenueBySource: Record<string, number> = {};
      payments.forEach(p => {
        const source = p.paymentMethod || 'unknown';
        revenueBySource[source] = (revenueBySource[source] || 0) + Number(p.amount);
      });

      // Calculate growth
      const previousPeriod = {
        startDate: new Date(timeRange.startDate.getTime() - (timeRange.endDate.getTime() - timeRange.startDate.getTime())),
        endDate: timeRange.startDate,
      };

      const previousPayments = await prisma.payment.findMany({
        where: {
          createdAt: {
            gte: previousPeriod.startDate,
            lte: previousPeriod.endDate,
          },
          status: 'COMPLETED',
        },
      });

      const previousRevenue = previousPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      const averageTransactionValue = payments.length > 0 ? totalRevenue / payments.length : 0;

      // Enrollment revenue
      const enrollmentPayments = payments.filter(p => p.type === 'COURSE_ENROLLMENT');
      const subscriptionPayments = payments.filter(p => p.type === 'SUBSCRIPTION');
      const oneTimePayments = payments.filter(p => p.type === 'ONE_TIME');

      // ScrollCoin metrics
      const scrollCoinTransactions = await prisma.scrollCoinTransaction.findMany({
        where: {
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
      });

      const totalMinted = scrollCoinTransactions
        .filter(t => t.type === 'MINT')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalBurned = scrollCoinTransactions
        .filter(t => t.type === 'BURN')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Scholarship metrics
      const scholarshipDisbursements = await prisma.scholarshipDisbursement.findMany({
        where: {
          actualDate: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
          status: 'COMPLETED',
        },
      });

      const totalDisbursed = scholarshipDisbursements.reduce((sum, d) => sum + Number(d.amount), 0);

      const scholarships = await prisma.scholarship.findMany();
      const totalFunding = scholarships.reduce((sum, s) => sum + Number(s.totalFunding), 0);
      const remainingBudget = scholarships.reduce((sum, s) => sum + Number(s.remainingFunding), 0);
      const utilizationRate = totalFunding > 0 ? ((totalFunding - remainingBudget) / totalFunding) * 100 : 0;

      // Projections (simple linear projection)
      const daysInPeriod = (timeRange.endDate.getTime() - timeRange.startDate.getTime()) / (1000 * 60 * 60 * 24);
      const dailyRevenue = totalRevenue / daysInPeriod;
      const nextMonthRevenue = dailyRevenue * 30;
      const nextQuarterRevenue = dailyRevenue * 90;

      return {
        timeRange,
        revenueMetrics: {
          totalRevenue,
          revenueBySource,
          revenueGrowth,
          averageTransactionValue,
        },
        enrollmentRevenue: {
          courseEnrollments: enrollmentPayments.reduce((sum, p) => sum + Number(p.amount), 0),
          subscriptionRevenue: subscriptionPayments.reduce((sum, p) => sum + Number(p.amount), 0),
          oneTimePayments: oneTimePayments.reduce((sum, p) => sum + Number(p.amount), 0),
        },
        scrollCoinMetrics: {
          totalMinted,
          totalBurned,
          circulatingSupply: totalMinted - totalBurned,
          averageBalance: 0, // TODO: Calculate
          transactionVolume: scrollCoinTransactions.length,
        },
        scholarshipMetrics: {
          totalAwarded: totalDisbursed,
          totalDisbursed,
          remainingBudget,
          utilizationRate,
        },
        projections: {
          nextMonthRevenue,
          nextQuarterRevenue,
          confidence: 0.75,
        },
      };
    } catch (error) {
      logger.error('Error fetching financial analytics:', error);
      throw new Error(`Failed to fetch financial analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get spiritual formation analytics
   */
  async getSpiritualFormationAnalytics(timeRange: TimeRange): Promise<SpiritualFormationAnalytics> {
    try {
      logger.info('Fetching spiritual formation analytics', { timeRange });

      // Devotion metrics
      const devotionCompletions = await prisma.devotionCompletion.findMany({
        where: {
          completedAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
      });

      const totalCompletions = devotionCompletions.length;
      
      // Calculate streaks
      const userStreaks = await this.calculateDevotionStreaks(timeRange);
      const averageStreak = userStreaks.length > 0
        ? userStreaks.reduce((sum, s) => sum + s, 0) / userStreaks.length
        : 0;

      // Prayer metrics
      const prayers = await prisma.prayerEntry.findMany({
        where: {
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
      });

      const totalPrayers = prayers.length;
      const answeredPrayers = prayers.filter(p => p.answered).length;

      // Scripture memory metrics
      const memoryVerses = await prisma.memoryVerse.findMany({
        where: {
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
      });

      const totalVerses = memoryVerses.length;
      const averageMasteryLevel = memoryVerses.length > 0
        ? memoryVerses.reduce((sum, v) => sum + v.masteryLevel, 0) / memoryVerses.length
        : 0;

      // Growth metrics
      const checkIns = await prisma.propheticCheckIn.findMany({
        where: {
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
      });

      const averageGrowthScore = checkIns.length > 0
        ? checkIns.reduce((sum, c) => sum + c.overallScore, 0) / checkIns.length
        : 0;

      return {
        timeRange,
        devotionMetrics: {
          totalCompletions,
          averageStreak,
          completionRate: 0, // TODO: Calculate based on active users
          mostPopularDevotions: [],
        },
        prayerMetrics: {
          totalPrayers,
          answeredPrayers,
          prayerPartners: 0, // TODO: Calculate
          averagePrayersPerUser: 0, // TODO: Calculate
        },
        scriptureMemoryMetrics: {
          totalVerses,
          averageMasteryLevel,
          completionRate: 0, // TODO: Calculate
          mostMemorizedVerses: [],
        },
        growthMetrics: {
          averageGrowthScore,
          usersShowingGrowth: checkIns.filter(c => c.overallScore > 70).length,
          commonGrowthAreas: [],
          areasNeedingSupport: [],
        },
      };
    } catch (error) {
      logger.error('Error fetching spiritual formation analytics:', error);
      throw new Error(`Failed to fetch spiritual formation analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get system analytics
   */
  async getSystemAnalytics(timeRange: TimeRange): Promise<SystemAnalytics> {
    try {
      logger.info('Fetching system analytics', { timeRange });

      // User metrics
      const totalUsers = await prisma.user.count();
      const activeUsers = await prisma.user.count({
        where: {
          lastLoginAt: {
            gte: timeRange.startDate,
          },
        },
      });

      const newUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
      });

      // Content metrics
      const totalCourses = await prisma.course.count();
      const totalLectures = await prisma.lecture.count();
      const totalAssignments = await prisma.assignment.count();

      return {
        timeRange,
        userMetrics: {
          totalUsers,
          activeUsers,
          newUsers,
          userGrowthRate: totalUsers > 0 ? (newUsers / totalUsers) * 100 : 0,
          userRetentionRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
        },
        contentMetrics: {
          totalCourses,
          totalLectures,
          totalAssignments,
          contentGrowthRate: 0, // TODO: Calculate
        },
        performanceMetrics: {
          averageResponseTime: 150, // Mock data
          uptime: 99.9,
          errorRate: 0.1,
          apiCallVolume: 10000,
        },
        storageMetrics: {
          totalStorage: 1000000000, // 1GB
          usedStorage: 500000000, // 500MB
          videoStorage: 400000000,
          documentStorage: 100000000,
        },
      };
    } catch (error) {
      logger.error('Error fetching system analytics:', error);
      throw new Error(`Failed to fetch system analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get multiple metrics
   */
  async getMetrics(request: GetMetricsRequest): Promise<GetMetricsResponse> {
    try {
      const metrics: AnalyticsMetric[] = [];

      for (const metricName of request.metrics) {
        const metric = await this.calculateMetric(metricName, request.timeRange, request.filters);
        if (metric) {
          metrics.push(metric);
        }
      }

      return {
        success: true,
        metrics,
      };
    } catch (error) {
      logger.error('Error getting metrics:', error);
      return {
        success: false,
        metrics: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Calculate a specific metric
   */
  private async calculateMetric(
    name: string,
    timeRange: TimeRange,
    filters?: Record<string, any>
  ): Promise<AnalyticsMetric | null> {
    try {
      let value = 0;
      let previousValue = 0;
      let unit = '';

      switch (name) {
        case 'total_users':
          value = await prisma.user.count();
          unit = 'users';
          break;
        case 'active_users':
          value = await prisma.user.count({
            where: { lastLoginAt: { gte: timeRange.startDate } },
          });
          unit = 'users';
          break;
        case 'total_enrollments':
          value = await prisma.enrollment.count({
            where: { enrolledAt: { gte: timeRange.startDate, lte: timeRange.endDate } },
          });
          unit = 'enrollments';
          break;
        case 'total_revenue':
          const payments = await prisma.payment.findMany({
            where: {
              createdAt: { gte: timeRange.startDate, lte: timeRange.endDate },
              status: 'COMPLETED',
            },
          });
          value = payments.reduce((sum, p) => sum + Number(p.amount), 0);
          unit = 'USD';
          break;
        default:
          return null;
      }

      // Calculate change
      const change = previousValue > 0 ? ((value - previousValue) / previousValue) * 100 : 0;
      const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';

      return {
        name,
        value,
        change,
        trend,
        unit,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error calculating metric:', error);
      return null;
    }
  }

  // Helper methods

  private async calculateLoginFrequency(studentId: string, timeRange?: TimeRange): Promise<number> {
    // Simplified - return mock data
    return 5; // logins per week
  }

  private async calculateAverageSessionDuration(studentId: string, timeRange?: TimeRange): Promise<number> {
    // Simplified - return mock data
    return 45; // minutes
  }

  private async analyzeLearningPatterns(studentId: string): Promise<any> {
    return {
      preferredStudyTime: 'evening',
      averageStudyDuration: 60,
      strongSubjects: ['Computer Science', 'Mathematics'],
      strugglingSubjects: ['History'],
      learningStyle: 'visual',
    };
  }

  private async predictStudentOutcomes(studentId: string): Promise<any> {
    return {
      riskLevel: 'low' as const,
      completionProbability: 85,
      recommendedInterventions: [],
    };
  }

  private async getMostViewedLectures(courseId: string, limit: number): Promise<Array<{ lectureId: string; views: number }>> {
    const result = await prisma.lectureProgress.groupBy({
      by: ['lectureId'],
      where: {
        lecture: {
          module: { courseId },
        },
      },
      _sum: {
        watchCount: true,
      },
      orderBy: {
        _sum: {
          watchCount: 'desc',
        },
      },
      take: limit,
    });

    return result.map(r => ({
      lectureId: r.lectureId,
      views: r._sum.watchCount || 0,
    }));
  }

  private async getLeastEngagingContent(courseId: string, limit: number): Promise<Array<{ contentId: string; engagementScore: number }>> {
    // Simplified - return mock data
    return [];
  }

  private async getDropOffPoints(courseId: string): Promise<Array<{ moduleId: string; dropOffRate: number }>> {
    // Simplified - return mock data
    return [];
  }

  private async calculateNPS(courseId: string): Promise<number> {
    const reviews = await prisma.courseReview.findMany({
      where: { courseId },
    });

    if (reviews.length === 0) return 0;

    const promoters = reviews.filter(r => r.rating >= 9).length;
    const detractors = reviews.filter(r => r.rating <= 6).length;

    return ((promoters - detractors) / reviews.length) * 100;
  }

  private async calculateDevotionStreaks(timeRange: TimeRange): Promise<number[]> {
    // Simplified - return mock data
    return [7, 14, 21, 30];
  }
}
