/**
 * InterviewScheduler - Manages interview appointment scheduling and calendar management
 * "Let all things be done decently and in order" (1 Corinthians 14:40)
 */

import { PrismaClient } from '@prisma/client';
import { InterviewType, InterviewFormat, InterviewStatus } from '@prisma/client';

const prisma = new PrismaClient();

export interface InterviewScheduleRequest {
  applicationId: string;
  interviewType: InterviewType;
  preferredDates: Date[];
  format: InterviewFormat;
  duration: number;
  specialRequirements?: string;
  timeZone: string;
}

export interface InterviewSlot {
  date: Date;
  duration: number;
  interviewerId?: string;
  interviewerName?: string;
  available: boolean;
  conflictReason?: string;
}

export interface ScheduledInterview {
  id: string;
  applicationId: string;
  interviewType: InterviewType;
  scheduledDate: Date;
  interviewerId?: string;
  interviewerName?: string;
  format: InterviewFormat;
  duration: number;
  platform?: string;
  meetingUrl?: string;
  status: InterviewStatus;
}

export class InterviewScheduler {
  /**
   * Schedule a new interview for an application
   */
  async scheduleInterview(request: InterviewScheduleRequest): Promise<ScheduledInterview> {
    try {
      // Find available interviewer and time slot
      const availableSlot = await this.findAvailableSlot(request);
      
      if (!availableSlot.available) {
        throw new Error(`No available slots found: ${availableSlot.conflictReason}`);
      }

      // Create meeting URL if video conference
      const meetingUrl = request.format === InterviewFormat.VIDEO_CONFERENCE 
        ? await this.createMeetingUrl(availableSlot.date, request.duration)
        : undefined;

      // Create interview record
      const interview = await prisma.interviewRecord.create({
        data: {
          applicationId: request.applicationId,
          interviewType: request.interviewType,
          scheduledDate: availableSlot.date,
          interviewerId: availableSlot.interviewerId,
          interviewerName: availableSlot.interviewerName,
          format: request.format,
          duration: request.duration,
          platform: this.getPlatformForFormat(request.format),
          meetingUrl,
          status: InterviewStatus.SCHEDULED
        }
      });

      // Update application status
      await this.updateApplicationStatus(request.applicationId);

      // Send notifications
      await this.sendSchedulingNotifications(interview);

      return {
        id: interview.id,
        applicationId: interview.applicationId,
        interviewType: interview.interviewType,
        scheduledDate: interview.scheduledDate,
        interviewerId: interview.interviewerId,
        interviewerName: interview.interviewerName,
        format: interview.format,
        duration: interview.duration,
        platform: interview.platform,
        meetingUrl: interview.meetingUrl,
        status: interview.status
      };
    } catch (error) {
      console.error('Error scheduling interview:', error);
      throw new Error(`Failed to schedule interview: ${error.message}`);
    }
  }

  /**
   * Find available time slots for interview scheduling
   */
  async findAvailableSlot(request: InterviewScheduleRequest): Promise<InterviewSlot> {
    try {
      // Get available interviewers for this interview type
      const availableInterviewers = await this.getAvailableInterviewers(request.interviewType);
      
      if (availableInterviewers.length === 0) {
        return {
          date: request.preferredDates[0],
          duration: request.duration,
          available: false,
          conflictReason: 'No available interviewers for this interview type'
        };
      }

      // Check each preferred date for availability
      for (const preferredDate of request.preferredDates) {
        for (const interviewer of availableInterviewers) {
          const isAvailable = await this.checkInterviewerAvailability(
            interviewer.id,
            preferredDate,
            request.duration
          );

          if (isAvailable) {
            return {
              date: preferredDate,
              duration: request.duration,
              interviewerId: interviewer.id,
              interviewerName: `${interviewer.firstName} ${interviewer.lastName}`,
              available: true
            };
          }
        }
      }

      return {
        date: request.preferredDates[0],
        duration: request.duration,
        available: false,
        conflictReason: 'All preferred time slots are unavailable'
      };
    } catch (error) {
      console.error('Error finding available slot:', error);
      throw new Error(`Failed to find available slot: ${error.message}`);
    }
  }

