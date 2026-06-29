/**
 * Scripture Memory Service Tests
 * Comprehensive tests for scripture memorization with spaced repetition
 */

import { ScriptureMemoryService } from '../ScriptureMemoryService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    memoryVerse: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    verseProgress: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    memoryQuiz: {
      create: jest.fn(),
      findUnique: jest.fn()
    },
    quizAttempt: {
      create: jest.fn(),
      findMany: jest.fn()
    },
    memorizationChallenge: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    challengeParticipation: {
      create: jest.fn(),
      count: jest.fn()
    },
    sharedVerse: {
      create: jest.fn(),
      findMany: jest.fn()
    }
  };

  return {
    PrismaClient: jest.fn(() => mockPrisma)
  };
});

describe('ScriptureMemoryService', () => {
  let service: ScriptureMemoryService;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ScriptureMemoryService();
    mockPrisma = new PrismaClient();
  });

  describe('createVerse', () => {
    it('should create a new memory verse successfully', async () => {
      const mockVerse = {
        id: 'verse-1',
        reference: 'John 3:16',
        text: 'For God so loved the world...',
        translation: 'NIV',
        category: 'Salvation',
        difficulty: 'easy',
        tags: ['love', 'salvation'],
        audioUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.memoryVerse.create.mockResolvedValue(mockVerse);

      const result = await service.createVerse({
        reference: 'John 3:16',
        text: 'For God so loved the world...',
        translation: 'NIV',
        category: 'Salvation',
        difficulty: 'easy',
        tags: ['love', 'salvation']
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockVerse);
      expect(mockPrisma.memoryVerse.create).toHaveBeenCalled();
    });

    it('should handle errors when creating verse', async () => {
      mockPrisma.memoryVerse.create.mockRejectedValue(new Error('Database error'));

      const result = await service.createVerse({
        reference: 'John 3:16',
        text: 'For God so loved the world...',
        translation: 'NIV',
        category: 'Salvation',
        difficulty: 'easy'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create memory verse');
    });
  });

  describe('getVerses', () => {
    it('should retrieve verses with filters', async () => {
      const mockVerses = [
        {
          id: 'verse-1',
          reference: 'John 3:16',
          text: 'For God so loved the world...',
          translation: 'NIV',
          category: 'Salvation',
          difficulty: 'easy',
          tags: ['love'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.memoryVerse.findMany.mockResolvedValue(mockVerses);

      const result = await service.getVerses({
        category: 'Salvation',
        difficulty: 'easy'
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockVerses);
      expect(mockPrisma.memoryVerse.findMany).toHaveBeenCalled();
    });

    it('should handle search queries', async () => {
      mockPrisma.memoryVerse.findMany.mockResolvedValue([]);

      const result = await service.getVerses({
        searchQuery: 'love'
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.memoryVerse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array)
          })
        })
      );
    });
  });

  describe('getVerseProgress', () => {
    it('should retrieve existing progress', async () => {
      const mockProgress = {
        id: 'progress-1',
        userId: 'user-1',
        verseId: 'verse-1',
        nextReviewDate: new Date(),
        reviewCount: 5,
        correctCount: 4,
        incorrectCount: 1,
        masteryLevel: 80,
        masteryStatus: 'proficient',
        easeFactor: 2.5,
        interval: 7,
        lastReviewedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.verseProgress.findUnique.mockResolvedValue(mockProgress);

      const result = await service.getVerseProgress('user-1', 'verse-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProgress);
    });

    it('should create initial progress if not exists', async () => {
      const mockNewProgress = {
        id: 'progress-1',
        userId: 'user-1',
        verseId: 'verse-1',
        nextReviewDate: new Date(),
        reviewCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        masteryLevel: 0,
        masteryStatus: 'beginner',
        easeFactor: 2.5,
        interval: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.verseProgress.findUnique.mockResolvedValue(null);
      mockPrisma.verseProgress.create.mockResolvedValue(mockNewProgress);

      const result = await service.getVerseProgress('user-1', 'verse-1');

      expect(result.success).toBe(true);
      expect(result.data?.masteryStatus).toBe('beginner');
      expect(mockPrisma.verseProgress.create).toHaveBeenCalled();
    });
  });

  describe('updateProgress', () => {
    it('should update progress after correct answer', async () => {
      const mockCurrentProgress = {
        id: 'progress-1',
        userId: 'user-1',
        verseId: 'verse-1',
        nextReviewDate: new Date(),
        reviewCount: 5,
        correctCount: 4,
        incorrectCount: 1,
        masteryLevel: 80,
        masteryStatus: 'proficient',
        easeFactor: 2.5,
        interval: 7,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockUpdatedProgress = {
        ...mockCurrentProgress,
        reviewCount: 6,
        correctCount: 5,
        masteryLevel: 83
      };

      mockPrisma.verseProgress.findUnique.mockResolvedValue(mockCurrentProgress);
      mockPrisma.verseProgress.update.mockResolvedValue(mockUpdatedProgress);

      const result = await service.updateProgress('user-1', {
        verseId: 'verse-1',
        isCorrect: true,
        timeSpent: 8,
        quizFormat: 'multiple_choice'
      });

      expect(result.success).toBe(true);
      expect(result.data?.correctCount).toBe(5);
      expect(mockPrisma.verseProgress.update).toHaveBeenCalled();
    });

    it('should update progress after incorrect answer', async () => {
      const mockCurrentProgress = {
        id: 'progress-1',
        userId: 'user-1',
        verseId: 'verse-1',
        nextReviewDate: new Date(),
        reviewCount: 5,
        correctCount: 4,
        incorrectCount: 1,
        masteryLevel: 80,
        masteryStatus: 'proficient',
        easeFactor: 2.5,
        interval: 7,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockUpdatedProgress = {
        ...mockCurrentProgress,
        reviewCount: 6,
        incorrectCount: 2,
        masteryLevel: 66
      };

      mockPrisma.verseProgress.findUnique.mockResolvedValue(mockCurrentProgress);
      mockPrisma.verseProgress.update.mockResolvedValue(mockUpdatedProgress);

      const result = await service.updateProgress('user-1', {
        verseId: 'verse-1',
        isCorrect: false,
        timeSpent: 30,
        quizFormat: 'typing'
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.verseProgress.update).toHaveBeenCalled();
    });
  });

  describe('getDueVerses', () => {
    it('should retrieve verses due for review', async () => {
      const mockDueVerses = [
        {
          id: 'progress-1',
          userId: 'user-1',
          verseId: 'verse-1',
          nextReviewDate: new Date(Date.now() - 86400000), // Yesterday
          reviewCount: 3,
          correctCount: 2,
          incorrectCount: 1,
          masteryLevel: 66,
          masteryStatus: 'familiar',
          easeFactor: 2.5,
          interval: 3,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.verseProgress.findMany.mockResolvedValue(mockDueVerses);

      const result = await service.getDueVerses('user-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDueVerses);
      expect(mockPrisma.verseProgress.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            nextReviewDate: expect.any(Object)
          })
        })
      );
    });
  });

  describe('generateQuiz', () => {
    it('should generate fill-in-blank quiz', async () => {
      const mockVerse = {
        id: 'verse-1',
        reference: 'John 3:16',
        text: 'For God so loved the world that he gave his only Son',
        translation: 'NIV',
        category: 'Salvation',
        difficulty: 'easy',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockQuiz = {
        id: 'quiz-1',
        verseId: 'verse-1',
        format: 'fill_in_blank',
        question: 'For God so _____ the world',
        correctAnswer: 'loved',
        blanks: [3],
        hints: ['5 letters, starts with l'],
        createdAt: new Date()
      };

      mockPrisma.memoryVerse.findUnique.mockResolvedValue(mockVerse);
      mockPrisma.memoryQuiz.create.mockResolvedValue(mockQuiz);

      const result = await service.generateQuiz('verse-1', 'fill_in_blank');

      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('fill_in_blank');
      expect(mockPrisma.memoryQuiz.create).toHaveBeenCalled();
    });

    it('should generate multiple choice quiz', async () => {
      const mockVerse = {
        id: 'verse-1',
        reference: 'John 3:16',
        text: 'For God so loved the world',
        translation: 'NIV',
        category: 'Salvation',
        difficulty: 'easy',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.memoryVerse.findUnique.mockResolvedValue(mockVerse);
      mockPrisma.memoryQuiz.create.mockResolvedValue({
        id: 'quiz-1',
        verseId: 'verse-1',
        format: 'multiple_choice',
        question: 'John 3:16: For God so _____ the world',
        correctAnswer: 'loved',
        options: ['loved', 'hated', 'created', 'judged'],
        createdAt: new Date()
      });

      const result = await service.generateQuiz('verse-1', 'multiple_choice');

      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('multiple_choice');
      expect(result.data?.options).toBeDefined();
    });
  });

  describe('submitQuizAttempt', () => {
    it('should submit correct quiz attempt', async () => {
      const mockQuiz = {
        id: 'quiz-1',
        verseId: 'verse-1',
        format: 'multiple_choice',
        question: 'Test question',
        correctAnswer: 'loved',
        createdAt: new Date()
      };

      const mockAttempt = {
        id: 'attempt-1',
        userId: 'user-1',
        verseId: 'verse-1',
        quizId: 'quiz-1',
        userAnswer: 'loved',
        isCorrect: true,
        timeSpent: 5,
        hintsUsed: 0,
        attemptedAt: new Date()
      };

      const mockProgress = {
        id: 'progress-1',
        userId: 'user-1',
        verseId: 'verse-1',
        nextReviewDate: new Date(),
        reviewCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        masteryLevel: 0,
        masteryStatus: 'beginner',
        easeFactor: 2.5,
        interval: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.memoryQuiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrisma.quizAttempt.create.mockResolvedValue(mockAttempt);
      mockPrisma.verseProgress.findUnique.mockResolvedValue(mockProgress);
      mockPrisma.verseProgress.update.mockResolvedValue(mockProgress);

      const result = await service.submitQuizAttempt(
        'user-1',
        'verse-1',
        'quiz-1',
        'loved',
        5,
        0
      );

      expect(result.success).toBe(true);
      expect(result.data?.isCorrect).toBe(true);
      expect(mockPrisma.quizAttempt.create).toHaveBeenCalled();
    });
  });

  describe('createChallenge', () => {
    it('should create a memorization challenge', async () => {
      const mockChallenge = {
        id: 'challenge-1',
        title: '30 Day Scripture Challenge',
        description: 'Memorize 30 verses in 30 days',
        verseIds: ['verse-1', 'verse-2'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
        participantCount: 0,
        scrollCoinReward: 1000,
        badgeReward: 'Scripture Master',
        isActive: true,
        createdBy: 'user-1',
        createdAt: new Date()
      };

      mockPrisma.memorizationChallenge.create.mockResolvedValue(mockChallenge);

      const result = await service.createChallenge('user-1', {
        title: '30 Day Scripture Challenge',
        description: 'Memorize 30 verses in 30 days',
        verseIds: ['verse-1', 'verse-2'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
        scrollCoinReward: 1000,
        badgeReward: 'Scripture Master'
      });

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('30 Day Scripture Challenge');
      expect(mockPrisma.memorizationChallenge.create).toHaveBeenCalled();
    });
  });

  describe('joinChallenge', () => {
    it('should join an active challenge', async () => {
      const mockChallenge = {
        id: 'challenge-1',
        title: 'Test Challenge',
        verseIds: ['verse-1', 'verse-2'],
        isActive: true,
        participantCount: 5
      };

      const mockParticipation = {
        id: 'participation-1',
        userId: 'user-1',
        challengeId: 'challenge-1',
        progress: 0,
        versesCompleted: 0,
        totalVerses: 2,
        scrollCoinEarned: 0,
        joinedAt: new Date()
      };

      mockPrisma.memorizationChallenge.findUnique.mockResolvedValue(mockChallenge);
      mockPrisma.challengeParticipation.create.mockResolvedValue(mockParticipation);
      mockPrisma.memorizationChallenge.update.mockResolvedValue({
        ...mockChallenge,
        participantCount: 6
      });

      const result = await service.joinChallenge('user-1', 'challenge-1');

      expect(result.success).toBe(true);
      expect(result.data?.totalVerses).toBe(2);
      expect(mockPrisma.challengeParticipation.create).toHaveBeenCalled();
      expect(mockPrisma.memorizationChallenge.update).toHaveBeenCalled();
    });

    it('should not join inactive challenge', async () => {
      mockPrisma.memorizationChallenge.findUnique.mockResolvedValue({
        id: 'challenge-1',
        isActive: false
      });

      const result = await service.joinChallenge('user-1', 'challenge-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Challenge is not active');
    });
  });

  describe('getUserStatistics', () => {
    it('should calculate user statistics', async () => {
      const mockProgress = [
        {
          reviewCount: 10,
          correctCount: 8,
          masteryStatus: 'proficient'
        },
        {
          reviewCount: 5,
          correctCount: 5,
          masteryStatus: 'mastered'
        }
      ];

      const mockAttempts = [
        { attemptedAt: new Date() },
        { attemptedAt: new Date(Date.now() - 86400000) }
      ];

      mockPrisma.verseProgress.findMany.mockResolvedValue(mockProgress);
      mockPrisma.quizAttempt.findMany.mockResolvedValue(mockAttempts);
      mockPrisma.challengeParticipation.count.mockResolvedValue(3);

      const result = await service.getUserStatistics('user-1');

      expect(result.success).toBe(true);
      expect(result.data?.totalVerses).toBe(2);
      expect(result.data?.versesMastered).toBe(1);
      expect(result.data?.versesInProgress).toBe(1);
      expect(result.data?.challengesCompleted).toBe(3);
    });
  });

  describe('shareVerse', () => {
    it('should share a verse publicly', async () => {
      const mockSharedVerse = {
        id: 'shared-1',
        userId: 'user-1',
        verseId: 'verse-1',
        caption: 'This verse changed my life!',
        isPublic: true,
        likes: 0,
        comments: 0,
        shares: 0,
        sharedAt: new Date()
      };

      mockPrisma.sharedVerse.create.mockResolvedValue(mockSharedVerse);

      const result = await service.shareVerse(
        'user-1',
        'verse-1',
        'This verse changed my life!',
        true
      );

      expect(result.success).toBe(true);
      expect(result.data?.caption).toBe('This verse changed my life!');
      expect(mockPrisma.sharedVerse.create).toHaveBeenCalled();
    });
  });

  describe('getActiveChallenges', () => {
    it('should retrieve active challenges', async () => {
      const now = new Date();
      const mockChallenges = [
        {
          id: 'challenge-1',
          title: 'Active Challenge',
          isActive: true,
          startDate: new Date(now.getTime() - 86400000),
          endDate: new Date(now.getTime() + 86400000)
        }
      ];

      mockPrisma.memorizationChallenge.findMany.mockResolvedValue(mockChallenges);

      const result = await service.getActiveChallenges();

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
      expect(mockPrisma.memorizationChallenge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true
          })
        })
      );
    });
  });
});
