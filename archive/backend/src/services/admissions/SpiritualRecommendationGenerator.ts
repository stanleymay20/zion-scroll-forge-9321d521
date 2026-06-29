/**
 * SpiritualRecommendationGenerator - Spiritual recommendation generation and validation
 * "Iron sharpens iron, and one man sharpens another" - Proverbs 27:17
 * Generates comprehensive spiritual development recommendations
 */

import { PrismaClient } from '@prisma/client';
import { CallingAssessment, CallingReadinessLevel, CallingType } from './CallingDiscerner';
import { ScrollAlignmentAssessment, AlignmentLevel } from './ScrollAlignmentEvaluator';

export interface SpiritualRecommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  rationale: string;
  developmentAreas: string[];
  actionSteps: string[];
  resources: string[];
  timeframe: string;
  successMetrics: string[];
}

export interface ComprehensiveRecommendationProfile {
  overallRecommendation: OverallRecommendationType;
  admissionReadiness: AdmissionReadinessLevel;
  spiritualRecommendations: SpiritualRecommendation[];
  preparationPlan: PreparationPlan;
  followUpActions: FollowUpAction[];
}

export interface PreparationPlan {
  phase1: PreparationPhase;
  phase2?: PreparationPhase;
  phase3?: PreparationPhase;
  totalDuration: string;
  milestones: string[];
}

export interface PreparationPhase {
  name: string;
  duration: string;
  objectives: string[];
  activities: string[];
  resources: string[];
  assessmentCriteria: string[];
}

export interface FollowUpAction {
  action: string;
  timeline: string;
  responsible: string;
  purpose: string;
}

export enum RecommendationType {
  SPIRITUAL_FORMATION = 'spiritual_formation',
  CALLING_DEVELOPMENT = 'calling_development',
  MINISTRY_PREPARATION = 'ministry_preparation',
  CHARACTER_DEVELOPMENT = 'character_development',
  SCROLL_ALIGNMENT = 'scroll_alignment',
  PROPHETIC_TRAINING = 'prophetic_training',
  LEADERSHIP_DEVELOPMENT = 'leadership_development',
  ACADEMIC_PREPARATION = 'academic_preparation'
}

export enum RecommendationPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum OverallRecommendationType {
  IMMEDIATE_ADMISSION = 'immediate_admission',
  CONDITIONAL_ADMISSION = 'conditional_admission',
  DEFERRED_ADMISSION = 'deferred_admission',
  PREPARATION_REQUIRED = 'preparation_required',
  NOT_RECOMMENDED = 'not_recommended'
}

export enum AdmissionReadinessLevel {
  READY = 'ready',
  NEARLY_READY = 'nearly_ready',
  DEVELOPING = 'developing',
  NEEDS_PREPARATION = 'needs_preparation',
  NOT_READY = 'not_ready'
}

export class SpiritualRecommendationGenerator {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Generate comprehensive spiritual recommendations
   */
  async generateComprehensiveRecommendations(
    callingAssessment: CallingAssessment,
    alignmentAssessment: ScrollAlignmentAssessment,
    spiritualMaturityLevel: string,
    characterScore: number,
    applicationId: string
  ): Promise<ComprehensiveRecommendationProfile> {
    // Generate individual recommendations
    const spiritualRecommendations = await this.generateIndividualRecommendations(
      callingAssessment,
      alignmentAssessment,
      spiritualMaturityLevel,
      characterScore
    );

    // Determine overall recommendation
    const overallRecommendation = this.determineOverallRecommendation(
      callingAssessment,
      alignmentAssessment,
      characterScore
    );

    // Assess admission readiness
    const admissionReadiness = this.assessAdmissionReadiness(
      callingAssessment,
      alignmentAssessment,
      characterScore
    );

    // Create preparation plan
    const preparationPlan = await this.createPreparationPlan(
      spiritualRecommendations,
      overallRecommendation
    );

    // Generate follow-up actions
    const followUpActions = this.generateFollowUpActions(
      overallRecommendation,
      admissionReadiness
    );

    return {
      overallRecommendation,
      admissionReadiness,
      spiritualRecommendations,
      preparationPlan,
      followUpActions
    };
  }

