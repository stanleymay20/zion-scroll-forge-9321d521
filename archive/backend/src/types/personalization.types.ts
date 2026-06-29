/**
 * Personalized Learning System Types
 * "Train up a child in the way he should go" - Proverbs 22:6
 */

// Learning Profile Types
export interface LearningProfile {
  studentId: string;
  strengths: string[];
  weaknesses: string[];
  learningStyle: LearningStyle;
  pace: LearningPace;
  engagement: number; // 0-100
  riskLevel: RiskLevel;
  lastAnalyzed: Date;
  performanceMetrics: PerformanceMetrics;
  spiritualGrowth: SpiritualGrowthMetrics;
}

export type LearningStyle = 
  | 'visual'
  | 'auditory'
  | 'kinesthetic'
  | 'reading-writing'
  | 'multimodal';

export type LearningPace = 'fast' | 'moderate' | 'slow';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface PerformanceMetrics {
  averageScore: number;
  completionRate: number;
  timeOnTask: number; // minutes per week
  assignmentSubmissionRate: number;
  quizPerformance: number;
  projectQuality: number;
  participationScore: number;
  improvementTrend: 'improving' | 'stable' | 'declining';
}

export interface SpiritualGrowthMetrics {
  scrollAlignment: number;
  spiritualMaturity: number;
  kingdomFocus: number;
  characterDevelopment: number;
}

// Learning Analytics Types
export interface PerformanceAnalysis {
  studentId: string;
  courseId?: string;
  timeframe: AnalysisTimeframe;
  strengths: StrengthArea[];
  weaknesses: WeaknessArea[];
  patterns: LearningPattern[];
  recommendations: string[];
  confidence: number;
}

export interface AnalysisTimeframe {
  startDate: Date;
  endDate: Date;
  period: 'week' | 'month' | 'semester' | 'year';
}

export interface StrengthArea {
  topic: string;
  proficiencyLevel: number; // 0-100
  evidence: string[];
  lastDemonstrated: Date;
}

