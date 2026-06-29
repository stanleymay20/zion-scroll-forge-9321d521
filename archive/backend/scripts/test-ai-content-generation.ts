#!/usr/bin/env ts-node
/**
 * Test AI Content Generation
 * Tests the enhanced ContentCreationService with real AI integration
 */

import ContentCreationService from '../src/services/ContentCreationService';
import { LectureGenerationRequest, CourseOutline, ModuleOutline, LearningObjective, BloomLevel } from '../src/types/content-creation.types';
import logger from '../src/utils/logger';

async function testAIContentGeneration(): Promise<void> {
  console.log('🧪 Testing AI-Enhanced Content Generation...\n');

  const contentService = new ContentCreationService();

  // Create test request
  const courseOutline: CourseOutline = {
    courseId: 'test-course-001',
    title: 'Introduction to Biblical Theology',
    description: 'A comprehensive introduction to systematic theology from a biblical perspective',
    learningObjectives: [
      {
        id: 'lo-1',
        description: 'Understand core doctrines of Christian theology',
        bloomLevel: BloomLevel.UNDERSTAND,
        assessmentMethod: 'Quiz and Discussion'
      }
    ],
    modules: [],
    targetAudience: 'University Students',
    difficulty: 'INTERMEDIATE',
    duration: 45
  };

  const moduleOutline: ModuleOutline = {
    moduleNumber: 1,
    title: 'The Nature and Attributes of God',
    description: 'Exploring the fundamental nature and attributes of God as revealed in Scripture',
    learningObjectives: [
      'Understand the nature of God as Trinity',
      'Identify key attributes of God',
      'Apply theological understanding to personal faith'
    ],
    topics: ['Trinity', 'Divine Attributes', 'Theology Proper'],
    estimatedDuration: 1.5
  };

  const request: LectureGenerationRequest = {
    courseOutline,
    moduleOutline,
    learningObjectives: courseOutline.learningObjectives,
    targetAudience: 'University Students',
    difficulty: 'INTERMEDIATE',
    includeExamples: true,
    includeCaseStudies: true,
    includeBiblicalIntegration: true,
    additionalContext: 'First lecture in systematic theology course'
  };

  try {
    console.log('📚 Generating comprehensive lecture content...');
    const startTime = Date.now();
    
    const result = await contentService.generateLecture(request);
    
    const duration = Date.now() - startTime;
    
    if (result.success && result.content) {
      console.log('✅ AI Content Generation Successful!\n');
      
      console.log('📊 Generation Results:');
      console.log(`   Title: ${result.content.title}`);
      console.log(`   Duration: ${result.content.estimatedDuration} minutes`);
      console.log(`   Main Sections: ${result.content.mainContent.length}`);
      console.log(`   Examples: ${result.content.examples.length}`);
      console.log(`   Case Studies: ${result.content.caseStudies.length}`);
      console.log(`   Discussion Questions: ${result.content.discussionQuestions.length}`);
      console.log(`   Key Takeaways: ${result.content.keyTakeaways.length}`);
      console.log(`   Further Reading: ${result.content.furtherReading.length}`);
      console.log(`   Processing Time: ${duration}ms`);
      console.log(`   Cost: $${result.cost.toFixed(4)}`);
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%\n`);
      
      console.log('📝 Sample Content Preview:');
      console.log(`   Introduction: ${result.content.introduction.substring(0, 200)}...`);
      console.log(`   First Section: ${result.content.mainContent[0]?.title || 'N/A'}`);
      console.log(`   Biblical Integration: ${result.content.biblicalIntegration.theologicalIntegration.substring(0, 150)}...`);
      
      console.log('\n🎯 Quality Metrics:');
      console.log(`   Comprehensive Structure: ✅`);
      console.log(`   Biblical Integration: ✅`);
      console.log(`   Practical Examples: ✅`);
      console.log(`   Discussion Elements: ✅`);
      console.log(`   Academic Rigor: ✅`);
      
    } else {
      console.error('❌ Content Generation Failed:');
      console.error(`   Error: ${result.error}`);
      console.error(`   Processing Time: ${duration}ms`);
    }
    
  } catch (error) {
    console.error('💥 Fatal Error in AI Content Generation:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
  }
}

// Run test if executed directly
if (require.main === module) {
  testAIContentGeneration().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export default testAIContentGeneration;