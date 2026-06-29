/**
 * Interview Scheduling System Tests
 * "Test all things; hold fast what is good" (1 Thessalonians 5:21)
 */

import { InterviewScheduler } from '../InterviewScheduler';
import { InterviewerMatcher } from '../InterviewerMatcher';
import { InterviewFormatSelector } from '../InterviewFormatSelector';
import { InterviewReminderManager } from '../InterviewReminderManager';
import { InterviewCoordinationService } from '../InterviewCoordinationService';
import { InterviewType, InterviewFormat } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    interviewRecord: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    },
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn()
    },
    application: {
      findUnique: jest.fn(),
      update: jest.fn()
    }
  })),
  InterviewType: {
    INITIAL_SCREENING: 'INITIAL_SCREENING',
    ACADEMIC_ASSESSMENT: 'ACADEMIC_ASSESSMENT',
    SPIRITUAL_EVALUATION: 'SPIRITUAL_EVALUATION',
    CHARACTER_INTERVIEW: 'CHARACTER_INTERVIEW',
    FINAL_INTERVIEW: 'FINAL_INTERVIEW',
    COMMITTEE_INTERVIEW: 'COMMITTEE_INTERVIEW'
  },
  InterviewFormat: {
    VIDEO_CONFERENCE: 'VIDEO_CONFERENCE',
    PHONE_CALL: 'PHONE_CALL',
    IN_PERSON: 'IN_PERSON',
    ASYNCHRONOUS_VIDEO: 'ASYNCHRONOUS_VIDEO'
  },
  InterviewStatus: {
    SCHEDULED: 'SCHEDULED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    RESCHEDULED: 'RESCHEDULED',
    NO_SHOW: 'NO_SHOW'
  }
}));

