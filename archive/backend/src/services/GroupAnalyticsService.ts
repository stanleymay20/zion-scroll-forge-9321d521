/**
 * Group Analytics and Recommendation Service
 * Provides analytics and recommendations for study groups
 * "Plans fail for lack of counsel, but with many advisers they succeed" - Proverbs 15:22
 */

import { PrismaClient } from '@prisma/client';
import {
  GroupAnalytics,
  GroupRecommendation,
  GetGroupAnalyticsRequest,
  GetGroupRecommendationsRequest
} from '../types/study-group.types';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class GroupAnalyticsService {
  /**
   * Get group analytics
   */
  async getGroupAnalytics(
    request: GetGroupAnalyticsRequest
  ): Promise<GroupAnalytics> {
    try {
      const { groupId, startDate, endDate } = request;

      // Get basic stats
      const stats = await prisma.$queryRaw<any[]>`
        SELECT 
          (SELECT COUNT(*) FROM study_group_members WHERE group_id = ${groupId} AND is_active = true) as total_members,
          (SELECT COUNT(*) FROM study_group_members WHERE group_id = ${groupId} AND is_active = true AND last_active_at > CURRENT_TIMESTAMP - INTERVAL '7 days') as active_members,
          (SELECT COUNT(*) FROM chat_messages cm JOIN chat_rooms cr ON cm.room_id = cr.id WHERE cr.type = 'STUDY_GROUP' AND cr.name LIKE '%' || ${groupId} || '%') as total_messages,
          (SELECT COUNT(*) FROM collaborative_documents WHERE group_id = ${groupId}) as total_documents,
          (SELECT COUNT(*) FROM group_assignments WHERE group_id = ${groupId}) as total_assignments,
          (SELECT COUNT(*) FROM group_assignments WHERE group_id = ${groupId} AND status = 'COMPLETED') as completed_assignments
      `;

      const basicStats = stats[0];

      // Get top contributors
      const topContributors = await prisma.$queryRaw<any[]>`
        SELECT user_id, contribution_score
        FROM study_group_members
        WHERE group_id = ${groupId} AND is_active = true
        ORDER BY contribution_score DESC
        LIMIT 5
      `;

      // Get activity by day of week
      const activityByDay = await prisma.$queryRaw<any[]>`
        SELECT 
          TO_CHAR(created_at, 'Day') as day,
          COUNT(*) as count
        FROM (
          SELECT created_at FROM group_assignments WHERE group_id = ${groupId}
          UNION ALL
          SELECT created_at FROM collaborative_documents WHERE group_id = ${groupId}
          UNION ALL
          SELECT created_at FROM group_events WHERE group_id = ${groupId}
        ) as activities
        GROUP BY TO_CHAR(created_at, 'Day')
        ORDER BY 
          CASE TO_CHAR(created_at, 'Day')
            WHEN 'Sunday   ' THEN 1
            WHEN 'Monday   ' THEN 2
            WHEN 'Tuesday  ' THEN 3
            WHEN 'Wednesday' THEN 4
            WHEN 'Thursday ' THEN 5
            WHEN 'Friday   ' THEN 6
            WHEN 'Saturday ' THEN 7
          END
      `;

      const activityMap: { [day: string]: number } = {};
      activityByDay.forEach(row => {
        activityMap[row.day.trim()] = parseInt(row.count);
      });

      // Get engagement trend (last 30 days)
      const engagementTrend = await prisma.$queryRaw<any[]>`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as score
        FROM (
          SELECT created_at FROM group_assignments WHERE group_id = ${groupId} AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
          UNION ALL
          SELECT created_at FROM collaborative_documents WHERE group_id = ${groupId} AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
          UNION ALL
          SELECT created_at FROM group_events WHERE group_id = ${groupId} AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
        ) as activities
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
      `;

      // Calculate average participation
      const totalMembers = parseInt(basicStats.total_members);
      const activeMembers = parseInt(basicStats.active_members);
      const averageParticipation = totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0;

      // Calculate average response time (simplified)
      const averageResponseTime = 24; // hours - in production, calculate from actual message timestamps

      const analytics: GroupAnalytics = {
        groupId,
        totalMembers,
        activeMembers,
        totalMessages: parseInt(basicStats.total_messages),
        totalDocuments: parseInt(basicStats.total_documents),
        totalAssignments: parseInt(basicStats.total_assignments),
        completedAssignments: parseInt(basicStats.completed_assignments),
        averageParticipation,
        averageResponseTime,
        topContributors: topContributors.map(c => ({
          userId: c.user_id,
          contributionScore: c.contribution_score
        })),
        activityByDay: activityMap,
        engagementTrend: engagementTrend.map(e => ({
          date: e.date.toISOString().split('T')[0],
          score: parseInt(e.score)
        }))
      };

      return analytics;
    } catch (error) {
      logger.error('Error getting group analytics:', error);
      throw error;
    }
  }

  /**
   * Get group recommendations for a user
   */
  async getGroupRecommendations(
    request: GetGroupRecommendationsRequest
  ): Promise<GroupRecommendation[]> {
    try {
      const { userId, limit = 10 } = request;

      // Get user's courses
      const userCourses = await prisma.$queryRaw<any[]>`
        SELECT DISTINCT course_id
        FROM enrollments
        WHERE user_id = ${userId} AND progress > 0
      `;

      const courseIds = userCourses.map(c => c.course_id).filter(id => id);

      // Get user's interests from their profile and existing groups
      const userInterests = await prisma.$queryRaw<any[]>`
        SELECT DISTINCT unnest(interests) as interest
        FROM study_groups sg
        JOIN study_group_members sgm ON sg.id = sgm.group_id
        WHERE sgm.user_id = ${userId}
      `;

      const interests = userInterests.map(i => i.interest);

      // Get user's current groups
      const currentGroups = await prisma.$queryRaw<any[]>`
        SELECT group_id FROM study_group_members WHERE user_id = ${userId}
      `;

      const currentGroupIds = currentGroups.map(g => g.group_id);

      // Find recommended groups
      const recommendations: GroupRecommendation[] = [];

      // 1. Groups in same courses
      if (courseIds.length > 0) {
        const courseGroups = await prisma.$queryRaw<any[]>`
          SELECT 
            sg.*,
            (SELECT COUNT(*) FROM study_group_members WHERE group_id = sg.id AND is_active = true) as member_count
          FROM study_groups sg
          WHERE sg.course_id = ANY(${courseIds}::text[])
            AND sg.id != ALL(${currentGroupIds.length > 0 ? currentGroupIds : ['none']}::text[])
            AND sg.status = 'ACTIVE'
            AND (SELECT COUNT(*) FROM study_group_members WHERE group_id = sg.id AND is_active = true) < sg.max_members
          ORDER BY sg.created_at DESC
          LIMIT ${limit}
        `;

        for (const group of courseGroups) {
          const matchingCourses = courseIds.filter(id => id === group.course_id);
          const score = 90 + (parseInt(group.member_count) * 0.5); // Higher score for course matches

          recommendations.push({
            groupId: group.id,
            score,
            reasons: ['Enrolled in the same course', `${group.member_count} active members`],
            matchingCourses,
            matchingInterests: [],
            memberOverlap: 0
          });
        }
      }

      // 2. Groups with similar interests
      if (interests.length > 0) {
        const interestGroups = await prisma.$queryRaw<any[]>`
          SELECT 
            sg.*,
            (SELECT COUNT(*) FROM study_group_members WHERE group_id = sg.id AND is_active = true) as member_count,
            (SELECT COUNT(*) FROM unnest(sg.interests) i WHERE i = ANY(${interests}::text[])) as matching_interests_count
          FROM study_groups sg
          WHERE sg.interests && ${interests}::text[]
            AND sg.id != ALL(${currentGroupIds.length > 0 ? currentGroupIds : ['none']}::text[])
            AND sg.status = 'ACTIVE'
            AND (SELECT COUNT(*) FROM study_group_members WHERE group_id = sg.id AND is_active = true) < sg.max_members
          ORDER BY matching_interests_count DESC, sg.created_at DESC
          LIMIT ${limit}
        `;

        for (const group of interestGroups) {
          const matchingInterests = interests.filter(i => group.interests && group.interests.includes(i));
          const score = 70 + (matchingInterests.length * 5);

          // Check if already recommended
          const existing = recommendations.find(r => r.groupId === group.id);
          if (existing) {
            existing.score += 10;
            existing.matchingInterests = matchingInterests;
            existing.reasons.push(`${matchingInterests.length} shared interests`);
          } else {
            recommendations.push({
              groupId: group.id,
              score,
              reasons: [`${matchingInterests.length} shared interests`, `${group.member_count} active members`],
              matchingCourses: [],
              matchingInterests,
              memberOverlap: 0
            });
          }
        }
      }

      // 3. Popular groups (if not enough recommendations)
      if (recommendations.length < limit) {
        const popularGroups = await prisma.$queryRaw<any[]>`
          SELECT 
            sg.*,
            (SELECT COUNT(*) FROM study_group_members WHERE group_id = sg.id AND is_active = true) as member_count
          FROM study_groups sg
          WHERE sg.id != ALL(${currentGroupIds.length > 0 ? currentGroupIds : ['none']}::text[])
            AND sg.status = 'ACTIVE'
            AND sg.is_private = false
            AND (SELECT COUNT(*) FROM study_group_members WHERE group_id = sg.id AND is_active = true) < sg.max_members
          ORDER BY member_count DESC, sg.created_at DESC
          LIMIT ${limit - recommendations.length}
        `;

        for (const group of popularGroups) {
          const existing = recommendations.find(r => r.groupId === group.id);
          if (!existing) {
            recommendations.push({
              groupId: group.id,
              score: 50 + (parseInt(group.member_count) * 0.5),
              reasons: ['Popular group', `${group.member_count} active members`],
              matchingCourses: [],
              matchingInterests: [],
              memberOverlap: 0
            });
          }
        }
      }

      // Sort by score and limit
      recommendations.sort((a, b) => b.score - a.score);
      return recommendations.slice(0, limit);
    } catch (error) {
      logger.error('Error getting group recommendations:', error);
      throw error;
    }
  }

  /**
   * Update member activity
   */
  async updateMemberActivity(userId: string, groupId: string): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE study_group_members
        SET last_active_at = CURRENT_TIMESTAMP
        WHERE user_id = ${userId} AND group_id = ${groupId}
      `;
    } catch (error) {
      logger.error('Error updating member activity:', error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Calculate group health score
   */
  async calculateGroupHealthScore(groupId: string): Promise<number> {
    try {
      const analytics = await this.getGroupAnalytics({ groupId });

      // Calculate health score based on multiple factors
      let score = 0;

      // Active participation (40 points)
      score += (analytics.averageParticipation / 100) * 40;

      // Assignment completion rate (30 points)
      const completionRate = analytics.totalAssignments > 0
        ? (analytics.completedAssignments / analytics.totalAssignments) * 100
        : 0;
      score += (completionRate / 100) * 30;

      // Activity level (20 points)
      const activityScore = Math.min(
        (analytics.totalMessages + analytics.totalDocuments + analytics.totalAssignments) / 10,
        20
      );
      score += activityScore;

      // Member engagement (10 points)
      const engagementScore = analytics.activeMembers > 0 ? 10 : 0;
      score += engagementScore;

      return Math.round(score);
    } catch (error) {
      logger.error('Error calculating group health score:', error);
      return 0;
    }
  }
}

export default new GroupAnalyticsService();
