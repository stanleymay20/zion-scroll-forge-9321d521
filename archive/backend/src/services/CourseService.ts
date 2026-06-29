/**
 * Course Content Management Service
 * "Let every course be a scroll that opens the kingdom to hungry hearts"
 * 
 * Handles comprehensive course management including:
 * - Course CRUD operations
 * - Module and lecture management
 * - Content versioning
 * - File storage integration
 * - Course preview and enrollment
 */

import { PrismaClient, Difficulty } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  CourseCreateInput,
  CourseUpdateInput,
  CourseResponse,
  CourseSearchParams,
  CourseSearchResponse,
  CoursePreviewResponse,
  EnrollmentRequest,
  EnrollmentResponse,
  CourseAnalytics,
  ContentVersion,
  VersionHistoryResponse
} from '../types/course.types';

const prisma = new PrismaClient();

export default class CourseService {
  /**
   * Create a new course with comprehensive validation
   */
  async createCourse(input: CourseCreateInput, createdBy: string): Promise<CourseResponse> {
    try {
      logger.info('Creating new course', { title: input.title, createdBy });

      // Validate faculty exists
      const faculty = await prisma.faculty.findUnique({
        where: { id: input.facultyId }
      });

      if (!faculty) {
        throw new Error('Faculty not found');
      }

      // Validate prerequisites exist
      if (input.prerequisites && input.prerequisites.length > 0) {
        const prereqCourses = await prisma.course.findMany({
          where: { id: { in: input.prerequisites } }
        });

        if (prereqCourses.length !== input.prerequisites.length) {
          throw new Error('One or more prerequisite courses not found');
        }
      }

      // Create course
      const course = await prisma.course.create({
        data: {
          title: input.title,
          description: input.description,
          syllabus: input.syllabus,
          difficulty: input.difficulty,
          duration: input.duration,
          scrollXPReward: input.scrollXPReward || 10,
          scrollCoinCost: input.scrollCoinCost || 0.0,
          facultyId: input.facultyId,
          prerequisites: input.prerequisites || [],
          videoUrl: input.videoUrl,
          materials: input.materials || [],
          isActive: false, // Starts as draft
        },
        include: {
          faculty: true
        }
      });

      // Create version history entry
      await this.createVersionEntry('COURSE', course.id, 1, {
        action: 'CREATED',
        data: input
      }, createdBy, 'Initial course creation');

      logger.info('Course created successfully', { courseId: course.id });

      return this.formatCourseResponse(course);
    } catch (error) {
      logger.error('Error creating course:', error);
      throw new Error(`Failed to create course: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an existing course
   */
  async updateCourse(courseId: string, input: CourseUpdateInput, updatedBy: string): Promise<CourseResponse> {
    try {
      logger.info('Updating course', { courseId, updatedBy });

      // Get current course for versioning
      const currentCourse = await prisma.course.findUnique({
        where: { id: courseId }
      });

      if (!currentCourse) {
        throw new Error('Course not found');
      }

      // Validate faculty if being updated
      if (input.facultyId) {
        const faculty = await prisma.faculty.findUnique({
          where: { id: input.facultyId }
        });

        if (!faculty) {
          throw new Error('Faculty not found');
        }
      }

      // Update course
      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: {
          ...input,
          updatedAt: new Date()
        },
        include: {
          faculty: true
        }
      });

      // Create version history entry
      const versionCount = await this.getVersionCount('COURSE', courseId);
      await this.createVersionEntry('COURSE', courseId, versionCount + 1, {
        action: 'UPDATED',
        changes: input,
        previous: currentCourse
      }, updatedBy, 'Course updated');

      logger.info('Course updated successfully', { courseId });

      return this.formatCourseResponse(updatedCourse);
    } catch (error) {
      logger.error('Error updating course:', error);
      throw new Error(`Failed to update course: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get course by ID with full details
   */
  async getCourseById(courseId: string, includeModules: boolean = false): Promise<CourseResponse> {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          faculty: true,
          enrollments: true
        }
      });

      if (!course) {
        throw new Error('Course not found');
      }

      const response = this.formatCourseResponse(course);

      // Add enrollment count
      response.enrollmentCount = course.enrollments.length;

      return response;
    } catch (error) {
      logger.error('Error getting course:', error);
      throw new Error(`Failed to get course: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search and filter courses
   */
  async searchCourses(params: CourseSearchParams): Promise<CourseSearchResponse> {
    try {
      const {
        query,
        facultyId,
        difficulty,
        minDuration,
        maxDuration,
        maxScrollCoinCost,
        isActive = true,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = params;

      // Build where clause
      const where: any = { isActive };

      if (query) {
        where.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ];
      }

      if (facultyId) {
        where.facultyId = facultyId;
      }

      if (difficulty) {
        where.difficulty = difficulty;
      }

      if (minDuration !== undefined) {
        where.duration = { ...where.duration, gte: minDuration };
      }

      if (maxDuration !== undefined) {
        where.duration = { ...where.duration, lte: maxDuration };
      }

      if (maxScrollCoinCost !== undefined) {
        where.scrollCoinCost = { lte: maxScrollCoinCost };
      }

      // Get total count
      const total = await prisma.course.count({ where });

      // Get paginated results
      const courses = await prisma.course.findMany({
        where,
        include: {
          faculty: true,
          enrollments: true
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      });

      const formattedCourses = courses.map(course => {
        const response = this.formatCourseResponse(course);
        response.enrollmentCount = course.enrollments.length;
        return response;
      });

      return {
        courses: formattedCourses,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error searching courses:', error);
      throw new Error(`Failed to search courses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get course preview for enrollment decision
   */
  async getCoursePreview(courseId: string): Promise<CoursePreviewResponse> {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          faculty: true,
          enrollments: {
            include: {
              user: true
            }
          }
        }
      });

