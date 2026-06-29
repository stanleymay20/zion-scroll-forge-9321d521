import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface WaitlistEntry {
  id: string;
  applicationId: string;
  applicantId: string;
  addedDate: Date;
  position: number;
  priority: WaitlistPriority;
  status: WaitlistStatus;
  programType: string;
  intendedStartDate: Date;
  lastContactDate?: Date;
  interestConfirmed: boolean;
  interestConfirmationDeadline?: Date;
  notes: string[];
}

export interface WaitlistMovement {
  id: string;
  applicationId: string;
  fromPosition: number;
  toPosition: number;
  movementDate: Date;
  reason: string;
  notificationSent: boolean;
}

export interface WaitlistStatistics {
  totalEntries: number;
  byProgram: Record<string, number>;
  byPriority: Record<WaitlistPriority, number>;
  averageWaitTime: number;
  conversionRate: number;
  recentMovements: WaitlistMovement[];
}

export enum WaitlistPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum WaitlistStatus {
  ACTIVE = 'active',
  OFFERED_ADMISSION = 'offered_admission',
  ACCEPTED_OFFER = 'accepted_offer',
  DECLINED_OFFER = 'declined_offer',
  EXPIRED = 'expired',
  WITHDRAWN = 'withdrawn'
}

export class WaitlistManager {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async addToWaitlist(
    applicationId: string,
    priority: WaitlistPriority = WaitlistPriority.MEDIUM,
    notes: string[] = []
  ): Promise<WaitlistEntry> {
    try {
      logger.info(`Adding application ${applicationId} to waitlist`);

      // Get application details
      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId },
        include: { admission_decisions: true }
      });

      if (!application) {
        throw new Error(`Application ${applicationId} not found`);
      }

      // Verify application is waitlisted
      const decision = application.admission_decisions[0];
      if (!decision || decision.decision !== 'waitlisted') {
        throw new Error(`Application ${applicationId} is not waitlisted`);
      }

      // Check if already on waitlist
      const existingEntry = await this.getWaitlistEntry(applicationId);
      if (existingEntry) {
        throw new Error(`Application ${applicationId} is already on waitlist`);
      }

      // Calculate position
      const position = await this.calculateWaitlistPosition(
        application.program_applied,
        application.intended_start_date,
        priority
      );

      // Create waitlist entry
      const waitlistEntry: WaitlistEntry = {
        id: `waitlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        applicationId,
        applicantId: application.applicant_id,
        addedDate: new Date(),
        position,
        priority,
        status: WaitlistStatus.ACTIVE,
        programType: application.program_applied,
        intendedStartDate: application.intended_start_date,
        interestConfirmed: true,
        notes
      };

      // Store waitlist entry
      await this.prisma.admission_decisions.update({
        where: { id: decision.id },
        data: {
          waitlist_data: waitlistEntry as any
        }
      });

      // Update positions of other entries
      await this.updateWaitlistPositions(application.program_applied, application.intended_start_date);

      logger.info(`Application ${applicationId} added to waitlist at position ${position}`);
      return waitlistEntry;

    } catch (error) {
      logger.error(`Error adding to waitlist: ${error}`);
      throw error;
    }
  }

  async offerAdmissionFromWaitlist(
    applicationId: string,
    offerDeadline: Date
  ): Promise<WaitlistEntry> {
    try {
      logger.info(`Offering admission from waitlist for application ${applicationId}`);

      const waitlistEntry = await this.getWaitlistEntry(applicationId);
      if (!waitlistEntry) {
        throw new Error(`Application ${applicationId} not found on waitlist`);
      }

      if (waitlistEntry.status !== WaitlistStatus.ACTIVE) {
        throw new Error(`Waitlist entry is not active: ${waitlistEntry.status}`);
      }

      // Update waitlist entry
      waitlistEntry.status = WaitlistStatus.OFFERED_ADMISSION;
      waitlistEntry.interestConfirmationDeadline = offerDeadline;
      waitlistEntry.lastContactDate = new Date();

      await this.updateWaitlistEntry(waitlistEntry);

      // Update application status
      await this.prisma.applications.update({
        where: { id: applicationId },
        data: { status: 'accepted' as any }
      });

      // Update admission decision
      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId },
        include: { admission_decisions: true }
      });

      if (application?.admission_decisions[0]) {
        await this.prisma.admission_decisions.update({
          where: { id: application.admission_decisions[0].id },
          data: {
            decision: 'accepted' as any,
            decision_date: new Date()
          }
        });
      }

      logger.info(`Admission offered from waitlist for application ${applicationId}`);
      return waitlistEntry;

    } catch (error) {
      logger.error(`Error offering admission from waitlist: ${error}`);
      throw error;
    }
  }

  async confirmWaitlistInterest(
    applicationId: string,
    confirmed: boolean,
    notes?: string
  ): Promise<WaitlistEntry> {
    try {
      logger.info(`Confirming waitlist interest for application ${applicationId}: ${confirmed}`);

      const waitlistEntry = await this.getWaitlistEntry(applicationId);
      if (!waitlistEntry) {
        throw new Error(`Application ${applicationId} not found on waitlist`);
      }

      waitlistEntry.interestConfirmed = confirmed;
      waitlistEntry.lastContactDate = new Date();
      
      if (notes) {
        waitlistEntry.notes.push(`${new Date().toISOString()}: ${notes}`);
      }

      if (!confirmed) {
        waitlistEntry.status = WaitlistStatus.WITHDRAWN;
        // Update positions of remaining entries
        await this.updateWaitlistPositions(waitlistEntry.programType, waitlistEntry.intendedStartDate);
      }

      await this.updateWaitlistEntry(waitlistEntry);

      logger.info(`Waitlist interest confirmed for application ${applicationId}`);
      return waitlistEntry;

    } catch (error) {
      logger.error(`Error confirming waitlist interest: ${error}`);
      throw error;
    }
  }

  async respondToWaitlistOffer(
    applicationId: string,
    accepted: boolean,
    response?: string
  ): Promise<WaitlistEntry> {
    try {
      logger.info(`Processing waitlist offer response for application ${applicationId}: ${accepted}`);

      const waitlistEntry = await this.getWaitlistEntry(applicationId);
      if (!waitlistEntry) {
        throw new Error(`Application ${applicationId} not found on waitlist`);
      }

      if (waitlistEntry.status !== WaitlistStatus.OFFERED_ADMISSION) {
        throw new Error(`No active admission offer for application ${applicationId}`);
      }

      // Update waitlist entry
      waitlistEntry.status = accepted ? WaitlistStatus.ACCEPTED_OFFER : WaitlistStatus.DECLINED_OFFER;
      waitlistEntry.lastContactDate = new Date();
      
      if (response) {
        waitlistEntry.notes.push(`${new Date().toISOString()}: Offer response - ${response}`);
      }

      await this.updateWaitlistEntry(waitlistEntry);

      // If declined, update positions of remaining entries
      if (!accepted) {
        await this.updateWaitlistPositions(waitlistEntry.programType, waitlistEntry.intendedStartDate);
      }

      logger.info(`Waitlist offer response processed for application ${applicationId}`);
      return waitlistEntry;

    } catch (error) {
      logger.error(`Error processing waitlist offer response: ${error}`);
      throw error;
    }
  }

  async updateWaitlistPosition(
    applicationId: string,
    newPriority: WaitlistPriority,
    reason: string
  ): Promise<WaitlistEntry> {
    try {
      logger.info(`Updating waitlist position for application ${applicationId}`);

      const waitlistEntry = await this.getWaitlistEntry(applicationId);
      if (!waitlistEntry) {
        throw new Error(`Application ${applicationId} not found on waitlist`);
      }

      const oldPosition = waitlistEntry.position;
      waitlistEntry.priority = newPriority;
      
      // Recalculate position based on new priority
      const newPosition = await this.calculateWaitlistPosition(
        waitlistEntry.programType,
        waitlistEntry.intendedStartDate,
        newPriority
      );

      waitlistEntry.position = newPosition;
      waitlistEntry.notes.push(`${new Date().toISOString()}: Position updated from ${oldPosition} to ${newPosition} - ${reason}`);

      await this.updateWaitlistEntry(waitlistEntry);

      // Record movement
      const movement: WaitlistMovement = {
        id: `movement_${Date.now()}`,
        applicationId,
        fromPosition: oldPosition,
        toPosition: newPosition,
        movementDate: new Date(),
        reason,
        notificationSent: false
      };

      // Update all positions
      await this.updateWaitlistPositions(waitlistEntry.programType, waitlistEntry.intendedStartDate);

      logger.info(`Waitlist position updated for application ${applicationId}: ${oldPosition} -> ${newPosition}`);
      return waitlistEntry;

    } catch (error) {
      logger.error(`Error updating waitlist position: ${error}`);
      throw error;
    }
  }

  async removeFromWaitlist(applicationId: string, reason: string): Promise<void> {
    try {
      logger.info(`Removing application ${applicationId} from waitlist`);

      const waitlistEntry = await this.getWaitlistEntry(applicationId);
      if (!waitlistEntry) {
        throw new Error(`Application ${applicationId} not found on waitlist`);
      }

      waitlistEntry.status = WaitlistStatus.WITHDRAWN;
      waitlistEntry.notes.push(`${new Date().toISOString()}: Removed from waitlist - ${reason}`);

      await this.updateWaitlistEntry(waitlistEntry);

      // Update positions of remaining entries
      await this.updateWaitlistPositions(waitlistEntry.programType, waitlistEntry.intendedStartDate);

      logger.info(`Application ${applicationId} removed from waitlist`);

    } catch (error) {
      logger.error(`Error removing from waitlist: ${error}`);
      throw error;
    }
  }

  async getWaitlistByProgram(
    programType: string,
    startDate: Date,
    status?: WaitlistStatus
  ): Promise<WaitlistEntry[]> {
    try {
      const decisions = await this.prisma.admission_decisions.findMany({
        where: {
          waitlist_data: {
            not: null
          }
        },
        include: {
          applications: true
        }
      });

      const waitlistEntries = decisions
        .map(d => d.waitlist_data as any)
        .filter(Boolean)
        .filter((entry: WaitlistEntry) => {
          return entry.programType === programType &&
                 entry.intendedStartDate.getTime() === startDate.getTime() &&
                 (!status || entry.status === status);
        })
        .sort((a: WaitlistEntry, b: WaitlistEntry) => a.position - b.position);

      return waitlistEntries;

    } catch (error) {
      logger.error(`Error getting waitlist by program: ${error}`);
      throw error;
    }
  }

  async getWaitlistStatistics(programType?: string): Promise<WaitlistStatistics> {
    try {
      const decisions = await this.prisma.admission_decisions.findMany({
        where: {
          waitlist_data: {
            not: null
          }
        }
      });

      const allEntries = decisions
        .map(d => d.waitlist_data as any)
        .filter(Boolean) as WaitlistEntry[];

      const activeEntries = allEntries.filter(entry => 
        entry.status === WaitlistStatus.ACTIVE &&
        (!programType || entry.programType === programType)
      );

      // Calculate statistics
      const byProgram: Record<string, number> = {};
      const byPriority: Record<WaitlistPriority, number> = {
        [WaitlistPriority.HIGH]: 0,
        [WaitlistPriority.MEDIUM]: 0,
        [WaitlistPriority.LOW]: 0
      };

      activeEntries.forEach(entry => {
        byProgram[entry.programType] = (byProgram[entry.programType] || 0) + 1;
        byPriority[entry.priority]++;
      });

      // Calculate average wait time (simplified)
      const completedEntries = allEntries.filter(entry => 
        [WaitlistStatus.ACCEPTED_OFFER, WaitlistStatus.DECLINED_OFFER].includes(entry.status)
      );

      const averageWaitTime = completedEntries.length > 0 
        ? completedEntries.reduce((sum, entry) => {
            const waitTime = (entry.lastContactDate?.getTime() || Date.now()) - entry.addedDate.getTime();
            return sum + waitTime;
          }, 0) / completedEntries.length / (1000 * 60 * 60 * 24) // Convert to days
        : 0;

      // Calculate conversion rate
      const offeredEntries = allEntries.filter(entry => 
        [WaitlistStatus.OFFERED_ADMISSION, WaitlistStatus.ACCEPTED_OFFER, WaitlistStatus.DECLINED_OFFER].includes(entry.status)
      );
      const acceptedEntries = allEntries.filter(entry => entry.status === WaitlistStatus.ACCEPTED_OFFER);
      const conversionRate = offeredEntries.length > 0 ? (acceptedEntries.length / offeredEntries.length) * 100 : 0;

      return {
        totalEntries: activeEntries.length,
        byProgram,
        byPriority,
        averageWaitTime,
        conversionRate,
        recentMovements: [] // Would be populated from movement tracking
      };

    } catch (error) {
      logger.error(`Error getting waitlist statistics: ${error}`);
      throw error;
    }
  }

  async checkWaitlistDeadlines(): Promise<string[]> {
    try {
      logger.info('Checking waitlist deadlines');

      const decisions = await this.prisma.admission_decisions.findMany({
        where: {
          waitlist_data: {
            not: null
          }
        }
      });

      const expiredEntries: string[] = [];
      const now = new Date();

      for (const decision of decisions) {
        const waitlistEntry = decision.waitlist_data as any;
        
        if (waitlistEntry?.status === WaitlistStatus.OFFERED_ADMISSION &&
            waitlistEntry.interestConfirmationDeadline &&
            new Date(waitlistEntry.interestConfirmationDeadline) < now) {
          
          // Mark as expired
          waitlistEntry.status = WaitlistStatus.EXPIRED;
          waitlistEntry.notes.push(`${new Date().toISOString()}: Offer expired`);
          
          await this.prisma.admission_decisions.update({
            where: { id: decision.id },
            data: {
              waitlist_data: waitlistEntry
            }
          });

          expiredEntries.push(waitlistEntry.applicationId);
        }
      }

      logger.info(`Found ${expiredEntries.length} expired waitlist offers`);
      return expiredEntries;

    } catch (error) {
      logger.error(`Error checking waitlist deadlines: ${error}`);
      throw error;
    }
  }

  private async getWaitlistEntry(applicationId: string): Promise<WaitlistEntry | null> {
    try {
      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId },
        include: { admission_decisions: true }
      });

      if (!application?.admission_decisions[0]?.waitlist_data) {
        return null;
      }

      return application.admission_decisions[0].waitlist_data as any;

    } catch (error) {
      logger.error(`Error getting waitlist entry: ${error}`);
      return null;
    }
  }

  private async updateWaitlistEntry(entry: WaitlistEntry): Promise<void> {
    try {
      const decisions = await this.prisma.admission_decisions.findMany({
        where: {
          waitlist_data: {
            path: ['id'],
            equals: entry.id
          }
        }
      });

      if (decisions.length) {
        await this.prisma.admission_decisions.update({
          where: { id: decisions[0].id },
          data: {
            waitlist_data: entry as any
          }
        });
      }

    } catch (error) {
      logger.error(`Error updating waitlist entry: ${error}`);
      throw error;
    }
  }

  private async calculateWaitlistPosition(
    programType: string,
    startDate: Date,
    priority: WaitlistPriority
  ): Promise<number> {
    try {
      const existingEntries = await this.getWaitlistByProgram(programType, startDate, WaitlistStatus.ACTIVE);
      
      // Sort by priority (high first) then by date added
      const priorityOrder = { [WaitlistPriority.HIGH]: 1, [WaitlistPriority.MEDIUM]: 2, [WaitlistPriority.LOW]: 3 };
      
      existingEntries.sort((a, b) => {
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.addedDate.getTime() - b.addedDate.getTime();
      });

      // Find position based on priority
      let position = 1;
      for (const entry of existingEntries) {
        if (priorityOrder[priority] <= priorityOrder[entry.priority]) {
          break;
        }
        position++;
      }

      return position;

    } catch (error) {
      logger.error(`Error calculating waitlist position: ${error}`);
      return 1;
    }
  }

  private async updateWaitlistPositions(programType: string, startDate: Date): Promise<void> {
    try {
      const entries = await this.getWaitlistByProgram(programType, startDate, WaitlistStatus.ACTIVE);
      
      // Sort by priority and date
      const priorityOrder = { [WaitlistPriority.HIGH]: 1, [WaitlistPriority.MEDIUM]: 2, [WaitlistPriority.LOW]: 3 };
      
      entries.sort((a, b) => {
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.addedDate.getTime() - b.addedDate.getTime();
      });

      // Update positions
      for (let i = 0; i < entries.length; i++) {
        entries[i].position = i + 1;
        await this.updateWaitlistEntry(entries[i]);
      }

    } catch (error) {
      logger.error(`Error updating waitlist positions: ${error}`);
      throw error;
    }
  }
}