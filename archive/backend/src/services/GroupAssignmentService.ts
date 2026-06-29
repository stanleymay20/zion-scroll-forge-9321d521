/**
 * Group Assignment Service
 * Handles group assignments and submissions
 * "Whatever you do, work at it with all your heart" - Colossians 3:23
 */

import { PrismaClient } from '@prisma/client';
import {
  GroupAssignment,
  GroupAssignmentSubmission,
  CreateGroupAssignmentRequest,
  SubmitGroupAssignmentRequest,
  AssignmentStatus,
  SubmissionAttachment
} from '../types/study-group.types';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class GroupAssignmentService {
  /**
   * Create a group assignment
   */
  async createAssignment(
    userId: string,
    request: CreateGroupAssignmentRequest
  ): Promise<GroupAssignment> {
    try {
      // Check if user is member of the group
      const member = await prisma.$queryRaw<any[]>`
        SELECT role FROM study_group_members
        WHERE group_id = ${request.groupId} AND user_id = ${userId}
      `;

      if (!member || member.length === 0) {
        throw new Error('User is not a member of this group');
      }

      // Create assignment
      const assignment = await prisma.$queryRaw<any[]>`
        INSERT INTO group_assignments (
          group_id, title, description, due_date, created_by
        ) VALUES (
          ${request.groupId},
          ${request.title},
          ${request.description},
          ${request.dueDate || null},
          ${userId}
        )
        RETURNING *
      `;

      logger.info(`Group assignment created: ${assignment[0].id} in group ${request.groupId}`);

      return this.formatAssignment(assignment[0]);
    } catch (error) {
      logger.error('Error creating group assignment:', error);
      throw error;
    }
  }

  /**
   * Submit group assignment
   */
  async submitAssignment(
    userId: string,
    request: SubmitGroupAssignmentRequest,
    files?: Express.Multer.File[]
  ): Promise<GroupAssignmentSubmission> {
    try {
      // Get assignment
      const assignment = await prisma.$queryRaw<any[]>`
        SELECT * FROM group_assignments WHERE id = ${request.assignmentId}
      `;

      if (!assignment || assignment.length === 0) {
        throw new Error('Assignment not found');
      }

      // Check if user is member of the group
      const member = await prisma.$queryRaw<any[]>`
        SELECT * FROM study_group_members
        WHERE group_id = ${assignment[0].group_id} AND user_id = ${userId}
      `;

      if (!member || member.length === 0) {
        throw new Error('User is not a member of this group');
      }

      // Handle file attachments
      let attachments: SubmissionAttachment[] = [];
      if (files && files.length > 0) {
        attachments = files.map(file => ({
          id: crypto.randomUUID(),
          filename: file.originalname,
          url: `/uploads/assignments/${file.filename}`,
          mimetype: file.mimetype,
          size: file.size,
          uploadedAt: new Date()
        }));
      }

      // Create or update submission
      const existingSubmission = await prisma.$queryRaw<any[]>`
        SELECT id FROM group_assignment_submissions
        WHERE assignment_id = ${request.assignmentId} AND group_id = ${assignment[0].group_id}
      `;

      let submission: any[];

      if (existingSubmission && existingSubmission.length > 0) {
        // Update existing submission
        submission = await prisma.$queryRaw<any[]>`
          UPDATE group_assignment_submissions
          SET 
            content = ${request.content},
            attachments = ${JSON.stringify(attachments)}::jsonb,
            submitted_by = ${userId},
            submitted_at = CURRENT_TIMESTAMP
          WHERE id = ${existingSubmission[0].id}
          RETURNING *
        `;
      } else {
        // Create new submission
        submission = await prisma.$queryRaw<any[]>`
          INSERT INTO group_assignment_submissions (
            assignment_id, group_id, submitted_by, content, attachments
          ) VALUES (
            ${request.assignmentId},
            ${assignment[0].group_id},
            ${userId},
            ${request.content},
            ${JSON.stringify(attachments)}::jsonb
          )
          RETURNING *
        `;
      }

      // Update assignment status
      await prisma.$executeRaw`
        UPDATE group_assignments
        SET status = 'SUBMITTED'
        WHERE id = ${request.assignmentId}
      `;

      logger.info(`Group assignment submitted: ${request.assignmentId} by user ${userId}`);

      return this.formatSubmission(submission[0]);
    } catch (error) {
      logger.error('Error submitting group assignment:', error);
      throw error;
    }
  }

  /**
   * Get group assignments
   */
  async getGroupAssignments(groupId: string): Promise<GroupAssignment[]> {
    try {
      const assignments = await prisma.$queryRaw<any[]>`
        SELECT * FROM group_assignments
        WHERE group_id = ${groupId}
        ORDER BY 
          CASE 
            WHEN due_date IS NULL THEN 1
            ELSE 0
          END,
          due_date ASC,
          created_at DESC
      `;

      return assignments.map(this.formatAssignment);
    } catch (error) {
      logger.error('Error getting group assignments:', error);
      throw error;
    }
  }

  /**
   * Get assignment submissions
   */
  async getAssignmentSubmissions(assignmentId: string): Promise<GroupAssignmentSubmission[]> {
    try {
      const submissions = await prisma.$queryRaw<any[]>`
        SELECT * FROM group_assignment_submissions
        WHERE assignment_id = ${assignmentId}
        ORDER BY submitted_at DESC
      `;

      return submissions.map(this.formatSubmission);
    } catch (error) {
      logger.error('Error getting assignment submissions:', error);
      throw error;
    }
  }

  /**
   * Grade assignment submission
   */
  async gradeSubmission(
    userId: string,
    submissionId: string,
    grade: number,
    feedback?: string
  ): Promise<GroupAssignmentSubmission> {
    try {
      // Get submission
      const submission = await prisma.$queryRaw<any[]>`
        SELECT gas.*, ga.group_id
        FROM group_assignment_submissions gas
        JOIN group_assignments ga ON gas.assignment_id = ga.id
        WHERE gas.id = ${submissionId}
      `;

      if (!submission || submission.length === 0) {
        throw new Error('Submission not found');
      }

      // Check if user is owner or moderator
      const member = await prisma.$queryRaw<any[]>`
        SELECT role FROM study_group_members
        WHERE group_id = ${submission[0].group_id} AND user_id = ${userId}
      `;

      if (!member || member.length === 0) {
        throw new Error('User is not a member of this group');
      }

      if (member[0].role !== 'OWNER' && member[0].role !== 'MODERATOR') {
        throw new Error('Only group owner or moderator can grade submissions');
      }

      // Update submission
      const graded = await prisma.$queryRaw<any[]>`
        UPDATE group_assignment_submissions
        SET 
          grade = ${grade},
          feedback = ${feedback || null},
          graded_at = CURRENT_TIMESTAMP,
          graded_by = ${userId}
        WHERE id = ${submissionId}
        RETURNING *
      `;

      // Update assignment status
      await prisma.$executeRaw`
        UPDATE group_assignments
        SET status = 'COMPLETED'
        WHERE id = ${submission[0].assignment_id}
      `;

      logger.info(`Assignment submission graded: ${submissionId} by user ${userId}`);

      return this.formatSubmission(graded[0]);
    } catch (error) {
      logger.error('Error grading submission:', error);
      throw error;
    }
  }

  /**
   * Update assignment status
   */
  async updateAssignmentStatus(
    userId: string,
    assignmentId: string,
    status: AssignmentStatus
  ): Promise<GroupAssignment> {
    try {
      // Get assignment
      const assignment = await prisma.$queryRaw<any[]>`
        SELECT * FROM group_assignments WHERE id = ${assignmentId}
      `;

      if (!assignment || assignment.length === 0) {
        throw new Error('Assignment not found');
      }

      // Check if user is owner or moderator
      const member = await prisma.$queryRaw<any[]>`
        SELECT role FROM study_group_members
        WHERE group_id = ${assignment[0].group_id} AND user_id = ${userId}
      `;

      if (!member || member.length === 0) {
        throw new Error('User is not a member of this group');
      }

      if (member[0].role !== 'OWNER' && member[0].role !== 'MODERATOR') {
        throw new Error('Only group owner or moderator can update assignment status');
      }

      // Update status
      await prisma.$executeRaw`
        UPDATE group_assignments
        SET status = ${status}
        WHERE id = ${assignmentId}
      `;

      const updated = await prisma.$queryRaw<any[]>`
        SELECT * FROM group_assignments WHERE id = ${assignmentId}
      `;

      logger.info(`Assignment status updated: ${assignmentId} to ${status}`);

      return this.formatAssignment(updated[0]);
    } catch (error) {
      logger.error('Error updating assignment status:', error);
      throw error;
    }
  }

  /**
   * Delete assignment
   */
  async deleteAssignment(userId: string, assignmentId: string): Promise<void> {
    try {
      // Get assignment
      const assignment = await prisma.$queryRaw<any[]>`
        SELECT * FROM group_assignments WHERE id = ${assignmentId}
      `;

      if (!assignment || assignment.length === 0) {
        throw new Error('Assignment not found');
      }

      // Check if user is creator or group owner
      const member = await prisma.$queryRaw<any[]>`
        SELECT role FROM study_group_members
        WHERE group_id = ${assignment[0].group_id} AND user_id = ${userId}
      `;

      if (!member || member.length === 0) {
        throw new Error('User is not a member of this group');
      }

      const isCreator = assignment[0].created_by === userId;
      const isOwner = member[0].role === 'OWNER';

      if (!isCreator && !isOwner) {
        throw new Error('Only assignment creator or group owner can delete the assignment');
      }

      // Delete assignment
      await prisma.$executeRaw`
        DELETE FROM group_assignments WHERE id = ${assignmentId}
      `;

      logger.info(`Assignment deleted: ${assignmentId} by user ${userId}`);
    } catch (error) {
      logger.error('Error deleting assignment:', error);
      throw error;
    }
  }

  /**
   * Format assignment
   */
  private formatAssignment(row: any): GroupAssignment {
    return {
      id: row.id,
      groupId: row.group_id,
      title: row.title,
      description: row.description,
      dueDate: row.due_date,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Format submission
   */
  private formatSubmission(row: any): GroupAssignmentSubmission {
    return {
      id: row.id,
      assignmentId: row.assignment_id,
      groupId: row.group_id,
      submittedBy: row.submitted_by,
      content: row.content,
      attachments: row.attachments || [],
      grade: row.grade,
      feedback: row.feedback,
      submittedAt: row.submitted_at,
      gradedAt: row.graded_at,
      gradedBy: row.graded_by
    };
  }
}

export default new GroupAssignmentService();
