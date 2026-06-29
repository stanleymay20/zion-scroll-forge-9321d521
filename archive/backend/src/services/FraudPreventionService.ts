/**
 * Fraud Prevention Service
 * "By the Spirit of Discernment, we protect the kingdom economy"
 * 
 * Service for detecting and preventing fraudulent ScrollCoin transactions,
 * monitoring suspicious patterns, and managing fraud alerts.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import scrollCoinConfig from '../config/scrollcoin.config';
import {
  FraudCheckResult,
  FraudAlertData,
  FraudAlertType,
  FraudSeverity,
  AlertStatus,
  ScrollCoinTransactionData,
  ScrollCoinTransactionType
} from '../types/scrollcoin.types';

const prisma = new PrismaClient();

export class FraudPreventionService {
  private static instance: FraudPreventionService;

  private constructor() {}

  public static getInstance(): FraudPreventionService {
    if (!FraudPreventionService.instance) {
      FraudPreventionService.instance = new FraudPreventionService();
    }
    return FraudPreventionService.instance;
  }

  /**
   * Check transaction for fraud indicators
   */
  async checkTransaction(
    userId: string,
    amount: number,
    type: ScrollCoinTransactionType
  ): Promise<FraudCheckResult> {
    try {
      if (!scrollCoinConfig.fraudDetectionEnabled) {
        return {
          isValid: true,
          alerts: [],
          canProceed: true
        };
      }

      const alerts: FraudAlertData[] = [];

      // Check if user is blacklisted
      const wallet = await prisma.scrollCoinWallet.findUnique({
        where: { userId }
      });

      if (wallet?.isBlacklisted) {
        const alert = await this.createAlert({
          userId,
          alertType: FraudAlertType.BLACKLISTED_ADDRESS,
          severity: FraudSeverity.CRITICAL,
          description: 'Transaction attempted from blacklisted wallet',
          amount
        });
        alerts.push(alert);
        
        return {
          isValid: false,
          alerts,
          canProceed: false,
          reason: 'Wallet is blacklisted'
        };
      }

      // Check for suspicious amount
      if (amount > scrollCoinConfig.suspiciousAmountThreshold) {
        const alert = await this.createAlert({
          userId,
          alertType: FraudAlertType.SUSPICIOUS_AMOUNT,
          severity: FraudSeverity.HIGH,
          description: `Large transaction amount: ${amount} ScrollCoin`,
          amount
        });
        alerts.push(alert);
      }

      // Check for rapid transactions
      const rapidTransactionCheck = await this.checkRapidTransactions(userId);
      if (!rapidTransactionCheck.isValid) {
        const alert = await this.createAlert({
          userId,
          alertType: FraudAlertType.RAPID_TRANSACTIONS,
          severity: FraudSeverity.MEDIUM,
          description: rapidTransactionCheck.reason || 'Too many transactions in short time',
          amount
        });
        alerts.push(alert);
      }

      // Check for unusual patterns
      const patternCheck = await this.checkUnusualPatterns(userId, amount, type);
      if (!patternCheck.isValid) {
        const alert = await this.createAlert({
          userId,
          alertType: FraudAlertType.UNUSUAL_PATTERN,
          severity: FraudSeverity.MEDIUM,
          description: patternCheck.reason || 'Unusual transaction pattern detected',
          amount,
          suspiciousPattern: patternCheck.pattern
        });
        alerts.push(alert);
      }

      // Check daily limit
      if (type === ScrollCoinTransactionType.TRANSFER && !wallet?.isWhitelisted) {
        const dailyTotal = await this.getDailyTransferTotal(userId);
        if (dailyTotal + amount > (wallet?.dailyTransferLimit || scrollCoinConfig.dailyTransferLimit)) {
          const alert = await this.createAlert({
            userId,
            alertType: FraudAlertType.DAILY_LIMIT_EXCEEDED,
            severity: FraudSeverity.HIGH,
            description: `Daily transfer limit exceeded: ${dailyTotal + amount}`,
            amount
          });
          alerts.push(alert);
          
          return {
            isValid: false,
            alerts,
            canProceed: false,
            reason: 'Daily transfer limit exceeded'
          };
        }
      }

      // Determine if transaction can proceed
      const criticalAlerts = alerts.filter(a => a.severity === FraudSeverity.CRITICAL);
      const canProceed = criticalAlerts.length === 0;

      return {
        isValid: alerts.length === 0,
        alerts,
        canProceed,
        reason: canProceed ? undefined : 'Critical fraud indicators detected'
      };
    } catch (error) {
      logger.error('Error checking transaction for fraud:', error);
      throw error;
    }
  }

  /**
   * Check for rapid transactions
   */
  private async checkRapidTransactions(userId: string): Promise<{
    isValid: boolean;
    reason?: string;
  }> {
    try {
      const { window, limit } = scrollCoinConfig.rapidTransactionWindow 
        ? { window: scrollCoinConfig.rapidTransactionWindow, limit: scrollCoinConfig.rapidTransactionLimit }
        : { window: 300, limit: 10 }; // 5 minutes, 10 transactions

      const windowStart = new Date(Date.now() - window * 1000);

      const recentTransactions = await prisma.scrollCoinTransaction.count({
        where: {
          userId,
          createdAt: { gte: windowStart }
        }
      });

      if (recentTransactions >= limit) {
        return {
          isValid: false,
          reason: `${recentTransactions} transactions in ${window} seconds (limit: ${limit})`
        };
      }

      return { isValid: true };
    } catch (error) {
      logger.error('Error checking rapid transactions:', error);
      return { isValid: true }; // Fail open to not block legitimate transactions
    }
  }

  /**
   * Check for unusual transaction patterns
   */
  private async checkUnusualPatterns(
    userId: string,
    amount: number,
    type: ScrollCoinTransactionType
  ): Promise<{
    isValid: boolean;
    reason?: string;
    pattern?: string;
  }> {
    try {
      // Get user's transaction history
      const transactions = await prisma.scrollCoinTransaction.findMany({
        where: {
          userId,
          status: 'CONFIRMED'
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      if (transactions.length < 5) {
        return { isValid: true }; // Not enough history to determine patterns
      }

      // Calculate average transaction amount
      const avgAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0) / transactions.length;
      const stdDev = Math.sqrt(
        transactions.reduce((sum, tx) => sum + Math.pow(tx.amount - avgAmount, 2), 0) / transactions.length
      );

      // Check if current amount is significantly different (more than 3 standard deviations)
      if (Math.abs(amount - avgAmount) > 3 * stdDev) {
        return {
          isValid: false,
          reason: `Amount ${amount} significantly differs from average ${avgAmount.toFixed(2)}`,
          pattern: 'AMOUNT_DEVIATION'
        };
      }

      // Check for repeated identical amounts (possible automation)
      const identicalAmounts = transactions.filter(tx => tx.amount === amount).length;
      if (identicalAmounts > 5) {
        return {
          isValid: false,
          reason: `Repeated identical amount ${amount} detected ${identicalAmounts} times`,
          pattern: 'REPEATED_AMOUNT'
        };
      }

      return { isValid: true };
    } catch (error) {
      logger.error('Error checking unusual patterns:', error);
      return { isValid: true }; // Fail open
    }
  }

  /**
   * Get daily transfer total for user
   */
  private async getDailyTransferTotal(userId: string): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await prisma.scrollCoinTransaction.aggregate({
        where: {
          userId,
          type: ScrollCoinTransactionType.TRANSFER,
          status: 'CONFIRMED',
          createdAt: { gte: today }
        },
        _sum: { amount: true }
      });

      return result._sum.amount || 0;
    } catch (error) {
      logger.error('Error getting daily transfer total:', error);
      return 0;
    }
  }

  /**
   * Create fraud alert
   */
  async createAlert(data: {
    userId?: string;
    alertType: FraudAlertType;
    severity: FraudSeverity;
    description: string;
    transactionId?: string;
    amount?: number;
    suspiciousPattern?: string;
  }): Promise<FraudAlertData> {
    try {
      const alert = await prisma.scrollCoinFraudAlert.create({
        data: {
          userId: data.userId,
          alertType: data.alertType,
          severity: data.severity,
          description: data.description,
          transactionId: data.transactionId,
          amount: data.amount,
          suspiciousPattern: data.suspiciousPattern,
          status: AlertStatus.PENDING,
          detectedAt: new Date()
        }
      });

      logger.warn('Fraud alert created', {
        alertId: alert.id,
        userId: data.userId,
        alertType: data.alertType,
        severity: data.severity
      });

      return alert as FraudAlertData;
    } catch (error) {
      logger.error('Error creating fraud alert:', error);
      throw error;
    }
  }

  /**
   * Get pending alerts
   */
  async getPendingAlerts(limit: number = 50): Promise<FraudAlertData[]> {
    try {
      const alerts = await prisma.scrollCoinFraudAlert.findMany({
        where: {
          status: AlertStatus.PENDING
        },
        orderBy: [
          { severity: 'desc' },
          { detectedAt: 'desc' }
        ],
        take: limit
      });

      return alerts as FraudAlertData[];
    } catch (error) {
      logger.error('Error getting pending alerts:', error);
      throw error;
    }
  }

  /**
   * Review and resolve alert
   */
  async reviewAlert(
    alertId: string,
    reviewedBy: string,
    status: AlertStatus,
    reviewNotes?: string
  ): Promise<FraudAlertData> {
    try {
      const alert = await prisma.scrollCoinFraudAlert.update({
        where: { id: alertId },
        data: {
          status,
          reviewedBy,
          reviewNotes,
          reviewedAt: new Date(),
          resolvedAt: status === AlertStatus.RESOLVED || status === AlertStatus.FALSE_POSITIVE 
            ? new Date() 
            : undefined
        }
      });

      logger.info('Fraud alert reviewed', {
        alertId,
        status,
        reviewedBy
      });

      return alert as FraudAlertData;
    } catch (error) {
      logger.error('Error reviewing alert:', error);
      throw error;
    }
  }

  /**
   * Get alerts for user
   */
  async getUserAlerts(userId: string, limit: number = 20): Promise<FraudAlertData[]> {
    try {
      const alerts = await prisma.scrollCoinFraudAlert.findMany({
        where: { userId },
        orderBy: { detectedAt: 'desc' },
        take: limit
      });

      return alerts as FraudAlertData[];
    } catch (error) {
      logger.error('Error getting user alerts:', error);
      throw error;
    }
  }

  /**
   * Get fraud statistics
   */
  async getFraudStatistics(startDate?: Date, endDate?: Date): Promise<{
    totalAlerts: number;
    alertsByType: Record<string, number>;
    alertsBySeverity: Record<string, number>;
    alertsByStatus: Record<string, number>;
    averageResolutionTime: number;
  }> {
    try {
      const where: any = {};
      if (startDate || endDate) {
        where.detectedAt = {};
        if (startDate) where.detectedAt.gte = startDate;
        if (endDate) where.detectedAt.lte = endDate;
      }

      const alerts = await prisma.scrollCoinFraudAlert.findMany({ where });

      const totalAlerts = alerts.length;

      const alertsByType: Record<string, number> = {};
      const alertsBySeverity: Record<string, number> = {};
      const alertsByStatus: Record<string, number> = {};

      let totalResolutionTime = 0;
      let resolvedCount = 0;

      alerts.forEach(alert => {
        // Count by type
        alertsByType[alert.alertType] = (alertsByType[alert.alertType] || 0) + 1;

        // Count by severity
        alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;

        // Count by status
        alertsByStatus[alert.status] = (alertsByStatus[alert.status] || 0) + 1;

        // Calculate resolution time
        if (alert.resolvedAt && alert.detectedAt) {
          totalResolutionTime += alert.resolvedAt.getTime() - alert.detectedAt.getTime();
          resolvedCount++;
        }
      });

      const averageResolutionTime = resolvedCount > 0 
        ? totalResolutionTime / resolvedCount / 1000 / 60 // Convert to minutes
        : 0;

      return {
        totalAlerts,
        alertsByType,
        alertsBySeverity,
        alertsByStatus,
        averageResolutionTime
      };
    } catch (error) {
      logger.error('Error getting fraud statistics:', error);
      throw error;
    }
  }

  /**
   * Monitor transaction for fraud after completion
   */
  async monitorTransaction(transaction: ScrollCoinTransactionData): Promise<void> {
    try {
      // This runs asynchronously after transaction completion
      const check = await this.checkTransaction(
        transaction.userId,
        transaction.amount,
        transaction.type
      );

      if (!check.isValid) {
        logger.warn('Post-transaction fraud indicators detected', {
          transactionId: transaction.id,
          alerts: check.alerts.length
        });

        // Update alerts with transaction ID
        for (const alert of check.alerts) {
          await prisma.scrollCoinFraudAlert.update({
            where: { id: alert.id },
            data: { transactionId: transaction.id }
          });
        }
      }
    } catch (error) {
      logger.error('Error monitoring transaction:', error);
      // Don't throw - this is background monitoring
    }
  }
}

export default FraudPreventionService.getInstance();
