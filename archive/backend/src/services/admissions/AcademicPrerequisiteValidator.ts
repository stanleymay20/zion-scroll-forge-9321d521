import { PrismaClient } from '@prisma/client';
import { Logger } from '../../utils/logger';
import { PrerequisiteCheck, CheckStatus } from './EligibilityChecker';

export interface AcademicSubject {
  name: string;
  requiredLevel: string;
  description: string;
  remedialAvailable: boolean;
  weight: number;
}

export interface TranscriptAnalysis {
  subject: string;
  grade: string;
  credits: number;
  level: string;
  institution: string;
  verified: boolean;
}

export interface PrerequisiteValidationResult {
  applicationId: string;
  subjectChecks: PrerequisiteCheck[];
  overallStatus: CheckStatus;
  remedialPlan: RemedialPlan[];
  recommendations: string[];
}

export interface RemedialPlan {
  subject: string;
  requiredCourses: string[];
  estimatedDuration: string;
  provider: string;
  cost?: number;
}

export class AcademicPrerequisiteValidator {
  private prisma: PrismaClient;
  private logger: Logger;
  private requiredSubjects: AcademicSubject[];

  constructor() {
    this.prisma = new PrismaClient();
    this.logger = new Logger('AcademicPrerequisiteValidator');
    this.initializeRequiredSubjects();
  }

  /**
   * Initialize required academic subjects for ScrollUniversity admission
   */
  private initializeRequiredSubjects(): void {
    this.requiredSubjects = [
      {
        name: 'Mathematics',
        requiredLevel: 'Algebra II',
        description: 'Mathematical reasoning and problem-solving skills',
        remedialAvailable: true,
        weight: 0.25
      },
      {
        name: 'English Language Arts',
        requiredLevel: 'College Preparatory',
        description: 'Reading comprehension, writing, and communication skills',
        remedialAvailable: true,
        weight: 0.30
      },
      {
        name: 'Science',
        requiredLevel: 'Biology or Chemistry',
        description: 'Scientific method and analytical thinking',
        remedialAvailable: true,
        weight: 0.20
      },
      {
        name: 'History/Social Studies',
        requiredLevel: 'World History',
        description: 'Historical context and cultural understanding',
        remedialAvailable: true,
        weight: 0.15
      },
      {
        name: 'Biblical Studies',
        requiredLevel: 'Basic',
        description: 'Foundational biblical knowledge and interpretation',
        remedialAvailable: true,
        weight: 0.10
      }
    ];
  }

