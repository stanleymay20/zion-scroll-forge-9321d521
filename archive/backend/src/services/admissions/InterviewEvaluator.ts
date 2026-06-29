/**
 * InterviewEvaluator - Builds interview evaluation form and scoring system
 * "By their fruits you will recognize them" (Matthew 7:16)
 */

import { PrismaClient } from '@prisma/client';
import { InterviewType, InterviewFormat, RecommendationType } from '@prisma/client';

const prisma = new PrismaClient();

export interface InterviewEvaluation {
  interviewId: string;
  evaluatorId: string;
  evaluatorName: string;
  scores: EvaluationScores;
  observations: EvaluationObservations;
  recommendation: InterviewRecommendation;
  followUpActions: FollowUpAction[];
  completedAt: Date;
}

export interface EvaluationScores {
  communication: number; // 1-10
  spiritualMaturity: number; // 1-10
  academicReadiness: number; // 1-10
  characterAssessment: number; // 1-10
  motivationLevel: number; // 1-10
  culturalFit: number; // 1-10
  overallScore: number; // Calculated weighted average
}

export interface EvaluationObservations {
  strengths: string[];
  concerns: string[];
  notableQuotes: string[];
  behavioralObservations: string[];
  spiritualInsights: string[];
  academicCapabilities: string[];
}

export interface InterviewRecommendation {
  type: RecommendationType;
  confidence: number; // 1-10
  reasoning: string;
  conditions: string[];
  nextSteps: string[];
}

export interface FollowUpAction {
  action: FollowUpActionType;
  description: string;
  assignedTo?: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
}

export enum FollowUpActionType {
  ADDITIONAL_INTERVIEW = 'additional_interview',
  REFERENCE_CHECK = 'reference_check',
  DOCUMENT_VERIFICATION = 'document_verification',
  SPIRITUAL_COUNSELING = 'spiritual_counseling',
  ACADEMIC_ASSESSMENT = 'academic_assessment',
  COMMITTEE_REVIEW = 'committee_review'
}

export interface EvaluationCriteria {
  interviewType: InterviewType;
  weightings: ScoreWeightings;
  rubrics: EvaluationRubrics;
  requiredElements: string[];
}

export interface ScoreWeightings {
  communication: number;
  spiritualMaturity: number;
  academicReadiness: number;
  characterAssessment: number;
  motivationLevel: number;
  culturalFit: number;
}

export interface EvaluationRubrics {
  communication: RubricLevel[];
  spiritualMaturity: RubricLevel[];
  academicReadiness: RubricLevel[];
  characterAssessment: RubricLevel[];
  motivationLevel: RubricLevel[];
  culturalFit: RubricLevel[];
}

export interface RubricLevel {
  score: number;
  description: string;
  indicators: string[];
}

export class InterviewEvaluator {
  /**
   * Create evaluation form for specific interview type
   */
  async createEvaluationForm(interviewType: InterviewType): Promise<EvaluationCriteria> {
    try {
      const criteria = this.getEvaluationCriteria(interviewType);
      console.log(`Created evaluation form for ${interviewType}`);
      return criteria;
    } catch (error) {
      console.error('Error creating evaluation form:', error);
      throw new Error(`Failed to create evaluation form: ${error.message}`);
    }
  }

