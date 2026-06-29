/**
 * Spiritual Integration Service
 * Ensures biblical foundation and theological accuracy across all course content
 * 
 * This service validates that every course module includes:
 * - Biblical foundation rooted in Jesus Christ and Scripture
 * - Christ-centered worldview perspective
 * - Biblical principles for ethical issues
 * - Theological accuracy and spiritual depth
 * - Reflection questions connecting faith, learning, and kingdom governance
 */

import { PrismaClient } from '@prisma/client';
import TheologicalAlignmentService from './TheologicalAlignmentService';
import SpiritualFormationAIService from './SpiritualFormationAIService';
import { logger } from '../utils/logger';
import {
  CourseModule,
  SpiritualIntegration,
  BiblicalFoundation,
  ReflectionQuestion,
  Scripture
} from '../types/course-content.types';

const prisma = new PrismaClient();

export interface BiblicalFoundationValidation {
  moduleId: string;
  hasFoundation: boolean;
  isChristCentered: boolean;
  isScriptureRooted: boolean;
  scriptureCount: number;
  theologicalThemes: string[];
  issues: string[];
  score: number;
}

export interface WorldviewIntegrationReview {
  contentId: string;
  hasWorldviewPerspective: boolean;
  isChristCentered: boolean;
  enrichesAcademicContent: boolean;
  avoidsForcedDecoration: boolean;
  integrationQuality: number;
  recommendations: string[];
}

export interface TheologicalAccuracyCheck {
  contentId: string;
  theologicallyAccurate: boolean;
  spiritualDepth: number;
  doctrinalIssues: string[];
  alignmentScore: number;
  expertReviewRequired: boolean;
  concerns: string[];
}

export interface ReflectionQuestionsGeneration {
  moduleId: string;
  questions: ReflectionQuestion[];
  connectsFaithAndLearning: boolean;
  addressesKingdomGovernance: boolean;
  encouragesTransformation: boolean;
  quality: number;
}

export default class SpiritualIntegrationService {
  private theologicalAlignmentService: TheologicalAlignmentService;
  private spiritualFormationAIService: SpiritualFormationAIService;

  constructor(
    theologicalAlignmentService?: TheologicalAlignmentService,
    spiritualFormationAIService?: SpiritualFormationAIService
  ) {
    this.theologicalAlignmentService = theologicalAlignmentService || new TheologicalAlignmentService();
    this.spiritualFormationAIService = spiritualFormationAIService || new SpiritualFormationAIService();
  }

  /**
   * Validate biblical foundation for a module
   * Requirement 5.1: WHEN course content is developed THEN the System SHALL require 
   * biblical foundation section in each module explicitly rooted in Jesus Christ and Scripture
   */
  async validateBiblicalFoundation(moduleId: string): Promise<BiblicalFoundationValidation> {
    try {
      logger.info('Validating biblical foundation', { moduleId });

      // Retrieve module with spiritual integration
      const module = await this.getModuleWithSpiritualIntegration(moduleId);

      if (!module) {
        throw new Error(`Module not found: ${moduleId}`);
      }

      const spiritualIntegration = module.spiritualIntegration;
      const issues: string[] = [];
      let score = 100;

      // Check if biblical foundation exists
      const hasFoundation = !!spiritualIntegration?.biblicalFoundation;
      if (!hasFoundation) {
        issues.push('No biblical foundation section found');
        score -= 50;
      }

      // Check if Christ-centered
      const isChristCentered = this.checkChristCentered(spiritualIntegration?.biblicalFoundation);
      if (!isChristCentered) {
        issues.push('Biblical foundation is not explicitly Christ-centered');
        score -= 25;
      }

      // Check if Scripture-rooted
      const scriptureCount = spiritualIntegration?.biblicalFoundation?.scriptures?.length || 0;
      const isScriptureRooted = scriptureCount > 0;
      if (!isScriptureRooted) {
        issues.push('No Scripture references found');
        score -= 25;
      } else if (scriptureCount < 2) {
        issues.push('Insufficient Scripture references (minimum 2 recommended)');
        score -= 10;
      }

      // Extract theological themes
      const theologicalThemes = spiritualIntegration?.biblicalFoundation?.theologicalThemes || [];
      if (theologicalThemes.length === 0) {
        issues.push('No theological themes identified');
        score -= 10;
      }

      const validation: BiblicalFoundationValidation = {
        moduleId,
        hasFoundation,
        isChristCentered,
        isScriptureRooted,
        scriptureCount,
        theologicalThemes,
        issues,
        score: Math.max(0, score)
      };

      logger.info('Biblical foundation validated', {
        moduleId,
        score: validation.score,
        issueCount: issues.length
      });

      return validation;
    } catch (error) {
      logger.error('Error validating biblical foundation', { error, moduleId });
      throw error;
    }
  }

