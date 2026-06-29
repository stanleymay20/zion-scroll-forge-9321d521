/**
 * Cultural Sensitivity Training Service for Admissions Staff
 * Provides comprehensive training on cultural awareness and sensitivity
 */

import {
  SupportedLanguage,
  CulturalRegion
} from '../../types/multilingual';

export interface TrainingModule {
  moduleId: string;
  title: string;
  description: string;
  duration: number; // in minutes
  objectives: string[];
  content: TrainingContent[];
  assessments: TrainingAssessment[];
  resources: TrainingResource[];
  culturalRegions: CulturalRegion[];
}

export interface TrainingContent {
  contentId: string;
  type: ContentType;
  title: string;
  content: string;
  examples: Example[];
  interactiveElements: InteractiveElement[];
}

export interface TrainingAssessment {
  assessmentId: string;
  type: AssessmentType;
  title: string;
  questions: TrainingQuestion[];
  passingScore: number;
}

export interface TrainingQuestion {
  questionId: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  culturalContext: string;
}

export interface TrainingResource {
  resourceId: string;
  type: ResourceType;
  title: string;
  description: string;
  url?: string;
  content?: string;
  culturalRegion?: CulturalRegion;
}

export interface Example {
  exampleId: string;
  scenario: string;
  culturalContext: string;
  appropriateResponse: string;
  inappropriateResponse: string;
  explanation: string;
}

export interface InteractiveElement {
  elementId: string;
  type: InteractiveType;
  title: string;
  description: string;
  activity: any;
}

export interface TrainingProgress {
  staffId: string;
  moduleId: string;
  startedAt: Date;
  completedAt?: Date;
  progress: number; // 0-100
  assessmentScores: AssessmentScore[];
  certificationsEarned: Certification[];
}

export interface AssessmentScore {
  assessmentId: string;
  score: number;
  maxScore: number;
  passed: boolean;
  completedAt: Date;
  attempts: number;
}

export interface Certification {
  certificationId: string;
  name: string;
  earnedAt: Date;
  expiresAt: Date;
  culturalRegions: CulturalRegion[];
}

export interface CulturalCompetencyProfile {
  staffId: string;
  overallCompetency: number;
  regionalCompetencies: Map<CulturalRegion, number>;
  strengths: string[];
  developmentAreas: string[];
  recommendedTraining: string[];
  lastAssessed: Date;
}

export enum ContentType {
  Text = 'text',
  Video = 'video',
  Audio = 'audio',
  Infographic = 'infographic',
  CaseStudy = 'case_study',
  Simulation = 'simulation'
}

export enum AssessmentType {
  Quiz = 'quiz',
  Scenario = 'scenario',
  Reflection = 'reflection',
  Practical = 'practical'
}

export enum QuestionType {
  MultipleChoice = 'multiple_choice',
  TrueFalse = 'true_false',
  ShortAnswer = 'short_answer',
  Essay = 'essay',
  Scenario = 'scenario'
}

export enum ResourceType {
  Article = 'article',
  Book = 'book',
  Video = 'video',
  Podcast = 'podcast',
  Website = 'website',
  Research = 'research'
}

export enum InteractiveType {
  RolePlay = 'role_play',
  Simulation = 'simulation',
  Discussion = 'discussion',
  Reflection = 'reflection',
  PeerReview = 'peer_review'
}

export class CulturalSensitivityTrainingService {
  private static instance: CulturalSensitivityTrainingService;
  private trainingModules: Map<string, TrainingModule>;
  private staffProgress: Map<string, TrainingProgress[]>;
  private competencyProfiles: Map<string, CulturalCompetencyProfile>;

  private constructor() {
    this.trainingModules = new Map();
    this.staffProgress = new Map();
    this.competencyProfiles = new Map();
    this.initializeTrainingModules();
  }

  public static getInstance(): CulturalSensitivityTrainingService {
    if (!CulturalSensitivityTrainingService.instance) {
      CulturalSensitivityTrainingService.instance = new CulturalSensitivityTrainingService();
    }
    return CulturalSensitivityTrainingService.instance;
  }

  /**
   * Get all available training modules
   */
  public getTrainingModules(): TrainingModule[] {
    return Array.from(this.trainingModules.values());
  }

