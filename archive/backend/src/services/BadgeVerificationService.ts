/**
 * Badge Verification Service
 * "By the Spirit of Truth, we verify credentials with integrity"
 * 
 * Service for verifying ScrollBadge NFTs for employers and third parties.
 */

import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import scrollBadgeConfig from '../config/scrollbadge.config';
import ScrollBadgeService from './ScrollBadgeService';
import BadgeMetadataService from './BadgeMetadataService';
import {
  BadgeVerificationRequest,
  BadgeVerificationResult,
  EmployerVerificationRequest,
  EmployerVerificationResult,
  BlockchainBadgeData
} from '../types/scrollbadge.types';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class BadgeVerificationService {
  private static instance: BadgeVerificationService;
  private provider: ethers.JsonRpcProvider | null = null;
  private contract: ethers.Contract | null = null;

  private constructor() {
    this.initializeProvider();
  }

  public static getInstance(): BadgeVerificationService {
    if (!BadgeVerificationService.instance) {
      BadgeVerificationService.instance = new BadgeVerificationService();
    }
    return BadgeVerificationService.instance;
  }

  /**
   * Initialize blockchain provider
   */
  private initializeProvider(): void {
    try {
      if (!scrollBadgeConfig.blockchainEnabled) {
        return;
      }

      this.provider = new ethers.JsonRpcProvider(scrollBadgeConfig.rpcUrl);

      if (scrollBadgeConfig.contractAddress && scrollBadgeConfig.contractABI.length > 0) {
        this.contract = new ethers.Contract(
          scrollBadgeConfig.contractAddress,
          scrollBadgeConfig.contractABI,
          this.provider
        );
      }
    } catch (error) {
      logger.error('Error initializing verification provider:', error);
    }
  }

  /**
   * Verify badge authenticity
   */
  async verifyBadge(
    request: BadgeVerificationRequest
  ): Promise<BadgeVerificationResult> {
    try {
      logger.info('Verifying badge', { tokenId: request.tokenId });

      // Get badge from database
      const badge = await ScrollBadgeService.getBadgeByTokenId(request.tokenId);

      if (!badge) {
        return {
          isValid: false,
          badge: {} as any,
          verifiedAt: new Date(),
          discrepancies: ['Badge not found in database']
        };
      }

      // Check if badge is revoked
      if (badge.isRevoked) {
        return {
          isValid: false,
          badge,
          verifiedAt: new Date(),
          discrepancies: [`Badge revoked: ${badge.revokedReason}`]
        };
      }

      const discrepancies: string[] = [];

      // Verify on blockchain if enabled
      if (scrollBadgeConfig.blockchainEnabled && this.contract) {
        try {
          const blockchainData = await this.getBlockchainBadgeData(request.tokenId);

          // Check if badge exists on blockchain
          if (!blockchainData) {
            discrepancies.push('Badge not found on blockchain');
          } else {
            // Verify metadata matches
            if (blockchainData.metadata.courseId !== badge.courseId) {
              discrepancies.push('Course ID mismatch');
            }

            if (blockchainData.metadata.studentId !== badge.userId) {
              discrepancies.push('Student ID mismatch');
            }

            if (blockchainData.metadata.grade !== badge.grade) {
              discrepancies.push('Grade mismatch');
            }

            if (blockchainData.isRevoked !== badge.isRevoked) {
              discrepancies.push('Revocation status mismatch');
            }
          }

          return {
            isValid: discrepancies.length === 0,
            badge,
            blockchainData,
            verifiedAt: new Date(),
            verifier: request.verifierAddress,
            discrepancies: discrepancies.length > 0 ? discrepancies : undefined
          };
        } catch (blockchainError) {
          logger.error('Error verifying on blockchain:', blockchainError);
          discrepancies.push('Blockchain verification failed');
        }
      }

      // If blockchain not enabled, verify based on database only
      return {
        isValid: discrepancies.length === 0,
        badge,
        verifiedAt: new Date(),
        verifier: request.verifierAddress,
        discrepancies: discrepancies.length > 0 ? discrepancies : undefined
      };
    } catch (error) {
      logger.error('Error verifying badge:', error);
      throw error;
    }
  }

  /**
   * Get badge data from blockchain
   */
  private async getBlockchainBadgeData(
    tokenId: number
  ): Promise<BlockchainBadgeData | null> {
    try {
      if (!this.contract) {
        return null;
      }

      // Check if token exists
      const exists = await this.contract.isBadgeValid(tokenId);
      if (!exists) {
        return null;
      }

      // Get badge metadata from contract
      const metadata = await this.contract.getBadgeMetadata(tokenId);
      const owner = await this.contract.ownerOf(tokenId);
      const tokenURI = await this.contract.tokenURI(tokenId);

      return {
        tokenId,
        owner,
        tokenURI,
        isRevoked: metadata.isRevoked,
        metadata: {
          courseId: metadata.courseId,
          courseName: metadata.courseName,
          studentId: metadata.studentId,
          studentName: metadata.studentName,
          completionDate: Number(metadata.completionDate),
          grade: Number(metadata.grade),
          credentialType: metadata.credentialType,
          ipfsHash: metadata.ipfsHash
        }
      };
    } catch (error) {
      logger.error('Error getting blockchain badge data:', error);
      return null;
    }
  }

  /**
   * Verify badge for employer
   */
  async verifyBadgeForEmployer(
    request: EmployerVerificationRequest
  ): Promise<EmployerVerificationResult> {
    try {
      logger.info('Verifying badge for employer', {
        tokenId: request.tokenId,
        employer: request.employerName
      });

      // Verify badge
      const verificationResult = await this.verifyBadge({
        tokenId: request.tokenId
      });

      if (!verificationResult.isValid) {
        throw new Error('Badge verification failed');
      }

      // Generate verification code
      const verificationCode = this.generateVerificationCode();

      // Store verification record
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + scrollBadgeConfig.verificationCodeExpiry);

      await prisma.badgeVerification.create({
        data: {
          badgeId: verificationResult.badge.id,
          verificationCode,
          employerName: request.employerName,
          employerEmail: request.employerEmail,
          verificationPurpose: request.verificationPurpose,
          expiresAt
        }
      });

      logger.info('Employer verification completed', {
        tokenId: request.tokenId,
        verificationCode
      });

      return {
        isValid: true,
        badge: verificationResult.badge,
        verificationCode,
        verifiedAt: new Date(),
        expiresAt
      };
    } catch (error) {
      logger.error('Error verifying badge for employer:', error);
      throw error;
    }
  }

  /**
   * Verify badge with verification code
   */
  async verifyWithCode(
    tokenId: number,
    verificationCode: string
  ): Promise<boolean> {
    try {
      const verification = await prisma.badgeVerification.findFirst({
        where: {
          verificationCode,
          expiresAt: {
            gt: new Date()
          }
        },
        include: {
          badge: true
        }
      });

      if (!verification) {
        return false;
      }

      if (verification.badge.tokenId !== tokenId) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error verifying with code:', error);
      return false;
    }
  }

  /**
   * Get verification history for badge
   */
  async getVerificationHistory(badgeId: string): Promise<any[]> {
    try {
      const verifications = await prisma.badgeVerification.findMany({
        where: { badgeId },
        orderBy: { createdAt: 'desc' }
      });

      return verifications;
    } catch (error) {
      logger.error('Error getting verification history:', error);
      throw error;
    }
  }

  /**
   * Verify badge metadata integrity
   */
  async verifyMetadataIntegrity(tokenId: number): Promise<boolean> {
    try {
      const badge = await ScrollBadgeService.getBadgeByTokenId(tokenId);

      if (!badge || !badge.metadataUri) {
        return false;
      }

      // Retrieve metadata from IPFS
      const ipfsMetadata = await BadgeMetadataService.retrieveFromIPFS(
        badge.ipfsHash
      );

      // Verify metadata matches badge data
      if (ipfsMetadata.properties.courseId !== badge.courseId) {
        return false;
      }

      if (ipfsMetadata.properties.studentId !== badge.userId) {
        return false;
      }

      if (ipfsMetadata.properties.grade !== badge.grade) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error verifying metadata integrity:', error);
      return false;
    }
  }

  /**
   * Generate verification code
   */
  private generateVerificationCode(): string {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
  }

  /**
   * Check if badge is valid on blockchain
   */
  async isBadgeValidOnBlockchain(tokenId: number): Promise<boolean> {
    try {
      if (!this.contract) {
        return false;
      }

      return await this.contract.isBadgeValid(tokenId);
    } catch (error) {
      logger.error('Error checking badge validity on blockchain:', error);
      return false;
    }
  }
}

export default BadgeVerificationService.getInstance();
