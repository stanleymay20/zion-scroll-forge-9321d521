import fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import CourseWorkflowService from '../CourseWorkflowService';
import {
  CourseInfo,
  Phase,
  PhaseStatus,
  ApprovalData,
  CourseLevel
} from '../../types/course-content.types';

const prisma = new PrismaClient();
const workflowService = new CourseWorkflowService();

// Generators for property-based testing

const courseInfoGenerator = (): fc.Arbitrary<CourseInfo> => {
  return fc.record({
    title: fc.string({ minLength: 5, maxLength: 100 }),
    // Use UUID for course code to ensure true uniqueness across all test runs and shrinking
    // This guarantees no collisions even when fast-check shrinks test cases
    code: fc.uuid().map(uuid => `COURSE_${uuid.replace(/-/g, '_').toUpperCase()}`),
    description: fc.string({ minLength: 20, maxLength: 500 }),
    faculty: fc.array(
      fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 3, maxLength: 50 }),
        role: fc.constantFrom('INSTRUCTOR', 'ASSISTANT', 'REVIEWER')
      }),
      { minLength: 1, maxLength: 5 }
    ),
    credits: fc.integer({ min: 1, max: 6 }),
    level: fc.constantFrom(
      CourseLevel.BEGINNER,
      CourseLevel.INTERMEDIATE,
      CourseLevel.ADVANCED,
      CourseLevel.STRATEGIC
    ),
    prerequisites: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { maxLength: 5 })
  });
};

const approvalDataGenerator = (approved: boolean = true): fc.Arbitrary<ApprovalData> => {
  return fc.record({
    approved: fc.constant(approved),
    reviewerId: fc.uuid(),
    comments: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: undefined })
  });
};

// Helper function to setup test data
async function setupTestProject(courseInfo: CourseInfo) {
  // First, try to delete any existing project with the same code
  // This handles the case where a previous test run failed and didn't clean up
  try {
    const existing = await prisma.CourseProject.findUnique({
      where: { code: courseInfo.code }
    });
    if (existing) {
      await cleanupTestProject(existing.id);
    }
  } catch (error) {
    // Ignore errors during cleanup attempt
  }
  
  const project = await workflowService.createCourseProject(courseInfo);
  return project;
}

