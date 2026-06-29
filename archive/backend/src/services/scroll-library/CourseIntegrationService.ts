import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { AgentOrchestrationService, Book } from './AgentOrchestrationService';
import { LibraryManagementService, CourseMaterial } from './LibraryManagementService';

export interface CourseOutline {
  courseId: string;
  title: string;
  description: string;
  modules: ModuleOutline[];
  learningObjectives: string[];
}

export interface ModuleOutline {
  title: string;
  topics: string[];
  duration: number; // in hours
}

export interface StudentProgress {
  studentId: string;
  courseId: string;
  materialsAccessed: string[];
  completionPercentage: number;
  lastAccessedAt: Date;
}

export interface MaterialUpdate {
  materialId: string;
  type: 'textbook' | 'workbook' | 'slides' | 'studypack';
  version: string;
  updatedAt: Date;
}

/**
 * Course Integration Service for ScrollLibrary
 * Handles integration with ScrollUniversity course management system
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */
export class CourseIntegrationService {
  private prisma: PrismaClient;
  private orchestration: AgentOrchestrationService;
  private libraryManagement: LibraryManagementService;

  constructor() {
    this.prisma = new PrismaClient();
    this.orchestration = new AgentOrchestrationService();
    this.libraryManagement = new LibraryManagementService();
  }

  /**
   * Provisions course materials when a student enrolls
   * Validates: Requirements 3.1
   * 
   * Property 8: Enrollment Triggers Provisioning
   * For any student enrollment in a course, all course materials should 
   * automatically appear in the student's account
   */
  async provisionMaterials(studentId: string, courseId: string): Promise<CourseMaterial> {
    try {
      logger.info('Provisioning course materials for student', { studentId, courseId });

      // Check if course materials exist
      let courseMaterial: CourseMaterial;
      
      try {
        courseMaterial = await this.libraryManagement.getCourseMaterials(courseId);
      } catch (error) {
        // If materials don't exist, auto-generate them
        logger.info('Course materials not found, auto-generating', { courseId });
        courseMaterial = await this.autoGenerateCourseMaterials(courseId);
      }

      // Create student access record
      await this.prisma.scrollStudentMaterialAccess.create({
        data: {
          studentId,
          courseMaterialId: courseMaterial.id,
          accessGrantedAt: new Date(),
          lastAccessedAt: new Date()
        }
      });

      // Track initial progress
      await this.trackStudentProgress(studentId, courseId, {
        materialsAccessed: [],
        completionPercentage: 0,
        lastAccessedAt: new Date()
      });

      logger.info('Course materials provisioned successfully', { 
        studentId, 
        courseId,
        materialId: courseMaterial.id 
      });

      return courseMaterial;
    } catch (error) {
      logger.error('Course material provisioning failed', { error, studentId, courseId });
      throw error;
    }
  }

  /**
   * Synchronizes material updates to all enrolled students
   * Validates: Requirements 3.2
   * 
   * Property 9: Material Synchronization Timing
   * For any course material update, all enrolled students should receive 
   * the updated materials within 5 minutes
   */
  async syncMaterialUpdates(courseId: string, update: MaterialUpdate): Promise<void> {
    try {
      logger.info('Syncing material updates to enrolled students', { courseId, update });

      const startTime = Date.now();

      // Get all enrolled students for this course
      const enrolledStudents = await this.prisma.scrollStudentMaterialAccess.findMany({
        where: {
          courseMaterial: {
            courseId
          }
        },
        select: {
          studentId: true,
          courseMaterialId: true
        }
      });

      logger.info(`Found ${enrolledStudents.length} enrolled students`, { courseId });

      // Update material version in database
      await this.updateMaterialVersion(courseId, update);

      // Notify all enrolled students
      const notificationPromises = enrolledStudents.map(async (enrollment) => {
        try {
          // Create update notification
          await this.prisma.scrollMaterialUpdateNotification.create({
            data: {
              studentId: enrollment.studentId,
              courseMaterialId: enrollment.courseMaterialId,
              updateType: update.type,
              version: update.version,
              notifiedAt: new Date(),
              acknowledged: false
            }
          });

          // Invalidate any cached materials
          await this.invalidateStudentCache(enrollment.studentId, courseId);
        } catch (error) {
          logger.error('Failed to notify student of update', { 
            error, 
            studentId: enrollment.studentId,
            courseId 
          });
        }
      });

      await Promise.all(notificationPromises);

      const syncDuration = Date.now() - startTime;
      const syncDurationMinutes = syncDuration / 1000 / 60;

      logger.info('Material updates synced successfully', { 
        courseId, 
        studentsNotified: enrolledStudents.length,
        syncDurationMs: syncDuration,
        syncDurationMinutes
      });

      // Verify sync completed within 5 minutes
      if (syncDurationMinutes > 5) {
        logger.warn('Material sync exceeded 5 minute target', { 
          courseId, 
          syncDurationMinutes 
        });
      }
    } catch (error) {
      logger.error('Material synchronization failed', { error, courseId, update });
      throw error;
    }
  }

