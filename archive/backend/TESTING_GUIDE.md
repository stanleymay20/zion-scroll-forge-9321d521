# ScrollUniversity Testing Guide

> "Test all things; hold fast what is good" - 1 Thessalonians 5:21

## Overview

This guide provides comprehensive information about the testing infrastructure for ScrollUniversity. Our testing strategy follows the testing pyramid approach with unit tests, integration tests, and E2E tests.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Types](#test-types)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Test Factories](#test-factories)
6. [Coverage Requirements](#coverage-requirements)
7. [CI/CD Integration](#cicd-integration)
8. [Best Practices](#best-practices)

## Testing Philosophy

Our testing approach is guided by these principles:

- **Comprehensive Coverage**: Aim for 80%+ code coverage across all metrics
- **Test Pyramid**: More unit tests, fewer integration tests, minimal E2E tests
- **Fast Feedback**: Tests should run quickly to enable rapid development
- **Reliable**: Tests should be deterministic and not flaky
- **Maintainable**: Tests should be easy to understand and update
- **Spiritual Alignment**: All tests validate both technical and spiritual requirements

## Test Types

### Unit Tests

Unit tests validate individual functions, methods, and components in isolation.

**Location**: `backend/src/services/__tests__/*.test.ts`

**Purpose**:
- Test individual service methods
- Validate business logic
- Test utility functions
- Verify error handling

**Example**:
```typescript
describe('CourseService', () => {
  it('should create a new course', async () => {
    const courseData = {
      title: 'Test Course',
      description: 'Test description',
      difficulty: 'BEGINNER'
    };
    
    const course = await courseService.createCourse(courseData);
    
    expect(course).toBeDefined();
    expect(course.title).toBe('Test Course');
  });
});
```

### Integration Tests

Integration tests validate interactions between multiple components and services.

**Location**: `backend/src/__tests__/integration/*.integration.test.ts`

**Purpose**:
- Test API endpoints
- Validate database operations
- Test service interactions
- Verify authentication flows

**Example**:
```typescript
describe('Course API Integration', () => {
  it('should enroll student in course', async () => {
    const user = await UserFactory.createStudent();
    const course = await CourseFactory.create();
    const token = generateAuthToken(user.id);
    
    const response = await request(app)
      .post(`/api/courses/${course.id}/enroll`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(201);
    expect(response.body.data.enrollment).toBeDefined();
  });
});
```

### E2E Tests

E2E tests validate complete user journeys from start to finish.

**Location**: `backend/src/__tests__/e2e/*.e2e.test.ts`

**Purpose**:
- Test complete user workflows
- Validate critical paths
- Test cross-service interactions
- Verify end-to-end functionality

**Example**:
```typescript
describe('Student Enrollment Journey', () => {
  it('should complete full enrollment process', async () => {
    // Register user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);
    
    // Browse courses
    const coursesResponse = await request(app)
      .get('/api/courses')
      .set('Authorization', `Bearer ${registerResponse.body.data.token}`);
    
    // Enroll in course
    const enrollResponse = await request(app)
      .post(`/api/courses/${courseId}/enroll`)
      .set('Authorization', `Bearer ${registerResponse.body.data.token}`);
    
    expect(enrollResponse.status).toBe(201);
  });
});
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm test -- --testPathIgnorePatterns=integration.test.ts --testPathIgnorePatterns=e2e.test.ts
```

### Integration Tests Only
```bash
npm run test:integration
```

### E2E Tests Only
```bash
npm run test:e2e
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### CI Mode
```bash
npm run test:ci
```

## Writing Tests

### Test Structure

Follow the AAA pattern: Arrange, Act, Assert

```typescript
describe('Feature', () => {
  it('should do something', async () => {
    // Arrange: Set up test data and dependencies
    const user = await UserFactory.create();
    const course = await CourseFactory.create();
    
    // Act: Execute the functionality being tested
    const result = await service.enrollUser(user.id, course.id);
    
    // Assert: Verify the expected outcome
    expect(result).toBeDefined();
    expect(result.userId).toBe(user.id);
    expect(result.courseId).toBe(course.id);
  });
});
```

### Test Naming

Use descriptive test names that explain what is being tested:

```typescript
// Good
it('should reject enrollment when course is full', async () => {});
it('should send notification email after successful enrollment', async () => {});

// Bad
it('test enrollment', async () => {});
it('works', async () => {});
```

### Setup and Teardown

Use Jest lifecycle hooks for setup and cleanup:

```typescript
describe('Service Tests', () => {
  let service: MyService;
  
  beforeAll(async () => {
    // One-time setup before all tests
    service = new MyService();
  });
  
  beforeEach(async () => {
    // Setup before each test
    await cleanDatabase();
  });
  
  afterEach(async () => {
    // Cleanup after each test
    jest.clearAllMocks();
  });
  
  afterAll(async () => {
    // One-time cleanup after all tests
    await prisma.$disconnect();
  });
});
```

## Test Factories

Test factories provide convenient methods to create test data.

### Available Factories

- `UserFactory`: Create test users
- `CourseFactory`: Create test courses
- `EnrollmentFactory`: Create test enrollments
- `ApplicationFactory`: Create test applications
- `AssignmentFactory`: Create test assignments
- `SubmissionFactory`: Create test submissions
- `MessageFactory`: Create test messages
- `PostFactory`: Create test posts
- `StudyGroupFactory`: Create test study groups
- `PrayerEntryFactory`: Create test prayer entries
- `DevotionFactory`: Create test devotions
- `ScholarshipFactory`: Create test scholarships
- `NotificationFactory`: Create test notifications

### Usage Examples

```typescript
import { UserFactory, CourseFactory, EnrollmentFactory } from '../factories';

// Create a student
const student = await UserFactory.createStudent();

// Create an instructor
const instructor = await UserFactory.createInstructor();

// Create a course
const course = await CourseFactory.create({
  title: 'Custom Course Title',
  difficulty: 'INTERMEDIATE'
});

// Create multiple courses
const courses = await CourseFactory.createMany(5);

// Create enrollment
const enrollment = await EnrollmentFactory.create(student.id, course.id);

// Create complete test environment
const env = await TestEnvironmentFactory.create();
// env contains: users, faculty, course, enrollment, assignment, studyGroup
```

## Coverage Requirements

### Global Thresholds

- **Lines**: 80% minimum
- **Statements**: 80% minimum
- **Functions**: 80% minimum
- **Branches**: 80% minimum

### Critical Services

Higher thresholds for critical services:

- **Admissions Services**: 90% minimum
- **Authentication Middleware**: 85% minimum
- **Payment Services**: 90% minimum
- **Security Services**: 90% minimum

### Checking Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html

# Generate markdown report
ts-node src/__tests__/coverage-report.ts
```

## CI/CD Integration

### GitHub Actions Workflow

Our CI/CD pipeline runs tests automatically on:

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Daily scheduled runs at 2 AM UTC

### Pipeline Stages

1. **Unit Tests**: Run on Node.js 18.x and 20.x
2. **Integration Tests**: Run after unit tests pass
3. **E2E Tests**: Run after integration tests pass
4. **Frontend Tests**: Run React component tests
5. **Coverage Report**: Generate combined coverage report
6. **Security Scan**: Run security vulnerability scan
7. **Quality Gates**: Verify all thresholds are met

### Running Locally

Simulate CI environment locally:

```bash
# Run all tests in CI mode
npm run test:ci

# Validate production readiness
npm run validate:production
```

## Best Practices

### 1. Test Independence

Each test should be independent and not rely on other tests:

```typescript
// Good
beforeEach(async () => {
  await cleanDatabase();
  testUser = await UserFactory.create();
});

// Bad
let testUser;
it('creates user', async () => {
  testUser = await UserFactory.create();
});
it('updates user', async () => {
  // Depends on previous test
  await service.updateUser(testUser.id, data);
});
```

### 2. Mock External Services

Mock external API calls and services:

```typescript
jest.mock('../services/EmailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true })
}));
```

### 3. Test Error Cases

Always test error scenarios:

```typescript
it('should handle invalid input', async () => {
  await expect(
    service.createCourse({ title: '' })
  ).rejects.toThrow('Title is required');
});
```

### 4. Use Descriptive Assertions

Make assertions clear and specific:

```typescript
// Good
expect(response.status).toBe(201);
expect(response.body.success).toBe(true);
expect(response.body.data.user.email).toBe('test@example.com');

// Bad
expect(response).toBeTruthy();
```

### 5. Keep Tests Fast

- Use factories instead of creating data manually
- Mock slow operations
- Use in-memory databases when possible
- Parallelize test execution

### 6. Test Spiritual Alignment

Validate spiritual formation features:

```typescript
it('should track spiritual growth metrics', async () => {
  const devotion = await service.completeDevot ion(userId);
  
  expect(devotion.completed).toBe(true);
  expect(devotion.spiritualGrowthPoints).toBeGreaterThan(0);
});
```

### 7. Document Complex Tests

Add comments for complex test scenarios:

```typescript
it('should handle concurrent enrollment requests', async () => {
  // Simulate race condition where multiple users try to enroll
  // in a course with limited seats at the same time
  const enrollmentPromises = users.map(user =>
    service.enrollInCourse(user.id, course.id)
  );
  
  const results = await Promise.allSettled(enrollmentPromises);
  
  // Only one enrollment should succeed
  const successful = results.filter(r => r.status === 'fulfilled');
  expect(successful).toHaveLength(1);
});
```

## Troubleshooting

### Tests Failing Locally

1. Ensure PostgreSQL is running
2. Ensure Redis is running
3. Check DATABASE_URL in .env
4. Run `npm run db:setup` to reset database
5. Clear Jest cache: `npx jest --clearCache`

### Slow Tests

1. Check for unnecessary database operations
2. Use factories instead of manual data creation
3. Mock external API calls
4. Run tests in parallel: `jest --maxWorkers=4`

### Flaky Tests

1. Ensure tests are independent
2. Avoid timing-dependent assertions
3. Use proper async/await patterns
4. Clean up test data properly

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Testing Best Practices](https://testingjavascript.com/)

---

*"Test all things; hold fast what is good" - 1 Thessalonians 5:21*
