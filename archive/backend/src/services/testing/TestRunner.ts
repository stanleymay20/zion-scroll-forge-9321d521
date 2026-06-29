/**
 * ScrollUniversity Test Runner
 * Core testing infrastructure for comprehensive test execution
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

export interface TestRunnerConfig {
  environment: 'unit' | 'integration' | 'e2e' | 'performance';
  timeout: number;
  retries: number;
  parallel?: boolean;
  coverage?: boolean;
}

export interface TestSuiteResult {
  name: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
  errors: TestError[];
  details: TestCaseResult[];
}

export interface TestCaseResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  assertions: number;
}

export interface TestError {
  test: string;
  message: string;
  stack?: string;
  type: 'assertion' | 'timeout' | 'setup' | 'teardown';
}

export class TestRunner {
  private config: TestRunnerConfig;
  private testResults: Map<string, TestSuiteResult> = new Map();

  constructor(config: TestRunnerConfig) {
    this.config = config;
  }

  /**
   * Run a specific test suite
   */
  async runTestSuite(suiteName: string): Promise<TestSuiteResult> {
    const startTime = Date.now();
    
    try {
      const testFiles = await this.findTestFiles(suiteName);
      const result: TestSuiteResult = {
        name: suiteName,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        errors: [],
        details: []
      };

      for (const testFile of testFiles) {
        const fileResult = await this.runTestFile(testFile);
        result.total += fileResult.total;
        result.passed += fileResult.passed;
        result.failed += fileResult.failed;
        result.skipped += fileResult.skipped;
        result.duration += fileResult.duration;
        result.errors.push(...fileResult.errors);
        result.details.push(...fileResult.details);
      }

      result.duration = Date.now() - startTime;
      this.testResults.set(suiteName, result);
      
      return result;
      
    } catch (error) {
      const result: TestSuiteResult = {
        name: suiteName,
        total: 0,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: Date.now() - startTime,
        errors: [{
          test: suiteName,
          message: error.message,
          stack: error.stack,
          type: 'setup'
        }],
        details: []
      };
      
      this.testResults.set(suiteName, result);
      return result;
    }
  }

  /**
   * Run multiple test suites in parallel or sequence
   */
  async runTestSuites(suiteNames: string[]): Promise<Map<string, TestSuiteResult>> {
    if (this.config.parallel) {
      const promises = suiteNames.map(name => this.runTestSuite(name));
      const results = await Promise.all(promises);
      
      results.forEach((result, index) => {
        this.testResults.set(suiteNames[index], result);
      });
    } else {
      for (const suiteName of suiteNames) {
        await this.runTestSuite(suiteName);
      }
    }

    return this.testResults;
  }

  /**
   * Run all tests matching a pattern
   */
  async runAllTests(pattern?: string): Promise<Map<string, TestSuiteResult>> {
    const testSuites = await this.discoverTestSuites(pattern);
    return await this.runTestSuites(testSuites);
  }

  /**
   * Get test results summary
   */
  getTestSummary(): TestSummary {
    const summary: TestSummary = {
      totalSuites: this.testResults.size,
      totalTests: 0,
      totalPassed: 0,
      totalFailed: 0,
      totalSkipped: 0,
      totalDuration: 0,
      successRate: 0,
      coverage: 0
    };

    for (const result of this.testResults.values()) {
      summary.totalTests += result.total;
      summary.totalPassed += result.passed;
      summary.totalFailed += result.failed;
      summary.totalSkipped += result.skipped;
      summary.totalDuration += result.duration;
    }

    summary.successRate = summary.totalTests > 0 
      ? (summary.totalPassed / summary.totalTests) * 100 
      : 0;

    return summary;
  }

  /**
   * Find test files for a specific suite
   */
  private async findTestFiles(suiteName: string): Promise<string[]> {
    const testDir = path.join(process.cwd(), 'src', 'services', 'admissions', '__tests__');
    const files = await fs.readdir(testDir);
    
    return files
      .filter(file => file.includes(suiteName) && file.endsWith('.test.ts'))
      .map(file => path.join(testDir, file));
  }

  /**
   * Run a single test file
   */
  private async runTestFile(testFile: string): Promise<TestSuiteResult> {
    return new Promise((resolve, reject) => {
      const jestArgs = [
        '--testPathPattern', testFile,
        '--json',
        '--coverage=' + (this.config.coverage ? 'true' : 'false'),
        '--maxWorkers=1',
        '--forceExit'
      ];

      const jest = spawn('npx', ['jest', ...jestArgs], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      jest.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      jest.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        jest.kill('SIGKILL');
        reject(new Error(`Test timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      jest.on('close', (code) => {
        clearTimeout(timeout);
        
        try {
          const result = this.parseJestOutput(stdout, stderr, testFile);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      jest.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Parse Jest output to extract test results
   */
  private parseJestOutput(stdout: string, stderr: string, testFile: string): TestSuiteResult {
    const result: TestSuiteResult = {
      name: path.basename(testFile, '.test.ts'),
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: [],
      details: []
    };

    try {
      // Try to parse JSON output from Jest
      const lines = stdout.split('\n');
      const jsonLine = lines.find(line => line.trim().startsWith('{'));
      
      if (jsonLine) {
        const jestResult = JSON.parse(jsonLine);
        
        if (jestResult.testResults && jestResult.testResults.length > 0) {
          const testResult = jestResult.testResults[0];
          
          result.total = testResult.numPassingTests + testResult.numFailingTests + testResult.numPendingTests;
          result.passed = testResult.numPassingTests;
          result.failed = testResult.numFailingTests;
          result.skipped = testResult.numPendingTests;
          result.duration = testResult.perfStats?.end - testResult.perfStats?.start || 0;

          // Extract individual test case results
          if (testResult.assertionResults) {
            result.details = testResult.assertionResults.map((assertion: any) => ({
              name: assertion.title,
              status: assertion.status,
              duration: assertion.duration || 0,
              error: assertion.failureMessages?.join('\n'),
              assertions: 1
            }));
          }

          // Extract errors
          if (testResult.message) {
            result.errors.push({
              test: result.name,
              message: testResult.message,
              type: 'assertion'
            });
          }
        }
      }
    } catch (parseError) {
      // Fallback to parsing stderr for basic information
      result.errors.push({
        test: result.name,
        message: stderr || 'Failed to parse test output',
        type: 'setup'
      });
      result.failed = 1;
      result.total = 1;
    }

    return result;
  }

  /**
   * Discover all test suites
   */
  private async discoverTestSuites(pattern?: string): Promise<string[]> {
    const testDir = path.join(process.cwd(), 'src', 'services', 'admissions', '__tests__');
    
    try {
      const files = await fs.readdir(testDir);
      const testFiles = files
        .filter(file => file.endsWith('.test.ts'))
        .filter(file => !pattern || file.includes(pattern))
        .map(file => path.basename(file, '.test.ts'));

      return [...new Set(testFiles)]; // Remove duplicates
    } catch (error) {
      return [];
    }
  }
}

export interface TestSummary {
  totalSuites: number;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number;
  successRate: number;
  coverage: number;
}