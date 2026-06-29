/**
 * Batch ScrollLibrary Book Generator with Progress Tracking
 * Supports resumption, parallel processing, and detailed progress reporting
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../src/utils/logger';
import { AgentOrchestrationService, CourseOutline } from '../src/services/scroll-library/AgentOrchestrationService';
import { SCROLL_LIBRARY_CATALOG, generateBook } from './generate-all-scroll-library-books';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface GenerationProgress {
  totalBooks: number;
  completedBooks: number;
  failedBooks: number;
  inProgressBooks: number;
  startTime: Date;
  lastUpdateTime: Date;
  completedBookIds: string[];
  failedBookTitles: string[];
  currentBook?: string;
}

interface BookGenerationTask {
  subject: string;
  title: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  chapters: string[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  bookId?: string;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

const PROGRESS_FILE = path.join(__dirname, '../data/scroll-library-generation-progress.json');
const TASKS_FILE = path.join(__dirname, '../data/scroll-library-generation-tasks.json');

/**
 * Loads progress from file
 */
function loadProgress(): GenerationProgress | null {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    logger.error('Failed to load progress file', { error });
  }
  return null;
}

/**
 * Saves progress to file
 */
function saveProgress(progress: GenerationProgress): void {
  try {
    const dir = path.dirname(PROGRESS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (error) {
    logger.error('Failed to save progress file', { error });
  }
}

/**
 * Loads tasks from file
 */
function loadTasks(): BookGenerationTask[] | null {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      const data = fs.readFileSync(TASKS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    logger.error('Failed to load tasks file', { error });
  }
  return null;
}

/**
 * Saves tasks to file
 */
function saveTasks(tasks: BookGenerationTask[]): void {
  try {
    const dir = path.dirname(TASKS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
  } catch (error) {
    logger.error('Failed to save tasks file', { error });
  }
}

/**
 * Initializes generation tasks from catalog
 */
function initializeTasks(): BookGenerationTask[] {
  const tasks: BookGenerationTask[] = [];

  for (const [subject, books] of Object.entries(SCROLL_LIBRARY_CATALOG)) {
    for (const book of books) {
      tasks.push({
        subject,
        title: book.title,
        level: book.level,
        chapters: book.chapters,
        status: 'pending'
      });
    }
  }

  return tasks;
}

/**
 * Displays progress statistics
 */
function displayProgress(progress: GenerationProgress): void {
  const elapsed = Date.now() - new Date(progress.startTime).getTime();
  const elapsedMinutes = Math.floor(elapsed / 60000);
  const completionRate = progress.completedBooks / progress.totalBooks;
  const estimatedTotal = completionRate > 0 ? elapsed / completionRate : 0;
  const estimatedRemaining = estimatedTotal - elapsed;
  const estimatedRemainingMinutes = Math.floor(estimatedRemaining / 60000);

  console.log('\n' + '='.repeat(80));
  console.log('ScrollLibrary Generation Progress');
  console.log('='.repeat(80));
  console.log(`Total Books: ${progress.totalBooks}`);
  console.log(`Completed: ${progress.completedBooks} (${(completionRate * 100).toFixed(1)}%)`);
  console.log(`Failed: ${progress.failedBooks}`);
  console.log(`In Progress: ${progress.inProgressBooks}`);
  console.log(`Pending: ${progress.totalBooks - progress.completedBooks - progress.failedBooks - progress.inProgressBooks}`);
  console.log(`\nElapsed Time: ${elapsedMinutes} minutes`);
  console.log(`Estimated Remaining: ${estimatedRemainingMinutes} minutes`);
  
  if (progress.currentBook) {
    console.log(`\nCurrently Generating: ${progress.currentBook}`);
  }
  
  console.log('='.repeat(80) + '\n');
}

/**
 * Generates a single book with progress tracking
 */
async function generateBookWithTracking(
  task: BookGenerationTask,
  orchestrator: AgentOrchestrationService,
  progress: GenerationProgress,
  tasks: BookGenerationTask[]
): Promise<void> {
  try {
    task.status = 'in-progress';
    task.startTime = new Date();
    progress.inProgressBooks++;
    progress.currentBook = task.title;
    
    saveProgress(progress);
    saveTasks(tasks);

    logger.info(`Starting generation: ${task.title}`, { subject: task.subject, level: task.level });

    await generateBook(task.subject, task, orchestrator);

    task.status = 'completed';
    task.endTime = new Date();
    progress.completedBooks++;
    progress.inProgressBooks--;
    progress.completedBookIds.push(task.bookId || task.title);
    progress.lastUpdateTime = new Date();

    logger.info(`Completed generation: ${task.title}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    task.status = 'failed';
    task.error = errorMessage;
    task.endTime = new Date();
    progress.failedBooks++;
    progress.inProgressBooks--;
    progress.failedBookTitles.push(task.title);
    progress.lastUpdateTime = new Date();

    logger.error(`Failed generation: ${task.title}`, { error: errorMessage });
  } finally {
    saveProgress(progress);
    saveTasks(tasks);
    displayProgress(progress);
  }
}

/**
 * Processes tasks in batches with concurrency control
 */
async function processBatch(
  tasks: BookGenerationTask[],
  orchestrator: AgentOrchestrationService,
  progress: GenerationProgress,
  allTasks: BookGenerationTask[],
  batchSize: number = 3
): Promise<void> {
  const batch = tasks.slice(0, batchSize);
  
  await Promise.all(
    batch.map(task => generateBookWithTracking(task, orchestrator, progress, allTasks))
  );
}

/**
 * Main batch generation function
 */
async function batchGenerate(options: {
  resume?: boolean;
  batchSize?: number;
  subjects?: string[];
  levels?: Array<'beginner' | 'intermediate' | 'advanced'>;
}): Promise<void> {
  logger.info('='.repeat(80));
  logger.info('ScrollLibrary Batch Book Generation');
  logger.info('='.repeat(80));

  try {
    const orchestrator = new AgentOrchestrationService();

    // Load or initialize tasks
    let tasks = options.resume ? loadTasks() : null;
    if (!tasks) {
      tasks = initializeTasks();
    }

    // Filter tasks by options
    if (options.subjects) {
      tasks = tasks.filter(task => options.subjects!.includes(task.subject));
    }
    if (options.levels) {
      tasks = tasks.filter(task => options.levels!.includes(task.level));
    }

    // Load or initialize progress
    let progress = options.resume ? loadProgress() : null;
    if (!progress) {
      progress = {
        totalBooks: tasks.length,
        completedBooks: 0,
        failedBooks: 0,
        inProgressBooks: 0,
        startTime: new Date(),
        lastUpdateTime: new Date(),
        completedBookIds: [],
        failedBookTitles: []
      };
    }

    // Get pending tasks
    const pendingTasks = tasks.filter(task => task.status === 'pending');
    
    logger.info(`Total tasks: ${tasks.length}`);
    logger.info(`Pending tasks: ${pendingTasks.length}`);
    logger.info(`Batch size: ${options.batchSize || 3}`);
    logger.info('Starting batch generation...\n');

    displayProgress(progress);

    // Process tasks in batches
    const batchSize = options.batchSize || 3;
    for (let i = 0; i < pendingTasks.length; i += batchSize) {
      const batch = pendingTasks.slice(i, i + batchSize);
      
      logger.info(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(pendingTasks.length / batchSize)}`);
      
      await processBatch(batch, orchestrator, progress, tasks, batchSize);
      
      // Add delay between batches
      if (i + batchSize < pendingTasks.length) {
        logger.info('Waiting 30 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    // Final report
    console.log('\n' + '='.repeat(80));
    console.log('ScrollLibrary Batch Generation Complete!');
    console.log('='.repeat(80));
    console.log(`Total Books: ${progress.totalBooks}`);
    console.log(`Successfully Generated: ${progress.completedBooks}`);
    console.log(`Failed: ${progress.failedBooks}`);
    
    if (progress.failedBooks > 0) {
      console.log('\nFailed Books:');
      progress.failedBookTitles.forEach(title => console.log(`  - ${title}`));
    }
    
    const totalTime = Date.now() - new Date(progress.startTime).getTime();
    const totalMinutes = Math.floor(totalTime / 60000);
    console.log(`\nTotal Time: ${totalMinutes} minutes`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Batch generation process failed', { error: errorMessage });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Retries failed books
 */
async function retryFailed(): Promise<void> {
  const tasks = loadTasks();
  if (!tasks) {
    logger.error('No tasks file found. Run initial generation first.');
    return;
  }

  const failedTasks = tasks.filter(task => task.status === 'failed');
  
  if (failedTasks.length === 0) {
    logger.info('No failed tasks to retry.');
    return;
  }

  logger.info(`Retrying ${failedTasks.length} failed tasks...`);

  // Reset failed tasks to pending
  failedTasks.forEach(task => {
    task.status = 'pending';
    task.error = undefined;
    task.startTime = undefined;
    task.endTime = undefined;
  });

  saveTasks(tasks);

  await batchGenerate({ resume: true, batchSize: 1 });
}

/**
 * Generates summary report
 */
function generateReport(): void {
  const tasks = loadTasks();
  const progress = loadProgress();

  if (!tasks || !progress) {
    logger.error('No generation data found.');
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log('ScrollLibrary Generation Report');
  console.log('='.repeat(80));

  // Group by subject
  const bySubject: Record<string, { completed: number; failed: number; total: number }> = {};
  
  tasks.forEach(task => {
    if (!bySubject[task.subject]) {
      bySubject[task.subject] = { completed: 0, failed: 0, total: 0 };
    }
    bySubject[task.subject].total++;
    if (task.status === 'completed') bySubject[task.subject].completed++;
    if (task.status === 'failed') bySubject[task.subject].failed++;
  });

  console.log('\nBy Subject:');
  for (const [subject, stats] of Object.entries(bySubject)) {
    console.log(`  ${subject}:`);
    console.log(`    Total: ${stats.total}`);
    console.log(`    Completed: ${stats.completed}`);
    console.log(`    Failed: ${stats.failed}`);
  }

  // Group by level
  const byLevel: Record<string, { completed: number; failed: number; total: number }> = {};
  
  tasks.forEach(task => {
    if (!byLevel[task.level]) {
      byLevel[task.level] = { completed: 0, failed: 0, total: 0 };
    }
    byLevel[task.level].total++;
    if (task.status === 'completed') byLevel[task.level].completed++;
    if (task.status === 'failed') byLevel[task.level].failed++;
  });

  console.log('\nBy Level:');
  for (const [level, stats] of Object.entries(byLevel)) {
    console.log(`  ${level}:`);
    console.log(`    Total: ${stats.total}`);
    console.log(`    Completed: ${stats.completed}`);
    console.log(`    Failed: ${stats.failed}`);
  }

  console.log('='.repeat(80) + '\n');
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

if (require.main === module) {
  (async () => {
    try {
      switch (command) {
        case 'start':
          await batchGenerate({ batchSize: 3 });
          break;
        
        case 'resume':
          await batchGenerate({ resume: true, batchSize: 3 });
          break;
        
        case 'retry':
          await retryFailed();
          break;
        
        case 'report':
          generateReport();
          break;
        
        case 'subject':
          const subject = args[1];
          if (!subject) {
            console.error('Please specify a subject');
            process.exit(1);
          }
          await batchGenerate({ subjects: [subject], batchSize: 2 });
          break;
        
        case 'level':
          const level = args[1] as 'beginner' | 'intermediate' | 'advanced';
          if (!level) {
            console.error('Please specify a level (beginner, intermediate, advanced)');
            process.exit(1);
          }
          await batchGenerate({ levels: [level], batchSize: 3 });
          break;
        
        default:
          console.log('ScrollLibrary Batch Generator');
          console.log('\nUsage:');
          console.log('  npm run generate:scroll-library start    - Start new generation');
          console.log('  npm run generate:scroll-library resume   - Resume previous generation');
          console.log('  npm run generate:scroll-library retry    - Retry failed books');
          console.log('  npm run generate:scroll-library report   - Generate summary report');
          console.log('  npm run generate:scroll-library subject <name> - Generate specific subject');
          console.log('  npm run generate:scroll-library level <level>  - Generate specific level');
          break;
      }
    } catch (error) {
      logger.error('Command execution failed', { error });
      process.exit(1);
    }
  })();
}

export { batchGenerate, retryFailed, generateReport };
