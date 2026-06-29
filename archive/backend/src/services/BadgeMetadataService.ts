/**
 * Badge Metadata Generation Service
 * "By the Spirit of Creativity, we craft beautiful and meaningful credentials"
 * 
 * Service for generating badge metadata, images, and uploading to IPFS.
 */

import { logger } from '../utils/logger';
import scrollBadgeConfig from '../config/scrollbadge.config';
import {
  BadgeMetadata,
  BadgeAttribute,
  BadgeProperties,
  BadgeImageGenerationRequest,
  BadgeImageGenerationResult,
  IPFSUploadResult,
  ScrollBadgeData
} from '../types/scrollbadge.types';
import axios from 'axios';

export class BadgeMetadataService {
  private static instance: BadgeMetadataService;

  private constructor() {}

  public static getInstance(): BadgeMetadataService {
    if (!BadgeMetadataService.instance) {
      BadgeMetadataService.instance = new BadgeMetadataService();
    }
    return BadgeMetadataService.instance;
  }

  /**
   * Generate badge metadata
   */
  async generateMetadata(badge: ScrollBadgeData): Promise<BadgeMetadata> {
    try {
      logger.info('Generating badge metadata', { badgeId: badge.id });

      const attributes: BadgeAttribute[] = [
        {
          trait_type: 'Course',
          value: badge.courseName
        },
        {
          trait_type: 'Grade',
          value: badge.grade,
          display_type: 'number'
        },
        {
          trait_type: 'Completion Date',
          value: badge.completionDate.toISOString().split('T')[0]
        },
        {
          trait_type: 'Credential Type',
          value: badge.credentialType
        },
        {
          trait_type: 'Institution',
          value: 'ScrollUniversity'
        }
      ];

      // Add grade level attribute
      if (badge.grade >= 90) {
        attributes.push({
          trait_type: 'Achievement Level',
          value: 'Excellent'
        });
      } else if (badge.grade >= 80) {
        attributes.push({
          trait_type: 'Achievement Level',
          value: 'Very Good'
        });
      } else if (badge.grade >= 70) {
        attributes.push({
          trait_type: 'Achievement Level',
          value: 'Good'
        });
      } else {
        attributes.push({
          trait_type: 'Achievement Level',
          value: 'Pass'
        });
      }

      const properties: BadgeProperties = {
        courseId: badge.courseId,
        courseName: badge.courseName,
        studentId: badge.userId,
        studentName: badge.studentName,
        completionDate: badge.completionDate.toISOString(),
        grade: badge.grade,
        credentialType: badge.credentialType,
        institution: 'ScrollUniversity',
        issuer: 'ScrollUniversity Academic Board',
        issuedAt: badge.createdAt.toISOString()
      };

      const imageUrl = badge.ipfsHash 
        ? `${scrollBadgeConfig.ipfsGateway}${badge.ipfsHash}`
        : this.getPlaceholderImageUrl(badge);

      const metadata: BadgeMetadata = {
        name: `${badge.courseName} - Completion Badge`,
        description: `This badge certifies that ${badge.studentName} has successfully completed ${badge.courseName} at ScrollUniversity with a grade of ${badge.grade}%. Issued on ${badge.completionDate.toLocaleDateString()}.`,
        image: imageUrl,
        external_url: `${scrollBadgeConfig.shareBaseUrl}/${badge.tokenId}`,
        attributes,
        properties
      };

      logger.info('Badge metadata generated', { badgeId: badge.id });

      return metadata;
    } catch (error) {
      logger.error('Error generating badge metadata:', error);
      throw error;
    }
  }

  /**
   * Generate badge image
   */
  async generateBadgeImage(
    request: BadgeImageGenerationRequest
  ): Promise<BadgeImageGenerationResult> {
    try {
      logger.info('Generating badge image', { request });

      // In a real implementation, this would use a graphics library like Canvas or Sharp
      // to generate a custom badge image. For now, we'll use a placeholder approach.

      const imageData = await this.createBadgeImageData(request);
      
      // Upload to IPFS
      const ipfsResult = await this.uploadToIPFS(imageData, 'badge-image.png');

      return {
        imageUrl: `${scrollBadgeConfig.ipfsGateway}${ipfsResult.hash}`,
        ipfsHash: ipfsResult.hash,
        width: scrollBadgeConfig.imageWidth,
        height: scrollBadgeConfig.imageHeight
      };
    } catch (error) {
      logger.error('Error generating badge image:', error);
      throw error;
    }
  }

