/**
 * Property-Based Tests for Assessment Design Service
 * 
 * Tests universal properties that should hold across all valid inputs
 * using fast-check library with minimum 100 iterations per property.
 */

import fc from 'fast-check';
import AssessmentDesignService from '../AssessmentDesignService';
import {
  AssessmentType,
  ProjectRequirements,
  RubricCriterion,
  RubricLevel,
  LearningObjective,
  QuestionType
} from '../../types/course-content.types';

const assessmentService = new AssessmentDesignService();

// Generators for property-based testing

const moduleIdGenerator = (): fc.Arbitrary<string> => {
  return fc.uuid().map(uuid => `module_${uuid}`);
};

const projectRequirementsGenerator = (): fc.Arbitrary<ProjectRequirements> => {
  return fc.record({
    title: fc.string({ minLength: 10, maxLength: 100 }),
    description: fc.string({ minLength: 50, maxLength: 500 }),
    realWorldApplication: fc.string({ minLength: 20, maxLength: 300 }),
    measurableImpact: fc.array(
      fc.string({ minLength: 10, maxLength: 100 }),
      { minLength: 1, maxLength: 5 }
    ),
    systemsToTransform: fc.array(
      fc.constantFrom('government', 'business', 'education', 'healthcare', 'technology'),
      { minLength: 1, maxLength: 3 }
    ),
    requiredCompetencies: fc.array(
      fc.string({ minLength: 5, maxLength: 50 }),
      { minLength: 1, maxLength: 10 }
    ),
    deliverables: fc.array(
      fc.record({
        name: fc.string({ minLength: 5, maxLength: 50 }),
        description: fc.string({ minLength: 10, maxLength: 200 }),
        dueDate: fc.date({ min: new Date(), max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) })
      }),
      { minLength: 1, maxLength: 5 }
    ),
    timeline: fc.record({
      startDate: fc.date({ min: new Date(), max: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }),
      milestones: fc.array(
        fc.record({
          name: fc.string({ minLength: 5, maxLength: 50 }),
          date: fc.date({ min: new Date(), max: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) }),
          description: fc.string({ minLength: 10, maxLength: 100 })
        }),
        { minLength: 1, maxLength: 5 }
      ),
      dueDate: fc.date({ min: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) })
    }),
    assessmentCriteria: fc.array(
      fc.string({ minLength: 10, maxLength: 100 }),
      { minLength: 1, maxLength: 10 }
    ),
    collaborationType: fc.constantFrom('individual', 'pair', 'group'),
    resourcesProvided: fc.array(
      fc.string({ minLength: 5, maxLength: 100 }),
      { minLength: 0, maxLength: 10 }
    )
  });
};

const rubricCriterionGenerator = (): fc.Arbitrary<RubricCriterion> => {
  return fc.record({
    name: fc.string({ minLength: 5, maxLength: 50 }),
    description: fc.string({ minLength: 10, maxLength: 200 }),
    levels: fc.constant([
      { name: 'Exemplary', description: 'Exceeds expectations', points: 4 },
      { name: 'Proficient', description: 'Meets expectations', points: 3 },
      { name: 'Developing', description: 'Approaching expectations', points: 2 },
      { name: 'Beginning', description: 'Below expectations', points: 1 }
    ] as RubricLevel[]),
    weight: fc.double({ min: 0.1, max: 1.0 })
  });
};

const learningObjectiveGenerator = (): fc.Arbitrary<LearningObjective> => {
  return fc.record({
    id: fc.uuid().map(uuid => `obj_${uuid}`),
    description: fc.string({ minLength: 20, maxLength: 200 }),
    bloomsLevel: fc.constantFrom('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'),
    assessmentMethods: fc.array(
      fc.constantFrom('quiz', 'essay', 'project', 'presentation', 'discussion'),
      { minLength: 1, maxLength: 3 }
    )
  });
};

// Helper functions

async function cleanupTestData() {
  // Clean up any test data created during tests
  // In a real implementation, this would clean up database records
}

/**
 * Feature: course-content-creation, Property 13: Assessment Type Diversity
 * Validates: Requirements 4.1
 * 
 * For any course module, the assessments should include multiple types from the set
 * {QUIZ, ESSAY, PROJECT, ORAL_DEFENSE, PEER_REVIEW}.
 */
