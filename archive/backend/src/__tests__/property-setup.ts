/**
 * Property-Based Test Setup for ScrollLibrary
 * Configuration and utilities for fast-check property testing
 */

import * as fc from 'fast-check';

// Configure fast-check globally
fc.configureGlobal({
  numRuns: 100,
  timeout: 30000,
  seed: 42, // For reproducible tests
  verbose: true,
  asyncReporter: async (runDetails) => {
    if (runDetails.failed) {
      console.error('Property test failed:', runDetails.counterexample);
      console.error('Seed:', runDetails.seed);
      console.error('Path:', runDetails.counterexamplePath);
    }
  }
});

// Basic generators
const academicLevel = fc.constantFrom('beginner', 'intermediate', 'advanced');
const subject = fc.constantFrom('Theology', 'Philosophy', 'Computer Science', 'Business', 'Education');
const searchType = fc.constantFrom('semantic', 'prophetic', 'keyword');
const diagramType = fc.constantFrom('mermaid', 'chart', 'illustration');
const referenceType = fc.constantFrom('academic', 'biblical', 'web');
const questionType = fc.constantFrom('multiple-choice', 'essay', 'short-answer');
const exportFormat = fc.constantFrom('pdf', 'epub', 'html', 'print-ready');

// Book title generator (scroll-appropriate)
const bookTitle = fc.oneof(
  fc.constant('Foundations of Biblical Worldview'),
  fc.constant('Kingdom Principles for Modern Leadership'),
  fc.constant('Transforming Systems Through Divine Wisdom'),
  fc.constant('Called to Excellence: A Christian Approach'),
  fc.constant('Sacred Stewardship in Professional Life'),
  fc.string({ minLength: 10, maxLength: 100 }).map(s => `Divine Perspectives on ${s}`)
);

// Scroll-aligned content generator
const scrollContent = fc.string({ minLength: 100, maxLength: 2000 }).map(content => 
  `# Chapter Title\n\n${content}\n\n## Biblical Foundation\n\nScripture reveals...\n\n## Kingdom Application\n\nAs believers called to transform systems...\n\n## Reflection Questions\n\n1. How does this impact your calling?\n2. What systems might God be calling you to influence?`
);

// Chapter spec generator
const chapterSpec = fc.record({
  title: fc.string({ minLength: 5, maxLength: 100 }),
  orderIndex: fc.integer({ min: 1, max: 20 }),
  topics: fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
  learningObjectives: fc.array(fc.string({ minLength: 10, maxLength: 200 }), { minLength: 1, maxLength: 5 })
});

// Custom generators for ScrollLibrary domain objects
export const scrollLibraryGenerators = {
  // Basic generators
  academicLevel,
  subject,
  searchType,
  diagramType,
  referenceType,
  questionType,
  exportFormat,
  bookTitle,
  scrollContent,
  chapterSpec,
  
  // Course outline generator
  courseOutline: fc.record({
    title: bookTitle,
    subject: subject,
    level: academicLevel,
    chapters: fc.array(chapterSpec, { minLength: 1, maxLength: 15 }),
    courseReference: fc.option(fc.string({ minLength: 5, maxLength: 20 }))
  }),
  
  // Book input generator
  bookInput: fc.record({
    title: bookTitle,
    subtitle: fc.option(fc.string({ minLength: 5, maxLength: 100 })),
    subject: subject,
    level: academicLevel,
    courseReference: fc.option(fc.string({ minLength: 5, maxLength: 20 }))
  }),
  
  // Search query generator
  searchQuery: fc.record({
    query: fc.oneof(
      fc.constant('biblical worldview'),
      fc.constant('kingdom principles'),
      fc.constant('divine calling'),
      fc.constant('spiritual formation'),
      fc.constant('Christian leadership'),
      fc.string({ minLength: 3, maxLength: 100 })
    ),
    type: searchType,
    limit: fc.option(fc.integer({ min: 1, max: 100 })),
    filters: fc.option(fc.record({
      subject: fc.option(subject),
      level: fc.option(academicLevel),
      courseId: fc.option(fc.string({ minLength: 5, maxLength: 20 }))
    }))
  }),
  
  // Chapter context generator
  chapterContext: fc.record({
    bookTitle: bookTitle,
    chapterNumber: fc.integer({ min: 1, max: 20 }),
    previousChapters: fc.array(fc.string({ minLength: 5, maxLength: 50 }), { maxLength: 10 }),
    learningObjectives: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
    targetAudience: academicLevel
  }),
  
  // Book metadata generator
  bookMetadata: fc.record({
    authorAgent: fc.constant('ScrollAuthorGPT'),
    version: fc.string({ minLength: 3, maxLength: 10 }),
    scrollIntegrityHash: fc.string({ minLength: 32, maxLength: 64 }),
    generationDate: fc.date(),
    lastValidated: fc.date(),
    qualityScore: fc.float({ min: 0, max: 1 }),
    theologicalAlignment: fc.float({ min: 0, max: 1 })
  })
};

// Property test utilities
export const propertyTestUtils = {
  // Verify scroll tone in content
  hasScrollTone: (content: string): boolean => {
    const scrollKeywords = ['kingdom', 'calling', 'Lord', 'Biblical', 'divine', 'Scripture', 'Christ', 'God'];
    return scrollKeywords.some(keyword => content.toLowerCase().includes(keyword.toLowerCase()));
  },
  
  // Verify biblical integration
  hasBiblicalIntegration: (content: string): boolean => {
    const biblicalIndicators = ['Scripture', 'Biblical', 'Bible', 'God', 'Christ', 'Lord', 'faith'];
    return biblicalIndicators.some(indicator => content.includes(indicator));
  },
  
  // Verify academic structure
  hasAcademicStructure: (content: string): boolean => {
    return content.includes('#') && // Has headers
           content.length > 100 && // Substantial content
           (content.includes('##') || content.includes('###')); // Has subsections
  },
  
  // Verify book structure
  isValidBookStructure: (book: any): boolean => {
    const requiredFields = ['id', 'title', 'subject', 'level', 'metadata', 'createdAt', 'updatedAt'];
    return requiredFields.every(field => field in book);
  },
  
  // Verify search result structure
  isValidSearchResult: (result: any): boolean => {
    const requiredFields = ['bookId', 'title', 'excerpt', 'relevanceScore', 'conceptConnections'];
    return requiredFields.every(field => field in result) &&
           result.relevanceScore >= 0 && result.relevanceScore <= 1 &&
           Array.isArray(result.conceptConnections);
  },
  
  // Verify theological alignment score
  isValidTheologicalAlignment: (score: number): boolean => {
    return score >= 0 && score <= 1;
  },
  
  // Verify quality score
  isValidQualityScore: (score: number): boolean => {
    return score >= 0 && score <= 1;
  }
};

// Global property test configuration
global.propertyTestConfig = {
  numRuns: 100,
  timeout: 30000,
  seed: 42,
  generators: scrollLibraryGenerators,
  utils: propertyTestUtils
};

// Extend global types
declare global {
  var propertyTestConfig: {
    numRuns: number;
    timeout: number;
    seed: number;
    generators: typeof scrollLibraryGenerators;
    utils: typeof propertyTestUtils;
  };
}

export {};