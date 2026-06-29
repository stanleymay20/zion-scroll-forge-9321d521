/**
 * ScrollBadge NFT API Routes
 * "By the Spirit of Excellence, we establish verifiable credentials"
 */

import express, { Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import BadgeMintingService from '../services/BadgeMintingService';
import ScrollBadgeService from '../services/ScrollBadgeService';
import BadgeVerificationService from '../services/BadgeVerificationService';
import BadgeProfileService from '../services/BadgeProfileService';
import BadgeMarketplaceService from '../services/BadgeMarketplaceService';
import { logger } from '../utils/logger';
import {
  MintBadgeRequest,
  BadgeQueryOptions,
  BadgeVerificationRequest,
  EmployerVerificationRequest,
  BadgeShareRequest,
  ListBadgeForSaleRequest,
  PurchaseBadgeRequest,
  BadgeMarketplaceQuery
} from '../types/scrollbadge.types';

const router = express.Router();

/**
 * @route   POST /api/scrollbadge/mint
 * @desc    Mint a new badge for course completion
 * @access  Private (Faculty/Admin)
 */
router.post(
  '/mint',
  authenticateToken,
  requireRole(['FACULTY', 'ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const request: MintBadgeRequest = req.body;

      const badge = await BadgeMintingService.mintBadgeForCourseCompletion(request);

      res.json({
        success: true,
        data: badge
      });
    } catch (error: any) {
      logger.error('Error minting badge:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to mint badge'
      });
    }
  }
);

/**
 * @route   POST /api/scrollbadge/batch-mint
 * @desc    Batch mint badges
 * @access  Private (Admin)
 */
router.post(
  '/batch-mint',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const requests: MintBadgeRequest[] = req.body.badges;

      const badges = await BadgeMintingService.batchMintBadges(requests);

      res.json({
        success: true,
        data: {
          badges,
          total: requests.length,
          successful: badges.length,
          failed: requests.length - badges.length
        }
      });
    } catch (error: any) {
      logger.error('Error batch minting badges:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to batch mint badges'
      });
    }
  }
);

/**
 * @route   GET /api/scrollbadge/:badgeId
 * @desc    Get badge by ID
 * @access  Public
 */
router.get('/:badgeId', async (req: Request, res: Response) => {
  try {
    const { badgeId } = req.params;

    const badge = await ScrollBadgeService.getBadgeById(badgeId);

    if (!badge) {
      return res.status(404).json({
        success: false,
        error: 'Badge not found'
      });
    }

    // Check if badge is public or user is owner
    const userId = (req as any).user?.userId;
    if (!badge.isPublic && badge.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Badge is private'
      });
    }

    res.json({
      success: true,
      data: badge
    });
  } catch (error: any) {
    logger.error('Error getting badge:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get badge'
    });
  }
});

/**
 * @route   GET /api/scrollbadge/token/:tokenId
 * @desc    Get badge by token ID
 * @access  Public
 */
router.get('/token/:tokenId', async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId);

    const badge = await ScrollBadgeService.getBadgeByTokenId(tokenId);

    if (!badge) {
      return res.status(404).json({
        success: false,
        error: 'Badge not found'
      });
    }

    // Check if badge is public or user is owner
    const userId = (req as any).user?.userId;
    if (!badge.isPublic && badge.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Badge is private'
      });
    }

    res.json({
      success: true,
      data: badge
    });
  } catch (error: any) {
    logger.error('Error getting badge by token ID:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get badge'
    });
  }
});

/**
 * @route   POST /api/scrollbadge/query
 * @desc    Query badges with filters
 * @access  Private
 */
router.post(
  '/query',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const options: BadgeQueryOptions = req.body;

      const result = await ScrollBadgeService.queryBadges(options);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error querying badges:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to query badges'
      });
    }
  }
);

/**
 * @route   GET /api/scrollbadge/user/:userId
 * @desc    Get user's badges
 * @access  Private
 */
router.get(
  '/user/:userId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      // Check if user is requesting their own badges or is admin
      const requestingUserId = (req as any).user.userId;
      const userRole = (req as any).user.role;

      if (userId !== requestingUserId && userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const badges = await ScrollBadgeService.getUserBadges(userId);

      res.json({
        success: true,
        data: badges
      });
    } catch (error: any) {
      logger.error('Error getting user badges:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get user badges'
      });
    }
  }
);

/**
 * @route   GET /api/scrollbadge/course/:courseId
 * @desc    Get course badges
 * @access  Private
 */
router.get(
  '/course/:courseId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;

      const badges = await ScrollBadgeService.getCourseBadges(courseId);

      res.json({
        success: true,
        data: badges
      });
    } catch (error: any) {
      logger.error('Error getting course badges:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get course badges'
      });
    }
  }
);

/**
 * @route   PUT /api/scrollbadge/:badgeId/visibility
 * @desc    Update badge visibility
 * @access  Private
 */
