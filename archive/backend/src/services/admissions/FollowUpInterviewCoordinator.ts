/**
 * FollowUpInterviewCoordinator - Adds follow-up interview coordination and scheduling
 * "In the multitude of counselors there is safety" (Proverbs 11:14)
 */

import { InterviewCoordinationService } from './InterviewCoordinationService';
import { InterviewType, InterviewFormat, RecommendationType } from '@prisma/client';
import { AssessmentAnalysis } from './InterviewAssessmentProcessor';
import { InterviewEvaluation } from './InterviewEvaluator';

export interface FollowUpRecommendation {
  recommendationId: string;
  originalInterviewId: string;
  recommendationType: FollowUpType;
  priority: FollowUpPriority;
  reasoning: string[];
  suggestedInterviewType: InterviewType;
  suggestedTimeframe: string;
  specificFocus: string[];
  requiredParticipants: RequiredParticipant[];
  preparationRequirements: string[];
  successCriteria: string[];
}

export interface FollowUpSchedule {
  scheduleId: string;
  originalInterviewId: string;
  followUpInterviews: ScheduledFollowUp[];
  overallTimeline: TimelineItem[];
  coordinationNotes: string[];
  status: FollowUpStatus;
}

export interface ScheduledFollowUp {
  followUpId: string;
  interviewType: InterviewType;
  scheduledDate: Date;
  duration: number;
  format: InterviewFormat;
  participants: FollowUpParticipant[];
  focus: string[];
  preparationMaterials: PreparationMaterial[];
  status: FollowUpInterviewStatus;
}

export interface RequiredParticipant {
  role: ParticipantRole;
  specialization?: string;
  required: boolean;
  reason: string;
}

export interface FollowUpParticipant {
  userId: string;
  name: string;
  role: ParticipantRole;
  specialization?: string;
  confirmed: boolean;
  preparationCompleted: boolean;
}

export interface TimelineItem {
  date: Date;
  activity: string;
  responsible: string;
  status: TimelineStatus;
}

export interface PreparationMaterial {
  type: MaterialType;
  title: string;
  description: string;
  url?: string;
  required: boolean;
  dueDate?: Date;
}

export enum FollowUpType {
  CLARIFICATION = 'clarification',
  DEEP_DIVE = 'deep_dive',
  COMMITTEE_REVIEW = 'committee_review',
  SPECIALIST_CONSULTATION = 'specialist_consultation',
  REMEDIAL_ASSESSMENT = 'remedial_assessment',
  FINAL_CONFIRMATION = 'final_confirmation'
}

export enum FollowUpPriority {
  URGENT = 'urgent',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum ParticipantRole {
  PRIMARY_INTERVIEWER = 'primary_interviewer',
  SUBJECT_EXPERT = 'subject_expert',
  SPIRITUAL_ADVISOR = 'spiritual_advisor',
  ACADEMIC_ASSESSOR = 'academic_assessor',
  COMMITTEE_MEMBER = 'committee_member',
  OBSERVER = 'observer'
}

export enum FollowUpStatus {
  RECOMMENDED = 'recommended',
  APPROVED = 'approved',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum FollowUpInterviewStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled'
}

export enum TimelineStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

export enum MaterialType {
  DOCUMENT = 'document',
  VIDEO = 'video',
  ASSESSMENT = 'assessment',
  REFERENCE = 'reference',
  PREPARATION_GUIDE = 'preparation_guide'
}

export class FollowUpInterviewCoordinator {
  private coordinationService: InterviewCoordinationService;

  constructor() {
    this.coordinationService = new InterviewCoordinationService();
  }

  /**
   * Analyze interview results and generate follow-up recommendations
   */
  async generateFollowUpRecommendations(
    interviewId: string,
    evaluation: InterviewEvaluation,
    assessment?: AssessmentAnalysis
  ): Promise<FollowUpRecommendation[]> {
    try {
      console.log(`Generating follow-up recommendations for interview ${interviewId}`);

      const recommendations: FollowUpRecommendation[] = [];

      // Analyze evaluation scores and concerns
      const lowScores = this.identifyLowScores(evaluation.scores);
      const concerns = evaluation.observations.concerns;
      const recommendation = evaluation.recommendation;

      // Generate recommendations based on analysis
      if (lowScores.length > 0) {
        recommendations.push(...this.generateScoreBasedRecommendations(interviewId, lowScores));
      }

      if (concerns.length > 0) {
        recommendations.push(...this.generateConcernBasedRecommendations(interviewId, concerns));
      }

      if (recommendation.type === RecommendationType.NEUTRAL) {
        recommendations.push(this.generateNeutralRecommendationFollowUp(interviewId));
      }

      // Generate assessment-based recommendations
      if (assessment) {
        recommendations.push(...this.generateAssessmentBasedRecommendations(interviewId, assessment));
      }

      // Generate follow-up based on interview type
      recommendations.push(...this.generateTypeBasedRecommendations(interviewId, evaluation));

      console.log(`Generated ${recommendations.length} follow-up recommendations`);
      return recommendations;
    } catch (error) {
      console.error('Error generating follow-up recommendations:', error);
      throw new Error(`Failed to generate follow-up recommendations: ${error.message}`);
    }
  }

