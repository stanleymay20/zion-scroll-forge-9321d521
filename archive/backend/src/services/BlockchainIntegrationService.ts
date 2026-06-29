/**
 * Blockchain Integration Service
 * "By the Spirit of Truth, we establish immutable records on the blockchain"
 * 
 * Service for interacting with Ethereum blockchain and ScrollCoin smart contract.
 * Handles minting, transfers, burning, and verification of on-chain transactions.
 */

import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import scrollCoinConfig from '../config/scrollcoin.config';
import {
  BlockchainTransactionReceipt,
  BlockchainNetworkStatus,
  GasEstimate,
  TransactionVerification,
  ScrollCoinTransactionData
} from '../types/scrollcoin.types';

export class BlockchainIntegrationService {
  private static instance: BlockchainIntegrationService;
  private provider: ethers.JsonRpcProvider | null = null;
  private contract: ethers.Contract | null = null;
  private wallet: ethers.Wallet | null = null;

  private constructor() {
    this.initializeProvider();
  }

  public static getInstance(): BlockchainIntegrationService {
    if (!BlockchainIntegrationService.instance) {
      BlockchainIntegrationService.instance = new BlockchainIntegrationService();
    }
    return BlockchainIntegrationService.instance;
  }

  /**
   * Initialize blockchain provider and contract
   */
  private initializeProvider(): void {
    try {
      if (!scrollCoinConfig.blockchainEnabled) {
        logger.info('Blockchain integration disabled');
        return;
      }

      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(scrollCoinConfig.rpcUrl);

      // Initialize wallet (in production, use secure key management)
      const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
      if (privateKey) {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
      }

      // Initialize contract
      if (scrollCoinConfig.contractAddress && scrollCoinConfig.contractABI) {
        this.contract = new ethers.Contract(
          scrollCoinConfig.contractAddress,
          scrollCoinConfig.contractABI,
          this.wallet || this.provider
        );
      }

      logger.info('Blockchain provider initialized', {
        network: scrollCoinConfig.networkName,
        contractAddress: scrollCoinConfig.contractAddress
      });
    } catch (error) {
      logger.error('Error initializing blockchain provider:', error);
    }
  }

  /**
   * Get network status
   */
  async getNetworkStatus(): Promise<BlockchainNetworkStatus> {
    try {
      if (!this.provider) {
        throw new Error('Blockchain provider not initialized');
      }

      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const feeData = await this.provider.getFeeData();

      return {
        isConnected: true,
        blockNumber,
        networkName: network.name,
        gasPrice: feeData.gasPrice?.toString() || '0',
        contractAddress: scrollCoinConfig.contractAddress
      };
    } catch (error) {
      logger.error('Error getting network status:', error);
      return {
        isConnected: false,
        blockNumber: 0,
        networkName: 'unknown',
        gasPrice: '0',
        contractAddress: scrollCoinConfig.contractAddress
      };
    }
  }

