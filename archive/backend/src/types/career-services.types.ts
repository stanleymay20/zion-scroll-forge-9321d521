/**
 * Career Services AI Types
 * Comprehensive type definitions for AI-powered career services system
 */

// ============================================================================
// Core Interfaces
// ============================================================================

export interface StudentProfile {
  studentId: string;
  skills: Skill[];
  interests: string[];
  values: string[];
  education: EducationRecord[];
  experience: ExperienceRecord[];
  achievements: Achievement[];
  careerGoals: string[];
  preferredIndustries: string[];
  preferredLocations: string[];
  salaryExpectations?: SalaryRange;
}

export interface Skill {
  name: string;
  category: SkillCategory;
  proficiencyLevel: ProficiencyLevel;
  yearsOfExperience?: number;
  certifications?: string[];
  verified: boolean;
}

export type SkillCategory = 
  | 'technical'
  | 'soft_skills'
  | 'leadership'
  | 'communication'
  | 'analytical'
  | 'creative'
  | 'ministry'
  | 'spiritual';

export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface EducationRecord {
  institution: string;
  degree: string;
  major: string;
  minor?: string;
  gpa?: number;
  graduationDate: Date;
  honors?: string[];
}

export interface ExperienceRecord {
  company: string;
  position: string;
  startDate: Date;
  endDate?: Date;
  description: string;
  achievements: string[];
  skills: string[];
}

export interface Achievement {
  title: string;
  description: string;
  date: Date;
  category: 'academic' | 'professional' | 'ministry' | 'leadership' | 'research';
}

export interface SalaryRange {
  min: number;
  max: number;
  currency: string;
}

// ============================================================================
// Career Matching
// ============================================================================

export interface CareerMatch {
  career: Career;
  matchScore: number;
  requiredSkills: Skill[];
  skillGaps: SkillGap[];
  salaryRange: SalaryRange;
  jobOutlook: JobOutlook;
  pathwaySteps: PathwayStep[];
  reasoning: string;
  spiritualAlignment: number;
}

export interface Career {
  id: string;
  title: string;
  description: string;
  industry: string;
  requiredSkills: string[];
  preferredSkills: string[];
  educationRequirements: string[];
  experienceRequirements: string;
  growthRate: number;
  demandLevel: 'low' | 'medium' | 'high' | 'very_high';
  ministryOpportunities?: string[];
}

export interface SkillGap {
  skill: string;
  currentLevel: ProficiencyLevel | 'none';
  requiredLevel: ProficiencyLevel;
  priority: 'low' | 'medium' | 'high' | 'critical';
  recommendedResources: LearningResource[];
  estimatedTimeToAcquire: string;
}

export interface JobOutlook {
  growthRate: number;
  projectedOpenings: number;
  competitionLevel: 'low' | 'medium' | 'high';
  automationRisk: number;
  description: string;
}

export interface PathwayStep {
  step: number;
  title: string;
  description: string;
  duration: string;
  resources: LearningResource[];
  milestones: string[];
}

export interface LearningResource {
  type: 'course' | 'certification' | 'book' | 'project' | 'mentorship';
  title: string;
  provider?: string;
  url?: string;
  cost?: number;
  duration?: string;
}

// ============================================================================
// Resume Review
// ============================================================================

export interface Resume {
  studentId: string;
  content: string;
  format: 'pdf' | 'docx' | 'txt';
  sections: ResumeSection[];
  targetRole?: string;
  targetIndustry?: string;
}

export interface ResumeSection {
  type: ResumeSectionType;
  content: string;
  order: number;
}

export type ResumeSectionType = 
  | 'contact'
  | 'summary'
  | 'education'
  | 'experience'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'awards'
  | 'volunteer';

export interface ResumeFeedback {
  overallScore: number;
  contentScore: number;
  formattingScore: number;
  atsCompatibility: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: ResumeSuggestion[];
  revisedVersion?: string;
  keywordOptimization: KeywordAnalysis;
}

export interface ResumeSuggestion {
  section: ResumeSectionType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  issue: string;
  recommendation: string;
  example?: string;
}

export interface KeywordAnalysis {
  missingKeywords: string[];
  overusedKeywords: string[];
  industryKeywords: string[];
  atsScore: number;
}

// ============================================================================
// Mock Interview
// ============================================================================

export interface InterviewSession {
  sessionId: string;
  studentId: string;
  role: JobRole;
  questions: InterviewQuestion[];
  responses: InterviewResponse[];
  feedback: InterviewFeedback;
  startTime: Date;
  endTime?: Date;
  status: 'in_progress' | 'completed' | 'abandoned';
}

export interface JobRole {
  title: string;
  level: 'entry' | 'mid' | 'senior' | 'executive';
  industry: string;
  company?: string;
  description: string;
}

export interface InterviewQuestion {
  questionId: string;
  type: InterviewQuestionType;
  question: string;
  category: QuestionCategory;
  difficulty: 'easy' | 'medium' | 'hard';
  expectedElements: string[];
  timeLimit?: number;
}

export type InterviewQuestionType = 
  | 'behavioral'
  | 'technical'
  | 'situational'
  | 'case_study'
  | 'cultural_fit'
  | 'spiritual';

export type QuestionCategory = 
  | 'leadership'
  | 'problem_solving'
  | 'teamwork'
  | 'communication'
  | 'technical_skills'
  | 'conflict_resolution'
  | 'adaptability'
  | 'ministry_alignment';

export interface InterviewResponse {
  questionId: string;
  response: string;
  duration: number;
  timestamp: Date;
}

