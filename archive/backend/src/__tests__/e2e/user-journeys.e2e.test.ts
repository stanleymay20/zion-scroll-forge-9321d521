/**
 * User Journeys E2E Tests
 * "Test all things; hold fast what is good" - 1 Thessalonians 5:21
 */

import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { UserFactory, CourseFactory, FacultyFactory } from '../factories';

const prisma = new PrismaClient();
let app: express.Application;

describe('User Journeys E2E Tests', () => {
  beforeAll(async () => {
    // Initialize Express app with all routes
    app = express();
    app.use(express.json());
    
    // Import and mount all routes
    const authRoutes = require('../../routes/auth').default;
    const courseRoutes = require('../../routes/courses').default;
    const admissionsRoutes = require('../../routes/admissions').default;
    const enrollmentRoutes = require('../../routes/enrollment').default;
    const assignmentRoutes = require('../../routes/assignments').default;
    
    app.use('/api/auth', authRoutes);
    app.use('/api/courses', courseRoutes);
    app.use('/api/admissions', admissionsRoutes);
    app.use('/api/enrollment', enrollmentRoutes);
    app.use('/api/assignments', assignmentRoutes);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Student Registration and Course Enrollment Journey', () => {
    it('should complete full student journey from registration to course enrollment', async () => {
      // Step 1: Register new student
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'journey@scrolluniversity.edu',
          username: 'journeystudent',
          password: 'JourneyPassword123!',
          firstName: 'Journey',
          lastName: 'Student'
        });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);
      const authToken = registerResponse.body.data.token;
      const userId = registerResponse.body.data.user.id;

      // Step 2: Browse available courses
      const faculty = await FacultyFactory.create();
      const course1 = await CourseFactory.create({ facultyId: faculty.id });
      const course2 = await CourseFactory.create({ facultyId: faculty.id });

      const coursesResponse = await request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${authToken}`);

      expect(coursesResponse.status).toBe(200);
      expect(coursesResponse.body.data.courses.length).toBeGreaterThanOrEqual(2);

      // Step 3: View course details
      const courseDetailResponse = await request(app)
        .get(`/api/courses/${course1.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(courseDetailResponse.status).toBe(200);
      expect(courseDetailResponse.body.data.course.id).toBe(course1.id);

      // Step 4: Enroll in course
      const enrollResponse = await request(app)
        .post(`/api/courses/${course1.id}/enroll`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(enrollResponse.status).toBe(201);
      expect(enrollResponse.body.data.enrollment.userId).toBe(userId);
      expect(enrollResponse.body.data.enrollment.courseId).toBe(course1.id);

      // Step 5: View enrollment status
      const enrollmentResponse = await request(app)
        .get('/api/enrollment/my-courses')
        .set('Authorization', `Bearer ${authToken}`);

      expect(enrollmentResponse.status).toBe(200);
      expect(enrollmentResponse.body.data.enrollments).toHaveLength(1);
      expect(enrollmentResponse.body.data.enrollments[0].courseId).toBe(course1.id);

      // Step 6: Update course progress
      const progressResponse = await request(app)
        .put(`/api/enrollment/${enrollResponse.body.data.enrollment.id}/progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ progress: 25 });

      expect(progressResponse.status).toBe(200);
      expect(progressResponse.body.data.enrollment.progress).toBe(25);
    });
  });

  describe('Admissions Application Journey', () => {
    it('should complete full admissions journey from application to decision', async () => {
      // Step 1: Create applicant user
      const user = await UserFactory.createStudent();
      const jwt = require('jsonwebtoken');
      const authToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Step 2: Submit application
      const applicationResponse = await request(app)
        .post('/api/admissions/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          programApplied: 'SCROLL_DEGREE',
          intendedStartDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          personalStatement: 'I am passionate about scroll-aligned education and ministry',
          spiritualTestimony: 'My testimony of faith, transformation, and calling',
          academicHistory: [
            {
              institutionName: 'Previous University',
              degree: 'Bachelor of Arts',
              fieldOfStudy: 'Theology',
              startDate: '2020-09-01',
              endDate: '2024-05-15',
              gpa: 3.7,
              creditsEarned: 120
            }
          ],
          characterReferences: [
            {
              name: 'Pastor John Smith',
              relationship: 'Pastor',
              contact: 'pastor@church.org',
              recommendation: 'Strong character and spiritual maturity'
            }
          ]
        });

      expect(applicationResponse.status).toBe(201);
      expect(applicationResponse.body.success).toBe(true);
      const applicationId = applicationResponse.body.data.application.id;

      // Step 3: Check application status
      const statusResponse = await request(app)
        .get(`/api/admissions/applications/${applicationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.data.application.status).toBe('SUBMITTED');

      // Step 4: Upload documents
      const documentResponse = await request(app)
        .post(`/api/admissions/applications/${applicationId}/documents`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          documentType: 'TRANSCRIPT',
          documentUrl: 'https://storage.example.com/transcript.pdf',
          documentName: 'Official Transcript'
        });

      expect(documentResponse.status).toBe(201);
      expect(documentResponse.body.success).toBe(true);

      // Step 5: Admin reviews application (simulate admin action)
      const admin = await UserFactory.createAdmin();
      const adminToken = jwt.sign(
        { userId: admin.id, role: admin.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const reviewResponse = await request(app)
        .put(`/api/admissions/applications/${applicationId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'UNDER_REVIEW',
          reviewNotes: 'Application looks promising, proceeding to interview'
        });

      expect(reviewResponse.status).toBe(200);
      expect(reviewResponse.body.data.application.status).toBe('UNDER_REVIEW');

      // Step 6: Schedule interview
      const interviewResponse = await request(app)
        .post(`/api/admissions/applications/${applicationId}/interview`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          interviewType: 'VIDEO',
          interviewerName: 'Dr. Smith'
        });

      expect(interviewResponse.status).toBe(201);
      expect(interviewResponse.body.success).toBe(true);

      // Step 7: Make admission decision
      const decisionResponse = await request(app)
        .put(`/api/admissions/applications/${applicationId}/decision`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          decision: 'ACCEPTED',
          decisionNotes: 'Strong academic background and spiritual maturity',
          scholarshipOffered: true,
          scholarshipAmount: 5000
        });

      expect(decisionResponse.status).toBe(200);
      expect(decisionResponse.body.data.application.status).toBe('ACCEPTED');

      // Step 8: Applicant views decision
      const finalStatusResponse = await request(app)
        .get(`/api/admissions/applications/${applicationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(finalStatusResponse.status).toBe(200);
      expect(finalStatusResponse.body.data.application.status).toBe('ACCEPTED');
      expect(finalStatusResponse.body.data.application.decision).toBe('ACCEPTED');
    });
  });

  describe('Course Completion and Assessment Journey', () => {
    it('should complete full course journey from enrollment to completion', async () => {
      // Step 1: Create student and course
      const user = await UserFactory.createStudent();
      const jwt = require('jsonwebtoken');
      const authToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const faculty = await FacultyFactory.create();
      const course = await CourseFactory.create({ facultyId: faculty.id });

      // Step 2: Enroll in course
      const enrollResponse = await request(app)
        .post(`/api/courses/${course.id}/enroll`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(enrollResponse.status).toBe(201);
      const enrollmentId = enrollResponse.body.data.enrollment.id;

      // Step 3: View course content
      const contentResponse = await request(app)
        .get(`/api/courses/${course.id}/content`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(contentResponse.status).toBe(200);

      // Step 4: Complete lectures (simulate progress)
      for (let progress = 25; progress <= 100; progress += 25) {
        const progressResponse = await request(app)
          .put(`/api/enrollment/${enrollmentId}/progress`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ progress });

        expect(progressResponse.status).toBe(200);
        expect(progressResponse.body.data.enrollment.progress).toBe(progress);
      }

      // Step 5: Submit assignment
      const assignment = await prisma.assignment.create({
        data: {
          courseId: course.id,
          title: 'Final Essay',
          description: 'Write an essay on scroll theology',
          type: 'ESSAY',
          maxScore: 100,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      const submissionResponse = await request(app)
        .post(`/api/assignments/${assignment.id}/submit`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'My comprehensive essay on scroll theology and its implications...',
          attachments: []
        });

      expect(submissionResponse.status).toBe(201);
      expect(submissionResponse.body.success).toBe(true);

      // Step 6: Instructor grades assignment
      const instructor = await UserFactory.createInstructor();
      const instructorToken = jwt.sign(
        { userId: instructor.id, role: instructor.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const gradeResponse = await request(app)
        .put(`/api/assignments/${assignment.id}/submissions/${submissionResponse.body.data.submission.id}/grade`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          score: 95,
          feedback: 'Excellent work! Deep understanding of scroll theology principles.'
        });

      expect(gradeResponse.status).toBe(200);
      expect(gradeResponse.body.data.submission.score).toBe(95);

      // Step 7: Complete course and receive certificate
      const completionResponse = await request(app)
        .post(`/api/enrollment/${enrollmentId}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(completionResponse.status).toBe(200);
      expect(completionResponse.body.data.enrollment.status).toBe('COMPLETED');
      expect(completionResponse.body.data.certificate).toBeDefined();
      expect(completionResponse.body.data.scrollCoinReward).toBeGreaterThan(0);
    });
  });

  describe('Spiritual Formation Journey', () => {
    it('should complete spiritual formation activities', async () => {
      // Step 1: Create student
      const user = await UserFactory.createStudent();
      const jwt = require('jsonwebtoken');
      const authToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Step 2: Complete daily devotion
      const devotionResponse = await request(app)
        .post('/api/spiritual-formation/devotions/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          devotionId: 'daily-devotion-1',
          notes: 'Powerful reflection on God\'s love and grace',
          prayerRequests: ['Wisdom in studies', 'Spiritual growth']
        });

      expect(devotionResponse.status).toBe(201);
      expect(devotionResponse.body.success).toBe(true);

      // Step 3: Add prayer journal entry
      const prayerResponse = await request(app)
        .post('/api/spiritual-formation/prayer-journal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Lord, guide me in my studies and help me grow in wisdom',
          category: 'PERSONAL',
          isPrivate: false
        });

      expect(prayerResponse.status).toBe(201);
      expect(prayerResponse.body.success).toBe(true);

      // Step 4: Practice scripture memory
      const scriptureResponse = await request(app)
        .post('/api/spiritual-formation/scripture-memory/practice')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          verseId: 'john-3-16',
          accuracy: 95,
          timeSpent: 300
        });

      expect(scriptureResponse.status).toBe(201);
      expect(scriptureResponse.body.success).toBe(true);

      // Step 5: Complete prophetic check-in
      const checkinResponse = await request(app)
        .post('/api/spiritual-formation/prophetic-checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          responses: {
            spiritualHealth: 8,
            prayerLife: 7,
            scriptureEngagement: 9,
            communityInvolvement: 6,
            callingClarity: 7
          },
          reflections: 'Growing in my understanding of God\'s calling on my life'
        });

      expect(checkinResponse.status).toBe(201);
      expect(checkinResponse.body.success).toBe(true);

      // Step 6: View spiritual growth dashboard
      const dashboardResponse = await request(app)
        .get('/api/spiritual-formation/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body.data.devotionsCompleted).toBeGreaterThan(0);
      expect(dashboardResponse.body.data.prayerEntries).toBeGreaterThan(0);
      expect(dashboardResponse.body.data.scriptureMemoryProgress).toBeDefined();
      expect(dashboardResponse.body.data.spiritualGrowthScore).toBeGreaterThan(0);
    });
  });
});