  /**
   * Validate spiritual recommendations
   */
  async validateRecommendations(
    recommendations: SpiritualRecommendation[],
    applicantProfile: any
  ): Promise<{
    isValid: boolean;
    validationScore: number;
    concerns: string[];
    adjustments: string[];
  }> {
    let validationScore = 85; // Base validation score
    const concerns: string[] = [];
    const adjustments: string[] = [];

    // Validate recommendation consistency
    const criticalRecommendations = recommendations.filter(r => 
      r.priority === RecommendationPriority.CRITICAL
    );

    if (criticalRecommendations.length > 3) {
      concerns.push('Too many critical recommendations may overwhelm applicant');
      adjustments.push('Consider consolidating or prioritizing critical recommendations');
      validationScore -= 10;
    }

    // Validate timeframe feasibility
    const totalTimeframes = recommendations.map(r => r.timeframe);
    const hasUnrealisticTimeframes = totalTimeframes.some(tf => 
      tf.includes('immediate') && tf.includes('6 months')
    );

    if (hasUnrealisticTimeframes) {
      concerns.push('Conflicting timeframes in recommendations');
      adjustments.push('Align timeframes for realistic implementation');
      validationScore -= 15;
    }

    // Validate resource availability
    const allResources = recommendations.flatMap(r => r.resources);
    const uniqueResources = [...new Set(allResources)];

    if (uniqueResources.length > 15) {
      concerns.push('Too many different resources recommended');
      adjustments.push('Consolidate resources for focused development');
      validationScore -= 5;
    }

    // Validate spiritual maturity alignment
    if (applicantProfile.spiritualMaturity === 'NEW_BELIEVER') {
      const advancedRecommendations = recommendations.filter(r =>
        r.description.toLowerCase().includes('advanced') ||
        r.description.toLowerCase().includes('prophetic')
      );

      if (advancedRecommendations.length > 1) {
        concerns.push('Advanced recommendations may not suit new believer');
        adjustments.push('Focus on foundational spiritual development first');
        validationScore -= 20;
      }
    }

    return {
      isValid: validationScore >= 70,
      validationScore,
      concerns,
      adjustments
    };
  }

  // Private helper methods

