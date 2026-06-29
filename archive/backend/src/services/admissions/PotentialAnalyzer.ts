import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { PerformanceMetrics, SkillAssessment, PotentialScore, CapacityAssessment } from './AcademicEvaluator';

export interface LearningPattern {
  adaptabilityScore: number;
  persistenceIndicators: string[];
  learningStylePreferences: LearningStyle[];
  motivationFactors: MotivationFactor[];
  challengeResponse: ChallengeResponse;
}

export enum LearningStyle {
  VISUAL = 'visual',
  AUDITORY = 'auditory',
  KINESTHETIC = 'kinesthetic',
  READING_WRITING = 'reading_writing',
  MULTIMODAL = 'multimodal'
}

export interface MotivationFactor {
  type: 'intrinsic' | 'extrinsic';
  factor: string;
  strength: number; // 1-10 scale
}

export interface ChallengeResponse {
  resilience: number;
  adaptability: number;
  problemSolvingApproach: string;
  supportSeeking: number;
  growthMindset: number;
}

export interface GrowthIndicator {
  area: string;
  currentLevel: number;
  projectedGrowth: number;
  timeframe: string;
  confidence: number;
  supportRequired: string[];
}

export interface IntellectualCapacityMetrics {
  abstractReasoning: number;
  patternRecognition: number;
  conceptualThinking: number;
  analyticalSkills: number;
  synthesisAbility: number;
  creativeProblemSolving: number;
  metacognition: number;
}

export interface LearningPotentialReport {
  applicantId: string;
  overallPotential: PotentialScore;
  learningPatterns: LearningPattern;
  growthIndicators: GrowthIndicator[];
  intellectualCapacity: IntellectualCapacityMetrics;
  recommendations: PotentialRecommendation[];
  riskFactors: RiskFactor[];
  successPredictors: SuccessPredictor[];
  generatedAt: Date;
}

export interface PotentialRecommendation {
  category: 'academic' | 'support' | 'enrichment' | 'intervention';
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: string;
  resources: string[];
}

export interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high';
  mitigation: string[];
  monitoring: string;
}

export interface SuccessPredictor {
  predictor: string;
  strength: number; // 1-10 scale
  evidence: string[];
  correlation: number; // correlation with success
}

export class PotentialAnalyzer {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async analyzeLearningPotential(
    applicationId: string,
    performance: PerformanceMetrics,
    skills: SkillAssessment[]
  ): Promise<LearningPotentialReport> {
    try {
      logger.info(`Starting learning potential analysis for application ${applicationId}`);

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

      // Analyze overall potential
      const overallPotential = this.calculateOverallPotential(performance, skills, application.applicationData);

      // Identify learning patterns
      const learningPatterns = this.identifyLearningPatterns(application.applicationData, skills);

      // Project growth indicators
      const growthIndicators = this.projectGrowthIndicators(skills, performance, application.applicationData);

      // Assess intellectual capacity
      const intellectualCapacity = this.assessIntellectualCapacity(skills, performance, application.applicationData);

      // Generate recommendations
      const recommendations = this.generateRecommendations(overallPotential, learningPatterns, growthIndicators);

      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(performance, skills, application.applicationData);

      // Identify success predictors
      const successPredictors = this.identifySuccessPredictors(performance, skills, application.applicationData);

      const report: LearningPotentialReport = {
        applicantId: application.applicantId,
        overallPotential,
        learningPatterns,
        growthIndicators,
        intellectualCapacity,
        recommendations,
        riskFactors,
        successPredictors,
        generatedAt: new Date()
      };

      // Store the analysis
      await this.storePotentialAnalysis(applicationId, report);

      logger.info(`Learning potential analysis completed for application ${applicationId}`);
      return report;

    } catch (error) {
      logger.error(`Learning potential analysis failed for application ${applicationId}:`, error);
      throw error;
    }
  }

