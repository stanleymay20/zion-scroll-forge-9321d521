/**
 * Career Alignment Analysis Service
 * "For we are God's handiwork, created in Christ Jesus to do good works" - Ephesians 2:10
 * 
 * Analyzes job market data, recommends courses for career goals,
 * identifies skill gaps, and suggests industry-relevant electives
 */

import { PrismaClient } from '@prisma/client';
import { AIGatewayService } from './AIGatewayService';
import { logger } from '../utils/logger';
import {
  CareerAlignmentAnalysis,
  SkillRequirement,
  SkillGap,
  IndustryInsight,
  CareerPathway,
  CareerStep,
  DegreePlan,
  CourseRecommendation,
  JobMarketData
} from '../types/course-recommendation.types';

const prisma = new PrismaClient();

export default class CareerAlignmentAnalysisService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Analyze career alignment
   */
  async analyzeCareerAlignment(
    studentId: string,
    careerGoal: string,
    degreePlan: DegreePlan
  ): Promise<CareerAlignmentAnalysis> {
    try {
      logger.info('Analyzing career alignment', { studentId, careerGoal });

      // Get job market data
      const jobMarketData = await this.getJobMarketData(careerGoal);

      // Identify required skills
      const requiredSkills = await this.identifyRequiredSkills(
        careerGoal,
        jobMarketData
      );

      // Assess current skill proficiency
      const assessedSkills = await this.assessSkillProficiency(
        studentId,
        requiredSkills,
        degreePlan
      );

      // Identify skill gaps
      const skillGaps = await this.identifySkillGaps(
        assessedSkills,
        careerGoal
      );

      // Recommend electives
      const recommendedElectives = await this.recommendCareerElectives(
        skillGaps,
        careerGoal
      );

      // Get industry insights
      const industryInsights = await this.getIndustryInsights(careerGoal);

      // Generate career pathway
      const careerPathway = await this.generateCareerPathway(
        careerGoal,
        jobMarketData
      );

      // Calculate overall alignment
      const overallAlignment = this.calculateOverallAlignment(
        assessedSkills,
        degreePlan,
        careerGoal
      );

      logger.info('Career alignment analyzed', {
        studentId,
        overallAlignment,
        skillGaps: skillGaps.length
      });

      return {
        careerGoal,
        overallAlignment,
        requiredSkills: assessedSkills,
        skillGaps,
        recommendedElectives,
        industryInsights,
        careerPathway
      };
    } catch (error) {
      logger.error('Error analyzing career alignment', { error, studentId });
      throw error;
    }
  }

  /**
   * Get job market data
   */
  private async getJobMarketData(careerGoal: string): Promise<JobMarketData> {
    // In production, this would query real job market APIs
    // For now, return mock data based on career
    const mockData: Record<string, Partial<JobMarketData>> = {
      'software engineer': {
        demandLevel: 'high',
        growthRate: 22,
        averageSalary: 110000,
        topSkills: ['Programming', 'Algorithms', 'System Design', 'Databases', 'Cloud Computing']
      },
      'data scientist': {
        demandLevel: 'high',
        growthRate: 31,
        averageSalary: 120000,
        topSkills: ['Machine Learning', 'Statistics', 'Python', 'Data Analysis', 'SQL']
      },
      'ministry': {
        demandLevel: 'medium',
        growthRate: 5,
        averageSalary: 50000,
        topSkills: ['Theology', 'Counseling', 'Leadership', 'Communication', 'Biblical Studies']
      }
    };

    const careerLower = careerGoal.toLowerCase();
    const data = Object.entries(mockData).find(([key]) =>
      careerLower.includes(key)
    )?.[1];

    return {
      careerTitle: careerGoal,
      demandLevel: data?.demandLevel || 'medium',
      growthRate: data?.growthRate || 10,
      averageSalary: data?.averageSalary || 60000,
      topSkills: data?.topSkills || ['General Skills'],
      topEmployers: ['Various Organizations'],
      geographicHotspots: ['Major Cities'],
      educationRequirements: ['Bachelor\'s Degree']
    };
  }


  /**
   * Identify required skills
   */
  private async identifyRequiredSkills(
    careerGoal: string,
    jobMarketData: JobMarketData
  ): Promise<SkillRequirement[]> {
    const skills: SkillRequirement[] = [];

    for (const skillName of jobMarketData.topSkills) {
      skills.push({
        skillName,
        importance: this.determineSkillImportance(skillName, careerGoal),
        currentProficiency: 0, // Will be assessed later
        targetProficiency: 80,
        developedByCourses: []
      });
    }

    return skills;
  }

  /**
   * Assess skill proficiency
   */
  private async assessSkillProficiency(
    studentId: string,
    requiredSkills: SkillRequirement[],
    degreePlan: DegreePlan
  ): Promise<SkillRequirement[]> {
    // Get student's completed courses
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: studentId,
        status: 'COMPLETED'
      },
      include: { course: true }
    });

    // Assess proficiency for each skill
    for (const skill of requiredSkills) {
      // Find courses that develop this skill
      const relevantCourses = [
        ...enrollments.map(e => e.course),
        ...degreePlan.courses.map(c => ({ id: c.courseId, title: c.title }))
      ].filter(course =>
        this.courseTeachesSkill(course.title, skill.skillName)
      );

      skill.developedByCourses = relevantCourses.map(c => c.id);

      // Calculate proficiency based on completed courses
      const completedRelevant = enrollments.filter(e =>
        this.courseTeachesSkill(e.course.title, skill.skillName)
      );

      skill.currentProficiency = Math.min(
        completedRelevant.length * 25,
        100
      );
    }

    return requiredSkills;
  }

  /**
   * Identify skill gaps
   */
  private async identifySkillGaps(
    assessedSkills: SkillRequirement[],
    careerGoal: string
  ): Promise<SkillGap[]> {
    const gaps: SkillGap[] = [];

    for (const skill of assessedSkills) {
      const gapSize = skill.targetProficiency - skill.currentProficiency;

      if (gapSize > 20) {
        // Find courses that teach this skill
        const recommendedCourses = await this.findCoursesForSkill(
          skill.skillName
        );

        gaps.push({
          skillName: skill.skillName,
          gapSize,
          priority: skill.importance === 'critical' ? 'high' :
                   skill.importance === 'important' ? 'medium' : 'low',
          recommendedCourses,
          alternativeLearning: [
            'Online courses and certifications',
            'Industry workshops and bootcamps',
            'Self-study with recommended resources',
            'Internships and practical projects'
          ]
        });
      }
    }

    // Sort by priority
    return gaps.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Recommend career-aligned electives
   */
  private async recommendCareerElectives(
    skillGaps: SkillGap[],
    careerGoal: string
  ): Promise<CourseRecommendation[]> {
    const recommendations: CourseRecommendation[] = [];

    // Get top 3 skill gaps
    const topGaps = skillGaps.slice(0, 3);

    for (const gap of topGaps) {
      recommendations.push(...gap.recommendedCourses.slice(0, 2));
    }

    return recommendations;
  }

  /**
   * Get industry insights
   */
  private async getIndustryInsights(careerGoal: string): Promise<IndustryInsight[]> {
    const prompt = `Provide 3 key industry insights for someone pursuing a career as a ${careerGoal}. 
Focus on current trends, emerging technologies, and important skills.
Format: One insight per line, concise and actionable.`;

    try {
      const response = await this.aiGateway.generateText({
        prompt,
        maxTokens: 300,
        temperature: 0.7
      });

      const insights = response.text
        .split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 3)
        .map(insight => ({
          source: 'AI Analysis',
          insight: insight.replace(/^\d+\.\s*/, '').trim(),
          relevance: 85,
          actionable: true
        }));

      return insights;
    } catch (error) {
      logger.warn('Failed to get industry insights', { error });
      return [
        {
          source: 'General Knowledge',
          insight: `${careerGoal} requires continuous learning and adaptation`,
          relevance: 70,
          actionable: true
        }
      ];
    }
  }

  /**
   * Generate career pathway
   */
  private async generateCareerPathway(
    careerGoal: string,
    jobMarketData: JobMarketData
  ): Promise<CareerPathway> {
    const entryLevel: CareerStep = {
      title: `Junior ${careerGoal}`,
      description: 'Entry-level position building foundational skills',
      requiredSkills: jobMarketData.topSkills.slice(0, 3),
      typicalSalaryRange: `$${Math.round(jobMarketData.averageSalary * 0.6)}-${Math.round(jobMarketData.averageSalary * 0.8)}`,
      preparationCourses: []
    };

    const midLevel: CareerStep = {
      title: `${careerGoal}`,
      description: 'Mid-level position with increased responsibility',
      requiredSkills: jobMarketData.topSkills,
      typicalSalaryRange: `$${Math.round(jobMarketData.averageSalary * 0.9)}-${Math.round(jobMarketData.averageSalary * 1.2)}`,
      preparationCourses: []
    };

    const seniorLevel: CareerStep = {
      title: `Senior ${careerGoal}`,
      description: 'Leadership position with strategic responsibilities',
      requiredSkills: [...jobMarketData.topSkills, 'Leadership', 'Strategy', 'Mentoring'],
      typicalSalaryRange: `$${Math.round(jobMarketData.averageSalary * 1.3)}-${Math.round(jobMarketData.averageSalary * 1.8)}`,
      preparationCourses: []
    };

    return {
      entryLevel,
      midLevel,
      seniorLevel,
      estimatedTimeline: '5-10 years from entry to senior level'
    };
  }

  /**
   * Calculate overall alignment
   */
  private calculateOverallAlignment(
    assessedSkills: SkillRequirement[],
    degreePlan: DegreePlan,
    careerGoal: string
  ): number {
    // Calculate average skill proficiency
    const avgProficiency = assessedSkills.reduce(
      (sum, skill) => sum + skill.currentProficiency,
      0
    ) / assessedSkills.length;

    // Check if degree plan includes career-relevant courses
    const relevantCourses = degreePlan.courses.filter(course =>
      this.isCourseRelevantToCareer(course.title, careerGoal)
    );

    const courseAlignment = (relevantCourses.length / degreePlan.courses.length) * 100;

    // Weighted average
    const overallAlignment = (avgProficiency * 0.6) + (courseAlignment * 0.4);

    return Math.round(overallAlignment);
  }

  /**
   * Helper methods
   */
  private determineSkillImportance(
    skillName: string,
    careerGoal: string
  ): 'critical' | 'important' | 'beneficial' {
    // Core technical skills are critical
    const criticalKeywords = ['programming', 'coding', 'theology', 'leadership'];
    if (criticalKeywords.some(k => skillName.toLowerCase().includes(k))) {
      return 'critical';
    }

    // Supporting skills are important
    const importantKeywords = ['communication', 'analysis', 'design', 'counseling'];
    if (importantKeywords.some(k => skillName.toLowerCase().includes(k))) {
      return 'important';
    }

    return 'beneficial';
  }

  private courseTeachesSkill(courseTitle: string, skillName: string): boolean {
    const courseLower = courseTitle.toLowerCase();
    const skillLower = skillName.toLowerCase();

    // Direct match
    if (courseLower.includes(skillLower)) {
      return true;
    }

    // Related keywords
    const skillKeywords = skillLower.split(' ');
    return skillKeywords.some(keyword => courseLower.includes(keyword));
  }

  private async findCoursesForSkill(
    skillName: string
  ): Promise<CourseRecommendation[]> {
    const courses = await prisma.course.findMany({
      where: {
        OR: [
          { title: { contains: skillName, mode: 'insensitive' } },
          { description: { contains: skillName, mode: 'insensitive' } }
        ],
        isActive: true
      },
      include: { faculty: true },
      take: 3
    });

    return courses.map(course => ({
      courseId: course.id,
      courseCode: `${course.faculty.name.substring(0, 3).toUpperCase()}-${course.id.substring(0, 3)}`,
      title: course.title,
      description: course.description,
      credits: course.duration || 3,
      difficulty: this.mapDifficulty(course.difficulty),
      prerequisites: [],
      prerequisitesMet: true,
      relevanceScore: 90,
      difficultyMatch: 80,
      careerAlignment: 95,
      spiritualGrowthPotential: course.scrollXPReward || 50,
      availableSections: [],
      reasoning: `Develops ${skillName} skills essential for your career`
    }));
  }

  private isCourseRelevantToCareer(courseTitle: string, careerGoal: string): boolean {
    const courseLower = courseTitle.toLowerCase();
    const careerLower = careerGoal.toLowerCase();

    const careerKeywords = careerLower.split(' ');
    return careerKeywords.some(keyword => courseLower.includes(keyword));
  }

  private mapDifficulty(difficulty: string): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    const map: Record<string, any> = {
      'BEGINNER': 'beginner',
      'INTERMEDIATE': 'intermediate',
      'ADVANCED': 'advanced',
      'PROPHETIC': 'expert'
    };
    return map[difficulty] || 'intermediate';
  }
}
