/**
 * Notification Service Tests
 * Comprehensive tests for notification management
 */

import NotificationService from '../NotificationService';
import NotificationBatchingService from '../NotificationBatchingService';
import NotificationTemplateService from '../NotificationTemplateService';
import NotificationAnalyticsService from '../NotificationAnalyticsService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let batchingService: NotificationBatchingService;
  let templateService: NotificationTemplateService;
  let analyticsService: NotificationAnalyticsService;
  let testUserId: string;

  beforeAll(async () => {
    notificationService = new NotificationService();
    batchingService = new NotificationBatchingService();
    templateService = new NotificationTemplateService();
    analyticsService = new NotificationAnalyticsService();

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: 'notification-test@scrolluniversity.edu',
        name: 'Notification Test User',
        role: 'STUDENT',
      },
    });
    testUserId = testUser.id;

    // Initialize default templates
    await templateService.initializeDefaultTemplates();
  });

  afterAll(async () => {
    // Cleanup
    await prisma.notificationEngagement.deleteMany({ where: { userId: testUserId } });
    await prisma.notificationDelivery.deleteMany({});
    await prisma.notification.deleteMany({ where: { userId: testUserId } });
    await prisma.notificationBatch.deleteMany({ where: { userId: testUserId } });
    await prisma.notificationPreferences.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('Notification Creation', () => {
    it('should create a notification successfully', async () => {
      const notification = await notificationService.createNotification({
        userId: testUserId,
        category: 'academic',
        subject: 'Test Notification',
        content: 'This is a test notification',
        channels: ['email', 'in_app'],
      });

      expect(notification).toBeDefined();
      expect(notification.userId).toBe(testUserId);
      expect(notification.subject).toBe('Test Notification');
      expect(notification.status).toBe('sent');
    });

    it('should create notification with template', async () => {
      const templates = await templateService.getAllTemplates('academic');
      const template = templates[0];

      const notification = await notificationService.createNotification({
        userId: testUserId,
        templateId: template.id,
        category: 'academic',
        subject: 'Course Enrollment',
        content: 'You have enrolled in a course',
        data: {
          courseName: 'Sacred AI Engineering',
          startDate: '2025-01-01',
        },
      });

      expect(notification).toBeDefined();
      expect(notification.templateId).toBe(template.id);
    });

    it('should schedule notification for future delivery', async () => {
      const scheduledFor = new Date();
      scheduledFor.setHours(scheduledFor.getHours() + 1);

      const notification = await notificationService.createNotification({
        userId: testUserId,
        category: 'spiritual',
        subject: 'Scheduled Notification',
        content: 'This will be sent later',
        scheduledFor,
      });

      expect(notification.status).toBe('pending');
      expect(notification.scheduledFor).toBeDefined();
    });
  });

  describe('Notification Preferences', () => {
    it('should get default preferences for new user', async () => {
      const preferences = await notificationService.getUserPreferences(testUserId);

      expect(preferences).toBeDefined();
      expect(preferences.email.enabled).toBe(true);
      expect(preferences.push.enabled).toBe(true);
      expect(preferences.batchingEnabled).toBe(false);
    });

    it('should update user preferences', async () => {
      const updated = await notificationService.updatePreferences(testUserId, {
        email: {
          enabled: true,
          marketing: false,
        },
        batchingEnabled: true,
        batchInterval: 60,
      });

      expect(updated.batchingEnabled).toBe(true);
      expect(updated.batchInterval).toBe(60);
    });

    it('should respect quiet hours', async () => {
      await notificationService.updatePreferences(testUserId, {
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'UTC',
        },
      });

      const preferences = await notificationService.getUserPreferences(testUserId);
      expect(preferences.quietHours.enabled).toBe(true);
    });
  });

  describe('Notification Retrieval', () => {
    it('should get user notifications', async () => {
      const notifications = await notificationService.getUserNotifications({
        userId: testUserId,
        limit: 10,
      });

      expect(Array.isArray(notifications)).toBe(true);
      expect(notifications.length).toBeGreaterThan(0);
    });

    it('should filter notifications by category', async () => {
      const notifications = await notificationService.getUserNotifications({
        userId: testUserId,
        category: 'academic',
      });

      expect(notifications.every((n) => n.category === 'academic')).toBe(true);
    });

    it('should filter notifications by read status', async () => {
      const unreadNotifications = await notificationService.getUserNotifications({
        userId: testUserId,
        isRead: false,
      });

      expect(unreadNotifications.every((n) => !n.readAt)).toBe(true);
    });
  });

  describe('Notification Actions', () => {
    it('should mark notification as read', async () => {
      const notification = await notificationService.createNotification({
        userId: testUserId,
        category: 'system',
        subject: 'Mark as Read Test',
        content: 'Testing read functionality',
      });

      await notificationService.markAsRead(notification.id);

      const updated = await prisma.notification.findUnique({
        where: { id: notification.id },
      });

      expect(updated?.status).toBe('read');
      expect(updated?.readAt).toBeDefined();
    });

    it('should delete notification', async () => {
      const notification = await notificationService.createNotification({
        userId: testUserId,
        category: 'system',
        subject: 'Delete Test',
        content: 'Testing delete functionality',
      });

      await notificationService.deleteNotification(notification.id);

      const deleted = await prisma.notification.findUnique({
        where: { id: notification.id },
      });

      expect(deleted).toBeNull();
    });

    it('should track notification engagement', async () => {
      const notification = await notificationService.createNotification({
        userId: testUserId,
        category: 'social',
        subject: 'Engagement Test',
        content: 'Testing engagement tracking',
      });

      await notificationService.trackEngagement({
        notificationId: notification.id,
        userId: testUserId,
        action: 'opened',
        timestamp: new Date(),
      });

      const engagement = await prisma.notificationEngagement.findFirst({
        where: {
          notificationId: notification.id,
          action: 'opened',
        },
      });

      expect(engagement).toBeDefined();
    });
  });

  describe('Bulk Notifications', () => {
    it('should send bulk notifications', async () => {
      const result = await notificationService.sendBulkNotifications({
        userIds: [testUserId],
        category: 'administrative',
        subject: 'Bulk Test',
        content: 'Testing bulk sending',
      });

      expect(result.sent).toBeGreaterThan(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('Notification Batching', () => {
    it('should create notification batch', async () => {
      const scheduledFor = new Date();
      scheduledFor.setMinutes(scheduledFor.getMinutes() + 30);

      const batch = await batchingService.createBatch(testUserId, scheduledFor);

      expect(batch).toBeDefined();
      expect(batch.status).toBe('pending');
    });

    it('should add notification to batch', async () => {
      const scheduledFor = new Date();
      scheduledFor.setMinutes(scheduledFor.getMinutes() + 30);

      const batch = await batchingService.createBatch(testUserId, scheduledFor);

      const notification = await notificationService.createNotification({
        userId: testUserId,
        category: 'social',
        subject: 'Batch Test',
        content: 'Testing batching',
      });

      await batchingService.addToBatch(notification.id, batch.id);

      const updated = await prisma.notification.findUnique({
        where: { id: notification.id },
      });

      expect(updated?.batchId).toBe(batch.id);
    });
  });

  describe('Notification Templates', () => {
    it('should get all templates', async () => {
      const templates = await templateService.getAllTemplates();

      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should get template by name', async () => {
      const template = await templateService.getTemplateByName('Course Enrollment Confirmation');

      expect(template).toBeDefined();
      expect(template.name).toBe('Course Enrollment Confirmation');
    });

    it('should render template with variables', async () => {
      const template = await templateService.getTemplateByName('Course Enrollment Confirmation');

      const rendered = await templateService.renderTemplate(
        template.id,
        {
          userName: 'John Doe',
          courseName: 'Sacred AI Engineering',
          startDate: '2025-01-01',
          duration: '12 weeks',
          instructorName: 'Dr. Smith',
          courseUrl: 'https://scrolluniversity.edu/courses/1',
        },
        'email'
      );

      expect(rendered.subject).toContain('Sacred AI Engineering');
      expect(rendered.content).toContain('John Doe');
    });

    it('should preview template', async () => {
      const template = await templateService.getTemplateByName('Daily Devotion');

      const preview = await templateService.previewTemplate(template.id, {
        userName: 'John Doe',
        devotionTitle: 'Walking in Faith',
        scripture: 'Hebrews 11:1',
        scriptureText: 'Now faith is confidence in what we hope for...',
        reflection: 'Today we reflect on faith...',
        prayer: 'Lord, increase our faith...',
        devotionUrl: 'https://scrolluniversity.edu/devotions/1',
      });

      expect(preview.email).toBeDefined();
      expect(preview.push).toBeDefined();
    });
  });

  describe('Notification Analytics', () => {
    it('should get comprehensive analytics', async () => {
      const analytics = await analyticsService.getAnalytics({
        userId: testUserId,
      });

      expect(analytics).toBeDefined();
      expect(analytics.totalSent).toBeGreaterThanOrEqual(0);
      expect(analytics.byChannel).toBeDefined();
      expect(analytics.byCategory).toBeDefined();
    });

    it('should get channel performance', async () => {
      const performance = await analyticsService.getChannelPerformance('email', {
        userId: testUserId,
      });

      expect(performance).toBeDefined();
      expect(performance.sent).toBeGreaterThanOrEqual(0);
      expect(performance.deliveryRate).toBeGreaterThanOrEqual(0);
    });

    it('should get category performance', async () => {
      const performance = await analyticsService.getCategoryPerformance('academic', {
        userId: testUserId,
      });

      expect(performance).toBeDefined();
      expect(performance.sent).toBeGreaterThanOrEqual(0);
    });

    it('should get user engagement metrics', async () => {
      const engagement = await analyticsService.getUserEngagement(testUserId, {});

      expect(engagement).toBeDefined();
      expect(engagement.totalReceived).toBeGreaterThanOrEqual(0);
      expect(engagement.preferredChannel).toBeDefined();
    });

    it('should get notification trends', async () => {
      const trends = await analyticsService.getNotificationTrends('day', {
        userId: testUserId,
      });

      expect(Array.isArray(trends)).toBe(true);
    });

    it('should get engagement funnel', async () => {
      const funnel = await analyticsService.getEngagementFunnel({
        userId: testUserId,
      });

      expect(funnel).toBeDefined();
      expect(funnel.sent).toBeGreaterThanOrEqual(0);
      expect(funnel.delivered).toBeGreaterThanOrEqual(0);
    });
  });
});
