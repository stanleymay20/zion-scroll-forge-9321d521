/**
 * Wallet Management Service
 * "By the Spirit of Wisdom, we secure the treasures of the kingdom"
 * 
 * Service for managing ScrollCoin wallets, including creation, security,
 * and key management with encryption.
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import scrollCoinConfig from '../config/scrollcoin.config';
import {
  ScrollCoinWalletData,
  WalletCreationRequest,
  WalletSecuritySettings
} from '../types/scrollcoin.types';

const prisma = new PrismaClient();

export class WalletManagementService {
  private static instance: WalletManagementService;
  private readonly ENCRYPTION_KEY: Buffer;
  private readonly ALGORITHM = 'aes-256-gcm';

  private constructor() {
    // In production, use a secure key management system
    const key = process.env.WALLET_ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
    this.ENCRYPTION_KEY = crypto.scryptSync(key, 'salt', 32);
  }

  public static getInstance(): WalletManagementService {
    if (!WalletManagementService.instance) {
      WalletManagementService.instance = new WalletManagementService();
    }
    return WalletManagementService.instance;
  }

  /**
   * Create a new wallet for a user
   */
  async createWallet(request: WalletCreationRequest): Promise<ScrollCoinWalletData> {
    try {
      logger.info('Creating new ScrollCoin wallet', { userId: request.userId });

      // Check if wallet already exists
      const existingWallet = await prisma.scrollCoinWallet.findUnique({
        where: { userId: request.userId }
      });

      if (existingWallet) {
        throw new Error('Wallet already exists for this user');
      }

      // Generate wallet keys
      const { address, publicKey, privateKey } = this.generateWalletKeys();

      // Encrypt private key
      const encryptedPrivateKey = this.encryptPrivateKey(privateKey);

      // Create wallet in database
      const wallet = await prisma.scrollCoinWallet.create({
        data: {
          userId: request.userId,
          address,
          publicKey,
          privateKeyHash: encryptedPrivateKey,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          isActive: true,
          isBlacklisted: false,
          isWhitelisted: false,
          dailyTransferLimit: scrollCoinConfig.dailyTransferLimit,
          maxTransactionAmount: scrollCoinConfig.maxTransactionAmount
        }
      });

      logger.info('ScrollCoin wallet created successfully', {
        userId: request.userId,
        address: wallet.address
      });

      return wallet as ScrollCoinWalletData;
    } catch (error) {
      logger.error('Error creating wallet:', error);
      throw error;
    }
  }

  /**
   * Get wallet by user ID
   */
  async getWalletByUserId(userId: string): Promise<ScrollCoinWalletData | null> {
    try {
      const wallet = await prisma.scrollCoinWallet.findUnique({
        where: { userId }
      });

      return wallet as ScrollCoinWalletData | null;
    } catch (error) {
      logger.error('Error getting wallet by user ID:', error);
      throw error;
    }
  }

  /**
   * Get wallet by address
   */
  async getWalletByAddress(address: string): Promise<ScrollCoinWalletData | null> {
    try {
      const wallet = await prisma.scrollCoinWallet.findUnique({
        where: { address }
      });

      return wallet as ScrollCoinWalletData | null;
    } catch (error) {
      logger.error('Error getting wallet by address:', error);
      throw error;
    }
  }

  /**
   * Update wallet security settings
   */
  async updateSecuritySettings(
    userId: string,
    settings: Partial<WalletSecuritySettings>
  ): Promise<ScrollCoinWalletData> {
    try {
      logger.info('Updating wallet security settings', { userId, settings });

      const wallet = await prisma.scrollCoinWallet.update({
        where: { userId },
        data: {
          dailyTransferLimit: settings.dailyTransferLimit,
          maxTransactionAmount: settings.maxTransactionAmount,
          isWhitelisted: settings.isWhitelisted,
          isBlacklisted: settings.isBlacklisted
        }
      });

      logger.info('Wallet security settings updated', { userId });

      return wallet as ScrollCoinWalletData;
    } catch (error) {
      logger.error('Error updating wallet security settings:', error);
      throw error;
    }
  }

  /**
   * Blacklist a wallet
   */
  async blacklistWallet(userId: string, reason: string): Promise<void> {
    try {
      logger.warn('Blacklisting wallet', { userId, reason });

      await prisma.scrollCoinWallet.update({
        where: { userId },
        data: { isBlacklisted: true, isActive: false }
      });

      logger.info('Wallet blacklisted', { userId });
    } catch (error) {
      logger.error('Error blacklisting wallet:', error);
      throw error;
    }
  }

  /**
   * Whitelist a wallet
   */
  async whitelistWallet(userId: string): Promise<void> {
    try {
      logger.info('Whitelisting wallet', { userId });

      await prisma.scrollCoinWallet.update({
        where: { userId },
        data: { isWhitelisted: true }
      });

      logger.info('Wallet whitelisted', { userId });
    } catch (error) {
      logger.error('Error whitelisting wallet:', error);
      throw error;
    }
  }

  /**
   * Deactivate a wallet
   */
  async deactivateWallet(userId: string): Promise<void> {
    try {
      logger.info('Deactivating wallet', { userId });

      await prisma.scrollCoinWallet.update({
        where: { userId },
        data: { isActive: false }
      });

      logger.info('Wallet deactivated', { userId });
    } catch (error) {
      logger.error('Error deactivating wallet:', error);
      throw error;
    }
  }

  /**
   * Reactivate a wallet
   */
  async reactivateWallet(userId: string): Promise<void> {
    try {
      logger.info('Reactivating wallet', { userId });

      const wallet = await prisma.scrollCoinWallet.findUnique({
        where: { userId }
      });

      if (wallet?.isBlacklisted) {
        throw new Error('Cannot reactivate blacklisted wallet');
      }

      await prisma.scrollCoinWallet.update({
        where: { userId },
        data: { isActive: true }
      });

      logger.info('Wallet reactivated', { userId });
    } catch (error) {
      logger.error('Error reactivating wallet:', error);
      throw error;
    }
  }

  /**
   * Sync wallet balance with blockchain
   */
  async syncWalletBalance(userId: string): Promise<number> {
    try {
      logger.info('Syncing wallet balance with blockchain', { userId });

      const wallet = await prisma.scrollCoinWallet.findUnique({
        where: { userId }
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // In production, query blockchain for actual balance
      // For now, return current balance
      const blockchainBalance = wallet.balance;

      await prisma.scrollCoinWallet.update({
        where: { userId },
        data: {
          balance: blockchainBalance,
          lastSyncedAt: new Date()
        }
      });

      logger.info('Wallet balance synced', { userId, balance: blockchainBalance });

      return blockchainBalance;
    } catch (error) {
      logger.error('Error syncing wallet balance:', error);
      throw error;
    }
  }

  /**
   * Get wallet private key (decrypted)
   * WARNING: Use with extreme caution and only for authorized operations
   */
  async getPrivateKey(userId: string, authToken: string): Promise<string> {
    try {
      // Verify authorization
      if (!this.verifyAuthorization(authToken)) {
        throw new Error('Unauthorized access to private key');
      }

      const wallet = await prisma.scrollCoinWallet.findUnique({
        where: { userId }
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Decrypt private key
      const privateKey = this.decryptPrivateKey(wallet.privateKeyHash);

      logger.warn('Private key accessed', { userId });

      return privateKey;
    } catch (error) {
      logger.error('Error getting private key:', error);
      throw error;
    }
  }

  /**
   * Generate wallet keys using cryptographic methods
   */
  private generateWalletKeys(): {
    address: string;
    publicKey: string;
    privateKey: string;
  } {
    // In production, use proper Ethereum key generation (ethers.js or web3.js)
    // This is a simplified version for development
    
    const privateKey = crypto.randomBytes(32).toString('hex');
    const publicKey = crypto.createHash('sha256').update(privateKey).digest('hex');
    const address = '0x' + crypto.createHash('sha256').update(publicKey).digest('hex').substring(0, 40);

    return {
      address,
      publicKey: '0x' + publicKey,
      privateKey: '0x' + privateKey
    };
  }

  /**
   * Encrypt private key
   */
  private encryptPrivateKey(privateKey: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.ALGORITHM, this.ENCRYPTION_KEY, iv);
      
      let encrypted = cipher.update(privateKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted data
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error('Error encrypting private key:', error);
      throw error;
    }
  }

  /**
   * Decrypt private key
   */
  private decryptPrivateKey(encryptedKey: string): string {
    try {
      const parts = encryptedKey.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipheriv(this.ALGORITHM, this.ENCRYPTION_KEY, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Error decrypting private key:', error);
      throw error;
    }
  }

  /**
   * Verify authorization for sensitive operations
   */
  private verifyAuthorization(authToken: string): boolean {
    // In production, implement proper JWT verification
    // For now, simple check
    return authToken && authToken.length > 0;
  }

  /**
   * Export wallet data (excluding private key)
   */
  async exportWalletData(userId: string): Promise<Partial<ScrollCoinWalletData>> {
    try {
      const wallet = await prisma.scrollCoinWallet.findUnique({
        where: { userId }
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Return wallet data without private key
      const { privateKeyHash, ...walletData } = wallet;

      return walletData as Partial<ScrollCoinWalletData>;
    } catch (error) {
      logger.error('Error exporting wallet data:', error);
      throw error;
    }
  }

  /**
   * Get wallet statistics
   */
  async getWalletStatistics(userId: string): Promise<{
    balance: number;
    totalEarned: number;
    totalSpent: number;
    netRewards: number;
    transactionCount: number;
    averageTransactionAmount: number;
    lastTransactionDate?: Date;
  }> {
    try {
      const wallet = await prisma.scrollCoinWallet.findUnique({
        where: { userId }
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const transactions = await prisma.scrollCoinTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      const transactionCount = transactions.length;
      const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
      const averageTransactionAmount = transactionCount > 0 ? totalAmount / transactionCount : 0;
      const lastTransactionDate = transactions[0]?.createdAt;

      return {
        balance: wallet.balance,
        totalEarned: wallet.totalEarned,
        totalSpent: wallet.totalSpent,
        netRewards: wallet.totalEarned - wallet.totalSpent,
        transactionCount,
        averageTransactionAmount,
        lastTransactionDate
      };
    } catch (error) {
      logger.error('Error getting wallet statistics:', error);
      throw error;
    }
  }
}

export default WalletManagementService.getInstance();
