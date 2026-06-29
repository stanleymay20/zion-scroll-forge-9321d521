/**
 * ScrollUniversity Admissions Predictive Analytics Validation Script
 * "Test all things; hold fast what is good" - 1 Thessalonians 5:21
 * 
 * Validates the predictive analytics implementation
 */

import { PrismaClient } from '@prisma/client';
import PredictiveAnalyticsService from '../src/services/admissions/PredictiveAnalyticsService';

const prisma = new PrismaClient();
const predictiveAnalyticsService = new PredictiveAnalyticsService();

interface ValidationResult {
  component: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

class PredictiveAnalyticsValidator {
  private results: ValidationResult[] = [];

  private addResult(component: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, details?: any): void {
    this.results.push({ component, status, message, details });
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${emoji} ${component}: ${message}`);
    if (details) {
      console.log(`   Details:`, details);
    }
  }

  async validateDatabaseSchema(): Promise<void> {
    console.log('\n🔍 Validating Database Schema...');

    try {
      // Check if predictive analytics tables exist
      const tables = [
        'predictive_models',
        'admission_success_predictions',
        'yield_predictions',
        'enrollment_forecasts',
        'process_improvement_recommendations',
        'quality_assurance_recommendations',
        'model_performance_tracking',
        'predictive_analytics_audit'
      ];

      for (const table of tables) {
        try {
          await prisma.$queryRaw`SELECT 1 FROM ${table} LIMIT 1`;
          this.addResult('Database Schema', 'PASS', `Table ${table} exists`);
        } catch (error) {
          this.addResult('Database Schema', 'FAIL', `Table ${table} missing`, { error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      // Check indexes
      const indexQuery = `
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE tablename IN ('predictive_models', 'admission_success_predictions', 'yield_predictions')
        AND indexname LIKE 'idx_%'
      `;

      const indexes = await prisma.$queryRawUnsafe(indexQuery);
      if (Array.isArray(indexes) && indexes.length > 0) {
        this.addResult('Database Schema', 'PASS', `Found ${indexes.length} performance indexes`);
      } else {
        this.addResult('Database Schema', 'WARNING', 'No performance indexes found');
      }

    } catch (error) {
      this.addResult('Database Schema', 'FAIL', 'Database schema validation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async validateAdmissionSuccessModel(): Promise<void> {
    console.log('\n🤖 Validating Admission Success Model...');

    try {
      // Create sample historical data
      await this.createSampleData();

      // Build the model
      const model = await predictiveAnalyticsService.buildAdmissionSuccessModel();

      this.addResult('Admission Success Model', 'PASS', 'Model built successfully', {
        modelId: model.modelId,
        accuracy: model.accuracy,
        featureCount: model.features.length
      });

      // Validate model properties
      if (model.accuracy >= 0.6 && model.accuracy <= 1.0) {
        this.addResult('Model Accuracy', 'PASS', `Accuracy within acceptable range: ${model.accuracy}`);
      } else {
        this.addResult('Model Accuracy', 'FAIL', `Accuracy out of range: ${model.accuracy}`);
      }

      if (model.features.length >= 5) {
        this.addResult('Model Features', 'PASS', `Sufficient features: ${model.features.length}`);
      } else {
        this.addResult('Model Features', 'WARNING', `Limited features: ${model.features.length}`);
      }

      // Test prediction
      const sampleApplicant = await this.createSampleApplicant();
      const prediction = await predictiveAnalyticsService.predictAdmissionSuccess(sampleApplicant.id);

      this.addResult('Admission Prediction', 'PASS', 'Prediction generated successfully', {
        applicantId: prediction.applicantId,
        successProbability: prediction.successProbability,
        keyFactorsCount: prediction.keyFactors.length,
        recommendationsCount: prediction.recommendations.length
      });

      // Validate prediction properties
      if (prediction.successProbability >= 0 && prediction.successProbability <= 1) {
        this.addResult('Prediction Probability', 'PASS', 'Success probability in valid range');
      } else {
        this.addResult('Prediction Probability', 'FAIL', 'Success probability out of range');
      }

      if (prediction.keyFactors.length > 0) {
        this.addResult('Key Factors', 'PASS', `Key factors identified: ${prediction.keyFactors.length}`);
      } else {
        this.addResult('Key Factors', 'WARNING', 'No key factors identified');
      }

    } catch (error) {
      this.addResult('Admission Success Model', 'FAIL', 'Model validation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async validateYieldPrediction(): Promise<void> {
    console.log('\n📈 Validating Yield Prediction...');

    try {
      const predictions = await predictiveAnalyticsService.predictYieldRates();

      this.addResult('Yield Prediction', 'PASS', 'Yield predictions generated', {
        programCount: predictions.length
      });

      // Validate prediction properties
      for (const prediction of predictions) {
        if (prediction.predictedYieldRate >= 0 && prediction.predictedYieldRate <= 100) {
          this.addResult('Yield Rate Range', 'PASS', `${prediction.programType}: ${prediction.predictedYieldRate}%`);
        } else {
          this.addResult('Yield Rate Range', 'FAIL', `${prediction.programType}: Invalid rate ${prediction.predictedYieldRate}%`);
        }

        if (prediction.confidenceInterval.lower <= prediction.confidenceInterval.upper) {
          this.addResult('Confidence Interval', 'PASS', `${prediction.programType}: Valid confidence interval`);
        } else {
          this.addResult('Confidence Interval', 'FAIL', `${prediction.programType}: Invalid confidence interval`);
        }
      }

    } catch (error) {
      this.addResult('Yield Prediction', 'FAIL', 'Yield prediction validation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async validateEnrollmentForecast(): Promise<void> {
    console.log('\n🔮 Validating Enrollment Forecast...');

    try {
      const forecast = await predictiveAnalyticsService.generateEnrollmentForecast('Q1_2024');

      this.addResult('Enrollment Forecast', 'PASS', 'Enrollment forecast generated', {
        forecastPeriod: forecast.forecastPeriod,
        predictedEnrollment: forecast.predictedEnrollment,
        capacityUtilization: forecast.capacityUtilization
      });

      // Validate forecast properties
      if (forecast.predictedEnrollment >= 0) {
        this.addResult('Predicted Enrollment', 'PASS', `Valid enrollment prediction: ${forecast.predictedEnrollment}`);
      } else {
        this.addResult('Predicted Enrollment', 'FAIL', `Invalid enrollment prediction: ${forecast.predictedEnrollment}`);
      }

      if (forecast.capacityUtilization >= 0 && forecast.capacityUtilization <= 200) {
        this.addResult('Capacity Utilization', 'PASS', `Valid capacity utilization: ${forecast.capacityUtilization}%`);
      } else {
        this.addResult('Capacity Utilization', 'WARNING', `Unusual capacity utilization: ${forecast.capacityUtilization}%`);
      }

      if (forecast.demandTrends.length > 0) {
        this.addResult('Demand Trends', 'PASS', `Demand trends analyzed: ${forecast.demandTrends.length} programs`);
      } else {
        this.addResult('Demand Trends', 'WARNING', 'No demand trends identified');
      }

      if (forecast.resourceRequirements.length > 0) {
        this.addResult('Resource Requirements', 'PASS', `Resource requirements calculated: ${forecast.resourceRequirements.length} resources`);
      } else {
        this.addResult('Resource Requirements', 'WARNING', 'No resource requirements calculated');
      }

    } catch (error) {
      this.addResult('Enrollment Forecast', 'FAIL', 'Enrollment forecast validation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async validateProcessImprovement(): Promise<void> {
    console.log('\n⚡ Validating Process Improvement...');

    try {
      const recommendations = await predictiveAnalyticsService.generateProcessImprovementRecommendations();

      this.addResult('Process Improvement', 'PASS', 'Process improvement recommendations generated', {
        recommendationCount: recommendations.length
      });

      // Validate recommendations
      for (const recommendation of recommendations) {
        if (recommendation.currentEfficiency >= 0 && recommendation.currentEfficiency <= 100) {
          this.addResult('Current Efficiency', 'PASS', `${recommendation.processArea}: ${recommendation.currentEfficiency}%`);
        } else {
          this.addResult('Current Efficiency', 'FAIL', `${recommendation.processArea}: Invalid efficiency ${recommendation.currentEfficiency}%`);
        }

        if (recommendation.predictedImprovement >= 0 && recommendation.predictedImprovement <= 100) {
          this.addResult('Predicted Improvement', 'PASS', `${recommendation.processArea}: ${recommendation.predictedImprovement}%`);
        } else {
          this.addResult('Predicted Improvement', 'FAIL', `${recommendation.processArea}: Invalid improvement ${recommendation.predictedImprovement}%`);
        }

        if (recommendation.recommendations.length > 0) {
          this.addResult('Recommendations', 'PASS', `${recommendation.processArea}: ${recommendation.recommendations.length} recommendations`);
        } else {
          this.addResult('Recommendations', 'WARNING', `${recommendation.processArea}: No recommendations provided`);
        }
      }

    } catch (error) {
      this.addResult('Process Improvement', 'FAIL', 'Process improvement validation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async validateQualityAssurance(): Promise<void> {
    console.log('\n🎯 Validating Quality Assurance...');

    try {
      const recommendations = await predictiveAnalyticsService.generateQualityAssuranceRecommendations();

      this.addResult('Quality Assurance', 'PASS', 'Quality assurance recommendations generated', {
        areaCount: recommendations.length
      });

      // Validate quality recommendations
      for (const recommendation of recommendations) {
        if (recommendation.currentQualityScore >= 0 && recommendation.currentQualityScore <= 100) {
          this.addResult('Current Quality Score', 'PASS', `${recommendation.area}: ${recommendation.currentQualityScore}`);
        } else {
          this.addResult('Current Quality Score', 'FAIL', `${recommendation.area}: Invalid score ${recommendation.currentQualityScore}`);
        }

        if (recommendation.targetQualityScore >= recommendation.currentQualityScore) {
          this.addResult('Target Quality Score', 'PASS', `${recommendation.area}: Realistic target ${recommendation.targetQualityScore}`);
        } else {
          this.addResult('Target Quality Score', 'WARNING', `${recommendation.area}: Target lower than current`);
        }

        if (recommendation.enhancementSuggestions.length > 0) {
          this.addResult('Enhancement Suggestions', 'PASS', `${recommendation.area}: ${recommendation.enhancementSuggestions.length} suggestions`);
        } else {
          this.addResult('Enhancement Suggestions', 'WARNING', `${recommendation.area}: No enhancement suggestions`);
        }

        if (recommendation.implementationPlan.length >= 3) {
          this.addResult('Implementation Plan', 'PASS', `${recommendation.area}: Complete implementation plan`);
        } else {
          this.addResult('Implementation Plan', 'WARNING', `${recommendation.area}: Incomplete implementation plan`);
        }
      }

    } catch (error) {
      this.addResult('Quality Assurance', 'FAIL', 'Quality assurance validation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async validateAPIEndpoints(): Promise<void> {
    console.log('\n🌐 Validating API Endpoints...');

    try {
      // This would typically use a test HTTP client
      // For now, we'll validate that the route file exists and is properly structured
      const fs = require('fs');
      const path = require('path');
      
      const routeFile = path.join(__dirname, '../src/routes/admissions/predictive-analytics.ts');
      
      if (fs.existsSync(routeFile)) {
        const routeContent = fs.readFileSync(routeFile, 'utf8');
        
        const endpoints = [
          'POST /models/admission-success',
          'GET /predict/admission-success/:applicantId',
          'GET /predict/yield-rates',
          'GET /forecast/enrollment/:period',
          'GET /recommendations/process-improvement',
          'GET /recommendations/quality-assurance',
          'GET /models',
          'GET /dashboard'
        ];

        for (const endpoint of endpoints) {
          if (routeContent.includes(endpoint.split(' ')[1])) {
            this.addResult('API Endpoints', 'PASS', `Endpoint ${endpoint} defined`);
          } else {
            this.addResult('API Endpoints', 'FAIL', `Endpoint ${endpoint} missing`);
          }
        }

        // Check for authentication middleware
        if (routeContent.includes('authenticateToken')) {
          this.addResult('API Security', 'PASS', 'Authentication middleware present');
        } else {
          this.addResult('API Security', 'FAIL', 'Authentication middleware missing');
        }

        // Check for role-based access control
        if (routeContent.includes('requireRole')) {
          this.addResult('API Authorization', 'PASS', 'Role-based access control present');
        } else {
          this.addResult('API Authorization', 'FAIL', 'Role-based access control missing');
        }

      } else {
        this.addResult('API Endpoints', 'FAIL', 'Route file not found');
      }

    } catch (error) {
      this.addResult('API Endpoints', 'FAIL', 'API endpoint validation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async validatePerformanceMetrics(): Promise<void> {
    console.log('\n📊 Validating Performance Metrics...');

    try {
      // Test model performance tracking
      const testModelId = 'test_model_' + Date.now();
      
      await prisma.model_performance_tracking.create({
        data: {
          model_id: testModelId,
          accuracy_score: 0.85,
          precision_score: 0.82,
          recall_score: 0.88,
          f1_score: 0.85,
          prediction_count: 100,
          correct_predictions: 85,
          false_positives: 8,
          false_negatives: 7,
          performance_metrics: {
            testRun: true,
            timestamp: new Date().toISOString()
          }
        }
      });

      this.addResult('Performance Tracking', 'PASS', 'Performance metrics can be stored');

      // Retrieve and validate
      const performance = await prisma.model_performance_tracking.findFirst({
        where: { model_id: testModelId }
      });

      if (performance) {
        this.addResult('Performance Retrieval', 'PASS', 'Performance metrics can be retrieved');
        
        if (performance.accuracy_score === 0.85) {
          this.addResult('Performance Data Integrity', 'PASS', 'Performance data stored correctly');
        } else {
          this.addResult('Performance Data Integrity', 'FAIL', 'Performance data corrupted');
        }
      } else {
        this.addResult('Performance Retrieval', 'FAIL', 'Performance metrics not found');
      }

      // Clean up test data
      await prisma.model_performance_tracking.deleteMany({
        where: { model_id: testModelId }
      });

    } catch (error) {
      this.addResult('Performance Metrics', 'FAIL', 'Performance metrics validation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async createSampleData(): Promise<void> {
    // Create sample applications for model training
    const sampleApplications = [
      {
        id: 'sample_app_1',
        applicant_id: 'sample_user_1',
        program_applied: 'BACHELOR_THEOLOGY',
        status: 'ACCEPTED',
        submission_date: new Date('2024-01-15'),
        application_data: { age: 25, education: 'High School' }
      },
      {
        id: 'sample_app_2',
        applicant_id: 'sample_user_2',
        program_applied: 'MASTER_MINISTRY',
        status: 'REJECTED',
        submission_date: new Date('2024-01-20'),
        application_data: { age: 30, education: 'Bachelor' }
      }
    ];

    for (const app of sampleApplications) {
      try {
        await prisma.application.upsert({
          where: { id: app.id },
          update: app,
          create: app
        });

        // Create related assessment data
        await prisma.spiritual_evaluation.upsert({
          where: { application_id: app.id },
          update: {
            spiritual_maturity: app.status === 'ACCEPTED' ? 'MATURE' : 'DEVELOPING',
            scroll_alignment: app.status === 'ACCEPTED' ? 0.85 : 0.45
          },
          create: {
            id: `spiritual_${app.id}`,
            application_id: app.id,
            personal_testimony: {},
            spiritual_maturity: app.status === 'ACCEPTED' ? 'MATURE' : 'DEVELOPING',
            character_traits: {},
            ministry_experience: {},
            calling_clarity: {},
            scroll_alignment: app.status === 'ACCEPTED' ? 0.85 : 0.45,
            recommendations: {}
          }
        });

        await prisma.academic_evaluation.upsert({
          where: { application_id: app.id },
          update: {
            learning_potential: app.status === 'ACCEPTED' ? 0.80 : 0.40
          },
          create: {
            id: `academic_${app.id}`,
            application_id: app.id,
            previous_education: {},
            academic_performance: {},
            core_skills: {},
            learning_potential: app.status === 'ACCEPTED' ? 0.80 : 0.40,
            intellectual_capacity: {},
            recommended_level: 'INTERMEDIATE',
            support_needs: {}
          }
        });

      } catch (error) {
        // Sample data creation is optional for validation
        console.log(`Note: Could not create sample data for ${app.id}`);
      }
    }
  }

  private async createSampleApplicant(): Promise<{ id: string }> {
    const applicantId = 'test_applicant_' + Date.now();
    
    try {
      await prisma.application.create({
        data: {
          id: applicantId,
          applicant_id: 'test_user_' + Date.now(),
          program_applied: 'BACHELOR_THEOLOGY',
          status: 'UNDER_REVIEW',
          submission_date: new Date(),
          application_data: { age: 24, education: 'High School' }
        }
      });

      await prisma.spiritual_evaluation.create({
        data: {
          id: `spiritual_${applicantId}`,
          application_id: applicantId,
          personal_testimony: {},
          spiritual_maturity: 'MATURE',
          character_traits: {},
          ministry_experience: {},
          calling_clarity: {},
          scroll_alignment: 0.75,
          recommendations: {}
        }
      });

      await prisma.academic_evaluation.create({
        data: {
          id: `academic_${applicantId}`,
          application_id: applicantId,
          previous_education: {},
          academic_performance: {},
          core_skills: {},
          learning_potential: 0.70,
          intellectual_capacity: {},
          recommended_level: 'INTERMEDIATE',
          support_needs: {}
        }
      });

      return { id: applicantId };
    } catch (error) {
      throw new Error(`Failed to create sample applicant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async runValidation(): Promise<void> {
    console.log('🚀 Starting ScrollUniversity Admissions Predictive Analytics Validation');
    console.log('=' .repeat(80));

    await this.validateDatabaseSchema();
    await this.validateAdmissionSuccessModel();
    await this.validateYieldPrediction();
    await this.validateEnrollmentForecast();
    await this.validateProcessImprovement();
    await this.validateQualityAssurance();
    await this.validateAPIEndpoints();
    await this.validatePerformanceMetrics();

    // Generate summary
    console.log('\n📋 Validation Summary');
    console.log('=' .repeat(50));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📊 Total: ${this.results.length}`);

    const successRate = (passed / this.results.length) * 100;
    console.log(`🎯 Success Rate: ${successRate.toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Components:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   - ${r.component}: ${r.message}`));
    }

    if (warnings > 0) {
      console.log('\n⚠️  Warnings:');
      this.results
        .filter(r => r.status === 'WARNING')
        .forEach(r => console.log(`   - ${r.component}: ${r.message}`));
    }

    console.log('\n🎉 Predictive Analytics validation completed!');
    
    if (failed === 0) {
      console.log('✨ All critical components are working correctly.');
    } else {
      console.log('🔧 Please address the failed components before proceeding.');
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new PredictiveAnalyticsValidator();
  validator.runValidation()
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

export default PredictiveAnalyticsValidator;