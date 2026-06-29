/**
 * Group Event and Calendar Service
 * Handles group events, scheduling, and attendance tracking
 * "There is a time for everything, and a season for every activity under the heavens" - Ecclesiastes 3:1
 */

import { PrismaClient } from '@prisma/client';
import {
  GroupEvent,
  EventAttendance,
  CreateGroupEventRequest,
  UpdateEventAttendanceRequest,
  EventType,
  AttendanceStatus,
  VideoConferenceSession,
  StartVideoConferenceRequest,
  VideoProvider,
  VideoParticipant
} from '../types/study-group.types';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class GroupEventService {
  /**
   * Create a group event
   */
  async createEvent(
    userId: string,
    request: CreateGroupEventRequest
  ): Promise<GroupEvent> {
    try {
      // Check if user is member of the group
      const member = await prisma.$queryRaw<any[]>`
        SELECT * FROM study_group_members
        WHERE group_id = ${request.groupId} AND user_id = ${userId}
      `;

      if (!member || member.length === 0) {
        throw new Error('User is not a member of this group');
      }

      // Validate dates
      if (request.endTime <= request.startTime) {
        throw new Error('End time must be after start time');
      }

      // Create event
      const event = await prisma.$queryRaw<any[]>`
        INSERT INTO group_events (
          group_id, title, description, event_type, start_time, end_time,
          location, video_conference_url, is_recurring, recurrence_rule, created_by
        ) VALUES (
          ${request.groupId},
          ${request.title},
          ${request.description || null},
          ${request.eventType},
          ${request.startTime},
          ${request.endTime},
          ${request.location || null},
          ${request.videoConferenceUrl || null},
          ${request.isRecurring || false},
          ${request.recurrenceRule || null},
          ${userId}
        )
        RETURNING *
      `;

      logger.info(`Group event created: ${event[0].id} in group ${request.groupId}`);

      return this.formatEvent(event[0]);
    } catch (error) {
      logger.error('Error creating group event:', error);
      throw error;
    }
  }

  /**
   * Update event attendance
   */
  async updateAttendance(
    userId: string,
    request: UpdateEventAttendanceRequest
  ): Promise<EventAttendance> {
    try {
      // Get event
      const event = await prisma.$queryRaw<any[]>`
        SELECT * FROM group_events WHERE id = ${request.eventId}
      `;

      if (!event || event.length === 0) {
        throw new Error('Event not found');
      }

      // Check if user is member of the group
      const member = await prisma.$queryRaw<any[]>`
        SELECT * FROM study_group_members
        WHERE group_id = ${event[0].group_id} AND user_id = ${userId}
      `;

      if (!member || member.length === 0) {
        throw new Error('User is not a member of this group');
      }

      // Check if attendance record exists
      const existing = await prisma.$queryRaw<any[]>`
        SELECT * FROM event_attendance
        WHERE event_id = ${request.eventId} AND user_id = ${userId}
      `;

      let attendance: any[];

      if (existing && existing.length > 0) {
        // Update existing attendance
        attendance = await prisma.$queryRaw<any[]>`
          UPDATE event_attendance
          SET status = ${request.status}
          WHERE id = ${existing[0].id}
          RETURNING *
        `;
      } else {
        // Create new attendance record
        attendance = await prisma.$queryRaw<any[]>`
          INSERT INTO event_attendance (event_id, user_id, status)
          VALUES (${request.eventId}, ${userId}, ${request.status})
          RETURNING *
        `;
      }

      logger.info(`Event attendance updated: ${request.eventId} by user ${userId} to ${request.status}`);

      return this.formatAttendance(attendance[0]);
    } catch (error) {
      logger.error('Error updating event attendance:', error);
      throw error;
    }
  }

  /**
   * Get group events
   */
  async getGroupEvents(
    groupId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<GroupEvent[]> {
    try {
      let whereClause = `WHERE group_id = $1`;
      const params: any[] = [groupId];

      if (startDate) {
        params.push(startDate);
        whereClause += ` AND start_time >= $${params.length}`;
      }

      if (endDate) {
        params.push(endDate);
        whereClause += ` AND end_time <= $${params.length}`;
      }

      const events = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM group_events
        ${whereClause}
        ORDER BY start_time ASC
      `, ...params);

      return events.map(this.formatEvent);
    } catch (error) {
      logger.error('Error getting group events:', error);
      throw error;
    }
  }

  /**
   * Get event attendance
   */
  async getEventAttendance(eventId: string): Promise<EventAttendance[]> {
    try {
      const attendance = await prisma.$queryRaw<any[]>`
        SELECT * FROM event_attendance
        WHERE event_id = ${eventId}
        ORDER BY 
          CASE status
            WHEN 'ATTENDING' THEN 1
            WHEN 'MAYBE' THEN 2
            WHEN 'NOT_ATTENDING' THEN 3
            WHEN 'ATTENDED' THEN 4
            WHEN 'MISSED' THEN 5
          END
      `;

      return attendance.map(this.formatAttendance);
    } catch (error) {
      logger.error('Error getting event attendance:', error);
      throw error;
    }
  }

  /**
   * Mark event as attended
   */
  async markAttended(
    userId: string,
    eventId: string,
    joinedAt: Date,
    leftAt: Date
  ): Promise<EventAttendance> {
    try {
      const duration = Math.floor((leftAt.getTime() - joinedAt.getTime()) / (1000 * 60));

      const attendance = await prisma.$queryRaw<any[]>`
        UPDATE event_attendance
        SET 
          status = 'ATTENDED',
          joined_at = ${joinedAt},
          left_at = ${leftAt},
          duration = ${duration}
        WHERE event_id = ${eventId} AND user_id = ${userId}
        RETURNING *
      `;

      if (!attendance || attendance.length === 0) {
        // Create new attendance record
        const newAttendance = await prisma.$queryRaw<any[]>`
          INSERT INTO event_attendance (event_id, user_id, status, joined_at, left_at, duration)
          VALUES (${eventId}, ${userId}, 'ATTENDED', ${joinedAt}, ${leftAt}, ${duration})
          RETURNING *
        `;
        return this.formatAttendance(newAttendance[0]);
      }

      return this.formatAttendance(attendance[0]);
    } catch (error) {
      logger.error('Error marking event as attended:', error);
      throw error;
    }
  }

  /**
   * Delete event
   */
  async deleteEvent(userId: string, eventId: string): Promise<void> {
    try {
      // Get event
      const event = await prisma.$queryRaw<any[]>`
        SELECT * FROM group_events WHERE id = ${eventId}
      `;

      if (!event || event.length === 0) {
        throw new Error('Event not found');
      }

      // Check if user is creator or group owner
      const member = await prisma.$queryRaw<any[]>`
        SELECT role FROM study_group_members
        WHERE group_id = ${event[0].group_id} AND user_id = ${userId}
      `;

      if (!member || member.length === 0) {
        throw new Error('User is not a member of this group');
      }

      const isCreator = event[0].created_by === userId;
      const isOwner = member[0].role === 'OWNER';

      if (!isCreator && !isOwner) {
        throw new Error('Only event creator or group owner can delete the event');
      }

      // Delete event
      await prisma.$executeRaw`
        DELETE FROM group_events WHERE id = ${eventId}
      `;

      logger.info(`Event deleted: ${eventId} by user ${userId}`);
    } catch (error) {
      logger.error('Error deleting event:', error);
      throw error;
    }
  }

  /**
   * Start video conference
   */
  async startVideoConference(
    userId: string,
    request: StartVideoConferenceRequest
  ): Promise<{ session: VideoConferenceSession; joinUrl: string }> {
    try {
      // Check if user is member of the group
      const member = await prisma.$queryRaw<any[]>`
        SELECT * FROM study_group_members
        WHERE group_id = ${request.groupId} AND user_id = ${userId}
      `;

      if (!member || member.length === 0) {
        throw new Error('User is not a member of this group');
      }

      const provider = request.provider || VideoProvider.JITSI;
      const roomId = crypto.randomUUID();
      const roomUrl = this.generateVideoConferenceUrl(provider, roomId);

      // Create video conference session
      const session = await prisma.$queryRaw<any[]>`
        INSERT INTO video_conference_sessions (
          group_id, event_id, provider, room_id, room_url, host_id
        ) VALUES (
          ${request.groupId},
          ${request.eventId || null},
          ${provider},
          ${roomId},
          ${roomUrl},
          ${userId}
        )
        RETURNING *
      `;

      logger.info(`Video conference started: ${session[0].id} in group ${request.groupId}`);

      return {
        session: this.formatVideoSession(session[0]),
        joinUrl: roomUrl
      };
    } catch (error) {
      logger.error('Error starting video conference:', error);
      throw error;
    }
  }

  /**
   * End video conference
   */
  async endVideoConference(
    userId: string,
    sessionId: string
  ): Promise<VideoConferenceSession> {
    try {
      // Get session
      const session = await prisma.$queryRaw<any[]>`
        SELECT * FROM video_conference_sessions WHERE id = ${sessionId}
      `;

      if (!session || session.length === 0) {
        throw new Error('Video conference session not found');
      }

      // Check if user is host or group owner
      const member = await prisma.$queryRaw<any[]>`
        SELECT role FROM study_group_members
        WHERE group_id = ${session[0].group_id} AND user_id = ${userId}
      `;

      if (!member || member.length === 0) {
        throw new Error('User is not a member of this group');
      }

      const isHost = session[0].host_id === userId;
      const isOwner = member[0].role === 'OWNER';

      if (!isHost && !isOwner) {
        throw new Error('Only session host or group owner can end the conference');
      }

      // Calculate duration
      const startTime = new Date(session[0].started_at);
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      // End session
      const ended = await prisma.$queryRaw<any[]>`
        UPDATE video_conference_sessions
        SET 
          ended_at = CURRENT_TIMESTAMP,
          duration = ${duration}
        WHERE id = ${sessionId}
        RETURNING *
      `;

      logger.info(`Video conference ended: ${sessionId} by user ${userId}`);

      return this.formatVideoSession(ended[0]);
    } catch (error) {
      logger.error('Error ending video conference:', error);
      throw error;
    }
  }

  /**
   * Generate video conference URL
   */
  private generateVideoConferenceUrl(provider: VideoProvider, roomId: string): string {
    switch (provider) {
      case VideoProvider.JITSI:
        return `https://meet.jit.si/scrolluniversity-${roomId}`;
      case VideoProvider.ZOOM:
        // In production, integrate with Zoom API
        return `https://zoom.us/j/${roomId}`;
      case VideoProvider.GOOGLE_MEET:
        // In production, integrate with Google Meet API
        return `https://meet.google.com/${roomId}`;
      case VideoProvider.MICROSOFT_TEAMS:
        // In production, integrate with Microsoft Teams API
        return `https://teams.microsoft.com/l/meetup-join/${roomId}`;
      default:
        return `https://meet.jit.si/scrolluniversity-${roomId}`;
    }
  }

  /**
   * Format event
   */
  private formatEvent(row: any): GroupEvent {
    return {
      id: row.id,
      groupId: row.group_id,
      title: row.title,
      description: row.description,
      eventType: row.event_type,
      startTime: row.start_time,
      endTime: row.end_time,
      location: row.location,
      videoConferenceUrl: row.video_conference_url,
      isRecurring: row.is_recurring,
      recurrenceRule: row.recurrence_rule,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Format attendance
   */
  private formatAttendance(row: any): EventAttendance {
    return {
      id: row.id,
      eventId: row.event_id,
      userId: row.user_id,
      status: row.status,
      joinedAt: row.joined_at,
      leftAt: row.left_at,
      duration: row.duration
    };
  }

  /**
   * Format video session
   */
  private formatVideoSession(row: any): VideoConferenceSession {
    return {
      id: row.id,
      groupId: row.group_id,
      eventId: row.event_id,
      provider: row.provider,
      roomId: row.room_id,
      roomUrl: row.room_url,
      hostId: row.host_id,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      participants: row.participants || [],
      recordingUrl: row.recording_url,
      duration: row.duration
    };
  }
}

export default new GroupEventService();
