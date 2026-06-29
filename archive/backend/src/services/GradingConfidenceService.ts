/**
 * ScrollUniversity Grading Confidence Service
 * "Test everything; hold fast what is good" - 1 Thessalonians 5:21
 * 
 * Manages confidence scoring, review queues, and faculty overrides
 */

import { logger } from '../utils/productionLogger';
import { v4 as uuidv4 } from 'uuid';
import { cacheService } from './CacheService';
import {
    ReviewQueueItem,
    ReviewPriority,
    ReviewStatus,
    FacultyOverride,
    GradeAccuracyMetrics,
    AccuracyMetric,
    ConfidenceAnalysis,
    ConfidenceFactor
} from '../types/grading.types';

export class GradingConfidenceService {
    private readonly CONFIDENCE_THRESHOLD = 0.85;
    private readonly HIGH_PRIORITY_THRESHOLD = 0.5;
    private readonly URGENT_PRIORITY_THRESHOLD = 0.3;

    /**
     * Analyze confidence and determine if review is needed
     */
    analyzeConfidence(
        submissionId: string,
        grade: any,
        confidence: number,
        submissionType: 'code' | 'essay' | 'math'
    ): ConfidenceAnalysis {
        const factors: ConfidenceFactor[] = [];

        // Base confidence factor
        factors.push({
            factor: 'base_confidence',
            impact: confidence - 0.5,
            description: `Base AI confidence: ${(confidence * 100).toFixed(1)}%`
        });

        // Score extremes
        if (grade.overallScore < 40) {
            factors.push({
                factor: 'low_score',
                impact: -0.15,
                description: 'Very low score requires verification'
            });
        } else if (grade.overallScore > 95) {
            factors.push({
                factor: 'high_score',
                impact: -0.1,
                description: 'Exceptionally high score requires verification'
            });
        }

        // Type-specific factors
        if (submissionType === 'code') {
            this.addCodeConfidenceFactors(grade, factors);
        } else if (submissionType === 'essay') {
            this.addEssayConfidenceFactors(grade, factors);
        } else if (submissionType === 'math') {
            this.addMathConfidenceFactors(grade, factors);
        }

        // Determine recommendation
        let recommendation: 'auto_grade' | 'human_review' | 'escalate';
        if (confidence >= this.CONFIDENCE_THRESHOLD) {
            recommendation = 'auto_grade';
        } else if (confidence >= this.HIGH_PRIORITY_THRESHOLD) {
            recommendation = 'human_review';
        } else {
            recommendation = 'escalate';
        }

        const reasoning = this.generateRecommendationReasoning(factors, confidence);

        return {
            submissionId,
            confidence,
            factors,
            recommendation,
            reasoning
        };
    }

    /**
     * Add code-specific confidence factors
     */
    private addCodeConfidenceFactors(grade: any, factors: ConfidenceFactor[]): void {
        if (grade.testResults) {
            const passRate = grade.testResults.filter((r: any) => r.passed).length / grade.testResults.length;
            factors.push({
                factor: 'test_pass_rate',
                impact: passRate * 0.2 - 0.1,
                description: `Test pass rate: ${(passRate * 100).toFixed(1)}%`
            });
        }

        const criticalIssues = grade.lineByLineFeedback?.filter((f: any) => f.severity === 'error').length || 0;
        if (criticalIssues > 5) {
            factors.push({
                factor: 'critical_issues',
                impact: -0.15,
                description: `${criticalIssues} critical issues found`
            });
        }
    }

    /**
     * Add essay-specific confidence factors
     */
    private addEssayConfidenceFactors(grade: any, factors: ConfidenceFactor[]): void {
        // Check score variance
        const scores = [
            grade.thesisClarity,
            grade.argumentStructure,
            grade.evidenceQuality,
            grade.writingQuality,
            grade.citationAccuracy
        ];
        const variance = this.calculateVariance(scores);
        
        if (variance > 400) {
            factors.push({
                factor: 'score_variance',
                impact: -0.1,
                description: 'High variance in criteria scores suggests complexity'
            });
        }
    }

    /**
     * Add math-specific confidence factors
     */
    private addMathConfidenceFactors(grade: any, factors: ConfidenceFactor[]): void {
        const conceptualErrors = grade.stepByStepFeedback?.filter((f: any) => f.conceptError).length || 0;
        if (conceptualErrors > 2) {
            factors.push({
                factor: 'conceptual_errors',
                impact: -0.15,
                description: `${conceptualErrors} conceptual errors detected`
            });
        }

        const scoreDiff = Math.abs(grade.methodology - grade.correctness);
        if (scoreDiff > 30) {
            factors.push({
                factor: 'methodology_correctness_gap',
                impact: -0.1,
                description: 'Large gap between methodology and correctness scores'
            });
        }
    }

