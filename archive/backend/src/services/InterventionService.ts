/**
 * Intervention Service
 * "Bear one another's burdens, and so fulfill the law of Christ" - Galatians 6:2
 * 
 * Detects when students struggle and automatically triggers support interventions
 */

import { PrismaClient } from '@prisma/client';
import {
  InterventionTrigger,
  InterventionType,
  InterventionAction,
  ActionType,
  ExecutionDetails,
  LearningProfile
} from '../types/personalization.types';
import { AIGatewayService } from './AIGatewayService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface StruggleIndicator {
  type: InterventionType;
  severity: number;
  evidence: string[];
  detectedAt: Date;
}

export default class InterventionService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Detect struggles and trigger interventions
   */
  async detectAndIntervene(studentId: string, courseId?: string): Promise<InterventionTrigger[]> {
    try {
      logger.info('Detecting student struggles', { studentId, courseId });

      // Detect struggle indicators
      const indicators = await this.detectStruggleIndicators(studentId, courseId);

      // Generate intervention triggers
      const triggers: InterventionTrigger[] = [];

      for (const indicator of indicators) {
        const trigger = await this.createInterventionTrigger(
          studentId,
          indicator
        );

        triggers.push(trigger);

        // Auto-execute if appropriate
        if (trigger.autoExecute) {
          await this.executeIntervention(trigger);
        }
      }

      logger.info('Interventions triggered', {
        studentId,
        count: triggers.length,
        autoExecuted: triggers.filter(t => t.autoExecute).length
      });

      return triggers;
    } catch (error) {
      logger.error('Error detecting struggles', { error, studentId });
      return [];
    }
  }

  /**
   * Schedule tutoring session
   */
  async scheduleTutoring(
    studentId: string,
    topic: string,
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<ExecutionDetails> {
    try {
      logger.info('Scheduling tutoring session', { studentId, topic, urgency });

      // Find available tutors
      const tutors = await this.findAvailableTutors(topic);

      if (tutors.length === 0) {
        return {
          status: 'pending',
          notes: 'No tutors currently available. Added to waiting list.'
        };
      }

      // Create tutoring session
      const session = await prisma.tutoringSession.create({
        data: {
          studentId,
          tutorId: tutors[0].id,
          topic,
          urgency,
          status: 'SCHEDULED',
          scheduledFor: this.getNextAvailableSlot()
        }
      });

      // Send notification
      await this.sendTutoringNotification(studentId, session);

      return {
        scheduledFor: session.scheduledFor,
        assignedTo: tutors[0].id,
        status: 'scheduled',
        notes: `Tutoring session scheduled with ${tutors[0].name}`
      };
    } catch (error) {
      logger.error('Error scheduling tutoring', { error, studentId, topic });
      return {
        status: 'pending',
        notes: 'Failed to schedule tutoring session'
      };
    }
  }

  /**
   * Provide supplementary materials
   */
  async provideSupplementaryMaterials(
    studentId: string,
    topic: string,
    weaknessArea: string
  ): Promise<ExecutionDetails> {
    try {
      logger.info('Providing supplementary materials', { studentId, topic });

      // Find relevant materials
      const materials = await this.findSupplementaryMaterials(topic, weaknessArea);

      if (materials.length === 0) {
        return {
          status: 'pending',
          notes: 'No supplementary materials found'
        };
      }

      // Create material assignments
      for (const material of materials) {
        await prisma.supplementaryMaterial.create({
          data: {
            studentId,
            materialId: material.id,
            assignedAt: new Date(),
            status: 'ASSIGNED'
          }
        });
      }

      // Send notification
      await this.sendMaterialsNotification(studentId, materials);

      return {
        status: 'completed',
        notes: `Provided ${materials.length} supplementary materials`
      };
    } catch (error) {
      logger.error('Error providing materials', { error, studentId, topic });
      return {
        status: 'pending',
        notes: 'Failed to provide supplementary materials'
      };
    }
  }

  /**
   * Form study group
   */
  async formStudyGroup(
    studentId: string,
    courseId: string,
    topic: string
  ): Promise<ExecutionDetails> {
    try {
      logger.info('Forming study group', { studentId, courseId, topic });

      // Find compatible students
      const compatibleStudents = await this.findCompatibleStudents(
        studentId,
        courseId,
        topic
      );

      if (compatibleStudents.length < 2) {
        return {
          status: 'pending',
          notes: 'Not enough compatible students found. Added to matching queue.'
        };
      }

      // Create study group
      const group = await prisma.studyGroup.create({
        data: {
          courseId,
          topic,
          createdBy: studentId,
          status: 'ACTIVE',
          members: {
            create: [
              { studentId, role: 'LEADER' },
              ...compatibleStudents.slice(0, 4).map(s => ({
                studentId: s.id,
                role: 'MEMBER'
              }))
            ]
          }
        },
        include: {
          members: true
        }
      });

      // Send notifications to all members
      await this.sendStudyGroupNotifications(group);

      return {
        status: 'completed',
        notes: `Study group formed with ${group.members.length} members`
      };
    } catch (error) {
      logger.error('Error forming study group', { error, studentId, courseId });
      return {
        status: 'pending',
        notes: 'Failed to form study group'
      };
    }
  }

  /**
   * Notify advisor
   */
  async notifyAdvisor(
    studentId: string,
    concern: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<ExecutionDetails> {
    try {
      logger.info('Notifying advisor', { studentId, concern, severity });

      // Get student's advisor
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        include: { advisor: true }
      });

      if (!student?.advisor) {
        return {
          status: 'pending',
          notes: 'No advisor assigned to student'
        };
      }

      // Create advisor notification
      await prisma.advisorNotification.create({
        data: {
          advisorId: student.advisor.id,
          studentId,
          concern,
          severity,
          status: 'PENDING',
          createdAt: new Date()
        }
      });

      // Send urgent notification if critical
      if (severity === 'critical') {
        await this.sendUrgentAdvisorAlert(student.advisor, studentId, concern);
      }

      return {
        assignedTo: student.advisor.id,
        status: 'completed',
        notes: `Advisor ${student.advisor.name} notified`
      };
    } catch (error) {
      logger.error('Error notifying advisor', { error, studentId });
      return {
        status: 'pending',
        notes: 'Failed to notify advisor'
      };
    }
  }

  /**
   * Execute intervention
   */
  private async executeIntervention(trigger: InterventionTrigger): Promise<void> {
    logger.info('Executing intervention', {
      studentId: trigger.studentId,
      type: trigger.triggerType
    });

    for (const action of trigger.recommendedActions) {
      if (!action.autoExecutable) continue;

      try {
        let executionDetails: ExecutionDetails;

        switch (action.actionType) {
          case 'schedule_tutoring':
            executionDetails = await this.scheduleTutoring(
              trigger.studentId,
              trigger.indicators[0] || 'General Support',
              trigger.severity
            );
            break;

          case 'provide_supplementary_materials':
            executionDetails = await this.provideSupplementaryMaterials(
              trigger.studentId,
              trigger.indicators[0] || 'General',
              trigger.indicators[0] || 'General'
            );
            break;

          case 'advisor_notification':
            executionDetails = await this.notifyAdvisor(
              trigger.studentId,
              trigger.indicators.join(', '),
              trigger.severity
            );
            break;

          default:
            continue;
        }

        // Update action with execution details
        action.executionDetails = executionDetails;

        // Log intervention
        await this.logIntervention(trigger, action, executionDetails);
      } catch (error) {
        logger.error('Error executing intervention action', {
          error,
          action: action.actionType
        });
      }
    }
  }

  /**
   * Detect struggle indicators
   */
  private async detectStruggleIndicators(
    studentId: string,
    courseId?: string
  ): Promise<StruggleIndicator[]> {
    const indicators: StruggleIndicator[] = [];

    // Get recent performance data
    const recentSubmissions = await this.getRecentSubmissions(studentId, courseId);
    const recentScores = recentSubmissions
      .filter(s => s.score !== null)
      .map(s => s.score as number);

    // Check for assignment failures
    const failedAssignments = recentScores.filter(s => s < 60).length;
    if (failedAssignments >= 2) {
      indicators.push({
        type: 'assignment_failure',
        severity: failedAssignments >= 3 ? 80 : 60,
        evidence: [
          `${failedAssignments} failed assignments in recent period`,
          `Average score: ${(recentScores.reduce((a, b) => a + b, 0) / recentScores.length).toFixed(1)}%`
        ],
        detectedAt: new Date()
      });
    }

    // Check for declining performance
    if (recentScores.length >= 4) {
      const firstHalf = recentScores.slice(0, Math.floor(recentScores.length / 2));
      const secondHalf = recentScores.slice(Math.floor(recentScores.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      if (firstAvg - secondAvg > 15) {
        indicators.push({
          type: 'struggling_with_concept',
          severity: 70,
          evidence: [
            `Performance declining: ${firstAvg.toFixed(1)}% → ${secondAvg.toFixed(1)}%`,
            'Consistent downward trend'
          ],
          detectedAt: new Date()
        });
      }
    }

    // Check for low engagement
    const engagementData = await this.getEngagementData(studentId, courseId);
    if (engagementData.score < 40) {
      indicators.push({
        type: 'low_engagement',
        severity: 100 - engagementData.score,
        evidence: engagementData.indicators,
        detectedAt: new Date()
      });
    }

    // Check for attendance issues
    const attendanceRate = await this.getAttendanceRate(studentId, courseId);
    if (attendanceRate < 70) {
      indicators.push({
        type: 'attendance_drop',
        severity: 100 - attendanceRate,
        evidence: [
          `Attendance rate: ${attendanceRate.toFixed(1)}%`,
          'Missing multiple sessions'
        ],
        detectedAt: new Date()
      });
    }

    // Check for academic probation risk
    const gpa = await this.calculateGPA(studentId);
    if (gpa < 2.0) {
      indicators.push({
        type: 'academic_probation_risk',
        severity: 90,
        evidence: [
          `Current GPA: ${gpa.toFixed(2)}`,
          'Below minimum requirement of 2.0'
        ],
        detectedAt: new Date()
      });
    }

    return indicators;
  }

  /**
   * Create intervention trigger
   */
  private async createInterventionTrigger(
    studentId: string,
    indicator: StruggleIndicator
  ): Promise<InterventionTrigger> {
    // Generate recommended actions
    const actions = await this.generateInterventionActions(indicator);

    // Determine if auto-execute
    const autoExecute = this.shouldAutoExecute(indicator);

    return {
      studentId,
      triggerType: indicator.type,
      severity: this.mapSeverity(indicator.severity),
      detectedAt: indicator.detectedAt,
      indicators: indicator.evidence,
      recommendedActions: actions,
      autoExecute
    };
  }

  /**
   * Generate intervention actions
   */
  private async generateInterventionActions(
    indicator: StruggleIndicator
  ): Promise<InterventionAction[]> {
    const actions: InterventionAction[] = [];

    switch (indicator.type) {
      case 'struggling_with_concept':
        actions.push(
          {
            actionType: 'schedule_tutoring',
            description: 'Schedule one-on-one tutoring session',
            priority: 1,
            estimatedImpact: 80,
            resourcesRequired: ['Tutor availability'],
            autoExecutable: true
          },
          {
            actionType: 'provide_supplementary_materials',
            description: 'Provide additional learning resources',
            priority: 2,
            estimatedImpact: 60,
            resourcesRequired: ['Learning materials'],
            autoExecutable: true
          }
        );
        break;

      case 'low_engagement':
        actions.push(
          {
            actionType: 'advisor_notification',
            description: 'Notify academic advisor',
            priority: 1,
            estimatedImpact: 70,
            resourcesRequired: ['Advisor availability'],
            autoExecutable: true
          },
          {
            actionType: 'form_study_group',
            description: 'Connect with peer study group',
            priority: 2,
            estimatedImpact: 65,
            resourcesRequired: ['Compatible peers'],
            autoExecutable: false
          }
        );
        break;

      case 'assignment_failure':
        actions.push(
          {
            actionType: 'schedule_tutoring',
            description: 'Urgent tutoring for failed assignments',
            priority: 1,
            estimatedImpact: 85,
            resourcesRequired: ['Tutor availability'],
            autoExecutable: true
          },
          {
            actionType: 'remedial_content',
            description: 'Assign remedial learning modules',
            priority: 2,
            estimatedImpact: 70,
            resourcesRequired: ['Remedial content'],
            autoExecutable: true
          }
        );
        break;

      case 'attendance_drop':
        actions.push(
          {
            actionType: 'advisor_notification',
            description: 'Alert advisor about attendance issues',
            priority: 1,
            estimatedImpact: 75,
            resourcesRequired: ['Advisor availability'],
            autoExecutable: true
          }
        );
        break;

      case 'academic_probation_risk':
        actions.push(
          {
            actionType: 'advisor_notification',
            description: 'Urgent advisor meeting required',
            priority: 1,
            estimatedImpact: 90,
            resourcesRequired: ['Advisor availability'],
            autoExecutable: true
          },
          {
            actionType: 'course_adjustment',
            description: 'Consider course load reduction',
            priority: 2,
            estimatedImpact: 80,
            resourcesRequired: ['Academic approval'],
            autoExecutable: false
          }
        );
        break;

      case 'spiritual_concern':
        actions.push(
          {
            actionType: 'spiritual_counseling',
            description: 'Connect with spiritual advisor',
            priority: 1,
            estimatedImpact: 85,
            resourcesRequired: ['Spiritual advisor'],
            autoExecutable: true
          }
        );
        break;

      case 'dropout_risk':
        actions.push(
          {
            actionType: 'advisor_notification',
            description: 'Critical intervention needed',
            priority: 1,
            estimatedImpact: 95,
            resourcesRequired: ['Advisor availability', 'Counseling services'],
            autoExecutable: true
          }
        );
        break;
    }

    return actions;
  }

  /**
   * Helper methods
   */
  private async getRecentSubmissions(studentId: string, courseId?: string): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await prisma.submission.findMany({
      where: {
        userId: studentId,
        ...(courseId && { assignment: { courseId } }),
        submittedAt: { gte: thirtyDaysAgo }
      },
      include: {
        assignment: true
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });
  }

  private async getEngagementData(
    studentId: string,
    courseId?: string
  ): Promise<{ score: number; indicators: string[] }> {
    const indicators: string[] = [];
    let score = 100;

    // Check AI tutor usage
    const tutorSessions = await prisma.aITutorSession.count({
      where: {
        userId: studentId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    });

    if (tutorSessions === 0) {
      score -= 20;
      indicators.push('No AI tutor usage in past 30 days');
    }

    // Check portal activity
    const portalActivity = await prisma.portalEnrollment.findMany({
      where: {
        userId: studentId,
        ...(courseId && { portalCourseId: courseId })
      }
    });

    const avgProgress = portalActivity.reduce((sum, e) => sum + e.progressPercentage, 0) / 
      Math.max(portalActivity.length, 1);

    if (avgProgress < 50) {
      score -= 30;
      indicators.push(`Low course progress: ${avgProgress.toFixed(1)}%`);
    }

    return { score: Math.max(score, 0), indicators };
  }

  private async getAttendanceRate(studentId: string, courseId?: string): Promise<number> {
    // Simplified attendance calculation
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: studentId,
        ...(courseId && { courseId })
      }
    });

    if (enrollments.length === 0) return 100;

    const avgProgress = enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length;
    return avgProgress;
  }

  private async calculateGPA(studentId: string): Promise<number> {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: studentId,
        status: 'COMPLETED'
      },
      include: {
        submissions: true
      }
    });

    if (enrollments.length === 0) return 3.0; // Default for new students

    let totalPoints = 0;
    let totalCourses = 0;

    for (const enrollment of enrollments) {
      const scores = enrollment.submissions
        .filter(s => s.score !== null)
        .map(s => s.score as number);

      if (scores.length > 0) {
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        totalPoints += this.scoreToGPA(avgScore);
        totalCourses++;
      }
    }

    return totalCourses > 0 ? totalPoints / totalCourses : 3.0;
  }

  private scoreToGPA(score: number): number {
    if (score >= 93) return 4.0;
    if (score >= 90) return 3.7;
    if (score >= 87) return 3.3;
    if (score >= 83) return 3.0;
    if (score >= 80) return 2.7;
    if (score >= 77) return 2.3;
    if (score >= 73) return 2.0;
    if (score >= 70) return 1.7;
    if (score >= 67) return 1.3;
    if (score >= 60) return 1.0;
    return 0.0;
  }

  private shouldAutoExecute(indicator: StruggleIndicator): boolean {
    // Auto-execute for high severity issues
    if (indicator.severity >= 80) return true;

    // Auto-execute for specific types
    const autoTypes: InterventionType[] = [
      'struggling_with_concept',
      'low_engagement',
      'assignment_failure'
    ];

    return autoTypes.includes(indicator.type);
  }

  private mapSeverity(severityScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (severityScore >= 80) return 'critical';
    if (severityScore >= 60) return 'high';
    if (severityScore >= 40) return 'medium';
    return 'low';
  }

  private async findAvailableTutors(topic: string): Promise<any[]> {
    // Simplified tutor finding - in production, this would be more sophisticated
    return await prisma.user.findMany({
      where: {
        role: 'TUTOR',
        // Add availability and expertise checks
      },
      take: 5
    });
  }

  private getNextAvailableSlot(): Date {
    // Simplified scheduling - return next business day at 2 PM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    return tomorrow;
  }

  private async findSupplementaryMaterials(
    topic: string,
    weaknessArea: string
  ): Promise<any[]> {
    // Find relevant materials from database
    return await prisma.courseMaterial.findMany({
      where: {
        OR: [
          { title: { contains: topic, mode: 'insensitive' } },
          { description: { contains: weaknessArea, mode: 'insensitive' } }
        ]
      },
      take: 5
    });
  }

  private async findCompatibleStudents(
    studentId: string,
    courseId: string,
    topic: string
  ): Promise<any[]> {
    // Find students in same course with complementary skills
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId,
        userId: { not: studentId },
        status: 'ACTIVE'
      },
      include: {
        user: true
      },
      take: 10
    });

    return enrollments.map(e => e.user);
  }

  private async sendTutoringNotification(studentId: string, session: any): Promise<void> {
    logger.info('Sending tutoring notification', { studentId, sessionId: session.id });
    // Implementation would send email/SMS notification
  }

  private async sendMaterialsNotification(studentId: string, materials: any[]): Promise<void> {
    logger.info('Sending materials notification', { studentId, count: materials.length });
    // Implementation would send notification
  }

  private async sendStudyGroupNotifications(group: any): Promise<void> {
    logger.info('Sending study group notifications', { groupId: group.id });
    // Implementation would notify all members
  }

  private async sendUrgentAdvisorAlert(advisor: any, studentId: string, concern: string): Promise<void> {
    logger.info('Sending urgent advisor alert', { advisorId: advisor.id, studentId });
    // Implementation would send urgent notification (SMS/email)
  }

  private async logIntervention(
    trigger: InterventionTrigger,
    action: InterventionAction,
    details: ExecutionDetails
  ): Promise<void> {
    await prisma.interventionLog.create({
      data: {
        studentId: trigger.studentId,
        triggerType: trigger.triggerType,
        actionType: action.actionType,
        severity: trigger.severity,
        status: details.status,
        executedAt: new Date(),
        notes: details.notes
      }
    });
  }
}
