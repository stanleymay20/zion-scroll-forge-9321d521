/**
 * InterviewCoordinationService - Main service for interview scheduling and coordination
 * "Let all things be done decently and in order" (1 Corinthians 14:40)
 */

import { InterviewScheduler, InterviewScheduleRequest, ScheduledInterview } from './InterviewScheduler';
import { InterviewerMatcher, MatchingCriteria, MatchingResult } from './InterviewerMatcher';
import { InterviewFormatSelector, FormatSelectionCriteria, FormatRecommendation, InterviewPreparationGuide } from './InterviewFormatSelector';
import { InterviewReminderManager, ReminderSchedule, ConfirmationRequest } from './InterviewReminderManager';
import { InterviewType, InterviewFormat } from '@prisma/client';

export interface InterviewCoordinationRequest {
  applicationId: string;
  interviewType: InterviewType;
  applicantPreferences: ApplicantPreferences;
  specialRequirements?: string[];
  urgency: 'low' | 'medium' | 'high';
}

export interface ApplicantPreferences {
  preferredDates: Date[];
  preferredTimes: string[];
  preferredFormats: InterviewFormat[];
  timeZone: string;
  location: string;
  languagePreference: string;
  accessibilityNeeds: string[];
  technologyAccess: {
    hasReliableInternet: boolean;
    hasWebcam: boolean;
    hasMicrophone: boolean;
    hasSmartphone: boolean;
    preferredPlatforms: string[];
    technicalSkillLevel: 'beginner' | 'intermediate' | 'advanced';
  };
}

export interface CoordinationResult {
  scheduledInterview: ScheduledInterview;
  matchingResult: MatchingResult;
  formatRecommendation: FormatRecommendation;
  preparationGuide: InterviewPreparationGuide;
  reminderSchedule: ReminderSchedule;
}

export interface InterviewReschedulingRequest {
  interviewId: string;
  reason: string;
  newPreferences: Partial<ApplicantPreferences>;
}

export class InterviewCoordinationService {
  private scheduler: InterviewScheduler;
  private matcher: InterviewerMatcher;
  private formatSelector: InterviewFormatSelector;
  private reminderManager: InterviewReminderManager;

  constructor() {
    this.scheduler = new InterviewScheduler();
    this.matcher = new InterviewerMatcher();
    this.formatSelector = new InterviewFormatSelector();
    this.reminderManager = new InterviewReminderManager();
  }

