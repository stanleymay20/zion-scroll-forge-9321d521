import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { SkillAssessment, AcademicLevel, CapacityAssessment, PotentialScore } from './AcademicEvaluator';

export interface ReadinessAssessment {
  applicantId: string;
  overallReadiness: ReadinessLevel;
  cognitiveReadiness: CognitiveReadiness;
  academicPreparation: AcademicPreparation;
  intellectualMaturity: IntellectualMaturity;
  learningReadiness: LearningReadiness;
  recommendedLevel: AcademicLevel;
  readinessScore: number; // 0-100
  recommendations: ReadinessRecommendation[];
  interventions: ReadinessIntervention[];
  assessedAt: Date;
}

export enum ReadinessLevel {
  NOT_READY = 'not_ready',
  CONDITIONALLY_READY = 'conditionally_ready',
  READY = 'ready',
  HIGHLY_READY = 'highly_ready'
}

export interface CognitiveReadiness {
  abstractThinking: number;
  logicalReasoning: number;
  criticalAnalysis: number;
  problemSolving: number;
  informationProcessing: number;
  memoryAndRetention: number;
  attentionAndFocus: number;
  overallCognitive: number;
}

export interface AcademicPreparation {
  foundationalKnowledge: number;
  studySkills: number;
  researchCapabilities: number;
  writingProficiency: number;
  quantitativeSkills: number;
  technicalLiteracy: number;
  overallPreparation: number;
}

export interface IntellectualMaturity {
  curiosityLevel: number;
  openMindedness: number;
  intellectualHumility: number;
  persistenceInLearning: number;
  abilityToSynthesis: number;
  metacognition: number;
  overallMaturity: number;
}

export interface LearningReadiness {
  motivationLevel: number;
  selfDirectedLearning: number;
  adaptabilityToNewConcepts: number;
  collaborativeLearning: number;
  feedbackReceptivity: number;
  goalOrientation: number;
  overallLearningReadiness: number;
}

export interface ReadinessRecommendation {
  area: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeframe: string;
  expectedOutcome: string;
  resources: string[];
}

export interface ReadinessIntervention {
  type: 'academic' | 'cognitive' | 'behavioral' | 'support';
  intervention: string;
  duration: string;
  intensity: 'light' | 'moderate' | 'intensive';
  successCriteria: string[];
  monitoring: string;
}

export interface ReadinessGap {
  area: string;
  currentLevel: number;
  requiredLevel: number;
  gap: number;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  bridgeable: boolean;
  timeToClose: string;
}

