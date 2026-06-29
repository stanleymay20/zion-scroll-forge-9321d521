import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface Appeal {
  id: string;
  applicationId: string;
  applicantId: string;
  originalDecision: string;
  appealReason: AppealReason;
  appealStatement: string;
  supportingDocuments: string[];
  submissionDate: Date;
  status: AppealStatus;
  reviewers: AppealReviewer[];
  timeline: AppealTimelineEntry[];
  decision?: AppealDecision;
}

export interface AppealReviewer {
  id: string;
  name: string;
  role: string;
  assignedDate: Date;
  reviewCompleted: boolean;
  reviewDate?: Date;
  recommendation?: AppealRecommendation;
  notes?: string;
}

export interface AppealTimelineEntry {
  id: string;
  date: Date;
  action: string;
  actor: string;
  details: string;
}

export interface AppealDecision {
  id: string;
  decision: AppealDecisionType;
  decisionDate: Date;
  decisionMakers: string[];
  reasoning: string;
  newAdmissionStatus?: string;
  conditions?: string[];
  effectiveDate: Date;
}

export enum AppealReason {
  NEW_INFORMATION = 'new_information',
  PROCEDURAL_ERROR = 'procedural_error',
  DISCRIMINATION_CLAIM = 'discrimination_claim',
  MEDICAL_CIRCUMSTANCES = 'medical_circumstances',
  FAMILY_EMERGENCY = 'family_emergency',
  TECHNICAL_ERROR = 'technical_error',
  OTHER = 'other'
}

export enum AppealStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  ADDITIONAL_INFO_REQUESTED = 'additional_info_requested',
  COMMITTEE_REVIEW = 'committee_review',
  DECISION_PENDING = 'decision_pending',
  APPROVED = 'approved',
  DENIED = 'denied',
  WITHDRAWN = 'withdrawn'
}

export enum AppealDecisionType {
  OVERTURN_ACCEPT = 'overturn_accept',
  OVERTURN_WAITLIST = 'overturn_waitlist',
  UPHOLD_ORIGINAL = 'uphold_original',
  DEFER_DECISION = 'defer_decision'
}

export enum AppealRecommendation {
  APPROVE = 'approve',
  DENY = 'deny',
  REQUEST_MORE_INFO = 'request_more_info',
  DEFER = 'defer'
}

