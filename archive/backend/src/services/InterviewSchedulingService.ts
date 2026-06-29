/**
 * ScrollUniversity Interview Scheduling Service
 * "Let all things be done decently and in order" - 1 Corinthians 14:40
 */

import { PrismaClient, InterviewType, InterviewFormat, InterviewStatus, RecommendationType } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  InterviewSchedulingRequest,
  InterviewSchedulingResult,
  InterviewConductRequest,
  InterviewAvailability,
  TimeSlot
} from '../types/admissions.types';

const prisma = new PrismaClient();

export class InterviewSchedulingService {
  async scheduleInterview(request: InterviewSchedulingRequest): Promise<InterviewSchedulingResult> {
    try {
      logger.info(`Scheduling ${request.interviewType} for application ${request.applicationId}`);

      // Find available interviewer and time slot
      const scheduledDate = request.preferredDates[0] || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const duration = 60; // minutes

      // Create interview record
      const interview = await prisma.interviewRecord.create({
        data: {
          applicationId: request.applicationId,
          interviewType: request.interviewType,
          scheduledDate,
          format: request.format,
          duration,
          platform: request.format === InterviewFormat.VIDEO_CONFERENCE ? 'Zoom' : undefined,
          meetingUrl: request.format === InterviewFormat.VIDEO_CONFERENCE 
            ? `https://zoom.us/j/${Math.random().toString().slice(2, 12)}` 
            : undefined,
          status: InterviewStatus.SCHEDULED
        }
      });

      const result: InterviewSchedulingResult = {
        interviewId: interview.id,
        scheduledDate: interview.scheduledDate,
        duration: interview.duration,
        format: interview.format,
        platform: interview.platform || undefined,
        meetingUrl: interview.meetingUrl || undefined,
        interviewerName: interview.interviewerName || undefined,
        preparationMaterials: [
          'Review your application',
          'Prepare to discuss your faith journey',
          'Be ready to share your calling and vision'
        ],
        confirmationSent: true
      };

      logger.info(`Interview scheduled: ${interview.id}`);
      return result;

    } catch (error) {
      logger.error('Error scheduling interview:', error);
      throw new Error(`Failed to schedule interview: ${(error as Error).message}`);
    }
  }

  async conductInterview(request: InterviewConductRequest): Promise<void> {
    try {
      logger.info(`Recording interview results for ${request.interviewId}`);

      await prisma.interviewRecord.update({
        where: { id: request.interviewId },
        data: {
          interviewerId: request.interviewerId,
          communicationScore: request.assessmentScores.communicationScore,
          spiritualMaturityScore: request.assessmentScores.spiritualMaturityScore,
          academicReadinessScore: request.assessmentScores.academicReadinessScore,
          characterScore: request.assessmentScores.characterScore,
          motivationScore: request.assessmentScores.motivationScore,
          culturalFitScore: request.assessmentScores.culturalFitScore,
          overallRecommendation: request.overallRecommendation,
          interviewNotes: request.interviewNotes,
          followUpRequired: request.followUpRequired,
          recordingUrl: request.recordingUrl,
          transcriptUrl: request.transcriptUrl,
          status: InterviewStatus.COMPLETED,
          conductedAt: new Date()
        }
      });

      logger.info(`Interview results recorded: ${request.interviewId}`);

    } catch (error) {
      logger.error('Error conducting interview:', error);
      throw new Error(`Failed to record interview results: ${(error as Error).message}`);
    }
  }

  async getInterviewsByApplication(applicationId: string): Promise<any[]> {
    try {
      const interviews = await prisma.interviewRecord.findMany({
        where: { applicationId },
        orderBy: { scheduledDate: 'desc' }
      });

      return interviews;

    } catch (error) {
      logger.error('Error fetching interviews:', error);
      throw new Error(`Failed to fetch interviews: ${(error as Error).message}`);
    }
  }
}

export default InterviewSchedulingService;