  /**
   * Get training modules for specific cultural region
   */
  public getTrainingModulesForRegion(region: CulturalRegion): TrainingModule[] {
    return Array.from(this.trainingModules.values()).filter(
      module => module.culturalRegions.includes(region)
    );
  }

  /**
   * Start training module for staff member
   */
  public async startTrainingModule(
    staffId: string,
    moduleId: string
  ): Promise<TrainingProgress> {
    const module = this.trainingModules.get(moduleId);
    if (!module) {
      throw new Error(`Training module not found: ${moduleId}`);
    }

    const progress: TrainingProgress = {
      staffId,
      moduleId,
      startedAt: new Date(),
      progress: 0,
      assessmentScores: [],
      certificationsEarned: []
    };

    // Add to staff progress
    const staffProgressList = this.staffProgress.get(staffId) || [];
    staffProgressList.push(progress);
    this.staffProgress.set(staffId, staffProgressList);

    return progress;
  }

  /**
   * Update training progress
   */
  public async updateTrainingProgress(
    staffId: string,
    moduleId: string,
    progressUpdate: Partial<TrainingProgress>
  ): Promise<TrainingProgress> {
    const staffProgressList = this.staffProgress.get(staffId) || [];
    const progressIndex = staffProgressList.findIndex(
      p => p.moduleId === moduleId
    );

    if (progressIndex === -1) {
      throw new Error(`Training progress not found for staff ${staffId} and module ${moduleId}`);
    }

    // Update progress
    staffProgressList[progressIndex] = {
      ...staffProgressList[progressIndex],
      ...progressUpdate
    };

    // Check if module is completed
    if (progressUpdate.progress === 100 && !staffProgressList[progressIndex].completedAt) {
      staffProgressList[progressIndex].completedAt = new Date();
      
      // Award certification if all assessments passed
      const allAssessmentsPassed = staffProgressList[progressIndex].assessmentScores
        .every(score => score.passed);
      
      if (allAssessmentsPassed) {
        const certification = await this.awardCertification(staffId, moduleId);
        staffProgressList[progressIndex].certificationsEarned.push(certification);
      }
    }

    this.staffProgress.set(staffId, staffProgressList);
    return staffProgressList[progressIndex];
  }

  /**
   * Submit assessment for training module
   */
  public async submitAssessment(
    staffId: string,
    moduleId: string,
    assessmentId: string,
    answers: Record<string, any>
  ): Promise<AssessmentScore> {
    const module = this.trainingModules.get(moduleId);
    if (!module) {
      throw new Error(`Training module not found: ${moduleId}`);
    }

    const assessment = module.assessments.find(a => a.assessmentId === assessmentId);
    if (!assessment) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    // Score the assessment
    const score = this.scoreAssessment(assessment, answers);
    const passed = score >= assessment.passingScore;

    const assessmentScore: AssessmentScore = {
      assessmentId,
      score,
      maxScore: assessment.questions.length,
      passed,
      completedAt: new Date(),
      attempts: 1
    };

    // Update staff progress
    const staffProgressList = this.staffProgress.get(staffId) || [];
    const progressIndex = staffProgressList.findIndex(p => p.moduleId === moduleId);
    
    if (progressIndex !== -1) {
      const existingScoreIndex = staffProgressList[progressIndex].assessmentScores
        .findIndex(s => s.assessmentId === assessmentId);
      
      if (existingScoreIndex !== -1) {
        // Update existing score
        staffProgressList[progressIndex].assessmentScores[existingScoreIndex] = {
          ...assessmentScore,
          attempts: staffProgressList[progressIndex].assessmentScores[existingScoreIndex].attempts + 1
        };
      } else {
        // Add new score
        staffProgressList[progressIndex].assessmentScores.push(assessmentScore);
      }
      
      this.staffProgress.set(staffId, staffProgressList);
    }

    return assessmentScore;
  }

  /**
   * Get cultural competency profile for staff member
   */
  public async getCulturalCompetencyProfile(staffId: string): Promise<CulturalCompetencyProfile> {
    let profile = this.competencyProfiles.get(staffId);
    
    if (!profile) {
      profile = await this.generateCompetencyProfile(staffId);
      this.competencyProfiles.set(staffId, profile);
    }

    return profile;
  }

