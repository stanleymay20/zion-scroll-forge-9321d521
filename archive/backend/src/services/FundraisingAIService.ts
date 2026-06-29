/**
 * Fundraising AI Service
 * Main orchestration service for AI-powered donor intelligence and fundraising
 */

import {
  Donor,
  DonorAnalysisRequest,
  DonorAnalysisResponse,
  AppealRequest,
  AppealGenerationResponse,
  EngagementPlanResponse,
  ProspectListResponse,
  ImpactReportResponse,
  ProspectSource,
  ReportPeriod
} from '../types/fundraising.types';
import { DonorAnalysisService } from './DonorAnalysisService';
import { AppealGenerationService } from './AppealGenerationService';
import { RelationshipManagementService } from './RelationshipManagementService';
import { ProspectIdentificationService } from './ProspectIdentificationService';
import { ImpactReportingService } from './ImpactReportingService';
import logger from '../utils/logger';

export class FundraisingAIService {
  private donorAnalysisService: DonorAnalysisService;
  private appealGenerationService: AppealGenerationService;
  private relationshipManagementService: RelationshipManagementService;
  private prospectIdentificationService: ProspectIdentificationService;
  private impactReportingService: ImpactReportingService;

  constructor() {
    this.donorAnalysisService = new DonorAnalysisService();
    this.appealGenerationService = new AppealGenerationService();
    this.relationshipManagementService = new RelationshipManagementService();
    this.prospectIdentificationService = new ProspectIdentificationService();
    this.impactReportingService = new ImpactReportingService();
  }

  /**
   * Analyze donor and generate intelligence
   */
  async analyzeDonor(request: DonorAnalysisRequest): Promise<DonorAnalysisResponse> {
    try {
      logger.info('Analyzing donor', { donorId: request.donorId });

      const response = await this.donorAnalysisService.analyzeDonor(request);

      logger.info('Donor analysis completed', {
        donorId: request.donorId,
        confidence: response.confidence
      });

      return response;
    } catch (error) {
      logger.error('Error analyzing donor', { error, request });
      throw error;
    }
  }

  /**
   * Generate personalized donation appeal
   */
  async generateAppeal(request: AppealRequest): Promise<AppealGenerationResponse> {
    try {
      logger.info('Generating donation appeal', { donorId: request.donorId });

      // Get donor intelligence first
      const intelligence = await this.donorAnalysisService.analyzeDonor({
        donorId: request.donorId,
        includeHistory: true,
        includePredictions: true
      });

      // Generate personalized appeal
      const response = await this.appealGenerationService.generateAppeal(
        request,
        intelligence.intelligence
      );

      logger.info('Appeal generated', {
        donorId: request.donorId,
        confidence: response.confidence
      });

      return response;
    } catch (error) {
      logger.error('Error generating appeal', { error, request });
      throw error;
    }
  }

  /**
   * Create engagement plan for donor relationship management
   */
  async createEngagementPlan(donorId: string): Promise<EngagementPlanResponse> {
    try {
      logger.info('Creating engagement plan', { donorId });

      // Get donor intelligence
      const intelligence = await this.donorAnalysisService.analyzeDonor({
        donorId,
        includeHistory: true,
        includePredictions: true
      });

      // Generate engagement plan
      const response = await this.relationshipManagementService.createEngagementPlan(
        donorId,
        intelligence.intelligence
      );

      logger.info('Engagement plan created', {
        donorId,
        confidence: response.confidence
      });

      return response;
    } catch (error) {
      logger.error('Error creating engagement plan', { error, donorId });
      throw error;
    }
  }

  /**
   * Identify and prioritize donor prospects
   */
  async identifyProspects(
    source?: ProspectSource,
    minCapacity?: number
  ): Promise<ProspectListResponse> {
    try {
      logger.info('Identifying donor prospects', { source, minCapacity });

      const response = await this.prospectIdentificationService.identifyProspects(
        source,
        minCapacity
      );

      logger.info('Prospects identified', {
        count: response.totalCount,
        highPriority: response.highPriorityCount
      });

      return response;
    } catch (error) {
      logger.error('Error identifying prospects', { error, source, minCapacity });
      throw error;
    }
  }

  /**
   * Generate personalized impact report for donor
   */
  async generateImpactReport(
    donorId: string,
    period: ReportPeriod
  ): Promise<ImpactReportResponse> {
    try {
      logger.info('Generating impact report', { donorId, period });

      const response = await this.impactReportingService.generateImpactReport(
        donorId,
        period
      );

      logger.info('Impact report generated', {
        donorId,
        confidence: response.confidence
      });

      return response;
    } catch (error) {
      logger.error('Error generating impact report', { error, donorId, period });
      throw error;
    }
  }

  /**
   * Get comprehensive donor profile with all intelligence
   */
  async getDonorProfile(donorId: string): Promise<{
    donor: Donor;
    intelligence: DonorAnalysisResponse;
    engagementPlan: EngagementPlanResponse;
  }> {
    try {
      logger.info('Getting comprehensive donor profile', { donorId });

      // Get donor data (would come from database in real implementation)
      const donor = await this.getDonorById(donorId);

      // Get intelligence
      const intelligence = await this.analyzeDonor({
        donorId,
        includeHistory: true,
        includePredictions: true
      });

      // Get engagement plan
      const engagementPlan = await this.createEngagementPlan(donorId);

      return {
        donor,
        intelligence,
        engagementPlan
      };
    } catch (error) {
      logger.error('Error getting donor profile', { error, donorId });
      throw error;
    }
  }

  /**
   * Helper method to get donor by ID (placeholder for database integration)
   */
  private async getDonorById(donorId: string): Promise<Donor> {
    // In real implementation, this would query the database
    // For now, return a mock donor
    return {
      id: donorId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      donorType: 'individual' as any,
      status: 'active' as any,
      totalLifetimeGiving: 0,
      givingHistory: [],
      interests: [],
      engagementLevel: 'medium' as any,
      preferredContactMethod: 'email' as any,
      communicationPreferences: {
        emailOptIn: true,
        phoneOptIn: false,
        mailOptIn: true,
        frequency: 'monthly',
        topics: []
      },
      relationships: [],
      notes: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Batch process multiple donors for campaign
   */
  async processCampaignDonors(
    donorIds: string[],
    campaignId: string
  ): Promise<{
    appeals: AppealGenerationResponse[];
    totalEstimatedRaise: number;
  }> {
    try {
      logger.info('Processing campaign donors', {
        donorCount: donorIds.length,
        campaignId
      });

      const appeals: AppealGenerationResponse[] = [];
      let totalEstimatedRaise = 0;

      for (const donorId of donorIds) {
        const appeal = await this.generateAppeal({
          donorId,
          campaignId,
          urgency: 'medium',
          tone: 'personal',
          includeImpactStory: true,
          includeTestimonial: true
        });

        appeals.push(appeal);
        totalEstimatedRaise += appeal.appeal.suggestedAmount;
      }

      logger.info('Campaign donors processed', {
        donorCount: donorIds.length,
        totalEstimatedRaise
      });

      return {
        appeals,
        totalEstimatedRaise
      };
    } catch (error) {
      logger.error('Error processing campaign donors', { error, campaignId });
      throw error;
    }
  }
}

export default FundraisingAIService;
