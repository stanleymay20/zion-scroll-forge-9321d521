/**
 * Badge Marketplace Service
 * "By the Spirit of Wisdom, we enable fair exchange of credentials"
 * 
 * Service for managing the optional badge marketplace where users can trade badges.
 */

import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import scrollBadgeConfig from '../config/scrollbadge.config';
import ScrollBadgeService from './ScrollBadgeService';
import {
  BadgeListingData,
  BadgeMarketplaceQuery,
  BadgeMarketplaceResponse,
  ListBadgeForSaleRequest,
  PurchaseBadgeRequest
} from '../types/scrollbadge.types';

const prisma = new PrismaClient();

export class BadgeMarketplaceService {
  private static instance: BadgeMarketplaceService;
  private provider: ethers.JsonRpcProvider | null = null;
  private contract: ethers.Contract | null = null;
  private wallet: ethers.Wallet | null = null;

  private constructor() {
    this.initializeProvider();
  }

  public static getInstance(): BadgeMarketplaceService {
    if (!BadgeMarketplaceService.instance) {
      BadgeMarketplaceService.instance = new BadgeMarketplaceService();
    }
    return BadgeMarketplaceService.instance;
  }

  /**
   * Initialize blockchain provider
   */
  private initializeProvider(): void {
    try {
      if (!scrollBadgeConfig.marketplaceEnabled || !scrollBadgeConfig.blockchainEnabled) {
        return;
      }

      this.provider = new ethers.JsonRpcProvider(scrollBadgeConfig.rpcUrl);

      const privateKey = process.env.SCROLLBADGE_PRIVATE_KEY;
      if (privateKey) {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
      }

      if (scrollBadgeConfig.contractAddress && scrollBadgeConfig.contractABI.length > 0) {
        this.contract = new ethers.Contract(
          scrollBadgeConfig.contractAddress,
          scrollBadgeConfig.contractABI,
          this.wallet || this.provider
        );
      }
    } catch (error) {
      logger.error('Error initializing marketplace provider:', error);
    }
  }

  /**
   * List badge for sale
   */
  async listBadgeForSale(
    request: ListBadgeForSaleRequest,
    userId: string
  ): Promise<BadgeListingData> {
    try {
      if (!scrollBadgeConfig.marketplaceEnabled) {
        throw new Error('Marketplace is disabled');
      }

      logger.info('Listing badge for sale', { request, userId });

      // Get badge
      const badge = await ScrollBadgeService.getBadgeByTokenId(request.tokenId);

      if (!badge) {
        throw new Error('Badge not found');
      }

      // Verify ownership
      if (badge.userId !== userId) {
        throw new Error('Not badge owner');
      }

      // Verify badge is not revoked
      if (badge.isRevoked) {
        throw new Error('Cannot sell revoked badge');
      }

      // Validate price
      if (request.price < scrollBadgeConfig.minListingPrice) {
        throw new Error(`Price must be at least ${scrollBadgeConfig.minListingPrice}`);
      }

      if (request.price > scrollBadgeConfig.maxListingPrice) {
        throw new Error(`Price cannot exceed ${scrollBadgeConfig.maxListingPrice}`);
      }

      // Calculate expiration date
      const expiresAt = request.expiresAt || new Date();
      if (!request.expiresAt) {
        expiresAt.setDate(expiresAt.getDate() + scrollBadgeConfig.listingDuration);
      }

      // Create listing
      const listing = await prisma.badgeListing.create({
        data: {
          badgeId: badge.id,
          sellerId: userId,
          sellerAddress: badge.ownerAddress,
          price: request.price,
          currency: request.currency,
          isActive: true,
          expiresAt
        }
      });

      // List on blockchain if enabled
      if (scrollBadgeConfig.blockchainEnabled && this.contract) {
        try {
          const priceWei = ethers.parseEther(request.price.toString());
          const tx = await this.contract.listBadgeForSale(
            request.tokenId,
            priceWei
          );
          await tx.wait();
        } catch (blockchainError) {
          logger.error('Error listing on blockchain:', blockchainError);
          // Continue even if blockchain listing fails
        }
      }

      logger.info('Badge listed for sale successfully', { listingId: listing.id });

      return this.mapListingToData(listing, badge);
    } catch (error) {
      logger.error('Error listing badge for sale:', error);
      throw error;
    }
  }