// Helper function to cleanup test data
async function cleanupTestProject(projectId: string) {
  try {
    // Delete in correct order due to foreign key constraints
    const phaseProgressIds = await prisma.PhaseProgress.findMany({
      where: { course_project_id: projectId },
      select: { id: true }
    });
    
    for (const pp of phaseProgressIds) {
      await prisma.Approval.deleteMany({ where: { phase_progress_id: pp.id } });
      await prisma.Deliverable.deleteMany({ where: { phase_progress_id: pp.id } });
    }
    
    const timelineIds = await prisma.Timeline.findMany({
      where: { course_project_id: projectId },
      select: { id: true }
    });
    
    for (const t of timelineIds) {
      await prisma.Milestone.deleteMany({ where: { timeline_id: t.id } });
    }
    
    await prisma.Timeline.deleteMany({ where: { course_project_id: projectId } });
    await prisma.PhaseProgress.deleteMany({ where: { course_project_id: projectId } });
    await prisma.TeamMember.deleteMany({ where: { course_project_id: projectId } });
    await prisma.CourseModule.deleteMany({ where: { course_project_id: projectId } });
    await prisma.CourseProject.delete({ where: { id: projectId } });
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

describe('CourseWorkflowService Property-Based Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
  });

  beforeEach(async () => {
    // Clean up all test course projects before each test
    // This ensures no leftover data from previous test runs
    try {
      const testProjects = await prisma.CourseProject.findMany({
        where: {
          code: {
            startsWith: 'COURSE_'
          }
        },
        select: { id: true }
      });

      for (const project of testProjects) {
        await cleanupTestProject(project.id);
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * Feature: course-content-creation, Property 2: Phase Advancement Requires Approval
   * Validates: Requirements 1.2
   */
  describe('Property 2: Phase Advancement Requires Approval', () => {
    it('should reject phase advancement without approval', async () => {
      await fc.assert(
        fc.asyncProperty(
          courseInfoGenerator(),
          approvalDataGenerator(false),
          async (courseInfo, disapprovalData) => {
            let projectId: string | undefined;

            try {
              // Create a test project
              const project = await setupTestProject(courseInfo);
              projectId = project.id;

              // Mark current phase deliverables as complete to pass validation
              const currentPhase = await prisma.PhaseProgress.findFirst({
                where: {
                  course_project_id: projectId,
                  phase: Phase.PLANNING
                },
                include: { Deliverable: true }
              });

              if (currentPhase) {
                await prisma.Deliverable.updateMany({
                  where: { phase_progress_id: currentPhase.id },
                  data: { status: 'COMPLETED', updated_at: new Date() }
                });
              }

              // Attempt to advance phase without approval
              let errorThrown = false;
              try {
                await workflowService.advancePhase(projectId, disapprovalData);
              } catch (error) {
                errorThrown = true;
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain('requires approval');
              }

              // Verify error was thrown
              expect(errorThrown).toBe(true);

              // Verify project is still in original phase
              const updatedProject = await prisma.CourseProject.findUnique({
                where: { id: projectId }
              });
              expect(updatedProject?.currentPhase).toBe(Phase.PLANNING);
            } finally {
              if (projectId) {
                await cleanupTestProject(projectId);
              }
            }
          }
        ),
        { numRuns: 10, timeout: 30000 } // Reduced runs for database operations
      );
    });

    it('should allow phase advancement with valid approval', async () => {
      await fc.assert(
        fc.asyncProperty(
          courseInfoGenerator(),
          approvalDataGenerator(true),
          async (courseInfo, approvalData) => {
            let projectId: string | undefined;

            try {
              // Create a test project
              const project = await setupTestProject(courseInfo);
              projectId = project.id;

              // Mark current phase deliverables as complete
              const currentPhase = await prisma.PhaseProgress.findFirst({
                where: {
                  course_project_id: projectId,
                  phase: Phase.PLANNING
                },
                include: { Deliverable: true }
              });

              if (currentPhase) {
                await prisma.Deliverable.updateMany({
                  where: { phase_progress_id: currentPhase.id },
                  data: { status: 'COMPLETED', updated_at: new Date() }
                });
              }

              // Advance phase with approval
              const transition = await workflowService.advancePhase(projectId, approvalData);

              // Verify transition occurred
              expect(transition.fromPhase).toBe(Phase.PLANNING);
              expect(transition.toPhase).toBe(Phase.CONTENT_DEVELOPMENT);
              expect(transition.approvedBy).toBe(approvalData.reviewerId);

              // Verify project phase updated
              const updatedProject = await prisma.CourseProject.findUnique({
                where: { id: projectId }
              });
              expect(updatedProject?.currentPhase).toBe(Phase.CONTENT_DEVELOPMENT);

              // Verify approval recorded
              const approval = await prisma.Approval.findFirst({
                where: {
                  phase_progress_id: currentPhase?.id,
                  approver_id: approvalData.reviewerId
                }
              });
              expect(approval).toBeDefined();
              expect(approval?.approved).toBe(true);
            } finally {
              if (projectId) {
                await cleanupTestProject(projectId);
              }
            }
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });

    it('should maintain phase when approval is missing reviewer ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          courseInfoGenerator(),
          async (courseInfo) => {
            let projectId: string | undefined;

            try {
              const project = await setupTestProject(courseInfo);
              projectId = project.id;

              // Mark deliverables complete
              const currentPhase = await prisma.PhaseProgress.findFirst({
                where: {
                  course_project_id: projectId,
                  phase: Phase.PLANNING
                },
                include: { Deliverable: true }
              });

              if (currentPhase) {
                await prisma.Deliverable.updateMany({
                  where: { phase_progress_id: currentPhase.id },
                  data: { status: 'COMPLETED', updated_at: new Date() }
                });
              }

              // Attempt advancement with invalid approval (no reviewer ID)
              const invalidApproval: ApprovalData = {
                approved: true,
                reviewerId: '', // Invalid: empty reviewer ID
                comments: 'Test approval'
              };

              let errorThrown = false;
              try {
                await workflowService.advancePhase(projectId, invalidApproval);
              } catch (error) {
                errorThrown = true;
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain('reviewer ID');
              }

              expect(errorThrown).toBe(true);

              // Verify phase unchanged
              const updatedProject = await prisma.CourseProject.findUnique({
                where: { id: projectId }
              });
              expect(updatedProject?.currentPhase).toBe(Phase.PLANNING);
            } finally {
              if (projectId) {
                await cleanupTestProject(projectId);
              }
            }
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });
  });

  /**
   * Feature: course-content-creation, Property 4: Quality Checklist Application
   * Validates: Requirements 1.4, 6.1
   */
  describe('Property 4: Quality Checklist Application', () => {
    it('should validate all required deliverables are completed', async () => {
      await fc.assert(
        fc.asyncProperty(
          courseInfoGenerator(),
          fc.boolean(),
          async (courseInfo, completeDeliverables) => {
            let projectId: string | undefined;

            try {
              const project = await setupTestProject(courseInfo);
              projectId = project.id;

              const currentPhase = await prisma.PhaseProgress.findFirst({
                where: {
                  course_project_id: projectId,
                  phase: Phase.PLANNING
                },
                include: { Deliverable: true }
              });

              if (currentPhase) {
                if (completeDeliverables) {
                  // Complete all required deliverables
                  await prisma.Deliverable.updateMany({
                    where: {
                      phase_progress_id: currentPhase.id
                    },
                    data: { status: 'COMPLETED', updated_at: new Date() }
                  });
                }
              }

              // Validate phase completion
              const validation = await workflowService.validatePhaseCompletion(
                projectId,
                Phase.PLANNING
              );

              // Verify validation result matches deliverable completion state
              if (completeDeliverables) {
                expect(validation.valid).toBe(true);
                expect(validation.errors).toHaveLength(0);
              } else {
                expect(validation.valid).toBe(false);
                expect(validation.errors.length).toBeGreaterThan(0);
                expect(validation.errors[0]).toContain('Incomplete required deliverables');
              }
            } finally {
              if (projectId) {
                await cleanupTestProject(projectId);
              }
            }
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });

    it('should apply phase-specific validation rules', async () => {
      await fc.assert(
        fc.asyncProperty(
          courseInfoGenerator(),
          async (courseInfo) => {
            let projectId: string | undefined;

            try {
              const project = await setupTestProject(courseInfo);
              projectId = project.id;

              // Test CONTENT_DEVELOPMENT phase validation (module count check)
              // First advance to CONTENT_DEVELOPMENT
              const planningPhase = await prisma.PhaseProgress.findFirst({
                where: {
                  course_project_id: projectId,
                  phase: Phase.PLANNING
                }
              });

              if (planningPhase) {
                await prisma.Deliverable.updateMany({
                  where: { phase_progress_id: planningPhase.id },
                  data: { status: 'COMPLETED', updated_at: new Date() }
                });

                await prisma.PhaseProgress.update({
                  where: { id: planningPhase.id },
                  data: { status: PhaseStatus.COMPLETED, updated_at: new Date() }
                });

                await prisma.CourseProject.update({
                  where: { id: projectId },
                  data: { currentPhase: Phase.CONTENT_DEVELOPMENT, updatedAt: new Date() }
                });

                const contentPhase = await prisma.PhaseProgress.findFirst({
                  where: {
                    course_project_id: projectId,
                    phase: Phase.CONTENT_DEVELOPMENT
                  }
                });

                if (contentPhase) {
                  await prisma.Deliverable.updateMany({
                    where: { phase_progress_id: contentPhase.id },
                    data: { status: 'COMPLETED', updated_at: new Date() }
                  });
                }
              }

              // Validate without modules (should fail)
              const validationWithoutModules = await workflowService.validatePhaseCompletion(
                projectId,
                Phase.CONTENT_DEVELOPMENT
              );

              expect(validationWithoutModules.valid).toBe(false);
              expect(validationWithoutModules.errors.some(e => e.includes('module count'))).toBe(true);

              // Add valid number of modules
              for (let i = 0; i < 5; i++) {
                await prisma.CourseModule.create({
                  data: {
                    id: `module_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 11)}`,
                    course_project_id: projectId,
                    week_number: i + 1,
                    title: `Module ${i + 1}`,
                    status: 'DRAFT',
                    updated_at: new Date()
                  }
                });
              }

              // Validate with modules (should pass)
              const validationWithModules = await workflowService.validatePhaseCompletion(
                projectId,
                Phase.CONTENT_DEVELOPMENT
              );

              expect(validationWithModules.valid).toBe(true);
            } finally {
              if (projectId) {
                await cleanupTestProject(projectId);
              }
            }
          }
        ),
        { numRuns: 5, timeout: 30000 } // Fewer runs due to complexity
      );
    });

    it('should return validation errors for incomplete phases', async () => {
      await fc.assert(
        fc.asyncProperty(
          courseInfoGenerator(),
          fc.constantFrom(Phase.PLANNING, Phase.CONTENT_DEVELOPMENT, Phase.PRODUCTION),
          async (courseInfo, phase) => {
            let projectId: string | undefined;

            try {
              const project = await setupTestProject(courseInfo);
              projectId = project.id;

              // Don't complete any deliverables
              const validation = await workflowService.validatePhaseCompletion(projectId, phase);

              // Should always have errors when deliverables incomplete
              expect(validation.valid).toBe(false);
              expect(validation.errors.length).toBeGreaterThan(0);
            } finally {
              if (projectId) {
                await cleanupTestProject(projectId);
              }
            }
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });
  });
});
