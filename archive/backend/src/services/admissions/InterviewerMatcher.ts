/**
 * InterviewerMatcher - Implements interviewer matching and assignment system
 * "And he gave some, apostles; and some, prophets; and some, evangelists; and some, pastors and teachers" (Ephesians 4:11)
 */

import { PrismaClient } from '@prisma/client';
import { InterviewType, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export interface InterviewerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  specializations: string[];
  availability: InterviewerAvailability;
  experience: InterviewerExperience;
  preferences: InterviewerPreferences;
}

export interface InterviewerAvailability {
  timeZone: string;
  availableHours: TimeSlot[];
  unavailableDates: Date[];
  maxInterviewsPerDay: number;
  maxInterviewsPerWeek: number;
}

export interface TimeSlot {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
}

export interface InterviewerExperience {
  totalInterviews: number;
  successRate: number;
  averageRating: number;
  specialtyAreas: string[];
}

export interface InterviewerPreferences {
  preferredInterviewTypes: InterviewType[];
  preferredFormats: string[];
  languageCapabilities: string[];
  culturalExpertise: string[];
}

export interface MatchingCriteria {
  interviewType: InterviewType;
  applicantBackground: ApplicantBackground;
  scheduledDate: Date;
  duration: number;
  specialRequirements?: string[];
}

export interface ApplicantBackground {
  academicLevel: string;
  spiritualMaturity: string;
  culturalBackground: string;
  languagePreference: string;
  specialNeeds?: string[];
}

export interface MatchingResult {
  interviewerId: string;
  interviewerName: string;
  matchScore: number;
  matchingReasons: string[];
  potentialConcerns: string[];
}

export class InterviewerMatcher {
  /**
   * Find the best interviewer match for given criteria
   */
  async findBestMatch(criteria: MatchingCriteria): Promise<MatchingResult> {
    try {
      // Get all eligible interviewers
      const eligibleInterviewers = await this.getEligibleInterviewers(criteria.interviewType);
      
      if (eligibleInterviewers.length === 0) {
        throw new Error('No eligible interviewers found for this interview type');
      }

      // Score each interviewer
      const scoredInterviewers = await Promise.all(
        eligibleInterviewers.map(interviewer => 
          this.scoreInterviewerMatch(interviewer, criteria)
        )
      );

      // Sort by match score (highest first)
      scoredInterviewers.sort((a, b) => b.matchScore - a.matchScore);

      const bestMatch = scoredInterviewers[0];
      
      if (bestMatch.matchScore < 0.3) {
        throw new Error('No suitable interviewer match found (all scores below threshold)');
      }

      return bestMatch;
    } catch (error) {
      console.error('Error finding interviewer match:', error);
      throw new Error(`Failed to find interviewer match: ${error.message}`);
    }
  }