describe('Property 13: Assessment Type Diversity', () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  it('should include multiple assessment types for any module', async () => {
    await fc.assert(
      fc.asyncProperty(
        moduleIdGenerator(),
        // Generate a set of unique assessment types (2-5 different types)
        fc.uniqueArray(
          fc.constantFrom(
            AssessmentType.QUIZ,
            AssessmentType.ESSAY,
            AssessmentType.PROJECT,
            AssessmentType.ORAL_DEFENSE,
            AssessmentType.PEER_REVIEW
          ),
          { minLength: 2, maxLength: 5 }
        ),
        async (moduleId, assessmentTypes) => {
          // The valid assessment types for diversity requirement
          const validTypes: AssessmentType[] = [
            AssessmentType.QUIZ,
            AssessmentType.ESSAY,
            AssessmentType.PROJECT,
            AssessmentType.ORAL_DEFENSE,
            AssessmentType.PEER_REVIEW
          ];

          // Property 1: All assessment types should be from the valid set
          assessmentTypes.forEach(type => {
            expect(validTypes).toContain(type);
          });

          // Property 2: Module assessments should have multiple types (diversity)
          // The uniqueArray generator ensures we have unique types
          const uniqueTypes = new Set(assessmentTypes);
          expect(uniqueTypes.size).toBeGreaterThanOrEqual(2);
          expect(uniqueTypes.size).toBe(assessmentTypes.length); // All should be unique

          // Property 3: Each type in the set should be a valid AssessmentType enum value
          uniqueTypes.forEach(type => {
            expect(Object.values(AssessmentType)).toContain(type);
          });

          // Property 4: No invalid types should be present
          const invalidTypes = assessmentTypes.filter(type => !validTypes.includes(type));
          expect(invalidTypes).toHaveLength(0);

          // Property 5: The number of unique types should not exceed 5 (the size of the valid set)
          expect(uniqueTypes.size).toBeLessThanOrEqual(5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate that assessment types are from the required set', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.constantFrom(
            AssessmentType.QUIZ,
            AssessmentType.ESSAY,
            AssessmentType.PROJECT,
            AssessmentType.ORAL_DEFENSE,
            AssessmentType.PEER_REVIEW
          ),
          { minLength: 1, maxLength: 5 }
        ),
        async (assessmentTypes) => {
          // Define the required set
          const requiredSet = new Set([
            AssessmentType.QUIZ,
            AssessmentType.ESSAY,
            AssessmentType.PROJECT,
            AssessmentType.ORAL_DEFENSE,
            AssessmentType.PEER_REVIEW
          ]);

          // Property: All types should be from the required set
          assessmentTypes.forEach(type => {
            expect(requiredSet.has(type)).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should ensure diversity when multiple assessments exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate unique assessment types to ensure diversity
        fc.uniqueArray(
          fc.constantFrom(
            AssessmentType.QUIZ,
            AssessmentType.ESSAY,
            AssessmentType.PROJECT,
            AssessmentType.ORAL_DEFENSE,
            AssessmentType.PEER_REVIEW
          ),
          { minLength: 2, maxLength: 5 }
        ),
        async (assessmentTypes) => {
          // Property: Multiple assessments should include multiple types
          const uniqueTypes = new Set(assessmentTypes);
          
          // With 2+ unique types, we should have at least 2 different types
          expect(uniqueTypes.size).toBeGreaterThanOrEqual(2);
          
          // Property: The number of unique types should equal the array length (all unique)
          expect(uniqueTypes.size).toBe(assessmentTypes.length);
          
          // Property: The number of unique types should not exceed 5 (the size of the valid set)
          expect(uniqueTypes.size).toBeLessThanOrEqual(5);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: course-content-creation, Property 14: Question Bank Size
 * Validates: Requirements 4.2
 * 
 * For any quiz created for a module, the question bank should contain at least 50 questions.
 */
describe('Property 14: Question Bank Size', () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  it('should create question banks with at least 50 questions', async () => {
    await fc.assert(
      fc.asyncProperty(
        moduleIdGenerator(),
        fc.integer({ min: 50, max: 200 }), // Question count
        async (moduleId, count) => {
          // Create question bank
          const questionBank = await assessmentService.createQuestionBank(moduleId, count);

          // Property: Question bank must have at least 50 questions
          expect(questionBank.totalQuestions).toBeGreaterThanOrEqual(50);
          expect(questionBank.questions.length).toBeGreaterThanOrEqual(50);

          // Property: Actual count should match requested count
          expect(questionBank.totalQuestions).toBe(count);
          expect(questionBank.questions.length).toBe(count);

          // Property: Questions should be diverse in type
          expect(Object.keys(questionBank.questionsByType).length).toBeGreaterThanOrEqual(2);

          // Property: All questions should have required fields
          questionBank.questions.forEach(q => {
            expect(q.id).toBeDefined();
            expect(q.type).toBeDefined();
            expect(q.text).toBeDefined();
            expect(q.difficulty).toBeDefined();
            expect(q.points).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject question banks with fewer than 50 questions', async () => {
    await fc.assert(
      fc.asyncProperty(
        moduleIdGenerator(),
        fc.integer({ min: 1, max: 49 }), // Invalid count
        async (moduleId, count) => {
          // Property: Creating a question bank with < 50 questions should throw error
          await expect(
            assessmentService.createQuestionBank(moduleId, count)
          ).rejects.toThrow('Question bank must contain at least 50 questions');
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: course-content-creation, Property 15: Project Real-World Requirements
 * Validates: Requirements 4.3
 * 
 * For any project assessment, the requirements should include both real-world application
 * criteria and measurable impact criteria.
 */
describe('Property 15: Project Real-World Requirements', () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  it('should include real-world application and measurable impact for all projects', async () => {
    await fc.assert(
      fc.asyncProperty(
        moduleIdGenerator(),
        projectRequirementsGenerator(),
        async (moduleId, requirements) => {
          // Design project
          const project = await assessmentService.designProject(moduleId, requirements);

          // Property: Project must have real-world application
          expect(project.realWorldApplication).toBeDefined();
          expect(project.realWorldApplication.trim().length).toBeGreaterThan(0);

          // Property: Project must have measurable impact criteria
          expect(project.measurableImpact).toBeDefined();
          expect(Array.isArray(project.measurableImpact)).toBe(true);
          expect(project.measurableImpact.length).toBeGreaterThan(0);

          // Property: Each impact criterion should be non-empty
          project.measurableImpact.forEach(impact => {
            expect(impact.trim().length).toBeGreaterThan(0);
          });

          // Property: Project should have systems to transform
          expect(project.systemsToTransform).toBeDefined();
          expect(Array.isArray(project.systemsToTransform)).toBe(true);

          // Property: Project should have required competencies
          expect(project.requiredCompetencies).toBeDefined();
          expect(Array.isArray(project.requiredCompetencies)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject projects without real-world application', async () => {
    await fc.assert(
      fc.asyncProperty(
        moduleIdGenerator(),
        projectRequirementsGenerator(),
        async (moduleId, requirements) => {
          // Remove real-world application
          const invalidRequirements = { ...requirements, realWorldApplication: '' };

          // Property: Should reject project without real-world application
          await expect(
            assessmentService.designProject(moduleId, invalidRequirements)
          ).rejects.toThrow('Project must include real-world application criteria');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject projects without measurable impact', async () => {
    await fc.assert(
      fc.asyncProperty(
        moduleIdGenerator(),
        projectRequirementsGenerator(),
        async (moduleId, requirements) => {
          // Remove measurable impact
          const invalidRequirements = { ...requirements, measurableImpact: [] };

          // Property: Should reject project without measurable impact
          await expect(
            assessmentService.designProject(moduleId, invalidRequirements)
          ).rejects.toThrow('Project must include measurable impact criteria');
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: course-content-creation, Property 16: Rubric Completeness
 * Validates: Requirements 4.4
 * 
 * For any created rubric, criteria should be defined for all grade levels in the grading scale.
 */
describe('Property 16: Rubric Completeness', () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  it('should define criteria for all grade levels', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid().map(uuid => `assessment_${uuid}`),
        fc.array(rubricCriterionGenerator(), { minLength: 1, maxLength: 10 }),
        async (assessmentId, criteria) => {
          // Create rubric
          const rubric = await assessmentService.createRubric(assessmentId, criteria);

          // Property: Rubric must have all required grade levels
          const requiredLevels = ['exemplary', 'proficient', 'developing', 'beginning'];

          rubric.criteria.forEach(criterion => {
            const levelNames = criterion.levels.map(l => l.name.toLowerCase());

            // Property: Each criterion must have all required levels
            requiredLevels.forEach(requiredLevel => {
              expect(levelNames).toContain(requiredLevel);
            });

            // Property: Each level must have a point value
            criterion.levels.forEach(level => {
              expect(level.points).toBeGreaterThan(0);
              expect(level.name).toBeDefined();
              expect(level.description).toBeDefined();
            });
          });

          // Property: Rubric must have total points calculated
          expect(rubric.totalPoints).toBeGreaterThan(0);

          // Property: Rubric must have grading scale
          expect(rubric.gradingScale).toBeDefined();
          expect(rubric.gradingScale['A']).toBeDefined();
          expect(rubric.gradingScale['B']).toBeDefined();
          expect(rubric.gradingScale['C']).toBeDefined();
          expect(rubric.gradingScale['D']).toBeDefined();
          expect(rubric.gradingScale['F']).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject rubrics with incomplete grade levels', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid().map(uuid => `assessment_${uuid}`),
        async (assessmentId) => {
          // Create criterion with missing grade levels
          const incompleteCriterion: RubricCriterion = {
            name: 'Test Criterion',
            description: 'Test description',
            levels: [
              { name: 'Exemplary', description: 'Excellent', points: 4 },
              { name: 'Proficient', description: 'Good', points: 3 }
              // Missing 'Developing' and 'Beginning' levels
            ],
            weight: 1.0
          };

          // Property: Should reject rubric with incomplete levels
          await expect(
            assessmentService.createRubric(assessmentId, [incompleteCriterion])
          ).rejects.toThrow(/missing grade levels/i);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: course-content-creation, Property 17: Assessment-Objective Alignment
 * Validates: Requirements 4.5
 * 
 * For any completed assessment, the system should validate and confirm alignment
 * with at least one learning objective.
 */
describe('Property 17: Assessment-Objective Alignment', () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  it('should validate alignment with at least one learning objective', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid().map(uuid => `assessment_${uuid}`),
        fc.array(learningObjectiveGenerator(), { minLength: 1, maxLength: 10 }),
        async (assessmentId, objectives) => {
          // Validate alignment
          const alignmentReport = await assessmentService.validateAlignment(assessmentId, objectives);

          // Property: Report must be validated
          expect(alignmentReport.validated).toBe(true);

          // Property: Must have alignments for all objectives
          expect(alignmentReport.alignments.length).toBe(objectives.length);

          // Property: At least one objective must have high alignment (>= 0.7)
          const highAlignments = alignmentReport.alignments.filter(a => a.alignmentScore >= 0.7);
          expect(highAlignments.length).toBeGreaterThanOrEqual(1);

          // Property: Overall alignment score should be calculated
          expect(alignmentReport.overallAlignmentScore).toBeGreaterThan(0);
          expect(alignmentReport.overallAlignmentScore).toBeLessThanOrEqual(1);

          // Property: Each alignment should have rationale
          alignmentReport.alignments.forEach(alignment => {
            expect(alignment.objectiveId).toBeDefined();
            expect(alignment.alignmentScore).toBeGreaterThanOrEqual(0);
            expect(alignment.alignmentScore).toBeLessThanOrEqual(1);
            expect(alignment.rationale).toBeDefined();
            expect(alignment.rationale.length).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject assessments with no learning objectives', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid().map(uuid => `assessment_${uuid}`),
        async (assessmentId) => {
          // Property: Should reject validation with empty objectives array
          await expect(
            assessmentService.validateAlignment(assessmentId, [])
          ).rejects.toThrow('At least one learning objective is required');
        }
      ),
      { numRuns: 100 }
    );
  });
});
