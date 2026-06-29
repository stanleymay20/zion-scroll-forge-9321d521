/**
 * Prayer Journal Service Tests
 * "Test everything; hold fast what is good" - 1 Thessalonians 5:21
 */

import PrayerJournalService from '../PrayerJournalService';
import { PrayerCategory, PrayerUrgency } from '../../types/prayer.types';

describe('PrayerJournalService', () => {
  let service: PrayerJournalService;
  const testUserId = 'test_user_123';

  beforeEach(() => {
    service = new PrayerJournalService();
  });

  describe('createPrayerEntry', () => {
    it('should create a new prayer entry', async () => {
      const entryData = {
        title: 'Prayer for Guidance',
        content: 'Lord, guide me in my studies...',
        category: PrayerCategory.GUIDANCE,
        isPrivate: true,
        tags: ['guidance', 'studies']
      };

      const entry = await service.createPrayerEntry(testUserId, entryData);

      expect(entry).toBeDefined();
      expect(entry.userId).toBe(testUserId);
      expect(entry.title).toBe(entryData.title);
      expect(entry.content).toBe(entryData.content);
      expect(entry.category).toBe(entryData.category);
      expect(entry.isPrivate).toBe(true);
      expect(entry.answered).toBe(false);
      expect(entry.prayerCount).toBe(0);
    });

    it('should initialize prayer entry with default values', async () => {
      const entryData = {
        title: 'Simple Prayer',
        content: 'Thank you Lord',
        category: PrayerCategory.THANKSGIVING,
        isPrivate: false
      };

      const entry = await service.createPrayerEntry(testUserId, entryData);

      expect(entry.tags).toEqual([]);
      expect(entry.prayerPartners).toEqual([]);
      expect(entry.answered).toBe(false);
    });
  });

  describe('createPrayerRequest', () => {
    it('should create a new prayer request', async () => {
      const requestData = {
        title: 'Prayer for Healing',
        description: 'Please pray for my family member...',
        category: PrayerCategory.HEALING,
        urgency: PrayerUrgency.HIGH
      };

      const request = await service.createPrayerRequest(testUserId, requestData);

      expect(request).toBeDefined();
      expect(request.userId).toBe(testUserId);
      expect(request.title).toBe(requestData.title);
      expect(request.urgency).toBe(PrayerUrgency.HIGH);
      expect(request.prayerCount).toBe(0);
      expect(request.intercessors).toEqual([]);
      expect(request.answered).toBe(false);
    });

    it('should set anonymous flag correctly', async () => {
      const requestData = {
        title: 'Anonymous Request',
        description: 'Please pray...',
        category: PrayerCategory.PERSONAL,
        urgency: PrayerUrgency.MEDIUM,
        isAnonymous: true
      };

      const request = await service.createPrayerRequest(testUserId, requestData);

      expect(request.isAnonymous).toBe(true);
    });
  });

  describe('markPrayerAnswered', () => {
    it('should mark prayer as answered with testimony', async () => {
      // First create an entry
      const entryData = {
        title: 'Prayer for Job',
        content: 'Lord, provide a job...',
        category: PrayerCategory.PROVISION,
        isPrivate: true
      };

      const entry = await service.createPrayerEntry(testUserId, entryData);
      
      // Mark as answered
      const testimony = 'God provided an amazing job opportunity!';
      const answeredEntry = await service.markPrayerAnswered(entry.id, testUserId, testimony);

      expect(answeredEntry.answered).toBe(true);
      expect(answeredEntry.testimony).toBe(testimony);
      expect(answeredEntry.answeredDate).toBeDefined();
    });
  });

  describe('prayForRequest', () => {
    it('should increment prayer count when praying for request', async () => {
      const requestData = {
        title: 'Prayer Request',
        description: 'Please pray...',
        category: PrayerCategory.PERSONAL,
        urgency: PrayerUrgency.MEDIUM
      };

      const request = await service.createPrayerRequest(testUserId, requestData);
      const initialCount = request.prayerCount;

      const updatedRequest = await service.prayForRequest(request.id, 'other_user_123');

      expect(updatedRequest.prayerCount).toBe(initialCount + 1);
    });

    it('should add user to intercessors list', async () => {
      const requestData = {
        title: 'Prayer Request',
        description: 'Please pray...',
        category: PrayerCategory.PERSONAL,
        urgency: PrayerUrgency.MEDIUM
      };

      const request = await service.createPrayerRequest(testUserId, requestData);
      const intercessorId = 'intercessor_123';

      const updatedRequest = await service.prayForRequest(request.id, intercessorId);

      expect(updatedRequest.intercessors).toContain(intercessorId);
    });
  });

  describe('getPrayerAnalytics', () => {
    it('should return prayer analytics for user', async () => {
      const analytics = await service.getPrayerAnalytics(testUserId);

      expect(analytics).toBeDefined();
      expect(analytics.userId).toBe(testUserId);
      expect(analytics.totalPrayers).toBeGreaterThanOrEqual(0);
      expect(analytics.answerRate).toBeGreaterThanOrEqual(0);
      expect(analytics.answerRate).toBeLessThanOrEqual(100);
      expect(analytics.spiritualGrowthIndicators).toBeDefined();
      expect(analytics.spiritualGrowthIndicators.consistency).toBeGreaterThanOrEqual(0);
      expect(analytics.spiritualGrowthIndicators.consistency).toBeLessThanOrEqual(100);
    });
  });

  describe('getPrayerDashboard', () => {
    it('should return complete prayer dashboard', async () => {
      const dashboard = await service.getPrayerDashboard(testUserId);

      expect(dashboard).toBeDefined();
      expect(dashboard.recentEntries).toBeDefined();
      expect(dashboard.activePrayerRequests).toBeDefined();
      expect(dashboard.answeredPrayers).toBeDefined();
      expect(dashboard.prayerPartners).toBeDefined();
      expect(dashboard.analytics).toBeDefined();
      expect(dashboard.upcomingReminders).toBeDefined();
      expect(dashboard.communityHighlights).toBeDefined();
    });
  });
});