  private calculateOverallPotential(
    performance: PerformanceMetrics,
    skills: SkillAssessment[],
    applicationData: any
  ): PotentialScore {
    // Calculate base scores
    const avgSkillScore = skills.reduce((sum, skill) => sum + skill.assessment.score, 0) / skills.length;
    const gpaFactor = (performance.overallGPA / 4.0) * 100;
    
    // Factor in test scores
    let testScoreFactor = 70; // Default if no test scores
    if (performance.standardizedTestScores.length > 0) {
      testScoreFactor = performance.standardizedTestScores.reduce((sum, test) => sum + test.percentile, 0) / performance.standardizedTestScores.length;
    }

    // Factor in achievements and research
    const achievementBonus = Math.min(20, performance.academicAchievements.length * 5);
    const researchBonus = Math.min(15, performance.researchExperience.length * 7);
    const publicationBonus = Math.min(10, performance.publicationHistory.length * 5);

    // Calculate component scores
    const learningAgility = this.calculateLearningAgility(avgSkillScore, applicationData);
    const adaptability = this.calculateAdaptability(applicationData, skills);
    const problemSolving = this.calculateProblemSolving(skills, performance);
    const creativity = this.calculateCreativity(applicationData, performance);
    const persistence = this.calculatePersistence(performance, applicationData);

    const overallScore = Math.round(
      (avgSkillScore * 0.3 + 
       gpaFactor * 0.25 + 
       testScoreFactor * 0.2 + 
       achievementBonus * 0.1 + 
       researchBonus * 0.1 + 
       publicationBonus * 0.05) * 
      (1 + (learningAgility + adaptability + problemSolving + creativity + persistence) / 500)
    );

    return {
      overallScore: Math.min(100, overallScore),
      learningAgility,
      adaptability,
      problemSolving,
      creativity,
      persistence
    };
  }

  private calculateLearningAgility(avgSkillScore: number, applicationData: any): number {
    let agility = avgSkillScore * 0.8;

    // Boost for diverse learning experiences
    const learningExperiences = applicationData.learningExperiences || [];
    agility += Math.min(15, learningExperiences.length * 3);

    // Boost for self-directed learning
    if (applicationData.selfDirectedLearning) {
      agility += 10;
    }

    // Boost for language learning
    const languages = applicationData.languages || [];
    agility += Math.min(10, (languages.length - 1) * 5); // -1 for native language

    return Math.min(100, Math.round(agility));
  }

  private calculateAdaptability(applicationData: any, skills: SkillAssessment[]): number {
    let adaptability = 60; // Base score

    // Factor in diverse experiences
    const experiences = applicationData.experiences || [];
    adaptability += Math.min(20, experiences.length * 2);

    // Factor in cultural exposure
    if (applicationData.culturalExposure) {
      adaptability += 15;
    }

    // Factor in technology adaptation
    if (applicationData.technologySkills) {
      adaptability += 10;
    }

    // Factor in skill diversity
    const skillVariance = this.calculateSkillVariance(skills);
    adaptability += Math.min(15, skillVariance * 3);

    return Math.min(100, Math.round(adaptability));
  }

  private calculateProblemSolving(skills: SkillAssessment[], performance: PerformanceMetrics): number {
    // Base on critical thinking and analytical reasoning skills
    const criticalThinking = skills.find(s => s.skill === 'critical_thinking')?.assessment.score || 50;
    const analyticalReasoning = skills.find(s => s.skill === 'analytical_reasoning')?.assessment.score || 50;
    const mathematics = skills.find(s => s.skill === 'mathematics')?.assessment.score || 50;

    let problemSolving = (criticalThinking + analyticalReasoning + mathematics) / 3;

    // Boost for research experience
    problemSolving += Math.min(15, performance.researchExperience.length * 5);

    // Boost for complex projects
    problemSolving += Math.min(10, performance.academicAchievements.filter(a => a.type === 'project').length * 3);

    return Math.min(100, Math.round(problemSolving));
  }

  private calculateCreativity(applicationData: any, performance: PerformanceMetrics): number {
    let creativity = 50; // Base score

    // Factor in creative works
    const creativeWorks = applicationData.creativeWorks || [];
    creativity += Math.min(25, creativeWorks.length * 5);

    // Factor in innovative projects
    const innovations = performance.academicAchievements.filter(a => a.type === 'innovation').length;
    creativity += Math.min(20, innovations * 10);

    // Factor in artistic pursuits
    if (applicationData.artisticPursuits) {
      creativity += 15;
    }

    // Factor in interdisciplinary work
    if (applicationData.interdisciplinaryWork) {
      creativity += 10;
    }

    return Math.min(100, Math.round(creativity));
  }