  /**
   * Coordinate complete interview scheduling process
   */
  async coordinateInterview(request: InterviewCoordinationRequest): Promise<CoordinationResult> {
    try {
      console.log(`Starting interview coordination for application ${request.applicationId}`);

      // Step 1: Determine optimal interview format
      const formatCriteria: FormatSelectionCriteria = {
        interviewType: request.interviewType,
        applicantLocation: request.applicantPreferences.location,
        applicantTimeZone: request.applicantPreferences.timeZone,
        interviewerLocation: 'ScrollUniversity Campus', // Default
        interviewerTimeZone: 'UTC',
        applicantPreferences: request.applicantPreferences.preferredFormats.map(f => f.toString()),
        specialRequirements: request.specialRequirements || [],
        technologyAccess: request.applicantPreferences.technologyAccess,
        accessibilityNeeds: request.applicantPreferences.accessibilityNeeds
      };

      const formatRecommendations = await this.formatSelector.recommendFormat(formatCriteria);
      const selectedFormat = formatRecommendations[0]; // Use top recommendation

      console.log(`Selected interview format: ${selectedFormat.format} (score: ${selectedFormat.score})`);

      // Step 2: Find best interviewer match
      const matchingCriteria: MatchingCriteria = {
        interviewType: request.interviewType,
        applicantBackground: {
          academicLevel: 'undergraduate', // Would be derived from application
          spiritualMaturity: 'developing', // Would be derived from application
          culturalBackground: 'western', // Would be derived from application
          languagePreference: request.applicantPreferences.languagePreference,
          specialNeeds: request.applicantPreferences.accessibilityNeeds
        },
        scheduledDate: request.applicantPreferences.preferredDates[0],
        duration: this.getInterviewDuration(request.interviewType),
        specialRequirements: request.specialRequirements
      };

      const matchingResult = await this.matcher.findBestMatch(matchingCriteria);
      console.log(`Found interviewer match: ${matchingResult.interviewerName} (score: ${matchingResult.matchScore})`);

      // Step 3: Schedule the interview
      const scheduleRequest: InterviewScheduleRequest = {
        applicationId: request.applicationId,
        interviewType: request.interviewType,
        preferredDates: request.applicantPreferences.preferredDates,
        format: selectedFormat.format,
        duration: this.getInterviewDuration(request.interviewType),
        timeZone: request.applicantPreferences.timeZone
      };

      const scheduledInterview = await this.scheduler.scheduleInterview(scheduleRequest);
      console.log(`Interview scheduled: ${scheduledInterview.id} for ${scheduledInterview.scheduledDate}`);

      // Step 4: Generate preparation guide
      const preparationGuide = await this.formatSelector.generatePreparationGuide(
        selectedFormat.format,
        request.interviewType
      );

      // Step 5: Schedule reminders
      const reminderSchedule = await this.reminderManager.scheduleReminders(scheduledInterview.id);
      console.log(`Scheduled ${reminderSchedule.reminders.length} reminders`);

      // Step 6: Send initial notifications
      await this.sendInitialNotifications(scheduledInterview, matchingResult, selectedFormat);

      return {
        scheduledInterview,
        matchingResult,
        formatRecommendation: selectedFormat,
        preparationGuide,
        reminderSchedule
      };
    } catch (error) {
      console.error('Error coordinating interview:', error);
      throw new Error(`Failed to coordinate interview: ${error.message}`);
    }
  }

  /**
   * Reschedule an existing interview
   */
  async rescheduleInterview(request: InterviewReschedulingRequest): Promise<CoordinationResult> {
    try {
      console.log(`Rescheduling interview ${request.interviewId}: ${request.reason}`);

      // Cancel existing reminders
      await this.reminderManager.cancelReminders(request.interviewId);

      // Reschedule the interview
      const rescheduledInterview = await this.scheduler.rescheduleInterview(
        request.interviewId,
        {
          preferredDates: request.newPreferences.preferredDates,
          format: request.newPreferences.preferredFormats?.[0],
          duration: request.newPreferences.preferredTimes ? 60 : undefined,
          timeZone: request.newPreferences.timeZone
        }
      );

      // Get updated matching and format information
      const matchingResult: MatchingResult = {
        interviewerId: rescheduledInterview.interviewerId || '',
        interviewerName: rescheduledInterview.interviewerName || '',
        matchScore: 0.8, // Would recalculate in real implementation
        matchingReasons: ['Rescheduled interview'],
        potentialConcerns: []
      };

      const formatRecommendation: FormatRecommendation = {
        format: rescheduledInterview.format,
        score: 0.8,
        advantages: ['Maintains original format'],
        disadvantages: [],
        requirements: [],
        preparationResources: []
      };

      // Generate new preparation guide
      const preparationGuide = await this.formatSelector.generatePreparationGuide(
        rescheduledInterview.format,
        rescheduledInterview.interviewType
      );

      // Schedule new reminders
      const reminderSchedule = await this.reminderManager.scheduleReminders(rescheduledInterview.id);

      // Send rescheduling notifications
      await this.sendReschedulingNotifications(rescheduledInterview, request.reason);

      console.log(`Interview ${request.interviewId} successfully rescheduled`);

      return {
        scheduledInterview: rescheduledInterview,
        matchingResult,
        formatRecommendation,
        preparationGuide,
        reminderSchedule
      };
    } catch (error) {
      console.error('Error rescheduling interview:', error);
      throw new Error(`Failed to reschedule interview: ${error.message}`);
    }
  }