  /**
   * Auto-generates complete course materials for a new course
   * Validates: Requirements 3.3
   * 
   * Property 10: Complete Course Material Generation
   * For any newly created course, all five material types (textbooks, workbooks, 
   * slides, quizzes, reading lists) should be auto-generated
   */
  async autoGenerateCourseMaterials(courseId: string): Promise<CourseMaterial> {
    try {
      logger.info('Auto-generating course materials', { courseId });

      // Get course outline from ScrollUniversity
      const courseOutline = await this.getCourseOutline(courseId);

      // Generate textbook using agent orchestration
      logger.info('Generating textbook', { courseId });
      const textbook = await this.orchestration.orchestrateBookGeneration(
        courseOutline.title,
        courseOutline
      );

      // Generate workbook
      logger.info('Generating workbook', { courseId });
      const workbook = await this.generateWorkbook(courseOutline, textbook);

      // Generate lecture slides
      logger.info('Generating lecture slides', { courseId });
      const lectureSlides = await this.generateLectureSlides(courseOutline, textbook);

      // Generate study pack
      logger.info('Generating study pack', { courseId });
      const studyPack = await this.generateStudyPack(courseOutline, textbook);

      // Generate quizzes
      logger.info('Generating quizzes', { courseId });
      const quizzes = await this.generateQuizzes(courseOutline, textbook);

      // Generate reading list
      logger.info('Generating reading list', { courseId });
      const readingList = await this.generateReadingList(courseOutline);

      // Create course material record
      const courseMaterial = await this.prisma.scrollCourseMaterial.create({
        data: {
          courseId,
          textbookId: textbook.id,
          workbookId: workbook.id,
          lectureSlides: lectureSlides.map(slide => slide.id),
          studyPackId: studyPack.id,
          pastQuestions: {
            create: quizzes.map(quiz => ({
              type: quiz.type.toUpperCase().replace('-', '_') as any,
              content: quiz.content,
              options: quiz.options || [],
              correctAnswer: quiz.correctAnswer,
              explanation: quiz.explanation
            }))
          },
          readingList: {
            create: readingList.map(item => ({
              title: item.title,
              author: item.author,
              type: item.type.toUpperCase() as any,
              url: item.url,
              required: item.required
            }))
          }
        },
        include: {
          textbook: true,
          studyPack: true,
          pastQuestions: true,
          readingList: true
        }
      });

      logger.info('Course materials auto-generated successfully', { 
        courseId,
        materialId: courseMaterial.id,
        textbookId: textbook.id,
        workbookId: workbook.id,
        slideCount: lectureSlides.length,
        quizCount: quizzes.length,
        readingListCount: readingList.length
      });

      // Convert to CourseMaterial interface
      return {
        id: courseMaterial.id,
        courseId: courseMaterial.courseId,
        textbookId: courseMaterial.textbookId || undefined,
        workbookId: courseMaterial.workbookId || undefined,
        lectureSlides: courseMaterial.lectureSlides,
        studyPackId: courseMaterial.studyPackId || undefined,
        pastQuestions: courseMaterial.pastQuestions.map(q => ({
          id: q.id,
          type: q.type.toLowerCase().replace('_', '-') as 'multiple-choice' | 'essay' | 'short-answer',
          content: q.content,
          options: q.options,
          correctAnswer: q.correctAnswer || undefined,
          explanation: q.explanation || undefined
        })),
        readingList: courseMaterial.readingList.map(item => ({
          id: item.id,
          title: item.title,
          author: item.author,
          type: item.type.toLowerCase() as 'book' | 'article' | 'video' | 'website',
          url: item.url || undefined,
          required: item.required
        })),
        createdAt: courseMaterial.createdAt,
        updatedAt: courseMaterial.updatedAt
      };
    } catch (error) {
      logger.error('Course material auto-generation failed', { error, courseId });
      throw error;
    }
  }