  /**
   * Remove badge from sale
   */
  async removeBadgeFromSale(
    listingId: string,
    userId: string
  ): Promise<void> {
    try {
      logger.info('Removing badge from sale', { listingId, userId });

      const listing = await prisma.badgeListing.findUnique({
        where: { id: listingId },
        include: { badge: true }
      });

      if (!listing) {
        throw new Error('Listing not found');
      }

      if (listing.sellerId !== userId) {
        throw new Error('Not listing owner');
      }

      // Update listing
      await prisma.badgeListing.update({
        where: { id: listingId },
        data: { isActive: false }
      });

      // Remove from blockchain if enabled
      if (scrollBadgeConfig.blockchainEnabled && this.contract) {
        try {
          const tx = await this.contract.removeBadgeFromSale(
            listing.badge.tokenId
          );
          await tx.wait();
        } catch (blockchainError) {
          logger.error('Error removing from blockchain:', blockchainError);
        }
      }

      logger.info('Badge removed from sale successfully', { listingId });
    } catch (error) {
      logger.error('Error removing badge from sale:', error);
      throw error;
    }
  }

  /**
   * Purchase badge
   */
  async purchaseBadge(
    request: PurchaseBadgeRequest,
    buyerId: string
  ): Promise<void> {
    try {
      if (!scrollBadgeConfig.marketplaceEnabled) {
        throw new Error('Marketplace is disabled');
      }

      logger.info('Purchasing badge', { request, buyerId });

      const listing = await prisma.badgeListing.findUnique({
        where: { id: request.listingId },
        include: { badge: true }
      });

      if (!listing) {
        throw new Error('Listing not found');
      }

      if (!listing.isActive) {
        throw new Error('Listing is not active');
      }

      if (listing.expiresAt && listing.expiresAt < new Date()) {
        throw new Error('Listing has expired');
      }

      if (listing.sellerId === buyerId) {
        throw new Error('Cannot buy own badge');
      }

      // Calculate platform fee
      const platformFee = listing.price * (scrollBadgeConfig.platformFeePercentage / 100);
      const sellerAmount = listing.price - platformFee;

      // Process payment (simplified - in production, integrate with payment processor)
      // This would involve transferring funds from buyer to seller

      // Transfer badge ownership
      await prisma.scrollBadge.update({
        where: { id: listing.badgeId },
        data: {
          userId: buyerId,
          ownerAddress: request.buyerAddress,
          updatedAt: new Date()
        }
      });

      // Update listing
      await prisma.badgeListing.update({
        where: { id: request.listingId },
        data: {
          isActive: false,
          soldAt: new Date(),
          buyerId
        }
      });

      // Record sale
      await prisma.badgeSale.create({
        data: {
          listingId: request.listingId,
          badgeId: listing.badgeId,
          sellerId: listing.sellerId,
          buyerId,
          price: listing.price,
          platformFee,
          sellerAmount,
          currency: listing.currency
        }
      });

      // Transfer on blockchain if enabled
      if (scrollBadgeConfig.blockchainEnabled && this.contract) {
        try {
          const priceWei = ethers.parseEther(listing.price.toString());
          const tx = await this.contract.purchaseBadge(
            listing.badge.tokenId,
            { value: priceWei }
          );
          await tx.wait();
        } catch (blockchainError) {
          logger.error('Error purchasing on blockchain:', blockchainError);
          throw blockchainError;
        }
      }

      logger.info('Badge purchased successfully', {
        listingId: request.listingId,
        buyerId
      });
    } catch (error) {
      logger.error('Error purchasing badge:', error);
      throw error;
    }
  }