  /**
   * Upload data to IPFS
   */
  async uploadToIPFS(
    data: any,
    filename: string
  ): Promise<IPFSUploadResult> {
    try {
      if (!scrollBadgeConfig.ipfsEnabled) {
        logger.warn('IPFS disabled, using mock hash');
        return {
          hash: `mock-${Date.now()}`,
          url: `${scrollBadgeConfig.ipfsGateway}mock-${Date.now()}`,
          size: JSON.stringify(data).length,
          uploadedAt: new Date()
        };
      }

      logger.info('Uploading to IPFS', { filename });

      // Using Pinata API as an example
      const formData = new FormData();
      
      if (typeof data === 'string' || Buffer.isBuffer(data)) {
        const blob = new Blob([data], { type: 'application/octet-stream' });
        formData.append('file', blob, filename);
      } else {
        const jsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        formData.append('file', jsonBlob, filename);
      }

      const response = await axios.post(
        `${scrollBadgeConfig.ipfsApiUrl}/pinning/pinFileToIPFS`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${scrollBadgeConfig.ipfsApiKey}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const hash = response.data.IpfsHash;
      const url = `${scrollBadgeConfig.ipfsGateway}${hash}`;

      logger.info('Uploaded to IPFS successfully', { hash, url });

      return {
        hash,
        url,
        size: response.data.PinSize || 0,
        uploadedAt: new Date()
      };
    } catch (error) {
      logger.error('Error uploading to IPFS:', error);
      
      // Fallback to mock for development
      return {
        hash: `mock-${Date.now()}`,
        url: `${scrollBadgeConfig.ipfsGateway}mock-${Date.now()}`,
        size: JSON.stringify(data).length,
        uploadedAt: new Date()
      };
    }
  }

  /**
   * Upload metadata to IPFS
   */
  async uploadMetadataToIPFS(metadata: BadgeMetadata): Promise<IPFSUploadResult> {
    try {
      return await this.uploadToIPFS(metadata, 'metadata.json');
    } catch (error) {
      logger.error('Error uploading metadata to IPFS:', error);
      throw error;
    }
  }

  /**
   * Retrieve data from IPFS
   */
  async retrieveFromIPFS(hash: string): Promise<any> {
    try {
      logger.info('Retrieving from IPFS', { hash });

      const url = `${scrollBadgeConfig.ipfsGateway}${hash}`;
      const response = await axios.get(url);

      return response.data;
    } catch (error) {
      logger.error('Error retrieving from IPFS:', error);
      throw error;
    }
  }

  /**
   * Create badge image data (placeholder implementation)
   */
  private async createBadgeImageData(
    request: BadgeImageGenerationRequest
  ): Promise<Buffer> {
    // In a real implementation, this would use Canvas or Sharp to create an image
    // For now, return a simple SVG as a placeholder
    
    const svg = `
      <svg width="${scrollBadgeConfig.imageWidth}" height="${scrollBadgeConfig.imageHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
        <text x="50%" y="30%" text-anchor="middle" fill="white" font-size="32" font-weight="bold">
          ScrollUniversity
        </text>
        <text x="50%" y="45%" text-anchor="middle" fill="white" font-size="24">
          Certificate of Completion
        </text>
        <text x="50%" y="60%" text-anchor="middle" fill="white" font-size="20">
          ${request.courseName}
        </text>
        <text x="50%" y="70%" text-anchor="middle" fill="white" font-size="18">
          ${request.studentName}
        </text>
        <text x="50%" y="80%" text-anchor="middle" fill="white" font-size="16">
          Grade: ${request.grade}%
        </text>
        <text x="50%" y="90%" text-anchor="middle" fill="white" font-size="14">
          ${request.completionDate.toLocaleDateString()}
        </text>
      </svg>
    `;

    return Buffer.from(svg);
  }

  /**
   * Get placeholder image URL
   */
  private getPlaceholderImageUrl(badge: ScrollBadgeData): string {
    return `${scrollBadgeConfig.shareBaseUrl}/placeholder/${badge.tokenId}.png`;
  }

  /**
   * Generate token URI for NFT
   */
  async generateTokenURI(badge: ScrollBadgeData): Promise<string> {
    try {
      // Generate metadata
      const metadata = await this.generateMetadata(badge);

      // Upload metadata to IPFS
      const ipfsResult = await this.uploadMetadataToIPFS(metadata);

      return ipfsResult.url;
    } catch (error) {
      logger.error('Error generating token URI:', error);
      throw error;
    }
  }
}

export default BadgeMetadataService.getInstance();
