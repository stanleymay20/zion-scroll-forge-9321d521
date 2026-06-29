/**
 * Course Content Management System Types
 * "Let every course be a scroll that opens the kingdom to hungry hearts"
 */

import { Difficulty, UserRole } from '@prisma/client';

// ============================================================================
// Course Types
// ============================================================================

export interface CourseCreateInput {
  title: string;
  description: string;
  syllabus?: string;
  difficulty: Difficulty;
  duration: number; // in hours
  scrollXPReward?: number;
  scrollCoinCost?: number;
  facultyId: string;
  prerequisites?: string[];
  videoUrl?: string;
  materials?: string[];
  modules?: ModuleCreateInput[];
}

export interface CourseUpdateInput {
  title?: string;
  description?: string;
  syllabus?: string;
  difficulty?: Difficulty;
  duration?: number;
  scrollXPReward?: number;
  scrollCoinCost?: number;
  facultyId?: string;
  prerequisites?: string[];
  videoUrl?: string;
  materials?: string[];
  isActive?: boolean;
}

export interface CourseResponse {
  id: string;
  title: string;
  description: string;
  syllabus?: string;
  difficulty: Difficulty;
  duration: number;
  scrollXPReward: number;
  scrollCoinCost: number;
  facultyId: string;
  faculty?: {
    id: string;
    name: string;
    description: string;
  };
  prerequisites: string[];
  videoUrl?: string;
  materials: string[];
  isActive: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  modules?: ModuleResponse[];
  enrollmentCount?: number;
  averageRating?: number;
}

// ============================================================================
// Module Types
// ============================================================================

export interface ModuleCreateInput {
  courseId: string;
  title: string;
  description: string;
  order: number;
  estimatedTime: number; // in minutes
  lectures?: LectureCreateInput[];
}

export interface ModuleUpdateInput {
  title?: string;
  description?: string;
  order?: number;
  estimatedTime?: number;
  isActive?: boolean;
}

export interface ModuleResponse {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  estimatedTime: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lectures?: LectureResponse[];
  completionRate?: number;
}

// ============================================================================
// Lecture Types
// ============================================================================

export interface LectureCreateInput {
  moduleId: string;
  title: string;
  description?: string;
  order: number;
  type: LectureType;
  duration: number; // in minutes
  videoUrl?: string;
  transcript?: string;
  closedCaptions?: string;
  notesUrl?: string;
  slidesUrl?: string;
  supplementaryMaterials?: string[];
}

export interface LectureUpdateInput {
  title?: string;
  description?: string;
  order?: number;
  type?: LectureType;
  duration?: number;
  videoUrl?: string;
  transcript?: string;
  closedCaptions?: string;
  notesUrl?: string;
  slidesUrl?: string;
  supplementaryMaterials?: string[];
  isActive?: boolean;
}

export interface LectureResponse {
  id: string;
  moduleId: string;
  title: string;
  description?: string;
  order: number;
  type: LectureType;
  duration: number;
  videoUrl?: string;
  transcript?: string;
  closedCaptions?: string;
  notesUrl?: string;
  slidesUrl?: string;
  supplementaryMaterials: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  viewCount?: number;
  averageCompletionRate?: number;
}

export enum LectureType {
  VIDEO = 'VIDEO',
  LIVE = 'LIVE',
  INTERACTIVE = 'INTERACTIVE',
  READING = 'READING',
  QUIZ = 'QUIZ'
}

// ============================================================================
// File Upload Types
// ============================================================================

export interface FileUploadRequest {
  file: Buffer;
  filename: string;
  mimetype: string;
  courseId?: string;
  moduleId?: string;
  lectureId?: string;
  type: FileType;
}

export interface FileUploadResponse {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
  uploadedAt: Date;
}

export enum FileType {
  VIDEO = 'VIDEO',
  PDF = 'PDF',
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
  ARCHIVE = 'ARCHIVE'
}

// ============================================================================
// Content Versioning Types
// ============================================================================

export interface ContentVersion {
  id: string;
  entityType: 'COURSE' | 'MODULE' | 'LECTURE';
  entityId: string;
  version: number;
  changes: Record<string, any>;
  changedBy: string;
  changeReason?: string;
  createdAt: Date;
}

export interface VersionHistoryResponse {
  versions: ContentVersion[];
  currentVersion: number;
  totalVersions: number;
}

// ============================================================================
// Course Preview Types
// ============================================================================

export interface CoursePreviewResponse {
  course: CourseResponse;
  sampleLectures: LectureResponse[];
  instructorInfo: {
    name: string;
    bio?: string;
    avatarUrl?: string;
  };
  reviews: CourseReview[];
  prerequisites: CourseResponse[];
}

export interface CourseReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

// ============================================================================
// Enrollment Types
// ============================================================================

export interface EnrollmentRequest {
  courseId: string;
  paymentMethod?: 'CREDIT_CARD' | 'SCROLL_COIN' | 'SCHOLARSHIP';
  scholarshipId?: string;
}

export interface EnrollmentResponse {
  id: string;
  userId: string;
  courseId: string;
  progress: number;
  scrollXPEarned: number;
  currentModule: number;
  status: string;
  startedAt: Date;
  completedAt?: Date;
}

// ============================================================================
// PDF Generation Types
// ============================================================================

export interface PDFGenerationRequest {
  type: 'LECTURE_NOTES' | 'SLIDES' | 'SYLLABUS' | 'CERTIFICATE';
  entityId: string;
  options?: {
    includeImages?: boolean;
    includeScriptures?: boolean;
    format?: 'A4' | 'LETTER';
    orientation?: 'portrait' | 'landscape';
  };
}

export interface PDFGenerationResponse {
  url: string;
  filename: string;
  size: number;
  generatedAt: Date;
}

// ============================================================================
// Video Processing Types
// ============================================================================

export interface VideoProcessingRequest {
  videoUrl: string;
  operations: VideoOperation[];
}

export interface VideoOperation {
  type: 'TRANSCODE' | 'THUMBNAIL' | 'CAPTIONS' | 'COMPRESS';
  options?: Record<string, any>;
}

export interface VideoProcessingResponse {
  originalUrl: string;
  processedUrl: string;
  thumbnailUrl?: string;
  captionsUrl?: string;
  duration: number;
  size: number;
  format: string;
  resolution: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

// ============================================================================
// Search and Filter Types
// ============================================================================

export interface CourseSearchParams {
  query?: string;
  facultyId?: string;
  difficulty?: Difficulty;
  minDuration?: number;
  maxDuration?: number;
  maxScrollCoinCost?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'title' | 'createdAt' | 'popularity' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface CourseSearchResponse {
  courses: CourseResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface CourseAnalytics {
  courseId: string;
  totalEnrollments: number;
  activeEnrollments: number;
  completionRate: number;
  averageProgress: number;
  averageRating: number;
  totalScrollXPAwarded: number;
  totalScrollCoinEarned: number;
  popularModules: {
    moduleId: string;
    title: string;
    viewCount: number;
  }[];
  engagementMetrics: {
    averageTimeSpent: number;
    videoCompletionRate: number;
    assignmentSubmissionRate: number;
  };
}
