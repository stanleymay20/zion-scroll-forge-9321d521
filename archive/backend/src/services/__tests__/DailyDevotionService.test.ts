/**
 * Daily Devotion Service Tests
 * Tests for daily devotion functionality
 */

import DailyDevotionService from '../DailyDevotionService';
import ScriptureIntegrationService from '../ScriptureIntegrationService';
import DevotionRecommendationService from '../DevotionRecommendationService';

describe('DailyDevotionService', () => {
  let devotionService: DailyDevotionService;

  beforeEach(() => {
    devotionService = new DailyDevotionService();
  });

  describe('getDevotionByDate', () => {
    it('should return a devotion for a specific date', async () => {
      const date = new Date('2024-12-24');
      const devotion = await devotionService.getDevotionByDate(date);

      expect(devotion).toBeDefined();
      expect(devotion?.id).toBeDefined();
      expect(devotion?.title).toBeDefined();
      expect(devotion?.scripture).toBeDefined();
      expect(devotion?.reflection).toBeDefined();
    });
  });

  describe('getTodaysDevotion', () => {
    it('should return today\'s devotion with user context', async () => {
      const userId = 'test-user-123';
      const timezone = 'America/New_York';

      const content = await devotionService.getTodaysDevotion(userId, timezone);

      expect(content).toBeDefined();
      expect(content.devotion).toBeDefined();
      expect(content.discussions).toBeDefined();
      expect(Array.isArray(content.discussions)).toBe(true);
    });
  });

  describe('completeDevot ion', () => {
    it('should mark a devotion as completed', async () => {
      const userId = 'test-user-123';
      const devotionId = 'devotion-123';

      const completion = await devotionService.completeDevot ion(
        userId,
        devotionId,
        'Great devotion!',
        5,
        10
      );

      expect(completion).toBeDefined();
      expect(completion.userId).toBe(userId);
      expect(completion.devotionId).toBe(devotionId);
      expect(completion.rating).toBe(5);
    });
  });

  describe('getUserStreak', () => {
    it('should return user\'s devotion streak', async () => {
      const userId = 'test-user-123';

      const streak = await devotionService.getUserStreak(userId);

      expect(streak).toBeDefined();
      expect(streak.userId).toBe(userId);
      expect(typeof streak.currentStreak).toBe('number');
      expect(typeof streak.longestStreak).toBe('number');
      expect(typeof streak.totalCompletions).toBe('number');
    });
  });

  describe('getUserPreferences', () => {
    it('should return user\'s devotion preferences', async () => {
      const userId = 'test-user-123';

      const preferences = await devotionService.getUserPreferences(userId);

      expect(preferences).toBeDefined();
      expect(preferences.userId).toBe(userId);
      expect(preferences.preferredTranslation).toBeDefined();
      expect(preferences.timezone).toBeDefined();
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user\'s devotion preferences', async () => {
      const userId = 'test-user-123';
      const updates = {
        preferredTranslation: 'ESV' as const,
        audioEnabled: false
      };

      const updated = await devotionService.updateUserPreferences(userId, updates);

      expect(updated).toBeDefined();
      expect(updated.preferredTranslation).toBe('ESV');
      expect(updated.audioEnabled).toBe(false);
    });
  });

  describe('getUserAnalytics', () => {
    it('should return user\'s devotion analytics', async () => {
      const userId = 'test-user-123';

      const analytics = await devotionService.getUserAnalytics(userId);

      expect(analytics).toBeDefined();
      expect(analytics.userId).toBe(userId);
      expect(typeof analytics.totalCompletions).toBe('number');
      expect(typeof analytics.completionRate).toBe('number');
      expect(analytics.streakData).toBeDefined();
    });
  });
});

describe('ScriptureIntegrationService', () => {
  let scriptureService: ScriptureIntegrationService;

  beforeEach(() => {
    scriptureService = new ScriptureIntegrationService();
  });

  describe('getScripture', () => {
    it('should return scripture passage', async () => {
      const reference = 'John 3:16';
      const scripture = await scriptureService.getScripture(reference);

      expect(scripture).toBeDefined();
      expect(scripture.reference).toBe(reference);
      expect(scripture.text).toBeDefined();
      expect(scripture.translation).toBe('NIV');
    });

    it('should support different translations', async () => {
      const reference = 'Psalm 23:1';
      const scripture = await scriptureService.getScripture(reference, 'ESV');

      expect(scripture).toBeDefined();
      expect(scripture.translation).toBe('ESV');
    });
  });

  describe('validateReference', () => {
    it('should validate correct scripture references', () => {
      expect(scriptureService.validateReference('John 3:16')).toBe(true);
      expect(scriptureService.validateReference('1 Corinthians 13:4-7')).toBe(true);
      expect(scriptureService.validateReference('Psalm 23:1')).toBe(true);
    });

    it('should reject invalid scripture references', () => {
      expect(scriptureService.validateReference('Invalid')).toBe(false);
      expect(scriptureService.validateReference('John 3')).toBe(false);
      expect(scriptureService.validateReference('')).toBe(false);
    });
  });

  describe('parseReference', () => {
    it('should parse scripture reference correctly', () => {
      const parsed = scriptureService.parseReference('John 3:16');

      expect(parsed).toBeDefined();
      expect(parsed?.book).toBe('John');
      expect(parsed?.chapter).toBe(3);
      expect(parsed?.startVerse).toBe(16);
      expect(parsed?.endVerse).toBeUndefined();
    });

    it('should parse verse ranges', () => {
      const parsed = scriptureService.parseReference('1 Corinthians 13:4-7');

      expect(parsed).toBeDefined();
      expect(parsed?.book).toBe('1 Corinthians');
      expect(parsed?.chapter).toBe(13);
      expect(parsed?.startVerse).toBe(4);
      expect(parsed?.endVerse).toBe(7);
    });
  });

  describe('getAvailableTranslations', () => {
    it('should return list of available translations', () => {
      const translations = scriptureService.getAvailableTranslations();

      expect(Array.isArray(translations)).toBe(true);
      expect(translations.length).toBeGreaterThan(0);
      expect(translations[0]).toHaveProperty('code');
      expect(translations[0]).toHaveProperty('name');
    });
  });
});

describe('DevotionRecommendationService', () => {
  let recommendationService: DevotionRecommendationService;

  beforeEach(() => {
    recommendationService = new DevotionRecommendationService();
  });

  describe('getRecommendations', () => {
    it('should return personalized recommendations', async () => {
      const userId = 'test-user-123';
      const preferences = {
        userId,
        preferredTranslation: 'NIV' as const,
        preferredTime: '07:00',
        timezone: 'UTC',
        topics: ['faith', 'prayer'],
        difficulty: 'intermediate' as const,
        audioEnabled: true,
        notificationsEnabled: true
      };
      const analytics = {
        userId,
        totalCompletions: 30,
        averageRating: 4.5,
        favoriteTopics: ['faith', 'worship'],
        completionRate: 85,
        averageTimeSpent: 8,
        streakData: {
          userId,
          currentStreak: 7,
          longestStreak: 30,
          totalCompletions: 30,
          lastCompletionDate: new Date(),
          streakStartDate: new Date(),
          milestones: []
        },
        engagementTrend: 'increasing' as const
      };

      const recommendations = await recommendationService.getRecommendations(
        userId,
        preferences,
        analytics,
        5
      );

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getTopicRecommendations', () => {
    it('should return recommendations for specific topics', async () => {
      const topics = ['faith', 'hope', 'love'];
      const recommendations = await recommendationService.getTopicRecommendations(topics);

      expect(Array.isArray(recommendations)).toBe(true);
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('devotionId');
        expect(rec).toHaveProperty('score');
        expect(rec).toHaveProperty('reason');
      });
    });
  });
});