      if (!course) {
        throw new Error('Course not found');
      }

      // Get prerequisite courses
      const prerequisites = await prisma.course.findMany({
        where: {
          id: { in: course.prerequisites }
        },
        include: {
          faculty: true
        }
      });

      return {
        course: this.formatCourseResponse(course),
        sampleLectures: [], // TODO: Implement when lecture system is ready
        instructorInfo: {
          name: course.faculty.name,
          bio: course.faculty.description
        },
        reviews: [], // TODO: Implement review system
        prerequisites: prerequisites.map(p => this.formatCourseResponse(p))
      };
    } catch (error) {
      logger.error('Error getting course preview:', error);
      throw new Error(`Failed to get course preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enroll user in course
   */
  async enrollInCourse(userId: string, request: EnrollmentRequest): Promise<EnrollmentResponse> {
    try {
      logger.info('Enrolling user in course', { userId, courseId: request.courseId });

      // Check if course exists and is active
      const course = await prisma.course.findUnique({
        where: { id: request.courseId }
      });

      if (!course) {
        throw new Error('Course not found');
      }

      if (!course.isActive) {
        throw new Error('Course is not currently available for enrollment');
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: request.courseId
          }
        }
      });

      if (existingEnrollment) {
        throw new Error('User is already enrolled in this course');
      }

      // Check prerequisites
      if (course.prerequisites.length > 0) {
        const completedCourses = await prisma.enrollment.findMany({
          where: {
            userId,
            courseId: { in: course.prerequisites },
            status: 'ACTIVE',
            completedAt: { not: null }
          }
        });

        if (completedCourses.length !== course.prerequisites.length) {
          throw new Error('Prerequisites not met');
        }
      }

      // Handle payment if required
      if (course.scrollCoinCost > 0 && request.paymentMethod === 'SCROLL_COIN') {
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (!user || user.scrollCoinBalance < course.scrollCoinCost) {
          throw new Error('Insufficient ScrollCoin balance');
        }

        // Deduct ScrollCoin
        await prisma.user.update({
          where: { id: userId },
          data: {
            scrollCoinBalance: user.scrollCoinBalance - course.scrollCoinCost
          }
        });

        // Record transaction
        await prisma.scrollCoinTransaction.create({
          data: {
            userId,
            amount: -course.scrollCoinCost,
            type: 'SPENT',
            description: `Enrolled in course: ${course.title}`,
            activityType: 'COURSE_COMPLETION',
            relatedEntityId: course.id
          }
        });
      }

      // Create enrollment
      const enrollment = await prisma.enrollment.create({
        data: {
          userId,
          courseId: request.courseId,
          status: 'ACTIVE',
          progress: 0,
          scrollXPEarned: 0,
          currentModule: 1
        }
      });

      logger.info('User enrolled successfully', { enrollmentId: enrollment.id });

      return {
        id: enrollment.id,
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        progress: enrollment.progress,
        scrollXPEarned: enrollment.scrollXPEarned,
        currentModule: enrollment.currentModule,
        status: enrollment.status,
        startedAt: enrollment.startedAt,
        completedAt: enrollment.completedAt || undefined
      };
    } catch (error) {
      logger.error('Error enrolling in course:', error);
      throw new Error(`Failed to enroll in course: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Publish course (make it active and available)
   */
  async publishCourse(courseId: string, publishedBy: string): Promise<CourseResponse> {
    try {
      logger.info('Publishing course', { courseId, publishedBy });

      const course = await prisma.course.update({
        where: { id: courseId },
        data: {
          isActive: true,
          publishedAt: new Date()
        },
        include: {
          faculty: true
        }
      });

      // Create version entry
      const versionCount = await this.getVersionCount('COURSE', courseId);
      await this.createVersionEntry('COURSE', courseId, versionCount + 1, {
        action: 'PUBLISHED'
      }, publishedBy, 'Course published');

      logger.info('Course published successfully', { courseId });

      return this.formatCourseResponse(course);
    } catch (error) {
      logger.error('Error publishing course:', error);
      throw new Error(`Failed to publish course: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Unpublish course (make it inactive)
   */
  async unpublishCourse(courseId: string, unpublishedBy: string): Promise<CourseResponse> {
    try {
      logger.info('Unpublishing course', { courseId, unpublishedBy });

      const course = await prisma.course.update({
        where: { id: courseId },
        data: {
          isActive: false
        },
        include: {
          faculty: true
        }
      });

      // Create version entry
      const versionCount = await this.getVersionCount('COURSE', courseId);
      await this.createVersionEntry('COURSE', courseId, versionCount + 1, {
        action: 'UNPUBLISHED'
      }, unpublishedBy, 'Course unpublished');

      logger.info('Course unpublished successfully', { courseId });

      return this.formatCourseResponse(course);
    } catch (error) {
      logger.error('Error unpublishing course:', error);
      throw new Error(`Failed to unpublish course: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete course (soft delete by marking inactive)
   */
  async deleteCourse(courseId: string, deletedBy: string): Promise<void> {
    try {
      logger.info('Deleting course', { courseId, deletedBy });

      // Check for active enrollments
      const activeEnrollments = await prisma.enrollment.count({
        where: {
          courseId,
          status: 'ACTIVE'
        }
      });

      if (activeEnrollments > 0) {
        throw new Error('Cannot delete course with active enrollments');
      }

      // Soft delete by marking inactive
      await prisma.course.update({
        where: { id: courseId },
        data: {
          isActive: false
        }
      });

      // Create version entry
      const versionCount = await this.getVersionCount('COURSE', courseId);
      await this.createVersionEntry('COURSE', courseId, versionCount + 1, {
        action: 'DELETED'
      }, deletedBy, 'Course deleted');

      logger.info('Course deleted successfully', { courseId });
    } catch (error) {
      logger.error('Error deleting course:', error);
      throw new Error(`Failed to delete course: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get course analytics
   */
  async getCourseAnalytics(courseId: string): Promise<CourseAnalytics> {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId }
      });

      const activeEnrollments = enrollments.filter(e => e.status === 'ACTIVE');
      const completedEnrollments = enrollments.filter(e => e.completedAt !== null);

      const totalProgress = enrollments.reduce((sum, e) => sum + e.progress, 0);
      const totalScrollXP = enrollments.reduce((sum, e) => sum + e.scrollXPEarned, 0);

      return {
        courseId,
        totalEnrollments: enrollments.length,
        activeEnrollments: activeEnrollments.length,
        completionRate: enrollments.length > 0 ? (completedEnrollments.length / enrollments.length) * 100 : 0,
        averageProgress: enrollments.length > 0 ? totalProgress / enrollments.length : 0,
        averageRating: 0, // TODO: Implement rating system
        totalScrollXPAwarded: totalScrollXP,
        totalScrollCoinEarned: 0, // TODO: Calculate from transactions
        popularModules: [],
        engagementMetrics: {
          averageTimeSpent: 0,
          videoCompletionRate: 0,
          assignmentSubmissionRate: 0
        }
      };
    } catch (error) {
      logger.error('Error getting course analytics:', error);
      throw new Error(`Failed to get course analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get version history for a course
   */
  async getVersionHistory(courseId: string): Promise<VersionHistoryResponse> {
    try {
      // TODO: Implement version history table
      // For now, return empty response
      return {
        versions: [],
        currentVersion: 1,
        totalVersions: 1
      };
    } catch (error) {
      logger.error('Error getting version history:', error);
      throw new Error(`Failed to get version history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private formatCourseResponse(course: any): CourseResponse {
    return {
      id: course.id,
      title: course.title,
      description: course.description,
      syllabus: course.syllabus || undefined,
      difficulty: course.difficulty,
      duration: course.duration,
      scrollXPReward: course.scrollXPReward,
      scrollCoinCost: course.scrollCoinCost,
      facultyId: course.facultyId,
      faculty: course.faculty ? {
        id: course.faculty.id,
        name: course.faculty.name,
        description: course.faculty.description
      } : undefined,
      prerequisites: course.prerequisites,
      videoUrl: course.videoUrl || undefined,
      materials: course.materials,
      isActive: course.isActive,
      publishedAt: course.publishedAt || undefined,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt
    };
  }

  private async createVersionEntry(
    entityType: 'COURSE' | 'MODULE' | 'LECTURE',
    entityId: string,
    version: number,
    changes: Record<string, any>,
    changedBy: string,
    changeReason?: string
  ): Promise<void> {
    // TODO: Implement version history table
    logger.info('Version entry created', {
      entityType,
      entityId,
      version,
      changedBy
    });
  }

  private async getVersionCount(entityType: 'COURSE' | 'MODULE' | 'LECTURE', entityId: string): Promise<number> {
    // TODO: Implement version history table
    return 0;
  }
}
