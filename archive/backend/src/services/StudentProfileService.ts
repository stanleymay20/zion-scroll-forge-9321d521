// Student Profile Service
// "I praise you because I am fearfully and wonderfully made" - Psalm 139:14

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import {
  StudentProfile,
  ProfileVerificationResult
} from '../types/enrollment.types';

const prisma = new PrismaClient();

export class StudentProfileService {
  /**
   * Get student profile
   */
  async getProfile(userId: string): Promise<StudentProfile | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return null;
      }

      return {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber || undefined,
        dateOfBirth: user.dateOfBirth || undefined,
        location: user.location || undefined,
        bio: user.bio || undefined,
        avatarUrl: user.avatarUrl || undefined,
        
        academicLevel: user.academicLevel,
        enrollmentStatus: user.enrollmentStatus,
        scrollCoinBalance: user.scrollCoinBalance,
        workTradeCredits: user.workTradeCredits,
        
        scrollCalling: user.scrollCalling || undefined,
        spiritualGifts: user.spiritualGifts,
        kingdomVision: user.kingdomVision || undefined,
        scrollAlignment: user.scrollAlignment,
        
        preferredLanguage: user.preferredLanguage,
        timeZone: user.timeZone,
        
        emailVerified: !!user.email,
        phoneVerified: !!user.phoneNumber,
        profileComplete: this.calculateProfileCompletion(user) >= 80
      };
    } catch (error) {
      logger.error('Error getting student profile', { error, userId });
      throw error;
    }
  }

  /**
   * Create student profile
   */
  async createProfile(data: Partial<StudentProfile>): Promise<StudentProfile> {
    try {
      logger.info('Creating student profile', { email: data.email });

      // Check if user already exists
      if (data.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: data.email }
        });

        if (existingUser) {
          throw new Error('User with this email already exists');
        }
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          email: data.email!,
          username: data.email!.split('@')[0] + '_' + Date.now(),
          passwordHash: '', // Will be set during authentication
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phoneNumber: data.phoneNumber,
          dateOfBirth: data.dateOfBirth,
          location: data.location,
          bio: data.bio,
          avatarUrl: data.avatarUrl,
          
          role: 'STUDENT',
          enrollmentStatus: 'ACTIVE',
          academicLevel: data.academicLevel || 'SCROLL_OPEN',
          
          scrollCalling: data.scrollCalling,
          spiritualGifts: data.spiritualGifts || [],
          kingdomVision: data.kingdomVision,
          scrollAlignment: data.scrollAlignment || 0,
          
          preferredLanguage: data.preferredLanguage || 'en',
          timeZone: data.timeZone || 'UTC',
          
          scrollCoinBalance: 0,
          workTradeCredits: 0
        }
      });

      logger.info('Student profile created', { userId: user.id });

      return this.getProfile(user.id) as Promise<StudentProfile>;
    } catch (error) {
      logger.error('Error creating student profile', { error, data });
      throw error;
    }
  }

  /**
   * Update student profile
   */
  async updateProfile(
    userId: string,
    updates: Partial<StudentProfile>
  ): Promise<StudentProfile> {
    try {
      logger.info('Updating student profile', { userId });

      const updateData: any = {};

      // Map updates to database fields
      if (updates.firstName !== undefined) updateData.firstName = updates.firstName;
      if (updates.lastName !== undefined) updateData.lastName = updates.lastName;
      if (updates.phoneNumber !== undefined) updateData.phoneNumber = updates.phoneNumber;
      if (updates.dateOfBirth !== undefined) updateData.dateOfBirth = updates.dateOfBirth;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.bio !== undefined) updateData.bio = updates.bio;
      if (updates.avatarUrl !== undefined) updateData.avatarUrl = updates.avatarUrl;
      
      if (updates.scrollCalling !== undefined) updateData.scrollCalling = updates.scrollCalling;
      if (updates.spiritualGifts !== undefined) updateData.spiritualGifts = updates.spiritualGifts;
      if (updates.kingdomVision !== undefined) updateData.kingdomVision = updates.kingdomVision;
      if (updates.scrollAlignment !== undefined) updateData.scrollAlignment = updates.scrollAlignment;
      
      if (updates.preferredLanguage !== undefined) updateData.preferredLanguage = updates.preferredLanguage;
      if (updates.timeZone !== undefined) updateData.timeZone = updates.timeZone;

      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      logger.info('Student profile updated', { userId });

      return this.getProfile(userId) as Promise<StudentProfile>;
    } catch (error) {
      logger.error('Error updating student profile', { error, userId });
      throw error;
    }
  }

  /**
   * Verify student profile
   */
  async verifyProfile(userId: string): Promise<ProfileVerificationResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const missingFields: string[] = [];
      const requiredFields = [
        'firstName',
        'lastName',
        'email',
        'dateOfBirth',
        'location',
        'phoneNumber'
      ];

      for (const field of requiredFields) {
        if (!user[field as keyof typeof user]) {
          missingFields.push(field);
        }
      }

      const completionPercentage = this.calculateProfileCompletion(user);

      return {
        isComplete: missingFields.length === 0 && completionPercentage >= 80,
        missingFields,
        verificationStatus: {
          email: !!user.email,
          phone: !!user.phoneNumber,
          identity: !!user.dateOfBirth && !!user.location
        },
        completionPercentage
      };
    } catch (error) {
      logger.error('Error verifying profile', { error, userId });
      throw error;
    }
  }

  /**
   * Calculate profile completion percentage
   */
  private calculateProfileCompletion(user: any): number {
    const fields = [
      'firstName',
      'lastName',
      'email',
      'phoneNumber',
      'dateOfBirth',
      'location',
      'bio',
      'avatarUrl',
      'scrollCalling',
      'kingdomVision'
    ];

    let completed = 0;
    for (const field of fields) {
      if (user[field]) {
        completed++;
      }
    }

    return Math.round((completed / fields.length) * 100);
  }

  /**
   * Upload profile avatar
   */
  async uploadAvatar(userId: string, avatarUrl: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl }
      });

      logger.info('Avatar uploaded', { userId, avatarUrl });
    } catch (error) {
      logger.error('Error uploading avatar', { error, userId });
      throw error;
    }
  }

  /**
   * Get profile statistics
   */
  async getProfileStats(userId: string): Promise<any> {
    try {
      const [enrollments, completedCourses, scrollCoinTransactions] = await Promise.all([
        prisma.enrollment.count({ where: { userId } }),
        prisma.enrollment.count({ where: { userId, completedAt: { not: null } } }),
        prisma.scrollCoinTransaction.count({ where: { userId } })
      ]);

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      return {
        enrollments,
        completedCourses,
        scrollCoinTransactions,
        scrollCoinBalance: user?.scrollCoinBalance || 0,
        workTradeCredits: user?.workTradeCredits || 0,
        scrollAlignment: user?.scrollAlignment || 0,
        profileCompletion: user ? this.calculateProfileCompletion(user) : 0
      };
    } catch (error) {
      logger.error('Error getting profile stats', { error, userId });
      throw error;
    }
  }
}

export default new StudentProfileService();