  /**
   * Review worldview integration for secular content
   * Requirement 5.2: WHEN any topic is taught THEN the System SHALL include 
   * Christ-centered worldview perspective showing His Lordship over that domain
   */
  async reviewWorldviewIntegration(contentId: string): Promise<WorldviewIntegrationReview> {
    try {
      logger.info('Reviewing worldview integration', { contentId });

      // Retrieve content (could be module, lecture, or other content)
      const content = await this.getContentById(contentId);

      if (!content) {
        throw new Error(`Content not found: ${contentId}`);
      }

      // Check if worldview perspective exists
      const hasWorldviewPerspective = !!content.worldviewPerspective;

      // Use AI to analyze worldview integration quality
      const analysis = await this.analyzeWorldviewIntegration(content);

      const review: WorldviewIntegrationReview = {
        contentId,
        hasWorldviewPerspective,
        isChristCentered: analysis.isChristCentered,
        enrichesAcademicContent: analysis.enrichesAcademicContent,
        avoidsForcedDecoration: analysis.avoidsForcedDecoration,
        integrationQuality: analysis.quality,
        recommendations: analysis.recommendations
      };

      logger.info('Worldview integration reviewed', {
        contentId,
        quality: review.integrationQuality
      });

      return review;
    } catch (error) {
      logger.error('Error reviewing worldview integration', { error, contentId });
      throw error;
    }
  }

  /**
   * Check theological accuracy with expert review
   * Requirement 5.4: WHEN content is reviewed THEN the System SHALL verify 
   * theological accuracy, Christ-centeredness, and spiritual depth avoiding generic spirituality
   */
  async checkTheologicalAccuracy(contentId: string): Promise<TheologicalAccuracyCheck> {
    try {
      logger.info('Checking theological accuracy', { contentId });

      // Retrieve content
      const content = await this.getContentById(contentId);

      if (!content) {
        throw new Error(`Content not found: ${contentId}`);
      }

      // Use TheologicalAlignmentService to check alignment
      const alignment = await this.theologicalAlignmentService.checkAlignment(
        JSON.stringify(content),
        'CONTENT_CREATION',
        {
          topic: content.title || 'Course Content',
          purpose: 'Course module spiritual integration'
        }
      );

      // Determine if expert review is required
      const expertReviewRequired = 
        alignment.score < 0.95 || 
        alignment.concerns.some(c => c.severity === 'critical' || c.severity === 'high');

      // Calculate spiritual depth (0-100)
      const spiritualDepth = this.calculateSpiritualDepth(content);

      const check: TheologicalAccuracyCheck = {
        contentId,
        theologicallyAccurate: alignment.approved,
        spiritualDepth,
        doctrinalIssues: alignment.concerns.map(c => c.description),
        alignmentScore: alignment.score * 100,
        expertReviewRequired,
        concerns: alignment.concerns.map(c => `${c.severity}: ${c.description}`)
      };

      logger.info('Theological accuracy checked', {
        contentId,
        accurate: check.theologicallyAccurate,
        expertReviewRequired
      });

      return check;
    } catch (error) {
      logger.error('Error checking theological accuracy', { error, contentId });
      throw error;
    }
  }

