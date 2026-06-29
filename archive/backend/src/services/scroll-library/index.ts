/**
 * ScrollLibrary Services Index
 * Central export point for all ScrollLibrary services
 */

// Core Services
export { AgentOrchestrationService } from './AgentOrchestrationService';
export { ScrollAuthorGPTService } from './ScrollAuthorGPTService';
export { ScrollProfessorGPTService } from './ScrollProfessorGPTService';
export { LibraryManagementService } from './LibraryManagementService';

// Types
export type {
  Book,
  Chapter,
  BookMetadata,
  CourseMaterial,
  StudyPack,
  Question,
  Flashcard,
  CheatSheet,
  Quiz,
  SearchQuery,
  SearchResult,
  CourseOutline,
  ChapterSpec,
  ValidationResult,
  BookInput,
  ReadingListItem
} from './AgentOrchestrationService';

export type {
  Textbook,
  ChapterContext,
  BookSummary
} from './ScrollAuthorGPTService';

export type {
  Explanation,
  ProblemSet,
  ReadingGuide,
  Citation,
  Problem,
  Solution,
  Question,
  DiscussionPrompt,
  ReflectionExercise,
  Resource,
  GradingRubric,
  Difficulty
} from './ScrollProfessorGPTService';

export type {
  SearchFilters
} from './LibraryManagementService';

// Configuration
export { scrollLibraryConfig, validateScrollLibraryConfig } from '../../config/scroll-library.config';

// Types
export type { ScrollLibraryConfig } from '../../types/scroll-library.types';