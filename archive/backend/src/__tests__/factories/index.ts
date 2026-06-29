/**
 * Test Data Factories
 * "Test all things; hold fast what is good" - 1 Thessalonians 5:21
 */

import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

/**
 * User Factory
 */
export class UserFactory {
  static async create(overrides: any = {}) {
    const randomId = randomBytes(4).toString('hex');
    return await prisma.user.create({
      data: {
        email: overrides.email || `user${randomId}@scrolluniversity.edu`,
        username: overrides.username || `user${randomId}`,
        passwordHash: overrides.passwordHash || '$2b$04$test.hash.for.testing.purposes.only',
        firstName: overrides.firstName || 'Test',
        lastName: overrides.lastName || 'User',
        role: overrides.role || 'STUDENT',
        academicLevel: overrides.academicLevel || 'SCROLL_OPEN',
        ...overrides
      }
    });
  }

  static async createMany(count: number, overrides: any = {}) {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.create(overrides));
    }
    return users;
  }

  static async createStudent(overrides: any = {}) {
    return await this.create({ role: 'STUDENT', ...overrides });
  }

  static async createInstructor(overrides: any = {}) {
    return await this.create({ role: 'INSTRUCTOR', ...overrides });
  }

  static async createAdmin(overrides: any = {}) {
    return await this.create({ role: 'ADMIN', ...overrides });
  }
}

/**
 * Faculty Factory
 */
export class FacultyFactory {
  static async create(overrides: any = {}) {
    const randomId = randomBytes(4).toString('hex');
    return await prisma.faculty.create({
      data: {
        name: overrides.name || `Test Faculty ${randomId}`,
        description: overrides.description || 'Test faculty for testing purposes',
        ...overrides
      }
    });
  }
}

/**
 * Course Factory
 */
export class CourseFactory {
  static async create(overrides: any = {}) {
    const randomId = randomBytes(4).toString('hex');
    
    // Create faculty if not provided
    let facultyId = overrides.facultyId;
    if (!facultyId) {
      const faculty = await FacultyFactory.create();
      facultyId = faculty.id;
    }

    return await prisma.course.create({
      data: {
        title: overrides.title || `Test Course ${randomId}`,
        description: overrides.description || 'Test course for testing purposes',
        difficulty: overrides.difficulty || 'BEGINNER',
        duration: overrides.duration || 60,
        scrollXPReward: overrides.scrollXPReward || 100,
        scrollCoinCost: overrides.scrollCoinCost || 0,
        facultyId,
        ...overrides
      }
    });
  }

  static async createMany(count: number, overrides: any = {}) {
    const courses = [];
    for (let i = 0; i < count; i++) {
      courses.push(await this.create(overrides));
    }
    return courses;
  }
}

/**
 * Enrollment Factory
 */
export class EnrollmentFactory {
  static async create(userId: string, courseId: string, overrides: any = {}) {
    return await prisma.enrollment.create({
      data: {
        userId,
        courseId,
        status: overrides.status || 'ACTIVE',
        progress: overrides.progress || 0,
        enrolledAt: overrides.enrolledAt || new Date(),
        ...overrides
      }
    });
  }
}

/**
 * Application Factory
 */
export class ApplicationFactory {
  static async create(userId: string, overrides: any = {}) {
    return await prisma.application.create({
      data: {
        applicantId: userId,
        programApplied: overrides.programApplied || 'SCROLL_DEGREE',
        intendedStartDate: overrides.intendedStartDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        personalStatement: overrides.personalStatement || 'Test personal statement for testing purposes',
        spiritualTestimony: overrides.spiritualTestimony || 'Test spiritual testimony for testing purposes',
        academicHistory: overrides.academicHistory || [],
        characterReferences: overrides.characterReferences || [],
        documents: overrides.documents || [],
        applicationTimeline: overrides.applicationTimeline || [],
        ...overrides
      }
    });
  }
}

/**
 * Assignment Factory
 */
export class AssignmentFactory {
  static async create(courseId: string, overrides: any = {}) {
    const randomId = randomBytes(4).toString('hex');
    return await prisma.assignment.create({
      data: {
        courseId,
        title: overrides.title || `Test Assignment ${randomId}`,
        description: overrides.description || 'Test assignment for testing purposes',
        type: overrides.type || 'ESSAY',
        maxScore: overrides.maxScore || 100,
        dueDate: overrides.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ...overrides
      }
    });
  }
}

/**
 * Submission Factory
 */
export class SubmissionFactory {
  static async create(assignmentId: string, userId: string, overrides: any = {}) {
    return await prisma.submission.create({
      data: {
        assignmentId,
        userId,
        content: overrides.content || 'Test submission content for testing purposes',
        submittedAt: overrides.submittedAt || new Date(),
        ...overrides
      }
    });
  }
}

