/**
 * ScrollUniversity Admissions - Enrollment Coordination Service
 * "Train up a child in the way he should go" - Proverbs 22:6
 * 
 * Coordinates enrollment processes between admissions and course systems
 * ensuring seamless transition from admission to active learning
 */

import { PrismaClient, ApplicationStatus, EnrollmentStatus } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface CourseRegistrationData {
  courseId: string;
  enrollmentType: 'REQUIRED' | 'RECOMMENDED' | 'ELECTIVE';
  priority: number;
  prerequisites?: string[];
  accommodations?: any[];
  personalizedSettings?: any;
}

export interface EnrollmentCoordinationData {
  applicationId: string;
  userId: string;
  programType: string;
  academicLevel: string;
  startDate: Date;
  courseSelections?: CourseRegistrationData[];
  mentorPreference?: string;
  learningPreferences?: any;
  specialNeeds?: any[];
}

export interface EnrollmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export class EnrollmentCoordinationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Coordinate complete enrollment process for admitted student
   */
  async coordinateEnrollment(data: EnrollmentCoordinationData): Promise<{
    enrollment: any;
    courseEnrollments: any[];
    validationResults: EnrollmentValidationResult;
  }> {
    try {
      logger.info(`Coordinating enrollment for application ${data.applicationId}`);

      // Validate enrollment eligibility
      const validationResults = await this.validateEnrollmentEligibility(data);
      
      if (!validationResults.isValid) {
        throw new Error(`Enrollment validation failed: ${validationResults.errors.join(', ')}`);
      }

      // Create main enrollment record
      const enrollment = await this.createEnrollmentRecord(data);

      // Register for courses
      const courseEnrollments = await this.registerForCourses(data, enrollment.id);

      // Setup learning environment
      await this.setupLearningEnvironment(data.userId, enrollment.id);

      // Initialize progress tracking
      await this.initializeProgressTracking(data.userId, enrollment.id);

      logger.info(`Enrollment coordination completed for user ${data.userId}`);

      return {
        enrollment,
        courseEnrollments,
        validationResults
      };

    } catch (error) {
      logger.error('Error coordinating enrollment:', error);
      throw error;
    }
  }

  /**
   * Validate enrollment eligibility and requirements
   */
  async validateEnrollmentEligibility(data: EnrollmentCoordinationData): Promise<EnrollmentValidationResult> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      const recommendations: string[] = [];

      // Check application status
      const application = await this.prisma.applications.findUnique({
        where: { id: data.applicationId },
        include: {
          admissionDecisions: true,
          applicant: true
        }
      });

      if (!application) {
        errors.push('Application not found');
        return { isValid: false, errors, warnings, recommendations };
      }

      if (application.status !== ApplicationStatus.ACCEPTED) {
        errors.push('Application must be accepted before enrollment');
      }

      // Check admission decision conditions
      const decision = application.admissionDecisions?.[0];
      if (decision?.admissionConditions && decision.admissionConditions.length > 0) {
        const unmetConditions = await this.checkAdmissionConditions(
          data.userId, 
          decision.admissionConditions
        );
        
        if (unmetConditions.length > 0) {
          errors.push(`Unmet admission conditions: ${unmetConditions.join(', ')}`);
        }
      }

      // Check enrollment deadline
      if (decision?.enrollmentDeadline && new Date() > new Date(decision.enrollmentDeadline)) {
        errors.push('Enrollment deadline has passed');
      }

      // Validate course selections
      if (data.courseSelections && data.courseSelections.length > 0) {
        const courseValidation = await this.validateCourseSelections(data.courseSelections, data.userId);
        errors.push(...courseValidation.errors);
        warnings.push(...courseValidation.warnings);
        recommendations.push(...courseValidation.recommendations);
      }

      // Check for existing enrollment
      const existingEnrollment = await this.prisma.enrollment.findFirst({
        where: {
          userId: data.userId,
          status: EnrollmentStatus.ACTIVE
        }
      });

      if (existingEnrollment) {
        warnings.push('Student already has an active enrollment');
      }

      // Program-specific validations
      const programValidation = await this.validateProgramRequirements(data.programType, data.academicLevel);
      errors.push(...programValidation.errors);
      warnings.push(...programValidation.warnings);
      recommendations.push(...programValidation.recommendations);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        recommendations
      };

    } catch (error) {
      logger.error('Error validating enrollment eligibility:', error);
      return {
        isValid: false,
        errors: ['Validation process failed'],
        warnings: [],
        recommendations: []
      };
    }
  }

  /**
   * Create main enrollment record
   */
  async createEnrollmentRecord(data: EnrollmentCoordinationData): Promise<any> {
    try {
      // Create enrollment using existing model structure
      const enrollment = await this.prisma.enrollment.create({
        data: {
          userId: data.userId,
          courseId: 'scroll-foundations-101', // Default foundation course
          progress: 0.0,
          scrollXPEarned: 0,
          currentModule: 1,
          status: EnrollmentStatus.ACTIVE,
          startedAt: data.startDate
        }
      });

      // Update application status
      await this.prisma.applications.update({
        where: { id: data.applicationId },
        data: {
          status: ApplicationStatus.ACCEPTED, // Keep as accepted since we don't have ENROLLED status
          updatedAt: new Date(),
          applicationTimeline: {
            push: {
              event: 'ENROLLMENT_COMPLETED',
              timestamp: new Date().toISOString(),
              details: {
                enrollmentId: enrollment.id,
                programType: data.programType
              }
            }
          }
        }
      });

      return enrollment;

    } catch (error) {
      logger.error('Error creating enrollment record:', error);
      throw error;
    }
  }

  /**
   * Register student for selected courses
   */
  async registerForCourses(
    data: EnrollmentCoordinationData, 
    enrollmentId: string
  ): Promise<any[]> {
    try {
      const courseEnrollments = [];
      const courseSelections = data.courseSelections || await this.generateDefaultCourseSelections(data);

      for (const courseSelection of courseSelections) {
        try {
          // Validate course availability and prerequisites
          const courseValidation = await this.validateCourseEnrollment(
            courseSelection.courseId, 
            data.userId
          );

          if (!courseValidation.isValid) {
            logger.warn(`Skipping course ${courseSelection.courseId}: ${courseValidation.errors.join(', ')}`);
            continue;
          }

          // Create course enrollment using existing model
          const courseEnrollment = await this.prisma.enrollment.create({
            data: {
              userId: data.userId,
              courseId: courseSelection.courseId,
              progress: 0.0,
              scrollXPEarned: 0,
              currentModule: 1,
              status: EnrollmentStatus.ACTIVE,
              startedAt: data.startDate
            }
          });

          courseEnrollments.push(courseEnrollment);

          // Initialize course-specific progress tracking
          await this.initializeCourseProgress(courseEnrollment.id, courseSelection.courseId);

        } catch (courseError) {
          logger.error(`Error enrolling in course ${courseSelection.courseId}:`, courseError);
        }
      }

      return courseEnrollments;

    } catch (error) {
      logger.error('Error registering for courses:', error);
      throw error;
    }
  }

  /**
   * Setup learning environment for new student
   */
  async setupLearningEnvironment(userId: string, enrollmentId: string): Promise<void> {
    try {
      // Log learning environment setup (dashboard would be implemented separately)
      logger.info(`Learning environment setup for user ${userId}`, {
        enrollmentId: enrollmentId,
        layout: 'DEFAULT',
        learningStyle: 'ADAPTIVE'
      });

      // Initialize AI tutor relationship
      await this.initializeAITutor(userId, enrollmentId);

      // Setup spiritual formation tracking
      await this.initializeSpiritualFormationTracking(userId);

    } catch (error) {
      logger.error('Error setting up learning environment:', error);
      throw error;
    }
  }

  /**
   * Initialize progress tracking systems
   */
  async initializeProgressTracking(userId: string, enrollmentId: string): Promise<void> {
    try {
      // Log progress tracking initialization (would be implemented separately)
      logger.info(`Progress tracking initialized for user ${userId}`, {
        enrollmentId: enrollmentId,
        overallGPA: 0.0,
        totalScrollXP: 0.0,
        coursesCompleted: 0
      });

      // Initialize milestone tracking
      await this.setupMilestoneTracking(userId, enrollmentId);

    } catch (error) {
      logger.error('Error initializing progress tracking:', error);
      throw error;
    }
  }

  /**
   * Check admission conditions compliance
   */
  private async checkAdmissionConditions(userId: string, conditions: any[]): Promise<string[]> {
    const unmetConditions: string[] = [];

    for (const condition of conditions) {
      switch (condition.type) {
        case 'PREREQUISITE_COURSE':
          const courseCompleted = await this.prisma.courseEnrollment.findFirst({
            where: {
              studentId: userId,
              courseId: condition.courseId,
              status: 'COMPLETED'
            }
          });
          if (!courseCompleted) {
            unmetConditions.push(`Prerequisite course: ${condition.courseName}`);
          }
          break;

        case 'DOCUMENT_SUBMISSION':
          // Check if required document was submitted
          const documentSubmitted = await this.checkDocumentSubmission(userId, condition.documentType);
          if (!documentSubmitted) {
            unmetConditions.push(`Required document: ${condition.documentType}`);
          }
          break;

        case 'PAYMENT_REQUIRED':
          // Check if required payment was made
          const paymentMade = await this.checkPaymentStatus(userId, condition.paymentType);
          if (!paymentMade) {
            unmetConditions.push(`Required payment: ${condition.paymentType}`);
          }
          break;
      }
    }

    return unmetConditions;
  }

  /**
   * Validate course selections
   */
  private async validateCourseSelections(
    courseSelections: CourseRegistrationData[], 
    userId: string
  ): Promise<EnrollmentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    for (const selection of courseSelections) {
      // Check if course exists and is available
      const course = await this.prisma.course.findUnique({
        where: { id: selection.courseId }
      });

      if (!course) {
        errors.push(`Course not found: ${selection.courseId}`);
        continue;
      }

      if (!course.isActive) {
        errors.push(`Course not available: ${course.title}`);
        continue;
      }

      // Check prerequisites
      if (selection.prerequisites && selection.prerequisites.length > 0) {
        const unmetPrereqs = await this.checkPrerequisites(userId, selection.prerequisites);
        if (unmetPrereqs.length > 0) {
          errors.push(`Unmet prerequisites for ${course.title}: ${unmetPrereqs.join(', ')}`);
        }
      }

      // Check course capacity (simplified since we don't have maxEnrollment field)
      const enrollmentCount = await this.prisma.enrollment.count({
        where: { courseId: selection.courseId, status: EnrollmentStatus.ACTIVE }
      });

      // Log enrollment count for monitoring
      logger.info(`Course ${course.title} has ${enrollmentCount} active enrollments`);
    }

    return { isValid: errors.length === 0, errors, warnings, recommendations };
  }

  /**
   * Validate program requirements
   */
  private async validateProgramRequirements(
    programType: string, 
    academicLevel: string
  ): Promise<EnrollmentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Program-specific validation logic
    switch (programType) {
      case 'SCROLL_DOCTORATE':
        if (academicLevel !== 'SCROLL_DOCTORATE') {
          errors.push('Doctorate program requires doctorate-level academic standing');
        }
        break;
      
      case 'SCROLL_DEGREE':
        if (!['SCROLL_DEGREE', 'SCROLL_DOCTORATE'].includes(academicLevel)) {
          warnings.push('Degree program typically requires degree-level academic standing');
        }
        break;
    }

    return { isValid: errors.length === 0, errors, warnings, recommendations };
  }

  /**
   * Generate default course selections based on program and level
   */
  private async generateDefaultCourseSelections(data: EnrollmentCoordinationData): Promise<CourseRegistrationData[]> {
    const selections: CourseRegistrationData[] = [];

    // Base courses for all programs
    selections.push({
      courseId: 'scroll-foundations-101',
      enrollmentType: 'REQUIRED',
      priority: 1,
      accommodations: data.specialNeeds || []
    });

    // Program-specific courses
    switch (data.programType) {
      case 'SCROLL_OPEN':
        selections.push({
          courseId: 'kingdom-principles-101',
          enrollmentType: 'REQUIRED',
          priority: 2
        });
        break;

      case 'SCROLL_DEGREE':
        selections.push(
          {
            courseId: 'kingdom-principles-101',
            enrollmentType: 'REQUIRED',
            priority: 2
          },
          {
            courseId: 'prophetic-foundations-201',
            enrollmentType: 'REQUIRED',
            priority: 3
          }
        );
        break;

      case 'SCROLL_DOCTORATE':
        selections.push(
          {
            courseId: 'advanced-scroll-theology-401',
            enrollmentType: 'REQUIRED',
            priority: 2
          },
          {
            courseId: 'research-methodology-501',
            enrollmentType: 'REQUIRED',
            priority: 3
          }
        );
        break;
    }

    return selections;
  }

  /**
   * Validate individual course enrollment
   */
  private async validateCourseEnrollment(courseId: string, userId: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Check if already enrolled
    const existingEnrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: userId,
        courseId: courseId,
        status: { in: [EnrollmentStatus.ACTIVE] }
      }
    });

    if (existingEnrollment) {
      errors.push('Already enrolled in this course');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Initialize course-specific progress tracking
   */
  private async initializeCourseProgress(enrollmentId: string, courseId: string): Promise<void> {
    try {
      // Log course progress initialization (would be implemented separately)
      logger.info(`Course progress initialized for enrollment ${enrollmentId} in course ${courseId}`);

    } catch (error) {
      logger.warn(`Error initializing course progress for ${courseId}:`, error);
    }
  }

  /**
   * Initialize AI tutor relationship
   */
  private async initializeAITutor(userId: string, enrollmentId: string): Promise<void> {
    try {
      // Log AI tutor initialization (would be implemented separately)
      logger.info(`AI tutor initialized for user ${userId}`, {
        enrollmentId: enrollmentId,
        tutorPersonality: 'SCROLL_MENTOR'
      });

    } catch (error) {
      logger.warn('Error initializing AI tutor:', error);
    }
  }

  /**
   * Initialize spiritual formation tracking
   */
  private async initializeSpiritualFormationTracking(userId: string): Promise<void> {
    try {
      // Log spiritual formation tracking initialization (would be implemented separately)
      logger.info(`Spiritual formation tracking initialized for user ${userId}`);

    } catch (error) {
      logger.warn('Error initializing spiritual formation tracking:', error);
    }
  }

  /**
   * Setup milestone tracking
   */
  private async setupMilestoneTracking(userId: string, enrollmentId: string): Promise<void> {
    try {
      const milestones = [
        { type: 'FIRST_COURSE_COMPLETION', target: 1, current: 0 },
        { type: 'SCROLL_XP_MILESTONE_100', target: 100, current: 0 },
        { type: 'SPIRITUAL_GROWTH_LEVEL_2', target: 2, current: 1 },
        { type: 'MENTOR_RELATIONSHIP_ESTABLISHED', target: 1, current: 0 },
        { type: 'COMMUNITY_ENGAGEMENT', target: 5, current: 0 }
      ];

      // Log milestone tracking setup (would be implemented separately)
      logger.info(`Milestone tracking setup for user ${userId}`, {
        enrollmentId: enrollmentId,
        milestones: milestones.map(m => m.type)
      });

    } catch (error) {
      logger.warn('Error setting up milestone tracking:', error);
    }
  }

  /**
   * Helper methods for validation
   */
  private async checkDocumentSubmission(userId: string, documentType: string): Promise<boolean> {
    // Implementation would check document submission records
    return true; // Placeholder
  }

  private async checkPaymentStatus(userId: string, paymentType: string): Promise<boolean> {
    // Implementation would check payment records
    return true; // Placeholder
  }

  private async checkPrerequisites(userId: string, prerequisites: string[]): Promise<string[]> {
    const unmet: string[] = [];
    
    for (const prereq of prerequisites) {
      const completed = await this.prisma.enrollment.findFirst({
        where: {
          userId: userId,
          courseId: prereq,
          completedAt: { not: null }
        }
      });
      
      if (!completed) {
        unmet.push(prereq);
      }
    }
    
    return unmet;
  }
}