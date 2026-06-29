import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface EducationRecord {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  gpa: number;
  graduationDate: Date;
  accreditation: string;
  transcriptVerified: boolean;
}

export interface PerformanceMetrics {
  overallGPA: number;
  standardizedTestScores: TestScore[];
  academicAchievements: Achievement[];
  researchExperience: ResearchRecord[];
  publicationHistory: Publication[];
}

export interface TestScore {
  testType: string;
  score: number;
  maxScore: number;
  percentile: number;
  testDate: Date;
}

export interface Achievement {
  type: string;
  title: string;
  description: string;
  dateReceived: Date;
  verificationStatus: string;
}

export interface ResearchRecord {
  title: string;
  institution: string;
  supervisor: string;
  duration: string;
  description: string;
  outcomes: string[];
}

export interface Publication {
  title: string;
  journal: string;
  publicationDate: Date;
  authors: string[];
  citationCount: number;
}

export interface AcademicEvaluation {
  id: string;
  applicationId: string;
  previousEducation: EducationRecord[];
  academicPerformance: PerformanceMetrics;
  coreSkills: SkillAssessment[];
  learningPotential: PotentialScore;
  intellectualCapacity: CapacityAssessment;
  recommendedLevel: AcademicLevel;
  supportNeeds: SupportRequirement[];
  evaluatedAt: Date;
}

export interface SkillAssessment {
  skill: CoreSkill;
  currentLevel: SkillLevel;
  assessment: AssessmentResult;
  developmentPlan: DevelopmentPlan;
}

export enum CoreSkill {
  MATHEMATICS = 'mathematics',
  SCIENCE = 'science',
  LANGUAGE_ARTS = 'language_arts',
  CRITICAL_THINKING = 'critical_thinking',
  RESEARCH_METHODOLOGY = 'research_methodology',
  ANALYTICAL_REASONING = 'analytical_reasoning',
  WRITTEN_COMMUNICATION = 'written_communication',
  BIBLICAL_LITERACY = 'biblical_literacy'
}

export enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export interface AssessmentResult {
  score: number;
  maxScore: number;
  percentile: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface DevelopmentPlan {
  targetLevel: SkillLevel;
  recommendedCourses: string[];
  estimatedTimeframe: string;
  prerequisites: string[];
  resources: string[];
}

export interface PotentialScore {
  overallScore: number;
  learningAgility: number;
  adaptability: number;
  problemSolving: number;
  creativity: number;
  persistence: number;
}

export interface CapacityAssessment {
  intellectualCuriosity: number;
  abstractThinking: number;
  synthesisAbility: number;
  criticalAnalysis: number;
  informationProcessing: number;
  conceptualUnderstanding: number;
}

export enum AcademicLevel {
  FOUNDATION = 'foundation',
  UNDERGRADUATE = 'undergraduate',
  GRADUATE = 'graduate',
  DOCTORAL = 'doctoral',
  POST_DOCTORAL = 'post_doctoral'
}

export interface SupportRequirement {
  type: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedCost: number;
  resources: string[];
}

export class AcademicEvaluator {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async evaluateAcademicPerformance(applicationId: string): Promise<AcademicEvaluation> {
    try {
      logger.info(`Starting academic evaluation for application ${applicationId}`);

      // Get application data
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

      // Extract education records from application data
      const previousEducation = this.extractEducationRecords(application.applicationData);
      
      // Evaluate academic performance
      const academicPerformance = this.evaluatePerformanceMetrics(previousEducation, application.applicationData);
      
      // Assess core skills
      const coreSkills = await this.assessCoreSkills(application.applicationData);
      
      // Analyze learning potential
      const learningPotential = this.analyzeLearningPotential(academicPerformance, coreSkills);
      
      // Assess intellectual capacity
      const intellectualCapacity = this.assessIntellectualCapacity(application.applicationData, coreSkills);
      
      // Determine recommended level
      const recommendedLevel = this.determineRecommendedLevel(academicPerformance, coreSkills, learningPotential);
      
      // Identify support needs
      const supportNeeds = this.identifySupportNeeds(coreSkills, intellectualCapacity);

      const evaluation: AcademicEvaluation = {
        id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        applicationId,
        previousEducation,
        academicPerformance,
        coreSkills,
        learningPotential,
        intellectualCapacity,
        recommendedLevel,
        supportNeeds,
        evaluatedAt: new Date()
      };

      // Store evaluation in database
      await this.storeEvaluation(evaluation);

      logger.info(`Academic evaluation completed for application ${applicationId}`);
      return evaluation;

    } catch (error) {
      logger.error(`Academic evaluation failed for application ${applicationId}:`, error);
      throw error;
    }
  }

  private extractEducationRecords(applicationData: any): EducationRecord[] {
    const educationData = applicationData.education || [];
    return educationData.map((edu: any) => ({
      institution: edu.institution || '',
      degree: edu.degree || '',
      fieldOfStudy: edu.fieldOfStudy || '',
      gpa: parseFloat(edu.gpa) || 0,
      graduationDate: new Date(edu.graduationDate),
      accreditation: edu.accreditation || '',
      transcriptVerified: edu.transcriptVerified || false
    }));
  }

  private evaluatePerformanceMetrics(education: EducationRecord[], applicationData: any): PerformanceMetrics {
    const testScores = (applicationData.testScores || []).map((test: any) => ({
      testType: test.type,
      score: test.score,
      maxScore: test.maxScore,
      percentile: test.percentile,
      testDate: new Date(test.date)
    }));

    const achievements = (applicationData.achievements || []).map((achievement: any) => ({
      type: achievement.type,
      title: achievement.title,
      description: achievement.description,
      dateReceived: new Date(achievement.date),
      verificationStatus: achievement.verified ? 'verified' : 'pending'
    }));

    const researchExperience = (applicationData.research || []).map((research: any) => ({
      title: research.title,
      institution: research.institution,
      supervisor: research.supervisor,
      duration: research.duration,
      description: research.description,
      outcomes: research.outcomes || []
    }));

    const publicationHistory = (applicationData.publications || []).map((pub: any) => ({
      title: pub.title,
      journal: pub.journal,
      publicationDate: new Date(pub.date),
      authors: pub.authors || [],
      citationCount: pub.citations || 0
    }));

    return {
      overallGPA: this.calculateOverallGPA(education),
      standardizedTestScores: testScores,
      academicAchievements: achievements,
      researchExperience,
      publicationHistory
    };
  }

  private calculateOverallGPA(education: EducationRecord[]): number {
    if (education.length === 0) return 0;
    const totalGPA = education.reduce((sum, edu) => sum + edu.gpa, 0);
    return totalGPA / education.length;
  }

  private async assessCoreSkills(applicationData: any): Promise<SkillAssessment[]> {
    const skills = Object.values(CoreSkill);
    const assessments: SkillAssessment[] = [];

    for (const skill of skills) {
      const assessment = await this.assessIndividualSkill(skill, applicationData);
      assessments.push(assessment);
    }

    return assessments;
  }

  private async assessIndividualSkill(skill: CoreSkill, applicationData: any): Promise<SkillAssessment> {
    // Simulate skill assessment based on application data
    const skillData = applicationData.skillAssessments?.[skill] || {};
    
    const score = skillData.score || this.generateSkillScore(skill, applicationData);
    const maxScore = 100;
    const percentile = this.calculatePercentile(score, maxScore);
    
    const currentLevel = this.determineSkillLevel(score);
    const strengths = this.identifySkillStrengths(skill, score, applicationData);
    const weaknesses = this.identifySkillWeaknesses(skill, score, applicationData);
    const recommendations = this.generateSkillRecommendations(skill, currentLevel, weaknesses);

    const assessmentResult: AssessmentResult = {
      score,
      maxScore,
      percentile,
      strengths,
      weaknesses,
      recommendations
    };

    const developmentPlan: DevelopmentPlan = {
      targetLevel: this.getTargetLevel(currentLevel),
      recommendedCourses: this.getRecommendedCourses(skill, currentLevel),
      estimatedTimeframe: this.estimateTimeframe(currentLevel, this.getTargetLevel(currentLevel)),
      prerequisites: this.getPrerequisites(skill, currentLevel),
      resources: this.getResources(skill)
    };

    return {
      skill,
      currentLevel,
      assessment: assessmentResult,
      developmentPlan
    };
  }

  private generateSkillScore(skill: CoreSkill, applicationData: any): number {
    // Generate score based on available data
    let baseScore = 50; // Default middle score

    // Adjust based on education level
    const education = applicationData.education || [];
    if (education.length > 0) {
      const avgGPA = education.reduce((sum: number, edu: any) => sum + (edu.gpa || 0), 0) / education.length;
      baseScore += (avgGPA - 2.5) * 20; // Adjust based on GPA
    }

    // Adjust based on test scores
    const testScores = applicationData.testScores || [];
    if (testScores.length > 0) {
      const avgPercentile = testScores.reduce((sum: number, test: any) => sum + (test.percentile || 50), 0) / testScores.length;
      baseScore = (baseScore + avgPercentile) / 2;
    }

    // Skill-specific adjustments
    switch (skill) {
      case CoreSkill.BIBLICAL_LITERACY:
        if (applicationData.spiritualFormation?.biblicalStudies) {
          baseScore += 15;
        }
        break;
      case CoreSkill.RESEARCH_METHODOLOGY:
        if (applicationData.research?.length > 0) {
          baseScore += 20;
        }
        break;
      case CoreSkill.WRITTEN_COMMUNICATION:
        if (applicationData.publications?.length > 0) {
          baseScore += 25;
        }
        break;
    }

    return Math.min(100, Math.max(0, Math.round(baseScore)));
  }

  private calculatePercentile(score: number, maxScore: number): number {
    return Math.round((score / maxScore) * 100);
  }

  private determineSkillLevel(score: number): SkillLevel {
    if (score >= 85) return SkillLevel.EXPERT;
    if (score >= 70) return SkillLevel.ADVANCED;
    if (score >= 50) return SkillLevel.INTERMEDIATE;
    return SkillLevel.BEGINNER;
  }

  private identifySkillStrengths(skill: CoreSkill, score: number, applicationData: any): string[] {
    const strengths: string[] = [];
    
    if (score >= 70) {
      strengths.push(`Strong foundation in ${skill.replace('_', ' ')}`);
    }
    
    // Skill-specific strengths
    switch (skill) {
      case CoreSkill.CRITICAL_THINKING:
        if (applicationData.research?.length > 0) {
          strengths.push('Demonstrated research experience');
        }
        break;
      case CoreSkill.WRITTEN_COMMUNICATION:
        if (applicationData.publications?.length > 0) {
          strengths.push('Published academic work');
        }
        break;
    }

    return strengths;
  }

  private identifySkillWeaknesses(skill: CoreSkill, score: number, applicationData: any): string[] {
    const weaknesses: string[] = [];
    
    if (score < 50) {
      weaknesses.push(`Needs development in ${skill.replace('_', ' ')}`);
    }
    
    return weaknesses;
  }

  private generateSkillRecommendations(skill: CoreSkill, currentLevel: SkillLevel, weaknesses: string[]): string[] {
    const recommendations: string[] = [];
    
    if (currentLevel === SkillLevel.BEGINNER) {
      recommendations.push(`Complete foundational courses in ${skill.replace('_', ' ')}`);
    }
    
    if (weaknesses.length > 0) {
      recommendations.push('Focus on identified areas of improvement');
    }
    
    return recommendations;
  }

  private getTargetLevel(currentLevel: SkillLevel): SkillLevel {
    switch (currentLevel) {
      case SkillLevel.BEGINNER:
        return SkillLevel.INTERMEDIATE;
      case SkillLevel.INTERMEDIATE:
        return SkillLevel.ADVANCED;
      case SkillLevel.ADVANCED:
        return SkillLevel.EXPERT;
      default:
        return currentLevel;
    }
  }

  private getRecommendedCourses(skill: CoreSkill, currentLevel: SkillLevel): string[] {
    const courses: { [key: string]: string[] } = {
      [CoreSkill.MATHEMATICS]: ['College Algebra', 'Calculus I', 'Statistics'],
      [CoreSkill.SCIENCE]: ['General Biology', 'Chemistry', 'Physics'],
      [CoreSkill.LANGUAGE_ARTS]: ['Composition', 'Literature', 'Advanced Writing'],
      [CoreSkill.CRITICAL_THINKING]: ['Logic', 'Philosophy', 'Research Methods'],
      [CoreSkill.BIBLICAL_LITERACY]: ['Old Testament Survey', 'New Testament Survey', 'Biblical Hermeneutics']
    };
    
    return courses[skill] || [];
  }

  private estimateTimeframe(currentLevel: SkillLevel, targetLevel: SkillLevel): string {
    if (currentLevel === targetLevel) return 'Already at target level';
    return '6-12 months';
  }

  private getPrerequisites(skill: CoreSkill, currentLevel: SkillLevel): string[] {
    if (currentLevel === SkillLevel.BEGINNER) {
      return ['High school diploma or equivalent'];
    }
    return [];
  }

  private getResources(skill: CoreSkill): string[] {
    return [
      'Online learning platforms',
      'Academic textbooks',
      'Practice exercises',
      'Tutoring support'
    ];
  }

  private analyzeLearningPotential(performance: PerformanceMetrics, skills: SkillAssessment[]): PotentialScore {
    const avgSkillScore = skills.reduce((sum, skill) => sum + skill.assessment.score, 0) / skills.length;
    const gpaFactor = (performance.overallGPA / 4.0) * 100;
    
    return {
      overallScore: Math.round((avgSkillScore + gpaFactor) / 2),
      learningAgility: Math.round(avgSkillScore * 0.9),
      adaptability: Math.round(avgSkillScore * 0.8),
      problemSolving: Math.round(avgSkillScore * 0.95),
      creativity: Math.round(avgSkillScore * 0.7),
      persistence: Math.round(gpaFactor * 0.9)
    };
  }

  private assessIntellectualCapacity(applicationData: any, skills: SkillAssessment[]): CapacityAssessment {
    const criticalThinkingScore = skills.find(s => s.skill === CoreSkill.CRITICAL_THINKING)?.assessment.score || 50;
    const researchScore = skills.find(s => s.skill === CoreSkill.RESEARCH_METHODOLOGY)?.assessment.score || 50;
    
    return {
      intellectualCuriosity: Math.round((criticalThinkingScore + researchScore) / 2),
      abstractThinking: Math.round(criticalThinkingScore * 0.9),
      synthesisAbility: Math.round(researchScore * 0.9),
      criticalAnalysis: criticalThinkingScore,
      informationProcessing: Math.round((criticalThinkingScore + researchScore) / 2),
      conceptualUnderstanding: Math.round(criticalThinkingScore * 0.8)
    };
  }

  private determineRecommendedLevel(
    performance: PerformanceMetrics,
    skills: SkillAssessment[],
    potential: PotentialScore
  ): AcademicLevel {
    const avgSkillScore = skills.reduce((sum, skill) => sum + skill.assessment.score, 0) / skills.length;
    
    if (avgSkillScore >= 85 && performance.overallGPA >= 3.5) {
      return AcademicLevel.GRADUATE;
    } else if (avgSkillScore >= 70 && performance.overallGPA >= 3.0) {
      return AcademicLevel.UNDERGRADUATE;
    } else {
      return AcademicLevel.FOUNDATION;
    }
  }

  private identifySupportNeeds(skills: SkillAssessment[], capacity: CapacityAssessment): SupportRequirement[] {
    const needs: SupportRequirement[] = [];
    
    // Check for skills needing support
    skills.forEach(skill => {
      if (skill.assessment.score < 50) {
        needs.push({
          type: 'Academic Support',
          description: `Additional support needed for ${skill.skill.replace('_', ' ')}`,
          priority: 'high',
          estimatedCost: 500,
          resources: ['Tutoring', 'Supplemental materials', 'Practice sessions']
        });
      }
    });
    
    // Check for capacity issues
    if (capacity.informationProcessing < 60) {
      needs.push({
        type: 'Learning Support',
        description: 'Support for information processing and study skills',
        priority: 'medium',
        estimatedCost: 300,
        resources: ['Study skills training', 'Time management coaching']
      });
    }
    
    return needs;
  }

  private async storeEvaluation(evaluation: AcademicEvaluation): Promise<void> {
    await this.prisma.academicEvaluation.create({
      data: {
        id: evaluation.id,
        applicationId: evaluation.applicationId,
        previousEducation: evaluation.previousEducation,
        academicPerformance: evaluation.academicPerformance,
        coreSkills: evaluation.coreSkills,
        learningPotential: evaluation.learningPotential.overallScore,
        intellectualCapacity: evaluation.intellectualCapacity,
        recommendedLevel: evaluation.recommendedLevel,
        supportNeeds: evaluation.supportNeeds,
        evaluatedAt: evaluation.evaluatedAt
      }
    });
  }
}