/**
 * Message Factory
 */
export class MessageFactory {
  static async create(senderId: string, overrides: any = {}) {
    const randomId = randomBytes(4).toString('hex');
    return await prisma.message.create({
      data: {
        senderId,
        content: overrides.content || `Test message ${randomId}`,
        channelId: overrides.channelId || null,
        recipientId: overrides.recipientId || null,
        ...overrides
      }
    });
  }
}

/**
 * Post Factory
 */
export class PostFactory {
  static async create(authorId: string, overrides: any = {}) {
    const randomId = randomBytes(4).toString('hex');
    return await prisma.post.create({
      data: {
        authorId,
        content: overrides.content || `Test post content ${randomId}`,
        type: overrides.type || 'TEXT',
        ...overrides
      }
    });
  }
}

/**
 * Study Group Factory
 */
export class StudyGroupFactory {
  static async create(creatorId: string, courseId: string, overrides: any = {}) {
    const randomId = randomBytes(4).toString('hex');
    return await prisma.studyGroup.create({
      data: {
        name: overrides.name || `Test Study Group ${randomId}`,
        description: overrides.description || 'Test study group for testing purposes',
        courseId,
        creatorId,
        maxMembers: overrides.maxMembers || 10,
        ...overrides
      }
    });
  }
}

/**
 * Prayer Entry Factory
 */
export class PrayerEntryFactory {
  static async create(userId: string, overrides: any = {}) {
    const randomId = randomBytes(4).toString('hex');
    return await prisma.prayerEntry.create({
      data: {
        userId,
        content: overrides.content || `Test prayer request ${randomId}`,
        category: overrides.category || 'PERSONAL',
        isPrivate: overrides.isPrivate !== undefined ? overrides.isPrivate : false,
        ...overrides
      }
    });
  }
}

/**
 * Devotion Factory
 */
export class DevotionFactory {
  static async create(overrides: any = {}) {
    return await prisma.devotion.create({
      data: {
        date: overrides.date || new Date(),
        scriptureReference: overrides.scriptureReference || 'John 3:16',
        scriptureText: overrides.scriptureText || 'For God so loved the world...',
        reflection: overrides.reflection || 'Test reflection content',
        prayerPrompt: overrides.prayerPrompt || 'Test prayer prompt',
        actionStep: overrides.actionStep || 'Test action step',
        ...overrides
      }
    });
  }
}

/**
 * Scholarship Factory
 */
export class ScholarshipFactory {
  static async create(overrides: any = {}) {
    const randomId = randomBytes(4).toString('hex');
    return await prisma.scholarship.create({
      data: {
        name: overrides.name || `Test Scholarship ${randomId}`,
        description: overrides.description || 'Test scholarship for testing purposes',
        amount: overrides.amount || 5000,
        eligibilityCriteria: overrides.eligibilityCriteria || {},
        applicationDeadline: overrides.applicationDeadline || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        ...overrides
      }
    });
  }
}

/**
 * Notification Factory
 */
export class NotificationFactory {
  static async create(userId: string, overrides: any = {}) {
    const randomId = randomBytes(4).toString('hex');
    return await prisma.notification.create({
      data: {
        userId,
        type: overrides.type || 'INFO',
        title: overrides.title || `Test Notification ${randomId}`,
        message: overrides.message || 'Test notification message',
        ...overrides
      }
    });
  }
}

/**
 * Complete Test Environment Factory
 */
export class TestEnvironmentFactory {
  static async create() {
    // Create users
    const student = await UserFactory.createStudent();
    const instructor = await UserFactory.createInstructor();
    const admin = await UserFactory.createAdmin();

    // Create faculty and course
    const faculty = await FacultyFactory.create();
    const course = await CourseFactory.create({ facultyId: faculty.id });

    // Create enrollment
    const enrollment = await EnrollmentFactory.create(student.id, course.id);

    // Create assignment
    const assignment = await AssignmentFactory.create(course.id);

    // Create study group
    const studyGroup = await StudyGroupFactory.create(student.id, course.id);

    return {
      users: { student, instructor, admin },
      faculty,
      course,
      enrollment,
      assignment,
      studyGroup
    };
  }
}

export default {
  UserFactory,
  FacultyFactory,
  CourseFactory,
  EnrollmentFactory,
  ApplicationFactory,
  AssignmentFactory,
  SubmissionFactory,
  MessageFactory,
  PostFactory,
  StudyGroupFactory,
  PrayerEntryFactory,
  DevotionFactory,
  ScholarshipFactory,
  NotificationFactory,
  TestEnvironmentFactory
};
