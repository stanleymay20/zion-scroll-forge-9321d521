/**
 * ScrollUniversity Admissions Performance Tracking Service
 * "Commit to the Lord whatever you do, and he will establish your plans" - Proverbs 16:3
 * 
 * Tracks and monitors performance metrics across the admissions system
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

interface PerformanceMetric {
  id: string;
  metricName: string;
  metricValue: number;
  metricType: 'VOLUME' | 'CONVERSION' | 'TIME' | 'QUALITY' | 'EFFICIENCY';
  timestamp: Date;
  context: Record<string, any>;
}

interface TrendAnalysis {
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercentage: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  significance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface PerformanceAlert {
  id: string;
  alertType: 'THRESHOLD_BREACH' | 'TREND_ANOMALY' | 'SYSTEM_ISSUE' | 'QUALITY_CONCERN';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  affectedMetrics: string[];
  recommendedActions: string[];
  timestamp: Date;
}

interface OptimizationRecommendation {
  area: string;
  currentPerformance: number;
  targetPerformance: number;
  recommendations: string[];
  estimatedImpact: 'LOW' | 'MEDIUM' | 'HIGH';
  implementationComplexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
  priority: number;
}

export class PerformanceTrackingService {
  private prisma: PrismaClient;
  private performanceThresholds: Map<string, number>;

  constructor() {
    this.prisma = new PrismaClient();
    this.initializePerformanceThresholds();
  }

  /**
   * Track application volume and trend metrics
   */
  async trackApplicationVolume(): Promise<PerformanceMetric[]> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Current period volume
      const currentVolume = await this.prisma.applications.count({
        where: {
          submissionDate: {
            gte: thirtyDaysAgo,
            lte: now
          }
        }
      });

      // Previous period volume for comparison
      const previousVolume = await this.prisma.applications.count({
        where: {
          submissionDate: {
            gte: sixtyDaysAgo,
            lt: thirtyDaysAgo
          }
        }
      });

      // Daily average
      const dailyAverage = currentVolume / 30;

      // Peak day volume
      const peakDayVolume = await this.calculatePeakDayVolume(thirtyDaysAgo, now);

      const metrics: PerformanceMetric[] = [
        {
          id: `volume_current_${now.getTime()}`,
          metricName: 'application_volume_30_days',
          metricValue: currentVolume,
          metricType: 'VOLUME',
          timestamp: now,
          context: { period: '30_days', comparison: previousVolume }
        },
        {
          id: `volume_daily_avg_${now.getTime()}`,
          metricName: 'daily_application_average',
          metricValue: dailyAverage,
          metricType: 'VOLUME',
          timestamp: now,
          context: { period: '30_days' }
        },
        {
          id: `volume_peak_${now.getTime()}`,
          metricName: 'peak_day_volume',
          metricValue: peakDayVolume,
          metricType: 'VOLUME',
          timestamp: now,
          context: { period: '30_days' }
        }
      ];

      // Store metrics
      await this.storePerformanceMetrics(metrics);

      logger.info('Application volume metrics tracked', {
        currentVolume,
        previousVolume,
        dailyAverage,
        peakDayVolume
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to track application volume', { error });
      throw new Error('Application volume tracking failed');
    }
  }

  /**
   * Track conversion rate performance across funnel stages
   */
  async trackConversionRates(): Promise<PerformanceMetric[]> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const stages = [
        'SUBMITTED',
        'UNDER_REVIEW', 
        'ASSESSMENT_PENDING',
        'INTERVIEW_SCHEDULED',
        'DECISION_PENDING',
        'ACCEPTED'
      ];

      const metrics: PerformanceMetric[] = [];

      // Track conversion between each stage
      for (let i = 0; i < stages.length - 1; i++) {
        const fromStage = stages[i];
        const toStage = stages[i + 1];

        const fromCount = await this.prisma.applications.count({
          where: {
            submissionDate: { gte: thirtyDaysAgo },
            status: fromStage as any
          }
        });

        const toCount = await this.prisma.applications.count({
          where: {
            submissionDate: { gte: thirtyDaysAgo },
            status: toStage as any
          }
        });

        const conversionRate = fromCount > 0 ? (toCount / fromCount) * 100 : 0;

        metrics.push({
          id: `conversion_${fromStage}_${toStage}_${now.getTime()}`,
          metricName: `conversion_rate_${fromStage}_to_${toStage}`,
          metricValue: conversionRate,
          metricType: 'CONVERSION',
          timestamp: now,
          context: {
            fromStage,
            toStage,
            fromCount,
            toCount,
            period: '30_days'
          }
        });
      }

      // Overall conversion rate (submitted to accepted)
      const totalSubmitted = await this.prisma.applications.count({
        where: {
          submissionDate: { gte: thirtyDaysAgo },
          status: 'SUBMITTED'
        }
      });

      const totalAccepted = await this.prisma.applications.count({
        where: {
          submissionDate: { gte: thirtyDaysAgo },
          status: 'ACCEPTED'
        }
      });

      const overallConversionRate = totalSubmitted > 0 ? (totalAccepted / totalSubmitted) * 100 : 0;

      metrics.push({
        id: `overall_conversion_${now.getTime()}`,
        metricName: 'overall_conversion_rate',
        metricValue: overallConversionRate,
        metricType: 'CONVERSION',
        timestamp: now,
        context: {
          totalSubmitted,
          totalAccepted,
          period: '30_days'
        }
      });

      await this.storePerformanceMetrics(metrics);

      logger.info('Conversion rate metrics tracked', {
        stageConversions: metrics.length - 1,
        overallConversionRate
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to track conversion rates', { error });
      throw new Error('Conversion rate tracking failed');
    }
  }

  /**
   * Track demographic diversity and representation metrics
   */
  async trackDemographicMetrics(): Promise<PerformanceMetric[]> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const metrics: PerformanceMetric[] = [];

      // Geographic diversity
      const geographicData = await this.prisma.applications.groupBy({
        by: ['applicantCountry'],
        where: {
          submissionDate: { gte: thirtyDaysAgo }
        },
        _count: {
          id: true
        }
      });

      const uniqueCountries = geographicData.length;
      const totalApplications = geographicData.reduce((sum, item) => sum + item._count.id, 0);

      metrics.push({
        id: `geographic_diversity_${now.getTime()}`,
        metricName: 'geographic_diversity_countries',
        metricValue: uniqueCountries,
        metricType: 'QUALITY',
        timestamp: now,
        context: {
          totalApplications,
          period: '30_days',
          distribution: geographicData
        }
      });

      // Spiritual maturity distribution
      const spiritualData = await this.prisma.spiritual_evaluations.groupBy({
        by: ['spiritualMaturity'],
        where: {
          application: {
            submissionDate: { gte: thirtyDaysAgo }
          }
        },
        _count: {
          id: true
        }
      });

      const spiritualDiversityIndex = this.calculateDiversityIndex(
        spiritualData.map(item => item._count.id)
      );

      metrics.push({
        id: `spiritual_diversity_${now.getTime()}`,
        metricName: 'spiritual_maturity_diversity_index',
        metricValue: spiritualDiversityIndex,
        metricType: 'QUALITY',
        timestamp: now,
        context: {
          distribution: spiritualData,
          period: '30_days'
        }
      });

      await this.storePerformanceMetrics(metrics);

      logger.info('Demographic metrics tracked', {
        uniqueCountries,
        spiritualDiversityIndex
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to track demographic metrics', { error });
      throw new Error('Demographic metrics tracking failed');
    }
  }

  /**
   * Identify bottlenecks in the admissions funnel
   */
  async identifyFunnelBottlenecks(): Promise<PerformanceAlert[]> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const alerts: PerformanceAlert[] = [];

      // Analyze time spent in each stage
      const stageAnalysis = await this.analyzeStageProcessingTimes(thirtyDaysAgo, now);

      for (const stage of stageAnalysis) {
        if (stage.averageTime > this.performanceThresholds.get(`${stage.stageName}_time`) || 0) {
          alerts.push({
            id: `bottleneck_${stage.stageName}_${now.getTime()}`,
            alertType: 'THRESHOLD_BREACH',
            severity: this.determineSeverity(stage.averageTime, stage.threshold),
            message: `Processing time in ${stage.stageName} exceeds threshold`,
            affectedMetrics: [`${stage.stageName}_processing_time`],
            recommendedActions: [
              `Review ${stage.stageName} workflow efficiency`,
              'Consider additional resources for this stage',
              'Analyze common delays in this stage'
            ],
            timestamp: now
          });
        }
      }

      // Analyze conversion rate drops
      const conversionAnalysis = await this.analyzeConversionDrops(thirtyDaysAgo, now);

      for (const drop of conversionAnalysis) {
        if (drop.dropRate > 50) { // More than 50% drop
          alerts.push({
            id: `conversion_drop_${drop.stage}_${now.getTime()}`,
            alertType: 'TREND_ANOMALY',
            severity: drop.dropRate > 75 ? 'CRITICAL' : 'HIGH',
            message: `High conversion drop detected at ${drop.stage}`,
            affectedMetrics: [`conversion_rate_${drop.stage}`],
            recommendedActions: [
              `Investigate reasons for drop at ${drop.stage}`,
              'Review stage requirements and criteria',
              'Consider process improvements'
            ],
            timestamp: now
          });
        }
      }

      logger.info('Funnel bottlenecks identified', {
        alertCount: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'CRITICAL').length
      });

      return alerts;
    } catch (error) {
      logger.error('Failed to identify funnel bottlenecks', { error });
      throw new Error('Bottleneck identification failed');
    }
  }

  /**
   * Generate trend analysis for key performance indicators
   */
  async generateTrendAnalysis(metricNames: string[], days: number = 30): Promise<TrendAnalysis[]> {
    try {
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const midDate = new Date(now.getTime() - (days / 2) * 24 * 60 * 60 * 1000);

      const trends: TrendAnalysis[] = [];

      for (const metricName of metricNames) {
        // Get recent period metrics
        const recentMetrics = await this.prisma.performance_metrics.findMany({
          where: {
            metricName,
            timestamp: { gte: midDate }
          },
          orderBy: { timestamp: 'desc' }
        });

        // Get previous period metrics
        const previousMetrics = await this.prisma.performance_metrics.findMany({
          where: {
            metricName,
            timestamp: { gte: startDate, lt: midDate }
          },
          orderBy: { timestamp: 'desc' }
        });

        if (recentMetrics.length > 0 && previousMetrics.length > 0) {
          const currentValue = this.calculateAverage(recentMetrics.map(m => m.metricValue));
          const previousValue = this.calculateAverage(previousMetrics.map(m => m.metricValue));

          const changePercentage = previousValue !== 0 
            ? ((currentValue - previousValue) / previousValue) * 100 
            : 0;

          const trend = this.determineTrend(changePercentage);
          const significance = this.determineSignificance(Math.abs(changePercentage));

          trends.push({
            metric: metricName,
            currentValue,
            previousValue,
            changePercentage,
            trend,
            significance
          });
        }
      }

      logger.info('Trend analysis generated', {
        metricsAnalyzed: trends.length,
        significantTrends: trends.filter(t => t.significance === 'HIGH' || t.significance === 'CRITICAL').length
      });

      return trends;
    } catch (error) {
      logger.error('Failed to generate trend analysis', { error });
      throw new Error('Trend analysis generation failed');
    }
  }

  /**
   * Generate optimization recommendations based on performance data
   */
  async generateOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
    try {
      const recommendations: OptimizationRecommendation[] = [];

      // Analyze conversion rates for optimization opportunities
      const conversionMetrics = await this.trackConversionRates();
      
      for (const metric of conversionMetrics) {
        if (metric.metricValue < 70 && metric.metricName.includes('conversion_rate')) {
          recommendations.push({
            area: `Conversion Optimization - ${metric.metricName}`,
            currentPerformance: metric.metricValue,
            targetPerformance: 85,
            recommendations: [
              'Streamline application process',
              'Improve communication with applicants',
              'Reduce processing time',
              'Enhance user experience'
            ],
            estimatedImpact: 'HIGH',
            implementationComplexity: 'MODERATE',
            priority: this.calculatePriority(metric.metricValue, 85)
          });
        }
      }

      // Analyze volume trends for capacity planning
      const volumeMetrics = await this.trackApplicationVolume();
      const volumeTrends = await this.generateTrendAnalysis(['application_volume_30_days'], 60);

      for (const trend of volumeTrends) {
        if (trend.trend === 'INCREASING' && trend.significance === 'HIGH') {
          recommendations.push({
            area: 'Capacity Planning - Application Volume',
            currentPerformance: trend.currentValue,
            targetPerformance: trend.currentValue * 1.5,
            recommendations: [
              'Scale admissions team',
              'Implement automation tools',
              'Optimize resource allocation',
              'Prepare for increased load'
            ],
            estimatedImpact: 'HIGH',
            implementationComplexity: 'COMPLEX',
            priority: 8
          });
        }
      }

      // Sort by priority
      recommendations.sort((a, b) => b.priority - a.priority);

      logger.info('Optimization recommendations generated', {
        recommendationCount: recommendations.length,
        highPriorityCount: recommendations.filter(r => r.priority >= 8).length
      });

      return recommendations;
    } catch (error) {
      logger.error('Failed to generate optimization recommendations', { error });
      throw new Error('Optimization recommendations generation failed');
    }
  }

  // Private helper methods

  private initializePerformanceThresholds(): void {
    this.performanceThresholds = new Map([
      ['SUBMITTED_time', 1], // 1 day
      ['UNDER_REVIEW_time', 7], // 7 days
      ['ASSESSMENT_PENDING_time', 14], // 14 days
      ['INTERVIEW_SCHEDULED_time', 21], // 21 days
      ['DECISION_PENDING_time', 7], // 7 days
      ['overall_conversion_rate', 60], // 60%
      ['application_volume_daily', 50] // 50 applications per day
    ]);
  }

  private async calculatePeakDayVolume(startDate: Date, endDate: Date): Promise<number> {
    const dailyVolumes = await this.prisma.applications.groupBy({
      by: ['submissionDate'],
      where: {
        submissionDate: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        id: true
      }
    });

    return Math.max(...dailyVolumes.map(dv => dv._count.id), 0);
  }

  private async storePerformanceMetrics(metrics: PerformanceMetric[]): Promise<void> {
    for (const metric of metrics) {
      await this.prisma.performance_metrics.create({
        data: {
          metricName: metric.metricName,
          metricValue: metric.metricValue,
          metricType: metric.metricType,
          timestamp: metric.timestamp,
          context: metric.context
        }
      });
    }
  }

  private calculateDiversityIndex(counts: number[]): number {
    const total = counts.reduce((sum, count) => sum + count, 0);
    if (total === 0) return 0;

    const proportions = counts.map(count => count / total);
    const shannonIndex = -proportions.reduce((sum, p) => sum + (p > 0 ? p * Math.log(p) : 0), 0);
    
    // Normalize to 0-100 scale
    return Math.min(100, (shannonIndex / Math.log(counts.length)) * 100);
  }

  private async analyzeStageProcessingTimes(startDate: Date, endDate: Date) {
    // Implementation for analyzing processing times by stage
    return [];
  }

  private async analyzeConversionDrops(startDate: Date, endDate: Date) {
    // Implementation for analyzing conversion drops
    return [];
  }

  private determineSeverity(value: number, threshold: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const ratio = value / threshold;
    if (ratio > 2) return 'CRITICAL';
    if (ratio > 1.5) return 'HIGH';
    if (ratio > 1.2) return 'MEDIUM';
    return 'LOW';
  }

  private calculateAverage(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private determineTrend(changePercentage: number): 'INCREASING' | 'DECREASING' | 'STABLE' {
    if (Math.abs(changePercentage) < 5) return 'STABLE';
    return changePercentage > 0 ? 'INCREASING' : 'DECREASING';
  }

  private determineSignificance(absChangePercentage: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (absChangePercentage > 50) return 'CRITICAL';
    if (absChangePercentage > 25) return 'HIGH';
    if (absChangePercentage > 10) return 'MEDIUM';
    return 'LOW';
  }

  private calculatePriority(current: number, target: number): number {
    const gap = Math.abs(target - current);
    const gapPercentage = (gap / target) * 100;
    return Math.min(10, Math.max(1, Math.round(gapPercentage / 10)));
  }
}

export default PerformanceTrackingService;