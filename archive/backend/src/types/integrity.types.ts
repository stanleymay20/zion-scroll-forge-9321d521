/**
 * Academic Integrity System Types
 * "The LORD detests dishonest scales, but accurate weights find favor with him" - Proverbs 11:1
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type ViolationType = 
  | 'plagiarism' 
  | 'cheating' 
  | 'collusion' 
  | 'fabrication'
  | 'unauthorized_assistance' 
  | 'contract_cheating' 
  | 'ai_misuse' 
  | 'other';

export type ViolationSeverity = 'minor' | 'major' | 'severe';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ReviewOutcome = 'cleared' | 'warning' | 'violation';

export type Determination = 'innocent' | 'minor_violation' | 'major_violation' | 'severe_violation';

// ============================================================================
// PLAGIARISM DETECTION
// ============================================================================

export interface PlagiarismCheckRequest {
  submissionId: string;
  studentId: string;
  content: string;
  contentType: 'text' | 'code' | 'mixed';
  courseId?: string;
  assignmentId?: string;
}

export interface TurnitinResult {
  score: number;
  reportUrl: string;
  sources: TurnitinSource[];
  matchedSections: MatchedSection[];
}

export interface TurnitinSource {
  title: string;
  url: string;
  matchPercentage: number;
  publicationDate?: string;
  author?: string;
}

export interface MatchedSection {
  originalText: string;
  matchedText: string;
  sourceTitle: string;
  sourceUrl: string;
  startIndex: number;
  endIndex: number;
  similarity: number;
}

export interface VectorSimilarityResult {
  similarSubmissions: SimilarSubmission[];
  maxSimilarity: number;
  averageSimilarity: number;
}

export interface SimilarSubmission {
  submissionId: string;
  studentId: string;
  studentName: string;
  similarity: number;
  matchedSections: MatchedSection[];
  submittedAt: Date;
}

export interface PlagiarismReport {
  checkId: string;
  submissionId: string;
  studentId: string;
  turnitinScore?: number;
  turnitinReportUrl?: string;
  turnitinSources: TurnitinSource[];
  internalSimilarityScore: number;
  similarSubmissions: SimilarSubmission[];
  overallRiskLevel: RiskLevel;
  flagged: boolean;
  flagReasons: string[];
  checkedAt: Date;
}

// ============================================================================
// AI CONTENT DETECTION
// ============================================================================

export interface AIContentDetectionRequest {
  content: string;
  studentId: string;
  studentBaseline?: WritingStyle;
}

export interface AIContentDetectionResult {
  aiProbability: number;
  confidence: number;
  flaggedSections: FlaggedSection[];
  analysis: AIAnalysis;
  recommendation: 'clear' | 'review' | 'flag';
}

export interface FlaggedSection {
  text: string;
  startIndex: number;
  endIndex: number;
  aiProbability: number;
  reason: string;
}

export interface AIAnalysis {
  perplexity: number;
  burstiness: number;
  vocabularyComplexity: number;
  sentenceVariation: number;
  humanLikelihood: number;
  aiLikelihood: number;
}

export interface WritingStyle {
  vocabularyLevel: number;
  sentenceComplexity: number;
  paragraphStructure: string;
  commonPhrases: string[];
  errorPatterns: string[];
  writingSpeed: number; // words per hour
  averageWordLength: number;
  averageSentenceLength: number;
}

export interface StyleDeviationResult {
  deviationScore: number;
  baseline: WritingStyle;
  current: WritingStyle;
  significantDeviations: string[];
  flagged: boolean;
}

// ============================================================================
// COLLUSION DETECTION
// ============================================================================

export interface CollusionDetectionRequest {
  submissions: SubmissionForCollusion[];
  assignmentId: string;
  courseId: string;
}

export interface SubmissionForCollusion {
  submissionId: string;
  studentId: string;
  content: string;
  submittedAt: Date;
  embedding?: number[];
}

export interface CollusionDetectionResult {
  collusionPairs: CollusionPair[];
  suspiciousGroups: SuspiciousGroup[];
  overallRisk: RiskLevel;
}

export interface CollusionPair {
  submission1Id: string;
  submission2Id: string;
  student1Id: string;
  student2Id: string;
  similarityScore: number;
  structuralSimilarity: number;
  timingProximity: number; // minutes between submissions
  matchedSections: MatchedSection[];
  riskLevel: RiskLevel;
}

export interface SuspiciousGroup {
  submissionIds: string[];
  studentIds: string[];
  averageSimilarity: number;
  submissionTimeSpan: number; // minutes
  riskLevel: RiskLevel;
}

// ============================================================================
// PROCTORING
// ============================================================================

export interface ProctoringSessionRequest {
  studentId: string;
  examId: string;
  proctoringType: 'automated' | 'live' | 'recorded' | 'in_person';
}

export interface ProctoringSession {
  id: string;
  studentId: string;
  examId: string;
  proctoringType: string;
  sessionToken: string;
  idVerified: boolean;
  environmentVerified: boolean;
  flags: ProctoringFlag[];
  flagCount: number;
  integrityScore: number;
  riskLevel: RiskLevel;
  requiresReview: boolean;
  startedAt: Date;
  endedAt?: Date;
  durationMinutes?: number;
}

export interface ProctoringFlag {
  id: string;
  sessionId: string;
  flagType: string;
  severity: ViolationSeverity;
  description: string;
  timestamp: Date;
  videoTimestamp?: number;
  screenshotUrl?: string;
  aiConfidence: number;
}

export interface ProctoringAnalysisResult {
  flags: ProctoringFlag[];
  behaviorAnalysis: BehaviorAnalysis;
  integrityScore: number;
  riskLevel: RiskLevel;
  requiresReview: boolean;
  recommendations: string[];
}

export interface BehaviorAnalysis {
  eyeMovementPatterns: EyeMovementPattern[];
  suspiciousBehaviors: SuspiciousBehavior[];
  deviceDetection: DeviceDetection;
  environmentChanges: EnvironmentChange[];
}

export interface EyeMovementPattern {
  timestamp: Date;
  lookingAway: boolean;
  duration: number;
  direction?: string;
}

export interface SuspiciousBehavior {
  type: string;
  timestamp: Date;
  confidence: number;
  description: string;
}

export interface DeviceDetection {
  multipleDevicesDetected: boolean;
  devices: string[];
  confidence: number;
}

export interface EnvironmentChange {
  timestamp: Date;
  changeType: string;
  description: string;
}

// ============================================================================
// INTEGRITY VIOLATIONS
// ============================================================================

export interface IntegrityViolation {
  id: string;
  studentId: string;
  violationType: ViolationType;
  severity: ViolationSeverity;
  courseId?: string;
  assignmentId?: string;
  description: string;
  evidence: Record<string, any>;
  detectionMethod: string;
  reportedBy: string;
  reportedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  determination?: Determination;
  reviewNotes?: string;
  consequences: string[];
  appealFiled: boolean;
  appealStatus?: 'pending' | 'approved' | 'denied';
  restorationPlan?: Record<string, any>;
  restorationComplete: boolean;
}

export interface CreateViolationRequest {
  studentId: string;
  violationType: ViolationType;
  severity: ViolationSeverity;
  courseId?: string;
  assignmentId?: string;
  description: string;
  evidence: Record<string, any>;
  detectionMethod: string;
}

export interface EvidencePackage {
  violationId: string;
  studentId: string;
  violationType: ViolationType;
  severity: ViolationSeverity;
  plagiarismReport?: PlagiarismReport;
  aiDetectionResult?: AIContentDetectionResult;
  collusionResult?: CollusionDetectionResult;
  proctoringSession?: ProctoringSession;
  additionalEvidence: Record<string, any>;
  summary: string;
  recommendations: string[];
  generatedAt: Date;
}

// ============================================================================
// INTEGRITY SERVICE RESPONSES
// ============================================================================

export interface IntegrityCheckResult {
  submissionId: string;
  studentId: string;
  overallRiskLevel: RiskLevel;
  integrityScore: number;
  flagged: boolean;
  checks: {
    plagiarism?: PlagiarismReport;
    aiContent?: AIContentDetectionResult;
    styleDeviation?: StyleDeviationResult;
    collusion?: CollusionDetectionResult;
  };
  recommendations: string[];
  requiresHumanReview: boolean;
  checkedAt: Date;
}

export interface IntegrityDashboardMetrics {
  totalChecks: number;
  flaggedSubmissions: number;
  violationsDetected: number;
  falsePositiveRate: number;
  averageProcessingTime: number;
  violationsByType: Record<ViolationType, number>;
  violationsBySeverity: Record<ViolationSeverity, number>;
  riskDistribution: Record<RiskLevel, number>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface IntegrityConfig {
  plagiarism: {
    turnitinEnabled: boolean;
    turnitinApiKey?: string;
    similarityThreshold: number;
    flagThreshold: number;
  };
  aiDetection: {
    gptZeroEnabled: boolean;
    gptZeroApiKey?: string;
    customModelEnabled: boolean;
    probabilityThreshold: number;
  };
  collusion: {
    enabled: boolean;
    similarityThreshold: number;
    timingThreshold: number; // minutes
  };
  proctoring: {
    enabled: boolean;
    requireIdVerification: boolean;
    requireEnvironmentScan: boolean;
    flagThreshold: number;
  };
  general: {
    autoFlagEnabled: boolean;
    humanReviewThreshold: number;
    confidenceThreshold: number;
  };
}
