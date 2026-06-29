/**
 * ScrollCoin API Routes
 * "By the Spirit of Wisdom, we establish kingdom economy endpoints"
 * 
 * Routes for ScrollCoin blockchain integration, wallet management,
 * transactions, and fraud prevention.
 */

import express, { Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import ScrollCoinService from '../services/ScrollCoinService';
import WalletManagementService from '../services/WalletManagementService';
import FraudPreventionService from '../services/FraudPreventionService';
import ExchangeRateService from '../services/ExchangeRateService';
import BlockchainIntegrationService from '../services/BlockchainIntegrationService';
import { logger } from '../utils/logger';

const router = express.Router();

// ============================================================================
// WALLET MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/scrollcoin/wallet
 * Get user's wallet balance and information
 */
router.get('/wallet', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const balance = await ScrollCoinService.getWalletBalance(userId);
    const statistics = await WalletManagementService.getWalletStatistics(userId);

    res.json({
      success: true,
      data: {
        ...balance,
        statistics
      }
    });
  } catch (error) {
    logger.error('Error getting wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get wallet information'
    });
  }
});

/**
 * POST /api/scrollcoin/wallet/create
 * Create a new wallet for user
 */
router.post('/wallet/create', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const wallet = await WalletManagementService.createWallet({ userId });

    res.json({
      success: true,
      data: wallet
    });
  } catch (error) {
    logger.error('Error creating wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create wallet'
    });
  }
});

/**
 * POST /api/scrollcoin/wallet/sync
 * Sync wallet balance with blockchain
 */
router.post('/wallet/sync', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const balance = await WalletManagementService.syncWalletBalance(userId);

    res.json({
      success: true,
      data: { balance }
    });
  } catch (error) {
    logger.error('Error syncing wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync wallet'
    });
  }
});

// ============================================================================
// TRANSACTION ROUTES
// ============================================================================

/**
 * POST /api/scrollcoin/mint
 * Mint ScrollCoin rewards (admin only)
 */
router.post('/mint', authenticateToken, requireRole(['ADMIN', 'SCROLL_ELDER']), async (req: Request, res: Response) => {
  try {
    const { userId, amount, reason, referenceId, rewardId } = req.body;

    if (!userId || !amount || !reason || !rewardId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, amount, reason, rewardId'
      });
    }

    const transaction = await ScrollCoinService.mintReward({
      userId,
      amount,
      reason,
      referenceId,
      rewardId
    });

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    logger.error('Error minting ScrollCoin:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mint ScrollCoin'
    });
  }
});

/**
 * POST /api/scrollcoin/transfer
 * Transfer ScrollCoin between users
 */
router.post('/transfer', authenticateToken, async (req: Request, res: Response) => {
  try {
    const fromUserId = (req as any).user.userId;
    const { toUserId, amount, reason } = req.body;

    if (!toUserId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: toUserId, amount'
      });
    }

    const transaction = await ScrollCoinService.transferTokens({
      fromUserId,
      toUserId,
      amount,
      reason
    });

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    logger.error('Error transferring ScrollCoin:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transfer ScrollCoin'
    });
  }
});

/**
 * POST /api/scrollcoin/burn
 * Burn ScrollCoin for purchases
 */
router.post('/burn', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { amount, reason, referenceId } = req.body;

    if (!amount || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, reason'
      });
    }

    const transaction = await ScrollCoinService.burnTokens({
      userId,
      amount,
      reason,
      referenceId
    });

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    logger.error('Error burning ScrollCoin:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to burn ScrollCoin'
    });
  }
});

/**
 * GET /api/scrollcoin/transactions
 * Get transaction history
 */
router.get('/transactions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { type, status, startDate, endDate, limit, offset } = req.query;

    const history = await ScrollCoinService.getTransactionHistory({
      userId,
      type: type as any,
      status: status as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Error getting transaction history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction history'
    });
  }
});

// ============================================================================
// EXCHANGE RATE ROUTES
// ============================================================================

/**
 * GET /api/scrollcoin/exchange-rate
 * Get current exchange rate
 */
router.get('/exchange-rate', async (req: Request, res: Response) => {
  try {
    const rate = await ExchangeRateService.getCurrentRate();

    res.json({
      success: true,
      data: rate
    });
  } catch (error) {
    logger.error('Error getting exchange rate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get exchange rate'
    });
  }
});

/**
 * POST /api/scrollcoin/exchange-rate/convert
 * Convert between ScrollCoin and USD
 */
router.post('/exchange-rate/convert', async (req: Request, res: Response) => {
  try {
    const { amount, from } = req.body;

    if (!amount || !from) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, from'
      });
    }

    let conversion;
    if (from === 'SCROLLCOIN') {
      conversion = await ExchangeRateService.convertToUSD(amount);
    } else if (from === 'USD') {
      conversion = await ExchangeRateService.convertFromUSD(amount);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid currency. Use SCROLLCOIN or USD'
      });
    }

    res.json({
      success: true,
      data: conversion
    });
  } catch (error) {
    logger.error('Error converting currency:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to convert currency'
    });
  }
});

