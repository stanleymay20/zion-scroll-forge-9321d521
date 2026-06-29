/**
 * Course Recommendation System Types
 * "I will instruct you and teach you in the way you should go" - Psalm 32:8
 */

// Request/Response Types
export interface CourseRecommendationRequest {
  studentId: string;
  major: string;
  careerGoal?: string;
  currentSemester?: number;
  constraints?: RecommendationConstraints;
}

export interface CourseRecommendationResponse {
  success: boolean;
  degreePlan: DegreePlan;
  currentSemesterRecommendations: CourseRecommendation[];
  scheduleOptimization?: ScheduleOptimization;
  careerAlignment?: CareerAlignmentAnalysis;
  error?: string;
}

export interface RecommendationConstraints {
  maxCoursesPerSemester?: number;
  preferredDays?: string[];
  preferredTimeSlots?: string[];
  avoidProfessors?: string[];
  workSchedule?: WorkSchedule;
}

export interface WorkSchedule {
  daysWorking: string[];
  hoursPerWeek: number;
  flexibleSchedule: boolean;
}

// Degree Plan Types
export interface DegreePlan {
  planId: string;
  studentId: string;
  major: string;
  totalCredits: number;
  estimatedGraduation: Date;
  courses: PlannedCourse[];
  milestones: DegreeMilestone[];
  electives: ElectiveRecommendation[];
}

export interface PlannedCourse {
  courseId: string;
  courseCode: string;
  title: string;
  credits: number;
  semester: number;
  year: number;
  isRequired: boolean;
  prerequisites: string[];
  difficulty: string;
  relevanceScore: number;
  reasoning: string;
}

export interface DegreeMilestone {
  milestoneId: string;
  title: string;
  semester: number;
  requirements: string[];
  description: string;
}

export interface ElectiveRecommendation {
  category: string;
  requiredCredits: number;
  recommendedCourses: CourseRecommendation[];
}

// Course Recommendation Types
export interface CourseRecommendation {
  courseId: string;
  courseCode: string;
  title: string;
  description: string;
  credits: number;
  difficulty: DifficultyLevel;
  prerequisites: PrerequisiteInfo[];
  prerequisitesMet: boolean;
  relevanceScore: number;
  difficultyMatch: number;
  careerAlignment: number;
  spiritualGrowthPotential: number;
  professorRating?: number;
  availableSections: CourseSection[];
  reasoning: string;
}

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface PrerequisiteInfo {
  courseId: string;
  courseCode: string;
  title: string;
  completed: boolean;
}

export interface CourseSection {
  sectionId: string;
  professor: string;
  schedule: ClassSchedule[];
  seatsAvailable: number;
  format: 'in-person' | 'online' | 'hybrid';
}

export interface ClassSchedule {
  day: string;
  startTime: string;
  endTime: string;
  location?: string;
}

// Schedule Optimization Types
export interface ScheduleOptimization {
  optimizedSchedule: OptimizedSchedule;
  alternatives: OptimizedSchedule[];
  balanceScore: number;
  recommendations: string[];
}

export interface OptimizedSchedule {
  scheduleId: string;
  courses: ScheduledCourse[];
  totalCredits: number;
  difficultyBalance: number;
  timeConflicts: TimeConflict[];
  freeTime: FreeTimeBlock[];
  workloadDistribution: WorkloadDistribution;
}

export interface ScheduledCourse {
  courseId: string;
  sectionId: string;
  title: string;
  credits: number;
  schedule: ClassSchedule[];
  professor: string;
  difficulty: DifficultyLevel;
  estimatedWorkload: number; // hours per week
}

export interface TimeConflict {
  course1: string;
  course2: string;
  conflictType: 'direct' | 'back-to-back' | 'travel-time';
  severity: 'high' | 'medium' | 'low';
}

export interface FreeTimeBlock {
  day: string;
  startTime: string;
  endTime: string;
  duration: number; // minutes
}

export interface WorkloadDistribution {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  weekend: number;
  totalWeekly: number;
  balanced: boolean;
}

// Transfer Credit Types
export interface TransferCreditMapping {
  studentId: string;
  sourceInstitution: string;
  targetMajor: string;
  totalTransferCredits: number;
  mappedCourses: MappedCourse[];
  creditGaps: CreditGap[];
  updatedDegreePlan: DegreePlan;
  timeToGraduation: string;
}

export interface MappedCourse {
  sourceCourseCode: string;
  sourceCourseTitle: string;
  sourceCredits: number;
  targetCourseId?: string;
  targetCourseCode?: string;
  targetCourseTitle?: string;
  targetCredits?: number;
  mappingType: 'direct' | 'equivalent' | 'elective' | 'not-applicable';
  reasoning: string;
}

export interface CreditGap {
  category: string;
  requiredCredits: number;
  transferredCredits: number;
  remainingCredits: number;
  recommendedCourses: string[];
}

// Career Alignment Types
export interface CareerAlignmentAnalysis {
  careerGoal: string;
  overallAlignment: number; // 0-100
  requiredSkills: SkillRequirement[];
  skillGaps: SkillGap[];
  recommendedElectives: CourseRecommendation[];
  industryInsights: IndustryInsight[];
  careerPathway: CareerPathway;
}

export interface SkillRequirement {
  skillName: string;
  importance: 'critical' | 'important' | 'beneficial';
  currentProficiency: number; // 0-100
  targetProficiency: number; // 0-100
  developedByCourses: string[];
}

export interface SkillGap {
  skillName: string;
  gapSize: number; // 0-100
  priority: 'high' | 'medium' | 'low';
  recommendedCourses: CourseRecommendation[];
  alternativeLearning: string[];
}

export interface IndustryInsight {
  source: string;
  insight: string;
  relevance: number;
  actionable: boolean;
}

export interface CareerPathway {
  entryLevel: CareerStep;
  midLevel: CareerStep;
  seniorLevel: CareerStep;
  estimatedTimeline: string;
}

export interface CareerStep {
  title: string;
  description: string;
  requiredSkills: string[];
  typicalSalaryRange: string;
  preparationCourses: string[];
}

// Job Market Data Types
export interface JobMarketData {
  careerTitle: string;
  demandLevel: 'high' | 'medium' | 'low';
  growthRate: number; // percentage
  averageSalary: number;
  topSkills: string[];
  topEmployers: string[];
  geographicHotspots: string[];
  educationRequirements: string[];
}

// Professor Rating Types
export interface ProfessorRating {
  professorId: string;
  professorName: string;
  overallRating: number; // 0-5
  difficulty: number; // 0-5
  clarity: number; // 0-5
  helpfulness: number; // 0-5
  spiritualAlignment: number; // 0-100
  reviewCount: number;
  wouldTakeAgain: number; // percentage
}