  /**
   * Tracks student progress through course materials
   * Validates: Requirements 3.4, 3.5
   * 
   * Property 12: Access Tracking
   * For any student access to materials, tracking data should be created 
   * and completion analytics should be updated
   */
  async trackStudentProgress(
    studentId: string, 
    courseId: string, 
    progress: Partial<StudentProgress>
  ): Promise<StudentProgress> {
    try {
      logger.info('Tracking student progress', { studentId, courseId, progress });

      // Get or create progress record
      let progressRecord = await this.prisma.scrollStudentProgress.findFirst({
        where: {
          studentId,
          courseId
        }
      });

      if (!progressRecord) {
        progressRecord = await this.prisma.scrollStudentProgress.create({
          data: {
            studentId,
            courseId,
            materialsAccessed: progress.materialsAccessed || [],
            completionPercentage: progress.completionPercentage || 0,
            lastAccessedAt: progress.lastAccessedAt || new Date()
          }
        });
      } else {
        // Update existing progress
        progressRecord = await this.prisma.scrollStudentProgress.update({
          where: { id: progressRecord.id },
          data: {
            materialsAccessed: progress.materialsAccessed || progressRecord.materialsAccessed,
            completionPercentage: progress.completionPercentage !== undefined 
              ? progress.completionPercentage 
              : progressRecord.completionPercentage,
            lastAccessedAt: progress.lastAccessedAt || new Date()
          }
        });
      }

      // Update completion analytics
      await this.updateCompletionAnalytics(studentId, courseId, progressRecord.completionPercentage);

      logger.info('Student progress tracked successfully', { 
        studentId, 
        courseId,
        completionPercentage: progressRecord.completionPercentage
      });

      return {
        studentId: progressRecord.studentId,
        courseId: progressRecord.courseId,
        materialsAccessed: progressRecord.materialsAccessed,
        completionPercentage: progressRecord.completionPercentage,
        lastAccessedAt: progressRecord.lastAccessedAt
      };
    } catch (error) {
      logger.error('Student progress tracking failed', { error, studentId, courseId });
      throw error;
    }
  }

  /**
   * Gets course outline from ScrollUniversity
   */
  private async getCourseOutline(courseId: string): Promise<CourseOutline> {
    try {
      // In a real implementation, this would fetch from ScrollUniversity API
      // For now, create a basic outline
      logger.info('Fetching course outline', { courseId });

      // Try to get from database first
      const course = await this.prisma.courseProject.findUnique({
        where: { id: courseId },
        include: {
          modules: true
        }
      });

      if (course) {
        return {
          courseId: course.id,
          title: course.title,
          description: course.description || '',
          modules: course.modules.map(module => ({
            title: module.title,
            topics: [], // Would be populated from module content
            duration: 4 // Default duration
          })),
          learningObjectives: [] // Would be populated from course data
        };
      }

      // Fallback to basic outline
      return {
        courseId,
        title: `Course ${courseId}`,
        description: 'Auto-generated course materials',
        modules: [
          {
            title: 'Introduction',
            topics: ['Overview', 'Foundations'],
            duration: 2
          }
        ],
        learningObjectives: ['Understand core concepts', 'Apply knowledge']
      };
    } catch (error) {
      logger.error('Failed to get course outline', { error, courseId });
      throw error;
    }
  }

  /**
   * Generates workbook from textbook
   */
  private async generateWorkbook(outline: CourseOutline, textbook: Book): Promise<Book> {
    try {
      // Generate workbook with exercises and practice problems
      const workbookData = {
        title: `${outline.title} - Workbook`,
        subtitle: 'Practice Exercises and Applications',
        subject: textbook.subject,
        level: textbook.level,
        courseReference: outline.courseId
      };

      const workbook = await this.libraryManagement.createBook(workbookData);
      
      return workbook;
    } catch (error) {
      logger.error('Workbook generation failed', { error, courseId: outline.courseId });
      throw error;
    }
  }

  /**
   * Generates lecture slides from textbook
   */
  private async generateLectureSlides(outline: CourseOutline, textbook: Book): Promise<Array<{ id: string }>> {
    try {
      // Generate slides for each module
      const slides = outline.modules.map((module, index) => ({
        id: `slide-${outline.courseId}-${index}`,
        title: module.title,
        content: `Lecture slides for ${module.title}`
      }));

      return slides;
    } catch (error) {
      logger.error('Lecture slides generation failed', { error, courseId: outline.courseId });
      throw error;
    }
  }

