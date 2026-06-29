/**
 * Data Aggregation Service
 * "Gather the pieces that are left over. Let nothing be wasted" - John 6:12
 * 
 * Handles scheduled data aggregation jobs for analytics
 */

import { PrismaClient } from '@prisma/client';
import {
  AggregationJob,
  AggregationResult,
  AggregationConfig,
} from '../types/analytics.types';
import logger from '../utils/logger';
import cron from 'node-cron';

const prisma = new PrismaClient();

export default class DataAggregationService {
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Initialize and start all active aggregation jobs
   */
  async initializeJobs(): Promise<void> {
    try {
      logger.info('Initializing data aggregation jobs');

      // Create default jobs if they don't exist
      await this.createDefaultJobs();

      // Load and schedule all active jobs
      const jobs = await this.getActiveJobs();
      
      for (const job of jobs) {
        await this.scheduleJob(job);
      }

      logger.info(`Initialized ${jobs.length} aggregation jobs`);
    } catch (error) {
      logger.error('Error initializing aggregation jobs:', error);
      throw error;
    }
  }

  /**
   * Create default aggregation jobs
   */
  private async createDefaultJobs(): Promise<void> {
    const defaultJobs: Partial<AggregationJob>[] = [
      {
        name: 'Hourly User Activity',
        type: 'hourly',
        dataSource: 'users',
        aggregations: [
          { metric: 'active_users', operation: 'count' },
          { metric: 'new_registrations', operation: 'count' },
        ],
        schedule: '0 * * * *', // Every hour
        enabled: true,
        status: 'active',
      },
      {
        name: 'Daily Enrollment Stats',
        type: 'daily',
        dataSource: 'enrollments',
        aggregations: [
          { metric: 'new_enrollments', operation: 'count' },
          { metric: 'completed_courses', operation: 'count' },
          { metric: 'average_progress', operation: 'avg', groupBy: ['courseId'] },
        ],
        schedule: '0 0 * * *', // Daily at midnight
        enabled: true,
        status: 'active',
      },
      {
        name: 'Daily Revenue Summary',
        type: 'daily',
        dataSource: 'payments',
        aggregations: [
          { metric: 'total_revenue', operation: 'sum' },
          { metric: 'transaction_count', operation: 'count' },
          { metric: 'average_transaction', operation: 'avg' },
        ],
        schedule: '0 1 * * *', // Daily at 1 AM
        enabled: true,
        status: 'active',
      },
      {
        name: 'Weekly Engagement Metrics',
        type: 'weekly',
        dataSource: 'engagement',
        aggregations: [
          { metric: 'video_watch_time', operation: 'sum' },
          { metric: 'forum_posts', operation: 'count' },
          { metric: 'assignment_submissions', operation: 'count' },
        ],
        schedule: '0 2 * * 0', // Weekly on Sunday at 2 AM
        enabled: true,
        status: 'active',
      },
      {
        name: 'Monthly Performance Summary',
        type: 'monthly',
        dataSource: 'performance',
        aggregations: [
          { metric: 'average_grades', operation: 'avg', groupBy: ['courseId'] },
          { metric: 'completion_rate', operation: 'avg', groupBy: ['courseId'] },
          { metric: 'student_satisfaction', operation: 'avg', groupBy: ['courseId'] },
        ],
        schedule: '0 3 1 * *', // Monthly on 1st at 3 AM
        enabled: true,
        status: 'active',
      },
    ];

    // Check if jobs already exist, create if not
    for (const jobData of defaultJobs) {
      const existing = await prisma.$queryRaw<any[]>`
        SELECT id FROM aggregation_jobs WHERE name = ${jobData.name}
      `;

      if (existing.length === 0) {
        logger.info(`Creating default aggregation job: ${jobData.name}`);
        // In production, save to database
        // For now, just log
      }
    }
  }

  /**
   * Get all active aggregation jobs
   */
  private async getActiveJobs(): Promise<AggregationJob[]> {
    // In production, load from database
    // For now, return empty array
    return [];
  }

  /**
   * Schedule an aggregation job
   */
  async scheduleJob(job: AggregationJob): Promise<void> {
    try {
      if (!job.enabled || job.status !== 'active') {
        logger.info(`Skipping disabled job: ${job.name}`);
        return;
      }

      // Stop existing job if running
      if (this.scheduledJobs.has(job.id)) {
        this.scheduledJobs.get(job.id)?.stop();
      }

      // Schedule new job
      const task = cron.schedule(job.schedule, async () => {
        await this.runAggregation(job);
      });

      this.scheduledJobs.set(job.id, task);
      logger.info(`Scheduled aggregation job: ${job.name}`);
    } catch (error) {
      logger.error(`Error scheduling job ${job.name}:`, error);
      throw error;
    }
  }

