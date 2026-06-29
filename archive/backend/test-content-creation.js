// Standalone test for Content Creation Service
const { execSync } = require('child_process');

console.log('Testing Content Creation Service...\n');

// Test 1: Check if service can be imported
console.log('✓ Test 1: Import ContentCreationService');
try {
  require('./dist/services/ContentCreationService.js');
  console.log('  SUCCESS: Service imported\n');
} catch (error) {
  console.log('  Building TypeScript first...');
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('  SUCCESS: Service built and imported\n');
}

// Test 2: Create service instance
console.log('✓ Test 2: Create service instance');
const ContentCreationService = require('./dist/services/ContentCreationService.js').default;
const service = new ContentCreationService();
console.log('  SUCCESS: Service instance created\n');

// Test 3: Generate lecture
console.log('✓ Test 3: Generate lecture content');
const lectureRequest = {
  courseOutline: {
    courseId: 'course_001',
    title: 'Introduction to AI',
    description: 'Foundational AI concepts',
    learningObjectives: [],
    modules: [],
    targetAudience: 'Undergraduate students',
    difficulty: 'BEGINNER',
    duration: 40
  },
  moduleOutline: {
    moduleNumber: 1,
    title: 'What is Artificial Intelligence?',
    description: 'Introduction to AI fundamentals',
    learningObjectives: ['Understand AI basics'],
    topics: ['AI definition', 'AI history', 'AI applications'],
    estimatedDuration: 2
  },
  learningObjectives: [
    {
      id: 'obj_001',
      description: 'Define artificial intelligence',
      bloomLevel: 'UNDERSTAND',
      assessmentMethod: 'Quiz'
    }
  ],
  targetAudience: 'Undergraduate students',
  difficulty: 'BEGINNER',
  includeExamples: true,
  includeCaseStudies: true,
  includeBiblicalIntegration: true
};

service.generateLecture(lectureRequest).then(result => {
  if (result.success && result.content) {
    console.log('  SUCCESS: Lecture generated');
    console.log(`  - Title: ${result.content.title}`);
    console.log(`  - Sections: ${result.content.mainContent.length}`);
    console.log(`  - Confidence: ${result.confidence}`);
    console.log(`  - Cost: $${result.cost}\n`);
  } else {
    console.log('  FAILED:', result.error);
    process.exit(1);
  }

  // Test 4: Generate assessment
  console.log('✓ Test 4: Generate assessment');
  const assessmentRequest = {
    courseId: 'course_001',
    topic: 'Introduction to AI',
    learningObjectives: [
      {
        id: 'obj_001',
        description: 'Define artificial intelligence',
        bloomLevel: 'UNDERSTAND',
        assessmentMethod: 'Quiz'
      }
    ],
    assessmentType: 'QUIZ',
    difficulty: 'EASY',
    numberOfQuestions: 5,
    uniquenessRequired: false
  };

  return service.generateAssessment(assessmentRequest);
}).then(result => {
  if (result.success && result.content) {
    console.log('  SUCCESS: Assessment generated');
    console.log(`  - Type: ${result.content.type}`);
    console.log(`  - Questions: ${result.content.questions.length}`);
    console.log(`  - Confidence: ${result.confidence}`);
    console.log(`  - Cost: $${result.cost}\n`);
  } else {
    console.log('  FAILED:', result.error);
    process.exit(1);
  }

  // Test 5: Curate resources
  console.log('✓ Test 5: Curate resources');
  const resourceRequest = {
    topic: 'Machine Learning',
    learningObjectives: [],
    academicLevel: 'INTERMEDIATE',
    searchCriteria: {
      topic: 'Machine Learning',
      learningObjectives: [],
      maxResults: 10
    },
    maxResources: 5
  };

  return service.curateResources(resourceRequest);
}).then(result => {
  if (result.success && result.content) {
    console.log('  SUCCESS: Resources curated');
    console.log(`  - Resources found: ${result.content.length}`);
    console.log(`  - Confidence: ${result.confidence}`);
    console.log(`  - Cost: $${result.cost}\n`);
  } else {
    console.log('  FAILED:', result.error);
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════');
  console.log('✅ ALL TESTS PASSED!');
  console.log('═══════════════════════════════════════════════');
  console.log('\nContent Creation System is working correctly!');
  process.exit(0);
}).catch(error => {
  console.log('\n❌ TEST FAILED:', error.message);
  process.exit(1);
});