  /**
   * Generate personalized training recommendations
   */
  public async getTrainingRecommendations(
    staffId: string,
    targetRegions?: CulturalRegion[]
  ): Promise<TrainingRecommendation[]> {
    const profile = await this.getCulturalCompetencyProfile(staffId);
    const recommendations: TrainingRecommendation[] = [];

    // Recommend modules for development areas
    for (const area of profile.developmentAreas) {
      const relevantModules = this.findModulesForDevelopmentArea(area);
      recommendations.push(...relevantModules.map(module => ({
        moduleId: module.moduleId,
        title: module.title,
        priority: 'high' as Priority,
        reason: `Addresses development area: ${area}`,
        estimatedDuration: module.duration
      })));
    }

    // Recommend modules for target regions
    if (targetRegions) {
      for (const region of targetRegions) {
        const competency = profile.regionalCompetencies.get(region) || 0;
        if (competency < 0.7) { // Below 70% competency
          const regionModules = this.getTrainingModulesForRegion(region);
          recommendations.push(...regionModules.map(module => ({
            moduleId: module.moduleId,
            title: module.title,
            priority: 'medium' as Priority,
            reason: `Improve competency for ${region}`,
            estimatedDuration: module.duration
          })));
        }
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Initialize training modules
   */
  private initializeTrainingModules(): void {
    // Cultural Awareness Fundamentals
    this.trainingModules.set('cultural-awareness-fundamentals', {
      moduleId: 'cultural-awareness-fundamentals',
      title: 'Cultural Awareness Fundamentals',
      description: 'Introduction to cultural sensitivity in admissions',
      duration: 120,
      objectives: [
        'Understand the importance of cultural sensitivity in admissions',
        'Recognize cultural biases and assumptions',
        'Learn basic cultural competency principles',
        'Develop awareness of different cultural expressions'
      ],
      content: [
        {
          contentId: 'intro-cultural-sensitivity',
          type: ContentType.Text,
          title: 'Introduction to Cultural Sensitivity',
          content: `Cultural sensitivity in admissions is crucial for creating an inclusive and fair evaluation process. Different cultures express achievements, spirituality, and personal qualities in unique ways that may not align with Western academic traditions.

Key principles include:
- Recognizing cultural differences in communication styles
- Understanding varying approaches to self-presentation
- Appreciating different spiritual expressions
- Acknowledging diverse educational systems and credentials`,
          examples: [
            {
              exampleId: 'communication-styles',
              scenario: 'An applicant from East Asia provides very humble descriptions of their achievements',
              culturalContext: 'East Asian cultures often value humility over self-promotion',
              appropriateResponse: 'Look for substance behind humble language and ask follow-up questions to understand full scope of achievements',
              inappropriateResponse: 'Assume the applicant lacks significant accomplishments',
              explanation: 'Cultural humility should not be mistaken for lack of achievement'
            }
          ],
          interactiveElements: [
            {
              elementId: 'cultural-bias-reflection',
              type: InteractiveType.Reflection,
              title: 'Cultural Bias Self-Assessment',
              description: 'Reflect on your own cultural background and potential biases',
              activity: {
                questions: [
                  'What cultural assumptions do you bring to the admissions process?',
                  'How might your background influence your evaluation of applicants?',
                  'What steps can you take to minimize cultural bias?'
                ]
              }
            }
          ]
        }
      ],
      assessments: [
        {
          assessmentId: 'cultural-awareness-quiz',
          type: AssessmentType.Quiz,
          title: 'Cultural Awareness Quiz',
          questions: [
            {
              questionId: 'communication-directness',
              type: QuestionType.MultipleChoice,
              question: 'An applicant from a high-context culture provides indirect responses during an interview. This likely indicates:',
              options: [
                'Lack of preparation',
                'Dishonesty or evasiveness',
                'Cultural communication style',
                'Lack of English proficiency'
              ],
              correctAnswer: 'Cultural communication style',
              explanation: 'High-context cultures often communicate indirectly as a sign of respect and cultural norm',
              culturalContext: 'Understanding communication styles prevents misinterpretation'
            },
            {
              questionId: 'family-involvement',
              type: QuestionType.TrueFalse,
              question: 'Family involvement in an applicant\'s decision-making process should be viewed negatively as it indicates lack of independence.',
              correctAnswer: 'False',
              explanation: 'Many cultures value family involvement in major decisions, and this should be respected rather than penalized',
              culturalContext: 'Collectivist cultures emphasize family and community input in important decisions'
            }
          ],
          passingScore: 80
        }
      ],
      resources: [
        {
          resourceId: 'cultural-dimensions-theory',
          type: ResourceType.Article,
          title: 'Hofstede\'s Cultural Dimensions Theory',
          description: 'Understanding cultural differences through dimensional analysis',
          url: 'https://example.com/cultural-dimensions'
        }
      ],
      culturalRegions: Object.values(CulturalRegion)
    });

    // West Africa Cultural Competency
    this.trainingModules.set('west-africa-competency', {
      moduleId: 'west-africa-competency',
      title: 'West Africa Cultural Competency',
      description: 'Understanding West African cultural contexts in admissions',
      duration: 90,
      objectives: [
        'Understand West African educational systems',
        'Recognize cultural values and communication styles',
        'Appreciate spiritual expression in West African contexts',
        'Learn appropriate evaluation approaches'
      ],
      content: [
        {
          contentId: 'west-africa-overview',
          type: ContentType.Text,
          title: 'West African Cultural Context',
          content: `West African cultures, including Ghanaian, Nigerian, and other regional cultures, have distinct characteristics that influence how applicants present themselves and their achievements.

Key cultural aspects:
- Community-centered worldview
- Respect for elders and authority
- Formal communication styles
- Family involvement in major decisions
- Practical approach to spirituality
- High value on education and achievement`,
          examples: [
            {
              exampleId: 'community-achievement',
              scenario: 'An applicant describes their achievements in terms of community benefit rather than personal accomplishment',
              culturalContext: 'West African cultures often emphasize collective success over individual achievement',
              appropriateResponse: 'Recognize the applicant\'s role in community achievements and ask about their specific contributions',
              inappropriateResponse: 'Assume the applicant lacks individual accomplishments',
              explanation: 'Community-focused descriptions often indicate strong leadership and service orientation'
            }
          ],
          interactiveElements: []
        }
      ],
      assessments: [
        {
          assessmentId: 'west-africa-scenarios',
          type: AssessmentType.Scenario,
          title: 'West African Cultural Scenarios',
          questions: [
            {
              questionId: 'family-consultation',
              type: QuestionType.Scenario,
              question: 'An applicant from Ghana mentions they need to consult with their family before making a final decision about enrollment. How should you respond?',
              correctAnswer: 'Respect the family consultation process and provide a reasonable timeline for decision-making',
              explanation: 'Family consultation is a cultural norm and sign of respect, not indecision',
              culturalContext: 'West African cultures value family input in major life decisions'
            }
          ],
          passingScore: 75
        }
      ],
      resources: [
        {
          resourceId: 'west-african-education-systems',
          type: ResourceType.Article,
          title: 'Understanding West African Education Systems',
          description: 'Overview of WAEC, JAMB, and university systems in West Africa'
        }
      ],
      culturalRegions: [CulturalRegion.WestAfrica]
    });

    // Add more modules for other regions...
    this.initializeMiddleEastModule();
    this.initializeEastAsiaModule();
    this.initializeLatinAmericaModule();
  }

  private initializeMiddleEastModule(): void {
    this.trainingModules.set('middle-east-competency', {
      moduleId: 'middle-east-competency',
      title: 'Middle East Cultural Competency',
      description: 'Understanding Middle Eastern cultural contexts in admissions',
      duration: 90,
      objectives: [
        'Understand Middle Eastern cultural values',
        'Recognize communication patterns and social norms',
        'Appreciate Christian heritage in the Middle East',
        'Learn sensitive evaluation approaches'
      ],
      content: [
        {
          contentId: 'middle-east-overview',
          type: ContentType.Text,
          title: 'Middle Eastern Cultural Context',
          content: `Middle Eastern cultures have rich Christian heritage and distinct cultural characteristics that influence applicant presentation and evaluation.

Key cultural aspects:
- High-context communication
- Respect for hierarchy and authority
- Hospitality and relationship-building
- Family honor and collective identity
- Historical Christian traditions
- Formal educational systems`,
          examples: [
            {
              exampleId: 'indirect-communication',
              scenario: 'An applicant provides lengthy, contextual responses rather than direct answers',
              culturalContext: 'Middle Eastern cultures often use high-context, indirect communication',
              appropriateResponse: 'Listen for the full context and meaning behind the communication style',
              inappropriateResponse: 'Push for more direct, concise answers',
              explanation: 'Indirect communication shows respect and provides important context'
            }
          ],
          interactiveElements: []
        }
      ],
      assessments: [
        {
          assessmentId: 'middle-east-assessment',
          type: AssessmentType.Quiz,
          title: 'Middle Eastern Cultural Assessment',
          questions: [
            {
              questionId: 'communication-style',
              type: QuestionType.MultipleChoice,
              question: 'When interviewing applicants from Middle Eastern cultures, you should:',
              options: [
                'Push for direct, concise answers',
                'Allow time for relationship-building and context',
                'Focus only on academic achievements',
                'Avoid discussing cultural background'
              ],
              correctAnswer: 'Allow time for relationship-building and context',
              explanation: 'Middle Eastern cultures value relationship-building and contextual communication',
              culturalContext: 'High-context cultures require time for proper communication'
            }
          ],
          passingScore: 75
        }
      ],
      resources: [],
      culturalRegions: [CulturalRegion.MiddleEast]
    });
  }

  private initializeEastAsiaModule(): void {
    // Implementation for East Asia module
  }

  private initializeLatinAmericaModule(): void {
    // Implementation for Latin America module
  }

  private scoreAssessment(
    assessment: TrainingAssessment,
    answers: Record<string, any>
  ): number {
    let correctAnswers = 0;
    
    for (const question of assessment.questions) {
      const userAnswer = answers[question.questionId];
      if (this.isAnswerCorrect(question, userAnswer)) {
        correctAnswers++;
      }
    }
    
    return (correctAnswers / assessment.questions.length) * 100;
  }

  private isAnswerCorrect(question: TrainingQuestion, userAnswer: any): boolean {
    if (Array.isArray(question.correctAnswer)) {
      return Array.isArray(userAnswer) && 
        userAnswer.every(answer => question.correctAnswer.includes(answer));
    }
    return userAnswer === question.correctAnswer;
  }

  private async awardCertification(
    staffId: string,
    moduleId: string
  ): Promise<Certification> {
    const module = this.trainingModules.get(moduleId);
    if (!module) {
      throw new Error(`Module not found: ${moduleId}`);
    }

    return {
      certificationId: `cert_${moduleId}_${staffId}_${Date.now()}`,
      name: `${module.title} Certification`,
      earnedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      culturalRegions: module.culturalRegions
    };
  }

  private async generateCompetencyProfile(staffId: string): Promise<CulturalCompetencyProfile> {
    const staffProgressList = this.staffProgress.get(staffId) || [];
    const regionalCompetencies = new Map<CulturalRegion, number>();
    
    // Calculate regional competencies based on completed training
    for (const region of Object.values(CulturalRegion)) {
      const regionModules = this.getTrainingModulesForRegion(region);
      const completedModules = staffProgressList.filter(
        progress => progress.completedAt && 
        regionModules.some(module => module.moduleId === progress.moduleId)
      );
      
      const competency = completedModules.length / regionModules.length;
      regionalCompetencies.set(region, competency);
    }

    // Calculate overall competency
    const overallCompetency = Array.from(regionalCompetencies.values())
      .reduce((sum, comp) => sum + comp, 0) / regionalCompetencies.size;

    // Identify strengths and development areas
    const strengths: string[] = [];
    const developmentAreas: string[] = [];
    
    for (const [region, competency] of regionalCompetencies) {
      if (competency >= 0.8) {
        strengths.push(`Strong competency in ${region}`);
      } else if (competency < 0.5) {
        developmentAreas.push(`Needs development in ${region}`);
      }
    }

    return {
      staffId,
      overallCompetency,
      regionalCompetencies,
      strengths,
      developmentAreas,
      recommendedTraining: [],
      lastAssessed: new Date()
    };
  }

  private findModulesForDevelopmentArea(area: string): TrainingModule[] {
    // Implementation would find relevant modules for development area
    return Array.from(this.trainingModules.values()).filter(
      module => module.description.toLowerCase().includes(area.toLowerCase())
    );
  }
}

// Supporting interfaces
interface TrainingRecommendation {
  moduleId: string;
  title: string;
  priority: Priority;
  reason: string;
  estimatedDuration: number;
}

type Priority = 'high' | 'medium' | 'low';