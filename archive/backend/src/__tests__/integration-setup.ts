/**
 * ScrollUniversity Integration Test Setup
 * "Test all things; hold fast what is good" - 1 Thessalonians 5:21
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';

// Extended timeout for integration tests
jest.setTimeout(120000);

// Global test configuration for integration tests
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.JWT_SECRET = 'integration-test-jwt-secret-key';
process.env.BCRYPT_ROUNDS = '4'; // Faster for tests

// Create unique test database for integration tests
const integrationTestDatabaseName = `scrolluniversity_integration_test_${randomBytes(8).toString('hex')}`;
process.env.DATABASE_URL = `postgresql://postgres:testpassword@localhost:5432/${integrationTestDatabaseName}`;
process.env.REDIS_URL = 'redis://localhost:6379/14'; // Use different test database

// Global integration test variables
let integrationPrisma: PrismaClient;

// Setup before all integration tests
beforeAll(async () => {
  // Create integration test database
  try {
    execSync(`createdb ${integrationTestDatabaseName}`, { stdio: 'ignore' });
  } catch (error) {
    // Database might already exist
  }

  // Initialize Prisma for integration tests
  integrationPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  // Run migrations for integration tests
  try {
    execSync('npx prisma migrate deploy', { 
      stdio: 'ignore',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
  } catch (error) {
    console.error('Failed to run integration test migrations:', error);
  }

  // Connect to integration test database
  await integrationPrisma.$connect();
}, 120000);

// Cleanup after all integration tests
afterAll(async () => {
  // Disconnect from integration test database
  await integrationPrisma.$disconnect();

  // Drop integration test database
  try {
    execSync(`dropdb ${integrationTestDatabaseName}`, { stdio: 'ignore' });
  } catch (error) {
    // Database might not exist
  }
}, 60000);

// Clean database between integration tests
beforeEach(async () => {
  // Clean all tables in reverse dependency order for integration tests
  const tablenames = await integrationPrisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter(name => name !== '_prisma_migrations')
    .map(name => `"public"."${name}"`)
    .join(', ');

  if (tables) {
    try {
      await integrationPrisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
    } catch (error) {
      console.error('Failed to truncate integration test tables:', error);
    }
  }
});

// Integration test utilities
export const integrationTestUtils = {
  // Create full test environment
  createTestEnvironment: async () => {
    // Create test faculty
    const faculty = await integrationPrisma.faculty.create({
      data: {
        name: 'Integration Test Faculty',
        description: 'Faculty for integration testing'
      }
    });

    // Create test user
    const user = await integrationPrisma.user.create({
      data: {
        email: 'integration@scrolluniversity.edu',
        username: 'integrationuser',
        passwordHash: '$2b$04$integration.test.hash.for.testing.purposes',
        firstName: 'Integration',
        lastName: 'User',
        role: 'STUDENT',
        academicLevel: 'SCROLL_OPEN'
      }
    });

    // Create test course
    const course = await integrationPrisma.course.create({
      data: {
        title: 'Integration Test Course',
        description: 'Course for integration testing',
        difficulty: 'BEGINNER',
        duration: 60,
        scrollXPReward: 100,
        scrollCoinCost: 0,
        facultyId: faculty.id
      }
    });

    return { faculty, user, course };
  },

  // Test API endpoints
  testAPIEndpoint: async (endpoint: string, method: string = 'GET', data?: any) => {
    const fetch = require('node-fetch');
    const baseURL = process.env.API_BASE_URL || 'http://localhost:3001';
    
    const options: any = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${baseURL}${endpoint}`, options);
    return {
      status: response.status,
      data: await response.json()
    };
  },

  // Test database operations
  testDatabaseOperation: async (operation: () => Promise<any>) => {
    try {
      const result = await operation();
      return { success: true, result };
    } catch (error) {
      return { success: false, error };
    }
  }
};

// Export integration prisma instance
export { integrationPrisma };