describe('InterviewScheduler', () => {
  let scheduler: InterviewScheduler;

  beforeEach(() => {
    scheduler = new InterviewScheduler();
    jest.clearAllMocks();
  });

  describe('scheduleInterview', () => {
    it('should successfully schedule an interview', async () => {
      const mockInterview = {
        id: 'interview-1',
        applicationId: 'app-1',
        interviewType: InterviewType.INITIAL_SCREENING,
        scheduledDate: new Date('2024-03-15T10:00:00Z'),
        interviewerId: 'interviewer-1',
        interviewerName: 'John Smith',
        format: InterviewFormat.VIDEO_CONFERENCE,
        duration: 30,
        platform: 'Zoom',
        meetingUrl: 'https://zoom.us/j/123456789',
        status: 'SCHEDULED'
      };

      const mockPrisma = require('@prisma/client').PrismaClient();
      mockPrisma.interviewRecord.create.mockResolvedValue(mockInterview);
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'interviewer-1',
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@scrolluniversity.edu',
          role: 'ADMISSIONS_OFFICER'
        }
      ]);
      mockPrisma.interviewRecord.count.mockResolvedValue(0);
      mockPrisma.application.update.mockResolvedValue({});

      const request = {
        applicationId: 'app-1',
        interviewType: InterviewType.INITIAL_SCREENING,
        preferredDates: [new Date('2024-03-15T10:00:00Z')],
        format: InterviewFormat.VIDEO_CONFERENCE,
        duration: 30,
        timeZone: 'UTC'
      };

      const result = await scheduler.scheduleInterview(request);

      expect(result).toEqual(mockInterview);
      expect(mockPrisma.interviewRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          applicationId: 'app-1',
          interviewType: InterviewType.INITIAL_SCREENING,
          format: InterviewFormat.VIDEO_CONFERENCE,
          duration: 30,
          status: 'SCHEDULED'
        })
      });
    });

    it('should throw error when no available slots', async () => {
      const mockPrisma = require('@prisma/client').PrismaClient();
      mockPrisma.user.findMany.mockResolvedValue([]);

      const request = {
        applicationId: 'app-1',
        interviewType: InterviewType.INITIAL_SCREENING,
        preferredDates: [new Date('2024-03-15T10:00:00Z')],
        format: InterviewFormat.VIDEO_CONFERENCE,
        duration: 30,
        timeZone: 'UTC'
      };

      await expect(scheduler.scheduleInterview(request)).rejects.toThrow('No available slots found');
    });
  });

  describe('findAvailableSlot', () => {
    it('should find available slot when interviewer is free', async () => {
      const mockPrisma = require('@prisma/client').PrismaClient();
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'interviewer-1',
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@scrolluniversity.edu',
          role: 'ADMISSIONS_OFFICER'
        }
      ]);
      mockPrisma.interviewRecord.count.mockResolvedValue(0);

      const request = {
        applicationId: 'app-1',
        interviewType: InterviewType.INITIAL_SCREENING,
        preferredDates: [new Date('2024-03-15T10:00:00Z')],
        format: InterviewFormat.VIDEO_CONFERENCE,
        duration: 30,
        timeZone: 'UTC'
      };

      const result = await scheduler.findAvailableSlot(request);

      expect(result.available).toBe(true);
      expect(result.interviewerId).toBe('interviewer-1');
      expect(result.interviewerName).toBe('John Smith');
    });

    it('should return unavailable when all slots are booked', async () => {
      const mockPrisma = require('@prisma/client').PrismaClient();
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'interviewer-1',
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@scrolluniversity.edu',
          role: 'ADMISSIONS_OFFICER'
        }
      ]);
      mockPrisma.interviewRecord.count.mockResolvedValue(1); // Conflict exists

      const request = {
        applicationId: 'app-1',
        interviewType: InterviewType.INITIAL_SCREENING,
        preferredDates: [new Date('2024-03-15T10:00:00Z')],
        format: InterviewFormat.VIDEO_CONFERENCE,
        duration: 30,
        timeZone: 'UTC'
      };

      const result = await scheduler.findAvailableSlot(request);

      expect(result.available).toBe(false);
      expect(result.conflictReason).toBe('All preferred time slots are unavailable');
    });
  });

  describe('rescheduleInterview', () => {
    it('should successfully reschedule an interview', async () => {
      const mockExistingInterview = {
        id: 'interview-1',
        applicationId: 'app-1',
        interviewType: InterviewType.INITIAL_SCREENING,
        scheduledDate: new Date('2024-03-15T10:00:00Z'),
        format: InterviewFormat.VIDEO_CONFERENCE,
        duration: 30
      };

      const mockUpdatedInterview = {
        ...mockExistingInterview,
        scheduledDate: new Date('2024-03-16T14:00:00Z'),
        status: 'RESCHEDULED'
      };

      const mockPrisma = require('@prisma/client').PrismaClient();
      mockPrisma.interviewRecord.findUnique.mockResolvedValue(mockExistingInterview);
      mockPrisma.interviewRecord.update.mockResolvedValue(mockUpdatedInterview);
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'interviewer-1',
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@scrolluniversity.edu',
          role: 'ADMISSIONS_OFFICER'
        }
      ]);
      mockPrisma.interviewRecord.count.mockResolvedValue(0);

      const result = await scheduler.rescheduleInterview('interview-1', {
        preferredDates: [new Date('2024-03-16T14:00:00Z')]
      });

      expect(result.scheduledDate).toEqual(new Date('2024-03-16T14:00:00Z'));
      expect(mockPrisma.interviewRecord.update).toHaveBeenCalledWith({
        where: { id: 'interview-1' },
        data: expect.objectContaining({
          status: 'RESCHEDULED'
        })
      });
    });
  });
});

