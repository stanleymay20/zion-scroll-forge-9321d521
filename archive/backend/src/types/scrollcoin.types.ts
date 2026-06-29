/**
 * ScrollCoin Blockchain Integration Types
 * "By the Spirit of Wisdom, we establish a kingdom economy"
 */

export interface ScrollCoinWalletData {
  id: string;
  userId: string;
  address: string;
  publicKey: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  isActive: boolean;
  isBlacklisted: boolean;
  isWhitelisted: boolean;
  dailyTransferLimit: number;
  maxTransactionAmount: number;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
}

export interface ScrollCoinTransactionData {
  id: string;
  userId: string;
  amount: number;
  type: ScrollCoinTransactionType;
  status: TransactionStatus;
  blockchainTxHash?: string;
  blockNumber?: number;
  gasUsed?: number;
  reason: string;
  referenceId?: string;
  rewardId?: string;
  fromAddress?: string;
  toAddress?: string;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
}

export enum ScrollCoinTransactionType {
  MINT = 'MINT',
  BURN = 'BURN',
  TRANSFER = 'TRANSFER',
  REWARD = 'REWARD',
  PURCHASE = 'PURCHASE',
  REFUND = 'REFUND'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export interface MintRewardRequest {
  userId: string;
  amount: number;
  reason: string;
  referenceId?: string;
  rewardId: string;
}

export interface TransferRequest {
  fromUserId: string;
  toUserId: string;
  amount: number;
  reason?: string;
}

export interface BurnRequest {
  userId: string;
  amount: number;
  reason: string;
  referenceId?: string;
}

export interface BlockchainTransactionReceipt {
  txHash: string;
  blockNumber: number;
  gasUsed: number;
  status: 'success' | 'failed';
  timestamp: Date;
}

export interface ExchangeRateData {
  id: string;
  rateToUSD: number;
  rateFromUSD: number;
  source: string;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export interface RewardRuleData {
  id: string;
  name: string;
  description: string;
  eventType: string;
  rewardAmount: number;
  conditions?: any;
  isActive: boolean;
  priority: number;
}

export interface FraudAlertData {
  id: string;
  userId?: string;
  alertType: FraudAlertType;
  severity: FraudSeverity;
  description: string;
  transactionId?: string;
  amount?: number;
  suspiciousPattern?: string;
  status: AlertStatus;
  reviewedBy?: string;
  reviewNotes?: string;
  detectedAt: Date;
  reviewedAt?: Date;
  resolvedAt?: Date;
}

export enum FraudAlertType {
  SUSPICIOUS_AMOUNT = 'SUSPICIOUS_AMOUNT',
  RAPID_TRANSACTIONS = 'RAPID_TRANSACTIONS',
  UNUSUAL_PATTERN = 'UNUSUAL_PATTERN',
  BLACKLISTED_ADDRESS = 'BLACKLISTED_ADDRESS',
  DUPLICATE_REWARD = 'DUPLICATE_REWARD',
  DAILY_LIMIT_EXCEEDED = 'DAILY_LIMIT_EXCEEDED'
}

export enum FraudSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum AlertStatus {
  PENDING = 'PENDING',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
  CONFIRMED_FRAUD = 'CONFIRMED_FRAUD'
}

export interface WalletCreationRequest {
  userId: string;
}

export interface WalletBalanceResponse {
  address: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  netRewards: number;
}

export interface TransactionHistoryQuery {
  userId?: string;
  address?: string;
  type?: ScrollCoinTransactionType;
  status?: TransactionStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface TransactionHistoryResponse {
  transactions: ScrollCoinTransactionData[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ExchangeRateConversion {
  scrollCoinAmount: number;
  usdAmount: number;
  rate: number;
  timestamp: Date;
}

export interface FraudCheckResult {
  isValid: boolean;
  alerts: FraudAlertData[];
  canProceed: boolean;
  reason?: string;
}

export interface WalletSecuritySettings {
  dailyTransferLimit: number;
  maxTransactionAmount: number;
  isWhitelisted: boolean;
  isBlacklisted: boolean;
}

export interface BlockchainNetworkStatus {
  isConnected: boolean;
  blockNumber: number;
  networkName: string;
  gasPrice: string;
  contractAddress: string;
}

export interface GasEstimate {
  gasLimit: number;
  gasPrice: string;
  estimatedCost: string;
  estimatedCostUSD: number;
}

export interface RewardEligibility {
  isEligible: boolean;
  reason?: string;
  estimatedReward: number;
  conditions: string[];
}

export interface TransactionVerification {
  isValid: boolean;
  transaction: ScrollCoinTransactionData;
  blockchainData?: BlockchainTransactionReceipt;
  discrepancies?: string[];
}
