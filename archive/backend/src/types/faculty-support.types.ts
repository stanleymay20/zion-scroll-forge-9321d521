/**
 * Faculty Support System Type Definitions
 * Supports AI teaching assistant, discussion grading, quiz generation, extension management, and office hours
 */

// ============================================================================
// Teaching Assistant Types
// ============================================================================

export interface TeachingAssistantQuery {
  question: string;
  courseId: string;
  studentId: string;
  context?: string;
  conversationHistory?: Message[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface TeachingAssistantResponse {
  answer: string;
  confidence: number;
  sources: CourseSource[];
  professorReviewNeeded: boolean;
  suggestedFollowUp?: string[];
  reasoning?: string;
}

export interface CourseSource {
  type: 'lecture' | 'reading' | 'assignment' | 'discussion' | 'syllabus';
  title: string;
  content: string;
  relevanceScore: number;
  url?: string;
}

export interface ProfessorTeachingStyle {
  tone: 'formal' | 'casual' | 'encouraging' | 'socratic';
  responseLength: 'concise' | 'detailed' | 'comprehensive';
  exampleUsage: 'frequent' | 'moderate' | 'minimal';
  scriptureIntegration: 'always' | 'often' | 'contextual';
  customInstructions?: string;
}

// ============================================================================
// Discussion Grading Types
// ============================================================================

export interface DiscussionPost {
  id: string;
  studentId: string;
  courseId: string;
  discussionId: string;
  content: string;
  timestamp: Date;
  replies?: DiscussionPost[];
  wordCount: number;
}

export interface DiscussionGradingCriteria {
  participationWeight: number;
  criticalThinkingWeight: number;
  peerEngagementWeight: number;
  substantiveContributionWeight: number;
  minimumPosts: number;
  minimumWordCount: number;
}

export interface DiscussionGrade {
  studentId: string;
  overallScore: number;
  participationScore: number;
  criticalThinkingScore: number;
  peerEngagementScore: number;
  substantiveContributionScore: number;
  feedback: string;
  strengths: string[];
  areasForImprovement: string[];
  postCount: number;
  averageWordCount: number;
  confidence: number;
}

export interface DiscussionAnalysis {
  depth: 'surface' | 'moderate' | 'deep';
  originalityScore: number;
  evidenceQuality: 'weak' | 'adequate' | 'strong';
  engagementLevel: 'minimal' | 'moderate' | 'active';
  criticalThinkingIndicators: string[];
}

// ============================================================================
// Quiz Generation Types
// ============================================================================

export interface QuizGenerationRequest {
  courseId: string;
  topics: string[];
  learningObjectives: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
  questionTypes: QuestionType[];
  includeScripture?: boolean;
}

export type QuestionType = 
  | 'multiple-choice'
  | 'true-false'
  | 'short-answer'
  | 'essay'
  | 'matching'
  | 'fill-in-blank';

export interface GeneratedQuiz {
  title: string;
  description: string;
  questions: QuizQuestion[];
  estimatedTime: number;
  totalPoints: number;
  answerKey: AnswerKey;
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  learningObjective: string;
  options?: string[];
  correctAnswer?: string | string[];
  rubric?: string;
  hints?: string[];
}

export interface AnswerKey {
  questions: {
    id: string;
    correctAnswer: string | string[];
    explanation: string;
    commonMistakes?: string[];
  }[];
}

// ============================================================================
// Extension Management Types
// ============================================================================

export interface ExtensionRequest {
  id: string;
  studentId: string;
  courseId: string;
  assignmentId: string;
  requestDate: Date;
  originalDueDate: Date;
  requestedDueDate: Date;
  reason: string;
  supportingDocumentation?: string[];
}

export interface ExtensionPolicy {
  maxExtensionDays: number;
  maxExtensionsPerCourse: number;
  autoApprovalThreshold: number;
  requiresDocumentation: boolean;
  penaltyPerDay?: number;
  blackoutPeriods?: DateRange[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface StudentExtensionHistory {
  studentId: string;
  totalExtensionsRequested: number;
  totalExtensionsApproved: number;
  averageExtensionDays: number;
  recentExtensions: ExtensionRequest[];
  academicStanding: 'good' | 'warning' | 'probation';
}

export interface ExtensionDecision {
  approved: boolean;
  recommendedDueDate?: Date;
  reasoning: string;
  confidence: number;
  requiresHumanReview: boolean;
  responseMessage: string;
  conditions?: string[];
}

export interface ExtensionAnalysis {
  reasonValidity: 'weak' | 'moderate' | 'strong';
  urgency: 'low' | 'medium' | 'high';
  studentPattern: 'first-time' | 'occasional' | 'frequent';
  riskFactors: string[];
  mitigatingFactors: string[];
}

// ============================================================================
// Office Hours Scheduling Types
// ============================================================================

export interface OfficeHoursAppointment {
  id: string;
  studentId: string;
  facultyId: string;
  courseId?: string;
  scheduledTime: Date;
  duration: number;
  topic: string;
  priority: 'low' | 'medium' | 'high';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

export interface OfficeHoursAvailability {
  facultyId: string;
  availableSlots: TimeSlot[];
  bufferTime: number;
  maxAppointmentsPerDay: number;
  preferredMeetingDuration: number;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  isAvailable: boolean;
}

export interface StudentBriefing {
  studentId: string;
  name: string;
  courseEnrollments: CourseEnrollment[];
  recentPerformance: PerformanceSnapshot;
  recentQuestions: string[];
  upcomingDeadlines: Deadline[];
  concernAreas: string[];
  strengths: string[];
  recommendedTopics: string[];
}

export interface CourseEnrollment {
  courseId: string;
  courseName: string;
  currentGrade: number;
  attendance: number;
  participationScore: number;
}

export interface PerformanceSnapshot {
  overallGrade: number;
  trend: 'improving' | 'stable' | 'declining';
  recentAssignments: {
    name: string;
    score: number;
    submittedOnTime: boolean;
  }[];
  engagementLevel: 'low' | 'medium' | 'high';
}

export interface Deadline {
  assignmentName: string;
  dueDate: Date;
  status: 'upcoming' | 'overdue' | 'submitted';
}

export interface AppointmentReminder {
  appointmentId: string;
  studentId: string;
  facultyId: string;
  scheduledTime: Date;
  reminderType: 'email' | 'sms' | 'push';
  sentAt: Date;
}

export interface MeetingOutcome {
  appointmentId: string;
  attendanceStatus: 'attended' | 'no-show' | 'cancelled';
  topicsDiscussed: string[];
  actionItems: string[];
  followUpNeeded: boolean;
  facultyNotes: string;
  studentSatisfaction?: number;
}

// ============================================================================
// Faculty Assistant Service Types
// ============================================================================

export interface FacultyAssistantConfig {
  facultyId: string;
  courseId: string;
  teachingStyle: ProfessorTeachingStyle;
  autoResponseEnabled: boolean;
  confidenceThreshold: number;
  maxResponseTime: number;
}

export interface FacultyAssistantMetrics {
  totalQuestions: number;
  autoResponded: number;
  flaggedForReview: number;
  averageConfidence: number;
  averageResponseTime: number;
  studentSatisfaction: number;
  facultySatisfaction: number;
}