    /**
     * Generate recommendation reasoning
     */
    private generateRecommendationReasoning(factors: ConfidenceFactor[], confidence: number): string {
        const negativeFactors = factors.filter(f => f.impact < -0.05);
        const positiveFactors = factors.filter(f => f.impact > 0.05);

        let reasoning = `Confidence: ${(confidence * 100).toFixed(1)}%. `;

        if (negativeFactors.length > 0) {
            reasoning += `Concerns: ${negativeFactors.map(f => f.description).join('; ')}. `;
        }

        if (positiveFactors.length > 0) {
            reasoning += `Strengths: ${positiveFactors.map(f => f.description).join('; ')}.`;
        }

        return reasoning;
    }

    /**
     * Add submission to review queue
     */
    async addToReviewQueue(
        submissionId: string,
        assignmentId: string,
        studentId: string,
        submissionType: 'code' | 'essay' | 'math',
        aiGrade: any,
        confidence: number,
        reviewReason: string
    ): Promise<ReviewQueueItem> {
        const id = uuidv4();
        
        // Determine priority
        let priority: ReviewPriority;
        if (confidence < this.URGENT_PRIORITY_THRESHOLD) {
            priority = ReviewPriority.URGENT;
        } else if (confidence < this.HIGH_PRIORITY_THRESHOLD) {
            priority = ReviewPriority.HIGH;
        } else if (confidence < 0.7) {
            priority = ReviewPriority.MEDIUM;
        } else {
            priority = ReviewPriority.LOW;
        }

        const queueItem: ReviewQueueItem = {
            id,
            submissionId,
            assignmentId,
            studentId,
            submissionType,
            aiGrade,
            confidence,
            reviewReason,
            priority,
            status: ReviewStatus.PENDING,
            submittedAt: new Date(),
            addedToQueueAt: new Date()
        };

        // Store in cache (in production, this would be in database)
        await cacheService.set(`review:queue:${id}`, queueItem, {
            ttl: 86400 * 7, // 7 days
            tags: ['review-queue', `priority:${priority}`, `type:${submissionType}`]
        });

        // Add to priority queue
        await this.addToPriorityQueue(id, priority);

        logger.info('Added submission to review queue', {
            queueItemId: id,
            submissionId,
            priority,
            confidence
        });

        return queueItem;
    }

    /**
     * Add to priority queue
     */
    private async addToPriorityQueue(itemId: string, priority: ReviewPriority): Promise<void> {
        const queueKey = `review:queue:priority:${priority}`;
        const queue = await cacheService.get<string[]>(queueKey) || [];
        queue.push(itemId);
        await cacheService.set(queueKey, queue, { ttl: 86400 * 7 });
    }

    /**
     * Get review queue items
     */
    async getReviewQueue(
        filters?: {
            priority?: ReviewPriority;
            status?: ReviewStatus;
            submissionType?: 'code' | 'essay' | 'math';
            assignedTo?: string;
        }
    ): Promise<ReviewQueueItem[]> {
        // In production, this would query the database
        // For now, we'll use cache with tags
        const tags = ['review-queue'];
        
        if (filters?.priority) {
            tags.push(`priority:${filters.priority}`);
        }
        if (filters?.submissionType) {
            tags.push(`type:${filters.submissionType}`);
        }

        // This is a simplified implementation
        // In production, use proper database queries
        const allItems: ReviewQueueItem[] = [];
        
        // Get items from each priority queue
        for (const priority of Object.values(ReviewPriority)) {
            const queueKey = `review:queue:priority:${priority}`;
            const queue = await cacheService.get<string[]>(queueKey) || [];
            
            for (const itemId of queue) {
                const item = await cacheService.get<ReviewQueueItem>(`review:queue:${itemId}`);
                if (item) {
                    // Apply filters
                    if (filters?.status && item.status !== filters.status) continue;
                    if (filters?.submissionType && item.submissionType !== filters.submissionType) continue;
                    if (filters?.assignedTo && item.assignedReviewerId !== filters.assignedTo) continue;
                    
                    allItems.push(item);
                }
            }
        }

        // Sort by priority and date
        return allItems.sort((a, b) => {
            const priorityOrder = {
                [ReviewPriority.URGENT]: 0,
                [ReviewPriority.HIGH]: 1,
                [ReviewPriority.MEDIUM]: 2,
                [ReviewPriority.LOW]: 3
            };
            
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;
            
            return a.addedToQueueAt.getTime() - b.addedToQueueAt.getTime();
        });
    }

    /**
     * Assign review to faculty
     */
    async assignReview(queueItemId: string, facultyId: string): Promise<ReviewQueueItem> {
        const item = await cacheService.get<ReviewQueueItem>(`review:queue:${queueItemId}`);
        
        if (!item) {
            throw new Error('Review queue item not found');
        }

        item.assignedReviewerId = facultyId;
        item.status = ReviewStatus.IN_REVIEW;

        await cacheService.set(`review:queue:${queueItemId}`, item, {
            ttl: 86400 * 7,
            tags: ['review-queue', `priority:${item.priority}`, `type:${item.submissionType}`]
        });

        logger.info('Review assigned to faculty', {
            queueItemId,
            facultyId,
            submissionId: item.submissionId
        });

        return item;
    }