/**
 * POST /api/scrollcoin/exchange-rate/create
 * Create new exchange rate (admin only)
 */
router.post('/exchange-rate/create', authenticateToken, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { rateToUSD, rateFromUSD, source, isActive, effectiveFrom, effectiveTo } = req.body;

    if (!rateToUSD || !rateFromUSD) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: rateToUSD, rateFromUSD'
      });
    }

    const rate = await ExchangeRateService.createRate({
      rateToUSD,
      rateFromUSD,
      source: source || 'MANUAL',
      isActive: isActive !== false,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined
    });

    res.json({
      success: true,
      data: rate
    });
  } catch (error) {
    logger.error('Error creating exchange rate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create exchange rate'
    });
  }
});

// ============================================================================
// FRAUD PREVENTION ROUTES
// ============================================================================

/**
 * GET /api/scrollcoin/fraud/alerts
 * Get fraud alerts (admin only)
 */
router.get('/fraud/alerts', authenticateToken, requireRole(['ADMIN', 'FRAUD_MONITOR_ROLE']), async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;

    const alerts = await FraudPreventionService.getPendingAlerts(
      limit ? parseInt(limit as string) : undefined
    );

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    logger.error('Error getting fraud alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get fraud alerts'
    });
  }
});

/**
 * POST /api/scrollcoin/fraud/alerts/:alertId/review
 * Review and resolve fraud alert (admin only)
 */
router.post('/fraud/alerts/:alertId/review', authenticateToken, requireRole(['ADMIN', 'FRAUD_MONITOR_ROLE']), async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { status, reviewNotes } = req.body;
    const reviewedBy = (req as any).user.userId;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: status'
      });
    }

    const alert = await FraudPreventionService.reviewAlert(
      alertId,
      reviewedBy,
      status,
      reviewNotes
    );

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    logger.error('Error reviewing fraud alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to review fraud alert'
    });
  }
});

/**
 * GET /api/scrollcoin/fraud/statistics
 * Get fraud statistics (admin only)
 */
router.get('/fraud/statistics', authenticateToken, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const statistics = await FraudPreventionService.getFraudStatistics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Error getting fraud statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get fraud statistics'
    });
  }
});

// ============================================================================
// BLOCKCHAIN INTEGRATION ROUTES
// ============================================================================

/**
 * GET /api/scrollcoin/blockchain/status
 * Get blockchain network status
 */
router.get('/blockchain/status', async (req: Request, res: Response) => {
  try {
    const status = await BlockchainIntegrationService.getNetworkStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error getting blockchain status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get blockchain status'
    });
  }
});

/**
 * POST /api/scrollcoin/blockchain/verify
 * Verify transaction on blockchain
 */
router.post('/blockchain/verify', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { txHash, expectedData } = req.body;

    if (!txHash) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: txHash'
      });
    }

    const verification = await BlockchainIntegrationService.verifyTransaction(
      txHash,
      expectedData || {}
    );

    res.json({
      success: true,
      data: verification
    });
  } catch (error) {
    logger.error('Error verifying transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify transaction'
    });
  }
});

/**
 * GET /api/scrollcoin/blockchain/balance/:address
 * Get balance from blockchain
 */
router.get('/blockchain/balance/:address', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    const balance = await BlockchainIntegrationService.getBalance(address);

    res.json({
      success: true,
      data: { balance }
    });
  } catch (error) {
    logger.error('Error getting blockchain balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get blockchain balance'
    });
  }
});

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * POST /api/scrollcoin/admin/wallet/blacklist
 * Blacklist a wallet (admin only)
 */
router.post('/admin/wallet/blacklist', authenticateToken, requireRole(['ADMIN', 'FRAUD_MONITOR_ROLE']), async (req: Request, res: Response) => {
  try {
    const { userId, reason } = req.body;

    if (!userId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, reason'
      });
    }

    await WalletManagementService.blacklistWallet(userId, reason);

    res.json({
      success: true,
      message: 'Wallet blacklisted successfully'
    });
  } catch (error) {
    logger.error('Error blacklisting wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to blacklist wallet'
    });
  }
});

/**
 * POST /api/scrollcoin/admin/wallet/whitelist
 * Whitelist a wallet (admin only)
 */
router.post('/admin/wallet/whitelist', authenticateToken, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: userId'
      });
    }

    await WalletManagementService.whitelistWallet(userId);

    res.json({
      success: true,
      message: 'Wallet whitelisted successfully'
    });
  } catch (error) {
    logger.error('Error whitelisting wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to whitelist wallet'
    });
  }
});

export default router;
