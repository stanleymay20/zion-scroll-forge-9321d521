/**
 * ScrollLibrary TypeScript Type Definitions
 * Comprehensive type definitions for the ScrollLibrary system
 */

// Core Library Types
export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  subject: string;
  level: AcademicLevel;
  courseReference?: string;
  chapters: Chapter[];
  diagrams: Diagram[];
  metadata: BookMetadata;
  integrityHash: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface Chapter {
  id: string;
  bookId: string;
  title: string;
  orderIndex: number;
  content: string; // Markdown format
  diagrams: Diagram[];
  references: Reference[];
  summaries: Summary[];
  exercises: Exercise[];
  readingTime: number; // minutes
  createdAt: Date;
  updatedAt: Date;
}

export interface BookMetadata {
  authorAgent: string; // 'ScrollAuthorGPT'
  version: string;
  scrollIntegrityHash: string;
  generationDate: Date;
  lastValidated: Date;
  qualityScore: number;
  theologicalAlignment: number;
}

export interface CourseMaterial {
  id: string;
  courseId: string;
  textbookId?: string;
  workbookId?: string;
  lectureSlides: string[]; // Array of slide deck IDs
  studyPackId?: string;
  pastQuestions: Question[];
  readingList: ReadingListItem[];
  createdAt: Date;
  updatedAt: Date;
}

// Knowledge Graph Types
export interface KnowledgeNode {
  id: string;
  concept: string;
  definition: string;
  relationships: Relationship[];
  sources: Source[];
  embeddings: number[]; // Vector representation
  relatedBooks: string[]; // Book IDs
  relatedChapters: string[]; // Chapter IDs
}

export interface Relationship {
  type: RelationType;
  targetNodeId: string;
  strength: number; // 0-1
}

export type RelationType = 'prerequisite' | 'related' | 'extends' | 'contradicts';

// Study Pack Types
export interface StudyPack {
  id: string;
  courseId: string;
  summaryBooklet: string; // PDF URL
  practiceQuestions: Question[];
  flashcards: Flashcard[];
  diagrams: Diagram[];
  cheatSheets: CheatSheet[];
  quizzes: Quiz[];
  createdAt: Date;
}

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
}

export type QuestionType = 'multiple-choice' | 'essay' | 'short-answer';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: string;
}

export interface CheatSheet {
  id: string;
  title: string;
  content: string;
  category: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  timeLimit?: number;
}

// Search Types
export interface SearchQuery {
  query: string;
  type: SearchType;
  filters?: SearchFilters;
  limit?: number;
}

export type SearchType = 'semantic' | 'prophetic' | 'keyword';

export interface SearchFilters {
  subject?: string;
  level?: string;
  courseId?: string;
  contentType?: string;
}

export interface SearchResult {
  bookId: string;
  chapterId?: string;
  title: string;
  excerpt: string;
  relevanceScore: number;
  propheticRelevance?: number;
  conceptConnections: string[];
}

// Content Types
export interface Diagram {
  id: string;
  type: DiagramType;
  content: string;
  caption: string;
}

export type DiagramType = 'mermaid' | 'chart' | 'illustration';

// ScrollScribeGPT Types
export interface FormattedContent {
  id: string;
  originalContent: string;
  formattedContent: string;
  style: FormatStyle;
  metadata: FormattingMetadata;
  createdAt: Date;
}

export interface FormatStyle {
  type: FormatType;
  options: FormatOptions;
}

export type FormatType = 'academic' | 'textbook' | 'study-guide' | 'presentation' | 'web';

export interface FormatOptions {
  fontSize?: number;
  lineHeight?: number;
  margins?: MarginSettings;
  includeHeaders?: boolean;
  includeFooters?: boolean;
  includeTOC?: boolean;
  includeImages?: boolean;
  includeDiagrams?: boolean;
}

export interface MarginSettings {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface FormattingMetadata {
  wordCount: number;
  pageCount?: number;
  readingTime: number;
  complexity: number; // 0-1 scale
  formattingAgent: string;
}

export interface Table {
  id: string;
  title?: string;
  headers: string[];
  rows: TableRow[];
  style: TableStyle;
  caption?: string;
  createdAt: Date;
}

export interface TableRow {
  cells: TableCell[];
}

export interface TableCell {
  content: string;
  type: CellType;
  alignment?: TextAlignment;
  formatting?: CellFormatting;
}

export type CellType = 'text' | 'number' | 'date' | 'boolean' | 'link';
export type TextAlignment = 'left' | 'center' | 'right' | 'justify';

export interface CellFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  backgroundColor?: string;
}

export interface TableStyle {
  borderStyle: BorderStyle;
  headerStyle: HeaderStyle;
  alternateRowColors?: boolean;
  responsive?: boolean;
}

export type BorderStyle = 'none' | 'solid' | 'dashed' | 'dotted';

export interface HeaderStyle {
  backgroundColor?: string;
  textColor?: string;
  bold?: boolean;
  fontSize?: number;
}

export interface VisualSummary {
  id: string;
  chapterId: string;
  title: string;
  keyPoints: KeyPoint[];
  diagrams: Diagram[];
  infographics: Infographic[];
  mindMap?: MindMap;
  timeline?: Timeline;
  createdAt: Date;
}

export interface KeyPoint {
  id: string;
  text: string;
  importance: ImportanceLevel;
  category: string;
  visualElement?: VisualElement;
}

export type ImportanceLevel = 'critical' | 'important' | 'supplementary';

export interface VisualElement {
  type: VisualElementType;
  content: string;
  position: ElementPosition;
}

export type VisualElementType = 'icon' | 'image' | 'chart' | 'callout';

export interface ElementPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface Infographic {
  id: string;
  title: string;
  type: InfographicType;
  elements: InfographicElement[];
  layout: LayoutType;
}