  private calculatePersistence(performance: PerformanceMetrics, applicationData: any): number {
    let persistence = performance.overallGPA * 20; // GPA as persistence indicator

    // Factor in long-term commitments
    const longTermCommitments = applicationData.longTermCommitments || [];
    persistence += Math.min(20, longTermCommitments.length * 5);

    // Factor in overcoming challenges
    const challengesOvercome = applicationData.challengesOvercome || [];
    persistence += Math.min(25, challengesOvercome.length * 8);

    // Factor in consistent improvement
    if (applicationData.consistentImprovement) {
      persistence += 15;
    }

    return Math.min(100, Math.round(persistence));
  }

  private calculateSkillVariance(skills: SkillAssessment[]): number {
    const scores = skills.map(s => s.assessment.score);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    return Math.sqrt(variance);
  }

  private identifyLearningPatterns(applicationData: any, skills: SkillAssessment[]): LearningPattern {
    const adaptabilityScore = this.calculateAdaptability(applicationData, skills);
    
    const persistenceIndicators = this.identifyPersistenceIndicators(applicationData);
    const learningStylePreferences = this.identifyLearningStyles(applicationData);
    const motivationFactors = this.identifyMotivationFactors(applicationData);
    const challengeResponse = this.assessChallengeResponse(applicationData);

    return {
      adaptabilityScore,
      persistenceIndicators,
      learningStylePreferences,
      motivationFactors,
      challengeResponse
    };
  }

  private identifyPersistenceIndicators(applicationData: any): string[] {
    const indicators: string[] = [];

    if (applicationData.longTermCommitments?.length > 0) {
      indicators.push('Demonstrates long-term commitment');
    }

    if (applicationData.challengesOvercome?.length > 0) {
      indicators.push('History of overcoming challenges');
    }

    if (applicationData.consistentImprovement) {
      indicators.push('Shows consistent improvement over time');
    }

    if (applicationData.selfDirectedLearning) {
      indicators.push('Engages in self-directed learning');
    }

    return indicators;
  }

  private identifyLearningStyles(applicationData: any): LearningStyle[] {
    const styles: LearningStyle[] = [];

    // Analyze preferences from application data
    const preferences = applicationData.learningPreferences || {};

    if (preferences.visual || applicationData.visualLearning) {
      styles.push(LearningStyle.VISUAL);
    }

    if (preferences.auditory || applicationData.auditoryLearning) {
      styles.push(LearningStyle.AUDITORY);
    }

    if (preferences.kinesthetic || applicationData.handsOnLearning) {
      styles.push(LearningStyle.KINESTHETIC);
    }

    if (preferences.readingWriting || applicationData.textBasedLearning) {
      styles.push(LearningStyle.READING_WRITING);
    }

    // Default to multimodal if multiple styles or none specified
    if (styles.length > 1 || styles.length === 0) {
      styles.push(LearningStyle.MULTIMODAL);
    }

    return styles;
  }

  private identifyMotivationFactors(applicationData: any): MotivationFactor[] {
    const factors: MotivationFactor[] = [];

    // Intrinsic motivations
    if (applicationData.curiosityDriven) {
      factors.push({
        type: 'intrinsic',
        factor: 'Intellectual curiosity',
        strength: 8
      });
    }

    if (applicationData.passionForLearning) {
      factors.push({
        type: 'intrinsic',
        factor: 'Love of learning',
        strength: 9
      });
    }

    if (applicationData.personalGrowth) {
      factors.push({
        type: 'intrinsic',
        factor: 'Personal development',
        strength: 7
      });
    }

    // Extrinsic motivations
    if (applicationData.careerGoals) {
      factors.push({
        type: 'extrinsic',
        factor: 'Career advancement',
        strength: 6
      });
    }

    if (applicationData.familyExpectations) {
      factors.push({
        type: 'extrinsic',
        factor: 'Family expectations',
        strength: 5
      });
    }

    return factors;
  }

