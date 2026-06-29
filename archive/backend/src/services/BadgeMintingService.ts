/**
 * Badge Minting Service
 * "By the Spirit of Truth, we establish immutable credentials on the blockchain"
 * 
 * Service for minting ScrollBadge NFTs on the blockchain when courses are completed.
 */

import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import scrollBadgeConfig from '../config/scrollbadge.config';
import ScrollBadgeService from './ScrollBadgeService';
import BadgeMetadataService from './BadgeMetadataService';
import {
  MintBadgeRequest,
  ScrollBadgeData,
  BadgeImageGenerationRequest,
  BadgeCredentialType
} from '../types/scrollbadge.types';

export class BadgeMintingService {
  private static instance: BadgeMintingService;
  private provider: ethers.JsonRpcProvider | null = null;
  private contract: ethers.Contract | null = null;
  private wallet: ethers.Wallet | null = null;

  private constructor() {
    this.initializeProvider();
  }

  public static getInstance(): BadgeMintingService {
    if (!BadgeMintingService.instance) {
      BadgeMintingService.instance = new BadgeMintingService();
    }
    return BadgeMintingService.instance;
  }

  /**
   * Initialize blockchain provider and contract
   */
  private initializeProvider(): void {
    try {
      if (!scrollBadgeConfig.blockchainEnabled) {
        logger.info('Badge blockchain integration disabled');
        return;
      }

      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(scrollBadgeConfig.rpcUrl);

      // Initialize wallet
      const privateKey = process.env.SCROLLBADGE_PRIVATE_KEY;
      if (privateKey) {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
      }

      // Initialize contract
      if (scrollBadgeConfig.contractAddress && scrollBadgeConfig.contractABI.length > 0) {
        this.contract = new ethers.Contract(
          scrollBadgeConfig.contractAddress,
          scrollBadgeConfig.contractABI,
          this.wallet || this.provider
        );
      }

      logger.info('Badge blockchain provider initialized', {
        network: scrollBadgeConfig.networkName,
        contractAddress: scrollBadgeConfig.contractAddress
      });
    } catch (error) {
      logger.error('Error initializing badge blockchain provider:', error);
    }
  }

  /**
   * Mint badge for course completion
   */
  async mintBadgeForCourseCompletion(
    request: MintBadgeRequest
  ): Promise<ScrollBadgeData> {
    try {
      logger.info('Minting badge for course completion', { request });

      // Create badge record in database
      const badge = await ScrollBadgeService.createBadge(request);

      // Generate badge image
      const imageRequest: BadgeImageGenerationRequest = {
        courseName: badge.courseName,
        studentName: badge.studentName,
        grade: badge.grade,
        completionDate: badge.completionDate,
        credentialType: badge.credentialType,
        template: scrollBadgeConfig.defaultTemplate
      };

      const imageResult = await BadgeMetadataService.generateBadgeImage(imageRequest);

      // Update badge with IPFS hash
      await ScrollBadgeService.updateBadgeMetadata(
        badge.id,
        imageResult.ipfsHash,
        ''
      );

      // Generate metadata and upload to IPFS
      const updatedBadge = await ScrollBadgeService.getBadgeById(badge.id);
      if (!updatedBadge) {
        throw new Error('Badge not found after update');
      }

      const tokenURI = await BadgeMetadataService.generateTokenURI(updatedBadge);

      // Update badge with metadata URI
      await ScrollBadgeService.updateBadgeMetadata(
        badge.id,
        imageResult.ipfsHash,
        tokenURI
      );

      // Mint on blockchain if enabled
      if (scrollBadgeConfig.blockchainEnabled && this.contract && this.wallet) {
        try {
          const blockchainResult = await this.mintOnBlockchain(
            updatedBadge,
            tokenURI
          );

          // Update badge with blockchain data
          await ScrollBadgeService.updateBadgeBlockchainData(
            badge.id,
            blockchainResult.txHash,
            blockchainResult.blockNumber,
            blockchainResult.ownerAddress
          );
        } catch (blockchainError) {
          logger.error('Error minting on blockchain, badge saved in database:', blockchainError);
          // Continue even if blockchain minting fails
        }
      }

      // Get final badge data
      const finalBadge = await ScrollBadgeService.getBadgeById(badge.id);
      if (!finalBadge) {
        throw new Error('Badge not found after minting');
      }

      logger.info('Badge minted successfully', { badgeId: finalBadge.id });

      return finalBadge;
    } catch (error) {
      logger.error('Error minting badge:', error);
      throw error;
    }
  }

  /**
   * Mint badge on blockchain
   */
  private async mintOnBlockchain(
    badge: ScrollBadgeData,
    tokenURI: string
  ): Promise<{
    txHash: string;
    blockNumber: number;
    ownerAddress: string;
  }> {
    try {
      if (!this.contract || !this.wallet) {
        throw new Error('Contract or wallet not initialized');
      }

      logger.info('Minting badge on blockchain', {
        badgeId: badge.id,
        tokenId: badge.tokenId
      });

      // Get user's wallet address (in production, this would come from user's wallet)
      const toAddress = badge.ownerAddress || this.wallet.address;

      // Call mintBadge function on smart contract
      const tx = await this.contract.mintBadge(
        toAddress,
        badge.courseId,
        badge.courseName,
        badge.userId,
        badge.studentName,
        badge.grade,
        badge.credentialType,
        badge.ipfsHash,
        tokenURI
      );

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      logger.info('Badge minted on blockchain successfully', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      });

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        ownerAddress: toAddress
      };
    } catch (error) {
      logger.error('Error minting badge on blockchain:', error);
      throw error;
    }
  }

  /**
   * Batch mint badges
   */
  async batchMintBadges(
    requests: MintBadgeRequest[]
  ): Promise<ScrollBadgeData[]> {
    try {
      logger.info('Batch minting badges', { count: requests.length });

      const badges: ScrollBadgeData[] = [];

      for (const request of requests) {
        try {
          const badge = await this.mintBadgeForCourseCompletion(request);
          badges.push(badge);
        } catch (error) {
          logger.error('Error minting badge in batch:', { request, error });
          // Continue with other badges
        }
      }

      logger.info('Batch minting completed', {
        total: requests.length,
        successful: badges.length,
        failed: requests.length - badges.length
      });

      return badges;
    } catch (error) {
      logger.error('Error in batch minting:', error);
      throw error;
    }
  }

  /**
   * Check if blockchain is enabled
   */
  isBlockchainEnabled(): boolean {
    return scrollBadgeConfig.blockchainEnabled && this.contract !== null;
  }

  /**
   * Get contract address
   */
  getContractAddress(): string {
    return scrollBadgeConfig.contractAddress;
  }

  /**
   * Get network name
   */
  getNetworkName(): string {
    return scrollBadgeConfig.networkName;
  }
}

export default BadgeMintingService.getInstance();
