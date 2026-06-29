/**
 * Spiritual Formation AI Service Tests
 */

import SpiritualFormationAIService from '../SpiritualFormationAIService';
import AIGatewayService from '../AIGatewayService';
import VectorStoreService from '../VectorStoreService';

// Mock dependencies
jest.mock('../AIGatewayService');
jest.mock('../VectorStoreService');

describe('SpiritualFormationAIService', () => {
  let service: SpiritualFormationAIService;
  let mockAIGateway: jest.Mocked<AIGatewayService>;
  let mockVectorStore: jest.Mocked<VectorStoreService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    mockAIGateway = {
      chat: jest.fn(),
      embed: jest.fn(),
      moderate: jest.fn()
    } as any;
    
    mockVectorStore = {
      search: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn()
    } as any;
    
    service = new SpiritualFormationAIService(mockAIGateway, mockVectorStore);
  });

  describe('analyzeCheckIn', () => {
    it('should analyze spiritual check-in and return structured analysis', async () => {
      const checkIn = {
        id: 'checkin_123',
        userId: 'user_123',
        timestamp: new Date(),
        responses: [
          {
            question: 'How is your prayer life?',
            answer: 'I have been praying more consistently this week',
            category: 'prayer' as const
          },
          {
            question: 'What spiritual challenges are you facing?',
            answer: 'Struggling with doubt about my calling',
            category: 'general' as const
          }
        ],
        mood: 'hopeful',
        spiritualTemperature: 7
      };

      const mockAIResponse = {
        content: JSON.stringify({
          growthAreas: [
            {
              area: 'Prayer Life',
              description: 'Showing consistency in prayer',
              evidence: ['Praying more consistently'],
              trend: 'improving',
              recommendations: ['Continue daily prayer practice']
            }
          ],
          struggles: [
            {
              type: 'Calling Discernment',
              description: 'Experiencing doubt about calling',
              severity: 'medium',
              duration: 'new',
              supportNeeded: ['Spiritual direction', 'Mentorship']
            }
          ],
          breakthroughs: [],
          insights: ['Growing in prayer discipline', 'Seeking clarity on calling'],
          recommendedScripture: [
            {
              reference: 'Jeremiah 29:11',
              text: 'For I know the plans I have for you...',
              translation: 'NIV',
              relevance: 'Encouragement about God\'s plans'
            }
          ],
          suggestedResources: [
            {
              type: 'book',
              title: 'Let Your Life Speak',
              author: 'Parker Palmer',
              description: 'A book about discerning vocation',
              relevance: 'Helps with calling discernment'
            }
          ]
        }),
        usage: { totalTokens: 500, cost: 0.01 },
        model: 'gpt-4',
        cached: false
      };

      mockAIGateway.chat = jest.fn().mockResolvedValue(mockAIResponse);

      const result = await service.analyzeCheckIn(checkIn);

      expect(result).toBeDefined();
      expect(result.checkInId).toBe(checkIn.id);
      expect(result.userId).toBe(checkIn.userId);
      expect(result.growthAreas).toHaveLength(1);
      expect(result.struggles).toHaveLength(1);
      expect(result.insights).toHaveLength(2);
      expect(result.recommendedScripture).toHaveLength(1);
      expect(result.confidence).toBeGreaterThan(0);
      expect(mockAIGateway.chat).toHaveBeenCalled();
    });

    it('should flag advisor alert for critical struggles', async () => {
      const checkIn = {
        id: 'checkin_456',
        userId: 'user_456',
        timestamp: new Date(),
        responses: [
          {
            question: 'How are you feeling spiritually?',
            answer: 'I feel completely lost and abandoned by God',
            category: 'general' as const
          }
        ]
      };

      const mockAIResponse = {
        content: JSON.stringify({
          growthAreas: [],
          struggles: [
            {
              type: 'Spiritual Crisis',
              description: 'Feeling abandoned by God',
              severity: 'critical',
              duration: 'new',
              supportNeeded: ['Immediate pastoral care']
            }
          ],
          breakthroughs: [],
          insights: ['Experiencing spiritual darkness'],
          recommendedScripture: [],
          suggestedResources: []
        }),
        usage: { totalTokens: 400, cost: 0.008 },
        model: 'gpt-4',
        cached: false
      };

      mockAIGateway.chat = jest.fn().mockResolvedValue(mockAIResponse);

      const result = await service.analyzeCheckIn(checkIn);

      expect(result.advisorAlert).toBe(true);
      expect(result.alertReason).toBeDefined();
    });
  });

  describe('categorizePrayer', () => {
    it('should categorize prayer request with themes and urgency', async () => {
      const prayer = {
        id: 'prayer_123',
        userId: 'user_123',
        request: 'Please pray for my mother who is battling cancer',
        isPrivate: true,
        timestamp: new Date(),
        status: 'active' as const
      };

      const mockAIResponse = {
        content: JSON.stringify({
          categories: [
            { name: 'Healing', confidence: 0.95, subcategories: ['Physical Healing'] },
            { name: 'Family', confidence: 0.85, subcategories: ['Parent'] }
          ],
          themes: ['health', 'family', 'suffering'],
          urgency: 'high',
          suggestedScripture: [
            {
              reference: 'James 5:14-15',
              text: 'Is anyone among you sick?...',
              translation: 'NIV',
              relevance: 'Prayer for healing'
            }
          ],
          recommendedResources: [
            {
              type: 'article',
              title: 'Praying Through Illness',
              description: 'Guide to prayer during health crises',
              relevance: 'Practical prayer guidance'
            }
          ]
        }),
        usage: { totalTokens: 300, cost: 0.006 },
        model: 'gpt-4',
        cached: false
      };

      mockAIGateway.chat = jest.fn().mockResolvedValue(mockAIResponse);
      mockVectorStore.search = jest.fn().mockResolvedValue([]);

      const result = await service.categorizePrayer(prayer);

      expect(result).toBeDefined();
      expect(result.requestId).toBe(prayer.id);
      expect(result.categories).toHaveLength(2);
      expect(result.themes).toContain('health');
      expect(result.urgency).toBe('high');
      expect(result.suggestedScripture).toHaveLength(1);
    });
  });

  describe('analyzeJournal', () => {
    it('should analyze journal entry and identify insights', async () => {
      const entry = {
        id: 'journal_123',
        userId: 'user_123',
        content: 'Today I realized that my fear of failure has been holding me back from stepping into ministry. God has been speaking to me about trusting Him more.',
        mood: 'reflective',
        isPrivate: true,
        timestamp: new Date()
      };

      const mockAIResponse = {
        content: JSON.stringify({
          spiritualInsights: [
            {
              type: 'conviction',
              description: 'Recognition of fear as a barrier',
              significance: 'major',
              relatedScripture: [
                {
                  reference: '2 Timothy 1:7',
                  text: 'For God has not given us a spirit of fear...',
                  translation: 'NIV',
                  relevance: 'Overcoming fear'
                }
              ]
            }
          ],
          questionsAndDoubts: [
            {
              question: 'How do I overcome fear of failure?',
              category: 'practical',
              severity: 'concern',
              suggestedResources: [],
              requiresAdvisor: false
            }
          ],
          growthOpportunities: [
            {
              area: 'Trust in God',
              description: 'Opportunity to deepen trust',
              actionSteps: ['Daily surrender prayer', 'Study passages on God\'s faithfulness'],
              resources: [],
              mentorshipNeeded: true
            }
          ],
          emotionalState: {
            primary: 'reflective',
            secondary: ['hopeful', 'anxious'],
            intensity: 6,
            trend: 'improving'
          },
          theologicalThemes: ['trust', 'calling', 'fear']
        }),
        usage: { totalTokens: 450, cost: 0.009 },
        model: 'gpt-4',
        cached: false
      };

      mockAIGateway.chat = jest.fn().mockResolvedValue(mockAIResponse);

      const result = await service.analyzeJournal(entry);

      expect(result).toBeDefined();
      expect(result.entryId).toBe(entry.id);
      expect(result.spiritualInsights).toHaveLength(1);
      expect(result.questionsAndDoubts).toHaveLength(1);
      expect(result.growthOpportunities).toHaveLength(1);
      expect(result.privacyMaintained).toBe(true);
      expect(result.theologicalThemes).toContain('trust');
    });
  });

  describe('recommendPractices', () => {
    it('should recommend personalized spiritual practices', async () => {
      const profile = {
        userId: 'user_123',
        strengths: ['scripture study', 'worship'],
        growthAreas: ['prayer', 'fasting'],
        spiritualGifts: ['teaching', 'encouragement'],
        callingIndicators: ['ministry', 'education'],
        disciplinePreferences: ['morning devotions'],
        mentorshipNeeds: ['spiritual direction'],
        lastUpdated: new Date()
      };

      const mockAIResponse = {
        content: JSON.stringify({
          practices: [
            {
              type: 'prayer',
              name: 'Lectio Divina',
              description: 'Meditative Scripture reading and prayer',
              frequency: 'Daily',
              duration: '20 minutes',
              resources: [],
              scriptureSupport: [],
              personalizedReason: 'Combines your strength in Scripture with growth in prayer'
            }
          ],
          devotionalMaterials: [
            {
              type: 'devotional',
              title: 'My Utmost for His Highest',
              author: 'Oswald Chambers',
              description: 'Classic daily devotional',
              relevance: 'Deepens prayer life'
            }
          ],
          mentorConnections: [
            {
              mentorType: 'Spiritual Director',
              reason: 'To guide prayer development',
              areas: ['prayer', 'discernment'],
              suggestedFrequency: 'Monthly'
            }
          ],
          scriptureReadingPlan: {
            name: 'Prayer-Focused Reading',
            description: 'Passages on prayer and communion with God',
            duration: '30 days',
            schedule: [],
            focus: ['prayer', 'intimacy with God']
          }
        }),
        usage: { totalTokens: 600, cost: 0.012 },
        model: 'gpt-4',
        cached: false
      };

      mockAIGateway.chat = jest.fn().mockResolvedValue(mockAIResponse);
      mockVectorStore.search = jest.fn().mockResolvedValue([]);

      const result = await service.recommendPractices(profile);

      expect(result).toBeDefined();
      expect(result.userId).toBe(profile.userId);
      expect(result.practices).toHaveLength(1);
      expect(result.devotionalMaterials).toHaveLength(1);
      expect(result.mentorConnections).toHaveLength(1);
      expect(result.scriptureReadingPlan).toBeDefined();
    });
  });

  describe('detectCrisis', () => {
    it('should detect spiritual crisis and return crisis details', async () => {
      const userId = 'user_123';

      const mockAIResponse = {
        content: JSON.stringify({
          crisisDetected: true,
          crisisType: 'spiritual',
          severity: 'urgent',
          indicators: [
            'Expressions of hopelessness',
            'Loss of faith statements',
            'Isolation from community'
          ],
          patterns: [
            {
              pattern: 'Declining spiritual engagement',
              frequency: 'Weekly',
              duration: '3 weeks',
              escalation: true
            }
          ],
          immediateActions: [
            'Contact spiritual advisor immediately',
            'Schedule counseling session',
            'Connect with prayer support'
          ],
          advisorsToAlert: ['spiritual-advisor', 'counselor'],
          supportResources: [
            {
              type: 'counselor',
              title: 'Crisis Counseling',
              description: 'Professional counseling services',
              relevance: 'Immediate support needed'
            }
          ],
          emergencyContacts: [
            {
              type: 'crisis-line',
              name: 'National Crisis Hotline',
              phone: '988',
              available: '24/7'
            }
          ]
        }),
        usage: { totalTokens: 500, cost: 0.01 },
        model: 'gpt-4',
        cached: false
      };

      mockAIGateway.chat = jest.fn().mockResolvedValue(mockAIResponse);

      const result = await service.detectCrisis(userId, {});

      expect(result).toBeDefined();
      expect(result?.userId).toBe(userId);
      expect(result?.crisisType).toBe('spiritual');
      expect(result?.severity).toBe('urgent');
      expect(result?.indicators).toHaveLength(3);
      expect(result?.immediateActions).toHaveLength(3);
    });

    it('should return null when no crisis detected', async () => {
      const userId = 'user_456';

      const mockAIResponse = {
        content: JSON.stringify({
          crisisDetected: false
        }),
        usage: { totalTokens: 200, cost: 0.004 },
        model: 'gpt-4',
        cached: false
      };

      mockAIGateway.chat = jest.fn().mockResolvedValue(mockAIResponse);

      const result = await service.detectCrisis(userId, {});

      expect(result).toBeNull();
    });

    it('should handle errors gracefully and return null', async () => {
      const userId = 'user_789';

      mockAIGateway.chat = jest.fn().mockRejectedValue(new Error('API error'));

      const result = await service.detectCrisis(userId, {});

      expect(result).toBeNull();
    });
  });
});