    /**
     * Submit faculty override
     */
    async submitFacultyOverride(
        queueItemId: string,
        facultyId: string,
        overriddenGrade: any,
        overrideReason: string,
        feedback: string
    ): Promise<FacultyOverride> {
        const item = await cacheService.get<ReviewQueueItem>(`review:queue:${queueItemId}`);
        
        if (!item) {
            throw new Error('Review queue item not found');
        }

        const override: FacultyOverride = {
            id: uuidv4(),
            reviewQueueItemId: queueItemId,
            facultyId,
            originalGrade: item.aiGrade,
            overriddenGrade,
            overrideReason,
            feedback,
            agreedWithAI: this.calculateAgreement(item.aiGrade, overriddenGrade),
            overriddenAt: new Date()
        };

        // Store override
        await cacheService.set(`review:override:${override.id}`, override, {
            ttl: 86400 * 30, // 30 days
            tags: ['faculty-override', `faculty:${facultyId}`]
        });

        // Update queue item
        item.status = ReviewStatus.COMPLETED;
        item.reviewedAt = new Date();
        await cacheService.set(`review:queue:${queueItemId}`, item, {
            ttl: 86400 * 7,
            tags: ['review-queue', `priority:${item.priority}`, `type:${item.submissionType}`]
        });

        // Track accuracy metrics
        await this.trackAccuracyMetric(item.submissionType, override.agreedWithAI, item.confidence);

        logger.info('Faculty override submitted', {
            overrideId: override.id,
            queueItemId,
            facultyId,
            agreedWithAI: override.agreedWithAI
        });

        return override;
    }

    /**
     * Calculate agreement between AI and faculty grades
     */
    private calculateAgreement(aiGrade: any, facultyGrade: any): boolean {
        const scoreDiff = Math.abs(aiGrade.overallScore - facultyGrade.overallScore);
        return scoreDiff <= 10; // Within 10 points is considered agreement
    }

    /**
     * Track accuracy metrics
     */
    private async trackAccuracyMetric(
        submissionType: 'code' | 'essay' | 'math',
        agreedWithAI: boolean,
        confidence: number
    ): Promise<void> {
        const metricsKey = `grading:accuracy:${submissionType}`;
        const metrics = await cacheService.get<any>(metricsKey) || {
            total: 0,
            reviewed: 0,
            agreed: 0,
            totalConfidence: 0
        };

        metrics.total += 1;
        metrics.reviewed += 1;
        if (agreedWithAI) {
            metrics.agreed += 1;
        }
        metrics.totalConfidence += confidence;

        await cacheService.set(metricsKey, metrics, { ttl: 86400 * 30 });
    }

    /**
     * Get accuracy metrics
     */
    async getAccuracyMetrics(period?: { start: Date; end: Date }): Promise<GradeAccuracyMetrics> {
        const codeMetrics = await this.getTypeAccuracyMetrics('code');
        const essayMetrics = await this.getTypeAccuracyMetrics('essay');
        const mathMetrics = await this.getTypeAccuracyMetrics('math');

        const totalGrades = codeMetrics.total + essayMetrics.total + mathMetrics.total;
        const totalReviewed = codeMetrics.reviewed + essayMetrics.reviewed + mathMetrics.reviewed;
        const totalAgreed = (codeMetrics.agreementRate * codeMetrics.reviewed +
                            essayMetrics.agreementRate * essayMetrics.reviewed +
                            mathMetrics.agreementRate * mathMetrics.reviewed) / totalReviewed;

        return {
            totalGrades,
            humanReviewedGrades: totalReviewed,
            aiAgreementRate: totalAgreed,
            averageConfidence: (codeMetrics.averageConfidence + essayMetrics.averageConfidence + mathMetrics.averageConfidence) / 3,
            bySubmissionType: {
                code: codeMetrics,
                essay: essayMetrics,
                math: mathMetrics
            },
            period: period || {
                start: new Date(Date.now() - 86400000 * 30),
                end: new Date()
            }
        };
    }

    /**
     * Get accuracy metrics for specific type
     */
    private async getTypeAccuracyMetrics(type: 'code' | 'essay' | 'math'): Promise<AccuracyMetric> {
        const metricsKey = `grading:accuracy:${type}`;
        const metrics = await cacheService.get<any>(metricsKey) || {
            total: 0,
            reviewed: 0,
            agreed: 0,
            totalConfidence: 0
        };

        return {
            total: metrics.total,
            reviewed: metrics.reviewed,
            agreementRate: metrics.reviewed > 0 ? metrics.agreed / metrics.reviewed : 0,
            averageConfidence: metrics.reviewed > 0 ? metrics.totalConfidence / metrics.reviewed : 0,
            averageScoreDifference: 0 // Would need to track this separately
        };
    }

    /**
     * Calculate variance
     */
    private calculateVariance(scores: number[]): number {
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;
    }
}

// Singleton instance
export const gradingConfidenceService = new GradingConfidenceService();
