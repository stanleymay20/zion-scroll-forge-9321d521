/**
 * ScrollUniversity Degree Progress and Graduation Types
 * "The end of a matter is better than its beginning" - Ecclesiastes 7:8
 * 
 * Type definitions for degree audit, progress tracking, and graduation management
 */

export interface DegreeRequirement {
  id: string;
  category: RequirementCategory;
  name: string;
  description: string;
  creditHours: number;
  requiredCourses?: string[]; // Course IDs
  electiveOptions?: string[]; // Course IDs
  minimumGrade?: string;
  completed: boolean;
  completedCreditHours: number;
  completedCourses: string[];
}

export enum RequirementCategory {
  CORE = 'CORE',
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
  ELECTIVE = 'ELECTIVE',
  SPIRITUAL_FORMATION = 'SPIRITUAL_FORMATION',
  CAPSTONE = 'CAPSTONE',
  GENERAL_EDUCATION = 'GENERAL_EDUCATION'
}

export interface DegreeProgram {
  id: string;
  name: string;
  degreeType: DegreeType;
  faculty: string;
  totalCreditHours: number;
  minimumGPA: number;
  requirements: DegreeRequirement[];
  spiritualFormationRequirements: SpiritualRequirement[];
  estimatedDuration: number; // in months
  isActive: boolean;
}

export enum DegreeType {
  ASSOCIATE = 'ASSOCIATE',
  BACHELOR = 'BACHELOR',
  MASTER = 'MASTER',
  DOCTORATE = 'DOCTORATE',
  CERTIFICATE = 'CERTIFICATE',
  DIPLOMA = 'DIPLOMA'
}

export interface SpiritualRequirement {
  id: string;
  name: string;
  description: string;
  type: SpiritualRequirementType;
  minimumScore?: number;
  completed: boolean;
}

export enum SpiritualRequirementType {
  DAILY_DEVOTIONS = 'DAILY_DEVOTIONS',
  PRAYER_JOURNAL = 'PRAYER_JOURNAL',
  SCRIPTURE_MEMORY = 'SCRIPTURE_MEMORY',
  PROPHETIC_CHECKIN = 'PROPHETIC_CHECKIN',
  MINISTRY_SERVICE = 'MINISTRY_SERVICE',
  SPIRITUAL_MENTORSHIP = 'SPIRITUAL_MENTORSHIP'
}

export interface DegreeAudit {
  studentId: string;
  degreeProgramId: string;
  degreeProgram: DegreeProgram;
  overallProgress: number; // 0-100%
  creditHoursCompleted: number;
  creditHoursRequired: number;
  currentGPA: number;
  requirementsMet: DegreeRequirement[];
  requirementsInProgress: DegreeRequirement[];
  requirementsNotStarted: DegreeRequirement[];
  spiritualFormationProgress: SpiritualRequirement[];
  eligibleForGraduation: boolean;
  estimatedCompletionDate: Date;
  lastUpdated: Date;
}

export interface GraduationEligibility {
  eligible: boolean;
  studentId: string;
  degreeProgramId: string;
  checkDate: Date;
  requirements: {
    creditHoursComplete: boolean;
    gpaRequirementMet: boolean;
    allRequirementsMet: boolean;
    spiritualFormationComplete: boolean;
    financialObligationsMet: boolean;
    noAcademicHolds: boolean;
  };
  missingRequirements: string[];
  actionItems: string[];
}

export interface DiplomaData {
  id: string;
  studentId: string;
  studentName: string;
  degreeProgramId: string;
  degreeTitle: string;
  degreeType: DegreeType;
  faculty: string;
  graduationDate: Date;
  gpa: number;
  honors?: HonorsLevel;
  blockchainHash?: string;
  verificationUrl?: string;
  ipfsHash?: string;
  issuedAt: Date;
}

export enum HonorsLevel {
  SUMMA_CUM_LAUDE = 'SUMMA_CUM_LAUDE', // 3.9+
  MAGNA_CUM_LAUDE = 'MAGNA_CUM_LAUDE', // 3.7-3.89
  CUM_LAUDE = 'CUM_LAUDE', // 3.5-3.69
  NONE = 'NONE'
}

export interface GraduationCeremony {
  id: string;
  name: string;
  date: Date;
  location: string;
  virtualLink?: string;
  registrationDeadline: Date;
  maxAttendees?: number;
  currentRegistrations: number;
  status: CeremonyStatus;
  graduates: GraduationRegistration[];
}

export enum CeremonyStatus {
  PLANNING = 'PLANNING',
  REGISTRATION_OPEN = 'REGISTRATION_OPEN',
  REGISTRATION_CLOSED = 'REGISTRATION_CLOSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface GraduationRegistration {
  id: string;
  studentId: string;
  ceremonyId: string;
  registeredAt: Date;
  guestCount: number;
  specialAccommodations?: string;
  attendanceConfirmed: boolean;
}

export interface AlumniTransition {
  id: string;
  studentId: string;
  graduationDate: Date;
  alumniStatus: AlumniStatus;
  careerPath?: string;
  currentEmployer?: string;
  currentPosition?: string;
  linkedInProfile?: string;
  willingToMentor: boolean;
  stayConnected: boolean;
  transitionSteps: TransitionStep[];
}

export enum AlumniStatus {
  RECENT_GRADUATE = 'RECENT_GRADUATE',
  ACTIVE_ALUMNI = 'ACTIVE_ALUMNI',
  ENGAGED_ALUMNI = 'ENGAGED_ALUMNI',
  INACTIVE = 'INACTIVE'
}

export interface TransitionStep {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  completedAt?: Date;
  order: number;
}

export interface OfficialTranscript {
  id: string;
  studentId: string;
  studentName: string;
  studentId_number: string;
  dateOfBirth: Date;
  enrollmentStatus: string;
  academicLevel: string;
  degreePrograms: {
    programName: string;
    degreeType: string;
    status: string;
    startDate: Date;
    completionDate?: Date;
  }[];
  courses: {
    courseCode: string;
    courseTitle: string;
    creditHours: number;
    term: string;
    year: number;
    grade: string;
    gradePoints: number;
  }[];
  gpaByTerm: {
    term: string;
    year: number;
    gpa: number;
    creditHours: number;
  }[];
  cumulativeGPA: number;
  totalCreditHours: number;
  scrollMetrics: {
    scrollXP: number;
    scrollAlignment: number;
    kingdomImpact: number;
    innovationScore: number;
  };
  honors: string[];
  certifications: string[];
  blockchainVerification: {
    hash: string;
    verificationUrl: string;
    timestamp: Date;
  };
  issuedAt: Date;
  issuedBy: string;
  officialSeal: boolean;
}

export interface ProgressNotification {
  studentId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionRequired: boolean;
  actionUrl?: string;
  sentAt: Date;
}

export enum NotificationType {
  MILESTONE_REACHED = 'MILESTONE_REACHED',
  GRADUATION_ELIGIBLE = 'GRADUATION_ELIGIBLE',
  REQUIREMENT_COMPLETED = 'REQUIREMENT_COMPLETED',
  CEREMONY_REGISTRATION = 'CEREMONY_REGISTRATION',
  DIPLOMA_READY = 'DIPLOMA_READY',
  TRANSCRIPT_GENERATED = 'TRANSCRIPT_GENERATED'
}