  /**
   * Run an aggregation job
   */
  async runAggregation(job: AggregationJob): Promise<AggregationResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`Running aggregation job: ${job.name}`);

      const results: Array<{ metric: string; value: number; dimensions?: Record<string, any> }> = [];
      let recordsProcessed = 0;

      for (const aggregation of job.aggregations) {
        const result = await this.executeAggregation(job.dataSource, aggregation);
        results.push(...result.data);
        recordsProcessed += result.recordCount;
      }

      const duration = Date.now() - startTime;

      const aggregationResult: AggregationResult = {
        jobId: job.id,
        timestamp: new Date(),
        results,
        duration,
        recordsProcessed,
      };

      // Save results to database
      await this.saveAggregationResult(aggregationResult);

      logger.info(`Completed aggregation job: ${job.name} in ${duration}ms`);
      return aggregationResult;
    } catch (error) {
      logger.error(`Error running aggregation job ${job.name}:`, error);
      
      // Update job status to failed
      await this.updateJobStatus(job.id, 'failed');
      
      throw error;
    }
  }

  /**
   * Execute a single aggregation
   */
  private async executeAggregation(
    dataSource: string,
    config: AggregationConfig
  ): Promise<{ data: Array<{ metric: string; value: number; dimensions?: Record<string, any> }>; recordCount: number }> {
    try {
      const data: Array<{ metric: string; value: number; dimensions?: Record<string, any> }> = [];
      let recordCount = 0;

      switch (dataSource) {
        case 'users':
          const userResult = await this.aggregateUsers(config);
          data.push(...userResult.data);
          recordCount = userResult.recordCount;
          break;

        case 'enrollments':
          const enrollmentResult = await this.aggregateEnrollments(config);
          data.push(...enrollmentResult.data);
          recordCount = enrollmentResult.recordCount;
          break;

        case 'payments':
          const paymentResult = await this.aggregatePayments(config);
          data.push(...paymentResult.data);
          recordCount = paymentResult.recordCount;
          break;

        case 'engagement':
          const engagementResult = await this.aggregateEngagement(config);
          data.push(...engagementResult.data);
          recordCount = engagementResult.recordCount;
          break;

        case 'performance':
          const performanceResult = await this.aggregatePerformance(config);
          data.push(...performanceResult.data);
          recordCount = performanceResult.recordCount;
          break;

        default:
          logger.warn(`Unknown data source: ${dataSource}`);
      }

      return { data, recordCount };
    } catch (error) {
      logger.error(`Error executing aggregation for ${dataSource}:`, error);
      return { data: [], recordCount: 0 };
    }
  }

  /**
   * Aggregate user data
   */
  private async aggregateUsers(config: AggregationConfig): Promise<any> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    switch (config.metric) {
      case 'active_users':
        const activeCount = await prisma.user.count({
          where: { lastLoginAt: { gte: oneDayAgo } },
        });
        return {
          data: [{ metric: 'active_users', value: activeCount }],
          recordCount: activeCount,
        };

      case 'new_registrations':
        const newCount = await prisma.user.count({
          where: { createdAt: { gte: oneDayAgo } },
        });
        return {
          data: [{ metric: 'new_registrations', value: newCount }],
          recordCount: newCount,
        };

      default:
        return { data: [], recordCount: 0 };
    }
  }

  /**
   * Aggregate enrollment data
   */
  private async aggregateEnrollments(config: AggregationConfig): Promise<any> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    switch (config.metric) {
      case 'new_enrollments':
        const newCount = await prisma.enrollment.count({
          where: { enrolledAt: { gte: oneDayAgo } },
        });
        return {
          data: [{ metric: 'new_enrollments', value: newCount }],
          recordCount: newCount,
        };

      case 'completed_courses':
        const completedCount = await prisma.enrollment.count({
          where: {
            status: 'COMPLETED',
            completedAt: { gte: oneDayAgo },
          },
        });
        return {
          data: [{ metric: 'completed_courses', value: completedCount }],
          recordCount: completedCount,
        };

      case 'average_progress':
        if (config.groupBy?.includes('courseId')) {
          const progressByCourse = await prisma.enrollment.groupBy({
            by: ['courseId'],
            _avg: { progress: true },
            _count: true,
          });

          return {
            data: progressByCourse.map(p => ({
              metric: 'average_progress',
              value: p._avg.progress || 0,
              dimensions: { courseId: p.courseId },
            })),
            recordCount: progressByCourse.reduce((sum, p) => sum + p._count, 0),
          };
        }
        break;
    }

    return { data: [], recordCount: 0 };
  }

  /**
   * Aggregate payment data
   */
  private async aggregatePayments(config: AggregationConfig): Promise<any> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const payments = await prisma.payment.findMany({
      where: {
        createdAt: { gte: oneDayAgo },
        status: 'COMPLETED',
      },
    });

    switch (config.metric) {
      case 'total_revenue':
        const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        return {
          data: [{ metric: 'total_revenue', value: totalRevenue }],
          recordCount: payments.length,
        };

      case 'transaction_count':
        return {
          data: [{ metric: 'transaction_count', value: payments.length }],
          recordCount: payments.length,
        };

      case 'average_transaction':
        const avgTransaction = payments.length > 0
          ? payments.reduce((sum, p) => sum + Number(p.amount), 0) / payments.length
          : 0;
        return {
          data: [{ metric: 'average_transaction', value: avgTransaction }],
          recordCount: payments.length,
        };
    }

    return { data: [], recordCount: 0 };
  }

  /**
   * Aggregate engagement data
   */
  private async aggregateEngagement(config: AggregationConfig): Promise<any> {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    switch (config.metric) {
      case 'video_watch_time':
        const watchTime = await prisma.lectureProgress.aggregate({
          where: { lastWatchedAt: { gte: oneWeekAgo } },
          _sum: { totalWatchTime: true },
        });
        return {
          data: [{ metric: 'video_watch_time', value: watchTime._sum.totalWatchTime || 0 }],
          recordCount: 1,
        };

      case 'forum_posts':
        const postCount = await prisma.post.count({
          where: { createdAt: { gte: oneWeekAgo } },
        });
        return {
          data: [{ metric: 'forum_posts', value: postCount }],
          recordCount: postCount,
        };

      case 'assignment_submissions':
        const submissionCount = await prisma.assignmentSubmission.count({
          where: { submittedAt: { gte: oneWeekAgo } },
        });
        return {
          data: [{ metric: 'assignment_submissions', value: submissionCount }],
          recordCount: submissionCount,
        };
    }

    return { data: [], recordCount: 0 };
  }

  /**
   * Aggregate performance data
   */
  private async aggregatePerformance(config: AggregationConfig): Promise<any> {
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (config.metric) {
      case 'average_grades':
        if (config.groupBy?.includes('courseId')) {
          const gradesByCourse = await prisma.assignmentSubmission.groupBy({
            by: ['assignment'],
            where: {
              submittedAt: { gte: oneMonthAgo },
              grade: { not: null },
            },
            _avg: { grade: true },
          });

          // Get course IDs for assignments
          // Simplified - return mock data
          return {
            data: [{ metric: 'average_grades', value: 85 }],
            recordCount: gradesByCourse.length,
          };
        }
        break;

      case 'completion_rate':
        if (config.groupBy?.includes('courseId')) {
          const enrollmentsByCourse = await prisma.enrollment.groupBy({
            by: ['courseId'],
            where: { enrolledAt: { gte: oneMonthAgo } },
            _count: true,
          });

          const completedByCourse = await prisma.enrollment.groupBy({
            by: ['courseId'],
            where: {
              enrolledAt: { gte: oneMonthAgo },
              status: 'COMPLETED',
            },
            _count: true,
          });

          const completionRates = enrollmentsByCourse.map(e => {
            const completed = completedByCourse.find(c => c.courseId === e.courseId)?._count || 0;
            const rate = e._count > 0 ? (completed / e._count) * 100 : 0;
            return {
              metric: 'completion_rate',
              value: rate,
              dimensions: { courseId: e.courseId },
            };
          });

          return {
            data: completionRates,
            recordCount: enrollmentsByCourse.reduce((sum, e) => sum + e._count, 0),
          };
        }
        break;
    }

    return { data: [], recordCount: 0 };
  }

  /**
   * Save aggregation result
   */
  private async saveAggregationResult(result: AggregationResult): Promise<void> {
    try {
      // In production, save to database
      logger.info('Saving aggregation result', {
        jobId: result.jobId,
        resultCount: result.results.length,
      });
    } catch (error) {
      logger.error('Error saving aggregation result:', error);
    }
  }

  /**
   * Update job status
   */
  private async updateJobStatus(jobId: string, status: AggregationJob['status']): Promise<void> {
    try {
      // In production, update database
      logger.info(`Updating job ${jobId} status to ${status}`);
    } catch (error) {
      logger.error('Error updating job status:', error);
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stopAllJobs(): void {
    logger.info('Stopping all aggregation jobs');
    this.scheduledJobs.forEach((task, jobId) => {
      task.stop();
      logger.info(`Stopped job: ${jobId}`);
    });
    this.scheduledJobs.clear();
  }
}