  /**
   * Submit interview evaluation
   */
  async submitEvaluation(evaluation: InterviewEvaluation): Promise<void> {
    try {
      // Validate evaluation completeness
      this.validateEvaluation(evaluation);

      // Calculate overall score
      const overallScore = this.calculateOverallScore(evaluation.scores, evaluation.interviewId);

      // Update interview record with evaluation
      await prisma.interviewRecord.update({
        where: { id: evaluation.interviewId },
        data: {
          communicationScore: evaluation.scores.communication,
          spiritualMaturityScore: evaluation.scores.spiritualMaturity,
          academicReadinessScore: evaluation.scores.academicReadiness,
          characterScore: evaluation.scores.characterAssessment,
          motivationScore: evaluation.scores.motivationLevel,
          culturalFitScore: evaluation.scores.culturalFit,
          overallRecommendation: evaluation.recommendation.type,
          interviewNotes: this.formatEvaluationNotes(evaluation),
          conductedAt: evaluation.completedAt,
          status: 'COMPLETED',
          updatedAt: new Date()
        }
      });

      // Create follow-up actions
      await this.createFollowUpActions(evaluation.interviewId, evaluation.followUpActions);

      // Notify relevant parties
      await this.sendEvaluationNotifications(evaluation);

      console.log(`Evaluation submitted for interview ${evaluation.interviewId}`);
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      throw new Error(`Failed to submit evaluation: ${error.message}`);
    }
  }

  /**
   * Get evaluation criteria for interview type
   */
  private getEvaluationCriteria(interviewType: InterviewType): EvaluationCriteria {
    const baseWeightings = {
      communication: 0.15,
      spiritualMaturity: 0.25,
      academicReadiness: 0.20,
      characterAssessment: 0.20,
      motivationLevel: 0.10,
      culturalFit: 0.10
    };

    // Adjust weightings based on interview type
    const weightings = this.adjustWeightingsForType(baseWeightings, interviewType);
    const rubrics = this.getEvaluationRubrics();
    const requiredElements = this.getRequiredElements(interviewType);

    return {
      interviewType,
      weightings,
      rubrics,
      requiredElements
    };
  }

  /**
   * Adjust score weightings based on interview type
   */
  private adjustWeightingsForType(
    baseWeightings: ScoreWeightings,
    interviewType: InterviewType
  ): ScoreWeightings {
    const adjustments = {
      [InterviewType.INITIAL_SCREENING]: {
        communication: 0.20,
        spiritualMaturity: 0.15,
        academicReadiness: 0.15,
        characterAssessment: 0.15,
        motivationLevel: 0.20,
        culturalFit: 0.15
      },
      [InterviewType.ACADEMIC_ASSESSMENT]: {
        communication: 0.10,
        spiritualMaturity: 0.10,
        academicReadiness: 0.40,
        characterAssessment: 0.15,
        motivationLevel: 0.15,
        culturalFit: 0.10
      },
      [InterviewType.SPIRITUAL_EVALUATION]: {
        communication: 0.10,
        spiritualMaturity: 0.40,
        academicReadiness: 0.10,
        characterAssessment: 0.25,
        motivationLevel: 0.10,
        culturalFit: 0.05
      },
      [InterviewType.CHARACTER_INTERVIEW]: {
        communication: 0.15,
        spiritualMaturity: 0.20,
        academicReadiness: 0.10,
        characterAssessment: 0.35,
        motivationLevel: 0.15,
        culturalFit: 0.05
      },
      [InterviewType.FINAL_INTERVIEW]: {
        communication: 0.15,
        spiritualMaturity: 0.25,
        academicReadiness: 0.20,
        characterAssessment: 0.20,
        motivationLevel: 0.15,
        culturalFit: 0.05
      },
      [InterviewType.COMMITTEE_INTERVIEW]: {
        communication: 0.20,
        spiritualMaturity: 0.25,
        academicReadiness: 0.20,
        characterAssessment: 0.20,
        motivationLevel: 0.10,
        culturalFit: 0.05
      }
    };

    return adjustments[interviewType] || baseWeightings;
  }

