/**
 * Translation & Localization System Types
 * Supports multilingual content delivery with cultural adaptation
 */

export type SupportedLanguage = 
  | 'en' // English
  | 'es' // Spanish
  | 'fr' // French
  | 'pt' // Portuguese
  | 'zh' // Chinese
  | 'ar' // Arabic
  | 'hi' // Hindi
  | 'sw' // Swahili
  | 'ru' // Russian
  | 'ko'; // Korean

export type ContentType = 
  | 'course_material'
  | 'lecture'
  | 'assessment'
  | 'discussion'
  | 'biblical'
  | 'theological'
  | 'technical'
  | 'general';

export type Region = 
  | 'north_america'
  | 'latin_america'
  | 'europe'
  | 'middle_east'
  | 'africa'
  | 'south_asia'
  | 'east_asia'
  | 'southeast_asia'
  | 'oceania';

export type Culture = 
  | 'western'
  | 'latin'
  | 'middle_eastern'
  | 'african'
  | 'south_asian'
  | 'east_asian'
  | 'southeast_asian';

export interface TranslationRequest {
  content: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  contentType: ContentType;
  preserveFormatting?: boolean;
  context?: string;
  metadata?: Record<string, any>;
}

export interface TranslatedContent {
  translatedText: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  confidence: number;
  theologicalAccuracy?: number;
  culturalSensitivity?: number;
  reviewRequired: boolean;
  warnings?: string[];
  metadata?: Record<string, any>;
}

export interface LocalizationRequest {
  content: string;
  targetLanguage: SupportedLanguage;
  targetRegion: Region;
  targetCulture: Culture;
  contentType: ContentType;
  preserveLearningObjectives: boolean;
}

export interface LocalizedContent {
  localizedText: string;
  adaptedExamples: string[];
  culturalNotes: string[];
  learningObjectivesPreserved: boolean;
  confidence: number;
  reviewRequired: boolean;
}

export interface TheologicalTranslationRequest {
  text: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  bibleTranslations?: string[];
  theologicalContext?: string;
}

export interface TheologicalTranslation {
  translatedText: string;
  bibleReferences: BibleReference[];
  theologicalAccuracy: number;
  consultedTranslations: string[];
  expertReviewRequired: boolean;
  notes?: string[];
}

export interface BibleReference {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
}

export interface MultilingualTutorRequest {
  studentId: string;
  language: SupportedLanguage;
  culture: Culture;
  question: string;
  courseContext?: string;
}

export interface MultilingualTutorResponse {
  response: string;
  language: SupportedLanguage;
  culturallySensitive: boolean;
  academicRigor: number;
  confidence: number;
  sources?: string[];
}

export interface TranslationQualityMetrics {
  accuracy: number;
  fluency: number;
  theologicalCorrectness: number;
  culturalSensitivity: number;
  technicalAccuracy: number;
  formattingPreserved: boolean;
  reviewerScore?: number;
}

export interface TranslationCache {
  sourceText: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  translatedText: string;
  contentType: ContentType;
  quality: TranslationQualityMetrics;
  createdAt: Date;
  expiresAt: Date;
}

export interface LanguageProfile {
  language: SupportedLanguage;
  proficiency: 'native' | 'fluent' | 'intermediate' | 'beginner';
  preferredDialect?: string;
  culturalContext: Culture;
  region: Region;
}

export interface TranslationError {
  code: string;
  message: string;
  sourceText?: string;
  targetLanguage?: SupportedLanguage;
  suggestions?: string[];
}

export interface BatchTranslationRequest {
  items: TranslationRequest[];
  priority: 'high' | 'medium' | 'low';
  deadline?: Date;
}

export interface BatchTranslationResult {
  results: TranslatedContent[];
  totalItems: number;
  successCount: number;
  failureCount: number;
  errors: TranslationError[];
}
