/**
 * ScrollUniversity Admissions Decision Processing Engine
 * "Many are called, but few are chosen" - Matthew 22:14
 * 
 * This service implements weighted scoring algorithms and decision logic
 * for comprehensive admission decisions based on all assessment components.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export interface WeightedScoreConfig {
  spiritualWeight: number;
  academicWeight: number;
  characterWeight: number;
  interviewWeight: number;
  eligibilityWeight: number;
}

export interface DecisionCriteria {
  minimumOverallScore: number;
  minimumSpiritualScore: number;
  minimumAcademicScore: number;
  minimumCharacterScore: number;
  minimumInterviewScore: number;
  requireAllAssessments: boolean;
}

export interface DecisionInput {
  applicationId: string;
  spiritualEvaluation?: any;
  academicEvaluation?: any;
  interviewResults?: any[];
  eligibilityResult?: any;
  overrideReason?: string;
}

export interface DecisionResult {
  decision: 'ACCEPTED' | 'REJECTED' | 'WAITLISTED' | 'CONDITIONAL_ACCEPTANCE';
  overallScore: number;
  componentScores: {
    spiritual: number;
    academic: number;
    character: number;
    interview: number;
    eligibility: number;
  };
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  reasoning: string;
  confidence: number;
}

export class DecisionProcessor {
  private defaultWeights: WeightedScoreConfig = {
    spiritualWeight: 0.35,
    academicWeight: 0.25,
    characterWeight: 0.20,
    interviewWeight: 0.15,
    eligibilityWeight: 0.05
  };

  private defaultCriteria: DecisionCriteria = {
    minimumOverallScore: 70.0,
    minimumSpiritualScore: 65.0,
    minimumAcademicScore: 60.0,
    minimumCharacterScore: 70.0,
    minimumInterviewScore: 65.0,
    requireAllAssessments: true
  };

  /**
   * Process admission decision using weighted scoring algorithm
   */
  async processDecision(
    input: DecisionInput,
    weights?: WeightedScoreConfig,
    criteria?: DecisionCriteria
  ): Promise<DecisionResult> {
    try {
      logger.info(`Processing admission decision for application: ${input.applicationId}`);

      const scoreWeights = weights || this.defaultWeights;
      const decisionCriteria = criteria || this.defaultCriteria;

      // Calculate component scores
      const componentScores = await this.calculateComponentScores(input);
      
      // Calculate weighted overall score
      const overallScore = this.calculateWeightedScore(componentScores, scoreWeights);
      
      // Generate decision based on scores and criteria
      const decision = this.determineDecision(componentScores, overallScore, decisionCriteria);
      
      // Generate reasoning and recommendations
      const analysis = this.generateDecisionAnalysis(componentScores, overallScore, decision, input);

      const result: DecisionResult = {
        decision,
        overallScore,
        componentScores,
        strengths: analysis.strengths,
        concerns: analysis.concerns,
        recommendations: analysis.recommendations,
        reasoning: analysis.reasoning,
        confidence: analysis.confidence
      };

      logger.info(`Decision processed: ${decision} with score ${overallScore.toFixed(2)}`);
      return result;

    } catch (error) {
      logger.error('Error processing admission decision:', error);
      throw new Error(`Decision processing failed: ${error.message}`);
    }
  }

  /**
   * Calculate individual component scores from assessment data
   */
  private async calculateComponentScores(input: DecisionInput) {
    const scores = {
      spiritual: 0,
      academic: 0,
      character: 0,
      interview: 0,
      eligibility: 0
    };

    // Calculate spiritual score
    if (input.spiritualEvaluation) {
      scores.spiritual = this.calculateSpiritualScore(input.spiritualEvaluation);
    }

    // Calculate academic score
    if (input.academicEvaluation) {
      scores.academic = this.calculateAcademicScore(input.academicEvaluation);
    }

    // Calculate character score (from spiritual evaluation and interviews)
    scores.character = this.calculateCharacterScore(input.spiritualEvaluation, input.interviewResults);

    // Calculate interview score
    if (input.interviewResults && input.interviewResults.length > 0) {
      scores.interview = this.calculateInterviewScore(input.interviewResults);
    }

    // Calculate eligibility score
    if (input.eligibilityResult) {
      scores.eligibility = this.calculateEligibilityScore(input.eligibilityResult);
    }

    return scores;
  }

  /**
   * Calculate spiritual maturity and alignment score
   */
  private calculateSpiritualScore(spiritualEvaluation: any): number {
    const {
      overallScore = 0,
      scrollAlignment = 0,
      authenticityScore = 0,
      clarityScore = 0,
      depthScore = 0,
      transformationScore = 0,
      kingdomFocusScore = 0
    } = spiritualEvaluation;

    // Weighted combination of spiritual metrics
    const spiritualScore = (
      (overallScore * 0.3) +
      (scrollAlignment * 10 * 0.25) + // Convert 0-10 scale to 0-100
      (authenticityScore * 0.15) +
      (clarityScore * 0.1) +
      (depthScore * 0.1) +
      (transformationScore * 0.05) +
      (kingdomFocusScore * 0.05)
    );

    return Math.min(100, Math.max(0, spiritualScore));
  }

  /**
   * Calculate academic readiness and potential score
   */
  private calculateAcademicScore(academicEvaluation: any): number {
    const {
      academicReadiness = 0,
      learningPotential = 0,
      potentialScore = 0,
      skillProficiency = {}
    } = academicEvaluation;

    // Calculate average skill proficiency
    const skillScores = Object.values(skillProficiency) as number[];
    const avgSkillScore = skillScores.length > 0 
      ? skillScores.reduce((sum, score) => sum + score, 0) / skillScores.length 
      : 0;

    // Weighted combination of academic metrics
    const academicScore = (
      (academicReadiness * 0.4) +
      (learningPotential * 10 * 0.3) + // Convert 0-10 scale to 0-100
      (potentialScore * 0.2) +
      (avgSkillScore * 0.1)
    );

    return Math.min(100, Math.max(0, academicScore));
  }

  /**
   * Calculate character and integrity score
   */
  private calculateCharacterScore(spiritualEvaluation: any, interviewResults: any[]): number {
    let characterScore = 0;
    let weightSum = 0;

    // Character traits from spiritual evaluation
    if (spiritualEvaluation?.characterTraits) {
      const traits = spiritualEvaluation.characterTraits;
      const traitScores = traits.map((trait: any) => trait.score || 0);
      const avgTraitScore = traitScores.length > 0 
        ? traitScores.reduce((sum: number, score: number) => sum + score, 0) / traitScores.length 
        : 0;
      
      characterScore += avgTraitScore * 0.6;
      weightSum += 0.6;
    }

    // Character assessment from interviews
    if (interviewResults && interviewResults.length > 0) {
      const characterScores = interviewResults
        .map(interview => interview.characterScore || 0)
        .filter(score => score > 0);
      
      if (characterScores.length > 0) {
        const avgCharacterScore = characterScores.reduce((sum, score) => sum + score, 0) / characterScores.length;
        characterScore += avgCharacterScore * 0.4;
        weightSum += 0.4;
      }
    }

    return weightSum > 0 ? characterScore / weightSum * 100 : 0;
  }

  /**
   * Calculate interview performance score
   */
  private calculateInterviewScore(interviewResults: any[]): number {
    if (!interviewResults || interviewResults.length === 0) return 0;

    const validInterviews = interviewResults.filter(interview => 
      interview.status === 'COMPLETED' && interview.overallRecommendation
    );

    if (validInterviews.length === 0) return 0;

    // Convert recommendation to numeric score
    const recommendationScores = validInterviews.map(interview => {
      switch (interview.overallRecommendation) {
        case 'STRONG_RECOMMEND': return 95;
        case 'RECOMMEND': return 80;
        case 'NEUTRAL': return 60;
        case 'NOT_RECOMMEND': return 40;
        case 'STRONG_NOT_RECOMMEND': return 20;
        default: return 50;
      }
    });

    // Calculate weighted average of all interview scores
    const totalScore = validInterviews.reduce((sum, interview, index) => {
      const baseScore = recommendationScores[index];
      const communicationScore = interview.communicationScore || 0;
      const spiritualScore = interview.spiritualMaturityScore || 0;
      const academicScore = interview.academicReadinessScore || 0;
      const motivationScore = interview.motivationScore || 0;
      const culturalFitScore = interview.culturalFitScore || 0;

      // Weighted combination of interview components
      const interviewScore = (
        (baseScore * 0.3) +
        (communicationScore * 0.2) +
        (spiritualScore * 0.2) +
        (academicScore * 0.15) +
        (motivationScore * 0.1) +
        (culturalFitScore * 0.05)
      );

      return sum + interviewScore;
    }, 0);

    return totalScore / validInterviews.length;
  }

  /**
   * Calculate eligibility compliance score
   */
  private calculateEligibilityScore(eligibilityResult: any): number {
    const { overallEligibility } = eligibilityResult;

    switch (overallEligibility) {
      case 'ELIGIBLE': return 100;
      case 'CONDITIONALLY_ELIGIBLE': return 75;
      case 'PENDING_REVIEW': return 50;
      case 'INELIGIBLE': return 0;
      default: return 50;
    }
  }

  /**
   * Calculate weighted overall score
   */
  private calculateWeightedScore(
    componentScores: any,
    weights: WeightedScoreConfig
  ): number {
    const weightedScore = (
      (componentScores.spiritual * weights.spiritualWeight) +
      (componentScores.academic * weights.academicWeight) +
      (componentScores.character * weights.characterWeight) +
      (componentScores.interview * weights.interviewWeight) +
      (componentScores.eligibility * weights.eligibilityWeight)
    );

    return Math.min(100, Math.max(0, weightedScore));
  }

  /**
   * Determine final admission decision based on scores and criteria
   */
  private determineDecision(
    componentScores: any,
    overallScore: number,
    criteria: DecisionCriteria
  ): 'ACCEPTED' | 'REJECTED' | 'WAITLISTED' | 'CONDITIONAL_ACCEPTANCE' {
    
    // Check minimum thresholds
    const meetsMinimums = (
      overallScore >= criteria.minimumOverallScore &&
      componentScores.spiritual >= criteria.minimumSpiritualScore &&
      componentScores.academic >= criteria.minimumAcademicScore &&
      componentScores.character >= criteria.minimumCharacterScore &&
      componentScores.interview >= criteria.minimumInterviewScore
    );

    // Strong candidates (high scores across all areas)
    if (meetsMinimums && overallScore >= 85) {
      return 'ACCEPTED';
    }

    // Good candidates with minor concerns
    if (meetsMinimums && overallScore >= 75) {
      // Check for any significantly low component scores
      const hasLowComponent = Object.values(componentScores).some(score => score < 60);
      return hasLowComponent ? 'CONDITIONAL_ACCEPTANCE' : 'ACCEPTED';
    }

    // Borderline candidates
    if (overallScore >= 65 && componentScores.spiritual >= 70) {
      return 'WAITLISTED';
    }

    // Below threshold
    return 'REJECTED';
  }

  /**
   * Generate detailed decision analysis and recommendations
   */
  private generateDecisionAnalysis(
    componentScores: any,
    overallScore: number,
    decision: string,
    input: DecisionInput
  ) {
    const strengths: string[] = [];
    const concerns: string[] = [];
    const recommendations: string[] = [];

    // Analyze strengths
    if (componentScores.spiritual >= 80) {
      strengths.push('Strong spiritual maturity and scroll alignment');
    }
    if (componentScores.academic >= 80) {
      strengths.push('Excellent academic readiness and learning potential');
    }
    if (componentScores.character >= 80) {
      strengths.push('Outstanding character and integrity demonstration');
    }
    if (componentScores.interview >= 80) {
      strengths.push('Impressive interview performance and communication skills');
    }

    // Analyze concerns
    if (componentScores.spiritual < 60) {
      concerns.push('Spiritual maturity and alignment need development');
    }
    if (componentScores.academic < 60) {
      concerns.push('Academic preparation may require additional support');
    }
    if (componentScores.character < 60) {
      concerns.push('Character development areas identified for growth');
    }
    if (componentScores.interview < 60) {
      concerns.push('Interview performance indicates communication or readiness concerns');
    }

    // Generate recommendations based on decision
    switch (decision) {
      case 'ACCEPTED':
        recommendations.push('Proceed with enrollment confirmation');
        recommendations.push('Assign appropriate ScrollMentor for guidance');
        if (componentScores.academic < 75) {
          recommendations.push('Consider academic support resources');
        }
        break;

      case 'CONDITIONAL_ACCEPTANCE':
        recommendations.push('Acceptance contingent on addressing identified concerns');
        if (componentScores.spiritual < 70) {
          recommendations.push('Complete spiritual formation preparation program');
        }
        if (componentScores.academic < 70) {
          recommendations.push('Complete academic readiness bridge courses');
        }
        break;

      case 'WAITLISTED':
        recommendations.push('Place on waitlist with priority based on spiritual alignment');
        recommendations.push('Encourage continued spiritual and academic development');
        recommendations.push('Re-evaluate if additional spots become available');
        break;

      case 'REJECTED':
        recommendations.push('Encourage reapplication after addressing development areas');
        if (componentScores.spiritual < 60) {
          recommendations.push('Focus on spiritual formation and scroll alignment');
        }
        if (componentScores.academic < 60) {
          recommendations.push('Pursue additional academic preparation');
        }
        break;
    }

    // Generate reasoning narrative
    const reasoning = this.generateReasoningNarrative(componentScores, overallScore, decision, strengths, concerns);

    // Calculate confidence based on data completeness and score consistency
    const confidence = this.calculateDecisionConfidence(componentScores, input);

    return {
      strengths,
      concerns,
      recommendations,
      reasoning,
      confidence
    };
  }

  /**
   * Generate narrative reasoning for the decision
   */
  private generateReasoningNarrative(
    componentScores: any,
    overallScore: number,
    decision: string,
    strengths: string[],
    concerns: string[]
  ): string {
    let reasoning = `Based on comprehensive assessment, the applicant achieved an overall score of ${overallScore.toFixed(1)}/100. `;

    reasoning += `Component scores: Spiritual (${componentScores.spiritual.toFixed(1)}), `;
    reasoning += `Academic (${componentScores.academic.toFixed(1)}), `;
    reasoning += `Character (${componentScores.character.toFixed(1)}), `;
    reasoning += `Interview (${componentScores.interview.toFixed(1)}), `;
    reasoning += `Eligibility (${componentScores.eligibility.toFixed(1)}). `;

    if (strengths.length > 0) {
      reasoning += `Key strengths include: ${strengths.join(', ')}. `;
    }

    if (concerns.length > 0) {
      reasoning += `Areas of concern: ${concerns.join(', ')}. `;
    }

    switch (decision) {
      case 'ACCEPTED':
        reasoning += 'The applicant demonstrates strong alignment with ScrollUniversity values and readiness for scroll-aligned education.';
        break;
      case 'CONDITIONAL_ACCEPTANCE':
        reasoning += 'While showing promise, specific conditions must be met to ensure success in the program.';
        break;
      case 'WAITLISTED':
        reasoning += 'The applicant shows potential but falls short of current admission standards. Continued development is encouraged.';
        break;
      case 'REJECTED':
        reasoning += 'The applicant does not currently meet the standards for admission but is encouraged to reapply after addressing development areas.';
        break;
    }

    return reasoning;
  }

  /**
   * Calculate confidence level in the decision
   */
  private calculateDecisionConfidence(componentScores: any, input: DecisionInput): number {
    let confidence = 100;

    // Reduce confidence for missing assessments
    if (!input.spiritualEvaluation) confidence -= 20;
    if (!input.academicEvaluation) confidence -= 15;
    if (!input.interviewResults || input.interviewResults.length === 0) confidence -= 15;
    if (!input.eligibilityResult) confidence -= 10;

    // Reduce confidence for inconsistent scores
    const scores = Object.values(componentScores) as number[];
    const scoreVariance = this.calculateVariance(scores);
    if (scoreVariance > 400) confidence -= 10; // High variance indicates inconsistency

    // Reduce confidence for borderline scores
    const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    if (overallScore >= 65 && overallScore <= 75) confidence -= 5; // Borderline range

    return Math.max(50, confidence); // Minimum 50% confidence
  }

  /**
   * Calculate variance of an array of numbers
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  /**
   * Get decision configuration from database
   */
  async getDecisionConfiguration(): Promise<{ weights: WeightedScoreConfig; criteria: DecisionCriteria }> {
    try {
      const configs = await prisma.admissions_configuration.findMany({
        where: {
          category: 'DECISION_PARAMETERS',
          isActive: true
        }
      });

      let weights = this.defaultWeights;
      let criteria = this.defaultCriteria;

      configs.forEach(config => {
        if (config.configKey === 'scoring_weights') {
          weights = { ...weights, ...config.configValue };
        } else if (config.configKey === 'decision_criteria') {
          criteria = { ...criteria, ...config.configValue };
        }
      });

      return { weights, criteria };
    } catch (error) {
      logger.warn('Failed to load decision configuration, using defaults:', error);
      return { weights: this.defaultWeights, criteria: this.defaultCriteria };
    }
  }
}

export default DecisionProcessor;