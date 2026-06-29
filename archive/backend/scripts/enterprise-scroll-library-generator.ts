/**
 * Enterprise-Scale ScrollLibrary Generator
 * Generates books for ALL 10,000+ ScrollUniversity courses
 * 
 * Features:
 * - Database-driven course fetching
 * - Distributed worker processing
 * - Priority-based generation
 * - Auto-generation on course creation
 * - Real-time dashboard
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../src/utils/logger';
import { AgentOrchestrationService, CourseOutline, ChapterSpec } from '../src/services/scroll-library/AgentOrchestrationService';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface EnterpriseConfig {
  workerCount: number;
  batchSize: number;
  priorityMode: 'enrollment' | 'creation-date' | 'alphabetical' | 'random';
  subjects?: string[];
  levels?: Array<'beginner' | 'intermediate' | 'advanced'>;
  autoGenerateOnCreate: boolean;
}

interface WorkerStatus {
  workerId: number;
  status: 'idle' | 'processing' | 'error';
  currentCourse?: string;
  booksGenerated: number;
  errors: number;
  startTime: Date;
}

interface EnterpriseProgress {
  totalCourses: number;
  completedCourses: number;
  failedCourses: number;
  inProgressCourses: number;
  workers: WorkerStatus[];
  startTime: Date;
  estimatedCompletion?: Date;
}

const PROGRESS_DIR = path.join(__dirname, '../data/enterprise-generation');
const PROGRESS_FILE = path.join(PROGRESS_DIR, 'progress.json');
const DASHBOARD_FILE = path.join(PROGRESS_DIR, 'dashboard.json');

/**
 * Fetches all courses from database with priority sorting
 */
async function fetchCoursesFromDatabase(config: EnterpriseConfig): Promise<any[]> {
  logger.info('Fetching courses from database', { config });

  let orderBy: any = {};
  
  switch (config.priorityMode) {
    case 'enrollment':
      // Courses with most enrollments first
      orderBy = { enrollments: { _count: 'desc' } };
      break;
    case 'creation-date':
      orderBy = { createdAt: 'desc' };
      break;
    case 'alphabetical':
      orderBy = { title: 'asc' };
      break;
    case 'random':
      // Will shuffle after fetch
      orderBy = { id: 'asc' };
      break;
  }

  const where: any = {};
  
  if (config.subjects && config.subjects.length > 0) {
    where.subject = { in: config.subjects };
  }
  
  if (config.levels && config.levels.length > 0) {
    where.level = { in: config.levels };
  }

  const courses = await prisma.courseProject.findMany({
    where,
    orderBy,
    include: {
      CourseModule: {
        include: {
          Lecture: true
        }
      }
    }
  });

  if (config.priorityMode === 'random') {
    // Fisher-Yates shuffle
    for (let i = courses.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [courses[i], courses[j]] = [courses[j], courses[i]];
    }
  }

  logger.info(`Fetched ${courses.length} courses from database`);
  return courses;
}

/**
 * Converts course data to book outline
 */
function courseToBookOutline(course: any): CourseOutline {
  const chapters: ChapterSpec[] = [];

  // Generate chapters from course modules
  if (course.modules && course.modules.length > 0) {
    course.modules.forEach((module: any, index: number) => {
      const topics = module.lectures?.map((l: any) => l.title) || [
        `Introduction to ${module.title}`,
        `Core Concepts`,
        `Practical Applications`,
        `Advanced Topics`
      ];

      chapters.push({
        title: module.title,
        orderIndex: index + 1,
        topics,
        learningObjectives: [
          `Master the fundamentals of ${module.title}`,
          `Apply concepts to real-world scenarios`,
          `Integrate biblical principles`,
          `Develop kingdom-focused perspective`
        ]
      });
    });
  } else {
    // Generate default chapters if no modules exist
    const defaultChapters = [
      'Introduction and Foundations',
      'Core Principles and Concepts',
      'Biblical Integration',
      'Practical Applications',
      'Advanced Topics',
      'Case Studies and Examples',
      'Kingdom Perspective',
      'Implementation Strategies',
      'Assessment and Evaluation',
      'Conclusion and Next Steps'
    ];

    defaultChapters.forEach((title, index) => {
      chapters.push({
        title,
        orderIndex: index + 1,
        topics: [
          `Overview of ${title}`,
          `Key concepts and principles`,
          `Practical applications`,
          `Spiritual integration`
        ],
        learningObjectives: [
          `Understand ${title}`,
          `Apply knowledge practically`,
          `Integrate with faith`,
          `Serve kingdom purposes`
        ]
      });
    });
  }

  return {
    title: `${course.title} - Comprehensive Textbook`,
    subject: course.subject || 'General Studies',
    level: course.level || 'intermediate',
    chapters,
    courseReference: course.id
  };
}