  private async generateIndividualRecommendations(
    callingAssessment: CallingAssessment,
    alignmentAssessment: ScrollAlignmentAssessment,
    spiritualMaturityLevel: string,
    characterScore: number
  ): Promise<SpiritualRecommendation[]> {
    const recommendations: SpiritualRecommendation[] = [];

    // Calling development recommendations
    if (callingAssessment.callingClarity < 70) {
      recommendations.push({
        id: 'calling-clarity-dev',
        type: RecommendationType.CALLING_DEVELOPMENT,
        priority: RecommendationPriority.HIGH,
        title: 'Calling Clarity Development',
        description: 'Focused program to clarify divine calling and ministry direction',
        rationale: `Calling clarity score of ${callingAssessment.callingClarity} indicates need for deeper discernment`,
        developmentAreas: ['Calling discernment', 'Ministry exploration', 'Prophetic confirmation'],
        actionSteps: [
          'Participate in calling discernment retreat',
          'Meet with spiritual mentor weekly for 3 months',
          'Complete calling assessment workbook',
          'Seek prophetic input from mature believers'
        ],
        resources: [
          'Calling Discernment Retreat',
          'Ministry Exploration Program',
          'Prophetic Ministry Network',
          'Spiritual Mentorship Program'
        ],
        timeframe: '3-6 months',
        successMetrics: [
          'Increased calling clarity score to 75+',
          'Clear articulation of ministry direction',
          'Prophetic confirmation received',
          'Peace and confidence in calling'
        ]
      });
    }

    // Scroll alignment recommendations
    if (alignmentAssessment.overallAlignment < 65) {
      recommendations.push({
        id: 'scroll-alignment-dev',
        type: RecommendationType.SCROLL_ALIGNMENT,
        priority: RecommendationPriority.CRITICAL,
        title: 'ScrollUniversity Philosophy Alignment',
        description: 'Intensive orientation to ScrollUniversity\'s kingdom-focused educational approach',
        rationale: `Alignment score of ${alignmentAssessment.overallAlignment} requires foundational understanding`,
        developmentAreas: ['Kingdom mindset', 'Transformational learning', 'Prophetic education'],
        actionSteps: [
          'Complete ScrollUniversity Philosophy Course',
          'Attend Kingdom Education Workshop',
          'Study transformational learning principles',
          'Engage with current ScrollUniversity community'
        ],
        resources: [
          'ScrollUniversity Philosophy Course',
          'Kingdom Education Materials',
          'Transformational Learning Resources',
          'ScrollUniversity Community Network'
        ],
        timeframe: '2-4 months',
        successMetrics: [
          'Alignment score improvement to 70+',
          'Clear understanding of scroll philosophy',
          'Demonstrated kingdom mindset',
          'Commitment to transformational learning'
        ]
      });
    }

    // Spiritual formation recommendations
    if (spiritualMaturityLevel === 'NEW_BELIEVER' || spiritualMaturityLevel === 'GROWING') {
      recommendations.push({
        id: 'spiritual-formation-foundation',
        type: RecommendationType.SPIRITUAL_FORMATION,
        priority: RecommendationPriority.HIGH,
        title: 'Foundational Spiritual Formation',
        description: 'Comprehensive spiritual formation program for growing believers',
        rationale: `Current maturity level (${spiritualMaturityLevel}) requires foundational development`,
        developmentAreas: ['Prayer life', 'Biblical knowledge', 'Spiritual disciplines', 'Character formation'],
        actionSteps: [
          'Establish daily devotional practice',
          'Complete foundational Bible study program',
          'Join discipleship group',
          'Develop spiritual disciplines routine'
        ],
        resources: [
          'Foundational Bible Study Program',
          'Discipleship Group Network',
          'Spiritual Disciplines Guide',
          'Prayer and Devotional Resources'
        ],
        timeframe: '6-12 months',
        successMetrics: [
          'Consistent daily devotional practice',
          'Completion of Bible study program',
          'Active participation in discipleship',
          'Evidence of spiritual fruit'
        ]
      });
    }

    // Character development recommendations
    if (characterScore < 70) {
      recommendations.push({
        id: 'character-development',
        type: RecommendationType.CHARACTER_DEVELOPMENT,
        priority: RecommendationPriority.CRITICAL,
        title: 'Character Development Program',
        description: 'Focused character formation and integrity development',
        rationale: `Character score of ${characterScore} requires intentional development`,
        developmentAreas: ['Integrity', 'Humility', 'Servant leadership', 'Emotional maturity'],
        actionSteps: [
          'Participate in character development workshop',
          'Engage in accountability relationship',
          'Complete character assessment and development plan',
          'Practice servant leadership opportunities'
        ],
        resources: [
          'Character Development Workshop',
          'Accountability Partnership Program',
          'Character Assessment Tools',
          'Servant Leadership Training'
        ],
        timeframe: '4-8 months',
        successMetrics: [
          'Character score improvement to 75+',
          'Demonstrated integrity in relationships',
          'Evidence of servant leadership',
          'Positive character references'
        ]
      });
    }

    // Calling-specific recommendations
    if (callingAssessment.callingType !== 'undefined') {
      recommendations.push(this.generateCallingSpecificRecommendation(callingAssessment.callingType));
    }

    // Prophetic training recommendations
    if (alignmentAssessment.propheticEducation >= 60) {
      recommendations.push({
        id: 'prophetic-training',
        type: RecommendationType.PROPHETIC_TRAINING,
        priority: RecommendationPriority.MEDIUM,
        title: 'Prophetic Ministry Training',
        description: 'Development in prophetic ministry and spiritual discernment',
        rationale: 'Strong prophetic sensitivity indicates readiness for advanced training',
        developmentAreas: ['Prophetic ministry', 'Spiritual discernment', 'Intercession'],
        actionSteps: [
          'Attend prophetic ministry school',
          'Join intercession team',
          'Practice prophetic ministry under supervision',
          'Study biblical prophecy and discernment'
        ],
        resources: [
          'Prophetic Ministry School',
          'Intercession Training Program',
          'Prophetic Ministry Mentorship',
          'Biblical Prophecy Resources'
        ],
        timeframe: '6-12 months',
        successMetrics: [
          'Demonstrated prophetic gifting',
          'Accurate spiritual discernment',
          'Effective intercession ministry',
          'Mature prophetic ministry practice'
        ]
      });
    }

    return recommendations;
  }

