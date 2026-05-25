/**
 * ScrollUniversity Jest Configuration
 * "Test all things; hold fast what is good" - 1 Thessalonians 5:21
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],

  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/services/admissions/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/middleware/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/types/**',
    '!src/**/__tests__/**',
    '!src/index.ts',
    '!src/**/demo.ts',
    '!src/**/example.ts'
  ],

  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup.ts'
  ],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/src/__tests__/$1'
  },

  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json'
      }
    ]
  },

  testTimeout: 30000,

  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },

  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/.next/',
    '/build/',
    '\\.integration\\.test\\.ts$',
    '\\.e2e\\.test\\.ts$'
  ],

  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],

  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  errorOnDeprecated: true,

  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: 'coverage',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'ScrollUniversity Test Report'
      }
    ]
  ],

  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  snapshotSerializers: [
    'jest-serializer-path'
  ]
};
