// Content Creation System Types
// "The Spirit of truth will guide you into all truth" - John 16:13

export interface CourseOutline {
  courseId: string;
  title: string;
  description: string;
  learningObjectives: LearningObjective[];
  modules: ModuleOutline[];
  targetAudience: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROPHETIC';
  duration: number; // in hours
}

export interface ModuleOutline {
  moduleNumber: number;
  title: string;
  description: string;
  learningObjectives: string[];
  topics: string[];
  estimatedDuration: number; // in hours
}

export interface LearningObjective {
  id: string;
  description: string;
  bloomLevel: BloomLevel;
  assessmentMethod: string;
  spiritualIntegration?: string;
}

export enum BloomLevel {
  REMEMBER = 'REMEMBER',
  UNDERSTAND = 'UNDERSTAND',
  APPLY = 'APPLY',
  ANALYZE = 'ANALYZE',
  EVALUATE = 'EVALUATE',
  CREATE = 'CREATE'
}

export interface LectureContent {
  lectureId: string;
  moduleId: string;
  title: string;
  introduction: string;
  mainContent: LectureSection[];
  examples: Example[];
  caseStudies: CaseStudy[];
  discussionQuestions: string[];
  biblicalIntegration: BiblicalPerspective;
  furtherReading: Resource[];
  summary: string;
  keyTakeaways: string[];
  estimatedDuration: number; // in minutes
  metadata: LectureMetadata;
}

export interface LectureSection {
  sectionNumber: number;
  title: string;
  content: string;
  subsections?: Subsection[];
  visualAids?: VisualAid[];
  interactiveElements?: InteractiveElement[];
}

export interface Subsection {
  title: string;
  content: string;
}

export interface VisualAid {
  type: 'diagram' | 'chart' | 'image' | 'video' | 'animation';
  description: string;
  url?: string;
  altText: string;
}

export interface InteractiveElement {
  type: 'quiz' | 'poll' | 'exercise' | 'simulation';
  description: string;
  content: any;
}

export interface Example {
  title: string;
  description: string;
  context: string;
  solution?: string;
  explanation: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  realWorldApplication?: string;
}

export interface CaseStudy {
  title: string;
  scenario: string;
  background: string;
  challenges: string[];
  questions: string[];
  learningPoints: string[];
  spiritualApplication?: string;
}

export interface BiblicalPerspective {
  scriptureReferences: ScriptureReference[];
  theologicalIntegration: string;
  spiritualApplication: string;
  prayerPoints?: string[];
  reflectionQuestions?: string[];
}

export interface ScriptureReference {
  book: string;
  chapter: number;
  verses: string;
  translation: string;
  text: string;
  context: string;
}

export interface Resource {
  type: 'book' | 'article' | 'video' | 'paper' | 'website' | 'podcast';
  title: string;
  author?: string;
  url?: string;
  description: string;
  relevance: string;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
}

export interface LectureMetadata {
  createdBy: 'AI' | 'FACULTY' | 'HYBRID';
  createdAt: Date;
  lastModified: Date;
  version: string;
  reviewStatus: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'PUBLISHED';
  reviewedBy?: string;
  reviewNotes?: string;
  tags: string[];
  language: string;
}

// Assessment Generation Types
export interface Assessment {
  assessmentId: string;
  courseId: string;
  moduleId?: string;
  type: AssessmentType;
  title: string;
  description: string;
  instructions: string;
  questions: AssessmentQuestion[];
  rubric: GradingRubric;
  timeLimit?: number; // in minutes
  passingScore: number;
  maxAttempts?: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  learningObjectives: string[];
  metadata: AssessmentMetadata;
}

export enum AssessmentType {
  QUIZ = 'QUIZ',
  ESSAY = 'ESSAY',
  PROJECT = 'PROJECT',
  PRACTICAL = 'PRACTICAL',
  DISCUSSION = 'DISCUSSION',
  PEER_REVIEW = 'PEER_REVIEW'
}

export interface AssessmentQuestion {
  questionId: string;
  type: QuestionType;
  question: string;
  points: number;
  options?: string[]; // for multiple choice
  correctAnswer?: string | string[];
  rubric?: string;
  hints?: string[];
  explanation?: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  bloomLevel: BloomLevel;
  learningObjective: string;
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  ESSAY = 'ESSAY',
  CODE = 'CODE',
  MATH = 'MATH',
  PRACTICAL = 'PRACTICAL'
}

export interface GradingRubric {
  criteria: RubricCriterion[];
  totalPoints: number;
  passingThreshold: number;
}

export interface RubricCriterion {
  name: string;
  description: string;
  points: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  level: string;
  description: string;
  points: number;
}