export type InfographicType = 'process' | 'comparison' | 'hierarchy' | 'timeline' | 'statistics';
export type LayoutType = 'vertical' | 'horizontal' | 'grid' | 'circular';

export interface InfographicElement {
  id: string;
  type: ElementType;
  content: string;
  position: ElementPosition;
  style: ElementStyle;
}

export type ElementType = 'text' | 'shape' | 'icon' | 'image' | 'connector';

export interface ElementStyle {
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontWeight?: string;
  borderColor?: string;
  borderWidth?: number;
}

export interface MindMap {
  id: string;
  centralTopic: string;
  branches: MindMapBranch[];
  layout: MindMapLayout;
}

export interface MindMapBranch {
  id: string;
  topic: string;
  level: number;
  parentId?: string;
  children: MindMapBranch[];
  color?: string;
}

export type MindMapLayout = 'radial' | 'tree' | 'organic';

export interface Timeline {
  id: string;
  title: string;
  events: TimelineEvent[];
  orientation: TimelineOrientation;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  date?: Date;
  order: number;
  category?: string;
}

export type TimelineOrientation = 'horizontal' | 'vertical';

export interface Reference {
  id: string;
  type: ReferenceType;
  citation: string;
  url?: string;
}

export type ReferenceType = 'academic' | 'biblical' | 'web';

export interface Summary {
  id: string;
  type: SummaryType;
  content: string;
}

export type SummaryType = 'chapter' | 'section';

export interface Exercise {
  id: string;
  type: ExerciseType;
  content: string;
  solution?: string;
}

export type ExerciseType = 'question' | 'problem' | 'reflection';

export interface Source {
  id: string;
  title: string;
  author: string;
  type: SourceType;
  url?: string;
  credibilityScore: number;
}

export type SourceType = 'academic' | 'biblical' | 'web' | 'book';

// Reading List Types
export interface ReadingListItem {
  id: string;
  title: string;
  author: string;
  type: ReadingItemType;
  url?: string;
  required: boolean;
}

export type ReadingItemType = 'book' | 'article' | 'video' | 'website';

// Agent Types
export interface AgentTask {
  id: string;
  agentId: string;
  type: AgentTaskType;
  input: any;
  output?: any;
  status: TaskStatus;
  createdAt: Date;
  completedAt?: Date;
}

export type AgentTaskType = 
  | 'generate-textbook'
  | 'generate-chapter'
  | 'format-content'
  | 'fact-check'
  | 'validate-theology'
  | 'create-embeddings'
  | 'build-knowledge-graph';

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

export interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  qualityScore: number;
  theologicalAlignment?: number;
}

// Course Integration Types
export interface CourseOutline {
  title: string;
  subject: string;
  level: AcademicLevel;
  chapters: ChapterSpec[];
  courseReference?: string;
}

export interface ChapterSpec {
  title: string;
  orderIndex: number;
  topics: string[];
  learningObjectives: string[];
}

export type AcademicLevel = 'beginner' | 'intermediate' | 'advanced';

// Export Types
export interface ExportRequest {
  bookId: string;
  format: ExportFormat;
  options?: ExportOptions;
}

export type ExportFormat = 'pdf' | 'epub' | 'html' | 'print-ready';

export interface ExportOptions {
  includeImages?: boolean;
  includeDiagrams?: boolean;
  includeReferences?: boolean;
  fontSize?: number;
  pageSize?: string;
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
  fileSize?: number;
}

// Reader Engine Types
export interface ReadingSession {
  id: string;
  userId: string;
  bookId: string;
  chapterId?: string;
  position: ReadingPosition;
  annotations: Annotation[];
  bookmarks: Bookmark[];
  startedAt: Date;
  lastAccessedAt: Date;
}

export interface ReadingPosition {
  chapterId: string;
  sectionId?: string;
  scrollPosition: number;
  percentage: number;
}

export interface Annotation {
  id: string;
  text: string;
  note: string;
  position: TextPosition;
  createdAt: Date;
}

export interface TextPosition {
  chapterId: string;
  startOffset: number;
  endOffset: number;
}

export interface Bookmark {
  id: string;
  title: string;
  position: ReadingPosition;
  createdAt: Date;
}

// Audio Types
export interface AudioNarration {
  id: string;
  chapterId: string;
  audioUrl: string;
  duration: number; // seconds
  transcript: string;
  createdAt: Date;
}

// Animation Types
export interface Animation {
  id: string;
  conceptId: string;
  type: AnimationType;
  content: string; // JSON or URL
  duration: number; // seconds
}

export type AnimationType = 'interactive' | 'video' | 'simulation';

// API Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Configuration Types
export interface ScrollLibraryConfig {
  aiServices: {
    openaiApiKey: string;
    claudeApiKey: string;
    maxTokens: number;
    temperature: number;
  };
  database: {
    url: string;
    maxConnections: number;
  };
  storage: {
    cdnUrl: string;
    bucketName: string;
  };
  search: {
    vectorDatabaseUrl: string;
    knowledgeGraphUrl: string;
  };
  features: {
    propheticSearchEnabled: boolean;
    offlineAccessEnabled: boolean;
    audioNarrationEnabled: boolean;
  };
}

// Error Types
export interface ScrollLibraryError extends Error {
  code: string;
  statusCode: number;
  details?: any;
}

export type ErrorCode = 
  | 'BOOK_NOT_FOUND'
  | 'CHAPTER_NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'GENERATION_FAILED'
  | 'SEARCH_FAILED'
  | 'EXPORT_FAILED'
  | 'THEOLOGICAL_ALIGNMENT_FAILED'
  | 'INTEGRITY_HASH_MISMATCH';

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;