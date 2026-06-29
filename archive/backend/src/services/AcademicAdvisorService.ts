// Academic Advisor Assignment Service
// "Plans fail for lack of counsel, but with many advisers they succeed" - Proverbs 15:22

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import {
  AdvisorAssignment,
  AdvisorInfo
} from '../types/enrollment.types';

const prisma = new PrismaClient();

export class AcademicAdvisorService {
  /**
   * Assign an academic advisor to a student
   */
  async assignAdvisor(
    userId: string,
    advisorId?: string,
    assignmentReason?: string
  ): Promise<AdvisorAssignment> {
    try {
      logger.info('Assigning academic advisor', { userId, advisorId });

      // If no advisor specified, auto-assign based on criteria
      if (!advisorId) {
        advisorId = await this.findBestAdvisor(userId);
      }

      // Verify advisor exists and is faculty
      const advisor = await prisma.user.findUnique({
        where: { id: advisorId }
      });

      if (!advisor || advisor.role !== 'FACULTY') {
        throw new Error('Invalid advisor');
      }

      // Check if student already has an advisor
      const existingMentorship = await prisma.mentorship.findFirst({
        where: {
          menteeId: userId,
          mentorType: 'HUMAN_MENTOR',
          status: 'ACTIVE'
        }
      });

      if (existingMentorship) {
        // Transfer to new advisor
        await prisma.mentorship.update({
          where: { id: existingMentorship.id },
          data: {
            status: 'COMPLETED'
          }
        });
      }

      // Create new mentorship relationship
      const mentorship = await prisma.mentorship.create({
        data: {
          menteeId: userId,
          mentorId: advisorId,
          mentorType: 'HUMAN_MENTOR',
          focus: 'Academic Advising',
          status: 'ACTIVE'
        }
      });

      const assignment: AdvisorAssignment = {
        userId,
        advisorId,
        assignmentDate: new Date(),
        assignmentReason: assignmentReason || 'Auto-assigned based on student profile',
        status: 'active'
      };

      logger.info('Academic advisor assigned', assignment);

      return assignment;
    } catch (error) {
      logger.error('Error assigning advisor', { error, userId, advisorId });
      throw error;
    }
  }

