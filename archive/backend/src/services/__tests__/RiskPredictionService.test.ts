/**
 * Risk Prediction Service Tests
 */

import RiskPredictionService from '../RiskPredictionService';
import { PredictRiskRequest } from '../../types/personalization.types';

describe('RiskPredictionService', () => {
  let service: RiskPredictionService;

  beforeEach(() => {
    service = new RiskPredictionService();
  });

  describe('predictRisk', () => {
    it('should generate risk assessment for student', async () => {
      const request: PredictRiskRequest = {
        studentId: 'test-student-1',
        includeInterventions: true
      };

      const response = await service.predictRisk(request);

      expect(response.success).toBe(true);
      expect(response.riskAssessment).toBeDefined();
      expect(response.riskAssessment.overallRiskLevel).toMatch(/low|medium|high|critical/);
      expect(response.riskAssessment.assessmentDate).toBeDefined();
    });

    it('should identify risk factors', async () => {
      const request: PredictRiskRequest = {
        studentId: 'test-student-1'
      };

      const response = await service.predictRisk(request);

      expect(response.success).toBe(true);
      expect(Array.isArray(response.riskAssessment.riskFactors)).toBe(true);
      
      for (const factor of response.riskAssessment.riskFactors) {
        expect(factor.factorType).toBeDefined();
        expect(factor.severity).toBeGreaterThanOrEqual(0);
        expect(factor.severity).toBeLessThanOrEqual(100);
        expect(factor.description).toBeDefined();
        expect(Array.isArray(factor.evidence)).toBe(true);
        expect(factor.trend).toMatch(/increasing|stable|decreasing/);
      }
    });

    it('should identify protective factors', async () => {
      const request: PredictRiskRequest = {
        studentId: 'test-student-1'
      };

      const response = await service.predictRisk(request);

      expect(response.success).toBe(true);
      expect(Array.isArray(response.riskAssessment.protectiveFactors)).toBe(true);
      
      for (const factor of response.riskAssessment.protectiveFactors) {
        expect(factor.factorType).toBeDefined();
        expect(factor.strength).toBeGreaterThanOrEqual(0);
        expect(factor.strength).toBeLessThanOrEqual(100);
        expect(factor.description).toBeDefined();
      }
    });

    it('should generate risk predictions', async () => {
      const request: PredictRiskRequest = {
        studentId: 'test-student-1'
      };

      const response = await service.predictRisk(request);

      expect(response.success).toBe(true);
      expect(Array.isArray(response.riskAssessment.predictions)).toBe(true);
      
      for (const prediction of response.riskAssessment.predictions) {
        expect(prediction.outcomeType).toMatch(/dropout|academic_probation|course_failure|delayed_graduation/);
        expect(prediction.probability).toBeGreaterThanOrEqual(0);
        expect(prediction.probability).toBeLessThanOrEqual(100);
        expect(prediction.timeframe).toBeDefined();
        expect(typeof prediction.preventable).toBe('boolean');
        expect(Array.isArray(prediction.preventionStrategies)).toBe(true);
      }
    });

    it('should include interventions when requested', async () => {
      const request: PredictRiskRequest = {
        studentId: 'test-student-1',
        includeInterventions: true
      };

      const response = await service.predictRisk(request);

      expect(response.success).toBe(true);
      expect(Array.isArray(response.riskAssessment.recommendedInterventions)).toBe(true);
      
      for (const intervention of response.riskAssessment.recommendedInterventions) {
        expect(intervention.actionType).toBeDefined();
        expect(intervention.description).toBeDefined();
        expect(intervention.priority).toBeGreaterThan(0);
        expect(intervention.estimatedImpact).toBeGreaterThanOrEqual(0);
        expect(intervention.estimatedImpact).toBeLessThanOrEqual(100);
      }
    });

    it('should identify urgent actions for high-risk students', async () => {
      const request: PredictRiskRequest = {
        studentId: 'test-student-1',
        includeInterventions: true
      };

      const response = await service.predictRisk(request);

      expect(response.success).toBe(true);
      
      if (response.urgentActions) {
        expect(Array.isArray(response.urgentActions)).toBe(true);
        expect(response.urgentActions.length).toBeGreaterThan(0);
        
        for (const action of response.urgentActions) {
          expect(action.priority).toBeLessThanOrEqual(2);
        }
      }
    });

    it('should include confidence score', async () => {
      const request: PredictRiskRequest = {
        studentId: 'test-student-1'
      };

      const response = await service.predictRisk(request);

      expect(response.success).toBe(true);
      expect(response.riskAssessment.confidence).toBeGreaterThanOrEqual(0);
      expect(response.riskAssessment.confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('trackInterventionEffectiveness', () => {
    it('should track intervention effectiveness', async () => {
      const result = await service.trackInterventionEffectiveness(
        'test-student-1',
        'intervention-123'
      );

      expect(result).toBeDefined();
      expect(typeof result.effective).toBe('boolean');
      expect(typeof result.improvement).toBe('number');
      expect(result.notes).toBeDefined();
    });

    it('should calculate improvement score', async () => {
      const result = await service.trackInterventionEffectiveness(
        'test-student-1',
        'intervention-123'
      );

      expect(typeof result.improvement).toBe('number');
    });
  });
});