  private determineOverallRecommendation(
    callingAssessment: CallingAssessment,
    alignmentAssessment: ScrollAlignmentAssessment,
    characterScore: number
  ): OverallRecommendationType {
    const overallScore = (
      callingAssessment.overallCallingScore * 0.4 +
      alignmentAssessment.overallAlignment * 0.35 +
      characterScore * 0.25
    );

    if (overallScore >= 85 && 
        callingAssessment.readinessLevel === CallingReadinessLevel.MATURE &&
        alignmentAssessment.alignmentLevel === AlignmentLevel.EXCEPTIONAL) {
      return OverallRecommendationType.IMMEDIATE_ADMISSION;
    } else if (overallScore >= 70 &&
               callingAssessment.readinessLevel !== CallingReadinessLevel.UNCLEAR &&
               alignmentAssessment.alignmentLevel !== AlignmentLevel.MISALIGNED) {
      return OverallRecommendationType.CONDITIONAL_ADMISSION;
    } else if (overallScore >= 55) {
      return OverallRecommendationType.DEFERRED_ADMISSION;
    } else if (overallScore >= 35) {
      return OverallRecommendationType.PREPARATION_REQUIRED;
    } else {
      return OverallRecommendationType.NOT_RECOMMENDED;
    }
  }

  private assessAdmissionReadiness(
    callingAssessment: CallingAssessment,
    alignmentAssessment: ScrollAlignmentAssessment,
    characterScore: number
  ): AdmissionReadinessLevel {
    const readinessFactors = {
      calling: callingAssessment.readinessLevel,
      alignment: alignmentAssessment.alignmentLevel,
      character: characterScore >= 80 ? 'excellent' : 
                characterScore >= 65 ? 'good' : 
                characterScore >= 50 ? 'adequate' : 'needs_development'
    };

    if (readinessFactors.calling === CallingReadinessLevel.MATURE &&
        readinessFactors.alignment === AlignmentLevel.EXCEPTIONAL &&
        readinessFactors.character === 'excellent') {
      return AdmissionReadinessLevel.READY;
    } else if (readinessFactors.calling !== CallingReadinessLevel.UNCLEAR &&
               readinessFactors.alignment !== AlignmentLevel.MISALIGNED &&
               readinessFactors.character !== 'needs_development') {
      return AdmissionReadinessLevel.NEARLY_READY;
    } else if (readinessFactors.calling === CallingReadinessLevel.DEVELOPING ||
               readinessFactors.alignment === AlignmentLevel.DEVELOPING) {
      return AdmissionReadinessLevel.DEVELOPING;
    } else if (readinessFactors.calling === CallingReadinessLevel.EMERGING ||
               readinessFactors.alignment === AlignmentLevel.ADEQUATE) {
      return AdmissionReadinessLevel.NEEDS_PREPARATION;
    } else {
      return AdmissionReadinessLevel.NOT_READY;
    }
  }

