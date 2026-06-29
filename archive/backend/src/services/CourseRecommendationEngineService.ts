// Course Recommendation Engine Service
// "Trust in the LORD with all your heart and lean not on your own understanding" - Proverbs 3:5

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import {
  CourseRecommendation,
  RecommendationCriteria
} from '../types/enrollment.types';

const prisma = new PrismaClient();

export class CourseRecommendationEngineService {
  /**
   * Get personalized course recommendations for a student
   */
  async getRecommendations(
    criteria: RecommendationCriteria
  ): Promise<CourseRecommendation[]> {
    try {
      logger.info('Generating course recommendations', { userId: criteria.userId });

      // Get user profile
      const user = await prisma.user.findUnique({
        where: { id: criteria.userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get user's completed and current courses
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: criteria.userId },
        include: { course: true }
      });

      const completedCourseIds = enrollments
        .filter(e => e.completedAt)
        .map(e => e.courseId);
      
      const currentCourseIds = enrollments
        .filter(e => !e.completedAt && e.status === 'ACTIVE')
        .map(e => e.courseId);

      // Get available courses
      const availableCourses = await prisma.course.findMany({
        where: {
          isActive: true,
          id: {
            notIn: [...completedCourseIds, ...currentCourseIds]
          }
        },
        include: {
          faculty: true
        }
      });

      // Score and rank courses
      const recommendations: CourseRecommendation[] = [];

      for (const course of availableCourses) {
        const matchScore = await this.calculateMatchScore(
          course,
          user,
          criteria,
          completedCourseIds
        );

        if (matchScore > 0) {
          const reasons = this.generateRecommendationReasons(
            course,
            user,
            criteria,
            matchScore
          );

          recommendations.push({
            courseId: course.id,
            title: course.title,
            description: course.description,
            difficulty: course.difficulty,
            duration: course.duration,
            scrollCoinCost: course.scrollCoinCost,
            scrollXPReward: course.scrollXPReward,
            matchScore,
            reasons,
            prerequisites: course.prerequisites,
            spiritualAlignment: this.calculateSpiritualAlignment(course, user),
            kingdomRelevance: this.determineKingdomRelevance(course, user)
          });
        }
      }

      // Sort by match score
      recommendations.sort((a, b) => b.matchScore - a.matchScore);

      // Return top 10 recommendations
      return recommendations.slice(0, 10);
    } catch (error) {
      logger.error('Error generating recommendations', { error, criteria });
      throw error;
    }
  }

  /**
   * Calculate match score for a course
   */
  private async calculateMatchScore(
    course: any,
    user: any,
    criteria: RecommendationCriteria,
    completedCourseIds: string[]
  ): Promise<number> {
    let score = 0;

    // Academic level match (30 points)
    if (this.matchesAcademicLevel(course, user.academicLevel)) {
      score += 30;
    }

    // Prerequisites met (20 points)
    if (this.prerequisitesMet(course, completedCourseIds)) {
      score += 20;
    } else if (course.prerequisites.length > 0) {
      return 0; // Cannot recommend if prerequisites not met
    }

    // Spiritual alignment (20 points)
    const spiritualScore = this.calculateSpiritualAlignment(course, user);
    score += spiritualScore * 20;

    // Budget fit (15 points)
    if (criteria.budget && course.scrollCoinCost <= criteria.budget) {
      score += 15;
    } else if (!criteria.budget) {
      score += 10; // Partial credit if no budget specified
    }

    // Time availability (10 points)
    if (criteria.availableTime) {
      const weeklyHours = course.duration / 4; // Assume 4-week course
      if (weeklyHours <= criteria.availableTime) {
        score += 10;
      }
    }

    // Career goals alignment (5 points)
    if (criteria.careerGoals && criteria.careerGoals.length > 0) {
      // Simple keyword matching
      const courseText = `${course.title} ${course.description}`.toLowerCase();
      const matchingGoals = criteria.careerGoals.filter(goal =>
        courseText.includes(goal.toLowerCase())
      );
      score += Math.min(matchingGoals.length * 2, 5);
    }

    return Math.min(score, 100);
  }

  /**
   * Check if course matches academic level
   */
  private matchesAcademicLevel(course: any, academicLevel: string): boolean {
    const levelMap: { [key: string]: string[] } = {
      SCROLL_OPEN: ['BEGINNER'],
      SCROLL_STARTER: ['BEGINNER', 'INTERMEDIATE'],
      SCROLL_DEGREE: ['INTERMEDIATE', 'ADVANCED'],
      SCROLL_DOCTORATE: ['ADVANCED', 'PROPHETIC'],
      SCROLL_SCHOLARSHIP: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']
    };

    return levelMap[academicLevel]?.includes(course.difficulty) || false;
  }

  /**
   * Check if prerequisites are met
   */
  private prerequisitesMet(course: any, completedCourseIds: string[]): boolean {
    if (!course.prerequisites || course.prerequisites.length === 0) {
      return true;
    }

    return course.prerequisites.every((prereq: string) =>
      completedCourseIds.includes(prereq)
    );
  }

