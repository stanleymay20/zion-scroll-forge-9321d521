/**
 * Accessibility AI System Types
 * WCAG 2.1 AA Compliance and Accommodation Management
 */

export interface AltTextRequest {
  imageUrl: string;
  context?: string;
  courseId?: string;
  contentType?: 'diagram' | 'photo' | 'chart' | 'illustration' | 'screenshot';
}

export interface AltTextResult {
  altText: string;
  longDescription?: string;
  confidence: number;
  qualityScore: number;
  suggestions?: string[];
  wcagCompliant: boolean;
}

export interface CaptionRequest {
  videoUrl?: string;
  audioUrl?: string;
  audioBuffer?: Buffer;
  language?: string;
  includeSpeakerIdentification?: boolean;
}

export interface CaptionSegment {
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  confidence: number;
}

export interface CaptionResult {
  segments: CaptionSegment[];
  fullTranscript: string;
  vttFormat: string;
  srtFormat: string;
  confidence: number;
  language: string;
  speakers?: string[];
}

export interface ComplianceCheckRequest {
  contentUrl?: string;
  htmlContent?: string;
  contentType: 'webpage' | 'document' | 'course' | 'assessment';
  wcagLevel?: 'A' | 'AA' | 'AAA';
}

export interface AccessibilityViolation {
  type: 'missing_alt' | 'color_contrast' | 'heading_structure' | 'missing_label' | 'keyboard_access' | 'aria_invalid' | 'other';
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  element?: string;
  description: string;
  wcagCriterion: string;
  recommendation: string;
  canAutoFix: boolean;
}

export interface ComplianceReport {
  wcagLevel: 'A' | 'AA' | 'AAA';
  overallScore: number;
  violations: AccessibilityViolation[];
  passedChecks: number;
  totalChecks: number;
  automatedFixes: AutomatedFix[];
  manualReviewNeeded: boolean;
  summary: string;
}

export interface AutomatedFix {
  violationType: string;
  element?: string;
  originalValue?: string;
  fixedValue: string;
  applied: boolean;
  description: string;
}

export interface AccommodationRequest {
  studentId: string;
  disability: DisabilityType;
  courseId: string;
  assessmentId?: string;
  specificNeeds?: string[];
}

export type DisabilityType = 
  | 'visual_impairment'
  | 'hearing_impairment'
  | 'motor_impairment'
  | 'cognitive_disability'
  | 'learning_disability'
  | 'other';

export interface Accommodation {
  type: AccommodationType;
  description: string;
  implementation: string;
  priority: 'required' | 'recommended' | 'optional';
  estimatedEffort: 'low' | 'medium' | 'high';
}

export type AccommodationType =
  | 'extended_time'
  | 'alternative_format'
  | 'screen_reader_compatible'
  | 'captions_transcripts'
  | 'simplified_interface'
  | 'keyboard_navigation'
  | 'text_to_speech'
  | 'speech_to_text'
  | 'reduced_distractions'
  | 'frequent_breaks'
  | 'other';

export interface AccommodationRecommendation {
  studentId: string;
  courseId: string;
  assessmentId?: string;
  accommodations: Accommodation[];
  modifiedContent?: ModifiedContent;
  trackingId: string;
  approvalStatus: 'pending' | 'approved' | 'implemented';
}

export interface ModifiedContent {
  originalContentId: string;
  modifiedContentId: string;
  modificationType: string;
  changes: string[];
  accessibilityImprovements: string[];
}

export interface AccommodationUsageTracking {
  trackingId: string;
  studentId: string;
  accommodationType: AccommodationType;
  usageCount: number;
  effectiveness: number;
  studentFeedback?: string;
  lastUsed: Date;
}

export interface AccessibilityAuditLog {
  id: string;
  action: 'alt_text_generated' | 'captions_generated' | 'compliance_check' | 'automated_fix' | 'accommodation_recommended';
  contentId: string;
  userId?: string;
  result: any;
  timestamp: Date;
  cost: number;
}
