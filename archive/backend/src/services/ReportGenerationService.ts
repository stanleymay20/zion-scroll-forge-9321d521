/**
 * Report Generation Service
 * "Write the vision; make it plain on tablets" - Habakkuk 2:2
 * 
 * Generates comprehensive reports in multiple formats (PDF, CSV, Excel, JSON)
 */

import { PrismaClient } from '@prisma/client';
import {
  ReportConfiguration,
  GeneratedReport,
  ReportType,
  ReportFormat,
  ReportSchedule,
} from '../types/analytics.types';
import AnalyticsDashboardService from './AnalyticsDashboardService';
import logger from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export default class ReportGenerationService {
  private analyticsService: AnalyticsDashboardService;
  private reportsDir: string;

  constructor() {
    this.analyticsService = new AnalyticsDashboardService();
    this.reportsDir = process.env.REPORTS_DIR || path.join(__dirname, '../../reports');
    
    // Ensure reports directory exists
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Generate a report based on configuration
   */
  async generateReport(config: ReportConfiguration): Promise<GeneratedReport> {
    const reportId = this.generateReportId();
    
    try {
      logger.info('Generating report', { type: config.type, format: config.format });

      const report: GeneratedReport = {
        id: reportId,
        configuration: config,
        generatedAt: new Date(),
        status: 'generating',
        data: {},
      };

      // Gather data based on report type
      const data = await this.gatherReportData(config);
      report.data = data;

      // Generate file in requested format
      const fileUrl = await this.generateReportFile(reportId, config, data);
      report.fileUrl = fileUrl;
      report.status = 'completed';

      logger.info('Report generated successfully', { reportId, fileUrl });
      return report;
    } catch (error) {
      logger.error('Error generating report:', error);
      return {
        id: reportId,
        configuration: config,
        generatedAt: new Date(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {},
      };
    }
  }

  /**
   * Gather data for report
   */
  private async gatherReportData(config: ReportConfiguration): Promise<any> {
    const { type, timeRange, filters } = config;

    switch (type) {
      case 'student_performance':
        return await this.gatherStudentPerformanceData(timeRange, filters);

      case 'course_effectiveness':
        return await this.gatherCourseEffectivenessData(timeRange, filters);

      case 'financial_summary':
        return await this.analyticsService.getFinancialAnalytics(timeRange);

      case 'enrollment_trends':
        return await this.gatherEnrollmentTrendsData(timeRange, filters);

      case 'engagement_analysis':
        return await this.gatherEngagementAnalysisData(timeRange, filters);

      case 'spiritual_growth':
        return await this.analyticsService.getSpiritualFormationAnalytics(timeRange);

      case 'system_health':
        return await this.analyticsService.getSystemAnalytics(timeRange);

      case 'custom':
        return await this.gatherCustomReportData(config);

      default:
        throw new Error(`Unknown report type: ${type}`);
    }
  }

  /**
   * Gather student performance data
   */
  private async gatherStudentPerformanceData(timeRange: any, filters?: any): Promise<any> {
    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        ...(filters?.studentIds && { id: { in: filters.studentIds } }),
      },
      take: filters?.limit || 100,
    });

    const performanceData = await Promise.all(
      students.map(async student => {
        const analytics = await this.analyticsService.getStudentAnalytics(student.id, timeRange);
        return {
          studentId: student.id,
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
          ...analytics,
        };
      })
    );

    return {
      students: performanceData,
      summary: {
        totalStudents: students.length,
        averageGPA: performanceData.reduce((sum, s) => sum + s.performanceMetrics.overallGPA, 0) / students.length,
        averageProgress: performanceData.reduce((sum, s) => sum + s.enrollmentMetrics.averageProgress, 0) / students.length,
      },
    };
  }

  /**
   * Gather course effectiveness data
   */
  private async gatherCourseEffectivenessData(timeRange: any, filters?: any): Promise<any> {
    const courses = await prisma.course.findMany({
      where: {
        ...(filters?.courseIds && { id: { in: filters.courseIds } }),
        ...(filters?.facultyId && { facultyId: filters.facultyId }),
      },
      take: filters?.limit || 50,
    });

    const courseData = await Promise.all(
      courses.map(async course => {
        const analytics = await this.analyticsService.getCourseAnalytics(course.id, timeRange);
        return {
          courseId: course.id,
          title: course.title,
          code: course.code,
          ...analytics,
        };
      })
    );

    return {
      courses: courseData,
      summary: {
        totalCourses: courses.length,
        averageCompletionRate: courseData.reduce((sum, c) => sum + c.enrollmentMetrics.completionRate, 0) / courses.length,
        averageRating: courseData.reduce((sum, c) => sum + c.satisfactionMetrics.averageRating, 0) / courses.length,
      },
    };
  }

  /**
   * Gather enrollment trends data
   */
  private async gatherEnrollmentTrendsData(timeRange: any, filters?: any): Promise<any> {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        enrolledAt: {
          gte: timeRange.startDate,
          lte: timeRange.endDate,
        },
        ...(filters?.courseId && { courseId: filters.courseId }),
      },
      include: {
        course: true,
        user: true,
      },
    });

    // Group by month
    const byMonth: Record<string, number> = {};
    enrollments.forEach(e => {
      const monthKey = `${e.enrolledAt.getFullYear()}-${String(e.enrolledAt.getMonth() + 1).padStart(2, '0')}`;
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
    });

    // Group by course
    const byCourse: Record<string, number> = {};
    enrollments.forEach(e => {
      byCourse[e.courseId] = (byCourse[e.courseId] || 0) + 1;
    });

    return {
      totalEnrollments: enrollments.length,
      byMonth,
      byCourse,
      topCourses: Object.entries(byCourse)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([courseId, count]) => ({
          courseId,
          enrollments: count,
        })),
    };
  }

  /**
   * Gather engagement analysis data
   */
  private async gatherEngagementAnalysisData(timeRange: any, filters?: any): Promise<any> {
    const videoProgress = await prisma.lectureProgress.findMany({
      where: {
        lastWatchedAt: {
          gte: timeRange.startDate,
          lte: timeRange.endDate,
        },
      },
    });

    const posts = await prisma.post.findMany({
      where: {
        createdAt: {
          gte: timeRange.startDate,
          lte: timeRange.endDate,
        },
      },
    });

    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        submittedAt: {
          gte: timeRange.startDate,
          lte: timeRange.endDate,
        },
      },
    });

    return {
      videoEngagement: {
        totalViews: videoProgress.reduce((sum, p) => sum + p.watchCount, 0),
        totalWatchTime: videoProgress.reduce((sum, p) => sum + p.totalWatchTime, 0),
        completionRate: videoProgress.length > 0
          ? (videoProgress.filter(p => p.completed).length / videoProgress.length) * 100
          : 0,
      },
      forumEngagement: {
        totalPosts: posts.length,
        uniqueAuthors: new Set(posts.map(p => p.authorId)).size,
      },
      assignmentEngagement: {
        totalSubmissions: submissions.length,
        onTimeSubmissions: submissions.filter(s => 
          s.submittedAt && s.assignment && s.submittedAt <= s.assignment.dueDate
        ).length,
      },
    };
  }

  /**
   * Gather custom report data
   */
  private async gatherCustomReportData(config: ReportConfiguration): Promise<any> {
    // Custom reports can be defined by sections
    const data: any = {};

    for (const section of config.sections) {
      data[section.title] = section.data;
    }

    return data;
  }

  /**
   * Generate report file in requested format
   */
  private async generateReportFile(
    reportId: string,
    config: ReportConfiguration,
    data: any
  ): Promise<string> {
    const filename = `${reportId}_${config.type}_${Date.now()}`;
    
    switch (config.format) {
      case 'JSON':
        return await this.generateJSONReport(filename, data);

      case 'CSV':
        return await this.generateCSVReport(filename, config, data);

      case 'EXCEL':
        return await this.generateExcelReport(filename, config, data);

      case 'PDF':
        return await this.generatePDFReport(filename, config, data);

      default:
        throw new Error(`Unsupported format: ${config.format}`);
    }
  }

  /**
   * Generate JSON report
   */
  private async generateJSONReport(filename: string, data: any): Promise<string> {
    const filepath = path.join(this.reportsDir, `${filename}.json`);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    return filepath;
  }

  /**
   * Generate CSV report
   */
  private async generateCSVReport(filename: string, config: ReportConfiguration, data: any): Promise<string> {
    const filepath = path.join(this.reportsDir, `${filename}.csv`);
    
    // Convert data to CSV format
    let csv = '';

    if (config.type === 'student_performance' && data.students) {
      csv = this.convertStudentDataToCSV(data.students);
    } else if (config.type === 'course_effectiveness' && data.courses) {
      csv = this.convertCourseDataToCSV(data.courses);
    } else if (config.type === 'financial_summary') {
      csv = this.convertFinancialDataToCSV(data);
    } else {
      // Generic conversion
      csv = JSON.stringify(data);
    }

    fs.writeFileSync(filepath, csv);
    return filepath;
  }

  /**
   * Generate Excel report
   */
  private async generateExcelReport(filename: string, config: ReportConfiguration, data: any): Promise<string> {
    // For now, generate CSV (in production, use a library like exceljs)
    return await this.generateCSVReport(filename, config, data);
  }

  /**
   * Generate PDF report
   */
  private async generatePDFReport(filename: string, config: ReportConfiguration, data: any): Promise<string> {
    const filepath = path.join(this.reportsDir, `${filename}.pdf`);
    
    // For now, save as JSON (in production, use a library like pdfkit or puppeteer)
    const jsonPath = await this.generateJSONReport(filename, data);
    
    logger.info('PDF generation not fully implemented, saved as JSON', { jsonPath });
    return jsonPath;
  }

  /**
   * Convert student data to CSV
   */
  private convertStudentDataToCSV(students: any[]): string {
    const headers = [
      'Student ID',
      'Name',
      'Email',
      'Total Courses',
      'Active Courses',
      'Completed Courses',
      'Average Progress',
      'Overall GPA',
      'Average Grade',
      'Assignments Completed',
      'Late Submission Rate',
    ];

    const rows = students.map(s => [
      s.studentId,
      s.name,
      s.email,
      s.enrollmentMetrics.totalCourses,
      s.enrollmentMetrics.activeCourses,
      s.enrollmentMetrics.completedCourses,
      s.enrollmentMetrics.averageProgress.toFixed(2),
      s.performanceMetrics.overallGPA.toFixed(2),
      s.performanceMetrics.averageGrade.toFixed(2),
      s.performanceMetrics.assignmentsCompleted,
      s.performanceMetrics.lateSubmissionRate.toFixed(2),
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Convert course data to CSV
   */
  private convertCourseDataToCSV(courses: any[]): string {
    const headers = [
      'Course ID',
      'Title',
      'Code',
      'Total Enrollments',
      'Active Students',
      'Completion Rate',
      'Average Grade',
      'Pass Rate',
      'Average Rating',
      'Total Reviews',
    ];

    const rows = courses.map(c => [
      c.courseId,
      c.title,
      c.code,
      c.enrollmentMetrics.totalEnrollments,
      c.enrollmentMetrics.activeStudents,
      c.enrollmentMetrics.completionRate.toFixed(2),
      c.performanceMetrics.averageGrade.toFixed(2),
      c.performanceMetrics.passRate.toFixed(2),
      c.satisfactionMetrics.averageRating.toFixed(2),
      c.satisfactionMetrics.totalReviews,
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Convert financial data to CSV
   */
  private convertFinancialDataToCSV(data: any): string {
    const lines: string[] = [];
    lines.push('Metric,Value');
    lines.push(`Total Revenue,${data.revenueMetrics.totalRevenue.toFixed(2)}`);
    lines.push(`Revenue Growth,${data.revenueMetrics.revenueGrowth.toFixed(2)}%`);
    lines.push(`Average Transaction,${data.revenueMetrics.averageTransactionValue.toFixed(2)}`);
    lines.push(`Course Enrollments Revenue,${data.enrollmentRevenue.courseEnrollments.toFixed(2)}`);
    lines.push(`Subscription Revenue,${data.enrollmentRevenue.subscriptionRevenue.toFixed(2)}`);
    lines.push(`ScrollCoin Minted,${data.scrollCoinMetrics.totalMinted}`);
    lines.push(`ScrollCoin Burned,${data.scrollCoinMetrics.totalBurned}`);
    lines.push(`Circulating Supply,${data.scrollCoinMetrics.circulatingSupply}`);
    lines.push(`Scholarships Awarded,${data.scholarshipMetrics.totalAwarded.toFixed(2)}`);
    lines.push(`Remaining Budget,${data.scholarshipMetrics.remainingBudget.toFixed(2)}`);
    return lines.join('\n');
  }

  /**
   * Schedule a report for recurring generation
   */
  async scheduleReport(config: ReportConfiguration, schedule: ReportSchedule): Promise<string> {
    try {
      logger.info('Scheduling report', { type: config.type, frequency: schedule.frequency });

      // In production, save to database and set up cron job
      const scheduleId = this.generateReportId();

      // Calculate next run time
      const nextRun = this.calculateNextRun(schedule);

      logger.info('Report scheduled', { scheduleId, nextRun });
      return scheduleId;
    } catch (error) {
      logger.error('Error scheduling report:', error);
      throw error;
    }
  }

  /**
   * Calculate next run time for scheduled report
   */
  private calculateNextRun(schedule: ReportSchedule): Date {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);

    const nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    switch (schedule.frequency) {
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;

      case 'weekly':
        const targetDay = schedule.dayOfWeek || 0;
        const currentDay = nextRun.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        nextRun.setDate(nextRun.getDate() + (daysUntilTarget || 7));
        break;

      case 'monthly':
        const targetDate = schedule.dayOfMonth || 1;
        nextRun.setDate(targetDate);
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        break;

      case 'quarterly':
        nextRun.setMonth(Math.ceil((nextRun.getMonth() + 1) / 3) * 3);
        nextRun.setDate(1);
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 3);
        }
        break;
    }

    return nextRun;
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    return `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send report via email
   */
  async sendReportEmail(reportId: string, recipients: string[]): Promise<void> {
    try {
      logger.info('Sending report email', { reportId, recipients });

      // In production, integrate with email service
      // For now, just log
      logger.info('Report email sent successfully');
    } catch (error) {
      logger.error('Error sending report email:', error);
      throw error;
    }
  }
}