export class AppealProcessor {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async submitAppeal(
    applicationId: string,
    appealReason: AppealReason,
    appealStatement: string,
    supportingDocuments: string[] = []
  ): Promise<Appeal> {
    try {
      logger.info(`Submitting appeal for application ${applicationId}`);

      // Verify application exists and has a decision
      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId },
        include: { admission_decisions: true }
      });

      if (!application) {
        throw new Error(`Application ${applicationId} not found`);
      }

      if (!application.admission_decisions.length) {
        throw new Error(`No admission decision found for application ${applicationId}`);
      }

      const originalDecision = application.admission_decisions[0];

      // Check if appeal is eligible
      if (originalDecision.decision === 'accepted') {
        throw new Error('Cannot appeal an accepted decision');
      }

      // Check if appeal already exists
      const existingAppeal = await this.getAppealByApplicationId(applicationId);
      if (existingAppeal && existingAppeal.status !== AppealStatus.WITHDRAWN) {
        throw new Error('An active appeal already exists for this application');
      }

      // Create appeal
      const appeal: Appeal = {
        id: `appeal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        applicationId,
        applicantId: application.applicant_id,
        originalDecision: originalDecision.decision,
        appealReason,
        appealStatement,
        supportingDocuments,
        submissionDate: new Date(),
        status: AppealStatus.SUBMITTED,
        reviewers: [],
        timeline: [{
          id: `timeline_${Date.now()}`,
          date: new Date(),
          action: 'Appeal Submitted',
          actor: application.applicant_id,
          details: `Appeal submitted with reason: ${appealReason}`
        }]
      };

      // Store appeal (using JSONB for now, would be separate tables in production)
      await this.prisma.admission_decisions.update({
        where: { id: originalDecision.id },
        data: {
          appeal_data: appeal as any
        }
      });

      // Assign initial reviewers
      await this.assignAppealReviewers(appeal.id);

      logger.info(`Appeal submitted for application ${applicationId}`);
      return appeal;

    } catch (error) {
      logger.error(`Error submitting appeal: ${error}`);
      throw error;
    }
  }

  async assignAppealReviewers(appealId: string): Promise<Appeal> {
    try {
      logger.info(`Assigning reviewers for appeal ${appealId}`);

      const appeal = await this.getAppealById(appealId);
      if (!appeal) {
        throw new Error(`Appeal ${appealId} not found`);
      }

      // Assign reviewers based on appeal reason
      const reviewers: AppealReviewer[] = [];

      // Always assign admissions director
      reviewers.push({
        id: `reviewer_${Date.now()}_1`,
        name: 'Admissions Director',
        role: 'admissions_director',
        assignedDate: new Date(),
        reviewCompleted: false
      });

      // Assign additional reviewers based on reason
      switch (appeal.appealReason) {
        case AppealReason.DISCRIMINATION_CLAIM:
          reviewers.push({
            id: `reviewer_${Date.now()}_2`,
            name: 'Diversity & Inclusion Officer',
            role: 'diversity_officer',
            assignedDate: new Date(),
            reviewCompleted: false
          });
          break;
        case AppealReason.MEDICAL_CIRCUMSTANCES:
          reviewers.push({
            id: `reviewer_${Date.now()}_2`,
            name: 'Student Services Director',
            role: 'student_services',
            assignedDate: new Date(),
            reviewCompleted: false
          });
          break;
        case AppealReason.PROCEDURAL_ERROR:
          reviewers.push({
            id: `reviewer_${Date.now()}_2`,
            name: 'Academic Affairs Dean',
            role: 'academic_dean',
            assignedDate: new Date(),
            reviewCompleted: false
          });
          break;
        default:
          reviewers.push({
            id: `reviewer_${Date.now()}_2`,
            name: 'Senior Admissions Officer',
            role: 'senior_admissions',
            assignedDate: new Date(),
            reviewCompleted: false
          });
      }

      appeal.reviewers = reviewers;
      appeal.status = AppealStatus.UNDER_REVIEW;
      appeal.timeline.push({
        id: `timeline_${Date.now()}`,
        date: new Date(),
        action: 'Reviewers Assigned',
        actor: 'system',
        details: `Assigned ${reviewers.length} reviewers`
      });

      await this.updateAppeal(appeal);

      logger.info(`Reviewers assigned for appeal ${appealId}`);
      return appeal;

    } catch (error) {
      logger.error(`Error assigning appeal reviewers: ${error}`);
      throw error;
    }
  }

  async submitReviewerRecommendation(
    appealId: string,
    reviewerId: string,
    recommendation: AppealRecommendation,
    notes: string
  ): Promise<Appeal> {
    try {
      logger.info(`Submitting reviewer recommendation for appeal ${appealId}`);

      const appeal = await this.getAppealById(appealId);
      if (!appeal) {
        throw new Error(`Appeal ${appealId} not found`);
      }

      const reviewer = appeal.reviewers.find(r => r.id === reviewerId);
      if (!reviewer) {
        throw new Error(`Reviewer ${reviewerId} not found`);
      }

      if (reviewer.reviewCompleted) {
        throw new Error('Reviewer has already completed their review');
      }

      // Update reviewer
      reviewer.reviewCompleted = true;
      reviewer.reviewDate = new Date();
      reviewer.recommendation = recommendation;
      reviewer.notes = notes;

      // Add timeline entry
      appeal.timeline.push({
        id: `timeline_${Date.now()}`,
        date: new Date(),
        action: 'Review Completed',
        actor: reviewer.name,
        details: `Recommendation: ${recommendation}`
      });

      // Check if all reviews are complete
      const allReviewsComplete = appeal.reviewers.every(r => r.reviewCompleted);
      
      if (allReviewsComplete) {
        appeal.status = AppealStatus.COMMITTEE_REVIEW;
        appeal.timeline.push({
          id: `timeline_${Date.now()}`,
          date: new Date(),
          action: 'All Reviews Complete',
          actor: 'system',
          details: 'Moving to committee review'
        });
      }

      await this.updateAppeal(appeal);

      logger.info(`Reviewer recommendation submitted for appeal ${appealId}`);
      return appeal;

    } catch (error) {
      logger.error(`Error submitting reviewer recommendation: ${error}`);
      throw error;
    }
  }

  async processAppealDecision(
    appealId: string,
    decision: AppealDecisionType,
    reasoning: string,
    decisionMakers: string[],
    conditions: string[] = []
  ): Promise<Appeal> {
    try {
      logger.info(`Processing appeal decision for appeal ${appealId}`);

      const appeal = await this.getAppealById(appealId);
      if (!appeal) {
        throw new Error(`Appeal ${appealId} not found`);
      }

      if (appeal.status !== AppealStatus.COMMITTEE_REVIEW) {
        throw new Error('Appeal is not ready for decision');
      }

      // Create decision
      const appealDecision: AppealDecision = {
        id: `decision_${Date.now()}`,
        decision,
        decisionDate: new Date(),
        decisionMakers,
        reasoning,
        conditions,
        effectiveDate: new Date()
      };

      // Set new admission status if overturned
      if (decision === AppealDecisionType.OVERTURN_ACCEPT) {
        appealDecision.newAdmissionStatus = 'accepted';
      } else if (decision === AppealDecisionType.OVERTURN_WAITLIST) {
        appealDecision.newAdmissionStatus = 'waitlisted';
      }

      appeal.decision = appealDecision;
      appeal.status = decision === AppealDecisionType.DEFER_DECISION ? 
        AppealStatus.DECISION_PENDING : 
        (decision === AppealDecisionType.UPHOLD_ORIGINAL ? AppealStatus.DENIED : AppealStatus.APPROVED);

      appeal.timeline.push({
        id: `timeline_${Date.now()}`,
        date: new Date(),
        action: 'Decision Rendered',
        actor: decisionMakers.join(', '),
        details: `Decision: ${decision}`
      });

      await this.updateAppeal(appeal);

      // Update original admission decision if overturned
      if (appealDecision.newAdmissionStatus) {
        await this.updateOriginalDecision(appeal.applicationId, appealDecision.newAdmissionStatus);
      }

      logger.info(`Appeal decision processed for appeal ${appealId}`);
      return appeal;

    } catch (error) {
      logger.error(`Error processing appeal decision: ${error}`);
      throw error;
    }
  }

  async requestAdditionalInformation(
    appealId: string,
    requestedInfo: string,
    deadline: Date
  ): Promise<Appeal> {
    try {
      logger.info(`Requesting additional information for appeal ${appealId}`);

      const appeal = await this.getAppealById(appealId);
      if (!appeal) {
        throw new Error(`Appeal ${appealId} not found`);
      }

      appeal.status = AppealStatus.ADDITIONAL_INFO_REQUESTED;
      appeal.timeline.push({
        id: `timeline_${Date.now()}`,
        date: new Date(),
        action: 'Additional Information Requested',
        actor: 'admissions_committee',
        details: `Requested: ${requestedInfo}, Deadline: ${deadline.toISOString()}`
      });

      await this.updateAppeal(appeal);

      logger.info(`Additional information requested for appeal ${appealId}`);
      return appeal;

    } catch (error) {
      logger.error(`Error requesting additional information: ${error}`);
      throw error;
    }
  }

  async withdrawAppeal(appealId: string, reason: string): Promise<Appeal> {
    try {
      logger.info(`Withdrawing appeal ${appealId}`);

      const appeal = await this.getAppealById(appealId);
      if (!appeal) {
        throw new Error(`Appeal ${appealId} not found`);
      }

      if (appeal.status === AppealStatus.APPROVED || appeal.status === AppealStatus.DENIED) {
        throw new Error('Cannot withdraw a completed appeal');
      }

      appeal.status = AppealStatus.WITHDRAWN;
      appeal.timeline.push({
        id: `timeline_${Date.now()}`,
        date: new Date(),
        action: 'Appeal Withdrawn',
        actor: appeal.applicantId,
        details: `Reason: ${reason}`
      });

      await this.updateAppeal(appeal);

      logger.info(`Appeal ${appealId} withdrawn`);
      return appeal;

    } catch (error) {
      logger.error(`Error withdrawing appeal: ${error}`);
      throw error;
    }
  }

  private async getAppealById(appealId: string): Promise<Appeal | null> {
    try {
      const decisions = await this.prisma.admission_decisions.findMany({
        where: {
          appeal_data: {
            path: ['id'],
            equals: appealId
          }
        }
      });

      if (!decisions.length) {
        return null;
      }

      return decisions[0].appeal_data as any;

    } catch (error) {
      logger.error(`Error getting appeal by ID: ${error}`);
      return null;
    }
  }

  private async getAppealByApplicationId(applicationId: string): Promise<Appeal | null> {
    try {
      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId },
        include: { admission_decisions: true }
      });

      if (!application?.admission_decisions[0]?.appeal_data) {
        return null;
      }

      return application.admission_decisions[0].appeal_data as any;

    } catch (error) {
      logger.error(`Error getting appeal by application ID: ${error}`);
      return null;
    }
  }

  private async updateAppeal(appeal: Appeal): Promise<void> {
    try {
      const decisions = await this.prisma.admission_decisions.findMany({
        where: {
          appeal_data: {
            path: ['id'],
            equals: appeal.id
          }
        }
      });

      if (decisions.length) {
        await this.prisma.admission_decisions.update({
          where: { id: decisions[0].id },
          data: {
            appeal_data: appeal as any
          }
        });
      }

    } catch (error) {
      logger.error(`Error updating appeal: ${error}`);
      throw error;
    }
  }

  private async updateOriginalDecision(applicationId: string, newStatus: string): Promise<void> {
    try {
      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId },
        include: { admission_decisions: true }
      });

      if (application?.admission_decisions[0]) {
        await this.prisma.admission_decisions.update({
          where: { id: application.admission_decisions[0].id },
          data: {
            decision: newStatus as any,
            decision_date: new Date()
          }
        });

        // Update application status
        await this.prisma.applications.update({
          where: { id: applicationId },
          data: {
            status: newStatus as any
          }
        });
      }

    } catch (error) {
      logger.error(`Error updating original decision: ${error}`);
      throw error;
    }
  }

  async getAppealStatus(applicationId: string): Promise<Appeal | null> {
    return this.getAppealByApplicationId(applicationId);
  }

  async getAllAppeals(status?: AppealStatus): Promise<Appeal[]> {
    try {
      const whereClause = status ? {
        appeal_data: {
          path: ['status'],
          equals: status
        }
      } : {
        appeal_data: {
          not: null
        }
      };

      const decisions = await this.prisma.admission_decisions.findMany({
        where: whereClause
      });

      return decisions.map(d => d.appeal_data as any).filter(Boolean);

    } catch (error) {
      logger.error(`Error getting all appeals: ${error}`);
      throw error;
    }
  }
}