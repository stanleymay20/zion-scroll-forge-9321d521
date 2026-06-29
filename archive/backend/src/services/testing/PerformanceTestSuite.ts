/**
 * ScrollUniversity Performance Test Suite
 * High-volume application processing performance testing
 */

import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';

export interface PerformanceTestConfig {
  thresholds: PerformanceThresholds;
  monitoring: boolean;
  reportingInterval?: number;
}

export interface PerformanceThresholds {
  applicationProcessingTime: number;
  assessmentEvaluationTime: number;
  decisionProcessingTime: number;
  concurrentApplications: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface PerformanceScenario {
  name: string;
  concurrentUsers: number;
  duration: number;
  rampUp: number;
  operations?: PerformanceOperation[];
}

export interface PerformanceOperation {
  name: string;
  weight: number; // Percentage of operations
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: any;
  expectedResponseTime: number;
}

export interface PerformanceTestResults {
  scenarios: PerformanceScenarioResult[];
  overallScore: number;
  averageResponseTime: number;
  throughput: number;
  errorRate: number;
  resourceUsage: ResourceUsage;
  recommendations: string[];
}

export interface PerformanceScenarioResult {
  name: string;
  responseTime: number;
  throughput: number;
  errorRate: number;
  passed: boolean;
  details: OperationResult[];
  resourceUsage: ResourceUsage;
}

export interface OperationResult {
  name: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  errorRate: number;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

export class PerformanceTestSuite extends EventEmitter {
  private config: PerformanceTestConfig;
  private isRunning: boolean = false;
  private currentScenario: string | null = null;
  private metrics: Map<string, any[]> = new Map();

  constructor(config: PerformanceTestConfig) {
    super();
    this.config = config;
  }

  /**
   * Run performance test scenarios
   */
  async runScenarios(scenarios: PerformanceScenario[]): Promise<PerformanceTestResults> {
    this.isRunning = true;
    const results: PerformanceTestResults = {
      scenarios: [],
      overallScore: 0,
      averageResponseTime: 0,
      throughput: 0,
      errorRate: 0,
      resourceUsage: { cpu: 0, memory: 0, disk: 0, network: 0 },
      recommendations: []
    };

    try {
      for (const scenario of scenarios) {
        this.currentScenario = scenario.name;
        this.emit('scenarioStart', scenario.name);
        
        const scenarioResult = await this.runScenario(scenario);
        results.scenarios.push(scenarioResult);
        
        this.emit('scenarioComplete', scenario.name, scenarioResult);
      }

      // Calculate overall metrics
      results.overallScore = this.calculateOverallScore(results.scenarios);
      results.averageResponseTime = this.calculateAverageResponseTime(results.scenarios);
      results.throughput = this.calculateOverallThroughput(results.scenarios);
      results.errorRate = this.calculateOverallErrorRate(results.scenarios);
      results.resourceUsage = this.calculateAverageResourceUsage(results.scenarios);
      results.recommendations = this.generateRecommendations(results);

      return results;
      
    } finally {
      this.isRunning = false;
      this.currentScenario = null;
    }
  }

  /**
   * Run a single performance scenario
   */
  private async runScenario(scenario: PerformanceScenario): Promise<PerformanceScenarioResult> {
    const startTime = performance.now();
    const operations = scenario.operations || this.getDefaultOperations();
    const results: OperationResult[] = [];
    
    // Start resource monitoring
    const resourceMonitor = this.startResourceMonitoring();
    
    try {
      // Ramp up phase
      await this.rampUp(scenario.concurrentUsers, scenario.rampUp);
      
      // Main test phase
      const testPromises: Promise<OperationResult>[] = [];
      
      for (const operation of operations) {
        const operationPromise = this.runOperation(
          operation,
          scenario.concurrentUsers,
          scenario.duration
        );
        testPromises.push(operationPromise);
      }
      
      const operationResults = await Promise.all(testPromises);
      results.push(...operationResults);
      
      // Calculate scenario metrics
      const scenarioResult: PerformanceScenarioResult = {
        name: scenario.name,
        responseTime: this.calculateAverageResponseTime([{ details: results }] as any),
        throughput: this.calculateThroughput(results),
        errorRate: this.calculateErrorRate(results),
        passed: this.evaluateScenarioSuccess(results),
        details: results,
        resourceUsage: await this.getResourceUsage(resourceMonitor)
      };
      
      return scenarioResult;
      
    } finally {
      this.stopResourceMonitoring(resourceMonitor);
    }
  }