  /**
   * Cancel an interview
   */
  async cancelInterview(interviewId: string, reason: string): Promise<void> {
    try {
      console.log(`Cancelling interview ${interviewId}: ${reason}`);

      // Cancel the interview
      await this.scheduler.cancelInterview(interviewId, reason);

      // Cancel all reminders
      await this.reminderManager.cancelReminders(interviewId);

      // Send cancellation notifications
      await this.sendCancellationNotifications(interviewId, reason);

      console.log(`Interview ${interviewId} successfully cancelled`);
    } catch (error) {
      console.error('Error cancelling interview:', error);
      throw new Error(`Failed to cancel interview: ${error.message}`);
    }
  }

  /**
   * Process interview confirmation
   */
  async processConfirmation(request: ConfirmationRequest): Promise<void> {
    try {
      await this.reminderManager.processConfirmation(request);
      console.log(`Processed confirmation for interview ${request.interviewId}`);
    } catch (error) {
      console.error('Error processing confirmation:', error);
      throw new Error(`Failed to process confirmation: ${error.message}`);
    }
  }

  /**
   * Get interview schedule for a date range
   */
  async getInterviewSchedule(startDate: Date, endDate: Date): Promise<ScheduledInterview[]> {
    try {
      return await this.scheduler.getInterviewSchedule(startDate, endDate);
    } catch (error) {
      console.error('Error getting interview schedule:', error);
      throw new Error(`Failed to get interview schedule: ${error.message}`);
    }
  }

  /**
   * Find available interview slots
   */
  async findAvailableSlots(
    interviewType: InterviewType,
    preferredDates: Date[],
    duration: number
  ): Promise<any[]> {
    try {
      const availableSlots = [];
      
      for (const date of preferredDates) {
        const slot = await this.scheduler.findAvailableSlot({
          applicationId: 'temp', // Temporary for slot checking
          interviewType,
          preferredDates: [date],
          format: InterviewFormat.VIDEO_CONFERENCE,
          duration,
          timeZone: 'UTC'
        });

        if (slot.available) {
          availableSlots.push(slot);
        }
      }

      return availableSlots;
    } catch (error) {
      console.error('Error finding available slots:', error);
      throw new Error(`Failed to find available slots: ${error.message}`);
    }
  }

  /**
   * Get interviewer recommendations for specific criteria
   */
  async getInterviewerRecommendations(criteria: MatchingCriteria, count: number = 3): Promise<MatchingResult[]> {
    try {
      return await this.matcher.findMultipleMatches(criteria, count);
    } catch (error) {
      console.error('Error getting interviewer recommendations:', error);
      throw new Error(`Failed to get interviewer recommendations: ${error.message}`);
    }
  }

  /**
   * Get format recommendations
   */
  async getFormatRecommendations(criteria: FormatSelectionCriteria): Promise<FormatRecommendation[]> {
    try {
      return await this.formatSelector.recommendFormat(criteria);
    } catch (error) {
      console.error('Error getting format recommendations:', error);
      throw new Error(`Failed to get format recommendations: ${error.message}`);
    }
  }

  /**
   * Send immediate reminder
   */
  async sendImmediateReminder(interviewId: string): Promise<void> {
    try {
      await this.reminderManager.sendReminder(interviewId, 'two_hours_before' as any);
      console.log(`Sent immediate reminder for interview ${interviewId}`);
    } catch (error) {
      console.error('Error sending immediate reminder:', error);
      throw new Error(`Failed to send immediate reminder: ${error.message}`);
    }
  }

  /**
   * Get interview duration based on type
   */
  private getInterviewDuration(interviewType: InterviewType): number {
    const durations = {
      [InterviewType.INITIAL_SCREENING]: 30,
      [InterviewType.ACADEMIC_ASSESSMENT]: 45,
      [InterviewType.SPIRITUAL_EVALUATION]: 60,
      [InterviewType.CHARACTER_INTERVIEW]: 45,
      [InterviewType.FINAL_INTERVIEW]: 60,
      [InterviewType.COMMITTEE_INTERVIEW]: 90
    };

    return durations[interviewType] || 45;
  }