export interface WeaknessArea {
  topic: string;
  proficiencyLevel: number; // 0-100
  strugglingIndicators: string[];
  recommendedActions: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface LearningPattern {
  patternType: PatternType;
  description: string;
  frequency: number;
  impact: 'positive' | 'negative' | 'neutral';
  actionable: boolean;
}

export type PatternType =
  | 'study_time_preference'
  | 'assignment_procrastination'
  | 'quiz_anxiety'
  | 'peer_collaboration'
  | 'resource_preference'
  | 'concept_mastery_speed'
  | 'engagement_fluctuation';

// Resource Recommendation Types
export interface ResourceRecommendation {
  resourceId: string;
  resourceType: ResourceType;
  title: string;
  description: string;
  url?: string;
  relevanceScore: number; // 0-100
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes
  reasoning: string;
  targetWeakness?: string;
  spiritualAlignment: number;
}

export type ResourceType =
  | 'video_lecture'
  | 'reading_material'
  | 'practice_problem'
  | 'interactive_exercise'
  | 'case_study'
  | 'tutorial'
  | 'supplementary_content'
  | 'spiritual_formation';

// Intervention Types
export interface InterventionTrigger {
  studentId: string;
  triggerType: InterventionType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  indicators: string[];
  recommendedActions: InterventionAction[];
  autoExecute: boolean;
}

export type InterventionType =
  | 'struggling_with_concept'
  | 'low_engagement'
  | 'assignment_failure'
  | 'attendance_drop'
  | 'spiritual_concern'
  | 'academic_probation_risk'
  | 'dropout_risk';

export interface InterventionAction {
  actionType: ActionType;
  description: string;
  priority: number;
  estimatedImpact: number; // 0-100
  resourcesRequired: string[];
  autoExecutable: boolean;
  executionDetails?: ExecutionDetails;
}

export type ActionType =
  | 'schedule_tutoring'
  | 'provide_supplementary_materials'
  | 'form_study_group'
  | 'advisor_notification'
  | 'spiritual_counseling'
  | 'course_adjustment'
  | 'extended_deadline'
  | 'remedial_content';

export interface ExecutionDetails {
  scheduledFor?: Date;
  assignedTo?: string;
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
}

// Learning Path Optimization Types
export interface LearningPath {
  studentId: string;
  pathId: string;
  goal: LearningGoal;
  currentPosition: PathPosition;
  recommendedCourses: CourseRecommendation[];
  milestones: Milestone[];
  estimatedCompletion: Date;
  adaptations: PathAdaptation[];
}

export interface LearningGoal {
  goalType: 'degree' | 'certification' | 'skill_mastery' | 'career_preparation';
  targetProgram?: string;
  targetSkills: string[];
  careerAlignment?: string;
  spiritualCalling?: string;
}

export interface PathPosition {
  completedCourses: string[];
  currentCourses: string[];
  creditsEarned: number;
  creditsRequired: number;
  progressPercentage: number;
}

export interface CourseRecommendation {
  courseId: string;
  courseTitle: string;
  relevanceScore: number; // 0-100
  difficulty: string;
  prerequisites: string[];
  prerequisitesMet: boolean;
  recommendedSemester: string;
  reasoning: string;
  careerAlignment: number;
  spiritualGrowthPotential: number;
}

export interface Milestone {
  milestoneId: string;
  title: string;
  description: string;
  targetDate: Date;
  requirements: string[];
  completed: boolean;
  completedDate?: Date;
}

export interface PathAdaptation {
  adaptationType: 'pace_adjustment' | 'course_substitution' | 'prerequisite_waiver' | 'load_balancing';
  reason: string;
  appliedDate: Date;
  impact: string;
}

// Risk Prediction Types
export interface RiskAssessment {
  studentId: string;
  assessmentDate: Date;
  overallRiskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  protectiveFactors: ProtectiveFactor[];
  predictions: RiskPrediction[];
  recommendedInterventions: InterventionAction[];
  confidence: number; // 0-100
}

export interface RiskFactor {
  factorType: RiskFactorType;
  severity: number; // 0-100
  description: string;
  evidence: string[];
  trend: 'increasing' | 'stable' | 'decreasing';
}

export type RiskFactorType =
  | 'low_gpa'
  | 'poor_attendance'
  | 'low_engagement'
  | 'financial_stress'
  | 'personal_challenges'
  | 'academic_struggles'
  | 'social_isolation'
  | 'spiritual_crisis';

export interface ProtectiveFactor {
  factorType: ProtectiveFactorType;
  strength: number; // 0-100
  description: string;
}

export type ProtectiveFactorType =
  | 'strong_support_system'
  | 'high_motivation'
  | 'good_study_habits'
  | 'spiritual_foundation'
  | 'mentor_relationship'
  | 'financial_stability'
  | 'clear_goals';

export interface RiskPrediction {
  outcomeType: 'dropout' | 'academic_probation' | 'course_failure' | 'delayed_graduation';
  probability: number; // 0-100
  timeframe: string;
  preventable: boolean;
  preventionStrategies: string[];
}

// Study Group Formation Types
export interface StudyGroupRecommendation {
  groupId: string;
  courseId: string;
  recommendedMembers: GroupMember[];
  groupSize: number;
  compatibilityScore: number; // 0-100
  focusAreas: string[];
  suggestedMeetingSchedule: MeetingSchedule;
  spiritualAlignment: number;
}

export interface GroupMember {
  studentId: string;
  strengths: string[];
  weaknesses: string[];
  availability: string[];
  learningStyle: LearningStyle;
  role: 'leader' | 'contributor' | 'learner';
}

export interface MeetingSchedule {
  frequency: 'daily' | 'weekly' | 'biweekly';
  duration: number; // minutes
  preferredTimes: string[];
  format: 'in-person' | 'virtual' | 'hybrid';
}

// Analytics Request/Response Types
export interface AnalyzePerformanceRequest {
  studentId: string;
  courseId?: string;
  timeframe?: AnalysisTimeframe;
  includeSpiritual?: boolean;
}

export interface AnalyzePerformanceResponse {
  success: boolean;
  profile: LearningProfile;
  analysis: PerformanceAnalysis;
  error?: string;
}

export interface RecommendResourcesRequest {
  studentId: string;
  topic: string;
  weaknessArea?: string;
  maxRecommendations?: number;
}

export interface RecommendResourcesResponse {
  success: boolean;
  recommendations: ResourceRecommendation[];
  reasoning: string;
  error?: string;
}

export interface OptimizePathRequest {
  studentId: string;
  goals: LearningGoal;
  constraints?: PathConstraints;
}

export interface PathConstraints {
  maxCoursesPerSemester?: number;
  preferredPace?: LearningPace;
  workSchedule?: string[];
  financialLimitations?: boolean;
}

export interface OptimizePathResponse {
  success: boolean;
  learningPath: LearningPath;
  alternativePaths?: LearningPath[];
  error?: string;
}

export interface PredictRiskRequest {
  studentId: string;
  includeInterventions?: boolean;
}

export interface PredictRiskResponse {
  success: boolean;
  riskAssessment: RiskAssessment;
  urgentActions?: InterventionAction[];
  error?: string;
}

// Service Configuration
export interface PersonalizationConfig {
  analysisFrequency: 'daily' | 'weekly' | 'monthly';
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  interventionAutoTrigger: boolean;
  minConfidenceScore: number;
  spiritualAlignmentWeight: number;
}
