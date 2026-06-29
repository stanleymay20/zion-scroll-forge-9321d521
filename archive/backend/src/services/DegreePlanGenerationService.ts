/**
 * Degree Plan Generation Service
 * "For I know the plans I have for you" - Jeremiah 29:11
 * 
 * Generates comprehensive 4-year degree plans considering prerequisites,
 * sequences, career goals, and course load balance
 */

import { PrismaClient } from '@prisma/client';
import { AIGatewayService } from './AIGatewayService';
import { logger } from '../utils/logger';
import {
  DegreePlan,
  PlannedCourse,
  DegreeMilestone,
  ElectiveRecommendation
} from '../types/course-recommendation.types';

const prisma = new PrismaClient();

interface CourseNode {
  courseId: string;
  courseCode: string;
  title: string;
  credits: number;
  prerequisites: string[];
  difficulty: number;
  isRequired: boolean;
  category: string;
  careerRelevance: number;
  spiritualGrowth: number;
}

export default class DegreePlanGenerationService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Generate comprehensive 4-year degree plan
   */
  async generateDegreePlan(
    studentId: string,
    major: string,
    careerGoal?: string
  ): Promise<DegreePlan> {
    try {
      logger.info('Generating degree plan', { studentId, major });

      // Get student's current progress
      const currentProgress = await this.getCurrentProgress(studentId);

      // Get major requirements
      const requirements = await this.getMajorRequirements(major);

      // Get available courses
      const availableCourses = await this.getAvailableCourses(major);

      // Filter out completed courses
      const remainingCourses = availableCourses.filter(
        c => !currentProgress.completedCourses.includes(c.courseId)
      );

      // Sort courses by prerequisites and difficulty
      const sortedCourses = this.topologicalSort(remainingCourses);

      // Distribute courses across semesters
      const plannedCourses = await this.distributeCourses(
        sortedCourses,
        currentProgress.currentSemester,
        careerGoal
      );

      // Generate milestones
      const milestones = this.generateMilestones(plannedCourses, major);

      // Generate elective recommendations
      const electives = await this.generateElectiveRecommendations(
        major,
        careerGoal,
        requirements.electiveCredits
      );

      // Calculate total credits and graduation date
      const totalCredits = plannedCourses.reduce((sum, c) => sum + c.credits, 0);
      const estimatedGraduation = this.calculateGraduationDate(
        currentProgress.currentSemester,
        plannedCourses.length
      );

      const degreePlan: DegreePlan = {
        planId: this.generatePlanId(),
        studentId,
        major,
        totalCredits,
        estimatedGraduation,
        courses: plannedCourses,
        milestones,
        electives
      };

      logger.info('Degree plan generated', {
        studentId,
        totalCourses: plannedCourses.length,
        totalCredits
      });

      return degreePlan;
    } catch (error) {
      logger.error('Error generating degree plan', { error, studentId, major });
      throw error;
    }
  }


  /**
   * Get student's current progress
   */
  private async getCurrentProgress(studentId: string): Promise<{
    completedCourses: string[];
    currentSemester: number;
    creditsEarned: number;
  }> {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: studentId },
      include: { course: true }
    });

    const completedCourses = enrollments
      .filter(e => e.status === 'COMPLETED')
      .map(e => e.courseId);

    const creditsEarned = enrollments
      .filter(e => e.status === 'COMPLETED')
      .reduce((sum, e) => sum + (e.course.duration || 3), 0);

    // Estimate current semester based on credits (assuming 15 credits per semester)
    const currentSemester = Math.floor(creditsEarned / 15) + 1;

    return {
      completedCourses,
      currentSemester,
      creditsEarned
    };
  }

  /**
   * Get major requirements
   */
  private async getMajorRequirements(major: string): Promise<{
    requiredCourses: string[];
    electiveCredits: number;
    totalCredits: number;
  }> {
    // In production, this would query a major requirements table
    // For now, return default requirements
    return {
      requiredCourses: [],
      electiveCredits: 30,
      totalCredits: 120
    };
  }

  /**
   * Get available courses for major
   */
  private async getAvailableCourses(major: string): Promise<CourseNode[]> {
    const courses = await prisma.course.findMany({
      where: { isActive: true },
      include: {
        faculty: true
      }
    });

    return courses.map(course => ({
      courseId: course.id,
      courseCode: `${course.faculty.name.substring(0, 3).toUpperCase()}-${course.id.substring(0, 3)}`,
      title: course.title,
      credits: course.duration || 3,
      prerequisites: course.prerequisites || [],
      difficulty: this.mapDifficultyToNumber(course.difficulty),
      isRequired: true, // Would be determined by major requirements
      category: course.faculty.name,
      careerRelevance: 50,
      spiritualGrowth: course.scrollXPReward || 50
    }));
  }

  /**
   * Topological sort courses by prerequisites
   */
  private topologicalSort(courses: CourseNode[]): CourseNode[] {
    const sorted: CourseNode[] = [];
    const visited = new Set<string>();
    const courseMap = new Map(courses.map(c => [c.courseId, c]));

    const visit = (course: CourseNode) => {
      if (visited.has(course.courseId)) return;

      // Visit prerequisites first
      for (const prereqId of course.prerequisites) {
        const prereq = courseMap.get(prereqId);
        if (prereq) visit(prereq);
      }

      visited.add(course.courseId);
      sorted.push(course);
    };

    // Sort by difficulty and career relevance first
    const prioritized = [...courses].sort((a, b) => {
      if (a.isRequired !== b.isRequired) {
        return a.isRequired ? -1 : 1;
      }
      return a.difficulty - b.difficulty;
    });

    for (const course of prioritized) {
      visit(course);
    }

    return sorted;
  }

  /**
   * Distribute courses across semesters
   */
  private async distributeCourses(
    courses: CourseNode[],
    startingSemester: number,
    careerGoal?: string
  ): Promise<PlannedCourse[]> {
    const plannedCourses: PlannedCourse[] = [];
    const maxCoursesPerSemester = 4;
    let currentSemester = startingSemester;
    let semesterCourseCount = 0;
    const completedInPlan = new Set<string>();

    for (const course of courses) {
      // Check if prerequisites are met
      const prerequisitesMet = course.prerequisites.every(
        prereqId => completedInPlan.has(prereqId)
      );

      if (!prerequisitesMet) {
        continue;
      }

      // Move to next semester if current is full
      if (semesterCourseCount >= maxCoursesPerSemester) {
        currentSemester++;
        semesterCourseCount = 0;
      }

      // Calculate relevance score
      const relevanceScore = await this.calculateRelevanceScore(
        course,
        careerGoal
      );

      // Generate reasoning
      const reasoning = this.generateCourseReasoning(
        course,
        currentSemester,
        careerGoal
      );

      plannedCourses.push({
        courseId: course.courseId,
        courseCode: course.courseCode,
        title: course.title,
        credits: course.credits,
        semester: currentSemester,
        year: Math.ceil(currentSemester / 2),
        isRequired: course.isRequired,
        prerequisites: course.prerequisites,
        difficulty: this.mapNumberToDifficulty(course.difficulty),
        relevanceScore,
        reasoning
      });

      completedInPlan.add(course.courseId);
      semesterCourseCount++;
    }

    return plannedCourses;
  }

  /**
   * Generate degree milestones
   */
  private generateMilestones(
    courses: PlannedCourse[],
    major: string
  ): DegreeMilestone[] {
    const milestones: DegreeMilestone[] = [];

    // First year completion
    const firstYearCourses = courses.filter(c => c.year === 1);
    if (firstYearCourses.length > 0) {
      milestones.push({
        milestoneId: 'first-year',
        title: 'Complete First Year Foundation',
        semester: 2,
        requirements: firstYearCourses.map(c => c.courseId),
        description: 'Complete foundational courses and establish strong academic base'
      });
    }

    // Halfway point
    const halfwayPoint = Math.floor(courses.length / 2);
    if (halfwayPoint > 0) {
      milestones.push({
        milestoneId: 'halfway',
        title: 'Reach Halfway Milestone',
        semester: 4,
        requirements: courses.slice(0, halfwayPoint).map(c => c.courseId),
        description: `Complete ${halfwayPoint} courses toward degree`
      });
    }

    // Major requirements
    const requiredCourses = courses.filter(c => c.isRequired);
    milestones.push({
      milestoneId: 'major-complete',
      title: 'Complete Major Requirements',
      semester: 7,
      requirements: requiredCourses.map(c => c.courseId),
      description: `Finish all required courses for ${major} major`
    });

    // Graduation
    milestones.push({
      milestoneId: 'graduation',
      title: 'Graduation Ready',
      semester: 8,
      requirements: courses.map(c => c.courseId),
      description: 'Complete all degree requirements and prepare for graduation'
    });

    return milestones;
  }

  /**
   * Generate elective recommendations
   */
  private async generateElectiveRecommendations(
    major: string,
    careerGoal: string | undefined,
    electiveCredits: number
  ): Promise<ElectiveRecommendation[]> {
    const recommendations: ElectiveRecommendation[] = [];

    // Get elective courses
    const electives = await prisma.course.findMany({
      where: { isActive: true },
      take: 20
    });

    // Categorize electives
    const categories = ['Technical Skills', 'Spiritual Formation', 'Career Development'];

    for (const category of categories) {
      const categoryCourses = electives.slice(0, 5).map(course => ({
        courseId: course.id,
        courseCode: `ELEC-${course.id.substring(0, 3)}`,
        title: course.title,
        description: course.description,
        credits: course.duration || 3,
        difficulty: this.mapDifficultyToString(course.difficulty),
        prerequisites: [],
        prerequisitesMet: true,
        relevanceScore: 75,
        difficultyMatch: 80,
        careerAlignment: careerGoal ? 70 : 50,
        spiritualGrowthPotential: course.scrollXPReward || 50,
        availableSections: [],
        reasoning: `Recommended ${category.toLowerCase()} elective for ${major} major`
      }));

      recommendations.push({
        category,
        requiredCredits: Math.floor(electiveCredits / categories.length),
        recommendedCourses: categoryCourses
      });
    }

    return recommendations;
  }

  /**
   * Calculate relevance score
   */
  private async calculateRelevanceScore(
    course: CourseNode,
    careerGoal?: string
  ): Promise<number> {
    let score = 50;

    // Required courses get higher score
    if (course.isRequired) {
      score += 30;
    }

    // Career alignment
    if (careerGoal) {
      score += course.careerRelevance * 0.2;
    }

    // Spiritual growth
    score += course.spiritualGrowth * 0.1;

    return Math.min(Math.round(score), 100);
  }

  /**
   * Generate course reasoning
   */
  private generateCourseReasoning(
    course: CourseNode,
    semester: number,
    careerGoal?: string
  ): string {
    const reasons: string[] = [];

    if (course.isRequired) {
      reasons.push('Required for major completion');
    }

    if (course.prerequisites.length === 0) {
      reasons.push('No prerequisites - good foundation course');
    }

    if (semester <= 2) {
      reasons.push('Scheduled early to build strong foundation');
    }

    if (careerGoal && course.careerRelevance > 70) {
      reasons.push(`Highly relevant to ${careerGoal} career path`);
    }

    if (course.spiritualGrowth > 70) {
      reasons.push('Strong spiritual formation component');
    }

    return reasons.length > 0 ? reasons.join('. ') + '.' : 'Recommended for degree completion.';
  }

  /**
   * Calculate graduation date
   */
  private calculateGraduationDate(
    currentSemester: number,
    totalCourses: number
  ): Date {
    const coursesPerSemester = 4;
    const semestersRemaining = Math.ceil(totalCourses / coursesPerSemester);
    const monthsToGraduation = semestersRemaining * 4; // 4 months per semester

    const graduationDate = new Date();
    graduationDate.setMonth(graduationDate.getMonth() + monthsToGraduation);

    return graduationDate;
  }

  /**
   * Helper methods
   */
  private mapDifficultyToNumber(difficulty: string): number {
    const map: Record<string, number> = {
      'BEGINNER': 1,
      'INTERMEDIATE': 5,
      'ADVANCED': 8,
      'PROPHETIC': 10
    };
    return map[difficulty] || 5;
  }

  private mapNumberToDifficulty(num: number): string {
    if (num <= 3) return 'beginner';
    if (num <= 7) return 'intermediate';
    return 'advanced';
  }

  private mapDifficultyToString(difficulty: string): string {
    return difficulty.toLowerCase();
  }

  private generatePlanId(): string {
    return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