  /**
   * Get evaluation rubrics for all criteria
   */
  private getEvaluationRubrics(): EvaluationRubrics {
    return {
      communication: [
        {
          score: 10,
          description: 'Exceptional Communication',
          indicators: [
            'Articulates thoughts clearly and eloquently',
            'Demonstrates active listening skills',
            'Responds thoughtfully to questions',
            'Shows excellent verbal and non-verbal communication'
          ]
        },
        {
          score: 8,
          description: 'Strong Communication',
          indicators: [
            'Communicates clearly most of the time',
            'Good listening skills',
            'Generally thoughtful responses',
            'Minor communication issues'
          ]
        },
        {
          score: 6,
          description: 'Adequate Communication',
          indicators: [
            'Basic communication skills present',
            'Some difficulty expressing complex ideas',
            'Occasional misunderstandings',
            'Needs prompting for detailed responses'
          ]
        },
        {
          score: 4,
          description: 'Below Average Communication',
          indicators: [
            'Difficulty expressing thoughts clearly',
            'Limited listening skills',
            'Frequent misunderstandings',
            'Requires significant prompting'
          ]
        },
        {
          score: 2,
          description: 'Poor Communication',
          indicators: [
            'Significant communication barriers',
            'Difficulty understanding questions',
            'Very limited verbal expression',
            'Major language or communication issues'
          ]
        }
      ],
      spiritualMaturity: [
        {
          score: 10,
          description: 'Exceptional Spiritual Maturity',
          indicators: [
            'Deep understanding of faith and calling',
            'Evidence of spiritual disciplines',
            'Demonstrates spiritual fruit consistently',
            'Shows wisdom beyond years',
            'Clear testimony of transformation'
          ]
        },
        {
          score: 8,
          description: 'Strong Spiritual Foundation',
          indicators: [
            'Good understanding of faith',
            'Regular spiritual practices',
            'Evidence of spiritual growth',
            'Clear testimony',
            'Some spiritual fruit evident'
          ]
        },
        {
          score: 6,
          description: 'Developing Spiritually',
          indicators: [
            'Basic understanding of faith',
            'Inconsistent spiritual practices',
            'Some evidence of growth',
            'Testimony present but unclear',
            'Limited spiritual fruit'
          ]
        },
        {
          score: 4,
          description: 'Spiritually Immature',
          indicators: [
            'Limited understanding of faith',
            'Minimal spiritual practices',
            'Little evidence of growth',
            'Unclear or weak testimony',
            'No clear spiritual fruit'
          ]
        },
        {
          score: 2,
          description: 'Spiritually Concerning',
          indicators: [
            'Very limited faith understanding',
            'No spiritual practices',
            'No evidence of spiritual life',
            'No clear testimony',
            'Concerning spiritual indicators'
          ]
        }
      ],
      academicReadiness: [
        {
          score: 10,
          description: 'Exceptionally Prepared',
          indicators: [
            'Strong academic background',
            'Excellent critical thinking skills',
            'Self-directed learning ability',
            'Research and writing skills evident',
            'Ready for advanced coursework'
          ]
        },
        {
          score: 8,
          description: 'Well Prepared',
          indicators: [
            'Good academic foundation',
            'Solid critical thinking',
            'Some independent learning',
            'Basic research skills',
            'Ready for standard coursework'
          ]
        },
        {
          score: 6,
          description: 'Adequately Prepared',
          indicators: [
            'Basic academic skills',
            'Limited critical thinking',
            'Needs guidance for learning',
            'Minimal research experience',
            'May need academic support'
          ]
        },
        {
          score: 4,
          description: 'Underprepared',
          indicators: [
            'Weak academic foundation',
            'Poor critical thinking',
            'Requires significant guidance',
            'No research experience',
            'Needs remedial support'
          ]
        },
        {
          score: 2,
          description: 'Significantly Underprepared',
          indicators: [
            'Very weak academic skills',
            'No critical thinking evident',
            'Cannot work independently',
            'Major academic deficiencies',
            'Not ready for higher education'
          ]
        }
      ],
      characterAssessment: [
        {
          score: 10,
          description: 'Exceptional Character',
          indicators: [
            'Demonstrates integrity consistently',
            'Shows humility and teachability',
            'Evidence of servant leadership',
            'Strong moral foundation',
            'Positive influence on others'
          ]
        },
        {
          score: 8,
          description: 'Strong Character',
          indicators: [
            'Generally demonstrates integrity',
            'Shows humility most of the time',
            'Some leadership qualities',
            'Good moral foundation',
            'Generally positive influence'
          ]
        },
        {
          score: 6,
          description: 'Developing Character',
          indicators: [
            'Basic integrity present',
            'Learning humility',
            'Limited leadership experience',
            'Developing moral foundation',
            'Mixed influence on others'
          ]
        },
        {
          score: 4,
          description: 'Character Concerns',
          indicators: [
            'Inconsistent integrity',
            'Pride or arrogance evident',
            'No leadership qualities',
            'Weak moral foundation',
            'Potentially negative influence'
          ]
        },
        {
          score: 2,
          description: 'Significant Character Issues',
          indicators: [
            'Lack of integrity',
            'Significant pride issues',
            'Destructive tendencies',
            'Poor moral foundation',
            'Negative influence on others'
          ]
        }
      ],
      motivationLevel: [
        {
          score: 10,
          description: 'Highly Motivated',
          indicators: [
            'Clear passion for learning',
            'Strong commitment to goals',
            'Self-motivated and driven',
            'Overcomes obstacles well',
            'Inspires others'
          ]
        },
        {
          score: 8,
          description: 'Well Motivated',
          indicators: [
            'Good passion for learning',
            'Committed to goals',
            'Generally self-motivated',
            'Handles obstacles adequately',
            'Positive attitude'
          ]
        },
        {
          score: 6,
          description: 'Moderately Motivated',
          indicators: [
            'Some interest in learning',
            'Basic commitment',
            'Needs external motivation',
            'Struggles with obstacles',
            'Neutral attitude'
          ]
        },
        {
          score: 4,
          description: 'Low Motivation',
          indicators: [
            'Limited interest in learning',
            'Weak commitment',
            'Requires constant motivation',
            'Gives up easily',
            'Negative attitude'
          ]
        },
        {
          score: 2,
          description: 'Very Low Motivation',
          indicators: [
            'No clear interest in learning',
            'No commitment evident',
            'Cannot be motivated',
            'Avoids challenges',
            'Very negative attitude'
          ]
        }
      ],
      culturalFit: [
        {
          score: 10,
          description: 'Excellent Cultural Fit',
          indicators: [
            'Aligns perfectly with university values',
            'Embraces kingdom culture',
            'Contributes positively to community',
            'Respects diversity',
            'Models Christian character'
          ]
        },
        {
          score: 8,
          description: 'Good Cultural Fit',
          indicators: [
            'Generally aligns with values',
            'Understands kingdom culture',
            'Positive community member',
            'Accepts diversity',
            'Shows Christian character'
          ]
        },
        {
          score: 6,
          description: 'Adequate Cultural Fit',
          indicators: [
            'Basic alignment with values',
            'Learning kingdom culture',
            'Neutral community impact',
            'Tolerates diversity',
            'Developing Christian character'
          ]
        },
        {
          score: 4,
          description: 'Poor Cultural Fit',
          indicators: [
            'Limited alignment with values',
            'Resists kingdom culture',
            'Potentially disruptive',
            'Struggles with diversity',
            'Inconsistent Christian character'
          ]
        },
        {
          score: 2,
          description: 'Very Poor Cultural Fit',
          indicators: [
            'No alignment with values',
            'Opposes kingdom culture',
            'Disruptive to community',
            'Rejects diversity',
            'No evidence of Christian character'
          ]
        }
      ]
    };
  }

