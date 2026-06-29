/**
 * ScrollCoin Blockchain Configuration
 * "By the Spirit of Wisdom, we configure the divine economy"
 */

export interface ScrollCoinConfig {
  // Blockchain Network
  networkName: string;
  rpcUrl: string;
  chainId: number;
  
  // Smart Contract
  contractAddress: string;
  contractABI: any[];
  
  // Gas Settings
  gasLimit: number;
  gasPrice: string;
  maxGasPrice: string;
  
  // Transaction Limits
  maxTransactionAmount: number;
  dailyTransferLimit: number;
  
  // Exchange Rate
  defaultExchangeRate: number; // ScrollCoin to USD
  
  // Fraud Prevention
  fraudDetectionEnabled: boolean;
  suspiciousAmountThreshold: number;
  rapidTransactionWindow: number; // seconds
  rapidTransactionLimit: number;
  
  // Wallet Security
  encryptionAlgorithm: string;
  keyDerivationIterations: number;
  
  // Features
  blockchainEnabled: boolean;
  autoSyncEnabled: boolean;
  syncInterval: number; // milliseconds
  
  // Reward Rules
  courseCompletionReward: number;
  assignmentSubmissionReward: number;
  peerTutoringReward: number;
  communityContributionReward: number;
  
  // API Settings
  apiTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

const scrollCoinConfig: ScrollCoinConfig = {
  // Blockchain Network
  networkName: process.env.SCROLLCOIN_NETWORK_NAME || 'ScrollChain Testnet',
  rpcUrl: process.env.SCROLLCOIN_RPC_URL || 'https://scroll-testnet.rpc.url',
  chainId: parseInt(process.env.SCROLLCOIN_CHAIN_ID || '534351'), // Scroll Sepolia Testnet
  
  // Smart Contract
  contractAddress: process.env.SCROLLCOIN_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  contractABI: [], // Will be loaded from compiled contract
  
  // Gas Settings
  gasLimit: parseInt(process.env.SCROLLCOIN_GAS_LIMIT || '100000'),
  gasPrice: process.env.SCROLLCOIN_GAS_PRICE || '20000000000', // 20 Gwei
  maxGasPrice: process.env.SCROLLCOIN_MAX_GAS_PRICE || '100000000000', // 100 Gwei
  
  // Transaction Limits
  maxTransactionAmount: parseFloat(process.env.SCROLLCOIN_MAX_TRANSACTION || '10000'),
  dailyTransferLimit: parseFloat(process.env.SCROLLCOIN_DAILY_LIMIT || '50000'),
  
  // Exchange Rate
  defaultExchangeRate: parseFloat(process.env.SCROLLCOIN_DEFAULT_RATE || '1.0'), // 1 ScrollCoin = $1 USD
  
  // Fraud Prevention
  fraudDetectionEnabled: process.env.SCROLLCOIN_FRAUD_DETECTION !== 'false',
  suspiciousAmountThreshold: parseFloat(process.env.SCROLLCOIN_SUSPICIOUS_THRESHOLD || '5000'),
  rapidTransactionWindow: parseInt(process.env.SCROLLCOIN_RAPID_WINDOW || '300'), // 5 minutes
  rapidTransactionLimit: parseInt(process.env.SCROLLCOIN_RAPID_LIMIT || '10'),
  
  // Wallet Security
  encryptionAlgorithm: 'aes-256-gcm',
  keyDerivationIterations: 100000,
  
  // Features
  blockchainEnabled: process.env.SCROLLCOIN_BLOCKCHAIN_ENABLED === 'true',
  autoSyncEnabled: process.env.SCROLLCOIN_AUTO_SYNC !== 'false',
  syncInterval: parseInt(process.env.SCROLLCOIN_SYNC_INTERVAL || '60000'), // 1 minute
  
  // Reward Rules
  courseCompletionReward: parseFloat(process.env.SCROLLCOIN_COURSE_REWARD || '100'),
  assignmentSubmissionReward: parseFloat(process.env.SCROLLCOIN_ASSIGNMENT_REWARD || '10'),
  peerTutoringReward: parseFloat(process.env.SCROLLCOIN_TUTORING_REWARD || '25'),
  communityContributionReward: parseFloat(process.env.SCROLLCOIN_COMMUNITY_REWARD || '5'),
  
  // API Settings
  apiTimeout: parseInt(process.env.SCROLLCOIN_API_TIMEOUT || '30000'), // 30 seconds
  retryAttempts: parseInt(process.env.SCROLLCOIN_RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.SCROLLCOIN_RETRY_DELAY || '1000'), // 1 second
};

export default scrollCoinConfig;

// Helper functions
export function getScrollCoinConfig(): ScrollCoinConfig {
  return scrollCoinConfig;
}

export function isBlockchainEnabled(): boolean {
  return scrollCoinConfig.blockchainEnabled;
}

export function getExchangeRate(): number {
  return scrollCoinConfig.defaultExchangeRate;
}

export function convertScrollCoinToUSD(amount: number): number {
  return amount * scrollCoinConfig.defaultExchangeRate;
}

export function convertUSDToScrollCoin(amount: number): number {
  return amount / scrollCoinConfig.defaultExchangeRate;
}

export function getRewardAmount(eventType: string): number {
  switch (eventType) {
    case 'COURSE_COMPLETION':
      return scrollCoinConfig.courseCompletionReward;
    case 'ASSIGNMENT_SUBMISSION':
      return scrollCoinConfig.assignmentSubmissionReward;
    case 'PEER_TUTORING':
      return scrollCoinConfig.peerTutoringReward;
    case 'COMMUNITY_CONTRIBUTION':
      return scrollCoinConfig.communityContributionReward;
    default:
      return 0;
  }
}

export function isFraudDetectionEnabled(): boolean {
  return scrollCoinConfig.fraudDetectionEnabled;
}

export function getSuspiciousAmountThreshold(): number {
  return scrollCoinConfig.suspiciousAmountThreshold;
}

export function getRapidTransactionLimits(): { window: number; limit: number } {
  return {
    window: scrollCoinConfig.rapidTransactionWindow,
    limit: scrollCoinConfig.rapidTransactionLimit
  };
}
