/**
 * Course Recommendation Engine Service
 * "I will instruct you and teach you in the way you should go" - Psalm 32:8
 * 
 * Comprehensive course recommendation system for degree planning, scheduling,
 * and career alignment
 */

import { PrismaClient } from '@prisma/client';
import { AIGatewayService } from './AIGatewayService';
import DegreePlanGenerationService from './DegreePlanGenerationService';
import CourseRecommendationEngineService from './CourseRecommendationEngineService';
import ScheduleOptimizationService from './ScheduleOptimizationService';
import TransferCreditMappingService from './TransferCreditMappingService';
import CareerAlignmentAnalysisService from './CareerAlignmentAnalysisService';
import { logger } from '../utils/logger';
import {
  CourseRecommendationRequest,
  CourseRecommendationResponse,
  DegreePlan,
  ScheduleOptimization,
  TransferCreditMapping,
  CareerAlignmentAnalysis
} from '../types/course-recommendation.types';

const prisma = new PrismaClient();

export default class CourseRecommendationService {
  private aiGateway: AIGatewayService;
  private degreePlanService: DegreePlanGenerationService;
  private courseRecommendationEngine: CourseRecommendationEngineService;
  private scheduleOptimizer: ScheduleOptimizationService;
  private transferCreditMapper: TransferCreditMappingService;
  private careerAlignmentAnalyzer: CareerAlignmentAnalysisService;

  constructor() {
    this.aiGateway = new AIGatewayService();
    this.degreePlanService = new DegreePlanGenerationService();
    this.courseRecommendationEngine = new CourseRecommendationEngineService();
    this.scheduleOptimizer = new ScheduleOptimizationService();
    this.transferCreditMapper = new TransferCreditMappingService();
    this.careerAlignmentAnalyzer = new CareerAlignmentAnalysisService();
  }

  /**
   * Generate comprehensive course recommendations
   */
  async recommendCourses(
    request: CourseRecommendationRequest
  ): Promise<CourseRecommendationResponse> {
    try {
      logger.info('Generating course recommendations', {
        studentId: request.studentId,
        major: request.major
      });

      // Generate degree plan
      const degreePlan = await this.generateDegreePlan(
        request.studentId,
        request.major,
        request.careerGoal
      );


      // Get current semester recommendations
      const currentSemesterCourses = await this.recommendCoursesForSemester(
        request.studentId,
        degreePlan,
        request.currentSemester || 1
      );

      // Optimize schedule
      const scheduleOptimization = await this.optimizeSchedule(
        request.studentId,
        currentSemesterCourses
      );

      // Analyze career alignment
      const careerAlignment = request.careerGoal
        ? await this.analyzeCareerAlignment(
            request.studentId,
            request.careerGoal,
            degreePlan
          )
        : undefined;

      logger.info('Course recommendations generated', {
        studentId: request.studentId,
        totalCourses: degreePlan.courses.length
      });

      return {
        success: true,
        degreePlan,
        currentSemesterRecommendations: currentSemesterCourses,
        scheduleOptimization,
        careerAlignment
      };
    } catch (error) {
      logger.error('Error generating course recommendations', { error, request });
      throw error;
    }
  }

  /**
   * Generate 4-year degree plan
   */
  async generateDegreePlan(
    studentId: string,
    major: string,
    careerGoal?: string
  ): Promise<DegreePlan> {
    return await this.degreePlanService.generateDegreePlan(
      studentId,
      major,
      careerGoal
    );
  }

  /**
   * Recommend courses for specific semester
   */
  async recommendCoursesForSemester(
    studentId: string,
    degreePlan: DegreePlan,
    semester: number
  ): Promise<any[]> {
    return await this.courseRecommendationEngine.recommendCoursesForSemester(
      studentId,
      semester,
      4 // max courses per semester
    );
  }

  /**
   * Optimize course schedule
   */
  async optimizeSchedule(
    studentId: string,
    courses: any[]
  ): Promise<ScheduleOptimization> {
    return await this.scheduleOptimizer.optimizeSchedule(
      studentId,
      courses
    );
  }

  /**
   * Analyze career alignment
   */
  async analyzeCareerAlignment(
    studentId: string,
    careerGoal: string,
    degreePlan: DegreePlan
  ): Promise<CareerAlignmentAnalysis> {
    return await this.careerAlignmentAnalyzer.analyzeCareerAlignment(
      studentId,
      careerGoal,
      degreePlan
    );
  }

  /**
   * Map transfer credits
   */
  async mapTransferCredits(
    studentId: string,
    transcripts: any[],
    targetMajor: string
  ): Promise<TransferCreditMapping> {
    return await this.transferCreditMapper.mapTransferCredits(
      studentId,
      transcripts,
      targetMajor
    );
  }
}