  /**
   * Generate reflection questions for faith-learning connection
   * Requirement 5.5: WHEN courses are completed THEN the System SHALL include 
   * reflection questions connecting faith, learning, and kingdom governance calling
   */
  async generateReflectionQuestions(moduleId: string): Promise<ReflectionQuestionsGeneration> {
    try {
      logger.info('Generating reflection questions', { moduleId });

      // Retrieve module
      const module = await this.getModuleWithSpiritualIntegration(moduleId);

      if (!module) {
        throw new Error(`Module not found: ${moduleId}`);
      }

      // Use AI to generate reflection questions
      const questions = await this.generateQuestionsWithAI(module);

      // Validate questions
      const connectsFaithAndLearning = this.checkFaithLearningConnection(questions);
      const addressesKingdomGovernance = this.checkKingdomGovernanceThemes(questions);
      const encouragesTransformation = this.checkTransformationFocus(questions);

      // Calculate quality score
      const quality = this.calculateQuestionQuality(
        questions,
        connectsFaithAndLearning,
        addressesKingdomGovernance,
        encouragesTransformation
      );

      const generation: ReflectionQuestionsGeneration = {
        moduleId,
        questions,
        connectsFaithAndLearning,
        addressesKingdomGovernance,
        encouragesTransformation,
        quality
      };

      logger.info('Reflection questions generated', {
        moduleId,
        questionCount: questions.length,
        quality
      });

      return generation;
    } catch (error) {
      logger.error('Error generating reflection questions', { error, moduleId });
      throw error;
    }
  }

  // Private helper methods

  private async getModuleWithSpiritualIntegration(moduleId: string): Promise<any> {
    // In a real implementation, this would query the database
    // For now, return a mock structure
    return {
      id: moduleId,
      title: 'Sample Module',
      spiritualIntegration: {
        biblicalFoundation: {
          scriptures: [],
          theologicalThemes: [],
          christCenteredPerspective: ''
        },
        worldviewPerspective: '',
        reflectionQuestions: [],
        prayerPoints: [],
        characterDevelopment: []
      }
    };
  }

  private async getContentById(contentId: string): Promise<any> {
    // In a real implementation, this would query the database
    return {
      id: contentId,
      title: 'Sample Content',
      content: '',
      worldviewPerspective: '',
      spiritualIntegration: {}
    };
  }

  private checkChristCentered(foundation?: BiblicalFoundation): boolean {
    if (!foundation) return false;

    const perspective = foundation.christCenteredPerspective?.toLowerCase() || '';
    
    // Check for Christ-centered language
    const christCenteredTerms = [
      'jesus',
      'christ',
      'lord',
      'savior',
      'messiah',
      'son of god',
      'lordship'
    ];

    return christCenteredTerms.some(term => perspective.includes(term));
  }

  private async analyzeWorldviewIntegration(content: any): Promise<any> {
    // Use AI to analyze worldview integration
    const prompt = `Analyze the following content for Christ-centered worldview integration:

Title: ${content.title}
Worldview Perspective: ${content.worldviewPerspective || 'Not provided'}

Evaluate:
1. Is the worldview perspective explicitly Christ-centered?
2. Does it enrich the academic content or feel forced/decorative?
3. Does it show Christ's Lordship over this domain?
4. Is it theologically sound?

Provide analysis in JSON format with:
{
  "isChristCentered": boolean,
  "enrichesAcademicContent": boolean,
  "avoidsForcedDecoration": boolean,
  "quality": number (0-100),
  "recommendations": string[]
}`;

    // For now, return a default analysis
    // In production, this would call the AI service
    return {
      isChristCentered: true,
      enrichesAcademicContent: true,
      avoidsForcedDecoration: true,
      quality: 85,
      recommendations: []
    };
  }

  private calculateSpiritualDepth(content: any): number {
    // Calculate spiritual depth based on various factors
    let depth = 0;

    // Check for Scripture references
    const scriptureCount = content.spiritualIntegration?.biblicalFoundation?.scriptures?.length || 0;
    depth += Math.min(scriptureCount * 10, 30);

    // Check for theological themes
    const themeCount = content.spiritualIntegration?.biblicalFoundation?.theologicalThemes?.length || 0;
    depth += Math.min(themeCount * 10, 30);

    // Check for reflection questions
    const questionCount = content.spiritualIntegration?.reflectionQuestions?.length || 0;
    depth += Math.min(questionCount * 5, 20);

    // Check for prayer points
    const prayerCount = content.spiritualIntegration?.prayerPoints?.length || 0;
    depth += Math.min(prayerCount * 5, 20);

    return Math.min(depth, 100);
  }

