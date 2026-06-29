/**
 * ScrollUniversity Spiritual Evaluation Service
 * "The Lord does not look at the things people look at. People look at the outward appearance, but the Lord looks at the heart" - 1 Samuel 16:7
 */

import { PrismaClient, EvaluatorType, MaturityLevel } from '@prisma/client';
import { logger } from '../utils/logger';
import { SpiritualEvaluationRequest, SpiritualEvaluationResult, CallingAssessment } from '../types/admissions.types';
import { AdmissionsAIService } from './AdmissionsAIService';

const prisma = new PrismaClient();

export class SpiritualEvaluationService {
  private admissionsAI: AdmissionsAIService;

  constructor() {
    this.admissionsAI = new AdmissionsAIService();
  }

  async evaluateSpiritual(request: SpiritualEvaluationRequest): Promise<SpiritualEvaluationResult> {
    try {
      logger.info(`Evaluating spiritual maturity for application ${request.applicationId}`);

      // Use AI to evaluate testimony
      const essayEvaluation = await this.admissionsAI.evaluateEssay({
        applicationId: request.applicationId,
        essayText: request.spiritualTestimony,
        essayType: 'SPIRITUAL_TESTIMONY'
      });

      // Assess calling clarity
      const callingClarity: CallingAssessment = {
        clarity: essayEvaluation.scrollAlignment.callingClarity,
        alignment: essayEvaluation.scrollAlignment.visionAlignment,
        confirmation: ['Personal testimony', 'Ministry experience'],
        development: ['Continued spiritual growth', 'Leadership development']
      };

      // Determine spiritual maturity level
      const spiritualMaturity = this.determineMaturityLevel(essayEvaluation.spiritualDepth.overallScore);

      const result: SpiritualEvaluationResult = {
        applicationId: request.applicationId,
        evaluatorType: EvaluatorType.AI_ASSESSMENT,
        spiritualMaturity,
        characterTraits: ['Faithful', 'Teachable', 'Servant-hearted'],
        callingClarity,
        scrollAlignment: essayEvaluation.scrollAlignment.overallScore,
        kingdomVision: 'Advancing God\'s kingdom through education and ministry',
        authenticityScore: essayEvaluation.authenticity.overallScore,
        clarityScore: essayEvaluation.writingQuality.clarity,
        depthScore: essayEvaluation.spiritualDepth.overallScore,
        transformationScore: essayEvaluation.spiritualDepth.transformation,
        kingdomFocusScore: essayEvaluation.scrollAlignment.kingdomFocus,
        overallScore: essayEvaluation.overallScore,
        spiritualRecommendations: essayEvaluation.strengths,
        evaluatedAt: new Date()
      };

      // Save to database
      await prisma.spiritualEvaluation.create({
        data: {
          applicationId: request.applicationId,
          evaluatorType: EvaluatorType.AI_ASSESSMENT,
          personalTestimony: JSON.stringify({ testimony: request.personalTestimony }),
          spiritualMaturity,
          characterTraits: JSON.stringify(result.characterTraits),
          callingClarity: JSON.stringify(callingClarity),
          scrollAlignment: result.scrollAlignment,
          kingdomVision: result.kingdomVision,
          authenticityScore: result.authenticityScore,
          clarityScore: result.clarityScore,
          depthScore: result.depthScore,
          transformationScore: result.transformationScore,
          kingdomFocusScore: result.kingdomFocusScore,
          overallScore: result.overallScore,
          spiritualRecommendations: JSON.stringify(result.spiritualRecommendations),
          evaluatedAt: new Date()
        }
      });

      logger.info(`Spiritual evaluation completed: ${request.applicationId} - Score: ${result.overallScore}`);
      return result;

    } catch (error) {
      logger.error('Error evaluating spiritual maturity:', error);
      throw new Error(`Failed to evaluate spiritual maturity: ${(error as Error).message}`);
    }
  }

  private determineMaturityLevel(score: number): MaturityLevel {
    if (score >= 90) return MaturityLevel.ELDER;
    if (score >= 75) return MaturityLevel.MATURE;
    if (score >= 60) return MaturityLevel.GROWING;
    if (score >= 40) return MaturityLevel.NEW_BELIEVER;
    return MaturityLevel.SEEKER;
  }
}

export default SpiritualEvaluationService;
