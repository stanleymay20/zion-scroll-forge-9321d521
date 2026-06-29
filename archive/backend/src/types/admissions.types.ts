/**
 * ScrollUniversity Admissions Application System Types
 * "Many are called, but few are chosen" - Matthew 22:14
 * 
 * Type definitions for the comprehensive admissions application system
 */

import { 
  ApplicationStatus, 
  ProgramType, 
  AdmissionDecisionType,
  EligibilityStatus,
  MaturityLevel,
  EvaluatorType,
  InterviewType,
  InterviewFormat,
  InterviewStatus,
  RecommendationType,
  AppealStatus,
  WaitlistPriority,
  WaitlistStatus,
  DocumentType,
  FraudRiskLevel
} from '@prisma/client';

// ============================================================================
// APPLICATION FORM BUILDER TYPES
// ============================================================================

export interface DynamicFormField {
  id: string;
  fieldType: 'text' | 'textarea' | 'select' | 'multiselect' | 'date' | 'file' | 'checkbox' | 'radio' | 'number' | 'email' | 'phone';
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: FieldValidation;
  options?: string[]; // For select/radio/checkbox
  conditionalDisplay?: ConditionalLogic;
  helpText?: string;
  order: number;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  fileTypes?: string[];
  maxFileSize?: number; // in MB
  customValidation?: string; // Function name for custom validation
}

export interface ConditionalLogic {
  dependsOn: string; // Field ID
  condition: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
  value: any;
}

export interface ApplicationFormTemplate {
  id: string;
  name: string;
  programType: ProgramType;
  sections: FormSection[];
  isActive: boolean;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: DynamicFormField[];
  order: number;
}

export interface ApplicationFormData {
  applicationId: string;
  formTemplateId: string;
  responses: Record<string, any>;
  completionPercentage: number;
  lastSavedAt: Date;
}

// ============================================================================
// DOCUMENT UPLOAD AND VERIFICATION TYPES
// ============================================================================

