/**
 * Exchange Rate Service
 * "By the Spirit of Wisdom, we establish fair exchange in the kingdom economy"
 * 
 * Service for managing ScrollCoin exchange rates, conversions, and pricing.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import scrollCoinConfig from '../config/scrollcoin.config';
import {
  ExchangeRateData,
  ExchangeRateConversion
} from '../types/scrollcoin.types';

const prisma = new PrismaClient();

export class ExchangeRateService {
  private static instance: ExchangeRateService;

  private constructor() {}

  public static getInstance(): ExchangeRateService {
    if (!ExchangeRateService.instance) {
      ExchangeRateService.instance = new ExchangeRateService();
    }
    return ExchangeRateService.instance;
  }

  /**
   * Get current active exchange rate
   */
  async getCurrentRate(): Promise<ExchangeRateData> {
    try {
      const now = new Date();

      // Try to get active rate from database
      const rate = await prisma.scrollCoinExchangeRate.findFirst({
        where: {
          isActive: true,
          effectiveFrom: { lte: now },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: now } }
          ]
        },
        orderBy: { effectiveFrom: 'desc' }
      });

      if (rate) {
        return rate as ExchangeRateData;
      }

      // If no rate found, create default rate
      return await this.createRate({
        rateToUSD: scrollCoinConfig.defaultExchangeRate,
        rateFromUSD: 1 / scrollCoinConfig.defaultExchangeRate,
        source: 'DEFAULT',
        isActive: true,
        effectiveFrom: now
      });
    } catch (error) {
      logger.error('Error getting current exchange rate:', error);
      throw error;
    }
  }

  /**
   * Create new exchange rate
   */
  async createRate(data: {
    rateToUSD: number;
    rateFromUSD: number;
    source: string;
    isActive: boolean;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }): Promise<ExchangeRateData> {
    try {
      logger.info('Creating new exchange rate', { data });

      // If setting as active, deactivate previous rates
      if (data.isActive) {
        await prisma.scrollCoinExchangeRate.updateMany({
          where: { isActive: true },
          data: { 
            isActive: false,
            effectiveTo: data.effectiveFrom
          }
        });
      }

      const rate = await prisma.scrollCoinExchangeRate.create({
        data: {
          rateToUSD: data.rateToUSD,
          rateFromUSD: data.rateFromUSD,
          source: data.source,
          isActive: data.isActive,
          effectiveFrom: data.effectiveFrom,
          effectiveTo: data.effectiveTo
        }
      });

      logger.info('Exchange rate created', {
        rateId: rate.id,
        rateToUSD: rate.rateToUSD
      });

      return rate as ExchangeRateData;
    } catch (error) {
      logger.error('Error creating exchange rate:', error);
      throw error;
    }
  }

  /**
   * Update exchange rate
   */
  async updateRate(
    rateId: string,
    updates: Partial<{
      rateToUSD: number;
      rateFromUSD: number;
      source: string;
      isActive: boolean;
      effectiveTo: Date;
    }>
  ): Promise<ExchangeRateData> {
    try {
      logger.info('Updating exchange rate', { rateId, updates });

      // If activating this rate, deactivate others
      if (updates.isActive) {
        await prisma.scrollCoinExchangeRate.updateMany({
          where: { 
            isActive: true,
            id: { not: rateId }
          },
          data: { isActive: false }
        });
      }

      const rate = await prisma.scrollCoinExchangeRate.update({
        where: { id: rateId },
        data: updates
      });

      logger.info('Exchange rate updated', { rateId });

      return rate as ExchangeRateData;
    } catch (error) {
      logger.error('Error updating exchange rate:', error);
      throw error;
    }
  }

  /**
   * Convert ScrollCoin to USD
   */
  async convertToUSD(scrollCoinAmount: number): Promise<ExchangeRateConversion> {
    try {
      const rate = await this.getCurrentRate();

      const usdAmount = scrollCoinAmount * rate.rateToUSD;

      return {
        scrollCoinAmount,
        usdAmount,
        rate: rate.rateToUSD,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error converting ScrollCoin to USD:', error);
      throw error;
    }
  }

  /**
   * Convert USD to ScrollCoin
   */
  async convertFromUSD(usdAmount: number): Promise<ExchangeRateConversion> {
    try {
      const rate = await this.getCurrentRate();

      const scrollCoinAmount = usdAmount * rate.rateFromUSD;

      return {
        scrollCoinAmount,
        usdAmount,
        rate: rate.rateFromUSD,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error converting USD to ScrollCoin:', error);
      throw error;
    }
  }

  /**
   * Get exchange rate history
   */
  async getRateHistory(
    startDate?: Date,
    endDate?: Date,
    limit: number = 50
  ): Promise<ExchangeRateData[]> {
    try {
      const where: any = {};

      if (startDate || endDate) {
        where.effectiveFrom = {};
        if (startDate) where.effectiveFrom.gte = startDate;
        if (endDate) where.effectiveFrom.lte = endDate;
      }

      const rates = await prisma.scrollCoinExchangeRate.findMany({
        where,
        orderBy: { effectiveFrom: 'desc' },
        take: limit
      });

      return rates as ExchangeRateData[];
    } catch (error) {
      logger.error('Error getting rate history:', error);
      throw error;
    }
  }

  /**
   * Get rate at specific date
   */
  async getRateAtDate(date: Date): Promise<ExchangeRateData> {
    try {
      const rate = await prisma.scrollCoinExchangeRate.findFirst({
        where: {
          effectiveFrom: { lte: date },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: date } }
          ]
        },
        orderBy: { effectiveFrom: 'desc' }
      });

      if (!rate) {
        throw new Error(`No exchange rate found for date: ${date.toISOString()}`);
      }

      return rate as ExchangeRateData;
    } catch (error) {
      logger.error('Error getting rate at date:', error);
      throw error;
    }
  }

  /**
   * Calculate price in both currencies
   */
  async calculatePrice(baseAmount: number, baseCurrency: 'USD' | 'SCROLLCOIN'): Promise<{
    usd: number;
    scrollCoin: number;
    rate: number;
  }> {
    try {
      const rate = await this.getCurrentRate();

      if (baseCurrency === 'USD') {
        return {
          usd: baseAmount,
          scrollCoin: baseAmount * rate.rateFromUSD,
          rate: rate.rateFromUSD
        };
      } else {
        return {
          usd: baseAmount * rate.rateToUSD,
          scrollCoin: baseAmount,
          rate: rate.rateToUSD
        };
      }
    } catch (error) {
      logger.error('Error calculating price:', error);
      throw error;
    }
  }

  /**
   * Get exchange rate statistics
   */
  async getRateStatistics(startDate?: Date, endDate?: Date): Promise<{
    averageRate: number;
    minRate: number;
    maxRate: number;
    currentRate: number;
    rateChanges: number;
    volatility: number;
  }> {
    try {
      const where: any = {};
      if (startDate || endDate) {
        where.effectiveFrom = {};
        if (startDate) where.effectiveFrom.gte = startDate;
        if (endDate) where.effectiveFrom.lte = endDate;
      }

      const rates = await prisma.scrollCoinExchangeRate.findMany({
        where,
        orderBy: { effectiveFrom: 'asc' }
      });

      if (rates.length === 0) {
        throw new Error('No exchange rate data available');
      }

      const rateValues = rates.map(r => r.rateToUSD);
      const averageRate = rateValues.reduce((sum, r) => sum + r, 0) / rateValues.length;
      const minRate = Math.min(...rateValues);
      const maxRate = Math.max(...rateValues);
      const currentRate = rateValues[rateValues.length - 1];
      const rateChanges = rates.length - 1;

      // Calculate volatility (standard deviation)
      const variance = rateValues.reduce((sum, r) => sum + Math.pow(r - averageRate, 2), 0) / rateValues.length;
      const volatility = Math.sqrt(variance);

      return {
        averageRate,
        minRate,
        maxRate,
        currentRate,
        rateChanges,
        volatility
      };
    } catch (error) {
      logger.error('Error getting rate statistics:', error);
      throw error;
    }
  }

  /**
   * Deactivate exchange rate
   */
  async deactivateRate(rateId: string): Promise<void> {
    try {
      await prisma.scrollCoinExchangeRate.update({
        where: { id: rateId },
        data: {
          isActive: false,
          effectiveTo: new Date()
        }
      });

      logger.info('Exchange rate deactivated', { rateId });
    } catch (error) {
      logger.error('Error deactivating rate:', error);
      throw error;
    }
  }
}

export default ExchangeRateService.getInstance();
