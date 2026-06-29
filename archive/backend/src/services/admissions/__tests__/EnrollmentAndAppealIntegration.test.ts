import { EnrollmentManager, EnrollmentStatus, ConditionType } from '../EnrollmentManager';
import { AppealProcessor, AppealReason, AppealStatus, AppealDecisionType } from '../AppealProcessor';
import { WaitlistManager, WaitlistPriority, WaitlistStatus } from '../WaitlistManager';
import { EnrollmentCapacityMonitor } from '../EnrollmentCapacityMonitor';

// Simple mock for Prisma
const createMockPrisma = () => ({
  applications: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn()
  },
  admission_decisions: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn()
  }
});

describe('Enrollment and Appeal Integration Tests', () => {
  let mockPrisma: any;
  let enrollmentManager: EnrollmentManager;
  let appealProcessor: AppealProcessor;
  let waitlistManager: WaitlistManager;
  let capacityMonitor: EnrollmentCapacityMonitor;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    enrollmentManager = new EnrollmentManager(mockPrisma);
    appealProcessor = new AppealProcessor(mockPrisma);
    waitlistManager = new WaitlistManager(mockPrisma);
    capacityMonitor = new EnrollmentCapacityMonitor(mockPrisma);
    jest.clearAllMocks();
  });

  describe('EnrollmentManager Core Functionality', () => {
    it('should create enrollment confirmation for accepted application', async () => {
      const mockApplication = {
        id: 'app_123',
        applicant_id: 'user_123',
        program_applied: 'scroll_theology',
        intended_start_date: new Date('2024-09-01'),
        admission_decisions: [{
          id: 'decision_123',
          decision: 'accepted'
        }]
      };

      mockPrisma.applications.findUnique.mockResolvedValue(mockApplication);
      mockPrisma.admission_decisions.update.mockResolvedValue({});

      const result = await enrollmentManager.createEnrollmentConfirmation(
        'app_123',
        new Date('2024-08-01'),
        500,
        [{
          type: ConditionType.ACADEMIC_TRANSCRIPT,
          description: 'Submit final transcript',
          deadline: new Date('2024-08-15')
        }]
      );

      expect(result.applicationId).toBe('app_123');
      expect(result.status).toBe(EnrollmentStatus.PENDING_CONFIRMATION);
      expect(result.conditions).toHaveLength(1);
      expect(mockPrisma.admission_decisions.update).toHaveBeenCalled();
    });

    it('should process deposit payment correctly', async () => {
      const mockApplication = {
        id: 'app_123',
        admission_decisions: [{
          id: 'decision_123',
          enrollment_data: {
            applicationId: 'app_123',
            depositAmount: 500,
            conditions: []
          }
        }]
      };

      mockPrisma.applications.findUnique.mockResolvedValue(mockApplication);
      mockPrisma.admission_decisions.update.mockResolvedValue({});

      const result = await enrollmentManager.processDepositPayment('app_123', 500);

      expect(result.depositPaid).toBe(true);
      expect(result.status).toBe(EnrollmentStatus.ENROLLED);
    });
  });

  describe('AppealProcessor Core Functionality', () => {
    it('should submit appeal for rejected application', async () => {
      const mockApplication = {
        id: 'app_123',
        applicant_id: 'user_123',
        admission_decisions: [{
          id: 'decision_123',
          decision: 'rejected'
        }]
      };

      mockPrisma.applications.findUnique.mockResolvedValue(mockApplication);
      mockPrisma.admission_decisions.update.mockResolvedValue({});

      const result = await appealProcessor.submitAppeal(
        'app_123',
        AppealReason.NEW_INFORMATION,
        'I have new test scores to submit',
        ['transcript.pdf']
      );

      expect(result.applicationId).toBe('app_123');
      expect(result.appealReason).toBe(AppealReason.NEW_INFORMATION);
      expect(result.status).toBe(AppealStatus.SUBMITTED);
      expect(result.supportingDocuments).toContain('transcript.pdf');
    });

    it('should process appeal decision correctly', async () => {
      const mockDecisions = [{
        id: 'decision_123',
        appeal_data: {
          id: 'appeal_123',
          applicationId: 'app_123',
          status: AppealStatus.COMMITTEE_REVIEW,
          reviewers: [
            { id: 'reviewer_1', reviewCompleted: true },
            { id: 'reviewer_2', reviewCompleted: true }
          ],
          timeline: []
        }
      }];

      mockPrisma.admission_decisions.findMany.mockResolvedValue(mockDecisions);
      mockPrisma.admission_decisions.update.mockResolvedValue({});
      mockPrisma.applications.findUnique.mockResolvedValue({
        id: 'app_123',
        admission_decisions: [{ id: 'decision_123' }]
      });
      mockPrisma.applications.update.mockResolvedValue({});

      const result = await appealProcessor.processAppealDecision(
        'appeal_123',
        AppealDecisionType.OVERTURN_ACCEPT,
        'New information warrants acceptance',
        ['committee_chair', 'admissions_director']
      );

      expect(result.decision?.decision).toBe(AppealDecisionType.OVERTURN_ACCEPT);
      expect(result.status).toBe(AppealStatus.APPROVED);
    });
  });

  describe('WaitlistManager Core Functionality', () => {
    it('should add application to waitlist', async () => {
      const mockApplication = {
        id: 'app_123',
        applicant_id: 'user_123',
        program_applied: 'scroll_theology',
        intended_start_date: new Date('2024-09-01'),
        admission_decisions: [{
          id: 'decision_123',
          decision: 'waitlisted'
        }]
      };

      mockPrisma.applications.findUnique.mockResolvedValue(mockApplication);
      mockPrisma.admission_decisions.findMany.mockResolvedValue([]);
      mockPrisma.admission_decisions.update.mockResolvedValue({});

      const result = await waitlistManager.addToWaitlist(
        'app_123',
        WaitlistPriority.HIGH,
        ['Strong candidate']
      );

      expect(result.applicationId).toBe('app_123');
      expect(result.priority).toBe(WaitlistPriority.HIGH);
      expect(result.status).toBe(WaitlistStatus.ACTIVE);
      expect(result.position).toBe(1);
    });

    it('should offer admission from waitlist', async () => {
      const mockApplication = {
        id: 'app_123',
        admission_decisions: [{
          id: 'decision_123',
          waitlist_data: {
            id: 'waitlist_123',
            applicationId: 'app_123',
            status: WaitlistStatus.ACTIVE
          }
        }]
      };

      mockPrisma.applications.findUnique.mockResolvedValue(mockApplication);
      mockPrisma.admission_decisions.update.mockResolvedValue({});
      mockPrisma.applications.update.mockResolvedValue({});

      const offerDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const result = await waitlistManager.offerAdmissionFromWaitlist('app_123', offerDeadline);

      expect(result.status).toBe(WaitlistStatus.OFFERED_ADMISSION);
      expect(result.interestConfirmationDeadline).toEqual(offerDeadline);
    });
  });

  describe('EnrollmentCapacityMonitor Core Functionality', () => {
    it('should calculate current capacity metrics', async () => {
      const mockApplications = [
        {
          id: 'app_1',
          admission_decisions: [{
            enrollment_data: { status: 'enrolled' }
          }]
        },
        {
          id: 'app_2',
          admission_decisions: [{
            enrollment_data: { status: 'confirmed' }
          }]
        }
      ];

      const mockWaitlistDecisions = [
        {
          waitlist_data: {
            programType: 'scroll_theology',
            intendedStartDate: new Date('2024-09-01'),
            status: 'active'
          }
        }
      ];

      mockPrisma.applications.findMany.mockResolvedValue(mockApplications);
      mockPrisma.admission_decisions.findMany.mockResolvedValue(mockWaitlistDecisions);

      const capacity = await capacityMonitor.getCurrentCapacity(
        'scroll_theology',
        new Date('2024-09-01')
      );

      expect(capacity.programType).toBe('scroll_theology');
      expect(capacity.totalCapacity).toBe(50);
      expect(capacity.confirmedEnrollment).toBe(1);
      expect(capacity.waitlistSize).toBe(1);
      expect(capacity.availableSpots).toBe(49);
    });

    it('should update capacity limits', async () => {
      mockPrisma.applications.updateMany.mockResolvedValue({});
      mockPrisma.applications.findMany.mockResolvedValue([]);
      mockPrisma.admission_decisions.findMany.mockResolvedValue([]);

      await capacityMonitor.updateCapacityLimit('scroll_theology', 60);

      expect(mockPrisma.applications.updateMany).toHaveBeenCalledWith({
        where: { program_applied: 'scroll_theology' },
        data: {
          application_data: {
            capacity_limit: 60
          }
        }
      });
    });
  });

  describe('Integration Workflows', () => {
    it('should handle complete enrollment workflow', async () => {
      // Mock accepted application
      const mockApplication = {
        id: 'app_123',
        applicant_id: 'user_123',
        program_applied: 'scroll_theology',
        intended_start_date: new Date('2024-09-01'),
        admission_decisions: [{
          id: 'decision_123',
          decision: 'accepted'
        }]
      };

      mockPrisma.applications.findUnique.mockResolvedValue(mockApplication);
      mockPrisma.admission_decisions.update.mockResolvedValue({});

      // 1. Create enrollment confirmation
      const enrollmentConfirmation = await enrollmentManager.createEnrollmentConfirmation(
        'app_123',
        new Date('2024-08-01'),
        500,
        [{
          type: ConditionType.ACADEMIC_TRANSCRIPT,
          description: 'Submit final transcript',
          deadline: new Date('2024-07-15')
        }]
      );

      expect(enrollmentConfirmation.status).toBe(EnrollmentStatus.PENDING_CONFIRMATION);

      // 2. Simulate enrollment confirmation and deposit payment
      const mockEnrollmentData = {
        ...enrollmentConfirmation,
        status: EnrollmentStatus.CONFIRMED,
        depositPaid: true
      };

      (mockApplication.admission_decisions[0] as any).enrollment_data = mockEnrollmentData;

      // 3. Fulfill condition
      const conditionFulfilled = await enrollmentManager.fulfillCondition(
        'app_123',
        enrollmentConfirmation.conditions[0].id,
        ['transcript.pdf']
      );

      expect(conditionFulfilled.status).toBe(EnrollmentStatus.ENROLLED);
    });

    it('should handle waitlist to enrollment workflow', async () => {
      // Mock waitlisted application
      const mockApplication = {
        id: 'app_123',
        applicant_id: 'user_123',
        program_applied: 'scroll_theology',
        intended_start_date: new Date('2024-09-01'),
        admission_decisions: [{
          id: 'decision_123',
          decision: 'waitlisted'
        }]
      };

      mockPrisma.applications.findUnique.mockResolvedValue(mockApplication);
      mockPrisma.admission_decisions.findMany.mockResolvedValue([]);
      mockPrisma.admission_decisions.update.mockResolvedValue({});

      // 1. Add to waitlist
      const waitlistEntry = await waitlistManager.addToWaitlist('app_123', WaitlistPriority.HIGH);
      expect(waitlistEntry.status).toBe(WaitlistStatus.ACTIVE);

      // 2. Offer admission from waitlist
      mockPrisma.applications.update.mockResolvedValue({});
      
      const offerDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const offeredEntry = await waitlistManager.offerAdmissionFromWaitlist('app_123', offerDeadline);
      expect(offeredEntry.status).toBe(WaitlistStatus.OFFERED_ADMISSION);

      // 3. Accept offer
      const acceptedEntry = await waitlistManager.respondToWaitlistOffer('app_123', true, 'Excited to join!');
      expect(acceptedEntry.status).toBe(WaitlistStatus.ACCEPTED_OFFER);
    });
  });
});