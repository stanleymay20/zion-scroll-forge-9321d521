/**
 * Cost Optimization Type Definitions
 * Supports prompt optimization, caching, batch processing, and budget controls
 */

export interface PromptOptimizationConfig {
  maxTokens: number;
  temperature: number;
  compressionEnabled: boolean;
  useSystemPrompts: boolean;
  removeRedundancy: boolean;
}

export interface OptimizedPrompt {
  original: string;
  optimized: string;
  tokensSaved: number;
  compressionRatio: number;
  estimatedCost: number;
  optimizationTechniques: string[];
}

export interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  template: string;
  variables: string[];
  estimatedTokens: number;
  bestPractices: string[];
}

export interface ABTestResult {
  variantA: string;
  variantB: string;
  variantAPerformance: PerformanceMetrics;
  variantBPerformance: PerformanceMetrics;
  winner: 'A' | 'B' | 'tie';
  confidence: number;
}

export interface PerformanceMetrics {
  averageTokens: number;
  averageCost: number;
  averageQuality: number;
  averageResponseTime: number;
  sampleSize: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'lfu' | 'semantic';
  semanticThreshold?: number;
}

export interface CacheEntry {
  key: string;
  value: any;
  embedding?: number[];
  timestamp: Date;
  hits: number;
  cost: number;
  ttl: number;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  costSaved: number;
  averageResponseTime: number;
  cacheSize: number;
}

export interface BatchRequest {
  id: string;
  service: string;
  requests: any[];
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  estimatedCost: number;
}

export interface BatchResult {
  batchId: string;
  results: any[];
  totalCost: number;
  processingTime: number;
  costSavings: number;
}

export interface BudgetConfig {
  dailyLimit: number;
  monthlyLimit: number;
  perServiceLimits: Record<string, number>;
  alertThresholds: number[];
  throttleThreshold: number;
  emergencyThreshold: number;
}

export interface BudgetStatus {
  currentDailySpend: number;
  currentMonthlySpend: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  percentUsed: number;
  alerts: BudgetAlert[];
  throttled: boolean;
}

export interface BudgetAlert {
  level: 'warning' | 'critical' | 'emergency';
  threshold: number;
  currentSpend: number;
  message: string;
  timestamp: Date;
}

export interface CostForecast {
  period: 'daily' | 'weekly' | 'monthly';
  projectedCost: number;
  confidence: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  recommendations: string[];
}

export interface OptimizationRecommendation {
  type: 'prompt' | 'cache' | 'batch' | 'model';
  service: string;
  currentCost: number;
  projectedSavings: number;
  implementation: string;
  priority: 'low' | 'medium' | 'high';
}
