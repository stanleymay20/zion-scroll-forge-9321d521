/**
 * Budget Control Service
 * Manages AI spending limits, alerts, and automatic throttling
 */

import {
  BudgetConfig,
  BudgetStatus,
  BudgetAlert,
  CostForecast
} from '../types/cost-optimization.types';
import logger from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SpendingRecord {
  service: string;
  amount: number;
  timestamp: Date;
}

export default class BudgetControlService {
  private config: BudgetConfig;
  private dailySpending: SpendingRecord[] = [];
  private monthlySpending: SpendingRecord[] = [];
  private alerts: BudgetAlert[] = [];
  private throttled: boolean = false;

  constructor(config: BudgetConfig) {
    this.config = config;
    this.startMonitoring();
  }

  /**
   * Record spending
   */
  async recordSpending(service: string, amount: number): Promise<void> {
    try {
      const record: SpendingRecord = {
        service,
        amount,
        timestamp: new Date()
      };

      this.dailySpending.push(record);
      this.monthlySpending.push(record);

      // Check budget limits
      await this.checkBudgetLimits();

      // Store in database
      await this.storeSpendingRecord(record);

      logger.debug(`Recorded spending: ${service} - $${amount.toFixed(2)}`);
    } catch (error) {
      logger.error('Error recording spending:', error);
      throw error;
    }
  }

