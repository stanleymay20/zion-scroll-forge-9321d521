/**
 * Fundraising AI Service Tests
 * Tests for AI-powered donor intelligence and fundraising
 */

import { FundraisingAIService } from '../FundraisingAIService';
import {
  DonorAnalysisRequest,
  AppealRequest,
  ProspectSource,
  ReportPeriod
} from '../../types/fundraising.types';

describe('FundraisingAIService', () => {
  let service: FundraisingAIService;

  beforeEach(() => {
    service = new FundraisingAIService();
  });

  describe('analyzeDonor', () => {
    it('should analyze donor and return intelligence', async () => {
      const request: DonorAnalysisRequest = {
        donorId: 'donor-123',
        includeHistory: true,
        includePredictions: true
      };

      const result = await service.analyzeDonor(request);

      expect(result).toBeDefined();
      expect(result.intelligence).toBeDefined();
      expect(result.intelligence.donorId).toBe('donor-123');
      expect(result.intelligence.engagementScore).toBeGreaterThanOrEqual(0);
      expect(result.intelligence.engagementScore).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should calculate giving capacity', async () => {
      const request: DonorAnalysisRequest = {
        donorId: 'donor-123'
      };

      const result = await service.analyzeDonor(request);

      expect(result.intelligence.givingCapacity).toBeDefined();
      expect(result.intelligence.givingCapacity.min).toBeGreaterThan(0);
      expect(result.intelligence.givingCapacity.max).toBeGreaterThan(
        result.intelligence.givingCapacity.min
      );
      expect(result.intelligence.capacityConfidence).toBeGreaterThan(0);
      expect(result.intelligence.capacityConfidence).toBeLessThanOrEqual(1);
    });

    it('should identify donor interests', async () => {
      const request: DonorAnalysisRequest = {
        donorId: 'donor-123',
        includeHistory: true
      };

      const result = await service.analyzeDonor(request);

      expect(result.intelligence.interests).toBeInstanceOf(Array);
      expect(result.intelligence.interests.length).toBeGreaterThan(0);
      
      if (result.intelligence.interests.length > 0) {
        const interest = result.intelligence.interests[0];
        expect(interest.category).toBeDefined();
        expect(interest.strength).toBeGreaterThan(0);
        expect(interest.strength).toBeLessThanOrEqual(1);
      }
    });

    it('should generate next steps', async () => {
      const request: DonorAnalysisRequest = {
        donorId: 'donor-123'
      };

      const result = await service.analyzeDonor(request);

      expect(result.intelligence.nextSteps).toBeInstanceOf(Array);
      expect(result.intelligence.nextSteps.length).toBeGreaterThan(0);
      
      const action = result.intelligence.nextSteps[0];
      expect(action.action).toBeDefined();
      expect(action.priority).toMatch(/^(high|medium|low)$/);
      expect(action.timing).toBeDefined();
      expect(action.reasoning).toBeDefined();
    });
  });

  describe('generateAppeal', () => {
    it('should generate personalized appeal', async () => {
      const request: AppealRequest = {
        donorId: 'donor-123',
        urgency: 'medium',
        tone: 'personal',
        includeImpactStory: true,
        includeTestimonial: true
      };

      const result = await service.generateAppeal(request);

      expect(result).toBeDefined();
      expect(result.appeal).toBeDefined();
      expect(result.appeal.donorId).toBe('donor-123');
      expect(result.appeal.subject).toBeDefined();
      expect(result.appeal.greeting).toBeDefined();
      expect(result.appeal.body).toBeDefined();
      expect(result.appeal.askStatement).toBeDefined();
      expect(result.appeal.suggestedAmount).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should include impact story when requested', async () => {
      const request: AppealRequest = {
        donorId: 'donor-123',
        urgency: 'medium',
        tone: 'personal',
        includeImpactStory: true,
        includeTestimonial: false
      };

      const result = await service.generateAppeal(request);

      expect(result.appeal.impactStory).toBeDefined();
      expect(result.appeal.impactStory?.title).toBeDefined();
      expect(result.appeal.impactStory?.story).toBeDefined();
      expect(result.appeal.impactStory?.outcome).toBeDefined();
    });

    it('should include testimonial when requested', async () => {
      const request: AppealRequest = {
        donorId: 'donor-123',
        urgency: 'medium',
        tone: 'personal',
        includeImpactStory: false,
        includeTestimonial: true
      };

      const result = await service.generateAppeal(request);

      expect(result.appeal.testimonial).toBeDefined();
      expect(result.appeal.testimonial?.author).toBeDefined();
      expect(result.appeal.testimonial?.quote).toBeDefined();
      expect(result.appeal.testimonial?.role).toBeDefined();
    });

    it('should provide alternative amounts', async () => {
      const request: AppealRequest = {
        donorId: 'donor-123',
        urgency: 'medium',
        tone: 'personal',
        includeImpactStory: false,
        includeTestimonial: false
      };

      const result = await service.generateAppeal(request);

      expect(result.appeal.alternativeAmounts).toBeInstanceOf(Array);
      expect(result.appeal.alternativeAmounts.length).toBeGreaterThan(0);
      expect(result.appeal.alternativeAmounts).toContain(result.appeal.suggestedAmount);
    });

    it('should generate alternative appeal versions', async () => {
      const request: AppealRequest = {
        donorId: 'donor-123',
        urgency: 'medium',
        tone: 'formal',
        includeImpactStory: true,
        includeTestimonial: true
      };

      const result = await service.generateAppeal(request);

      expect(result.alternatives).toBeInstanceOf(Array);
      // May have 0-2 alternatives depending on request parameters
    });
  });

  describe('createEngagementPlan', () => {
    it('should create comprehensive engagement plan', async () => {
      const result = await service.createEngagementPlan('donor-123');

      expect(result).toBeDefined();
      expect(result.plan).toBeDefined();
      expect(result.plan.donorId).toBe('donor-123');
      expect(result.plan.currentStatus).toBeDefined();
      expect(result.plan.goals).toBeInstanceOf(Array);
      expect(result.plan.touchpoints).toBeInstanceOf(Array);
      expect(result.plan.recognitionOpportunities).toBeInstanceOf(Array);
      expect(result.plan.relationshipHealth).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should assess relationship health', async () => {
      const result = await service.createEngagementPlan('donor-123');

      const health = result.plan.relationshipHealth;
      expect(health.score).toBeGreaterThanOrEqual(0);
      expect(health.score).toBeLessThanOrEqual(100);
      expect(health.trend).toMatch(/^(improving|stable|declining)$/);
      expect(health.strengths).toBeInstanceOf(Array);
      expect(health.concerns).toBeInstanceOf(Array);
      expect(health.recommendations).toBeInstanceOf(Array);
    });

    it('should generate touchpoint plan', async () => {
      const result = await service.createEngagementPlan('donor-123');

      expect(result.plan.touchpoints.length).toBeGreaterThan(0);
      
      const touchpoint = result.plan.touchpoints[0];
      expect(touchpoint.type).toBeDefined();
      expect(touchpoint.timing).toBeDefined();
      expect(touchpoint.method).toBeDefined();
      expect(touchpoint.purpose).toBeDefined();
      expect(touchpoint.priority).toMatch(/^(high|medium|low)$/);
      expect(touchpoint.completed).toBe(false);
    });

    it('should identify recognition opportunities', async () => {
      const result = await service.createEngagementPlan('donor-123');

      expect(result.plan.recognitionOpportunities).toBeInstanceOf(Array);
      
      if (result.plan.recognitionOpportunities.length > 0) {
        const opportunity = result.plan.recognitionOpportunities[0];
        expect(opportunity.type).toBeDefined();
        expect(opportunity.occasion).toBeDefined();
        expect(opportunity.timing).toBeDefined();
        expect(opportunity.suggestedApproach).toBeDefined();
      }
    });

    it('should provide implementation guide', async () => {
      const result = await service.createEngagementPlan('donor-123');

      expect(result.implementationGuide).toBeInstanceOf(Array);
      expect(result.implementationGuide.length).toBeGreaterThan(0);
    });
  });

  describe('identifyProspects', () => {
    it('should identify prospects without filters', async () => {
      const result = await service.identifyProspects();

      expect(result).toBeDefined();
      expect(result.prospects).toBeInstanceOf(Array);
      expect(result.totalCount).toBeGreaterThan(0);
      expect(result.prospects.length).toBe(result.totalCount);
    });

    it('should filter prospects by source', async () => {
      const result = await service.identifyProspects(ProspectSource.ALUMNI);

      expect(result.prospects).toBeInstanceOf(Array);
      result.prospects.forEach(prospect => {
        expect(prospect.source).toBe(ProspectSource.ALUMNI);
      });
    });

    it('should filter prospects by minimum capacity', async () => {
      const minCapacity = 50000;
      const result = await service.identifyProspects(undefined, minCapacity);

      result.prospects.forEach(prospect => {
        expect(prospect.estimatedCapacity).toBeGreaterThanOrEqual(minCapacity);
      });
    });

    it('should prioritize prospects correctly', async () => {
      const result = await service.identifyProspects();

      expect(result.highPriorityCount).toBeGreaterThanOrEqual(0);
      
      const highPriorityProspects = result.prospects.filter(p => p.priority === 'high');
      expect(highPriorityProspects.length).toBe(result.highPriorityCount);
    });

    it('should calculate prospect scores', async () => {
      const result = await service.identifyProspects();

      result.prospects.forEach(prospect => {
        expect(prospect.affinityScore).toBeGreaterThanOrEqual(0);
        expect(prospect.affinityScore).toBeLessThanOrEqual(100);
        expect(prospect.readinessScore).toBeGreaterThanOrEqual(0);
        expect(prospect.readinessScore).toBeLessThanOrEqual(100);
        expect(prospect.overallScore).toBeGreaterThanOrEqual(0);
        expect(prospect.overallScore).toBeLessThanOrEqual(100);
      });
    });

    it('should provide cultivation strategies', async () => {
      const result = await service.identifyProspects();

      result.prospects.forEach(prospect => {
        expect(prospect.recommendedStrategy).toBeDefined();
        expect(prospect.recommendedStrategy.length).toBeGreaterThan(0);
      });
    });
  });

  describe('generateImpactReport', () => {
    it('should generate comprehensive impact report', async () => {
      const period: ReportPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        label: 'Year 2024'
      };

      const result = await service.generateImpactReport('donor-123', period);

      expect(result).toBeDefined();
      expect(result.report).toBeDefined();
      expect(result.report.donorId).toBe('donor-123');
      expect(result.report.totalImpact).toBeGreaterThan(0);
      expect(result.report.specificOutcomes).toBeInstanceOf(Array);
      expect(result.report.studentStories).toBeInstanceOf(Array);
      expect(result.report.metrics).toBeInstanceOf(Array);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should generate specific outcomes', async () => {
      const period: ReportPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        label: 'Year 2024'
      };

      const result = await service.generateImpactReport('donor-123', period);

      expect(result.report.specificOutcomes.length).toBeGreaterThan(0);
      
      const outcome = result.report.specificOutcomes[0];
      expect(outcome.category).toBeDefined();
      expect(outcome.description).toBeDefined();
      expect(outcome.impact).toBeDefined();
      expect(outcome.donorContribution).toBeGreaterThan(0);
      expect(outcome.evidence).toBeInstanceOf(Array);
    });

    it('should include student stories', async () => {
      const period: ReportPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        label: 'Year 2024'
      };

      const result = await service.generateImpactReport('donor-123', period);

      expect(result.report.studentStories.length).toBeGreaterThan(0);
      
      const story = result.report.studentStories[0];
      expect(story.studentName).toBeDefined();
      expect(story.program).toBeDefined();
      expect(story.story).toBeDefined();
      expect(story.outcome).toBeDefined();
      expect(story.relevanceToDonor).toBeDefined();
    });

    it('should generate impact metrics', async () => {
      const period: ReportPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        label: 'Year 2024'
      };

      const result = await service.generateImpactReport('donor-123', period);

      expect(result.report.metrics.length).toBeGreaterThan(0);
      
      const metric = result.report.metrics[0];
      expect(metric.name).toBeDefined();
      expect(metric.value).toBeGreaterThanOrEqual(0);
      expect(metric.unit).toBeDefined();
      expect(metric.changeDirection).toMatch(/^(up|down|stable)$/);
    });

    it('should create visualizations', async () => {
      const period: ReportPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        label: 'Year 2024'
      };

      const result = await service.generateImpactReport('donor-123', period);

      expect(result.report.visualizations).toBeInstanceOf(Array);
      expect(result.report.visualizations.length).toBeGreaterThan(0);
      
      const viz = result.report.visualizations[0];
      expect(viz.type).toMatch(/^(chart|graph|infographic|map)$/);
      expect(viz.title).toBeDefined();
      expect(viz.dataUrl).toBeDefined();
    });

    it('should generate thank you message', async () => {
      const period: ReportPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        label: 'Year 2024'
      };

      const result = await service.generateImpactReport('donor-123', period);

      expect(result.report.thankYouMessage).toBeDefined();
      expect(result.report.thankYouMessage.length).toBeGreaterThan(0);
    });

    it('should identify future opportunities', async () => {
      const period: ReportPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        label: 'Year 2024'
      };

      const result = await service.generateImpactReport('donor-123', period);

      expect(result.report.futureOpportunities).toBeInstanceOf(Array);
      expect(result.report.futureOpportunities.length).toBeGreaterThan(0);
    });

    it('should provide delivery recommendations', async () => {
      const period: ReportPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        label: 'Year 2024'
      };

      const result = await service.generateImpactReport('donor-123', period);

      expect(result.deliveryRecommendations).toBeInstanceOf(Array);
      expect(result.deliveryRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('getDonorProfile', () => {
    it('should return comprehensive donor profile', async () => {
      const result = await service.getDonorProfile('donor-123');

      expect(result).toBeDefined();
      expect(result.donor).toBeDefined();
      expect(result.intelligence).toBeDefined();
      expect(result.engagementPlan).toBeDefined();
    });
  });

  describe('processCampaignDonors', () => {
    it('should process multiple donors for campaign', async () => {
      const donorIds = ['donor-1', 'donor-2', 'donor-3'];
      const campaignId = 'campaign-123';

      const result = await service.processCampaignDonors(donorIds, campaignId);

      expect(result).toBeDefined();
      expect(result.appeals).toBeInstanceOf(Array);
      expect(result.appeals.length).toBe(donorIds.length);
      expect(result.totalEstimatedRaise).toBeGreaterThan(0);
    });

    it('should calculate total estimated raise', async () => {
      const donorIds = ['donor-1', 'donor-2'];
      const campaignId = 'campaign-123';

      const result = await service.processCampaignDonors(donorIds, campaignId);

      const sumOfSuggested = result.appeals.reduce(
        (sum, appeal) => sum + appeal.appeal.suggestedAmount,
        0
      );

      expect(result.totalEstimatedRaise).toBe(sumOfSuggested);
    });
  });
});