export interface DocumentUploadRequest {
  applicationId: string;
  documentType: DocumentType;
  file: File | Buffer;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface DocumentUploadResult {
  documentId: string;
  documentUrl: string;
  uploadedAt: Date;
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

export interface DocumentVerificationRequest {
  documentId: string;
  documentType: DocumentType;
  documentUrl: string;
  applicationId: string;
}

export interface DocumentVerificationResult {
  documentId: string;
  isAuthentic: boolean;
  verificationScore: number;
  fraudRiskLevel: FraudRiskLevel;
  verificationMethod: string;
  flaggedIssues: string[];
  verifiedAt: Date;
  verificationNotes?: string;
}

export interface ApplicationDocument {
  id: string;
  applicationId: string;
  documentType: DocumentType;
  documentUrl: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationResult?: DocumentVerificationResult;
}

// ============================================================================
// ELIGIBILITY ASSESSMENT TYPES
// ============================================================================

export interface EligibilityAssessmentRequest {
  applicationId: string;
  programType: ProgramType;
  applicationData: ApplicationFormData;
  documents: ApplicationDocument[];
}

export interface EligibilityAssessmentResult {
  applicationId: string;
  overallEligibility: EligibilityStatus;
  basicRequirements: RequirementCheck;
  academicPrerequisites: RequirementCheck;
  languageProficiency: RequirementCheck;
  technicalRequirements: RequirementCheck;
  accessibilityNeeds: AccessibilityAssessment;
  globalCompliance: ComplianceCheck;
  assessmentNotes: string;
  assessedAt: Date;
}

export interface RequirementCheck {
  met: boolean;
  details: string;
  missingItems?: string[];
  score?: number;
}

export interface AccessibilityAssessment {
  needsIdentified: string[];
  accommodationsRequired: string[];
  supportLevel: 'none' | 'minimal' | 'moderate' | 'extensive';
}

export interface ComplianceCheck {
  compliant: boolean;
  region: string;
  regulations: string[];
  issues?: string[];
}

// ============================================================================
// SPIRITUAL EVALUATION TYPES
// ============================================================================

export interface SpiritualEvaluationRequest {
  applicationId: string;
  personalTestimony: string;
  spiritualTestimony: string;
  characterReferences: CharacterReference[];
  ministryExperience: MinistryExperience[];
}

export interface CharacterReference {
  referenceId: string;
  referenceName: string;
  relationship: string;
  contactInfo: string;
  testimony: string;
  spiritualObservations: string;
  characterTraits: string[];
  recommendation: RecommendationType;
}

export interface MinistryExperience {
  organization: string;
  role: string;
  startDate: Date;
  endDate?: Date;
  description: string;
  impact: string;
  spiritualGrowth: string;
}

export interface SpiritualEvaluationResult {
  applicationId: string;
  evaluatorType: EvaluatorType;
  spiritualMaturity: MaturityLevel;
  characterTraits: string[];
  callingClarity: CallingAssessment;
  scrollAlignment: number; // 0-100
  kingdomVision: string;
  authenticityScore: number;
  clarityScore: number;
  depthScore: number;
  transformationScore: number;
  kingdomFocusScore: number;
  overallScore: number;
  spiritualRecommendations: string[];
  propheticInput?: string;
  elderReview?: string;
  evaluatedAt: Date;
}

export interface CallingAssessment {
  clarity: number; // 0-100
  alignment: number; // 0-100
  confirmation: string[];
  development: string[];
}

// ============================================================================
// INTERVIEW SCHEDULING TYPES
// ============================================================================

export interface InterviewSchedulingRequest {
  applicationId: string;
  interviewType: InterviewType;
  preferredDates: Date[];
  preferredTimes: string[];
  timezone: string;
  format: InterviewFormat;
  specialRequirements?: string;
}

export interface InterviewSchedulingResult {
  interviewId: string;
  scheduledDate: Date;
  duration: number;
  format: InterviewFormat;
  platform?: string;
  meetingUrl?: string;
  interviewerName?: string;
  preparationMaterials: string[];
  confirmationSent: boolean;
}

export interface InterviewAvailability {
  interviewerId: string;
  interviewerName: string;
  availableSlots: TimeSlot[];
  timezone: string;
  interviewTypes: InterviewType[];
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  available: boolean;
}

export interface InterviewConductRequest {
  interviewId: string;
  interviewerId: string;
  assessmentScores: InterviewAssessmentScores;
  interviewNotes: string;
  overallRecommendation: RecommendationType;
  followUpRequired: boolean;
  recordingUrl?: string;
  transcriptUrl?: string;
}

export interface InterviewAssessmentScores {
  communicationScore: number;
  spiritualMaturityScore: number;
  academicReadinessScore: number;
  characterScore: number;
  motivationScore: number;
  culturalFitScore: number;
}

// ============================================================================
// DECISION MANAGEMENT TYPES
// ============================================================================

export interface DecisionMakingRequest {
  applicationId: string;
  eligibilityResult: EligibilityAssessmentResult;
  spiritualEvaluations: SpiritualEvaluationResult[];
  academicEvaluations: any[];
  interviewResults: InterviewConductRequest[];
  committeeInput?: CommitteeInput;
}

export interface CommitteeInput {
  committeeMembers: string[];
  votes: CommitteeVote[];
  discussion: string;
  consensus: boolean;
}

export interface CommitteeVote {
  memberId: string;
  memberName: string;
  vote: AdmissionDecisionType;
  reasoning: string;
}

export interface DecisionResult {
  applicationId: string;
  decision: AdmissionDecisionType;
  decisionDate: Date;
  decisionMakers: string[];
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  overallAssessment: string;
  admissionConditions?: string[];
  enrollmentDeadline?: Date;
  scholarshipEligibility?: ScholarshipEligibility;
  nextSteps: string[];
  appealEligible: boolean;
  appealDeadline?: Date;
}

export interface ScholarshipEligibility {
  eligible: boolean;
  scholarshipType?: string;
  amount?: number;
  reasoning: string;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface NotificationRequest {
  applicationId: string;
  applicantId: string;
  notificationType: NotificationType;
  templateData: Record<string, any>;
  channels: NotificationChannel[];
}

export enum NotificationType {
  APPLICATION_RECEIVED = 'APPLICATION_RECEIVED',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  ELIGIBILITY_ASSESSED = 'ELIGIBILITY_ASSESSED',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  INTERVIEW_REMINDER = 'INTERVIEW_REMINDER',
  DECISION_MADE = 'DECISION_MADE',
  ACCEPTANCE_LETTER = 'ACCEPTANCE_LETTER',
  REJECTION_LETTER = 'REJECTION_LETTER',
  WAITLIST_NOTIFICATION = 'WAITLIST_NOTIFICATION',
  APPEAL_RECEIVED = 'APPEAL_RECEIVED',
  APPEAL_DECISION = 'APPEAL_DECISION',
  ENROLLMENT_REMINDER = 'ENROLLMENT_REMINDER'
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP'
}

export interface NotificationResult {
  notificationId: string;
  sent: boolean;
  channels: NotificationChannel[];
  sentAt: Date;
  error?: string;
}

// ============================================================================
// APPLICANT PORTAL TYPES
// ============================================================================

export interface ApplicantPortalDashboard {
  applicationId: string;
  applicantId: string;
  applicationStatus: ApplicationStatus;
  programApplied: ProgramType;
  submissionDate: Date;
  timeline: ApplicationTimelineEvent[];
  completionPercentage: number;
  nextSteps: string[];
  requiredDocuments: DocumentRequirement[];
  upcomingInterviews: InterviewSchedulingResult[];
  notifications: PortalNotification[];
  decision?: DecisionResult;
}

export interface ApplicationTimelineEvent {
  eventId: string;
  eventType: string;
  eventDate: Date;
  description: string;
  status: 'completed' | 'in_progress' | 'pending';
  details?: string;
}

export interface DocumentRequirement {
  documentType: DocumentType;
  required: boolean;
  uploaded: boolean;
  verified: boolean;
  deadline?: Date;
  instructions: string;
}

export interface PortalNotification {
  notificationId: string;
  type: NotificationType;
  title: string;
  message: string;
  date: Date;
  read: boolean;
  actionRequired: boolean;
  actionUrl?: string;
}

export interface ApplicationStatusUpdate {
  applicationId: string;
  oldStatus: ApplicationStatus;
  newStatus: ApplicationStatus;
  updatedBy: string;
  reason: string;
  timestamp: Date;
}

// ============================================================================
// ANALYTICS AND REPORTING TYPES
// ============================================================================

export interface AdmissionsMetrics {
  totalApplications: number;
  applicationsByStatus: Record<ApplicationStatus, number>;
  applicationsByProgram: Record<ProgramType, number>;
  acceptanceRate: number;
  averageProcessingTime: number; // in days
  interviewCompletionRate: number;
  documentVerificationRate: number;
  appealRate: number;
  enrollmentYield: number;
}

export interface ApplicationProcessingMetrics {
  applicationId: string;
  submissionDate: Date;
  currentStatus: ApplicationStatus;
  daysInProcess: number;
  stageCompletionTimes: Record<string, number>;
  bottlenecks: string[];
  estimatedCompletionDate: Date;
}

export interface AdmissionsReport {
  reportId: string;
  reportType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  startDate: Date;
  endDate: Date;
  metrics: AdmissionsMetrics;
  trends: TrendAnalysis[];
  recommendations: string[];
  generatedAt: Date;
}

export interface TrendAnalysis {
  metric: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercentage: number;
  insights: string[];
}

export default {
  // Export all types
};
