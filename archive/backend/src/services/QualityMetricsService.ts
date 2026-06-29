/**
 * Quality Metrics Service
 * Tracks and analyzes quality metrics for AI services
 */

import { PrismaClient } from '@prisma/client';
import {
  QualityMetrics,
  TestResult,
  AIServiceType,
  QualityThresholds,
  DEFAULT_QUALITY_THRESHOLDS,
  MetricTrend,
  ContinuousImprovement,
  Improvement,
} from '../types/qa.types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export default class QualityMetricsService {
  private thresholds: QualityThresholds;

  constructor(thresholds?: Partial<QualityThresholds>) {
    this.thresholds = { ...DEFAULT_QUALITY_THRESHOLDS, ...thresholds };
  }

  /**
   * Record a test result
   */
  async recordTestResult(result: TestResult): Promise<void> {
    try {
      await prisma.aITestResult.create({
        data: {
          testCaseId: result.testCaseId,
          actualOutput: result.actualOutput,
          passed: result.passed,
          accuracy: result.accuracy,
          confidence: result.confidence,
          responseTime: result.responseTime,
          cost: result.cost,
          errors: result.errors || [],
          timestamp: result.timestamp,
        },
      });

      logger.info('Test result recorded', {
        testCaseId: result.testCaseId,
        passed: result.passed,
        accuracy: result.accuracy,
      });
    } catch (error) {
      logger.error('Error recording test result', { error });
      throw error;
    }
  }

  /**
   * Calculate quality metrics for a service
   */
  async calculateMetrics(
    serviceType: AIServiceType,
    startDate: Date,
    endDate: Date
  ): Promise<QualityMetrics> {
    try {
      // Get all test results for the service in the period
      const testCases = await prisma.aITestCase.findMany({
        where: { serviceType },
        include: {
          results: {
            where: {
              timestamp: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
      });

      const allResults = testCases.flatMap(tc => tc.results);

      if (allResults.length === 0) {
        throw new Error(`No test results found for ${serviceType} in the specified period`);
      }

      // Calculate metrics
      const accuracy = this.calculateAverage(allResults.map(r => r.accuracy));
      const confidence = this.calculateAverage(allResults.map(r => r.confidence));
      const responseTime = this.calculateAverage(allResults.map(r => r.responseTime));
      const costPerRequest = this.calculateAverage(allResults.map(r => r.cost));
      const errorRate = allResults.filter(r => !r.passed).length / allResults.length;

      // Get human agreement rate from review data
      const humanAgreement = await this.calculateHumanAgreement(serviceType, startDate, endDate);

      // Get theological alignment score
      const theologicalAlignment = await this.calculateTheologicalAlignment(
        serviceType,
        startDate,
        endDate
      );

      const metrics: QualityMetrics = {
        serviceType,
        accuracy,
        confidence,
        humanAgreement,
        theologicalAlignment,
        responseTime,
        costPerRequest,
        errorRate,
        period: {
          start: startDate,
          end: endDate,
        },
      };

      // Store metrics
      await prisma.aIQualityMetrics.create({
        data: {
          serviceType,
          accuracy,
          confidence,
          humanAgreement,
          theologicalAlignment,
          responseTime,
          costPerRequest,
          errorRate,
          periodStart: startDate,
          periodEnd: endDate,
        },
      });

      logger.info('Quality metrics calculated', { serviceType, metrics });

      return metrics;
    } catch (error) {
      logger.error('Error calculating quality metrics', { error, serviceType });
      throw error;
    }
  }

  /**
   * Check if metrics meet quality thresholds
   */
  meetsThresholds(metrics: QualityMetrics): boolean {
    return (
      metrics.accuracy >= this.thresholds.minAccuracy &&
      metrics.confidence >= this.thresholds.minConfidence &&
      metrics.humanAgreement >= this.thresholds.minHumanAgreement &&
      metrics.theologicalAlignment >= this.thresholds.minTheologicalAlignment &&
      metrics.responseTime <= this.thresholds.maxResponseTime &&
      metrics.costPerRequest <= this.thresholds.maxCostPerRequest &&
      metrics.errorRate <= this.thresholds.maxErrorRate
    );
  }

  /**
   * Get quality metrics history
   */
  async getMetricsHistory(
    serviceType: AIServiceType,
    limit: number = 30
  ): Promise<QualityMetrics[]> {
    try {
      const records = await prisma.aIQualityMetrics.findMany({
        where: { serviceType },
        orderBy: { periodEnd: 'desc' },
        take: limit,
      });

      return records.map(r => ({
        serviceType: r.serviceType as AIServiceType,
        accuracy: r.accuracy,
        confidence: r.confidence,
        humanAgreement: r.humanAgreement,
        theologicalAlignment: r.theologicalAlignment,
        responseTime: r.responseTime,
        costPerRequest: r.costPerRequest,
        errorRate: r.errorRate,
        period: {
          start: r.periodStart,
          end: r.periodEnd,
        },
      }));
    } catch (error) {
      logger.error('Error fetching metrics history', { error, serviceType });
      throw error;
    }
  }

  /**
   * Analyze metric trends
   */
  async analyzeMetricTrends(
    serviceType: AIServiceType,
    metricName: keyof Omit<QualityMetrics, 'serviceType' | 'period'>,
    periods: number = 10
  ): Promise<MetricTrend> {
    try {
      const history = await this.getMetricsHistory(serviceType, periods);

      const values = history.map(h => h[metricName] as number).reverse();
      const timestamps = history.map(h => h.period.end).reverse();

      // Calculate trend
      const trend = this.calculateTrend(values);
      const changeRate = this.calculateChangeRate(values);

      return {
        metric: metricName,
        values,
        timestamps,
        trend,
        changeRate,
      };
    } catch (error) {
      logger.error('Error analyzing metric trends', { error, serviceType, metricName });
      throw error;
    }
  }

  /**
   * Get continuous improvement data
   */
  async getContinuousImprovement(serviceType: AIServiceType): Promise<ContinuousImprovement> {
    try {
      const improvements = await prisma.aIImprovement.findMany({
        where: { serviceType },
        orderBy: { implementedAt: 'desc' },
      });

      const metrics = await this.getMetricsHistory(serviceType, 30);

      const trends = await Promise.all([
        this.analyzeMetricTrends(serviceType, 'accuracy'),
        this.analyzeMetricTrends(serviceType, 'confidence'),
        this.analyzeMetricTrends(serviceType, 'humanAgreement'),
        this.analyzeMetricTrends(serviceType, 'theologicalAlignment'),
        this.analyzeMetricTrends(serviceType, 'responseTime'),
        this.analyzeMetricTrends(serviceType, 'costPerRequest'),
        this.analyzeMetricTrends(serviceType, 'errorRate'),
      ]);

      return {
        serviceType,
        improvements: improvements.map(i => ({
          id: i.id,
          type: i.type as 'prompt' | 'model' | 'configuration' | 'workflow',
          description: i.description,
          implementedAt: i.implementedAt,
          impactMetrics: i.impactMetrics as any,
        })),
        metrics,
        trends,
      };
    } catch (error) {
      logger.error('Error fetching continuous improvement data', { error, serviceType });
      throw error;
    }
  }

  /**
   * Record an improvement
   */
  async recordImprovement(improvement: Omit<Improvement, 'id'>): Promise<Improvement> {
    try {
      const created = await prisma.aIImprovement.create({
        data: {
          serviceType: improvement.impactMetrics.before.serviceType,
          type: improvement.type,
          description: improvement.description,
          implementedAt: improvement.implementedAt,
          impactMetrics: improvement.impactMetrics as any,
        },
      });

      logger.info('Improvement recorded', {
        improvementId: created.id,
        type: improvement.type,
        improvement: improvement.impactMetrics.improvement,
      });

      return {
        id: created.id,
        type: created.type as 'prompt' | 'model' | 'configuration' | 'workflow',
        description: created.description,
        implementedAt: created.implementedAt,
        impactMetrics: created.impactMetrics as any,
      };
    } catch (error) {
      logger.error('Error recording improvement', { error });
      throw error;
    }
  }

  /**
   * Generate quality report
   */
  async generateQualityReport(
    serviceType: AIServiceType,
    startDate: Date,
    endDate: Date
  ): Promise<{
    metrics: QualityMetrics;
    meetsThresholds: boolean;
    trends: MetricTrend[];
    recommendations: string[];
  }> {
    try {
      const metrics = await this.calculateMetrics(serviceType, startDate, endDate);
      const meetsThresholds = this.meetsThresholds(metrics);

      const trends = await Promise.all([
        this.analyzeMetricTrends(serviceType, 'accuracy'),
        this.analyzeMetricTrends(serviceType, 'confidence'),
        this.analyzeMetricTrends(serviceType, 'humanAgreement'),
        this.analyzeMetricTrends(serviceType, 'theologicalAlignment'),
      ]);

      const recommendations = this.generateRecommendations(metrics, trends);

      return {
        metrics,
        meetsThresholds,
        trends,
        recommendations,
      };
    } catch (error) {
      logger.error('Error generating quality report', { error, serviceType });
      throw error;
    }
  }

  // Private helper methods

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private async calculateHumanAgreement(
    serviceType: AIServiceType,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      const reviews = await prisma.aIReviewWorkflow.findMany({
        where: {
          serviceType,
          reviewedAt: {
            gte: startDate,
            lte: endDate,
          },
          status: 'completed',
        },
      });

      if (reviews.length === 0) return 1.0;

      const agreements = reviews.filter(r => {
        const outcome = r.outcome as any;
        return outcome?.decision === 'approved' || outcome?.decision === 'approved_with_changes';
      }).length;

      return agreements / reviews.length;
    } catch (error) {
      logger.error('Error calculating human agreement', { error });
      return 1.0;
    }
  }

  private async calculateTheologicalAlignment(
    serviceType: AIServiceType,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      const alignments = await prisma.aITheologicalAlignment.findMany({
        where: {
          serviceType,
          reviewedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      if (alignments.length === 0) return 1.0;

      return this.calculateAverage(alignments.map(a => a.score));
    } catch (error) {
      logger.error('Error calculating theological alignment', { error });
      return 1.0;
    }
  }

  private calculateTrend(values: number[]): 'improving' | 'declining' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = this.calculateAverage(firstHalf);
    const secondAvg = this.calculateAverage(secondHalf);

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.05) return 'improving';
    if (change < -0.05) return 'declining';
    return 'stable';
  }

  private calculateChangeRate(values: number[]): number {
    if (values.length < 2) return 0;

    const firstValue = values[0];
    const lastValue = values[values.length - 1];

    return (lastValue - firstValue) / firstValue;
  }

  private generateRecommendations(metrics: QualityMetrics, trends: MetricTrend[]): string[] {
    const recommendations: string[] = [];

    // Check accuracy
    if (metrics.accuracy < this.thresholds.minAccuracy) {
      recommendations.push(
        `Accuracy (${(metrics.accuracy * 100).toFixed(1)}%) is below threshold. Consider improving training data or adjusting model parameters.`
      );
    }

    // Check confidence
    if (metrics.confidence < this.thresholds.minConfidence) {
      recommendations.push(
        `Confidence (${(metrics.confidence * 100).toFixed(1)}%) is below threshold. Review uncertain predictions and add human oversight.`
      );
    }

    // Check human agreement
    if (metrics.humanAgreement < this.thresholds.minHumanAgreement) {
      recommendations.push(
        `Human agreement (${(metrics.humanAgreement * 100).toFixed(1)}%) is below threshold. Increase human review and refine AI outputs.`
      );
    }

    // Check theological alignment
    if (metrics.theologicalAlignment < this.thresholds.minTheologicalAlignment) {
      recommendations.push(
        `Theological alignment (${(metrics.theologicalAlignment * 100).toFixed(1)}%) is below threshold. Enhance theological review process.`
      );
    }

    // Check response time
    if (metrics.responseTime > this.thresholds.maxResponseTime) {
      recommendations.push(
        `Response time (${metrics.responseTime.toFixed(0)}ms) exceeds threshold. Optimize prompts or consider caching strategies.`
      );
    }

    // Check cost
    if (metrics.costPerRequest > this.thresholds.maxCostPerRequest) {
      recommendations.push(
        `Cost per request ($${metrics.costPerRequest.toFixed(2)}) exceeds threshold. Review prompt efficiency and model selection.`
      );
    }

    // Check error rate
    if (metrics.errorRate > this.thresholds.maxErrorRate) {
      recommendations.push(
        `Error rate (${(metrics.errorRate * 100).toFixed(1)}%) exceeds threshold. Investigate and fix common failure patterns.`
      );
    }

    // Check trends
    const decliningTrends = trends.filter(t => t.trend === 'declining');
    if (decliningTrends.length > 0) {
      recommendations.push(
        `Declining trends detected in: ${decliningTrends.map(t => t.metric).join(', ')}. Investigate root causes.`
      );
    }

    return recommendations;
  }
}