export interface InterviewFeedback {
  overallScore: number;
  communicationScore: number;
  technicalScore: number;
  culturalFitScore: number;
  strengths: string[];
  areasForImprovement: string[];
  questionFeedback: QuestionFeedback[];
  recommendations: string[];
  nextSteps: string[];
}

export interface QuestionFeedback {
  questionId: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  idealAnswer?: string;
}

// ============================================================================
// Employer Matching
// ============================================================================

export interface Employer {
  id: string;
  name: string;
  industry: string;
  size: CompanySize;
  location: string[];
  culture: CompanyCulture;
  values: string[];
  openPositions: JobPosting[];
  benefits: string[];
  christianFriendly: boolean;
  ministryOpportunities?: string[];
}

export type CompanySize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise';

export interface CompanyCulture {
  workLifeBalance: number;
  innovation: number;
  collaboration: number;
  diversity: number;
  growth: number;
  mission: string;
}

export interface JobPosting {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  preferredQualifications: string[];
  salaryRange?: SalaryRange;
  location: string;
  remote: boolean;
  postedDate: Date;
  applicationDeadline?: Date;
}

export interface EmployerMatch {
  employer: Employer;
  matchScore: number;
  position: JobPosting;
  fitAnalysis: FitAnalysis;
  applicationStrategy: ApplicationStrategy;
  reasoning: string;
}

export interface FitAnalysis {
  skillsMatch: number;
  cultureMatch: number;
  valuesMatch: number;
  locationMatch: number;
  salaryMatch: number;
  overallFit: number;
  strengths: string[];
  concerns: string[];
}

export interface ApplicationStrategy {
  priority: 'low' | 'medium' | 'high';
  recommendedApproach: string;
  keyPointsToHighlight: string[];
  potentialChallenges: string[];
  networkingOpportunities: string[];
  timeline: string;
}

export interface ApplicationOutcome {
  studentId: string;
  employerId: string;
  positionId: string;
  applicationDate: Date;
  status: ApplicationStatus;
  interviewDates?: Date[];
  offerReceived?: boolean;
  offerDetails?: OfferDetails;
  outcome: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  feedback?: string;
}

export type ApplicationStatus = 
  | 'submitted'
  | 'under_review'
  | 'phone_screen'
  | 'interview'
  | 'final_round'
  | 'offer'
  | 'rejected'
  | 'withdrawn';

export interface OfferDetails {
  salary: number;
  benefits: string[];
  startDate: Date;
  location: string;
  remote: boolean;
}

// ============================================================================
// Career Analytics
// ============================================================================

export interface CareerAnalytics {
  timeframe: Timeframe;
  employmentOutcomes: EmploymentOutcome[];
  salaryData: SalaryData;
  successfulPathways: CareerPathway[];
  industryTrends: IndustryTrend[];
  curriculumRecommendations: CurriculumRecommendation[];
}

export interface Timeframe {
  startDate: Date;
  endDate: Date;
  period: 'monthly' | 'quarterly' | 'yearly';
}

export interface EmploymentOutcome {
  graduationYear: number;
  major: string;
  employmentRate: number;
  averageTimeToEmployment: number;
  topEmployers: string[];
  topIndustries: string[];
  averageSalary: number;
}

export interface SalaryData {
  major: string;
  industry: string;
  averageSalary: number;
  medianSalary: number;
  salaryRange: SalaryRange;
  growthRate: number;
  dataPoints: number;
}

export interface CareerPathway {
  pathway: string;
  successRate: number;
  averageSalary: number;
  timeToEmployment: number;
  requiredSkills: string[];
  requiredCourses: string[];
  graduateCount: number;
  satisfaction: number;
}

export interface IndustryTrend {
  industry: string;
  growthRate: number;
  demandLevel: 'declining' | 'stable' | 'growing' | 'booming';
  emergingSkills: string[];
  decliningSkills: string[];
  opportunities: string[];
  threats: string[];
}

export interface CurriculumRecommendation {
  major: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  rationale: string;
  expectedImpact: string;
  implementationCost: 'low' | 'medium' | 'high';
}

// ============================================================================
// Service Request/Response Types
// ============================================================================

export interface CareerMatchingRequest {
  studentId: string;
  profile: StudentProfile;
  preferences?: CareerPreferences;
}

export interface CareerPreferences {
  industries?: string[];
  locations?: string[];
  salaryRange?: SalaryRange;
  workLifeBalance?: number;
  ministryFocus?: boolean;
}

export interface CareerMatchingResponse {
  matches: CareerMatch[];
  timestamp: Date;
  confidence: number;
}

export interface ResumeReviewRequest {
  resume: Resume;
  targetRole?: string;
  targetIndustry?: string;
}

export interface ResumeReviewResponse {
  feedback: ResumeFeedback;
  timestamp: Date;
  confidence: number;
}

export interface MockInterviewRequest {
  studentId: string;
  role: JobRole;
  questionCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
}

export interface MockInterviewResponse {
  session: InterviewSession;
  timestamp: Date;
}

export interface EmployerMatchingRequest {
  studentId: string;
  profile: StudentProfile;
  preferences?: CareerPreferences;
}

export interface EmployerMatchingResponse {
  matches: EmployerMatch[];
  timestamp: Date;
  confidence: number;
}

export interface CareerAnalyticsRequest {
  timeframe: Timeframe;
  major?: string;
  industry?: string;
}

export interface CareerAnalyticsResponse {
  analytics: CareerAnalytics;
  timestamp: Date;
}