  /**
   * Schedule follow-up interviews based on recommendations
   */
  async scheduleFollowUpInterviews(
    recommendations: FollowUpRecommendation[],
    applicantPreferences?: any
  ): Promise<FollowUpSchedule> {
    try {
      console.log(`Scheduling follow-up interviews for ${recommendations.length} recommendations`);

      const scheduleId = this.generateScheduleId();
      const originalInterviewId = recommendations[0]?.originalInterviewId;

      // Sort recommendations by priority
      const sortedRecommendations = recommendations.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      const followUpInterviews: ScheduledFollowUp[] = [];
      const timeline: TimelineItem[] = [];

      let currentDate = new Date();
      currentDate.setDate(currentDate.getDate() + 2); // Start 2 days from now

      for (const recommendation of sortedRecommendations) {
        const followUp = await this.scheduleIndividualFollowUp(
          recommendation,
          currentDate,
          applicantPreferences
        );

        followUpInterviews.push(followUp);

        // Add timeline items
        timeline.push({
          date: new Date(currentDate.getTime() - 24 * 60 * 60 * 1000), // Day before
          activity: `Preparation for ${recommendation.recommendationType} interview`,
          responsible: 'Applicant',
          status: TimelineStatus.PENDING
        });

        timeline.push({
          date: currentDate,
          activity: `${recommendation.recommendationType} interview`,
          responsible: 'Interview Team',
          status: TimelineStatus.PENDING
        });

        // Space out interviews
        currentDate.setDate(currentDate.getDate() + this.getInterviewSpacing(recommendation.priority));
      }

      const schedule: FollowUpSchedule = {
        scheduleId,
        originalInterviewId,
        followUpInterviews,
        overallTimeline: timeline.sort((a, b) => a.date.getTime() - b.date.getTime()),
        coordinationNotes: [
          'Follow-up interviews scheduled based on initial assessment',
          'Applicant will receive detailed preparation materials',
          'All interviews will be recorded for comprehensive evaluation'
        ],
        status: FollowUpStatus.SCHEDULED
      };

      // Store schedule
      await this.storeFollowUpSchedule(schedule);

      // Send notifications
      await this.sendFollowUpNotifications(schedule);

      console.log(`Follow-up schedule created: ${scheduleId}`);
      return schedule;
    } catch (error) {
      console.error('Error scheduling follow-up interviews:', error);
      throw new Error(`Failed to schedule follow-up interviews: ${error.message}`);
    }
  }

  /**
   * Coordinate committee review process
   */
  async coordinateCommitteeReview(
    interviewId: string,
    committeeMembers: string[],
    reviewType: 'standard' | 'expedited' | 'comprehensive'
  ): Promise<ScheduledFollowUp> {
    try {
      console.log(`Coordinating committee review for interview ${interviewId}`);

      const participants: FollowUpParticipant[] = [];
      
      // Add committee members
      for (const memberId of committeeMembers) {
        participants.push({
          userId: memberId,
          name: `Committee Member ${memberId}`,
          role: ParticipantRole.COMMITTEE_MEMBER,
          confirmed: false,
          preparationCompleted: false
        });
      }

      // Determine review duration and focus
      const reviewConfig = this.getCommitteeReviewConfig(reviewType);

      const committeeReview: ScheduledFollowUp = {
        followUpId: this.generateFollowUpId(),
        interviewType: InterviewType.COMMITTEE_INTERVIEW,
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        duration: reviewConfig.duration,
        format: InterviewFormat.VIDEO_CONFERENCE,
        participants,
        focus: reviewConfig.focus,
        preparationMaterials: reviewConfig.materials,
        status: FollowUpInterviewStatus.PENDING
      };

      // Schedule the committee review
      await this.scheduleCommitteeSession(committeeReview);

      console.log(`Committee review scheduled: ${committeeReview.followUpId}`);
      return committeeReview;
    } catch (error) {
      console.error('Error coordinating committee review:', error);
      throw new Error(`Failed to coordinate committee review: ${error.message}`);
    }
  }

