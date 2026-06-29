/**
 * ScrollUniversity Admissions - Student Profile Integration Service
 * "Before I formed you in the womb I knew you" - Jeremiah 1:5
 * 
 * Handles seamless integration between admissions system and student profile system
 * for admitted students, creating comprehensive profiles and enabling enrollment
 */

import { PrismaClient, User, UserRole, AcademicLevel, ApplicationStatus, ProgramType } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface StudentProfileData {
  // Basic Identity
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  location?: string;
  dateOfBirth?: Date;
  
  // Spiritual Formation
  scrollCalling?: string;
  spiritualGifts?: string[];
  kingdomVision?: string;
  scrollAlignment?: number;
  
  // Academic Information
  academicLevel: AcademicLevel;
  intendedProgram: string;
  
  // Profile Preferences
  preferredLanguage?: string;
  timeZone?: string;
  bio?: string;
}

export interface EnrollmentData {
  programType: string;
  startDate: Date;
  academicLevel: AcademicLevel;
  mentorAssignment?: string;
  specialAccommodations?: any[];
  enrollmentConditions?: any[];
}

export interface AcademicRecordData {
  previousEducation: any[];
  academicPerformance: any;
  skillAssessments: any[];
  transcriptData: any;
  credentialVerifications: any[];
}

export class StudentProfileIntegrationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create comprehensive student profile for admitted student
   */
  async createStudentProfile(
    applicationId: string,
    profileData: StudentProfileData
  ): Promise<User> {
    try {
      logger.info(`Creating student profile for application ${applicationId}`);

      // Get application with all related data
      const application = await this.prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          applicant: true,
          spiritualEvaluations: true,
          academicEvaluations: true,
          admissionDecisions: true
        }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      if (application.status !== ApplicationStatus.ACCEPTED) {
        throw new Error('Cannot create profile for non-accepted application');
      }

      // Extract spiritual formation data from evaluations
      const spiritualData = this.extractSpiritualFormationData(application.spiritualEvaluations);
      const academicData = this.extractAcademicData(application.academicEvaluations);

      // Update user profile with comprehensive data
      const updatedUser = await this.prisma.user.update({
        where: { id: application.applicantId },
        data: {
          // Update basic information if provided
          firstName: profileData.firstName || application.applicant.firstName,
          lastName: profileData.lastName || application.applicant.lastName,
          phoneNumber: profileData.phoneNumber || application.applicant.phoneNumber,
          location: profileData.location || application.applicant.location,
          dateOfBirth: profileData.dateOfBirth,
          
          // Set academic status
          role: UserRole.STUDENT,
          academicLevel: profileData.academicLevel,
          enrollmentStatus: 'ACTIVE',
          
          // Spiritual formation data
          scrollCalling: profileData.scrollCalling || spiritualData.callingClarity,
          spiritualGifts: profileData.spiritualGifts || spiritualData.spiritualGifts,
          kingdomVision: profileData.kingdomVision || spiritualData.kingdomVision,
          scrollAlignment: profileData.scrollAlignment || spiritualData.scrollAlignment,
          
          // Profile preferences
          preferredLanguage: profileData.preferredLanguage || 'en',
          timeZone: profileData.timeZone || 'UTC',
          bio: profileData.bio,
          
          // Initialize ScrollCoin balance
          scrollCoinBalance: 100.0, // Welcome bonus
          workTradeCredits: 0.0,
          
          updatedAt: new Date()
        }
      });

      logger.info(`Student profile created successfully for user ${updatedUser.id}`);
      return updatedUser;

    } catch (error) {
      logger.error('Error creating student profile:', error);
      throw error;
    }
  }

  /**
   * Initialize enrollment for admitted student
   */
  async initializeEnrollment(
    applicationId: string,
    enrollmentData: EnrollmentData
  ): Promise<any> {
    try {
      logger.info(`Initializing enrollment for application ${applicationId}`);

      const application = await this.prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          applicant: true,
          admissionDecisions: true
        }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      if (application.status !== ApplicationStatus.ACCEPTED) {
        throw new Error('Cannot initialize enrollment for non-accepted application');
      }

      // Create enrollment record using the existing enrollment model
      const enrollment = await this.prisma.enrollment.create({
        data: {
          userId: application.applicantId,
          courseId: 'scroll-foundations-101', // Default foundation course
          progress: 0.0,
          scrollXPEarned: 0,
          currentModule: 1,
          status: 'ACTIVE',
          startedAt: enrollmentData.startDate
        }
      });

      // Update application status to indicate enrollment completed
      await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.ACCEPTED, // Keep as accepted since we don't have ENROLLED status
          updatedAt: new Date(),
          applicationTimeline: {
            push: {
              event: 'ENROLLMENT_COMPLETED',
              timestamp: new Date().toISOString(),
              details: {
                enrollmentId: enrollment.id,
                programType: enrollmentData.programType,
                startDate: enrollmentData.startDate
              }
            }
          }
        }
      });

      logger.info(`Enrollment initialized successfully: ${enrollment.id}`);
      return enrollment;

    } catch (error) {
      logger.error('Error initializing enrollment:', error);
      throw error;
    }
  }

  /**
   * Transfer and initialize academic records
   */
  async transferAcademicRecords(
    applicationId: string,
    userId: string
  ): Promise<any> {
    try {
      logger.info(`Transferring academic records for application ${applicationId}`);

      const application = await this.prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          academicEvaluations: true,
          spiritualEvaluations: true
        }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      // Create initial transcript record
      const transcript = await this.prisma.scrollTranscript.create({
        data: {
          studentId: userId,
          institutionId: 'scroll-university',
          accreditationId: 'scroll-accreditation-001',
          gpa: 0.0,
          creditHours: 0,
          courses: application.academicHistory || [],
          scrollXP: 0,
          innovationScore: {},
          propheticDefense: {},
          communityImpact: {},
          blockchainCredentialsJson: [],
          verificationHashes: [],
          researchPublications: [],
          projects: [],
          certifications: []
        }
      });

      logger.info(`Academic records transferred successfully: ${transcript.id}`);
      return transcript;

    } catch (error) {
      logger.error('Error transferring academic records:', error);
      throw error;
    }
  }

  /**
   * Coordinate course registration for new student
   */
  async coordinateCourseRegistration(
    userId: string,
    applicationId: string
  ): Promise<any[]> {
    try {
      logger.info(`Coordinating course registration for user ${userId}`);

      const application = await this.prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          academicEvaluations: true,
          admissionDecisions: true
        }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      // Determine recommended courses based on academic evaluation
      const academicEvaluation = application.academicEvaluations?.[0];
      const recommendedCourses = this.determineRecommendedCourses(
        academicEvaluation?.recommendedLevel || 'SCROLL_OPEN',
        application.programApplied,
        academicEvaluation?.supportNeeds || []
      );

      // Create course enrollment records using existing enrollment model
      const enrollments = [];
      for (const courseRecommendation of recommendedCourses) {
        try {
          const enrollment = await this.prisma.enrollment.create({
            data: {
              userId: userId,
              courseId: courseRecommendation.courseId,
              progress: 0.0,
              scrollXPEarned: 0,
              currentModule: 1,
              status: 'ACTIVE',
              startedAt: new Date()
            }
          });
          
          enrollments.push(enrollment);
        } catch (enrollmentError) {
          logger.warn(`Failed to enroll in course ${courseRecommendation.courseId}:`, enrollmentError);
        }
      }

      logger.info(`Course registration coordinated: ${enrollments.length} courses enrolled`);
      return enrollments;

    } catch (error) {
      logger.error('Error coordinating course registration:', error);
      throw error;
    }
  }

  /**
   * Complete full integration process for admitted student
   */
  async completeStudentIntegration(
    applicationId: string,
    integrationData: {
      profileData: StudentProfileData;
      enrollmentData: EnrollmentData;
      coursePreferences?: string[];
    }
  ): Promise<{
    user: User;
    enrollment: any;
    transcript: any;
    courseEnrollments: any[];
  }> {
    try {
      logger.info(`Starting complete student integration for application ${applicationId}`);

      // Step 1: Create/update student profile
      const user = await this.createStudentProfile(applicationId, integrationData.profileData);

      // Step 2: Initialize enrollment
      const enrollment = await this.initializeEnrollment(applicationId, integrationData.enrollmentData);

      // Step 3: Transfer academic records
      const transcript = await this.transferAcademicRecords(applicationId, user.id);

      // Step 4: Coordinate course registration
      const courseEnrollments = await this.coordinateCourseRegistration(user.id, applicationId);

      // Step 5: Send welcome notifications and setup mentorship
      await this.sendWelcomeNotifications(user.id, applicationId);
      await this.setupMentorshipConnection(user.id, integrationData.enrollmentData.mentorAssignment);

      logger.info(`Student integration completed successfully for user ${user.id}`);

      return {
        user,
        enrollment,
        transcript,
        courseEnrollments
      };

    } catch (error) {
      logger.error('Error completing student integration:', error);
      throw error;
    }
  }

  /**
   * Extract spiritual formation data from evaluations
   */
  private extractSpiritualFormationData(spiritualEvaluations: any[]): any {
    if (!spiritualEvaluations || spiritualEvaluations.length === 0) {
      return {
        callingClarity: null,
        spiritualGifts: [],
        kingdomVision: null,
        scrollAlignment: 0.0
      };
    }

    const evaluation = spiritualEvaluations[0];
    return {
      callingClarity: evaluation.callingClarity?.clarity || null,
      spiritualGifts: evaluation.characterTraits?.map((trait: any) => trait.name) || [],
      kingdomVision: evaluation.kingdomVision || null,
      scrollAlignment: evaluation.scrollAlignment || 0.0
    };
  }

  /**
   * Extract academic data from evaluations
   */
  private extractAcademicData(academicEvaluations: any[]): any {
    if (!academicEvaluations || academicEvaluations.length === 0) {
      return {
        academicReadiness: 0.0,
        recommendedLevel: 'SCROLL_OPEN',
        supportNeeds: []
      };
    }

    const evaluation = academicEvaluations[0];
    return {
      academicReadiness: evaluation.academicReadiness || 0.0,
      recommendedLevel: evaluation.recommendedLevel || 'SCROLL_OPEN',
      supportNeeds: evaluation.supportNeeds || []
    };
  }

  /**
   * Determine recommended courses based on academic level and program
   */
  private determineRecommendedCourses(
    academicLevel: string,
    programType: string,
    supportNeeds: any[]
  ): any[] {
    const recommendations = [];

    // Base courses for all students
    recommendations.push({
      courseId: 'scroll-foundations-101',
      personalizedPath: true,
      accommodations: supportNeeds.filter((need: any) => need.type === 'academic')
    });

    // Program-specific courses
    switch (programType) {
      case 'SCROLL_OPEN':
        recommendations.push({
          courseId: 'kingdom-principles-101',
          personalizedPath: true,
          accommodations: []
        });
        break;
      
      case 'SCROLL_DEGREE':
        recommendations.push(
          {
            courseId: 'kingdom-principles-101',
            personalizedPath: true,
            accommodations: []
          },
          {
            courseId: 'prophetic-foundations-201',
            personalizedPath: true,
            accommodations: []
          }
        );
        break;
      
      case 'SCROLL_DOCTORATE':
        recommendations.push(
          {
            courseId: 'advanced-scroll-theology-401',
            personalizedPath: true,
            accommodations: []
          },
          {
            courseId: 'research-methodology-501',
            personalizedPath: true,
            accommodations: []
          }
        );
        break;
    }

    // Add remedial courses if needed
    const academicSupport = supportNeeds.filter((need: any) => need.category === 'academic');
    if (academicSupport.length > 0) {
      recommendations.push({
        courseId: 'academic-foundations-prep',
        personalizedPath: true,
        accommodations: academicSupport
      });
    }

    return recommendations;
  }

  /**
   * Send welcome notifications to new student
   */
  private async sendWelcomeNotifications(userId: string, applicationId: string): Promise<void> {
    try {
      // This would integrate with notification system
      logger.info(`Sending welcome notifications to user ${userId}`);
      
      // Log welcome notification (notification system would be implemented separately)
      logger.info(`Welcome notification sent to user ${userId}`, {
        applicationId: applicationId,
        nextSteps: [
          'Complete your profile setup',
          'Meet your assigned mentor',
          'Begin your first course',
          'Join the ScrollUniversity community'
        ]
      });

    } catch (error) {
      logger.warn('Error sending welcome notifications:', error);
    }
  }

  /**
   * Setup mentorship connection for new student
   */
  private async setupMentorshipConnection(userId: string, mentorId?: string): Promise<void> {
    try {
      if (!mentorId) {
        logger.info(`No mentor assigned for user ${userId}, will auto-assign later`);
        return;
      }

      // Create mentorship relationship
      await this.prisma.mentorship.create({
        data: {
          menteeId: userId,
          mentorType: 'HUMAN_MENTOR',
          mentorId: mentorId,
          focus: 'Academic success and spiritual growth',
          status: 'ACTIVE',
          sessionsCount: 0
        }
      });

      logger.info(`Mentorship connection established between ${mentorId} and ${userId}`);

    } catch (error) {
      logger.warn('Error setting up mentorship connection:', error);
    }
  }

  /**
   * Get integration status for application
   */
  async getIntegrationStatus(applicationId: string): Promise<{
    profileCreated: boolean;
    enrollmentInitialized: boolean;
    academicRecordsTransferred: boolean;
    coursesRegistered: boolean;
    integrationComplete: boolean;
  }> {
    try {
      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId },
        include: {
          applicant: {
            include: {
              enrollments: true,
              scrollTranscripts: true
            }
          }
        }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const profileCreated = application.applicant.role === UserRole.STUDENT;
      const enrollmentInitialized = application.applicant.enrollments.length > 0;
      const academicRecordsTransferred = application.applicant.scrollTranscripts.length > 0;
      const coursesRegistered = application.applicant.enrollments.length > 0;

      return {
        profileCreated,
        enrollmentInitialized,
        academicRecordsTransferred,
        coursesRegistered,
        integrationComplete: profileCreated && enrollmentInitialized && academicRecordsTransferred && coursesRegistered
      };

    } catch (error) {
      logger.error('Error getting integration status:', error);
      throw error;
    }
  }
}