  /**
   * Get all interviewers eligible for a specific interview type
   */
  private async getEligibleInterviewers(interviewType: InterviewType): Promise<InterviewerProfile[]> {
    const roleMapping = {
      [InterviewType.INITIAL_SCREENING]: ['ADMISSIONS_OFFICER', 'INTERVIEWER'],
      [InterviewType.ACADEMIC_ASSESSMENT]: ['ACADEMIC_ASSESSOR', 'FACULTY'],
      [InterviewType.SPIRITUAL_EVALUATION]: ['SPIRITUAL_EVALUATOR', 'SCROLL_ELDER', 'PROPHET'],
      [InterviewType.CHARACTER_INTERVIEW]: ['INTERVIEWER', 'ADMISSIONS_OFFICER', 'SCROLL_ELDER'],
      [InterviewType.FINAL_INTERVIEW]: ['ADMISSIONS_COMMITTEE', 'SCROLL_ELDER', 'CHANCELLOR'],
      [InterviewType.COMMITTEE_INTERVIEW]: ['ADMISSIONS_COMMITTEE', 'CHANCELLOR']
    };

    const allowedRoles = roleMapping[interviewType] || ['INTERVIEWER'];

    const users = await prisma.user.findMany({
      where: {
        role: {
          in: allowedRoles as any[]
        },
        enrollmentStatus: 'ACTIVE'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        spiritualGifts: true,
        scrollAlignment: true
      }
    });

    // Convert to InterviewerProfile format
    return users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      specializations: user.spiritualGifts || [],
      availability: this.getDefaultAvailability(),
      experience: this.getInterviewerExperience(user.id),
      preferences: this.getInterviewerPreferences(user.role, interviewType)
    }));
  }

  /**
   * Score an interviewer's match with the given criteria
   */
  private async scoreInterviewerMatch(
    interviewer: InterviewerProfile,
    criteria: MatchingCriteria
  ): Promise<MatchingResult> {
    let totalScore = 0;
    let maxScore = 0;
    const matchingReasons: string[] = [];
    const potentialConcerns: string[] = [];

    // 1. Role appropriateness (25% weight)
    const roleScore = this.scoreRoleMatch(interviewer.role, criteria.interviewType);
    totalScore += roleScore * 0.25;
    maxScore += 0.25;
    
    if (roleScore > 0.8) {
      matchingReasons.push(`Excellent role match for ${criteria.interviewType}`);
    } else if (roleScore < 0.5) {
      potentialConcerns.push('Role may not be optimal for this interview type');
    }

    // 2. Experience and track record (20% weight)
    const experienceScore = this.scoreExperience(interviewer.experience);
    totalScore += experienceScore * 0.20;
    maxScore += 0.20;
    
    if (experienceScore > 0.8) {
      matchingReasons.push('Highly experienced interviewer');
    } else if (experienceScore < 0.4) {
      potentialConcerns.push('Limited interview experience');
    }

    // 3. Availability (20% weight)
    const availabilityScore = await this.scoreAvailability(interviewer.id, criteria.scheduledDate, criteria.duration);
    totalScore += availabilityScore * 0.20;
    maxScore += 0.20;
    
    if (availabilityScore === 1.0) {
      matchingReasons.push('Perfect availability match');
    } else if (availabilityScore < 0.5) {
      potentialConcerns.push('Limited availability for requested time');
    }

    // 4. Specialization match (15% weight)
    const specializationScore = this.scoreSpecialization(
      interviewer.specializations,
      criteria.applicantBackground,
      criteria.interviewType
    );
    totalScore += specializationScore * 0.15;
    maxScore += 0.15;
    
    if (specializationScore > 0.8) {
      matchingReasons.push('Strong specialization alignment');
    }

    // 5. Cultural and language fit (10% weight)
    const culturalScore = this.scoreCulturalFit(interviewer, criteria.applicantBackground);
    totalScore += culturalScore * 0.10;
    maxScore += 0.10;
    
    if (culturalScore > 0.8) {
      matchingReasons.push('Excellent cultural and language fit');
    }

    // 6. Workload balance (10% weight)
    const workloadScore = await this.scoreWorkloadBalance(interviewer.id);
    totalScore += workloadScore * 0.10;
    maxScore += 0.10;
    
    if (workloadScore < 0.3) {
      potentialConcerns.push('High current workload');
    }

    const finalScore = maxScore > 0 ? totalScore / maxScore : 0;

    return {
      interviewerId: interviewer.id,
      interviewerName: `${interviewer.firstName} ${interviewer.lastName}`,
      matchScore: finalScore,
      matchingReasons,
      potentialConcerns
    };
  }

  /**
   * Score role appropriateness for interview type
   */
  private scoreRoleMatch(role: UserRole, interviewType: InterviewType): number {
    const roleScores = {
      [InterviewType.INITIAL_SCREENING]: {
        'ADMISSIONS_OFFICER': 1.0,
        'INTERVIEWER': 0.9,
        'ADMISSIONS_COMMITTEE': 0.8
      },
      [InterviewType.ACADEMIC_ASSESSMENT]: {
        'ACADEMIC_ASSESSOR': 1.0,
        'FACULTY': 0.9,
        'ADMISSIONS_OFFICER': 0.6
      },
      [InterviewType.SPIRITUAL_EVALUATION]: {
        'SPIRITUAL_EVALUATOR': 1.0,
        'SCROLL_ELDER': 0.95,
        'PROPHET': 0.9,
        'ADMISSIONS_OFFICER': 0.5
      },
      [InterviewType.CHARACTER_INTERVIEW]: {
        'SCROLL_ELDER': 1.0,
        'INTERVIEWER': 0.9,
        'ADMISSIONS_OFFICER': 0.8,
        'SPIRITUAL_EVALUATOR': 0.7
      },
      [InterviewType.FINAL_INTERVIEW]: {
        'ADMISSIONS_COMMITTEE': 1.0,
        'SCROLL_ELDER': 0.9,
        'CHANCELLOR': 0.95
      },
      [InterviewType.COMMITTEE_INTERVIEW]: {
        'ADMISSIONS_COMMITTEE': 1.0,
        'CHANCELLOR': 0.9
      }
    };

    return roleScores[interviewType]?.[role] || 0.3;
  }

  /**
   * Score interviewer experience
   */
  private scoreExperience(experience: InterviewerExperience): number {
    let score = 0;
    
    // Total interviews conducted
    if (experience.totalInterviews >= 100) score += 0.4;
    else if (experience.totalInterviews >= 50) score += 0.3;
    else if (experience.totalInterviews >= 20) score += 0.2;
    else if (experience.totalInterviews >= 5) score += 0.1;
    
    // Success rate
    if (experience.successRate >= 0.9) score += 0.3;
    else if (experience.successRate >= 0.8) score += 0.25;
    else if (experience.successRate >= 0.7) score += 0.2;
    else if (experience.successRate >= 0.6) score += 0.1;
    
    // Average rating
    if (experience.averageRating >= 4.5) score += 0.3;
    else if (experience.averageRating >= 4.0) score += 0.25;
    else if (experience.averageRating >= 3.5) score += 0.2;
    else if (experience.averageRating >= 3.0) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  /**
   * Score availability for specific date and time
   */
  private async scoreAvailability(
    interviewerId: string,
    scheduledDate: Date,
    duration: number
  ): Promise<number> {
    // Check for conflicts
    const hasConflict = await this.checkForConflicts(interviewerId, scheduledDate, duration);
    if (hasConflict) return 0;

    // Check workload for the day
    const dailyInterviews = await this.getDailyInterviewCount(interviewerId, scheduledDate);
    if (dailyInterviews >= 6) return 0.3; // Heavy load
    if (dailyInterviews >= 4) return 0.6; // Moderate load
    if (dailyInterviews >= 2) return 0.8; // Light load
    
    return 1.0; // No conflicts, light load
  }

  /**
   * Score specialization match
   */
  private scoreSpecialization(
    specializations: string[],
    applicantBackground: ApplicantBackground,
    interviewType: InterviewType
  ): number {
    // This would be more sophisticated in a real implementation
    // For now, return a base score based on interview type
    const baseScores = {
      [InterviewType.INITIAL_SCREENING]: 0.7,
      [InterviewType.ACADEMIC_ASSESSMENT]: 0.8,
      [InterviewType.SPIRITUAL_EVALUATION]: 0.9,
      [InterviewType.CHARACTER_INTERVIEW]: 0.8,
      [InterviewType.FINAL_INTERVIEW]: 0.9,
      [InterviewType.COMMITTEE_INTERVIEW]: 0.8
    };

    return baseScores[interviewType] || 0.6;
  }

  /**
   * Score cultural and language fit
   */
  private scoreCulturalFit(
    interviewer: InterviewerProfile,
    applicantBackground: ApplicantBackground
  ): number {
    // Simplified scoring - in reality would check language capabilities, cultural expertise, etc.
    return 0.8;
  }

  /**
   * Score workload balance
   */
  private async scoreWorkloadBalance(interviewerId: string): Promise<number> {
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const weeklyInterviews = await prisma.interviewRecord.count({
      where: {
        interviewerId,
        scheduledDate: {
          gte: weekStart,
          lt: weekEnd
        },
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']
        }
      }
    });

    // Score based on weekly load
    if (weeklyInterviews >= 20) return 0.1; // Overloaded
    if (weeklyInterviews >= 15) return 0.3; // Heavy load
    if (weeklyInterviews >= 10) return 0.6; // Moderate load
    if (weeklyInterviews >= 5) return 0.8;  // Light load
    
    return 1.0; // Very light load
  }

  /**
   * Check for scheduling conflicts
   */
  private async checkForConflicts(
    interviewerId: string,
    scheduledDate: Date,
    duration: number
  ): Promise<boolean> {
    const startTime = new Date(scheduledDate);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    const conflicts = await prisma.interviewRecord.count({
      where: {
        interviewerId,
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS']
        },
        OR: [
          {
            scheduledDate: {
              gte: startTime,
              lt: endTime
            }
          },
          {
            AND: [
              {
                scheduledDate: {
                  lte: startTime
                }
              },
              {
                scheduledDate: {
                  gte: new Date(startTime.getTime() - 60 * 60000) // 1 hour buffer
                }
              }
            ]
          }
        ]
      }
    });

    return conflicts > 0;
  }

  /**
   * Get daily interview count for an interviewer
   */
  private async getDailyInterviewCount(interviewerId: string, date: Date): Promise<number> {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    return await prisma.interviewRecord.count({
      where: {
        interviewerId,
        scheduledDate: {
          gte: dayStart,
          lt: dayEnd
        },
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']
        }
      }
    });
  }

  /**
   * Get default availability (would be configurable per interviewer)
   */
  private getDefaultAvailability(): InterviewerAvailability {
    return {
      timeZone: 'UTC',
      availableHours: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, // Monday
        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }, // Tuesday
        { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' }, // Wednesday
        { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' }, // Thursday
        { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' }  // Friday
      ],
      unavailableDates: [],
      maxInterviewsPerDay: 6,
      maxInterviewsPerWeek: 20
    };
  }

  /**
   * Get interviewer experience (would be calculated from historical data)
   */
  private getInterviewerExperience(interviewerId: string): InterviewerExperience {
    // In a real implementation, this would query historical data
    return {
      totalInterviews: 25,
      successRate: 0.85,
      averageRating: 4.2,
      specialtyAreas: []
    };
  }

  /**
   * Get interviewer preferences based on role and interview type
   */
  private getInterviewerPreferences(role: UserRole, interviewType: InterviewType): InterviewerPreferences {
    return {
      preferredInterviewTypes: [interviewType],
      preferredFormats: ['VIDEO_CONFERENCE', 'IN_PERSON'],
      languageCapabilities: ['English'],
      culturalExpertise: ['Western', 'Christian']
    };
  }

  /**
   * Get multiple interviewer matches (for committee interviews)
   */
  async findMultipleMatches(
    criteria: MatchingCriteria,
    count: number
  ): Promise<MatchingResult[]> {
    try {
      const eligibleInterviewers = await this.getEligibleInterviewers(criteria.interviewType);
      
      if (eligibleInterviewers.length < count) {
        throw new Error(`Not enough eligible interviewers (need ${count}, found ${eligibleInterviewers.length})`);
      }

      const scoredInterviewers = await Promise.all(
        eligibleInterviewers.map(interviewer => 
          this.scoreInterviewerMatch(interviewer, criteria)
        )
      );

      // Sort by match score and return top matches
      scoredInterviewers.sort((a, b) => b.matchScore - a.matchScore);
      
      return scoredInterviewers.slice(0, count);
    } catch (error) {
      console.error('Error finding multiple matches:', error);
      throw new Error(`Failed to find multiple matches: ${error.message}`);
    }
  }
}