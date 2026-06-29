/**
 * Accessibility AI Service Tests
 * Tests for WCAG compliance and accommodation management
 */

import { AccessibilityAIService } from '../AccessibilityAIService';
import { AltTextGenerationService } from '../AltTextGenerationService';
import { CaptionGenerationService } from '../CaptionGenerationService';
import { ComplianceCheckingService } from '../ComplianceCheckingService';
import { AutomatedFixService } from '../AutomatedFixService';
import { AccommodationService } from '../AccommodationService';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock dependencies
jest.mock('../AltTextGenerationService');
jest.mock('../CaptionGenerationService');
jest.mock('../ComplianceCheckingService');
jest.mock('../AutomatedFixService');
jest.mock('../AccommodationService');
jest.mock('../../utils/logger');

describe('AccessibilityAIService', () => {
  let service: AccessibilityAIService;
  let mockAltTextService: jest.Mocked<AltTextGenerationService>;
  let mockCaptionService: jest.Mocked<CaptionGenerationService>;
  let mockComplianceService: jest.Mocked<ComplianceCheckingService>;
  let mockFixService: jest.Mocked<AutomatedFixService>;
  let mockAccommodationService: jest.Mocked<AccommodationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AccessibilityAIService();
    
    mockAltTextService = (AltTextGenerationService as jest.MockedClass<typeof AltTextGenerationService>).mock.instances[0] as jest.Mocked<AltTextGenerationService>;
    mockCaptionService = (CaptionGenerationService as jest.MockedClass<typeof CaptionGenerationService>).mock.instances[0] as jest.Mocked<CaptionGenerationService>;
    mockComplianceService = (ComplianceCheckingService as jest.MockedClass<typeof ComplianceCheckingService>).mock.instances[0] as jest.Mocked<ComplianceCheckingService>;
    mockFixService = (AutomatedFixService as jest.MockedClass<typeof AutomatedFixService>).mock.instances[0] as jest.Mocked<AutomatedFixService>;
    mockAccommodationService = (AccommodationService as jest.MockedClass<typeof AccommodationService>).mock.instances[0] as jest.Mocked<AccommodationService>;
  });

  describe('generateAltText', () => {
    it('should generate alt text for an image', async () => {
      const mockResult = {
        altText: 'A diagram showing the water cycle',
        longDescription: 'Detailed description of evaporation, condensation, and precipitation',
        confidence: 0.95,
        qualityScore: 0.9,
        suggestions: [],
        wcagCompliant: true
      };

      mockAltTextService.generateAltText = jest.fn().mockResolvedValue(mockResult);

      const result = await service.generateAltText({
        imageUrl: 'https://example.com/water-cycle.png',
        contentType: 'diagram',
        context: 'Science lesson on water cycle'
      });

      expect(result).toEqual(mockResult);
      expect(mockAltTextService.generateAltText).toHaveBeenCalledWith({
        imageUrl: 'https://example.com/water-cycle.png',
        contentType: 'diagram',
        context: 'Science lesson on water cycle'
      });
    });

    it('should handle errors gracefully', async () => {
      mockAltTextService.generateAltText = jest.fn().mockRejectedValue(new Error('API error'));

      await expect(service.generateAltText({
        imageUrl: 'https://example.com/image.png'
      })).rejects.toThrow('Failed to generate alt text');
    });
  });

  describe('generateCaptions', () => {
    it('should generate captions for a video', async () => {
      const mockResult = {
        segments: [
          {
            startTime: 0,
            endTime: 5,
            text: 'Welcome to the lecture',
            speaker: 'Professor Smith',
            confidence: 0.95
          }
        ],
        fullTranscript: 'Welcome to the lecture',
        vttFormat: 'WEBVTT\n\n1\n00:00:00.000 --> 00:00:05.000\nWelcome to the lecture',
        srtFormat: '1\n00:00:00,000 --> 00:00:05,000\nWelcome to the lecture',
        confidence: 0.95,
        language: 'en',
        speakers: ['Professor Smith']
      };

      mockCaptionService.generateCaptions = jest.fn().mockResolvedValue(mockResult);

      const result = await service.generateCaptions({
        videoUrl: 'https://example.com/lecture.mp4',
        language: 'en',
        includeSpeakerIdentification: true
      });

      expect(result).toEqual(mockResult);
      expect(mockCaptionService.generateCaptions).toHaveBeenCalled();
    });

    it('should handle audio URLs', async () => {
      const mockResult = {
        segments: [],
        fullTranscript: 'Audio transcript',
        vttFormat: 'WEBVTT',
        srtFormat: 'SRT',
        confidence: 0.9,
        language: 'en'
      };

      mockCaptionService.generateCaptions = jest.fn().mockResolvedValue(mockResult);

      await service.generateCaptions({
        audioUrl: 'https://example.com/audio.mp3'
      });

      expect(mockCaptionService.generateCaptions).toHaveBeenCalled();
    });
  });

  describe('checkCompliance', () => {
    it('should check WCAG compliance', async () => {
      const mockReport = {
        wcagLevel: 'AA' as const,
        overallScore: 0.85,
        violations: [
          {
            type: 'missing_alt' as const,
            severity: 'serious' as const,
            element: '<img src="test.jpg">',
            description: 'Image missing alt attribute',
            wcagCriterion: '1.1.1 Non-text Content (Level A)',
            recommendation: 'Add alt text',
            canAutoFix: false
          }
        ],
        passedChecks: 12,
        totalChecks: 15,
        automatedFixes: [],
        manualReviewNeeded: true,
        summary: 'Found 3 violations'
      };

      mockComplianceService.checkCompliance = jest.fn().mockResolvedValue(mockReport);

      const result = await service.checkCompliance({
        htmlContent: '<html><body><img src="test.jpg"></body></html>',
        contentType: 'webpage',
        wcagLevel: 'AA'
      });

      expect(result).toEqual(mockReport);
      expect(mockComplianceService.checkCompliance).toHaveBeenCalled();
    });

    it('should handle different WCAG levels', async () => {
      const mockReport = {
        wcagLevel: 'AAA' as const,
        overallScore: 0.95,
        violations: [],
        passedChecks: 15,
        totalChecks: 15,
        automatedFixes: [],
        manualReviewNeeded: false,
        summary: 'No violations found'
      };

      mockComplianceService.checkCompliance = jest.fn().mockResolvedValue(mockReport);

      await service.checkCompliance({
        htmlContent: '<html lang="en"><body></body></html>',
        contentType: 'webpage',
        wcagLevel: 'AAA'
      });

      expect(mockComplianceService.checkCompliance).toHaveBeenCalled();
    });
  });

  describe('applyAutomatedFixes', () => {
    it('should apply automated accessibility fixes', async () => {
      const mockResult = {
        fixedContent: '<html lang="en"><body><img src="test.jpg" alt="Test image"></body></html>',
        appliedFixes: 2
      };

      mockFixService.applyFixes = jest.fn().mockResolvedValue(mockResult);

      const violations = {
        wcagLevel: 'AA' as const,
        overallScore: 0.7,
        violations: [],
        passedChecks: 10,
        totalChecks: 15,
        automatedFixes: [],
        manualReviewNeeded: false,
        summary: 'Test'
      };

      const result = await service.applyAutomatedFixes(
        'content-123',
        '<html><body><img src="test.jpg"></body></html>',
        violations
      );

      expect(result).toEqual(mockResult);
      expect(mockFixService.applyFixes).toHaveBeenCalled();
    });
  });

  describe('recommendAccommodations', () => {
    it('should recommend accommodations for visual impairment', async () => {
      const mockRecommendation = {
        studentId: 'student-123',
        courseId: 'course-456',
        accommodations: [
          {
            type: 'screen_reader_compatible' as const,
            description: 'Ensure screen reader compatibility',
            implementation: 'Add ARIA labels',
            priority: 'required' as const,
            estimatedEffort: 'medium' as const
          }
        ],
        trackingId: 'ACC_student-123_course-456_123456789',
        approvalStatus: 'pending' as const
      };

      mockAccommodationService.recommendAccommodations = jest.fn().mockResolvedValue(mockRecommendation);

      const result = await service.recommendAccommodations({
        studentId: 'student-123',
        disability: 'visual_impairment',
        courseId: 'course-456'
      });

      expect(result).toEqual(mockRecommendation);
      expect(mockAccommodationService.recommendAccommodations).toHaveBeenCalled();
    });

    it('should include modified content for assessments', async () => {
      const mockRecommendation = {
        studentId: 'student-123',
        courseId: 'course-456',
        assessmentId: 'assessment-789',
        accommodations: [],
        modifiedContent: {
          originalContentId: 'assessment-789',
          modifiedContentId: 'assessment-789_modified',
          modificationType: 'visual_impairment_accommodation',
          changes: ['Increased font size', 'Enhanced contrast'],
          accessibilityImprovements: ['Screen reader compatible']
        },
        trackingId: 'ACC_student-123_course-456_123456789',
        approvalStatus: 'pending' as const
      };

      mockAccommodationService.recommendAccommodations = jest.fn().mockResolvedValue(mockRecommendation);

      const result = await service.recommendAccommodations({
        studentId: 'student-123',
        disability: 'visual_impairment',
        courseId: 'course-456',
        assessmentId: 'assessment-789'
      });

      expect(result.modifiedContent).toBeDefined();
      expect(result.modifiedContent?.changes).toContain('Increased font size');
    });
  });

  describe('getAccessibilityMetrics', () => {
    it('should return accessibility metrics', async () => {
      const result = await service.getAccessibilityMetrics('week');

      expect(result).toHaveProperty('altTextGenerated');
      expect(result).toHaveProperty('captionsGenerated');
      expect(result).toHaveProperty('complianceChecks');
      expect(result).toHaveProperty('fixesApplied');
      expect(result).toHaveProperty('accommodationsProvided');
      expect(result).toHaveProperty('totalCost');
      expect(result).toHaveProperty('averageComplianceScore');
    });

    it('should handle different timeframes', async () => {
      const dayMetrics = await service.getAccessibilityMetrics('day');
      const weekMetrics = await service.getAccessibilityMetrics('week');
      const monthMetrics = await service.getAccessibilityMetrics('month');

      expect(dayMetrics).toBeDefined();
      expect(weekMetrics).toBeDefined();
      expect(monthMetrics).toBeDefined();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete accessibility workflow', async () => {
      // 1. Check compliance
      const complianceReport = {
        wcagLevel: 'AA' as const,
        overallScore: 0.7,
        violations: [
          {
            type: 'missing_alt' as const,
            severity: 'serious' as const,
            element: '<img src="test.jpg">',
            description: 'Missing alt text',
            wcagCriterion: '1.1.1',
            recommendation: 'Add alt text',
            canAutoFix: false
          }
        ],
        passedChecks: 10,
        totalChecks: 15,
        automatedFixes: [],
        manualReviewNeeded: true,
        summary: 'Found violations'
      };

      mockComplianceService.checkCompliance = jest.fn().mockResolvedValue(complianceReport);

      // 2. Generate alt text
      const altTextResult = {
        altText: 'Test image description',
        confidence: 0.9,
        qualityScore: 0.85,
        wcagCompliant: true
      };

      mockAltTextService.generateAltText = jest.fn().mockResolvedValue(altTextResult);

      // 3. Apply fixes
      const fixResult = {
        fixedContent: '<html><body><img src="test.jpg" alt="Test image description"></body></html>',
        appliedFixes: 1
      };

      mockFixService.applyFixes = jest.fn().mockResolvedValue(fixResult);

      // Execute workflow
      const compliance = await service.checkCompliance({
        htmlContent: '<html><body><img src="test.jpg"></body></html>',
        contentType: 'webpage'
      });

      expect(compliance.violations.length).toBeGreaterThan(0);

      const altText = await service.generateAltText({
        imageUrl: 'https://example.com/test.jpg'
      });

      expect(altText.wcagCompliant).toBe(true);

      const fixes = await service.applyAutomatedFixes(
        'content-123',
        '<html><body><img src="test.jpg"></body></html>',
        compliance
      );

      expect(fixes.appliedFixes).toBeGreaterThan(0);
    });
  });
});
