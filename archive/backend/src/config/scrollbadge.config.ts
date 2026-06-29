/**
 * ScrollBadge NFT Configuration
 * "By the Spirit of Excellence, we establish verifiable credentials"
 */

export interface ScrollBadgeConfig {
  // Blockchain settings
  blockchainEnabled: boolean;
  networkName: string;
  rpcUrl: string;
  contractAddress: string;
  contractABI: any[];
  
  // IPFS settings
  ipfsEnabled: boolean;
  ipfsGateway: string;
  ipfsApiUrl: string;
  ipfsApiKey?: string;
  
  // Badge settings
  defaultTemplate: string;
  imageWidth: number;
  imageHeight: number;
  maxBadgesPerUser: number;
  
  // Marketplace settings
  marketplaceEnabled: boolean;
  minListingPrice: number;
  maxListingPrice: number;
  listingDuration: number; // days
  platformFeePercentage: number;
  
  // Verification settings
  verificationCodeExpiry: number; // hours
  publicProfileEnabled: boolean;
  
  // Social sharing
  shareBaseUrl: string;
  linkedInShareEnabled: boolean;
  twitterShareEnabled: boolean;
  facebookShareEnabled: boolean;
}

const scrollBadgeConfig: ScrollBadgeConfig = {
  // Blockchain settings
  blockchainEnabled: process.env.SCROLLBADGE_BLOCKCHAIN_ENABLED === 'true',
  networkName: process.env.SCROLLBADGE_NETWORK_NAME || 'sepolia',
  rpcUrl: process.env.SCROLLBADGE_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
  contractAddress: process.env.SCROLLBADGE_CONTRACT_ADDRESS || '',
  contractABI: [], // Will be loaded from compiled contract
  
  // IPFS settings
  ipfsEnabled: process.env.IPFS_ENABLED === 'true',
  ipfsGateway: process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
  ipfsApiUrl: process.env.IPFS_API_URL || 'https://api.pinata.cloud',
  ipfsApiKey: process.env.IPFS_API_KEY,
  
  // Badge settings
  defaultTemplate: process.env.BADGE_DEFAULT_TEMPLATE || 'standard',
  imageWidth: parseInt(process.env.BADGE_IMAGE_WIDTH || '800', 10),
  imageHeight: parseInt(process.env.BADGE_IMAGE_HEIGHT || '600', 10),
  maxBadgesPerUser: parseInt(process.env.MAX_BADGES_PER_USER || '1000', 10),
  
  // Marketplace settings
  marketplaceEnabled: process.env.BADGE_MARKETPLACE_ENABLED === 'true',
  minListingPrice: parseFloat(process.env.BADGE_MIN_LISTING_PRICE || '0.001'),
  maxListingPrice: parseFloat(process.env.BADGE_MAX_LISTING_PRICE || '10'),
  listingDuration: parseInt(process.env.BADGE_LISTING_DURATION || '30', 10),
  platformFeePercentage: parseFloat(process.env.BADGE_PLATFORM_FEE || '2.5'),
  
  // Verification settings
  verificationCodeExpiry: parseInt(process.env.BADGE_VERIFICATION_EXPIRY || '72', 10),
  publicProfileEnabled: process.env.BADGE_PUBLIC_PROFILE_ENABLED !== 'false',
  
  // Social sharing
  shareBaseUrl: process.env.BADGE_SHARE_BASE_URL || 'https://scrolluniversity.com/badges',
  linkedInShareEnabled: process.env.BADGE_LINKEDIN_SHARE !== 'false',
  twitterShareEnabled: process.env.BADGE_TWITTER_SHARE !== 'false',
  facebookShareEnabled: process.env.BADGE_FACEBOOK_SHARE !== 'false',
};

export default scrollBadgeConfig;
