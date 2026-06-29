/**
 * Personalization Service
 * "For I know the plans I have for you" - Jeremiah 29:11
 * 
 * Main service coordinating all personalized learning features
 */

import LearningAnalyticsService from './LearningAnalyticsService';
import RecommendationEngineService from './RecommendationEngineService';
import InterventionService from './InterventionService';
import PathOptimizationService from './PathOptimizationService';
import RiskPredictionService from './RiskPredictionService';
import {
  AnalyzePerformanceRequest,
  AnalyzePerformanceResponse,
  RecommendResourcesRequest,
  RecommendResourcesResponse,
  OptimizePathRequest,
  OptimizePathResponse,
  PredictRiskRequest,
  PredictRiskResponse,
  InterventionTrigger
} from '../types/personalization.types';
import { logger } from '../utils/logger';

export default class PersonalizationService {
  private analytics: LearningAnalyticsService;
  private recommendations: RecommendationEngineService;
  private interventions: InterventionService;
  private pathOptimization: PathOptimizationService;
  private riskPrediction: RiskPredictionService;

  constructor() {
    this.analytics = new LearningAnalyticsService();
    this.recommendations = new RecommendationEngineService();
    this.interventions = new InterventionService();
    this.pathOptimization = new PathOptimizationService();
    this.riskPrediction = new RiskPredictionService();
  }

  /**
   * Comprehensive student analysis
   * Analyzes performance, predicts risk, and generates personalized recommendations
   */
  async analyzeStudent(studentId: string, courseId?: string): Promise<{
    performance: AnalyzePerformanceResponse;
    risk: PredictRiskResponse;
    recommendations: RecommendResourcesResponse;
    interventions: InterventionTrigger[];
  }> {
    try {
      logger.info('Performing comprehensive student analysis', { studentId, courseId });

      // Analyze performance
      const performance = await this.analytics.analyzePerformance({
        studentId,
        courseId,
        includeSpiritual: true
      });

      // Predict risk
      const risk = await this.riskPrediction.predictRisk({
        studentId,
        includeInterventions: true
      });

      // Generate recommendations based on weaknesses
      let recommendations: RecommendResourcesResponse = {
        success: true,
        recommendations: [],
        reasoning: ''
      };

      if (performance.success && performance.profile.weaknesses.length > 0) {
        recommendations = await this.recommendations.recommendResources({
          studentId,
          topic: performance.profile.weaknesses[0],
          weaknessArea: performance.profile.weaknesses[0],
          maxRecommendations: 5
        });
      }

      // Trigger interventions if needed
      const interventions = await this.interventions.detectAndIntervene(studentId, courseId);

      logger.info('Comprehensive analysis completed', {
        studentId,
        riskLevel: risk.riskAssessment.overallRiskLevel,
        interventionsTriggered: interventions.length
      });

      return {
        performance,
        risk,
        recommendations,
        interventions
      };
    } catch (error) {
      logger.error('Error in comprehensive student analysis', { error, studentId });
      throw error;
    }
  }

  /**
   * Analyze performance
   */
  async analyzePerformance(request: AnalyzePerformanceRequest): Promise<AnalyzePerformanceResponse> {
    return await this.analytics.analyzePerformance(request);
  }

  /**
   * Recommend resources
   */
  async recommendResources(request: RecommendResourcesRequest): Promise<RecommendResourcesResponse> {
    return await this.recommendations.recommendResources(request);
  }

  /**
   * Suggest practice problems
   */
  async suggestPracticeProblems(
    studentId: string,
    weaknessArea: string,
    count: number = 5
  ): Promise<any[]> {
    return await this.recommendations.suggestPracticeProblems(studentId, weaknessArea, count);
  }

  /**
   * Recommend study strategies
   */
  async recommendStudyStrategies(
    studentId: string,
    weaknessArea?: string
  ): Promise<string[]> {
    return await this.recommendations.recommendStudyStrategies(studentId, weaknessArea);
  }

  /**
   * Detect and intervene
   */
  async detectAndIntervene(studentId: string, courseId?: string): Promise<InterventionTrigger[]> {
    return await this.interventions.detectAndIntervene(studentId, courseId);
  }

  /**
   * Schedule tutoring
   */
  async scheduleTutoring(
    studentId: string,
    topic: string,
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<any> {
    return await this.interventions.scheduleTutoring(studentId, topic, urgency);
  }

  /**
   * Optimize learning path
   */
  async optimizePath(request: OptimizePathRequest): Promise<OptimizePathResponse> {
    return await this.pathOptimization.optimizePath(request);
  }

  /**
   * Adjust pacing
   */
  async adjustPacing(studentId: string, currentPathId: string): Promise<any> {
    return await this.pathOptimization.adjustPacing(studentId, currentPathId);
  }

  /**
   * Balance course load
   */
  async balanceCourseLoad(
    studentId: string,
    semesterCourses: string[]
  ): Promise<{ balanced: boolean; recommendations: string[] }> {
    return await this.pathOptimization.balanceCourseLoad(studentId, semesterCourses);
  }

  /**
   * Align with career goals
   */
  async alignWithCareerGoals(studentId: string, careerGoal: string): Promise<any[]> {
    return await this.pathOptimization.alignWithCareerGoals(studentId, careerGoal);
  }

  /**
   * Predict risk
   */
  async predictRisk(request: PredictRiskRequest): Promise<PredictRiskResponse> {
    return await this.riskPrediction.predictRisk(request);
  }

  /**
   * Track intervention effectiveness
   */
  async trackInterventionEffectiveness(
    studentId: string,
    interventionId: string
  ): Promise<any> {
    return await this.riskPrediction.trackInterventionEffectiveness(studentId, interventionId);
  }

  /**
   * Get personalized dashboard data
   */
  async getPersonalizedDashboard(studentId: string): Promise<{
    profile: any;
    riskLevel: string;
    recommendations: any[];
    upcomingMilestones: any[];
    recentInterventions: any[];
  }> {
    try {
      // Get performance profile
      const performance = await this.analytics.analyzePerformance({
        studentId,
        includeSpiritual: true
      });

      // Get risk assessment
      const risk = await this.riskPrediction.predictRisk({
        studentId,
        includeInterventions: false
      });

      // Get top recommendations
      const recommendations = performance.success && performance.profile.weaknesses.length > 0
        ? await this.recommendations.recommendResources({
            studentId,
            topic: performance.profile.weaknesses[0],
            maxRecommendations: 3
          })
        : { success: true, recommendations: [], reasoning: '' };

      // Get learning path (if exists)
      const path = await this.pathOptimization.optimizePath({
        studentId,
        goals: {
          goalType: 'degree',
          targetSkills: []
        }
      });

      const upcomingMilestones = path.success 
        ? path.learningPath.milestones.filter(m => !m.completed).slice(0, 3)
        : [];

      return {
        profile: performance.profile,
        riskLevel: risk.riskAssessment.overallRiskLevel,
        recommendations: recommendations.recommendations,
        upcomingMilestones,
        recentInterventions: []
      };
    } catch (error) {
      logger.error('Error generating personalized dashboard', { error, studentId });
      throw error;
    }
  }
}
