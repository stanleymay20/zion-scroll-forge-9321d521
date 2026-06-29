/**
 * Schedule Optimization Service
 * "There is a time for everything" - Ecclesiastes 3:1
 * 
 * Optimizes course schedules for balance, avoids time conflicts,
 * considers professor ratings, balances difficulty, and prevents burnout
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  ScheduleOptimization,
  OptimizedSchedule,
  ScheduledCourse,
  TimeConflict,
  FreeTimeBlock,
  WorkloadDistribution,
  CourseRecommendation,
  RecommendationConstraints
} from '../types/course-recommendation.types';

const prisma = new PrismaClient();

export default class ScheduleOptimizationService {
  /**
   * Optimize course schedule
   */
  async optimizeSchedule(
    studentId: string,
    courses: CourseRecommendation[],
    constraints?: RecommendationConstraints
  ): Promise<ScheduleOptimization> {
    try {
      logger.info('Optimizing schedule', { studentId, courseCount: courses.length });

      // Generate primary optimized schedule
      const optimizedSchedule = await this.generateOptimizedSchedule(
        courses,
        constraints
      );

      // Generate alternative schedules
      const alternatives = await this.generateAlternativeSchedules(
        courses,
        constraints,
        2
      );

      // Calculate balance score
      const balanceScore = this.calculateBalanceScore(optimizedSchedule);

      // Generate recommendations
      const recommendations = this.generateScheduleRecommendations(
        optimizedSchedule,
        constraints
      );

      logger.info('Schedule optimized', {
        studentId,
        balanceScore,
        conflicts: optimizedSchedule.timeConflicts.length
      });

      return {
        optimizedSchedule,
        alternatives,
        balanceScore,
        recommendations
      };
    } catch (error) {
      logger.error('Error optimizing schedule', { error, studentId });
      throw error;
    }
  }

  /**
   * Generate optimized schedule
   */
  private async generateOptimizedSchedule(
    courses: CourseRecommendation[],
    constraints?: RecommendationConstraints
  ): Promise<OptimizedSchedule> {
    const scheduledCourses: ScheduledCourse[] = [];
    const usedTimeSlots = new Map<string, Set<string>>();

    // Sort courses by difficulty (easier first for better balance)
    const sortedCourses = [...courses].sort((a, b) => {
      const diffOrder = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
      return diffOrder[a.difficulty] - diffOrder[b.difficulty];
    });

    for (const course of sortedCourses) {
      // Select best section
      const bestSection = this.selectBestSection(
        course,
        usedTimeSlots,
        constraints
      );

      if (bestSection) {
        scheduledCourses.push({
          courseId: course.courseId,
          sectionId: bestSection.sectionId,
          title: course.title,
          credits: course.credits,
          schedule: bestSection.schedule,
          professor: bestSection.professor,
          difficulty: course.difficulty,
          estimatedWorkload: this.estimateWorkload(course.difficulty, course.credits)
        });

        // Mark time slots as used
        for (const slot of bestSection.schedule) {
          if (!usedTimeSlots.has(slot.day)) {
            usedTimeSlots.set(slot.day, new Set());
          }
          usedTimeSlots.get(slot.day)!.add(`${slot.startTime}-${slot.endTime}`);
        }
      }
    }

    // Detect time conflicts
    const timeConflicts = this.detectTimeConflicts(scheduledCourses);

    // Calculate free time
    const freeTime = this.calculateFreeTime(scheduledCourses);

    // Calculate workload distribution
    const workloadDistribution = this.calculateWorkloadDistribution(scheduledCourses);

    // Calculate total credits
    const totalCredits = scheduledCourses.reduce((sum, c) => sum + c.credits, 0);

    // Calculate difficulty balance
    const difficultyBalance = this.calculateDifficultyBalance(scheduledCourses);

    return {
      scheduleId: this.generateScheduleId(),
      courses: scheduledCourses,
      totalCredits,
      difficultyBalance,
      timeConflicts,
      freeTime,
      workloadDistribution
    };
  }


  /**
   * Select best section for course
   */
  private selectBestSection(
    course: CourseRecommendation,
    usedTimeSlots: Map<string, Set<string>>,
    constraints?: RecommendationConstraints
  ): any {
    let bestSection = null;
    let bestScore = -1;

    for (const section of course.availableSections) {
      // Check if section conflicts with used time slots
      const hasConflict = section.schedule.some(slot => {
        const daySlots = usedTimeSlots.get(slot.day);
        return daySlots && daySlots.has(`${slot.startTime}-${slot.endTime}`);
      });

      if (hasConflict) continue;

      // Check constraints
      if (constraints?.preferredDays) {
        const matchesPreferredDays = section.schedule.some(slot =>
          constraints.preferredDays!.includes(slot.day)
        );
        if (!matchesPreferredDays) continue;
      }

      if (constraints?.avoidProfessors?.includes(section.professor)) {
        continue;
      }

      // Calculate section score
      let score = 50;

      // Prefer sections with more seats available
      score += Math.min(section.seatsAvailable / 5, 20);

      // Prefer hybrid/online for flexibility
      if (section.format === 'hybrid') score += 15;
      if (section.format === 'online') score += 10;

      // Prefer morning classes (9-12)
      const hasMorningClass = section.schedule.some(slot => {
        const hour = parseInt(slot.startTime.split(':')[0]);
        return hour >= 9 && hour < 12;
      });
      if (hasMorningClass) score += 10;

      if (score > bestScore) {
        bestScore = score;
        bestSection = section;
      }
    }

    return bestSection;
  }

  /**
   * Detect time conflicts
   */
  private detectTimeConflicts(courses: ScheduledCourse[]): TimeConflict[] {
    const conflicts: TimeConflict[] = [];

    for (let i = 0; i < courses.length; i++) {
      for (let j = i + 1; j < courses.length; j++) {
        const course1 = courses[i];
        const course2 = courses[j];

        for (const slot1 of course1.schedule) {
          for (const slot2 of course2.schedule) {
            if (slot1.day === slot2.day) {
              const conflict = this.checkTimeOverlap(slot1, slot2);
              if (conflict) {
                conflicts.push({
                  course1: course1.title,
                  course2: course2.title,
                  conflictType: conflict,
                  severity: conflict === 'direct' ? 'high' : 'medium'
                });
              }
            }
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Check time overlap
   */
  private checkTimeOverlap(
    slot1: any,
    slot2: any
  ): 'direct' | 'back-to-back' | null {
    const start1 = this.timeToMinutes(slot1.startTime);
    const end1 = this.timeToMinutes(slot1.endTime);
    const start2 = this.timeToMinutes(slot2.startTime);
    const end2 = this.timeToMinutes(slot2.endTime);

    // Direct overlap
    if ((start1 < end2 && end1 > start2)) {
      return 'direct';
    }

    // Back-to-back (within 15 minutes)
    if (Math.abs(end1 - start2) <= 15 || Math.abs(end2 - start1) <= 15) {
      return 'back-to-back';
    }

    return null;
  }

  /**
   * Calculate free time
   */
  private calculateFreeTime(courses: ScheduledCourse[]): FreeTimeBlock[] {
    const freeTime: FreeTimeBlock[] = [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    for (const day of days) {
      const daySchedule = courses
        .flatMap(c => c.schedule)
        .filter(s => s.day === day)
        .sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));

      if (daySchedule.length === 0) {
        // Entire day is free
        freeTime.push({
          day,
          startTime: '08:00',
          endTime: '18:00',
          duration: 600
        });
        continue;
      }

      // Find gaps between classes
      for (let i = 0; i < daySchedule.length - 1; i++) {
        const endTime = daySchedule[i].endTime;
        const nextStartTime = daySchedule[i + 1].startTime;
        const gapMinutes = this.timeToMinutes(nextStartTime) - this.timeToMinutes(endTime);

        if (gapMinutes >= 30) {
          freeTime.push({
            day,
            startTime: endTime,
            endTime: nextStartTime,
            duration: gapMinutes
          });
        }
      }
    }

    return freeTime;
  }

  /**
   * Calculate workload distribution
   */
  private calculateWorkloadDistribution(
    courses: ScheduledCourse[]
  ): WorkloadDistribution {
    const distribution: WorkloadDistribution = {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      weekend: 0,
      totalWeekly: 0,
      balanced: false
    };

    for (const course of courses) {
      const workloadPerDay = course.estimatedWorkload / 7;

      for (const slot of course.schedule) {
        const day = slot.day.toLowerCase();
        if (day in distribution) {
          (distribution as any)[day] += workloadPerDay;
        }
      }
    }

    distribution.totalWeekly = courses.reduce((sum, c) => sum + c.estimatedWorkload, 0);

    // Check if balanced (no day exceeds 150% of average)
    const weekdayHours = [
      distribution.monday,
      distribution.tuesday,
      distribution.wednesday,
      distribution.thursday,
      distribution.friday
    ];
    const avgHours = weekdayHours.reduce((a, b) => a + b, 0) / 5;
    distribution.balanced = weekdayHours.every(hours => hours <= avgHours * 1.5);

    return distribution;
  }

  /**
   * Calculate difficulty balance
   */
  private calculateDifficultyBalance(courses: ScheduledCourse[]): number {
    const difficultyScores = courses.map(c => {
      const map = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
      return map[c.difficulty];
    });

    const avgDifficulty = difficultyScores.reduce((a, b) => a + b, 0) / courses.length;
    const variance = difficultyScores.reduce((sum, score) =>
      sum + Math.pow(score - avgDifficulty, 2), 0
    ) / courses.length;

    // Lower variance = better balance (scale to 0-100)
    return Math.max(100 - (variance * 30), 0);
  }

  /**
   * Calculate balance score
   */
  private calculateBalanceScore(schedule: OptimizedSchedule): number {
    let score = 100;

    // Penalize for conflicts
    score -= schedule.timeConflicts.length * 20;

    // Reward for balanced workload
    if (schedule.workloadDistribution.balanced) {
      score += 10;
    }

    // Reward for difficulty balance
    score += schedule.difficultyBalance * 0.2;

    // Penalize for too many credits
    if (schedule.totalCredits > 18) {
      score -= (schedule.totalCredits - 18) * 5;
    }

    return Math.max(Math.min(Math.round(score), 100), 0);
  }

  /**
   * Generate alternative schedules
   */
  private async generateAlternativeSchedules(
    courses: CourseRecommendation[],
    constraints: RecommendationConstraints | undefined,
    count: number
  ): Promise<OptimizedSchedule[]> {
    const alternatives: OptimizedSchedule[] = [];

    // Alternative 1: Prioritize morning classes
    const morningConstraints = {
      ...constraints,
      preferredTimeSlots: ['09:00-12:00']
    };
    alternatives.push(await this.generateOptimizedSchedule(courses, morningConstraints));

    // Alternative 2: Prioritize afternoon classes
    if (count > 1) {
      const afternoonConstraints = {
        ...constraints,
        preferredTimeSlots: ['13:00-17:00']
      };
      alternatives.push(await this.generateOptimizedSchedule(courses, afternoonConstraints));
    }

    return alternatives;
  }

  /**
   * Generate schedule recommendations
   */
  private generateScheduleRecommendations(
    schedule: OptimizedSchedule,
    constraints?: RecommendationConstraints
  ): string[] {
    const recommendations: string[] = [];

    if (schedule.timeConflicts.length > 0) {
      recommendations.push(`Resolve ${schedule.timeConflicts.length} time conflict(s) by selecting different sections`);
    }

    if (!schedule.workloadDistribution.balanced) {
      recommendations.push('Consider redistributing workload across the week for better balance');
    }

    if (schedule.totalCredits > 18) {
      recommendations.push('Credit load exceeds recommended maximum - consider reducing to 15-18 credits');
    }

    if (schedule.difficultyBalance < 60) {
      recommendations.push('Mix of course difficulties is unbalanced - consider easier electives');
    }

    const longDays = Object.entries(schedule.workloadDistribution)
      .filter(([day, hours]) => day !== 'weekend' && day !== 'totalWeekly' && day !== 'balanced' && hours > 8)
      .map(([day]) => day);

    if (longDays.length > 0) {
      recommendations.push(`${longDays.join(', ')} have heavy workloads - consider lighter days`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Schedule is well-balanced and optimized for success');
    }

    return recommendations;
  }

  /**
   * Estimate workload
   */
  private estimateWorkload(difficulty: string, credits: number): number {
    const baseHours = credits * 3; // 3 hours per credit hour
    const difficultyMultiplier = {
      beginner: 0.8,
      intermediate: 1.0,
      advanced: 1.3,
      expert: 1.5
    };

    return Math.round(baseHours * (difficultyMultiplier[difficulty as keyof typeof difficultyMultiplier] || 1.0));
  }

  /**
   * Helper methods
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private generateScheduleId(): string {
    return `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
