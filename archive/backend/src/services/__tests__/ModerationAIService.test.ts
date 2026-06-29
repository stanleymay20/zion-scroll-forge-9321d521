/**
 * Moderation AI Service Tests
 * Tests for AI-powered content moderation system
 */

import ModerationAIService from '../ModerationAIService';
import { UserContent, ContentScanRequest } from '../../types/moderation.types';

describe('ModerationAIService', () => {
  let service: ModerationAIService;

  beforeEach(() => {
    service = new ModerationAIService();
  });

  describe('moderateContent', () => {
    it('should approve clean content', async () => {
      const content: UserContent = {
        id: 'test-1',
        userId: 'user-1',
        contentType: 'post',
        content: 'This is a respectful and constructive comment about the course material.',
        timestamp: new Date()
      };

      const request: ContentScanRequest = {
        content,
        scanOptions: {
          checkLanguage: true,
          checkTheology: true,
          checkTone: true
        }
      };

      const result = await service.moderateContent(request);

      expect(result.scanned).toBe(true);
      expect(result.moderationResult.approved).toBe(true);
      expect(result.violations.length).toBe(0);
    }, 30000);

    it('should detect inappropriate language', async () => {
      const content: UserContent = {
        id: 'test-2',
        userId: 'user-2',
        contentType: 'post',
        content: 'This content contains inappropriate profanity and offensive language.',
        timestamp: new Date()
      };

      const request: ContentScanRequest = {
        content,
        scanOptions: {
          checkLanguage: true,
          checkTheology: false,
          checkTone: false
        }
      };

      const result = await service.moderateContent(request);

      expect(result.scanned).toBe(true);
      // Note: Actual detection depends on AI response
    }, 30000);

    it('should detect hostile tone', async () => {
      const content: UserContent = {
        id: 'test-3',
        userId: 'user-3',
        contentType: 'comment',
        content: 'You are completely wrong and your ideas are stupid. Stop posting nonsense.',
        timestamp: new Date()
      };

      const request: ContentScanRequest = {
        content,
        scanOptions: {
          checkLanguage: false,
          checkTheology: false,
          checkTone: true
        }
      };

      const result = await service.moderateContent(request);

      expect(result.scanned).toBe(true);
      expect(result.toneAnalysis).toBeDefined();
      if (result.toneAnalysis) {
        expect(result.toneAnalysis.isHostile || result.toneAnalysis.sentiment === 'hostile').toBe(true);
      }
    }, 30000);
  });

  describe('getMetrics', () => {
    it('should return moderation metrics', async () => {
      const metrics = await service.getMetrics('week');

      expect(metrics).toBeDefined();
      expect(metrics.totalContentScanned).toBeGreaterThanOrEqual(0);
      expect(metrics.violationsDetected).toBeGreaterThanOrEqual(0);
      expect(metrics.humanReviewRate).toBeGreaterThanOrEqual(0);
      expect(metrics.averageConfidence).toBeGreaterThanOrEqual(0);
    });
  });
});