  /**
   * Find the best advisor for a student
   */
  private async findBestAdvisor(userId: string): Promise<string> {
    try {
      // Get student profile
      const student = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!student) {
        throw new Error('Student not found');
      }

      // Get all faculty members
      const faculty = await prisma.user.findMany({
        where: {
          role: 'FACULTY'
        },
        include: {
          facultyMemberships: {
            include: {
              faculty: true
            }
          },
          mentorships: {
            where: {
              status: 'ACTIVE',
              mentorType: 'HUMAN_MENTOR'
            }
          }
        }
      });

      if (faculty.length === 0) {
        throw new Error('No faculty members available');
      }

      // Score each faculty member
      let bestAdvisor = faculty[0];
      let bestScore = 0;

      for (const facultyMember of faculty) {
        let score = 0;

        // Prefer advisors with fewer current advisees
        const currentAdvisees = facultyMember.mentorships.length;
        score += Math.max(0, 50 - currentAdvisees * 5);

        // Match specializations with student's interests
        if (student.scrollCalling && facultyMember.facultyMemberships.length > 0) {
          const specializations = facultyMember.facultyMemberships
            .flatMap(fm => fm.specializations || []);
          
          if (specializations.some(spec => 
            student.scrollCalling?.toLowerCase().includes(spec.toLowerCase())
          )) {
            score += 30;
          }
        }

        // Match spiritual gifts
        if (student.spiritualGifts && student.spiritualGifts.length > 0) {
          const facultyGifts = facultyMember.spiritualGifts || [];
          const commonGifts = student.spiritualGifts.filter(gift =>
            facultyGifts.includes(gift)
          );
          score += commonGifts.length * 10;
        }

        if (score > bestScore) {
          bestScore = score;
          bestAdvisor = facultyMember;
        }
      }

      return bestAdvisor.id;
    } catch (error) {
      logger.error('Error finding best advisor', { error, userId });
      throw error;
    }
  }

  /**
   * Get advisor information
   */
  async getAdvisorInfo(advisorId: string): Promise<AdvisorInfo | null> {
    try {
      const advisor = await prisma.user.findUnique({
        where: { id: advisorId },
        include: {
          facultyMemberships: {
            include: {
              faculty: true
            }
          }
        }
      });

      if (!advisor || advisor.role !== 'FACULTY') {
        return null;
      }

      const specializations = advisor.facultyMemberships
        .flatMap(fm => fm.specializations || []);

      return {
        advisorId: advisor.id,
        name: `${advisor.firstName} ${advisor.lastName}`,
        email: advisor.email,
        officeHours: advisor.facultyMemberships[0]?.officeHours as any,
        bio: advisor.bio || undefined,
        specializations,
        avatarUrl: advisor.avatarUrl || undefined
      };
    } catch (error) {
      logger.error('Error getting advisor info', { error, advisorId });
      throw error;
    }
  }

  /**
   * Get student's current advisor
   */
  async getStudentAdvisor(userId: string): Promise<AdvisorInfo | null> {
    try {
      const mentorship = await prisma.mentorship.findFirst({
        where: {
          menteeId: userId,
          mentorType: 'HUMAN_MENTOR',
          status: 'ACTIVE'
        }
      });

      if (!mentorship || !mentorship.mentorId) {
        return null;
      }

      return this.getAdvisorInfo(mentorship.mentorId);
    } catch (error) {
      logger.error('Error getting student advisor', { error, userId });
      throw error;
    }
  }

  /**
   * Get advisor's advisees
   */
  async getAdvisorAdvisees(advisorId: string): Promise<any[]> {
    try {
      const mentorships = await prisma.mentorship.findMany({
        where: {
          mentorId: advisorId,
          mentorType: 'HUMAN_MENTOR',
          status: 'ACTIVE'
        },
        include: {
          mentee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              academicLevel: true,
              enrollmentStatus: true,
              avatarUrl: true
            }
          }
        }
      });

      return mentorships.map(m => ({
        mentorshipId: m.id,
        student: m.mentee,
        startDate: m.createdAt,
        sessionsCount: m.sessionsCount,
        lastSessionAt: m.lastSessionAt
      }));
    } catch (error) {
      logger.error('Error getting advisor advisees', { error, advisorId });
      throw error;
    }
  }

  /**
   * Schedule advisor meeting
   */
  async scheduleMeeting(
    userId: string,
    advisorId: string,
    meetingDate: Date,
    topic: string
  ): Promise<any> {
    try {
      logger.info('Scheduling advisor meeting', { userId, advisorId, meetingDate });

      // Verify mentorship exists
      const mentorship = await prisma.mentorship.findFirst({
        where: {
          menteeId: userId,
          mentorId: advisorId,
          status: 'ACTIVE'
        }
      });

      if (!mentorship) {
        throw new Error('No active mentorship relationship found');
      }

      // Update mentorship with meeting info
      await prisma.mentorship.update({
        where: { id: mentorship.id },
        data: {
          sessionsCount: {
            increment: 1
          },
          lastSessionAt: meetingDate
        }
      });

      // TODO: Integrate with calendar/scheduling system

      logger.info('Advisor meeting scheduled', { userId, advisorId, meetingDate });

      return {
        meetingId: `meeting_${Date.now()}`,
        userId,
        advisorId,
        meetingDate,
        topic,
        status: 'scheduled'
      };
    } catch (error) {
      logger.error('Error scheduling meeting', { error, userId, advisorId });
      throw error;
    }
  }

  /**
   * Transfer student to new advisor
   */
  async transferAdvisor(
    userId: string,
    newAdvisorId: string,
    reason: string
  ): Promise<AdvisorAssignment> {
    try {
      logger.info('Transferring advisor', { userId, newAdvisorId, reason });

      // Close current mentorship
      const currentMentorship = await prisma.mentorship.findFirst({
        where: {
          menteeId: userId,
          mentorType: 'HUMAN_MENTOR',
          status: 'ACTIVE'
        }
      });

      if (currentMentorship) {
        await prisma.mentorship.update({
          where: { id: currentMentorship.id },
          data: {
            status: 'COMPLETED'
          }
        });
      }

      // Assign new advisor
      return this.assignAdvisor(userId, newAdvisorId, reason);
    } catch (error) {
      logger.error('Error transferring advisor', { error, userId, newAdvisorId });
      throw error;
    }
  }
}

export default new AcademicAdvisorService();
