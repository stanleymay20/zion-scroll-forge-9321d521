/**
 * InterviewReminderManager - Manages interview reminder and confirmation system
 * "Be ready in season and out of season" (2 Timothy 4:2)
 */

import { PrismaClient } from '@prisma/client';
import { InterviewStatus, InterviewFormat } from '@prisma/client';

const prisma = new PrismaClient();

export interface ReminderSchedule {
  interviewId: string;
  reminders: ReminderEvent[];
}

export interface ReminderEvent {
  type: ReminderType;
  scheduledTime: Date;
  status: ReminderStatus;
  message: string;
  channels: NotificationChannel[];
  sent: boolean;
  sentAt?: Date;
}

export enum ReminderType {
  INITIAL_CONFIRMATION = 'initial_confirmation',
  ONE_WEEK_BEFORE = 'one_week_before',
  TWO_DAYS_BEFORE = 'two_days_before',
  ONE_DAY_BEFORE = 'one_day_before',
  TWO_HOURS_BEFORE = 'two_hours_before',
  THIRTY_MINUTES_BEFORE = 'thirty_minutes_before',
  POST_INTERVIEW_FOLLOWUP = 'post_interview_followup'
}

export enum ReminderStatus {
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  PHONE_CALL = 'phone_call'
}

export interface ConfirmationRequest {
  interviewId: string;
  applicantResponse: ConfirmationResponse;
  responseTime: Date;
  additionalNotes?: string;
}

export enum ConfirmationResponse {
  CONFIRMED = 'confirmed',
  NEEDS_RESCHEDULE = 'needs_reschedule',
  CANCELLED = 'cancelled',
  NO_RESPONSE = 'no_response'
}

export interface ReminderTemplate {
  type: ReminderType;
  format: InterviewFormat;
  subject: string;
  emailTemplate: string;
  smsTemplate: string;
  pushTemplate: string;
}