describe('InterviewerMatcher', () => {
  let matcher: InterviewerMatcher;

  beforeEach(() => {
    matcher = new InterviewerMatcher();
    jest.clearAllMocks();
  });

  describe('findBestMatch', () => {
    it('should find best interviewer match', async () => {
      const mockInterviewers = [
        {
          id: 'interviewer-1',
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@scrolluniversity.edu',
          role: 'ADMISSIONS_OFFICER',
          spiritualGifts: ['teaching', 'discernment'],
          scrollAlignment: 0.9
        }
      ];

      const mockPrisma = require('@prisma/client').PrismaClient();
      mockPrisma.user.findMany.mockResolvedValue(mockInterviewers);
      mockPrisma.interviewRecord.count.mockResolvedValue(0);

      const criteria = {
        interviewType: InterviewType.INITIAL_SCREENING,
        applicantBackground: {
          academicLevel: 'undergraduate',
          spiritualMaturity: 'developing',
          culturalBackground: 'western',
          languagePreference: 'English'
        },
        scheduledDate: new Date('2024-03-15T10:00:00Z'),
        duration: 30
      };

      const result = await matcher.findBestMatch(criteria);

      expect(result.interviewerId).toBe('interviewer-1');
      expect(result.interviewerName).toBe('John Smith');
      expect(result.matchScore).toBeGreaterThan(0);
      expect(result.matchingReasons).toBeInstanceOf(Array);
    });

    it('should throw error when no eligible interviewers', async () => {
      const mockPrisma = require('@prisma/client').PrismaClient();
      mockPrisma.user.findMany.mockResolvedValue([]);

      const criteria = {
        interviewType: InterviewType.INITIAL_SCREENING,
        applicantBackground: {
          academicLevel: 'undergraduate',
          spiritualMaturity: 'developing',
          culturalBackground: 'western',
          languagePreference: 'English'
        },
        scheduledDate: new Date('2024-03-15T10:00:00Z'),
        duration: 30
      };

      await expect(matcher.findBestMatch(criteria)).rejects.toThrow('No eligible interviewers found');
    });
  });

  describe('findMultipleMatches', () => {
    it('should find multiple interviewer matches', async () => {
      const mockInterviewers = [
        {
          id: 'interviewer-1',
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@scrolluniversity.edu',
          role: 'ADMISSIONS_OFFICER',
          spiritualGifts: ['teaching'],
          scrollAlignment: 0.9
        },
        {
          id: 'interviewer-2',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@scrolluniversity.edu',
          role: 'ADMISSIONS_COMMITTEE',
          spiritualGifts: ['discernment'],
          scrollAlignment: 0.85
        }
      ];

      const mockPrisma = require('@prisma/client').PrismaClient();
      mockPrisma.user.findMany.mockResolvedValue(mockInterviewers);
      mockPrisma.interviewRecord.count.mockResolvedValue(0);

      const criteria = {
        interviewType: InterviewType.COMMITTEE_INTERVIEW,
        applicantBackground: {
          academicLevel: 'undergraduate',
          spiritualMaturity: 'developing',
          culturalBackground: 'western',
          languagePreference: 'English'
        },
        scheduledDate: new Date('2024-03-15T10:00:00Z'),
        duration: 90
      };

      const results = await matcher.findMultipleMatches(criteria, 2);

      expect(results).toHaveLength(2);
      expect(results[0].matchScore).toBeGreaterThanOrEqual(results[1].matchScore);
    });
  });
});

describe('InterviewFormatSelector', () => {
  let formatSelector: InterviewFormatSelector;

  beforeEach(() => {
    formatSelector = new InterviewFormatSelector();
  });

  describe('recommendFormat', () => {
    it('should recommend video conference for good tech access', async () => {
      const criteria = {
        interviewType: InterviewType.INITIAL_SCREENING,
        applicantLocation: 'Remote',
        applicantTimeZone: 'EST',
        interviewerLocation: 'ScrollUniversity Campus',
        interviewerTimeZone: 'UTC',
        applicantPreferences: ['VIDEO_CONFERENCE'],
        specialRequirements: [],
        technologyAccess: {
          hasReliableInternet: true,
          hasWebcam: true,
          hasMicrophone: true,
          hasSmartphone: true,
          preferredPlatforms: ['Zoom'],
          technicalSkillLevel: 'intermediate' as const
        },
        accessibilityNeeds: []
      };

      const recommendations = await formatSelector.recommendFormat(criteria);

      expect(recommendations).toHaveLength(4);
      expect(recommendations[0].format).toBe(InterviewFormat.VIDEO_CONFERENCE);
      expect(recommendations[0].score).toBeGreaterThan(0.5);
    });

    it('should recommend phone for poor tech access', async () => {
      const criteria = {
        interviewType: InterviewType.INITIAL_SCREENING,
        applicantLocation: 'Remote',
        applicantTimeZone: 'EST',
        interviewerLocation: 'ScrollUniversity Campus',
        interviewerTimeZone: 'UTC',
        applicantPreferences: ['PHONE_CALL'],
        specialRequirements: [],
        technologyAccess: {
          hasReliableInternet: false,
          hasWebcam: false,
          hasMicrophone: false,
          hasSmartphone: false,
          preferredPlatforms: [],
          technicalSkillLevel: 'beginner' as const
        },
        accessibilityNeeds: []
      };

      const recommendations = await formatSelector.recommendFormat(criteria);

      // Phone call should score well when internet is unreliable
      const phoneRecommendation = recommendations.find(r => r.format === InterviewFormat.PHONE_CALL);
      expect(phoneRecommendation).toBeDefined();
      expect(phoneRecommendation!.advantages).toContain('No internet required');
    });

    it('should recommend in-person for final interviews', async () => {
      const criteria = {
        interviewType: InterviewType.FINAL_INTERVIEW,
        applicantLocation: 'Local',
        applicantTimeZone: 'EST',
        interviewerLocation: 'ScrollUniversity Campus',
        interviewerTimeZone: 'EST',
        applicantPreferences: ['IN_PERSON'],
        specialRequirements: [],
        technologyAccess: {
          hasReliableInternet: true,
          hasWebcam: true,
          hasMicrophone: true,
          hasSmartphone: true,
          preferredPlatforms: [],
          technicalSkillLevel: 'intermediate' as const
        },
        accessibilityNeeds: []
      };

      const recommendations = await formatSelector.recommendFormat(criteria);

      const inPersonRecommendation = recommendations.find(r => r.format === InterviewFormat.IN_PERSON);
      expect(inPersonRecommendation).toBeDefined();
      expect(inPersonRecommendation!.advantages).toContain('Full personal interaction');
    });
  });

  describe('generatePreparationGuide', () => {
    it('should generate comprehensive preparation guide', async () => {
      const guide = await formatSelector.generatePreparationGuide(
        InterviewFormat.VIDEO_CONFERENCE,
        InterviewType.SPIRITUAL_EVALUATION
      );

      expect(guide.format).toBe(InterviewFormat.VIDEO_CONFERENCE);
      expect(guide.interviewType).toBe(InterviewType.SPIRITUAL_EVALUATION);
      expect(guide.timeline).toHaveLength(3);
      expect(guide.resources.length).toBeGreaterThan(0);
      expect(guide.technicalRequirements.length).toBeGreaterThan(0);
      expect(guide.spiritualPreparation.length).toBeGreaterThan(0);
    });
  });
});