  /**
   * Handle follow-up interview completion
   */
  async completeFollowUpInterview(
    followUpId: string,
    evaluation: InterviewEvaluation,
    assessment?: AssessmentAnalysis
  ): Promise<void> {
    try {
      console.log(`Completing follow-up interview: ${followUpId}`);

      // Update follow-up status
      await this.updateFollowUpStatus(followUpId, FollowUpInterviewStatus.COMPLETED);

      // Analyze if additional follow-ups are needed
      const additionalRecommendations = await this.generateFollowUpRecommendations(
        followUpId,
        evaluation,
        assessment
      );

      if (additionalRecommendations.length > 0) {
        console.log(`Generated ${additionalRecommendations.length} additional follow-up recommendations`);
        
        // Schedule additional follow-ups if needed
        await this.scheduleFollowUpInterviews(additionalRecommendations);
      }

      // Update overall application status
      await this.updateApplicationStatus(followUpId, evaluation);

      console.log(`Follow-up interview completed: ${followUpId}`);
    } catch (error) {
      console.error('Error completing follow-up interview:', error);
      throw new Error(`Failed to complete follow-up interview: ${error.message}`);
    }
  }

  /**
   * Identify low scores that require follow-up
   */
  private identifyLowScores(scores: any): Array<{ area: string; score: number }> {
    const lowScores: Array<{ area: string; score: number }> = [];
    const threshold = 6; // Scores below 6 need follow-up

    Object.entries(scores).forEach(([area, score]) => {
      if (typeof score === 'number' && score < threshold && area !== 'overallScore') {
        lowScores.push({ area, score });
      }
    });

    return lowScores;
  }

