/**
 * Account Deletion Service
 * "There is a time for everything" - Ecclesiastes 3:1
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/productionLogger';
import {
  AccountDeletionRequest,
  AccountDeletionResponse,
  AnonymizationResult
} from '../types/profile.types';

const prisma = new PrismaClient();

export class AccountDeletionService {
  private readonly DELETION_GRACE_PERIOD = 30; // days

  /**
   * Request account deletion
   */
  async requestAccountDeletion(request: AccountDeletionRequest): Promise<AccountDeletionResponse> {
    try {
      const { userId, confirmPassword, reason, feedback } = request;

      // Verify password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true, email: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const isPasswordValid = await bcrypt.compare(confirmPassword, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error('Invalid password');
      }

      // Calculate deletion date (grace period)
      const scheduledFor = new Date();
      scheduledFor.setDate(scheduledFor.getDate() + this.DELETION_GRACE_PERIOD);

      const cancelBy = new Date(scheduledFor);
      cancelBy.setDate(cancelBy.getDate() - 1);

      // Create deletion request
      const deletionRequest = await prisma.accountDeletionRequest.create({
        data: {
          userId,
          reason,
          feedback,
          status: 'scheduled',
          scheduledFor,
          cancelBy,
          createdAt: new Date()
        }
      });

      // Mark account as pending deletion
      await prisma.user.update({
        where: { id: userId },
        data: {
          enrollmentStatus: 'PENDING_DELETION',
          updatedAt: new Date()
        }
      });

      logger.info('Account deletion requested', { userId, deletionId: deletionRequest.id, scheduledFor });

      // TODO: Send confirmation email with cancellation instructions

      return {
        deletionId: deletionRequest.id,
        status: 'scheduled',
        scheduledFor,
        canCancel: true,
        cancelBy
      };
    } catch (error) {
      logger.error('Failed to request account deletion', { error: error.message, userId: request.userId });
      throw error;
    }
  }

  /**
   * Cancel account deletion
   */
  async cancelAccountDeletion(deletionId: string, userId: string): Promise<void> {
    try {
      const deletionRequest = await prisma.accountDeletionRequest.findUnique({
        where: { id: deletionId }
      });

      if (!deletionRequest) {
        throw new Error('Deletion request not found');
      }

      if (deletionRequest.userId !== userId) {
        throw new Error('Unauthorized');
      }

      if (deletionRequest.status !== 'scheduled') {
        throw new Error('Deletion request cannot be cancelled');
      }

      if (new Date() > deletionRequest.cancelBy) {
        throw new Error('Cancellation period has expired');
      }

      // Cancel deletion request
      await prisma.accountDeletionRequest.update({
        where: { id: deletionId },
        data: {
          status: 'cancelled',
          cancelledAt: new Date()
        }
      });

      // Restore account status
      await prisma.user.update({
        where: { id: userId },
        data: {
          enrollmentStatus: 'ACTIVE',
          updatedAt: new Date()
        }
      });

      logger.info('Account deletion cancelled', { userId, deletionId });

      // TODO: Send confirmation email
    } catch (error) {
      logger.error('Failed to cancel account deletion', { error: error.message, deletionId });
      throw error;
    }
  }

  /**
   * Process scheduled deletions
   */
  async processScheduledDeletions(): Promise<void> {
    try {
      const now = new Date();

      // Find deletions scheduled for processing
      const scheduledDeletions = await prisma.accountDeletionRequest.findMany({
        where: {
          status: 'scheduled',
          scheduledFor: {
            lte: now
          }
        }
      });

      for (const deletion of scheduledDeletions) {
        try {
          // Update status to processing
          await prisma.accountDeletionRequest.update({
            where: { id: deletion.id },
            data: { status: 'processing' }
          });

          // Anonymize user data
          const anonymizationResult = await this.anonymizeUserData(deletion.userId);

          // Update deletion request
          await prisma.accountDeletionRequest.update({
            where: { id: deletion.id },
            data: {
              status: 'completed',
              completedAt: new Date()
            }
          });

          logger.info('Account deletion completed', {
            userId: deletion.userId,
            deletionId: deletion.id,
            anonymizationResult
          });
        } catch (error) {
          logger.error('Failed to process deletion', {
            error: error.message,
            deletionId: deletion.id
          });

          await prisma.accountDeletionRequest.update({
            where: { id: deletion.id },
            data: { status: 'failed' }
          });
        }
      }

      logger.info('Scheduled deletions processed', { count: scheduledDeletions.length });
    } catch (error) {
      logger.error('Failed to process scheduled deletions', { error: error.message });
      // Don't throw - this is a background job
    }
  }

  /**
   * Anonymize user data
   */
  private async anonymizeUserData(userId: string): Promise<AnonymizationResult> {
    try {
      const dataRetained: string[] = [];
      const dataDeleted: string[] = [];

      // Anonymize user profile
      await prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted_${userId}@anonymized.local`,
          username: `deleted_${userId}`,
          firstName: 'Deleted',
          lastName: 'User',
          bio: null,
          avatarUrl: null,
          dateOfBirth: null,
          phoneNumber: null,
          location: null,
          scrollCalling: null,
          spiritualGifts: [],
          kingdomVision: null,
          enrollmentStatus: 'DELETED',
          passwordHash: 'DELETED',
          updatedAt: new Date()
        }
      });
      dataDeleted.push('personal_information');

      // Delete sensitive data
      await prisma.prayerEntry.deleteMany({ where: { userId } });
      dataDeleted.push('prayer_journal');

      await prisma.message.deleteMany({ where: { senderId: userId } });
      dataDeleted.push('messages');

      await prisma.post.deleteMany({ where: { authorId: userId } });
      dataDeleted.push('posts');

      await prisma.comment.deleteMany({ where: { userId } });
      dataDeleted.push('comments');

      // Delete preferences and settings
      await prisma.userPreferences.deleteMany({ where: { userId } });
      await prisma.privacySettings.deleteMany({ where: { userId } });
      await prisma.securitySettings.deleteMany({ where: { userId } });
      dataDeleted.push('preferences_and_settings');

      // Delete authentication data
      await prisma.loginHistory.deleteMany({ where: { userId } });
      dataDeleted.push('login_history');

      // Retain academic records (anonymized)
      // Enrollments, grades, and assignments are kept for institutional records
      dataRetained.push('academic_records');

      // Retain financial records (anonymized)
      // Payment history is kept for accounting and legal compliance
      dataRetained.push('financial_records');

      logger.info('User data anonymized', { userId, dataDeleted, dataRetained });

      return {
        userId,
        anonymizedAt: new Date(),
        dataRetained,
        dataDeleted,
        anonymizationMethod: 'GDPR_COMPLIANT_ANONYMIZATION'
      };
    } catch (error) {
      logger.error('Failed to anonymize user data', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get deletion status
   */
  async getDeletionStatus(userId: string): Promise<AccountDeletionResponse | null> {
    try {
      const deletionRequest = await prisma.accountDeletionRequest.findFirst({
        where: {
          userId,
          status: {
            in: ['scheduled', 'processing']
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!deletionRequest) {
        return null;
      }

      return {
        deletionId: deletionRequest.id,
        status: deletionRequest.status as any,
        scheduledFor: deletionRequest.scheduledFor,
        canCancel: deletionRequest.status === 'scheduled' && new Date() <= deletionRequest.cancelBy,
        cancelBy: deletionRequest.cancelBy
      };
    } catch (error) {
      logger.error('Failed to get deletion status', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Immediate account deletion (admin only)
   */
  async immediateAccountDeletion(userId: string, adminId: string, reason: string): Promise<void> {
    try {
      // Verify admin permissions
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { role: true }
      });

      if (!admin || admin.role !== 'ADMIN') {
        throw new Error('Unauthorized: Admin access required');
      }

      // Create deletion request
      const deletionRequest = await prisma.accountDeletionRequest.create({
        data: {
          userId,
          reason,
          status: 'processing',
          scheduledFor: new Date(),
          cancelBy: new Date(),
          createdAt: new Date()
        }
      });

      // Anonymize immediately
      await this.anonymizeUserData(userId);

      // Update deletion request
      await prisma.accountDeletionRequest.update({
        where: { id: deletionRequest.id },
        data: {
          status: 'completed',
          completedAt: new Date()
        }
      });

      logger.info('Immediate account deletion completed', { userId, adminId, reason });
    } catch (error) {
      logger.error('Failed to perform immediate account deletion', { error: error.message, userId });
      throw error;
    }
  }
}

export const accountDeletionService = new AccountDeletionService();