router.put(
  '/:badgeId/visibility',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { badgeId } = req.params;
      const { isPublic } = req.body;
      const userId = (req as any).user.userId;

      // Verify ownership
      const badge = await ScrollBadgeService.getBadgeById(badgeId);
      if (!badge || badge.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const updatedBadge = await ScrollBadgeService.updateBadgeVisibility(
        badgeId,
        isPublic
      );

      res.json({
        success: true,
        data: updatedBadge
      });
    } catch (error: any) {
      logger.error('Error updating badge visibility:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update badge visibility'
      });
    }
  }
);

/**
 * @route   POST /api/scrollbadge/:badgeId/revoke
 * @desc    Revoke badge
 * @access  Private (Admin)
 */
router.post(
  '/:badgeId/revoke',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { badgeId } = req.params;
      const { reason } = req.body;
      const revokedBy = (req as any).user.userId;

      const badge = await ScrollBadgeService.revokeBadge(badgeId, reason, revokedBy);

      res.json({
        success: true,
        data: badge
      });
    } catch (error: any) {
      logger.error('Error revoking badge:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to revoke badge'
      });
    }
  }
);

/**
 * @route   POST /api/scrollbadge/verify
 * @desc    Verify badge authenticity
 * @access  Public
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const request: BadgeVerificationRequest = req.body;

    const result = await BadgeVerificationService.verifyBadge(request);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('Error verifying badge:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify badge'
    });
  }
});

/**
 * @route   POST /api/scrollbadge/verify/employer
 * @desc    Verify badge for employer
 * @access  Public
 */
router.post('/verify/employer', async (req: Request, res: Response) => {
  try {
    const request: EmployerVerificationRequest = req.body;

    const result = await BadgeVerificationService.verifyBadgeForEmployer(request);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('Error verifying badge for employer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify badge for employer'
    });
  }
});

/**
 * @route   GET /api/scrollbadge/profile/:userId
 * @desc    Get user's public badge profile
 * @access  Public
 */
router.get('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const profile = await BadgeProfileService.getUserBadgeProfile(userId);

    res.json({
      success: true,
      data: profile
    });
  } catch (error: any) {
    logger.error('Error getting badge profile:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get badge profile'
    });
  }
});

/**
 * @route   POST /api/scrollbadge/share
 * @desc    Share badge on social media
 * @access  Private
 */
router.post(
  '/share',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const request: BadgeShareRequest = req.body;

      const result = await BadgeProfileService.shareBadge(request);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error sharing badge:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to share badge'
      });
    }
  }
);

/**
 * @route   GET /api/scrollbadge/statistics
 * @desc    Get badge statistics
 * @access  Private
 */
router.get(
  '/statistics',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string | undefined;

      const stats = await ScrollBadgeService.getBadgeStatistics(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logger.error('Error getting badge statistics:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get badge statistics'
      });
    }
  }
);

// Marketplace routes (optional)

/**
 * @route   POST /api/scrollbadge/marketplace/list
 * @desc    List badge for sale
 * @access  Private
 */
router.post(
  '/marketplace/list',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const request: ListBadgeForSaleRequest = req.body;
      const userId = (req as any).user.userId;

      const listing = await BadgeMarketplaceService.listBadgeForSale(request, userId);

      res.json({
        success: true,
        data: listing
      });
    } catch (error: any) {
      logger.error('Error listing badge for sale:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list badge for sale'
      });
    }
  }
);

/**
 * @route   DELETE /api/scrollbadge/marketplace/listing/:listingId
 * @desc    Remove badge from sale
 * @access  Private
 */
router.delete(
  '/marketplace/listing/:listingId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { listingId } = req.params;
      const userId = (req as any).user.userId;

      await BadgeMarketplaceService.removeBadgeFromSale(listingId, userId);

      res.json({
        success: true,
        message: 'Badge removed from sale'
      });
    } catch (error: any) {
      logger.error('Error removing badge from sale:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to remove badge from sale'
      });
    }
  }
);

/**
 * @route   POST /api/scrollbadge/marketplace/purchase
 * @desc    Purchase badge
 * @access  Private
 */
router.post(
  '/marketplace/purchase',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const request: PurchaseBadgeRequest = req.body;
      const buyerId = (req as any).user.userId;

      await BadgeMarketplaceService.purchaseBadge(request, buyerId);

      res.json({
        success: true,
        message: 'Badge purchased successfully'
      });
    } catch (error: any) {
      logger.error('Error purchasing badge:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to purchase badge'
      });
    }
  }
);

/**
 * @route   POST /api/scrollbadge/marketplace/query
 * @desc    Query marketplace listings
 * @access  Public
 */
router.post('/marketplace/query', async (req: Request, res: Response) => {
  try {
    const query: BadgeMarketplaceQuery = req.body;

    const result = await BadgeMarketplaceService.queryMarketplace(query);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('Error querying marketplace:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to query marketplace'
    });
  }
});

/**
 * @route   GET /api/scrollbadge/marketplace/statistics
 * @desc    Get marketplace statistics
 * @access  Public
 */
router.get('/marketplace/statistics', async (req: Request, res: Response) => {
  try {
    const stats = await BadgeMarketplaceService.getMarketplaceStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('Error getting marketplace statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get marketplace statistics'
    });
  }
});

export default router;
