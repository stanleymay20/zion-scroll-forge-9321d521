/**
 * API Endpoints Integration Tests
 * "Test all things; hold fast what is good" - 1 Thessalonians 5:21
 */

import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { UserFactory, CourseFactory, ApplicationFactory } from '../factories';

const prisma = new PrismaClient();
let app: express.Application;

describe('API Endpoints Integration Tests', () => {
  beforeAll(async () => {
    // Initialize Express app with routes
    app = express();
    app.use(express.json());
    
    // Import and mount routes
    const authRoutes = require('../../routes/auth').default;
    const courseRoutes = require('../../routes/courses').default;
    const admissionsRoutes = require('../../routes/admissions').default;
    
    app.use('/api/auth', authRoutes);
    app.use('/api/courses', courseRoutes);
    app.use('/api/admissions', admissionsRoutes);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Authentication Endpoints', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@scrolluniversity.edu',
          username: 'newuser',
          password: 'SecurePassword123!',
          firstName: 'New',
          lastName: 'User'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('email', 'newuser@scrolluniversity.edu');
    });

    it('should login existing user', async () => {
      const user = await UserFactory.create({
        email: 'login@scrolluniversity.edu',
        password: 'LoginPassword123!'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@scrolluniversity.edu',
          password: 'LoginPassword123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@scrolluniversity.edu',
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should refresh access token', async () => {
      const user = await UserFactory.create();
      const jwt = require('jsonwebtoken');
      const refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
    });
  });

  describe('Course Endpoints', () => {
    let authToken: string;
    let user: any;

    beforeEach(async () => {
      user = await UserFactory.createStudent();
      const jwt = require('jsonwebtoken');
      authToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('should list all courses', async () => {
      await CourseFactory.createMany(3);

      const response = await request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.courses).toHaveLength(3);
    });

    it('should get course by ID', async () => {
      const course = await CourseFactory.create();

      const response = await request(app)
        .get(`/api/courses/${course.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.course.id).toBe(course.id);
    });

    it('should enroll in course', async () => {
      const course = await CourseFactory.create();

      const response = await request(app)
        .post(`/api/courses/${course.id}/enroll`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enrollment).toHaveProperty('courseId', course.id);
    });

    it('should prevent duplicate enrollment', async () => {
      const course = await CourseFactory.create();

      // First enrollment
      await request(app)
        .post(`/api/courses/${course.id}/enroll`)
        .set('Authorization', `Bearer ${authToken}`);

      // Second enrollment attempt
      const response = await request(app)
        .post(`/api/courses/${course.id}/enroll`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should filter courses by difficulty', async () => {
      await CourseFactory.create({ difficulty: 'BEGINNER' });
      await CourseFactory.create({ difficulty: 'INTERMEDIATE' });
      await CourseFactory.create({ difficulty: 'ADVANCED' });

      const response = await request(app)
        .get('/api/courses?difficulty=BEGINNER')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.courses).toHaveLength(1);
      expect(response.body.data.courses[0].difficulty).toBe('BEGINNER');
    });
  });

  describe('Admissions Endpoints', () => {
    let authToken: string;
    let user: any;

    beforeEach(async () => {
      user = await UserFactory.createStudent();
      const jwt = require('jsonwebtoken');
      authToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('should submit application', async () => {
      const response = await request(app)
        .post('/api/admissions/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          programApplied: 'SCROLL_DEGREE',
          personalStatement: 'I am passionate about scroll-aligned education',
          spiritualTestimony: 'My testimony of faith and transformation',
          academicHistory: [],
          characterReferences: []
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.application).toHaveProperty('applicantId', user.id);
    });

    it('should get application status', async () => {
      const application = await ApplicationFactory.create(user.id);

      const response = await request(app)
        .get(`/api/admissions/applications/${application.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.application.id).toBe(application.id);
    });

    it('should update application', async () => {
      const application = await ApplicationFactory.create(user.id, {
        status: 'DRAFT'
      });

      const response = await request(app)
        .put(`/api/admissions/applications/${application.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          personalStatement: 'Updated personal statement'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.application.personalStatement).toBe('Updated personal statement');
    });

    it('should prevent updating submitted application', async () => {
      const application = await ApplicationFactory.create(user.id, {
        status: 'SUBMITTED'
      });

      const response = await request(app)
        .put(`/api/admissions/applications/${application.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          personalStatement: 'Updated personal statement'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent');

      expect(response.status).toBe(404);
    });

    it('should return 401 for unauthorized requests', async () => {
      const response = await request(app)
        .get('/api/courses');

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid request data', async () => {
      const user = await UserFactory.create();
      const jwt = require('jsonwebtoken');
      const authToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/admissions/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          programApplied: 'INVALID_PROGRAM'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
