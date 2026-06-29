/**
 * Course Content Creation System Type Definitions
 * 
 * This file contains all TypeScript interfaces for the course content creation system,
 * including Course, Module, Lecture, Assessment, QualityReview, and PilotProgram models.
 */

// ============================================================================
// Enums
// ============================================================================

export enum Phase {
  PLANNING = 'PLANNING',
  CONTENT_DEVELOPMENT = 'CONTENT_DEVELOPMENT',
  PRODUCTION = 'PRODUCTION',
  QUALITY_REVIEW = 'QUALITY_REVIEW',
  PILOT_TESTING = 'PILOT_TESTING',
  LAUNCH = 'LAUNCH'
}

export enum PhaseStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED'
}

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum ModuleStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED'
}

export enum AssessmentType {
  QUIZ = 'QUIZ',
  ESSAY = 'ESSAY',
  PROJECT = 'PROJECT',
  ORAL_DEFENSE = 'ORAL_DEFENSE',
  PEER_REVIEW = 'PEER_REVIEW',
  FORMATIVE = 'FORMATIVE',
  SUMMATIVE = 'SUMMATIVE',
  REFLECTIVE = 'REFLECTIVE'
}

export enum CourseLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  STRATEGIC = 'STRATEGIC'
}

export enum RigorLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  STRATEGIC = 'STRATEGIC'
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum StrictnessProfile {
  STRICT_SPIRITUAL = 'STRICT_SPIRITUAL',
  BALANCED = 'BALANCED',
  LIGHT_CHECK = 'LIGHT_CHECK'
}

export enum ErrorType {
  THEOLOGICAL_DRIFT = 'THEOLOGICAL_DRIFT',
  TONE_PROBLEM = 'TONE_PROBLEM',
  SPIRITUALIZATION_OF_LAZINESS = 'SPIRITUALIZATION_OF_LAZINESS',
  BABYLONIAN_FLATTENING = 'BABYLONIAN_FLATTENING'
}

export enum ErrorSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum ProgressionLevel {
  AWARENESS_VOCABULARY = 'AWARENESS_VOCABULARY',
  UNDERSTANDING_ANALYSIS = 'UNDERSTANDING_ANALYSIS',
  APPLICATION_PROBLEM_SOLVING = 'APPLICATION_PROBLEM_SOLVING',
  SYSTEM_DESIGN_GOVERNANCE = 'SYSTEM_DESIGN_GOVERNANCE',
  MULTIPLICATION_TEACHING = 'MULTIPLICATION_TEACHING'
}