describe('InterviewReminderManager', () => {
  let reminderManager: InterviewReminderManager;

  beforeEach(() => {
    reminderManager = new InterviewReminderManager();
    jest.clearAllMocks();
  });

  describe('scheduleReminders', () => {
    it('should schedule all reminders for an interview', async () => {
      const mockInterview = {
        id: 'interview-1',
        scheduledDate: new Date('2024-03-15T10:00:00Z'),
        duration: 30,
        format: InterviewFormat.VIDEO_CONFERENCE,
        interviewType: InterviewType.INITIAL_SCREENING,
        application: {
          applicant: {
            email: 'applicant@example.com',
            phoneNumber: '+1234567890',
            firstName: 'John',
            lastName: 'Doe'
          }
        }
      };

      const mockPrisma = require('@prisma/client').PrismaClient();
      mockPrisma.interviewRecord.findUnique.mockResolvedValue(mockInterview);

      const schedule = await reminderManager.scheduleReminders('interview-1');

      expect(schedule.interviewId).toBe('interview-1');
      expect(schedule.reminders.length).toBeGreaterThan(0);
      
      // Should include initial confirmation
      const initialReminder = schedule.reminders.find(r => r.type === 'initial_confirmation');
      expect(initialReminder).toBeDefined();
      
      // Should include follow-up
      const followupReminder = schedule.reminders.find(r => r.type === 'post_interview_followup');
      expect(followupReminder).toBeDefined();
    });
  });

  describe('processConfirmation', () => {
    it('should process confirmation response', async () => {
      const mockInterview = {
        id: 'interview-1',
        scheduledDate: new Date('2024-03-15T10:00:00Z'),
        status: 'SCHEDULED'
      };

      const mockPrisma = require('@prisma/client').PrismaClient();
      mockPrisma.interviewRecord.findUnique.mockResolvedValue(mockInterview);
      mockPrisma.interviewRecord.update.mockResolvedValue({});

      const request = {
        interviewId: 'interview-1',
        applicantResponse: 'confirmed' as const,
        responseTime: new Date()
      };

      await expect(reminderManager.processConfirmation(request)).resolves.not.toThrow();
    });

    it('should handle reschedule request', async () => {
      const mockInterview = {
        id: 'interview-1',
        scheduledDate: new Date('2024-03-15T10:00:00Z'),
        status: 'SCHEDULED'
      };

      const mockPrisma = require('@prisma/client').PrismaClient();
      mockPrisma.interviewRecord.findUnique.mockResolvedValue(mockInterview);
      mockPrisma.interviewRecord.update.mockResolvedValue({});

      const request = {
        interviewId: 'interview-1',
        applicantResponse: 'needs_reschedule' as const,
        responseTime: new Date(),
        additionalNotes: 'Family emergency'
      };

      await reminderManager.processConfirmation(request);

      expect(mockPrisma.interviewRecord.update).toHaveBeenCalledWith({
        where: { id: 'interview-1' },
        data: expect.objectContaining({
          status: 'RESCHEDULED',
          interviewNotes: 'Reschedule requested: Family emergency'
        })
      });
    });
  });
});

