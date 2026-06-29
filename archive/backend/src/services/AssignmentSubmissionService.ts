/**
 * ScrollUniversity Assignment Submission Service
 * "Do your best to present yourself to God as one approved" - 2 Timothy 2:15
 * 
 * Handles assignment submission, grading orchestration, and grade management
 */

import { PrismaClient } from '@prisma/client';
import { gradingService, GradingRubric, CodeSubmission, EssaySubmission, MathSubmission } from './GradingService';
import PlagiarismDetectionService from './PlagiarismDetectionService';
import { logger } from '../utils/productionLogger';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const plagiarismService = new PlagiarismDetectionService();

export interface SubmissionData {
  assignmentId: string;
  enrollmentId: string;
  userId: string;
  content: string;
  attachments: string[];
  submissionType: 'code' | 'essay' | 'math' | 'project' | 'quiz';
}

export interface SubmissionWithDetails {
  id: string;
  assignmentId: string;
  enrollmentId: string;
  userId: string;
  courseId: string;
  content: string;
  attachments: string[];
  score: number | null;
  feedback: string | null;
  gradedAt: Date | null;
  gradedBy: string | null;
  scrollAlignment: number | null;
  kingdomImpact: number | null;
  status: string;
  submittedAt: Date;
  assignment: any;
  enrollment: any;
  plagiarismReport?: any;
  gradeDetails?: any;
}

export class AssignmentSubmissionService {
  /**
   * Create a new submission
   */
  async createSubmission(data: SubmissionData): Promise<any> {
    try {
      // Get assignment details
      const assignment = await prisma.assignment.findUnique({
        where: { id: data.assignmentId },
        include: { course: true }
      });

      if (!assignment) {
        throw new Error('Assignment not found');
      }

      // Create submission
      const submission = await prisma.submission.create({
        data: {
          id: uuidv4(),
          enrollmentId: data.enrollmentId,
          assignmentId: data.assignmentId,
          content: data.content,
          attachments: data.attachments,
          status: 'SUBMITTED',
          submittedAt: new Date()
        },
        include: {
          assignment: true,
          enrollment: {
            include: {
              user: true,
              course: true
            }
          }
        }
      });

      logger.info('Submission created', {
        submissionId: submission.id,
        userId: data.userId,
        assignmentId: data.assignmentId
      });

      return submission;

    } catch (error: any) {
      logger.error('Create submission error', { error: error.message });
      throw error;
    }
  }

  /**
   * Grade a submission
   */
  async gradeSubmission(
    submission: any,
    rubric: GradingRubric,
    graderId: string
  ): Promise<any> {
    try {
      const submissionType = this.detectSubmissionType(submission);

      let gradeResult;

      // Grade based on type
      switch (submissionType) {
        case 'code':
          gradeResult = await this.gradeCodeSubmission(submission, rubric);
          break;
        case 'essay':
          gradeResult = await this.gradeEssaySubmission(submission, rubric);
          break;
        case 'math':
          gradeResult = await this.gradeMathSubmission(submission, rubric);
          break;
        case 'quiz':
          gradeResult = await this.gradeQuizSubmission(submission, rubric);
          break;
        default:
          throw new Error(`Unsupported submission type: ${submissionType}`);
      }

      // Check for plagiarism if essay or code
      let plagiarismReport;
      if (['essay', 'code'].includes(submissionType)) {
        plagiarismReport = await plagiarismService.checkPlagiarism({
          submissionId: submission.id,
          studentId: submission.enrollment.userId,
          content: submission.content,
          courseId: submission.enrollment.courseId,
          assignmentId: submission.assignmentId
        });

        // Adjust grade if plagiarism detected
        if (plagiarismReport.flagged) {
          gradeResult.grade.overallScore *= 0.5; // 50% penalty
          gradeResult.requiresHumanReview = true;
          gradeResult.reviewReason = 'Plagiarism detected';
        }
      }

      // Update submission with grade
      const updatedSubmission = await prisma.submission.update({
        where: { id: submission.id },
        data: {
          score: gradeResult.grade.overallScore,
          feedback: JSON.stringify(gradeResult.grade),
          gradedAt: new Date(),
          gradedBy: graderId,
          status: 'GRADED',
          scrollAlignment: this.calculateScrollAlignment(gradeResult.grade),
          kingdomImpact: this.calculateKingdomImpact(gradeResult.grade)
        }
      });

      logger.info('Submission graded', {
        submissionId: submission.id,
        score: gradeResult.grade.overallScore,
        requiresReview: gradeResult.requiresHumanReview
      });

      return {
        ...gradeResult,
        plagiarismReport,
        submission: updatedSubmission
      };

    } catch (error: any) {
      logger.error('Grade submission error', { error: error.message });
      throw error;
    }
  }

