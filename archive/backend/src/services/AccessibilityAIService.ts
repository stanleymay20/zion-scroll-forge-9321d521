/**
 * Accessibility AI Service
 * WCAG 2.1 AA Compliance and Accommodation Management
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import {
  AltTextRequest,
  AltTextResult,
  CaptionRequest,
  CaptionResult,
  ComplianceCheckRequest,
  ComplianceReport,
  AccommodationRequest,
  AccommodationRecommendation,
  AccessibilityAuditLog
} from '../types/accessibility.types';
import { AltTextGenerationService } from './AltTextGenerationService';
import { CaptionGenerationService } from './CaptionGenerationService';
import { ComplianceCheckingService } from './ComplianceCheckingService';
import { AutomatedFixService } from './AutomatedFixService';
import { AccommodationService } from './AccommodationService';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class AccessibilityAIService {
  private altTextService: AltTextGenerationService;
  private captionService: CaptionGenerationService;
  private complianceService: ComplianceCheckingService;
  private fixService: AutomatedFixService;
  private accommodationService: AccommodationService;

  constructor() {
    this.altTextService = new AltTextGenerationService();
    this.captionService = new CaptionGenerationService();
    this.complianceService = new ComplianceCheckingService();
    this.fixService = new AutomatedFixService();
    this.accommodationService = new AccommodationService();
  }

  /**
   * Generate alt text for images using GPT-4 Vision
   * Requirement 15.1
   */
  async generateAltText(request: AltTextRequest): Promise<AltTextResult> {
    try {
      logger.info('Generating alt text', { imageUrl: request.imageUrl });

      const result = await this.altTextService.generateAltText(request);

      // Log for audit trail
      await this.logAccessibilityAction({
        action: 'alt_text_generated',
        contentId: request.imageUrl,
        result,
        cost: 0.02 // Approximate cost for GPT-4 Vision
      });

      return result;
    } catch (error) {
      logger.error('Error generating alt text', { error, request });
      throw new Error(`Failed to generate alt text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate captions for videos using Whisper API
   * Requirement 15.2
   */
  async generateCaptions(request: CaptionRequest): Promise<CaptionResult> {
    try {
      logger.info('Generating captions', { 
        videoUrl: request.videoUrl,
        audioUrl: request.audioUrl 
      });

      const result = await this.captionService.generateCaptions(request);

      // Log for audit trail
      await this.logAccessibilityAction({
        action: 'captions_generated',
        contentId: request.videoUrl || request.audioUrl || 'audio-buffer',
        result,
        cost: 0.006 // Whisper API cost per minute (approximate)
      });

      return result;
    } catch (error) {
      logger.error('Error generating captions', { error, request });
      throw new Error(`Failed to generate captions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check content for WCAG compliance
   * Requirement 15.3
   */
  async checkCompliance(request: ComplianceCheckRequest): Promise<ComplianceReport> {
    try {
      logger.info('Checking WCAG compliance', { 
        contentType: request.contentType,
        wcagLevel: request.wcagLevel 
      });

      const report = await this.complianceService.checkCompliance(request);

      // Log for audit trail
      await this.logAccessibilityAction({
        action: 'compliance_check',
        contentId: request.contentUrl || 'html-content',
        result: report,
        cost: 0.01
      });

      return report;
    } catch (error) {
      logger.error('Error checking compliance', { error, request });
      throw new Error(`Failed to check compliance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Apply automated accessibility fixes
   * Requirement 15.4
   */
  async applyAutomatedFixes(
    contentId: string,
    htmlContent: string,
    violations: ComplianceReport
  ): Promise<{ fixedContent: string; appliedFixes: number }> {
    try {
      logger.info('Applying automated fixes', { 
        contentId,
        violationCount: violations.violations.length 
      });

      const result = await this.fixService.applyFixes(htmlContent, violations);

      // Log for audit trail
      await this.logAccessibilityAction({
        action: 'automated_fix',
        contentId,
        result,
        cost: 0.005
      });

      return result;
    } catch (error) {
      logger.error('Error applying automated fixes', { error, contentId });
      throw new Error(`Failed to apply automated fixes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Recommend accommodations for students with disabilities
   * Requirement 15.5
   */
  async recommendAccommodations(
    request: AccommodationRequest
  ): Promise<AccommodationRecommendation> {
    try {
      logger.info('Recommending accommodations', { 
        studentId: request.studentId,
        disability: request.disability 
      });

      const recommendation = await this.accommodationService.recommendAccommodations(request);

      // Log for audit trail
      await this.logAccessibilityAction({
        action: 'accommodation_recommended',
        contentId: `${request.studentId}-${request.courseId}`,
        result: recommendation,
        cost: 0.01
      });

      return recommendation;
    } catch (error) {
      logger.error('Error recommending accommodations', { error, request });
      throw new Error(`Failed to recommend accommodations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get accessibility metrics and usage statistics
   */
  async getAccessibilityMetrics(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<{
    altTextGenerated: number;
    captionsGenerated: number;
    complianceChecks: number;
    fixesApplied: number;
    accommodationsProvided: number;
    totalCost: number;
    averageComplianceScore: number;
  }> {
    try {
      const startDate = new Date();
      if (timeframe === 'day') {
        startDate.setDate(startDate.getDate() - 1);
      } else if (timeframe === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setMonth(startDate.getMonth() - 1);
      }

      // This would query actual audit logs from database
      // For now, return placeholder metrics
      return {
        altTextGenerated: 0,
        captionsGenerated: 0,
        complianceChecks: 0,
        fixesApplied: 0,
        accommodationsProvided: 0,
        totalCost: 0,
        averageComplianceScore: 0
      };
    } catch (error) {
      logger.error('Error getting accessibility metrics', { error });
      throw new Error(`Failed to get metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Log accessibility action for audit trail
   */
  private async logAccessibilityAction(log: Omit<AccessibilityAuditLog, 'id' | 'timestamp' | 'userId'>): Promise<void> {
    try {
      // In production, this would save to database
      logger.info('Accessibility action logged', log);
    } catch (error) {
      logger.error('Error logging accessibility action', { error, log });
    }
  }
}

export default AccessibilityAIService;
