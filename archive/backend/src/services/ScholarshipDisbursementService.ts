/**
 * Scholarship Disbursement Service
 * "Give, and it will be given to you" - Luke 6:38
 * 
 * Handles scholarship fund disbursement and tracking
 */

import { PrismaClient } from '@prisma/client';
import {
  DisbursementSchedule,
  DisbursementRequest,
  DisbursementStatus,
  DisbursementMethod
} from '../types/scholarship.types';
import logger from '../utils/logger';
import ScholarshipNotificationService from './ScholarshipNotificationService';
import ScholarshipService from './ScholarshipService';

const prisma = new PrismaClient();

export default class ScholarshipDisbursementService {
  private notificationService: ScholarshipNotificationService;
  private scholarshipService: ScholarshipService;

  constructor() {
    this.notificationService = new ScholarshipNotificationService();
    this.scholarshipService = new ScholarshipService();
  }

  /**
   * Create disbursement
   */
  async createDisbursement(request: DisbursementRequest): Promise<DisbursementSchedule> {
    try {
      logger.info('Creating disbursement', { applicationId: request.applicationId });

      const application = await prisma.scholarshipApplication.findUnique({
        where: { id: request.applicationId },
        include: { scholarship: true }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      if (application.status !== 'APPROVED') {
        throw new Error('Application must be approved before creating disbursement');
      }

      // Check if scholarship has available funding
      const hasAvailableFunding = await this.scholarshipService.hasAvailableFunding(
        application.scholarshipId,
        request.amount
      );

      if (!hasAvailableFunding) {
        throw new Error('Insufficient scholarship funding available');
      }

      const disbursement = await prisma.scholarshipDisbursement.create({
        data: {
          scholarshipId: application.scholarshipId,
          applicationId: request.applicationId,
          recipientId: application.applicantId,
          amount: request.amount,
          scheduledDate: request.scheduledDate,
          status: DisbursementStatus.SCHEDULED,
          method: request.method,
          notes: request.notes
        }
      });

      logger.info('Disbursement created', { disbursementId: disbursement.id });

      return this.mapToDisbursementSchedule(disbursement);
    } catch (error) {
      logger.error('Error creating disbursement', { error, request });
      throw new Error(`Failed to create disbursement: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process disbursement
   */
  async processDisbursement(disbursementId: string): Promise<DisbursementSchedule> {
    try {
      logger.info('Processing disbursement', { disbursementId });

      const disbursement = await prisma.scholarshipDisbursement.findUnique({
        where: { id: disbursementId },
        include: {
          scholarship: true,
          application: true,
          recipient: true
        }
      });

      if (!disbursement) {
        throw new Error('Disbursement not found');
      }

      if (disbursement.status !== DisbursementStatus.SCHEDULED) {
        throw new Error('Disbursement must be in SCHEDULED status to process');
      }

      // Update status to processing
      await prisma.scholarshipDisbursement.update({
        where: { id: disbursementId },
        data: { status: DisbursementStatus.PROCESSING }
      });

      // Process based on method
      let transactionId: string | undefined;
      try {
        switch (disbursement.method) {
          case DisbursementMethod.DIRECT_TUITION_CREDIT:
            transactionId = await this.processTuitionCredit(
              disbursement.recipientId,
              disbursement.amount
            );
            break;
          case DisbursementMethod.SCROLLCOIN_TRANSFER:
            transactionId = await this.processScrollCoinTransfer(
              disbursement.recipientId,
              disbursement.amount
            );
            break;
          case DisbursementMethod.BANK_TRANSFER:
            transactionId = await this.processBankTransfer(
              disbursement.recipientId,
              disbursement.amount
            );
            break;
          case DisbursementMethod.CHECK:
            transactionId = await this.processCheck(
              disbursement.recipientId,
              disbursement.amount
            );
            break;
        }

        // Update disbursement as completed
        const completedDisbursement = await prisma.scholarshipDisbursement.update({
          where: { id: disbursementId },
          data: {
            status: DisbursementStatus.COMPLETED,
            actualDate: new Date(),
            transactionId
          }
        });

        // Update scholarship funding
        await this.scholarshipService.updateFunding(
          disbursement.scholarshipId,
          disbursement.amount
        );

        // Send notification
        await this.notificationService.sendDisbursementNotification(
          disbursement.recipientId,
          disbursementId,
          disbursement.amount,
          disbursement.scholarship.name
        );

        logger.info('Disbursement processed successfully', { disbursementId, transactionId });

        return this.mapToDisbursementSchedule(completedDisbursement);
      } catch (processingError) {
        // Mark as failed
        await prisma.scholarshipDisbursement.update({
          where: { id: disbursementId },
          data: {
            status: DisbursementStatus.FAILED,
            notes: `Processing failed: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`
          }
        });
        throw processingError;
      }
    } catch (error) {
      logger.error('Error processing disbursement', { error, disbursementId });
      throw new Error(`Failed to process disbursement: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process tuition credit
   */
  private async processTuitionCredit(userId: string, amount: number): Promise<string> {
    try {
      // Create a payment record for tuition credit
      const payment = await prisma.payment.create({
        data: {
          userId,
          amount,
          currency: 'USD',
          status: 'COMPLETED',
          paymentMethod: 'SCHOLARSHIP',
          description: 'Scholarship tuition credit',
          transactionId: `SCHOLARSHIP_${Date.now()}`
        }
      });

      return payment.transactionId;
    } catch (error) {
      logger.error('Error processing tuition credit', { error, userId });
      throw new Error('Failed to process tuition credit');
    }
  }

  /**
   * Process ScrollCoin transfer
   */
  private async processScrollCoinTransfer(userId: string, amount: number): Promise<string> {
    try {
      // Create ScrollCoin transaction
      const transaction = await prisma.scrollCoinTransaction.create({
        data: {
          userId,
          amount,
          type: 'REWARD',
          description: 'Scholarship award',
          status: 'CONFIRMED',
          blockchainTxHash: `SCHOLARSHIP_${Date.now()}`
        }
      });

      // Update user's ScrollCoin balance
      await prisma.user.update({
        where: { id: userId },
        data: {
          scrollCoinBalance: {
            increment: amount
          }
        }
      });

      return transaction.blockchainTxHash;
    } catch (error) {
      logger.error('Error processing ScrollCoin transfer', { error, userId });
      throw new Error('Failed to process ScrollCoin transfer');
    }
  }

  /**
   * Process bank transfer
   */
  private async processBankTransfer(userId: string, amount: number): Promise<string> {
    // In production, this would integrate with banking APIs
    // For now, we'll create a placeholder transaction
    logger.info('Processing bank transfer', { userId, amount });
    return `BANK_TRANSFER_${Date.now()}`;
  }

  /**
   * Process check
   */
  private async processCheck(userId: string, amount: number): Promise<string> {
    // In production, this would integrate with check printing services
    // For now, we'll create a placeholder transaction
    logger.info('Processing check', { userId, amount });
    return `CHECK_${Date.now()}`;
  }

  /**
   * Get disbursements by scholarship
   */
  async getDisbursementsByScholarship(scholarshipId: string): Promise<DisbursementSchedule[]> {
    try {
      const disbursements = await prisma.scholarshipDisbursement.findMany({
        where: { scholarshipId },
        orderBy: { scheduledDate: 'desc' }
      });

      return disbursements.map(d => this.mapToDisbursementSchedule(d));
    } catch (error) {
      logger.error('Error fetching disbursements', { error, scholarshipId });
      throw new Error(`Failed to fetch disbursements: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get disbursements by recipient
   */
  async getDisbursementsByRecipient(recipientId: string): Promise<DisbursementSchedule[]> {
    try {
      const disbursements = await prisma.scholarshipDisbursement.findMany({
        where: { recipientId },
        orderBy: { scheduledDate: 'desc' }
      });

      return disbursements.map(d => this.mapToDisbursementSchedule(d));
    } catch (error) {
      logger.error('Error fetching recipient disbursements', { error, recipientId });
      throw new Error(`Failed to fetch disbursements: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get pending disbursements
   */
  async getPendingDisbursements(): Promise<DisbursementSchedule[]> {
    try {
      const disbursements = await prisma.scholarshipDisbursement.findMany({
        where: {
          status: DisbursementStatus.SCHEDULED,
          scheduledDate: {
            lte: new Date()
          }
        },
        orderBy: { scheduledDate: 'asc' }
      });

      return disbursements.map(d => this.mapToDisbursementSchedule(d));
    } catch (error) {
      logger.error('Error fetching pending disbursements', { error });
      throw new Error(`Failed to fetch pending disbursements: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel disbursement
   */
  async cancelDisbursement(disbursementId: string, reason: string): Promise<void> {
    try {
      const disbursement = await prisma.scholarshipDisbursement.findUnique({
        where: { id: disbursementId }
      });

      if (!disbursement) {
        throw new Error('Disbursement not found');
      }

      if (disbursement.status === DisbursementStatus.COMPLETED) {
        throw new Error('Cannot cancel a completed disbursement');
      }

      await prisma.scholarshipDisbursement.update({
        where: { id: disbursementId },
        data: {
          status: DisbursementStatus.CANCELLED,
          notes: `Cancelled: ${reason}`
        }
      });

      logger.info('Disbursement cancelled', { disbursementId, reason });
    } catch (error) {
      logger.error('Error cancelling disbursement', { error, disbursementId });
      throw new Error(`Failed to cancel disbursement: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process all pending disbursements
   */
  async processAllPendingDisbursements(): Promise<{ processed: number; failed: number }> {
    try {
      const pendingDisbursements = await this.getPendingDisbursements();
      let processed = 0;
      let failed = 0;

      for (const disbursement of pendingDisbursements) {
        try {
          await this.processDisbursement(disbursement.id);
          processed++;
        } catch (error) {
          logger.error('Error processing disbursement in batch', { error, disbursementId: disbursement.id });
          failed++;
        }
      }

      logger.info('Batch disbursement processing completed', { processed, failed });
      return { processed, failed };
    } catch (error) {
      logger.error('Error in batch disbursement processing', { error });
      throw new Error(`Failed to process disbursements: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map database model to DisbursementSchedule
   */
  private mapToDisbursementSchedule(disbursement: any): DisbursementSchedule {
    return {
      id: disbursement.id,
      scholarshipId: disbursement.scholarshipId,
      recipientId: disbursement.recipientId,
      amount: Number(disbursement.amount),
      scheduledDate: disbursement.scheduledDate,
      actualDate: disbursement.actualDate,
      status: disbursement.status as DisbursementStatus,
      method: disbursement.method as DisbursementMethod,
      transactionId: disbursement.transactionId,
      notes: disbursement.notes
    };
  }
}