  /**
   * Grade code submission
   */
  private async gradeCodeSubmission(submission: any, rubric: GradingRubric): Promise<any> {
    const codeSubmission: CodeSubmission = {
      code: submission.content,
      language: this.detectLanguage(submission.content),
      requirements: submission.assignment.description ? [submission.assignment.description] : []
    };

    return await gradingService.gradeCode(
      codeSubmission,
      rubric,
      submission.id,
      submission.assignmentId,
      submission.enrollment.userId
    );
  }

  /**
   * Grade essay submission
   */
  private async gradeEssaySubmission(submission: any, rubric: GradingRubric): Promise<any> {
    const essaySubmission: EssaySubmission = {
      text: submission.content,
      prompt: submission.assignment.description || '',
      wordLimit: submission.assignment.maxPoints * 10 // Rough estimate
    };

    return await gradingService.gradeEssay(
      essaySubmission,
      rubric,
      submission.id,
      submission.assignmentId,
      submission.enrollment.userId
    );
  }

  /**
   * Grade math submission
   */
  private async gradeMathSubmission(submission: any, rubric: GradingRubric): Promise<any> {
    const mathSubmission: MathSubmission = {
      problem: submission.assignment.description || '',
      solution: submission.content,
      workShown: submission.content
    };

    return await gradingService.gradeMath(
      mathSubmission,
      rubric,
      submission.id,
      submission.assignmentId,
      submission.enrollment.userId
    );
  }

  /**
   * Grade quiz submission (multiple choice, fill-in-blank)
   */
  private async gradeQuizSubmission(submission: any, rubric: GradingRubric): Promise<any> {
    try {
      // Parse quiz answers
      const answers = JSON.parse(submission.content);
      const correctAnswers = JSON.parse(submission.assignment.description || '{}').answers || {};

      let correctCount = 0;
      const totalQuestions = Object.keys(correctAnswers).length;

      // Grade each answer
      for (const [questionId, studentAnswer] of Object.entries(answers)) {
        if (correctAnswers[questionId] === studentAnswer) {
          correctCount++;
        }
      }

      const score = (correctCount / totalQuestions) * 100;

      return {
        submissionId: submission.id,
        grade: {
          overallScore: score,
          correctCount,
          totalQuestions,
          details: {
            answers,
            correctAnswers
          }
        },
        confidence: 1.0, // Quiz grading is deterministic
        requiresHumanReview: false,
        gradedAt: new Date(),
        cost: 0
      };

    } catch (error: any) {
      logger.error('Quiz grading error', { error: error.message });
      throw error;
    }
  }

