/**
 * ScrollUniversity Admissions Analytics Service
 * "By wisdom a house is built, and through understanding it is established" - Proverbs 24:3
 * 
 * Provides comprehensive analytics and performance tracking for the admissions system
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

interface ApplicationVolumeMetrics {
  totalApplications: number;
  applicationsByMonth: Array<{
    month: string;
    count: number;
    growthRate: number;
  }>;
  applicationsByProgram: Array<{
    program: string;
    count: number;
    percentage: number;
  }>;
  peakApplicationPeriods: Array<{
    period: string;
    volume: number;
  }>;
}

interface ConversionRateMetrics {
  overallConversionRate: number;
  conversionByStage: Array<{
    stage: string;
    conversionRate: number;
    dropoffRate: number;
  }>;
  conversionByProgram: Array<{
    program: string;
    conversionRate: number;
  }>;
  conversionTrends: Array<{
    period: string;
    rate: number;
    change: number;
  }>;
}

interface DemographicAnalysis {
  ageDistribution: Array<{
    ageRange: string;
    count: number;
    percentage: number;
  }>;
  geographicDistribution: Array<{
    region: string;
    count: number;
    percentage: number;
  }>;
  spiritualMaturityDistribution: Array<{
    level: string;
    count: number;
    percentage: number;
  }>;
  academicBackgroundDistribution: Array<{
    background: string;
    count: number;
    percentage: number;
  }>;
  diversityMetrics: {
    totalCountries: number;
    totalLanguages: number;
    culturalDiversityIndex: number;
  };
}

interface FunnelAnalysis {
  stages: Array<{
    stageName: string;
    applicantCount: number;
    conversionRate: number;
    averageTimeInStage: number;
    dropoffReasons: Array<{
      reason: string;
      count: number;
    }>;
  }>;
  bottlenecks: Array<{
    stage: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    impact: string;
    recommendations: string[];
  }>;
  processEfficiency: {
    averageProcessingTime: number;
    fastestProcessingTime: number;
    slowestProcessingTime: number;
    efficiencyScore: number;
  };
}

interface PerformanceMetrics {
  applicationVolume: ApplicationVolumeMetrics;
  conversionRates: ConversionRateMetrics;
  demographics: DemographicAnalysis;
  funnelAnalysis: FunnelAnalysis;
  qualityMetrics: {
    averageApplicationQuality: number;
    spiritualAlignmentScore: number;
    academicReadinessScore: number;
    characterAssessmentScore: number;
  };
  timeMetrics: {
    averageDecisionTime: number;
    averageInterviewSchedulingTime: number;
    averageResponseTime: number;
  };
}

export class AdmissionsAnalyticsService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Generate comprehensive application volume and trend analysis
   */
  async generateApplicationVolumeAnalysis(
    startDate?: Date,
    endDate?: Date
  ): Promise<ApplicationVolumeMetrics> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);

      // Get total applications
      const totalApplications = await this.prisma.applications.count({
        where: dateFilter
      });

      // Get applications by month with growth rate
      const applicationsByMonth = await this.getApplicationsByMonth(dateFilter);

      // Get applications by program
      const applicationsByProgram = await this.getApplicationsByProgram(dateFilter);

      // Identify peak application periods
      const peakApplicationPeriods = await this.getPeakApplicationPeriods(dateFilter);

      logger.info('Application volume analysis generated', {
        totalApplications,
        monthlyDataPoints: applicationsByMonth.length,
        programTypes: applicationsByProgram.length
      });

      return {
        totalApplications,
        applicationsByMonth,
        applicationsByProgram,
        peakApplicationPeriods
      };
    } catch (error) {
      logger.error('Failed to generate application volume analysis', { error });
      throw new Error('Application volume analysis generation failed');
    }
  }

  /**
   * Track and analyze conversion rates across the admissions funnel
   */
  async generateConversionRateAnalysis(
    startDate?: Date,
    endDate?: Date
  ): Promise<ConversionRateMetrics> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);

      // Calculate overall conversion rate
      const totalApplications = await this.prisma.applications.count({
        where: dateFilter
      });

      const acceptedApplications = await this.prisma.applications.count({
        where: {
          ...dateFilter,
          admissionDecision: 'ACCEPTED'
        }
      });

      const overallConversionRate = totalApplications > 0
        ? (acceptedApplications / totalApplications) * 100
        : 0;

      // Get conversion by stage
      const conversionByStage = await this.getConversionByStage(dateFilter);

      // Get conversion by program
      const conversionByProgram = await this.getConversionByProgram(dateFilter);

      // Get conversion trends over time
      const conversionTrends = await this.getConversionTrends(dateFilter);

      logger.info('Conversion rate analysis generated', {
        overallConversionRate,
        totalApplications,
        acceptedApplications
      });

      return {
        overallConversionRate,
        conversionByStage,
        conversionByProgram,
        conversionTrends
      };
    } catch (error) {
      logger.error('Failed to generate conversion rate analysis', { error });
      throw new Error('Conversion rate analysis generation failed');
    }
  }

  /**
   * Generate comprehensive demographic analysis and diversity reporting
   */
  async generateDemographicAnalysis(
    startDate?: Date,
    endDate?: Date
  ): Promise<DemographicAnalysis> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);

      // Get age distribution
      const ageDistribution = await this.getAgeDistribution(dateFilter);

      // Get geographic distribution
      const geographicDistribution = await this.getGeographicDistribution(dateFilter);

      // Get spiritual maturity distribution
      const spiritualMaturityDistribution = await this.getSpiritualMaturityDistribution(dateFilter);

      // Get academic background distribution
      const academicBackgroundDistribution = await this.getAcademicBackgroundDistribution(dateFilter);

      // Calculate diversity metrics
      const diversityMetrics = await this.calculateDiversityMetrics(dateFilter);

      logger.info('Demographic analysis generated', {
        ageGroups: ageDistribution.length,
        regions: geographicDistribution.length,
        diversityIndex: diversityMetrics.culturalDiversityIndex
      });

      return {
        ageDistribution,
        geographicDistribution,
        spiritualMaturityDistribution,
        academicBackgroundDistribution,
        diversityMetrics
      };
    } catch (error) {
      logger.error('Failed to generate demographic analysis', { error });
      throw new Error('Demographic analysis generation failed');
    }
  }

  /**
   * Analyze admissions funnel and identify bottlenecks
   */
  async generateFunnelAnalysis(
    startDate?: Date,
    endDate?: Date
  ): Promise<FunnelAnalysis> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);

      // Analyze each stage of the funnel
      const stages = await this.analyzeFunnelStages(dateFilter);

      // Identify bottlenecks
      const bottlenecks = await this.identifyBottlenecks(stages);

      // Calculate process efficiency metrics
      const processEfficiency = await this.calculateProcessEfficiency(dateFilter);

      logger.info('Funnel analysis generated', {
        stageCount: stages.length,
        bottleneckCount: bottlenecks.length,
        efficiencyScore: processEfficiency.efficiencyScore
      });

      return {
        stages,
        bottlenecks,
        processEfficiency
      };
    } catch (error) {
      logger.error('Failed to generate funnel analysis', { error });
      throw new Error('Funnel analysis generation failed');
    }
  }

  /**
   * Generate comprehensive performance metrics dashboard
   */
  async generatePerformanceMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<PerformanceMetrics> {
    try {
      const [
        applicationVolume,
        conversionRates,
        demographics,
        funnelAnalysis,
        qualityMetrics,
        timeMetrics
      ] = await Promise.all([
        this.generateApplicationVolumeAnalysis(startDate, endDate),
        this.generateConversionRateAnalysis(startDate, endDate),
        this.generateDemographicAnalysis(startDate, endDate),
        this.generateFunnelAnalysis(startDate, endDate),
        this.calculateQualityMetrics(startDate, endDate),
        this.calculateTimeMetrics(startDate, endDate)
      ]);

      logger.info('Comprehensive performance metrics generated');

      return {
        applicationVolume,
        conversionRates,
        demographics,
        funnelAnalysis,
        qualityMetrics,
        timeMetrics
      };
    } catch (error) {
      logger.error('Failed to generate performance metrics', { error });
      throw new Error('Performance metrics generation failed');
    }
  }

  /**
   * Store analytics report in database for historical tracking
   */
  async storeAnalyticsReport(
    reportType: 'DAILY_SUMMARY' | 'WEEKLY_REPORT' | 'MONTHLY_ANALYSIS' | 'QUARTERLY_REVIEW' | 'ANNUAL_REPORT' | 'CUSTOM_REPORT',
    reportData: any
  ): Promise<string> {
    try {
      const analytics = await this.prisma.admissions_analytics.create({
        data: {
          reportType,
          totalApplications: reportData.applicationVolume?.totalApplications || 0,
          acceptanceRate: reportData.conversionRates?.overallConversionRate || 0,
          yieldRate: this.calculateYieldRate(reportData),
          demographicBreakdown: reportData.demographics || {},
          geographicDistribution: reportData.demographics?.geographicDistribution || {},
          averageScores: this.extractAverageScores(reportData),
          assessmentTrends: this.extractAssessmentTrends(reportData),
          processEfficiency: reportData.funnelAnalysis?.processEfficiency || {},
          bottleneckAnalysis: reportData.funnelAnalysis?.bottlenecks || {},
          reportData
        }
      });

      logger.info('Analytics report stored', {
        reportId: analytics.id,
        reportType
      });

      return analytics.id;
    } catch (error) {
      logger.error('Failed to store analytics report', { error });
      throw new Error('Analytics report storage failed');
    }
  }

  // Private helper methods

  private buildDateFilter(startDate?: Date, endDate?: Date) {
    const filter: any = {};
    if (startDate || endDate) {
      filter.submissionDate = {};
      if (startDate) filter.submissionDate.gte = startDate;
      if (endDate) filter.submissionDate.lte = endDate;
    }
    return filter;
  }

  private async getApplicationsByMonth(dateFilter: any) {
    const applications = await this.prisma.applications.findMany({
      where: dateFilter,
      select: {
        submissionDate: true
      },
      orderBy: {
        submissionDate: 'asc'
      }
    });

    const monthlyData = new Map<string, number>();
    applications.forEach(app => {
      const month = app.submissionDate.toISOString().substring(0, 7);
      monthlyData.set(month, (monthlyData.get(month) || 0) + 1);
    });

    const result = Array.from(monthlyData.entries()).map(([month, count], index, array) => {
      const previousCount = index > 0 ? array[index - 1][1] : count;
      const growthRate = previousCount > 0 ? ((count - previousCount) / previousCount) * 100 : 0;

      return {
        month,
        count,
        growthRate
      };
    });

    return result;
  }

  private async getApplicationsByProgram(dateFilter: any) {
    const programCounts = await this.prisma.applications.groupBy({
      by: ['programApplied'],
      where: dateFilter,
      _count: {
        id: true
      }
    });

    const total = programCounts.reduce((sum, item) => sum + item._count.id, 0);

    return programCounts.map(item => ({
      program: item.programApplied,
      count: item._count.id,
      percentage: total > 0 ? (item._count.id / total) * 100 : 0
    }));
  }

  private async getPeakApplicationPeriods(dateFilter: any) {
    const applications = await this.prisma.applications.findMany({
      where: dateFilter,
      select: {
        submissionDate: true
      }
    });

    // Group by week
    const weeklyData = new Map<string, number>();
    applications.forEach(app => {
      const week = this.getWeekKey(app.submissionDate);
      weeklyData.set(week, (weeklyData.get(week) || 0) + 1);
    });

    // Find top 3 peak periods
    const sortedWeeks = Array.from(weeklyData.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    return sortedWeeks.map(([period, volume]) => ({
      period,
      volume
    }));
  }

  private async getConversionByStage(dateFilter: any) {
    const stages = [
      'SUBMITTED',
      'UNDER_REVIEW',
      'ASSESSMENT_PENDING',
      'INTERVIEW_SCHEDULED',
      'DECISION_PENDING',
      'ACCEPTED'
    ];

    const result = [];
    for (let i = 0; i < stages.length - 1; i++) {
      const currentStage = stages[i];
      const nextStage = stages[i + 1];

      const currentCount = await this.prisma.applications.count({
        where: {
          ...dateFilter,
          status: currentStage as any
        }
      });

      const nextCount = await this.prisma.applications.count({
        where: {
          ...dateFilter,
          status: nextStage as any
        }
      });

      const conversionRate = currentCount > 0 ? (nextCount / currentCount) * 100 : 0;
      const dropoffRate = 100 - conversionRate;

      result.push({
        stage: `${currentStage} to ${nextStage}`,
        conversionRate,
        dropoffRate
      });
    }

    return result;
  }

  private async getConversionByProgram(dateFilter: any) {
    const programs = await this.prisma.applications.groupBy({
      by: ['programApplied'],
      where: dateFilter,
      _count: {
        id: true
      }
    });

    const result = [];
    for (const program of programs) {
      const acceptedCount = await this.prisma.applications.count({
        where: {
          ...dateFilter,
          programApplied: program.programApplied,
          admissionDecision: 'ACCEPTED'
        }
      });

      const conversionRate = program._count.id > 0
        ? (acceptedCount / program._count.id) * 100
        : 0;

      result.push({
        program: program.programApplied,
        conversionRate
      });
    }

    return result;
  }

  private async getConversionTrends(dateFilter: any) {
    const applications = await this.prisma.applications.findMany({
      where: dateFilter,
      select: {
        submissionDate: true,
        status: true,
        admissionDecision: true
      }
    });

    // Group by month and calculate conversion rates
    const monthlyData = new Map<string, { submitted: number; accepted: number }>();

    applications.forEach(app => {
      const month = app.submissionDate.toISOString().substring(0, 7);
      const data = monthlyData.get(month) || { submitted: 0, accepted: 0 };

      data.submitted++;
      if (app.admissionDecision === 'ACCEPTED') {
        data.accepted++;
      }

      monthlyData.set(month, data);
    });

    const trends = Array.from(monthlyData.entries()).map(([period, data], index, array) => {
      const rate = data.submitted > 0 ? (data.accepted / data.submitted) * 100 : 0;
      const previousRate = index > 0 ?
        (array[index - 1][1].accepted / array[index - 1][1].submitted) * 100 : rate;
      const change = rate - previousRate;

      return {
        period,
        rate,
        change
      };
    });

    return trends;
  }

  private async getAgeDistribution(dateFilter: any) {
    const applications = await this.prisma.applications.findMany({
      where: dateFilter,
      select: {
        applicationData: true
      }
    });

    const ageRanges = new Map<string, number>();
    const ageRangeLabels = ['18-22', '23-27', '28-32', '33-37', '38-42', '43+'];

    applications.forEach(app => {
      const age = app.applicationData?.age || 0;
      let range = '43+';

      if (age >= 18 && age <= 22) range = '18-22';
      else if (age >= 23 && age <= 27) range = '23-27';
      else if (age >= 28 && age <= 32) range = '28-32';
      else if (age >= 33 && age <= 37) range = '33-37';
      else if (age >= 38 && age <= 42) range = '38-42';

      ageRanges.set(range, (ageRanges.get(range) || 0) + 1);
    });

    const total = applications.length;
    return ageRangeLabels.map(range => ({
      ageRange: range,
      count: ageRanges.get(range) || 0,
      percentage: total > 0 ? ((ageRanges.get(range) || 0) / total) * 100 : 0
    }));
  }

  private async getGeographicDistribution(dateFilter: any) {
    const geographicData = await this.prisma.applications.groupBy({
      by: ['applicantCountry'],
      where: dateFilter,
      _count: {
        id: true
      }
    });

    const total = geographicData.reduce((sum, item) => sum + item._count.id, 0);

    return geographicData.map(item => ({
      region: item.applicantCountry || 'Unknown',
      count: item._count.id,
      percentage: total > 0 ? (item._count.id / total) * 100 : 0
    })).sort((a, b) => b.count - a.count);
  }

  private async getSpiritualMaturityDistribution(dateFilter: any) {
    const maturityCounts = await this.prisma.spiritual_evaluations.groupBy({
      by: ['spiritualMaturity'],
      where: {
        application: dateFilter
      },
      _count: {
        id: true
      }
    });

    const total = maturityCounts.reduce((sum, item) => sum + item._count.id, 0);

    return maturityCounts.map(item => ({
      level: item.spiritualMaturity,
      count: item._count.id,
      percentage: total > 0 ? (item._count.id / total) * 100 : 0
    }));
  }

  private async getAcademicBackgroundDistribution(dateFilter: any) {
    const applications = await this.prisma.applications.findMany({
      where: dateFilter,
      select: {
        applicationData: true
      }
    });

    const backgroundCounts = new Map<string, number>();

    applications.forEach(app => {
      const background = app.applicationData?.academicBackground || 'Unknown';
      backgroundCounts.set(background, (backgroundCounts.get(background) || 0) + 1);
    });

    const total = applications.length;
    return Array.from(backgroundCounts.entries()).map(([background, count]) => ({
      background,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    })).sort((a, b) => b.count - a.count);
  }

  private async calculateDiversityMetrics(dateFilter: any) {
    const applications = await this.prisma.applications.findMany({
      where: dateFilter,
      select: {
        applicantCountry: true,
        applicationData: true
      }
    });

    const countries = new Set<string>();
    const languages = new Set<string>();

    applications.forEach(app => {
      if (app.applicantCountry) {
        countries.add(app.applicantCountry);
      }

      const primaryLanguage = app.applicationData?.primaryLanguage;
      if (primaryLanguage) {
        languages.add(primaryLanguage);
      }
    });

    // Calculate cultural diversity index using Shannon diversity
    const countryCounts = new Map<string, number>();
    applications.forEach(app => {
      const country = app.applicantCountry || 'Unknown';
      countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
    });

    const total = applications.length;
    const proportions = Array.from(countryCounts.values()).map(count => count / total);
    const shannonIndex = -proportions.reduce((sum, p) => sum + (p > 0 ? p * Math.log(p) : 0), 0);
    const maxDiversity = Math.log(countries.size);
    const culturalDiversityIndex = maxDiversity > 0 ? (shannonIndex / maxDiversity) * 100 : 0;

    return {
      totalCountries: countries.size,
      totalLanguages: languages.size,
      culturalDiversityIndex: Math.round(culturalDiversityIndex * 100) / 100
    };
  }

  private async analyzeFunnelStages(dateFilter: any) {
    const stages = [
      'SUBMITTED',
      'UNDER_REVIEW',
      'ASSESSMENT_PENDING',
      'INTERVIEW_SCHEDULED',
      'DECISION_PENDING',
      'ACCEPTED'
    ];

    const stageAnalysis = [];

    for (const stage of stages) {
      const applicantCount = await this.prisma.applications.count({
        where: {
          ...dateFilter,
          status: stage as any
        }
      });

      // Calculate average time in stage
      const applications = await this.prisma.applications.findMany({
        where: {
          ...dateFilter,
          status: stage as any
        },
        select: {
          submissionDate: true,
          updatedAt: true
        }
      });

      const averageTimeInStage = applications.length > 0
        ? applications.reduce((sum, app) => {
          const timeInStage = app.updatedAt.getTime() - app.submissionDate.getTime();
          return sum + (timeInStage / (1000 * 60 * 60 * 24)); // Convert to days
        }, 0) / applications.length
        : 0;

      // Get dropoff reasons (simplified)
      const dropoffReasons = [
        { reason: 'Incomplete application', count: Math.floor(applicantCount * 0.3) },
        { reason: 'Did not meet requirements', count: Math.floor(applicantCount * 0.4) },
        { reason: 'Withdrew application', count: Math.floor(applicantCount * 0.2) },
        { reason: 'Other', count: Math.floor(applicantCount * 0.1) }
      ];

      // Calculate conversion rate to next stage
      const nextStageIndex = stages.indexOf(stage) + 1;
      let conversionRate = 0;

      if (nextStageIndex < stages.length) {
        const nextStageCount = await this.prisma.applications.count({
          where: {
            ...dateFilter,
            status: stages[nextStageIndex] as any
          }
        });
        conversionRate = applicantCount > 0 ? (nextStageCount / applicantCount) * 100 : 0;
      }

      stageAnalysis.push({
        stageName: stage,
        applicantCount,
        conversionRate,
        averageTimeInStage: Math.round(averageTimeInStage * 100) / 100,
        dropoffReasons
      });
    }

    return stageAnalysis;
  }

  private async identifyBottlenecks(stages: any[]) {
    const bottlenecks = [];

    for (const stage of stages) {
      let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      const recommendations: string[] = [];

      // Check for time bottlenecks
      if (stage.averageTimeInStage > 14) {
        severity = 'HIGH';
        recommendations.push('Reduce processing time in this stage');
        recommendations.push('Add more resources to handle applications');
      } else if (stage.averageTimeInStage > 7) {
        severity = 'MEDIUM';
        recommendations.push('Monitor processing time closely');
      }

      // Check for conversion bottlenecks
      if (stage.conversionRate < 50) {
        severity = severity === 'HIGH' ? 'CRITICAL' : 'HIGH';
        recommendations.push('Investigate low conversion rate');
        recommendations.push('Review stage requirements and criteria');
      } else if (stage.conversionRate < 70) {
        severity = severity === 'LOW' ? 'MEDIUM' : severity;
        recommendations.push('Consider process improvements');
      }

      // Check for volume bottlenecks
      if (stage.applicantCount > 1000) {
        severity = severity === 'LOW' ? 'MEDIUM' : severity;
        recommendations.push('Consider scaling resources for high volume');
      }

      if (severity !== 'LOW' || recommendations.length > 0) {
        bottlenecks.push({
          stage: stage.stageName,
          severity,
          impact: `Stage processing time: ${stage.averageTimeInStage} days, Conversion rate: ${stage.conversionRate}%`,
          recommendations: recommendations.length > 0 ? recommendations : ['Monitor stage performance']
        });
      }
    }

    return bottlenecks;
  }

  private async calculateProcessEfficiency(dateFilter: any) {
    const completedApplications = await this.prisma.applications.findMany({
      where: {
        ...dateFilter,
        status: { in: ['ACCEPTED', 'REJECTED'] }
      },
      select: {
        submissionDate: true,
        updatedAt: true
      }
    });

    if (completedApplications.length === 0) {
      return {
        averageProcessingTime: 0,
        fastestProcessingTime: 0,
        slowestProcessingTime: 0,
        efficiencyScore: 0
      };
    }

    const processingTimes = completedApplications.map(app => {
      const timeInDays = (app.updatedAt.getTime() - app.submissionDate.getTime()) / (1000 * 60 * 60 * 24);
      return timeInDays;
    });

    const averageProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
    const fastestProcessingTime = Math.min(...processingTimes);
    const slowestProcessingTime = Math.max(...processingTimes);

    // Calculate efficiency score (0-100, where 100 is most efficient)
    const targetProcessingTime = 30; // 30 days target
    const efficiencyScore = Math.max(0, Math.min(100,
      ((targetProcessingTime - averageProcessingTime) / targetProcessingTime) * 100 + 50
    ));

    return {
      averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
      fastestProcessingTime: Math.round(fastestProcessingTime * 100) / 100,
      slowestProcessingTime: Math.round(slowestProcessingTime * 100) / 100,
      efficiencyScore: Math.round(efficiencyScore * 100) / 100
    };
  }

  private async calculateQualityMetrics(startDate?: Date, endDate?: Date) {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Get spiritual evaluations
    const spiritualEvaluations = await this.prisma.spiritual_evaluations.findMany({
      where: {
        application: dateFilter
      },
      select: {
        scrollAlignment: true
      }
    });

    // Get academic evaluations
    const academicEvaluations = await this.prisma.academic_evaluations.findMany({
      where: {
        application: dateFilter
      },
      select: {
        learningPotential: true
      }
    });

    // Calculate averages
    const spiritualAlignmentScore = spiritualEvaluations.length > 0
      ? spiritualEvaluations.reduce((sum, evaluation) => sum + (evaluation.scrollAlignment || 0), 0) / spiritualEvaluations.length
      : 0;

    const academicReadinessScore = academicEvaluations.length > 0
      ? academicEvaluations.reduce((sum, evaluation) => sum + (evaluation.learningPotential || 0), 0) / academicEvaluations.length
      : 0;

    // Character assessment score (simplified calculation)
    const characterAssessmentScore = (spiritualAlignmentScore + academicReadinessScore) / 2;

    // Overall application quality
    const averageApplicationQuality = (spiritualAlignmentScore + academicReadinessScore + characterAssessmentScore) / 3;

    return {
      averageApplicationQuality: Math.round(averageApplicationQuality * 100) / 100,
      spiritualAlignmentScore: Math.round(spiritualAlignmentScore * 100) / 100,
      academicReadinessScore: Math.round(academicReadinessScore * 100) / 100,
      characterAssessmentScore: Math.round(characterAssessmentScore * 100) / 100
    };
  }

  private async calculateTimeMetrics(startDate?: Date, endDate?: Date) {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Calculate average decision time
    const decisionsWithTime = await this.prisma.admission_decisions.findMany({
      where: {
        application: dateFilter
      },
      include: {
        application: {
          select: {
            submissionDate: true
          }
        }
      }
    });

    const averageDecisionTime = decisionsWithTime.length > 0
      ? decisionsWithTime.reduce((sum, decision) => {
        const timeInDays = (decision.decisionDate.getTime() - decision.application.submissionDate.getTime()) / (1000 * 60 * 60 * 24);
        return sum + timeInDays;
      }, 0) / decisionsWithTime.length
      : 0;

    // Calculate average interview scheduling time
    const interviewsWithTime = await this.prisma.interview_records.findMany({
      where: {
        application: dateFilter
      },
      include: {
        application: {
          select: {
            submissionDate: true
          }
        }
      }
    });

    const averageInterviewSchedulingTime = interviewsWithTime.length > 0
      ? interviewsWithTime.reduce((sum, interview) => {
        const timeInDays = (interview.scheduledDate.getTime() - interview.application.submissionDate.getTime()) / (1000 * 60 * 60 * 24);
        return sum + timeInDays;
      }, 0) / interviewsWithTime.length
      : 0;

    // Calculate average response time (simplified as average of decision and interview times)
    const averageResponseTime = (averageDecisionTime + averageInterviewSchedulingTime) / 2;

    return {
      averageDecisionTime: Math.round(averageDecisionTime * 100) / 100,
      averageInterviewSchedulingTime: Math.round(averageInterviewSchedulingTime * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100
    };
  }

  private calculateYieldRate(reportData: any): number {
    const acceptedCount = reportData.conversionRates?.overallConversionRate || 0;
    const enrolledCount = acceptedCount * 0.8; // Assume 80% of accepted students enroll
    return acceptedCount > 0 ? (enrolledCount / acceptedCount) * 100 : 0;
  }

  private extractAverageScores(reportData: any) {
    return {
      spiritualAlignment: reportData.qualityMetrics?.spiritualAlignmentScore || 0,
      academicReadiness: reportData.qualityMetrics?.academicReadinessScore || 0,
      characterAssessment: reportData.qualityMetrics?.characterAssessmentScore || 0,
      overallQuality: reportData.qualityMetrics?.averageApplicationQuality || 0
    };
  }

  private extractAssessmentTrends(reportData: any) {
    return {
      volumeTrend: reportData.applicationVolume?.applicationsByMonth || [],
      conversionTrend: reportData.conversionRates?.conversionTrends || [],
      qualityTrend: {
        spiritual: reportData.qualityMetrics?.spiritualAlignmentScore || 0,
        academic: reportData.qualityMetrics?.academicReadinessScore || 0
      }
    };
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = Math.ceil((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }
}