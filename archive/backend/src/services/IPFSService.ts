/**
 * IPFS Integration Service for ScrollAccreditation System
 * "We store evidence and documents in distributed networks, 
 * ensuring permanence and accessibility across nations"
 */

import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { Buffer } from 'buffer';
import crypto from 'crypto';

export interface IPFSUploadResult {
  hash: string;
  url: string;
  size: number;
  timestamp: Date;
}

export interface DocumentMetadata {
  title: string;
  type: string;
  description?: string;
  tags?: string[];
  institutionId?: string;
  studentId?: string;
  credentialId?: string;
  version?: string;
}

export interface AccreditationDocument {
  id: string;
  metadata: DocumentMetadata;
  content: Buffer | string;
  contentType: string;
  checksum: string;
}

export class IPFSService {
  private client: IPFSHTTPClient;
  private gatewayUrl: string;

  constructor() {
    // Initialize IPFS client with multiple gateways for redundancy
    this.client = create({
      host: process.env.IPFS_HOST || 'localhost',
      port: parseInt(process.env.IPFS_PORT || '5001'),
      protocol: process.env.IPFS_PROTOCOL || 'http',
      headers: {
        authorization: process.env.IPFS_AUTH_TOKEN ? 
          `Bearer ${process.env.IPFS_AUTH_TOKEN}` : undefined
      }
    });

    this.gatewayUrl = process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs/';
  }

