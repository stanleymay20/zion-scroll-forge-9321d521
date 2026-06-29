/**
 * Load Testing Service
 * Conducts load testing and performance optimization
 * Requirements: 13.4
 */

import { logger } from '../utils/logger';

interface LoadTestConfig {
  targetURL: string;
  duration: number; // seconds
  virtualUsers: number;
  rampUpTime: number; // seconds
  endpoints: EndpointTest[];
}

interface EndpointTest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  weight: number; // percentage of requests
  headers?: Record<string, string>;
  body?: any;
}

interface LoadTestResult {
  timestamp: Date;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  endpointResults: EndpointResult[];
  recommendations: string[];
}

interface EndpointResult {
  endpoint: string;
  method: string;
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  errors: ErrorSummary[];
}

interface ErrorSummary {
  statusCode: number;
  count: number;
  message: string;
}

export default class LoadTestingService {
  /**
   * Run comprehensive load test
   */
  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    try {
      logger.info('Starting load test', {
        virtualUsers: config.virtualUsers,
        duration: config.duration
      });

      const startTime = Date.now();
      const results = await this.executeLoadTest(config);
      const endTime = Date.now();

      const testResult = this.analyzeResults(results, endTime - startTime);
      const recommendations = this.generateRecommendations(testResult);

      const finalResult: LoadTestResult = {
        ...testResult,
        recommendations
      };

      logger.info('Load test completed', {
        requestsPerSecond: finalResult.requestsPerSecond,
        errorRate: finalResult.errorRate
      });

      return finalResult;
    } catch (error) {
      logger.error('Load test failed', { error });
      throw error;
    }
  }

  /**
   * Execute load test
   */
  private async executeLoadTest(config: LoadTestConfig): Promise<any[]> {
    const results: any[] = [];
    const startTime = Date.now();
    const endTime = startTime + (config.duration * 1000);

    // Simulate load test execution
    // In production, this would use tools like k6, Artillery, or JMeter
    
    const requestsPerUser = Math.floor(
      (config.duration * 10) / config.virtualUsers
    );

    for (let user = 0; user < config.virtualUsers; user++) {
      for (let req = 0; req < requestsPerUser; req++) {
        const endpoint = this.selectEndpoint(config.endpoints);
        const result = await this.makeRequest(config.targetURL, endpoint);
        results.push(result);

        // Simulate request spacing
        await this.sleep(100);
      }
    }

    return results;
  }

  /**
   * Select endpoint based on weight
   */
  private selectEndpoint(endpoints: EndpointTest[]): EndpointTest {
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const endpoint of endpoints) {
      cumulative += endpoint.weight;
      if (random <= cumulative) {
        return endpoint;
      }
    }

    return endpoints[0];
  }

  /**
   * Make HTTP request
   */
  private async makeRequest(
    baseURL: string,
    endpoint: EndpointTest
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Simulate HTTP request
      // In production, use actual HTTP client
      await this.sleep(Math.random() * 200 + 50);

      const responseTime = Date.now() - startTime;
      
      return {
        endpoint: endpoint.path,
        method: endpoint.method,
        statusCode: 200,
        responseTime,
        success: true
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        endpoint: endpoint.path,
        method: endpoint.method,
        statusCode: 500,
        responseTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Analyze test results
   */
  private analyzeResults(results: any[], duration: number): LoadTestResult {
    const totalRequests = results.length;
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;

    const responseTimes = results.map(r => r.responseTime).sort((a, b) => a - b);
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / totalRequests;

    const p50Index = Math.floor(totalRequests * 0.5);
    const p95Index = Math.floor(totalRequests * 0.95);
    const p99Index = Math.floor(totalRequests * 0.99);

    const endpointResults = this.groupByEndpoint(results);

    return {
      timestamp: new Date(),
      duration: duration / 1000,
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      p50ResponseTime: responseTimes[p50Index] || 0,
      p95ResponseTime: responseTimes[p95Index] || 0,
      p99ResponseTime: responseTimes[p99Index] || 0,
      requestsPerSecond: totalRequests / (duration / 1000),
      errorRate: (failedRequests / totalRequests) * 100,
      endpointResults,
      recommendations: []
    };
  }

  /**
   * Group results by endpoint
   */
  private groupByEndpoint(results: any[]): EndpointResult[] {
    const grouped = new Map<string, any[]>();

    results.forEach(result => {
      const key = `${result.method} ${result.endpoint}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(result);
    });

    return Array.from(grouped.entries()).map(([key, endpointResults]) => {
      const [method, endpoint] = key.split(' ');
      const responseTimes = endpointResults.map(r => r.responseTime);
      const successful = endpointResults.filter(r => r.success).length;

      const errors = this.summarizeErrors(endpointResults);

      return {
        endpoint,
        method,
        totalRequests: endpointResults.length,
        successRate: (successful / endpointResults.length) * 100,
        averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        maxResponseTime: Math.max(...responseTimes),
        minResponseTime: Math.min(...responseTimes),
        errors
      };
    });
  }

  /**
   * Summarize errors
   */
  private summarizeErrors(results: any[]): ErrorSummary[] {
    const errorMap = new Map<number, { count: number; message: string }>();

    results.filter(r => !r.success).forEach(result => {
      const statusCode = result.statusCode;
      if (!errorMap.has(statusCode)) {
        errorMap.set(statusCode, { count: 0, message: result.error || 'Unknown error' });
      }
      errorMap.get(statusCode)!.count++;
    });

    return Array.from(errorMap.entries()).map(([statusCode, data]) => ({
      statusCode,
      count: data.count,
      message: data.message
    }));
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(result: LoadTestResult): string[] {
    const recommendations: string[] = [];

    // Check error rate
    if (result.errorRate > 5) {
      recommendations.push('High error rate detected. Investigate failing endpoints and add error handling.');
    }

    // Check response times
    if (result.averageResponseTime > 1000) {
      recommendations.push('Average response time exceeds 1 second. Consider caching and query optimization.');
    }

    if (result.p95ResponseTime > 2000) {
      recommendations.push('95th percentile response time is high. Optimize slow endpoints.');
    }

    // Check requests per second
    if (result.requestsPerSecond < 100) {
      recommendations.push('Low throughput detected. Consider horizontal scaling and load balancing.');
    }

    // Check specific endpoints
    result.endpointResults.forEach(endpoint => {
      if (endpoint.successRate < 95) {
        recommendations.push(`Endpoint ${endpoint.method} ${endpoint.endpoint} has low success rate (${endpoint.successRate.toFixed(1)}%)`);
      }

      if (endpoint.averageResponseTime > 1500) {
        recommendations.push(`Endpoint ${endpoint.method} ${endpoint.endpoint} is slow (${endpoint.averageResponseTime.toFixed(0)}ms average)`);
      }
    });

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('System performance is good. Continue monitoring in production.');
    }

    recommendations.push('Implement CDN for static assets');
    recommendations.push('Enable database connection pooling');
    recommendations.push('Configure Redis caching for frequently accessed data');

    return recommendations;
  }

  /**
   * Run stress test (beyond normal capacity)
   */
  async runStressTest(config: LoadTestConfig): Promise<LoadTestResult> {
    const stressConfig = {
      ...config,
      virtualUsers: config.virtualUsers * 2,
      duration: config.duration * 2
    };

    logger.info('Starting stress test', {
      virtualUsers: stressConfig.virtualUsers
    });

    return this.runLoadTest(stressConfig);
  }

  /**
   * Run spike test (sudden traffic increase)
   */
  async runSpikeTest(config: LoadTestConfig): Promise<LoadTestResult> {
    logger.info('Starting spike test');

    // Simulate sudden spike in traffic
    const spikeConfig = {
      ...config,
      virtualUsers: config.virtualUsers * 5,
      rampUpTime: 10, // Very short ramp-up
      duration: 60 // Short duration
    };

    return this.runLoadTest(spikeConfig);
  }

  /**
   * Generate load test report
   */
  async generateLoadTestReport(result: LoadTestResult): Promise<string> {
    const report = `
# Load Test Report
Generated: ${result.timestamp.toISOString()}

## Summary
- Duration: ${result.duration}s
- Total Requests: ${result.totalRequests}
- Successful: ${result.successfulRequests} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%)
- Failed: ${result.failedRequests} (${result.errorRate.toFixed(2)}%)
- Requests/Second: ${result.requestsPerSecond.toFixed(2)}

## Response Times
- Average: ${result.averageResponseTime.toFixed(2)}ms
- 50th Percentile: ${result.p50ResponseTime.toFixed(2)}ms
- 95th Percentile: ${result.p95ResponseTime.toFixed(2)}ms
- 99th Percentile: ${result.p99ResponseTime.toFixed(2)}ms

## Endpoint Performance
${result.endpointResults.map(e => `
### ${e.method} ${e.endpoint}
- Requests: ${e.totalRequests}
- Success Rate: ${e.successRate.toFixed(2)}%
- Avg Response Time: ${e.averageResponseTime.toFixed(2)}ms
- Min/Max: ${e.minResponseTime.toFixed(2)}ms / ${e.maxResponseTime.toFixed(2)}ms
${e.errors.length > 0 ? `- Errors: ${e.errors.map(err => `${err.statusCode} (${err.count})`).join(', ')}` : ''}
`).join('\n')}

## Recommendations
${result.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}
`;

    return report;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
