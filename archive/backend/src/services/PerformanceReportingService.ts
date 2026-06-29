/**
 * Performance Reporting and Continuous Improvement Service
 * Automated performance reports and continuous improvement tracking
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  PerformanceReport,
  AutomatedReportSchedule,
  ImprovementInitiative,
  Retrospective,
  GenerateReportRequest,
} from '../types/post-launch.types';

const prisma = new PrismaClient();

export default class PerformanceReportingService {
  /**
   * Generate performance report
   */
  async generateReport(
    request: GenerateReportRequest,
    userId?: string
  ): Promise<PerformanceReport> {
    try {
      const sections = await this.generateReportSections(request.period);
      const summary = this.generateReportSummary(sections);

      const result = await prisma.$queryRaw<any[]>`
        INSERT INTO performance_reports (
          id, type, period_start, period_end, sections, summary, generated_by, generated_at
        )
        VALUES (
          gen_random_uuid()::text,
          ${request.type},
          ${request.period.start},
          ${request.period.end},
          ${JSON.stringify(sections)}::jsonb,
          ${JSON.stringify(summary)}::jsonb,
          ${userId || null},
          NOW()
        )
        RETURNING *
      `;

      logger.info(`Performance report generated: ${result[0].id}`);

      return {
        id: result[0].id,
        type: result[0].type,
        period: {
          start: result[0].period_start,
          end: result[0].period_end,
        },
        sections: result[0].sections,
        summary: result[0].summary,
        generatedAt: result[0].generated_at,
        generatedBy: result[0].generated_by,
      };
    } catch (error) {
      logger.error('Error generating report:', error);
      throw new Error('Failed to generate report');
    }
  }

  /**
   * Get report by ID
   */
  async getReport(reportId: string): Promise<PerformanceReport | null> {
    try {
      const report = await prisma.$queryRaw<any[]>`
        SELECT * FROM performance_reports WHERE id = ${reportId}
      `;

      if (report.length === 0) {
        return null;
      }

      return {
        id: report[0].id,
        type: report[0].type,
        period: {
          start: report[0].period_start,
          end: report[0].period_end,
        },
        sections: report[0].sections,
        summary: report[0].summary,
        generatedAt: report[0].generated_at,
        generatedBy: report[0].generated_by,
      };
    } catch (error) {
      logger.error('Error fetching report:', error);
      throw new Error('Failed to fetch report');
    }
  }

  /**
   * Get all reports
   */
  async getAllReports(filters?: {
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ reports: PerformanceReport[]; total: number }> {
    try {
      const whereClause = filters?.type ? `WHERE type = '${filters.type}'` : '';
      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;

      const reports = await prisma.$queryRaw<any[]>`
        SELECT * FROM performance_reports
        ${whereClause}
        ORDER BY generated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM performance_reports ${whereClause}
      `;

      return {
        reports: reports.map((r) => ({
          id: r.id,
          type: r.type,
          period: {
            start: r.period_start,
            end: r.period_end,
          },
          sections: r.sections,
          summary: r.summary,
          generatedAt: r.generated_at,
          generatedBy: r.generated_by,
        })),
        total: parseInt(countResult[0].count),
      };
    } catch (error) {
      logger.error('Error fetching reports:', error);
      throw new Error('Failed to fetch reports');
    }
  }

  /**
   * Create automated report schedule
   */
  async createReportSchedule(
    schedule: Omit<AutomatedReportSchedule, 'id' | 'lastRun'>
  ): Promise<AutomatedReportSchedule> {
    try {
      const result = await prisma.$queryRaw<any[]>`
        INSERT INTO automated_report_schedules (
          id, report_type, frequency, recipients, format, active, next_run, created_at, updated_at
        )
        VALUES (
          gen_random_uuid()::text,
          ${schedule.reportType},
          ${schedule.frequency},
          ARRAY[${schedule.recipients.join(',')}]::text[],
          ${schedule.format},
          ${schedule.active},
          ${schedule.nextRun},
          NOW(),
          NOW()
        )
        RETURNING *
      `;

      return {
        id: result[0].id,
        reportType: result[0].report_type,
        frequency: result[0].frequency,
        recipients: result[0].recipients,
        format: result[0].format,
        active: result[0].active,
        lastRun: result[0].last_run,
        nextRun: result[0].next_run,
      };
    } catch (error) {
      logger.error('Error creating report schedule:', error);
      throw new Error('Failed to create report schedule');
    }
  }

  /**
   * Create improvement initiative
   */
  async createInitiative(
    initiative: Omit<ImprovementInitiative, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ImprovementInitiative> {
    try {
      const result = await prisma.$queryRaw<any[]>`
        INSERT INTO improvement_initiatives (
          id, title, description, type, status, owner, team, goals, metrics,
          milestones, budget, start_date, target_date, created_at, updated_at
        )
        VALUES (
          gen_random_uuid()::text,
          ${initiative.title},
          ${initiative.description},
          ${initiative.type},
          ${initiative.status},
          ${initiative.owner},
          ARRAY[${initiative.team.join(',')}]::text[],
          ${JSON.stringify(initiative.goals)}::jsonb,
          ${JSON.stringify(initiative.metrics)}::jsonb,
          ${JSON.stringify(initiative.milestones)}::jsonb,
          ${initiative.budget || null},
          ${initiative.startDate},
          ${initiative.targetDate},
          NOW(),
          NOW()
        )
        RETURNING *
      `;

      logger.info(`Improvement initiative created: ${result[0].id}`);

      return {
        id: result[0].id,
        title: result[0].title,
        description: result[0].description,
        type: result[0].type,
        status: result[0].status,
        owner: result[0].owner,
        team: result[0].team,
        goals: result[0].goals,
        metrics: result[0].metrics,
        milestones: result[0].milestones,
        budget: result[0].budget,
        startDate: result[0].start_date,
        targetDate: result[0].target_date,
        completedDate: result[0].completed_date,
        results: result[0].results,
        createdAt: result[0].created_at,
        updatedAt: result[0].updated_at,
      };
    } catch (error) {
      logger.error('Error creating initiative:', error);
      throw new Error('Failed to create initiative');
    }
  }

  /**
   * Update initiative status
   */
  async updateInitiativeStatus(
    initiativeId: string,
    status: ImprovementInitiative['status'],
    results?: any
  ): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE improvement_initiatives
        SET 
          status = ${status},
          completed_date = ${status === 'completed' ? new Date() : null},
          results = ${results ? JSON.stringify(results) : null}::jsonb,
          updated_at = NOW()
        WHERE id = ${initiativeId}
      `;

      logger.info(`Initiative ${initiativeId} status updated to ${status}`);
    } catch (error) {
      logger.error('Error updating initiative status:', error);
      throw new Error('Failed to update initiative status');
    }
  }

  /**
   * Create retrospective
   */
  async createRetrospective(
    retrospective: Omit<Retrospective, 'id' | 'createdAt'>
  ): Promise<Retrospective> {
    try {
      const result = await prisma.$queryRaw<any[]>`
        INSERT INTO retrospectives (
          id, date, participants, went_well, needs_improvement, action_items, insights, created_at
        )
        VALUES (
          gen_random_uuid()::text,
          ${retrospective.date},
          ARRAY[${retrospective.participants.join(',')}]::text[],
          ARRAY[${retrospective.wentWell.join(',')}]::text[],
          ARRAY[${retrospective.needsImprovement.join(',')}]::text[],
          ${JSON.stringify(retrospective.actionItems)}::jsonb,
          ARRAY[${retrospective.insights.join(',')}]::text[],
          NOW()
        )
        RETURNING *
      `;

      logger.info(`Retrospective created: ${result[0].id}`);

      return {
        id: result[0].id,
        date: result[0].date,
        participants: result[0].participants,
        wentWell: result[0].went_well,
        needsImprovement: result[0].needs_improvement,
        actionItems: result[0].action_items,
        insights: result[0].insights,
        createdAt: result[0].created_at,
      };
    } catch (error) {
      logger.error('Error creating retrospective:', error);
      throw new Error('Failed to create retrospective');
    }
  }

  /**
   * Generate report sections
   */
  private async generateReportSections(period: { start: Date; end: Date }): Promise<any[]> {
    const sections = [];

    // System Performance Section
    sections.push({
      title: 'System Performance',
      metrics: await this.getSystemPerformanceMetrics(period),
      insights: ['System performance is stable', 'Response times within acceptable range'],
      recommendations: ['Continue monitoring', 'Consider scaling if traffic increases'],
    });

    // User Engagement Section
    sections.push({
      title: 'User Engagement',
      metrics: await this.getUserEngagementMetrics(period),
      insights: ['User engagement is growing', 'Active users increased by 15%'],
      recommendations: ['Focus on retention strategies', 'Improve onboarding experience'],
    });

    // Feature Adoption Section
    sections.push({
      title: 'Feature Adoption',
      metrics: await this.getFeatureAdoptionMetrics(period),
      insights: ['New features are being adopted well', 'AI Tutor usage increased'],
      recommendations: ['Promote underutilized features', 'Gather user feedback'],
    });

    return sections;
  }

  /**
   * Generate report summary
   */
  private generateReportSummary(sections: any[]): any {
    return {
      highlights: [
        'System uptime: 99.9%',
        'User satisfaction: 4.5/5',
        'Active users increased by 15%',
      ],
      concerns: ['Response time spikes during peak hours', 'Some features underutilized'],
      actionItems: [
        {
          priority: 'high',
          description: 'Optimize database queries for peak performance',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          priority: 'medium',
          description: 'Create user guides for underutilized features',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      ],
      overallHealth: 'good',
    };
  }

  private async getSystemPerformanceMetrics(period: { start: Date; end: Date }): Promise<any[]> {
    // Simplified metrics - in production, fetch from monitoring system
    return [
      { name: 'Uptime', value: 99.9, unit: '%', change: 0.1, trend: 'up', status: 'good' },
      {
        name: 'Response Time',
        value: 250,
        unit: 'ms',
        change: -5,
        trend: 'down',
        status: 'good',
      },
      { name: 'Error Rate', value: 0.1, unit: '%', change: -0.05, trend: 'down', status: 'good' },
    ];
  }

  private async getUserEngagementMetrics(period: { start: Date; end: Date }): Promise<any[]> {
    return [
      {
        name: 'Active Users',
        value: 1500,
        unit: 'users',
        change: 15,
        trend: 'up',
        status: 'good',
      },
      {
        name: 'Session Duration',
        value: 25,
        unit: 'minutes',
        change: 10,
        trend: 'up',
        status: 'good',
      },
    ];
  }

  private async getFeatureAdoptionMetrics(period: { start: Date; end: Date }): Promise<any[]> {
    return [
      {
        name: 'AI Tutor Usage',
        value: 850,
        unit: 'sessions',
        change: 25,
        trend: 'up',
        status: 'good',
      },
      {
        name: 'Course Completions',
        value: 120,
        unit: 'courses',
        change: 8,
        trend: 'up',
        status: 'good',
      },
    ];
  }
}
