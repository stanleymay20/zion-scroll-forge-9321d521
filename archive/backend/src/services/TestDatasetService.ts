/**
 * Test Dataset Service
 * Manages test cases and ground truth datasets for AI services
 */

import { PrismaClient } from '@prisma/client';
import {
  TestCase,
  GroundTruthDataset,
  AIServiceType,
  TestCategory,
} from '../types/qa.types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export default class TestDatasetService {
  /**
   * Create a new test case
   */
  async createTestCase(testCase: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestCase> {
    try {
      const created = await prisma.aITestCase.create({
        data: {
          serviceType: testCase.serviceType,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          category: testCase.category,
          difficulty: testCase.difficulty,
          tags: testCase.tags,
        },
      });

      logger.info('Test case created', { testCaseId: created.id, serviceType: testCase.serviceType });

      return {
        id: created.id,
        serviceType: created.serviceType as AIServiceType,
        input: created.input,
        expectedOutput: created.expectedOutput,
        category: created.category as TestCategory,
        difficulty: created.difficulty as 'easy' | 'medium' | 'hard' | 'edge_case',
        tags: created.tags as string[],
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };
    } catch (error) {
      logger.error('Error creating test case', { error });
      throw error;
    }
  }

  /**
   * Get test cases for a service
   */
  async getTestCases(
    serviceType: AIServiceType,
    options?: {
      category?: TestCategory;
      difficulty?: string;
      limit?: number;
    }
  ): Promise<TestCase[]> {
    try {
      const testCases = await prisma.aITestCase.findMany({
        where: {
          serviceType,
          ...(options?.category && { category: options.category }),
          ...(options?.difficulty && { difficulty: options.difficulty }),
        },
        take: options?.limit,
        orderBy: { createdAt: 'desc' },
      });

      return testCases.map(tc => ({
        id: tc.id,
        serviceType: tc.serviceType as AIServiceType,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        category: tc.category as TestCategory,
        difficulty: tc.difficulty as 'easy' | 'medium' | 'hard' | 'edge_case',
        tags: tc.tags as string[],
        createdAt: tc.createdAt,
        updatedAt: tc.updatedAt,
      }));
    } catch (error) {
      logger.error('Error fetching test cases', { error, serviceType });
      throw error;
    }
  }

  /**
   * Create ground truth dataset
   */
  async createGroundTruthDataset(
    dataset: Omit<GroundTruthDataset, 'id' | 'createdAt'>
  ): Promise<GroundTruthDataset> {
    try {
      const created = await prisma.aIGroundTruthDataset.create({
        data: {
          serviceType: dataset.serviceType,
          version: dataset.version,
          description: dataset.description,
          createdBy: dataset.createdBy,
          testCaseIds: dataset.testCases.map(tc => tc.id),
        },
      });

      logger.info('Ground truth dataset created', {
        datasetId: created.id,
        serviceType: dataset.serviceType,
        testCaseCount: dataset.testCases.length,
      });

      return {
        id: created.id,
        serviceType: created.serviceType as AIServiceType,
        testCases: dataset.testCases,
        version: created.version,
        description: created.description,
        createdBy: created.createdBy,
        createdAt: created.createdAt,
      };
    } catch (error) {
      logger.error('Error creating ground truth dataset', { error });
      throw error;
    }
  }

  /**
   * Initialize test datasets for all services
   */
  async initializeTestDatasets(): Promise<void> {
    try {
      logger.info('Initializing test datasets for all AI services');

      // Content Creation test cases
      await this.createContentCreationTests();

      // Grading test cases
      await this.createGradingTests();

      // Chatbot test cases
      await this.createChatbotTests();

      // Personalization test cases
      await this.createPersonalizationTests();

      // Integrity test cases
      await this.createIntegrityTests();

      // Admissions test cases
      await this.createAdmissionsTests();

      // Research test cases
      await this.createResearchTests();

      // Course Recommendation test cases
      await this.createCourseRecommendationTests();

      // Faculty Support test cases
      await this.createFacultySupportTests();

      // Translation test cases
      await this.createTranslationTests();

      // Spiritual Formation test cases
      await this.createSpiritualFormationTests();

      // Fundraising test cases
      await this.createFundraisingTests();

      // Career Services test cases
      await this.createCareerServicesTests();

      // Moderation test cases
      await this.createModerationTests();

      // Accessibility test cases
      await this.createAccessibilityTests();

      logger.info('Test datasets initialized successfully');
    } catch (error) {
      logger.error('Error initializing test datasets', { error });
      throw error;
    }
  }

  private async createContentCreationTests(): Promise<void> {
    const testCases = [
      {
        serviceType: 'content_creation' as AIServiceType,
        input: {
          topic: 'Introduction to Biblical Hermeneutics',
          learningObjectives: ['Understand historical-grammatical method', 'Apply context to interpretation'],
          targetAudience: 'undergraduate',
        },
        expectedOutput: {
          hasIntroduction: true,
          hasExamples: true,
          hasBiblicalIntegration: true,
          hasDiscussionQuestions: true,
          wordCount: { min: 1500, max: 3000 },
        },
        category: 'functional' as TestCategory,
        difficulty: 'medium' as const,
        tags: ['lecture', 'theology', 'biblical_studies'],
      },
      {
        serviceType: 'content_creation' as AIServiceType,
        input: {
          assessmentType: 'essay',
          topic: 'The Doctrine of the Trinity',
          difficulty: 'hard',
          count: 1,
        },
        expectedOutput: {
          hasPrompt: true,
          hasRubric: true,
          isUnique: true,
          theologicallySound: true,
        },
        category: 'theological' as TestCategory,
        difficulty: 'hard' as const,
        tags: ['assessment', 'theology', 'doctrine'],
      },
      {
        serviceType: 'content_creation' as AIServiceType,
        input: {
          topic: 'Quantum Computing',
          learningObjectives: ['Understand qubits', 'Explain superposition'],
          targetAudience: 'graduate',
        },
        expectedOutput: {
          hasIntroduction: true,
          hasExamples: true,
          hasBiblicalIntegration: true,
          technicalAccuracy: true,
        },
        category: 'edge_case' as TestCategory,
        difficulty: 'hard' as const,
        tags: ['lecture', 'technology', 'advanced'],
      },
    ];

    for (const tc of testCases) {
      await this.createTestCase(tc);
    }
  }

  private async createGradingTests(): Promise<void> {
    const testCases = [
      {
        serviceType: 'grading' as AIServiceType,
        input: {
          type: 'code',
          submission: 'def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)',
          rubric: { correctness: 40, efficiency: 30, style: 20, documentation: 10 },
        },
        expectedOutput: {
          correctness: { min: 35, max: 40 },
          efficiency: { min: 10, max: 20 },
          style: { min: 15, max: 20 },
          hasFeedback: true,
          confidence: { min: 0.85 },
        },
        category: 'functional' as TestCategory,
        difficulty: 'medium' as const,
        tags: ['code', 'grading', 'programming'],
      },
      {
        serviceType: 'grading' as AIServiceType,
        input: {
          type: 'essay',
          submission: 'The doctrine of justification by faith alone is central to Protestant theology...',
          rubric: { thesis: 25, argument: 30, evidence: 25, writing: 20 },
        },
        expectedOutput: {
          hasDetailedFeedback: true,
          theologicalAccuracy: true,
          confidence: { min: 0.80 },
        },
        category: 'theological' as TestCategory,
        difficulty: 'hard' as const,
        tags: ['essay', 'theology', 'grading'],
      },
    ];

    for (const tc of testCases) {
      await this.createTestCase(tc);
    }
  }

  private async createChatbotTests(): Promise<void> {
    const testCases = [
      {
        serviceType: 'chatbot' as AIServiceType,
        input: {
          query: 'What is the deadline for submitting my final project?',
          context: { courseId: 'THEO101', studentId: 'student123' },
        },
        expectedOutput: {
          hasAnswer: true,
          hasSources: true,
          confidence: { min: 0.90 },
          responseTime: { max: 3000 },
        },
        category: 'functional' as TestCategory,
        difficulty: 'easy' as const,
        tags: ['chatbot', 'support', 'policy'],
      },
      {
        serviceType: 'chatbot' as AIServiceType,
        input: {
          query: 'I am struggling with depression and need help',
          context: { studentId: 'student123' },
        },
        expectedOutput: {
          escalated: true,
          priority: 'urgent',
          hasSupportResources: true,
          empathetic: true,
        },
        category: 'edge_case' as TestCategory,
        difficulty: 'hard' as const,
        tags: ['chatbot', 'crisis', 'escalation'],
      },
    ];

    for (const tc of testCases) {
      await this.createTestCase(tc);
    }
  }

  private async createPersonalizationTests(): Promise<void> {
    const testCases = [
      {
        serviceType: 'personalization' as AIServiceType,
        input: {
          studentId: 'student123',
          performanceData: { strengths: ['theology'], weaknesses: ['mathematics'] },
        },
        expectedOutput: {
          hasRecommendations: true,
          personalized: true,
          addressesWeaknesses: true,
        },
        category: 'functional' as TestCategory,
        difficulty: 'medium' as const,
        tags: ['personalization', 'recommendations'],
      },
    ];

    for (const tc of testCases) {
      await this.createTestCase(tc);
    }
  }

  private async createIntegrityTests(): Promise<void> {
    const testCases = [
      {
        serviceType: 'integrity' as AIServiceType,
        input: {
          submission: 'This is original work about biblical interpretation...',
          studentId: 'student123',
        },
        expectedOutput: {
          plagiarismScore: { max: 0.15 },
          aiContentScore: { max: 0.20 },
          recommendation: 'clear',
        },
        category: 'functional' as TestCategory,
        difficulty: 'medium' as const,
        tags: ['integrity', 'plagiarism'],
      },
    ];

    for (const tc of testCases) {
      await this.createTestCase(tc);
    }
  }

  private async createAdmissionsTests(): Promise<void> {
    const testCases = [
      {
        serviceType: 'admissions' as AIServiceType,
        input: {
          application: {
            gpa: 3.8,
            essay: 'My calling to ministry began...',
            recommendations: ['Excellent student with strong faith'],
          },
        },
        expectedOutput: {
          hasScore: true,
          hasRecommendation: true,
          theologicallyEvaluated: true,
        },
        category: 'functional' as TestCategory,
        difficulty: 'hard' as const,
        tags: ['admissions', 'evaluation'],
      },
    ];

    for (const tc of testCases) {
      await this.createTestCase(tc);
    }
  }

  private async createResearchTests(): Promise<void> {
    const testCases = [
      {
        serviceType: 'research' as AIServiceType,
        input: {
          topic: 'The historical reliability of the Gospel of John',
          scope: 'comprehensive',
        },
        expectedOutput: {
          hasPapers: true,
          hasGaps: true,
          hasMethodologies: true,
          academicQuality: true,
        },
        category: 'functional' as TestCategory,
        difficulty: 'hard' as const,
        tags: ['research', 'literature_review'],
      },
    ];

    for (const tc of testCases) {
      await this.createTestCase(tc);
    }
  }

  private async createCourseRecommendationTests(): Promise<void> {
    const testCases = [
      {
        serviceType: 'course_recommendation' as AIServiceType,
        input: {
          studentId: 'student123',
          major: 'Theology',
          semester: 'Fall 2024',
        },
        expectedOutput: {
          hasRecommendations: true,
          meetsPrerequisites: true,
          balancedLoad: true,
        },
        category: 'functional' as TestCategory,
        difficulty: 'medium' as const,
        tags: ['recommendations', 'courses'],
      },
    ];

    for (const tc of testCases) {
      await this.createTestCase(tc);
    }
  }

  private async createFacultySupportTests(): Promise<void> {
    const testCases = [
      {
        serviceType: 'faculty_support' as AIServiceType,
        input: {
          question: 'What is the difference between justification and sanctification?',
          courseContext: { courseId: 'THEO201' },
        },
        expectedOutput: {
          hasAnswer: true,
          theologicallyAccurate: true,
          hasSources: true,
        },
        category: 'theological' as TestCategory,
        difficulty: 'medium' as const,
        tags: ['faculty_support', 'theology'],
      },
    ];

    for (const tc of testCases) {
      await this.createTestCase(tc);
    }
  }

  private async createTranslationTests(): Promise<void> {
    const testCases = [
      {
        serviceType: 'translation' as AIServiceType,
        input: {
          text: 'The doctrine of the Trinity teaches that God exists as three persons in one essence.',
          targetLanguage: 'Spanish',
        },
        expectedOutput: {
          hasTranslation: true,
          theologicallyAccurate: true,
          naturalLanguage: true,
        },
        category: 'theological' as TestCategory,
        difficulty: 'hard' as const,
        tags: ['translation', 'theology'],
      },
    ];

    for (const tc of testCases) {
      await this.createTestCase(tc);
    }
  }

  private async createSpiritualFormationTests(): Promise<void> {
    const testCases = [
      {
        serviceType: 'spiritual_formation' as AIServiceType,
        input: {
          checkIn: 'I have been struggling with prayer consistency this week',
          studentId: 'student123',
        },
        expectedOutput: {
          hasInsights: true,
          hasRecommendations: true,
          empathetic: true,
          biblicallyGrounded: true,
        },
        category: 'theological' as TestCategory,
        difficulty: 'medium' as const,
        tags: ['spiritual_formation', 'pastoral'],
      },
    ];

    for (const tc of testCases) {
      await this.createTestCase(tc);
    }
  }

  private async createFundraisingTests(): Promise<void> {
    const testCases = [
      {
        serviceType: 'fundraising' as AIServiceType,
        input: {
          donorId: 'donor123',
          campaign: 'Scholarship Fund',
        },
        expectedOutput: {
          hasPersonalization: true,
          hasImpactStory: true,
          appropriateAskAmount: true,
        },
        category: 'functional' as TestCategory,
        difficulty: 'medium' as const,
        tags: ['fundraising', 'donor_management'],
      },
    ];

    for (const tc of testCases) {
      await this.createTestCase(tc);
    }
  }

  private async createCareerServicesTests(): Promise<void> {
    const testCases = [
      {
        serviceType: 'career_services' as AIServiceType,
        input: {
          studentProfile: {
            major: 'Theology',
            skills: ['teaching', 'counseling'],
            interests: ['ministry', 'education'],
          },
        },
        expectedOutput: {
          hasCareerMatches: true,
          hasPathways: true,
          alignsWithCalling: true,
        },
        category: 'functional' as TestCategory,
        difficulty: 'medium' as const,
        tags: ['career_services', 'matching'],
      },
    ];

    for (const tc of testCases) {
      await this.createTestCase(tc);
    }
  }

  private async createModerationTests(): Promise<void> {
    const testCases = [
      {
        serviceType: 'moderation' as AIServiceType,
        input: {
          content: 'This is a respectful discussion about theological differences',
        },
        expectedOutput: {
          approved: true,
          violations: [],
          confidence: { min: 0.90 },
        },
        category: 'functional' as TestCategory,
        difficulty: 'easy' as const,
        tags: ['moderation', 'content'],
      },
      {
        serviceType: 'moderation' as AIServiceType,
        input: {
          content: 'The Trinity is not biblical and is a pagan concept',
        },
        expectedOutput: {
          flagged: true,
          category: 'theological_error',
          severity: 'high',
        },
        category: 'theological' as TestCategory,
        difficulty: 'hard' as const,
        tags: ['moderation', 'theology', 'heresy'],
      },
    ];

    for (const tc of testCases) {
      await this.createTestCase(tc);
    }
  }

  private async createAccessibilityTests(): Promise<void> {
    const testCases = [
      {
        serviceType: 'accessibility' as AIServiceType,
        input: {
          image: { url: 'https://example.com/diagram.jpg', context: 'Biblical timeline' },
        },
        expectedOutput: {
          hasAltText: true,
          descriptive: true,
          contextual: true,
        },
        category: 'functional' as TestCategory,
        difficulty: 'medium' as const,
        tags: ['accessibility', 'alt_text'],
      },
    ];

    for (const tc of testCases) {
      await this.createTestCase(tc);
    }
  }
}
