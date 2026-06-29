/**
 * Validation Script for Competitive Analysis System Setup
 * Supporting requirements 1.1, 1.2, 1.3, 1.4 for infrastructure validation
 */

import { PrismaClient } from '@prisma/client';
import { CompetitiveAnalysisEngine } from '../../src/services/CompetitiveAnalysisEngine';
import { CompetitiveDataCollectionService } from '../../src/services/CompetitiveDataCollectionService';

const prisma = new PrismaClient();

interface ValidationResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

async function validateCompetitiveAnalysisSetup(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  console.log('🔍 Validating Competitive Analysis System Setup...');
  console.log('=' .repeat(60));

  // 1. Database Schema Validation
  try {
    console.log('📊 Validating database schema...');
    
    // Check if all required tables exist
    const tables = [
      'competitive_analyses',
      'research_data', 
      'platform_profiles',
      'feature_comparisons',
      'strategic_recommendations',
      'market_opportunities',
      'intelligence_sources'
    ];

    for (const table of tables) {
      try {
        const count = await prisma.$queryRaw`SELECT COUNT(*) FROM ${table}`;
        results.push({
          component: `Database Table: ${table}`,
          status: 'pass',
          message: `Table exists and accessible`,
          details: { recordCount: count }
        });
      } catch (error) {
        results.push({
          component: `Database Table: ${table}`,
          status: 'fail',
          message: `Table not found or inaccessible: ${error.message}`
        });
      }
    }

  } catch (error) {
    results.push({
      component: 'Database Schema',
      status: 'fail',
      message: `Schema validation failed: ${error.message}`
    });
  }

  // 2. Data Models Validation
  try {
    console.log('🏗️ Validating data models...');
    
    // Test competitive analysis creation
    const testAnalysis = await prisma.competitiveAnalysis.create({
      data: {
        analysisDate: new Date(),
        scrollUniversityData: JSON.stringify({ test: 'data' }),
        learntubeAiData: JSON.stringify({ test: 'data' }),
        comparisonMatrix: JSON.stringify({ test: 'matrix' }),
        marketAnalysis: JSON.stringify({ test: 'analysis' }),
        strategicRecommendations: JSON.stringify([]),
        version: 'test-1.0.0'
      }
    });

    // Test feature comparison creation
    await prisma.featureComparison.create({
      data: {
        analysisId: testAnalysis.id,
        featureName: 'Test Feature',
        category: 'test-category',
        scrollUniversityAvailability: 'available',
        learntubeAiAvailability: 'unavailable',
        competitiveAdvantage: 'scrolluniversity',
        strategicImportance: 'high',
        spiritualAlignment: true,
        kingdomPurpose: true
      }
    });

    // Clean up test data
    await prisma.featureComparison.deleteMany({
      where: { analysisId: testAnalysis.id }
    });
    await prisma.competitiveAnalysis.delete({
      where: { id: testAnalysis.id }
    });

    results.push({
      component: 'Data Models',
      status: 'pass',
      message: 'All data models working correctly'
    });

  } catch (error) {
    results.push({
      component: 'Data Models',
      status: 'fail',
      message: `Data model validation failed: ${error.message}`
    });
  }

  // 3. Service Layer Validation
  try {
    console.log('⚙️ Validating service layer...');
    
    // Test CompetitiveDataCollectionService
    const config = {
      updateFrequency: 'weekly' as const,
      dataSourcePriority: { 'internal': 1.0 },
      spiritualAlignmentWeight: 0.3,
      kingdomPurposeWeight: 0.25,
      featureCategoryWeights: {
        'core-education': 0.15,
        'ai-capabilities': 0.20,
        'community-features': 0.10,
        'spiritual-formation': 0.15,
        'blockchain-integration': 0.10,
        'global-accessibility': 0.15,
        'assessment-evaluation': 0.05,
        'credentialing': 0.05,
        'economic-model': 0.10,
        'xr-integration': 0.05
      },
      confidenceThreshold: 0.7
    };

    const dataCollectionService = new CompetitiveDataCollectionService(config);
    
    // Test platform data collection
    const scrollUniversityData = await dataCollectionService.collectPlatformData('scrolluniversity');
    const learnTubeAIData = await dataCollectionService.collectPlatformData('learntube_ai');

    if (scrollUniversityData.name === 'ScrollUniversity' && learnTubeAIData.name === 'LearnTube.ai') {
      results.push({
        component: 'Data Collection Service',
        status: 'pass',
        message: 'Platform data collection working correctly',
        details: {
          scrollUniversityFeatures: scrollUniversityData.features.length,
          learnTubeAIFeatures: learnTubeAIData.features.length
        }
      });
    } else {
      results.push({
        component: 'Data Collection Service',
        status: 'fail',
        message: 'Platform data collection returned incorrect data'
      });
    }

    // Test CompetitiveAnalysisEngine
    const analysisEngine = new CompetitiveAnalysisEngine(config);
    
    // Test analysis generation (without storing)
    const testConfig = analysisEngine.getConfig();
    if (testConfig.updateFrequency === 'weekly') {
      results.push({
        component: 'Analysis Engine',
        status: 'pass',
        message: 'Analysis engine initialized correctly'
      });
    } else {
      results.push({
        component: 'Analysis Engine',
        status: 'fail',
        message: 'Analysis engine configuration incorrect'
      });
    }

  } catch (error) {
    results.push({
      component: 'Service Layer',
      status: 'fail',
      message: `Service validation failed: ${error.message}`
    });
  }

  // 4. Data Integrity Validation
  try {
    console.log('🔒 Validating data integrity...');
    
    // Check for required seed data
    const intelligenceSourcesCount = await prisma.intelligenceSource.count();
    const researchDataCount = await prisma.researchData.count();
    const platformProfilesCount = await prisma.platformProfile.count();

    if (intelligenceSourcesCount > 0 && researchDataCount > 0 && platformProfilesCount > 0) {
      results.push({
        component: 'Seed Data',
        status: 'pass',
        message: 'Required seed data present',
        details: {
          intelligenceSources: intelligenceSourcesCount,
          researchData: researchDataCount,
          platformProfiles: platformProfilesCount
        }
      });
    } else {
      results.push({
        component: 'Seed Data',
        status: 'warning',
        message: 'Some seed data missing - run seed script',
        details: {
          intelligenceSources: intelligenceSourcesCount,
          researchData: researchDataCount,
          platformProfiles: platformProfilesCount
        }
      });
    }

    // Validate spiritual alignment data
    const spiritualDataCount = await prisma.researchData.count({
      where: { spiritualAlignment: true }
    });

    if (spiritualDataCount > 0) {
      results.push({
        component: 'Spiritual Alignment',
        status: 'pass',
        message: 'Spiritual alignment data present',
        details: { spiritualDataCount }
      });
    } else {
      results.push({
        component: 'Spiritual Alignment',
        status: 'warning',
        message: 'No spiritual alignment data found'
      });
    }

  } catch (error) {
    results.push({
      component: 'Data Integrity',
      status: 'fail',
      message: `Data integrity validation failed: ${error.message}`
    });
  }

  // 5. Requirements Validation
  try {
    console.log('📋 Validating requirements compliance...');
    
    // Requirement 1.1: Document platform architecture differences
    const architectureData = await prisma.researchData.count({
      where: { 
        dataType: 'technology',
        content: { contains: 'architecture' }
      }
    });

    if (architectureData > 0) {
      results.push({
        component: 'Requirement 1.1',
        status: 'pass',
        message: 'Platform architecture comparison data available'
      });
    } else {
      results.push({
        component: 'Requirement 1.1',
        status: 'warning',
        message: 'Limited platform architecture comparison data'
      });
    }

    // Requirement 1.2: Highlight advanced AI integration
    const aiData = await prisma.researchData.count({
      where: { 
        tags: { contains: 'prophetic-ai' }
      }
    });

    if (aiData > 0) {
      results.push({
        component: 'Requirement 1.2',
        status: 'pass',
        message: 'Advanced AI integration data available'
      });
    } else {
      results.push({
        component: 'Requirement 1.2',
        status: 'warning',
        message: 'Limited AI integration comparison data'
      });
    }

    // Requirement 1.3: Demonstrate global accessibility features
    const accessibilityData = await prisma.researchData.count({
      where: { 
        tags: { contains: 'global-accessibility' }
      }
    });

    if (accessibilityData > 0) {
      results.push({
        component: 'Requirement 1.3',
        status: 'pass',
        message: 'Global accessibility comparison data available'
      });
    } else {
      results.push({
        component: 'Requirement 1.3',
        status: 'warning',
        message: 'Limited global accessibility comparison data'
      });
    }

    // Requirement 1.4: Showcase comprehensive API ecosystem
    const apiData = await prisma.researchData.count({
      where: { 
        OR: [
          { tags: { contains: 'api' } },
          { tags: { contains: 'integration' } }
        ]
      }
    });

    if (apiData > 0) {
      results.push({
        component: 'Requirement 1.4',
        status: 'pass',
        message: 'API ecosystem comparison data available'
      });
    } else {
      results.push({
        component: 'Requirement 1.4',
        status: 'warning',
        message: 'Limited API ecosystem comparison data'
      });
    }

  } catch (error) {
    results.push({
      component: 'Requirements Validation',
      status: 'fail',
      message: `Requirements validation failed: ${error.message}`
    });
  }

  return results;
}

function printValidationResults(results: ValidationResult[]) {
  console.log('\n📊 Validation Results Summary');
  console.log('=' .repeat(60));

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warning').length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`📊 Total: ${results.length}`);

  console.log('\n📋 Detailed Results:');
  console.log('-' .repeat(60));

  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${result.component}: ${result.message}`);
    
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  });

  return { passed, failed, warnings, total: results.length };
}

async function main() {
  console.log('🎯 ScrollUniversity Competitive Analysis System Validation');
  console.log('=' .repeat(60));

  try {
    await prisma.$connect();
    console.log('✅ Database connection established\n');

    const results = await validateCompetitiveAnalysisSetup();
    const summary = printValidationResults(results);

    console.log('\n🎯 Validation Summary:');
    if (summary.failed === 0) {
      console.log('🎉 All critical validations passed!');
      if (summary.warnings > 0) {
        console.log('⚠️  Some warnings detected - review recommended');
      }
      console.log('\n✅ Competitive Analysis System is ready for use!');
      process.exit(0);
    } else {
      console.log('❌ Some validations failed - system may not function correctly');
      console.log('Please address the failed validations before proceeding.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export { validateCompetitiveAnalysisSetup };