  /**
   * Mint ScrollCoin tokens on blockchain
   */
  async mintTokens(
    toAddress: string,
    amount: number,
    reason: string,
    rewardId: string
  ): Promise<BlockchainTransactionReceipt> {
    try {
      if (!this.contract || !this.wallet) {
        throw new Error('Contract or wallet not initialized');
      }

      logger.info('Minting tokens on blockchain', {
        toAddress,
        amount,
        reason,
        rewardId
      });

      // Convert amount to wei (assuming 18 decimals)
      const amountWei = ethers.parseUnits(amount.toString(), 18);

      // Call mintReward function on smart contract
      const tx = await this.contract.mintReward(
        toAddress,
        amountWei,
        reason,
        rewardId
      );

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      logger.info('Tokens minted successfully', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      });

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: Number(receipt.gasUsed),
        status: receipt.status === 1 ? 'success' : 'failed',
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error minting tokens:', error);
      throw error;
    }
  }

  /**
   * Transfer ScrollCoin tokens on blockchain
   */
  async transferTokens(
    fromAddress: string,
    toAddress: string,
    amount: number
  ): Promise<BlockchainTransactionReceipt> {
    try {
      if (!this.contract || !this.wallet) {
        throw new Error('Contract or wallet not initialized');
      }

      logger.info('Transferring tokens on blockchain', {
        fromAddress,
        toAddress,
        amount
      });

      // Convert amount to wei
      const amountWei = ethers.parseUnits(amount.toString(), 18);

      // Call transfer function on smart contract
      const tx = await this.contract.transfer(toAddress, amountWei);

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      logger.info('Tokens transferred successfully', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      });

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: Number(receipt.gasUsed),
        status: receipt.status === 1 ? 'success' : 'failed',
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error transferring tokens:', error);
      throw error;
    }
  }

  /**
   * Burn ScrollCoin tokens on blockchain
   */
  async burnTokens(
    fromAddress: string,
    amount: number,
    reason: string
  ): Promise<BlockchainTransactionReceipt> {
    try {
      if (!this.contract || !this.wallet) {
        throw new Error('Contract or wallet not initialized');
      }

      logger.info('Burning tokens on blockchain', {
        fromAddress,
        amount,
        reason
      });

      // Convert amount to wei
      const amountWei = ethers.parseUnits(amount.toString(), 18);

      // Call burnForPurchase function on smart contract
      const tx = await this.contract.burnForPurchase(amountWei, reason);

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      logger.info('Tokens burned successfully', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      });

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: Number(receipt.gasUsed),
        status: receipt.status === 1 ? 'success' : 'failed',
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error burning tokens:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance from blockchain
   */
  async getBalance(address: string): Promise<number> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const balanceWei = await this.contract.balanceOf(address);
      const balance = Number(ethers.formatUnits(balanceWei, 18));

      return balance;
    } catch (error) {
      logger.error('Error getting balance:', error);
      throw error;
    }
  }

  /**
   * Verify transaction on blockchain
   */
  async verifyTransaction(
    txHash: string,
    expectedData: Partial<ScrollCoinTransactionData>
  ): Promise<TransactionVerification> {
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      // Get transaction receipt
      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return {
          isValid: false,
          transaction: expectedData as ScrollCoinTransactionData,
          discrepancies: ['Transaction not found on blockchain']
        };
      }

      // Get transaction details
      const tx = await this.provider.getTransaction(txHash);

      if (!tx) {
        return {
          isValid: false,
          transaction: expectedData as ScrollCoinTransactionData,
          discrepancies: ['Transaction details not found']
        };
      }

      const blockchainData: BlockchainTransactionReceipt = {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: Number(receipt.gasUsed),
        status: receipt.status === 1 ? 'success' : 'failed',
        timestamp: new Date()
      };

      // Check for discrepancies
      const discrepancies: string[] = [];

      if (expectedData.blockchainTxHash && expectedData.blockchainTxHash !== receipt.hash) {
        discrepancies.push('Transaction hash mismatch');
      }

      if (expectedData.blockNumber && expectedData.blockNumber !== receipt.blockNumber) {
        discrepancies.push('Block number mismatch');
      }

      if (receipt.status !== 1) {
        discrepancies.push('Transaction failed on blockchain');
      }

      return {
        isValid: discrepancies.length === 0,
        transaction: expectedData as ScrollCoinTransactionData,
        blockchainData,
        discrepancies: discrepancies.length > 0 ? discrepancies : undefined
      };
    } catch (error) {
      logger.error('Error verifying transaction:', error);
      throw error;
    }
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(
    operation: 'mint' | 'transfer' | 'burn',
    params: any
  ): Promise<GasEstimate> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      let gasLimit: bigint;

      switch (operation) {
        case 'mint':
          gasLimit = await this.contract.mintReward.estimateGas(
            params.toAddress,
            ethers.parseUnits(params.amount.toString(), 18),
            params.reason,
            params.rewardId
          );
          break;
        case 'transfer':
          gasLimit = await this.contract.transfer.estimateGas(
            params.toAddress,
            ethers.parseUnits(params.amount.toString(), 18)
          );
          break;
        case 'burn':
          gasLimit = await this.contract.burnForPurchase.estimateGas(
            ethers.parseUnits(params.amount.toString(), 18),
            params.reason
          );
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      const feeData = await this.provider!.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(0);
      const estimatedCost = gasLimit * gasPrice;

      // Convert to USD (simplified - in production, use real exchange rate)
      const ethPrice = 2000; // Placeholder ETH price
      const estimatedCostETH = Number(ethers.formatEther(estimatedCost));
      const estimatedCostUSD = estimatedCostETH * ethPrice;

      return {
        gasLimit: Number(gasLimit),
        gasPrice: gasPrice.toString(),
        estimatedCost: ethers.formatEther(estimatedCost),
        estimatedCostUSD
      };
    } catch (error) {
      logger.error('Error estimating gas:', error);
      throw error;
    }
  }

  /**
   * Check if address can transfer amount
   */
  async canTransfer(address: string, amount: number): Promise<boolean> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const amountWei = ethers.parseUnits(amount.toString(), 18);
      const canTransfer = await this.contract.canTransfer(address, amountWei);

      return canTransfer;
    } catch (error) {
      logger.error('Error checking if can transfer:', error);
      return false;
    }
  }

  /**
   * Get remaining daily limit for address
   */
  async getRemainingDailyLimit(address: string): Promise<number> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const limitWei = await this.contract.getRemainingDailyLimit(address);
      const limit = Number(ethers.formatUnits(limitWei, 18));

      return limit;
    } catch (error) {
      logger.error('Error getting remaining daily limit:', error);
      throw error;
    }
  }

  /**
   * Get reward statistics for address
   */
  async getRewardStats(address: string): Promise<{
    earned: number;
    spent: number;
    balance: number;
    netRewards: number;
  }> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const stats = await this.contract.getRewardStats(address);

      return {
        earned: Number(ethers.formatUnits(stats.earned, 18)),
        spent: Number(ethers.formatUnits(stats.spent, 18)),
        balance: Number(ethers.formatUnits(stats.balance, 18)),
        netRewards: Number(ethers.formatUnits(stats.netRewards, 18))
      };
    } catch (error) {
      logger.error('Error getting reward stats:', error);
      throw error;
    }
  }

  /**
   * Check if blockchain is enabled and connected
   */
  isEnabled(): boolean {
    return scrollCoinConfig.blockchainEnabled && this.provider !== null;
  }
}

export default BlockchainIntegrationService.getInstance();
