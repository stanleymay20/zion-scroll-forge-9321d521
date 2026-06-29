#!/usr/bin/env ts-node

/**
 * ScrollUniversity Admissions Quality Assurance Runner
 * Command-line interface for running comprehensive testing
 */

import { AdmissionsTestConfiguration } from '../src/services/testing/AdmissionsTestConfiguration';
import { QualityAssuranceResults } from '../src/services/testing/AdmissionsQualityAssuranceFramework';
import { promises as fs } from 'fs';
import path from 'path';

interface RunnerOptions {
  environment: 'development' | 'production' | 'ci-cd';
  suites: ('unit' | 'integration' | 'performance' | 'uat' | 'all')[];
  output?: string;
  verbose?: boolean;
  failFast?: boolean;
  generateReports?: boolean;
}

class AdmissionsQARunner {
  private options: RunnerOptions;

  constructor(options: RunnerOptions) {
    this.options = options;
  }

  /**
   * Run quality assurance testing
   */
  async run(): Promise<void> {
    console.log('🎓 ScrollUniversity Admissions Quality Assurance');
    console.log('================================================');
    console.log(`Environment: ${this.options.environment}`);
    console.log(`Test Suites: ${this.options.suites.join(', ')}`);
    console.log('');

    try {
      // Create QA framework
      const qaFramework = AdmissionsTestConfiguration.createQAFramework(this.options.environment);
      
      // Set up event listeners for progress reporting
      this.setupEventListeners(qaFramework);

      // Run tests based on selected suites
      let results: QualityAssuranceResults;

      if (this.options.suites.includes('all')) {
        console.log('🚀 Running full quality assurance suite...');
        results = await qaFramework.runFullQualityAssurance();
      } else {
        console.log('🔧 Running selected test suites...');
        results = await this.runSelectedSuites(qaFramework);
      }

      // Display results
      this.displayResults(results);

      // Generate reports if requested
      if (this.options.generateReports) {
        await this.generateReports(results);
      }

      // Save results to file
      if (this.options.output) {
        await this.saveResults(results);
      }

      // Exit with appropriate code
      const exitCode = results.qualityGate === 'passed' ? 0 : 1;
      process.exit(exitCode);

    } catch (error) {
      console.error('❌ Quality assurance failed:', error.message);
      if (this.options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * Run selected test suites
   */
  private async runSelectedSuites(qaFramework: any): Promise<QualityAssuranceResults> {
    // This would be implemented to run only selected suites
    // For now, we'll run the full suite as the framework is designed for comprehensive testing
    return await qaFramework.runFullQualityAssurance();
  }

  /**
   * Set up event listeners for progress reporting
   */
  private setupEventListeners(qaFramework: any): void {
    qaFramework.on('qaStart', () => {
      console.log('🔄 Starting quality assurance...');
    });

    qaFramework.on('phaseStart', (phase: string) => {
      const phaseNames = {
        'unit-testing': '🧪 Unit Testing',
        'integration-testing': '🔗 Integration Testing',
        'performance-testing': '⚡ Performance Testing',
        'user-acceptance-testing': '👥 User Acceptance Testing',
        'validation': '✅ Validation Rules'
      };
      console.log(`${phaseNames[phase] || phase}...`);
    });

    qaFramework.on('phaseComplete', (phase: string, results: any) => {
      if (this.options.verbose) {
        console.log(`  ✓ ${phase} completed`);
      }
    });

    qaFramework.on('scenarioStart', (scenario: string) => {
      if (this.options.verbose) {
        console.log(`  🔄 Running scenario: ${scenario}`);
      }
    });

    qaFramework.on('scenarioComplete', (scenario: string, result: any) => {
      if (this.options.verbose) {
        const status = result.success || result.passed ? '✅' : '❌';
        console.log(`  ${status} ${scenario}`);
      }
    });

    qaFramework.on('validationComplete', (ruleName: string, result: any) => {
      if (this.options.verbose) {
        const status = result.passed ? '✅' : '❌';
        console.log(`  ${status} ${ruleName}: ${result.message}`);
      }
    });

    qaFramework.on('qaComplete', (results: QualityAssuranceResults) => {
      console.log('🎉 Quality assurance completed!');
    });

    qaFramework.on('qaError', (error: Error) => {
      console.error('❌ Quality assurance error:', error.message);
    });
  }

  /**
   * Display test results summary
   */
  private displayResults(results: QualityAssuranceResults): void {
    console.log('');
    console.log('📊 Quality Assurance Results');
    console.log('============================');
    
    // Overall metrics
    console.log(`Overall Score: ${results.overallScore.toFixed(1)}/100`);
    console.log(`Quality Gate: ${this.getQualityGateEmoji(results.qualityGate)} ${results.qualityGate.toUpperCase()}`);
    console.log('');

    // Unit test results
    console.log('🧪 Unit Tests:');
    console.log(`  Total: ${results.unitTestResults.totalTests}`);
    console.log(`  Passed: ${results.unitTestResults.totalPassed}`);
    console.log(`  Failed: ${results.unitTestResults.totalFailed}`);
    console.log(`  Coverage: ${results.unitTestResults.coverage}%`);
    console.log(`  Success Rate: ${results.unitTestResults.successRate.toFixed(1)}%`);
    console.log('');

    // Integration test results
    console.log('🔗 Integration Tests:');
    console.log(`  Scenarios: ${results.integrationTestResults.scenarios.length}`);
    console.log(`  Success: ${results.integrationTestResults.overallSuccess ? 'Yes' : 'No'}`);
    console.log(`  Duration: ${results.integrationTestResults.totalDuration}ms`);
    console.log('');

    // Performance test results
    console.log('⚡ Performance Tests:');
    console.log(`  Score: ${results.performanceTestResults.overallScore.toFixed(1)}/100`);
    console.log(`  Avg Response Time: ${results.performanceTestResults.averageResponseTime}ms`);
    console.log(`  Throughput: ${results.performanceTestResults.throughput.toFixed(1)} req/s`);
    console.log(`  Error Rate: ${results.performanceTestResults.errorRate.toFixed(2)}%`);
    console.log('');

    // User acceptance test results
    console.log('👥 User Acceptance Tests:');
    console.log(`  Scenarios: ${results.userAcceptanceTestResults.scenarios.length}`);
    console.log(`  Success: ${results.userAcceptanceTestResults.overallSuccess ? 'Yes' : 'No'}`);
    console.log(`  Screenshots: ${results.userAcceptanceTestResults.screenshots.length}`);
    console.log('');

    // Validation results
    console.log('✅ Validation Rules:');
    const passedValidations = Array.from(results.validationResults.values()).filter(v => v.passed).length;
    const totalValidations = results.validationResults.size;
    console.log(`  Passed: ${passedValidations}/${totalValidations}`);
    
    if (this.options.verbose) {
      for (const [ruleName, result] of results.validationResults.entries()) {
        const status = result.passed ? '✅' : '❌';
        console.log(`  ${status} ${ruleName}: ${result.message}`);
      }
    }
    console.log('');

    // Recommendations
    if (results.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      results.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
      console.log('');
    }

    // Artifacts
    if (results.artifacts.length > 0) {
      console.log('📁 Generated Artifacts:');
      results.artifacts.forEach(artifact => {
        console.log(`  ${artifact.type}: ${artifact.name}`);
      });
      console.log('');
    }
  }

  /**
   * Get emoji for quality gate status
   */
  private getQualityGateEmoji(status: string): string {
    switch (status) {
      case 'passed': return '✅';
      case 'warning': return '⚠️';
      case 'failed': return '❌';
      default: return '❓';
    }
  }

  /**
   * Generate reports
   */
  private async generateReports(results: QualityAssuranceResults): Promise<void> {
    console.log('📄 Generating reports...');
    
    const reportsDir = './test-reports';
    await this.ensureDirectoryExists(reportsDir);

    // Generate JSON report
    const jsonReport = {
      ...results,
      validationResults: Object.fromEntries(results.validationResults)
    };
    
    await fs.writeFile(
      path.join(reportsDir, 'qa-report.json'),
      JSON.stringify(jsonReport, null, 2)
    );

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(results);
    await fs.writeFile(
      path.join(reportsDir, 'qa-report.html'),
      htmlReport
    );

    console.log(`📄 Reports generated in ${reportsDir}/`);
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(results: QualityAssuranceResults): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ScrollUniversity Admissions QA Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #e9e9e9; border-radius: 3px; }
        .passed { color: green; }
        .failed { color: red; }
        .warning { color: orange; }
        .section { margin: 20px 0; }
        .recommendations { background: #fff3cd; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ScrollUniversity Admissions Quality Assurance Report</h1>
        <p>Generated: ${results.timestamp.toISOString()}</p>
        <p>Environment: ${results.environment}</p>
        <p>Version: ${results.version}</p>
    </div>

    <div class="section">
        <h2>Overall Results</h2>
        <div class="metric">
            <strong>Overall Score:</strong> ${results.overallScore.toFixed(1)}/100
        </div>
        <div class="metric">
            <strong>Quality Gate:</strong> 
            <span class="${results.qualityGate}">${results.qualityGate.toUpperCase()}</span>
        </div>
    </div>

    <div class="section">
        <h2>Test Results Summary</h2>
        <h3>Unit Tests</h3>
        <div class="metric">Total: ${results.unitTestResults.totalTests}</div>
        <div class="metric">Passed: ${results.unitTestResults.totalPassed}</div>
        <div class="metric">Failed: ${results.unitTestResults.totalFailed}</div>
        <div class="metric">Coverage: ${results.unitTestResults.coverage}%</div>

        <h3>Integration Tests</h3>
        <div class="metric">Scenarios: ${results.integrationTestResults.scenarios.length}</div>
        <div class="metric">Success: ${results.integrationTestResults.overallSuccess ? 'Yes' : 'No'}</div>

        <h3>Performance Tests</h3>
        <div class="metric">Score: ${results.performanceTestResults.overallScore.toFixed(1)}/100</div>
        <div class="metric">Avg Response: ${results.performanceTestResults.averageResponseTime}ms</div>
        <div class="metric">Error Rate: ${results.performanceTestResults.errorRate.toFixed(2)}%</div>

        <h3>User Acceptance Tests</h3>
        <div class="metric">Scenarios: ${results.userAcceptanceTestResults.scenarios.length}</div>
        <div class="metric">Success: ${results.userAcceptanceTestResults.overallSuccess ? 'Yes' : 'No'}</div>
    </div>

    ${results.recommendations.length > 0 ? `
    <div class="section recommendations">
        <h2>Recommendations</h2>
        <ul>
            ${results.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
    ` : ''}
</body>
</html>
    `;
  }

  /**
   * Save results to file
   */
  private async saveResults(results: QualityAssuranceResults): Promise<void> {
    const outputPath = this.options.output!;
    await this.ensureDirectoryExists(path.dirname(outputPath));
    
    const outputData = {
      ...results,
      validationResults: Object.fromEntries(results.validationResults)
    };
    
    await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`💾 Results saved to ${outputPath}`);
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArguments(): RunnerOptions {
  const args = process.argv.slice(2);
  const options: RunnerOptions = {
    environment: 'development',
    suites: ['all'],
    verbose: false,
    failFast: false,
    generateReports: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--environment':
      case '-e':
        options.environment = args[++i] as any;
        break;
      case '--suites':
      case '-s':
        options.suites = args[++i].split(',') as any;
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--fail-fast':
      case '-f':
        options.failFast = true;
        break;
      case '--reports':
      case '-r':
        options.generateReports = true;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
    }
  }

  return options;
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`
ScrollUniversity Admissions Quality Assurance Runner

Usage: ts-node run-admissions-qa.ts [options]

Options:
  -e, --environment <env>    Environment: development, production, ci-cd (default: development)
  -s, --suites <suites>      Test suites: unit,integration,performance,uat,all (default: all)
  -o, --output <file>        Output file for results (JSON format)
  -v, --verbose              Verbose output
  -f, --fail-fast            Stop on first failure
  -r, --reports              Generate HTML and other reports
  -h, --help                 Show this help message

Examples:
  ts-node run-admissions-qa.ts                                    # Run all tests in development
  ts-node run-admissions-qa.ts -e production -r                   # Run all tests in production with reports
  ts-node run-admissions-qa.ts -s unit,integration -v             # Run specific suites with verbose output
  ts-node run-admissions-qa.ts -e ci-cd -o results.json           # Run for CI/CD and save results
  `);
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const options = parseArguments();
    const runner = new AdmissionsQARunner(options);
    await runner.run();
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { AdmissionsQARunner, RunnerOptions };