  /**
   * Query marketplace listings
   */
  async queryMarketplace(
    query: BadgeMarketplaceQuery
  ): Promise<BadgeMarketplaceResponse> {
    try {
      const {
        credentialType,
        courseId,
        minGrade,
        maxPrice,
        sortBy = 'date',
        sortOrder = 'desc',
        limit = 50,
        offset = 0
      } = query;

      // Build where clause
      const where: any = {
        isActive: true,
        expiresAt: {
          gt: new Date()
        }
      };

      if (maxPrice !== undefined) {
        where.price = { lte: maxPrice };
      }

      // Get total count
      const total = await prisma.badgeListing.count({ where });

      // Build order by
      let orderBy: any = {};
      if (sortBy === 'price') {
        orderBy = { price: sortOrder };
      } else if (sortBy === 'grade') {
        orderBy = { badge: { grade: sortOrder } };
      } else {
        orderBy = { createdAt: sortOrder };
      }

      // Get listings
      const listings = await prisma.badgeListing.findMany({
        where,
        include: {
          badge: true
        },
        orderBy,
        take: limit,
        skip: offset
      });

      // Filter by badge criteria
      let filteredListings = listings;

      if (credentialType) {
        filteredListings = filteredListings.filter(
          l => l.badge.credentialType === credentialType
        );
      }

      if (courseId) {
        filteredListings = filteredListings.filter(
          l => l.badge.courseId === courseId
        );
      }

      if (minGrade !== undefined) {
        filteredListings = filteredListings.filter(
          l => l.badge.grade >= minGrade
        );
      }

      const listingData = filteredListings.map(l => 
        this.mapListingToData(l, l.badge)
      );

      return {
        listings: listingData,
        total: filteredListings.length,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit
      };
    } catch (error) {
      logger.error('Error querying marketplace:', error);
      throw error;
    }
  }

  /**
   * Get user's active listings
   */
  async getUserListings(userId: string): Promise<BadgeListingData[]> {
    try {
      const listings = await prisma.badgeListing.findMany({
        where: {
          sellerId: userId,
          isActive: true
        },
        include: {
          badge: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return listings.map(l => this.mapListingToData(l, l.badge));
    } catch (error) {
      logger.error('Error getting user listings:', error);
      throw error;
    }
  }

  /**
   * Get marketplace statistics
   */
  async getMarketplaceStats(): Promise<{
    totalListings: number;
    totalSales: number;
    averagePrice: number;
    totalVolume: number;
    topSellers: any[];
  }> {
    try {
      const totalListings = await prisma.badgeListing.count({
        where: { isActive: true }
      });

      const totalSales = await prisma.badgeSale.count();

      const priceAgg = await prisma.badgeListing.aggregate({
        where: { isActive: true },
        _avg: { price: true }
      });

      const volumeAgg = await prisma.badgeSale.aggregate({
        _sum: { price: true }
      });

      const topSellers = await prisma.badgeSale.groupBy({
        by: ['sellerId'],
        _count: { sellerId: true },
        _sum: { price: true },
        orderBy: {
          _count: { sellerId: 'desc' }
        },
        take: 10
      });

      return {
        totalListings,
        totalSales,
        averagePrice: priceAgg._avg.price || 0,
        totalVolume: volumeAgg._sum.price || 0,
        topSellers
      };
    } catch (error) {
      logger.error('Error getting marketplace stats:', error);
      throw error;
    }
  }

  /**
   * Map listing to data
   */
  private mapListingToData(listing: any, badge: any): BadgeListingData {
    return {
      id: listing.id,
      tokenId: badge.tokenId,
      badge,
      sellerId: listing.sellerId,
      sellerAddress: listing.sellerAddress,
      price: listing.price,
      currency: listing.currency,
      isActive: listing.isActive,
      listedAt: listing.createdAt,
      expiresAt: listing.expiresAt
    };
  }

  /**
   * Check if marketplace is enabled
   */
  isMarketplaceEnabled(): boolean {
    return scrollBadgeConfig.marketplaceEnabled;
  }
}

export default BadgeMarketplaceService.getInstance();