  /**
   * Generates study pack from textbook
   */
  private async generateStudyPack(outline: CourseOutline, textbook: Book): Promise<{ id: string }> {
    try {
      // Create study pack record
      const studyPack = await this.prisma.scrollStudyPack.create({
        data: {
          courseId: outline.courseId,
          summaryBooklet: `Summary for ${outline.title}`,
          createdAt: new Date()
        }
      });

      return { id: studyPack.id };
    } catch (error) {
      logger.error('Study pack generation failed', { error, courseId: outline.courseId });
      throw error;
    }
  }

  /**
   * Generates quizzes from textbook
   */
  private async generateQuizzes(outline: CourseOutline, textbook: Book): Promise<Array<{
    id: string;
    type: 'multiple-choice' | 'essay' | 'short-answer';
    content: string;
    options?: string[];
    correctAnswer?: string;
    explanation?: string;
  }>> {
    try {
      // Generate sample quizzes
      const quizzes = outline.modules.map((module, index) => ({
        id: `quiz-${outline.courseId}-${index}`,
        type: 'multiple-choice' as const,
        content: `Question about ${module.title}`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A',
        explanation: 'Explanation for correct answer'
      }));

      return quizzes;
    } catch (error) {
      logger.error('Quiz generation failed', { error, courseId: outline.courseId });
      throw error;
    }
  }

  /**
   * Generates reading list for course
   */
  private async generateReadingList(outline: CourseOutline): Promise<Array<{
    id: string;
    title: string;
    author: string;
    type: 'book' | 'article' | 'video' | 'website';
    url?: string;
    required: boolean;
  }>> {
    try {
      // Generate sample reading list
      const readingList = [
        {
          id: `reading-${outline.courseId}-1`,
          title: `Essential Reading for ${outline.title}`,
          author: 'ScrollUniversity Faculty',
          type: 'book' as const,
          required: true
        },
        {
          id: `reading-${outline.courseId}-2`,
          title: `Supplementary Materials`,
          author: 'Various Authors',
          type: 'article' as const,
          url: 'https://scrolluniversity.edu/resources',
          required: false
        }
      ];

      return readingList;
    } catch (error) {
      logger.error('Reading list generation failed', { error, courseId: outline.courseId });
      throw error;
    }
  }

  /**
   * Updates material version in database
   */
  private async updateMaterialVersion(courseId: string, update: MaterialUpdate): Promise<void> {
    try {
      // Update the appropriate material based on type
      const courseMaterial = await this.prisma.scrollCourseMaterial.findFirst({
        where: { courseId }
      });

      if (!courseMaterial) {
        throw new Error(`Course material not found for course: ${courseId}`);
      }

      // Update version tracking
      await this.prisma.scrollMaterialVersion.create({
        data: {
          courseMaterialId: courseMaterial.id,
          materialType: update.type,
          version: update.version,
          updatedAt: update.updatedAt
        }
      });

      logger.info('Material version updated', { courseId, update });
    } catch (error) {
      logger.error('Failed to update material version', { error, courseId, update });
      throw error;
    }
  }

  /**
   * Invalidates cached materials for a student
   */
  private async invalidateStudentCache(studentId: string, courseId: string): Promise<void> {
    try {
      // In a real implementation, this would invalidate Redis cache
      logger.info('Invalidating student cache', { studentId, courseId });
      
      // Update cache invalidation timestamp
      await this.prisma.scrollStudentMaterialAccess.updateMany({
        where: {
          studentId,
          courseMaterial: {
            courseId
          }
        },
        data: {
          cacheInvalidatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to invalidate student cache', { error, studentId, courseId });
      // Don't throw - cache invalidation failure shouldn't block sync
    }
  }

  /**
   * Updates completion analytics for a student
   */
  private async updateCompletionAnalytics(
    studentId: string, 
    courseId: string, 
    completionPercentage: number
  ): Promise<void> {
    try {
      // Update analytics record
      await this.prisma.scrollCompletionAnalytics.upsert({
        where: {
          studentId_courseId: {
            studentId,
            courseId
          }
        },
        create: {
          studentId,
          courseId,
          completionPercentage,
          lastUpdated: new Date()
        },
        update: {
          completionPercentage,
          lastUpdated: new Date()
        }
      });

      logger.info('Completion analytics updated', { 
        studentId, 
        courseId, 
        completionPercentage 
      });
    } catch (error) {
      logger.error('Failed to update completion analytics', { 
        error, 
        studentId, 
        courseId 
      });
      // Don't throw - analytics failure shouldn't block progress tracking
    }
  }
}

export default CourseIntegrationService;
