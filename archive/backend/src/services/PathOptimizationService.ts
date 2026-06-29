/**
 * Path Optimization Service
 * "I will lead the blind by ways they have not known" - Isaiah 42:16
 * 
 * Optimizes learning paths based on student progress, goals, and performance
 */

import { PrismaClient } from '@prisma/client';
import {
  LearningPath,
  LearningGoal,
  PathPosition,
  CourseRecommendation,
  Milestone,
  PathAdaptation,
  OptimizePathRequest,
  OptimizePathResponse,
  PathConstraints,
  LearningProfile
} from '../types/personalization.types';
import { AIGatewayService } from './AIGatewayService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface CourseNode {
  courseId: string;
  title: string;
  credits: number;
  prerequisites: string[];
  difficulty: number;
  careerRelevance: number;
  spiritualGrowth: number;
}

export default class PathOptimizationService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Optimize learning path for student
   */
  async optimizePath(request: OptimizePathRequest): Promise<OptimizePathResponse> {
    try {
      logger.info('Optimizing learning path', {
        studentId: request.studentId,
        goalType: request.goals.goalType
      });

      // Get student profile and current position
      const profile = await this.getStudentProfile(request.studentId);
      const currentPosition = await this.getCurrentPosition(request.studentId);

      // Get available courses
      const availableCourses = await this.getAvailableCourses(
        request.goals,
        currentPosition
      );

      // Generate optimal course sequence
      const recommendedCourses = await this.generateCourseSequence(
        availableCourses,
        profile,
        request.goals,
        currentPosition,
        request.constraints
      );

      // Create milestones
      const milestones = await this.createMilestones(
        recommendedCourses,
        request.goals,
        currentPosition
      );

      // Calculate estimated completion
      const estimatedCompletion = this.calculateEstimatedCompletion(
        recommendedCourses,
        request.constraints
      );

      // Build learning path
      const learningPath: LearningPath = {
        studentId: request.studentId,
        pathId: this.generatePathId(),
        goal: request.goals,
        currentPosition,
        recommendedCourses,
        milestones,
        estimatedCompletion,
        adaptations: []
      };

      // Generate alternative paths
      const alternativePaths = await this.generateAlternativePaths(
        request,
        profile,
        currentPosition,
        availableCourses
      );

      logger.info('Learning path optimized', {
        studentId: request.studentId,
        coursesRecommended: recommendedCourses.length,
        estimatedCompletion
      });

      return {
        success: true,
        learningPath,
        alternativePaths
      };
    } catch (error) {
      logger.error('Error optimizing learning path', { error, request });
      return {
        success: false,
        learningPath: this.getEmptyPath(request.studentId, request.goals),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Adjust pacing based on student progress
   */
  async adjustPacing(
    studentId: string,
    currentPathId: string
  ): Promise<PathAdaptation> {
    const profile = await this.getStudentProfile(studentId);
    const currentPath = await this.getPath(currentPathId);

    // Analyze recent performance
    const recentPerformance = profile.performanceMetrics.improvementTrend;
    const currentPace = profile.pace;

    let adaptation: PathAdaptation;

    if (recentPerformance === 'declining' && currentPace === 'fast') {
      // Slow down if struggling
      adaptation = {
        adaptationType: 'pace_adjustment',
        reason: 'Performance declining, reducing course load',
        appliedDate: new Date(),
        impact: 'Extended timeline by 1 semester to ensure mastery'
      };
    } else if (recentPerformance === 'improving' && currentPace === 'slow') {
      // Speed up if excelling
      adaptation = {
        adaptationType: 'pace_adjustment',
        reason: 'Strong performance, increasing course load',
        appliedDate: new Date(),
        impact: 'Accelerated timeline by 1 semester'
      };
    } else {
      // Maintain current pace
      adaptation = {
        adaptationType: 'pace_adjustment',
        reason: 'Current pace is appropriate',
        appliedDate: new Date(),
        impact: 'No changes to timeline'
      };
    }

    // Log adaptation
    await this.logAdaptation(studentId, currentPathId, adaptation);

    return adaptation;
  }

  /**
   * Balance course load to prevent burnout
   */
  async balanceCourseLoad(
    studentId: string,
    semesterCourses: string[]
  ): Promise<{ balanced: boolean; recommendations: string[] }> {
    const profile = await this.getStudentProfile(studentId);
    const recommendations: string[] = [];
    let balanced = true;

    // Get course details
    const courses = await prisma.course.findMany({
      where: { id: { in: semesterCourses } }
    });

    // Calculate total difficulty
    const totalDifficulty = courses.reduce((sum, c) => sum + (c.difficulty || 5), 0);
    const avgDifficulty = totalDifficulty / courses.length;

    // Check if load is too heavy
    if (courses.length > 5) {
      balanced = false;
      recommendations.push('Consider reducing to 4-5 courses per semester');
    }

    if (avgDifficulty > 7 && courses.length > 4) {
      balanced = false;
      recommendations.push('Mix of difficult courses is too high - consider easier electives');
    }

    // Check based on student performance
    if (profile.performanceMetrics.averageScore < 70 && courses.length > 3) {
      balanced = false;
      recommendations.push('Current performance suggests reducing to 3 courses');
    }

    // Check engagement and risk level
    if (profile.riskLevel === 'high' || profile.riskLevel === 'critical') {
      balanced = false;
      recommendations.push('High risk level - recommend lighter course load with support');
    }

    // Check time commitment
    const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
    if (totalCredits > 18) {
      balanced = false;
      recommendations.push('Credit load exceeds recommended maximum of 18');
    }

    if (balanced) {
      recommendations.push('Course load is well-balanced for your current performance');
    }

    return { balanced, recommendations };
  }

  /**
   * Align courses with career goals
   */
  async alignWithCareerGoals(
    studentId: string,
    careerGoal: string
  ): Promise<CourseRecommendation[]> {
    // Get career-relevant skills
    const requiredSkills = await this.getCareerSkills(careerGoal);

    // Find courses that teach these skills
    const relevantCourses = await prisma.course.findMany({
      where: {
        OR: requiredSkills.map(skill => ({
          description: { contains: skill, mode: 'insensitive' }
        }))
      }
    });

    // Get student's current position
    const currentPosition = await this.getCurrentPosition(studentId);
    const profile = await this.getStudentProfile(studentId);

    // Score and rank courses
    const recommendations: CourseRecommendation[] = [];

    for (const course of relevantCourses) {
      // Check if already completed
      if (currentPosition.completedCourses.includes(course.id)) {
        continue;
      }

      // Check prerequisites
      const prerequisitesMet = await this.checkPrerequisites(
        course.id,
        currentPosition.completedCourses
      );

      // Calculate career alignment score
      const careerAlignment = this.calculateCareerAlignment(
        course,
        requiredSkills
      );

      recommendations.push({
        courseId: course.id,
        courseTitle: course.title,
        relevanceScore: careerAlignment,
        difficulty: this.mapDifficulty(course.difficulty || 5),
        prerequisites: await this.getPrerequisiteNames(course.id),
        prerequisitesMet,
        recommendedSemester: this.recommendSemester(
          course,
          currentPosition,
          prerequisitesMet
        ),
        reasoning: `Develops ${requiredSkills.slice(0, 3).join(', ')} skills needed for ${careerGoal}`,
        careerAlignment,
        spiritualGrowthPotential: course.scrollAlignment || 50
      });
    }

    // Sort by relevance
    return recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Get student profile
   */
  private async getStudentProfile(studentId: string): Promise<LearningProfile> {
    const cachedProfile = await prisma.learningProfile.findUnique({
      where: { studentId }
    });

    if (cachedProfile) {
      return this.parseLearningProfile(cachedProfile);
    }

    return this.getDefaultProfile(studentId);
  }

  /**
   * Get current position in learning path
   */
  private async getCurrentPosition(studentId: string): Promise<PathPosition> {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: studentId },
      include: { course: true }
    });

    const completedCourses = enrollments
      .filter(e => e.status === 'COMPLETED')
      .map(e => e.courseId);

    const currentCourses = enrollments
      .filter(e => e.status === 'ACTIVE')
      .map(e => e.courseId);

    const creditsEarned = enrollments
      .filter(e => e.status === 'COMPLETED')
      .reduce((sum, e) => sum + e.course.credits, 0);

    // Assume 120 credits for bachelor's degree
    const creditsRequired = 120;
    const progressPercentage = (creditsEarned / creditsRequired) * 100;

    return {
      completedCourses,
      currentCourses,
      creditsEarned,
      creditsRequired,
      progressPercentage
    };
  }

  /**
   * Get available courses based on goals
   */
  private async getAvailableCourses(
    goals: LearningGoal,
    currentPosition: PathPosition
  ): Promise<CourseNode[]> {
    const courses = await prisma.course.findMany({
      where: {
        // Filter by program if specified
        ...(goals.targetProgram && {
          program: goals.targetProgram
        })
      },
      include: {
        prerequisites: true
      }
    });

    return courses.map(course => ({
      courseId: course.id,
      title: course.title,
      credits: course.credits,
      prerequisites: course.prerequisites.map(p => p.prerequisiteId),
      difficulty: course.difficulty || 5,
      careerRelevance: this.calculateCareerRelevance(course, goals),
      spiritualGrowth: course.scrollAlignment || 50
    }));
  }

  /**
   * Generate optimal course sequence
   */
  private async generateCourseSequence(
    availableCourses: CourseNode[],
    profile: LearningProfile,
    goals: LearningGoal,
    currentPosition: PathPosition,
    constraints?: PathConstraints
  ): Promise<CourseRecommendation[]> {
    const recommendations: CourseRecommendation[] = [];
    const maxCoursesPerSemester = constraints?.maxCoursesPerSemester || 4;

    // Filter out completed courses
    const remainingCourses = availableCourses.filter(
      c => !currentPosition.completedCourses.includes(c.courseId)
    );

    // Sort by prerequisites and relevance
    const sortedCourses = this.topologicalSort(remainingCourses);

    // Assign to semesters
    let currentSemester = 1;
    let semesterCourses = 0;
    const completedInPath: string[] = [...currentPosition.completedCourses];

    for (const course of sortedCourses) {
      // Check if prerequisites are met
      const prerequisitesMet = course.prerequisites.every(
        prereq => completedInPath.includes(prereq)
      );

      if (!prerequisitesMet) {
        continue;
      }

      // Check semester capacity
      if (semesterCourses >= maxCoursesPerSemester) {
        currentSemester++;
        semesterCourses = 0;
      }

      // Calculate relevance score
      const relevanceScore = this.calculateRelevanceScore(
        course,
        profile,
        goals
      );

      recommendations.push({
        courseId: course.courseId,
        courseTitle: course.title,
        relevanceScore,
        difficulty: this.mapDifficulty(course.difficulty),
        prerequisites: course.prerequisites,
        prerequisitesMet: true,
        recommendedSemester: `Semester ${currentSemester}`,
        reasoning: this.generateCourseReasoning(course, goals, profile),
        careerAlignment: course.careerRelevance,
        spiritualGrowthPotential: course.spiritualGrowth
      });

      completedInPath.push(course.courseId);
      semesterCourses++;
    }

    return recommendations;
  }

  /**
   * Create milestones for learning path
   */
  private async createMilestones(
    courses: CourseRecommendation[],
    goals: LearningGoal,
    currentPosition: PathPosition
  ): Promise<Milestone[]> {
    const milestones: Milestone[] = [];

    // Milestone: Complete first year
    const firstYearCourses = courses.filter(c => 
      c.recommendedSemester.includes('Semester 1') || 
      c.recommendedSemester.includes('Semester 2')
    );

    if (firstYearCourses.length > 0) {
      milestones.push({
        milestoneId: 'first-year',
        title: 'Complete First Year',
        description: 'Finish foundational courses',
        targetDate: this.addMonths(new Date(), 12),
        requirements: firstYearCourses.map(c => c.courseId),
        completed: false
      });
    }

    // Milestone: Reach halfway point
    const halfwayPoint = Math.floor(courses.length / 2);
    if (halfwayPoint > 0) {
      milestones.push({
        milestoneId: 'halfway',
        title: 'Halfway to Completion',
        description: `Complete ${halfwayPoint} courses`,
        targetDate: this.addMonths(new Date(), 24),
        requirements: courses.slice(0, halfwayPoint).map(c => c.courseId),
        completed: false
      });
    }

    // Milestone: Complete major requirements
    milestones.push({
      milestoneId: 'major-complete',
      title: 'Complete Major Requirements',
      description: 'Finish all required courses for major',
      targetDate: this.addMonths(new Date(), 36),
      requirements: courses.filter(c => c.careerAlignment > 70).map(c => c.courseId),
      completed: false
    });

    // Milestone: Graduation
    milestones.push({
      milestoneId: 'graduation',
      title: 'Graduation',
      description: 'Complete all degree requirements',
      targetDate: this.addMonths(new Date(), 48),
      requirements: courses.map(c => c.courseId),
      completed: false
    });

    return milestones;
  }

  /**
   * Calculate estimated completion date
   */
  private calculateEstimatedCompletion(
    courses: CourseRecommendation[],
    constraints?: PathConstraints
  ): Date {
    const maxCoursesPerSemester = constraints?.maxCoursesPerSemester || 4;
    const totalSemesters = Math.ceil(courses.length / maxCoursesPerSemester);
    
    // Each semester is ~4 months
    return this.addMonths(new Date(), totalSemesters * 4);
  }

  /**
   * Generate alternative paths
   */
  private async generateAlternativePaths(
    request: OptimizePathRequest,
    profile: LearningProfile,
    currentPosition: PathPosition,
    availableCourses: CourseNode[]
  ): Promise<LearningPath[]> {
    const alternatives: LearningPath[] = [];

    // Alternative 1: Accelerated path (if student is high-performing)
    if (profile.performanceMetrics.averageScore >= 85) {
      const acceleratedConstraints: PathConstraints = {
        ...request.constraints,
        maxCoursesPerSemester: 5,
        preferredPace: 'fast'
      };

      const acceleratedCourses = await this.generateCourseSequence(
        availableCourses,
        profile,
        request.goals,
        currentPosition,
        acceleratedConstraints
      );

      alternatives.push({
        studentId: request.studentId,
        pathId: this.generatePathId(),
        goal: request.goals,
        currentPosition,
        recommendedCourses: acceleratedCourses,
        milestones: await this.createMilestones(acceleratedCourses, request.goals, currentPosition),
        estimatedCompletion: this.calculateEstimatedCompletion(acceleratedCourses, acceleratedConstraints),
        adaptations: [{
          adaptationType: 'pace_adjustment',
          reason: 'Accelerated path for high-performing student',
          appliedDate: new Date(),
          impact: 'Complete degree 1 year earlier'
        }]
      });
    }

    // Alternative 2: Balanced path with more electives
    const balancedConstraints: PathConstraints = {
      ...request.constraints,
      maxCoursesPerSemester: 3,
      preferredPace: 'moderate'
    };

    const balancedCourses = await this.generateCourseSequence(
      availableCourses,
      profile,
      request.goals,
      currentPosition,
      balancedConstraints
    );

    alternatives.push({
      studentId: request.studentId,
      pathId: this.generatePathId(),
      goal: request.goals,
      currentPosition,
      recommendedCourses: balancedCourses,
      milestones: await this.createMilestones(balancedCourses, request.goals, currentPosition),
      estimatedCompletion: this.calculateEstimatedCompletion(balancedCourses, balancedConstraints),
      adaptations: [{
        adaptationType: 'load_balancing',
        reason: 'Balanced path with lighter course load',
        appliedDate: new Date(),
        impact: 'Reduced stress with more time for mastery'
      }]
    });

    return alternatives.slice(0, 2);
  }

  /**
   * Helper methods
   */
  private topologicalSort(courses: CourseNode[]): CourseNode[] {
    // Simple topological sort based on prerequisites
    const sorted: CourseNode[] = [];
    const visited = new Set<string>();

    const visit = (course: CourseNode) => {
      if (visited.has(course.courseId)) return;
      
      // Visit prerequisites first
      for (const prereqId of course.prerequisites) {
        const prereq = courses.find(c => c.courseId === prereqId);
        if (prereq) visit(prereq);
      }
      
      visited.add(course.courseId);
      sorted.push(course);
    };

    // Sort by career relevance and spiritual growth
    const prioritized = [...courses].sort((a, b) => 
      (b.careerRelevance + b.spiritualGrowth) - (a.careerRelevance + a.spiritualGrowth)
    );

    for (const course of prioritized) {
      visit(course);
    }

    return sorted;
  }

  private calculateCareerRelevance(course: any, goals: LearningGoal): number {
    if (!goals.careerAlignment) return 50;

    // Simple keyword matching
    const courseText = `${course.title} ${course.description}`.toLowerCase();
    const careerText = goals.careerAlignment.toLowerCase();

    return courseText.includes(careerText) ? 90 : 50;
  }

  private calculateRelevanceScore(
    course: CourseNode,
    profile: LearningProfile,
    goals: LearningGoal
  ): number {
    let score = 50;

    // Career alignment
    score += course.careerRelevance * 0.4;

    // Spiritual growth
    score += course.spiritualGrowth * 0.3;

    // Difficulty match
    const targetDiff = profile.performanceMetrics.averageScore >= 85 ? 8 : 
                      profile.performanceMetrics.averageScore >= 70 ? 5 : 3;
    const diffMatch = 100 - Math.abs(course.difficulty - targetDiff) * 10;
    score += diffMatch * 0.3;

    return Math.min(Math.round(score), 100);
  }

  private generateCourseReasoning(
    course: CourseNode,
    goals: LearningGoal,
    profile: LearningProfile
  ): string {
    const reasons: string[] = [];

    if (course.careerRelevance > 70) {
      reasons.push('Highly relevant to your career goals');
    }

    if (course.spiritualGrowth > 70) {
      reasons.push('Strong spiritual formation component');
    }

    if (course.difficulty <= 5 && profile.pace === 'slow') {
      reasons.push('Appropriate difficulty for steady progress');
    }

    return reasons.length > 0 ? reasons.join('. ') + '.' : 'Recommended for degree completion.';
  }

  private async checkPrerequisites(
    courseId: string,
    completedCourses: string[]
  ): Promise<boolean> {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { prerequisites: true }
    });

    if (!course) return false;

    return course.prerequisites.every(p => 
      completedCourses.includes(p.prerequisiteId)
    );
  }

  private async getPrerequisiteNames(courseId: string): Promise<string[]> {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        prerequisites: {
          include: {
            prerequisite: true
          }
        }
      }
    });

    return course?.prerequisites.map(p => p.prerequisite.title) || [];
  }

  private recommendSemester(
    course: any,
    currentPosition: PathPosition,
    prerequisitesMet: boolean
  ): string {
    if (!prerequisitesMet) {
      return 'Prerequisites required';
    }

    const semestersRemaining = Math.ceil(
      (currentPosition.creditsRequired - currentPosition.creditsEarned) / 15
    );

    return `Within ${semestersRemaining} semesters`;
  }

  private async getCareerSkills(career: string): Promise<string[]> {
    // Simplified - in production, this would query a skills database
    const skillsMap: Record<string, string[]> = {
      'software engineer': ['programming', 'algorithms', 'data structures', 'software design'],
      'data scientist': ['statistics', 'machine learning', 'python', 'data analysis'],
      'web developer': ['html', 'css', 'javascript', 'react', 'databases'],
      'ministry': ['theology', 'biblical studies', 'counseling', 'leadership']
    };

    const careerLower = career.toLowerCase();
    for (const [key, skills] of Object.entries(skillsMap)) {
      if (careerLower.includes(key)) {
        return skills;
      }
    }

    return ['general education', 'critical thinking', 'communication'];
  }

  private calculateCareerAlignment(course: any, requiredSkills: string[]): number {
    const courseText = `${course.title} ${course.description}`.toLowerCase();
    const matchingSkills = requiredSkills.filter(skill => 
      courseText.includes(skill.toLowerCase())
    );

    return Math.round((matchingSkills.length / requiredSkills.length) * 100);
  }

  private mapDifficulty(difficultyScore: number): string {
    if (difficultyScore <= 3) return 'beginner';
    if (difficultyScore <= 7) return 'intermediate';
    return 'advanced';
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  private generatePathId(): string {
    return `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getPath(pathId: string): Promise<LearningPath | null> {
    // Simplified - would query database
    return null;
  }

  private async logAdaptation(
    studentId: string,
    pathId: string,
    adaptation: PathAdaptation
  ): Promise<void> {
    logger.info('Path adaptation logged', { studentId, pathId, adaptation });
  }

  private parseLearningProfile(dbProfile: any): LearningProfile {
    return {
      studentId: dbProfile.studentId,
      strengths: JSON.parse(dbProfile.strengths || '[]'),
      weaknesses: JSON.parse(dbProfile.weaknesses || '[]'),
      learningStyle: dbProfile.learningStyle,
      pace: dbProfile.pace,
      engagement: dbProfile.engagement,
      riskLevel: dbProfile.riskLevel,
      lastAnalyzed: dbProfile.lastAnalyzed,
      performanceMetrics: JSON.parse(dbProfile.performanceMetrics || '{}'),
      spiritualGrowth: JSON.parse(dbProfile.spiritualGrowth || '{}')
    };
  }

  private getDefaultProfile(studentId: string): LearningProfile {
    return {
      studentId,
      strengths: [],
      weaknesses: [],
      learningStyle: 'multimodal',
      pace: 'moderate',
      engagement: 50,
      riskLevel: 'low',
      lastAnalyzed: new Date(),
      performanceMetrics: {
        averageScore: 75,
        completionRate: 80,
        timeOnTask: 300,
        assignmentSubmissionRate: 85,
        quizPerformance: 75,
        projectQuality: 75,
        participationScore: 70,
        improvementTrend: 'stable'
      },
      spiritualGrowth: {
        scrollAlignment: 50,
        spiritualMaturity: 50,
        kingdomFocus: 50,
        characterDevelopment: 50
      }
    };
  }

  private getEmptyPath(studentId: string, goals: LearningGoal): LearningPath {
    return {
      studentId,
      pathId: this.generatePathId(),
      goal: goals,
      currentPosition: {
        completedCourses: [],
        currentCourses: [],
        creditsEarned: 0,
        creditsRequired: 120,
        progressPercentage: 0
      },
      recommendedCourses: [],
      milestones: [],
      estimatedCompletion: new Date(),
      adaptations: []
    };
  }
}
