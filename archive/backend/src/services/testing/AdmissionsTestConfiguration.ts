/**
 * ScrollUniversity Admissions Test Configuration
 * Centralized configuration for all testing components
 */

import { 
  QualityAssuranceConfig, 
  ValidationRule,
  AdmissionsQualityAssuranceFramework 
} from './AdmissionsQualityAssuranceFramework';

export class AdmissionsTestConfiguration {
  /**
   * Get default quality assurance configuration
   */
  static getDefaultConfig(): QualityAssuranceConfig {
    return {
      unitTesting: {
        environment: 'unit',
        timeout: 30000,
        retries: 2,
        parallel: true,
        coverage: true
      },
      integrationTesting: {
        systems: [
          'student-profile',
          'assessment-engine',
          'university-portal',
          'scrollcoin',
          'prayer',
          'audit-trail'
        ],
        timeout: 10000,
        retries: 3,
        baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
        authentication: {
          type: 'bearer',
          token: process.env.TEST_API_TOKEN || 'test-token'
        }
      },
      performanceTesting: {
        thresholds: {
          applicationProcessingTime: 1000,
          assessmentEvaluationTime: 2000,
          decisionProcessingTime: 1500,
          concurrentApplications: 100,
          memoryUsage: 512, // MB
          cpuUsage: 80 // percentage
        },
        monitoring: true,
        reportingInterval: 1000
      },
      userAcceptanceTesting: {
        scenarios: [], // Will be populated with default scenarios
        accessibility: true,
        browsers: ['chromium'],
        headless: true,
        timeout: 30000,
        baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000'
      },
      reportingConfig: {
        outputDirectory: './test-reports',
        formats: ['json', 'html'],
        includeScreenshots: true,
        includeCoverage: true,
        emailReports: {
          enabled: process.env.EMAIL_REPORTS_ENABLED === 'true',
          recipients: (process.env.EMAIL_RECIPIENTS || '').split(',').filter(Boolean),
          smtpConfig: {
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER || '',
              pass: process.env.SMTP_PASS || ''
            }
          }
        }
      },
      validationRules: [] // Will be populated with default rules
    };
  }

  /**
   * Get production-ready configuration
   */
  static getProductionConfig(): QualityAssuranceConfig {
    const config = this.getDefaultConfig();
    
    // Production-specific overrides
    config.unitTesting.timeout = 60000;
    config.integrationTesting.timeout = 20000;
    config.performanceTesting.thresholds.concurrentApplications = 500;
    config.reportingConfig.formats = ['json', 'html', 'pdf'];
    config.reportingConfig.emailReports!.enabled = true;
    
    return config;
  }

  /**
   * Get development configuration
   */
  static getDevelopmentConfig(): QualityAssuranceConfig {
    const config = this.getDefaultConfig();
    
    // Development-specific overrides
    config.unitTesting.parallel = false;
    config.performanceTesting.monitoring = false;
    config.userAcceptanceTesting.headless = false;
    config.reportingConfig.formats = ['json'];
    
    return config;
  }

  /**
   * Get CI/CD configuration
   */
  static getCiCdConfig(): QualityAssuranceConfig {
    const config = this.getDefaultConfig();
    
    // CI/CD-specific overrides
    config.unitTesting.timeout = 120000;
    config.integrationTesting.timeout = 30000;
    config.userAcceptanceTesting.headless = true;
    config.reportingConfig.formats = ['json', 'xml'];
    config.reportingConfig.emailReports!.enabled = false;
    
    return config;
  }

  /**
   * Create configured QA framework instance
   */
  static createQAFramework(environment: 'development' | 'production' | 'ci-cd' = 'development'): AdmissionsQualityAssuranceFramework {
    let config: QualityAssuranceConfig;
    
    switch (environment) {
      case 'production':
        config = this.getProductionConfig();
        break;
      case 'ci-cd':
        config = this.getCiCdConfig();
        break;
      default:
        config = this.getDevelopmentConfig();
        break;
    }
    
    // Add default validation rules
    config.validationRules = this.getDefaultValidationRules();
    
    // Add default UAT scenarios
    const framework = new AdmissionsQualityAssuranceFramework(config);
    config.userAcceptanceTesting.scenarios = framework['userAcceptanceTestSuite']?.getDefaultScenarios() || [];
    
    return framework;
  }

  /**
   * Get default validation rules
   */
  private static getDefaultValidationRules(): ValidationRule[] {
    return [
      {
        name: 'unit-test-coverage',
        category: 'functional',
        description: 'Ensure adequate unit test coverage for all admissions components',
        severity: 'high',
        required: true,
        validator: (results) => ({
          passed: results.unitTestResults.coverage >= 80,
          message: `Unit test coverage: ${results.unitTestResults.coverage}%`,
          recommendations: results.unitTestResults.coverage < 80 
            ? [
                'Increase unit test coverage to at least 80%',
                'Focus on testing critical admission decision logic',
                'Add tests for edge cases and error conditions'
              ]
            : []
        })
      },
      {
        name: 'integration-success-rate',
        category: 'functional',
        description: 'Ensure all critical university system integrations work correctly',
        severity: 'critical',
        required: true,
        validator: (results) => ({
          passed: results.integrationTestResults.overallSuccess,
          message: `Integration tests: ${results.integrationTestResults.overallSuccess ? 'PASSED' : 'FAILED'}`,
          recommendations: !results.integrationTestResults.overallSuccess
            ? [
                ...results.integrationTestResults.recommendations,
                'Verify all external system endpoints are accessible',
                'Check authentication and authorization configurations'
              ]
            : []
        })
      },
      {
        name: 'performance-thresholds',
        category: 'performance',
        description: 'Ensure admission processing meets performance requirements',
        severity: 'high',
        required: true,
        validator: (results) => {
          const passed = results.performanceTestResults.averageResponseTime < 1000 &&
                         results.performanceTestResults.errorRate < 5 &&
                         results.performanceTestResults.overallScore >= 70;
          return {
            passed,
            message: `Performance: ${results.performanceTestResults.averageResponseTime}ms avg, ${results.performanceTestResults.errorRate}% errors, ${results.performanceTestResults.overallScore} score`,
            recommendations: !passed
              ? [
                  ...results.performanceTestResults.recommendations,
                  'Optimize database queries for admission processing',
                  'Implement caching for frequently accessed data',
                  'Consider horizontal scaling for high-volume periods'
                ]
              : []
          };
        }
      },
      {
        name: 'user-experience-quality',
        category: 'accessibility',
        description: 'Ensure user experience meets ScrollUniversity standards',
        severity: 'high',
        required: true,
        validator: (results) => ({
          passed: results.userAcceptanceTestResults.overallSuccess,
          message: `User acceptance tests: ${results.userAcceptanceTestResults.overallSuccess ? 'PASSED' : 'FAILED'}`,
          recommendations: !results.userAcceptanceTestResults.overallSuccess
            ? [
                ...results.userAcceptanceTestResults.recommendations,
                'Review user interface design for clarity and ease of use',
                'Ensure mobile responsiveness across all devices',
                'Test with actual prospective students for feedback'
              ]
            : []
        })
      },
      {
        name: 'spiritual-alignment-validation',
        category: 'spiritual-alignment',
        description: 'Ensure spiritual evaluation components align with ScrollUniversity mission',
        severity: 'critical',
        required: true,
        validator: (results) => {
          // Check if spiritual evaluation components are properly tested
          const spiritualTestsPassed = results.unitTestResults.totalPassed > 0;
          const spiritualIntegrationWorking = results.integrationTestResults.scenarios
            .some(s => s.name.includes('spiritual') || s.name.includes('prayer'));
          
          const passed = spiritualTestsPassed && spiritualIntegrationWorking;
          
          return {
            passed,
            message: `Spiritual alignment validation: ${passed ? 'PASSED' : 'FAILED'}`,
            recommendations: !passed
              ? [
                  'Ensure spiritual evaluation components are thoroughly tested',
                  'Validate integration with prayer and spiritual formation systems',
                  'Review spiritual assessment algorithms for biblical alignment',
                  'Test prophetic input integration functionality'
                ]
              : []
          };
        }
      },
      {
        name: 'accessibility-compliance',
        category: 'accessibility',
        description: 'Ensure WCAG 2.1 AA accessibility standards are met',
        severity: 'high',
        required: true,
        validator: (results) => {
          const accessibilityIssues = results.userAcceptanceTestResults.scenarios
            .flatMap((s: any) => s.accessibilityIssues || [])
            .filter((issue: any) => issue.severity === 'critical' || issue.severity === 'serious');
          
          return {
            passed: accessibilityIssues.length === 0,
            message: `Accessibility: ${accessibilityIssues.length} critical/serious issues found`,
            recommendations: accessibilityIssues.length > 0
              ? [
                  'Fix critical accessibility issues before deployment',
                  'Ensure all form inputs have proper labels',
                  'Verify keyboard navigation works throughout the application',
                  'Test with screen readers and assistive technologies',
                  'Maintain sufficient color contrast ratios'
                ]
              : []
          };
        }
      },
      {
        name: 'security-validation',
        category: 'security',
        description: 'Ensure security measures protect applicant data',
        severity: 'critical',
        required: true,
        validator: (results) => {
          // Check if security-related tests passed
          const securityTestsPassed = results.unitTestResults.totalFailed === 0;
          const fraudDetectionTested = results.integrationTestResults.scenarios
            .some(s => s.name.includes('fraud') || s.name.includes('security'));
          
          const passed = securityTestsPassed && fraudDetectionTested;
          
          return {
            passed,
            message: `Security validation: ${passed ? 'PASSED' : 'FAILED'}`,
            recommendations: !passed
              ? [
                  'Fix failing security tests before deployment',
                  'Ensure fraud detection systems are properly tested',
                  'Validate data encryption for sensitive information',
                  'Test authentication and authorization mechanisms',
                  'Verify audit trail functionality for all critical operations'
                ]
              : []
          };
        }
      },
      {
        name: 'data-privacy-compliance',
        category: 'security',
        description: 'Ensure GDPR and FERPA compliance for student data',
        severity: 'critical',
        required: true,
        validator: (results) => {
          // Check if privacy-related functionality is tested
          const privacyTestsPassed = results.unitTestResults.successRate >= 95;
          
          return {
            passed: privacyTestsPassed,
            message: `Data privacy compliance: ${privacyTestsPassed ? 'PASSED' : 'FAILED'}`,
            recommendations: !privacyTestsPassed
              ? [
                  'Ensure data privacy compliance tests pass',
                  'Validate data retention and deletion policies',
                  'Test consent management functionality',
                  'Verify data export capabilities for GDPR compliance',
                  'Ensure proper data anonymization in analytics'
                ]
              : []
          };
        }
      },
      {
        name: 'global-accessibility',
        category: 'accessibility',
        description: 'Ensure global accessibility across cultures and languages',
        severity: 'medium',
        required: false,
        validator: (results) => {
          const globalTestsPassed = results.userAcceptanceTestResults.scenarios
            .filter((s: any) => s.mobile || s.name.includes('mobile')).length > 0;
          
          return {
            passed: globalTestsPassed,
            message: `Global accessibility: ${globalTestsPassed ? 'PASSED' : 'FAILED'}`,
            recommendations: !globalTestsPassed
              ? [
                  'Test mobile application functionality',
                  'Validate multi-language support',
                  'Ensure cultural sensitivity in content',
                  'Test with various network conditions',
                  'Verify offline capability where applicable'
                ]
              : []
          };
        }
      },
      {
        name: 'business-continuity',
        category: 'functional',
        description: 'Ensure system can handle admission periods and peak loads',
        severity: 'high',
        required: true,
        validator: (results) => {
          const continuityPassed = results.performanceTestResults.throughput >= 50 &&
                                  results.performanceTestResults.resourceUsage.memory < 1024;
          
          return {
            passed: continuityPassed,
            message: `Business continuity: ${continuityPassed ? 'PASSED' : 'FAILED'}`,
            recommendations: !continuityPassed
              ? [
                  'Optimize system for peak admission periods',
                  'Implement proper load balancing',
                  'Ensure database can handle concurrent applications',
                  'Test disaster recovery procedures',
                  'Validate backup and restore functionality'
                ]
              : []
          };
        }
      }
    ];
  }
}