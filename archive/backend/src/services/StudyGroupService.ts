/**
 * Study Group Service
 * Core business logic for study groups and collaboration
 * "As iron sharpens iron, so one person sharpens another" - Proverbs 27:17
 */

import { PrismaClient } from '@prisma/client';
import {
  StudyGroup,
  StudyGroupMember,
  StudyGroupWithMembers,
  StudyGroupMemberWithUser,
  CreateStudyGroupRequest,
  UpdateStudyGroupRequest,
  JoinStudyGroupRequest,
  GetStudyGroupsRequest,
  GroupMemberRole,
  StudyGroupStatus,
  SearchStudyGroupsRequest,
  UpdateMemberRoleRequest,
  RemoveMemberRequest
} from '../types/study-group.types';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class StudyGroupService {
  /**
   * Create a new study group
   */
  async createStudyGroup(
    userId: string,
    request: CreateStudyGroupRequest
  ): Promise<StudyGroupWithMembers> {
    try {
      // Validate max members
      const maxMembers = request.maxMembers || 20;
      if (maxMembers < 2 || maxMembers > 100) {
        throw new Error('Max members must be between 2 and 100');
      }

      // Create study group
      const group = await prisma.$queryRaw<any[]>`
        INSERT INTO study_groups (
          name, description, course_id, creator_id, is_private,
          max_members, meeting_schedule, tags, interests, academic_level
        ) VALUES (
          ${request.name},
          ${request.description},
          ${request.courseId || null},
          ${userId},
          ${request.isPrivate},
          ${maxMembers},
          ${request.meetingSchedule ? JSON.stringify(request.meetingSchedule) : null}::jsonb,
          ${request.tags || []}::text[],
          ${request.interests || []}::text[],
          ${request.academicLevel || null}
        )
        RETURNING *
      `;

      const createdGroup = group[0];

      // Add creator as owner
      await prisma.$executeRaw`
        INSERT INTO study_group_members (group_id, user_id, role)
        VALUES (${createdGroup.id}, ${userId}, 'OWNER')
      `;

      logger.info(`Study group created: ${createdGroup.id} by user ${userId}`);

      return await this.getStudyGroupById(createdGroup.id, userId);
    } catch (error) {
      logger.error('Error creating study group:', error);
      throw error;
    }
  }

  /**
   * Update a study group
   */
  async updateStudyGroup(
    userId: string,
    request: UpdateStudyGroupRequest
  ): Promise<StudyGroup> {
    try {
      // Check if user is owner or moderator
      const member = await prisma.$queryRaw<any[]>`
        SELECT role FROM study_group_members
        WHERE group_id = ${request.groupId} AND user_id = ${userId}
      `;

      if (!member || member.length === 0) {
        throw new Error('User is not a member of this group');
      }

      if (member[0].role !== 'OWNER' && member[0].role !== 'MODERATOR') {
        throw new Error('Only group owner or moderator can update the group');
      }

      // Build update query
      const updates: string[] = [];
      const values: any[] = [];

      if (request.name !== undefined) {
        updates.push(`name = $${values.length + 1}`);
        values.push(request.name);
      }

      if (request.description !== undefined) {
        updates.push(`description = $${values.length + 1}`);
        values.push(request.description);
      }

      if (request.isPrivate !== undefined) {
        updates.push(`is_private = $${values.length + 1}`);
        values.push(request.isPrivate);
      }

      if (request.maxMembers !== undefined) {
        updates.push(`max_members = $${values.length + 1}`);
        values.push(request.maxMembers);
      }

      if (request.meetingSchedule !== undefined) {
        updates.push(`meeting_schedule = $${values.length + 1}::jsonb`);
        values.push(JSON.stringify(request.meetingSchedule));
      }

      if (request.tags !== undefined) {
        updates.push(`tags = $${values.length + 1}::text[]`);
        values.push(request.tags);
      }

      if (request.interests !== undefined) {
        updates.push(`interests = $${values.length + 1}::text[]`);
        values.push(request.interests);
      }

      if (request.status !== undefined) {
        updates.push(`status = $${values.length + 1}`);
        values.push(request.status);
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(request.groupId);

      await prisma.$executeRawUnsafe(`
        UPDATE study_groups
        SET ${updates.join(', ')}
        WHERE id = $${values.length}
      `, ...values);

      const updatedGroup = await prisma.$queryRaw<any[]>`
        SELECT * FROM study_groups WHERE id = ${request.groupId}
      `;

      logger.info(`Study group updated: ${request.groupId} by user ${userId}`);

      return this.formatStudyGroup(updatedGroup[0]);
    } catch (error) {
      logger.error('Error updating study group:', error);
      throw error;
    }
  }

  /**
   * Join a study group
   */
  async joinStudyGroup(
    userId: string,
    request: JoinStudyGroupRequest
  ): Promise<{ member: StudyGroupMember; group: StudyGroup }> {
    try {
      // Check if group exists
      const group = await prisma.$queryRaw<any[]>`
        SELECT * FROM study_groups WHERE id = ${request.groupId}
      `;

      if (!group || group.length === 0) {
        throw new Error('Study group not found');
      }

      // Check if already a member
      const existingMember = await prisma.$queryRaw<any[]>`
        SELECT * FROM study_group_members
        WHERE group_id = ${request.groupId} AND user_id = ${userId}
      `;

      if (existingMember && existingMember.length > 0) {
        throw new Error('User is already a member of this group');
      }

      // Check group capacity (trigger will handle this, but we check here for better error message)
      const memberCount = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM study_group_members
        WHERE group_id = ${request.groupId} AND is_active = true
      `;

      if (parseInt(memberCount[0].count) >= group[0].max_members) {
        throw new Error('Study group has reached maximum capacity');
      }

      // Add member
      const member = await prisma.$queryRaw<any[]>`
        INSERT INTO study_group_members (group_id, user_id, role)
        VALUES (${request.groupId}, ${userId}, 'MEMBER')
        RETURNING *
      `;

      logger.info(`User ${userId} joined study group ${request.groupId}`);

      return {
        member: this.formatStudyGroupMember(member[0]),
        group: this.formatStudyGroup(group[0])
      };
    } catch (error) {
      logger.error('Error joining study group:', error);
      throw error;
    }
  }

  /**
   * Leave a study group
   */
  async leaveStudyGroup(userId: string, groupId: string): Promise<void> {
    try {
      // Check if user is owner
      const member = await prisma.$queryRaw<any[]>`
        SELECT role FROM study_group_members
        WHERE group_id = ${groupId} AND user_id = ${userId}
      `;

      if (!member || member.length === 0) {
        throw new Error('User is not a member of this group');
      }

      if (member[0].role === 'OWNER') {
        // Check if there are other members
        const memberCount = await prisma.$queryRaw<any[]>`
          SELECT COUNT(*) as count FROM study_group_members
          WHERE group_id = ${groupId} AND is_active = true
        `;

        if (parseInt(memberCount[0].count) > 1) {
          throw new Error('Owner must transfer ownership before leaving the group');
        }

        // If owner is the only member, delete the group
        await this.deleteStudyGroup(userId, groupId);
      } else {
        // Remove member
        await prisma.$executeRaw`
          DELETE FROM study_group_members
          WHERE group_id = ${groupId} AND user_id = ${userId}
        `;
      }

      logger.info(`User ${userId} left study group ${groupId}`);
    } catch (error) {
      logger.error('Error leaving study group:', error);
      throw error;
    }
  }

  /**
   * Delete a study group
   */
  async deleteStudyGroup(userId: string, groupId: string): Promise<void> {
    try {
      // Check if user is owner
      const member = await prisma.$queryRaw<any[]>`
        SELECT role FROM study_group_members
        WHERE group_id = ${groupId} AND user_id = ${userId}
      `;

      if (!member || member.length === 0 || member[0].role !== 'OWNER') {
        throw new Error('Only group owner can delete the group');
      }

      // Delete group (cascade will handle related records)
      await prisma.$executeRaw`
        DELETE FROM study_groups WHERE id = ${groupId}
      `;

      logger.info(`Study group ${groupId} deleted by user ${userId}`);
    } catch (error) {
      logger.error('Error deleting study group:', error);
      throw error;
    }
  }

  /**
   * Get study group by ID
   */
  async getStudyGroupById(
    groupId: string,
    currentUserId: string
  ): Promise<StudyGroupWithMembers> {
    try {
      const groups = await prisma.$queryRaw<any[]>`
        SELECT 
          sg.*,
          (SELECT COUNT(*) FROM study_group_members WHERE group_id = sg.id AND is_active = true) as member_count,
          EXISTS(SELECT 1 FROM study_group_members WHERE group_id = sg.id AND user_id = ${currentUserId}) as is_member,
          (SELECT role FROM study_group_members WHERE group_id = sg.id AND user_id = ${currentUserId}) as user_role
        FROM study_groups sg
        WHERE sg.id = ${groupId}
      `;

      if (!groups || groups.length === 0) {
        throw new Error('Study group not found');
      }

      const group = groups[0];

      // Get members
      const members = await this.getGroupMembers(groupId);

      return {
        ...this.formatStudyGroup(group),
        members,
        memberCount: parseInt(group.member_count),
        isMember: group.is_member,
        userRole: group.user_role
      };
    } catch (error) {
      logger.error('Error getting study group:', error);
      throw error;
    }
  }

  /**
   * Get study groups
   */
  async getStudyGroups(
    currentUserId: string,
    params: GetStudyGroupsRequest
  ): Promise<{ groups: StudyGroupWithMembers[]; total: number; hasMore: boolean }> {
    try {
      const limit = params.limit || 20;
      const offset = params.offset || 0;

      let whereClause = 'WHERE sg.status = \'ACTIVE\'';
      const queryParams: any[] = [];

      if (params.courseId) {
        queryParams.push(params.courseId);
        whereClause += ` AND sg.course_id = $${queryParams.length}`;
      }

      if (params.tags && params.tags.length > 0) {
        queryParams.push(params.tags);
        whereClause += ` AND sg.tags && $${queryParams.length}::text[]`;
      }

      if (params.interests && params.interests.length > 0) {
        queryParams.push(params.interests);
        whereClause += ` AND sg.interests && $${queryParams.length}::text[]`;
      }

      if (params.academicLevel) {
        queryParams.push(params.academicLevel);
        whereClause += ` AND sg.academic_level = $${queryParams.length}`;
      }

      if (params.status) {
        queryParams.push(params.status);
        whereClause += ` AND sg.status = $${queryParams.length}`;
      }

      queryParams.push(limit);
      queryParams.push(offset);

      const groups = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          sg.*,
          (SELECT COUNT(*) FROM study_group_members WHERE group_id = sg.id AND is_active = true) as member_count,
          EXISTS(SELECT 1 FROM study_group_members WHERE group_id = sg.id AND user_id = '${currentUserId}') as is_member,
          (SELECT role FROM study_group_members WHERE group_id = sg.id AND user_id = '${currentUserId}') as user_role
        FROM study_groups sg
        ${whereClause}
        ORDER BY sg.created_at DESC
        LIMIT $${queryParams.length - 1}
        OFFSET $${queryParams.length}
      `, ...queryParams);

      const totalResult = await prisma.$queryRawUnsafe<any[]>(`
        SELECT COUNT(*) as count
        FROM study_groups sg
        ${whereClause}
      `, ...queryParams.slice(0, -2));

      const total = parseInt(totalResult[0]?.count || '0');
      const hasMore = offset + limit < total;

      // Get members for each group
      const groupsWithMembers = await Promise.all(
        groups.map(async (group) => {
          const members = await this.getGroupMembers(group.id);
          return {
            ...this.formatStudyGroup(group),
            members,
            memberCount: parseInt(group.member_count),
            isMember: group.is_member,
            userRole: group.user_role
          };
        })
      );

      return { groups: groupsWithMembers, total, hasMore };
    } catch (error) {
      logger.error('Error getting study groups:', error);
      throw error;
    }
  }

  /**
   * Search study groups
   */
  async searchStudyGroups(
    currentUserId: string,
    params: SearchStudyGroupsRequest
  ): Promise<{ groups: StudyGroupWithMembers[]; total: number }> {
    try {
      const limit = params.limit || 20;
      const offset = params.offset || 0;

      let whereClause = `WHERE sg.status = 'ACTIVE' AND (
        sg.name ILIKE $1 OR
        sg.description ILIKE $1 OR
        EXISTS(SELECT 1 FROM unnest(sg.tags) t WHERE t ILIKE $1) OR
        EXISTS(SELECT 1 FROM unnest(sg.interests) i WHERE i ILIKE $1)
      )`;
      const queryParams: any[] = [`%${params.query}%`];

      if (params.courseId) {
        queryParams.push(params.courseId);
        whereClause += ` AND sg.course_id = $${queryParams.length}`;
      }

      if (params.tags && params.tags.length > 0) {
        queryParams.push(params.tags);
        whereClause += ` AND sg.tags && $${queryParams.length}::text[]`;
      }

      queryParams.push(limit);
      queryParams.push(offset);

      const groups = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          sg.*,
          (SELECT COUNT(*) FROM study_group_members WHERE group_id = sg.id AND is_active = true) as member_count,
          EXISTS(SELECT 1 FROM study_group_members WHERE group_id = sg.id AND user_id = '${currentUserId}') as is_member,
          (SELECT role FROM study_group_members WHERE group_id = sg.id AND user_id = '${currentUserId}') as user_role
        FROM study_groups sg
        ${whereClause}
        ORDER BY sg.created_at DESC
        LIMIT $${queryParams.length - 1}
        OFFSET $${queryParams.length}
      `, ...queryParams);

      const totalResult = await prisma.$queryRawUnsafe<any[]>(`
        SELECT COUNT(*) as count
        FROM study_groups sg
        ${whereClause}
      `, ...queryParams.slice(0, -2));

      const total = parseInt(totalResult[0]?.count || '0');

      // Get members for each group
      const groupsWithMembers = await Promise.all(
        groups.map(async (group) => {
          const members = await this.getGroupMembers(group.id);
          return {
            ...this.formatStudyGroup(group),
            members,
            memberCount: parseInt(group.member_count),
            isMember: group.is_member,
            userRole: group.user_role
          };
        })
      );

      return { groups: groupsWithMembers, total };
    } catch (error) {
      logger.error('Error searching study groups:', error);
      throw error;
    }
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupId: string): Promise<StudyGroupMemberWithUser[]> {
    try {
      const members = await prisma.$queryRaw<any[]>`
        SELECT 
          sgm.*,
          u.id as user_id,
          u.username as user_username,
          u.first_name as user_first_name,
          u.last_name as user_last_name,
          u.avatar_url as user_avatar_url,
          u.role as user_role
        FROM study_group_members sgm
        JOIN users u ON sgm.user_id = u.id
        WHERE sgm.group_id = ${groupId} AND sgm.is_active = true
        ORDER BY 
          CASE sgm.role
            WHEN 'OWNER' THEN 1
            WHEN 'MODERATOR' THEN 2
            WHEN 'MEMBER' THEN 3
          END,
          sgm.joined_at ASC
      `;

      return members.map(this.formatStudyGroupMemberWithUser);
    } catch (error) {
      logger.error('Error getting group members:', error);
      throw error;
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    userId: string,
    request: UpdateMemberRoleRequest
  ): Promise<StudyGroupMember> {
    try {
      // Check if user is owner
      const requester = await prisma.$queryRaw<any[]>`
        SELECT role FROM study_group_members
        WHERE group_id = ${request.groupId} AND user_id = ${userId}
      `;

      if (!requester || requester.length === 0 || requester[0].role !== 'OWNER') {
        throw new Error('Only group owner can update member roles');
      }

      // Update member role
      await prisma.$executeRaw`
        UPDATE study_group_members
        SET role = ${request.role}
        WHERE group_id = ${request.groupId} AND user_id = ${request.userId}
      `;

      const updatedMember = await prisma.$queryRaw<any[]>`
        SELECT * FROM study_group_members
        WHERE group_id = ${request.groupId} AND user_id = ${request.userId}
      `;

      logger.info(`Member role updated in group ${request.groupId}: ${request.userId} to ${request.role}`);

      return this.formatStudyGroupMember(updatedMember[0]);
    } catch (error) {
      logger.error('Error updating member role:', error);
      throw error;
    }
  }

  /**
   * Remove member from group
   */
  async removeMember(
    userId: string,
    request: RemoveMemberRequest
  ): Promise<void> {
    try {
      // Check if user is owner or moderator
      const requester = await prisma.$queryRaw<any[]>`
        SELECT role FROM study_group_members
        WHERE group_id = ${request.groupId} AND user_id = ${userId}
      `;

      if (!requester || requester.length === 0) {
        throw new Error('User is not a member of this group');
      }

      if (requester[0].role !== 'OWNER' && requester[0].role !== 'MODERATOR') {
        throw new Error('Only group owner or moderator can remove members');
      }

      // Cannot remove owner
      const targetMember = await prisma.$queryRaw<any[]>`
        SELECT role FROM study_group_members
        WHERE group_id = ${request.groupId} AND user_id = ${request.userId}
      `;

      if (targetMember && targetMember.length > 0 && targetMember[0].role === 'OWNER') {
        throw new Error('Cannot remove group owner');
      }

      // Remove member
      await prisma.$executeRaw`
        DELETE FROM study_group_members
        WHERE group_id = ${request.groupId} AND user_id = ${request.userId}
      `;

      logger.info(`Member removed from group ${request.groupId}: ${request.userId}`);
    } catch (error) {
      logger.error('Error removing member:', error);
      throw error;
    }
  }

  /**
   * Get user's study groups
   */
  async getUserStudyGroups(userId: string): Promise<StudyGroupWithMembers[]> {
    try {
      const groups = await prisma.$queryRaw<any[]>`
        SELECT 
          sg.*,
          (SELECT COUNT(*) FROM study_group_members WHERE group_id = sg.id AND is_active = true) as member_count,
          true as is_member,
          sgm.role as user_role
        FROM study_groups sg
        JOIN study_group_members sgm ON sg.id = sgm.group_id
        WHERE sgm.user_id = ${userId} AND sgm.is_active = true
        ORDER BY sgm.last_active_at DESC NULLS LAST, sgm.joined_at DESC
      `;

      // Get members for each group
      const groupsWithMembers = await Promise.all(
        groups.map(async (group) => {
          const members = await this.getGroupMembers(group.id);
          return {
            ...this.formatStudyGroup(group),
            members,
            memberCount: parseInt(group.member_count),
            isMember: true,
            userRole: group.user_role
          };
        })
      );

      return groupsWithMembers;
    } catch (error) {
      logger.error('Error getting user study groups:', error);
      throw error;
    }
  }

  /**
   * Format study group
   */
  private formatStudyGroup(row: any): StudyGroup {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      courseId: row.course_id,
      creatorId: row.creator_id,
      isPrivate: row.is_private,
      maxMembers: row.max_members,
      meetingSchedule: row.meeting_schedule,
      tags: row.tags || [],
      interests: row.interests || [],
      academicLevel: row.academic_level,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Format study group member
   */
  private formatStudyGroupMember(row: any): StudyGroupMember {
    return {
      id: row.id,
      groupId: row.group_id,
      userId: row.user_id,
      role: row.role,
      joinedAt: row.joined_at,
      lastActiveAt: row.last_active_at,
      contributionScore: row.contribution_score,
      isActive: row.is_active
    };
  }

  /**
   * Format study group member with user
   */
  private formatStudyGroupMemberWithUser(row: any): StudyGroupMemberWithUser {
    return {
      id: row.id,
      groupId: row.group_id,
      userId: row.user_id,
      role: row.role,
      joinedAt: row.joined_at,
      lastActiveAt: row.last_active_at,
      contributionScore: row.contribution_score,
      isActive: row.is_active,
      user: {
        id: row.user_id,
        username: row.user_username,
        firstName: row.user_first_name,
        lastName: row.user_last_name,
        avatarUrl: row.user_avatar_url,
        role: row.user_role
      }
    };
  }
}

export default new StudyGroupService();