  private async createPreparationPlan(
    recommendations: SpiritualRecommendation[],
    overallRecommendation: OverallRecommendationType
  ): Promise<PreparationPlan> {
    const criticalRecs = recommendations.filter(r => r.priority === RecommendationPriority.CRITICAL);
    const highRecs = recommendations.filter(r => r.priority === RecommendationPriority.HIGH);
    const mediumRecs = recommendations.filter(r => r.priority === RecommendationPriority.MEDIUM);

    let totalDuration: string;
    let phases: PreparationPhase[] = [];

    switch (overallRecommendation) {
      case OverallRecommendationType.IMMEDIATE_ADMISSION:
        totalDuration = '1-2 months orientation';
        phases = [{
          name: 'Pre-enrollment Orientation',
          duration: '1-2 months',
          objectives: ['Complete enrollment preparation', 'Finalize program selection'],
          activities: ['Orientation sessions', 'Program planning', 'Mentor assignment'],
          resources: ['Enrollment materials', 'Program guides', 'Mentor network'],
          assessmentCriteria: ['Orientation completion', 'Program readiness confirmation']
        }];
        break;

      case OverallRecommendationType.CONDITIONAL_ADMISSION:
        totalDuration = '3-6 months preparation';
        phases = [
          {
            name: 'Foundation Building',
            duration: '2-3 months',
            objectives: criticalRecs.map(r => r.title),
            activities: criticalRecs.flatMap(r => r.actionSteps.slice(0, 2)),
            resources: criticalRecs.flatMap(r => r.resources.slice(0, 2)),
            assessmentCriteria: criticalRecs.map(r => r.successMetrics[0])
          },
          {
            name: 'Development and Integration',
            duration: '1-3 months',
            objectives: highRecs.map(r => r.title),
            activities: highRecs.flatMap(r => r.actionSteps.slice(0, 2)),
            resources: highRecs.flatMap(r => r.resources.slice(0, 2)),
            assessmentCriteria: highRecs.map(r => r.successMetrics[0])
          }
        ];
        break;

      case OverallRecommendationType.PREPARATION_REQUIRED:
        totalDuration = '6-12 months intensive preparation';
        phases = [
          {
            name: 'Foundational Development',
            duration: '3-4 months',
            objectives: ['Character formation', 'Spiritual foundation'],
            activities: ['Character development', 'Spiritual formation', 'Basic discipleship'],
            resources: ['Character resources', 'Spiritual formation materials', 'Discipleship program'],
            assessmentCriteria: ['Character improvement', 'Spiritual growth evidence']
          },
          {
            name: 'Calling and Alignment Development',
            duration: '2-4 months',
            objectives: ['Calling clarity', 'Scroll alignment'],
            activities: ['Calling discernment', 'Philosophy orientation', 'Ministry exploration'],
            resources: ['Calling resources', 'Philosophy materials', 'Ministry programs'],
            assessmentCriteria: ['Calling clarity', 'Alignment improvement']
          },
          {
            name: 'Integration and Assessment',
            duration: '1-4 months',
            objectives: ['Integration of development', 'Final assessment'],
            activities: ['Comprehensive review', 'Final assessments', 'Admission preparation'],
            resources: ['Assessment tools', 'Review materials', 'Admission guides'],
            assessmentCriteria: ['Overall readiness', 'Admission qualification']
          }
        ];
        break;

      default:
        totalDuration = '12+ months foundational development';
        phases = [{
          name: 'Foundational Spiritual Development',
          duration: '12+ months',
          objectives: ['Basic spiritual formation', 'Character development', 'Calling exploration'],
          activities: ['Basic discipleship', 'Character formation', 'Spiritual growth'],
          resources: ['Basic resources', 'Foundational materials', 'Support network'],
          assessmentCriteria: ['Spiritual growth', 'Character development', 'Basic readiness']
        }];
    }

    return {
      phase1: phases[0],
      phase2: phases[1],
      phase3: phases[2],
      totalDuration,
      milestones: phases.flatMap(p => p.assessmentCriteria)
    };
  }

