/**
 * ScrollUniversity Admissions Predictive Analytics Service Tests
 * "Test all things; hold fast what is good" - 1 Thessalonians 5:21
 */

import { PrismaClient } from '@prisma/client';
import PredictiveAnalyticsService from '../PredictiveAnalyticsService';

// Mock Prisma Client
jest.mock('@prisma/client');
const mockPrisma = {
  application: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn()
  },
  eligibilityAssessment: {
    findMany: jest.fn()
  },
  spiritualEvaluation: {
    findMany: jest.fn()
  },
  academicEvaluation: {
    findMany: jest.fn()
  },
  interviewRecord: {
    findMany: jest.fn()
  },
  admissionDecision: {
    findMany: jest.fn()
  },
  predictiveModel: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn()
  },
  admissionSuccessPrediction: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  yieldPrediction: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  enrollmentForecast: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  processImprovementRecommendation: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  qualityAssuranceRecommendation: {
    create: jest.fn(),
    findMany: jest.fn()
  }
};

describe('PredictiveAnalyticsService', () => {
  let service: PredictiveAnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
    service = new PredictiveAnalyticsService();
  });

  describe('buildAdmissionSuccessModel', () => {
    it('should build admission success predictive model successfully', async () => {
      // Mock historical data
      const mockHistoricalData = [
        {
          id: 'app1',
          status: 'ACCEPTED',
          academicEvaluation: { learningPotential: 0.85 },
          spiritualEvaluation: { scrollAlignment: 0.90 },
          interviewRecords: [{ evaluation: { overallRecommendation: 0.80 } }]
        },
        {
          id: 'app2',
          status: 'REJECTED',
          academicEvaluation: { learningPotential: 0.45 },
          spiritualEvaluation: { scrollAlignment: 0.50 },
          interviewRecords: [{ evaluation: { overallRecommendation: 0.40 } }]
        }
      ];

      mockPrisma.application.findMany.mockResolvedValue(mockHistoricalData);
      mockPrisma.predictiveModel.create.mockResolvedValue({
        id: 'model1',
        modelId: 'admission_success_123',
        modelType: 'ADMISSION_SUCCESS',
        accuracy: 0.85
      });

      const result = await service.buildAdmissionSuccessModel();

      expect(result).toBeDefined();
      expect(result.modelType).toBe('ADMISSION_SUCCESS');
      expect(result.accuracy).toBeGreaterThan(0);
      expect(result.features).toContain('academic_performance_score');
      expect(result.features).toContain('spiritual_maturity_level');
      expect(mockPrisma.predictiveModel.create).toHaveBeenCalled();
    });

    it('should handle empty historical data gracefully', async () => {
      mockPrisma.application.findMany.mockResolvedValue([]);
      mockPrisma.predictiveModel.create.mockResolvedValue({
        id: 'model1',
        modelId: 'admission_success_123',
        modelType: 'ADMISSION_SUCCESS',
        accuracy: 0.60
      });

      const result = await service.buildAdmissionSuccessModel();

      expect(result).toBeDefined();
      expect(result.accuracy).toBeGreaterThanOrEqual(0.6);
    });

    it('should throw error when model building fails', async () => {
      mockPrisma.application.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.buildAdmissionSuccessModel()).rejects.toThrow('Admission success model building failed');
    });
  });

  describe('predictAdmissionSuccess', () => {
    beforeEach(() => {
      // Mock the model in service
      service['models'].set('admission_success', {
        modelId: 'test_model',
        modelType: 'ADMISSION_SUCCESS',
        accuracy: 0.85,
        lastTrained: new Date(),
        features: ['academic_performance_score', 'spiritual_maturity_level'],
        parameters: {
          featureWeights: {
            'academic_performance_score': 0.20,
            'spiritual_maturity_level': 0.25,
            'character_assessment_score': 0.20,
            'interview_evaluation_score': 0.15,
            'application_completeness_score': 0.10
          }
        }
      });
    });

    it('should predict admission success for high-quality applicant', async () => {
      const mockApplicantData = {
        id: 'app1',
        academicEvaluation: { learningPotential: 0.90 },
        spiritualEvaluation: { scrollAlignment: 0.95 },
        interviewRecords: [{ evaluation: { overallRecommendation: 0.85 } }],
        applicationData: { age: 25 }
      };

      mockPrisma.application.findUnique.mockResolvedValue(mockApplicantData);

      const result = await service.predictAdmissionSuccess('app1');

      expect(result).toBeDefined();
      expect(result.applicantId).toBe('app1');
      expect(result.successProbability).toBeGreaterThan(0.7);
      expect(result.keyFactors).toBeDefined();
      expect(result.keyFactors.length).toBeGreaterThan(0);
      expect(result.recommendations).toBeDefined();
    });

    it('should predict admission success for low-quality applicant', async () => {
      const mockApplicantData = {
        id: 'app2',
        academicEvaluation: { learningPotential: 0.40 },
        spiritualEvaluation: { scrollAlignment: 0.45 },
        interviewRecords: [{ evaluation: { overallRecommendation: 0.35 } }],
        applicationData: { age: 22 }
      };

      mockPrisma.application.findUnique.mockResolvedValue(mockApplicantData);

      const result = await service.predictAdmissionSuccess('app2');

      expect(result).toBeDefined();
      expect(result.applicantId).toBe('app2');
      expect(result.successProbability).toBeLessThan(0.6);
      expect(result.riskFactors.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should throw error when applicant not found', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(null);

      await expect(service.predictAdmissionSuccess('nonexistent')).rejects.toThrow('Application not found');
    });

    it('should throw error when model not available', async () => {
      service['models'].clear();
      
      await expect(service.predictAdmissionSuccess('app1')).rejects.toThrow('Admission success model not available');
    });
  });

  describe('predictYieldRates', () => {
    it('should predict yield rates for all programs', async () => {
      const mockPrograms = ['BACHELOR_THEOLOGY', 'MASTER_MINISTRY', 'DOCTORATE_DIVINITY'];
      
      mockPrisma.application.groupBy.mockResolvedValue(
        mockPrograms.map(program => ({ programApplied: program, _count: { id: 10 } }))
      );

      // Mock historical yield data
      mockPrisma.application.findMany.mockResolvedValue([
        { id: 'app1', programApplied: 'BACHELOR_THEOLOGY', status: 'ENROLLED', admissionDecision: { decisionDate: new Date() } },
        { id: 'app2', programApplied: 'BACHELOR_THEOLOGY', status: 'ACCEPTED', admissionDecision: { decisionDate: new Date() } }
      ]);

      const result = await service.predictYieldRates();

      expect(result).toBeDefined();
      expect(result.length).toBe(mockPrograms.length);
      
      result.forEach(prediction => {
        expect(prediction.programType).toBeDefined();
        expect(prediction.predictedYieldRate).toBeGreaterThanOrEqual(0);
        expect(prediction.predictedYieldRate).toBeLessThanOrEqual(100);
        expect(prediction.confidenceInterval).toBeDefined();
        expect(prediction.factors).toBeDefined();
        expect(prediction.seasonalTrends).toBeDefined();
      });
    });

    it('should predict yield rate for specific program', async () => {
      const program = 'BACHELOR_THEOLOGY';
      
      mockPrisma.application.findMany.mockResolvedValue([
        { id: 'app1', programApplied: program, status: 'ENROLLED', admissionDecision: { decisionDate: new Date() } },
        { id: 'app2', programApplied: program, status: 'ACCEPTED', admissionDecision: { decisionDate: new Date() } }
      ]);

      const result = await service.predictYieldRates(program);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].programType).toBe(program);
      expect(result[0].predictedYieldRate).toBeGreaterThanOrEqual(0);
    });

    it('should handle programs with no historical data', async () => {
      mockPrisma.application.groupBy.mockResolvedValue([
        { programApplied: 'NEW_PROGRAM', _count: { id: 0 } }
      ]);
      mockPrisma.application.findMany.mockResolvedValue([]);

      const result = await service.predictYieldRates();

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].predictedYieldRate).toBe(0);
      expect(result[0].historicalYieldRate).toBe(0);
    });
  });

  describe('generateEnrollmentForecast', () => {
    it('should generate enrollment forecast for specified period', async () => {
      const forecastPeriod = 'Q1_2024';
      
      // Mock historical enrollment data
      mockPrisma.application.findMany.mockResolvedValue([
        { id: 'app1', programApplied: 'BACHELOR_THEOLOGY', submissionDate: new Date() },
        { id: 'app2', programApplied: 'MASTER_MINISTRY', submissionDate: new Date() }
      ]);

      // Mock program types
      mockPrisma.application.groupBy.mockResolvedValue([
        { programApplied: 'BACHELOR_THEOLOGY', _count: { id: 50 } },
        { programApplied: 'MASTER_MINISTRY', _count: { id: 30 } }
      ]);

      const result = await service.generateEnrollmentForecast(forecastPeriod);

      expect(result).toBeDefined();
      expect(result.forecastPeriod).toBe(forecastPeriod);
      expect(result.predictedEnrollment).toBeGreaterThan(0);
      expect(result.capacityUtilization).toBeGreaterThanOrEqual(0);
      expect(result.demandTrends).toBeDefined();
      expect(result.demandTrends.length).toBeGreaterThan(0);
      expect(result.resourceRequirements).toBeDefined();
      expect(result.resourceRequirements.length).toBeGreaterThan(0);
    });

    it('should calculate resource requirements correctly', async () => {
      const forecastPeriod = 'Q2_2024';
      
      mockPrisma.application.findMany.mockResolvedValue([]);
      mockPrisma.application.groupBy.mockResolvedValue([]);

      const result = await service.generateEnrollmentForecast(forecastPeriod);

      expect(result.resourceRequirements).toBeDefined();
      
      const facultyRequirement = result.resourceRequirements.find(r => r.resource === 'Faculty');
      expect(facultyRequirement).toBeDefined();
      expect(facultyRequirement?.requiredCapacity).toBeGreaterThanOrEqual(0);
      expect(facultyRequirement?.currentCapacity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateProcessImprovementRecommendations', () => {
    it('should generate process improvement recommendations for all areas', async () => {
      const result = await service.generateProcessImprovementRecommendations();

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      result.forEach(recommendation => {
        expect(recommendation.processArea).toBeDefined();
        expect(recommendation.currentEfficiency).toBeGreaterThanOrEqual(0);
        expect(recommendation.currentEfficiency).toBeLessThanOrEqual(100);
        expect(recommendation.predictedImprovement).toBeGreaterThanOrEqual(0);
        expect(recommendation.predictedImprovement).toBeLessThanOrEqual(100);
        expect(recommendation.recommendations).toBeDefined();
        expect(recommendation.recommendations.length).toBeGreaterThan(0);
        expect(recommendation.qualityAssuranceMetrics).toBeDefined();
      });
    });

    it('should prioritize recommendations by predicted improvement', async () => {
      const result = await service.generateProcessImprovementRecommendations();

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(1);

      // Check that recommendations are sorted by predicted improvement (descending)
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].predictedImprovement).toBeGreaterThanOrEqual(result[i + 1].predictedImprovement);
      }
    });

    it('should include specific recommendations for each process area', async () => {
      const result = await service.generateProcessImprovementRecommendations();

      const applicationProcessing = result.find(r => r.processArea === 'application_processing');
      expect(applicationProcessing).toBeDefined();
      expect(applicationProcessing?.recommendations.length).toBeGreaterThan(0);

      const spiritualEvaluation = result.find(r => r.processArea === 'spiritual_evaluation');
      expect(spiritualEvaluation).toBeDefined();
      expect(spiritualEvaluation?.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('generateQualityAssuranceRecommendations', () => {
    it('should generate quality assurance recommendations for all areas', async () => {
      const result = await service.generateQualityAssuranceRecommendations();

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      result.forEach(recommendation => {
        expect(recommendation.area).toBeDefined();
        expect(recommendation.currentQualityScore).toBeGreaterThanOrEqual(0);
        expect(recommendation.currentQualityScore).toBeLessThanOrEqual(100);
        expect(recommendation.targetQualityScore).toBeGreaterThanOrEqual(0);
        expect(recommendation.targetQualityScore).toBeLessThanOrEqual(100);
        expect(recommendation.enhancementSuggestions).toBeDefined();
        expect(recommendation.enhancementSuggestions.length).toBeGreaterThan(0);
        expect(recommendation.monitoringMetrics).toBeDefined();
        expect(recommendation.monitoringMetrics.length).toBeGreaterThan(0);
        expect(recommendation.implementationPlan).toBeDefined();
        expect(recommendation.implementationPlan.length).toBeGreaterThan(0);
      });
    });

    it('should calculate quality gaps correctly', async () => {
      const result = await service.generateQualityAssuranceRecommendations();

      result.forEach(recommendation => {
        const gap = recommendation.targetQualityScore - recommendation.currentQualityScore;
        expect(gap).toBeGreaterThanOrEqual(0);
        
        // Larger gaps should have more enhancement suggestions
        if (gap > 10) {
          expect(recommendation.enhancementSuggestions.length).toBeGreaterThan(2);
        }
      });
    });

    it('should include implementation plans with phases', async () => {
      const result = await service.generateQualityAssuranceRecommendations();

      result.forEach(recommendation => {
        expect(recommendation.implementationPlan.length).toBeGreaterThanOrEqual(3);
        
        const phases = recommendation.implementationPlan.map(phase => phase.phase);
        expect(phases).toContain('Assessment and Planning');
        expect(phases).toContain('Implementation');
        expect(phases).toContain('Monitoring and Optimization');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockPrisma.application.findMany.mockRejectedValue(new Error('Connection failed'));

      await expect(service.buildAdmissionSuccessModel()).rejects.toThrow('Admission success model building failed');
    });

    it('should handle invalid applicant IDs', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(null);

      await expect(service.predictAdmissionSuccess('invalid-id')).rejects.toThrow('Application not found');
    });

    it('should handle missing model data', async () => {
      service['models'].clear();

      await expect(service.predictAdmissionSuccess('app1')).rejects.toThrow('Admission success model not available');
    });
  });

  describe('Model Performance', () => {
    it('should track model accuracy over time', async () => {
      const mockHistoricalData = Array.from({ length: 100 }, (_, i) => ({
        id: `app${i}`,
        status: i % 2 === 0 ? 'ACCEPTED' : 'REJECTED',
        academicEvaluation: { learningPotential: Math.random() },
        spiritualEvaluation: { scrollAlignment: Math.random() },
        interviewRecords: [{ evaluation: { overallRecommendation: Math.random() } }]
      }));

      mockPrisma.application.findMany.mockResolvedValue(mockHistoricalData);
      mockPrisma.predictiveModel.create.mockResolvedValue({
        id: 'model1',
        modelId: 'admission_success_123',
        modelType: 'ADMISSION_SUCCESS',
        accuracy: 0.85
      });

      const result = await service.buildAdmissionSuccessModel();

      expect(result.accuracy).toBeGreaterThan(0.6);
      expect(result.accuracy).toBeLessThanOrEqual(1.0);
    });

    it('should validate feature importance weights', async () => {
      const mockHistoricalData = [
        {
          id: 'app1',
          status: 'ACCEPTED',
          academicEvaluation: { learningPotential: 0.85 },
          spiritualEvaluation: { scrollAlignment: 0.90 },
          interviewRecords: [{ evaluation: { overallRecommendation: 0.80 } }]
        }
      ];

      mockPrisma.application.findMany.mockResolvedValue(mockHistoricalData);
      mockPrisma.predictiveModel.create.mockResolvedValue({
        id: 'model1',
        modelId: 'admission_success_123',
        modelType: 'ADMISSION_SUCCESS',
        accuracy: 0.85
      });

      const result = await service.buildAdmissionSuccessModel();

      expect(result.parameters.featureWeights).toBeDefined();
      
      const weights = result.parameters.featureWeights;
      const totalWeight = Object.values(weights).reduce((sum: number, weight: any) => sum + weight, 0);
      
      // Weights should sum to approximately 1.0
      expect(totalWeight).toBeCloseTo(1.0, 1);
      
      // Spiritual maturity should have highest weight
      expect(weights['spiritual_maturity_level']).toBe(0.25);
    });
  });

  describe('Integration Tests', () => {
    it('should integrate prediction with analytics service', async () => {
      // Mock successful model building
      const mockHistoricalData = [
        {
          id: 'app1',
          status: 'ACCEPTED',
          academicEvaluation: { learningPotential: 0.85 },
          spiritualEvaluation: { scrollAlignment: 0.90 },
          interviewRecords: [{ evaluation: { overallRecommendation: 0.80 } }]
        }
      ];

      mockPrisma.application.findMany.mockResolvedValue(mockHistoricalData);
      mockPrisma.predictiveModel.create.mockResolvedValue({
        id: 'model1',
        modelId: 'admission_success_123',
        modelType: 'ADMISSION_SUCCESS',
        accuracy: 0.85
      });

      // Build model
      const model = await service.buildAdmissionSuccessModel();
      expect(model).toBeDefined();

      // Mock applicant data for prediction
      const mockApplicantData = {
        id: 'app2',
        academicEvaluation: { learningPotential: 0.80 },
        spiritualEvaluation: { scrollAlignment: 0.85 },
        interviewRecords: [{ evaluation: { overallRecommendation: 0.75 } }],
        applicationData: { age: 24 }
      };

      mockPrisma.application.findUnique.mockResolvedValue(mockApplicantData);

      // Make prediction
      const prediction = await service.predictAdmissionSuccess('app2');
      expect(prediction).toBeDefined();
      expect(prediction.successProbability).toBeGreaterThan(0);
    });

    it('should handle end-to-end workflow for process improvement', async () => {
      // Generate recommendations
      const recommendations = await service.generateProcessImprovementRecommendations();
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);

      // Generate quality assurance recommendations
      const qualityRecommendations = await service.generateQualityAssuranceRecommendations();
      expect(qualityRecommendations).toBeDefined();
      expect(qualityRecommendations.length).toBeGreaterThan(0);

      // Verify recommendations are actionable
      recommendations.forEach(rec => {
        expect(rec.recommendations.length).toBeGreaterThan(0);
        rec.recommendations.forEach(action => {
          expect(action.action).toBeDefined();
          expect(action.expectedImpact).toBeGreaterThan(0);
          expect(['LOW', 'MEDIUM', 'HIGH']).toContain(action.implementationCost);
        });
      });
    });
  });
});