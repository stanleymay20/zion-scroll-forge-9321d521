/**
 * Jest Test Setup for ScrollUniversity Backend
 * Global test configuration and mocks
 */

import { PrismaClient } from '@prisma/client';

// Mock Prisma Client globally with comprehensive mock implementation
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn((callback) => {
      if (typeof callback === 'function') {
        return callback(mockPrisma);
      }
      return Promise.resolve(callback);
    }),
    $queryRaw: jest.fn().mockResolvedValue([]),
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    $executeRaw: jest.fn().mockResolvedValue(0),
    $executeRawUnsafe: jest.fn().mockResolvedValue(0),
    
    // User model
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    
    // ScrollCoin models
    scrollCoinWallet: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    scrollCoinTransaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    },
    
    // Course models
    course: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    portalCourse: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    
    // Enrollment models
    enrollment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn(),
    },
    
    // Assignment and Submission models
    assignment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    assignmentSubmission: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn(),
    },
    
    // AI Tutor models
    aITutorSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    
    // Memory and Study models
    memoryVerse: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    verseProgress: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    
    // Other models
    post: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    lectureProgress: {
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _sum: { totalWatchTime: 0 } }),
      groupBy: jest.fn(),
    },
    lecture: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    payment: {
      findMany: jest.fn(),
    },
    scholarship: {
      findMany: jest.fn(),
    },
    scholarshipDisbursement: {
      findMany: jest.fn(),
    },
    devotionCompletion: {
      findMany: jest.fn(),
    },
    prayerEntry: {
      findMany: jest.fn(),
    },
    propheticCheckIn: {
      findMany: jest.fn(),
    },
    courseReview: {
      findMany: jest.fn(),
    },
  };
  
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

// Mock logger globally
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../utils/productionLogger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock AI Gateway Service
jest.mock('../services/AIGatewayService', () => ({
  AIGatewayService: jest.fn().mockImplementation(() => ({
    generateContent: jest.fn().mockResolvedValue({
      content: 'Mock AI generated content',
      usage: { totalTokens: 100 },
    }),
    generateCompletion: jest.fn().mockResolvedValue({
      text: 'Mock AI response',
    }),
    generateText: jest.fn().mockResolvedValue({
      text: 'Mock AI text',
    }),
  })),
  default: {
    getInstance: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        content: 'Mock AI generated content',
        usage: { totalTokens: 100 },
      }),
    }),
  },
}));

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(0),
  })),
}));

// Mock BlockchainService
jest.mock('../services/BlockchainService', () => ({
  default: {
    getInstance: jest.fn().mockReturnValue({
      getNetworkStatus: jest.fn().mockResolvedValue({
        isConnected: true,
        blockNumber: 1000,
        networkName: 'ScrollChain',
      }),
      mintToken: jest.fn().mockResolvedValue({
        txHash: '0x123abc',
        blockNumber: 1001,
      }),
    }),
  },
}));

// Mock RewardMechanismService
jest.mock('../services/RewardMechanismService', () => ({
  default: {
    getInstance: jest.fn().mockReturnValue({
      processCourseCompletion: jest.fn().mockResolvedValue({
        awarded: true,
        amount: 100,
        reason: 'Course completed',
      }),
    }),
  },
}));

// Global test timeout for property-based tests
jest.setTimeout(60000);

// Setup environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:testpassword@localhost:5432/scrolluniversity_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.OPENAI_API_KEY = 'test-key';
process.env.CLAUDE_API_KEY = 'test-key';
process.env.JWT_SECRET = 'test-jwt-secret-key';

// Global test utilities
global.testUtils = {
  // Helper to create mock course outline
  createMockCourseOutline: (overrides = {}) => ({
    title: 'Test Course',
    subject: 'Theology',
    level: 'intermediate' as const,
    chapters: [
      {
        title: 'Test Chapter',
        orderIndex: 1,
        topics: ['Test Topic'],
        learningObjectives: ['Test Objective'],
      },
    ],
    ...overrides,
  }),

  // Helper to create mock book input
  createMockBookInput: (overrides = {}) => ({
    title: 'Test Book',
    subject: 'Theology',
    level: 'intermediate' as const,
    ...overrides,
  }),

  // Helper to create mock search query
  createMockSearchQuery: (overrides = {}) => ({
    query: 'test query',
    type: 'semantic' as const,
    limit: 10,
    ...overrides,
  }),
};

// Extend Jest matchers for property-based testing
expect.extend({
  toBeValidScrollContent(received: string) {
    const hasScrollTone =
      received.includes('kingdom') ||
      received.includes('calling') ||
      received.includes('Lord') ||
      received.includes('Biblical');

    const hasStructure =
      received.includes('#') || // Headers
      received.includes('##') ||
      received.includes('###');

    const pass = hasScrollTone && hasStructure;

    if (pass) {
      return {
        message: () => `Expected content not to have scroll tone and structure`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected content to have scroll tone (kingdom/calling/Lord/Biblical) and markdown structure`,
        pass: false,
      };
    }
  },

  toHaveValidBookStructure(received: any) {
    const requiredFields = ['id', 'title', 'subject', 'level', 'metadata', 'createdAt', 'updatedAt'];
    const missingFields = requiredFields.filter((field) => !(field in received));

    const pass = missingFields.length === 0;

    if (pass) {
      return {
        message: () => `Expected book not to have valid structure`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected book to have valid structure. Missing fields: ${missingFields.join(', ')}`,
        pass: false,
      };
    }
  },
});

// Declare global types for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidScrollContent(): R;
      toHaveValidBookStructure(): R;
    }
  }

  var testUtils: {
    createMockCourseOutline: (overrides?: any) => any;
    createMockBookInput: (overrides?: any) => any;
    createMockSearchQuery: (overrides?: any) => any;
  };
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global error handler for unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export {};