  private generateFollowUpActions(
    overallRecommendation: OverallRecommendationType,
    admissionReadiness: AdmissionReadinessLevel
  ): FollowUpAction[] {
    const actions: FollowUpAction[] = [];

    // Standard follow-up actions
    actions.push({
      action: 'Schedule follow-up assessment',
      timeline: this.getFollowUpTimeline(overallRecommendation),
      responsible: 'Admissions Committee',
      purpose: 'Monitor progress and reassess readiness'
    });

    actions.push({
      action: 'Assign spiritual mentor',
      timeline: '1-2 weeks',
      responsible: 'Spiritual Formation Team',
      purpose: 'Provide ongoing guidance and support'
    });

    // Specific actions based on recommendation
    switch (overallRecommendation) {
      case OverallRecommendationType.IMMEDIATE_ADMISSION:
        actions.push({
          action: 'Begin enrollment process',
          timeline: 'Immediate',
          responsible: 'Admissions Office',
          purpose: 'Facilitate smooth enrollment transition'
        });
        break;

      case OverallRecommendationType.CONDITIONAL_ADMISSION:
        actions.push({
          action: 'Monitor condition fulfillment',
          timeline: 'Monthly check-ins',
          responsible: 'Admissions Counselor',
          purpose: 'Ensure conditions are being met'
        });
        break;

      case OverallRecommendationType.PREPARATION_REQUIRED:
        actions.push({
          action: 'Enroll in preparation program',
          timeline: '2-4 weeks',
          responsible: 'Preparation Program Coordinator',
          purpose: 'Begin structured development process'
        });
        break;
    }

    return actions;
  }

  private generateCallingSpecificRecommendation(callingType: CallingType): SpiritualRecommendation {
    const callingRecommendations = {
      [CallingType.PROPHETIC]: {
        title: 'Prophetic Ministry Development',
        description: 'Specialized training in prophetic ministry and spiritual discernment',
        developmentAreas: ['Prophetic accuracy', 'Spiritual discernment', 'Prophetic protocol'],
        resources: ['Prophetic Ministry School', 'Discernment Training', 'Prophetic Mentorship']
      },
      [CallingType.TEACHING]: {
        title: 'Teaching Ministry Excellence',
        description: 'Advanced preparation for teaching and educational ministry',
        developmentAreas: ['Teaching methodology', 'Curriculum development', 'Educational leadership'],
        resources: ['Teaching Excellence Program', 'Curriculum Design Course', 'Educational Leadership Training']
      },
      [CallingType.PASTORAL]: {
        title: 'Pastoral Ministry Preparation',
        description: 'Comprehensive preparation for pastoral care and church leadership',
        developmentAreas: ['Pastoral care', 'Church leadership', 'Counseling skills'],
        resources: ['Pastoral Training Program', 'Leadership Development', 'Counseling Certification']
      }
    };

    const specific = callingRecommendations[callingType] || {
      title: 'Ministry Calling Development',
      description: 'General ministry preparation and calling development',
      developmentAreas: ['Ministry skills', 'Leadership development', 'Practical training'],
      resources: ['Ministry Training Program', 'Leadership Course', 'Practical Ministry Experience']
    };

    return {
      id: `calling-specific-${callingType}`,
      type: RecommendationType.MINISTRY_PREPARATION,
      priority: RecommendationPriority.MEDIUM,
      title: specific.title,
      description: specific.description,
      rationale: `Identified calling type (${callingType}) requires specialized preparation`,
      developmentAreas: specific.developmentAreas,
      actionSteps: [
        'Complete specialized training program',
        'Gain practical ministry experience',
        'Receive mentorship in calling area',
        'Demonstrate competency in ministry area'
      ],
      resources: specific.resources,
      timeframe: '6-12 months',
      successMetrics: [
        'Completion of specialized training',
        'Demonstrated ministry competency',
        'Positive ministry references',
        'Clear calling confirmation'
      ]
    };
  }

  private getFollowUpTimeline(recommendation: OverallRecommendationType): string {
    switch (recommendation) {
      case OverallRecommendationType.IMMEDIATE_ADMISSION:
        return '3 months post-enrollment';
      case OverallRecommendationType.CONDITIONAL_ADMISSION:
        return '6 months';
      case OverallRecommendationType.DEFERRED_ADMISSION:
        return '9 months';
      case OverallRecommendationType.PREPARATION_REQUIRED:
        return '12 months';
      default:
        return '18 months';
    }
  }
}