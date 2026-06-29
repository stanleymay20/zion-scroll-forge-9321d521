/**
 * A/B Testing Service
 * Comprehensive A/B testing framework for feature optimization
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  ABTest,
  ABTestStatus,
  ABVariant,
  UserVariantAssignment,
  ABTestResults,
  CreateABTestRequest,
} from '../types/post-launch.types';

const prisma = new PrismaClient();

export default class ABTestingService {
  /**
   * Create a new A/B test
   */
  async createTest(userId: string, request: CreateABTestRequest): Promise<ABTest> {
    try {
      // Validate traffic allocation
      const totalAllocation = request.variants.reduce((sum, v) => sum + v.trafficAllocation, 0);
      if (Math.abs(totalAllocation - 100) > 0.01) {
        throw new Error('Total traffic allocation must equal 100%');
      }

      // Ensure at least one control variant
      const hasControl = request.variants.some((v) => v.isControl);
      if (!hasControl) {
        throw new Error('At least one variant must be marked as control');
      }

      const result = await prisma.$queryRaw<any[]>`
        INSERT INTO ab_tests (
          id, name, description, hypothesis, feature, variants, target_audience,
          metrics, status, start_date, end_date, created_by, created_at, updated_at
        )
        VALUES (
          gen_random_uuid()::text,
          ${request.name},
          ${request.description},
          ${request.hypothesis},
          ${request.feature},
          ${JSON.stringify(request.variants)}::jsonb,
          ${JSON.stringify(request.targetAudience)}::jsonb,
          ${JSON.stringify(request.metrics)}::jsonb,
          'draft',
          ${request.startDate},
          ${request.endDate || null},
          ${userId},
          NOW(),
          NOW()
        )
        RETURNING *
      `;

      logger.info(`A/B test created: ${result[0].id} by user ${userId}`);

      return {
        id: result[0].id,
        name: result[0].name,
        description: result[0].description,
        hypothesis: result[0].hypothesis,
        feature: result[0].feature,
        variants: result[0].variants,
        targetAudience: result[0].target_audience,
        metrics: result[0].metrics,
        status: result[0].status,
        startDate: result[0].start_date,
        endDate: result[0].end_date,
        results: result[0].results,
        createdBy: result[0].created_by,
        createdAt: result[0].created_at,
        updatedAt: result[0].updated_at,
      };
    } catch (error) {
      logger.error('Error creating A/B test:', error);
      throw error;
    }
  }

  /**
   * Get A/B test by ID
   */
  async getTest(testId: string): Promise<ABTest | null> {
    try {
      const test = await prisma.$queryRaw<any[]>`
        SELECT * FROM ab_tests WHERE id = ${testId}
      `;

      if (test.length === 0) {
        return null;
      }

      return {
        id: test[0].id,
        name: test[0].name,
        description: test[0].description,
        hypothesis: test[0].hypothesis,
        feature: test[0].feature,
        variants: test[0].variants,
        targetAudience: test[0].target_audience,
        metrics: test[0].metrics,
        status: test[0].status,
        startDate: test[0].start_date,
        endDate: test[0].end_date,
        results: test[0].results,
        createdBy: test[0].created_by,
        createdAt: test[0].created_at,
        updatedAt: test[0].updated_at,
      };
    } catch (error) {
      logger.error('Error fetching A/B test:', error);
      throw new Error('Failed to fetch A/B test');
    }
  }

  /**
   * Get all A/B tests
   */
  async getAllTests(filters?: {
    status?: ABTestStatus;
    feature?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ tests: ABTest[]; total: number }> {
    try {
      const conditions: string[] = [];
      if (filters?.status) conditions.push(`status = '${filters.status}'`);
      if (filters?.feature) conditions.push(`feature = '${filters.feature}'`);

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;

      const tests = await prisma.$queryRaw<any[]>`
        SELECT * FROM ab_tests
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM ab_tests ${whereClause}
      `;

      return {
        tests: tests.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          hypothesis: t.hypothesis,
          feature: t.feature,
          variants: t.variants,
          targetAudience: t.target_audience,
          metrics: t.metrics,
          status: t.status,
          startDate: t.start_date,
          endDate: t.end_date,
          results: t.results,
          createdBy: t.created_by,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        })),
        total: parseInt(countResult[0].count),
      };
    } catch (error) {
      logger.error('Error fetching A/B tests:', error);
      throw new Error('Failed to fetch A/B tests');
    }
  }

  /**
   * Start an A/B test
   */
  async startTest(testId: string): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE ab_tests
        SET status = 'running', updated_at = NOW()
        WHERE id = ${testId} AND status = 'draft'
      `;

      logger.info(`A/B test started: ${testId}`);
    } catch (error) {
      logger.error('Error starting A/B test:', error);
      throw new Error('Failed to start A/B test');
    }
  }

  /**
   * Pause an A/B test
   */
  async pauseTest(testId: string): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE ab_tests
        SET status = 'paused', updated_at = NOW()
        WHERE id = ${testId} AND status = 'running'
      `;

      logger.info(`A/B test paused: ${testId}`);
    } catch (error) {
      logger.error('Error pausing A/B test:', error);
      throw new Error('Failed to pause A/B test');
    }
  }

  /**
   * Complete an A/B test
   */
  async completeTest(testId: string): Promise<void> {
    try {
      // Calculate results
      const results = await this.calculateTestResults(testId);

      await prisma.$executeRaw`
        UPDATE ab_tests
        SET 
          status = 'completed',
          results = ${JSON.stringify(results)}::jsonb,
          updated_at = NOW()
        WHERE id = ${testId}
      `;

      logger.info(`A/B test completed: ${testId}`);
    } catch (error) {
      logger.error('Error completing A/B test:', error);
      throw new Error('Failed to complete A/B test');
    }
  }

  /**
   * Assign user to variant
   */
  async assignUserToVariant(userId: string, testId: string): Promise<UserVariantAssignment> {
    try {
      // Check if user already assigned
      const existing = await prisma.$queryRaw<any[]>`
        SELECT * FROM ab_test_assignments
        WHERE user_id = ${userId} AND test_id = ${testId}
      `;

      if (existing.length > 0) {
        return {
          userId: existing[0].user_id,
          testId: existing[0].test_id,
          variantId: existing[0].variant_id,
          assignedAt: existing[0].assigned_at,
          exposedAt: existing[0].exposed_at,
          converted: existing[0].converted,
          conversionValue: existing[0].conversion_value,
        };
      }

      // Get test details
      const test = await this.getTest(testId);
      if (!test || test.status !== 'running') {
        throw new Error('Test is not running');
      }

      // Select variant based on traffic allocation
      const variant = this.selectVariant(test.variants);

      // Create assignment
      const result = await prisma.$queryRaw<any[]>`
        INSERT INTO ab_test_assignments (
          id, user_id, test_id, variant_id, assigned_at
        )
        VALUES (
          gen_random_uuid()::text,
          ${userId},
          ${testId},
          ${variant.id},
          NOW()
        )
        RETURNING *
      `;

      return {
        userId: result[0].user_id,
        testId: result[0].test_id,
        variantId: result[0].variant_id,
        assignedAt: result[0].assigned_at,
        exposedAt: result[0].exposed_at,
        converted: result[0].converted,
        conversionValue: result[0].conversion_value,
      };
    } catch (error) {
      logger.error('Error assigning user to variant:', error);
      throw new Error('Failed to assign user to variant');
    }
  }

  /**
   * Record user exposure to variant
   */
  async recordExposure(userId: string, testId: string): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE ab_test_assignments
        SET exposed_at = NOW()
        WHERE user_id = ${userId} AND test_id = ${testId} AND exposed_at IS NULL
      `;
    } catch (error) {
      logger.error('Error recording exposure:', error);
      throw new Error('Failed to record exposure');
    }
  }

  /**
   * Record conversion event
   */
  async recordConversion(
    userId: string,
    testId: string,
    value?: number
  ): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE ab_test_assignments
        SET 
          converted = true,
          conversion_value = ${value || null}
        WHERE user_id = ${userId} AND test_id = ${testId}
      `;

      logger.info(`Conversion recorded for user ${userId} in test ${testId}`);
    } catch (error) {
      logger.error('Error recording conversion:', error);
      throw new Error('Failed to record conversion');
    }
  }

  /**
   * Record test event
   */
  async recordEvent(
    userId: string,
    testId: string,
    variantId: string,
    eventType: string,
    eventData?: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO ab_test_events (
          id, test_id, user_id, variant_id, event_type, event_data, created_at
        )
        VALUES (
          gen_random_uuid()::text,
          ${testId},
          ${userId},
          ${variantId},
          ${eventType},
          ${JSON.stringify(eventData || {})}::jsonb,
          NOW()
        )
      `;
    } catch (error) {
      logger.error('Error recording event:', error);
      throw new Error('Failed to record event');
    }
  }

  /**
   * Calculate test results
   */
  async calculateTestResults(testId: string): Promise<ABTestResults> {
    try {
      const test = await this.getTest(testId);
      if (!test) {
        throw new Error('Test not found');
      }

      // Get assignments per variant
      const assignments = await prisma.$queryRaw<any[]>`
        SELECT 
          variant_id,
          COUNT(*) as total,
          COUNT(CASE WHEN exposed_at IS NOT NULL THEN 1 END) as exposed,
          COUNT(CASE WHEN converted = true THEN 1 END) as conversions,
          AVG(conversion_value) as avg_value
        FROM ab_test_assignments
        WHERE test_id = ${testId}
        GROUP BY variant_id
      `;

      const variantResults = assignments.map((a) => ({
        variantId: a.variant_id,
        participants: parseInt(a.total),
        metrics: {
          conversions: {
            value: parseInt(a.conversions),
            change: 0,
            pValue: 0,
            confidenceInterval: [0, 0] as [number, number],
          },
        },
        conversionRate: parseInt(a.exposed) > 0 ? parseInt(a.conversions) / parseInt(a.exposed) : 0,
        averageValue: parseFloat(a.avg_value || '0'),
      }));

      // Find control variant
      const controlVariant = test.variants.find((v) => v.isControl);
      const controlResults = variantResults.find((r) => r.variantId === controlVariant?.id);

      // Calculate statistical significance (simplified)
      let winner: string | undefined;
      let maxConversionRate = 0;

      for (const result of variantResults) {
        if (result.conversionRate > maxConversionRate) {
          maxConversionRate = result.conversionRate;
          winner = result.variantId;
        }

        // Calculate change from control
        if (controlResults && result.variantId !== controlResults.variantId) {
          const change =
            ((result.conversionRate - controlResults.conversionRate) /
              controlResults.conversionRate) *
            100;
          result.metrics.conversions.change = change;
        }
      }

      const totalParticipants = variantResults.reduce((sum, r) => sum + r.participants, 0);
      const confidence = totalParticipants > 100 ? 95 : totalParticipants > 50 ? 80 : 50;
      const statisticalSignificance = totalParticipants > 100;

      return {
        totalParticipants,
        variantResults,
        winner,
        confidence,
        statisticalSignificance,
        insights: this.generateInsights(variantResults, test),
        recommendation: this.generateRecommendation(variantResults, statisticalSignificance),
      };
    } catch (error) {
      logger.error('Error calculating test results:', error);
      throw new Error('Failed to calculate test results');
    }
  }

  /**
   * Select variant based on traffic allocation
   */
  private selectVariant(variants: ABVariant[]): ABVariant {
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const variant of variants) {
      cumulative += variant.trafficAllocation;
      if (random <= cumulative) {
        return variant;
      }
    }

    return variants[0]; // Fallback
  }

  /**
   * Generate insights from test results
   */
  private generateInsights(variantResults: any[], test: ABTest): string[] {
    const insights: string[] = [];

    const sortedByConversion = [...variantResults].sort(
      (a, b) => b.conversionRate - a.conversionRate
    );

    insights.push(
      `Best performing variant: ${sortedByConversion[0].variantId} with ${(sortedByConversion[0].conversionRate * 100).toFixed(2)}% conversion rate`
    );

    if (sortedByConversion.length > 1) {
      const improvement =
        ((sortedByConversion[0].conversionRate - sortedByConversion[1].conversionRate) /
          sortedByConversion[1].conversionRate) *
        100;
      insights.push(
        `${improvement.toFixed(2)}% improvement over second-best variant`
      );
    }

    return insights;
  }

  /**
   * Generate recommendation based on results
   */
  private generateRecommendation(
    variantResults: any[],
    statisticalSignificance: boolean
  ): 'deploy_winner' | 'continue_testing' | 'inconclusive' {
    if (!statisticalSignificance) {
      return 'continue_testing';
    }

    const sortedByConversion = [...variantResults].sort(
      (a, b) => b.conversionRate - a.conversionRate
    );

    if (sortedByConversion.length < 2) {
      return 'inconclusive';
    }

    const improvement =
      ((sortedByConversion[0].conversionRate - sortedByConversion[1].conversionRate) /
        sortedByConversion[1].conversionRate) *
      100;

    if (improvement > 5) {
      return 'deploy_winner';
    }

    return 'inconclusive';
  }
}