export enum SystemType {
  GOVERNMENT = 'GOVERNMENT',
  BUSINESS = 'BUSINESS',
  EDUCATION = 'EDUCATION',
  HEALTHCARE = 'HEALTHCARE',
  NONPROFIT = 'NONPROFIT',
  CHURCH = 'CHURCH',
  COMMUNITY = 'COMMUNITY'
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

export enum Discipline {
  THEOLOGY = 'THEOLOGY',
  COMPUTER_SCIENCE = 'COMPUTER_SCIENCE',
  BUSINESS = 'BUSINESS',
  ENGINEERING = 'ENGINEERING',
  EDUCATION = 'EDUCATION',
  HEALTHCARE = 'HEALTHCARE',
  LAW = 'LAW',
  ARTS = 'ARTS'
}

export enum DriftType {
  CHRIST_DECENTERED = 'CHRIST_DECENTERED',
  SCRIPTURE_UNROOTED = 'SCRIPTURE_UNROOTED',
  GENERIC_SPIRITUALITY = 'GENERIC_SPIRITUALITY',
  SYNCRETISM = 'SYNCRETISM'
}

export enum ContentType {
  COURSE = 'COURSE',
  MODULE = 'MODULE',
  LESSON = 'LESSON',
  AI_TUTOR_SCRIPT = 'AI_TUTOR_SCRIPT',
  SYSTEM_MESSAGE = 'SYSTEM_MESSAGE',
  SPIRITUAL_CONTENT = 'SPIRITUAL_CONTENT'
}

// ============================================================================
// Core Course Project Models
// ============================================================================

export interface CourseInfo {
  title: string;
  code: string;
  description: string;
  faculty: Faculty[];
  credits: number;
  level: CourseLevel;
  prerequisites: string[];
}

export interface Faculty {
  id: string;
  name: string;
  email: string;
  role: string;
  expertise: string[];
}

export interface CourseProject {
  id: string;
  courseInfo: CourseInfo;
  currentPhase: Phase;
  phases: PhaseProgress[];
  team: TeamMember[];
  timeline: Timeline;
  budget: Budget;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhaseProgress {
  phase: Phase;
  status: PhaseStatus;
  startDate: Date;
  completionDate?: Date;
  approvals: Approval[];
  deliverables: Deliverable[];
}

export interface Approval {
  id: string;
  approverId: string;
  approverName: string;
  approverRole: string;
  approved: boolean;
  comments: string;
  approvedAt: Date;
}

export interface Deliverable {
  id: string;
  name: string;
  description: string;
  dueDate: Date;
  completedDate?: Date;
  status: string;
  assignedTo: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  role: string;
  responsibilities: string[];
  assignedDate: Date;
}

export interface Timeline {
  id: string;
  courseId: string;
  milestones: Milestone[];
  startDate: Date;
  targetLaunchDate: Date;
  actualLaunchDate?: Date;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  phase: Phase;
  dueDate: Date;
  completedDate?: Date;
  dependencies: string[];
}

export interface Budget {
  id: string;
  courseId: string;
  totalAllocated: number;
  categories: BudgetCategory[];
  expenses: Expense[];
  remainingFunds: number;
}

export interface BudgetCategory {
  name: string;
  allocated: number;
  spent: number;
  remaining: number;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: Date;
  approvedBy: string;
}

// ============================================================================
// Course Module Models
// ============================================================================

export interface CourseModule {
  id: string;
  courseId: string;
  weekNumber: number;
  title: string;
  learningObjectives: LearningObjective[];
  lectures: Lecture[];
  materials: Material[];
  assessments: Assessment[];
  spiritualIntegration: SpiritualIntegration;
  status: ModuleStatus;
}

export interface LearningObjective {
  id: string;
  description: string;
  bloomLevel: string;
  assessmentMethods: string[];
}

export interface Lecture {
  id: string;
  moduleId: string;
  title: string;
  duration: number;
  video: VideoAsset;
  transcript: string;
  captions: Caption[];
  notes: LectureNotes;
  resources: Resource[];
}

export interface VideoAsset {
  id: string;
  url: string;
  resolution: string;
  format: string;
  streamingUrls: StreamingUrl[];
  thumbnails: string[];
  duration: number;
  fileSize: number;
}

export interface StreamingUrl {
  quality: string;
  url: string;
  bitrate: number;
}

export interface Caption {
  id: string;
  language: string;
  url: string;
  format: string;
}

export interface LectureNotes {
  id: string;
  lectureId: string;
  content: string;
  summary: string;
  keyConcepts: string[];
  examples: Example[];
  practiceProblems: PracticeProblem[];
  pdfUrl: string;
  pageCount: number;
}

export interface Example {
  id: string;
  title: string;
  description: string;
  code?: string;
  explanation: string;
}

export interface PracticeProblem {
  id: string;
  question: string;
  solution: string;
  difficulty: string;
  hints: string[];
}

export interface Material {
  id: string;
  moduleId: string;
  type: string;
  title: string;
  description: string;
  url: string;
  fileSize?: number;
  format?: string;
}

export interface Resource {
  id: string;
  title: string;
  type: string;
  url: string;
  description: string;
  citation?: string;
}

export interface SpiritualIntegration {
  id: string;
  moduleId: string;
  biblicalFoundation: BiblicalFoundation;
  worldviewPerspective: string;
  reflectionQuestions: ReflectionQuestion[];
  prayerPoints: string[];
  characterDevelopment: string[];
}

export interface BiblicalFoundation {
  scriptures: Scripture[];
  theologicalThemes: string[];
  christCenteredPerspective: string;
}

export interface Scripture {
  reference: string;
  text: string;
  application: string;
}

export interface ReflectionQuestion {
  id: string;
  question: string;
  purpose: string;
  guidingThoughts: string[];
}

// ============================================================================
// Assessment Models
// ============================================================================

export interface Assessment {
  id: string;
  moduleId: string;
  type: AssessmentType;
  title: string;
  description: string;
  points: number;
  dueDate: Date;
  rubric: Rubric;
  questions?: Question[];
  projectRequirements?: ProjectRequirements;
  alignedObjectives: string[];
}

export interface Rubric {
  id: string;
  criteria: RubricCriterion[];
  totalPoints: number;
}

export interface RubricCriterion {
  name: string;
  description: string;
  levels: RubricLevel[];
  weight: number;
}

export interface RubricLevel {
  name: string;
  description: string;
  points: number;
}

export interface Question {
  id: string;
  type: string;
  text: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  points: number;
}

export interface ProjectRequirements {
  description: string;
  deliverables: string[];
  realWorldApplication: string;
  measurableImpact: ImpactMetric[];
  timeline: string;
  resources: string[];
}

export interface ImpactMetric {
  name: string;
  description: string;
  measurementMethod: string;
  targetValue: string;
}

// ============================================================================
// Quality Review Models
// ============================================================================

export interface QualityReview {
  id: string;
  courseId: string;
  reviewerId: string;
  reviewDate: Date;
  checklistResults: ChecklistResult[];
  videoQuality: VideoQualityReport;
  contentQuality: ContentQualityReport;
  assessmentQuality: AssessmentQualityReport;
  overallScore: number;
  approved: boolean;
  feedback: string;
  recommendations: string[];
}

export interface ChecklistResult {
  criterion: string;
  passed: boolean;
  score: number;
  notes: string;
}

export interface VideoQualityReport {
  audioQuality: number;
  visualClarity: number;
  engagement: number;
  technicalIssues: string[];
  recommendations: string[];
}

export interface ContentQualityReport {
  accuracy: number;
  clarity: number;
  depth: number;
  scholarlyStandards: number;
  issues: string[];
  recommendations: string[];
}

export interface AssessmentQualityReport {
  rigorLevel: number;
  alignment: number;
  fairness: number;
  clarity: number;
  issues: string[];
  recommendations: string[];
}

// ============================================================================
// Pilot Program Models
// ============================================================================

export interface PilotProgram {
  id: string;
  courseId: string;
  cohort: PilotStudent[];
  startDate: Date;
  endDate: Date;
  feedback: ModuleFeedback[];
  iterations: Iteration[];
  launchApproved: boolean;
}

export interface PilotStudent {
  id: string;
  userId: string;
  name: string;
  email: string;
  enrolledDate: Date;
  completionStatus: string;
}

export interface ModuleFeedback {
  moduleId: string;
  studentId: string;
  ratings: Rating[];
  comments: string;
  issues: Issue[];
  submittedAt: Date;
}

export interface Rating {
  category: string;
  score: number;
  maxScore: number;
}

export interface Issue {
  id: string;
  description: string;
  severity: string;
  category: string;
  reportedBy: string;
  reportedAt: Date;
}

export interface Iteration {
  id: string;
  description: string;
  changes: Change[];
  priority: Priority;
  completedAt?: Date;
}

export interface Change {
  id: string;
  type: string;
  description: string;
  affectedComponents: string[];
  implementedBy: string;
  implementedAt: Date;
}

// ============================================================================
// Real-World Deployment Models
// ============================================================================

export interface DeploymentPathway {
  id: string;
  moduleId: string;
  conceptId: string;
  description: string;
  realWorldApplication: string;
  systemsToTransform: string[];
  measurableImpact: ImpactMetric[];
  requiredCompetencies: Competency[];
}

export interface Competency {
  id: string;
  name: string;
  description: string;
  level: string;
  assessmentMethod: string;
}

export interface ProjectConnection {
  id: string;
  studentId: string;
  projectId: string;
  organization: string;
  systemType: SystemType;
  startDate: Date;
  expectedOutcomes: Outcome[];
  mentorId?: string;
}

export interface Outcome {
  id: string;
  description: string;
  measurementMethod: string;
  targetDate: Date;
  achieved: boolean;
  evidence?: string;
}

export interface ReadinessReport {
  studentId: string;
  assessmentId: string;
  knowledgeScore: number;
  skillScore: number;
  deploymentReadiness: number;
  gaps: Gap[];
  recommendations: string[];
}

export interface Gap {
  area: string;
  description: string;
  severity: string;
  remediation: string;
}

export interface PortfolioAsset {
  id: string;
  studentId: string;
  courseId: string;
  projectTitle: string;
  description: string;
  realWorldImpact: string;
  evidence: Evidence[];
  verificationStatus: VerificationStatus;
}

export interface Evidence {
  type: string;
  url: string;
  description: string;
  date: Date;
}

export interface OutcomeData {
  id: string;
  graduateId: string;
  deploymentId: string;
  systemsTransformed: string[];
  measuredImpact: ImpactMetric[];
  testimonyData: Testimony;
  feedbackToCourse: CourseFeedback;
  collectedAt: Date;
}

export interface Testimony {
  text: string;
  author: string;
  date: Date;
  verified: boolean;
}

export interface CourseFeedback {
  courseId: string;
  strengths: string[];
  improvements: string[];
  realWorldRelevance: number;
  preparationQuality: number;
}

// ============================================================================
// Course Constitution Validation Models
// ============================================================================

export interface StructureValidation {
  courseId: string;
  moduleCount: number;
  moduleCountValid: boolean;
  lessonsPerModule: number[];
  lessonsValid: boolean;
  requiredComponents: ComponentCheck[];
  overallValid: boolean;
  errors: string[];
}

export interface ComponentCheck {
  component: string;
  present: boolean;
  details: string;
}

export interface PlaceholderDetection {
  contentId: string;
  hasPlaceholders: boolean;
  placeholderLocations: Location[];
  hasTODONotes: boolean;
  hasExampleData: boolean;
  productionReady: boolean;
}

export interface Location {
  file: string;
  line: number;
  column: number;
  context: string;
}

export interface ComponentValidation {
  lessonId: string;
  hasLectureNotes: boolean;
  hasVideoScriptOutline: boolean;
  hasExamples: boolean;
  hasKeyScripturesOrFrameworks: boolean;
  hasReferences: boolean;
  allComponentsPresent: boolean;
  missingComponents: string[];
}

export interface AssessmentValidation {
  courseId: string;
  hasMicroAssessments: boolean;
  hasMidCourseAssessment: boolean;
  hasFinalCapstone: boolean;
  assessmentDistribution: AssessmentDistribution;
  valid: boolean;
}

export interface AssessmentDistribution {
  courseId: string;
  formativeCount: number;
  summativeCount: number;
  reflectiveCount: number;
  distributionBalanced: boolean;
  recommendations: string[];
}

export interface FormationValidation {
  courseId: string;
  knowledgeDimension: DimensionScore;
  skillDimension: DimensionScore;
  characterDimension: DimensionScore;
  callingDimension: DimensionScore;
  integratedFormationAchieved: boolean;
  gaps: string[];
}

export interface DimensionScore {
  score: number;
  maxScore: number;
  evidence: string[];
  gaps: string[];
}

// ============================================================================
// Depth and Rigor Validation Models
// ============================================================================

export interface RigorValidation {
  courseId: string;
  declaredLevel: RigorLevel;
  actualLevel: RigorLevel;
  depthScore: number;
  vocabularyAppropriate: boolean;
  assessmentDifficultyMatches: boolean;
  valid: boolean;
  issues: string[];
}

export interface DepthAssessment {
  moduleId: string;
  discipline: Discipline;
  hasProperTheories: boolean;
  hasFrameworks: boolean;
  hasFormulas: boolean;
  hasWorkedExamples: boolean;
  depthScore: number;
  meetsStandards: boolean;
}

export interface TechnicalValidation {
  contentId: string;
  technicalAccuracy: number;
  theoreticalDepth: number;
  practicalApplication: number;
  spiritualIntegrationQuality: number;
  overallQuality: number;
  issues: string[];
}

export interface BenchmarkReport {
  courseId: string;
  comparedInstitutions: Institution[];
  contentDepthComparison: Comparison[];
  assessmentRigorComparison: Comparison[];
  meetsOrExceedsStandards: boolean;
  recommendations: string[];
}

export interface Institution {
  name: string;
  ranking: number;
  courseEquivalent: string;
}

export interface Comparison {
  aspect: string;
  scrollUniversityScore: number;
  eliteInstitutionAverage: number;
  difference: number;
  analysis: string;
}

// ============================================================================
// Spiritual Alignment Validation Models
// ============================================================================

export interface ValidationResult {
  contentId: string;
  passed: boolean;
  strictnessProfile: StrictnessProfile;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  correctionAttempted: boolean;
  correctionSuccessful: boolean;
}

export interface ValidationError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  location: ContentLocation;
  suggestedCorrection?: string;
}

export interface ValidationWarning {
  type: string;
  message: string;
  location: ContentLocation;
}

export interface ContentLocation {
  file: string;
  section: string;
  line?: number;
  context: string;
}

export interface DriftDetection {
  contentId: string;
  hasDrift: boolean;
  driftType: DriftType[];
  christCenteredScore: number;
  scriptureRootedScore: number;
  issues: string[];
}

export interface ToneAnalysis {
  contentId: string;
  hasProblems: boolean;
  isCondemning: boolean;
  isShaming: boolean;
  isManipulative: boolean;
  treatsStudentsAsLessThan: boolean;
  toneScore: number;
  issues: string[];
}

// ============================================================================
// Scroll Pedagogy Validation Models
// ============================================================================

export interface FlowValidation {
  lessonId: string;
  hasIgnition: boolean;
  hasDownload: boolean;
  hasDemonstration: boolean;
  hasActivation: boolean;
  hasReflection: boolean;
  hasCommission: boolean;
  allStepsPresent: boolean;
  flowQuality: number;
  missingSteps: string[];
}

export interface ToneValidation {
  tutorResponseId: string;
  isWarm: boolean;
  isWise: boolean;
  isPropheticButGrounded: boolean;
  hasDualExplanation: boolean;
  toneScore: number;
  issues: string[];
}

export interface ProgressionMapping {
  courseId: string;
  targetLevel: ProgressionLevel;
  contentMappedToLevel: boolean;
  assessmentsMappedToLevel: boolean;
  levelAppropriate: boolean;
  gaps: string[];
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateCourseProjectRequest {
  courseInfo: CourseInfo;
  teamMembers: TeamMember[];
  budget: Omit<Budget, 'id' | 'courseId' | 'expenses' | 'remainingFunds'>;
  targetLaunchDate: Date;
}

export interface CreateCourseProjectResponse {
  success: boolean;
  data?: CourseProject;
  error?: string;
}

export interface AdvancePhaseRequest {
  projectId: string;
  approvalData: Approval;
}

export interface AdvancePhaseResponse {
  success: boolean;
  data?: PhaseProgress;
  error?: string;
}

export interface ValidatePhaseCompletionRequest {
  projectId: string;
  phase: Phase;
}

export interface ValidatePhaseCompletionResponse {
  success: boolean;
  data?: {
    valid: boolean;
    missingDeliverables: string[];
    issues: string[];
  };
  error?: string;
}

export interface GetProjectStatusRequest {
  projectId: string;
}

export interface GetProjectStatusResponse {
  success: boolean;
  data?: {
    project: CourseProject;
    progress: number;
    currentPhase: Phase;
    nextMilestone: Milestone;
    blockers: string[];
  };
  error?: string;
}

// ============================================================================
// Additional Types for Workflow Service
// ============================================================================

export interface PhaseTransition {
  projectId: string;
  fromPhase: Phase;
  toPhase: Phase;
  transitionDate: Date;
  approvedBy: string;
  completed: boolean;
}

export interface ApprovalData {
  approved: boolean;
  reviewerId: string;
  comments?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProjectStatusData {
  projectId: string;
  currentPhase: Phase;
  status: ProjectStatus;
  progressPercentage: number;
  completedPhases: number;
  totalPhases: number;
  completedDeliverables: number;
  totalDeliverables: number;
  startDate: Date;
  estimatedEndDate?: Date;
  actualEndDate?: Date;
  blockers: string[];
  teamSize: number;
  lastUpdated: Date;
}

// ============================================================================
// Video Production Models
// ============================================================================

export interface RecordingSession {
  id: string;
  lectureId: string;
  facultyId: string;
  scheduledDate: Date;
  duration: number;
  studioLocation: string;
  equipment: string[];
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  recordingType: string;
  technicalRequirements: {
    resolution: string;
    frameRate: number;
    audioQuality: string;
    lighting: string;
    microphone: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface LectureInfo {
  lectureId: string;
  facultyId: string;
  requestedDate: Date;
  duration: number;
  studioLocation?: string;
  recordingType?: string;
}

export interface ProcessedVideo {
  id: string;
  originalUrl: string;
  processedUrl: string;
  duration: number;
  resolution: string;
  format: string;
  fileSize: number;
  appliedOperations: string[];
  quality: {
    videoQuality: string;
    audioQuality: string;
    visualClarity: number;
    audioClarity: number;
    engagement: number;
  };
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  processedAt: Date;
}

export interface EditingSpecs {
  operations: ('TRIM' | 'ADD_GRAPHICS' | 'ADD_ANIMATIONS' | 'ADD_TRANSITIONS' | 'COLOR_CORRECTION' | 'AUDIO_ENHANCEMENT')[];
  trimStart?: number;
  trimEnd?: number;
  graphics?: any[];
  animations?: any[];
  transitions?: any[];
}

export interface Captions {
  videoId: string;
  language: string;
  languageCode: string;
  captionUrl: string;
  transcriptUrl: string;
  format: 'VTT' | 'SRT' | 'TTML';
  transcript: string;
  wordCount: number;
  duration: number;
  accuracy: number;
  generatedAt: Date;
}

export interface StreamingAsset {
  videoId: string;
  manifestUrl: string;
  variants: {
    quality: string;
    resolution: string;
    bitrate: number;
    url: string;
    codec: string;
    format: string;
  }[];
  thumbnailSpriteUrl: string;
  protocol: 'HLS' | 'DASH';
  cdnEnabled: boolean;
  cdnUrl: string;
  optimizedAt: Date;
}

export interface MultilingualAsset {
  videoId: string;
  originalLanguage: string;
  supportedLanguages: string[];
  translations: {
    language: string;
    languageCode: string;
    subtitleUrl: string;
    dubbingUrl?: string;
    translatedTranscript: string;
  }[];
  totalLanguages: number;
  createdAt: Date;
}

export interface VideoProductionError extends Error {
  code: string;
}

// ============================================================================
// Quality Assurance Models
// ============================================================================

export interface QualityReport {
  id: string;
  courseId: string;
  reviewerId: string;
  reviewDate: Date;
  checklistResults: ChecklistResult[];
  overallScore: number;
  approved: boolean;
  feedback: string;
  recommendations: string[];
  videoQuality?: VideoQualityReport;
  contentQuality?: ContentQualityReport;
  assessmentQuality?: AssessmentQualityReport;
}

export interface QualityChecklistCriterion {
  id: string;
  category: string;
  criterion: string;
  points: number;
}

export interface ChecklistResult {
  criterion: string;
  category: string;
  points: number;
  passed: boolean;
  score: number;
  notes: string;
}

export interface VideoQualityReport {
  videoId: string;
  audioQuality: {
    score: number;
    issues: string[];
  };
  visualQuality: {
    score: number;
    issues: string[];
  };
  engagement: {
    score: number;
    issues: string[];
  };
  academicRigor: {
    score: number;
    issues: string[];
  };
  qualityScore: number;
  passed: boolean;
  issues: string[];
  recommendations: string[];
}

export interface DocumentQualityReport {
  documentId: string;
  accuracy: {
    score: number;
    issues: string[];
  };
  clarity: {
    score: number;
    issues: string[];
  };
  depth: {
    score: number;
    issues: string[];
  };
  scholarlyStandards: {
    score: number;
    issues: string[];
  };
  qualityScore: number;
  passed: boolean;
  issues: string[];
  recommendations: string[];
}

export interface AssessmentQualityReport {
  assessmentId: string;
  rigorLevel: {
    score: number;
    issues: string[];
  };
  alignment: {
    score: number;
    issues: string[];
  };
  realWorldApplication: {
    score: number;
    issues: string[];
  };
  rubricQuality: {
    score: number;
    issues: string[];
  };
  qualityScore: number;
  passed: boolean;
  issues: string[];
  recommendations: string[];
}

export interface ApprovalDecision {
  courseId: string;
  reviewerId: string;
  approved: boolean;
  approvalDate: Date;
  qualityScore: number;
  feedback: string;
  conditions: string[];
}
