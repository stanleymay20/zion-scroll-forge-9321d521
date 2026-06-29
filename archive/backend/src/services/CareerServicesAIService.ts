/**
 * Career Services AI Service
 * Main orchestration service for AI-powered career services
 */

import {
  StudentProfile,
  CareerMatchingRequest,
  CareerMatchingResponse,
  ResumeReviewRequest,
  ResumeReviewResponse,
  MockInterviewRequest,
  MockInterviewResponse,
  EmployerMatchingRequest,
  EmployerMatchingResponse,
  CareerAnalyticsRequest,
  CareerAnalyticsResponse,
} from '../types/career-services.types';
import { CareerMatchingService } from './CareerMatchingService';
import { ResumeReviewService } from './ResumeReviewService';
import { MockInterviewService } from './MockInterviewService';
import { EmployerMatchingService } from './EmployerMatchingService';
import { CareerAnalyticsService } from './CareerAnalyticsService';
import logger from '../utils/logger';

/**
 * CareerServicesAIService
 * Orchestrates all career services AI functionality
 */
export default class CareerServicesAIService {
  private careerMatchingService: CareerMatchingService;
  private resumeReviewService: ResumeReviewService;
  private mockInterviewService: MockInterviewService;
  private employerMatchingService: EmployerMatchingService;
  private careerAnalyticsService: CareerAnalyticsService;

  constructor() {
    this.careerMatchingService = new CareerMatchingService();
    this.resumeReviewService = new ResumeReviewService();
    this.mockInterviewService = new MockInterviewService();
    this.employerMatchingService = new EmployerMatchingService();
    this.careerAnalyticsService = new CareerAnalyticsService();
  }

  /**
   * Match student to career paths
   */
  async matchCareers(request: CareerMatchingRequest): Promise<CareerMatchingResponse> {
    try {
      logger.info('Matching careers for student', { studentId: request.studentId });

      const matches = await this.careerMatchingService.matchCareers(
        request.profile,
        request.preferences
      );

      const response: CareerMatchingResponse = {
        matches,
        timestamp: new Date(),
        confidence: this.calculateAverageConfidence(matches.map(m => m.matchScore)),
      };

      logger.info('Career matching completed', {
        studentId: request.studentId,
        matchCount: matches.length,
      });

      return response;
    } catch (error) {
      logger.error('Error matching careers', { error, studentId: request.studentId });
      throw error;
    }
  }

  /**
   * Review and provide feedback on resume
   */
  async reviewResume(request: ResumeReviewRequest): Promise<ResumeReviewResponse> {
    try {
      logger.info('Reviewing resume', { studentId: request.resume.studentId });

      const feedback = await this.resumeReviewService.reviewResume(
        request.resume,
        request.targetRole,
        request.targetIndustry
      );

      const response: ResumeReviewResponse = {
        feedback,
        timestamp: new Date(),
        confidence: feedback.overallScore / 100,
      };

      logger.info('Resume review completed', {
        studentId: request.resume.studentId,
        overallScore: feedback.overallScore,
      });

      return response;
    } catch (error) {
      logger.error('Error reviewing resume', { error, studentId: request.resume.studentId });
      throw error;
    }
  }

  /**
   * Conduct mock interview
   */
  async conductMockInterview(request: MockInterviewRequest): Promise<MockInterviewResponse> {
    try {
      logger.info('Starting mock interview', { studentId: request.studentId });

      const session = await this.mockInterviewService.createSession(
        request.studentId,
        request.role,
        request.questionCount,
        request.difficulty
      );

      const response: MockInterviewResponse = {
        session,
        timestamp: new Date(),
      };

      logger.info('Mock interview session created', {
        studentId: request.studentId,
        sessionId: session.sessionId,
      });

      return response;
    } catch (error) {
      logger.error('Error conducting mock interview', { error, studentId: request.studentId });
      throw error;
    }
  }

  /**
   * Match student to employers
   */
  async matchEmployers(request: EmployerMatchingRequest): Promise<EmployerMatchingResponse> {
    try {
      logger.info('Matching employers for student', { studentId: request.studentId });

      const matches = await this.employerMatchingService.matchEmployers(
        request.profile,
        request.preferences
      );

      const response: EmployerMatchingResponse = {
        matches,
        timestamp: new Date(),
        confidence: this.calculateAverageConfidence(matches.map(m => m.matchScore)),
      };

      logger.info('Employer matching completed', {
        studentId: request.studentId,
        matchCount: matches.length,
      });

      return response;
    } catch (error) {
      logger.error('Error matching employers', { error, studentId: request.studentId });
      throw error;
    }
  }

  /**
   * Get career analytics
   */
  async getCareerAnalytics(request: CareerAnalyticsRequest): Promise<CareerAnalyticsResponse> {
    try {
      logger.info('Generating career analytics', { timeframe: request.timeframe });

      const analytics = await this.careerAnalyticsService.generateAnalytics(
        request.timeframe,
        request.major,
        request.industry
      );

      const response: CareerAnalyticsResponse = {
        analytics,
        timestamp: new Date(),
      };

      logger.info('Career analytics generated', {
        timeframe: request.timeframe,
        outcomeCount: analytics.employmentOutcomes.length,
      });

      return response;
    } catch (error) {
      logger.error('Error generating career analytics', { error });
      throw error;
    }
  }

  /**
   * Calculate average confidence from scores
   */
  private calculateAverageConfidence(scores: number[]): number {
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, score) => acc + score, 0);
    return sum / scores.length / 100;
  }
}