  private async generateQuestionsWithAI(module: any): Promise<ReflectionQuestion[]> {
    // Use AI to generate reflection questions
    const prompt = `Generate 5-7 reflection questions for this course module that:
1. Connect faith and learning
2. Address kingdom governance and calling
3. Encourage transformation over information
4. Are practical and applicable

Module: ${module.title}
Learning Objectives: ${JSON.stringify(module.learningObjectives || [])}

Format as JSON array of objects with:
{
  "id": "unique-id",
  "question": "the question text",
  "purpose": "why this question matters",
  "guidingThoughts": ["thought 1", "thought 2"]
}`;

    // For now, return sample questions
    // In production, this would call the AI service
    return [
      {
        id: '1',
        question: 'How does this topic reveal Christ\'s Lordship over this domain?',
        purpose: 'Connect learning to Christ-centered worldview',
        guidingThoughts: [
          'Consider how this knowledge reflects God\'s design',
          'Think about how Christ redeems this area'
        ]
      },
      {
        id: '2',
        question: 'How can you apply this learning to advance God\'s Kingdom?',
        purpose: 'Connect learning to kingdom governance calling',
        guidingThoughts: [
          'What systems or communities could you transform?',
          'How does this equip you for your calling?'
        ]
      },
      {
        id: '3',
        question: 'What character development is required to steward this knowledge well?',
        purpose: 'Encourage transformation and character formation',
        guidingThoughts: [
          'What virtues are needed?',
          'How must you grow spiritually?'
        ]
      }
    ];
  }

  private checkFaithLearningConnection(questions: ReflectionQuestion[]): boolean {
    // Check if questions connect faith and learning
    const faithTerms = ['faith', 'god', 'christ', 'jesus', 'lord', 'scripture', 'biblical', 'spiritual'];
    const learningTerms = ['learn', 'knowledge', 'understand', 'apply', 'skill', 'competence'];

    return questions.some(q => {
      const text = (q.question + ' ' + q.purpose).toLowerCase();
      const hasFaith = faithTerms.some(term => text.includes(term));
      const hasLearning = learningTerms.some(term => text.includes(term));
      return hasFaith && hasLearning;
    });
  }

  private checkKingdomGovernanceThemes(questions: ReflectionQuestion[]): boolean {
    // Check if questions address kingdom governance
    const governanceTerms = [
      'kingdom',
      'govern',
      'leadership',
      'steward',
      'transform',
      'calling',
      'dominion',
      'authority',
      'responsibility'
    ];

    return questions.some(q => {
      const text = (q.question + ' ' + q.purpose).toLowerCase();
      return governanceTerms.some(term => text.includes(term));
    });
  }

  private checkTransformationFocus(questions: ReflectionQuestion[]): boolean {
    // Check if questions encourage transformation
    const transformationTerms = [
      'transform',
      'change',
      'grow',
      'develop',
      'become',
      'character',
      'virtue',
      'formation',
      'maturity'
    ];

    return questions.some(q => {
      const text = (q.question + ' ' + q.purpose).toLowerCase();
      return transformationTerms.some(term => text.includes(term));
    });
  }

  private calculateQuestionQuality(
    questions: ReflectionQuestion[],
    connectsFaithAndLearning: boolean,
    addressesKingdomGovernance: boolean,
    encouragesTransformation: boolean
  ): number {
    let quality = 0;

    // Base score for having questions
    if (questions.length >= 3) quality += 40;
    else if (questions.length >= 1) quality += 20;

    // Bonus for faith-learning connection
    if (connectsFaithAndLearning) quality += 20;

    // Bonus for kingdom governance themes
    if (addressesKingdomGovernance) quality += 20;

    // Bonus for transformation focus
    if (encouragesTransformation) quality += 20;

    return Math.min(quality, 100);
  }
}