  /**
   * Send initial notifications after scheduling
   */
  private async sendInitialNotifications(
    interview: ScheduledInterview,
    matching: MatchingResult,
    format: FormatRecommendation
  ): Promise<void> {
    console.log(`Sending initial notifications for interview ${interview.id}`);
    
    // Send to applicant
    console.log(`Notifying applicant about scheduled interview`);
    
    // Send to interviewer
    console.log(`Notifying interviewer ${matching.interviewerName} about assignment`);
    
    // Send to admissions team
    console.log(`Notifying admissions team about scheduled interview`);
  }

  /**
   * Send rescheduling notifications
   */
  private async sendReschedulingNotifications(
    interview: ScheduledInterview,
    reason: string
  ): Promise<void> {
    console.log(`Sending rescheduling notifications for interview ${interview.id}`);
    console.log(`Reason: ${reason}`);
  }

  /**
   * Send cancellation notifications
   */
  private async sendCancellationNotifications(
    interviewId: string,
    reason: string
  ): Promise<void> {
    console.log(`Sending cancellation notifications for interview ${interviewId}`);
    console.log(`Reason: ${reason}`);
  }

  /**
   * Get comprehensive interview statistics
   */
  async getInterviewStatistics(startDate: Date, endDate: Date): Promise<any> {
    try {
      const interviews = await this.getInterviewSchedule(startDate, endDate);
      
      const statistics = {
        totalInterviews: interviews.length,
        byType: {} as any,
        byFormat: {} as any,
        byStatus: {} as any,
        averageDuration: 0
      };

      // Calculate statistics
      interviews.forEach(interview => {
        // By type
        statistics.byType[interview.interviewType] = 
          (statistics.byType[interview.interviewType] || 0) + 1;
        
        // By format
        statistics.byFormat[interview.format] = 
          (statistics.byFormat[interview.format] || 0) + 1;
        
        // By status
        statistics.byStatus[interview.status] = 
          (statistics.byStatus[interview.status] || 0) + 1;
        
        // Average duration
        statistics.averageDuration += interview.duration;
      });

      if (interviews.length > 0) {
        statistics.averageDuration = statistics.averageDuration / interviews.length;
      }

      return statistics;
    } catch (error) {
      console.error('Error getting interview statistics:', error);
      throw new Error(`Failed to get interview statistics: ${error.message}`);
    }
  }

  /**
   * Process pending reminders (called by scheduled job)
   */
  async processPendingReminders(): Promise<void> {
    try {
      await this.reminderManager.processPendingReminders();
      console.log('Processed all pending reminders');
    } catch (error) {
      console.error('Error processing pending reminders:', error);
      throw new Error(`Failed to process pending reminders: ${error.message}`);
    }
  }

  /**
   * Validate interview coordination request
   */
  private validateCoordinationRequest(request: InterviewCoordinationRequest): void {
    if (!request.applicationId) {
      throw new Error('Application ID is required');
    }

    if (!request.interviewType) {
      throw new Error('Interview type is required');
    }

    if (!request.applicantPreferences.preferredDates || request.applicantPreferences.preferredDates.length === 0) {
      throw new Error('At least one preferred date is required');
    }

    if (!request.applicantPreferences.timeZone) {
      throw new Error('Time zone is required');
    }

    if (!request.applicantPreferences.location) {
      throw new Error('Location is required');
    }
  }

  /**
   * Health check for interview coordination system
   */
  async healthCheck(): Promise<{ status: string; components: any }> {
    const components = {
      scheduler: 'healthy',
      matcher: 'healthy',
      formatSelector: 'healthy',
      reminderManager: 'healthy'
    };

    try {
      // Test each component
      await this.scheduler.getInterviewSchedule(new Date(), new Date());
      // Additional health checks would go here

      return {
        status: 'healthy',
        components
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        components: {
          ...components,
          error: error.message
        }
      };
    }
  }
}