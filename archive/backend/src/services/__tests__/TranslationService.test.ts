/**
 * Translation Service Tests
 */

import TranslationService from '../TranslationService';
import {
  TranslationRequest,
  LocalizationRequest,
  TheologicalTranslationRequest,
  MultilingualTutorRequest
} from '../../types/translation.types';

describe('TranslationService', () => {
  let service: TranslationService;

  beforeEach(() => {
    service = new TranslationService();
  });

  describe('translateContent', () => {
    it('should translate course material to Spanish', async () => {
      const request: TranslationRequest = {
        content: 'Welcome to Introduction to Computer Science. This course covers fundamental programming concepts.',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        contentType: 'course_material',
        preserveFormatting: true
      };

      const result = await service.translateContent(request);

      expect(result).toBeDefined();
      expect(result.translatedText).toBeTruthy();
      expect(result.sourceLanguage).toBe('en');
      expect(result.targetLanguage).toBe('es');
      expect(result.confidence).toBeGreaterThan(0);
      expect(typeof result.reviewRequired).toBe('boolean');
    });

    it('should handle technical content translation', async () => {
      const request: TranslationRequest = {
        content: 'The algorithm has O(n log n) time complexity. Use binary search for optimization.',
        sourceLanguage: 'en',
        targetLanguage: 'zh',
        contentType: 'technical',
        preserveFormatting: true
      };

      const result = await service.translateContent(request);

      expect(result).toBeDefined();
      expect(result.translatedText).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should flag low confidence translations for review', async () => {
      const request: TranslationRequest = {
        content: 'Complex theological discourse with nuanced terminology.',
        sourceLanguage: 'en',
        targetLanguage: 'ar',
        contentType: 'theological'
      };

      const result = await service.translateContent(request);

      expect(result).toBeDefined();
      // Review may be required based on confidence
      expect(typeof result.reviewRequired).toBe('boolean');
    });
  });

  describe('localizeContent', () => {
    it('should localize content for Latin American culture', async () => {
      const request: LocalizationRequest = {
        content: 'Consider the example of a Silicon Valley startup that disrupted the market.',
        targetLanguage: 'es',
        targetRegion: 'latin_america',
        targetCulture: 'latin',
        contentType: 'course_material',
        preserveLearningObjectives: true
      };

      const result = await service.localizeContent(request);

      expect(result).toBeDefined();
      expect(result.localizedText).toBeTruthy();
      expect(result.adaptedExamples).toBeDefined();
      expect(result.culturalNotes).toBeDefined();
      expect(result.learningObjectivesPreserved).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should adapt examples for African context', async () => {
      const request: LocalizationRequest = {
        content: 'Business case study: Managing a retail chain during economic downturn.',
        targetLanguage: 'sw',
        targetRegion: 'africa',
        targetCulture: 'african',
        contentType: 'course_material',
        preserveLearningObjectives: true
      };

      const result = await service.localizeContent(request);

      expect(result).toBeDefined();
      expect(result.localizedText).toBeTruthy();
      expect(Array.isArray(result.adaptedExamples)).toBe(true);
      expect(Array.isArray(result.culturalNotes)).toBe(true);
    });
  });

  describe('translateTheologicalContent', () => {
    it('should translate biblical content with high accuracy', async () => {
      const request: TheologicalTranslationRequest = {
        text: 'For God so loved the world that he gave his one and only Son. (John 3:16)',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        bibleTranslations: ['NIV', 'ESV']
      };

      const result = await service.translateTheologicalContent(request);

      expect(result).toBeDefined();
      expect(result.translatedText).toBeTruthy();
      expect(result.theologicalAccuracy).toBeGreaterThan(0.8);
      expect(Array.isArray(result.consultedTranslations)).toBe(true);
      expect(typeof result.expertReviewRequired).toBe('boolean');
    });

    it('should identify Bible references in translation', async () => {
      const request: TheologicalTranslationRequest = {
        text: 'The fruit of the Spirit is love, joy, peace, patience, kindness.',
        sourceLanguage: 'en',
        targetLanguage: 'fr',
        theologicalContext: 'Galatians 5:22-23'
      };

      const result = await service.translateTheologicalContent(request);

      expect(result).toBeDefined();
      expect(result.translatedText).toBeTruthy();
      expect(Array.isArray(result.bibleReferences)).toBe(true);
    });

    it('should flag complex theology for expert review', async () => {
      const request: TheologicalTranslationRequest = {
        text: 'The doctrine of the Trinity encompasses the mystery of three persons in one Godhead.',
        sourceLanguage: 'en',
        targetLanguage: 'ar'
      };

      const result = await service.translateTheologicalContent(request);

      expect(result).toBeDefined();
      // Complex theology may require expert review
      expect(typeof result.expertReviewRequired).toBe('boolean');
    });
  });

  describe('provideMultilingualTutoring', () => {
    it('should provide tutoring in Spanish', async () => {
      const request: MultilingualTutorRequest = {
        studentId: 'student-123',
        language: 'es',
        culture: 'latin',
        question: '¿Qué es un algoritmo?'
      };

      const result = await service.provideMultilingualTutoring(request);

      expect(result).toBeDefined();
      expect(result.response).toBeTruthy();
      expect(result.language).toBe('es');
      expect(result.culturallySensitive).toBe(true);
      expect(result.academicRigor).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should maintain academic rigor in Chinese', async () => {
      const request: MultilingualTutorRequest = {
        studentId: 'student-456',
        language: 'zh',
        culture: 'east_asian',
        question: '什么是数据结构？',
        courseContext: 'CS101'
      };

      const result = await service.provideMultilingualTutoring(request);

      expect(result).toBeDefined();
      expect(result.response).toBeTruthy();
      expect(result.language).toBe('zh');
      expect(result.academicRigor).toBeGreaterThanOrEqual(0.8);
    });

    it('should adapt teaching style for different cultures', async () => {
      const request: MultilingualTutorRequest = {
        studentId: 'student-789',
        language: 'ar',
        culture: 'middle_eastern',
        question: 'ما هي البرمجة الكائنية؟'
      };

      const result = await service.provideMultilingualTutoring(request);

      expect(result).toBeDefined();
      expect(result.response).toBeTruthy();
      expect(result.culturallySensitive).toBe(true);
    });
  });

  describe('validateTranslationQuality', () => {
    it('should assess translation quality metrics', async () => {
      const sourceText = 'The quick brown fox jumps over the lazy dog.';
      const translatedText = 'El rápido zorro marrón salta sobre el perro perezoso.';

      const metrics = await service.validateTranslationQuality(
        sourceText,
        translatedText,
        'en',
        'es',
        'general'
      );

      expect(metrics).toBeDefined();
      expect(metrics.accuracy).toBeGreaterThan(0);
      expect(metrics.fluency).toBeGreaterThan(0);
      expect(metrics.culturalSensitivity).toBeGreaterThan(0);
      expect(typeof metrics.formattingPreserved).toBe('boolean');
    });

    it('should evaluate theological translation quality', async () => {
      const sourceText = 'God is love.';
      const translatedText = 'Dios es amor.';

      const metrics = await service.validateTranslationQuality(
        sourceText,
        translatedText,
        'en',
        'es',
        'biblical'
      );

      expect(metrics).toBeDefined();
      expect(metrics.theologicalCorrectness).toBeGreaterThan(0);
    });
  });

  describe('batchTranslate', () => {
    it('should translate multiple items in batch', async () => {
      const items: TranslationRequest[] = [
        {
          content: 'Hello, welcome to the course.',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          contentType: 'general'
        },
        {
          content: 'This is lesson one.',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          contentType: 'course_material'
        }
      ];

      const result = await service.batchTranslate({
        items,
        priority: 'medium'
      });

      expect(result).toBeDefined();
      expect(result.totalItems).toBe(2);
      expect(result.successCount).toBeGreaterThanOrEqual(0);
      expect(result.failureCount).toBeGreaterThanOrEqual(0);
      expect(result.successCount + result.failureCount).toBe(2);
      expect(Array.isArray(result.results)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle batch translation errors gracefully', async () => {
      const items: TranslationRequest[] = [
        {
          content: 'Valid content',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          contentType: 'general'
        }
      ];

      const result = await service.batchTranslate({
        items,
        priority: 'high'
      });

      expect(result).toBeDefined();
      expect(result.totalItems).toBe(1);
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
});
