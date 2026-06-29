/**
 * Transfer Credit Mapping Service
 * "Every good and perfect gift is from above" - James 1:17
 * 
 * Maps completed courses to new requirements, identifies credit gaps,
 * generates updated degree plans, and calculates time to graduation
 */

import { PrismaClient } from '@prisma/client';
import { AIGatewayService } from './AIGatewayService';
import DegreePlanGenerationService from './DegreePlanGenerationService';
import { logger } from '../utils/logger';
import {
  TransferCreditMapping,
  MappedCourse,
  CreditGap,
  DegreePlan
} from '../types/course-recommendation.types';

const prisma = new PrismaClient();

interface TransferTranscript {
  institution: string;
  courses: TransferCourse[];
}

interface TransferCourse {
  courseCode: string;
  courseTitle: string;
  credits: number;
  grade: string;
  description?: string;
}

export default class TransferCreditMappingService {
  private aiGateway: AIGatewayService;
  private degreePlanService: DegreePlanGenerationService;

  constructor() {
    this.aiGateway = new AIGatewayService();
    this.degreePlanService = new DegreePlanGenerationService();
  }

  /**
   * Map transfer credits to new major
   */
  async mapTransferCredits(
    studentId: string,
    transcripts: TransferTranscript[],
    targetMajor: string
  ): Promise<TransferCreditMapping> {
    try {
      logger.info('Mapping transfer credits', {
        studentId,
        targetMajor,
        transcriptCount: transcripts.length
      });

      // Get target major requirements
      const requirements = await this.getMajorRequirements(targetMajor);

      // Map each transfer course
      const mappedCourses: MappedCourse[] = [];
      let totalTransferCredits = 0;

      for (const transcript of transcripts) {
        for (const course of transcript.courses) {
          const mapping = await this.mapCourse(
            course,
            requirements,
            transcript.institution
          );
          mappedCourses.push(mapping);

          if (mapping.mappingType !== 'not-applicable') {
            totalTransferCredits += mapping.targetCredits || 0;
          }
        }
      }

      // Identify credit gaps
      const creditGaps = this.identifyCreditGaps(
        mappedCourses,
        requirements
      );

      // Generate updated degree plan
      const updatedDegreePlan = await this.generateUpdatedDegreePlan(
        studentId,
        targetMajor,
        mappedCourses
      );

      // Calculate time to graduation
      const timeToGraduation = this.calculateTimeToGraduation(
        totalTransferCredits,
        requirements.totalCredits
      );

      logger.info('Transfer credits mapped', {
        studentId,
        totalTransferCredits,
        mappedCourses: mappedCourses.length
      });

      return {
        studentId,
        sourceInstitution: transcripts[0]?.institution || 'Unknown',
        targetMajor,
        totalTransferCredits,
        mappedCourses,
        creditGaps,
        updatedDegreePlan,
        timeToGraduation
      };
    } catch (error) {
      logger.error('Error mapping transfer credits', { error, studentId });
      throw error;
    }
  }

  /**
   * Map individual course
   */
  private async mapCourse(
    transferCourse: TransferCourse,
    requirements: any,
    sourceInstitution: string
  ): Promise<MappedCourse> {
    // Try to find direct equivalent
    const directMatch = await this.findDirectEquivalent(transferCourse);

    if (directMatch) {
      return {
        sourceCourseCode: transferCourse.courseCode,
        sourceCourseTitle: transferCourse.courseTitle,
        sourceCredits: transferCourse.credits,
        targetCourseId: directMatch.id,
        targetCourseCode: directMatch.code,
        targetCourseTitle: directMatch.title,
        targetCredits: directMatch.credits,
        mappingType: 'direct',
        reasoning: 'Direct course equivalent found in catalog'
      };
    }

    // Try to find similar course using AI
    const similarMatch = await this.findSimilarCourse(transferCourse);

    if (similarMatch) {
      return {
        sourceCourseCode: transferCourse.courseCode,
        sourceCourseTitle: transferCourse.courseTitle,
        sourceCredits: transferCourse.credits,
        targetCourseId: similarMatch.id,
        targetCourseCode: similarMatch.code,
        targetCourseTitle: similarMatch.title,
        targetCredits: similarMatch.credits,
        mappingType: 'equivalent',
        reasoning: `Similar content to ${similarMatch.title}`
      };
    }

    // Check if can count as elective
    if (this.canCountAsElective(transferCourse)) {
      return {
        sourceCourseCode: transferCourse.courseCode,
        sourceCourseTitle: transferCourse.courseTitle,
        sourceCredits: transferCourse.credits,
        targetCredits: transferCourse.credits,
        mappingType: 'elective',
        reasoning: 'Counts toward elective credit requirements'
      };
    }

    // Course does not transfer
    return {
      sourceCourseCode: transferCourse.courseCode,
      sourceCourseTitle: transferCourse.courseTitle,
      sourceCredits: transferCourse.credits,
      mappingType: 'not-applicable',
      reasoning: 'Does not meet degree requirements'
    };
  }


