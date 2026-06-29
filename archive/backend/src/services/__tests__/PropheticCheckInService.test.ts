/**
 * Prophetic Check-in Service Tests
 * Tests for prophetic check-ins and spiritual growth tracking
 */

import PropheticCheckInService from '../PropheticCheckInService';
import { PropheticCheckInRequest } from '../../types/prophetic-checkin.types';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../AIGatewayService');
jest.mock('../VectorStoreService');

describe('PropheticCheckInService', () => {
  let service: PropheticCheckInService;

  beforeEach(() => {
    service = new PropheticCheckInService();
  });

  describe('submitCheckIn', () => {
    it('should successfully submit a prophetic check-in', async () => {
      const request: PropheticCheckInRequest = {
        userId: 'user-123',
        questionnaire: [
          {
            questionId: 'q1',
            question: 'How is your prayer life?',
            answer: 'Growing stronger each day',
            category: 'prayer-life',
            importance: 'high'
          }
        ],
        spiritualTemperature: 8,
        mood: 'peaceful',
        lifeCircumstances: 'Busy but blessed',
        prayerFocus: ['family', 'ministry', 'wisdom'],
        scriptureHighlights: ['Psalm 23', 'John 15:5'],
        godsVoice: 'Trust me in this season',
        obedienceLevel: 7,
        communityEngagement: 6,
        ministryActivity: 'Leading small group',
        challengesFaced: ['time management', 'spiritual warfare'],
        victoriesExperienced: ['breakthrough in prayer', 'restored relationship']
      };

      const response = await service.submitCheckIn(request);

      expect(response.success).toBe(true);
      expect(response.checkIn).toBeDefined();
      expect(response.growthTracking).toBeDefined();
      expect(response.guidance).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const invalidRequest = {} as PropheticCheckInRequest;

      const response = await service.submitCheckIn(invalidRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.requiresHumanReview).toBe(true);
    });
  });

  describe('getCheckInHistory', () => {
    it('should retrieve check-in history for a user', async () => {
      const userId = 'user-123';

      const history = await service.getCheckInHistory(userId, 5);

      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('getGrowthTracking', () => {
    it('should retrieve growth tracking for a user', async () => {
      const userId = 'user-123';

      const tracking = await service.getGrowthTracking(userId, 5);

      expect(Array.isArray(tracking)).toBe(true);
    });
  });

  describe('getPropheticGuidance', () => {
    it('should retrieve prophetic guidance for a user', async () => {
      const userId = 'user-123';

      const guidance = await service.getPropheticGuidance(userId, 5);

      expect(Array.isArray(guidance)).toBe(true);
    });
  });
});