  private assessChallengeResponse(applicationData: any): ChallengeResponse {
    const challenges = applicationData.challengesOvercome || [];
    
    return {
      resilience: this.calculateResilience(challenges),
      adaptability: this.calculateAdaptabilityFromChallenges(challenges),
      problemSolvingApproach: this.identifyProblemSolvingApproach(applicationData),
      supportSeeking: this.calculateSupportSeeking(applicationData),
      growthMindset: this.calculateGrowthMindset(applicationData)
    };
  }

  private calculateResilience(challenges: any[]): number {
    if (challenges.length === 0) return 50; // Default
    
    const severeChallenges = challenges.filter(c => c.severity === 'high').length;
    const overcomeChallenges = challenges.filter(c => c.outcome === 'overcome').length;
    
    const resilienceScore = (overcomeChallenges / challenges.length) * 100;
    const severityBonus = severeChallenges * 10;
    
    return Math.min(100, Math.round(resilienceScore + severityBonus));
  }

  private calculateAdaptabilityFromChallenges(challenges: any[]): number {
    const adaptiveResponses = challenges.filter(c => c.response === 'adaptive').length;
    if (challenges.length === 0) return 50;
    
    return Math.round((adaptiveResponses / challenges.length) * 100);
  }

  private identifyProblemSolvingApproach(applicationData: any): string {
    const approaches = applicationData.problemSolvingApproaches || [];
    
    if (approaches.includes('systematic')) return 'Systematic and methodical';
    if (approaches.includes('creative')) return 'Creative and innovative';
    if (approaches.includes('collaborative')) return 'Collaborative and consultative';
    
    return 'Balanced approach';
  }

  private calculateSupportSeeking(applicationData: any): number {
    const supportBehaviors = applicationData.supportSeeking || {};
    
    let score = 50; // Base score
    
    if (supportBehaviors.mentorship) score += 20;
    if (supportBehaviors.peerSupport) score += 15;
    if (supportBehaviors.professionalHelp) score += 15;
    
    return Math.min(100, score);
  }

  private calculateGrowthMindset(applicationData: any): number {
    const mindsetIndicators = applicationData.growthMindset || {};
    
    let score = 50; // Base score
    
    if (mindsetIndicators.embracesChallenges) score += 20;
    if (mindsetIndicators.learnsFromFailure) score += 20;
    if (mindsetIndicators.persistsThoughObstacles) score += 15;
    if (mindsetIndicators.seesEffortAsPath) score += 15;
    
    return Math.min(100, score);
  }

  private projectGrowthIndicators(
    skills: SkillAssessment[],
    performance: PerformanceMetrics,
    applicationData: any
  ): GrowthIndicator[] {
    const indicators: GrowthIndicator[] = [];

    // Project growth for each skill
    skills.forEach(skill => {
      const currentLevel = this.skillLevelToNumber(skill.currentLevel);
      const projectedGrowth = this.projectSkillGrowth(skill, performance, applicationData);
      
      indicators.push({
        area: skill.skill.replace('_', ' '),
        currentLevel,
        projectedGrowth,
        timeframe: skill.developmentPlan.estimatedTimeframe,
        confidence: this.calculateGrowthConfidence(skill, performance),
        supportRequired: skill.developmentPlan.resources
      });
    });

    // Project overall academic growth
    indicators.push({
      area: 'Overall Academic Performance',
      currentLevel: performance.overallGPA * 25, // Convert to 100 scale
      projectedGrowth: this.projectOverallGrowth(performance, applicationData),
      timeframe: '1-2 years',
      confidence: this.calculateOverallGrowthConfidence(performance, applicationData),
      supportRequired: ['Academic advising', 'Study skills support', 'Regular monitoring']
    });

    return indicators;
  }

  private skillLevelToNumber(level: string): number {
    const levelMap: { [key: string]: number } = {
      'beginner': 25,
      'intermediate': 50,
      'advanced': 75,
      'expert': 100
    };
    return levelMap[level] || 50;
  }

