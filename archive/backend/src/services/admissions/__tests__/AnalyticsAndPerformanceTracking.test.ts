/**
 * ScrollUniversity Admissions Analytics and Performance Tracking Tests
 * "Test everything; hold fast what is good" - 1 Thessalonians 5:21
 */

import { AdmissionsAnalyticsService } from '../AdmissionsAnalyticsService';
import PerformanceTrackingService from '../PerformanceTrackingService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client');
const mockPrisma = {
  applications: {
    count: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn()
  },
  spiritual_evaluations: {
    findMany: jest.fn(),
    groupBy: jest.fn()
  },
  academic_evaluations: {
    findMany: jest.fn()
  },
  interview_records: {
    findMany: jest.fn()
  },
  admission_decisions: {
    findMany: jest.fn()
  },
  admissions_analytics: {
    create: jest.fn()
  },
  performance_metrics: {
    create: jest.fn(),
    findMany: jest.fn()
  }
};

(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);

describe('AdmissionsAnalyticsService', () => {
  let analyticsService: AdmissionsAnalyticsService;

  beforeEach(() => {
    analyticsService = new AdmissionsAnalyticsService();
    jest.clearAllMocks();
  });

  describe('generateApplicationVolumeAnalysis', () => {
    it('should generate comprehensive application volume metrics', async () => {
      // Mock data
      mockPrisma.applications.count.mockResolvedValue(150);
      mockPrisma.applications.findMany.mockResolvedValue([
        { submissionDate: new Date('2024-01-15') },
        { submissionDate: new Date('2024-01-20') },
        { submissionDate: new Date('2024-02-10') }
      ]);
      mockPrisma.applications.groupBy.mockResolvedValue([
        { programApplied: 'SCROLL_THEOLOGY', _count: { id: 75 } },
        { programApplied: 'PROPHETIC_LAW', _count: { id: 45 } },
        { programApplied: 'EDENIC_SCIENCE', _count: { id: 30 } }
      ]);

      const result = await analyticsService.generateApplicationVolumeAnalysis();

      expect(result).toHaveProperty('totalApplications', 150);
      expect(result).toHaveProperty('applicationsByMonth');
      expect(result).toHaveProperty('applicationsByProgram');
      expect(result).toHaveProperty('peakApplicationPeriods');
      expect(result.applicationsByProgram).toHaveLength(3);
      expect(result.applicationsByProgram[0]).toHaveProperty('program', 'SCROLL_THEOLOGY');
      expect(result.applicationsByProgram[0]).toHaveProperty('count', 75);
      expect(result.applicationsByProgram[0]).toHaveProperty('percentage', 50);
    });

    it('should handle empty application data gracefully', async () => {
      mockPrisma.applications.count.mockResolvedValue(0);
      mockPrisma.applications.findMany.mockResolvedValue([]);
      mockPrisma.applications.groupBy.mockResolvedValue([]);

      const result = await analyticsService.generateApplicationVolumeAnalysis();

      expect(result.totalApplications).toBe(0);
      expect(result.applicationsByMonth).toHaveLength(0);
      expect(result.applicationsByProgram).toHaveLength(0);
    });

    it('should calculate growth rates correctly', async () => {
      mockPrisma.applications.count.mockResolvedValue(100);
      mockPrisma.applications.findMany.mockResolvedValue([
        { submissionDate: new Date('2024-01-15') },
        { submissionDate: new Date('2024-01-20') },
        { submissionDate: new Date('2024-02-10') },
        { submissionDate: new Date('2024-02-15') },
        { submissionDate: new Date('2024-02-20') }
      ]);
      mockPrisma.applications.groupBy.mockResolvedValue([]);

      const result = await analyticsService.generateApplicationVolumeAnalysis();

      expect(result.applicationsByMonth).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            month: '2024-01',
            count: 2,
            growthRate: 0
          }),
          expect.objectContaining({
            month: '2024-02',
            count: 3,
            growthRate: 50
          })
        ])
      );
    });
  });

  describe('generateConversionRateAnalysis', () => {
    it('should calculate overall conversion rate correctly', async () => {
      mockPrisma.applications.count
        .mockResolvedValueOnce(200) // Total applications
        .mockResolvedValueOnce(120); // Accepted applications

      // Mock stage-by-stage conversion data
      mockPrisma.applications.count
        .mockResolvedValueOnce(200) // SUBMITTED
        .mockResolvedValueOnce(180) // UNDER_REVIEW
        .mockResolvedValueOnce(180) // UNDER_REVIEW
        .mockResolvedValueOnce(160) // ASSESSMENT_PENDING
        .mockResolvedValueOnce(160) // ASSESSMENT_PENDING
        .mockResolvedValueOnce(140) // INTERVIEW_SCHEDULED
        .mockResolvedValueOnce(140) // INTERVIEW_SCHEDULED
        .mockResolvedValueOnce(130) // DECISION_PENDING
        .mockResolvedValueOnce(130) // DECISION_PENDING
        .mockResolvedValueOnce(120); // ACCEPTED

      mockPrisma.applications.groupBy.mockResolvedValue([
        { programApplied: 'SCROLL_THEOLOGY', _count: { id: 100 } },
        { programApplied: 'PROPHETIC_LAW', _count: { id: 100 } }
      ]);

      const result = await analyticsService.generateConversionRateAnalysis();

      expect(result.overallConversionRate).toBe(60); // 120/200 * 100
      expect(result).toHaveProperty('conversionByStage');
      expect(result).toHaveProperty('conversionByProgram');
      expect(result).toHaveProperty('conversionTrends');
    });

    it('should handle zero applications gracefully', async () => {
      mockPrisma.applications.count.mockResolvedValue(0);
      mockPrisma.applications.groupBy.mockResolvedValue([]);

      const result = await analyticsService.generateConversionRateAnalysis();

      expect(result.overallConversionRate).toBe(0);
    });
  });

  describe('generateDemographicAnalysis', () => {
    it('should analyze demographic distribution correctly', async () => {
      // Mock geographic distribution
      mockPrisma.applications.groupBy.mockResolvedValue([
        { applicantCountry: 'USA', _count: { id: 50 } },
        { applicantCountry: 'Canada', _count: { id: 30 } },
        { applicantCountry: 'UK', _count: { id: 20 } }
      ]);

      // Mock spiritual maturity distribution
      mockPrisma.spiritual_evaluations.groupBy.mockResolvedValue([
        { spiritualMaturity: 'MATURE', _count: { id: 40 } },
        { spiritualMaturity: 'GROWING', _count: { id: 35 } },
        { spiritualMaturity: 'BEGINNING', _count: { id: 25 } }
      ]);

      // Mock age distribution data
      mockPrisma.applications.findMany.mockResolvedValue([
        { applicationData: { age: 25, primaryLanguage: 'English', academicBackground: 'Bachelor' } },
        { applicationData: { age: 30, primaryLanguage: 'Spanish', academicBackground: 'Master' } },
        { applicationData: { age: 22, primaryLanguage: 'French', academicBackground: 'Bachelor' } }
      ]);

      const result = await analyticsService.generateDemographicAnalysis();

      expect(result).toHaveProperty('ageDistribution');
      expect(result).toHaveProperty('geographicDistribution');
      expect(result).toHaveProperty('spiritualMaturityDistribution');
      expect(result).toHaveProperty('academicBackgroundDistribution');
      expect(result).toHaveProperty('diversityMetrics');

      expect(result.geographicDistribution).toHaveLength(3);
      expect(result.geographicDistribution[0]).toEqual({
        region: 'USA',
        count: 50,
        percentage: 50
      });

      expect(result.diversityMetrics.totalCountries).toBe(3);
      expect(result.diversityMetrics.totalLanguages).toBe(3);
    });

    it('should calculate diversity index correctly', async () => {
      mockPrisma.applications.groupBy.mockResolvedValue([
        { applicantCountry: 'USA', _count: { id: 25 } },
        { applicantCountry: 'Canada', _count: { id: 25 } },
        { applicantCountry: 'UK', _count: { id: 25 } },
        { applicantCountry: 'Australia', _count: { id: 25 } }
      ]);

      mockPrisma.spiritual_evaluations.groupBy.mockResolvedValue([]);

      mockPrisma.applications.findMany.mockResolvedValue([
        { applicantCountry: 'USA', applicationData: { primaryLanguage: 'English' } },
        { applicantCountry: 'Canada', applicationData: { primaryLanguage: 'English' } },
        { applicantCountry: 'UK', applicationData: { primaryLanguage: 'English' } },
        { applicantCountry: 'Australia', applicationData: { primaryLanguage: 'English' } }
      ]);

      const result = await analyticsService.generateDemographicAnalysis();

      expect(result.diversityMetrics.culturalDiversityIndex).toBeGreaterThan(90);
    });
  });

  describe('generateFunnelAnalysis', () => {
    it('should identify bottlenecks correctly', async () => {
      // Mock stage analysis data
      mockPrisma.applications.count
        .mockResolvedValueOnce(100) // SUBMITTED
        .mockResolvedValueOnce(90)  // UNDER_REVIEW
        .mockResolvedValueOnce(80)  // ASSESSMENT_PENDING
        .mockResolvedValueOnce(70)  // INTERVIEW_SCHEDULED
        .mockResolvedValueOnce(60)  // DECISION_PENDING
        .mockResolvedValueOnce(50); // ACCEPTED

      // Mock applications for time calculation
      mockPrisma.applications.findMany.mockResolvedValue([
        {
          submissionDate: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15')
        }
      ]);

      const result = await analyticsService.generateFunnelAnalysis();

      expect(result).toHaveProperty('stages');
      expect(result).toHaveProperty('bottlenecks');
      expect(result).toHaveProperty('processEfficiency');
      expect(result.stages).toHaveLength(6);
    });

    it('should calculate process efficiency metrics', async () => {
      mockPrisma.applications.findMany.mockResolvedValue([
        {
          submissionDate: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-30')
        },
        {
          submissionDate: new Date('2024-01-05'),
          updatedAt: new Date('2024-02-04')
        }
      ]);

      const result = await analyticsService.generateFunnelAnalysis();

      expect(result.processEfficiency).toHaveProperty('averageProcessingTime');
      expect(result.processEfficiency).toHaveProperty('fastestProcessingTime');
      expect(result.processEfficiency).toHaveProperty('slowestProcessingTime');
      expect(result.processEfficiency).toHaveProperty('efficiencyScore');
    });
  });

  describe('storeAnalyticsReport', () => {
    it('should store analytics report successfully', async () => {
      const mockReportData = {
        applicationVolume: { totalApplications: 100 },
        conversionRates: { overallConversionRate: 60 },
        demographics: { geographicDistribution: [] },
        funnelAnalysis: { processEfficiency: {} },
        qualityMetrics: { averageApplicationQuality: 85 }
      };

      mockPrisma.admissions_analytics.create.mockResolvedValue({
        id: 'report-123'
      });

      const reportId = await analyticsService.storeAnalyticsReport(
        'MONTHLY_ANALYSIS',
        mockReportData
      );

      expect(reportId).toBe('report-123');
      expect(mockPrisma.admissions_analytics.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reportType: 'MONTHLY_ANALYSIS',
          totalApplications: 100,
          acceptanceRate: 60,
          reportData: mockReportData
        })
      });
    });
  });
});

