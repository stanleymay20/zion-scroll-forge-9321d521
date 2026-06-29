/**
 * Scripture Memory Service
 * Core service for scripture memorization with spaced repetition algorithm
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import {
  MemoryVerse,
  VerseProgress,
  MemoryQuiz,
  QuizAttempt,
  MemorizationChallenge,
  ChallengeParticipation,
  SharedVerse,
  CreateVerseRequest,
  UpdateProgressRequest,
  CreateChallengeRequest,
  SpacedRepetitionParams,
  MemoryStatistics,
  VerseFilterOptions,
  ScriptureMemoryResponse,
  QuizFormat,
  MasteryLevel,
  DifficultyLevel
} from '../types/scripture-memory.types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class ScriptureMemoryService {
  /**
   * Create a new verse in the library
   */
  async createVerse(request: CreateVerseRequest): Promise<ScriptureMemoryResponse<MemoryVerse>> {
    try {
      const verse = await prisma.memoryVerse.create({
        data: {
          id: uuidv4(),
          reference: request.reference,
          text: request.text,
          translation: request.translation,
          category: request.category,
          difficulty: request.difficulty,
          tags: request.tags || [],
          audioUrl: request.audioUrl,
          updatedAt: new Date()
        }
      });

      logger.info(`Created memory verse: ${verse.reference}`);
      return { success: true, data: verse as MemoryVerse };
    } catch (error) {
      logger.error('Error creating memory verse:', error);
      return { success: false, error: 'Failed to create memory verse' };
    }
  }

  /**
   * Get verses with filtering and pagination
   */
  async getVerses(filters: VerseFilterOptions): Promise<ScriptureMemoryResponse<MemoryVerse[]>> {
    try {
      const where: any = {};

      if (filters.category) where.category = filters.category;
      if (filters.difficulty) where.difficulty = filters.difficulty;
      if (filters.translation) where.translation = filters.translation;
      if (filters.tags && filters.tags.length > 0) {
        where.tags = { hasSome: filters.tags };
      }
      if (filters.searchQuery) {
        where.OR = [
          { reference: { contains: filters.searchQuery, mode: 'insensitive' } },
          { text: { contains: filters.searchQuery, mode: 'insensitive' } }
        ];
      }

      const orderBy: any = {};
      if (filters.sortBy) {
        orderBy[filters.sortBy] = filters.sortOrder || 'asc';
      }

      const verses = await prisma.memoryVerse.findMany({
        where,
        orderBy: orderBy.reference ? orderBy : { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0
      });

      return { success: true, data: verses as MemoryVerse[] };
    } catch (error) {
      logger.error('Error fetching verses:', error);
      return { success: false, error: 'Failed to fetch verses' };
    }
  }

  /**
   * Get a specific verse by ID
   */
  async getVerseById(verseId: string): Promise<ScriptureMemoryResponse<MemoryVerse>> {
    try {
      const verse = await prisma.memoryVerse.findUnique({
        where: { id: verseId }
      });

      if (!verse) {
        return { success: false, error: 'Verse not found' };
      }

      return { success: true, data: verse as MemoryVerse };
    } catch (error) {
      logger.error('Error fetching verse:', error);
      return { success: false, error: 'Failed to fetch verse' };
    }
  }

  /**
   * Get user's progress on a verse
   */
  async getVerseProgress(userId: string, verseId: string): Promise<ScriptureMemoryResponse<VerseProgress>> {
    try {
      let progress = await prisma.verseProgress.findUnique({
        where: {
          userId_verseId: { userId, verseId }
        }
      });

      // Create initial progress if doesn't exist
      if (!progress) {
        progress = await prisma.verseProgress.create({
          data: {
            id: uuidv4(),
            userId,
            verseId,
            nextReviewDate: new Date(),
            reviewCount: 0,
            correctCount: 0,
            incorrectCount: 0,
            masteryLevel: 0,
            masteryStatus: 'beginner',
            easeFactor: 2.5,
            interval: 1,
            updatedAt: new Date()
          }
        });
      }

      return { success: true, data: progress as VerseProgress };
    } catch (error) {
      logger.error('Error fetching verse progress:', error);
      return { success: false, error: 'Failed to fetch verse progress' };
    }
  }

  /**
   * Update verse progress using spaced repetition algorithm
   */
  async updateProgress(userId: string, request: UpdateProgressRequest): Promise<ScriptureMemoryResponse<VerseProgress>> {
    try {
      const progressResult = await this.getVerseProgress(userId, request.verseId);
      if (!progressResult.success || !progressResult.data) {
        return { success: false, error: 'Failed to get current progress' };
      }

      const currentProgress = progressResult.data;
      
      // Calculate quality rating (0-5) based on correctness and time
      const quality = this.calculateQuality(request.isCorrect, request.timeSpent);
      
      // Apply spaced repetition algorithm
      const srParams = this.calculateSpacedRepetition({
        easeFactor: currentProgress.easeFactor,
        interval: currentProgress.interval,
        repetitions: currentProgress.reviewCount,
        quality
      });

      // Calculate new mastery level
      const newMasteryLevel = this.calculateMasteryLevel(
        currentProgress.correctCount + (request.isCorrect ? 1 : 0),
        currentProgress.reviewCount + 1
      );

      const masteryStatus = this.getMasteryStatus(newMasteryLevel);

      // Calculate next review date
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + srParams.interval);

      const updatedProgress = await prisma.verseProgress.update({
        where: {
          userId_verseId: { userId, verseId: request.verseId }
        },
        data: {
          reviewCount: { increment: 1 },
          correctCount: request.isCorrect ? { increment: 1 } : undefined,
          incorrectCount: !request.isCorrect ? { increment: 1 } : undefined,
          masteryLevel: newMasteryLevel,
          masteryStatus,
          easeFactor: srParams.easeFactor,
          interval: srParams.interval,
          nextReviewDate,
          lastReviewedAt: new Date(),
          updatedAt: new Date()
        }
      });

      logger.info(`Updated progress for user ${userId} on verse ${request.verseId}`);
      return { success: true, data: updatedProgress as VerseProgress };
    } catch (error) {
      logger.error('Error updating verse progress:', error);
      return { success: false, error: 'Failed to update verse progress' };
    }
  }

  /**
   * Calculate quality rating for spaced repetition (0-5)
   */
  private calculateQuality(isCorrect: boolean, timeSpent: number): number {
    if (!isCorrect) return 0;
    
    // Perfect recall in under 5 seconds = 5
    // Good recall in under 10 seconds = 4
    // Decent recall in under 20 seconds = 3
    // Slow recall = 2
    if (timeSpent < 5) return 5;
    if (timeSpent < 10) return 4;
    if (timeSpent < 20) return 3;
    return 2;
  }

  /**
   * Calculate spaced repetition parameters using SM-2 algorithm
   */
  private calculateSpacedRepetition(params: SpacedRepetitionParams): SpacedRepetitionParams {
    let { easeFactor, interval, repetitions, quality } = params;

    // Update ease factor
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    // Update interval
    if (quality < 3) {
      // Reset if recall was poor
      repetitions = 0;
      interval = 1;
    } else {
      repetitions += 1;
      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
    }

    return { easeFactor, interval, repetitions, quality };
  }

  /**
   * Calculate mastery level (0-100) based on performance
   */
  private calculateMasteryLevel(correctCount: number, totalReviews: number): number {
    if (totalReviews === 0) return 0;
    
    const accuracy = correctCount / totalReviews;
    const consistencyBonus = Math.min(totalReviews / 20, 1) * 20; // Up to 20% bonus for consistency
    
    return Math.min(Math.round(accuracy * 80 + consistencyBonus), 100);
  }

  /**
   * Get mastery status from mastery level
   */
  private getMasteryStatus(masteryLevel: number): MasteryLevel {
    if (masteryLevel >= 90) return 'mastered';
    if (masteryLevel >= 70) return 'proficient';
    if (masteryLevel >= 50) return 'familiar';
    if (masteryLevel >= 25) return 'learning';
    return 'beginner';
  }

  /**
   * Get verses due for review
   */
  async getDueVerses(userId: string): Promise<ScriptureMemoryResponse<VerseProgress[]>> {
    try {
      const dueVerses = await prisma.verseProgress.findMany({
        where: {
          userId,
          nextReviewDate: { lte: new Date() }
        },
        orderBy: { nextReviewDate: 'asc' },
        take: 20
      });

      return { success: true, data: dueVerses as VerseProgress[] };
    } catch (error) {
      logger.error('Error fetching due verses:', error);
      return { success: false, error: 'Failed to fetch due verses' };
    }
  }

  /**
   * Generate quiz for a verse
   */
  async generateQuiz(verseId: string, format: QuizFormat): Promise<ScriptureMemoryResponse<MemoryQuiz>> {
    try {
      const verseResult = await this.getVerseById(verseId);
      if (!verseResult.success || !verseResult.data) {
        return { success: false, error: 'Verse not found' };
      }

      const verse = verseResult.data;
      let quiz: any = {
        id: uuidv4(),
        verseId,
        format,
        createdAt: new Date()
      };

      switch (format) {
        case 'fill_in_blank':
          quiz = { ...quiz, ...this.generateFillInBlankQuiz(verse) };
          break;
        case 'multiple_choice':
          quiz = { ...quiz, ...this.generateMultipleChoiceQuiz(verse) };
          break;
        case 'typing':
          quiz = { ...quiz, ...this.generateTypingQuiz(verse) };
          break;
        case 'recitation':
          quiz = { ...quiz, ...this.generateRecitationQuiz(verse) };
          break;
      }

      const createdQuiz = await prisma.memoryQuiz.create({
        data: quiz
      });

      return { success: true, data: createdQuiz as MemoryQuiz };
    } catch (error) {
      logger.error('Error generating quiz:', error);
      return { success: false, error: 'Failed to generate quiz' };
    }
  }

  /**
   * Generate fill-in-the-blank quiz
   */
  private generateFillInBlankQuiz(verse: MemoryVerse): Partial<MemoryQuiz> {
    const words = verse.text.split(' ');
    const numBlanks = Math.min(Math.ceil(words.length * 0.2), 5); // 20% of words, max 5
    const blankIndices: number[] = [];
    
    // Select random words to blank out
    while (blankIndices.length < numBlanks) {
      const index = Math.floor(Math.random() * words.length);
      if (!blankIndices.includes(index) && words[index].length > 3) {
        blankIndices.push(index);
      }
    }
    
    blankIndices.sort((a, b) => a - b);
    const blankedWords = blankIndices.map(i => words[i]);
    
    const questionWords = [...words];
    blankIndices.forEach(i => {
      questionWords[i] = '_____';
    });

    return {
      question: questionWords.join(' '),
      correctAnswer: blankedWords.join(', '),
      blanks: blankIndices,
      hints: blankedWords.map(w => `${w.length} letters, starts with ${w[0]}`)
    };
  }

  /**
   * Generate multiple choice quiz
   */
  private generateMultipleChoiceQuiz(verse: MemoryVerse): Partial<MemoryQuiz> {
    const words = verse.text.split(' ');
    const targetIndex = Math.floor(Math.random() * words.length);
    const correctWord = words[targetIndex];
    
    const questionWords = [...words];
    questionWords[targetIndex] = '_____';

    // Generate distractors (wrong options)
    const distractors = this.generateDistractors(correctWord, 3);
    const options = [correctWord, ...distractors].sort(() => Math.random() - 0.5);

    return {
      question: `${verse.reference}: ${questionWords.join(' ')}`,
      correctAnswer: correctWord,
      options,
      hints: [`The word has ${correctWord.length} letters`]
    };
  }

  /**
   * Generate typing quiz
   */
  private generateTypingQuiz(verse: MemoryVerse): Partial<MemoryQuiz> {
    return {
      question: `Type the complete verse for ${verse.reference}`,
      correctAnswer: verse.text,
      hints: [
        `First word: ${verse.text.split(' ')[0]}`,
        `Last word: ${verse.text.split(' ').slice(-1)[0]}`,
        `Word count: ${verse.text.split(' ').length}`
      ]
    };
  }

  /**
   * Generate recitation quiz
   */
  private generateRecitationQuiz(verse: MemoryVerse): Partial<MemoryQuiz> {
    return {
      question: `Recite ${verse.reference}`,
      correctAnswer: verse.text,
      hints: [
        `First few words: ${verse.text.split(' ').slice(0, 3).join(' ')}...`,
        `Theme: ${verse.category}`
      ]
    };
  }

  /**
   * Generate distractor words for multiple choice
   */
  private generateDistractors(correctWord: string, count: number): string[] {
    const commonWords = ['love', 'faith', 'hope', 'grace', 'peace', 'joy', 'truth', 'light', 'life', 'word'];
    const distractors: string[] = [];
    
    while (distractors.length < count) {
      const word = commonWords[Math.floor(Math.random() * commonWords.length)];
      if (word !== correctWord && !distractors.includes(word)) {
        distractors.push(word);
      }
    }
    
    return distractors;
  }

  /**
   * Submit quiz attempt
   */
  async submitQuizAttempt(
    userId: string,
    verseId: string,
    quizId: string,
    userAnswer: string,
    timeSpent: number,
    hintsUsed: number
  ): Promise<ScriptureMemoryResponse<QuizAttempt>> {
    try {
      const quiz = await prisma.memoryQuiz.findUnique({
        where: { id: quizId }
      });

      if (!quiz) {
        return { success: false, error: 'Quiz not found' };
      }

      const isCorrect = this.checkAnswer(userAnswer, quiz.correctAnswer, quiz.format);

      const attempt = await prisma.quizAttempt.create({
        data: {
          id: uuidv4(),
          userId,
          verseId,
          quizId,
          userAnswer,
          isCorrect,
          timeSpent,
          hintsUsed,
          attemptedAt: new Date()
        }
      });

      // Update progress
      await this.updateProgress(userId, {
        verseId,
        isCorrect,
        timeSpent,
        quizFormat: quiz.format as QuizFormat
      });

      return { success: true, data: attempt as QuizAttempt };
    } catch (error) {
      logger.error('Error submitting quiz attempt:', error);
      return { success: false, error: 'Failed to submit quiz attempt' };
    }
  }

  /**
   * Check if answer is correct
   */
  private checkAnswer(userAnswer: string, correctAnswer: string, format: string): boolean {
    const normalize = (str: string) => str.toLowerCase().trim().replace(/[^\w\s]/g, '');
    
    if (format === 'typing' || format === 'recitation') {
      // Allow 90% similarity for typing/recitation
      const similarity = this.calculateSimilarity(normalize(userAnswer), normalize(correctAnswer));
      return similarity >= 0.9;
    }
    
    return normalize(userAnswer) === normalize(correctAnswer);
  }

  /**
   * Calculate string similarity (Levenshtein distance based)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Create memorization challenge
   */
  async createChallenge(userId: string, request: CreateChallengeRequest): Promise<ScriptureMemoryResponse<MemorizationChallenge>> {
    try {
      const challenge = await prisma.memorizationChallenge.create({
        data: {
          id: uuidv4(),
          title: request.title,
          description: request.description,
          verseIds: request.verseIds,
          startDate: request.startDate,
          endDate: request.endDate,
          scrollCoinReward: request.scrollCoinReward,
          badgeReward: request.badgeReward,
          isActive: true,
          createdBy: userId,
          participantCount: 0,
          createdAt: new Date()
        }
      });

      logger.info(`Created memorization challenge: ${challenge.title}`);
      return { success: true, data: challenge as MemorizationChallenge };
    } catch (error) {
      logger.error('Error creating challenge:', error);
      return { success: false, error: 'Failed to create challenge' };
    }
  }

  /**
   * Join a challenge
   */
  async joinChallenge(userId: string, challengeId: string): Promise<ScriptureMemoryResponse<ChallengeParticipation>> {
    try {
      const challenge = await prisma.memorizationChallenge.findUnique({
        where: { id: challengeId }
      });

      if (!challenge) {
        return { success: false, error: 'Challenge not found' };
      }

      if (!challenge.isActive) {
        return { success: false, error: 'Challenge is not active' };
      }

      const participation = await prisma.challengeParticipation.create({
        data: {
          id: uuidv4(),
          userId,
          challengeId,
          progress: 0,
          versesCompleted: 0,
          totalVerses: challenge.verseIds.length,
          scrollCoinEarned: 0,
          joinedAt: new Date()
        }
      });

      // Increment participant count
      await prisma.memorizationChallenge.update({
        where: { id: challengeId },
        data: { participantCount: { increment: 1 } }
      });

      return { success: true, data: participation as ChallengeParticipation };
    } catch (error) {
      logger.error('Error joining challenge:', error);
      return { success: false, error: 'Failed to join challenge' };
    }
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(userId: string): Promise<ScriptureMemoryResponse<MemoryStatistics>> {
    try {
      const allProgress = await prisma.verseProgress.findMany({
        where: { userId }
      });

      const totalVerses = allProgress.length;
      const versesInProgress = allProgress.filter(p => p.masteryStatus !== 'mastered').length;
      const versesMastered = allProgress.filter(p => p.masteryStatus === 'mastered').length;
      
      const totalReviews = allProgress.reduce((sum, p) => sum + p.reviewCount, 0);
      const totalCorrect = allProgress.reduce((sum, p) => sum + p.correctCount, 0);
      const averageAccuracy = totalReviews > 0 ? (totalCorrect / totalReviews) * 100 : 0;

      // Calculate streak
      const recentAttempts = await prisma.quizAttempt.findMany({
        where: { userId },
        orderBy: { attemptedAt: 'desc' },
        take: 100
      });

      const currentStreak = this.calculateStreak(recentAttempts);
      const longestStreak = this.calculateLongestStreak(recentAttempts);

      // Get challenges completed
      const challengesCompleted = await prisma.challengeParticipation.count({
        where: {
          userId,
          completedAt: { not: null }
        }
      });

      const statistics: MemoryStatistics = {
        totalVerses,
        versesInProgress,
        versesMastered,
        currentStreak,
        longestStreak,
        totalReviews,
        averageAccuracy: Math.round(averageAccuracy),
        scrollCoinEarned: 0, // Would be calculated from actual rewards
        challengesCompleted
      };

      return { success: true, data: statistics };
    } catch (error) {
      logger.error('Error fetching user statistics:', error);
      return { success: false, error: 'Failed to fetch statistics' };
    }
  }

  /**
   * Calculate current streak
   */
  private calculateStreak(attempts: any[]): number {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const attempt of attempts) {
      const attemptDate = new Date(attempt.attemptedAt);
      attemptDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - attemptDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Calculate longest streak
   */
  private calculateLongestStreak(attempts: any[]): number {
    if (attempts.length === 0) return 0;

    let longestStreak = 1;
    let currentStreak = 1;
    let lastDate = new Date(attempts[0].attemptedAt);
    lastDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < attempts.length; i++) {
      const attemptDate = new Date(attempts[i].attemptedAt);
      attemptDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((lastDate.getTime() - attemptDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else if (daysDiff > 1) {
        currentStreak = 1;
      }
      
      lastDate = attemptDate;
    }

    return longestStreak;
  }

  /**
   * Share a verse
   */
  async shareVerse(
    userId: string,
    verseId: string,
    caption?: string,
    isPublic: boolean = true
  ): Promise<ScriptureMemoryResponse<SharedVerse>> {
    try {
      const sharedVerse = await prisma.sharedVerse.create({
        data: {
          id: uuidv4(),
          userId,
          verseId,
          caption,
          isPublic,
          likes: 0,
          comments: 0,
          shares: 0,
          sharedAt: new Date()
        }
      });

      return { success: true, data: sharedVerse as SharedVerse };
    } catch (error) {
      logger.error('Error sharing verse:', error);
      return { success: false, error: 'Failed to share verse' };
    }
  }

  /**
   * Get shared verses feed
   */
  async getSharedVerses(limit: number = 20, offset: number = 0): Promise<ScriptureMemoryResponse<SharedVerse[]>> {
    try {
      const sharedVerses = await prisma.sharedVerse.findMany({
        where: { isPublic: true },
        orderBy: { sharedAt: 'desc' },
        take: limit,
        skip: offset
      });

      return { success: true, data: sharedVerses as SharedVerse[] };
    } catch (error) {
      logger.error('Error fetching shared verses:', error);
      return { success: false, error: 'Failed to fetch shared verses' };
    }
  }

  /**
   * Get active challenges
   */
  async getActiveChallenges(): Promise<ScriptureMemoryResponse<MemorizationChallenge[]>> {
    try {
      const now = new Date();
      const challenges = await prisma.memorizationChallenge.findMany({
        where: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now }
        },
        orderBy: { startDate: 'desc' }
      });

      return { success: true, data: challenges as MemorizationChallenge[] };
    } catch (error) {
      logger.error('Error fetching active challenges:', error);
      return { success: false, error: 'Failed to fetch active challenges' };
    }
  }
}

export default new ScriptureMemoryService();