  /**
   * Apply manual grade from faculty
   */
  async applyManualGrade(
    submissionId: string,
    manualGrade: any,
    graderId: string
  ): Promise<any> {
    try {
      const updatedSubmission = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          score: manualGrade.score,
          feedback: JSON.stringify(manualGrade),
          gradedAt: new Date(),
          gradedBy: graderId,
          status: 'GRADED',
          scrollAlignment: manualGrade.scrollAlignment || null,
          kingdomImpact: manualGrade.kingdomImpact || null
        }
      });

      logger.info('Manual grade applied', {
        submissionId,
        score: manualGrade.score,
        graderId
      });

      return {
        submissionId,
        grade: manualGrade,
        confidence: 1.0,
        requiresHumanReview: false,
        gradedAt: new Date(),
        cost: 0,
        submission: updatedSubmission
      };

    } catch (error: any) {
      logger.error('Apply manual grade error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get submission by ID
   */
  async getSubmission(submissionId: string): Promise<any> {
    return await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            course: true
          }
        },
        enrollment: {
          include: {
            user: true,
            course: true
          }
        }
      }
    });
  }

  /**
   * Get submission with full details including grades and feedback
   */
  async getSubmissionWithDetails(submissionId: string): Promise<SubmissionWithDetails | null> {
    const submission = await this.getSubmission(submissionId);
    
    if (!submission) {
      return null;
    }

    // Get plagiarism report if exists
    const plagiarismReport = await plagiarismService.getPlagiarismCheck(submissionId);

    return {
      ...submission,
      courseId: submission.enrollment.courseId,
      userId: submission.enrollment.userId,
      plagiarismReport,
      gradeDetails: submission.feedback ? JSON.parse(submission.feedback) : null
    };
  }

  /**
   * Get all submissions for an assignment
   */
  async getAssignmentSubmissions(
    assignmentId: string,
    options: { status?: string; page: number; limit: number }
  ): Promise<any> {
    const { status, page, limit } = options;
    const skip = (page - 1) * limit;

    const where: any = { assignmentId };
    if (status) {
      where.status = status;
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        include: {
          enrollment: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          },
          assignment: true
        },
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' }
      }),
      prisma.submission.count({ where })
    ]);

    return {
      submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get all grades for a student
   */
  async getStudentGrades(userId: string): Promise<any[]> {
    const submissions = await prisma.submission.findMany({
      where: {
        enrollment: {
          userId
        },
        status: 'GRADED'
      },
      include: {
        assignment: {
          include: {
            course: true
          }
        },
        enrollment: {
          include: {
            course: true
          }
        }
      },
      orderBy: { gradedAt: 'desc' }
    });

    return submissions.map(sub => ({
      submissionId: sub.id,
      assignmentTitle: sub.assignment.title,
      courseTitle: sub.enrollment.course.title,
      score: sub.score,
      maxPoints: sub.assignment.maxPoints,
      percentage: sub.score ? (sub.score / sub.assignment.maxPoints) * 100 : 0,
      feedback: sub.feedback ? JSON.parse(sub.feedback) : null,
      gradedAt: sub.gradedAt,
      scrollAlignment: sub.scrollAlignment,
      kingdomImpact: sub.kingdomImpact
    }));
  }

  /**
   * Add additional feedback to a submission
   */
  async addFeedback(
    submissionId: string,
    feedback: string,
    feedbackType: string,
    facultyId: string
  ): Promise<any> {
    const submission = await this.getSubmission(submissionId);
    
    if (!submission) {
      throw new Error('Submission not found');
    }

    const existingFeedback = submission.feedback ? JSON.parse(submission.feedback) : {};
    const additionalFeedback = {
      ...existingFeedback,
      additionalComments: [
        ...(existingFeedback.additionalComments || []),
        {
          type: feedbackType,
          comment: feedback,
          addedBy: facultyId,
          addedAt: new Date()
        }
      ]
    };

    return await prisma.submission.update({
      where: { id: submissionId },
      data: {
        feedback: JSON.stringify(additionalFeedback)
      }
    });
  }

  /**
   * Bulk grade submissions
   */
  async bulkGradeSubmissions(
    submissionIds: string[],
    rubric: GradingRubric,
    graderId: string
  ): Promise<any[]> {
    const results = [];

    for (const submissionId of submissionIds) {
      try {
        const submission = await this.getSubmission(submissionId);
        if (submission) {
          const result = await this.gradeSubmission(submission, rubric, graderId);
          results.push({
            submissionId,
            success: true,
            result
          });
        }
      } catch (error: any) {
        results.push({
          submissionId,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Detect submission type from content
   */
  private detectSubmissionType(submission: any): string {
    const type = submission.assignment.type;
    
    if (type === 'QUIZ') return 'quiz';
    if (type === 'ESSAY') return 'essay';
    if (type === 'PROJECT') return 'code';
    if (type === 'LAB_WORK') return 'code';
    
    // Try to detect from content
    if (submission.content.includes('function') || submission.content.includes('class')) {
      return 'code';
    }
    
    if (submission.content.match(/\d+\s*[+\-*/=]\s*\d+/)) {
      return 'math';
    }
    
    return 'essay';
  }

  /**
   * Detect programming language
   */
  private detectLanguage(code: string): string {
    if (code.includes('def ') || code.includes('import ')) return 'python';
    if (code.includes('function') || code.includes('const ')) return 'javascript';
    if (code.includes('public class') || code.includes('System.out')) return 'java';
    if (code.includes('#include') || code.includes('int main')) return 'cpp';
    return 'javascript'; // default
  }

  /**
   * Calculate scroll alignment score
   */
  private calculateScrollAlignment(grade: any): number {
    // Base alignment on quality and effort
    const baseScore = grade.overallScore / 100;
    
    // Bonus for excellence
    if (grade.overallScore >= 90) {
      return Math.min(1.0, baseScore + 0.1);
    }
    
    return baseScore;
  }

  /**
   * Calculate kingdom impact score
   */
  private calculateKingdomImpact(grade: any): number {
    // Assess potential real-world impact
    const qualityScore = grade.overallScore / 100;
    
    // Consider creativity and application
    const impactMultiplier = 0.8;
    
    return qualityScore * impactMultiplier;
  }
}
