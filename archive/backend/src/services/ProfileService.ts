/**
 * User Profile Service
 * "For we are God's handiwork, created in Christ Jesus" - Ephesians 2:10
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/productionLogger';
import {
  UserProfile,
  ProfileUpdateRequest,
  ProfileCompletionStatus,
  ProfileValidationResult,
  ValidationError,
  ValidationWarning,
  ProfileActivityLog
} from '../types/profile.types';

const prisma = new PrismaClient();

export class ProfileService {
  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<UserProfile> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          bio: true,
          avatarUrl: true,
          dateOfBirth: true,
          phoneNumber: true,
          location: true,
          role: true,
          academicLevel: true,
          enrollmentStatus: true,
          scrollCalling: true,
          spiritualGifts: true,
          kingdomVision: true,
          scrollAlignment: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      logger.info('Profile retrieved', { userId });

      return user as UserProfile;
    } catch (error: any) {
      logger.error('Failed to get profile', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: ProfileUpdateRequest): Promise<UserProfile> {
    try {
      // Validate updates
      const validation = await this.validateProfileUpdate(updates);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Update profile
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...updates,
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          bio: true,
          avatarUrl: true,
          dateOfBirth: true,
          phoneNumber: true,
          location: true,
          role: true,
          academicLevel: true,
          enrollmentStatus: true,
          scrollCalling: true,
          spiritualGifts: true,
          kingdomVision: true,
          scrollAlignment: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true
        }
      });

      // Log activity
      await this.logProfileActivity(userId, 'profile_updated', 'User updated their profile', {
        updatedFields: Object.keys(updates)
      });

      logger.info('Profile updated successfully', { userId, updatedFields: Object.keys(updates) });

      return updatedUser as UserProfile;
    } catch (error: any) {
      logger.error('Failed to update profile', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get profile completion status
   */
  async getCompletionStatus(userId: string): Promise<ProfileCompletionStatus> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const missingFields: string[] = [];
      const sections = {
        basicInfo: true,
        contactInfo: true,
        academicInfo: true,
        spiritualFormation: true,
        preferences: true,
        security: true
      };

      // Check basic info
      if (!user.firstName || !user.lastName) {
        missingFields.push('firstName', 'lastName');
        sections.basicInfo = false;
      }
      if (!user.bio) missingFields.push('bio');
      if (!user.avatarUrl) missingFields.push('avatarUrl');

      // Check contact info
      if (!user.phoneNumber) {
        missingFields.push('phoneNumber');
        sections.contactInfo = false;
      }
      if (!user.location) missingFields.push('location');
      if (!user.dateOfBirth) missingFields.push('dateOfBirth');

      // Check spiritual formation
      if (!user.scrollCalling) {
        missingFields.push('scrollCalling');
        sections.spiritualFormation = false;
      }
      if (!user.spiritualGifts || user.spiritualGifts.length === 0) {
        missingFields.push('spiritualGifts');
      }
      if (!user.kingdomVision) missingFields.push('kingdomVision');

      const totalFields = 11; // Total important fields
      const completedFields = totalFields - missingFields.length;
      const completionPercentage = Math.round((completedFields / totalFields) * 100);

      const recommendations: string[] = [];
      if (missingFields.includes('avatarUrl')) {
        recommendations.push('Upload a profile picture to personalize your account');
      }
      if (missingFields.includes('scrollCalling')) {
        recommendations.push('Share your divine calling to connect with like-minded believers');
      }
      if (missingFields.includes('spiritualGifts')) {
        recommendations.push('Identify your spiritual gifts for better course recommendations');
      }

      return {
        userId,
        completionPercentage,
        missingFields,
        recommendations,
        sections
      };
    } catch (error: any) {
      logger.error('Failed to get completion status', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Validate profile update
   */
  private async validateProfileUpdate(updates: ProfileUpdateRequest): Promise<ProfileValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate firstName
    if (updates.firstName !== undefined) {
      if (updates.firstName.length < 2) {
        errors.push({
          field: 'firstName',
          message: 'First name must be at least 2 characters',
          code: 'MIN_LENGTH'
        });
      }
      if (updates.firstName.length > 50) {
        errors.push({
          field: 'firstName',
          message: 'First name must not exceed 50 characters',
          code: 'MAX_LENGTH'
        });
      }
    }

    // Validate lastName
    if (updates.lastName !== undefined) {
      if (updates.lastName.length < 2) {
        errors.push({
          field: 'lastName',
          message: 'Last name must be at least 2 characters',
          code: 'MIN_LENGTH'
        });
      }
      if (updates.lastName.length > 50) {
        errors.push({
          field: 'lastName',
          message: 'Last name must not exceed 50 characters',
          code: 'MAX_LENGTH'
        });
      }
    }

    // Validate bio
    if (updates.bio !== undefined && updates.bio.length > 500) {
      errors.push({
        field: 'bio',
        message: 'Bio must not exceed 500 characters',
        code: 'MAX_LENGTH'
      });
    }

    // Validate phoneNumber
    if (updates.phoneNumber !== undefined) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(updates.phoneNumber)) {
        errors.push({
          field: 'phoneNumber',
          message: 'Invalid phone number format',
          code: 'INVALID_FORMAT'
        });
      }
    }

    // Validate dateOfBirth
    if (updates.dateOfBirth !== undefined) {
      const age = this.calculateAge(updates.dateOfBirth);
      if (age < 13) {
        errors.push({
          field: 'dateOfBirth',
          message: 'User must be at least 13 years old',
          code: 'AGE_RESTRICTION'
        });
      }
      if (age > 120) {
        warnings.push({
          field: 'dateOfBirth',
          message: 'Date of birth seems unusual',
          suggestion: 'Please verify the date is correct'
        });
      }
    }

    // Validate scrollCalling
    if (updates.scrollCalling !== undefined && updates.scrollCalling.length > 500) {
      errors.push({
        field: 'scrollCalling',
        message: 'Scroll calling must not exceed 500 characters',
        code: 'MAX_LENGTH'
      });
    }

    // Validate kingdomVision
    if (updates.kingdomVision !== undefined && updates.kingdomVision.length > 1000) {
      errors.push({
        field: 'kingdomVision',
        message: 'Kingdom vision must not exceed 1000 characters',
        code: 'MAX_LENGTH'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Log profile activity
   */
  private async logProfileActivity(
    userId: string,
    action: string,
    description: string,
    metadata?: any
  ): Promise<void> {
    try {
      // In a production system, this would be stored in a dedicated audit log table
      logger.info('Profile activity', {
        userId,
        action,
        description,
        metadata,
        timestamp: new Date()
      });
    } catch (error: any) {
      logger.error('Failed to log profile activity', { error: error.message, userId });
      // Don't throw - logging failure shouldn't break the main operation
    }
  }

  /**
   * Search profiles (for admin or public directory)
   */
  async searchProfiles(query: string, limit: number = 20): Promise<UserProfile[]> {
    try {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { username: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } }
          ],
          enrollmentStatus: 'ACTIVE'
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          bio: true,
          avatarUrl: true,
          dateOfBirth: true,
          phoneNumber: true,
          location: true,
          role: true,
          academicLevel: true,
          enrollmentStatus: true,
          scrollCalling: true,
          spiritualGifts: true,
          kingdomVision: true,
          scrollAlignment: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true
        },
        take: limit
      });

      logger.info('Profiles searched', { query, resultsCount: users.length });

      return users as UserProfile[];
    } catch (error: any) {
      logger.error('Failed to search profiles', { error: error.message, query });
      throw error;
    }
  }

  /**
   * Get public profile (limited information)
   */
  async getPublicProfile(userId: string): Promise<Partial<UserProfile>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          bio: true,
          avatarUrl: true,
          location: true,
          scrollCalling: true,
          spiritualGifts: true,
          scrollAlignment: true,
          createdAt: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      logger.info('Public profile retrieved', { userId });

      return user as any;
    } catch (error: any) {
      logger.error('Failed to get public profile', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get academic transcript
   */
  async getAcademicTranscript(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          enrollments: {
            include: {
              course: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Calculate GPA and credits (mock data for now)
      const completedEnrollments = user.enrollments.filter((e: any) => e.status === 'completed');
      const totalCredits = completedEnrollments.reduce((sum: number, e: any) => sum + 3, 0);
      const gpa = completedEnrollments.length > 0
        ? completedEnrollments.reduce((sum: number, e: any) => sum + 85, 0) / completedEnrollments.length
        : 0;

      // Build course history
      const courseHistory = user.enrollments.map((enrollment: any) => ({
        courseId: enrollment.courseId,
        courseCode: enrollment.course.code || '',
        courseName: enrollment.course.title,
        credits: 3,
        grade: this.convertGradeToLetter(85),
        gradePoints: 85,
        term: 'Fall',
        year: new Date(enrollment.startedAt).getFullYear(),
        status: enrollment.status,
        instructor: 'TBD'
      }));

      return {
        studentId: user.id,
        studentName: `${user.firstName} ${user.lastName}`,
        degreeProgram: user.academicLevel || 'Undergraduate',
        overallGPA: gpa,
        totalCreditsEarned: totalCredits,
        totalCreditsAttempted: totalCredits,
        courseHistory,
        academicStanding: [],
        degreesAwarded: [],
        certificatesAwarded: [],
        generatedAt: new Date(),
        isOfficial: true,
        transcriptId: `TRANS-${userId}-${Date.now()}`
      };
    } catch (error: any) {
      logger.error('Failed to get transcript', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Download transcript
   */
  async downloadTranscript(userId: string, format: string): Promise<any> {
    const transcript = await this.getAcademicTranscript(userId);
    
    if (format === 'json') {
      return {
        contentType: 'application/json',
        filename: `transcript_${userId}.json`,
        data: Buffer.from(JSON.stringify(transcript, null, 2))
      };
    }
    
    // For PDF, return a simple text representation for now
    const textContent = `
OFFICIAL ACADEMIC TRANSCRIPT
${transcript.studentName}
Student ID: ${transcript.studentId}

Overall GPA: ${transcript.overallGPA.toFixed(2)}
Total Credits: ${transcript.totalCreditsEarned}

COURSE HISTORY:
${transcript.courseHistory.map((c: any) => 
  `${c.courseCode} - ${c.courseName} (${c.credits} credits) - Grade: ${c.grade}`
).join('\n')}

Generated: ${new Date().toLocaleDateString()}
    `;
    
    return {
      contentType: 'text/plain',
      filename: `transcript_${userId}.txt`,
      data: Buffer.from(textContent)
    };
  }

  /**
   * Get degree audit
   */
  async getDegreeAudit(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          enrollments: {
            include: {
              course: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const completedCredits = user.enrollments
        .filter((e: any) => e.status === 'completed')
        .reduce((sum: number, e: any) => sum + 3, 0);
      
      const requiredCredits = 120; // Default bachelor's degree requirement
      const progress = (completedCredits / requiredCredits) * 100;

      return {
        studentId: user.id,
        degreeProgram: {
          id: 'default',
          name: user.academicLevel || 'Bachelor of Arts',
          type: 'bachelor',
          faculty: 'General Studies',
          totalCredits: requiredCredits
        },
        overallProgress: progress,
        creditsCompleted: completedCredits,
        creditsRequired: requiredCredits,
        requirements: [],
        projectedGraduationDate: null,
        remainingTerms: Math.ceil((requiredCredits - completedCredits) / 15),
        isEligibleForGraduation: completedCredits >= requiredCredits,
        outstandingRequirements: completedCredits >= requiredCredits ? [] : ['Complete remaining credits'],
        lastUpdated: new Date()
      };
    } catch (error: any) {
      logger.error('Failed to get degree audit', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get course history
   */
  async getCourseHistory(userId: string): Promise<any[]> {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: true
        },
        orderBy: {
          startedAt: 'desc'
        }
      });

      return enrollments.map((enrollment: any) => ({
        courseId: enrollment.courseId,
        courseCode: enrollment.course.code || '',
        courseName: enrollment.course.title,
        instructor: 'TBD',
        term: 'Fall',
        year: new Date(enrollment.startedAt).getFullYear(),
        grade: this.convertGradeToLetter(85),
        gradePoints: 85,
        credits: 3,
        attendanceRate: 95,
        assignmentsCompleted: 10,
        totalAssignments: 10,
        spiritualGrowthScore: 85,
        status: enrollment.status,
        enrollmentDate: enrollment.startedAt,
        completionDate: enrollment.completedAt
      }));
    } catch (error: any) {
      logger.error('Failed to get course history', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get achievements
   */
  async getAchievements(userId: string): Promise<any[]> {
    try {
      // For now, return mock achievements
      // In production, this would query an achievements table
      return [
        {
          id: '1',
          type: 'academic',
          name: 'Dean\'s List',
          description: 'Achieved Dean\'s List for academic excellence',
          icon: 'award',
          dateEarned: new Date(),
          category: 'Academic Excellence',
          isPublic: true,
          isPinned: false
        }
      ];
    } catch (error: any) {
      logger.error('Failed to get achievements', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Toggle achievement pin
   */
  async toggleAchievementPin(achievementId: string, isPinned: boolean): Promise<any> {
    // Mock implementation
    return {
      id: achievementId,
      isPinned
    };
  }

  /**
   * Get skills
   */
  async getSkills(userId: string): Promise<any[]> {
    try {
      // Mock implementation
      return [];
    } catch (error: any) {
      logger.error('Failed to get skills', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Add skill
   */
  async addSkill(userId: string, skillData: any): Promise<any> {
    // Mock implementation
    return {
      id: Date.now().toString(),
      ...skillData,
      endorsements: [],
      endorsementCount: 0,
      isVerified: false
    };
  }

  /**
   * Endorse skill
   */
  async endorseSkill(skillId: string, endorsementData: any): Promise<any> {
    // Mock implementation
    return {
      id: skillId,
      endorsements: [endorsementData],
      endorsementCount: 1
    };
  }

  /**
   * Get resume data
   */
  async getResumeData(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          enrollments: {
            include: {
              course: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        personalInfo: {
          fullName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phoneNumber || '',
          location: user.location || '',
          linkedIn: '',
          website: ''
        },
        summary: user.bio || '',
        education: [{
          institution: 'ScrollUniversity',
          degree: user.academicLevel || 'Bachelor of Arts',
          major: 'General Studies',
          gpa: 3.5,
          startDate: user.createdAt,
          relevantCourses: []
        }],
        experience: [],
        skills: [],
        achievements: [],
        certifications: [],
        ministryExperience: [],
        references: []
      };
    } catch (error: any) {
      logger.error('Failed to get resume data', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Generate resume
   */
  async generateResume(userId: string, options: any): Promise<any> {
    const resumeData = await this.getResumeData(userId);
    
    const textContent = `
${resumeData.personalInfo.fullName}
${resumeData.personalInfo.email} | ${resumeData.personalInfo.phone}
${resumeData.personalInfo.location}

SUMMARY
${resumeData.summary}

EDUCATION
${resumeData.education.map((edu: any) => 
  `${edu.degree} - ${edu.institution}\nGPA: ${edu.gpa}`
).join('\n\n')}

Generated: ${new Date().toLocaleDateString()}
    `;
    
    return {
      contentType: options.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: `resume_${userId}.${options.format}`,
      data: Buffer.from(textContent)
    };
  }

  /**
   * Preview resume
   */
  async previewResume(userId: string, template: string): Promise<string> {
    const resumeData = await this.getResumeData(userId);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Resume Preview</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          h2 { color: #666; border-bottom: 2px solid #333; }
          .section { margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>${resumeData.personalInfo.fullName}</h1>
        <p>${resumeData.personalInfo.email} | ${resumeData.personalInfo.phone}</p>
        <p>${resumeData.personalInfo.location}</p>
        
        <div class="section">
          <h2>Summary</h2>
          <p>${resumeData.summary}</p>
        </div>
        
        <div class="section">
          <h2>Education</h2>
          ${resumeData.education.map((edu: any) => `
            <div>
              <strong>${edu.degree}</strong> - ${edu.institution}<br>
              GPA: ${edu.gpa}
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Convert numeric grade to letter grade
   */
  private convertGradeToLetter(grade: number): string {
    if (grade >= 93) return 'A';
    if (grade >= 90) return 'A-';
    if (grade >= 87) return 'B+';
    if (grade >= 83) return 'B';
    if (grade >= 80) return 'B-';
    if (grade >= 77) return 'C+';
    if (grade >= 73) return 'C';
    if (grade >= 70) return 'C-';
    if (grade >= 67) return 'D+';
    if (grade >= 63) return 'D';
    if (grade >= 60) return 'D-';
    return 'F';
  }
}

export const profileService = new ProfileService();