  /**
   * Get required elements for interview type
   */
  private getRequiredElements(interviewType: InterviewType): string[] {
    const baseElements = [
      'Opening prayer',
      'Personal testimony',
      'Calling discussion',
      'Academic background review',
      'Character assessment',
      'Closing prayer'
    ];

    const typeSpecificElements = {
      [InterviewType.INITIAL_SCREENING]: [
        'Basic eligibility verification',
        'Program interest assessment',
        'Initial spiritual assessment'
      ],
      [InterviewType.ACADEMIC_ASSESSMENT]: [
        'Academic transcript review',
        'Critical thinking evaluation',
        'Writing sample discussion',
        'Research experience assessment'
      ],
      [InterviewType.SPIRITUAL_EVALUATION]: [
        'Detailed testimony sharing',
        'Spiritual disciplines discussion',
        'Ministry experience review',
        'Prophetic input consideration'
      ],
      [InterviewType.CHARACTER_INTERVIEW]: [
        'Character reference discussion',
        'Integrity examples',
        'Leadership experience review',
        'Conflict resolution scenarios'
      ],
      [InterviewType.FINAL_INTERVIEW]: [
        'Comprehensive review',
        'Future vision discussion',
        'Commitment assessment',
        'Final questions and concerns'
      ],
      [InterviewType.COMMITTEE_INTERVIEW]: [
        'Panel introductions',
        'Comprehensive assessment',
        'Multiple perspective evaluation',
        'Committee deliberation'
      ]
    };

    return [...baseElements, ...(typeSpecificElements[interviewType] || [])];
  }

