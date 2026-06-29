/**
 * ScrollUniversity Admissions - Workflow Engine
 * "Many are called, but few are chosen" - Matthew 22:14
 * 
 * Application workflow engine with automated status transitions
 */

import { PrismaClient, ApplicationStatus, Application } from '@prisma/client';
import { logger } from '../../utils/logger';
import { StatusTracker } from './StatusTracker';
import { NotificationManager } from './NotificationManager';

export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  isAutomatic: boolean;
  priority: number;
}

export interface WorkflowCondition {
  type: 'TIME_ELAPSED' | 'DOCUMENT_UPLOADED' | 'ASSESSMENT_COMPLETED' | 'INTERVIEW_COMPLETED' | 'CUSTOM';
  field?: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'EXISTS';
  value?: any;
  timeUnit?: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS';
  timeValue?: number;
}

export interface WorkflowAction {
  type: 'UPDATE_STATUS' | 'SEND_NOTIFICATION' | 'SCHEDULE_TASK' | 'ASSIGN_REVIEWER' | 'CUSTOM';
  parameters: Record<string, any>;
}

export interface WorkflowExecution {
  id: string;
  applicationId: string;
  ruleId: string;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
}

export class WorkflowEngine {
  private statusTracker: StatusTracker;
  private notificationManager: NotificationManager;
  private workflowRules: WorkflowRule[] = [];

  constructor(private prisma: PrismaClient) {
    this.statusTracker = new StatusTracker(prisma);
    this.notificationManager = new NotificationManager();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default workflow rules
   */
  private initializeDefaultRules(): void {
    this.workflowRules = [
      // Auto-transition from SUBMITTED to UNDER_REVIEW after 1 hour
      {
        id: 'auto-review-start',
        name: 'Auto Start Review',
        description: 'Automatically start review process after application submission',
        fromStatus: 'SUBMITTED',
        toStatus: 'UNDER_REVIEW',
        conditions: [
          {
            type: 'TIME_ELAPSED',
            operator: 'GREATER_THAN',
            timeUnit: 'HOURS',
            timeValue: 1
          }
        ],
        actions: [
          {
            type: 'UPDATE_STATUS',
            parameters: { status: 'UNDER_REVIEW' }
          },
          {
            type: 'SEND_NOTIFICATION',
            parameters: { type: 'STATUS_UPDATE' }
          }
        ],
        isAutomatic: true,
        priority: 1
      },

      // Auto-transition to ASSESSMENT_PENDING when all documents are uploaded
      {
        id: 'auto-assessment-start',
        name: 'Auto Start Assessment',
        description: 'Start assessment when application is complete',
        fromStatus: 'UNDER_REVIEW',
        toStatus: 'ASSESSMENT_PENDING',
        conditions: [
          {
            type: 'DOCUMENT_UPLOADED',
            operator: 'EXISTS',
            field: 'documents'
          },
          {
            type: 'CUSTOM',
            operator: 'EQUALS',
            field: 'completeness',
            value: 100
          }
        ],
        actions: [
          {
            type: 'UPDATE_STATUS',
            parameters: { status: 'ASSESSMENT_PENDING' }
          },
          {
            type: 'ASSIGN_REVIEWER',
            parameters: { type: 'ELIGIBILITY_ASSESSOR' }
          }
        ],
        isAutomatic: true,
        priority: 2
      },

      // Auto-schedule interview when assessments are complete
      {
        id: 'auto-interview-schedule',
        name: 'Auto Schedule Interview',
        description: 'Schedule interview when all assessments are complete',
        fromStatus: 'ASSESSMENT_PENDING',
        toStatus: 'INTERVIEW_SCHEDULED',
        conditions: [
          {
            type: 'ASSESSMENT_COMPLETED',
            operator: 'EXISTS',
            field: 'eligibilityResult'
          },
          {
            type: 'ASSESSMENT_COMPLETED',
            operator: 'EXISTS',
            field: 'spiritualEvaluation'
          },
          {
            type: 'ASSESSMENT_COMPLETED',
            operator: 'EXISTS',
            field: 'academicEvaluation'
          }
        ],
        actions: [
          {
            type: 'UPDATE_STATUS',
            parameters: { status: 'INTERVIEW_SCHEDULED' }
          },
          {
            type: 'SCHEDULE_TASK',
            parameters: { 
              type: 'INTERVIEW_SCHEDULING',
              assignTo: 'INTERVIEW_COORDINATOR'
            }
          }
        ],
        isAutomatic: true,
        priority: 3
      },

      // Auto-transition to decision pending after interview
      {
        id: 'auto-decision-pending',
        name: 'Auto Decision Pending',
        description: 'Move to decision pending after interview completion',
        fromStatus: 'INTERVIEW_SCHEDULED',
        toStatus: 'DECISION_PENDING',
        conditions: [
          {
            type: 'INTERVIEW_COMPLETED',
            operator: 'EXISTS',
            field: 'interviewResults'
          }
        ],
        actions: [
          {
            type: 'UPDATE_STATUS',
            parameters: { status: 'DECISION_PENDING' }
          },
          {
            type: 'ASSIGN_REVIEWER',
            parameters: { type: 'ADMISSIONS_COMMITTEE' }
          }
        ],
        isAutomatic: true,
        priority: 4
      },

      // Send reminder for incomplete applications
      {
        id: 'incomplete-reminder',
        name: 'Incomplete Application Reminder',
        description: 'Send reminder for incomplete applications after 3 days',
        fromStatus: 'SUBMITTED',
        toStatus: 'SUBMITTED', // No status change
        conditions: [
          {
            type: 'TIME_ELAPSED',
            operator: 'GREATER_THAN',
            timeUnit: 'DAYS',
            timeValue: 3
          },
          {
            type: 'CUSTOM',
            operator: 'LESS_THAN',
            field: 'completeness',
            value: 100
          }
        ],
        actions: [
          {
            type: 'SEND_NOTIFICATION',
            parameters: { 
              type: 'INCOMPLETE_REMINDER',
              template: 'INCOMPLETE_APPLICATION'
            }
          }
        ],
        isAutomatic: true,
        priority: 5
      }
    ];
  }

  /**
   * Process workflow for a specific application
   */
  async processWorkflow(applicationId: string): Promise<WorkflowExecution[]> {
    try {
      logger.info(`Processing workflow for application ${applicationId}`);

      const application = await this.prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          applicant: true,
          eligibilityAssessment: true,
          spiritualEvaluations: true,
          academicEvaluations: true,
          interviewRecords: true
        }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const executions: WorkflowExecution[] = [];
      const applicableRules = this.getApplicableRules(application);

      for (const rule of applicableRules) {
        if (await this.evaluateConditions(application, rule.conditions)) {
          const execution = await this.executeRule(application, rule);
          executions.push(execution);
        }
      }

      logger.info(`Workflow processing completed for application ${applicationId}. Executed ${executions.length} rules.`);
      return executions;

    } catch (error) {
      logger.error('Error processing workflow:', error);
      throw error;
    }
  }

