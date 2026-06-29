/**
 * Scholarship Analytics Service
 * "The wise store up knowledge" - Proverbs 10:14
 * 
 * Provides analytics and reporting for scholarship system
 */

import { PrismaClient } from '@prisma/client';
import { ScholarshipAnalytics } from '../types/scholarship.types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export default class ScholarshipAnalyticsService {
  /**
   * Get analytics for a specific scholarship
   */
  async getScholarshipAnalytics(scholarshipId: string): Promise<ScholarshipAnalytics> {
    try {
      logger.info('Generating scholarship analytics', { scholarshipId });

      const [scholarship, applications, disbursements] = await Promise.all([
        prisma.scholarship.findUnique({ where: { id: scholarshipId } }),
        prisma.scholarshipApplication.findMany({ where: { scholarshipId } }),
        prisma.scholarshipDisbursement.findMany({ where: { scholarshipId } })
      ]);

      if (!scholarship) {
        throw new Error('Scholarship not found');
      }

      const totalApplications = applications.length;
      const approvedApplications = applications.filter(a => a.status === 'APPROVED').length;
      const rejectedApplications = applications.filter(a => a.status === 'REJECTED').length;
      const pendingApplications = applications.filter(a => 
        a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW'
      ).length;

      const eligibilityScores = applications
        .filter(a => a.eligibilityScore > 0)
        .map(a => Number(a.eligibilityScore));
      const averageEligibilityScore = eligibilityScores.length > 0
        ? eligibilityScores.reduce((sum, score) => sum + score, 0) / eligibilityScores.length
        : 0;

      const totalDisbursed = disbursements
        .filter(d => d.status === 'COMPLETED')
        .reduce((sum, d) => sum + Number(d.amount), 0);

      const remainingBudget = Number(scholarship.remainingFunding);

      const applicationsByStatus: Record<string, number> = {};
      applications.forEach(app => {
        applicationsByStatus[app.status] = (applicationsByStatus[app.status] || 0) + 1;
      });

      const applicationsByType: Record<string, number> = {
        [scholarship.type]: totalApplications
      };

      // Calculate success rate
      const successRate = totalApplications > 0
        ? (approvedApplications / totalApplications) * 100
        : 0;

      // Calculate average processing time
      const processedApplications = applications.filter(a => a.reviewedAt && a.submittedAt);
      const averageProcessingTime = processedApplications.length > 0
        ? processedApplications.reduce((sum, app) => {
            const processingTime = app.reviewedAt!.getTime() - app.submittedAt!.getTime();
            return sum + processingTime;
          }, 0) / processedApplications.length / (1000 * 60 * 60 * 24) // Convert to days
        : 0;

      // Get top rejection reasons (from review notes)
      const topReasons = this.extractTopReasons(applications);

      // Get demographic breakdown
      const demographicBreakdown = await this.getDemographicBreakdown(applications);

      return {
        scholarshipId,
        totalApplications,
        approvedApplications,
        rejectedApplications,
        pendingApplications,
        averageEligibilityScore,
        totalDisbursed,
        remainingBudget,
        applicationsByType,
        applicationsByStatus,
        demographicBreakdown,
        successRate,
        averageProcessingTime,
        topReasons
      };
    } catch (error) {
      logger.error('Error generating scholarship analytics', { error, scholarshipId });
      throw new Error(`Failed to generate analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get overall system analytics
   */
  async getSystemAnalytics(): Promise<any> {
    try {
      logger.info('Generating system-wide scholarship analytics');

      const [scholarships, applications, disbursements] = await Promise.all([
        prisma.scholarship.findMany(),
        prisma.scholarshipApplication.findMany(),
        prisma.scholarshipDisbursement.findMany()
      ]);

      const totalScholarships = scholarships.length;
      const activeScholarships = scholarships.filter(s => s.status === 'ACTIVE').length;
      const totalApplications = applications.length;
      const totalApproved = applications.filter(a => a.status === 'APPROVED').length;
      const totalDisbursed = disbursements
        .filter(d => d.status === 'COMPLETED')
        .reduce((sum, d) => sum + Number(d.amount), 0);

      const totalFunding = scholarships.reduce((sum, s) => sum + Number(s.totalFunding), 0);
      const remainingFunding = scholarships.reduce((sum, s) => sum + Number(s.remainingFunding), 0);

      const applicationsByMonth = this.groupByMonth(applications);
      const disbursementsByMonth = this.groupDisbursementsByMonth(disbursements);

      return {
        totalScholarships,
        activeScholarships,
        totalApplications,
        totalApproved,
        totalDisbursed,
        totalFunding,
        remainingFunding,
        utilizationRate: totalFunding > 0 ? ((totalFunding - remainingFunding) / totalFunding) * 100 : 0,
        applicationsByMonth,
        disbursementsByMonth
      };
    } catch (error) {
      logger.error('Error generating system analytics', { error });
      throw new Error(`Failed to generate system analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user scholarship statistics
   */
  async getUserStatistics(userId: string): Promise<any> {
    try {
      const [applications, disbursements] = await Promise.all([
        prisma.scholarshipApplication.findMany({
          where: { applicantId: userId },
          include: { scholarship: true }
        }),
        prisma.scholarshipDisbursement.findMany({
          where: { recipientId: userId }
        })
      ]);

      const totalApplications = applications.length;
      const approvedApplications = applications.filter(a => a.status === 'APPROVED').length;
      const pendingApplications = applications.filter(a => 
        a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW'
      ).length;

      const totalAwarded = applications
        .filter(a => a.status === 'APPROVED' && a.awardAmount)
        .reduce((sum, a) => sum + Number(a.awardAmount), 0);

      const totalReceived = disbursements
        .filter(d => d.status === 'COMPLETED')
        .reduce((sum, d) => sum + Number(d.amount), 0);

      const averageEligibilityScore = applications.length > 0
        ? applications.reduce((sum, a) => sum + Number(a.eligibilityScore), 0) / applications.length
        : 0;

      return {
        totalApplications,
        approvedApplications,
        pendingApplications,
        totalAwarded,
        totalReceived,
        averageEligibilityScore,
        successRate: totalApplications > 0 ? (approvedApplications / totalApplications) * 100 : 0
      };
    } catch (error) {
      logger.error('Error generating user statistics', { error, userId });
      throw new Error(`Failed to generate user statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract top reasons from review notes
   */
  private extractTopReasons(applications: any[]): string[] {
    const rejectedApplications = applications.filter(a => 
      a.status === 'REJECTED' && a.reviewNotes
    );

    if (rejectedApplications.length === 0) {
      return [];
    }

    // Simple keyword extraction (can be enhanced with NLP)
    const keywords: Record<string, number> = {};
    rejectedApplications.forEach(app => {
      const notes = app.reviewNotes.toLowerCase();
      const words = notes.split(/\s+/);
      words.forEach(word => {
        if (word.length > 4) { // Only consider words longer than 4 characters
          keywords[word] = (keywords[word] || 0) + 1;
        }
      });
    });

    return Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Get demographic breakdown
   */
  private async getDemographicBreakdown(applications: any[]): Promise<Record<string, any>> {
    try {
      const applicantIds = applications.map(a => a.applicantId);
      const users = await prisma.user.findMany({
        where: { id: { in: applicantIds } }
      });

      const byLocation: Record<string, number> = {};
      const byAcademicLevel: Record<string, number> = {};
      const byAge: Record<string, number> = {};

      users.forEach(user => {
        // Location
        if (user.location) {
          byLocation[user.location] = (byLocation[user.location] || 0) + 1;
        }

        // Academic Level
        byAcademicLevel[user.academicLevel] = (byAcademicLevel[user.academicLevel] || 0) + 1;

        // Age groups
        if (user.dateOfBirth) {
          const age = this.calculateAge(user.dateOfBirth);
          const ageGroup = this.getAgeGroup(age);
          byAge[ageGroup] = (byAge[ageGroup] || 0) + 1;
        }
      });

      return {
        byLocation,
        byAcademicLevel,
        byAge
      };
    } catch (error) {
      logger.error('Error getting demographic breakdown', { error });
      return {};
    }
  }

  /**
   * Group applications by month
   */
  private groupByMonth(applications: any[]): Record<string, number> {
    const byMonth: Record<string, number> = {};

    applications.forEach(app => {
      if (app.submittedAt) {
        const monthKey = `${app.submittedAt.getFullYear()}-${String(app.submittedAt.getMonth() + 1).padStart(2, '0')}`;
        byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
      }
    });

    return byMonth;
  }

  /**
   * Group disbursements by month
   */
  private groupDisbursementsByMonth(disbursements: any[]): Record<string, number> {
    const byMonth: Record<string, number> = {};

    disbursements
      .filter(d => d.status === 'COMPLETED' && d.actualDate)
      .forEach(d => {
        const monthKey = `${d.actualDate.getFullYear()}-${String(d.actualDate.getMonth() + 1).padStart(2, '0')}`;
        byMonth[monthKey] = (byMonth[monthKey] || 0) + Number(d.amount);
      });

    return byMonth;
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Get age group
   */
  private getAgeGroup(age: number): string {
    if (age < 18) return 'Under 18';
    if (age < 25) return '18-24';
    if (age < 35) return '25-34';
    if (age < 45) return '35-44';
    if (age < 55) return '45-54';
    return '55+';
  }

  /**
   * Export analytics report
   */
  async exportAnalyticsReport(scholarshipId: string, format: 'json' | 'csv'): Promise<string> {
    try {
      const analytics = await this.getScholarshipAnalytics(scholarshipId);

      if (format === 'json') {
        return JSON.stringify(analytics, null, 2);
      } else {
        // Convert to CSV format
        const csv = this.convertToCSV(analytics);
        return csv;
      }
    } catch (error) {
      logger.error('Error exporting analytics report', { error, scholarshipId });
      throw new Error(`Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert analytics to CSV format
   */
  private convertToCSV(analytics: ScholarshipAnalytics): string {
    const lines: string[] = [];
    lines.push('Metric,Value');
    lines.push(`Total Applications,${analytics.totalApplications}`);
    lines.push(`Approved Applications,${analytics.approvedApplications}`);
    lines.push(`Rejected Applications,${analytics.rejectedApplications}`);
    lines.push(`Pending Applications,${analytics.pendingApplications}`);
    lines.push(`Average Eligibility Score,${analytics.averageEligibilityScore.toFixed(2)}`);
    lines.push(`Total Disbursed,${analytics.totalDisbursed.toFixed(2)}`);
    lines.push(`Remaining Budget,${analytics.remainingBudget.toFixed(2)}`);
    lines.push(`Success Rate,${analytics.successRate.toFixed(2)}%`);
    lines.push(`Average Processing Time (days),${analytics.averageProcessingTime.toFixed(2)}`);

    return lines.join('\n');
  }
}