describe('PerformanceTrackingService', () => {
  let performanceService: PerformanceTrackingService;

  beforeEach(() => {
    performanceService = new PerformanceTrackingService();
    jest.clearAllMocks();
  });

  describe('trackApplicationVolume', () => {
    it('should track application volume metrics correctly', async () => {
      mockPrisma.applications.count
        .mockResolvedValueOnce(150) // Current period
        .mockResolvedValueOnce(120); // Previous period

      mockPrisma.applications.groupBy.mockResolvedValue([
        { submissionDate: new Date('2024-01-15'), _count: { id: 5 } },
        { submissionDate: new Date('2024-01-16'), _count: { id: 8 } },
        { submissionDate: new Date('2024-01-17'), _count: { id: 3 } }
      ]);

      const result = await performanceService.trackApplicationVolume();

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('metricName', 'application_volume_30_days');
      expect(result[0]).toHaveProperty('metricValue', 150);
      expect(result[0]).toHaveProperty('metricType', 'VOLUME');

      expect(result[1]).toHaveProperty('metricName', 'daily_application_average');
      expect(result[1]).toHaveProperty('metricValue', 5); // 150/30

      expect(result[2]).toHaveProperty('metricName', 'peak_day_volume');
    });
  });

  describe('trackConversionRates', () => {
    it('should track conversion rates across funnel stages', async () => {
      // Mock stage counts
      mockPrisma.applications.count
        .mockResolvedValueOnce(100) // SUBMITTED
        .mockResolvedValueOnce(90)  // UNDER_REVIEW
        .mockResolvedValueOnce(90)  // UNDER_REVIEW
        .mockResolvedValueOnce(80)  // ASSESSMENT_PENDING
        .mockResolvedValueOnce(80)  // ASSESSMENT_PENDING
        .mockResolvedValueOnce(70)  // INTERVIEW_SCHEDULED
        .mockResolvedValueOnce(70)  // INTERVIEW_SCHEDULED
        .mockResolvedValueOnce(60)  // DECISION_PENDING
        .mockResolvedValueOnce(60)  // DECISION_PENDING
        .mockResolvedValueOnce(50)  // ACCEPTED
        .mockResolvedValueOnce(100) // Total submitted for overall rate
        .mockResolvedValueOnce(50); // Total accepted for overall rate

      const result = await performanceService.trackConversionRates();

      expect(result.length).toBeGreaterThan(0);
      
      const overallConversionMetric = result.find(m => m.metricName === 'overall_conversion_rate');
      expect(overallConversionMetric).toBeDefined();
      expect(overallConversionMetric?.metricValue).toBe(50);
    });
  });

  describe('trackDemographicMetrics', () => {
    it('should track demographic diversity metrics', async () => {
      mockPrisma.applications.groupBy.mockResolvedValue([
        { applicantCountry: 'USA', _count: { id: 40 } },
        { applicantCountry: 'Canada', _count: { id: 30 } },
        { applicantCountry: 'UK', _count: { id: 30 } }
      ]);

      mockPrisma.spiritual_evaluations.groupBy.mockResolvedValue([
        { spiritualMaturity: 'MATURE', _count: { id: 50 } },
        { spiritualMaturity: 'GROWING', _count: { id: 30 } },
        { spiritualMaturity: 'BEGINNING', _count: { id: 20 } }
      ]);

      const result = await performanceService.trackDemographicMetrics();

      expect(result).toHaveLength(2);
      
      const geographicMetric = result.find(m => m.metricName === 'geographic_diversity_countries');
      expect(geographicMetric).toBeDefined();
      expect(geographicMetric?.metricValue).toBe(3);

      const spiritualMetric = result.find(m => m.metricName === 'spiritual_maturity_diversity_index');
      expect(spiritualMetric).toBeDefined();
    });
  });

  describe('identifyFunnelBottlenecks', () => {
    it('should identify performance bottlenecks', async () => {
      // Mock stage analysis that would indicate bottlenecks
      mockPrisma.applications.count.mockResolvedValue(100);
      mockPrisma.applications.findMany.mockResolvedValue([
        {
          submissionDate: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-20') // 19 days - exceeds threshold
        }
      ]);

      const result = await performanceService.identifyFunnelBottlenecks();

      expect(Array.isArray(result)).toBe(true);
      // Bottlenecks would be identified based on thresholds
    });
  });

  describe('generateTrendAnalysis', () => {
    it('should generate trend analysis for metrics', async () => {
      mockPrisma.performance_metrics.findMany
        .mockResolvedValueOnce([
          { metricValue: 120, timestamp: new Date('2024-02-01') },
          { metricValue: 130, timestamp: new Date('2024-02-02') }
        ])
        .mockResolvedValueOnce([
          { metricValue: 100, timestamp: new Date('2024-01-01') },
          { metricValue: 110, timestamp: new Date('2024-01-02') }
        ]);

      const result = await performanceService.generateTrendAnalysis(['application_volume_30_days']);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('metric', 'application_volume_30_days');
      expect(result[0]).toHaveProperty('currentValue', 125); // Average of 120, 130
      expect(result[0]).toHaveProperty('previousValue', 105); // Average of 100, 110
      expect(result[0]).toHaveProperty('changePercentage');
      expect(result[0]).toHaveProperty('trend');
      expect(result[0]).toHaveProperty('significance');
    });
  });

  describe('generateOptimizationRecommendations', () => {
    it('should generate optimization recommendations', async () => {
      // Mock low conversion rates to trigger recommendations
      mockPrisma.applications.count
        .mockResolvedValue(50) // Low conversion rate scenario
        .mockResolvedValue(100);

      mockPrisma.performance_metrics.findMany.mockResolvedValue([
        { metricValue: 150, timestamp: new Date() }
      ]);

      const result = await performanceService.generateOptimizationRecommendations();

      expect(Array.isArray(result)).toBe(true);
      // Should contain recommendations for improvement
    });
  });
});