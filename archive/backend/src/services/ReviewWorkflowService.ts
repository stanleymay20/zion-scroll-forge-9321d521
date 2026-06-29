/**
 * Review Workflow Service
 * Manages human review workflows for AI-generated content
 */

import { PrismaClient } from '@prisma/client';
import {
  ReviewWorkflow,
  ReviewOutcome,
  ReviewItemType,
  ReviewStatus,
  AIServiceType,
} from '../types/qa.types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export default class ReviewWorkflowService {
  /**
   * Create a review workflow item
   */
  async createReviewItem(
    item: Omit<ReviewWorkflow, 'id' | 'submittedAt'>
  ): Promise<ReviewWorkflow> {
    try {
      const created = await prisma.aIReviewWorkflow.create({
        data: {
          itemId: item.itemId,
          itemType: item.itemType,
          serviceType: item.serviceType as string,
          status: item.status,
          priority: item.priority,
          assignedTo: item.assignedTo,
          submittedBy: item.submittedBy,
          metadata: {} as any,
        },
      });

      logger.info('Review workflow item created', {
        reviewId: created.id,
        itemType: item.itemType,
        priority: item.priority,
      });

      return this.mapToReviewWorkflow(created);
    } catch (error) {
      logger.error('Error creating review workflow item', { error });
      throw error;
    }
  }

  /**
   * Get pending review items for a reviewer
   */
  async getPendingReviews(
    reviewerId: string,
    options?: {
      itemType?: ReviewItemType;
      priority?: string;
      limit?: number;
    }
  ): Promise<ReviewWorkflow[]> {
    try {
      const items = await prisma.aIReviewWorkflow.findMany({
        where: {
          assignedTo: reviewerId,
          status: { in: ['pending', 'in_review'] },
          ...(options?.itemType && { itemType: options.itemType }),
          ...(options?.priority && { priority: options.priority }),
        },
        orderBy: [
          { priority: 'desc' },
          { submittedAt: 'asc' },
        ],
        take: options?.limit || 50,
      });

      return items.map(item => this.mapToReviewWorkflow(item));
    } catch (error) {
      logger.error('Error fetching pending reviews', { error, reviewerId });
      throw error;
    }
  }

  /**
   * Get all pending reviews (for admin)
   */
  async getAllPendingReviews(options?: {
    itemType?: ReviewItemType;
    serviceType?: AIServiceType;
    priority?: string;
    limit?: number;
  }): Promise<ReviewWorkflow[]> {
    try {
      const items = await prisma.aIReviewWorkflow.findMany({
        where: {
          status: { in: ['pending', 'in_review'] },
          ...(options?.itemType && { itemType: options.itemType }),
          ...(options?.serviceType && { serviceType: options.serviceType }),
          ...(options?.priority && { priority: options.priority }),
        },
        orderBy: [
          { priority: 'desc' },
          { submittedAt: 'asc' },
        ],
        take: options?.limit || 100,
      });

      return items.map(item => this.mapToReviewWorkflow(item));
    } catch (error) {
      logger.error('Error fetching all pending reviews', { error });
      throw error;
    }
  }

  /**
   * Start reviewing an item
   */
  async startReview(reviewId: string, reviewerId: string): Promise<void> {
    try {
      await prisma.aIReviewWorkflow.update({
        where: { id: reviewId },
        data: {
          status: 'in_review',
          assignedTo: reviewerId,
        },
      });

      logger.info('Review started', { reviewId, reviewerId });
    } catch (error) {
      logger.error('Error starting review', { error, reviewId });
      throw error;
    }
  }

  /**
   * Complete a review
   */
  async completeReview(
    reviewId: string,
    reviewerId: string,
    outcome: ReviewOutcome
  ): Promise<void> {
    try {
      await prisma.aIReviewWorkflow.update({
        where: { id: reviewId },
        data: {
          status: 'completed',
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          outcome: outcome as any,
        },
      });

      // Use feedback to improve AI
      await this.processFeedback(reviewId, outcome);

      logger.info('Review completed', {
        reviewId,
        reviewerId,
        decision: outcome.decision,
      });
    } catch (error) {
      logger.error('Error completing review', { error, reviewId });
      throw error;
    }
  }

  /**
   * Escalate a review
   */
  async escalateReview(
    reviewId: string,
    reason: string,
    escalateTo?: string
  ): Promise<void> {
    try {
      await prisma.aIReviewWorkflow.update({
        where: { id: reviewId },
        data: {
          status: 'escalated',
          priority: 'urgent',
          ...(escalateTo && { assignedTo: escalateTo }),
          metadata: {
            escalationReason: reason,
            escalatedAt: new Date(),
          } as any,
        },
      });

      logger.info('Review escalated', { reviewId, reason });
    } catch (error) {
      logger.error('Error escalating review', { error, reviewId });
      throw error;
    }
  }

  /**
   * Reassign a review
   */
  async reassignReview(
    reviewId: string,
    newReviewerId: string,
    reason?: string
  ): Promise<void> {
    try {
      await prisma.aIReviewWorkflow.update({
        where: { id: reviewId },
        data: {
          assignedTo: newReviewerId,
          metadata: {
            reassignmentReason: reason,
            reassignedAt: new Date(),
          } as any,
        },
      });

      logger.info('Review reassigned', { reviewId, newReviewerId });
    } catch (error) {
      logger.error('Error reassigning review', { error, reviewId });
      throw error;
    }
  }

  /**
   * Get review statistics
   */
  async getReviewStatistics(
    reviewerId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    pending: number;
    inReview: number;
    completed: number;
    escalated: number;
    averageReviewTime: number;
    approvalRate: number;
    byItemType: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    try {
      const where: any = {};
      if (reviewerId) where.reviewedBy = reviewerId;
      if (startDate || endDate) {
        where.submittedAt = {};
        if (startDate) where.submittedAt.gte = startDate;
        if (endDate) where.submittedAt.lte = endDate;
      }

      const [total, pending, inReview, completed, escalated, items] = await Promise.all([
        prisma.aIReviewWorkflow.count({ where }),
        prisma.aIReviewWorkflow.count({ where: { ...where, status: 'pending' } }),
        prisma.aIReviewWorkflow.count({ where: { ...where, status: 'in_review' } }),
        prisma.aIReviewWorkflow.count({ where: { ...where, status: 'completed' } }),
        prisma.aIReviewWorkflow.count({ where: { ...where, status: 'escalated' } }),
        prisma.aIReviewWorkflow.findMany({ where }),
      ]);

      // Calculate average review time
      const completedItems = items.filter(
        i => i.status === 'completed' && i.reviewedAt
      );
      const reviewTimes = completedItems.map(
        i => i.reviewedAt!.getTime() - i.submittedAt.getTime()
      );
      const averageReviewTime =
        reviewTimes.length > 0
          ? reviewTimes.reduce((sum, time) => sum + time, 0) / reviewTimes.length
          : 0;

      // Calculate approval rate
      const approvedItems = completedItems.filter(i => {
        const outcome = i.outcome as any;
        return outcome?.decision === 'approved' || outcome?.decision === 'approved_with_changes';
      });
      const approvalRate = completedItems.length > 0
        ? approvedItems.length / completedItems.length
        : 0;

      // Group by item type
      const byItemType: Record<string, number> = {};
      items.forEach(item => {
        byItemType[item.itemType] = (byItemType[item.itemType] || 0) + 1;
      });

      // Group by priority
      const byPriority: Record<string, number> = {};
      items.forEach(item => {
        byPriority[item.priority] = (byPriority[item.priority] || 0) + 1;
      });

      return {
        total,
        pending,
        inReview,
        completed,
        escalated,
        averageReviewTime: averageReviewTime / 1000 / 60, // Convert to minutes
        approvalRate,
        byItemType,
        byPriority,
      };
    } catch (error) {
      logger.error('Error getting review statistics', { error });
      throw error;
    }
  }

  /**
   * Get review history for an item
   */
  async getItemReviewHistory(itemId: string): Promise<ReviewWorkflow[]> {
    try {
      const items = await prisma.aIReviewWorkflow.findMany({
        where: { itemId },
        orderBy: { submittedAt: 'desc' },
      });

      return items.map(item => this.mapToReviewWorkflow(item));
    } catch (error) {
      logger.error('Error fetching item review history', { error, itemId });
      throw error;
    }
  }

  /**
   * Auto-assign reviews based on workload and expertise
   */
  async autoAssignReviews(): Promise<number> {
    try {
      // Get unassigned pending reviews
      const unassignedReviews = await prisma.aIReviewWorkflow.findMany({
        where: {
          status: 'pending',
          assignedTo: null,
        },
        orderBy: [
          { priority: 'desc' },
          { submittedAt: 'asc' },
        ],
      });

      if (unassignedReviews.length === 0) {
        return 0;
      }

      // Get available reviewers
      const reviewers = await prisma.user.findMany({
        where: {
          role: { in: ['FACULTY', 'ADMIN'] },
        },
      });

      // Calculate current workload for each reviewer
      const workloads = await Promise.all(
        reviewers.map(async reviewer => {
          const pending = await prisma.aIReviewWorkflow.count({
            where: {
              assignedTo: reviewer.id,
              status: { in: ['pending', 'in_review'] },
            },
          });
          return { reviewerId: reviewer.id, workload: pending };
        })
      );

      // Sort by workload (ascending)
      workloads.sort((a, b) => a.workload - b.workload);

      // Assign reviews in round-robin fashion
      let assignedCount = 0;
      for (let i = 0; i < unassignedReviews.length; i++) {
        const review = unassignedReviews[i];
        const reviewer = workloads[i % workloads.length];

        await prisma.aIReviewWorkflow.update({
          where: { id: review.id },
          data: { assignedTo: reviewer.reviewerId },
        });

        assignedCount++;
      }

      logger.info('Reviews auto-assigned', { count: assignedCount });

      return assignedCount;
    } catch (error) {
      logger.error('Error auto-assigning reviews', { error });
      throw error;
    }
  }

  // Private helper methods

  private mapToReviewWorkflow(item: any): ReviewWorkflow {
    return {
      id: item.id,
      itemId: item.itemId,
      itemType: item.itemType as ReviewItemType,
      status: item.status as ReviewStatus,
      priority: item.priority as 'low' | 'medium' | 'high' | 'urgent',
      assignedTo: item.assignedTo || undefined,
      submittedBy: item.submittedBy,
      submittedAt: item.submittedAt,
      reviewedBy: item.reviewedBy || undefined,
      reviewedAt: item.reviewedAt || undefined,
      outcome: item.outcome as ReviewOutcome | undefined,
      feedback: item.feedback || undefined,
    };
  }

  private async processFeedback(reviewId: string, outcome: ReviewOutcome): Promise<void> {
    try {
      // Get the review item
      const review = await prisma.aIReviewWorkflow.findUnique({
        where: { id: reviewId },
      });

      if (!review) return;

      // Store feedback for continuous improvement
      await prisma.aIReviewFeedback.create({
        data: {
          reviewId,
          serviceType: review.serviceType,
          itemType: review.itemType,
          decision: outcome.decision,
          qualityScore: outcome.qualityScore || null,
          feedback: outcome.reasoning,
          changes: outcome.changes || [],
        },
      });

      // If rejected or needs revision, analyze patterns
      if (outcome.decision === 'rejected' || outcome.decision === 'needs_revision') {
        await this.analyzeRejectionPatterns(review.serviceType);
      }

      logger.info('Review feedback processed', { reviewId, decision: outcome.decision });
    } catch (error) {
      logger.error('Error processing review feedback', { error, reviewId });
      // Don't throw - this is a non-critical operation
    }
  }

  private async analyzeRejectionPatterns(serviceType: string): Promise<void> {
    try {
      // Get recent rejections
      const recentFeedback = await prisma.aIReviewFeedback.findMany({
        where: {
          serviceType,
          decision: { in: ['rejected', 'needs_revision'] },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        take: 100,
      });

      if (recentFeedback.length < 10) return;

      // Analyze common issues
      const issueMap = new Map<string, number>();
      recentFeedback.forEach(feedback => {
        const changes = feedback.changes as string[];
        changes.forEach(change => {
          issueMap.set(change, (issueMap.get(change) || 0) + 1);
        });
      });

      // Log common issues for improvement
      const commonIssues = Array.from(issueMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      logger.info('Common rejection patterns identified', {
        serviceType,
        issues: commonIssues,
      });

      // TODO: Use this data to improve prompts and models
    } catch (error) {
      logger.error('Error analyzing rejection patterns', { error });
    }
  }

  /**
   * Get reviewer performance metrics
   */
  async getReviewerPerformance(
    reviewerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalReviews: number;
    averageReviewTime: number;
    approvalRate: number;
    qualityScore: number;
    feedbackQuality: number;
  }> {
    try {
      const where: any = { reviewedBy: reviewerId };
      if (startDate || endDate) {
        where.reviewedAt = {};
        if (startDate) where.reviewedAt.gte = startDate;
        if (endDate) where.reviewedAt.lte = endDate;
      }

      const reviews = await prisma.aIReviewWorkflow.findMany({
        where,
        include: {
          feedback: true,
        },
      });

      const totalReviews = reviews.length;

      // Calculate average review time
      const reviewTimes = reviews
        .filter(r => r.reviewedAt)
        .map(r => r.reviewedAt!.getTime() - r.submittedAt.getTime());
      const averageReviewTime =
        reviewTimes.length > 0
          ? reviewTimes.reduce((sum, time) => sum + time, 0) / reviewTimes.length / 1000 / 60
          : 0;

      // Calculate approval rate
      const approvedReviews = reviews.filter(r => {
        const outcome = r.outcome as any;
        return outcome?.decision === 'approved' || outcome?.decision === 'approved_with_changes';
      });
      const approvalRate = totalReviews > 0 ? approvedReviews.length / totalReviews : 0;

      // Calculate quality score (based on outcome quality scores)
      const qualityScores = reviews
        .map(r => (r.outcome as any)?.qualityScore)
        .filter(s => s !== undefined && s !== null);
      const qualityScore =
        qualityScores.length > 0
          ? qualityScores.reduce((sum: number, score: number) => sum + score, 0) / qualityScores.length
          : 0;

      // Calculate feedback quality (length and detail of feedback)
      const feedbackLengths = reviews
        .map(r => (r.outcome as any)?.reasoning?.length || 0)
        .filter(l => l > 0);
      const feedbackQuality =
        feedbackLengths.length > 0
          ? Math.min(1, feedbackLengths.reduce((sum, len) => sum + len, 0) / feedbackLengths.length / 200)
          : 0;

      return {
        totalReviews,
        averageReviewTime,
        approvalRate,
        qualityScore,
        feedbackQuality,
      };
    } catch (error) {
      logger.error('Error getting reviewer performance', { error, reviewerId });
      throw error;
    }
  }
}
