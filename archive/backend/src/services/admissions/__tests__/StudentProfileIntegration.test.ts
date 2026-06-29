/**
 * ScrollUniversity Admissions - Student Profile Integration Tests
 * "Test all things; hold fast what is good" - 1 Thessalonians 5:21
 */

import { PrismaClient, UserRole, AcademicLevel, ApplicationStatus } from '@prisma/client';
import { StudentProfileIntegrationService } from '../StudentProfileIntegrationService';
import { EnrollmentCoordinationService } from '../EnrollmentCoordinationService';
import { AcademicRecordTransferService } from '../AcademicRecordTransferService';

// Mock Prisma Client
const mockPrisma = {
  applications: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  user: {
    update: jest.fn()
  },
  enrollment: {
    create: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn()
  },
  scrollTranscript: {
    create: jest.fn(),
    findUnique: jest.fn()
  },
  mentorship: {
    create: jest.fn()
  },
  course: {
    findUnique: jest.fn()
  }
} as unknown as PrismaClient;

describe('StudentProfileIntegrationService', () => {
  let service: StudentProfileIntegrationService;
  let enrollmentService: EnrollmentCoordinationService;
  let transferService: AcademicRecordTransferService;

  beforeEach(() => {
    service = new StudentProfileIntegrationService(mockPrisma);
    enrollmentService = new EnrollmentCoordinationService(mockPrisma);
    transferService = new AcademicRecordTransferService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('createStudentProfile', () => {
    it('should create student profile for accepted application', async () => {
      // Arrange
      const applicationId = 'app-123';
      const profileData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        academicLevel: AcademicLevel.SCROLL_DEGREE,
        intendedProgram: 'SCROLL_DEGREE',
        scrollCalling: 'Teaching and mentoring',
        spiritualGifts: ['Teaching', 'Wisdom'],
        kingdomVision: 'Advancing God\'s kingdom through education',
        scrollAlignment: 0.85
      };

      const mockApplication = {
        id: applicationId,
        applicantId: 'user-123',
        status: ApplicationStatus.ACCEPTED,
        applicant: {
          id: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phoneNumber: null,
          location: null
        },
        spiritualEvaluations: [{
          callingClarity: { clarity: 0.8 },
          spiritualGifts: ['Teaching', 'Wisdom'],
          kingdomVision: 'Advancing God\'s kingdom',
          scrollAlignment: 0.85
        }],
        academicEvaluations: [{
          academicReadiness: 0.9,
          recommendedLevel: AcademicLevel.SCROLL_DEGREE,
          supportNeeds: []
        }],
        admissionDecisions: [{
          decision: 'ACCEPTED',
          decisionDate: new Date()
        }]
      };

      const mockUpdatedUser = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        role: UserRole.STUDENT,
        academicLevel: AcademicLevel.SCROLL_DEGREE,
        enrollmentStatus: 'ACTIVE',
        scrollCalling: 'Teaching and mentoring',
        spiritualGifts: ['Teaching', 'Wisdom'],
        kingdomVision: 'Advancing God\'s kingdom through education',
        scrollAlignment: 0.85,
        scrollCoinBalance: 100.0,
        workTradeCredits: 0.0
      };

      mockPrisma.applications.findUnique = jest.fn().mockResolvedValue(mockApplication);
      mockPrisma.user.update = jest.fn().mockResolvedValue(mockUpdatedUser);

      // Act
      const result = await service.createStudentProfile(applicationId, profileData);

      // Assert
      expect(mockPrisma.applications.findUnique).toHaveBeenCalledWith({
        where: { id: applicationId },
        include: {
          applicant: true,
          spiritualEvaluations: true,
          academicEvaluations: true,
          admissionDecisions: true
        }
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: expect.objectContaining({
          role: UserRole.STUDENT,
          academicLevel: AcademicLevel.SCROLL_DEGREE,
          enrollmentStatus: 'ACTIVE',
          scrollCalling: 'Teaching and mentoring',
          spiritualGifts: ['Teaching', 'Wisdom'],
          kingdomVision: 'Advancing God\'s kingdom through education',
          scrollAlignment: 0.85,
          scrollCoinBalance: 100.0,
          workTradeCredits: 0.0
        })
      });

      expect(result).toEqual(mockUpdatedUser);
    });

    it('should throw error for non-accepted application', async () => {
      // Arrange
      const applicationId = 'app-123';
      const profileData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        academicLevel: AcademicLevel.SCROLL_DEGREE,
        intendedProgram: 'SCROLL_DEGREE'
      };

      const mockApplication = {
        id: applicationId,
        applicantId: 'user-123',
        status: ApplicationStatus.UNDER_REVIEW,
        applicant: { id: 'user-123' }
      };

      mockPrisma.applications.findUnique = jest.fn().mockResolvedValue(mockApplication);

      // Act & Assert
      await expect(service.createStudentProfile(applicationId, profileData))
        .rejects.toThrow('Cannot create profile for non-accepted application');
    });
  });

  describe('initializeEnrollment', () => {
    it('should initialize enrollment for accepted application', async () => {
      // Arrange
      const applicationId = 'app-123';
      const enrollmentData = {
        programType: 'SCROLL_DEGREE',
        startDate: new Date(),
        academicLevel: AcademicLevel.SCROLL_DEGREE,
        mentorAssignment: 'mentor-123',
        specialAccommodations: [],
        enrollmentConditions: []
      };

      const mockApplication = {
        id: applicationId,
        applicantId: 'user-123',
        status: ApplicationStatus.ACCEPTED,
        applicant: { id: 'user-123' },
        admissionDecisions: [{
          decision: 'ACCEPTED',
          decisionDate: new Date()
        }]
      };

      const mockEnrollment = {
        id: 'enrollment-123',
        userId: 'user-123',
        courseId: 'scroll-foundations-101',
        progress: 0.0,
        scrollXPEarned: 0,
        currentModule: 1,
        status: 'ACTIVE',
        startedAt: enrollmentData.startDate
      };

      mockPrisma.applications.findUnique = jest.fn().mockResolvedValue(mockApplication);
      mockPrisma.enrollment.create = jest.fn().mockResolvedValue(mockEnrollment);
      mockPrisma.applications.update = jest.fn().mockResolvedValue(mockApplication);

      // Act
      const result = await service.initializeEnrollment(applicationId, enrollmentData);

      // Assert
      expect(mockPrisma.enrollment.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          courseId: 'scroll-foundations-101',
          progress: 0.0,
          scrollXPEarned: 0,
          currentModule: 1,
          status: 'ACTIVE',
          startedAt: enrollmentData.startDate
        }
      });

      expect(result).toEqual(mockEnrollment);
    });
  });

  describe('transferAcademicRecords', () => {
    it('should transfer academic records successfully', async () => {
      // Arrange
      const applicationId = 'app-123';
      const userId = 'user-123';

      const mockApplication = {
        id: applicationId,
        applicantId: userId,
        academicHistory: [
          {
            institutionName: 'Previous University',
            degree: 'Bachelor of Arts',
            gpa: 3.5,
            creditsEarned: 120
          }
        ],
        academicEvaluations: [{
          academicReadiness: 0.9,
          recommendedLevel: AcademicLevel.SCROLL_DEGREE,
          supportNeeds: []
        }],
        spiritualEvaluations: [{
          overallScore: 0.85,
          scrollAlignment: 0.8
        }]
      };

      const mockTranscript = {
        id: 'transcript-123',
        studentId: userId,
        institutionId: 'scroll-university',
        accreditationId: 'scroll-accreditation-001',
        gpa: 0.0,
        creditHours: 0,
        courses: mockApplication.academicHistory,
        scrollXP: 0
      };

      mockPrisma.applications.findUnique = jest.fn().mockResolvedValue(mockApplication);
      mockPrisma.scrollTranscript.create = jest.fn().mockResolvedValue(mockTranscript);

      // Act
      const result = await service.transferAcademicRecords(applicationId, userId);

      // Assert
      expect(mockPrisma.scrollTranscript.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          studentId: userId,
          institutionId: 'scroll-university',
          accreditationId: 'scroll-accreditation-001',
          gpa: 0.0,
          creditHours: 0,
          courses: mockApplication.academicHistory,
          scrollXP: 0
        })
      });

      expect(result).toEqual(mockTranscript);
    });
  });

  describe('coordinateCourseRegistration', () => {
    it('should coordinate course registration successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const applicationId = 'app-123';

      const mockApplication = {
        id: applicationId,
        applicantId: userId,
        programApplied: 'SCROLL_DEGREE',
        academicEvaluations: [{
          recommendedLevel: AcademicLevel.SCROLL_DEGREE,
          supportNeeds: []
        }],
        admissionDecisions: [{
          decision: 'ACCEPTED'
        }]
      };

      const mockEnrollments = [
        {
          id: 'enrollment-1',
          userId: userId,
          courseId: 'scroll-foundations-101',
          progress: 0.0,
          scrollXPEarned: 0,
          currentModule: 1,
          status: 'ACTIVE'
        },
        {
          id: 'enrollment-2',
          userId: userId,
          courseId: 'kingdom-principles-101',
          progress: 0.0,
          scrollXPEarned: 0,
          currentModule: 1,
          status: 'ACTIVE'
        }
      ];

      mockPrisma.applications.findUnique = jest.fn().mockResolvedValue(mockApplication);
      mockPrisma.enrollment.create = jest.fn()
        .mockResolvedValueOnce(mockEnrollments[0])
        .mockResolvedValueOnce(mockEnrollments[1]);

      // Act
      const result = await service.coordinateCourseRegistration(userId, applicationId);

      // Assert
      expect(mockPrisma.enrollment.create).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0].courseId).toBe('scroll-foundations-101');
      expect(result[1].courseId).toBe('kingdom-principles-101');
    });
  });

  describe('completeStudentIntegration', () => {
    it('should complete full student integration process', async () => {
      // Arrange
      const applicationId = 'app-123';
      const integrationData = {
        profileData: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          academicLevel: AcademicLevel.SCROLL_DEGREE,
          intendedProgram: 'SCROLL_DEGREE',
          scrollCalling: 'Teaching',
          spiritualGifts: ['Teaching'],
          kingdomVision: 'Kingdom advancement',
          scrollAlignment: 0.85
        },
        enrollmentData: {
          programType: 'SCROLL_DEGREE',
          startDate: new Date(),
          academicLevel: AcademicLevel.SCROLL_DEGREE,
          mentorAssignment: 'mentor-123',
          specialAccommodations: [],
          enrollmentConditions: []
        },
        coursePreferences: ['scroll-foundations-101']
      };

      // Mock all the required data
      const mockApplication = {
        id: applicationId,
        applicantId: 'user-123',
        status: ApplicationStatus.ACCEPTED,
        applicant: {
          id: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com'
        },
        spiritualEvaluations: [{ scrollAlignment: 0.85 }],
        academicEvaluations: [{ recommendedLevel: AcademicLevel.SCROLL_DEGREE }],
        admissionDecisions: [{ decision: 'ACCEPTED' }],
        academicHistory: [],
        programApplied: 'SCROLL_DEGREE'
      };

      const mockUser = {
        id: 'user-123',
        role: UserRole.STUDENT,
        academicLevel: AcademicLevel.SCROLL_DEGREE
      };

      const mockEnrollment = {
        id: 'enrollment-123',
        userId: 'user-123',
        courseId: 'scroll-foundations-101'
      };

      const mockTranscript = {
        id: 'transcript-123',
        studentId: 'user-123'
      };

      const mockCourseEnrollments = [mockEnrollment];

      // Setup mocks
      mockPrisma.applications.findUnique = jest.fn().mockResolvedValue(mockApplication);
      mockPrisma.user.update = jest.fn().mockResolvedValue(mockUser);
      mockPrisma.enrollment.create = jest.fn().mockResolvedValue(mockEnrollment);
      mockPrisma.scrollTranscript.create = jest.fn().mockResolvedValue(mockTranscript);
      mockPrisma.applications.update = jest.fn().mockResolvedValue(mockApplication);
      mockPrisma.mentorship.create = jest.fn().mockResolvedValue({});

      // Act
      const result = await service.completeStudentIntegration(applicationId, integrationData);

      // Assert
      expect(result).toEqual({
        user: mockUser,
        enrollment: mockEnrollment,
        transcript: mockTranscript,
        courseEnrollments: mockCourseEnrollments
      });

      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockPrisma.enrollment.create).toHaveBeenCalled();
      expect(mockPrisma.scrollTranscript.create).toHaveBeenCalled();
      expect(mockPrisma.mentorship.create).toHaveBeenCalled();
    });
  });

  describe('getIntegrationStatus', () => {
    it('should return integration status correctly', async () => {
      // Arrange
      const applicationId = 'app-123';

      const mockApplication = {
        id: applicationId,
        applicant: {
          id: 'user-123',
          role: UserRole.STUDENT,
          enrollments: [{ id: 'enrollment-123' }],
          scrollTranscripts: [{ id: 'transcript-123' }]
        }
      };

      mockPrisma.applications.findUnique = jest.fn().mockResolvedValue(mockApplication);

      // Act
      const result = await service.getIntegrationStatus(applicationId);

      // Assert
      expect(result).toEqual({
        profileCreated: true,
        enrollmentInitialized: true,
        academicRecordsTransferred: true,
        coursesRegistered: true,
        integrationComplete: true
      });
    });

    it('should return incomplete status when integration is partial', async () => {
      // Arrange
      const applicationId = 'app-123';

      const mockApplication = {
        id: applicationId,
        applicant: {
          id: 'user-123',
          role: 'STUDENT', // Not enum value
          enrollments: [],
          scrollTranscripts: []
        }
      };

      mockPrisma.applications.findUnique = jest.fn().mockResolvedValue(mockApplication);

      // Act
      const result = await service.getIntegrationStatus(applicationId);

      // Assert
      expect(result).toEqual({
        profileCreated: true,
        enrollmentInitialized: false,
        academicRecordsTransferred: false,
        coursesRegistered: false,
        integrationComplete: false
      });
    });
  });
});