export interface AssessmentMetadata {
  createdBy: 'AI' | 'FACULTY' | 'HYBRID';
  createdAt: Date;
  lastModified: Date;
  version: string;
  uniquenessScore: number; // 0-1, how unique this assessment is
  reviewStatus: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'PUBLISHED';
  reviewedBy?: string;
  tags: string[];
}

// Resource Curation Types
export interface CuratedResource {
  resourceId: string;
  type: ResourceType;
  title: string;
  author?: string;
  source: string;
  url?: string;
  description: string;
  summary: string;
  keyPoints: string[];
  relevanceScore: number; // 0-1
  qualityScore: number; // 0-1
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  learningObjectives: string[];
  tags: string[];
  spiritualAlignment?: number; // 0-1
  metadata: ResourceMetadata;
}

export enum ResourceType {
  ACADEMIC_PAPER = 'ACADEMIC_PAPER',
  TEXTBOOK = 'TEXTBOOK',
  VIDEO = 'VIDEO',
  ARTICLE = 'ARTICLE',
  CASE_STUDY = 'CASE_STUDY',
  TUTORIAL = 'TUTORIAL',
  DOCUMENTATION = 'DOCUMENTATION',
  PODCAST = 'PODCAST',
  COURSE = 'COURSE'
}

export interface ResourceMetadata {
  publicationDate?: Date;
  lastAccessed: Date;
  citations?: number;
  peerReviewed?: boolean;
  openAccess?: boolean;
  language: string;
  format: string;
  duration?: number; // for videos/podcasts in minutes
}

export interface ResourceSearchCriteria {
  topic: string;
  learningObjectives: string[];
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  resourceTypes?: ResourceType[];
  maxResults?: number;
  requirePeerReviewed?: boolean;
  requireOpenAccess?: boolean;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

// Faculty Review Types
export interface ContentReview {
  reviewId: string;
  contentId: string;
  contentType: 'LECTURE' | 'ASSESSMENT' | 'RESOURCE';
  reviewerId: string;
  reviewerName: string;
  status: ReviewStatus;
  overallRating: number; // 1-5
  feedback: ReviewFeedback;
  modifications: ContentModification[];
  approvalDate?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ReviewStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  APPROVED_WITH_CHANGES = 'APPROVED_WITH_CHANGES',
  REJECTED = 'REJECTED',
  REVISION_REQUESTED = 'REVISION_REQUESTED'
}

export interface ReviewFeedback {
  academicQuality: QualityRating;
  spiritualAlignment: QualityRating;
  clarity: QualityRating;
  engagement: QualityRating;
  accuracy: QualityRating;
  comments: string;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
}

export interface QualityRating {
  score: number; // 1-5
  comments?: string;
}

export interface ContentModification {
  modificationId: string;
  section: string;
  originalContent: string;
  modifiedContent: string;
  reason: string;
  modifiedBy: string;
  modifiedAt: Date;
}

export interface ContentVersion {
  versionId: string;
  contentId: string;
  version: string;
  content: any;
  createdBy: string;
  createdAt: Date;
  changes: string;
  isPublished: boolean;
}

// Content Generation Request Types
export interface LectureGenerationRequest {
  courseOutline: CourseOutline;
  moduleOutline: ModuleOutline;
  learningObjectives: LearningObjective[];
  targetAudience: string;
  difficulty: string;
  includeExamples: boolean;
  includeCaseStudies: boolean;
  includeBiblicalIntegration: boolean;
  additionalContext?: string;
}

export interface AssessmentGenerationRequest {
  courseId: string;
  moduleId?: string;
  topic: string;
  learningObjectives: LearningObjective[];
  assessmentType: AssessmentType;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  numberOfQuestions: number;
  timeLimit?: number;
  uniquenessRequired: boolean; // Generate unique for each student
  studentId?: string; // For personalized assessments
}

export interface ResourceCurationRequest {
  topic: string;
  learningObjectives: LearningObjective[];
  academicLevel: string;
  searchCriteria: ResourceSearchCriteria;
  maxResources: number;
  requireSpiritualAlignment?: boolean;
}

// Content Generation Response Types
export interface ContentGenerationResponse<T> {
  success: boolean;
  content?: T;
  confidence: number;
  cost: number;
  processingTime: number;
  reviewRequired: boolean;
  warnings?: string[];
  error?: string;
}

export interface BatchContentGenerationRequest {
  requests: (LectureGenerationRequest | AssessmentGenerationRequest | ResourceCurationRequest)[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  batchId?: string;
}

export interface BatchContentGenerationResponse {
  batchId: string;
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  results: ContentGenerationResponse<any>[];
  totalCost: number;
  totalProcessingTime: number;
}