  /**
   * Check if request is allowed under budget
   */
  async canProceed(service: string, estimatedCost: number): Promise<boolean> {
    try {
      // Check if throttled
      if (this.throttled) {
        logger.warn('Service throttled due to budget limits');
        return false;
      }

      // Check daily limit
      const currentDailySpend = this.getCurrentDailySpend();
      if (currentDailySpend + estimatedCost > this.config.dailyLimit) {
        logger.warn('Daily budget limit would be exceeded');
        return false;
      }

      // Check monthly limit
      const currentMonthlySpend = this.getCurrentMonthlySpend();
      if (currentMonthlySpend + estimatedCost > this.config.monthlyLimit) {
        logger.warn('Monthly budget limit would be exceeded');
        return false;
      }

      // Check service-specific limit
      const serviceLimit = this.config.perServiceLimits[service];
      if (serviceLimit) {
        const serviceSpend = this.getServiceSpend(service);
        if (serviceSpend + estimatedCost > serviceLimit) {
          logger.warn(`Service budget limit would be exceeded: ${service}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Error checking budget:', error);
      return false;
    }
  }

  /**
   * Get current budget status
   */
  async getBudgetStatus(): Promise<BudgetStatus> {
    try {
      const currentDailySpend = this.getCurrentDailySpend();
      const currentMonthlySpend = this.getCurrentMonthlySpend();

      const dailyRemaining = Math.max(0, this.config.dailyLimit - currentDailySpend);
      const monthlyRemaining = Math.max(0, this.config.monthlyLimit - currentMonthlySpend);

      const percentUsed = (currentMonthlySpend / this.config.monthlyLimit) * 100;

      return {
        currentDailySpend,
        currentMonthlySpend,
        dailyRemaining,
        monthlyRemaining,
        percentUsed,
        alerts: this.alerts,
        throttled: this.throttled
      };
    } catch (error) {
      logger.error('Error getting budget status:', error);
      throw error;
    }
  }

  /**
   * Check budget limits and trigger alerts
   */
  private async checkBudgetLimits(): Promise<void> {
    try {
      const currentMonthlySpend = this.getCurrentMonthlySpend();
      const percentUsed = (currentMonthlySpend / this.config.monthlyLimit) * 100;

      // Check alert thresholds
      for (const threshold of this.config.alertThresholds) {
        if (percentUsed >= threshold && !this.hasAlert(threshold)) {
          await this.createAlert('warning', threshold, currentMonthlySpend);
        }
      }

      // Check throttle threshold
      if (percentUsed >= this.config.throttleThreshold && !this.throttled) {
        this.throttled = true;
        await this.createAlert('critical', this.config.throttleThreshold, currentMonthlySpend);
        logger.warn('Budget throttling activated');
      }

      // Check emergency threshold
      if (percentUsed >= this.config.emergencyThreshold) {
        await this.createAlert('emergency', this.config.emergencyThreshold, currentMonthlySpend);
        await this.notifyEmergency(currentMonthlySpend);
      }
    } catch (error) {
      logger.error('Error checking budget limits:', error);
    }
  }

  /**
   * Create budget alert
   */
  private async createAlert(
    level: 'warning' | 'critical' | 'emergency',
    threshold: number,
    currentSpend: number
  ): Promise<void> {
    const alert: BudgetAlert = {
      level,
      threshold,
      currentSpend,
      message: `Budget ${level}: ${threshold}% threshold reached. Current spend: $${currentSpend.toFixed(2)}`,
      timestamp: new Date()
    };

    this.alerts.push(alert);

    // Log alert
    logger.warn(`Budget Alert: ${alert.message}`);

    // Send notification (implement notification service)
    await this.sendNotification(alert);
  }

  /**
   * Check if alert already exists for threshold
   */
  private hasAlert(threshold: number): boolean {
    return this.alerts.some((alert) => alert.threshold === threshold);
  }

  /**
   * Send notification for alert
   */
  private async sendNotification(alert: BudgetAlert): Promise<void> {
    // Implement notification logic (email, SMS, Slack, etc.)
    logger.info(`Notification sent: ${alert.message}`);
  }

  /**
   * Notify emergency contacts
   */
  private async notifyEmergency(currentSpend: number): Promise<void> {
    logger.error(`EMERGENCY: Budget limit exceeded! Current spend: $${currentSpend.toFixed(2)}`);
    // Implement emergency notification logic
  }

  /**
   * Get current daily spending
   */
  private getCurrentDailySpend(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.dailySpending
      .filter((record) => record.timestamp >= today)
      .reduce((sum, record) => sum + record.amount, 0);
  }

  /**
   * Get current monthly spending
   */
  private getCurrentMonthlySpend(): number {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    return this.monthlySpending
      .filter((record) => record.timestamp >= thisMonth)
      .reduce((sum, record) => sum + record.amount, 0);
  }

  /**
   * Get spending for specific service
   */
  private getServiceSpend(service: string): number {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    return this.monthlySpending
      .filter((record) => record.service === service && record.timestamp >= thisMonth)
      .reduce((sum, record) => sum + record.amount, 0);
  }

  /**
   * Store spending record in database
   */
  private async storeSpendingRecord(record: SpendingRecord): Promise<void> {
    try {
      // Store in database for historical tracking
      // Implementation depends on database schema
      logger.debug('Spending record stored');
    } catch (error) {
      logger.error('Error storing spending record:', error);
    }
  }

  /**
   * Generate cost forecast
   */
  async generateForecast(period: 'daily' | 'weekly' | 'monthly'): Promise<CostForecast> {
    try {
      const historicalData = this.getHistoricalData(period);
      const average = this.calculateAverage(historicalData);
      const trend = this.calculateTrend(historicalData);

      let projectedCost = 0;
      if (period === 'daily') {
        projectedCost = average;
      } else if (period === 'weekly') {
        projectedCost = average * 7;
      } else {
        projectedCost = average * 30;
      }

      const recommendations = this.generateRecommendations(projectedCost, trend);

      return {
        period,
        projectedCost,
        confidence: 0.75,
        trend,
        recommendations
      };
    } catch (error) {
      logger.error('Error generating forecast:', error);
      throw error;
    }
  }

  /**
   * Get historical spending data
   */
  private getHistoricalData(period: 'daily' | 'weekly' | 'monthly'): number[] {
    const days = period === 'daily' ? 7 : period === 'weekly' ? 4 : 3;
    const data: number[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const daySpend = this.monthlySpending
        .filter((record) => {
          const recordDate = new Date(record.timestamp);
          recordDate.setHours(0, 0, 0, 0);
          return recordDate.getTime() === date.getTime();
        })
        .reduce((sum, record) => sum + record.amount, 0);

      data.push(daySpend);
    }

    return data;
  }

  /**
   * Calculate average from data
   */
  private calculateAverage(data: number[]): number {
    if (data.length === 0) return 0;
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  }

  /**
   * Calculate trend from data
   */
  private calculateTrend(data: number[]): 'increasing' | 'stable' | 'decreasing' {
    if (data.length < 2) return 'stable';

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = this.calculateAverage(firstHalf);
    const secondAvg = this.calculateAverage(secondHalf);

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Generate recommendations based on forecast
   */
  private generateRecommendations(
    projectedCost: number,
    trend: 'increasing' | 'stable' | 'decreasing'
  ): string[] {
    const recommendations: string[] = [];

    if (projectedCost > this.config.monthlyLimit * 0.8) {
      recommendations.push('Consider implementing more aggressive caching');
      recommendations.push('Review and optimize high-cost prompts');
      recommendations.push('Enable batch processing for bulk operations');
    }

    if (trend === 'increasing') {
      recommendations.push('Spending trend is increasing - review usage patterns');
      recommendations.push('Consider setting stricter per-service limits');
    }

    if (projectedCost > this.config.monthlyLimit) {
      recommendations.push('CRITICAL: Projected to exceed monthly budget');
      recommendations.push('Implement immediate cost reduction measures');
      recommendations.push('Consider increasing budget or reducing service usage');
    }

    return recommendations;
  }

  /**
   * Start monitoring interval
   */
  private startMonitoring(): void {
    // Clean up old records daily
    setInterval(() => {
      this.cleanupOldRecords();
    }, 86400000); // 24 hours

    // Reset daily spending at midnight
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.dailySpending = [];
        this.throttled = false;
        logger.info('Daily spending reset');
      }
    }, 60000); // Check every minute
  }

  /**
   * Clean up old spending records
   */
  private cleanupOldRecords(): void {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    this.monthlySpending = this.monthlySpending.filter(
      (record) => record.timestamp >= thirtyDaysAgo
    );

    logger.debug('Cleaned up old spending records');
  }

  /**
   * Get spending by service
   */
  async getSpendingByService(): Promise<Record<string, number>> {
    const spending: Record<string, number> = {};

    for (const record of this.monthlySpending) {
      spending[record.service] = (spending[record.service] || 0) + record.amount;
    }

    return spending;
  }

  /**
   * Reset budget (for testing or new period)
   */
  async resetBudget(): Promise<void> {
    this.dailySpending = [];
    this.monthlySpending = [];
    this.alerts = [];
    this.throttled = false;
    logger.info('Budget reset');
  }

  /**
   * Update budget configuration
   */
  async updateConfig(newConfig: Partial<BudgetConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    logger.info('Budget configuration updated');
  }
}
