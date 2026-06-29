/**
 * Post-Launch Monitoring Service Tests
 * Basic tests for monitoring, feedback, and A/B testing services
 */

import PostLaunchMonitoringService from '../PostLaunchMonitoringService';
import UserFeedbackService from '../UserFeedbackService';
import ABTestingService from '../ABTestingService';
import BugFeatureManagementService from '../BugFeatureManagementService';
import PerformanceReportingService from '../PerformanceReportingService';

describe('PostLaunchMonitoringService', () => {
  let service: PostLaunchMonitoringService;

  beforeEach(() => {
    service = new PostLaunchMonitoringService();
  });

  describe('Metric Recording', () => {
    it('should record a metric successfully', async () => {
      await expect(
        service.recordMetric('test_metric', 100, 'count', { test: 'true' })
      ).resolves.not.toThrow();
    });

    it('should retrieve metrics', async () => {
      const metrics = await service.getRealTimeMetrics(['test_metric']);
      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  describe('System Health', () => {
    it('should get system health status', async () => {
      const health = await service.getSystemHealth();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('metrics');
      expect(health).toHaveProperty('alerts');
      expect(['healthy', 'degraded', 'critical']).toContain(health.status);
    });
  });

  describe('Alert Management', () => {
    it('should get active alerts', async () => {
      const alerts = await service.getActiveAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should create alert rules', async () => {
      const rule = await service.createAlertRule({
        name: 'Test Alert',
        description: 'Test alert rule',
        metric: 'test_metric',
        condition: {
          operator: '>',
          threshold: 100,
          duration: 60,
        },
        severity: 'warning',
        notificationChannels: ['email'],
        enabled: true,
        cooldownPeriod: 15,
      });

      expect(rule).toHaveProperty('id');
      expect(rule.name).toBe('Test Alert');
    });
  });
});

describe('UserFeedbackService', () => {
  let service: UserFeedbackService;

  beforeEach(() => {
    service = new UserFeedbackService();
  });

  describe('Feedback Submission', () => {
    it('should submit feedback successfully', async () => {
      const feedback = await service.submitFeedback('test-user-id', {
        type: 'bug',
        category: 'courses',
        title: 'Test Bug',
        description: 'This is a test bug',
        severity: 'low',
        metadata: {
          userAgent: 'Test Agent',
          platform: 'Test Platform',
          screenResolution: '1920x1080',
          url: '/test',
          sessionId: 'test-session',
          browserInfo: {
            name: 'Chrome',
            version: '120',
            engine: 'Blink',
          },
          deviceInfo: {
            type: 'desktop',
            os: 'Windows',
            osVersion: '11',
          },
        },
      });

      expect(feedback).toHaveProperty('id');
      expect(feedback.title).toBe('Test Bug');
    });

    it('should get all feedback with filters', async () => {
      const result = await service.getAllFeedback({
        type: 'bug',
        limit: 10,
      });

      expect(result).toHaveProperty('feedback');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.feedback)).toBe(true);
    });
  });

  describe('Feedback Analytics', () => {
    it('should get feedback analytics', async () => {
      const analytics = await service.getFeedbackAnalytics();

      expect(analytics).toHaveProperty('totalFeedback');
      expect(analytics).toHaveProperty('byType');
      expect(analytics).toHaveProperty('byCategory');
      expect(analytics).toHaveProperty('byStatus');
    });
  });
});

describe('ABTestingService', () => {
  let service: ABTestingService;

  beforeEach(() => {
    service = new ABTestingService();
  });

  describe('Test Creation', () => {
    it('should create an A/B test successfully', async () => {
      const test = await service.createTest('test-user-id', {
        name: 'Test A/B Test',
        description: 'Testing new feature',
        hypothesis: 'New feature will increase engagement',
        feature: 'test_feature',
        variants: [
          {
            name: 'Control',
            description: 'Current version',
            trafficAllocation: 50,
            config: {},
            isControl: true,
          },
          {
            name: 'Variant A',
            description: 'New version',
            trafficAllocation: 50,
            config: {},
            isControl: false,
          },
        ],
        targetAudience: {},
        metrics: [
          {
            name: 'engagement',
            type: 'engagement',
            goal: 'increase',
            primaryMetric: true,
          },
        ],
        startDate: new Date(),
      });

      expect(test).toHaveProperty('id');
      expect(test.name).toBe('Test A/B Test');
      expect(test.status).toBe('draft');
    });

    it('should reject test with invalid traffic allocation', async () => {
      await expect(
        service.createTest('test-user-id', {
          name: 'Invalid Test',
          description: 'Testing',
          hypothesis: 'Test',
          feature: 'test',
          variants: [
            {
              name: 'Control',
              description: 'Control',
              trafficAllocation: 60,
              config: {},
              isControl: true,
            },
            {
              name: 'Variant A',
              description: 'Variant',
              trafficAllocation: 30,
              config: {},
              isControl: false,
            },
          ],
          targetAudience: {},
          metrics: [],
          startDate: new Date(),
        })
      ).rejects.toThrow('Total traffic allocation must equal 100%');
    });
  });
});

describe('BugFeatureManagementService', () => {
  let service: BugFeatureManagementService;

  beforeEach(() => {
    service = new BugFeatureManagementService();
  });

  describe('Bug Tracking', () => {
    it('should create a bug report', async () => {
      const bug = await service.createBug('test-user-id', {
        title: 'Test Bug',
        description: 'This is a test bug',
        severity: 'medium',
        category: 'courses',
        affectedFeature: 'video_player',
        stepsToReproduce: ['Step 1', 'Step 2'],
        expectedBehavior: 'Should work',
        actualBehavior: 'Does not work',
        environment: {
          platform: 'Windows',
          browser: 'Chrome',
          browserVersion: '120',
          os: 'Windows',
          osVersion: '11',
          appVersion: '1.0.0',
          userAgent: 'Test Agent',
        },
      });

      expect(bug).toHaveProperty('id');
      expect(bug.title).toBe('Test Bug');
      expect(bug.status).toBe('new');
    });

    it('should get bug analytics', async () => {
      const analytics = await service.getBugAnalytics();

      expect(analytics).toHaveProperty('totalBugs');
      expect(analytics).toHaveProperty('openBugs');
      expect(analytics).toHaveProperty('resolvedBugs');
      expect(analytics).toHaveProperty('averageResolutionTime');
    });
  });

  describe('Feature Requests', () => {
    it('should create a feature request', async () => {
      const feature = await service.createFeatureRequest('test-user-id', {
        title: 'Test Feature',
        description: 'This is a test feature request',
        category: 'courses',
        businessValue: 80,
      });

      expect(feature).toHaveProperty('id');
      expect(feature.title).toBe('Test Feature');
      expect(feature.status).toBe('submitted');
      expect(feature.votes).toBe(0);
    });
  });
});

describe('PerformanceReportingService', () => {
  let service: PerformanceReportingService;

  beforeEach(() => {
    service = new PerformanceReportingService();
  });

  describe('Report Generation', () => {
    it('should generate a performance report', async () => {
      const report = await service.generateReport(
        {
          type: 'daily',
          period: {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000),
            end: new Date(),
          },
        },
        'test-user-id'
      );

      expect(report).toHaveProperty('id');
      expect(report.type).toBe('daily');
      expect(report).toHaveProperty('sections');
      expect(report).toHaveProperty('summary');
      expect(Array.isArray(report.sections)).toBe(true);
    });

    it('should get all reports', async () => {
      const result = await service.getAllReports({ limit: 10 });

      expect(result).toHaveProperty('reports');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.reports)).toBe(true);
    });
  });

  describe('Continuous Improvement', () => {
    it('should create an improvement initiative', async () => {
      const initiative = await service.createInitiative({
        title: 'Test Initiative',
        description: 'Testing improvement tracking',
        type: 'performance',
        status: 'proposed',
        owner: 'test-user-id',
        team: ['user1', 'user2'],
        goals: [
          {
            description: 'Improve response time',
            measurable: true,
            target: 200,
            unit: 'ms',
          },
        ],
        metrics: [
          {
            name: 'response_time',
            baseline: 300,
            current: 300,
            target: 200,
            unit: 'ms',
            trend: 'stable',
          },
        ],
        milestones: [
          {
            id: 'milestone-1',
            title: 'Phase 1',
            description: 'Initial optimization',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            completed: false,
            deliverables: ['Optimize queries'],
          },
        ],
        startDate: new Date(),
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });

      expect(initiative).toHaveProperty('id');
      expect(initiative.title).toBe('Test Initiative');
      expect(initiative.status).toBe('proposed');
    });
  });
});