  private projectSkillGrowth(skill: SkillAssessment, performance: PerformanceMetrics, applicationData: any): number {
    const currentScore = skill.assessment.score;
    const maxPossibleGrowth = 100 - currentScore;
    
    // Base growth potential
    let growthPotential = maxPossibleGrowth * 0.6; // Assume 60% of max possible
    
    // Adjust based on learning indicators
    if (applicationData.selfDirectedLearning) {
      growthPotential *= 1.2;
    }
    
    if (performance.overallGPA > 3.5) {
      growthPotential *= 1.1;
    }
    
    // Adjust based on current level (easier to grow from lower levels)
    if (currentScore < 50) {
      growthPotential *= 1.3;
    } else if (currentScore > 80) {
      growthPotential *= 0.7;
    }
    
    return Math.min(maxPossibleGrowth, Math.round(growthPotential));
  }

  private calculateGrowthConfidence(skill: SkillAssessment, performance: PerformanceMetrics): number {
    let confidence = 70; // Base confidence
    
    // Higher confidence for students with good track record
    if (performance.overallGPA > 3.5) {
      confidence += 15;
    }
    
    // Lower confidence for very low current scores
    if (skill.assessment.score < 40) {
      confidence -= 20;
    }
    
    // Higher confidence for skills with clear development path
    if (skill.developmentPlan.recommendedCourses.length > 0) {
      confidence += 10;
    }
    
    return Math.min(100, Math.max(30, confidence));
  }

  private projectOverallGrowth(performance: PerformanceMetrics, applicationData: any): number {
    const currentGPA = performance.overallGPA;
    const maxGrowth = (4.0 - currentGPA) * 25; // Convert to 100 scale
    
    let projectedGrowth = maxGrowth * 0.5; // Conservative estimate
    
    // Adjust based on trend
    if (applicationData.improvingTrend) {
      projectedGrowth *= 1.4;
    }
    
    // Adjust based on motivation
    if (applicationData.highMotivation) {
      projectedGrowth *= 1.2;
    }
    
    return Math.round(projectedGrowth);
  }

  private calculateOverallGrowthConfidence(performance: PerformanceMetrics, applicationData: any): number {
    let confidence = 60;
    
    if (applicationData.improvingTrend) confidence += 20;
    if (applicationData.consistentPerformance) confidence += 15;
    if (performance.overallGPA > 3.0) confidence += 10;
    
    return Math.min(95, confidence);
  }

  private assessIntellectualCapacity(
    skills: SkillAssessment[],
    performance: PerformanceMetrics,
    applicationData: any
  ): IntellectualCapacityMetrics {
    const criticalThinking = skills.find(s => s.skill === 'critical_thinking')?.assessment.score || 50;
    const analyticalReasoning = skills.find(s => s.skill === 'analytical_reasoning')?.assessment.score || 50;
    const mathematics = skills.find(s => s.skill === 'mathematics')?.assessment.score || 50;

    return {
      abstractReasoning: Math.round((criticalThinking + mathematics) / 2),
      patternRecognition: Math.round((analyticalReasoning + mathematics) / 2),
      conceptualThinking: criticalThinking,
      analyticalSkills: analyticalReasoning,
      synthesisAbility: Math.round((criticalThinking + analyticalReasoning) / 2),
      creativeProblemSolving: this.calculateCreativity(applicationData, performance),
      metacognition: this.calculateMetacognition(applicationData, skills)
    };
  }

  private calculateMetacognition(applicationData: any, skills: SkillAssessment[]): number {
    let metacognition = 50; // Base score
    
    if (applicationData.selfReflection) metacognition += 20;
    if (applicationData.learningStrategies) metacognition += 15;
    if (applicationData.selfAssessment) metacognition += 15;
    
    return Math.min(100, metacognition);
  }

  private generateRecommendations(
    potential: PotentialScore,
    patterns: LearningPattern,
    indicators: GrowthIndicator[]
  ): PotentialRecommendation[] {
    const recommendations: PotentialRecommendation[] = [];

    // Academic recommendations
    if (potential.overallScore < 70) {
      recommendations.push({
        category: 'academic',
        recommendation: 'Enroll in foundational courses to strengthen core skills',
        priority: 'high',
        expectedImpact: 'Significant improvement in academic readiness',
        resources: ['Tutoring services', 'Study skills workshops', 'Academic coaching']
      });
    }

    // Support recommendations
    if (patterns.challengeResponse.supportSeeking < 60) {
      recommendations.push({
        category: 'support',
        recommendation: 'Develop support-seeking behaviors and build mentor relationships',
        priority: 'medium',
        expectedImpact: 'Improved resilience and problem-solving',
        resources: ['Mentorship program', 'Peer support groups', 'Counseling services']
      });
    }

    // Enrichment recommendations
    if (potential.creativity > 80) {
      recommendations.push({
        category: 'enrichment',
        recommendation: 'Participate in creative and innovative projects',
        priority: 'medium',
        expectedImpact: 'Enhanced creative problem-solving abilities',
        resources: ['Innovation labs', 'Creative workshops', 'Research opportunities']
      });
    }

    return recommendations;
  }