  /**
   * Get available interviewers for a specific interview type
   */
  private async getAvailableInterviewers(interviewType: InterviewType) {
    const roleMapping = {
      [InterviewType.INITIAL_SCREENING]: ['ADMISSIONS_OFFICER', 'INTERVIEWER'],
      [InterviewType.ACADEMIC_ASSESSMENT]: ['ACADEMIC_ASSESSOR', 'FACULTY'],
      [InterviewType.SPIRITUAL_EVALUATION]: ['SPIRITUAL_EVALUATOR', 'SCROLL_ELDER'],
      [InterviewType.CHARACTER_INTERVIEW]: ['INTERVIEWER', 'ADMISSIONS_OFFICER'],
      [InterviewType.FINAL_INTERVIEW]: ['ADMISSIONS_COMMITTEE', 'SCROLL_ELDER'],
      [InterviewType.COMMITTEE_INTERVIEW]: ['ADMISSIONS_COMMITTEE']
    };

    const allowedRoles = roleMapping[interviewType] || ['INTERVIEWER'];

    return await prisma.user.findMany({
      where: {
        role: {
          in: allowedRoles as any[]
        },
        enrollmentStatus: 'ACTIVE'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      }
    });
  }

  /**
   * Check if an interviewer is available at a specific time
   */
  private async checkInterviewerAvailability(
    interviewerId: string,
    scheduledDate: Date,
    duration: number
  ): Promise<boolean> {
    const startTime = new Date(scheduledDate);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    // Check for conflicting interviews
    const conflictingInterviews = await prisma.interviewRecord.count({
      where: {
        interviewerId,
        status: {
          in: [InterviewStatus.SCHEDULED, InterviewStatus.IN_PROGRESS]
        },
        OR: [
          {
            scheduledDate: {
              gte: startTime,
              lt: endTime
            }
          },
          {
            AND: [
              {
                scheduledDate: {
                  lte: startTime
                }
              },
              {
                scheduledDate: {
                  gte: new Date(startTime.getTime() - 60 * 60000) // 1 hour buffer
                }
              }
            ]
          }
        ]
      }
    });

    return conflictingInterviews === 0;
  }

  /**
   * Create meeting URL for video conferences
   */
  private async createMeetingUrl(scheduledDate: Date, duration: number): Promise<string> {
    // In a real implementation, this would integrate with Zoom, Teams, etc.
    // For now, return a placeholder URL
    const meetingId = Math.random().toString(36).substring(2, 15);
    return `https://scrolluniversity.zoom.us/j/${meetingId}`;
  }

  /**
   * Get platform name for interview format
   */
  private getPlatformForFormat(format: InterviewFormat): string {
    switch (format) {
      case InterviewFormat.VIDEO_CONFERENCE:
        return 'Zoom';
      case InterviewFormat.PHONE_CALL:
        return 'Phone';
      case InterviewFormat.IN_PERSON:
        return 'In-Person';
      case InterviewFormat.ASYNCHRONOUS_VIDEO:
        return 'Asynchronous Video';
      default:
        return 'Unknown';
    }
  }

  /**
   * Update application status after interview scheduling
   */
  private async updateApplicationStatus(applicationId: string): Promise<void> {
    await prisma.application.update({
      where: { id: applicationId },
      data: { status: 'INTERVIEW_SCHEDULED' }
    });
  }

