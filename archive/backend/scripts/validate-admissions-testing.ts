#!/usr/bin/env ts-node

/**
 * ScrollUniversity Admissions Testing Validation Script
 * Validates that all testing components are properly configured and functional
 */

import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

interface ValidationResult {
  component: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: string[];
}

class AdmissionsTestingValidator {
  private results: ValidationResult[] = [];

  /**
   * Run comprehensive validation
   */
  async validate(): Promise<ValidationResult[]> {
    console.log('🔍 Validating ScrollUniversity Admissions Testing Framework');
    console.log('=========================================================');

    // Validate test infrastructure
    await this.validateTestInfrastructure();
    
    // Validate test configurations
    await this.validateTestConfigurations();
    
    // Validate test suites
    await this.validateTestSuites();
    
    // Validate test data and fixtures
    await this.validateTestData();
    
    // Validate CI/CD integration
    await this.validateCiCdIntegration();
    
    // Validate reporting capabilities
    await this.validateReporting();

    // Display results
    this.displayResults();
    
    return this.results;
  }

  /**
   * Validate test infrastructure components
   */
  private async validateTestInfrastructure(): Promise<void> {
    console.log('🏗️  Validating test infrastructure...');

    // Check if Jest is configured
    await this.validateJestConfiguration();
    
    // Check test runner components
    await this.validateTestRunnerComponents();
    
    // Check database test setup
    await this.validateDatabaseTestSetup();
    
    // Check environment configuration
    await this.validateEnvironmentConfiguration();
  }

  /**
   * Validate Jest configuration
   */
  private async validateJestConfiguration(): Promise<void> {
    try {
      const jestConfigPath = path.join(process.cwd(), 'backend', 'jest.config.js');
      await fs.access(jestConfigPath);
      
      const jestConfig = require(jestConfigPath);
      
      const requiredFields = ['testEnvironment', 'setupFilesAfterEnv', 'collectCoverageFrom'];
      const missingFields = requiredFields.filter(field => !jestConfig[field]);
      
      if (missingFields.length === 0) {
        this.addResult('jest-configuration', 'passed', 'Jest configuration is complete');
      } else {
        this.addResult('jest-configuration', 'warning', 
          `Jest configuration missing fields: ${missingFields.join(', ')}`);
      }
    } catch (error) {
      this.addResult('jest-configuration', 'failed', 'Jest configuration file not found');
    }
  }

  /**
   * Validate test runner components
   */
  private async validateTestRunnerComponents(): Promise<void> {
    const components = [
      'TestRunner.ts',
      'IntegrationTestSuite.ts',
      'PerformanceTestSuite.ts',
      'UserAcceptanceTestSuite.ts',
      'AdmissionsQualityAssuranceFramework.ts'
    ];

    for (const component of components) {
      try {
        const componentPath = path.join(process.cwd(), 'backend', 'src', 'services', 'testing', component);
        await fs.access(componentPath);
        
        const content = await fs.readFile(componentPath, 'utf-8');
        
        // Check if component has required exports
        if (content.includes('export class') || content.includes('export interface')) {
          this.addResult(`test-component-${component}`, 'passed', 
            `Test component ${component} is properly implemented`);
        } else {
          this.addResult(`test-component-${component}`, 'warning', 
            `Test component ${component} may be missing exports`);
        }
      } catch (error) {
        this.addResult(`test-component-${component}`, 'failed', 
          `Test component ${component} not found`);
      }
    }
  }

  /**
   * Validate database test setup
   */
  private async validateDatabaseTestSetup(): Promise<void> {
    try {
      const setupPath = path.join(process.cwd(), 'backend', 'src', '__tests__', 'setup.ts');
      await fs.access(setupPath);
      
      const setupContent = await fs.readFile(setupPath, 'utf-8');
      
      // Check for database setup patterns
      const hasDbSetup = setupContent.includes('beforeAll') || setupContent.includes('beforeEach');
      const hasDbTeardown = setupContent.includes('afterAll') || setupContent.includes('afterEach');
      
      if (hasDbSetup && hasDbTeardown) {
        this.addResult('database-test-setup', 'passed', 'Database test setup is configured');
      } else {
        this.addResult('database-test-setup', 'warning', 
          'Database test setup may be incomplete');
      }
    } catch (error) {
      this.addResult('database-test-setup', 'failed', 'Database test setup file not found');
    }
  }

