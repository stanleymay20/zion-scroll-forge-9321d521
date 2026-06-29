/**
 * Jest Configuration for Property-Based Tests
 * Specialized configuration for fast-check property testing
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  
  // Focus on property tests
  testMatch: [
    '**/__tests__/**/*.property.test.ts',
    '**/?(*.)property.test.ts'
  ],
  
  // Longer timeout for property-based tests
  testTimeout: 120000,
  
  // Property-based test specific setup
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup.ts',
    '<rootDir>/src/__tests__/property-setup.ts'
  ],
  
  // Verbose output for property test debugging
  verbose: true,
  
  // Disable coverage for property tests (they're for correctness, not coverage)
  collectCoverage: false,
  
  // Property test specific globals
  globals: {
    ...baseConfig.globals,
    'property-test': {
      numRuns: 100,
      timeout: 30000,
      seed: 42 // For reproducible tests
    }
  },
  
  // Custom reporter for property test results
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: 'coverage',
        filename: 'property-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'ScrollLibrary Property-Based Test Report'
      }
    ]
  ]
};