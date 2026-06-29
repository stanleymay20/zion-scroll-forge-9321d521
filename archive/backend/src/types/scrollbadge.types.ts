/**
 * ScrollBadge NFT Types
 * "By the Spirit of Excellence, we establish verifiable credentials"
 */

export interface ScrollBadgeData {
  id: string;
  tokenId: number;
  userId: string;
  courseId: string;
  courseName: string;
  studentName: string;
  completionDate: Date;
  grade: number;
  credentialType: BadgeCredentialType;
  ipfsHash: string;
  metadataUri: string;
  blockchainTxHash?: string;
  blockNumber?: number;
  isRevoked: boolean;
  revokedReason?: string;
  revokedAt?: Date;
  isPublic: boolean;
  ownerAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum BadgeCredentialType {
  COURSE_COMPLETION = 'COURSE_COMPLETION',
  SKILL_MASTERY = 'SKILL_MASTERY',
  DEGREE_COMPLETION = 'DEGREE_COMPLETION',
  CERTIFICATE = 'CERTIFICATE',
  SPECIALIZATION = 'SPECIALIZATION',
  ACHIEVEMENT = 'ACHIEVEMENT'
}

export interface BadgeMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: BadgeAttribute[];
  properties: BadgeProperties;
}

export interface BadgeAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

export interface BadgeProperties {
  courseId: string;
  courseName: string;
  studentId: string;
  studentName: string;
  completionDate: string;
  grade: number;
  credentialType: string;
  institution: string;
  issuer: string;
  issuedAt: string;
}

export interface MintBadgeRequest {
  userId: string;
  courseId: string;
  grade: number;
  credentialType: BadgeCredentialType;
  isPublic?: boolean;
}

export interface BadgeVerificationRequest {
  tokenId: number;
  verifierAddress?: string;
}

export interface BadgeVerificationResult {
  isValid: boolean;
  badge: ScrollBadgeData;
  blockchainData?: BlockchainBadgeData;
  verifiedAt: Date;
  verifier?: string;
  discrepancies?: string[];
}

export interface BlockchainBadgeData {
  tokenId: number;
  owner: string;
  tokenURI: string;
  isRevoked: boolean;
  metadata: {
    courseId: string;
    courseName: string;
    studentId: string;
    studentName: string;
    completionDate: number;
    grade: number;
    credentialType: string;
    ipfsHash: string;
  };
}

export interface BadgeShareRequest {
  tokenId: number;
  platform: SharePlatform;
  message?: string;
}

export enum SharePlatform {
  LINKEDIN = 'LINKEDIN',
  TWITTER = 'TWITTER',
  FACEBOOK = 'FACEBOOK',
  EMAIL = 'EMAIL',
  CUSTOM = 'CUSTOM'
}

export interface BadgeShareResult {
  shareUrl: string;
  platform: SharePlatform;
  sharedAt: Date;
}

export interface BadgeProfileData {
  userId: string;
  userName: string;
  badges: ScrollBadgeData[];
  totalBadges: number;
  publicBadges: number;
  achievements: BadgeAchievement[];
  profileUrl: string;
}

export interface BadgeAchievement {
  type: string;
  name: string;
  description: string;
  earnedAt: Date;
  badgeCount: number;
}

export interface BadgeListingData {
  id: string;
  tokenId: number;
  badge: ScrollBadgeData;
  sellerId: string;
  sellerAddress: string;
  price: number;
  currency: 'ETH' | 'SCROLL';
  isActive: boolean;
  listedAt: Date;
  expiresAt?: Date;
}

export interface BadgeMarketplaceQuery {
  credentialType?: BadgeCredentialType;
  courseId?: string;
  minGrade?: number;
  maxPrice?: number;
  sortBy?: 'price' | 'grade' | 'date';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface BadgeMarketplaceResponse {
  listings: BadgeListingData[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListBadgeForSaleRequest {
  tokenId: number;
  price: number;
  currency: 'ETH' | 'SCROLL';
  expiresAt?: Date;
}

export interface PurchaseBadgeRequest {
  listingId: string;
  buyerAddress: string;
}

export interface IPFSUploadResult {
  hash: string;
  url: string;
  size: number;
  uploadedAt: Date;
}

export interface BadgeImageGenerationRequest {
  courseName: string;
  studentName: string;
  grade: number;
  completionDate: Date;
  credentialType: BadgeCredentialType;
  template?: string;
}

export interface BadgeImageGenerationResult {
  imageUrl: string;
  ipfsHash: string;
  width: number;
  height: number;
}

export interface BadgeRevocationRequest {
  tokenId: number;
  reason: string;
  revokedBy: string;
}

export interface BadgeStatistics {
  totalBadges: number;
  badgesByType: Record<BadgeCredentialType, number>;
  badgesByCourse: Record<string, number>;
  averageGrade: number;
  recentBadges: ScrollBadgeData[];
  topCourses: Array<{
    courseId: string;
    courseName: string;
    badgeCount: number;
  }>;
}

export interface EmployerVerificationRequest {
  tokenId: number;
  employerName: string;
  employerEmail: string;
  verificationPurpose: string;
}

export interface EmployerVerificationResult {
  isValid: boolean;
  badge: ScrollBadgeData;
  verificationCode: string;
  verifiedAt: Date;
  expiresAt: Date;
}

export interface BadgeTransferRequest {
  tokenId: number;
  fromAddress: string;
  toAddress: string;
  reason?: string;
}

export interface BadgeTransferResult {
  tokenId: number;
  fromAddress: string;
  toAddress: string;
  txHash: string;
  transferredAt: Date;
}

export interface BadgeQueryOptions {
  userId?: string;
  courseId?: string;
  credentialType?: BadgeCredentialType;
  isRevoked?: boolean;
  isPublic?: boolean;
  minGrade?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'completionDate' | 'grade' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface BadgeQueryResult {
  badges: ScrollBadgeData[];
  total: number;
  page: number;
  pageSize: number;
}
