/**
 * ScrollUniversity Admissions - Application Service
 * "Many are called, but few are chosen" - Matthew 22:14
 * 
 * Core service for application CRUD operations and lifecycle management
 */

import { PrismaClient, Application, ApplicationStatus, ProgramType } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface CreateApplicationData {
  applicantId: string;
  programApplied: ProgramType;
  intendedStartDate: Date;
  personalStatement: string;
  academicHistory?: any[];
  spiritualTestimony?: string;
  characterReferences?: any[];
  documents?: any[];
}

export interface UpdateApplicationData {
  personalStatement?: string;
  academicHistory?: any[];
  spiritualTestimony?: string;
  characterReferences?: any[];
  status?: ApplicationStatus;
  eligibilityResult?: any;
  spiritualEvaluation?: any;
  academicEvaluation?: any;
  interviewResults?: any[];
  admissionDecision?: any;
  decisionDate?: Date;
  decisionReasoning?: any;
  enrollmentDeadline?: Date;
}

export interface ApplicationFilters {
  status?: string;
  program?: string;
  page: number;
  limit: number;
}

export class ApplicationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new application
   */
  async createApplication(data: CreateApplicationData): Promise<Application> {
    try {
      logger.info(`Creating application for user ${data.applicantId}`);

      // Check if user already has an active application for this program
      const existingApplication = await this.prisma.application.findFirst({
        where: {
          applicantId: data.applicantId,
          programApplied: data.programApplied,
          status: {
            notIn: ['REJECTED', 'WITHDRAWN']
          }
        }
      });

      if (existingApplication) {
        throw new Error('User already has an active application for this program');
      }

      const application = await this.prisma.application.create({
        data: {
          applicantId: data.applicantId,
          programApplied: data.programApplied,
          intendedStartDate: new Date(data.intendedStartDate),
          personalStatement: data.personalStatement,
          academicHistory: data.academicHistory || [],
          spiritualTestimony: data.spiritualTestimony,
          characterReferences: data.characterReferences || [],
          documents: data.documents || [],
          status: 'SUBMITTED',
          applicationTimeline: [
            {
              event: 'APPLICATION_SUBMITTED',
              timestamp: new Date().toISOString(),
              details: {
                program: data.programApplied,
                intendedStartDate: data.intendedStartDate
              }
            }
          ]
        },
        include: {
          applicant: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              username: true
            }
          }
        }
      });

      logger.info(`Application created successfully: ${application.id}`);
      return application;

    } catch (error) {
      logger.error('Error creating application:', error);
      throw error;
    }
  }

  /**
   * Get application by ID
   */
  async getApplicationById(id: string): Promise<Application | null> {
    try {
      const application = await this.prisma.application.findUnique({
        where: { id },
        include: {
          applicant: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              username: true,
              location: true,
              phoneNumber: true
            }
          },
          eligibilityAssessment: true,
          spiritualEvaluations: true,
          academicEvaluations: true,
          interviewRecords: true,
          admissionDecisions: true
        }
      });

      return application;

    } catch (error) {
      logger.error('Error retrieving application:', error);
      throw error;
    }
  }

  /**
   * Get all applications for a user
   */
  async getUserApplications(userId: string): Promise<Application[]> {
    try {
      const applications = await this.prisma.application.findMany({
        where: { applicantId: userId },
        include: {
          applicant: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              username: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return applications;

    } catch (error) {
      logger.error('Error retrieving user applications:', error);
      throw error;
    }
  }

  /**
   * Get all applications with filters (admin view)
   */
  async getAllApplications(filters: ApplicationFilters): Promise<{
    applications: Application[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const where: any = {};

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.program) {
        where.programApplied = filters.program;
      }

      const [applications, total] = await Promise.all([
        this.prisma.application.findMany({
          where,
          include: {
            applicant: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                username: true,
                location: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (filters.page - 1) * filters.limit,
          take: filters.limit
        }),
        this.prisma.application.count({ where })
      ]);

      const totalPages = Math.ceil(total / filters.limit);

      return {
        applications,
        total,
        page: filters.page,
        totalPages
      };

    } catch (error) {
      logger.error('Error retrieving all applications:', error);
      throw error;
    }
  }

  /**
   * Update application
   */
  async updateApplication(id: string, data: UpdateApplicationData): Promise<Application> {
    try {
      logger.info(`Updating application ${id}`);

      const updateData: any = {};

      // Only update provided fields
      if (data.personalStatement !== undefined) updateData.personalStatement = data.personalStatement;
      if (data.academicHistory !== undefined) updateData.academicHistory = data.academicHistory;
      if (data.spiritualTestimony !== undefined) updateData.spiritualTestimony = data.spiritualTestimony;
      if (data.characterReferences !== undefined) updateData.characterReferences = data.characterReferences;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.eligibilityResult !== undefined) updateData.eligibilityResult = data.eligibilityResult;
      if (data.spiritualEvaluation !== undefined) updateData.spiritualEvaluation = data.spiritualEvaluation;
      if (data.academicEvaluation !== undefined) updateData.academicEvaluation = data.academicEvaluation;
      if (data.interviewResults !== undefined) updateData.interviewResults = data.interviewResults;
      if (data.admissionDecision !== undefined) updateData.admissionDecision = data.admissionDecision;
      if (data.decisionDate !== undefined) updateData.decisionDate = data.decisionDate;
      if (data.decisionReasoning !== undefined) updateData.decisionReasoning = data.decisionReasoning;
      if (data.enrollmentDeadline !== undefined) updateData.enrollmentDeadline = data.enrollmentDeadline;

      updateData.updatedAt = new Date();

      const application = await this.prisma.application.update({
        where: { id },
        data: updateData,
        include: {
          applicant: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              username: true
            }
          }
        }
      });

      logger.info(`Application updated successfully: ${id}`);
      return application;

    } catch (error) {
      logger.error('Error updating application:', error);
      throw error;
    }
  }

  /**
   * Add document to application
   */
  async addDocument(applicationId: string, document: any): Promise<Application> {
    try {
      logger.info(`Adding document to application ${applicationId}`);

      const application = await this.prisma.application.findUnique({
        where: { id: applicationId }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const currentDocuments = Array.isArray(application.documents) ? application.documents : [];
      const updatedDocuments = [...currentDocuments, document];

      const updatedApplication = await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          documents: updatedDocuments,
          updatedAt: new Date()
        },
        include: {
          applicant: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              username: true
            }
          }
        }
      });

      logger.info(`Document added successfully to application ${applicationId}`);
      return updatedApplication;

    } catch (error) {
      logger.error('Error adding document to application:', error);
      throw error;
    }
  }

  /**
   * Withdraw application
   */
  async withdrawApplication(id: string, reason?: string): Promise<Application> {
    try {
      logger.info(`Withdrawing application ${id}`);

      const application = await this.prisma.application.update({
        where: { id },
        data: {
          status: 'WITHDRAWN',
          updatedAt: new Date(),
          applicationTimeline: {
            push: {
              event: 'APPLICATION_WITHDRAWN',
              timestamp: new Date().toISOString(),
              details: {
                reason: reason || 'No reason provided'
              }
            }
          }
        },
        include: {
          applicant: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              username: true
            }
          }
        }
      });

      logger.info(`Application withdrawn successfully: ${id}`);
      return application;

    } catch (error) {
      logger.error('Error withdrawing application:', error);
      throw error;
    }
  }

  /**
   * Get application statistics
   */
  async getApplicationStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byProgram: Record<string, number>;
    recentSubmissions: number;
  }> {
    try {
      const [total, statusCounts, programCounts, recentCount] = await Promise.all([
        this.prisma.application.count(),
        this.prisma.application.groupBy({
          by: ['status'],
          _count: { status: true }
        }),
        this.prisma.application.groupBy({
          by: ['programApplied'],
          _count: { programApplied: true }
        }),
        this.prisma.application.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        })
      ]);

      const byStatus = statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<string, number>);

      const byProgram = programCounts.reduce((acc, item) => {
        acc[item.programApplied] = item._count.programApplied;
        return acc;
      }, {} as Record<string, number>);

      return {
        total,
        byStatus,
        byProgram,
        recentSubmissions: recentCount
      };

    } catch (error) {
      logger.error('Error retrieving application statistics:', error);
      throw error;
    }
  }

  /**
   * Check application completeness
   */
  async checkApplicationCompleteness(id: string): Promise<{
    isComplete: boolean;
    missingComponents: string[];
    completionPercentage: number;
  }> {
    try {
      const application = await this.prisma.application.findUnique({
        where: { id }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const requiredComponents = [
        'personalStatement',
        'academicHistory',
        'spiritualTestimony',
        'characterReferences',
        'documents'
      ];

      const missingComponents: string[] = [];
      let completedComponents = 0;

      requiredComponents.forEach(component => {
        const value = (application as any)[component];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          missingComponents.push(component);
        } else {
          completedComponents++;
        }
      });

      const completionPercentage = Math.round((completedComponents / requiredComponents.length) * 100);
      const isComplete = missingComponents.length === 0;

      return {
        isComplete,
        missingComponents,
        completionPercentage
      };

    } catch (error) {
      logger.error('Error checking application completeness:', error);
      throw error;
    }
  }
}