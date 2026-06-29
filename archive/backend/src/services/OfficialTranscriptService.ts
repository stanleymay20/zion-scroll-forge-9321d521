/**
 * ScrollUniversity Official Transcript Service
 * "Let your light shine before others" - Matthew 5:16
 * 
 * Generates official transcripts with blockchain verification
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/productionLogger';
import { OfficialTranscript } from '../types/degree-graduation.types';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class OfficialTranscriptService {
  /**
   * Generate official transcript for student
   */
  async generateOfficialTranscript(studentId: string): Promise<OfficialTranscript> {
    try {
      logger.info('Generating official transcript', { studentId });

      // Get student information
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        include: {
          enrollments: {
            include: {
              course: {
                include: {
                  faculty: true
                }
              },
              submissions: {
                where: { status: 'GRADED' }
              }
            }
          }
        }
      });

      if (!student) {
        throw new Error('Student not found');
      }

      // Build course list with grades
      const courses = [];
      const gpaByTerm: { [key: string]: { gpa: number; creditHours: number; count: number } } = {};

      for (const enrollment of student.enrollments) {
        if (!enrollment.completedAt) continue;

        const submissions = enrollment.submissions;
        if (submissions.length === 0) continue;

        // Calculate course grade
        const averageScore = submissions.reduce((sum, sub) => sum + (sub.score || 0), 0) / submissions.length;
        const letterGrade = this.calculateLetterGrade(averageScore);
        const gradePoints = this.getGradePoints(letterGrade);
        const creditHours = 3; // Default

        // Determine term and year (simplified - would use actual enrollment dates)
        const year = enrollment.startedAt.getFullYear();
        const month = enrollment.startedAt.getMonth();
        const term = month < 5 ? 'Spring' : month < 8 ? 'Summer' : 'Fall';
        const termKey = `${term} ${year}`;

        courses.push({
          courseCode: enrollment.course.id.substring(0, 8).toUpperCase(),
          courseTitle: enrollment.course.title,
          creditHours,
          term,
          year,
          grade: letterGrade,
          gradePoints
        });

        // Track GPA by term
        if (!gpaByTerm[termKey]) {
          gpaByTerm[termKey] = { gpa: 0, creditHours: 0, count: 0 };
        }
        gpaByTerm[termKey].gpa += gradePoints * creditHours;
        gpaByTerm[termKey].creditHours += creditHours;
        gpaByTerm[termKey].count++;
      }

      // Calculate term GPAs
      const termGPAs = Object.entries(gpaByTerm).map(([termKey, data]) => {
        const [term, yearStr] = termKey.split(' ');
        return {
          term,
          year: parseInt(yearStr),
          gpa: data.creditHours > 0 ? data.gpa / data.creditHours : 0,
          creditHours: data.creditHours
        };
      });

      // Calculate cumulative GPA
      const totalGradePoints = courses.reduce((sum, course) => sum + (course.gradePoints * course.creditHours), 0);
      const totalCreditHours = courses.reduce((sum, course) => sum + course.creditHours, 0);
      const cumulativeGPA = totalCreditHours > 0 ? totalGradePoints / totalCreditHours : 0;

      // Get scroll metrics
      const scrollMetrics = await this.calculateScrollMetrics(studentId);

      // Get degree programs
      const degreePrograms = [{
        programName: 'Bachelor of Scroll Engineering',
        degreeType: 'Bachelor',
        status: student.enrollmentStatus,
        startDate: student.createdAt,
        completionDate: student.enrollmentStatus === 'GRADUATED' ? new Date() : undefined
      }];

      // Get honors and certifications
      const honors: string[] = [];
      if (cumulativeGPA >= 3.9) honors.push('Summa Cum Laude');
      else if (cumulativeGPA >= 3.7) honors.push('Magna Cum Laude');
      else if (cumulativeGPA >= 3.5) honors.push('Cum Laude');

      const certifications = await prisma.certification.findMany({
        where: { userId: studentId },
        select: { title: true }
      });

      // Generate blockchain verification
      const blockchainVerification = await this.generateBlockchainVerification(studentId, {
        cumulativeGPA,
        totalCreditHours,
        courses: courses.length
      });

      const transcript: OfficialTranscript = {
        id: crypto.randomUUID(),
        studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        studentId_number: student.id.substring(0, 10).toUpperCase(),
        dateOfBirth: student.dateOfBirth || new Date(),
        enrollmentStatus: student.enrollmentStatus,
        academicLevel: student.academicLevel,
        degreePrograms,
        courses,
        gpaByTerm: termGPAs,
        cumulativeGPA: Math.round(cumulativeGPA * 100) / 100,
        totalCreditHours,
        scrollMetrics,
        honors,
        certifications: certifications.map(c => c.title),
        blockchainVerification,
        issuedAt: new Date(),
        issuedBy: 'ScrollUniversity Registrar',
        officialSeal: true
      };

      // Store transcript record
      await this.storeTranscriptRecord(transcript);

      logger.info('Official transcript generated', {
        studentId,
        transcriptId: transcript.id,
        gpa: transcript.cumulativeGPA
      });

      return transcript;

    } catch (error: any) {
      logger.error('Generate official transcript error', { error: error.message, studentId });
      throw error;
    }
  }

  /**
   * Calculate letter grade from percentage
   */
  private calculateLetterGrade(percentage: number): string {
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 63) return 'D';
    if (percentage >= 60) return 'D-';
    return 'F';
  }

  /**
   * Get grade points for letter grade
   */
  private getGradePoints(letterGrade: string): number {
    const gradeMap: { [key: string]: number } = {
      'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'D-': 0.7,
      'F': 0.0
    };
    return gradeMap[letterGrade] || 0.0;
  }

  /**
   * Calculate scroll-specific metrics
   */
  private async calculateScrollMetrics(studentId: string): Promise<{
    scrollXP: number;
    scrollAlignment: number;
    kingdomImpact: number;
    innovationScore: number;
  }> {
    const submissions = await prisma.submission.findMany({
      where: {
        enrollment: { userId: studentId },
        status: 'GRADED'
      }
    });

    if (submissions.length === 0) {
      return {
        scrollXP: 0,
        scrollAlignment: 0,
        kingdomImpact: 0,
        innovationScore: 0
      };
    }

    const scrollAlignment = submissions.reduce((sum, sub) => sum + (sub.scrollAlignment || 0), 0) / submissions.length;
    const kingdomImpact = submissions.reduce((sum, sub) => sum + (sub.kingdomImpact || 0), 0) / submissions.length;
    const innovationScore = scrollAlignment * 0.7 + kingdomImpact * 0.3;

    // Get ScrollXP from transactions
    const xpTransactions = await prisma.scrollCoinTransaction.findMany({
      where: {
        userId: studentId,
        type: 'EARNED'
      }
    });

    const scrollXP = xpTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    return {
      scrollXP: Math.round(scrollXP),
      scrollAlignment: Math.round(scrollAlignment * 100) / 100,
      kingdomImpact: Math.round(kingdomImpact * 100) / 100,
      innovationScore: Math.round(innovationScore * 100) / 100
    };
  }

  /**
   * Generate blockchain verification
   */
  private async generateBlockchainVerification(
    studentId: string,
    data: any
  ): Promise<{
    hash: string;
    verificationUrl: string;
    timestamp: Date;
  }> {
    const transcriptString = JSON.stringify({
      studentId,
      ...data,
      timestamp: new Date().toISOString()
    });

    const hash = crypto
      .createHash('sha256')
      .update(transcriptString)
      .digest('hex');

    const verificationUrl = `${process.env.BLOCKCHAIN_VERIFICATION_URL || 'https://verify.scrolluniversity.org'}/transcript/${hash}`;

    return {
      hash,
      verificationUrl,
      timestamp: new Date()
    };
  }

  /**
   * Store transcript record
   */
  private async storeTranscriptRecord(transcript: OfficialTranscript): Promise<void> {
    try {
      await prisma.scrollTranscript.create({
        data: {
          studentId: transcript.studentId,
          institutionId: 'scroll-university',
          accreditationId: 'scroll-accreditation',
          gpa: transcript.cumulativeGPA,
          creditHours: transcript.totalCreditHours,
          courses: JSON.stringify(transcript.courses),
          scrollXP: transcript.scrollMetrics.scrollXP,
          innovationScore: JSON.stringify({
            score: transcript.scrollMetrics.innovationScore
          }),
          verificationHashes: [transcript.blockchainVerification.hash]
        }
      });

      logger.info('Transcript record stored', { transcriptId: transcript.id });

    } catch (error: any) {
      logger.error('Store transcript record error', { error: error.message });
      throw error;
    }
  }

  /**
   * Verify transcript authenticity
   */
  async verifyTranscript(blockchainHash: string): Promise<{
    valid: boolean;
    message: string;
  }> {
    try {
      const transcript = await prisma.scrollTranscript.findFirst({
        where: {
          verificationHashes: {
            has: blockchainHash
          }
        }
      });

      if (!transcript) {
        return {
          valid: false,
          message: 'Transcript not found or invalid hash'
        };
      }

      return {
        valid: true,
        message: 'Transcript is authentic and valid'
      };

    } catch (error: any) {
      logger.error('Verify transcript error', { error: error.message });
      return {
        valid: false,
        message: 'Error verifying transcript'
      };
    }
  }
}
