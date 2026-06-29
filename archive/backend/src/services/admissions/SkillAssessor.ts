import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { CoreSkill, SkillLevel, SkillAssessment, AssessmentResult, DevelopmentPlan } from './AcademicEvaluator';

export interface SkillTest {
  id: string;
  skill: CoreSkill;
  questions: SkillQuestion[];
  timeLimit: number; // in minutes
  passingScore: number;
}

export interface SkillQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'essay' | 'practical' | 'problem_solving';
  options?: string[];
  correctAnswer?: string;
  rubric?: AssessmentRubric;
  points: number;
}

export interface AssessmentRubric {
  criteria: RubricCriterion[];
  maxPoints: number;
}

export interface RubricCriterion {
  name: string;
  description: string;
  levels: RubricLevel[];
}

export interface RubricLevel {
  score: number;
  description: string;
}

export interface SkillTestResult {
  testId: string;
  applicantId: string;
  skill: CoreSkill;
  responses: TestResponse[];
  totalScore: number;
  maxScore: number;
  percentile: number;
  completedAt: Date;
  timeSpent: number; // in minutes
}

export interface TestResponse {
  questionId: string;
  response: string;
  score: number;
  feedback: string;
}

export interface ProficiencyLevel {
  skill: CoreSkill;
  level: SkillLevel;
  evidence: string[];
  confidence: number; // 0-100
  lastAssessed: Date;
}