  /**
   * Generate recommendations based on low scores
   */
  private generateScoreBasedRecommendations(
    interviewId: string,
    lowScores: Array<{ area: string; score: number }>
  ): FollowUpRecommendation[] {
    const recommendations: FollowUpRecommendation[] = [];

    for (const lowScore of lowScores) {
      if (lowScore.area === 'spiritualMaturity') {
        recommendations.push({
          recommendationId: this.generateRecommendationId(),
          originalInterviewId: interviewId,
          recommendationType: FollowUpType.DEEP_DIVE,
          priority: FollowUpPriority.HIGH,
          reasoning: [`Low spiritual maturity score: ${lowScore.score}/10`],
          suggestedInterviewType: InterviewType.SPIRITUAL_EVALUATION,
          suggestedTimeframe: '3-5 days',
          specificFocus: ['Personal testimony', 'Spiritual disciplines', 'Ministry experience'],
          requiredParticipants: [
            {
              role: ParticipantRole.SPIRITUAL_ADVISOR,
              specialization: 'Spiritual Formation',
              required: true,
              reason: 'Deep spiritual assessment needed'
            }
          ],
          preparationRequirements: [
            'Prepare detailed testimony',
            'List spiritual disciplines practiced',
            'Describe ministry experiences'
          ],
          successCriteria: [
            'Clear testimony articulation',
            'Evidence of spiritual growth',
            'Demonstrated spiritual disciplines'
          ]
        });
      }

      if (lowScore.area === 'academicReadiness') {
        recommendations.push({
          recommendationId: this.generateRecommendationId(),
          originalInterviewId: interviewId,
          recommendationType: FollowUpType.SPECIALIST_CONSULTATION,
          priority: FollowUpPriority.HIGH,
          reasoning: [`Low academic readiness score: ${lowScore.score}/10`],
          suggestedInterviewType: InterviewType.ACADEMIC_ASSESSMENT,
          suggestedTimeframe: '2-3 days',
          specificFocus: ['Academic background', 'Critical thinking', 'Research skills'],
          requiredParticipants: [
            {
              role: ParticipantRole.ACADEMIC_ASSESSOR,
              specialization: 'Academic Evaluation',
              required: true,
              reason: 'Detailed academic assessment needed'
            }
          ],
          preparationRequirements: [
            'Bring academic transcripts',
            'Prepare writing samples',
            'Review research experience'
          ],
          successCriteria: [
            'Demonstrated academic capability',
            'Clear learning objectives',
            'Research potential evident'
          ]
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate recommendations based on concerns
   */
  private generateConcernBasedRecommendations(
    interviewId: string,
    concerns: string[]
  ): FollowUpRecommendation[] {
    const recommendations: FollowUpRecommendation[] = [];

    for (const concern of concerns) {
      if (concern.toLowerCase().includes('communication')) {
        recommendations.push({
          recommendationId: this.generateRecommendationId(),
          originalInterviewId: interviewId,
          recommendationType: FollowUpType.CLARIFICATION,
          priority: FollowUpPriority.MEDIUM,
          reasoning: [`Communication concern: ${concern}`],
          suggestedInterviewType: InterviewType.CHARACTER_INTERVIEW,
          suggestedTimeframe: '2-4 days',
          specificFocus: ['Communication skills', 'Interpersonal abilities'],
          requiredParticipants: [
            {
              role: ParticipantRole.PRIMARY_INTERVIEWER,
              required: true,
              reason: 'Communication assessment needed'
            }
          ],
          preparationRequirements: [
            'Practice presentation skills',
            'Prepare for communication exercises'
          ],
          successCriteria: [
            'Clear communication demonstrated',
            'Effective interpersonal skills shown'
          ]
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate recommendation for neutral evaluations
   */
  private generateNeutralRecommendationFollowUp(interviewId: string): FollowUpRecommendation {
    return {
      recommendationId: this.generateRecommendationId(),
      originalInterviewId: interviewId,
      recommendationType: FollowUpType.COMMITTEE_REVIEW,
      priority: FollowUpPriority.MEDIUM,
      reasoning: ['Neutral recommendation requires committee review'],
      suggestedInterviewType: InterviewType.COMMITTEE_INTERVIEW,
      suggestedTimeframe: '5-7 days',
      specificFocus: ['Comprehensive evaluation', 'Multiple perspectives'],
      requiredParticipants: [
        {
          role: ParticipantRole.COMMITTEE_MEMBER,
          required: true,
          reason: 'Committee decision needed'
        }
      ],
      preparationRequirements: [
        'Review all interview materials',
        'Prepare for comprehensive discussion'
      ],
      successCriteria: [
        'Clear committee consensus',
        'Documented decision rationale'
      ]
    };
  }

  /**
   * Generate assessment-based recommendations
   */
  private generateAssessmentBasedRecommendations(
    interviewId: string,
    assessment: AssessmentAnalysis
  ): FollowUpRecommendation[] {
    const recommendations: FollowUpRecommendation[] = [];

    // Check for high-impact concerns
    const highImpactConcerns = assessment.insights.concerns.filter(c => c.impact === 'high');
    
    for (const concern of highImpactConcerns) {
      recommendations.push({
        recommendationId: this.generateRecommendationId(),
        originalInterviewId: interviewId,
        recommendationType: FollowUpType.DEEP_DIVE,
        priority: FollowUpPriority.HIGH,
        reasoning: [`High-impact concern: ${concern.description}`],
        suggestedInterviewType: InterviewType.CHARACTER_INTERVIEW,
        suggestedTimeframe: '2-3 days',
        specificFocus: [concern.category],
        requiredParticipants: [
          {
            role: ParticipantRole.SUBJECT_EXPERT,
            specialization: concern.category,
            required: true,
            reason: `Expert assessment needed for ${concern.category}`
          }
        ],
        preparationRequirements: [`Address ${concern.category} concerns`],
        successCriteria: [`Resolved ${concern.category} issues`]
      });
    }

    return recommendations;
  }

  /**
   * Generate type-based recommendations
   */
  private generateTypeBasedRecommendations(
    interviewId: string,
    evaluation: InterviewEvaluation
  ): FollowUpRecommendation[] {
    const recommendations: FollowUpRecommendation[] = [];

    // Add standard follow-up based on recommendation strength
    if (evaluation.recommendation.type === RecommendationType.STRONG_RECOMMEND) {
      recommendations.push({
        recommendationId: this.generateRecommendationId(),
        originalInterviewId: interviewId,
        recommendationType: FollowUpType.FINAL_CONFIRMATION,
        priority: FollowUpPriority.LOW,
        reasoning: ['Final confirmation for strong recommendation'],
        suggestedInterviewType: InterviewType.FINAL_INTERVIEW,
        suggestedTimeframe: '7-10 days',
        specificFocus: ['Final questions', 'Enrollment confirmation'],
        requiredParticipants: [
          {
            role: ParticipantRole.PRIMARY_INTERVIEWER,
            required: true,
            reason: 'Final confirmation needed'
          }
        ],
        preparationRequirements: ['Review enrollment materials'],
        successCriteria: ['Confirmed enrollment intent']
      });
    }

    return recommendations;
  }

  /**
   * Schedule individual follow-up interview
   */
  private async scheduleIndividualFollowUp(
    recommendation: FollowUpRecommendation,
    scheduledDate: Date,
    applicantPreferences?: any
  ): Promise<ScheduledFollowUp> {
    const participants: FollowUpParticipant[] = [];
    
    // Convert required participants to follow-up participants
    for (const required of recommendation.requiredParticipants) {
      participants.push({
        userId: `user_${Math.random().toString(36).substring(2, 10)}`,
        name: `${required.role} ${required.specialization || ''}`,
        role: required.role,
        specialization: required.specialization,
        confirmed: false,
        preparationCompleted: false
      });
    }

    // Generate preparation materials
    const preparationMaterials: PreparationMaterial[] = recommendation.preparationRequirements.map(req => ({
      type: MaterialType.PREPARATION_GUIDE,
      title: req,
      description: `Preparation guide for ${req}`,
      required: true,
      dueDate: new Date(scheduledDate.getTime() - 24 * 60 * 60 * 1000) // Day before
    }));

    return {
      followUpId: this.generateFollowUpId(),
      interviewType: recommendation.suggestedInterviewType,
      scheduledDate,
      duration: this.getInterviewDuration(recommendation.suggestedInterviewType),
      format: InterviewFormat.VIDEO_CONFERENCE,
      participants,
      focus: recommendation.specificFocus,
      preparationMaterials,
      status: FollowUpInterviewStatus.SCHEDULED
    };
  }

  /**
   * Get committee review configuration
   */
  private getCommitteeReviewConfig(reviewType: string): any {
    const configs = {
      standard: {
        duration: 60,
        focus: ['Overall assessment', 'Recommendation review'],
        materials: [
          {
            type: MaterialType.DOCUMENT,
            title: 'Interview Summary',
            description: 'Complete interview evaluation summary',
            required: true
          }
        ]
      },
      expedited: {
        duration: 30,
        focus: ['Quick decision', 'Key concerns'],
        materials: [
          {
            type: MaterialType.DOCUMENT,
            title: 'Executive Summary',
            description: 'Brief interview summary',
            required: true
          }
        ]
      },
      comprehensive: {
        duration: 90,
        focus: ['Detailed review', 'Multiple perspectives', 'Final decision'],
        materials: [
          {
            type: MaterialType.DOCUMENT,
            title: 'Complete Dossier',
            description: 'All interview materials and assessments',
            required: true
          }
        ]
      }
    };

    return configs[reviewType] || configs.standard;
  }

  /**
   * Get interview spacing based on priority
   */
  private getInterviewSpacing(priority: FollowUpPriority): number {
    const spacing = {
      [FollowUpPriority.URGENT]: 1,
      [FollowUpPriority.HIGH]: 2,
      [FollowUpPriority.MEDIUM]: 3,
      [FollowUpPriority.LOW]: 5
    };

    return spacing[priority] || 3;
  }

  /**
   * Get interview duration based on type
   */
  private getInterviewDuration(interviewType: InterviewType): number {
    const durations = {
      [InterviewType.INITIAL_SCREENING]: 30,
      [InterviewType.ACADEMIC_ASSESSMENT]: 45,
      [InterviewType.SPIRITUAL_EVALUATION]: 60,
      [InterviewType.CHARACTER_INTERVIEW]: 45,
      [InterviewType.FINAL_INTERVIEW]: 60,
      [InterviewType.COMMITTEE_INTERVIEW]: 90
    };

    return durations[interviewType] || 45;
  }

  /**
   * Generate unique IDs
   */
  private generateScheduleId(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  private generateFollowUpId(): string {
    return `followup_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  private generateRecommendationId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Storage and notification methods (mock implementations)
   */
  private async storeFollowUpSchedule(schedule: FollowUpSchedule): Promise<void> {
    console.log(`Storing follow-up schedule: ${schedule.scheduleId}`);
  }

  private async sendFollowUpNotifications(schedule: FollowUpSchedule): Promise<void> {
    console.log(`Sending follow-up notifications for schedule: ${schedule.scheduleId}`);
  }

  private async scheduleCommitteeSession(review: ScheduledFollowUp): Promise<void> {
    console.log(`Scheduling committee session: ${review.followUpId}`);
  }

  private async updateFollowUpStatus(followUpId: string, status: FollowUpInterviewStatus): Promise<void> {
    console.log(`Updating follow-up status: ${followUpId} -> ${status}`);
  }

  private async updateApplicationStatus(followUpId: string, evaluation: InterviewEvaluation): Promise<void> {
    console.log(`Updating application status based on follow-up: ${followUpId}`);
  }
}