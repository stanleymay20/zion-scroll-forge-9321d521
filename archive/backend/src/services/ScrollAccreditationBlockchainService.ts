/**
 * ScrollAccreditation Blockchain Service
 * "We establish immutable records of educational achievement on the blockchain,
 * ensuring truth and transparency in global recognition"
 */

import { ethers } from 'ethers';
import { IPFSService } from './IPFSService';

export interface BlockchainCredential {
  credentialId: string;
  studentAddress: string;
  institutionId: string;
  credentialType: CredentialType;
  blockchainHash: string;
  smartContractAddress: string;
  verificationUrl: string;
  issueDate: Date;
  expiryDate?: Date;
  status: CredentialStatus;
  ipfsHash?: string;
  metadata: any;
}

export enum CredentialType {
  SCROLL_TRANSCRIPT = 0,
  DSGEI_DEGREE = 1,
  B_SCROLL_CERTIFICATION = 2,
  COURSE_COMPLETION = 3,
  RESEARCH_PUBLICATION = 4,
  INNOVATION_CERTIFICATE = 5
}

export enum CredentialStatus {
  ACTIVE = 0,
  EXPIRED = 1,
  REVOKED = 2,
  SUSPENDED = 3
}

export enum ValidationStatus {
  PENDING = 0,
  PROPHETIC_APPROVED = 1,
  DATA_SCIENCE_APPROVED = 2,
  BOTH_APPROVED = 3,
  REJECTED = 4
}

export interface AccreditationRecord {
  institutionId: string;
  isAccredited: boolean;
  accreditationDate: Date;
  expiryDate: Date;
  certificateHash: string;
  validationStatus: ValidationStatus;
  propheticValidators: string[];
  dataScienceValidators: string[];
}

export class ScrollAccreditationBlockchainService {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private contract: ethers.Contract;
  private ipfsService: IPFSService;
  private contractAddress: string;

  // Smart contract ABI (simplified for key functions)
  private contractABI = [
    "function issueCredential(string credentialId, address studentAddress, string institutionId, uint8 credentialType, string ipfsHash, uint256 expiryDate, string metadata) external",
    "function propheticValidation(string credentialId, bool approved) external",
    "function dataScienceValidation(string credentialId, bool approved) external",
    "function grantAccreditation(string institutionId, uint256 expiryDate, string certificateHash, address[] propheticValidators, address[] dataScienceValidators) external",
    "function verifyCredential(string credentialId) external view returns (bool isValid, uint8 credentialType, uint8 status, uint8 validationStatus, uint256 issueDate, uint256 expiryDate, string institutionId)",
    "function getStudentCredentials(address studentAddress) external view returns (string[] memory)",
    "function isInstitutionAccredited(string institutionId) external view returns (bool)",
    "function getCredential(string credentialId) external view returns (tuple)",
    "function batchVerifyCredentials(string[] credentialIds) external view returns (bool[] memory)",
    "function revokeCredential(string credentialId, string reason) external",
    "event CredentialIssued(string indexed credentialId, address indexed studentAddress, string institutionId, uint8 credentialType)",
    "event CredentialValidated(string indexed credentialId, address indexed validator, string validatorType, uint8 newStatus)",
    "event AccreditationGranted(string indexed institutionId, uint256 expiryDate, string certificateHash)"
  ];

  constructor() {
    this.initializeBlockchain();
    this.ipfsService = new IPFSService();
  }

  private async initializeBlockchain() {
    try {
      // Initialize provider (Ethereum mainnet, testnet, or local)
      const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      // Initialize signer
      const privateKey = process.env.ETHEREUM_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('ETHEREUM_PRIVATE_KEY environment variable is required');
      }
      this.signer = new ethers.Wallet(privateKey, this.provider);

      // Initialize contract
      this.contractAddress = process.env.SCROLL_CREDENTIAL_CONTRACT_ADDRESS || '';
      if (!this.contractAddress) {
        throw new Error('SCROLL_CREDENTIAL_CONTRACT_ADDRESS environment variable is required');
      }

      this.contract = new ethers.Contract(
        this.contractAddress,
        this.contractABI,
        this.signer
      );

      console.log('Blockchain service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  /**
   * Issue a new credential on the blockchain
   */
  async issueCredential(
    credentialId: string,
    studentAddress: string,
    institutionId: string,
    credentialType: CredentialType,
    credentialData: any,
    expiryDate?: Date
  ): Promise<BlockchainCredential> {
    try {
      // Upload credential data to IPFS
      const ipfsResult = await this.ipfsService.uploadAccreditationDocument({
        id: credentialId,
        metadata: {
          title: `Credential ${credentialId}`,
          type: CredentialType[credentialType],
          institutionId,
          studentId: studentAddress,
          credentialId
        },
        content: Buffer.from(JSON.stringify(credentialData)),
        contentType: 'application/json',
        checksum: this.calculateChecksum(JSON.stringify(credentialData))
      });

      // Issue credential on blockchain
      const expiryTimestamp = expiryDate ? Math.floor(expiryDate.getTime() / 1000) : 0;
      
      const tx = await this.contract.issueCredential(
        credentialId,
        studentAddress,
        institutionId,
        credentialType,
        ipfsResult.hash,
        expiryTimestamp,
        JSON.stringify({ ipfsUrl: ipfsResult.url })
      );

      const receipt = await tx.wait();
      
      return {
        credentialId,
        studentAddress,
        institutionId,
        credentialType,
        blockchainHash: receipt.hash,
        smartContractAddress: this.contractAddress,
        verificationUrl: `${process.env.FRONTEND_URL}/verify/${credentialId}`,
        issueDate: new Date(),
        expiryDate,
        status: CredentialStatus.ACTIVE,
        ipfsHash: ipfsResult.hash,
        metadata: { ipfsUrl: ipfsResult.url, transactionHash: receipt.hash }
      };
    } catch (error) {
      console.error('Error issuing credential:', error);
      throw new Error(`Failed to issue credential: ${error.message}`);
    }
  }

  /**
   * Prophetic validation of credential
   */
  async propheticValidation(
    credentialId: string,
    approved: boolean,
    validatorAddress: string
  ): Promise<void> {
    try {
      // Ensure the signer is the validator
      const validatorSigner = new ethers.Wallet(
        process.env.PROPHETIC_VALIDATOR_PRIVATE_KEY || '',
        this.provider
      );
      
      const validatorContract = this.contract.connect(validatorSigner);
      
      const tx = await validatorContract.propheticValidation(credentialId, approved);
      await tx.wait();
      
      console.log(`Prophetic validation completed for credential ${credentialId}: ${approved}`);
    } catch (error) {
      console.error('Error in prophetic validation:', error);
      throw new Error(`Failed to complete prophetic validation: ${error.message}`);
    }
  }

  /**
   * Data science validation of credential
   */
  async dataScienceValidation(
    credentialId: string,
    approved: boolean,
    validatorAddress: string
  ): Promise<void> {
    try {
      // Ensure the signer is the validator
      const validatorSigner = new ethers.Wallet(
        process.env.DATA_SCIENCE_VALIDATOR_PRIVATE_KEY || '',
        this.provider
      );
      
      const validatorContract = this.contract.connect(validatorSigner);
      
      const tx = await validatorContract.dataScienceValidation(credentialId, approved);
      await tx.wait();
      
      console.log(`Data science validation completed for credential ${credentialId}: ${approved}`);
    } catch (error) {
      console.error('Error in data science validation:', error);
      throw new Error(`Failed to complete data science validation: ${error.message}`);
    }
  }

  /**
   * Grant accreditation to an institution
   */
  async grantAccreditation(
    institutionId: string,
    expiryDate: Date,
    certificateHash: string,
    propheticValidators: string[],
    dataScienceValidators: string[]
  ): Promise<void> {
    try {
      const expiryTimestamp = Math.floor(expiryDate.getTime() / 1000);
      
      const tx = await this.contract.grantAccreditation(
        institutionId,
        expiryTimestamp,
        certificateHash,
        propheticValidators,
        dataScienceValidators
      );
      
      await tx.wait();
      console.log(`Accreditation granted to institution ${institutionId}`);
    } catch (error) {
      console.error('Error granting accreditation:', error);
      throw new Error(`Failed to grant accreditation: ${error.message}`);
    }
  }

  /**
   * Verify a credential on the blockchain
   */
  async verifyCredential(credentialId: string): Promise<{
    isValid: boolean;
    credentialType: CredentialType;
    status: CredentialStatus;
    validationStatus: ValidationStatus;
    issueDate: Date;
    expiryDate?: Date;
    institutionId: string;
  }> {
    try {
      const result = await this.contract.verifyCredential(credentialId);
      
      return {
        isValid: result.isValid,
        credentialType: result.credentialType,
        status: result.status,
        validationStatus: result.validationStatus,
        issueDate: new Date(Number(result.issueDate) * 1000),
        expiryDate: result.expiryDate > 0 ? new Date(Number(result.expiryDate) * 1000) : undefined,
        institutionId: result.institutionId
      };
    } catch (error) {
      console.error('Error verifying credential:', error);
      throw new Error(`Failed to verify credential: ${error.message}`);
    }
  }

  /**
   * Get all credentials for a student
   */
  async getStudentCredentials(studentAddress: string): Promise<string[]> {
    try {
      return await this.contract.getStudentCredentials(studentAddress);
    } catch (error) {
      console.error('Error getting student credentials:', error);
      throw new Error(`Failed to get student credentials: ${error.message}`);
    }
  }

  /**
   * Check if institution is accredited
   */
  async isInstitutionAccredited(institutionId: string): Promise<boolean> {
    try {
      return await this.contract.isInstitutionAccredited(institutionId);
    } catch (error) {
      console.error('Error checking institution accreditation:', error);
      throw new Error(`Failed to check institution accreditation: ${error.message}`);
    }
  }

  /**
   * Batch verify multiple credentials
   */
  async batchVerifyCredentials(credentialIds: string[]): Promise<boolean[]> {
    try {
      return await this.contract.batchVerifyCredentials(credentialIds);
    } catch (error) {
      console.error('Error batch verifying credentials:', error);
      throw new Error(`Failed to batch verify credentials: ${error.message}`);
    }
  }

  /**
   * Revoke a credential
   */
  async revokeCredential(credentialId: string, reason: string): Promise<void> {
    try {
      const tx = await this.contract.revokeCredential(credentialId, reason);
      await tx.wait();
      console.log(`Credential ${credentialId} revoked: ${reason}`);
    } catch (error) {
      console.error('Error revoking credential:', error);
      throw new Error(`Failed to revoke credential: ${error.message}`);
    }
  }

  /**
   * Get detailed credential information
   */
  async getCredentialDetails(credentialId: string): Promise<any> {
    try {
      const credential = await this.contract.getCredential(credentialId);
      
      // Retrieve additional data from IPFS if available
      let ipfsData = null;
      if (credential.ipfsHash) {
        try {
          ipfsData = await this.ipfsService.retrieveDocument(credential.ipfsHash);
        } catch (ipfsError) {
          console.warn('Could not retrieve IPFS data:', ipfsError);
        }
      }

      return {
        ...credential,
        ipfsData
      };
    } catch (error) {
      console.error('Error getting credential details:', error);
      throw new Error(`Failed to get credential details: ${error.message}`);
    }
  }

  /**
   * Generate verification URL for public verification
   */
  generateVerificationUrl(credentialId: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://scrolluniversity.com';
    return `${baseUrl}/verify/${credentialId}`;
  }

  /**
   * Listen for blockchain events
   */
  setupEventListeners(): void {
    // Listen for credential issuance events
    this.contract.on('CredentialIssued', (credentialId, studentAddress, institutionId, credentialType) => {
      console.log('Credential issued:', {
        credentialId,
        studentAddress,
        institutionId,
        credentialType: CredentialType[credentialType]
      });
    });

    // Listen for validation events
    this.contract.on('CredentialValidated', (credentialId, validator, validatorType, newStatus) => {
      console.log('Credential validated:', {
        credentialId,
        validator,
        validatorType,
        newStatus: ValidationStatus[newStatus]
      });
    });

    // Listen for accreditation events
    this.contract.on('AccreditationGranted', (institutionId, expiryDate, certificateHash) => {
      console.log('Accreditation granted:', {
        institutionId,
        expiryDate: new Date(Number(expiryDate) * 1000),
        certificateHash
      });
    });
  }

  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(data: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  }

  /**
   * Health check for blockchain connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      return blockNumber > 0;
    } catch (error) {
      console.error('Blockchain health check failed:', error);
      return false;
    }
  }
}