  /**
   * Send notifications about interview scheduling
   */
  private async sendSchedulingNotifications(interview: any): Promise<void> {
    // Get application and applicant details
    const application = await prisma.application.findUnique({
      where: { id: interview.applicationId },
      include: {
        applicant: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!application) return;

    // Send notification to applicant
    console.log(`Sending interview notification to ${application.applicant.email}`);
    // In a real implementation, this would send actual emails

    // Send notification to interviewer if assigned
    if (interview.interviewerId) {
      const interviewer = await prisma.user.findUnique({
        where: { id: interview.interviewerId },
        select: { email: true, firstName: true, lastName: true }
      });

      if (interviewer) {
        console.log(`Sending interview assignment notification to ${interviewer.email}`);
      }
    }
  }

  /**
   * Reschedule an existing interview
   */
  async rescheduleInterview(
    interviewId: string,
    newScheduleRequest: Partial<InterviewScheduleRequest>
  ): Promise<ScheduledInterview> {
    try {
      const existingInterview = await prisma.interviewRecord.findUnique({
        where: { id: interviewId }
      });

      if (!existingInterview) {
        throw new Error('Interview not found');
      }

      // Find new available slot
      const availableSlot = await this.findAvailableSlot({
        applicationId: existingInterview.applicationId,
        interviewType: existingInterview.interviewType,
        preferredDates: newScheduleRequest.preferredDates || [new Date()],
        format: newScheduleRequest.format || existingInterview.format,
        duration: newScheduleRequest.duration || existingInterview.duration,
        timeZone: newScheduleRequest.timeZone || 'UTC'
      });

      if (!availableSlot.available) {
        throw new Error(`No available slots for rescheduling: ${availableSlot.conflictReason}`);
      }

      // Update interview record
      const updatedInterview = await prisma.interviewRecord.update({
        where: { id: interviewId },
        data: {
          scheduledDate: availableSlot.date,
          interviewerId: availableSlot.interviewerId,
          interviewerName: availableSlot.interviewerName,
          status: InterviewStatus.RESCHEDULED,
          updatedAt: new Date()
        }
      });

      // Send rescheduling notifications
      await this.sendReschedulingNotifications(updatedInterview);

      return {
        id: updatedInterview.id,
        applicationId: updatedInterview.applicationId,
        interviewType: updatedInterview.interviewType,
        scheduledDate: updatedInterview.scheduledDate,
        interviewerId: updatedInterview.interviewerId,
        interviewerName: updatedInterview.interviewerName,
        format: updatedInterview.format,
        duration: updatedInterview.duration,
        platform: updatedInterview.platform,
        meetingUrl: updatedInterview.meetingUrl,
        status: updatedInterview.status
      };
    } catch (error) {
      console.error('Error rescheduling interview:', error);
      throw new Error(`Failed to reschedule interview: ${error.message}`);
    }
  }

  /**
   * Send rescheduling notifications
   */
  private async sendReschedulingNotifications(interview: any): Promise<void> {
    console.log(`Sending rescheduling notifications for interview ${interview.id}`);
    // Implementation would send actual notifications
  }

  /**
   * Cancel an interview
   */
  async cancelInterview(interviewId: string, reason: string): Promise<void> {
    try {
      await prisma.interviewRecord.update({
        where: { id: interviewId },
        data: {
          status: InterviewStatus.CANCELLED,
          interviewNotes: `Cancelled: ${reason}`,
          updatedAt: new Date()
        }
      });

      console.log(`Interview ${interviewId} cancelled: ${reason}`);
    } catch (error) {
      console.error('Error cancelling interview:', error);
      throw new Error(`Failed to cancel interview: ${error.message}`);
    }
  }

  /**
   * Get interview schedule for a specific date range
   */
  async getInterviewSchedule(startDate: Date, endDate: Date): Promise<ScheduledInterview[]> {
    try {
      const interviews = await prisma.interviewRecord.findMany({
        where: {
          scheduledDate: {
            gte: startDate,
            lte: endDate
          },
          status: {
            in: [InterviewStatus.SCHEDULED, InterviewStatus.IN_PROGRESS]
          }
        },
        orderBy: {
          scheduledDate: 'asc'
        }
      });

      return interviews.map(interview => ({
        id: interview.id,
        applicationId: interview.applicationId,
        interviewType: interview.interviewType,
        scheduledDate: interview.scheduledDate,
        interviewerId: interview.interviewerId,
        interviewerName: interview.interviewerName,
        format: interview.format,
        duration: interview.duration,
        platform: interview.platform,
        meetingUrl: interview.meetingUrl,
        status: interview.status
      }));
    } catch (error) {
      console.error('Error getting interview schedule:', error);
      throw new Error(`Failed to get interview schedule: ${error.message}`);
    }
  }
}