  /**
   * Validates academic prerequisites for an application
   */
  async validatePrerequisites(applicationId: string): Promise<PrerequisiteValidationResult> {
    try {
      this.logger.info(`Validating academic prerequisites for application ${applicationId}`);

      // Get application and education data
      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId }
      });

      if (!application) {
        throw new Error(`Application ${applicationId} not found`);
      }

      const educationData = application.application_data?.education;
      if (!educationData) {
        throw new Error('Education data not found in application');
      }

      // Analyze transcripts and academic records
      const transcriptAnalysis = await this.analyzeTranscripts(educationData);
      
      // Check each required subject
      const subjectChecks = await this.checkRequiredSubjects(transcriptAnalysis);
      
      // Determine overall status
      const overallStatus = this.determineOverallStatus(subjectChecks);
      
      // Generate remedial plan if needed
      const remedialPlan = await this.generateRemedialPlan(subjectChecks);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(subjectChecks, overallStatus);

      const result: PrerequisiteValidationResult = {
        applicationId,
        subjectChecks,
        overallStatus,
        remedialPlan,
        recommendations
      };

      this.logger.info(`Academic prerequisite validation completed for application ${applicationId}: ${overallStatus}`);
      return result;

    } catch (error) {
      this.logger.error(`Error validating prerequisites for application ${applicationId}:`, error);
      throw error;
    }
  }

  /**
   * Analyzes transcripts and academic records
   */
  private async analyzeTranscripts(educationData: any): Promise<TranscriptAnalysis[]> {
    const analysis: TranscriptAnalysis[] = [];
    
    // Process high school courses
    if (educationData.highSchoolCourses) {
      for (const course of educationData.highSchoolCourses) {
        analysis.push({
          subject: this.categorizeSubject(course.name),
          grade: course.grade,
          credits: course.credits || 1,
          level: course.level || 'Standard',
          institution: educationData.highSchoolName,
          verified: course.verified || false
        });
      }
    }

    // Process college courses if any
    if (educationData.collegeCourses) {
      for (const course of educationData.collegeCourses) {
        analysis.push({
          subject: this.categorizeSubject(course.name),
          grade: course.grade,
          credits: course.credits || 3,
          level: 'College',
          institution: course.institution,
          verified: course.verified || false
        });
      }
    }

    return analysis;
  }

  /**
   * Categorizes course names into standard subjects
   */
  private categorizeSubject(courseName: string): string {
    const name = courseName.toLowerCase();
    
    if (name.includes('math') || name.includes('algebra') || name.includes('geometry') || 
        name.includes('calculus') || name.includes('statistics')) {
      return 'Mathematics';
    }
    
    if (name.includes('english') || name.includes('literature') || name.includes('writing') || 
        name.includes('composition')) {
      return 'English Language Arts';
    }
    
    if (name.includes('biology') || name.includes('chemistry') || name.includes('physics') || 
        name.includes('science')) {
      return 'Science';
    }
    
    if (name.includes('history') || name.includes('social') || name.includes('government') || 
        name.includes('civics')) {
      return 'History/Social Studies';
    }
    
    if (name.includes('bible') || name.includes('theology') || name.includes('religion') || 
        name.includes('christian')) {
      return 'Biblical Studies';
    }
    
    return 'Other';
  }

  /**
   * Checks each required subject against transcript analysis
   */
  private async checkRequiredSubjects(transcriptAnalysis: TranscriptAnalysis[]): Promise<PrerequisiteCheck[]> {
    const checks: PrerequisiteCheck[] = [];

    for (const subject of this.requiredSubjects) {
      const relevantCourses = transcriptAnalysis.filter(course => course.subject === subject.name);
      const check = await this.evaluateSubjectRequirement(subject, relevantCourses);
      checks.push(check);
    }

    return checks;
  }

  /**
   * Evaluates a specific subject requirement
   */
  private async evaluateSubjectRequirement(
    subject: AcademicSubject, 
    courses: TranscriptAnalysis[]
  ): Promise<PrerequisiteCheck> {
    
    if (courses.length === 0) {
      return {
        subject: subject.name,
        requiredLevel: subject.requiredLevel,
        currentLevel: 'None',
        status: CheckStatus.FAILED,
        evidence: [],
        remedialRequired: subject.remedialAvailable
      };
    }

    // Find the highest level course
    const highestLevelCourse = this.findHighestLevelCourse(courses);
    const meetsRequirement = this.evaluateLevel(highestLevelCourse.level, subject.requiredLevel);
    const hasPassingGrade = this.hasPassingGrade(highestLevelCourse.grade);

    const status = meetsRequirement && hasPassingGrade ? 
      CheckStatus.PASSED : 
      (subject.remedialAvailable ? CheckStatus.FAILED : CheckStatus.FAILED);

    return {
      subject: subject.name,
      requiredLevel: subject.requiredLevel,
      currentLevel: highestLevelCourse.level,
      status,
      evidence: courses.map(course => 
        `${course.institution}: ${course.grade} in ${course.level} level course`
      ),
      remedialRequired: !meetsRequirement && subject.remedialAvailable
    };
  }

  /**
   * Finds the highest level course from a list
   */
  private findHighestLevelCourse(courses: TranscriptAnalysis[]): TranscriptAnalysis {
    const levelHierarchy = ['Basic', 'Standard', 'Honors', 'AP', 'College'];
    
    return courses.reduce((highest, current) => {
      const currentIndex = levelHierarchy.indexOf(current.level);
      const highestIndex = levelHierarchy.indexOf(highest.level);
      return currentIndex > highestIndex ? current : highest;
    });
  }

  /**
   * Evaluates if current level meets required level
   */
  private evaluateLevel(currentLevel: string, requiredLevel: string): boolean {
    const levelMappings: { [key: string]: number } = {
      'Basic': 1,
      'Standard': 2,
      'Algebra I': 2,
      'Algebra II': 3,
      'Geometry': 3,
      'College Preparatory': 3,
      'Honors': 4,
      'AP': 5,
      'College': 5
    };

    const currentScore = levelMappings[currentLevel] || 0;
    const requiredScore = levelMappings[requiredLevel] || 0;

    return currentScore >= requiredScore;
  }

  /**
   * Checks if grade is passing
   */
  private hasPassingGrade(grade: string): boolean {
    const passingGrades = ['A', 'B', 'C', 'D', 'P', 'Pass'];
    const numericGrade = parseFloat(grade);
    
    if (!isNaN(numericGrade)) {
      return numericGrade >= 60; // Assuming 60% is passing
    }
    
    return passingGrades.some(passing => grade.toUpperCase().includes(passing));
  }

  /**
   * Determines overall prerequisite status
   */
  private determineOverallStatus(subjectChecks: PrerequisiteCheck[]): CheckStatus {
    const failedChecks = subjectChecks.filter(check => check.status === CheckStatus.FAILED);
    const remedialRequired = subjectChecks.filter(check => check.remedialRequired);

    if (failedChecks.length > 0 && remedialRequired.length === 0) {
      return CheckStatus.FAILED;
    }

    if (remedialRequired.length > 0) {
      return CheckStatus.PENDING; // Conditional on completing remedial work
    }

    return CheckStatus.PASSED;
  }

  /**
   * Generates remedial plan for failed prerequisites
   */
  private async generateRemedialPlan(subjectChecks: PrerequisiteCheck[]): Promise<RemedialPlan[]> {
    const remedialPlans: RemedialPlan[] = [];
    
    const remedialNeeded = subjectChecks.filter(check => check.remedialRequired);

    for (const check of remedialNeeded) {
      const plan = await this.createSubjectRemedialPlan(check);
      remedialPlans.push(plan);
    }

    return remedialPlans;
  }

  /**
   * Creates remedial plan for a specific subject
   */
  private async createSubjectRemedialPlan(check: PrerequisiteCheck): Promise<RemedialPlan> {
    const remedialCourses: { [key: string]: string[] } = {
      'Mathematics': ['Pre-Algebra', 'Algebra I', 'Algebra II'],
      'English Language Arts': ['Basic Writing', 'Reading Comprehension', 'College Prep English'],
      'Science': ['General Science', 'Biology Fundamentals'],
      'History/Social Studies': ['World History Survey'],
      'Biblical Studies': ['Introduction to Bible', 'Biblical Interpretation']
    };

    return {
      subject: check.subject,
      requiredCourses: remedialCourses[check.subject] || ['Foundation Course'],
      estimatedDuration: '3-6 months',
      provider: 'ScrollUniversity Preparatory Program',
      cost: 299 // Base cost for remedial courses
    };
  }

  /**
   * Generates recommendations based on prerequisite evaluation
   */
  private generateRecommendations(
    subjectChecks: PrerequisiteCheck[], 
    overallStatus: CheckStatus
  ): string[] {
    const recommendations: string[] = [];

    if (overallStatus === CheckStatus.PASSED) {
      recommendations.push('All academic prerequisites met. Ready for admission consideration.');
    }

    if (overallStatus === CheckStatus.PENDING) {
      const remedialSubjects = subjectChecks
        .filter(check => check.remedialRequired)
        .map(check => check.subject);
      
      recommendations.push(
        `Complete remedial coursework in: ${remedialSubjects.join(', ')} before enrollment.`
      );
      recommendations.push('Consider enrolling in ScrollUniversity Preparatory Program.');
    }

    if (overallStatus === CheckStatus.FAILED) {
      recommendations.push('Academic prerequisites not met. Consider alternative preparation options.');
    }

    // Subject-specific recommendations
    const weakSubjects = subjectChecks.filter(check => 
      check.status === CheckStatus.FAILED || check.remedialRequired
    );

    for (const subject of weakSubjects) {
      if (subject.subject === 'Mathematics') {
        recommendations.push('Strong mathematical foundation is essential for scroll-aligned learning.');
      }
      if (subject.subject === 'English Language Arts') {
        recommendations.push('Excellent communication skills are crucial for kingdom impact.');
      }
      if (subject.subject === 'Biblical Studies') {
        recommendations.push('Biblical literacy is fundamental to ScrollUniversity education.');
      }
    }

    return recommendations;
  }

  /**
   * Gets prerequisite requirements for display
   */
  getPrerequisiteRequirements(): AcademicSubject[] {
    return [...this.requiredSubjects];
  }
}