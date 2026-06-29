/**
 * Scholarship Management Service
 * "For the Lord gives wisdom; from his mouth come knowledge and understanding" - Proverbs 2:6
 * 
 * Handles scholarship creation, management, and lifecycle operations
 */

import { PrismaClient } from '@prisma/client';
import {
  ScholarshipData,
  CreateScholarshipRequest,
  UpdateScholarshipRequest,
  ScholarshipSearchFilters,
  ScholarshipStatus,
  ScholarshipType
} from '../types/scholarship.types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export default class ScholarshipService {
  /**
   * Create a new scholarship
   */
  async createScholarship(
    request: CreateScholarshipRequest,
    createdById: string
  ): Promise<ScholarshipData> {
    try {
      logger.info('Creating new scholarship', { name: request.name, createdById });

      const scholarship = await prisma.scholarship.create({
        data: {
          name: request.name,
          description: request.description,
          type: request.type,
          status: ScholarshipStatus.DRAFT,
          amount: request.amount,
          currency: request.currency || 'USD',
          totalFunding: request.totalFunding,
          remainingFunding: request.totalFunding,
          maxRecipients: request.maxRecipients,
          currentRecipients: 0,
          eligibilityCriteria: request.eligibilityCriteria as any,
          applicationDeadline: request.applicationDeadline,
          awardDate: request.awardDate,
          renewalEligible: request.renewalEligible || false,
          renewalCriteria: request.renewalCriteria as any,
          createdById
        }
      });

      logger.info('Scholarship created successfully', { scholarshipId: scholarship.id });

      return this.mapToScholarshipData(scholarship);
    } catch (error) {
      logger.error('Error creating scholarship', { error, request });
      throw new Error(`Failed to create scholarship: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get scholarship by ID
   */
  async getScholarshipById(scholarshipId: string): Promise<ScholarshipData | null> {
    try {
      const scholarship = await prisma.scholarship.findUnique({
        where: { id: scholarshipId },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          applications: {
            select: {
              id: true,
              status: true,
              eligibilityScore: true
            }
          }
        }
      });

      if (!scholarship) {
        return null;
      }

      return this.mapToScholarshipData(scholarship);
    } catch (error) {
      logger.error('Error fetching scholarship', { error, scholarshipId });
      throw new Error(`Failed to fetch scholarship: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update scholarship
   */
  async updateScholarship(
    scholarshipId: string,
    request: UpdateScholarshipRequest
  ): Promise<ScholarshipData> {
    try {
      logger.info('Updating scholarship', { scholarshipId, request });

      const scholarship = await prisma.scholarship.update({
        where: { id: scholarshipId },
        data: {
          ...(request.name && { name: request.name }),
          ...(request.description && { description: request.description }),
          ...(request.status && { status: request.status }),
          ...(request.amount !== undefined && { amount: request.amount }),
          ...(request.totalFunding !== undefined && {
            totalFunding: request.totalFunding,
            remainingFunding: request.totalFunding
          }),
          ...(request.maxRecipients !== undefined && { maxRecipients: request.maxRecipients }),
          ...(request.eligibilityCriteria && { eligibilityCriteria: request.eligibilityCriteria as any }),
          ...(request.applicationDeadline && { applicationDeadline: request.applicationDeadline }),
          ...(request.awardDate && { awardDate: request.awardDate }),
          ...(request.renewalEligible !== undefined && { renewalEligible: request.renewalEligible }),
          ...(request.renewalCriteria && { renewalCriteria: request.renewalCriteria as any }),
          updatedAt: new Date()
        }
      });

      logger.info('Scholarship updated successfully', { scholarshipId });

      return this.mapToScholarshipData(scholarship);
    } catch (error) {
      logger.error('Error updating scholarship', { error, scholarshipId });
      throw new Error(`Failed to update scholarship: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete scholarship
   */
  async deleteScholarship(scholarshipId: string): Promise<void> {
    try {
      logger.info('Deleting scholarship', { scholarshipId });

      await prisma.scholarship.delete({
        where: { id: scholarshipId }
      });

      logger.info('Scholarship deleted successfully', { scholarshipId });
    } catch (error) {
      logger.error('Error deleting scholarship', { error, scholarshipId });
      throw new Error(`Failed to delete scholarship: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search scholarships with filters
   */
  async searchScholarships(
    filters: ScholarshipSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<{ scholarships: ScholarshipData[]; total: number; page: number; totalPages: number }> {
    try {
      const where: any = {};

      if (filters.type && filters.type.length > 0) {
        where.type = { in: filters.type };
      }

      if (filters.status && filters.status.length > 0) {
        where.status = { in: filters.status };
      }

      if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
        where.amount = {};
        if (filters.minAmount !== undefined) {
          where.amount.gte = filters.minAmount;
        }
        if (filters.maxAmount !== undefined) {
          where.amount.lte = filters.maxAmount;
        }
      }

      if (filters.deadlineAfter || filters.deadlineBefore) {
        where.applicationDeadline = {};
        if (filters.deadlineAfter) {
          where.applicationDeadline.gte = filters.deadlineAfter;
        }
        if (filters.deadlineBefore) {
          where.applicationDeadline.lte = filters.deadlineBefore;
        }
      }

      const [scholarships, total] = await Promise.all([
        prisma.scholarship.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { applicationDeadline: 'asc' },
          include: {
            applications: {
              select: {
                id: true,
                status: true
              }
            }
          }
        }),
        prisma.scholarship.count({ where })
      ]);

      return {
        scholarships: scholarships.map(s => this.mapToScholarshipData(s)),
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error searching scholarships', { error, filters });
      throw new Error(`Failed to search scholarships: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get active scholarships
   */
  async getActiveScholarships(limit: number = 20): Promise<ScholarshipData[]> {
    try {
      const scholarships = await prisma.scholarship.findMany({
        where: {
          status: ScholarshipStatus.ACTIVE,
          applicationDeadline: {
            gte: new Date()
          }
        },
        take: limit,
        orderBy: { applicationDeadline: 'asc' }
      });

      return scholarships.map(s => this.mapToScholarshipData(s));
    } catch (error) {
      logger.error('Error fetching active scholarships', { error });
      throw new Error(`Failed to fetch active scholarships: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get scholarships by creator
   */
  async getScholarshipsByCreator(creatorId: string): Promise<ScholarshipData[]> {
    try {
      const scholarships = await prisma.scholarship.findMany({
        where: { createdById: creatorId },
        orderBy: { createdAt: 'desc' }
      });

      return scholarships.map(s => this.mapToScholarshipData(s));
    } catch (error) {
      logger.error('Error fetching scholarships by creator', { error, creatorId });
      throw new Error(`Failed to fetch scholarships: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update scholarship funding
   */
  async updateFunding(
    scholarshipId: string,
    amountUsed: number
  ): Promise<void> {
    try {
      const scholarship = await prisma.scholarship.findUnique({
        where: { id: scholarshipId }
      });

      if (!scholarship) {
        throw new Error('Scholarship not found');
      }

      const newRemainingFunding = scholarship.remainingFunding - amountUsed;

      if (newRemainingFunding < 0) {
        throw new Error('Insufficient funding available');
      }

      await prisma.scholarship.update({
        where: { id: scholarshipId },
        data: {
          remainingFunding: newRemainingFunding,
          currentRecipients: { increment: 1 }
        }
      });

      logger.info('Scholarship funding updated', { scholarshipId, amountUsed, newRemainingFunding });
    } catch (error) {
      logger.error('Error updating scholarship funding', { error, scholarshipId });
      throw new Error(`Failed to update funding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if scholarship has available funding
   */
  async hasAvailableFunding(scholarshipId: string, amount: number): Promise<boolean> {
    try {
      const scholarship = await prisma.scholarship.findUnique({
        where: { id: scholarshipId }
      });

      if (!scholarship) {
        return false;
      }

      return scholarship.remainingFunding >= amount && 
             scholarship.currentRecipients < scholarship.maxRecipients;
    } catch (error) {
      logger.error('Error checking available funding', { error, scholarshipId });
      return false;
    }
  }

  /**
   * Map database model to ScholarshipData
   */
  private mapToScholarshipData(scholarship: any): ScholarshipData {
    return {
      id: scholarship.id,
      name: scholarship.name,
      description: scholarship.description,
      type: scholarship.type as ScholarshipType,
      status: scholarship.status as ScholarshipStatus,
      amount: Number(scholarship.amount),
      currency: scholarship.currency,
      totalFunding: Number(scholarship.totalFunding),
      remainingFunding: Number(scholarship.remainingFunding),
      maxRecipients: scholarship.maxRecipients,
      currentRecipients: scholarship.currentRecipients,
      eligibilityCriteria: scholarship.eligibilityCriteria,
      applicationDeadline: scholarship.applicationDeadline,
      awardDate: scholarship.awardDate,
      disbursementSchedule: scholarship.disbursementSchedule || [],
      renewalEligible: scholarship.renewalEligible,
      renewalCriteria: scholarship.renewalCriteria,
      createdById: scholarship.createdById,
      createdAt: scholarship.createdAt,
      updatedAt: scholarship.updatedAt
    };
  }
}