  /**
   * Calculate spiritual alignment score
   */
  private calculateSpiritualAlignment(course: any, user: any): number {
    // Simple alignment based on user's spiritual gifts and course content
    let alignment = 0.5; // Base alignment

    // Check if course aligns with user's spiritual gifts
    if (user.spiritualGifts && user.spiritualGifts.length > 0) {
      const courseText = `${course.title} ${course.description}`.toLowerCase();
      const matchingGifts = user.spiritualGifts.filter((gift: string) =>
        courseText.includes(gift.toLowerCase())
      );
      alignment += matchingGifts.length * 0.1;
    }

    // Check if course aligns with user's calling
    if (user.scrollCalling) {
      const courseText = `${course.title} ${course.description}`.toLowerCase();
      if (courseText.includes(user.scrollCalling.toLowerCase())) {
        alignment += 0.2;
      }
    }

    return Math.min(alignment, 1.0);
  }

  /**
   * Determine kingdom relevance
   */
  private determineKingdomRelevance(course: any, user: any): string {
    const courseText = `${course.title} ${course.description}`.toLowerCase();
    
    if (courseText.includes('ministry') || courseText.includes('spiritual')) {
      return 'Direct ministry application';
    } else if (courseText.includes('leadership') || courseText.includes('service')) {
      return 'Kingdom leadership development';
    } else if (courseText.includes('technology') || courseText.includes('innovation')) {
      return 'Kingdom advancement through innovation';
    } else {
      return 'Skill development for kingdom service';
    }
  }

  /**
   * Generate recommendation reasons
   */
  private generateRecommendationReasons(
    course: any,
    user: any,
    criteria: RecommendationCriteria,
    matchScore: number
  ): string[] {
    const reasons: string[] = [];

    if (matchScore >= 80) {
      reasons.push('Highly recommended based on your profile');
    }

    if (this.matchesAcademicLevel(course, user.academicLevel)) {
      reasons.push(`Matches your ${user.academicLevel} level`);
    }

    if (user.spiritualGifts && user.spiritualGifts.length > 0) {
      const courseText = `${course.title} ${course.description}`.toLowerCase();
      const matchingGifts = user.spiritualGifts.filter((gift: string) =>
        courseText.includes(gift.toLowerCase())
      );
      if (matchingGifts.length > 0) {
        reasons.push(`Aligns with your spiritual gift of ${matchingGifts[0]}`);
      }
    }

    if (criteria.budget && course.scrollCoinCost <= criteria.budget) {
      reasons.push('Fits within your budget');
    }

    if (course.scrollXPReward > 50) {
      reasons.push(`High ScrollXP reward (${course.scrollXPReward} XP)`);
    }

    if (course.difficulty === 'BEGINNER') {
      reasons.push('Great for beginners');
    }

    return reasons;
  }

  /**
   * Get trending courses
   */
  async getTrendingCourses(limit: number = 5): Promise<CourseRecommendation[]> {
    try {
      // Get courses with most enrollments in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const courses = await prisma.course.findMany({
        where: {
          isActive: true,
          enrollments: {
            some: {
              startedAt: {
                gte: thirtyDaysAgo
              }
            }
          }
        },
        include: {
          _count: {
            select: {
              enrollments: true
            }
          }
        },
        take: limit,
        orderBy: {
          enrollments: {
            _count: 'desc'
          }
        }
      });

      return courses.map(course => ({
        courseId: course.id,
        title: course.title,
        description: course.description,
        difficulty: course.difficulty,
        duration: course.duration,
        scrollCoinCost: course.scrollCoinCost,
        scrollXPReward: course.scrollXPReward,
        matchScore: 75, // Default score for trending
        reasons: ['Popular course', `${course._count.enrollments} recent enrollments`],
        prerequisites: course.prerequisites,
        spiritualAlignment: 0.7,
        kingdomRelevance: 'Community favorite'
      }));
    } catch (error) {
      logger.error('Error getting trending courses', { error });
      throw error;
    }
  }

  /**
   * Get recommended learning path
   */
  async getRecommendedPath(
    userId: string,
    goalType: 'degree' | 'certification' | 'skill'
  ): Promise<CourseRecommendation[]> {
    try {
      logger.info('Generating learning path', { userId, goalType });

      // Get user's current progress
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          enrollments: {
            include: { course: true }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get recommendations based on goal type
      const criteria: RecommendationCriteria = {
        userId,
        academicLevel: user.academicLevel,
        spiritualGifts: user.spiritualGifts,
        completedCourses: user.enrollments
          .filter(e => e.completedAt)
          .map(e => e.courseId),
        currentEnrollments: user.enrollments
          .filter(e => !e.completedAt && e.status === 'ACTIVE')
          .map(e => e.courseId)
      };

      const recommendations = await this.getRecommendations(criteria);

      // Order recommendations to create a logical learning path
      return this.orderAsLearningPath(recommendations);
    } catch (error) {
      logger.error('Error generating learning path', { error, userId, goalType });
      throw error;
    }
  }

  /**
   * Order recommendations as a learning path
   */
  private orderAsLearningPath(
    recommendations: CourseRecommendation[]
  ): CourseRecommendation[] {
    // Sort by difficulty first, then by match score
    return recommendations.sort((a, b) => {
      const difficultyOrder = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3, PROPHETIC: 4 };
      const diffA = difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 0;
      const diffB = difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 0;

      if (diffA !== diffB) {
        return diffA - diffB;
      }

      return b.matchScore - a.matchScore;
    });
  }
}

export default new CourseRecommendationEngineService();