export class IntellectualReadinessAssessor {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async assessIntellectualReadiness(
    applicationId: string,
    skills: SkillAssessment[],
    potential: PotentialScore,
    capacity: CapacityAssessment
  ): Promise<ReadinessAssessment> {
    try {
      logger.info(`Starting intellectual readiness assessment for application ${applicationId}`);

      const application = await this.prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          applicant: true,
          documents: true
        }
      });

      if (!application) {
        throw new Error(`Application ${applicationId} not found`);
      }

      // Assess cognitive readiness
      const cognitiveReadiness = this.assessCognitiveReadiness(skills, capacity, application.applicationData);

      // Assess academic preparation
      const academicPreparation = this.assessAcademicPreparation(skills, application.applicationData);

      // Assess intellectual maturity
      const intellectualMaturity = this.assessIntellectualMaturity(potential, application.applicationData);

      // Assess learning readiness
      const learningReadiness = this.assessLearningReadiness(potential, application.applicationData);

      // Calculate overall readiness score
      const readinessScore = this.calculateOverallReadinessScore(
        cognitiveReadiness,
        academicPreparation,
        intellectualMaturity,
        learningReadiness
      );

      // Determine readiness level
      const overallReadiness = this.determineReadinessLevel(readinessScore);

      // Determine recommended academic level
      const recommendedLevel = this.determineRecommendedLevel(readinessScore, skills, potential);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        cognitiveReadiness,
        academicPreparation,
        intellectualMaturity,
        learningReadiness,
        overallReadiness
      );

      // Generate interventions
      const interventions = this.generateInterventions(
        cognitiveReadiness,
        academicPreparation,
        intellectualMaturity,
        learningReadiness,
        overallReadiness
      );

      const assessment: ReadinessAssessment = {
        applicantId: application.applicantId,
        overallReadiness,
        cognitiveReadiness,
        academicPreparation,
        intellectualMaturity,
        learningReadiness,
        recommendedLevel,
        readinessScore,
        recommendations,
        interventions,
        assessedAt: new Date()
      };

      // Store assessment
      await this.storeReadinessAssessment(applicationId, assessment);

      logger.info(`Intellectual readiness assessment completed for application ${applicationId}`);
      return assessment;

    } catch (error) {
      logger.error(`Intellectual readiness assessment failed for application ${applicationId}:`, error);
      throw error;
    }
  }

  private assessCognitiveReadiness(
    skills: SkillAssessment[],
    capacity: CapacityAssessment,
    applicationData: any
  ): CognitiveReadiness {
    // Extract relevant skill scores
    const criticalThinking = skills.find(s => s.skill === 'critical_thinking')?.assessment.score || 50;
    const analyticalReasoning = skills.find(s => s.skill === 'analytical_reasoning')?.assessment.score || 50;
    const mathematics = skills.find(s => s.skill === 'mathematics')?.assessment.score || 50;

    const abstractThinking = capacity.abstractThinking || 50;
    const logicalReasoning = (criticalThinking + analyticalReasoning) / 2;
    const criticalAnalysis = capacity.criticalAnalysis || criticalThinking;
    const problemSolving = (criticalThinking + analyticalReasoning + mathematics) / 3;
    const informationProcessing = capacity.informationProcessing || 50;

    // Assess memory and retention from application data
    const memoryAndRetention = this.assessMemoryAndRetention(applicationData);
    
    // Assess attention and focus
    const attentionAndFocus = this.assessAttentionAndFocus(applicationData);

    const overallCognitive = Math.round(
      (abstractThinking + logicalReasoning + criticalAnalysis + problemSolving + 
       informationProcessing + memoryAndRetention + attentionAndFocus) / 7
    );

    return {
      abstractThinking: Math.round(abstractThinking),
      logicalReasoning: Math.round(logicalReasoning),
      criticalAnalysis: Math.round(criticalAnalysis),
      problemSolving: Math.round(problemSolving),
      informationProcessing: Math.round(informationProcessing),
      memoryAndRetention,
      attentionAndFocus,
      overallCognitive
    };
  }

  private assessMemoryAndRetention(applicationData: any): number {
    let score = 60; // Base score

    // Factor in academic performance consistency
    if (applicationData.consistentPerformance) {
      score += 20;
    }

    // Factor in ability to build on previous knowledge
    if (applicationData.cumulativeLearning) {
      score += 15;
    }

    // Factor in long-term retention indicators
    if (applicationData.longTermRetention) {
      score += 15;
    }

    return Math.min(100, score);
  }

  private assessAttentionAndFocus(applicationData: any): number {
    let score = 60; // Base score

    // Factor in ability to complete long-term projects
    const longTermProjects = applicationData.longTermProjects || [];
    score += Math.min(20, longTermProjects.length * 5);

    // Factor in sustained academic performance
    if (applicationData.sustainedPerformance) {
      score += 15;
    }

    // Factor in attention-related challenges
    if (applicationData.attentionChallenges) {
      score -= 25;
    }

    return Math.min(100, Math.max(20, score));
  }

  private assessAcademicPreparation(skills: SkillAssessment[], applicationData: any): AcademicPreparation {
    // Calculate foundational knowledge from core skills
    const coreSkills = ['mathematics', 'science', 'language_arts', 'critical_thinking'];
    const foundationalScores = skills
      .filter(s => coreSkills.includes(s.skill))
      .map(s => s.assessment.score);
    const foundationalKnowledge = foundationalScores.length > 0 
      ? Math.round(foundationalScores.reduce((sum, score) => sum + score, 0) / foundationalScores.length)
      : 50;

    // Assess study skills
    const studySkills = this.assessStudySkills(applicationData);

    // Assess research capabilities
    const researchCapabilities = skills.find(s => s.skill === 'research_methodology')?.assessment.score || 
                                this.assessResearchCapabilities(applicationData);

    // Assess writing proficiency
    const writingProficiency = skills.find(s => s.skill === 'written_communication')?.assessment.score || 50;

    // Assess quantitative skills
    const quantitativeSkills = skills.find(s => s.skill === 'mathematics')?.assessment.score || 50;

    // Assess technical literacy
    const technicalLiteracy = this.assessTechnicalLiteracy(applicationData);

    const overallPreparation = Math.round(
      (foundationalKnowledge + studySkills + researchCapabilities + 
       writingProficiency + quantitativeSkills + technicalLiteracy) / 6
    );

    return {
      foundationalKnowledge,
      studySkills,
      researchCapabilities,
      writingProficiency,
      quantitativeSkills,
      technicalLiteracy,
      overallPreparation
    };
  }

  private assessStudySkills(applicationData: any): number {
    let score = 50; // Base score

    if (applicationData.timeManagement) score += 20;
    if (applicationData.noteTaking) score += 15;
    if (applicationData.testPreparation) score += 15;
    if (applicationData.organizationalSkills) score += 15;

    return Math.min(100, score);
  }

  private assessResearchCapabilities(applicationData: any): number {
    let score = 40; // Base score

    const researchExperience = applicationData.research || [];
    score += Math.min(30, researchExperience.length * 10);

    if (applicationData.librarySkills) score += 15;
    if (applicationData.sourceEvaluation) score += 15;

    return Math.min(100, score);
  }

  private assessTechnicalLiteracy(applicationData: any): number {
    let score = 50; // Base score

    const techSkills = applicationData.technologySkills || [];
    score += Math.min(25, techSkills.length * 5);

    if (applicationData.digitalLiteracy) score += 15;
    if (applicationData.onlineLearning) score += 10;

    return Math.min(100, score);
  }

  private assessIntellectualMaturity(potential: PotentialScore, applicationData: any): IntellectualMaturity {
    const curiosityLevel = this.assessCuriosity(applicationData);
    const openMindedness = this.assessOpenMindedness(applicationData);
    const intellectualHumility = this.assessIntellectualHumility(applicationData);
    const persistenceInLearning = potential.persistence;
    const abilityToSynthesis = this.assessSynthesisAbility(applicationData);
    const metacognition = this.assessMetacognition(applicationData);

    const overallMaturity = Math.round(
      (curiosityLevel + openMindedness + intellectualHumility + 
       persistenceInLearning + abilityToSynthesis + metacognition) / 6
    );

    return {
      curiosityLevel,
      openMindedness,
      intellectualHumility,
      persistenceInLearning,
      abilityToSynthesis,
      metacognition,
      overallMaturity
    };
  }

  private assessCuriosity(applicationData: any): number {
    let score = 50; // Base score

    if (applicationData.selfDirectedLearning) score += 20;
    if (applicationData.diverseInterests) score += 15;
    if (applicationData.questionAsking) score += 15;

    return Math.min(100, score);
  }

  private assessOpenMindedness(applicationData: any): number {
    let score = 60; // Base score

    if (applicationData.culturalExposure) score += 15;
    if (applicationData.perspectiveTaking) score += 15;
    if (applicationData.changeAdaptation) score += 10;

    return Math.min(100, score);
  }

  private assessIntellectualHumility(applicationData: any): number {
    let score = 55; // Base score

    if (applicationData.acknowledgesLimitations) score += 20;
    if (applicationData.seeksFeedback) score += 15;
    if (applicationData.learnsFromMistakes) score += 10;

    return Math.min(100, score);
  }

  private assessSynthesisAbility(applicationData: any): number {
    let score = 50; // Base score

    if (applicationData.interdisciplinaryWork) score += 20;
    if (applicationData.connectsIdeas) score += 15;
    if (applicationData.integratesKnowledge) score += 15;

    return Math.min(100, score);
  }

  private assessMetacognition(applicationData: any): number {
    let score = 50; // Base score

    if (applicationData.selfReflection) score += 20;
    if (applicationData.learningStrategies) score += 15;
    if (applicationData.selfMonitoring) score += 15;

    return Math.min(100, score);
  }

  private assessLearningReadiness(potential: PotentialScore, applicationData: any): LearningReadiness {
    const motivationLevel = this.assessMotivation(applicationData);
    const selfDirectedLearning = applicationData.selfDirectedLearning ? 80 : 50;
    const adaptabilityToNewConcepts = potential.adaptability;
    const collaborativeLearning = this.assessCollaborativeLearning(applicationData);
    const feedbackReceptivity = this.assessFeedbackReceptivity(applicationData);
    const goalOrientation = this.assessGoalOrientation(applicationData);

    const overallLearningReadiness = Math.round(
      (motivationLevel + selfDirectedLearning + adaptabilityToNewConcepts + 
       collaborativeLearning + feedbackReceptivity + goalOrientation) / 6
    );

    return {
      motivationLevel,
      selfDirectedLearning,
      adaptabilityToNewConcepts,
      collaborativeLearning,
      feedbackReceptivity,
      goalOrientation,
      overallLearningReadiness
    };
  }

  private assessMotivation(applicationData: any): number {
    let score = 50; // Base score

    const motivationFactors = applicationData.motivationFactors || [];
    const intrinsicFactors = motivationFactors.filter((f: any) => f.type === 'intrinsic');
    
    score += Math.min(30, intrinsicFactors.length * 10);

    if (applicationData.passionForLearning) score += 20;

    return Math.min(100, score);
  }

  private assessCollaborativeLearning(applicationData: any): number {
    let score = 60; // Base score

    if (applicationData.teamwork) score += 15;
    if (applicationData.peerLearning) score += 15;
    if (applicationData.groupProjects) score += 10;

    return Math.min(100, score);
  }

  private assessFeedbackReceptivity(applicationData: any): number {
    let score = 60; // Base score

    if (applicationData.seeksFeedback) score += 20;
    if (applicationData.implementsFeedback) score += 15;
    if (applicationData.growthMindset?.acceptsCriticism) score += 5;

    return Math.min(100, score);
  }

  private assessGoalOrientation(applicationData: any): number {
    let score = 55; // Base score

    if (applicationData.clearGoals) score += 20;
    if (applicationData.goalPersistence) score += 15;
    if (applicationData.goalAdjustment) score += 10;

    return Math.min(100, score);
  }

  private calculateOverallReadinessScore(
    cognitive: CognitiveReadiness,
    academic: AcademicPreparation,
    intellectual: IntellectualMaturity,
    learning: LearningReadiness
  ): number {
    // Weighted average with cognitive and academic preparation having higher weights
    return Math.round(
      (cognitive.overallCognitive * 0.3 +
       academic.overallPreparation * 0.3 +
       intellectual.overallMaturity * 0.2 +
       learning.overallLearningReadiness * 0.2)
    );
  }

  private determineReadinessLevel(readinessScore: number): ReadinessLevel {
    if (readinessScore >= 85) return ReadinessLevel.HIGHLY_READY;
    if (readinessScore >= 70) return ReadinessLevel.READY;
    if (readinessScore >= 55) return ReadinessLevel.CONDITIONALLY_READY;
    return ReadinessLevel.NOT_READY;
  }

  private determineRecommendedLevel(
    readinessScore: number,
    skills: SkillAssessment[],
    potential: PotentialScore
  ): AcademicLevel {
    const avgSkillScore = skills.reduce((sum, skill) => sum + skill.assessment.score, 0) / skills.length;
    
    if (readinessScore >= 85 && avgSkillScore >= 80 && potential.overallScore >= 80) {
      return AcademicLevel.GRADUATE;
    } else if (readinessScore >= 70 && avgSkillScore >= 65) {
      return AcademicLevel.UNDERGRADUATE;
    } else if (readinessScore >= 55) {
      return AcademicLevel.FOUNDATION;
    } else {
      return AcademicLevel.FOUNDATION; // With intensive support
    }
  }

  private generateRecommendations(
    cognitive: CognitiveReadiness,
    academic: AcademicPreparation,
    intellectual: IntellectualMaturity,
    learning: LearningReadiness,
    overallReadiness: ReadinessLevel
  ): ReadinessRecommendation[] {
    const recommendations: ReadinessRecommendation[] = [];

    // Cognitive recommendations
    if (cognitive.overallCognitive < 60) {
      recommendations.push({
        area: 'Cognitive Development',
        recommendation: 'Participate in cognitive skills training and brain training exercises',
        priority: 'high',
        timeframe: '3-6 months',
        expectedOutcome: 'Improved cognitive processing and reasoning abilities',
        resources: ['Cognitive training software', 'Logic puzzles', 'Memory exercises']
      });
    }

    // Academic preparation recommendations
    if (academic.overallPreparation < 65) {
      recommendations.push({
        area: 'Academic Preparation',
        recommendation: 'Complete foundational courses in identified weak areas',
        priority: 'critical',
        timeframe: '6-12 months',
        expectedOutcome: 'Strengthened academic foundation for university-level work',
        resources: ['Remedial courses', 'Tutoring services', 'Study skills workshops']
      });
    }

    // Study skills recommendations
    if (academic.studySkills < 60) {
      recommendations.push({
        area: 'Study Skills',
        recommendation: 'Develop effective study strategies and time management skills',
        priority: 'high',
        timeframe: '2-4 months',
        expectedOutcome: 'Improved academic performance and learning efficiency',
        resources: ['Study skills training', 'Time management workshops', 'Academic coaching']
      });
    }

    // Intellectual maturity recommendations
    if (intellectual.overallMaturity < 65) {
      recommendations.push({
        area: 'Intellectual Maturity',
        recommendation: 'Engage in activities that promote intellectual growth and self-reflection',
        priority: 'medium',
        timeframe: '6-12 months',
        expectedOutcome: 'Enhanced intellectual maturity and learning readiness',
        resources: ['Philosophy courses', 'Critical thinking workshops', 'Mentorship programs']
      });
    }

    // Learning readiness recommendations
    if (learning.overallLearningReadiness < 65) {
      recommendations.push({
        area: 'Learning Readiness',
        recommendation: 'Develop motivation and self-directed learning capabilities',
        priority: 'medium',
        timeframe: '3-6 months',
        expectedOutcome: 'Increased motivation and readiness for independent learning',
        resources: ['Goal-setting workshops', 'Self-directed learning courses', 'Motivation coaching']
      });
    }

    return recommendations;
  }

  private generateInterventions(
    cognitive: CognitiveReadiness,
    academic: AcademicPreparation,
    intellectual: IntellectualMaturity,
    learning: LearningReadiness,
    overallReadiness: ReadinessLevel
  ): ReadinessIntervention[] {
    const interventions: ReadinessIntervention[] = [];

    if (overallReadiness === ReadinessLevel.NOT_READY) {
      interventions.push({
        type: 'academic',
        intervention: 'Intensive academic preparation program',
        duration: '12-18 months',
        intensity: 'intensive',
        successCriteria: [
          'Achieve 70+ readiness score',
          'Complete all foundational requirements',
          'Demonstrate sustained academic performance'
        ],
        monitoring: 'Monthly progress assessments'
      });
    }

    if (cognitive.overallCognitive < 50) {
      interventions.push({
        type: 'cognitive',
        intervention: 'Cognitive enhancement program',
        duration: '6-9 months',
        intensity: 'moderate',
        successCriteria: [
          'Improve cognitive scores by 20+ points',
          'Demonstrate improved problem-solving abilities',
          'Show enhanced information processing speed'
        ],
        monitoring: 'Bi-weekly cognitive assessments'
      });
    }

    if (learning.motivationLevel < 50) {
      interventions.push({
        type: 'behavioral',
        intervention: 'Motivation enhancement and goal-setting program',
        duration: '3-6 months',
        intensity: 'moderate',
        successCriteria: [
          'Develop clear academic and career goals',
          'Demonstrate increased intrinsic motivation',
          'Show consistent engagement in learning activities'
        ],
        monitoring: 'Weekly motivation check-ins'
      });
    }

    if (academic.studySkills < 50) {
      interventions.push({
        type: 'support',
        intervention: 'Comprehensive study skills development',
        duration: '4-6 months',
        intensity: 'moderate',
        successCriteria: [
          'Master effective study techniques',
          'Demonstrate improved time management',
          'Show consistent academic performance'
        ],
        monitoring: 'Bi-weekly study skills assessment'
      });
    }

    return interventions;
  }

  private async storeReadinessAssessment(applicationId: string, assessment: ReadinessAssessment): Promise<void> {
    try {
      await this.prisma.intellectualReadinessAssessment.create({
        data: {
          applicationId,
          applicantId: assessment.applicantId,
          overallReadiness: assessment.overallReadiness,
          cognitiveReadiness: assessment.cognitiveReadiness,
          academicPreparation: assessment.academicPreparation,
          intellectualMaturity: assessment.intellectualMaturity,
          learningReadiness: assessment.learningReadiness,
          recommendedLevel: assessment.recommendedLevel,
          readinessScore: assessment.readinessScore,
          recommendations: assessment.recommendations,
          interventions: assessment.interventions,
          assessedAt: assessment.assessedAt
        }
      });
    } catch (error) {
      logger.error('Failed to store readiness assessment:', error);
      // Don't throw error - assessment can still be returned even if storage fails
    }
  }
}