  /**
   * Process workflows for all applications (batch processing)
   */
  async processAllWorkflows(): Promise<void> {
    try {
      logger.info('Starting batch workflow processing');

      // Get all active applications
      const applications = await this.prisma.application.findMany({
        where: {
          status: {
            notIn: ['ACCEPTED', 'REJECTED', 'WITHDRAWN']
          }
        }
      });

      const batchSize = 10;
      for (let i = 0; i < applications.length; i += batchSize) {
        const batch = applications.slice(i, i + batchSize);
        const promises = batch.map(app => this.processWorkflow(app.id));
        
        await Promise.allSettled(promises);
        
        // Small delay between batches to avoid overwhelming the system
        if (i + batchSize < applications.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.info(`Batch workflow processing completed for ${applications.length} applications`);

    } catch (error) {
      logger.error('Error in batch workflow processing:', error);
      throw error;
    }
  }

  /**
   * Get applicable rules for an application
   */
  private getApplicableRules(application: Application): WorkflowRule[] {
    return this.workflowRules
      .filter(rule => rule.fromStatus === application.status)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Evaluate workflow conditions
   */
  private async evaluateConditions(
    application: Application & any,
    conditions: WorkflowCondition[]
  ): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluateCondition(application, condition);
      if (!result) {
        return false; // All conditions must be true
      }
    }
    return true;
  }

  /**
   * Evaluate a single workflow condition
   */
  private async evaluateCondition(
    application: Application & any,
    condition: WorkflowCondition
  ): Promise<boolean> {
    try {
      switch (condition.type) {
        case 'TIME_ELAPSED':
          return this.evaluateTimeCondition(application, condition);

        case 'DOCUMENT_UPLOADED':
          return this.evaluateDocumentCondition(application, condition);

        case 'ASSESSMENT_COMPLETED':
          return this.evaluateAssessmentCondition(application, condition);

        case 'INTERVIEW_COMPLETED':
          return this.evaluateInterviewCondition(application, condition);

        case 'CUSTOM':
          return this.evaluateCustomCondition(application, condition);

        default:
          logger.warn(`Unknown condition type: ${condition.type}`);
          return false;
      }
    } catch (error) {
      logger.error('Error evaluating condition:', error);
      return false;
    }
  }

  /**
   * Evaluate time-based condition
   */
  private evaluateTimeCondition(
    application: Application,
    condition: WorkflowCondition
  ): boolean {
    if (!condition.timeUnit || !condition.timeValue) {
      return false;
    }

    const now = new Date();
    const applicationTime = new Date(application.createdAt);
    const timeDiff = now.getTime() - applicationTime.getTime();

    let thresholdMs = 0;
    switch (condition.timeUnit) {
      case 'MINUTES':
        thresholdMs = condition.timeValue * 60 * 1000;
        break;
      case 'HOURS':
        thresholdMs = condition.timeValue * 60 * 60 * 1000;
        break;
      case 'DAYS':
        thresholdMs = condition.timeValue * 24 * 60 * 60 * 1000;
        break;
      case 'WEEKS':
        thresholdMs = condition.timeValue * 7 * 24 * 60 * 60 * 1000;
        break;
    }

    switch (condition.operator) {
      case 'GREATER_THAN':
        return timeDiff > thresholdMs;
      case 'LESS_THAN':
        return timeDiff < thresholdMs;
      case 'EQUALS':
        return Math.abs(timeDiff - thresholdMs) < 60000; // Within 1 minute
      default:
        return false;
    }
  }

  /**
   * Evaluate document-related condition
   */
  private evaluateDocumentCondition(
    application: Application & any,
    condition: WorkflowCondition
  ): boolean {
    const documents = application.documents || [];

    switch (condition.operator) {
      case 'EXISTS':
        return documents.length > 0;
      case 'GREATER_THAN':
        return documents.length > (condition.value || 0);
      case 'EQUALS':
        return documents.length === (condition.value || 0);
      default:
        return false;
    }
  }

  /**
   * Evaluate assessment-related condition
   */
  private evaluateAssessmentCondition(
    application: Application & any,
    condition: WorkflowCondition
  ): boolean {
    if (!condition.field) {
      return false;
    }

    const fieldValue = application[condition.field];

    switch (condition.operator) {
      case 'EXISTS':
        return fieldValue !== null && fieldValue !== undefined;
      case 'NOT_EQUALS':
        return fieldValue !== condition.value;
      case 'EQUALS':
        return fieldValue === condition.value;
      default:
        return false;
    }
  }

  /**
   * Evaluate interview-related condition
   */
  private evaluateInterviewCondition(
    application: Application & any,
    condition: WorkflowCondition
  ): boolean {
    const interviews = application.interviewRecords || [];

    switch (condition.operator) {
      case 'EXISTS':
        return interviews.some((interview: any) => interview.status === 'COMPLETED');
      case 'GREATER_THAN':
        return interviews.filter((interview: any) => interview.status === 'COMPLETED').length > (condition.value || 0);
      default:
        return false;
    }
  }

  /**
   * Evaluate custom condition
   */
  private async evaluateCustomCondition(
    application: Application & any,
    condition: WorkflowCondition
  ): Promise<boolean> {
    if (!condition.field) {
      return false;
    }

    // Handle special custom conditions
    if (condition.field === 'completeness') {
      const completeness = await this.calculateApplicationCompleteness(application);
      
      switch (condition.operator) {
        case 'EQUALS':
          return completeness === condition.value;
        case 'GREATER_THAN':
          return completeness > condition.value;
        case 'LESS_THAN':
          return completeness < condition.value;
        default:
          return false;
      }
    }

    // Default field evaluation
    const fieldValue = application[condition.field];
    
    switch (condition.operator) {
      case 'EQUALS':
        return fieldValue === condition.value;
      case 'NOT_EQUALS':
        return fieldValue !== condition.value;
      case 'EXISTS':
        return fieldValue !== null && fieldValue !== undefined;
      default:
        return false;
    }
  }

  /**
   * Execute a workflow rule
   */
  private async executeRule(
    application: Application & any,
    rule: WorkflowRule
  ): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      id: crypto.randomUUID(),
      applicationId: application.id,
      ruleId: rule.id,
      status: 'EXECUTING',
      startedAt: new Date()
    };