describe('InterviewCoordinationService', () => {
  let coordinationService: InterviewCoordinationService;

  beforeEach(() => {
    coordinationService = new InterviewCoordinationService();
    jest.clearAllMocks();
  });

  describe('coordinateInterview', () => {
    it('should coordinate complete interview process', async () => {
      // Mock all the dependencies
      const mockPrisma = require('@prisma/client').PrismaClient();
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'interviewer-1',
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@scrolluniversity.edu',
          role: 'ADMISSIONS_OFFICER',
          spiritualGifts: ['teaching'],
          scrollAlignment: 0.9
        }
      ]);
      mockPrisma.interviewRecord.create.mockResolvedValue({
        id: 'interview-1',
        applicationId: 'app-1',
        interviewType: InterviewType.INITIAL_SCREENING,
        scheduledDate: new Date('2024-03-15T10:00:00Z'),
        interviewerId: 'interviewer-1',
        interviewerName: 'John Smith',
        format: InterviewFormat.VIDEO_CONFERENCE,
        duration: 30,
        platform: 'Zoom',
        meetingUrl: 'https://zoom.us/j/123456789',
        status: 'SCHEDULED'
      });
      mockPrisma.interviewRecord.count.mockResolvedValue(0);
      mockPrisma.application.update.mockResolvedValue({});
      mockPrisma.interviewRecord.findUnique.mockResolvedValue({
        id: 'interview-1',
        scheduledDate: new Date('2024-03-15T10:00:00Z'),
        duration: 30,
        format: InterviewFormat.VIDEO_CONFERENCE,
        interviewType: InterviewType.INITIAL_SCREENING,
        application: {
          applicant: {
            email: 'applicant@example.com',
            phoneNumber: '+1234567890',
            firstName: 'John',
            lastName: 'Doe'
          }
        }
      });

      const request = {
        applicationId: 'app-1',
        interviewType: InterviewType.INITIAL_SCREENING,
        applicantPreferences: {
          preferredDates: [new Date('2024-03-15T10:00:00Z')],
          preferredTimes: ['10:00'],
          preferredFormats: [InterviewFormat.VIDEO_CONFERENCE],
          timeZone: 'UTC',
          location: 'Remote',
          languagePreference: 'English',
          accessibilityNeeds: [],
          technologyAccess: {
            hasReliableInternet: true,
            hasWebcam: true,
            hasMicrophone: true,
            hasSmartphone: true,
            preferredPlatforms: ['Zoom'],
            technicalSkillLevel: 'intermediate' as const
          }
        },
        urgency: 'medium' as const
      };

      const result = await coordinationService.coordinateInterview(request);

      expect(result.scheduledInterview).toBeDefined();
      expect(result.matchingResult).toBeDefined();
      expect(result.formatRecommendation).toBeDefined();
      expect(result.preparationGuide).toBeDefined();
      expect(result.reminderSchedule).toBeDefined();
    });
  });

  describe('rescheduleInterview', () => {
    it('should reschedule interview successfully', async () => {
      const mockPrisma = require('@prisma/client').PrismaClient();
      mockPrisma.interviewRecord.findUnique.mockResolvedValue({
        id: 'interview-1',
        applicationId: 'app-1',
        interviewType: InterviewType.INITIAL_SCREENING,
        format: InterviewFormat.VIDEO_CONFERENCE,
        duration: 30
      });
      mockPrisma.interviewRecord.update.mockResolvedValue({
        id: 'interview-1',
        applicationId: 'app-1',
        interviewType: InterviewType.INITIAL_SCREENING,
        scheduledDate: new Date('2024-03-16T14:00:00Z'),
        interviewerId: 'interviewer-1',
        interviewerName: 'John Smith',
        format: InterviewFormat.VIDEO_CONFERENCE,
        duration: 30,
        status: 'RESCHEDULED'
      });
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'interviewer-1',
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@scrolluniversity.edu',
          role: 'ADMISSIONS_OFFICER'
        }
      ]);
      mockPrisma.interviewRecord.count.mockResolvedValue(0);

      const request = {
        interviewId: 'interview-1',
        reason: 'Applicant requested different time',
        newPreferences: {
          preferredDates: [new Date('2024-03-16T14:00:00Z')]
        }
      };

      const result = await coordinationService.rescheduleInterview(request);

      expect(result.scheduledInterview.scheduledDate).toEqual(new Date('2024-03-16T14:00:00Z'));
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const mockPrisma = require('@prisma/client').PrismaClient();
      mockPrisma.interviewRecord.findMany.mockResolvedValue([]);

      const health = await coordinationService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.components.scheduler).toBe('healthy');
      expect(health.components.matcher).toBe('healthy');
      expect(health.components.formatSelector).toBe('healthy');
      expect(health.components.reminderManager).toBe('healthy');
    });
  });
});