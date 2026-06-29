// Student Enrollment and Onboarding Types
// "Train up a child in the way he should go" - Proverbs 22:6

export interface EnrollmentRequest {
  userId: string;
  courseId: string;
  paymentMethod?: 'credit_card' | 'scroll_coin' | 'scholarship' | 'work_trade';
  scholarshipId?: string;
  notes?: string;
}

export interface EnrollmentResponse {
  enrollmentId: string;
  userId: string;
  courseId: string;
  status: string;
  progress: number;
  startedAt: Date;
  expiresAt?: Date;
  scrollXPEarned: number;
  currentModule: number;
}

export interface StudentProfile {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  location?: string;
  bio?: string;
  avatarUrl?: string;
  
  // Academic Information
  academicLevel: string;
  enrollmentStatus: string;
  scrollCoinBalance: number;
  workTradeCredits: number;
  
  // Spiritual Formation
  scrollCalling?: string;
  spiritualGifts: string[];
  kingdomVision?: string;
  scrollAlignment: number;
  
  // Preferences
  preferredLanguage: string;
  timeZone: string;
  
  // Verification Status
  emailVerified: boolean;
  phoneVerified: boolean;
  profileComplete: boolean;
}

export interface ProfileVerificationResult {
  isComplete: boolean;
  missingFields: string[];
  verificationStatus: {
    email: boolean;
    phone: boolean;
    identity: boolean;
  };
  completionPercentage: number;
}

export interface OnboardingStep {
  stepId: string;
  title: string;
  description: string;
  order: number;
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: Date;
  content?: any;
}

export interface OnboardingProgress {
  userId: string;
  totalSteps: number;
  completedSteps: number;
  currentStep: number;
  completionPercentage: number;
  steps: OnboardingStep[];
  startedAt: Date;
  completedAt?: Date;
}

export interface WelcomeEmailData {
  studentName: string;
  email: string;
  enrollmentDate: Date;
  coursesEnrolled: string[];
  nextSteps: string[];
  advisorInfo?: AdvisorInfo;
  platformResources: PlatformResource[];
}

export interface AdvisorInfo {
  advisorId: string;
  name: string;
  email: string;
  officeHours?: string;
  bio?: string;
  specializations: string[];
  avatarUrl?: string;
}

export interface PlatformResource {
  title: string;
  description: string;
  url: string;
  type: 'tutorial' | 'guide' | 'video' | 'documentation';
  category: string;
}

export interface CourseRecommendation {
  courseId: string;
  title: string;
  description: string;
  difficulty: string;
  duration: number;
  scrollCoinCost: number;
  scrollXPReward: number;
  
  // Recommendation Reasoning
  matchScore: number;
  reasons: string[];
  prerequisites: string[];
  
  // Spiritual Alignment
  spiritualAlignment: number;
  kingdomRelevance: string;
}

export interface RecommendationCriteria {
  userId: string;
  academicLevel?: string;
  interests?: string[];
  careerGoals?: string[];
  spiritualGifts?: string[];
  completedCourses?: string[];
  currentEnrollments?: string[];
  availableTime?: number; // hours per week
  budget?: number; // ScrollCoin
}

export interface AdvisorAssignment {
  userId: string;
  advisorId: string;
  assignmentDate: Date;
  assignmentReason: string;
  status: 'active' | 'inactive' | 'transferred';
  notes?: string;
}

export interface OrientationModule {
  moduleId: string;
  title: string;
  description: string;
  order: number;
  duration: number; // minutes
  type: 'video' | 'interactive' | 'reading' | 'quiz';
  content: any;
  isRequired: boolean;
  completionCriteria: any;
}

export interface OrientationProgress {
  userId: string;
  modules: OrientationModuleProgress[];
  totalModules: number;
  completedModules: number;
  completionPercentage: number;
  startedAt: Date;
  completedAt?: Date;
  certificateIssued: boolean;
}

export interface OrientationModuleProgress {
  moduleId: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  score?: number;
  attempts: number;
}

export interface StudentSuccessMetrics {
  userId: string;
  enrollmentDate: Date;
  
  // Engagement Metrics
  loginFrequency: number; // logins per week
  lastLoginDate: Date;
  totalTimeSpent: number; // hours
  
  // Academic Progress
  coursesEnrolled: number;
  coursesCompleted: number;
  coursesInProgress: number;
  averageProgress: number; // percentage
  averageGrade: number;
  
  // Learning Metrics
  assignmentsSubmitted: number;
  assignmentsCompleted: number;
  quizzesCompleted: number;
  averageQuizScore: number;
  
  // Spiritual Growth
  devotionsCompleted: number;
  prayerJournalEntries: number;
  scriptureMemoryProgress: number;
  propheticCheckIns: number;
  spiritualGrowthScore: number;
  
  // Community Engagement
  forumPosts: number;
  studyGroupParticipation: number;
  peerInteractions: number;
  
  // ScrollCoin Economy
  scrollCoinsEarned: number;
  scrollCoinsSpent: number;
  scrollCoinBalance: number;
  
  // Risk Indicators
  atRiskScore: number; // 0-100, higher = more at risk
  riskFactors: string[];
  interventionsNeeded: string[];
  
  // Success Indicators
  successScore: number; // 0-100
  strengths: string[];
  achievements: string[];
}

export interface SuccessTrackingConfig {
  trackingStartDate: Date;
  metricsToTrack: string[];
  alertThresholds: {
    lowEngagement: number;
    failingGrades: number;
    inactivityDays: number;
    atRiskScore: number;
  };
  interventionTriggers: {
    condition: string;
    action: string;
  }[];
}

export interface EnrollmentNotification {
  type: 'welcome' | 'course_access' | 'advisor_assignment' | 'orientation_reminder' | 'success_milestone';
  recipientId: string;
  subject: string;
  message: string;
  data: any;
  channels: ('email' | 'sms' | 'push' | 'in_app')[];
  priority: 'high' | 'medium' | 'low';
  scheduledFor?: Date;
}

export interface BulkEnrollmentRequest {
  userIds: string[];
  courseId: string;
  enrollmentDate?: Date;
  paymentMethod?: string;
  scholarshipId?: string;
  notes?: string;
}

export interface BulkEnrollmentResult {
  totalRequested: number;
  successful: number;
  failed: number;
  results: {
    userId: string;
    success: boolean;
    enrollmentId?: string;
    error?: string;
  }[];
}
