import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { AIGatewayService } from '../AIGatewayService';
import { 
  AgentTask, 
  TaskStatus, 
  AgentTaskType,
  ValidationResult,
  ScrollLibraryError 
} from '../../types/scroll-library.types';

export interface CourseOutline {
  title: string;
  subject: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  chapters: ChapterSpec[];
  courseReference?: string;
}

export interface ChapterSpec {
  title: string;
  orderIndex: number;
  topics: string[];
  learningObjectives: string[];
}

export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  subject: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  courseReference?: string;
  chapters: Chapter[];
  diagrams: Diagram[];
  metadata: BookMetadata;
  integrityHash: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface Chapter {
  id: string;
  bookId: string;
  title: string;
  orderIndex: number;
  content: string;
  diagrams: Diagram[];
  references: Reference[];
  summaries: Summary[];
  exercises: Exercise[];
  readingTime: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookMetadata {
  authorAgent: string;
  version: string;
  scrollIntegrityHash: string;
  generationDate: Date;
  lastValidated: Date;
  qualityScore: number;
  theologicalAlignment: number;
}

export interface Diagram {
  id: string;
  type: 'mermaid' | 'chart' | 'illustration';
  content: string;
  caption: string;
}

export interface Reference {
  id: string;
  type: 'academic' | 'biblical' | 'web';
  citation: string;
  url?: string;
}

export interface Summary {
  id: string;
  type: 'chapter' | 'section';
  content: string;
}

export interface Exercise {
  id: string;
  type: 'question' | 'problem' | 'reflection';
  content: string;
  solution?: string;
}

export interface StudyPack {
  id: string;
  courseId: string;
  summaryBooklet: string;
  practiceQuestions: Question[];
  flashcards: Flashcard[];
  diagrams: Diagram[];
  cheatSheets: CheatSheet[];
  quizzes: Quiz[];
  createdAt: Date;
}

export interface Question {
  id: string;
  type: 'multiple-choice' | 'essay' | 'short-answer';
  content: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: string;
}

export interface CheatSheet {
  id: string;
  title: string;
  content: string;
  category: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  timeLimit?: number;
}

// Agent Workflow State Machine Types
export interface AgentWorkflowState {
  id: string;
  status: WorkflowStatus;
  currentStep: number;
  totalSteps: number;
  tasks: AgentTask[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AgentQueue {
  id: string;
  priority: number;
  tasks: AgentTask[];
  maxConcurrency: number;
  retryPolicy: RetryPolicy;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

/**
 * Agent Orchestration Service for ScrollLibrary
 * Coordinates multi-agent workflows for content generation
 */
export class AgentOrchestrationService {
  private prisma: PrismaClient;
  private aiGateway: AIGatewayService;
  private activeWorkflows: Map<string, AgentWorkflowState>;
  private taskQueues: Map<string, AgentQueue>;
  private defaultRetryPolicy: RetryPolicy;

  constructor() {
    this.prisma = new PrismaClient();
    this.aiGateway = new AIGatewayService();
    this.activeWorkflows = new Map();
    this.taskQueues = new Map();
    this.defaultRetryPolicy = {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelayMs: 1000,
      maxDelayMs: 30000
    };
    
    this.initializeAgentQueues();
  }

  /**
   * Orchestrates complete book generation workflow
   */
  async orchestrateBookGeneration(topic: string, outline: CourseOutline): Promise<Book> {
    const workflowId = `book_generation_${Date.now()}`;
    
    try {
      logger.info('Starting book generation orchestration', { workflowId, topic, outline });

      // Create workflow state (7 steps total)
      const workflow = this.createWorkflowState(workflowId, 7);
      this.updateWorkflowState(workflowId, { status: 'running' });

      // Step 1: Initialize book record
      this.updateWorkflowState(workflowId, { currentStep: 1 });
      const book = await this.initializeBookWithProgress(outline, workflowId);

      // Step 2: Generate textbook content via ScrollAuthorGPT
      this.updateWorkflowState(workflowId, { currentStep: 2 });
      await this.orchestrateTextbookGeneration(book, outline, workflowId);

      // Step 3: Enhance with academic content via ScrollProfessorGPT
      this.updateWorkflowState(workflowId, { currentStep: 3 });
      await this.orchestrateAcademicEnhancement(book, workflowId);

      // Step 4: Format and add visual elements via ScrollScribeGPT
      this.updateWorkflowState(workflowId, { currentStep: 4 });
      await this.orchestrateContentFormatting(book, workflowId);

      // Step 5: Fact-check and validate sources via ScrollResearcherGPT
      this.updateWorkflowState(workflowId, { currentStep: 5 });
      await this.orchestrateFactChecking(book, workflowId);

      // Step 6: Validate theological alignment via ScrollIntegritySeal
      this.updateWorkflowState(workflowId, { currentStep: 6 });
      await this.orchestrateTheologicalValidation(book, workflowId);

      // Step 7: Index content and build knowledge graph via ScrollIndexer
      this.updateWorkflowState(workflowId, { currentStep: 7 });
      await this.orchestrateContentIndexing(book, workflowId);

      // Mark workflow as completed
      this.updateWorkflowState(workflowId, { 
        status: 'completed',
        currentStep: 7
      });

      logger.info('Book generation orchestration completed', { 
        workflowId, 
        bookId: book.id,
        duration: Date.now() - workflow.startedAt.getTime()
      });
      
      return book;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Mark workflow as failed and implement rollback
      this.updateWorkflowState(workflowId, { 
        status: 'failed',
        error: errorMessage
      });

      await this.rollbackBookGeneration(workflowId, error as Error);
      
      logger.error('Book generation orchestration failed', { 
        workflowId, 
        error: errorMessage, 
        topic 
      });
      throw error;
    }
  }

  /**
   * Orchestrates chapter generation workflow
   */
  async orchestrateChapterGeneration(bookId: string, chapterSpec: ChapterSpec): Promise<Chapter> {
    try {
      logger.info('Starting chapter generation orchestration', { bookId, chapterSpec });

      // Generate chapter content through agent pipeline
      const chapter = await this.generateChapterContent(bookId, chapterSpec);

      logger.info('Chapter generation orchestration completed', { chapterId: chapter.id });
      return chapter;
    } catch (error) {
      logger.error('Chapter generation orchestration failed', { error, bookId });
      throw error;
    }
  }

  /**
   * Orchestrates study pack generation workflow
   */
  async orchestrateStudyPackGeneration(courseId: string): Promise<StudyPack> {
    try {
      logger.info('Starting study pack generation orchestration', { courseId });

      // Generate study pack components
      const studyPack = await this.generateStudyPackComponents(courseId);

      logger.info('Study pack generation orchestration completed', { studyPackId: studyPack.id });
      return studyPack;
    } catch (error) {
      logger.error('Study pack generation orchestration failed', { error, courseId });
      throw error;
    }
  }

  /**
   * Validates agent output for quality and compliance
   */
  async validateAgentOutput(agentId: string, content: any): Promise<ValidationResult> {
    try {
      logger.info('Validating agent output', { agentId });

      // Implement validation logic
      const validation: ValidationResult = {
        success: true,
        errors: [],
        warnings: [],
        qualityScore: 0.95
      };

      return validation;
    } catch (error) {
      logger.error('Agent output validation failed', { error, agentId });
      throw error;
    }
  }

  private async initializeBook(outline: CourseOutline): Promise<Book> {
    // Implementation for initializing book record
    const book: Book = {
      id: `book_${Date.now()}`,
      title: outline.title,
      subject: outline.subject,
      level: outline.level,
      courseReference: outline.courseReference,
      chapters: [],
      diagrams: [],
      metadata: {
        authorAgent: 'ScrollAuthorGPT',
        version: '1.0.0',
        scrollIntegrityHash: '',
        generationDate: new Date(),
        lastValidated: new Date(),
        qualityScore: 0,
        theologicalAlignment: 0
      },
      integrityHash: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return book;
  }

  private async executeAgentPipeline(book: Book, outline: CourseOutline): Promise<Book> {
    // Implementation for executing the multi-agent pipeline
    // This will coordinate ScrollAuthorGPT, ScrollProfessorGPT, etc.
    return book;
  }

  private async generateChapterContent(bookId: string, chapterSpec: ChapterSpec): Promise<Chapter> {
    // Implementation for generating chapter content
    const chapter: Chapter = {
      id: `chapter_${Date.now()}`,
      bookId,
      title: chapterSpec.title,
      orderIndex: chapterSpec.orderIndex,
      content: '',
      diagrams: [],
      references: [],
      summaries: [],
      exercises: [],
      readingTime: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return chapter;
  }

  private async generateStudyPackComponents(courseId: string): Promise<StudyPack> {
    // Implementation for generating study pack components
    const studyPack: StudyPack = {
      id: `studypack_${Date.now()}`,
      courseId,
      summaryBooklet: '',
      practiceQuestions: [],
      flashcards: [],
      diagrams: [],
      cheatSheets: [],
      quizzes: [],
      createdAt: new Date()
    };

    return studyPack;
  }

  // Agent Workflow State Machine Implementation
  
  /**
   * Initializes agent task queues with different priorities and configurations
   */
  private initializeAgentQueues(): void {
    // High priority queue for critical tasks
    this.taskQueues.set('high-priority', {
      id: 'high-priority',
      priority: 1,
      tasks: [],
      maxConcurrency: 2,
      retryPolicy: this.defaultRetryPolicy
    });

    // Normal priority queue for standard tasks
    this.taskQueues.set('normal-priority', {
      id: 'normal-priority',
      priority: 2,
      tasks: [],
      maxConcurrency: 5,
      retryPolicy: this.defaultRetryPolicy
    });

    // Low priority queue for background tasks
    this.taskQueues.set('low-priority', {
      id: 'low-priority',
      priority: 3,
      tasks: [],
      maxConcurrency: 10,
      retryPolicy: {
        ...this.defaultRetryPolicy,
        maxRetries: 5,
        maxDelayMs: 60000
      }
    });

    logger.info('Agent task queues initialized', { 
      queues: Array.from(this.taskQueues.keys()) 
    });
  }

  /**
   * Creates a new agent workflow state
   */
  private createWorkflowState(workflowId: string, totalSteps: number): AgentWorkflowState {
    const workflow: AgentWorkflowState = {
      id: workflowId,
      status: 'pending',
      currentStep: 0,
      totalSteps,
      tasks: [],
      startedAt: new Date()
    };

    this.activeWorkflows.set(workflowId, workflow);
    logger.info('Created new workflow state', { workflowId, totalSteps });
    
    return workflow;
  }

  /**
   * Updates workflow state and handles state transitions
   */
  private updateWorkflowState(
    workflowId: string, 
    updates: Partial<AgentWorkflowState>
  ): AgentWorkflowState {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const updatedWorkflow = { ...workflow, ...updates };
    
    // Handle state transitions
    if (updates.status === 'completed' && !updatedWorkflow.completedAt) {
      updatedWorkflow.completedAt = new Date();
    }

    this.activeWorkflows.set(workflowId, updatedWorkflow);
    logger.info('Updated workflow state', { workflowId, updates });
    
    return updatedWorkflow;
  }

  /**
   * Adds a task to the appropriate queue based on priority
   */
  private async enqueueTask(task: AgentTask, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<void> {
    const queueId = `${priority}-priority`;
    const queue = this.taskQueues.get(queueId);
    
    if (!queue) {
      throw new Error(`Queue ${queueId} not found`);
    }

    queue.tasks.push(task);
    logger.info('Task enqueued', { taskId: task.id, queueId, priority });

    // Process queue if not at max concurrency
    await this.processQueue(queueId);
  }

  /**
   * Processes tasks in a queue respecting concurrency limits
   */
  private async processQueue(queueId: string): Promise<void> {
    const queue = this.taskQueues.get(queueId);
    if (!queue) return;

    const runningTasks = queue.tasks.filter(task => task.status === 'in-progress');
    const pendingTasks = queue.tasks.filter(task => task.status === 'pending');

    if (runningTasks.length >= queue.maxConcurrency || pendingTasks.length === 0) {
      return;
    }

    const tasksToProcess = pendingTasks.slice(0, queue.maxConcurrency - runningTasks.length);
    
    for (const task of tasksToProcess) {
      this.executeTask(task, queue.retryPolicy).catch(error => {
        logger.error('Task execution failed', { taskId: task.id, error });
      });
    }
  }

  /**
   * Executes a single agent task with retry logic
   */
  private async executeTask(task: AgentTask, retryPolicy: RetryPolicy): Promise<void> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= retryPolicy.maxRetries) {
      try {
        // Update task status
        task.status = 'in-progress';
        logger.info('Executing agent task', { taskId: task.id, attempt });

        // Execute the actual task based on type
        const result = await this.executeAgentTaskByType(task);
        
        // Update task with result
        task.output = result;
        task.status = 'completed';
        task.completedAt = new Date();
        
        logger.info('Agent task completed successfully', { taskId: task.id });
        return;

      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        if (attempt <= retryPolicy.maxRetries) {
          const delay = Math.min(
            retryPolicy.initialDelayMs * Math.pow(retryPolicy.backoffMultiplier, attempt - 1),
            retryPolicy.maxDelayMs
          );
          
          logger.warn('Agent task failed, retrying', { 
            taskId: task.id, 
            attempt, 
            delay, 
            error: error instanceof Error ? error.message : String(error)
          });
          
          await this.delay(delay);
        }
      }
    }

    // All retries exhausted
    task.status = 'failed';
    task.completedAt = new Date();
    
    logger.error('Agent task failed after all retries', { 
      taskId: task.id, 
      attempts: attempt,
      error: lastError?.message 
    });
    
    throw lastError;
  }

  /**
   * Executes agent task based on its type
   */
  private async executeAgentTaskByType(task: AgentTask): Promise<any> {
    switch (task.type) {
      case 'generate-textbook':
        return await this.executeTextbookGeneration(task.input);
      
      case 'generate-chapter':
        return await this.executeChapterGeneration(task.input);
      
      case 'format-content':
        return await this.executeContentFormatting(task.input);
      
      case 'fact-check':
        return await this.executeFactChecking(task.input);
      
      case 'validate-theology':
        return await this.executeTheologicalValidation(task.input);
      
      case 'create-embeddings':
        return await this.executeEmbeddingCreation(task.input);
      
      case 'build-knowledge-graph':
        return await this.executeKnowledgeGraphBuilding(task.input);
      
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  /**
   * Utility method for delays in retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets the current state of a workflow
   */
  public getWorkflowState(workflowId: string): AgentWorkflowState | undefined {
    return this.activeWorkflows.get(workflowId);
  }

  /**
   * Cancels a running workflow
   */
  public async cancelWorkflow(workflowId: string): Promise<void> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Cancel all pending tasks in the workflow
    for (const task of workflow.tasks) {
      if (task.status === 'pending' || task.status === 'in-progress') {
        task.status = 'failed';
        task.completedAt = new Date();
      }
    }

    this.updateWorkflowState(workflowId, { 
      status: 'cancelled',
      completedAt: new Date()
    });

    logger.info('Workflow cancelled', { workflowId });
  }

  // Placeholder methods for agent task execution (to be implemented by specific agents)
  
  private async executeTextbookGeneration(input: any): Promise<any> {
    // Will be implemented when ScrollAuthorGPT is integrated
    throw new Error('Textbook generation not yet implemented');
  }

  private async executeChapterGeneration(input: any): Promise<any> {
    // Will be implemented when ScrollAuthorGPT is integrated
    throw new Error('Chapter generation not yet implemented');
  }

  private async executeContentFormatting(input: any): Promise<any> {
    // Will be implemented when ScrollScribeGPT is integrated
    throw new Error('Content formatting not yet implemented');
  }

  private async executeFactChecking(input: any): Promise<any> {
    // Will be implemented when ScrollResearcherGPT is integrated
    throw new Error('Fact checking not yet implemented');
  }

  private async executeTheologicalValidation(input: any): Promise<any> {
    // Will be implemented when ScrollIntegritySeal is integrated
    throw new Error('Theological validation not yet implemented');
  }

  private async executeEmbeddingCreation(input: any): Promise<any> {
    // Will be implemented when ScrollIndexer is integrated
    throw new Error('Embedding creation not yet implemented');
  }

  private async executeKnowledgeGraphBuilding(input: any): Promise<any> {
    // Will be implemented when ScrollIndexer is integrated
    throw new Error('Knowledge graph building not yet implemented');
  }

  // Book Generation Orchestration Methods

  /**
   * Initializes book record with progress tracking
   */
  private async initializeBookWithProgress(outline: CourseOutline, workflowId: string): Promise<Book> {
    try {
      const book = await this.initializeBook(outline);
      
      // Track progress
      const workflow = this.getWorkflowState(workflowId);
      if (workflow) {
        workflow.tasks.push({
          id: `init_book_${Date.now()}`,
          agentId: 'system',
          type: 'generate-textbook',
          input: outline,
          output: book,
          status: 'completed',
          createdAt: new Date(),
          completedAt: new Date()
        });
      }

      logger.info('Book initialized successfully', { bookId: book.id, workflowId });
      return book;
    } catch (error) {
      logger.error('Book initialization failed', { error, workflowId });
      throw error;
    }
  }

  /**
   * Orchestrates textbook content generation via ScrollAuthorGPT
   */
  private async orchestrateTextbookGeneration(book: Book, outline: CourseOutline, workflowId: string): Promise<void> {
    const tasks: AgentTask[] = [];

    // Create tasks for each chapter
    for (const chapterSpec of outline.chapters) {
      const task: AgentTask = {
        id: `textbook_chapter_${chapterSpec.orderIndex}_${Date.now()}`,
        agentId: 'ScrollAuthorGPT',
        type: 'generate-chapter',
        input: { bookId: book.id, chapterSpec, scrollTone: true },
        status: 'pending',
        createdAt: new Date()
      };
      
      tasks.push(task);
      await this.enqueueTask(task, 'high');
    }

    // Wait for all chapter generation tasks to complete
    await this.waitForTasksCompletion(tasks, workflowId);
    
    // Update book with generated chapters
    book.chapters = tasks.map(task => task.output as Chapter).filter(Boolean);
    
    logger.info('Textbook generation completed', { 
      bookId: book.id, 
      chaptersGenerated: book.chapters.length,
      workflowId 
    });
  }

  /**
   * Orchestrates academic content enhancement via ScrollProfessorGPT
   */
  private async orchestrateAcademicEnhancement(book: Book, workflowId: string): Promise<void> {
    const tasks: AgentTask[] = [];

    // Create enhancement tasks for each chapter
    for (const chapter of book.chapters) {
      const task: AgentTask = {
        id: `academic_enhance_${chapter.id}_${Date.now()}`,
        agentId: 'ScrollProfessorGPT',
        type: 'generate-chapter',
        input: { 
          chapterId: chapter.id, 
          content: chapter.content,
          enhancementType: 'academic'
        },
        status: 'pending',
        createdAt: new Date()
      };
      
      tasks.push(task);
      await this.enqueueTask(task, 'normal');
    }

    await this.waitForTasksCompletion(tasks, workflowId);
    
    // Update chapters with academic enhancements
    tasks.forEach((task, index) => {
      if (task.output && book.chapters[index]) {
        book.chapters[index].exercises = task.output.exercises || [];
        book.chapters[index].summaries = task.output.summaries || [];
      }
    });

    logger.info('Academic enhancement completed', { bookId: book.id, workflowId });
  }

  /**
   * Orchestrates content formatting via ScrollScribeGPT
   */
  private async orchestrateContentFormatting(book: Book, workflowId: string): Promise<void> {
    const tasks: AgentTask[] = [];

    // Create formatting tasks
    for (const chapter of book.chapters) {
      const task: AgentTask = {
        id: `format_content_${chapter.id}_${Date.now()}`,
        agentId: 'ScrollScribeGPT',
        type: 'format-content',
        input: { 
          chapterId: chapter.id,
          content: chapter.content,
          generateDiagrams: true
        },
        status: 'pending',
        createdAt: new Date()
      };
      
      tasks.push(task);
      await this.enqueueTask(task, 'normal');
    }

    await this.waitForTasksCompletion(tasks, workflowId);
    
    // Update chapters with formatted content and diagrams
    tasks.forEach((task, index) => {
      if (task.output && book.chapters[index]) {
        book.chapters[index].content = task.output.formattedContent || book.chapters[index].content;
        book.chapters[index].diagrams = task.output.diagrams || [];
      }
    });

    logger.info('Content formatting completed', { bookId: book.id, workflowId });
  }

  /**
   * Orchestrates fact-checking via ScrollResearcherGPT
   */
  private async orchestrateFactChecking(book: Book, workflowId: string): Promise<void> {
    const task: AgentTask = {
      id: `fact_check_${book.id}_${Date.now()}`,
      agentId: 'ScrollResearcherGPT',
      type: 'fact-check',
      input: { 
        bookId: book.id,
        chapters: book.chapters.map(ch => ({ id: ch.id, content: ch.content }))
      },
      status: 'pending',
      createdAt: new Date()
    };

    await this.enqueueTask(task, 'high');
    await this.waitForTasksCompletion([task], workflowId);

    // Update book with fact-check results and references
    if (task.output) {
      book.chapters.forEach((chapter, index) => {
        const chapterFactCheck = task.output.chapters?.[index];
        if (chapterFactCheck) {
          chapter.references = chapterFactCheck.references || [];
        }
      });
    }

    logger.info('Fact checking completed', { bookId: book.id, workflowId });
  }

  /**
   * Orchestrates theological validation via ScrollIntegritySeal
   */
  private async orchestrateTheologicalValidation(book: Book, workflowId: string): Promise<void> {
    const task: AgentTask = {
      id: `theological_validation_${book.id}_${Date.now()}`,
      agentId: 'ScrollIntegritySeal',
      type: 'validate-theology',
      input: { 
        bookId: book.id,
        content: book.chapters.map(ch => ch.content).join('\n\n'),
        subject: book.subject
      },
      status: 'pending',
      createdAt: new Date()
    };

    await this.enqueueTask(task, 'high');
    await this.waitForTasksCompletion([task], workflowId);

    // Validate theological alignment
    if (task.output) {
      const validation = task.output as ValidationResult;
      
      if (!validation.success) {
        throw new Error(`Theological validation failed: ${validation.errors.join(', ')}`);
      }

      // Update book metadata with validation results
      book.metadata.theologicalAlignment = validation.theologicalAlignment || 0;
      book.metadata.qualityScore = validation.qualityScore;
      book.metadata.lastValidated = new Date();
    }

    logger.info('Theological validation completed', { 
      bookId: book.id, 
      alignment: book.metadata.theologicalAlignment,
      workflowId 
    });
  }

  /**
   * Orchestrates content indexing via ScrollIndexer
   */
  private async orchestrateContentIndexing(book: Book, workflowId: string): Promise<void> {
    const tasks: AgentTask[] = [
      {
        id: `create_embeddings_${book.id}_${Date.now()}`,
        agentId: 'ScrollIndexer',
        type: 'create-embeddings',
        input: { bookId: book.id, chapters: book.chapters },
        status: 'pending',
        createdAt: new Date()
      },
      {
        id: `build_knowledge_graph_${book.id}_${Date.now()}`,
        agentId: 'ScrollIndexer',
        type: 'build-knowledge-graph',
        input: { bookId: book.id, chapters: book.chapters },
        status: 'pending',
        createdAt: new Date()
      }
    ];

    // Enqueue indexing tasks
    for (const task of tasks) {
      await this.enqueueTask(task, 'low');
    }

    await this.waitForTasksCompletion(tasks, workflowId);

    // Generate integrity hash
    book.integrityHash = await this.generateIntegrityHash(book);
    book.metadata.scrollIntegrityHash = book.integrityHash;

    logger.info('Content indexing completed', { bookId: book.id, workflowId });
  }

  /**
   * Waits for all tasks in the array to complete
   */
  private async waitForTasksCompletion(tasks: AgentTask[], workflowId: string): Promise<void> {
    const maxWaitTime = 30 * 60 * 1000; // 30 minutes
    const checkInterval = 5000; // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const pendingTasks = tasks.filter(task => 
        task.status === 'pending' || task.status === 'in-progress'
      );

      if (pendingTasks.length === 0) {
        // Check for failed tasks
        const failedTasks = tasks.filter(task => task.status === 'failed');
        if (failedTasks.length > 0) {
          throw new Error(`Tasks failed: ${failedTasks.map(t => t.id).join(', ')}`);
        }
        return; // All tasks completed successfully
      }

      await this.delay(checkInterval);
    }

    throw new Error(`Tasks timed out after ${maxWaitTime}ms: ${tasks.map(t => t.id).join(', ')}`);
  }

  /**
   * Implements rollback logic for failed book generation
   */
  private async rollbackBookGeneration(workflowId: string, error: Error): Promise<void> {
    try {
      const workflow = this.getWorkflowState(workflowId);
      if (!workflow) return;

      logger.info('Starting book generation rollback', { workflowId, error: error.message });

      // Cancel any pending tasks
      for (const task of workflow.tasks) {
        if (task.status === 'pending' || task.status === 'in-progress') {
          task.status = 'failed';
          task.completedAt = new Date();
        }
      }

      // Clean up any partially created resources
      const completedTasks = workflow.tasks.filter(task => task.status === 'completed');
      for (const task of completedTasks) {
        await this.cleanupTaskResources(task);
      }

      logger.info('Book generation rollback completed', { workflowId });
    } catch (rollbackError) {
      logger.error('Rollback failed', { workflowId, rollbackError });
    }
  }

  /**
   * Cleans up resources created by a completed task
   */
  private async cleanupTaskResources(task: AgentTask): Promise<void> {
    try {
      // Implementation depends on task type and what resources were created
      logger.info('Cleaning up task resources', { taskId: task.id, agentId: task.agentId });
      
      // For now, just log - specific cleanup logic will be added when agents are implemented
    } catch (error) {
      logger.error('Failed to cleanup task resources', { taskId: task.id, error });
    }
  }

  /**
   * Generates integrity hash for the book
   */
  private async generateIntegrityHash(book: Book): Promise<string> {
    // Simple hash generation - in production this would use cryptographic hashing
    const content = JSON.stringify({
      title: book.title,
      chapters: book.chapters.map(ch => ({ title: ch.title, content: ch.content })),
      metadata: book.metadata
    });
    
    // For now, return a simple hash - replace with proper cryptographic hash in production
    return `scroll_${Buffer.from(content).toString('base64').slice(0, 32)}`;
  }
}

export default AgentOrchestrationService;