  /**
   * Upload accreditation document to IPFS
   */
  async uploadAccreditationDocument(
    document: AccreditationDocument
  ): Promise<IPFSUploadResult> {
    try {
      // Create document package with metadata
      const documentPackage = {
        metadata: {
          ...document.metadata,
          uploadedAt: new Date().toISOString(),
          checksum: document.checksum,
          contentType: document.contentType
        },
        content: document.content.toString('base64')
      };

      // Convert to buffer
      const buffer = Buffer.from(JSON.stringify(documentPackage));

      // Upload to IPFS
      const result = await this.client.add(buffer, {
        pin: true, // Pin to ensure persistence
        cidVersion: 1,
        hashAlg: 'sha2-256'
      });

      const ipfsUrl = `${this.gatewayUrl}${result.cid.toString()}`;

      return {
        hash: result.cid.toString(),
        url: ipfsUrl,
        size: result.size,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      throw new Error(`Failed to upload document to IPFS: ${error.message}`);
    }
  }

  /**
   * Upload ScrollTranscript evidence to IPFS
   */
  async uploadTranscriptEvidence(
    studentId: string,
    transcriptData: any,
    supportingDocuments: Buffer[]
  ): Promise<IPFSUploadResult> {
    try {
      const evidence = {
        studentId,
        transcriptData,
        supportingDocuments: supportingDocuments.map(doc => doc.toString('base64')),
        uploadedAt: new Date().toISOString(),
        checksum: this.calculateChecksum(JSON.stringify(transcriptData))
      };

      const buffer = Buffer.from(JSON.stringify(evidence));
      
      const result = await this.client.add(buffer, {
        pin: true,
        cidVersion: 1
      });

      return {
        hash: result.cid.toString(),
        url: `${this.gatewayUrl}${result.cid.toString()}`,
        size: result.size,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error uploading transcript evidence:', error);
      throw new Error(`Failed to upload transcript evidence: ${error.message}`);
    }
  }

  /**
   * Upload research project data to IPFS
   */
  async uploadResearchProject(
    projectId: string,
    researchData: any,
    datasets: Buffer[],
    publications: Buffer[]
  ): Promise<IPFSUploadResult> {
    try {
      const researchPackage = {
        projectId,
        researchData,
        datasets: datasets.map(data => data.toString('base64')),
        publications: publications.map(pub => pub.toString('base64')),
        uploadedAt: new Date().toISOString(),
        checksum: this.calculateChecksum(JSON.stringify(researchData))
      };

      const buffer = Buffer.from(JSON.stringify(researchPackage));
      
      const result = await this.client.add(buffer, {
        pin: true,
        cidVersion: 1
      });

      return {
        hash: result.cid.toString(),
        url: `${this.gatewayUrl}${result.cid.toString()}`,
        size: result.size,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error uploading research project:', error);
      throw new Error(`Failed to upload research project: ${error.message}`);
    }
  }

  /**
   * Upload faculty avatar training data to IPFS
   */
  async uploadAvatarTrainingData(
    avatarId: string,
    trainingData: any,
    voiceModels: Buffer[],
    knowledgeBase: Buffer[]
  ): Promise<IPFSUploadResult> {
    try {
      const avatarPackage = {
        avatarId,
        trainingData,
        voiceModels: voiceModels.map(model => model.toString('base64')),
        knowledgeBase: knowledgeBase.map(kb => kb.toString('base64')),
        uploadedAt: new Date().toISOString(),
        checksum: this.calculateChecksum(JSON.stringify(trainingData))
      };

      const buffer = Buffer.from(JSON.stringify(avatarPackage));
      
      const result = await this.client.add(buffer, {
        pin: true,
        cidVersion: 1
      });

      return {
        hash: result.cid.toString(),
        url: `${this.gatewayUrl}${result.cid.toString()}`,
        size: result.size,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error uploading avatar training data:', error);
      throw new Error(`Failed to upload avatar training data: ${error.message}`);
    }
  }

  /**
   * Retrieve document from IPFS
   */
  async retrieveDocument(ipfsHash: string): Promise<any> {
    try {
      const chunks = [];
      for await (const chunk of this.client.cat(ipfsHash)) {
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      return JSON.parse(buffer.toString());
    } catch (error) {
      console.error('Error retrieving from IPFS:', error);
      throw new Error(`Failed to retrieve document from IPFS: ${error.message}`);
    }
  }

  /**
   * Verify document integrity
   */
  async verifyDocumentIntegrity(
    ipfsHash: string,
    expectedChecksum: string
  ): Promise<boolean> {
    try {
      const document = await this.retrieveDocument(ipfsHash);
      const actualChecksum = this.calculateChecksum(JSON.stringify(document.content));
      return actualChecksum === expectedChecksum;
    } catch (error) {
      console.error('Error verifying document integrity:', error);
      return false;
    }
  }

  /**
   * Pin document to ensure persistence
   */
  async pinDocument(ipfsHash: string): Promise<void> {
    try {
      await this.client.pin.add(ipfsHash);
    } catch (error) {
      console.error('Error pinning document:', error);
      throw new Error(`Failed to pin document: ${error.message}`);
    }
  }

  /**
   * Unpin document (use with caution)
   */
  async unpinDocument(ipfsHash: string): Promise<void> {
    try {
      await this.client.pin.rm(ipfsHash);
    } catch (error) {
      console.error('Error unpinning document:', error);
      throw new Error(`Failed to unpin document: ${error.message}`);
    }
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(ipfsHash: string): Promise<any> {
    try {
      const stats = await this.client.object.stat(ipfsHash);
      return {
        hash: ipfsHash,
        size: stats.CumulativeSize,
        links: stats.NumLinks,
        blockSize: stats.BlockSize,
        dataSize: stats.DataSize
      };
    } catch (error) {
      console.error('Error getting document stats:', error);
      throw new Error(`Failed to get document stats: ${error.message}`);
    }
  }

  /**
   * Create directory structure for organized storage
   */
  async createDirectory(
    directoryName: string,
    files: { name: string; content: Buffer }[]
  ): Promise<IPFSUploadResult> {
    try {
      const directory = [];
      
      for (const file of files) {
        directory.push({
          path: `${directoryName}/${file.name}`,
          content: file.content
        });
      }

      const results = [];
      for await (const result of this.client.addAll(directory, {
        pin: true,
        cidVersion: 1,
        wrapWithDirectory: true
      })) {
        results.push(result);
      }

      // Return the directory hash (last result)
      const directoryResult = results[results.length - 1];
      
      return {
        hash: directoryResult.cid.toString(),
        url: `${this.gatewayUrl}${directoryResult.cid.toString()}`,
        size: directoryResult.size,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error creating directory:', error);
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  }

  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate public gateway URLs for multiple gateways
   */
  getPublicUrls(ipfsHash: string): string[] {
    const gateways = [
      'https://ipfs.io/ipfs/',
      'https://gateway.pinata.cloud/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://dweb.link/ipfs/'
    ];

    return gateways.map(gateway => `${gateway}${ipfsHash}`);
  }

  /**
   * Health check for IPFS connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const id = await this.client.id();
      return !!id;
    } catch (error) {
      console.error('IPFS health check failed:', error);
      return false;
    }
  }
}