  private identifyRiskFactors(
    performance: PerformanceMetrics,
    skills: SkillAssessment[],
    applicationData: any
  ): RiskFactor[] {
    const risks: RiskFactor[] = [];

    // Academic risk factors
    if (performance.overallGPA < 2.5) {
      risks.push({
        factor: 'Low academic performance history',
        severity: 'high',
        mitigation: ['Academic support services', 'Study skills training', 'Regular monitoring'],
        monitoring: 'Weekly academic progress reviews'
      });
    }

    // Skill-based risk factors
    const lowSkills = skills.filter(s => s.assessment.score < 50);
    if (lowSkills.length > 3) {
      risks.push({
        factor: 'Multiple skill deficiencies',
        severity: 'high',
        mitigation: ['Intensive skill development program', 'Extended orientation', 'Reduced course load'],
        monitoring: 'Bi-weekly skill assessment'
      });
    }

    // Motivation risk factors
    const motivationFactors = applicationData.motivationFactors || [];
    const intrinsicMotivation = motivationFactors.filter((f: any) => f.type === 'intrinsic').length;
    if (intrinsicMotivation === 0) {
      risks.push({
        factor: 'Lack of intrinsic motivation',
        severity: 'medium',
        mitigation: ['Career counseling', 'Purpose exploration workshops', 'Mentorship'],
        monitoring: 'Monthly motivation assessment'
      });
    }

    return risks;
  }

  private identifySuccessPredictors(
    performance: PerformanceMetrics,
    skills: SkillAssessment[],
    applicationData: any
  ): SuccessPredictor[] {
    const predictors: SuccessPredictor[] = [];

    // Academic predictors
    if (performance.overallGPA > 3.5) {
      predictors.push({
        predictor: 'Strong academic track record',
        strength: 9,
        evidence: [`GPA: ${performance.overallGPA}`, 'Consistent high performance'],
        correlation: 0.85
      });
    }

    // Skill predictors
    const strongSkills = skills.filter(s => s.assessment.score > 80);
    if (strongSkills.length > 0) {
      predictors.push({
        predictor: 'Strong foundational skills',
        strength: 8,
        evidence: strongSkills.map(s => `${s.skill}: ${s.assessment.score}%`),
        correlation: 0.78
      });
    }

    // Motivation predictors
    if (applicationData.passionForLearning) {
      predictors.push({
        predictor: 'Intrinsic motivation for learning',
        strength: 8,
        evidence: ['Self-reported passion for learning', 'Evidence of self-directed study'],
        correlation: 0.72
      });
    }

    // Resilience predictors
    const challengesOvercome = applicationData.challengesOvercome || [];
    if (challengesOvercome.length > 0) {
      predictors.push({
        predictor: 'Demonstrated resilience',
        strength: 7,
        evidence: [`Overcame ${challengesOvercome.length} significant challenges`],
        correlation: 0.68
      });
    }

    return predictors;
  }

  private async storePotentialAnalysis(applicationId: string, report: LearningPotentialReport): Promise<void> {
    try {
      await this.prisma.learningPotentialAnalysis.create({
        data: {
          applicationId,
          applicantId: report.applicantId,
          overallPotential: report.overallPotential,
          learningPatterns: report.learningPatterns,
          growthIndicators: report.growthIndicators,
          intellectualCapacity: report.intellectualCapacity,
          recommendations: report.recommendations,
          riskFactors: report.riskFactors,
          successPredictors: report.successPredictors,
          generatedAt: report.generatedAt
        }
      });
    } catch (error) {
      logger.error('Failed to store potential analysis:', error);
      // Don't throw error - analysis can still be returned even if storage fails
    }
  }
}