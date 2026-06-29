/**
 * ScrollUniversity Grading Types
 * "Whatever you do, work at it with all your heart" - Colossians 3:23
 */

export interface ReviewQueueItem {
    id: string;
    submissionId: string;
    assignmentId: string;
    studentId: string;
    submissionType: 'code' | 'essay' | 'math';
    aiGrade: any;
    confidence: number;
    reviewReason: string;
    priority: ReviewPriority;
    status: ReviewStatus;
    assignedReviewerId?: string;
    submittedAt: Date;
    addedToQueueAt: Date;
    reviewedAt?: Date;
}

export enum ReviewPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent'
}

export enum ReviewStatus {
    PENDING = 'pending',
    IN_REVIEW = 'in_review',
    COMPLETED = 'completed',
    ESCALATED = 'escalated'
}

export interface FacultyOverride {
    id: string;
    reviewQueueItemId: string;
    facultyId: string;
    originalGrade: any;
    overriddenGrade: any;
    overrideReason: string;
    feedback: string;
    agreedWithAI: boolean;
    overriddenAt: Date;
}

export interface GradeAccuracyMetrics {
    totalGrades: number;
    humanReviewedGrades: number;
    aiAgreementRate: number;
    averageConfidence: number;
    bySubmissionType: {
        code: AccuracyMetric;
        essay: AccuracyMetric;
        math: AccuracyMetric;
    };
    period: {
        start: Date;
        end: Date;
    };
}

export interface AccuracyMetric {
    total: number;
    reviewed: number;
    agreementRate: number;
    averageConfidence: number;
    averageScoreDifference: number;
}

export interface ConfidenceAnalysis {
    submissionId: string;
    confidence: number;
    factors: ConfidenceFactor[];
    recommendation: 'auto_grade' | 'human_review' | 'escalate';
    reasoning: string;
}

export interface ConfidenceFactor {
    factor: string;
    impact: number; // -1 to 1
    description: string;
}
