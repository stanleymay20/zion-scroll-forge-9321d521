/**
 * Content Moderation System Types
 * Defines interfaces for AI-powered content moderation and community safety
 */

export type ViolationType = 
  | 'inappropriate_language'
  | 'bullying'
  | 'harassment'
  | 'hate_speech'
  | 'spam'
  | 'theological_error'
  | 'doctrinal_concern'
  | 'divisive_content'
  | 'policy_violation'
  | 'other';

export type ViolationSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ModerationAction = 
  | 'approve'
  | 'warn'
  | 'edit'
  | 'remove'
  | 'suspend_temporary'
  | 'suspend_permanent'
  | 'escalate';

export type ContentType = 
  | 'post'
  | 'comment'
  | 'discussion'
  | 'message'
  | 'assignment'
  | 'review';

export type ToneSentiment = 
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'hostile'
  | 'constructive'
  | 'destructive';

export type AppealStatus = 
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'denied'
  | 'escalated';

export interface UserContent {
  id: string;
  userId: string;
  contentType: ContentType;
  content: string;
  metadata?: {
    courseId?: string;
    discussionId?: string;
    parentId?: string;
    [key: string]: any;
  };
  timestamp: Date;
}

export interface Violation {
  type: ViolationType;
  severity: ViolationSeverity;
  description: string;
  evidence: string[];
  confidence: number;
  flaggedSections?: {
    text: string;
    startIndex: number;
    endIndex: number;
    reason: string;
  }[];
}

export interface ModerationResult {
  contentId: string;
  approved: boolean;
  violations: Violation[];
  overallSeverity: ViolationSeverity;
  recommendedAction: ModerationAction;
  reasoning: string;
  confidence: number;
  requiresHumanReview: boolean;
  timestamp: Date;
}

export interface TheologicalReview {
  contentId: string;
  hasDoctrinalError: boolean;
  concerns: {
    statement: string;
    issue: string;
    severity: ViolationSeverity;
    scriptureReference?: string;
    statementOfFaithReference?: string;
  }[];
  overallAlignment: number;
  requiresAdvisorReview: boolean;
  suggestedCorrections?: string[];
  confidence: number;
}

export interface ToneAnalysis {
  contentId: string;
  sentiment: ToneSentiment;
  emotionalTone: {
    anger: number;
    joy: number;
    sadness: number;
    fear: number;
    disgust: number;
  };
  isConstructive: boolean;
  isDivisive: boolean;
  isHostile: boolean;
  encouragementScore: number;
  respectScore: number;
  clarityScore: number;
  suggestions: string[];
  confidence: number;
}

export interface ModerationActionRecommendation {
  contentId: string;
  action: ModerationAction;
  reasoning: string[];
  alternativeActions: {
    action: ModerationAction;
    reasoning: string;
    appropriateWhen: string;
  }[];
  warningMessage?: string;
  removalExplanation?: string;
  suspensionDuration?: number;
  escalationReason?: string;
  confidence: number;
}

export interface ModerationAppeal {
  id: string;
  moderationId: string;
  userId: string;
  contentId: string;
  originalAction: ModerationAction;
  appealReason: string;
  status: AppealStatus;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  outcome?: {
    decision: 'upheld' | 'overturned' | 'modified';
    newAction?: ModerationAction;
    explanation: string;
  };
  aiContext?: {
    originalViolations: Violation[];
    originalConfidence: number;
    appealAnalysis: string;
  };
}

export interface ModerationHistory {
  userId: string;
  totalViolations: number;
  violationsByType: Record<ViolationType, number>;
  violationsBySeverity: Record<ViolationSeverity, number>;
  actionsTaken: Record<ModerationAction, number>;
  appealsSubmitted: number;
  appealsSuccessful: number;
  lastViolation?: Date;
  currentSuspension?: {
    startDate: Date;
    endDate?: Date;
    reason: string;
  };
  riskScore: number;
}

export interface ContentScanRequest {
  content: UserContent;
  context?: {
    userHistory?: ModerationHistory;
    courseContext?: any;
    communityGuidelines?: string[];
  };
  scanOptions?: {
    checkLanguage?: boolean;
    checkTheology?: boolean;
    checkTone?: boolean;
    urgentOnly?: boolean;
  };
}

export interface ContentScanResult {
  contentId: string;
  scanned: boolean;
  violations: Violation[];
  theologicalReview?: TheologicalReview;
  toneAnalysis?: ToneAnalysis;
  moderationResult: ModerationResult;
  actionRecommendation: ModerationActionRecommendation;
  processingTime: number;
  cost: number;
}

export interface ModerationMetrics {
  totalContentScanned: number;
  violationsDetected: number;
  violationsByType: Record<ViolationType, number>;
  violationsBySeverity: Record<ViolationSeverity, number>;
  actionsTaken: Record<ModerationAction, number>;
  humanReviewRate: number;
  averageConfidence: number;
  averageProcessingTime: number;
  appealRate: number;
  appealSuccessRate: number;
  falsePositiveRate: number;
  accuracyScore: number;
}

export interface StatementOfFaith {
  id: string;
  section: string;
  statement: string;
  scriptureReferences: string[];
  keywords: string[];
}

export interface CommunityGuideline {
  id: string;
  category: string;
  guideline: string;
  examples: string[];
  violationType: ViolationType;
  severity: ViolationSeverity;
}
