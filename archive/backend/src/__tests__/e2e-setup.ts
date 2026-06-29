/**
 * ScrollUniversity E2E Test Setup
 * "Test all things; hold fast what is good" - 1 Thessalonians 5:21
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';

// Extended timeout for E2E tests
jest.setTimeout(300000); // 5 minutes

// Global test configuration for E2E tests
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.JWT_SECRET = 'e2e-test-jwt-secret-key';
process.env.BCRYPT_ROUNDS = '4'; // Faster for tests

// Create unique test database for E2E tests
const e2eTestDatabaseName = `scrolluniversity_e2e_test_${randomBytes(8).toString('hex')}`;
process.env.DATABASE_URL = `postgresql://postgres:testpassword@localhost:5432/${e2eTestDatabaseName}`;
process.env.REDIS_URL = 'redis://localhost:6379/13'; // Use different test database

// Global E2E test variables
let e2ePrisma: PrismaClient;

// Setup before all E2E tests
beforeAll(async () => {
  // Create E2E test database
  try {
    execSync(`createdb ${e2eTestDatabaseName}`, { stdio: 'ignore' });
  } catch (error) {
    // Database might already exist
  }

  // Initialize Prisma for E2E tests
  e2ePrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  // Run migrations for E2E tests
  try {
    execSync('npx prisma migrate deploy', { 
      stdio: 'ignore',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
  } catch (error) {
    console.error('Failed to run E2E test migrations:', error);
  }

  // Connect to E2E test database
  await e2ePrisma.$connect();

  // Seed E2E test data
  await seedE2ETestData();
}, 300000);

// Cleanup after all E2E tests
afterAll(async () => {
  // Disconnect from E2E test database
  await e2ePrisma.$disconnect();

  // Drop E2E test database
  try {
    execSync(`dropdb ${e2eTestDatabaseName}`, { stdio: 'ignore' });
  } catch (error) {
    // Database might not exist
  }
}, 120000);

// Seed E2E test data
async function seedE2ETestData() {
  try {
    // Create test faculties
    const scrollTheologyFaculty = await e2ePrisma.faculty.create({
      data: {
        name: 'Scroll Theology Faculty',
        description: 'Faculty of Scroll-aligned theological studies'
      }
    });

    const propheticLawFaculty = await e2ePrisma.faculty.create({
      data: {
        name: 'Prophetic Law Faculty',
        description: 'Faculty of prophetic law and governance'
      }
    });

    // Create test courses
    await e2ePrisma.course.createMany({
      data: [
        {
          title: 'Introduction to Scroll Theology',
          description: 'Foundational course in scroll-aligned theology',
          difficulty: 'BEGINNER',
          duration: 120,
          scrollXPReward: 200,
          scrollCoinCost: 0,
          facultyId: scrollTheologyFaculty.id
        },
        {
          title: 'Prophetic Law Foundations',
          description: 'Basic principles of prophetic law and governance',
          difficulty: 'INTERMEDIATE',
          duration: 180,
          scrollXPReward: 300,
          scrollCoinCost: 50,
          facultyId: propheticLawFaculty.id
        }
      ]
    });

    // Create test users
    await e2ePrisma.user.createMany({
      data: [
        {
          email: 'student@scrolluniversity.edu',
          username: 'e2estudent',
          passwordHash: '$2b$04$e2e.test.student.hash.for.testing.purposes',
          firstName: 'E2E',
          lastName: 'Student',
          role: 'STUDENT',
          academicLevel: 'SCROLL_OPEN'
        },
        {
          email: 'instructor@scrolluniversity.edu',
          username: 'e2einstructor',
          passwordHash: '$2b$04$e2e.test.instructor.hash.for.testing.purposes',
          firstName: 'E2E',
          lastName: 'Instructor',
          role: 'INSTRUCTOR',
          academicLevel: 'SCROLL_CERTIFIED'
        },
        {
          email: 'admin@scrolluniversity.edu',
          username: 'e2eadmin',
          passwordHash: '$2b$04$e2e.test.admin.hash.for.testing.purposes',
          firstName: 'E2E',
          lastName: 'Admin',
          role: 'ADMIN',
          academicLevel: 'SCROLL_MASTER'
        }
      ]
    });

    console.log('E2E test data seeded successfully');
  } catch (error) {
    console.error('Failed to seed E2E test data:', error);
  }
}

// E2E test utilities
export const e2eTestUtils = {
  // Login user and get token
  loginUser: async (email: string, password: string) => {
    const fetch = require('node-fetch');
    const baseURL = process.env.API_BASE_URL || 'http://localhost:3001';
    
    const response = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    return data.token;
  },

  // Make authenticated API request
  authenticatedRequest: async (endpoint: string, token: string, method: string = 'GET', data?: any) => {
    const fetch = require('node-fetch');
    const baseURL = process.env.API_BASE_URL || 'http://localhost:3001';
    
    const options: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
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

  // Test complete user journey
  testUserJourney: async (userType: 'student' | 'instructor' | 'admin') => {
    const credentials = {
      student: { email: 'student@scrolluniversity.edu', password: 'E2ETestPassword123!' },
      instructor: { email: 'instructor@scrolluniversity.edu', password: 'E2ETestPassword123!' },
      admin: { email: 'admin@scrolluniversity.edu', password: 'E2ETestPassword123!' }
    };

    const token = await e2eTestUtils.loginUser(credentials[userType].email, credentials[userType].password);
    
    // Test basic authenticated endpoints
    const profileResponse = await e2eTestUtils.authenticatedRequest('/api/users/profile', token);
    const coursesResponse = await e2eTestUtils.authenticatedRequest('/api/courses', token);

    return {
      token,
      profile: profileResponse,
      courses: coursesResponse
    };
  },

  // Wait for async operations with timeout
  waitForCondition: async (condition: () => Promise<boolean>, timeout: number = 30000) => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
  }
};

// Export E2E prisma instance
export { e2ePrisma };