    try {
      logger.info(`Executing workflow rule ${rule.id} for application ${application.id}`);

      for (const action of rule.actions) {
        await this.executeAction(application, action);
      }

      execution.status = 'COMPLETED';
      execution.completedAt = new Date();
      execution.result = { success: true, actionsExecuted: rule.actions.length };

      logger.info(`Workflow rule ${rule.id} executed successfully for application ${application.id}`);

    } catch (error) {
      execution.status = 'FAILED';
      execution.completedAt = new Date();
      execution.error = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`Workflow rule ${rule.id} failed for application ${application.id}:`, error);
    }

    return execution;
  }

  /**
   * Execute a workflow action
   */
  private async executeAction(
    application: Application & any,
    action: WorkflowAction
  ): Promise<void> {
    switch (action.type) {
      case 'UPDATE_STATUS':
        await this.executeUpdateStatusAction(application, action);
        break;

      case 'SEND_NOTIFICATION':
        await this.executeSendNotificationAction(application, action);
        break;

      case 'SCHEDULE_TASK':
        await this.executeScheduleTaskAction(application, action);
        break;

      case 'ASSIGN_REVIEWER':
        await this.executeAssignReviewerAction(application, action);
        break;

      case 'CUSTOM':
        await this.executeCustomAction(application, action);
        break;

      default:
        logger.warn(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Execute update status action
   */
  private async executeUpdateStatusAction(
    application: Application & any,
    action: WorkflowAction
  ): Promise<void> {
    const newStatus = action.parameters.status as ApplicationStatus;
    await this.statusTracker.updateStatus(application.id, newStatus, 'WORKFLOW_ENGINE');
  }

  /**
   * Execute send notification action
   */
  private async executeSendNotificationAction(
    application: Application & any,
    action: WorkflowAction
  ): Promise<void> {
    const notificationType = action.parameters.type;
    
    switch (notificationType) {
      case 'STATUS_UPDATE':
        await this.notificationManager.sendStatusUpdate(application);
        break;
      case 'INCOMPLETE_REMINDER':
        // Send custom reminder for incomplete applications
        await this.notificationManager.sendDeadlineReminder(
          application,
          'Application Completion',
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        );
        break;
      default:
        logger.warn(`Unknown notification type: ${notificationType}`);
    }
  }

  /**
   * Execute schedule task action
   */
  private async executeScheduleTaskAction(
    application: Application & any,
    action: WorkflowAction
  ): Promise<void> {
    // In a real implementation, this would integrate with a task scheduling system
    logger.info(`Scheduling task: ${action.parameters.type} for application ${application.id}`);
    
    // TODO: Implement actual task scheduling
    // await taskScheduler.schedule({
    //   type: action.parameters.type,
    //   applicationId: application.id,
    //   assignTo: action.parameters.assignTo,
    //   dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    // });
  }

  /**
   * Execute assign reviewer action
   */
  private async executeAssignReviewerAction(
    application: Application & any,
    action: WorkflowAction
  ): Promise<void> {
    // In a real implementation, this would assign reviewers based on availability and expertise
    logger.info(`Assigning reviewer: ${action.parameters.type} for application ${application.id}`);
    
    // TODO: Implement actual reviewer assignment
    // await reviewerAssignmentService.assign({
    //   applicationId: application.id,
    //   reviewerType: action.parameters.type,
    //   priority: action.parameters.priority || 'NORMAL'
    // });
  }

  /**
   * Execute custom action
   */
  private async executeCustomAction(
    application: Application & any,
    action: WorkflowAction
  ): Promise<void> {
    // Handle custom actions based on parameters
    logger.info(`Executing custom action for application ${application.id}:`, action.parameters);
    
    // Custom actions would be implemented based on specific business requirements
  }

  /**
   * Calculate application completeness percentage
   */
  private async calculateApplicationCompleteness(application: Application & any): Promise<number> {
    const requiredFields = [
      'personalStatement',
      'academicHistory',
      'spiritualTestimony',
      'characterReferences',
      'documents'
    ];

    let completedFields = 0;
    
    requiredFields.forEach(field => {
      const value = application[field];
      if (value && (typeof value !== 'object' || (Array.isArray(value) && value.length > 0))) {
        completedFields++;
      }
    });

    return Math.round((completedFields / requiredFields.length) * 100);
  }

  /**
   * Add custom workflow rule
   */
  addWorkflowRule(rule: WorkflowRule): void {
    this.workflowRules.push(rule);
    this.workflowRules.sort((a, b) => a.priority - b.priority);
    logger.info(`Added workflow rule: ${rule.id}`);
  }

  /**
   * Remove workflow rule
   */
  removeWorkflowRule(ruleId: string): boolean {
    const index = this.workflowRules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.workflowRules.splice(index, 1);
      logger.info(`Removed workflow rule: ${ruleId}`);
      return true;
    }
    return false;
  }

  /**
   * Get all workflow rules
   */
  getWorkflowRules(): WorkflowRule[] {
    return [...this.workflowRules];
  }
}

// Import crypto for UUID generation
import crypto from 'crypto';