  /**
   * Validate environment configuration
   */
  private async validateEnvironmentConfiguration(): Promise<void> {
    const requiredEnvVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'REDIS_URL',
      'API_BASE_URL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length === 0) {
      this.addResult('environment-configuration', 'passed', 
        'All required environment variables are set');
    } else {
      this.addResult('environment-configuration', 'warning', 
        `Missing environment variables: ${missingVars.join(', ')}`);
    }
  }

  /**
   * Validate test configurations
   */
  private async validateTestConfigurations(): Promise<void> {
    console.log('⚙️  Validating test configurations...');

    try {
      const configPath = path.join(process.cwd(), 'backend', 'src', 'services', 'testing', 'AdmissionsTestConfiguration.ts');
      await fs.access(configPath);
      
      const configContent = await fs.readFile(configPath, 'utf-8');
      
      // Check for required configuration methods
      const requiredMethods = [
        'getDefaultConfig',
        'getProductionConfig',
        'getDevelopmentConfig',
        'getCiCdConfig'
      ];
      
      const missingMethods = requiredMethods.filter(method => !configContent.includes(method));
      
      if (missingMethods.length === 0) {
        this.addResult('test-configurations', 'passed', 'Test configurations are complete');
      } else {
        this.addResult('test-configurations', 'warning', 
          `Missing configuration methods: ${missingMethods.join(', ')}`);
      }
    } catch (error) {
      this.addResult('test-configurations', 'failed', 'Test configuration file not found');
    }
  }

  /**
   * Validate test suites
   */
  private async validateTestSuites(): Promise<void> {
    console.log('🧪 Validating test suites...');

    const testSuites = [
      'ApplicationService',
      'EligibilityChecker',
      'SpiritualAssessor',
      'AcademicEvaluator',
      'InterviewScheduler',
      'DecisionProcessor',
      'DocumentVerificationService',
      'FraudDetectionService',
      'AccessibilityComplianceService',
      'AdmissionsAnalyticsService'
    ];

    for (const suite of testSuites) {
      await this.validateTestSuite(suite);
    }
  }

  /**
   * Validate individual test suite
   */
  private async validateTestSuite(suiteName: string): Promise<void> {
    try {
      const testPath = path.join(process.cwd(), 'backend', 'src', 'services', 'admissions', '__tests__', `${suiteName}.test.ts`);
      await fs.access(testPath);
      
      const testContent = await fs.readFile(testPath, 'utf-8');
      
      // Check for test structure
      const hasDescribe = testContent.includes('describe(');
      const hasTests = testContent.includes('it(') || testContent.includes('test(');
      const hasSetup = testContent.includes('beforeEach') || testContent.includes('beforeAll');
      
      if (hasDescribe && hasTests) {
        this.addResult(`test-suite-${suiteName}`, 'passed', 
          `Test suite ${suiteName} is properly structured`);
      } else {
        this.addResult(`test-suite-${suiteName}`, 'warning', 
          `Test suite ${suiteName} may be incomplete`);
      }
    } catch (error) {
      this.addResult(`test-suite-${suiteName}`, 'failed', 
        `Test suite ${suiteName} not found`);
    }
  }

  /**
   * Validate test data and fixtures
   */
  private async validateTestData(): Promise<void> {
    console.log('📊 Validating test data and fixtures...');

    // Check for test data directory
    try {
      const testDataPath = path.join(process.cwd(), 'backend', 'src', '__tests__', 'fixtures');
      await fs.access(testDataPath);
      
      const files = await fs.readdir(testDataPath);
      
      if (files.length > 0) {
        this.addResult('test-data', 'passed', 
          `Test fixtures directory contains ${files.length} files`);
      } else {
        this.addResult('test-data', 'warning', 'Test fixtures directory is empty');
      }
    } catch (error) {
      this.addResult('test-data', 'warning', 'Test fixtures directory not found');
    }

    // Check for seed data
    try {
      const seedPath = path.join(process.cwd(), 'backend', 'prisma', 'seeds');
      await fs.access(seedPath);
      
      const seedFiles = await fs.readdir(seedPath);
      const admissionsSeedFiles = seedFiles.filter(file => file.includes('admissions'));
      
      if (admissionsSeedFiles.length > 0) {
        this.addResult('seed-data', 'passed', 
          `Found ${admissionsSeedFiles.length} admissions seed files`);
      } else {
        this.addResult('seed-data', 'warning', 'No admissions seed files found');
      }
    } catch (error) {
      this.addResult('seed-data', 'warning', 'Seed data directory not found');
    }
  }

  /**
   * Validate CI/CD integration
   */
  private async validateCiCdIntegration(): Promise<void> {
    console.log('🔄 Validating CI/CD integration...');

    // Check for GitHub Actions workflow
    try {
      const workflowPath = path.join(process.cwd(), '.github', 'workflows');
      await fs.access(workflowPath);
      
      const workflows = await fs.readdir(workflowPath);
      const testWorkflows = workflows.filter(file => 
        file.includes('test') || file.includes('qa') || file.includes('quality')
      );
      
      if (testWorkflows.length > 0) {
        this.addResult('ci-cd-integration', 'passed', 
          `Found ${testWorkflows.length} test-related workflows`);
      } else {
        this.addResult('ci-cd-integration', 'warning', 'No test workflows found');
      }
    } catch (error) {
      this.addResult('ci-cd-integration', 'warning', 'GitHub Actions workflows not found');
    }

    // Check for test scripts in package.json
    try {
      const packagePath = path.join(process.cwd(), 'backend', 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      const testScripts = Object.keys(packageJson.scripts || {}).filter(script => 
        script.includes('test') || script.includes('qa')
      );
      
      if (testScripts.length > 0) {
        this.addResult('test-scripts', 'passed', 
          `Found test scripts: ${testScripts.join(', ')}`);
      } else {
        this.addResult('test-scripts', 'warning', 'No test scripts found in package.json');
      }
    } catch (error) {
      this.addResult('test-scripts', 'failed', 'Could not read package.json');
    }
  }

  /**
   * Validate reporting capabilities
   */
  private async validateReporting(): Promise<void> {
    console.log('📄 Validating reporting capabilities...');

    // Check for QA runner script
    try {
      const runnerPath = path.join(process.cwd(), 'backend', 'scripts', 'run-admissions-qa.ts');
      await fs.access(runnerPath);
      
      const runnerContent = await fs.readFile(runnerPath, 'utf-8');
      
      // Check for reporting features
      const hasHtmlReporting = runnerContent.includes('generateHtmlReport');
      const hasJsonReporting = runnerContent.includes('JSON.stringify');
      const hasEmailReporting = runnerContent.includes('email');
      
      const features = [];
      if (hasHtmlReporting) features.push('HTML');
      if (hasJsonReporting) features.push('JSON');
      if (hasEmailReporting) features.push('Email');
      
      if (features.length > 0) {
        this.addResult('reporting-capabilities', 'passed', 
          `Reporting supports: ${features.join(', ')}`);
      } else {
        this.addResult('reporting-capabilities', 'warning', 'Limited reporting capabilities');
      }
    } catch (error) {
      this.addResult('reporting-capabilities', 'failed', 'QA runner script not found');
    }

    // Check for reports directory
    try {
      const reportsPath = path.join(process.cwd(), 'test-reports');
      await fs.access(reportsPath);
      this.addResult('reports-directory', 'passed', 'Test reports directory exists');
    } catch (error) {
      this.addResult('reports-directory', 'warning', 'Test reports directory not found');
    }
  }

  /**
   * Add validation result
   */
  private addResult(component: string, status: 'passed' | 'failed' | 'warning', message: string, details?: string[]): void {
    this.results.push({ component, status, message, details });
  }

  /**
   * Display validation results
   */
  private displayResults(): void {
    console.log('');
    console.log('📋 Validation Results');
    console.log('====================');

    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log('');

    // Show detailed results
    for (const result of this.results) {
      const emoji = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⚠️';
      console.log(`${emoji} ${result.component}: ${result.message}`);
      
      if (result.details) {
        result.details.forEach(detail => {
          console.log(`   - ${detail}`);
        });
      }
    }

    console.log('');

    // Overall assessment
    if (failed === 0) {
      console.log('🎉 Validation completed successfully!');
      if (warnings > 0) {
        console.log(`⚠️  Consider addressing ${warnings} warnings for optimal testing setup.`);
      }
    } else {
      console.log(`❌ Validation failed with ${failed} critical issues.`);
      console.log('Please address the failed components before running tests.');
    }
  }

  /**
   * Run a quick test to verify functionality
   */
  async runQuickTest(): Promise<boolean> {
    console.log('🚀 Running quick functionality test...');

    try {
      // Try to import and instantiate the QA framework
      const { AdmissionsTestConfiguration } = await import('../src/services/testing/AdmissionsTestConfiguration');
      const qaFramework = AdmissionsTestConfiguration.createQAFramework('development');
      
      console.log('✅ QA Framework instantiated successfully');
      
      // Try to get default validation rules
      const rules = AdmissionsTestConfiguration['getDefaultValidationRules']();
      console.log(`✅ Found ${rules.length} validation rules`);
      
      return true;
    } catch (error) {
      console.log(`❌ Quick test failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const validator = new AdmissionsTestingValidator();
  
  try {
    const results = await validator.validate();
    
    // Run quick functionality test
    const quickTestPassed = await validator.runQuickTest();
    
    // Determine exit code
    const hasCriticalFailures = results.some(r => r.status === 'failed');
    const exitCode = hasCriticalFailures || !quickTestPassed ? 1 : 0;
    
    process.exit(exitCode);
    
  } catch (error) {
    console.error('❌ Validation failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { AdmissionsTestingValidator };