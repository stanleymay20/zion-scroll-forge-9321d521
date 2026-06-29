/**
 * Quality Assurance Types
 * Types for AI service testing and quality metrics
 */

export interface TestCase {
  id: string;
  serviceType: AIServiceType;
  input: any;
  expectedOutput: any;
  category: TestCategory;
  difficulty: 'easy' | 'medium' | 'hard' | 'edge_case';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GroundTruthDataset {
  id: string;
  serviceType: AIServiceType;
  testCases: TestCase[];
  version: string;
  description: string;
  createdBy: string;
  createdAt: Date;
}

export interface TestResult {
  testCaseId: string;
  actualOutput: any;
  passed: boolean;
  accuracy: number;
  confidence: number;
  responseTime: number;
  cost: number;
  errors?: string[];
  timestamp: Date;
}

export interface QualityMetrics {
  serviceType: AIServiceType;
  accuracy: number;
  confidence: number;
  humanAgreement: number;
  theologicalAlignment: number;
  responseTime: number;
  costPerRequest: number;
  errorRate: number;
  period: {
    start: Date;
    end: Date;
  };
}

export interface TheologicalAlignment {
  score: number;
  concerns: TheologicalConcern[];
  approved: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface TheologicalConcern {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'doctrinal' | 'ethical' | 'scriptural' | 'cultural';
  description: string;
  location: string;
  recommendation: string;
}

export interface ReviewWorkflow {
  id: string;
  itemId: string;
  itemType: ReviewItemType;
  status: ReviewStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  submittedBy: string;
  submittedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  outcome?: ReviewOutcome;
  feedback?: string;
}

export interface ReviewOutcome {
  decision: 'approved' | 'approved_with_changes' | 'rejected' | 'needs_revision';
  changes?: string[];
  reasoning: string;
  qualityScore?: number;
}

export interface ContinuousImprovement {
  serviceType: AIServiceType;
  improvements: Improvement[];
  metrics: QualityMetrics[];
  trends: MetricTrend[];
}

export interface Improvement {
  id: string;
  type: 'prompt' | 'model' | 'configuration' | 'workflow';
  description: string;
  implementedAt: Date;
  impactMetrics: {
    before: QualityMetrics;
    after: QualityMetrics;
    improvement: number;
  };
}

export interface MetricTrend {
  metric: string;
  values: number[];
  timestamps: Date[];
  trend: 'improving' | 'declining' | 'stable';
  changeRate: number;
}

export type AIServiceType =
  | 'content_creation'
  | 'grading'
  | 'chatbot'
  | 'personalization'
  | 'integrity'
  | 'admissions'
  | 'research'
  | 'course_recommendation'
  | 'faculty_support'
  | 'translation'
  | 'spiritual_formation'
  | 'fundraising'
  | 'career_services'
  | 'moderation'
  | 'accessibility';

export type TestCategory =
  | 'functional'
  | 'performance'
  | 'accuracy'
  | 'theological'
  | 'edge_case'
  | 'integration'
  | 'security';

export type ReviewItemType =
  | 'ai_response'
  | 'generated_content'
  | 'grading_result'
  | 'theological_content'
  | 'moderation_decision'
  | 'admission_decision';

export type ReviewStatus =
  | 'pending'
  | 'in_review'
  | 'completed'
  | 'escalated';

export interface QualityThresholds {
  minAccuracy: number;
  minConfidence: number;
  minHumanAgreement: number;
  minTheologicalAlignment: number;
  maxResponseTime: number;
  maxCostPerRequest: number;
  maxErrorRate: number;
}

export const DEFAULT_QUALITY_THRESHOLDS: QualityThresholds = {
  minAccuracy: 0.90,
  minConfidence: 0.85,
  minHumanAgreement: 0.85,
  minTheologicalAlignment: 0.95,
  maxResponseTime: 5000,
  maxCostPerRequest: 2.00,
  maxErrorRate: 0.05,
};