  /**
   * Run a specific operation with load
   */
  private async runOperation(
    operation: PerformanceOperation,
    concurrentUsers: number,
    duration: number
  ): Promise<OperationResult> {
    const startTime = performance.now();
    const endTime = startTime + duration;
    const responseTimes: number[] = [];
    const errors: string[] = [];
    let totalRequests = 0;
    let successfulRequests = 0;

    // Calculate requests per user based on operation weight
    const requestsPerUser = Math.floor((operation.weight / 100) * 10); // Base 10 requests per user
    
    const userPromises: Promise<void>[] = [];
    
    for (let user = 0; user < concurrentUsers; user++) {
      const userPromise = this.simulateUser(
        operation,
        requestsPerUser,
        endTime,
        responseTimes,
        errors
      );
      userPromises.push(userPromise);
    }
    
    await Promise.all(userPromises);
    
    totalRequests = responseTimes.length + errors.length;
    successfulRequests = responseTimes.length;
    
    // Calculate metrics
    const sortedResponseTimes = responseTimes.sort((a, b) => a - b);
    
    return {
      name: operation.name,
      totalRequests,
      successfulRequests,
      failedRequests: errors.length,
      averageResponseTime: responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0,
      minResponseTime: sortedResponseTimes[0] || 0,
      maxResponseTime: sortedResponseTimes[sortedResponseTimes.length - 1] || 0,
      p95ResponseTime: this.calculatePercentile(sortedResponseTimes, 95),
      p99ResponseTime: this.calculatePercentile(sortedResponseTimes, 99),
      throughput: totalRequests / (duration / 1000), // requests per second
      errorRate: totalRequests > 0 ? (errors.length / totalRequests) * 100 : 0
    };
  }

  /**
   * Simulate a single user's operations
   */
  private async simulateUser(
    operation: PerformanceOperation,
    requestCount: number,
    endTime: number,
    responseTimes: number[],
    errors: string[]
  ): Promise<void> {
    for (let i = 0; i < requestCount && performance.now() < endTime; i++) {
      try {
        const requestStart = performance.now();
        
        // Simulate API call
        await this.makeRequest(operation);
        
        const requestEnd = performance.now();
        const responseTime = requestEnd - requestStart;
        
        responseTimes.push(responseTime);
        
        // Add some realistic delay between requests
        await this.sleep(Math.random() * 100);
        
      } catch (error) {
        errors.push(error.message);
      }
    }
  }

  /**
   * Make HTTP request (simulated for testing)
   */
  private async makeRequest(operation: PerformanceOperation): Promise<any> {
    // Simulate network delay and processing time
    const baseDelay = 50; // Base 50ms delay
    const variableDelay = Math.random() * 200; // Up to 200ms variable delay
    const totalDelay = baseDelay + variableDelay;
    
    await this.sleep(totalDelay);
    
    // Simulate occasional errors (5% error rate)
    if (Math.random() < 0.05) {
      throw new Error(`Simulated error for ${operation.name}`);
    }
    
    return { success: true, data: 'simulated response' };
  }

  /**
   * Ramp up users gradually
   */
  private async rampUp(targetUsers: number, rampUpTime: number): Promise<void> {
    const steps = 10;
    const stepTime = rampUpTime / steps;
    const usersPerStep = targetUsers / steps;
    
    for (let step = 0; step < steps; step++) {
      await this.sleep(stepTime);
      this.emit('rampUpProgress', {
        step: step + 1,
        totalSteps: steps,
        currentUsers: Math.floor((step + 1) * usersPerStep)
      });
    }
  }

  /**
   * Start resource monitoring
   */
  private startResourceMonitoring(): NodeJS.Timeout {
    const interval = setInterval(() => {
      const usage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.metrics.set('memory', [
        ...(this.metrics.get('memory') || []),
        usage.heapUsed / 1024 / 1024 // MB
      ]);
      
      this.metrics.set('cpu', [
        ...(this.metrics.get('cpu') || []),
        (cpuUsage.user + cpuUsage.system) / 1000 // milliseconds
      ]);
      
    }, this.config.reportingInterval || 1000);
    
    return interval;
  }

  /**
   * Stop resource monitoring and get final usage
   */
  private async getResourceUsage(monitor: NodeJS.Timeout): Promise<ResourceUsage> {
    const memoryMetrics = this.metrics.get('memory') || [];
    const cpuMetrics = this.metrics.get('cpu') || [];
    
    return {
      cpu: cpuMetrics.length > 0 
        ? cpuMetrics.reduce((sum, val) => sum + val, 0) / cpuMetrics.length 
        : 0,
      memory: memoryMetrics.length > 0 
        ? Math.max(...memoryMetrics) 
        : 0,
      disk: 0, // Would implement disk monitoring
      network: 0 // Would implement network monitoring
    };
  }