  /**
   * Calculate overall score based on weightings
   */
  private calculateOverallScore(scores: EvaluationScores, interviewId: string): number {
    // Get interview type to determine weightings
    // For now, use default weightings
    const weightings = {
      communication: 0.15,
      spiritualMaturity: 0.25,
      academicReadiness: 0.20,
      characterAssessment: 0.20,
      motivationLevel: 0.10,
      culturalFit: 0.10
    };

    const overallScore = 
      scores.communication * weightings.communication +
      scores.spiritualMaturity * weightings.spiritualMaturity +
      scores.academicReadiness * weightings.academicReadiness +
      scores.characterAssessment * weightings.characterAssessment +
      scores.motivationLevel * weightings.motivationLevel +
      scores.culturalFit * weightings.culturalFit;

    return Math.round(overallScore * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Validate evaluation completeness
   */
  private validateEvaluation(evaluation: InterviewEvaluation): void {
    if (!evaluation.interviewId) {
      throw new Error('Interview ID is required');
    }

    if (!evaluation.evaluatorId) {
      throw new Error('Evaluator ID is required');
    }

    // Validate all scores are present and within range
    const scores = evaluation.scores;
    const scoreFields = [
      'communication', 'spiritualMaturity', 'academicReadiness',
      'characterAssessment', 'motivationLevel', 'culturalFit'
    ];

    for (const field of scoreFields) {
      const score = scores[field as keyof EvaluationScores];
      if (score === undefined || score === null) {
        throw new Error(`${field} score is required`);
      }
      if (score < 1 || score > 10) {
        throw new Error(`${field} score must be between 1 and 10`);
      }
    }

    if (!evaluation.recommendation.type) {
      throw new Error('Recommendation type is required');
    }

    if (!evaluation.recommendation.reasoning) {
      throw new Error('Recommendation reasoning is required');
    }
  }

  /**
   * Format evaluation notes for storage
   */
  private formatEvaluationNotes(evaluation: InterviewEvaluation): string {
    const notes = [];

    notes.push('=== INTERVIEW EVALUATION ===');
    notes.push(`Evaluator: ${evaluation.evaluatorName}`);
    notes.push(`Completed: ${evaluation.completedAt.toISOString()}`);
    notes.push('');

    notes.push('SCORES:');
    notes.push(`Communication: ${evaluation.scores.communication}/10`);
    notes.push(`Spiritual Maturity: ${evaluation.scores.spiritualMaturity}/10`);
    notes.push(`Academic Readiness: ${evaluation.scores.academicReadiness}/10`);
    notes.push(`Character Assessment: ${evaluation.scores.characterAssessment}/10`);
    notes.push(`Motivation Level: ${evaluation.scores.motivationLevel}/10`);
    notes.push(`Cultural Fit: ${evaluation.scores.culturalFit}/10`);
    notes.push(`Overall Score: ${evaluation.scores.overallScore}/10`);
    notes.push('');

    if (evaluation.observations.strengths.length > 0) {
      notes.push('STRENGTHS:');
      evaluation.observations.strengths.forEach(strength => {
        notes.push(`- ${strength}`);
      });
      notes.push('');
    }

    if (evaluation.observations.concerns.length > 0) {
      notes.push('CONCERNS:');
      evaluation.observations.concerns.forEach(concern => {
        notes.push(`- ${concern}`);
      });
      notes.push('');
    }

    if (evaluation.observations.notableQuotes.length > 0) {
      notes.push('NOTABLE QUOTES:');
      evaluation.observations.notableQuotes.forEach(quote => {
        notes.push(`"${quote}"`);
      });
      notes.push('');
    }

    notes.push('RECOMMENDATION:');
    notes.push(`Type: ${evaluation.recommendation.type}`);
    notes.push(`Confidence: ${evaluation.recommendation.confidence}/10`);
    notes.push(`Reasoning: ${evaluation.recommendation.reasoning}`);

    if (evaluation.recommendation.conditions.length > 0) {
      notes.push('Conditions:');
      evaluation.recommendation.conditions.forEach(condition => {
        notes.push(`- ${condition}`);
      });
    }

    if (evaluation.followUpActions.length > 0) {
      notes.push('');
      notes.push('FOLLOW-UP ACTIONS:');
      evaluation.followUpActions.forEach(action => {
        notes.push(`- ${action.action}: ${action.description} (Priority: ${action.priority})`);
      });
    }

    return notes.join('\n');
  }

  /**
   * Create follow-up actions
   */
  private async createFollowUpActions(
    interviewId: string,
    actions: FollowUpAction[]
  ): Promise<void> {
    // In a real implementation, this would create records in a follow-up actions table
    for (const action of actions) {
      console.log(`Creating follow-up action for interview ${interviewId}: ${action.action} - ${action.description}`);
    }
  }

  /**
   * Send evaluation notifications
   */
  private async sendEvaluationNotifications(evaluation: InterviewEvaluation): Promise<void> {
    console.log(`Sending evaluation notifications for interview ${evaluation.interviewId}`);
    
    // Notify admissions committee
    console.log('Notifying admissions committee of completed evaluation');
    
    // Notify applicant (if appropriate)
    if (evaluation.recommendation.type === RecommendationType.STRONG_RECOMMEND ||
        evaluation.recommendation.type === RecommendationType.RECOMMEND) {
      console.log('Sending positive feedback to applicant');
    }
  }

  /**
   * Get evaluation summary for interview
   */
  async getEvaluationSummary(interviewId: string): Promise<any> {
    try {
      const interview = await prisma.interviewRecord.findUnique({
        where: { id: interviewId },
        select: {
          communicationScore: true,
          spiritualMaturityScore: true,
          academicReadinessScore: true,
          characterScore: true,
          motivationScore: true,
          culturalFitScore: true,
          overallRecommendation: true,
          interviewNotes: true,
          conductedAt: true
        }
      });

      if (!interview) {
        throw new Error('Interview not found');
      }

      return {
        scores: {
          communication: interview.communicationScore,
          spiritualMaturity: interview.spiritualMaturityScore,
          academicReadiness: interview.academicReadinessScore,
          characterAssessment: interview.characterScore,
          motivationLevel: interview.motivationScore,
          culturalFit: interview.culturalFitScore
        },
        recommendation: interview.overallRecommendation,
        notes: interview.interviewNotes,
        completedAt: interview.conductedAt
      };
    } catch (error) {
      console.error('Error getting evaluation summary:', error);
      throw new Error(`Failed to get evaluation summary: ${error.message}`);
    }
  }

  /**
   * Generate evaluation report
   */
  async generateEvaluationReport(applicationId: string): Promise<any> {
    try {
      const interviews = await prisma.interviewRecord.findMany({
        where: { applicationId },
        orderBy: { scheduledDate: 'asc' }
      });

      const report = {
        applicationId,
        totalInterviews: interviews.length,
        completedInterviews: interviews.filter(i => i.status === 'COMPLETED').length,
        averageScores: this.calculateAverageScores(interviews),
        overallRecommendation: this.determineOverallRecommendation(interviews),
        interviewSummaries: interviews.map(interview => ({
          id: interview.id,
          type: interview.interviewType,
          date: interview.scheduledDate,
          status: interview.status,
          recommendation: interview.overallRecommendation,
          scores: {
            communication: interview.communicationScore,
            spiritualMaturity: interview.spiritualMaturityScore,
            academicReadiness: interview.academicReadinessScore,
            character: interview.characterScore,
            motivation: interview.motivationScore,
            culturalFit: interview.culturalFitScore
          }
        }))
      };

      return report;
    } catch (error) {
      console.error('Error generating evaluation report:', error);
      throw new Error(`Failed to generate evaluation report: ${error.message}`);
    }
  }

  /**
   * Calculate average scores across all interviews
   */
  private calculateAverageScores(interviews: any[]): any {
    const completedInterviews = interviews.filter(i => i.status === 'COMPLETED');
    
    if (completedInterviews.length === 0) {
      return null;
    }

    const totals = {
      communication: 0,
      spiritualMaturity: 0,
      academicReadiness: 0,
      character: 0,
      motivation: 0,
      culturalFit: 0
    };

    completedInterviews.forEach(interview => {
      totals.communication += interview.communicationScore || 0;
      totals.spiritualMaturity += interview.spiritualMaturityScore || 0;
      totals.academicReadiness += interview.academicReadinessScore || 0;
      totals.character += interview.characterScore || 0;
      totals.motivation += interview.motivationScore || 0;
      totals.culturalFit += interview.culturalFitScore || 0;
    });

    const count = completedInterviews.length;
    return {
      communication: Math.round((totals.communication / count) * 100) / 100,
      spiritualMaturity: Math.round((totals.spiritualMaturity / count) * 100) / 100,
      academicReadiness: Math.round((totals.academicReadiness / count) * 100) / 100,
      character: Math.round((totals.character / count) * 100) / 100,
      motivation: Math.round((totals.motivation / count) * 100) / 100,
      culturalFit: Math.round((totals.culturalFit / count) * 100) / 100
    };
  }

  /**
   * Determine overall recommendation across all interviews
   */
  private determineOverallRecommendation(interviews: any[]): RecommendationType | null {
    const completedInterviews = interviews.filter(i => i.status === 'COMPLETED');
    
    if (completedInterviews.length === 0) {
      return null;
    }

    // Count recommendations
    const recommendations = completedInterviews.map(i => i.overallRecommendation);
    const counts = {
      [RecommendationType.STRONG_RECOMMEND]: 0,
      [RecommendationType.RECOMMEND]: 0,
      [RecommendationType.NEUTRAL]: 0,
      [RecommendationType.NOT_RECOMMEND]: 0,
      [RecommendationType.STRONG_NOT_RECOMMEND]: 0
    };

    recommendations.forEach(rec => {
      if (rec) counts[rec]++;
    });

    // Determine overall recommendation based on majority
    if (counts[RecommendationType.STRONG_NOT_RECOMMEND] > 0) {
      return RecommendationType.STRONG_NOT_RECOMMEND;
    }
    if (counts[RecommendationType.NOT_RECOMMEND] > completedInterviews.length / 2) {
      return RecommendationType.NOT_RECOMMEND;
    }
    if (counts[RecommendationType.STRONG_RECOMMEND] > completedInterviews.length / 2) {
      return RecommendationType.STRONG_RECOMMEND;
    }
    if (counts[RecommendationType.RECOMMEND] > completedInterviews.length / 2) {
      return RecommendationType.RECOMMEND;
    }

    return RecommendationType.NEUTRAL;
  }
}