/**
 * Property-Based Tests for VideoProductionService
 * Feature: course-content-creation
 * 
 * These tests verify universal properties that should hold across all inputs
 * using fast-check library for property-based testing.
 */

import * as fc from 'fast-check';
import VideoProductionService from '../VideoProductionService';
import { PrismaClient } from '@prisma/client';
import { LectureInfo } from '../../types/course-content.types';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../AIGatewayService');
jest.mock('../TranslationService');
jest.mock('../FileStorageService');
jest.mock('../../utils/logger');

describe('VideoProductionService Property-Based Tests', () => {
  let service: VideoProductionService;
  let mockPrisma: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup Prisma mock with proper structure
    mockPrisma = {
      lecture: {
        findUnique: jest.fn(),
        update: jest.fn()
      }
    };
    
    // Create service instance
    service = new VideoProductionService();
    
    // Inject mock Prisma
    (service as any).prisma = mockPrisma;
  });

  // ============================================================================
  // Generators for Property-Based Testing
  // ============================================================================

  /**
   * Generate valid lecture info
   */
  const lectureInfoGenerator = (): fc.Arbitrary<LectureInfo> => {
    return fc.record({
      lectureId: fc.uuid(),
      facultyId: fc.uuid(),
      requestedDate: fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }),
      duration: fc.integer({ min: 15, max: 180 }), // 15 minutes to 3 hours
      studioLocation: fc.option(fc.constantFrom('Main Studio', 'Studio A', 'Studio B', 'Remote')),
      recordingType: fc.option(fc.constantFrom('STANDARD', 'ADVANCED', 'REMOTE'))
    });
  };

  /**
   * Generate valid video ID
   */
  const videoIdGenerator = (): fc.Arbitrary<string> => {
    return fc.uuid();
  };

  /**
   * Generate valid language codes
   */
  const languageCodeGenerator = (): fc.Arbitrary<string> => {
    return fc.constantFrom('en', 'es', 'fr', 'pt', 'zh', 'ar', 'hi', 'sw', 'ru', 'ko');
  };

  /**
   * Generate array of language codes (at least 9 for multilingual requirement)
   * Ensures exactly 9 unique languages
   */
  const multilingualLanguagesGenerator = (): fc.Arbitrary<string[]> => {
    const allLanguages = ['en', 'es', 'fr', 'pt', 'zh', 'ar', 'hi', 'sw', 'ru', 'ko'];
    return fc.shuffledSubarray(allLanguages, { minLength: 9, maxLength: 9 });
  };

  // ============================================================================
  // Property 6: Automatic Caption Generation
  // Feature: course-content-creation, Property 6: Automatic Caption Generation
  // Validates: Requirements 2.3
  // ============================================================================

  describe('Property 6: Automatic Caption Generation', () => {
    it('should generate both closed captions and complete transcript for any finalized lecture video', async () => {
      await fc.assert(
        fc.asyncProperty(
          videoIdGenerator(),
          languageCodeGenerator(),
          async (videoId, language) => {
            // Setup mock lecture data
            mockPrisma.lecture.findUnique = jest.fn().mockResolvedValue({
              id: videoId,
              videoUrl: `https://cdn.example.com/videos/${videoId}.mp4`,
              duration: 30, // 30 minutes
              closedCaptions: null,
              transcript: null
            });

            mockPrisma.lecture.update = jest.fn().mockResolvedValue({
              id: videoId,
              closedCaptions: `https://cdn.example.com/captions/${videoId}_${language}.vtt`,
              transcript: 'Generated transcript content'
            });

            // Mock file storage
            (service as any).fileStorage.uploadFile = jest.fn()
              .mockResolvedValueOnce(`https://cdn.example.com/captions/${videoId}_${language}.vtt`)
              .mockResolvedValueOnce(`https://cdn.example.com/transcripts/${videoId}_${language}.txt`);

            // Mock AI Gateway
            (service as any).aiGateway.generateCompletion = jest.fn().mockResolvedValue({
              content: 'This is a generated transcript of the lecture content with proper punctuation and formatting.',
              confidence: 0.95
            });

            // Generate captions
            const captions = await service.generateCaptions(videoId, language);

            // Property: Both captions and transcript must be generated
            expect(captions).toBeDefined();
            expect(captions.captionUrl).toBeDefined();
            expect(captions.captionUrl).toContain('.vtt');
            expect(captions.transcriptUrl).toBeDefined();
            expect(captions.transcriptUrl).toContain('.txt');
            expect(captions.transcript).toBeDefined();
            expect(captions.transcript.length).toBeGreaterThan(0);
            expect(captions.format).toBe('VTT');
            expect(captions.language).toBe(language);
            expect(captions.videoId).toBe(videoId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate captions with proper VTT format structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          videoIdGenerator(),
          async (videoId) => {
            // Setup mock
            mockPrisma.lecture.findUnique = jest.fn().mockResolvedValue({
              id: videoId,
              videoUrl: `https://cdn.example.com/videos/${videoId}.mp4`,
              duration: 20,
              closedCaptions: null,
              transcript: null
            });

            mockPrisma.lecture.update = jest.fn().mockResolvedValue({
              id: videoId,
              closedCaptions: `https://cdn.example.com/captions/${videoId}_en.vtt`,
              transcript: 'Test transcript'
            });

            (service as any).fileStorage.uploadFile = jest.fn()
              .mockResolvedValueOnce(`https://cdn.example.com/captions/${videoId}_en.vtt`)
              .mockResolvedValueOnce(`https://cdn.example.com/transcripts/${videoId}_en.txt`);

            (service as any).aiGateway.generateCompletion = jest.fn().mockResolvedValue({
              content: 'Test transcript content for validation.',
              confidence: 0.95
            });

            const captions = await service.generateCaptions(videoId, 'en');

            // Property: Captions must have required fields
            expect(captions.wordCount).toBeGreaterThan(0);
            expect(captions.duration).toBeGreaterThan(0);
            expect(captions.accuracy).toBeGreaterThan(0);
            expect(captions.accuracy).toBeLessThanOrEqual(1);
            expect(captions.generatedAt).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // Property 7: Video Streaming Optimization
  // Feature: course-content-creation, Property 7: Video Streaming Optimization
  // Validates: Requirements 2.4
  // ============================================================================

  describe('Property 7: Video Streaming Optimization', () => {
    it('should generate adaptive bitrate streaming URLs for multiple quality levels for any published video', async () => {
      await fc.assert(
        fc.asyncProperty(
          videoIdGenerator(),
          async (videoId) => {
            // Setup mock
            mockPrisma.lecture.findUnique = jest.fn().mockResolvedValue({
              id: videoId,
              videoUrl: `https://cdn.example.com/videos/${videoId}.mp4`,
              duration: 45
            });

            // Optimize for streaming
            const streamingAsset = await service.optimizeForStreaming(videoId);

            // Property: Must generate multiple quality variants
            expect(streamingAsset).toBeDefined();
            expect(streamingAsset.videoId).toBe(videoId);
            expect(streamingAsset.variants).toBeDefined();
            expect(streamingAsset.variants.length).toBeGreaterThanOrEqual(4); // At least 360p, 480p, 720p, 1080p

            // Property: Each variant must have required fields
            streamingAsset.variants.forEach(variant => {
              expect(variant.quality).toBeDefined();
              expect(variant.resolution).toBeDefined();
              expect(variant.bitrate).toBeGreaterThan(0);
              expect(variant.url).toBeDefined();
              expect(variant.url).toContain(videoId);
              expect(variant.codec).toBeDefined();
              expect(variant.format).toBeDefined();
            });

            // Property: Variants should be ordered by quality (bitrate)
            for (let i = 1; i < streamingAsset.variants.length; i++) {
              expect(streamingAsset.variants[i].bitrate).toBeGreaterThan(
                streamingAsset.variants[i - 1].bitrate
              );
            }

            // Property: Must have HLS manifest
            expect(streamingAsset.manifestUrl).toBeDefined();
            expect(streamingAsset.manifestUrl).toContain('.m3u8');
            expect(streamingAsset.protocol).toBe('HLS');

            // Property: Must have thumbnail sprite
            expect(streamingAsset.thumbnailSpriteUrl).toBeDefined();

            // Property: Must have optimization timestamp
            expect(streamingAsset.optimizedAt).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate streaming assets with CDN support', async () => {
      await fc.assert(
        fc.asyncProperty(
          videoIdGenerator(),
          async (videoId) => {
            mockPrisma.lecture.findUnique = jest.fn().mockResolvedValue({
              id: videoId,
              videoUrl: `https://cdn.example.com/videos/${videoId}.mp4`,
              duration: 30
            });

            const streamingAsset = await service.optimizeForStreaming(videoId);

            // Property: CDN must be enabled and configured
            expect(streamingAsset.cdnEnabled).toBe(true);
            expect(streamingAsset.cdnUrl).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // Property 8: Multilingual Support
  // Feature: course-content-creation, Property 8: Multilingual Support
  // Validates: Requirements 2.5
  // ============================================================================

  describe('Property 8: Multilingual Support', () => {
    it('should support generation of subtitles or dubbing for at least 9 languages for any video', async () => {
      await fc.assert(
        fc.asyncProperty(
          videoIdGenerator(),
          multilingualLanguagesGenerator(),
          async (videoId, languages) => {
            // Ensure we have at least 9 unique languages
            const uniqueLanguages = Array.from(new Set(languages)).slice(0, 9);
            
            // Setup mocks
            mockPrisma.lecture.findUnique = jest.fn().mockResolvedValue({
              id: videoId,
              videoUrl: `https://cdn.example.com/videos/${videoId}.mp4`,
              duration: 30,
              closedCaptions: `https://cdn.example.com/captions/${videoId}_en.vtt`,
              transcript: 'Original English transcript for translation.'
            });

            // Mock caption generation for original
            (service as any).fileStorage.uploadFile = jest.fn()
              .mockImplementation((buffer, path) => {
                return Promise.resolve(`https://cdn.example.com/${path}`);
              });

            (service as any).aiGateway.generateCompletion = jest.fn().mockResolvedValue({
              content: 'Original English transcript for translation.',
              confidence: 0.95
            });

            // Mock translation service
            (service as any).translationService.translateContent = jest.fn()
              .mockImplementation((request) => {
                return Promise.resolve({
                  translatedText: `Translated content in ${request.targetLanguage}`,
                  sourceLanguage: request.sourceLanguage,
                  targetLanguage: request.targetLanguage,
                  confidence: 0.9
                });
              });

            // Create multilingual version
            const multilingualAsset = await service.createMultilingualVersion(videoId, uniqueLanguages);

            // Property: Must support at least 9 languages
            expect(multilingualAsset).toBeDefined();
            expect(multilingualAsset.videoId).toBe(videoId);
            expect(multilingualAsset.supportedLanguages).toHaveLength(uniqueLanguages.length);
            expect(multilingualAsset.supportedLanguages.length).toBeGreaterThanOrEqual(9);

            // Property: Total languages includes original
            expect(multilingualAsset.totalLanguages).toBe(uniqueLanguages.length + 1);

            // Property: Each translation must have required fields
            expect(multilingualAsset.translations).toHaveLength(uniqueLanguages.length);
            multilingualAsset.translations.forEach((translation, index) => {
              expect(translation.language).toBeDefined();
              expect(translation.languageCode).toBe(uniqueLanguages[index]);
              expect(translation.subtitleUrl).toBeDefined();
              expect(translation.subtitleUrl).toContain('.vtt');
              expect(translation.translatedTranscript).toBeDefined();
              expect(translation.translatedTranscript.length).toBeGreaterThan(0);
            });

            // Property: Original language must be specified
            expect(multilingualAsset.originalLanguage).toBe('en');

            // Property: Must have creation timestamp
            expect(multilingualAsset.createdAt).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 50 } // Reduced runs due to complexity
      );
    });

    it('should generate unique subtitle URLs for each language', async () => {
      await fc.assert(
        fc.asyncProperty(
          videoIdGenerator(),
          fc.array(languageCodeGenerator(), { minLength: 3, maxLength: 5 }),
          async (videoId, languages) => {
            const uniqueLanguages = Array.from(new Set(languages));

            mockPrisma.lecture.findUnique = jest.fn().mockResolvedValue({
              id: videoId,
              videoUrl: `https://cdn.example.com/videos/${videoId}.mp4`,
              duration: 30,
              closedCaptions: `https://cdn.example.com/captions/${videoId}_en.vtt`,
              transcript: 'Original transcript'
            });

            (service as any).fileStorage.uploadFile = jest.fn()
              .mockImplementation((buffer, path) => {
                return Promise.resolve(`https://cdn.example.com/${path}`);
              });

            (service as any).aiGateway.generateCompletion = jest.fn().mockResolvedValue({
              content: 'Original transcript',
              confidence: 0.95
            });

            (service as any).translationService.translateContent = jest.fn()
              .mockImplementation((request) => {
                return Promise.resolve({
                  translatedText: `Translated to ${request.targetLanguage}`,
                  sourceLanguage: request.sourceLanguage,
                  targetLanguage: request.targetLanguage,
                  confidence: 0.9
                });
              });

            const multilingualAsset = await service.createMultilingualVersion(videoId, uniqueLanguages);

            // Property: All subtitle URLs must be unique
            const subtitleUrls = multilingualAsset.translations.map(t => t.subtitleUrl);
            const uniqueUrls = new Set(subtitleUrls);
            expect(uniqueUrls.size).toBe(subtitleUrls.length);

            // Property: Each URL must contain the language code
            multilingualAsset.translations.forEach(translation => {
              expect(translation.subtitleUrl).toContain(translation.languageCode);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // Additional Property Tests
  // ============================================================================

  describe('Recording Session Scheduling Properties', () => {
    it('should create valid recording sessions for any valid lecture info', async () => {
      await fc.assert(
        fc.asyncProperty(
          lectureInfoGenerator(),
          async (lectureInfo) => {
            // Setup mock
            mockPrisma.lecture.findUnique = jest.fn().mockResolvedValue({
              id: lectureInfo.lectureId,
              title: 'Test Lecture',
              module: {
                course: {
                  id: 'course-123',
                  title: 'Test Course'
                }
              }
            });

            const session = await service.scheduleRecording(lectureInfo);

            // Property: Session must have all required fields
            expect(session).toBeDefined();
            expect(session.id).toBeDefined();
            expect(session.lectureId).toBe(lectureInfo.lectureId);
            expect(session.facultyId).toBe(lectureInfo.facultyId);
            expect(session.scheduledDate).toEqual(lectureInfo.requestedDate);
            expect(session.duration).toBe(lectureInfo.duration);
            expect(session.status).toBe('SCHEDULED');
            expect(session.equipment).toBeDefined();
            expect(session.equipment.length).toBeGreaterThan(0);
            expect(session.technicalRequirements).toBeDefined();
            expect(session.technicalRequirements.resolution).toBe('1080p');
            expect(session.createdAt).toBeInstanceOf(Date);
            expect(session.updatedAt).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