export class InterviewReminderManager {
  /**
   * Schedule all reminders for an interview
   */
  async scheduleReminders(interviewId: string): Promise<ReminderSchedule> {
    try {
      const interview = await prisma.interviewRecord.findUnique({
        where: { id: interviewId },
        include: {
          application: {
            include: {
              applicant: {
                select: {
                  email: true,
                  phoneNumber: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });

      if (!interview) {
        throw new Error('Interview not found');
      }

      const reminders = this.generateReminderEvents(interview);
      
      // Store reminder schedule in database
      await this.storeReminderSchedule(interviewId, reminders);

      // Schedule actual reminder jobs
      await this.scheduleReminderJobs(interviewId, reminders);

      return {
        interviewId,
        reminders
      };
    } catch (error) {
      console.error('Error scheduling reminders:', error);
      throw new Error(`Failed to schedule reminders: ${error.message}`);
    }
  }

  /**
   * Generate reminder events based on interview details
   */
  private generateReminderEvents(interview: any): ReminderEvent[] {
    const scheduledDate = new Date(interview.scheduledDate);
    const reminders: ReminderEvent[] = [];

    // Initial confirmation (immediately after scheduling)
    reminders.push({
      type: ReminderType.INITIAL_CONFIRMATION,
      scheduledTime: new Date(),
      status: ReminderStatus.SCHEDULED,
      message: this.generateReminderMessage(ReminderType.INITIAL_CONFIRMATION, interview),
      channels: [NotificationChannel.EMAIL],
      sent: false
    });

    // One week before
    const oneWeekBefore = new Date(scheduledDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (oneWeekBefore > new Date()) {
      reminders.push({
        type: ReminderType.ONE_WEEK_BEFORE,
        scheduledTime: oneWeekBefore,
        status: ReminderStatus.SCHEDULED,
        message: this.generateReminderMessage(ReminderType.ONE_WEEK_BEFORE, interview),
        channels: [NotificationChannel.EMAIL],
        sent: false
      });
    }

    // Two days before
    const twoDaysBefore = new Date(scheduledDate.getTime() - 2 * 24 * 60 * 60 * 1000);
    if (twoDaysBefore > new Date()) {
      reminders.push({
        type: ReminderType.TWO_DAYS_BEFORE,
        scheduledTime: twoDaysBefore,
        status: ReminderStatus.SCHEDULED,
        message: this.generateReminderMessage(ReminderType.TWO_DAYS_BEFORE, interview),
        channels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
        sent: false
      });
    }

    // One day before
    const oneDayBefore = new Date(scheduledDate.getTime() - 24 * 60 * 60 * 1000);
    if (oneDayBefore > new Date()) {
      reminders.push({
        type: ReminderType.ONE_DAY_BEFORE,
        scheduledTime: oneDayBefore,
        status: ReminderStatus.SCHEDULED,
        message: this.generateReminderMessage(ReminderType.ONE_DAY_BEFORE, interview),
        channels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
        sent: false
      });
    }

    // Two hours before
    const twoHoursBefore = new Date(scheduledDate.getTime() - 2 * 60 * 60 * 1000);
    if (twoHoursBefore > new Date()) {
      reminders.push({
        type: ReminderType.TWO_HOURS_BEFORE,
        scheduledTime: twoHoursBefore,
        status: ReminderStatus.SCHEDULED,
        message: this.generateReminderMessage(ReminderType.TWO_HOURS_BEFORE, interview),
        channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
        sent: false
      });
    }

    // Thirty minutes before
    const thirtyMinutesBefore = new Date(scheduledDate.getTime() - 30 * 60 * 1000);
    if (thirtyMinutesBefore > new Date()) {
      reminders.push({
        type: ReminderType.THIRTY_MINUTES_BEFORE,
        scheduledTime: thirtyMinutesBefore,
        status: ReminderStatus.SCHEDULED,
        message: this.generateReminderMessage(ReminderType.THIRTY_MINUTES_BEFORE, interview),
        channels: [NotificationChannel.SMS, NotificationChannel.PUSH],
        sent: false
      });
    }

    // Post-interview follow-up (2 hours after scheduled end)
    const followupTime = new Date(scheduledDate.getTime() + (interview.duration + 120) * 60 * 1000);
    reminders.push({
      type: ReminderType.POST_INTERVIEW_FOLLOWUP,
      scheduledTime: followupTime,
      status: ReminderStatus.SCHEDULED,
      message: this.generateReminderMessage(ReminderType.POST_INTERVIEW_FOLLOWUP, interview),
      channels: [NotificationChannel.EMAIL],
      sent: false
    });

    return reminders;
  }

  /**
   * Generate reminder message based on type and interview details
   */
  private generateReminderMessage(type: ReminderType, interview: any): string {
    const applicantName = `${interview.application.applicant.firstName} ${interview.application.applicant.lastName}`;
    const interviewDate = new Date(interview.scheduledDate).toLocaleDateString();
    const interviewTime = new Date(interview.scheduledDate).toLocaleTimeString();

    switch (type) {
      case ReminderType.INITIAL_CONFIRMATION:
        return `Dear ${applicantName}, your ${interview.interviewType} interview has been scheduled for ${interviewDate} at ${interviewTime}. Please confirm your attendance.`;
      
      case ReminderType.ONE_WEEK_BEFORE:
        return `Dear ${applicantName}, this is a reminder that your ScrollUniversity interview is scheduled for ${interviewDate} at ${interviewTime}. Please begin your preparation.`;
      
      case ReminderType.TWO_DAYS_BEFORE:
        return `Dear ${applicantName}, your interview is in 2 days (${interviewDate} at ${interviewTime}). Please test your technology and review preparation materials.`;
      
      case ReminderType.ONE_DAY_BEFORE:
        return `Dear ${applicantName}, your interview is tomorrow (${interviewTime}). Please ensure you're prepared and have tested all technology.`;
      
      case ReminderType.TWO_HOURS_BEFORE:
        return `Dear ${applicantName}, your interview starts in 2 hours. Please log in 10 minutes early. Meeting details: ${interview.meetingUrl || 'Check your email'}`;
      
      case ReminderType.THIRTY_MINUTES_BEFORE:
        return `Your ScrollUniversity interview starts in 30 minutes. Please join now: ${interview.meetingUrl || 'Check your email'}`;
      
      case ReminderType.POST_INTERVIEW_FOLLOWUP:
        return `Dear ${applicantName}, thank you for your interview today. We will be in touch regarding next steps in your application process.`;
      
      default:
        return `Interview reminder for ${interviewDate} at ${interviewTime}`;
    }
  }

  /**
   * Store reminder schedule in database
   */
  private async storeReminderSchedule(interviewId: string, reminders: ReminderEvent[]): Promise<void> {
    // In a real implementation, this would store in a reminders table
    // For now, we'll log the schedule
    console.log(`Storing reminder schedule for interview ${interviewId}:`, reminders);
  }

  /**
   * Schedule reminder jobs (would integrate with job queue)
   */
  private async scheduleReminderJobs(interviewId: string, reminders: ReminderEvent[]): Promise<void> {
    // In a real implementation, this would schedule jobs with a queue system like Bull or Agenda
    for (const reminder of reminders) {
      console.log(`Scheduling ${reminder.type} reminder for ${reminder.scheduledTime}`);
    }
  }

  /**
   * Send immediate reminder
   */
  async sendReminder(interviewId: string, reminderType: ReminderType): Promise<void> {
    try {
      const interview = await prisma.interviewRecord.findUnique({
        where: { id: interviewId },
        include: {
          application: {
            include: {
              applicant: {
                select: {
                  email: true,
                  phoneNumber: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });

      if (!interview) {
        throw new Error('Interview not found');
      }

      const message = this.generateReminderMessage(reminderType, interview);
      const template = this.getReminderTemplate(reminderType, interview.format);

      // Send via email
      await this.sendEmailReminder(
        interview.application.applicant.email,
        template.subject,
        message,
        template.emailTemplate
      );

      // Send via SMS if phone number available
      if (interview.application.applicant.phoneNumber) {
        await this.sendSMSReminder(
          interview.application.applicant.phoneNumber,
          template.smsTemplate
        );
      }

      console.log(`Sent ${reminderType} reminder for interview ${interviewId}`);
    } catch (error) {
      console.error('Error sending reminder:', error);
      throw new Error(`Failed to send reminder: ${error.message}`);
    }
  }

  /**
   * Process confirmation response
   */
  async processConfirmation(request: ConfirmationRequest): Promise<void> {
    try {
      const interview = await prisma.interviewRecord.findUnique({
        where: { id: request.interviewId }
      });

      if (!interview) {
        throw new Error('Interview not found');
      }

      switch (request.applicantResponse) {
        case ConfirmationResponse.CONFIRMED:
          await this.handleConfirmation(request.interviewId);
          break;
        
        case ConfirmationResponse.NEEDS_RESCHEDULE:
          await this.handleRescheduleRequest(request.interviewId, request.additionalNotes);
          break;
        
        case ConfirmationResponse.CANCELLED:
          await this.handleCancellation(request.interviewId, request.additionalNotes);
          break;
        
        default:
          console.log(`No response received for interview ${request.interviewId}`);
      }

      // Log the response
      console.log(`Processed confirmation for interview ${request.interviewId}: ${request.applicantResponse}`);
    } catch (error) {
      console.error('Error processing confirmation:', error);
      throw new Error(`Failed to process confirmation: ${error.message}`);
    }
  }

  /**
   * Handle interview confirmation
   */
  private async handleConfirmation(interviewId: string): Promise<void> {
    // Update interview status if needed
    await prisma.interviewRecord.update({
      where: { id: interviewId },
      data: {
        updatedAt: new Date()
        // Could add a confirmed flag if needed
      }
    });

    // Send confirmation acknowledgment
    console.log(`Interview ${interviewId} confirmed by applicant`);
  }

  /**
   * Handle reschedule request
   */
  private async handleRescheduleRequest(interviewId: string, notes?: string): Promise<void> {
    await prisma.interviewRecord.update({
      where: { id: interviewId },
      data: {
        status: InterviewStatus.RESCHEDULED,
        interviewNotes: notes ? `Reschedule requested: ${notes}` : 'Reschedule requested',
        updatedAt: new Date()
      }
    });

    // Notify admissions team
    console.log(`Reschedule requested for interview ${interviewId}: ${notes}`);
  }

  /**
   * Handle cancellation
   */
  private async handleCancellation(interviewId: string, reason?: string): Promise<void> {
    await prisma.interviewRecord.update({
      where: { id: interviewId },
      data: {
        status: InterviewStatus.CANCELLED,
        interviewNotes: reason ? `Cancelled by applicant: ${reason}` : 'Cancelled by applicant',
        updatedAt: new Date()
      }
    });

    console.log(`Interview ${interviewId} cancelled by applicant: ${reason}`);
  }

  /**
   * Get reminder template
   */
  private getReminderTemplate(type: ReminderType, format: InterviewFormat): ReminderTemplate {
    const baseSubject = 'ScrollUniversity Interview Reminder';
    
    return {
      type,
      format,
      subject: `${baseSubject} - ${type.replace('_', ' ').toUpperCase()}`,
      emailTemplate: this.getEmailTemplate(type, format),
      smsTemplate: this.getSMSTemplate(type, format),
      pushTemplate: this.getPushTemplate(type, format)
    };
  }

  /**
   * Get email template
   */
  private getEmailTemplate(type: ReminderType, format: InterviewFormat): string {
    return `
      <html>
        <body>
          <h2>ScrollUniversity Interview Reminder</h2>
          <p>{{message}}</p>
          
          ${format === InterviewFormat.VIDEO_CONFERENCE ? `
            <h3>Technical Preparation:</h3>
            <ul>
              <li>Test your camera and microphone</li>
              <li>Ensure stable internet connection</li>
              <li>Join the meeting 10 minutes early</li>
            </ul>
            <p><strong>Meeting Link:</strong> {{meetingUrl}}</p>
          ` : ''}
          
          ${format === InterviewFormat.IN_PERSON ? `
            <h3>In-Person Interview:</h3>
            <ul>
              <li>Arrive 15 minutes early</li>
              <li>Bring required documents</li>
              <li>Dress professionally</li>
            </ul>
            <p><strong>Location:</strong> ScrollUniversity Admissions Office</p>
          ` : ''}
          
          <p>If you need to reschedule or have questions, please contact us immediately.</p>
          
          <p>Blessings,<br>ScrollUniversity Admissions Team</p>
        </body>
      </html>
    `;
  }

  /**
   * Get SMS template
   */
  private getSMSTemplate(type: ReminderType, format: InterviewFormat): string {
    return `ScrollUniversity: {{message}} Reply CONFIRM to confirm, RESCHEDULE to reschedule, or CANCEL to cancel.`;
  }

  /**
   * Get push notification template
   */
  private getPushTemplate(type: ReminderType, format: InterviewFormat): string {
    return `{{message}}`;
  }

  /**
   * Send email reminder
   */
  private async sendEmailReminder(
    email: string,
    subject: string,
    message: string,
    template: string
  ): Promise<void> {
    // In a real implementation, this would use an email service
    console.log(`Sending email reminder to ${email}: ${subject}`);
    console.log(`Message: ${message}`);
  }

  /**
   * Send SMS reminder
   */
  private async sendSMSReminder(phoneNumber: string, message: string): Promise<void> {
    // In a real implementation, this would use an SMS service like Twilio
    console.log(`Sending SMS reminder to ${phoneNumber}: ${message}`);
  }

  /**
   * Get pending reminders that need to be sent
   */
  async getPendingReminders(): Promise<ReminderEvent[]> {
    // In a real implementation, this would query the reminders table
    // For now, return empty array
    return [];
  }

  /**
   * Process all pending reminders
   */
  async processPendingReminders(): Promise<void> {
    const pendingReminders = await this.getPendingReminders();
    
    for (const reminder of pendingReminders) {
      try {
        // Send the reminder
        console.log(`Processing pending reminder: ${reminder.type}`);
        
        // Mark as sent
        reminder.sent = true;
        reminder.sentAt = new Date();
        reminder.status = ReminderStatus.SENT;
      } catch (error) {
        console.error(`Failed to send reminder: ${error.message}`);
        reminder.status = ReminderStatus.FAILED;
      }
    }
  }

  /**
   * Cancel all reminders for an interview
   */
  async cancelReminders(interviewId: string): Promise<void> {
    try {
      console.log(`Cancelling all reminders for interview ${interviewId}`);
      
      // In a real implementation, this would update the reminders table
      // and cancel scheduled jobs
      
    } catch (error) {
      console.error('Error cancelling reminders:', error);
      throw new Error(`Failed to cancel reminders: ${error.message}`);
    }
  }

  /**
   * Update reminder schedule when interview is rescheduled
   */
  async updateReminderSchedule(interviewId: string, newScheduledDate: Date): Promise<void> {
    try {
      // Cancel existing reminders
      await this.cancelReminders(interviewId);
      
      // Schedule new reminders
      await this.scheduleReminders(interviewId);
      
      console.log(`Updated reminder schedule for rescheduled interview ${interviewId}`);
    } catch (error) {
      console.error('Error updating reminder schedule:', error);
      throw new Error(`Failed to update reminder schedule: ${error.message}`);
    }
  }
}