/**
 * Worker function for generating books
 */
async function worker(
  workerId: number,
  courses: any[],
  orchestrator: AgentOrchestrationService,
  progress: EnterpriseProgress
): Promise<void> {
  const workerStatus: WorkerStatus = {
    workerId,
    status: 'idle',
    booksGenerated: 0,
    errors: 0,
    startTime: new Date()
  };

  progress.workers[workerId] = workerStatus;

  for (const course of courses) {
    try {
      workerStatus.status = 'processing';
      workerStatus.currentCourse = course.title;
      progress.inProgressCourses++;
      
      updateDashboard(progress);

      logger.info(`Worker ${workerId}: Generating book for ${course.title}`);

      const outline = courseToBookOutline(course);
      const book = await orchestrator.orchestrateBookGeneration(course.title, outline);

      // Link book to course in database
      await prisma.courseProject.update({
        where: { id: course.id },
        data: { 
          // Note: textbookId field may need to be added to CourseProject schema
          // For now, we'll track this in the scroll_books table via courseReference
        }
      });

      workerStatus.booksGenerated++;
      progress.completedCourses++;
      progress.inProgressCourses--;

      logger.info(`Worker ${workerId}: Completed ${course.title}`, {
        bookId: book.id,
        totalGenerated: workerStatus.booksGenerated
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      workerStatus.errors++;
      workerStatus.status = 'error';
      progress.failedCourses++;
      progress.inProgressCourses--;

      logger.error(`Worker ${workerId}: Failed ${course.title}`, { error: errorMessage });

      // Continue to next course
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    workerStatus.status = 'idle';
    workerStatus.currentCourse = undefined;
    updateDashboard(progress);

    // Small delay between books
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  logger.info(`Worker ${workerId}: Completed all assigned courses`, {
    generated: workerStatus.booksGenerated,
    errors: workerStatus.errors
  });
}

/**
 * Updates dashboard file for real-time monitoring
 */
function updateDashboard(progress: EnterpriseProgress): void {
  try {
    const dir = path.dirname(DASHBOARD_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const elapsed = Date.now() - progress.startTime.getTime();
    const completionRate = progress.completedCourses / progress.totalCourses;
    
    if (completionRate > 0) {
      const estimatedTotal = elapsed / completionRate;
      const estimatedRemaining = estimatedTotal - elapsed;
      progress.estimatedCompletion = new Date(Date.now() + estimatedRemaining);
    }

    fs.writeFileSync(DASHBOARD_FILE, JSON.stringify(progress, null, 2));
  } catch (error) {
    logger.error('Failed to update dashboard', { error });
  }
}

/**
 * Main enterprise generation function
 */
async function generateAllCourseBooks(config: EnterpriseConfig): Promise<void> {
  logger.info('='.repeat(80));
  logger.info('Enterprise ScrollLibrary Generation - ALL COURSES');
  logger.info('='.repeat(80));
  logger.info('Configuration', config);

  try {
    // Fetch all courses
    const courses = await fetchCoursesFromDatabase(config);

    if (courses.length === 0) {
      logger.warn('No courses found matching criteria');
      return;
    }

    // Initialize progress
    const progress: EnterpriseProgress = {
      totalCourses: courses.length,
      completedCourses: 0,
      failedCourses: 0,
      inProgressCourses: 0,
      workers: [],
      startTime: new Date()
    };

    // Distribute courses among workers
    const coursesPerWorker = Math.ceil(courses.length / config.workerCount);
    const workerPromises: Promise<void>[] = [];
    const orchestrator = new AgentOrchestrationService();

    for (let i = 0; i < config.workerCount; i++) {
      const start = i * coursesPerWorker;
      const end = Math.min(start + coursesPerWorker, courses.length);
      const workerCourses = courses.slice(start, end);

      if (workerCourses.length > 0) {
        workerPromises.push(worker(i, workerCourses, orchestrator, progress));
      }
    }

    logger.info(`Started ${config.workerCount} workers for ${courses.length} courses`);
    logger.info(`Estimated time: ${Math.ceil(courses.length * 20 / config.workerCount / 60)} hours`);

    // Wait for all workers to complete
    await Promise.all(workerPromises);

    // Final report
    console.log('\n' + '='.repeat(80));
    console.log('Enterprise Generation Complete!');
    console.log('='.repeat(80));
    console.log(`Total Courses: ${progress.totalCourses}`);
    console.log(`Successfully Generated: ${progress.completedCourses}`);
    console.log(`Failed: ${progress.failedCourses}`);
    console.log(`Success Rate: ${((progress.completedCourses / progress.totalCourses) * 100).toFixed(1)}%`);
    
    const totalTime = Date.now() - progress.startTime.getTime();
    const hours = Math.floor(totalTime / 3600000);
    const minutes = Math.floor((totalTime % 3600000) / 60000);
    console.log(`Total Time: ${hours}h ${minutes}m`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    logger.error('Enterprise generation failed', { error });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Auto-generation hook for new courses
 */
export async function autoGenerateBookForCourse(courseId: string): Promise<void> {
  logger.info('Auto-generating book for new course', { courseId });

  try {
    const course = await prisma.courseProject.findUnique({
      where: { id: courseId },
      include: {
        CourseModule: {
          include: { Lecture: true }
        }
      }
    });

    if (!course) {
      throw new Error(`Course ${courseId} not found`);
    }

    // Note: textbookId field doesn't exist in CourseProject schema
    // The book will be linked via courseReference in scroll_books table
    logger.info('Generating textbook for course', { courseId, title: course.title });

    const orchestrator = new AgentOrchestrationService();
    const outline = courseToBookOutline(course);
    const book = await orchestrator.orchestrateBookGeneration(course.title, outline);

    await prisma.courseProject.update({
      where: { id: courseId },
      data: { 
        // Note: textbookId field may need to be added to CourseProject schema
        // For now, we'll track this in the scroll_books table via courseReference
      }
    });

    logger.info('Auto-generated book for course', { courseId, bookId: book.id });

  } catch (error) {
    logger.error('Auto-generation failed', { courseId, error });
    throw error;
  }
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

if (require.main === module) {
  (async () => {
    try {
      const config: EnterpriseConfig = {
        workerCount: parseInt(args[1]) || 10,
        batchSize: 3,
        priorityMode: (args[2] as any) || 'enrollment',
        autoGenerateOnCreate: true
      };

      switch (command) {
        case 'all':
          await generateAllCourseBooks(config);
          break;
        
        case 'auto':
          const courseId = args[1];
          if (!courseId) {
            console.error('Please provide course ID');
            process.exit(1);
          }
          await autoGenerateBookForCourse(courseId);
          break;
        
        default:
          console.log('Enterprise ScrollLibrary Generator');
          console.log('\nUsage:');
          console.log('  npm run generate:enterprise all [workers] [priority]');
          console.log('  npm run generate:enterprise auto <courseId>');
          console.log('\nPriority modes: enrollment, creation-date, alphabetical, random');
          console.log('\nExample:');
          console.log('  npm run generate:enterprise all 50 enrollment  # 50 workers, enrollment priority');
          break;
      }
    } catch (error) {
      logger.error('Command execution failed', { error });
      process.exit(1);
    }
  })();
}

export { generateAllCourseBooks, EnterpriseConfig };
