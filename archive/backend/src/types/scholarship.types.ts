/**
 * Scholarship Management System Types
 * "For the Lord gives wisdom; from his mouth come knowledge and understanding" - Proverbs 2:6
 */

export enum ScholarshipType {
  MERIT_BASED = 'MERIT_BASED',
  NEED_BASED = 'NEED_BASED',
  MINISTRY_FOCUSED = 'MINISTRY_FOCUSED',
  ACADEMIC_EXCELLENCE = 'ACADEMIC_EXCELLENCE',
  SPIRITUAL_LEADERSHIP = 'SPIRITUAL_LEADERSHIP',
  COMMUNITY_SERVICE = 'COMMUNITY_SERVICE',
  RESEARCH_GRANT = 'RESEARCH_GRANT',
  FULL_TUITION = 'FULL_TUITION',
  PARTIAL_TUITION = 'PARTIAL_TUITION'
}

export enum ScholarshipStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  CLOSED = 'CLOSED',
  SUSPENDED = 'SUSPENDED'
}

export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PENDING_DOCUMENTS = 'PENDING_DOCUMENTS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WAITLISTED = 'WAITLISTED',
  WITHDRAWN = 'WITHDRAWN'
}

export enum DisbursementStatus {
  PENDING = 'PENDING',
  SCHEDULED = 'SCHEDULED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum DisbursementMethod {
  DIRECT_TUITION_CREDIT = 'DIRECT_TUITION_CREDIT',
  SCROLLCOIN_TRANSFER = 'SCROLLCOIN_TRANSFER',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHECK = 'CHECK'
}

export interface EligibilityCriteria {
  minGPA?: number;
  maxGPA?: number;
  minAge?: number;
  maxAge?: number;
  requiredAcademicLevel?: string[];
  requiredEnrollmentStatus?: string[];
  requiredLocation?: string[];
  requiredMinistryExperience?: boolean;
  minScrollCoinBalance?: number;
  requiredSpiritualGifts?: string[];
  requiredCourseCompletion?: string[];
  financialNeedRequired?: boolean;
  essayRequired?: boolean;
  recommendationLettersRequired?: number;
  interviewRequired?: boolean;
  customCriteria?: Record<string, any>;
}

export interface ScholarshipData {
  id: string;
  name: string;
  description: string;
  type: ScholarshipType;
  status: ScholarshipStatus;
  amount: number;
  currency: string;
  totalFunding: number;
  remainingFunding: number;
  maxRecipients: number;
  currentRecipients: number;
  eligibilityCriteria: EligibilityCriteria;
  applicationDeadline: Date;
  awardDate: Date;
  disbursementSchedule: DisbursementSchedule[];
  renewalEligible: boolean;
  renewalCriteria?: EligibilityCriteria;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DisbursementSchedule {
  id: string;
  scholarshipId: string;
  recipientId: string;
  amount: number;
  scheduledDate: Date;
  actualDate?: Date;
  status: DisbursementStatus;
  method: DisbursementMethod;
  transactionId?: string;
  notes?: string;
}

export interface ScholarshipApplicationData {
  id: string;
  scholarshipId: string;
  applicantId: string;
  status: ApplicationStatus;
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedById?: string;
  reviewNotes?: string;
  applicationData: ApplicationFormData;
  eligibilityScore: number;
  documents: ApplicationDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationFormData {
  personalStatement: string;
  financialNeedStatement?: string;
  ministryExperience?: string;
  academicAchievements?: string;
  communityService?: string;
  spiritualJourney?: string;
  careerGoals?: string;
  references?: Reference[];
  customFields?: Record<string, any>;
}

export interface Reference {
  name: string;
  email: string;
  phone?: string;
  relationship: string;
  organization?: string;
  submitted: boolean;
  submittedAt?: Date;
  recommendation?: string;
}

export interface ApplicationDocument {
  id: string;
  applicationId: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
  verified: boolean;
  verifiedAt?: Date;
  verifiedById?: string;
}

export interface EligibilityCheckResult {
  eligible: boolean;
  score: number;
  matchedCriteria: string[];
  failedCriteria: string[];
  recommendations: string[];
  details: Record<string, any>;
}

export interface ScholarshipRecommendation {
  scholarship: ScholarshipData;
  matchScore: number;
  matchReasons: string[];
  eligibilityStatus: EligibilityCheckResult;
  applicationDeadline: Date;
  estimatedChanceOfSuccess: number;
}

export interface ScholarshipAnalytics {
  scholarshipId: string;
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  averageEligibilityScore: number;
  totalDisbursed: number;
  remainingBudget: number;
  applicationsByType: Record<string, number>;
  applicationsByStatus: Record<string, number>;
  demographicBreakdown: Record<string, any>;
  successRate: number;
  averageProcessingTime: number;
  topReasons: string[];
}

export interface NotificationData {
  recipientId: string;
  type: string;
  subject: string;
  message: string;
  data?: Record<string, any>;
  channels: ('email' | 'push' | 'sms' | 'in_app')[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledAt?: Date;
}

export interface CreateScholarshipRequest {
  name: string;
  description: string;
  type: ScholarshipType;
  amount: number;
  currency?: string;
  totalFunding: number;
  maxRecipients: number;
  eligibilityCriteria: EligibilityCriteria;
  applicationDeadline: Date;
  awardDate: Date;
  renewalEligible?: boolean;
  renewalCriteria?: EligibilityCriteria;
}

export interface UpdateScholarshipRequest {
  name?: string;
  description?: string;
  status?: ScholarshipStatus;
  amount?: number;
  totalFunding?: number;
  maxRecipients?: number;
  eligibilityCriteria?: EligibilityCriteria;
  applicationDeadline?: Date;
  awardDate?: Date;
  renewalEligible?: boolean;
  renewalCriteria?: EligibilityCriteria;
}

export interface SubmitApplicationRequest {
  scholarshipId: string;
  applicationData: ApplicationFormData;
}

export interface ReviewApplicationRequest {
  applicationId: string;
  status: ApplicationStatus;
  reviewNotes: string;
  awardAmount?: number;
}

export interface DisbursementRequest {
  applicationId: string;
  amount: number;
  method: DisbursementMethod;
  scheduledDate: Date;
  notes?: string;
}

export interface ScholarshipSearchFilters {
  type?: ScholarshipType[];
  status?: ScholarshipStatus[];
  minAmount?: number;
  maxAmount?: number;
  deadlineAfter?: Date;
  deadlineBefore?: Date;
  eligibleForUser?: string;
}

export interface ApplicationSearchFilters {
  scholarshipId?: string;
  applicantId?: string;
  status?: ApplicationStatus[];
  submittedAfter?: Date;
  submittedBefore?: Date;
  minEligibilityScore?: number;
}
