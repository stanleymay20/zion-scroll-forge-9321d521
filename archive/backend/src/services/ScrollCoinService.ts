/**
 * ScrollCoin Service
 * "By the Spirit of Wisdom, we establish a kingdom economy on Earth"
 * 
 * Main service for ScrollCoin blockchain integration, handling token minting,
 * transfers, burning, and wallet management with fraud prevention.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import scrollCoinConfig from '../config/scrollcoin.config';
import {
  ScrollCoinTransactionData,
  ScrollCoinTransactionType,
  TransactionStatus,
  MintRewardRequest,
  TransferRequest,
  BurnRequest,
  WalletBalanceResponse,
  TransactionHistoryQuery,
  TransactionHistoryResponse,
  BlockchainTransactionReceipt
} from '../types/scrollcoin.types';

const prisma = new PrismaClient();

export class ScrollCoinService {
  private static instance: ScrollCoinService;

  private constructor() {}

  public static getInstance(): ScrollCoinService {
    if (!ScrollCoinService.instance) {
      ScrollCoinService.instance = new ScrollCoinService();
    }
    return ScrollCoinService.instance;
  }

  /**
   * Mint ScrollCoin tokens as rewards for educational achievements
   */
  async mintReward(request: MintRewardRequest): Promise<ScrollCoinTransactionData> {
    try {
      logger.info('Minting ScrollCoin reward', { request });

      // Validate request
      if (request.amount <= 0) {
        throw new Error('Reward amount must be greater than zero');
      }

      // Check for duplicate reward
      const existingReward = await prisma.scrollCoinTransaction.findUnique({
        where: { rewardId: request.rewardId }
      });

      if (existingReward) {
        throw new Error('Reward has already been processed');
      }

      // Get user's wallet
      const wallet = await this.getOrCreateWallet(request.userId);

      if (wallet.isBlacklisted) {
        throw new Error('User wallet is blacklisted');
      }

      // Create transaction record
      const transaction = await prisma.scrollCoinTransaction.create({
        data: {
          userId: request.userId,
          amount: request.amount,
          type: ScrollCoinTransactionType.MINT,
          status: TransactionStatus.PENDING,
          reason: request.reason,
          referenceId: request.referenceId,
          rewardId: request.rewardId,
          toAddress: wallet.address
        }
      });

      // If blockchain is enabled, mint on-chain
      if (scrollCoinConfig.blockchainEnabled) {
        try {
          const receipt = await this.mintOnBlockchain(
            wallet.address,
            request.amount,
            request.reason,
            request.rewardId
          );

          // Update transaction with blockchain details
          const updatedTransaction = await prisma.scrollCoinTransaction.update({
            where: { id: transaction.id },
            data: {
              status: TransactionStatus.CONFIRMED,
              blockchainTxHash: receipt.txHash,
              blockNumber: receipt.blockNumber,
              gasUsed: receipt.gasUsed,
              confirmedAt: new Date()
            }
          });

          // Update wallet balance
          await prisma.scrollCoinWallet.update({
            where: { id: wallet.id },
            data: {
              balance: { increment: request.amount },
              totalEarned: { increment: request.amount },
              lastSyncedAt: new Date()
            }
          });

          logger.info('ScrollCoin reward minted successfully', {
            transactionId: updatedTransaction.id,
            txHash: receipt.txHash
          });

          return updatedTransaction as ScrollCoinTransactionData;
        } catch (blockchainError) {
          // Mark transaction as failed
          await prisma.scrollCoinTransaction.update({
            where: { id: transaction.id },
            data: { status: TransactionStatus.FAILED }
          });

          throw blockchainError;
        }
      } else {
        // Mock blockchain transaction for development
        const updatedTransaction = await prisma.scrollCoinTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.CONFIRMED,
            blockchainTxHash: this.generateMockTxHash(),
            blockNumber: Math.floor(Date.now() / 1000),
            gasUsed: 21000,
            confirmedAt: new Date()
          }
        });

        // Update wallet balance
        await prisma.scrollCoinWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: request.amount },
            totalEarned: { increment: request.amount },
            lastSyncedAt: new Date()
          }
        });

        logger.info('ScrollCoin reward minted (mock mode)', {
          transactionId: updatedTransaction.id
        });

        return updatedTransaction as ScrollCoinTransactionData;
      }
    } catch (error) {
      logger.error('Error minting ScrollCoin reward:', error);
      throw error;
    }
  }

  /**
   * Transfer ScrollCoin tokens between users
   */
  async transferTokens(request: TransferRequest): Promise<ScrollCoinTransactionData> {
    try {
      logger.info('Transferring ScrollCoin tokens', { request });

      // Validate request
      if (request.amount <= 0) {
        throw new Error('Transfer amount must be greater than zero');
      }

      // Get wallets
      const fromWallet = await this.getOrCreateWallet(request.fromUserId);
      const toWallet = await this.getOrCreateWallet(request.toUserId);

      // Validate wallets
      if (fromWallet.isBlacklisted) {
        throw new Error('Sender wallet is blacklisted');
      }

      if (toWallet.isBlacklisted) {
        throw new Error('Recipient wallet is blacklisted');
      }

      // Check balance
      if (fromWallet.balance < request.amount) {
        throw new Error('Insufficient balance');
      }

      // Check transaction limits
      if (!fromWallet.isWhitelisted) {
        if (request.amount > fromWallet.maxTransactionAmount) {
          throw new Error('Amount exceeds maximum transaction limit');
        }

        // Check daily limit (simplified - should track daily amounts)
        const dailyTotal = await this.getDailyTransferTotal(request.fromUserId);
        if (dailyTotal + request.amount > fromWallet.dailyTransferLimit) {
          throw new Error('Amount exceeds daily transfer limit');
        }
      }

      // Create transaction record
      const transaction = await prisma.scrollCoinTransaction.create({
        data: {
          userId: request.fromUserId,
          amount: request.amount,
          type: ScrollCoinTransactionType.TRANSFER,
          status: TransactionStatus.PENDING,
          reason: request.reason || 'Peer-to-peer transfer',
          fromAddress: fromWallet.address,
          toAddress: toWallet.address
        }
      });

      // If blockchain is enabled, transfer on-chain
      if (scrollCoinConfig.blockchainEnabled) {
        try {
          const receipt = await this.transferOnBlockchain(
            fromWallet.address,
            toWallet.address,
            request.amount
          );

          // Update transaction with blockchain details
          const updatedTransaction = await prisma.scrollCoinTransaction.update({
            where: { id: transaction.id },
            data: {
              status: TransactionStatus.CONFIRMED,
              blockchainTxHash: receipt.txHash,
              blockNumber: receipt.blockNumber,
              gasUsed: receipt.gasUsed,
              confirmedAt: new Date()
            }
          });

          // Update wallet balances
          await prisma.$transaction([
            prisma.scrollCoinWallet.update({
              where: { id: fromWallet.id },
              data: {
                balance: { decrement: request.amount },
                lastSyncedAt: new Date()
              }
            }),
            prisma.scrollCoinWallet.update({
              where: { id: toWallet.id },
              data: {
                balance: { increment: request.amount },
                lastSyncedAt: new Date()
              }
            })
          ]);

          logger.info('ScrollCoin transfer completed successfully', {
            transactionId: updatedTransaction.id,
            txHash: receipt.txHash
          });

          return updatedTransaction as ScrollCoinTransactionData;
        } catch (blockchainError) {
          // Mark transaction as failed
          await prisma.scrollCoinTransaction.update({
            where: { id: transaction.id },
            data: { status: TransactionStatus.FAILED }
          });

          throw blockchainError;
        }
      } else {
        // Mock blockchain transaction for development
        const updatedTransaction = await prisma.scrollCoinTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.CONFIRMED,
            blockchainTxHash: this.generateMockTxHash(),
            blockNumber: Math.floor(Date.now() / 1000),
            gasUsed: 21000,
            confirmedAt: new Date()
          }
        });

        // Update wallet balances
        await prisma.$transaction([
          prisma.scrollCoinWallet.update({
            where: { id: fromWallet.id },
            data: {
              balance: { decrement: request.amount },
              lastSyncedAt: new Date()
            }
          }),
          prisma.scrollCoinWallet.update({
            where: { id: toWallet.id },
            data: {
              balance: { increment: request.amount },
              lastSyncedAt: new Date()
            }
          })
        ]);

        logger.info('ScrollCoin transfer completed (mock mode)', {
          transactionId: updatedTransaction.id
        });

        return updatedTransaction as ScrollCoinTransactionData;
      }
    } catch (error) {
      logger.error('Error transferring ScrollCoin tokens:', error);
      throw error;
    }
  }

  /**
   * Burn ScrollCoin tokens when spending on courses or resources
   */
  async burnTokens(request: BurnRequest): Promise<ScrollCoinTransactionData> {
    try {
      logger.info('Burning ScrollCoin tokens', { request });

      // Validate request
      if (request.amount <= 0) {
        throw new Error('Burn amount must be greater than zero');
      }

      // Get user's wallet
      const wallet = await this.getOrCreateWallet(request.userId);

      if (wallet.isBlacklisted) {
        throw new Error('User wallet is blacklisted');
      }

      // Check balance
      if (wallet.balance < request.amount) {
        throw new Error('Insufficient balance');
      }

      // Create transaction record
      const transaction = await prisma.scrollCoinTransaction.create({
        data: {
          userId: request.userId,
          amount: request.amount,
          type: ScrollCoinTransactionType.BURN,
          status: TransactionStatus.PENDING,
          reason: request.reason,
          referenceId: request.referenceId,
          fromAddress: wallet.address
        }
      });

      // If blockchain is enabled, burn on-chain
      if (scrollCoinConfig.blockchainEnabled) {
        try {
          const receipt = await this.burnOnBlockchain(
            wallet.address,
            request.amount,
            request.reason
          );

          // Update transaction with blockchain details
          const updatedTransaction = await prisma.scrollCoinTransaction.update({
            where: { id: transaction.id },
            data: {
              status: TransactionStatus.CONFIRMED,
              blockchainTxHash: receipt.txHash,
              blockNumber: receipt.blockNumber,
              gasUsed: receipt.gasUsed,
              confirmedAt: new Date()
            }
          });

          // Update wallet balance
          await prisma.scrollCoinWallet.update({
            where: { id: wallet.id },
            data: {
              balance: { decrement: request.amount },
              totalSpent: { increment: request.amount },
              lastSyncedAt: new Date()
            }
          });

          logger.info('ScrollCoin tokens burned successfully', {
            transactionId: updatedTransaction.id,
            txHash: receipt.txHash
          });

          return updatedTransaction as ScrollCoinTransactionData;
        } catch (blockchainError) {
          // Mark transaction as failed
          await prisma.scrollCoinTransaction.update({
            where: { id: transaction.id },
            data: { status: TransactionStatus.FAILED }
          });

          throw blockchainError;
        }
      } else {
        // Mock blockchain transaction for development
        const updatedTransaction = await prisma.scrollCoinTransaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.CONFIRMED,
            blockchainTxHash: this.generateMockTxHash(),
            blockNumber: Math.floor(Date.now() / 1000),
            gasUsed: 21000,
            confirmedAt: new Date()
          }
        });

        // Update wallet balance
        await prisma.scrollCoinWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: request.amount },
            totalSpent: { increment: request.amount },
            lastSyncedAt: new Date()
          }
        });

        logger.info('ScrollCoin tokens burned (mock mode)', {
          transactionId: updatedTransaction.id
        });

        return updatedTransaction as ScrollCoinTransactionData;
      }
    } catch (error) {
      logger.error('Error burning ScrollCoin tokens:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance and statistics
   */
  async getWalletBalance(userId: string): Promise<WalletBalanceResponse> {
    try {
      const wallet = await this.getOrCreateWallet(userId);

      return {
        address: wallet.address,
        balance: wallet.balance,
        totalEarned: wallet.totalEarned,
        totalSpent: wallet.totalSpent,
        netRewards: wallet.totalEarned - wallet.totalSpent
      };
    } catch (error) {
      logger.error('Error getting wallet balance:', error);
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    query: TransactionHistoryQuery
  ): Promise<TransactionHistoryResponse> {
    try {
      const { userId, type, status, startDate, endDate, limit = 50, offset = 0 } = query;

      const where: any = {};

      if (userId) where.userId = userId;
      if (type) where.type = type;
      if (status) where.status = status;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [transactions, total] = await Promise.all([
        prisma.scrollCoinTransaction.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.scrollCoinTransaction.count({ where })
      ]);

      return {
        transactions: transactions as ScrollCoinTransactionData[],
        total,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit
      };
    } catch (error) {
      logger.error('Error getting transaction history:', error);
      throw error;
    }
  }

  /**
   * Get or create wallet for user
   */
  private async getOrCreateWallet(userId: string): Promise<any> {
    let wallet = await prisma.scrollCoinWallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      // Generate wallet address and keys
      const { address, publicKey, privateKeyHash } = this.generateWalletKeys();

      wallet = await prisma.scrollCoinWallet.create({
        data: {
          userId,
          address,
          publicKey,
          privateKeyHash
        }
      });

      logger.info('Created new ScrollCoin wallet', { userId, address });
    }

    return wallet;
  }

  /**
   * Generate wallet keys (simplified for development)
   */
  private generateWalletKeys(): {
    address: string;
    publicKey: string;
    privateKeyHash: string;
  } {
    // In production, use proper cryptographic key generation
    const random = Math.random().toString(36).substring(2);
    const timestamp = Date.now().toString(36);
    
    return {
      address: `0x${Buffer.from(random + timestamp).toString('hex').padStart(40, '0').substring(0, 40)}`,
      publicKey: `0x${Buffer.from(random + timestamp + 'public').toString('hex')}`,
      privateKeyHash: `0x${Buffer.from(random + timestamp + 'private').toString('hex')}`
    };
  }

  /**
   * Generate mock transaction hash
   */
  private generateMockTxHash(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `0x${Buffer.from(timestamp + random).toString('hex').padStart(64, '0')}`;
  }

  /**
   * Get daily transfer total for user
   */
  private async getDailyTransferTotal(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await prisma.scrollCoinTransaction.aggregate({
      where: {
        userId,
        type: ScrollCoinTransactionType.TRANSFER,
        status: TransactionStatus.CONFIRMED,
        createdAt: { gte: today }
      },
      _sum: { amount: true }
    });

    return result._sum.amount || 0;
  }

  /**
   * Mint tokens on blockchain (placeholder for actual implementation)
   */
  private async mintOnBlockchain(
    address: string,
    amount: number,
    reason: string,
    rewardId: string
  ): Promise<BlockchainTransactionReceipt> {
    // In production, this would interact with the actual smart contract
    // For now, return mock receipt
    return {
      txHash: this.generateMockTxHash(),
      blockNumber: Math.floor(Date.now() / 1000),
      gasUsed: 50000,
      status: 'success',
      timestamp: new Date()
    };
  }

  /**
   * Transfer tokens on blockchain (placeholder for actual implementation)
   */
  private async transferOnBlockchain(
    from: string,
    to: string,
    amount: number
  ): Promise<BlockchainTransactionReceipt> {
    // In production, this would interact with the actual smart contract
    return {
      txHash: this.generateMockTxHash(),
      blockNumber: Math.floor(Date.now() / 1000),
      gasUsed: 21000,
      status: 'success',
      timestamp: new Date()
    };
  }

  /**
   * Burn tokens on blockchain (placeholder for actual implementation)
   */
  private async burnOnBlockchain(
    address: string,
    amount: number,
    reason: string
  ): Promise<BlockchainTransactionReceipt> {
    // In production, this would interact with the actual smart contract
    return {
      txHash: this.generateMockTxHash(),
      blockNumber: Math.floor(Date.now() / 1000),
      gasUsed: 30000,
      status: 'success',
      timestamp: new Date()
    };
  }
}

export default ScrollCoinService.getInstance();
