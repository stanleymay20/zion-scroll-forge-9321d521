/**
 * Bug and Feature Management Service
 * Comprehensive bug tracking and feature request management
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  Bug,
  BugSeverity,
  BugPriority,
  BugStatus,
  FeatureRequest,
  FeaturePriority,
  FeatureStatus,
  CreateBugRequest,
  CreateFeatureRequestRequest,
  BugAnalytics,
} from '../types/post-launch.types';

const prisma = new PrismaClient();

export default class BugFeatureManagementService {
  // ============================================================================
  // Bug Tracking Methods
  // ============================================================================

  /**
   * Create a bug report
   */
  async createBug(userId: string, request: CreateBugRequest): Promise<Bug> {
    try {
      // Auto-prioritize based on severity
      const priority = this.calculateBugPriority(request.severity);

      const result = await prisma.$queryRaw<any[]>`
        INSERT INTO bugs (
          id, title, description, severity, priority, status, category,
          affected_feature, reproducible, steps_to_reproduce, expected_behavior,
          actual_behavior, environment, reported_by, created_at, updated_at
        )
        VALUES (
          gen_random_uuid()::text,
          ${request.title},
          ${request.description},
          ${request.severity},
          ${priority},
          'new',
          ${request.category},
          ${request.affectedFeature},
          ${request.stepsToReproduce ? true : false},
          ARRAY[${request.stepsToReproduce?.join(',') || ''}]::text[],
          ${request.expectedBehavior},
          ${request.actualBehavior},
          ${JSON.stringify(request.environment)}::jsonb,
          ${userId},
          NOW(),
          NOW()
        )
        RETURNING *
      `;

      logger.info(`Bug created: ${result[0].id} by user ${userId}`);

      return {
        id: result[0].id,
        title: result[0].title,
        description: result[0].description,
        severity: result[0].severity,
        priority: result[0].priority,
        status: result[0].status,
        category: result[0].category,
        affectedFeature: result[0].affected_feature,
        reproducible: result[0].reproducible,
        stepsToReproduce: result[0].steps_to_reproduce || [],
        expectedBehavior: result[0].expected_behavior,
        actualBehavior: result[0].actual_behavior,
        environment: result[0].environment,
        reportedBy: result[0].reported_by,
        createdAt: result[0].created_at,
        updatedAt: result[0].updated_at,
      };
    } catch (error) {
      logger.error('Error creating bug:', error);
      throw new Error('Failed to create bug');
    }
  }

  /**
   * Get bug by ID
   */
  async getBug(bugId: string): Promise<Bug | null> {
    try {
      const bug = await prisma.$queryRaw<any[]>`
        SELECT * FROM bugs WHERE id = ${bugId}
      `;

      if (bug.length === 0) {
        return null;
      }

      return this.mapBugFromDb(bug[0]);
    } catch (error) {
      logger.error('Error fetching bug:', error);
      throw new Error('Failed to fetch bug');
    }
  }

  /**
   * Get all bugs with filters
   */
  async getAllBugs(filters?: {
    severity?: BugSeverity;
    priority?: BugPriority;
    status?: BugStatus;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ bugs: Bug[]; total: number }> {
    try {
      const conditions: string[] = [];
      if (filters?.severity) conditions.push(`severity = '${filters.severity}'`);
      if (filters?.priority) conditions.push(`priority = '${filters.priority}'`);
      if (filters?.status) conditions.push(`status = '${filters.status}'`);
      if (filters?.assignedTo) conditions.push(`assigned_to = '${filters.assignedTo}'`);

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;

      const bugs = await prisma.$queryRaw<any[]>`
        SELECT * FROM bugs
        ${whereClause}
        ORDER BY 
          CASE priority
            WHEN 'p0' THEN 1
            WHEN 'p1' THEN 2
            WHEN 'p2' THEN 3
            WHEN 'p3' THEN 4
            WHEN 'p4' THEN 5
          END,
          created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM bugs ${whereClause}
      `;

      return {
        bugs: bugs.map((b) => this.mapBugFromDb(b)),
        total: parseInt(countResult[0].count),
      };
    } catch (error) {
      logger.error('Error fetching bugs:', error);
      throw new Error('Failed to fetch bugs');
    }
  }

  /**
   * Update bug status
   */
  async updateBugStatus(
    bugId: string,
    status: BugStatus,
    assignedTo?: string,
    fixedInVersion?: string
  ): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE bugs
        SET 
          status = ${status},
          assigned_to = ${assignedTo || null},
          fixed_in_version = ${fixedInVersion || null},
          resolved_at = ${status === 'fixed' || status === 'verified' || status === 'closed' ? new Date() : null},
          updated_at = NOW()
        WHERE id = ${bugId}
      `;

      logger.info(`Bug ${bugId} status updated to ${status}`);
    } catch (error) {
      logger.error('Error updating bug status:', error);
      throw new Error('Failed to update bug status');
    }
  }

  /**
   * Get bug analytics
   */
  async getBugAnalytics(timeRange?: { start: Date; end: Date }): Promise<BugAnalytics> {
    try {
      const whereClause = timeRange
        ? `WHERE created_at BETWEEN '${timeRange.start.toISOString()}' AND '${timeRange.end.toISOString()}'`
        : '';

      const total = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM bugs ${whereClause}
      `;

      const open = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM bugs
        WHERE status NOT IN ('closed', 'verified', 'wont_fix') ${timeRange ? `AND created_at BETWEEN '${timeRange.start.toISOString()}' AND '${timeRange.end.toISOString()}'` : ''}
      `;

      const resolved = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM bugs
        WHERE status IN ('fixed', 'verified', 'closed') ${timeRange ? `AND created_at BETWEEN '${timeRange.start.toISOString()}' AND '${timeRange.end.toISOString()}'` : ''}
      `;

      const avgResolution = await prisma.$queryRaw<any[]>`
        SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as avg_hours
        FROM bugs
        WHERE resolved_at IS NOT NULL ${timeRange ? `AND created_at BETWEEN '${timeRange.start.toISOString()}' AND '${timeRange.end.toISOString()}'` : ''}
      `;

      const bySeverity = await prisma.$queryRaw<any[]>`
        SELECT severity, COUNT(*) as count FROM bugs ${whereClause} GROUP BY severity
      `;

      const byCategory = await prisma.$queryRaw<any[]>`
        SELECT category, COUNT(*) as count FROM bugs ${whereClause} GROUP BY category
      `;

      return {
        totalBugs: parseInt(total[0].count),
        openBugs: parseInt(open[0].count),
        resolvedBugs: parseInt(resolved[0].count),
        averageResolutionTime: parseFloat(avgResolution[0]?.avg_hours || '0'),
        bugsBySeverity: Object.fromEntries(
          bySeverity.map((s) => [s.severity, parseInt(s.count)])
        ) as Record<BugSeverity, number>,
        bugsByCategory: Object.fromEntries(
          byCategory.map((c) => [c.category, parseInt(c.count)])
        ),
        topReporters: [],
        trendData: [],
      };
    } catch (error) {
      logger.error('Error fetching bug analytics:', error);
      throw new Error('Failed to fetch bug analytics');
    }
  }

  // ============================================================================
  // Feature Request Methods
  // ============================================================================

  /**
   * Create a feature request
   */
  async createFeatureRequest(
    userId: string,
    request: CreateFeatureRequestRequest
  ): Promise<FeatureRequest> {
    try {
      const result = await prisma.$queryRaw<any[]>`
        INSERT INTO feature_requests (
          id, title, description, category, requested_by, votes, status,
          business_value, created_at, updated_at
        )
        VALUES (
          gen_random_uuid()::text,
          ${request.title},
          ${request.description},
          ${request.category},
          ${userId},
          0,
          'submitted',
          ${request.businessValue || null},
          NOW(),
          NOW()
        )
        RETURNING *
      `;

      logger.info(`Feature request created: ${result[0].id} by user ${userId}`);

      return {
        id: result[0].id,
        title: result[0].title,
        description: result[0].description,
        category: result[0].category,
        requestedBy: result[0].requested_by,
        votes: result[0].votes,
        voters: [],
        priority: result[0].priority,
        status: result[0].status,
        effort: result[0].effort,
        impact: result[0].impact,
        businessValue: result[0].business_value,
        technicalComplexity: result[0].technical_complexity,
        comments: [],
        createdAt: result[0].created_at,
        updatedAt: result[0].updated_at,
      };
    } catch (error) {
      logger.error('Error creating feature request:', error);
      throw new Error('Failed to create feature request');
    }
  }

  /**
   * Get feature request by ID
   */
  async getFeatureRequest(featureId: string): Promise<FeatureRequest | null> {
    try {
      const feature = await prisma.$queryRaw<any[]>`
        SELECT * FROM feature_requests WHERE id = ${featureId}
      `;

      if (feature.length === 0) {
        return null;
      }

      // Get voters
      const voters = await prisma.$queryRaw<any[]>`
        SELECT user_id FROM feature_request_votes WHERE feature_request_id = ${featureId}
      `;

      // Get comments
      const comments = await prisma.$queryRaw<any[]>`
        SELECT * FROM feature_request_comments
        WHERE feature_request_id = ${featureId}
        ORDER BY created_at ASC
      `;

      return {
        id: feature[0].id,
        title: feature[0].title,
        description: feature[0].description,
        category: feature[0].category,
        requestedBy: feature[0].requested_by,
        votes: feature[0].votes,
        voters: voters.map((v) => v.user_id),
        priority: feature[0].priority,
        status: feature[0].status,
        effort: feature[0].effort,
        impact: feature[0].impact,
        businessValue: feature[0].business_value,
        technicalComplexity: feature[0].technical_complexity,
        assignedTo: feature[0].assigned_to,
        targetRelease: feature[0].target_release,
        estimatedHours: feature[0].estimated_hours,
        actualHours: feature[0].actual_hours,
        comments: comments.map((c) => ({
          id: c.id,
          userId: c.user_id,
          content: c.content,
          createdAt: c.created_at,
        })),
        createdAt: feature[0].created_at,
        updatedAt: feature[0].updated_at,
        completedAt: feature[0].completed_at,
      };
    } catch (error) {
      logger.error('Error fetching feature request:', error);
      throw new Error('Failed to fetch feature request');
    }
  }

  /**
   * Get all feature requests
   */
  async getAllFeatureRequests(filters?: {
    status?: FeatureStatus;
    priority?: FeaturePriority;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ features: FeatureRequest[]; total: number }> {
    try {
      const conditions: string[] = [];
      if (filters?.status) conditions.push(`status = '${filters.status}'`);
      if (filters?.priority) conditions.push(`priority = '${filters.priority}'`);
      if (filters?.category) conditions.push(`category = '${filters.category}'`);

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;

      const features = await prisma.$queryRaw<any[]>`
        SELECT * FROM feature_requests
        ${whereClause}
        ORDER BY votes DESC, created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM feature_requests ${whereClause}
      `;

      return {
        features: features.map((f) => ({
          id: f.id,
          title: f.title,
          description: f.description,
          category: f.category,
          requestedBy: f.requested_by,
          votes: f.votes,
          voters: [],
          priority: f.priority,
          status: f.status,
          effort: f.effort,
          impact: f.impact,
          businessValue: f.business_value,
          technicalComplexity: f.technical_complexity,
          assignedTo: f.assigned_to,
          targetRelease: f.target_release,
          estimatedHours: f.estimated_hours,
          actualHours: f.actual_hours,
          comments: [],
          createdAt: f.created_at,
          updatedAt: f.updated_at,
          completedAt: f.completed_at,
        })),
        total: parseInt(countResult[0].count),
      };
    } catch (error) {
      logger.error('Error fetching feature requests:', error);
      throw new Error('Failed to fetch feature requests');
    }
  }

  /**
   * Vote on feature request
   */
  async voteFeatureRequest(featureId: string, userId: string): Promise<void> {
    try {
      // Check if user already voted
      const existingVote = await prisma.$queryRaw<any[]>`
        SELECT * FROM feature_request_votes
        WHERE feature_request_id = ${featureId} AND user_id = ${userId}
      `;

      if (existingVote.length > 0) {
        throw new Error('User already voted on this feature request');
      }

      // Add vote
      await prisma.$executeRaw`
        INSERT INTO feature_request_votes (id, feature_request_id, user_id, created_at)
        VALUES (gen_random_uuid()::text, ${featureId}, ${userId}, NOW())
      `;

      // Update vote count
      await prisma.$executeRaw`
        UPDATE feature_requests
        SET votes = votes + 1, updated_at = NOW()
        WHERE id = ${featureId}
      `;

      logger.info(`User ${userId} voted on feature request ${featureId}`);
    } catch (error) {
      logger.error('Error voting on feature request:', error);
      throw error;
    }
  }

  /**
   * Update feature request status
   */
  async updateFeatureRequestStatus(
    featureId: string,
    status: FeatureStatus,
    assignedTo?: string,
    targetRelease?: string
  ): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE feature_requests
        SET 
          status = ${status},
          assigned_to = ${assignedTo || null},
          target_release = ${targetRelease || null},
          completed_at = ${status === 'deployed' ? new Date() : null},
          updated_at = NOW()
        WHERE id = ${featureId}
      `;

      logger.info(`Feature request ${featureId} status updated to ${status}`);
    } catch (error) {
      logger.error('Error updating feature request status:', error);
      throw new Error('Failed to update feature request status');
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private calculateBugPriority(severity: BugSeverity): BugPriority {
    switch (severity) {
      case 'critical':
        return 'p0';
      case 'high':
        return 'p1';
      case 'medium':
        return 'p2';
      case 'low':
        return 'p3';
      default:
        return 'p4';
    }
  }

  private mapBugFromDb(bug: any): Bug {
    return {
      id: bug.id,
      title: bug.title,
      description: bug.description,
      severity: bug.severity,
      priority: bug.priority,
      status: bug.status,
      category: bug.category,
      affectedFeature: bug.affected_feature,
      reproducible: bug.reproducible,
      stepsToReproduce: bug.steps_to_reproduce || [],
      expectedBehavior: bug.expected_behavior,
      actualBehavior: bug.actual_behavior,
      environment: bug.environment,
      reportedBy: bug.reported_by,
      assignedTo: bug.assigned_to,
      duplicateOf: bug.duplicate_of,
      fixedInVersion: bug.fixed_in_version,
      verifiedBy: bug.verified_by,
      createdAt: bug.created_at,
      updatedAt: bug.updated_at,
      resolvedAt: bug.resolved_at,
      verifiedAt: bug.verified_at,
    };
  }
}