  /**
   * Find direct equivalent course
   */
  private async findDirectEquivalent(
    transferCourse: TransferCourse
  ): Promise<{ id: string; code: string; title: string; credits: number } | null> {
    // Search by exact title match
    const course = await prisma.course.findFirst({
      where: {
        title: {
          equals: transferCourse.courseTitle,
          mode: 'insensitive'
        },
        isActive: true
      },
      include: { faculty: true }
    });

    if (course) {
      return {
        id: course.id,
        code: `${course.faculty.name.substring(0, 3).toUpperCase()}-${course.id.substring(0, 3)}`,
        title: course.title,
        credits: course.duration || 3
      };
    }

    return null;
  }

  /**
   * Find similar course using AI
   */
  private async findSimilarCourse(
    transferCourse: TransferCourse
  ): Promise<{ id: string; code: string; title: string; credits: number } | null> {
    // Get all available courses
    const courses = await prisma.course.findMany({
      where: { isActive: true },
      include: { faculty: true },
      take: 50
    });

    // Use AI to find best match
    const prompt = `Given a transfer course "${transferCourse.courseTitle}" with description: "${transferCourse.description || 'N/A'}", 
which of these courses is the best match?

${courses.map((c, i) => `${i + 1}. ${c.title} - ${c.description}`).join('\n')}

Return only the number of the best match, or 0 if no good match exists.`;

    try {
      const response = await this.aiGateway.generateText({
        prompt,
        maxTokens: 10,
        temperature: 0.3
      });

      const matchIndex = parseInt(response.text.trim()) - 1;

      if (matchIndex >= 0 && matchIndex < courses.length) {
        const match = courses[matchIndex];
        return {
          id: match.id,
          code: `${match.faculty.name.substring(0, 3).toUpperCase()}-${match.id.substring(0, 3)}`,
          title: match.title,
          credits: match.duration || 3
        };
      }
    } catch (error) {
      logger.warn('AI course matching failed', { error });
    }

    return null;
  }

  /**
   * Check if course can count as elective
   */
  private canCountAsElective(transferCourse: TransferCourse): boolean {
    // Basic criteria for elective credit
    return (
      transferCourse.credits >= 2 &&
      transferCourse.grade !== 'F' &&
      transferCourse.grade !== 'D'
    );
  }

  /**
   * Get major requirements
   */
  private async getMajorRequirements(major: string): Promise<{
    requiredCourses: any[];
    electiveCredits: number;
    totalCredits: number;
    categories: { name: string; requiredCredits: number }[];
  }> {
    // In production, this would query a major requirements table
    return {
      requiredCourses: [],
      electiveCredits: 30,
      totalCredits: 120,
      categories: [
        { name: 'Core Requirements', requiredCredits: 45 },
        { name: 'Major Courses', requiredCredits: 45 },
        { name: 'Electives', requiredCredits: 30 }
      ]
    };
  }

  /**
   * Identify credit gaps
   */
  private identifyCreditGaps(
    mappedCourses: MappedCourse[],
    requirements: any
  ): CreditGap[] {
    const gaps: CreditGap[] = [];

    for (const category of requirements.categories) {
      const transferredCredits = mappedCourses
        .filter(c => c.mappingType !== 'not-applicable')
        .reduce((sum, c) => sum + (c.targetCredits || 0), 0);

      const remainingCredits = Math.max(
        category.requiredCredits - transferredCredits,
        0
      );

      if (remainingCredits > 0) {
        gaps.push({
          category: category.name,
          requiredCredits: category.requiredCredits,
          transferredCredits,
          remainingCredits,
          recommendedCourses: [] // Would be populated with actual course IDs
        });
      }
    }

    return gaps;
  }

  /**
   * Generate updated degree plan
   */
  private async generateUpdatedDegreePlan(
    studentId: string,
    targetMajor: string,
    mappedCourses: MappedCourse[]
  ): Promise<DegreePlan> {
    // Create enrollments for transferred courses
    const transferredCourseIds = mappedCourses
      .filter(c => c.targetCourseId && c.mappingType !== 'not-applicable')
      .map(c => c.targetCourseId!);

    // Mark as completed in database (in production)
    // For now, just generate degree plan accounting for transfers

    const degreePlan = await this.degreePlanService.generateDegreePlan(
      studentId,
      targetMajor
    );

    // Filter out transferred courses from plan
    degreePlan.courses = degreePlan.courses.filter(
      c => !transferredCourseIds.includes(c.courseId)
    );

    // Recalculate total credits
    const transferredCredits = mappedCourses
      .filter(c => c.mappingType !== 'not-applicable')
      .reduce((sum, c) => sum + (c.targetCredits || 0), 0);

    degreePlan.totalCredits = transferredCredits + degreePlan.courses.reduce(
      (sum, c) => sum + c.credits,
      0
    );

    return degreePlan;
  }

  /**
   * Calculate time to graduation
   */
  private calculateTimeToGraduation(
    transferredCredits: number,
    totalRequiredCredits: number
  ): string {
    const remainingCredits = totalRequiredCredits - transferredCredits;
    const creditsPerSemester = 15;
    const semestersRemaining = Math.ceil(remainingCredits / creditsPerSemester);

    const years = Math.floor(semestersRemaining / 2);
    const semesters = semestersRemaining % 2;

    if (years === 0) {
      return `${semesters} semester${semesters !== 1 ? 's' : ''}`;
    } else if (semesters === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`;
    } else {
      return `${years} year${years !== 1 ? 's' : ''} and ${semesters} semester${semesters !== 1 ? 's' : ''}`;
    }
  }
}