  private stopResourceMonitoring(monitor: NodeJS.Timeout): void {
    clearInterval(monitor);
  }

  /**
   * Get default operations for admissions system
   */
  private getDefaultOperations(): PerformanceOperation[] {
    return [
      {
        name: 'submit-application',
        weight: 30,
        endpoint: '/api/admissions/applications',
        method: 'POST',
        expectedResponseTime: 500
      },
      {
        name: 'check-eligibility',
        weight: 25,
        endpoint: '/api/admissions/eligibility',
        method: 'POST',
        expectedResponseTime: 300
      },
      {
        name: 'spiritual-assessment',
        weight: 20,
        endpoint: '/api/admissions/spiritual-evaluation',
        method: 'POST',
        expectedResponseTime: 800
      },
      {
        name: 'schedule-interview',
        weight: 15,
        endpoint: '/api/admissions/interviews',
        method: 'POST',
        expectedResponseTime: 200
      },
      {
        name: 'check-status',
        weight: 10,
        endpoint: '/api/admissions/status',
        method: 'GET',
        expectedResponseTime: 100
      }
    ];
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallScore(scenarios: PerformanceScenarioResult[]): number {
    if (scenarios.length === 0) return 0;
    
    let totalScore = 0;
    
    for (const scenario of scenarios) {
      let scenarioScore = 100;
      
      // Deduct points for high response times
      if (scenario.responseTime > this.config.thresholds.applicationProcessingTime) {
        scenarioScore -= 20;
      }
      
      // Deduct points for high error rates
      if (scenario.errorRate > 5) {
        scenarioScore -= 30;
      }
      
      // Deduct points for low throughput
      if (scenario.throughput < 10) {
        scenarioScore -= 15;
      }
      
      totalScore += Math.max(0, scenarioScore);
    }
    
    return totalScore / scenarios.length;
  }

  private calculateAverageResponseTime(scenarios: PerformanceScenarioResult[]): number {
    if (scenarios.length === 0) return 0;
    return scenarios.reduce((sum, s) => sum + s.responseTime, 0) / scenarios.length;
  }

  private calculateOverallThroughput(scenarios: PerformanceScenarioResult[]): number {
    return scenarios.reduce((sum, s) => sum + s.throughput, 0);
  }

  private calculateOverallErrorRate(scenarios: PerformanceScenarioResult[]): number {
    if (scenarios.length === 0) return 0;
    return scenarios.reduce((sum, s) => sum + s.errorRate, 0) / scenarios.length;
  }

  private calculateAverageResourceUsage(scenarios: PerformanceScenarioResult[]): ResourceUsage {
    if (scenarios.length === 0) {
      return { cpu: 0, memory: 0, disk: 0, network: 0 };
    }
    
    return {
      cpu: scenarios.reduce((sum, s) => sum + s.resourceUsage.cpu, 0) / scenarios.length,
      memory: scenarios.reduce((sum, s) => sum + s.resourceUsage.memory, 0) / scenarios.length,
      disk: scenarios.reduce((sum, s) => sum + s.resourceUsage.disk, 0) / scenarios.length,
      network: scenarios.reduce((sum, s) => sum + s.resourceUsage.network, 0) / scenarios.length
    };
  }

  private calculateThroughput(results: OperationResult[]): number {
    return results.reduce((sum, r) => sum + r.throughput, 0);
  }

  private calculateErrorRate(results: OperationResult[]): number {
    if (results.length === 0) return 0;
    return results.reduce((sum, r) => sum + r.errorRate, 0) / results.length;
  }

  private evaluateScenarioSuccess(results: OperationResult[]): boolean {
    const avgErrorRate = this.calculateErrorRate(results);
    const avgResponseTime = results.reduce((sum, r) => sum + r.averageResponseTime, 0) / results.length;
    
    return avgErrorRate < 5 && avgResponseTime < this.config.thresholds.applicationProcessingTime;
  }

  private generateRecommendations(results: PerformanceTestResults): string[] {
    const recommendations: string[] = [];
    
    if (results.averageResponseTime > this.config.thresholds.applicationProcessingTime) {
      recommendations.push('Optimize database queries and API response times');
    }
    
    if (results.errorRate > 5) {
      recommendations.push('Investigate and fix error sources to improve reliability');
    }
    
    if (results.resourceUsage.memory > this.config.thresholds.memoryUsage) {
      recommendations.push('Optimize memory usage and implement caching strategies');
    }
    
    if (results.throughput < 50) {
      recommendations.push('Scale infrastructure to handle higher throughput');
    }
    
    return recommendations;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}