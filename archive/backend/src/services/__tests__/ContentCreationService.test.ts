// Content Creation Service Tests

import ContentCreationService from '../ContentCreationService';
import {
  LectureGenerationRequest,
  AssessmentGenerationRequest,
  ResourceCurationRequest,
  BloomLevel,
  AssessmentType,
  ResourceType
} from '../../types/content-creation.types';

describe('ContentCreationService', () => {
  let service: ContentCreationService;

  beforeEach(() => {
    service = new ContentCreationService();
  });

  describe('generateLecture', () => {
    it('should generate comprehensive lecture content', async () => {
      const request: LectureGenerationRequest = {
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
            bloomLevel: BloomLevel.UNDERSTAND,
            assessmentMethod: 'Quiz'
          }
        ],
        targetAudience: 'Undergraduate students',
        difficulty: 'BEGINNER',
        includeExamples: true,
        includeCaseStudies: true,
        includeBiblicalIntegration: true
      };

      const result = await service.generateLecture(request);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      if (result.content) {
        expect(result.content.title).toBe(request.moduleOutline.title);
        expect(result.content.mainContent.length).toBeGreaterThan(0);
        expect(result.content.introduction).toBeDefined();
        expect(result.content.summary).toBeDefined();
        expect(result.content.keyTakeaways.length).toBeGreaterThan(0);
      }
      expect(result.confidence).toBeGreaterThan(0);
    }, 30000);

    it('should include biblical integration when requested', async () => {
      const request: LectureGenerationRequest = {
        courseOutline: {
          courseId: 'course_001',
          title: 'Ethics in Technology',
          description: 'Ethical considerations in tech',
          learningObjectives: [],
          modules: [],
          targetAudience: 'Graduate students',
          difficulty: 'INTERMEDIATE',
          duration: 40
        },
        moduleOutline: {
          moduleNumber: 1,
          title: 'Ethical Frameworks',
          description: 'Understanding ethical decision-making',
          learningObjectives: ['Apply ethical frameworks'],
          topics: ['Ethics', 'Morality', 'Decision-making'],
          estimatedDuration: 2
        },
        learningObjectives: [
          {
            id: 'obj_002',
            description: 'Apply ethical frameworks to technology decisions',
            bloomLevel: BloomLevel.APPLY,
            assessmentMethod: 'Case study'
          }
        ],
        targetAudience: 'Graduate students',
        difficulty: 'INTERMEDIATE',
        includeExamples: true,
        includeCaseStudies: false,
        includeBiblicalIntegration: true
      };

      const result = await service.generateLecture(request);

      expect(result.success).toBe(true);
      if (result.content) {
        expect(result.content.biblicalIntegration).toBeDefined();
        expect(result.content.biblicalIntegration.scriptureReferences).toBeDefined();
        expect(result.content.biblicalIntegration.theologicalIntegration).toBeDefined();
      }
    }, 30000);
  });

  describe('generateAssessment', () => {
    it('should generate quiz assessment', async () => {
      const request: AssessmentGenerationRequest = {
        courseId: 'course_001',
        topic: 'Introduction to AI',
        learningObjectives: [
          {
            id: 'obj_001',
            description: 'Define artificial intelligence',
            bloomLevel: BloomLevel.UNDERSTAND,
            assessmentMethod: 'Quiz'
          }
        ],
        assessmentType: AssessmentType.QUIZ,
        difficulty: 'EASY',
        numberOfQuestions: 5,
        uniquenessRequired: false
      };

      const result = await service.generateAssessment(request);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      if (result.content) {
        expect(result.content.type).toBe(AssessmentType.QUIZ);
        expect(result.content.questions.length).toBe(5);
        expect(result.content.rubric).toBeDefined();
        expect(result.content.instructions).toBeDefined();
      }
    }, 30000);

    it('should generate unique assessments for different students', async () => {
      const request: AssessmentGenerationRequest = {
        courseId: 'course_001',
        topic: 'Mathematics',
        learningObjectives: [
          {
            id: 'obj_003',
            description: 'Solve algebraic equations',
            bloomLevel: BloomLevel.APPLY,
            assessmentMethod: 'Problem set'
          }
        ],
        assessmentType: AssessmentType.QUIZ,
        difficulty: 'MEDIUM',
        numberOfQuestions: 3,
        uniquenessRequired: true,
        studentId: 'student_001'
      };

      const result1 = await service.generateAssessment(request);
      const result2 = await service.generateAssessment({
        ...request,
        studentId: 'student_002'
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      // Assessments should be different for different students
      if (result1.content && result2.content) {
        expect(result1.content.assessmentId).not.toBe(result2.content.assessmentId);
      }
    }, 30000);
  });

  describe('curateResources', () => {
    it('should curate relevant academic resources', async () => {
      const request: ResourceCurationRequest = {
        topic: 'Machine Learning',
        learningObjectives: [
          {
            id: 'obj_004',
            description: 'Understand machine learning algorithms',
            bloomLevel: BloomLevel.UNDERSTAND,
            assessmentMethod: 'Quiz'
          }
        ],
        academicLevel: 'INTERMEDIATE',
        searchCriteria: {
          topic: 'Machine Learning',
          learningObjectives: [],
          maxResults: 10
        },
        maxResources: 5
      };

      const result = await service.curateResources(request);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      if (result.content) {
        expect(result.content.length).toBeGreaterThan(0);
        expect(result.content.length).toBeLessThanOrEqual(5);
        
        // Check resource structure
        const resource = result.content[0];
        expect(resource.title).toBeDefined();
        expect(resource.summary).toBeDefined();
        expect(resource.relevanceScore).toBeGreaterThan(0);
        expect(resource.qualityScore).toBeGreaterThan(0);
      }
    }, 30000);

    it('should filter resources by type', async () => {
      const request: ResourceCurationRequest = {
        topic: 'Data Science',
        learningObjectives: [],
        academicLevel: 'ADVANCED',
        searchCriteria: {
          topic: 'Data Science',
          learningObjectives: [],
          resourceTypes: [ResourceType.ACADEMIC_PAPER],
          maxResults: 5
        },
        maxResources: 5
      };

      const result = await service.curateResources(request);

      expect(result.success).toBe(true);
      if (result.content) {
        // All resources should be academic papers
        result.content.forEach(resource => {
          expect(resource.type).toBe(ResourceType.ACADEMIC_PAPER);
        });
      }
    }, 30000);
  });

  describe('generateUniqueProblemSet', () => {
    it('should generate unique problems for a student', async () => {
      const request: AssessmentGenerationRequest = {
        courseId: 'course_001',
        topic: 'Calculus',
        learningObjectives: [
          {
            id: 'obj_005',
            description: 'Solve derivatives',
            bloomLevel: BloomLevel.APPLY,
            assessmentMethod: 'Problem set'
          }
        ],
        assessmentType: AssessmentType.QUIZ,
        difficulty: 'MEDIUM',
        numberOfQuestions: 3,
        uniquenessRequired: true
      };

      const problems = await service.generateUniqueProblemSet(
        request,
        'student_001',
        3
      );

      expect(problems).toBeDefined();
      expect(problems.length).toBe(3);
      
      // Each problem should have unique parameters
      problems.forEach(problem => {
        expect(problem.problemId).toBeDefined();
        expect(problem.problem).toBeDefined();
        expect(problem.solution).toBeDefined();
      });
    }, 30000);
  });

  describe('generateEssayQuestions', () => {
    it('should generate varied essay questions', async () => {
      const request: AssessmentGenerationRequest = {
        courseId: 'course_001',
        topic: 'Philosophy of Technology',
        learningObjectives: [
          {
            id: 'obj_006',
            description: 'Analyze philosophical implications of technology',
            bloomLevel: BloomLevel.ANALYZE,
            assessmentMethod: 'Essay'
          }
        ],
        assessmentType: AssessmentType.ESSAY,
        difficulty: 'HARD',
        numberOfQuestions: 3,
        uniquenessRequired: false
      };

      const questions = await service.generateEssayQuestions(request, 3);

      expect(questions).toBeDefined();
      expect(questions.length).toBe(3);
      
      questions.forEach(question => {
        expect(question.question).toBeDefined();
        expect(question.prompt).toBeDefined();
        expect(question.rubric).toBeDefined();
        expect(question.expectedLength).toBeDefined();
      });
    }, 30000);
  });

  describe('generateProjectSpecification', () => {
    it('should generate comprehensive project specification', async () => {
      const request: AssessmentGenerationRequest = {
        courseId: 'course_001',
        topic: 'Web Development',
        learningObjectives: [
          {
            id: 'obj_007',
            description: 'Build a full-stack web application',
            bloomLevel: BloomLevel.CREATE,
            assessmentMethod: 'Project'
          }
        ],
        assessmentType: AssessmentType.PROJECT,
        difficulty: 'HARD',
        numberOfQuestions: 1,
        uniquenessRequired: false
      };

      const project = await service.generateProjectSpecification(request);

      expect(project).toBeDefined();
      expect(project.title).toBeDefined();
      expect(project.description).toBeDefined();
      expect(project.objectives).toBeDefined();
      expect(project.deliverables).toBeDefined();
      expect(project.milestones).toBeDefined();
      expect(project.rubric).toBeDefined();
    }, 30000);
  });

  describe('validateDifficulty', () => {
    it('should validate assessment difficulty', async () => {
      const assessment: any = {
        assessmentId: 'test_001',
        questions: [
          {
            questionId: 'q1',
            difficulty: 'EASY',
            bloomLevel: BloomLevel.REMEMBER
          },
          {
            questionId: 'q2',
            difficulty: 'EASY',
            bloomLevel: BloomLevel.UNDERSTAND
          }
        ]
      };

      const validation = await service.validateDifficulty(assessment, 'EASY');

      expect(validation).toBeDefined();
      expect(validation.isValid).toBeDefined();
      expect(validation.actualDifficulty).toBeDefined();
      expect(validation.adjustments).toBeDefined();
    }, 30000);
  });
});