export class SkillAssessor {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async assessCoreSkills(applicationId: string): Promise<SkillAssessment[]> {
    try {
      logger.info(`Starting core skills assessment for application ${applicationId}`);

      const application = await this.prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          applicant: true,
          documents: true
        }
      });

      if (!application) {
        throw new Error(`Application ${applicationId} not found`);
      }

      const skills = Object.values(CoreSkill);
      const assessments: SkillAssessment[] = [];

      for (const skill of skills) {
        const assessment = await this.assessSkill(skill, application);
        assessments.push(assessment);
      }

      logger.info(`Core skills assessment completed for application ${applicationId}`);
      return assessments;

    } catch (error) {
      logger.error(`Core skills assessment failed for application ${applicationId}:`, error);
      throw error;
    }
  }

  async assessSkill(skill: CoreSkill, application: any): Promise<SkillAssessment> {
    try {
      // Get or create skill test
      const skillTest = await this.getSkillTest(skill);
      
      // Check if applicant has already taken this test
      let testResult = await this.getExistingTestResult(application.applicantId, skill);
      
      if (!testResult) {
        // Administer the test (in a real implementation, this would be interactive)
        testResult = await this.administerSkillTest(skillTest, application);
      }

      // Analyze proficiency level
      const proficiencyLevel = this.analyzeProficiencyLevel(skill, testResult, application);

      // Generate assessment result
      const assessmentResult = this.generateAssessmentResult(testResult, proficiencyLevel);

      // Create development plan
      const developmentPlan = this.createDevelopmentPlan(skill, proficiencyLevel, assessmentResult);

      return {
        skill,
        currentLevel: proficiencyLevel.level,
        assessment: assessmentResult,
        developmentPlan
      };

    } catch (error) {
      logger.error(`Skill assessment failed for ${skill}:`, error);
      throw error;
    }
  }

  private async getSkillTest(skill: CoreSkill): Promise<SkillTest> {
    // In a real implementation, this would fetch from database
    // For now, we'll generate a test structure
    return this.generateSkillTest(skill);
  }

  private generateSkillTest(skill: CoreSkill): SkillTest {
    const baseTest: SkillTest = {
      id: `test_${skill}_${Date.now()}`,
      skill,
      questions: [],
      timeLimit: 60,
      passingScore: 70
    };

    switch (skill) {
      case CoreSkill.MATHEMATICS:
        baseTest.questions = this.generateMathQuestions();
        break;
      case CoreSkill.CRITICAL_THINKING:
        baseTest.questions = this.generateCriticalThinkingQuestions();
        break;
      case CoreSkill.WRITTEN_COMMUNICATION:
        baseTest.questions = this.generateWritingQuestions();
        break;
      case CoreSkill.BIBLICAL_LITERACY:
        baseTest.questions = this.generateBiblicalLiteracyQuestions();
        break;
      case CoreSkill.RESEARCH_METHODOLOGY:
        baseTest.questions = this.generateResearchQuestions();
        break;
      case CoreSkill.ANALYTICAL_REASONING:
        baseTest.questions = this.generateAnalyticalReasoningQuestions();
        break;
      case CoreSkill.SCIENCE:
        baseTest.questions = this.generateScienceQuestions();
        break;
      case CoreSkill.LANGUAGE_ARTS:
        baseTest.questions = this.generateLanguageArtsQuestions();
        break;
    }

    return baseTest;
  }

  private generateMathQuestions(): SkillQuestion[] {
    return [
      {
        id: 'math_1',
        question: 'Solve for x: 2x + 5 = 13',
        type: 'multiple_choice',
        options: ['x = 4', 'x = 6', 'x = 8', 'x = 9'],
        correctAnswer: 'x = 4',
        points: 10
      },
      {
        id: 'math_2',
        question: 'Calculate the derivative of f(x) = 3x² + 2x - 1',
        type: 'multiple_choice',
        options: ['6x + 2', '6x - 2', '3x + 2', '6x + 1'],
        correctAnswer: '6x + 2',
        points: 15
      },
      {
        id: 'math_3',
        question: 'Explain your approach to solving a complex mathematical problem. Provide a specific example.',
        type: 'essay',
        rubric: {
          criteria: [
            {
              name: 'Problem-solving approach',
              description: 'Clear methodology and logical steps',
              levels: [
                { score: 5, description: 'Excellent systematic approach' },
                { score: 3, description: 'Good approach with minor gaps' },
                { score: 1, description: 'Basic approach, needs improvement' }
              ]
            }
          ],
          maxPoints: 25
        },
        points: 25
      }
    ];
  }

  private generateCriticalThinkingQuestions(): SkillQuestion[] {
    return [
      {
        id: 'ct_1',
        question: 'Analyze the following argument and identify any logical fallacies: "All successful people wake up early. John wakes up early. Therefore, John will be successful."',
        type: 'essay',
        rubric: {
          criteria: [
            {
              name: 'Logical analysis',
              description: 'Identifies fallacies and reasoning errors',
              levels: [
                { score: 10, description: 'Correctly identifies affirming the consequent fallacy' },
                { score: 7, description: 'Recognizes logical issues but incomplete analysis' },
                { score: 3, description: 'Basic understanding of logical problems' }
              ]
            }
          ],
          maxPoints: 20
        },
        points: 20
      },
      {
        id: 'ct_2',
        question: 'Given conflicting research studies on a topic, how would you evaluate which sources are more credible?',
        type: 'essay',
        rubric: {
          criteria: [
            {
              name: 'Source evaluation',
              description: 'Demonstrates ability to assess credibility',
              levels: [
                { score: 15, description: 'Comprehensive evaluation criteria' },
                { score: 10, description: 'Good understanding of credibility factors' },
                { score: 5, description: 'Basic awareness of source evaluation' }
              ]
            }
          ],
          maxPoints: 30
        },
        points: 30
      }
    ];
  }

  private generateWritingQuestions(): SkillQuestion[] {
    return [
      {
        id: 'writing_1',
        question: 'Write a 500-word essay on the importance of education in personal development.',
        type: 'essay',
        rubric: {
          criteria: [
            {
              name: 'Organization',
              description: 'Clear structure and flow',
              levels: [
                { score: 10, description: 'Excellent organization and transitions' },
                { score: 7, description: 'Good structure with minor issues' },
                { score: 4, description: 'Basic organization, needs improvement' }
              ]
            },
            {
              name: 'Grammar and Style',
              description: 'Proper grammar, spelling, and writing style',
              levels: [
                { score: 10, description: 'Excellent grammar and engaging style' },
                { score: 7, description: 'Good writing with minor errors' },
                { score: 4, description: 'Adequate writing, some errors' }
              ]
            }
          ],
          maxPoints: 40
        },
        points: 40
      }
    ];
  }

  private generateBiblicalLiteracyQuestions(): SkillQuestion[] {
    return [
      {
        id: 'biblical_1',
        question: 'Who wrote the majority of the New Testament epistles?',
        type: 'multiple_choice',
        options: ['Paul', 'Peter', 'John', 'James'],
        correctAnswer: 'Paul',
        points: 10
      },
      {
        id: 'biblical_2',
        question: 'Explain the concept of covenant in biblical theology and provide examples from both Old and New Testaments.',
        type: 'essay',
        rubric: {
          criteria: [
            {
              name: 'Biblical understanding',
              description: 'Demonstrates knowledge of covenant theology',
              levels: [
                { score: 20, description: 'Comprehensive understanding with examples' },
                { score: 15, description: 'Good understanding, some examples' },
                { score: 10, description: 'Basic understanding of concept' }
              ]
            }
          ],
          maxPoints: 30
        },
        points: 30
      }
    ];
  }

  private generateResearchQuestions(): SkillQuestion[] {
    return [
      {
        id: 'research_1',
        question: 'Design a research methodology to investigate the effectiveness of online learning compared to traditional classroom learning.',
        type: 'essay',
        rubric: {
          criteria: [
            {
              name: 'Research design',
              description: 'Appropriate methodology and considerations',
              levels: [
                { score: 25, description: 'Comprehensive research design' },
                { score: 18, description: 'Good design with minor gaps' },
                { score: 10, description: 'Basic research approach' }
              ]
            }
          ],
          maxPoints: 35
        },
        points: 35
      }
    ];
  }

  private generateAnalyticalReasoningQuestions(): SkillQuestion[] {
    return [
      {
        id: 'analytical_1',
        question: 'A company\'s sales increased by 20% in Q1, decreased by 15% in Q2, increased by 25% in Q3, and decreased by 10% in Q4. If the starting sales were $100,000, what were the final sales?',
        type: 'problem_solving',
        points: 20
      }
    ];
  }

  private generateScienceQuestions(): SkillQuestion[] {
    return [
      {
        id: 'science_1',
        question: 'Explain the process of photosynthesis and its significance in the ecosystem.',
        type: 'essay',
        rubric: {
          criteria: [
            {
              name: 'Scientific accuracy',
              description: 'Correct understanding of photosynthesis',
              levels: [
                { score: 15, description: 'Accurate and detailed explanation' },
                { score: 10, description: 'Generally correct with minor errors' },
                { score: 5, description: 'Basic understanding' }
              ]
            }
          ],
          maxPoints: 25
        },
        points: 25
      }
    ];
  }

  private generateLanguageArtsQuestions(): SkillQuestion[] {
    return [
      {
        id: 'lang_1',
        question: 'Analyze the use of symbolism in a literary work of your choice.',
        type: 'essay',
        rubric: {
          criteria: [
            {
              name: 'Literary analysis',
              description: 'Understanding of symbolism and literary devices',
              levels: [
                { score: 20, description: 'Sophisticated analysis with examples' },
                { score: 15, description: 'Good analysis with some examples' },
                { score: 10, description: 'Basic understanding of symbolism' }
              ]
            }
          ],
          maxPoints: 30
        },
        points: 30
      }
    ];
  }

  private async getExistingTestResult(applicantId: string, skill: CoreSkill): Promise<SkillTestResult | null> {
    // In a real implementation, this would query the database
    // For now, return null to simulate no existing results
    return null;
  }

  private async administerSkillTest(skillTest: SkillTest, application: any): Promise<SkillTestResult> {
    // In a real implementation, this would present the test to the applicant
    // For now, we'll simulate test results based on application data
    return this.simulateTestResults(skillTest, application);
  }

  private simulateTestResults(skillTest: SkillTest, application: any): SkillTestResult {
    const responses: TestResponse[] = [];
    let totalScore = 0;
    let maxScore = 0;

    for (const question of skillTest.questions) {
      maxScore += question.points;
      
      // Simulate response based on application data
      const score = this.simulateQuestionScore(question, application, skillTest.skill);
      totalScore += score;

      responses.push({
        questionId: question.id,
        response: 'Simulated response',
        score,
        feedback: this.generateFeedback(score, question.points)
      });
    }

    const percentile = Math.round((totalScore / maxScore) * 100);

    return {
      testId: skillTest.id,
      applicantId: application.applicantId,
      skill: skillTest.skill,
      responses,
      totalScore,
      maxScore,
      percentile,
      completedAt: new Date(),
      timeSpent: Math.floor(Math.random() * skillTest.timeLimit) + 30
    };
  }

  private simulateQuestionScore(question: SkillQuestion, application: any, skill: CoreSkill): number {
    // Base score influenced by application data
    let baseScore = question.points * 0.6; // Start with 60% base

    // Adjust based on education
    const education = application.applicationData?.education || [];
    if (education.length > 0) {
      const avgGPA = education.reduce((sum: number, edu: any) => sum + (edu.gpa || 0), 0) / education.length;
      const gpaFactor = (avgGPA - 2.0) / 2.0; // Normalize GPA to 0-1 scale
      baseScore += question.points * 0.3 * gpaFactor;
    }

    // Skill-specific adjustments
    switch (skill) {
      case CoreSkill.BIBLICAL_LITERACY:
        if (application.applicationData?.spiritualFormation?.biblicalStudies) {
          baseScore += question.points * 0.2;
        }
        break;
      case CoreSkill.RESEARCH_METHODOLOGY:
        if (application.applicationData?.research?.length > 0) {
          baseScore += question.points * 0.25;
        }
        break;
    }

    // Add some randomness
    const randomFactor = (Math.random() - 0.5) * 0.2; // ±10%
    baseScore += question.points * randomFactor;

    return Math.min(question.points, Math.max(0, Math.round(baseScore)));
  }

  private generateFeedback(score: number, maxScore: number): string {
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 90) {
      return 'Excellent work! Demonstrates mastery of the concept.';
    } else if (percentage >= 80) {
      return 'Good understanding with room for minor improvements.';
    } else if (percentage >= 70) {
      return 'Adequate understanding, but could benefit from additional study.';
    } else if (percentage >= 60) {
      return 'Basic understanding present, significant improvement needed.';
    } else {
      return 'Needs substantial development in this area.';
    }
  }

  private analyzeProficiencyLevel(skill: CoreSkill, testResult: SkillTestResult, application: any): ProficiencyLevel {
    const percentage = (testResult.totalScore / testResult.maxScore) * 100;
    
    let level: SkillLevel;
    let confidence: number;

    if (percentage >= 85) {
      level = SkillLevel.EXPERT;
      confidence = 90;
    } else if (percentage >= 70) {
      level = SkillLevel.ADVANCED;
      confidence = 80;
    } else if (percentage >= 55) {
      level = SkillLevel.INTERMEDIATE;
      confidence = 70;
    } else {
      level = SkillLevel.BEGINNER;
      confidence = 60;
    }

    const evidence = this.gatherEvidence(skill, testResult, application);

    return {
      skill,
      level,
      evidence,
      confidence,
      lastAssessed: new Date()
    };
  }

  private gatherEvidence(skill: CoreSkill, testResult: SkillTestResult, application: any): string[] {
    const evidence: string[] = [];
    
    evidence.push(`Test score: ${testResult.totalScore}/${testResult.maxScore} (${testResult.percentile}%)`);
    
    // Add application-based evidence
    const applicationData = application.applicationData || {};
    
    switch (skill) {
      case CoreSkill.RESEARCH_METHODOLOGY:
        if (applicationData.research?.length > 0) {
          evidence.push(`${applicationData.research.length} research experience(s)`);
        }
        break;
      case CoreSkill.WRITTEN_COMMUNICATION:
        if (applicationData.publications?.length > 0) {
          evidence.push(`${applicationData.publications.length} publication(s)`);
        }
        break;
      case CoreSkill.BIBLICAL_LITERACY:
        if (applicationData.spiritualFormation?.biblicalStudies) {
          evidence.push('Biblical studies background');
        }
        break;
    }

    return evidence;
  }

  private generateAssessmentResult(testResult: SkillTestResult, proficiencyLevel: ProficiencyLevel): AssessmentResult {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    // Analyze test performance
    const percentage = (testResult.totalScore / testResult.maxScore) * 100;
    
    if (percentage >= 80) {
      strengths.push('Strong performance on assessment');
    }
    
    if (percentage < 60) {
      weaknesses.push('Below expected performance level');
      recommendations.push('Additional study and practice recommended');
    }

    // Add specific recommendations based on skill level
    switch (proficiencyLevel.level) {
      case SkillLevel.BEGINNER:
        recommendations.push('Focus on foundational concepts');
        recommendations.push('Consider prerequisite courses');
        break;
      case SkillLevel.INTERMEDIATE:
        recommendations.push('Build on existing knowledge');
        recommendations.push('Practice advanced applications');
        break;
      case SkillLevel.ADVANCED:
        recommendations.push('Explore specialized topics');
        recommendations.push('Consider leadership opportunities');
        break;
    }

    return {
      score: testResult.totalScore,
      maxScore: testResult.maxScore,
      percentile: testResult.percentile,
      strengths,
      weaknesses,
      recommendations
    };
  }

  private createDevelopmentPlan(skill: CoreSkill, proficiencyLevel: ProficiencyLevel, assessmentResult: AssessmentResult): DevelopmentPlan {
    const targetLevel = this.determineTargetLevel(proficiencyLevel.level);
    const recommendedCourses = this.getRecommendedCourses(skill, proficiencyLevel.level);
    const timeframe = this.estimateTimeframe(proficiencyLevel.level, targetLevel);
    const prerequisites = this.getPrerequisites(skill, proficiencyLevel.level);
    const resources = this.getResources(skill, proficiencyLevel.level);

    return {
      targetLevel,
      recommendedCourses,
      estimatedTimeframe: timeframe,
      prerequisites,
      resources
    };
  }

  private determineTargetLevel(currentLevel: SkillLevel): SkillLevel {
    switch (currentLevel) {
      case SkillLevel.BEGINNER:
        return SkillLevel.INTERMEDIATE;
      case SkillLevel.INTERMEDIATE:
        return SkillLevel.ADVANCED;
      case SkillLevel.ADVANCED:
        return SkillLevel.EXPERT;
      default:
        return currentLevel;
    }
  }

  private getRecommendedCourses(skill: CoreSkill, currentLevel: SkillLevel): string[] {
    const courseMap: { [key: string]: { [key in SkillLevel]: string[] } } = {
      [CoreSkill.MATHEMATICS]: {
        [SkillLevel.BEGINNER]: ['Basic Algebra', 'Geometry Fundamentals'],
        [SkillLevel.INTERMEDIATE]: ['College Algebra', 'Trigonometry'],
        [SkillLevel.ADVANCED]: ['Calculus I', 'Statistics'],
        [SkillLevel.EXPERT]: ['Advanced Calculus', 'Linear Algebra']
      },
      [CoreSkill.CRITICAL_THINKING]: {
        [SkillLevel.BEGINNER]: ['Introduction to Logic', 'Basic Reasoning'],
        [SkillLevel.INTERMEDIATE]: ['Formal Logic', 'Argument Analysis'],
        [SkillLevel.ADVANCED]: ['Advanced Logic', 'Philosophy of Science'],
        [SkillLevel.EXPERT]: ['Epistemology', 'Advanced Philosophy']
      }
    };

    return courseMap[skill]?.[currentLevel] || ['General study in ' + skill.replace('_', ' ')];
  }

  private estimateTimeframe(currentLevel: SkillLevel, targetLevel: SkillLevel): string {
    if (currentLevel === targetLevel) return 'Already at target level';
    
    const levelDifference = Object.values(SkillLevel).indexOf(targetLevel) - Object.values(SkillLevel).indexOf(currentLevel);
    
    switch (levelDifference) {
      case 1:
        return '3-6 months';
      case 2:
        return '6-12 months';
      case 3:
        return '12-18 months';
      default:
        return '6-12 months';
    }
  }

  private getPrerequisites(skill: CoreSkill, currentLevel: SkillLevel): string[] {
    if (currentLevel === SkillLevel.BEGINNER) {
      return ['High school diploma or equivalent', 'Basic literacy and numeracy'];
    }
    return [];
  }

  private getResources(skill: CoreSkill, currentLevel: SkillLevel): string[] {
    const baseResources = [
      'Online learning platforms',
      'Academic textbooks',
      'Practice exercises',
      'Study groups'
    ];

    if (currentLevel === SkillLevel.BEGINNER) {
      baseResources.push('Tutoring support', 'Foundational materials');
    } else if (currentLevel === SkillLevel.ADVANCED) {
      baseResources.push('Research opportunities', 'Advanced seminars');
    }

    return baseResources;
  }
}