/**
 * ScrollUniversity Admissions Decision Notification and Communication Management
 * "Let your yes be yes and your no be no" - Matthew 5:37
 * 
 * This service manages all communication related to admission decisions,
 * ensuring timely, clear, and compassionate notification to applicants.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'ACCEPTANCE' | 'REJECTION' | 'WAITLIST' | 'CONDITIONAL' | 'APPEAL_RESPONSE';
  subject: string;
  bodyTemplate: string;
  variables: string[];
  language: string;
  isActive: boolean;
}

export interface NotificationContext {
  applicantId: string;
  applicationId: string;
  decisionType: string;
  personalDetails: {
    firstName: string;
    lastName: string;
    email: string;
    preferredLanguage?: string;
  };
  decisionDetails: {
    decision: string;
    overallScore?: number;
    strengths: string[];
    concerns: string[];
    recommendations: string[];
    reasoning: string;
    conditions?: string[];
    nextSteps: string[];
    deadlines?: { [key: string]: Date };
  };
  institutionalDetails: {
    programApplied: string;
    intendedStartDate: Date;
    contactPerson: string;
    contactEmail: string;
    appealProcess?: string;
  };
}

export interface CommunicationPlan {
  notifications: PlannedNotification[];
  followUpSchedule: FollowUpItem[];
  escalationTriggers: EscalationTrigger[];
  communicationPreferences: CommunicationPreference[];
}

export interface PlannedNotification {
  id: string;
  type: 'EMAIL' | 'SMS' | 'PHONE' | 'POSTAL' | 'PORTAL';
  templateId: string;
  scheduledTime: Date;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
  retryCount: number;
  maxRetries: number;
}

export interface FollowUpItem {
  id: string;
  type: 'ENROLLMENT_REMINDER' | 'CONDITION_CHECK' | 'APPEAL_DEADLINE' | 'WAITLIST_UPDATE';
  scheduledDate: Date;
  description: string;
  automated: boolean;
  assignedTo?: string;
}

export interface EscalationTrigger {
  condition: string;
  action: string;
  assignedTo: string;
  timeframe: number; // hours
}

export interface CommunicationPreference {
  channel: string;
  enabled: boolean;
  priority: number;
}

export interface NotificationResult {
  notificationId: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  deliveryDetails: DeliveryDetail[];
  errors: string[];
  timestamp: Date;
}

export interface DeliveryDetail {
  channel: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  timestamp: Date;
  trackingId?: string;
  error?: string;
}

export class DecisionNotificationManager {
  
  /**
   * Send comprehensive decision notification to applicant
   */
  async sendDecisionNotification(
    applicationId: string,
    decisionData: any,
    customMessage?: string
  ): Promise<NotificationResult> {
    try {
      logger.info(`Sending decision notification for application: ${applicationId}`);

      // Gather notification context
      const context = await this.buildNotificationContext(applicationId, decisionData);
      
      // Create communication plan
      const communicationPlan = await this.createCommunicationPlan(context);
      
      // Send primary notification
      const primaryResult = await this.sendPrimaryNotification(context, customMessage);
      
      // Schedule follow-up communications
      await this.scheduleFollowUpCommunications(communicationPlan);
      
      // Set up escalation triggers
      await this.setupEscalationTriggers(communicationPlan);
      
      // Log communication activity
      await this.logCommunicationActivity(applicationId, primaryResult);

      logger.info(`Decision notification sent successfully: ${primaryResult.status}`);
      return primaryResult;

    } catch (error) {
      logger.error('Error sending decision notification:', error);
      throw new Error(`Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Build comprehensive notification context
   */
  private async buildNotificationContext(
    applicationId: string,
    decisionData: any
  ): Promise<NotificationContext> {
    
    // Get application and applicant details
    const application = await prisma.applications.findUnique({
      where: { id: applicationId },
      include: {
        applicant: true,
        admissionDecisions: {
          orderBy: { decisionDate: 'desc' },
          take: 1
        }
      }
    });

    if (!application) {
      throw new Error('Application not found');
    }

    const decision = application.admissionDecisions[0];
    const applicant = application.applicant;

    return {
      applicantId: applicant.id,
      applicationId: application.id,
      decisionType: decision?.decision || decisionData.decision,
      personalDetails: {
        firstName: applicant.firstName,
        lastName: applicant.lastName,
        email: applicant.email,
        preferredLanguage: 'en' // Could be extracted from user preferences
      },
      decisionDetails: {
        decision: decision?.decision || decisionData.decision,
        overallScore: decisionData.overallScore,
        strengths: decisionData.strengths || [],
        concerns: decisionData.concerns || [],
        recommendations: decisionData.recommendations || [],
        reasoning: decisionData.reasoning || decision?.overallAssessment || '',
        conditions: decision?.admissionConditions || [],
        nextSteps: decision?.nextSteps || [],
        deadlines: this.extractDeadlines(decision)
      },
      institutionalDetails: {
        programApplied: application.programApplied,
        intendedStartDate: application.intendedStartDate,
        contactPerson: 'Admissions Office',
        contactEmail: 'admissions@scrolluniversity.org',
        appealProcess: decision?.appealEligible ? 'Available within 30 days' : 'Not available'
      }
    };
  }

  /**
   * Create comprehensive communication plan
   */
  private async createCommunicationPlan(context: NotificationContext): Promise<CommunicationPlan> {
    const notifications: PlannedNotification[] = [];
    const followUpSchedule: FollowUpItem[] = [];
    const escalationTriggers: EscalationTrigger[] = [];

    // Primary notification
    notifications.push({
      id: `primary_${Date.now()}`,
      type: 'EMAIL',
      templateId: this.getTemplateId(context.decisionType),
      scheduledTime: new Date(),
      priority: 'HIGH',
      status: 'PENDING',
      retryCount: 0,
      maxRetries: 3
    });

    // Decision-specific follow-ups
    switch (context.decisionDetails.decision) {
      case 'ACCEPTED':
        this.addAcceptanceFollowUps(followUpSchedule, context);
        break;
      case 'CONDITIONAL_ACCEPTANCE':
        this.addConditionalFollowUps(followUpSchedule, context);
        break;
      case 'WAITLISTED':
        this.addWaitlistFollowUps(followUpSchedule, context);
        break;
      case 'REJECTED':
        this.addRejectionFollowUps(followUpSchedule, context);
        break;
    }

    // Standard escalation triggers
    escalationTriggers.push({
      condition: 'No enrollment confirmation after 7 days',
      action: 'Send reminder and assign to counselor',
      assignedTo: 'enrollment_counselor',
      timeframe: 168 // 7 days in hours
    });

    const communicationPreferences: CommunicationPreference[] = [
      { channel: 'EMAIL', enabled: true, priority: 1 },
      { channel: 'SMS', enabled: false, priority: 2 },
      { channel: 'PORTAL', enabled: true, priority: 3 }
    ];

    return {
      notifications,
      followUpSchedule,
      escalationTriggers,
      communicationPreferences
    };
  }

  /**
   * Send primary decision notification
   */
  private async sendPrimaryNotification(
    context: NotificationContext,
    customMessage?: string
  ): Promise<NotificationResult> {
    
    const templateId = this.getTemplateId(context.decisionType);
    const template = await this.getNotificationTemplate(templateId, context.personalDetails.preferredLanguage);
    
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Generate personalized content
    const personalizedContent = this.personalizeContent(template, context, customMessage);
    
    // Send via multiple channels
    const deliveryDetails: DeliveryDetail[] = [];
    
    // Email notification
    try {
      await this.sendEmail(
        context.personalDetails.email,
        personalizedContent.subject,
        personalizedContent.body
      );
      
      deliveryDetails.push({
        channel: 'EMAIL',
        status: 'SENT',
        timestamp: new Date(),
        trackingId: `email_${Date.now()}`
      });
    } catch (error) {
      deliveryDetails.push({
        channel: 'EMAIL',
        status: 'FAILED',
        timestamp: new Date(),
        error: error.message
      });
    }

    // Portal notification
    try {
      await this.sendPortalNotification(
        context.applicantId,
        personalizedContent.subject,
        personalizedContent.body
      );
      
      deliveryDetails.push({
        channel: 'PORTAL',
        status: 'SENT',
        timestamp: new Date(),
        trackingId: `portal_${Date.now()}`
      });
    } catch (error) {
      deliveryDetails.push({
        channel: 'PORTAL',
        status: 'FAILED',
        timestamp: new Date(),
        error: error.message
      });
    }

    const successfulDeliveries = deliveryDetails.filter(d => d.status === 'SENT').length;
    const status = successfulDeliveries > 0 
      ? (successfulDeliveries === deliveryDetails.length ? 'SUCCESS' : 'PARTIAL')
      : 'FAILED';

    return {
      notificationId: `notification_${Date.now()}`,
      status,
      deliveryDetails,
      errors: deliveryDetails.filter(d => d.error).map(d => d.error!),
      timestamp: new Date()
    };
  }

  /**
   * Personalize notification content
   */
  private personalizeContent(
    template: NotificationTemplate,
    context: NotificationContext,
    customMessage?: string
  ) {
    let subject = template.subject;
    let body = template.bodyTemplate;

    // Replace standard variables
    const variables = {
      '{{firstName}}': context.personalDetails.firstName,
      '{{lastName}}': context.personalDetails.lastName,
      '{{fullName}}': `${context.personalDetails.firstName} ${context.personalDetails.lastName}`,
      '{{decision}}': context.decisionDetails.decision,
      '{{program}}': context.institutionalDetails.programApplied,
      '{{startDate}}': context.institutionalDetails.intendedStartDate.toLocaleDateString(),
      '{{reasoning}}': context.decisionDetails.reasoning,
      '{{strengths}}': context.decisionDetails.strengths.join(', '),
      '{{concerns}}': context.decisionDetails.concerns.join(', '),
      '{{recommendations}}': context.decisionDetails.recommendations.join('\n• '),
      '{{nextSteps}}': context.decisionDetails.nextSteps.join('\n• '),
      '{{contactEmail}}': context.institutionalDetails.contactEmail,
      '{{contactPerson}}': context.institutionalDetails.contactPerson,
      '{{customMessage}}': customMessage || ''
    };

    // Replace all variables in subject and body
    Object.entries(variables).forEach(([placeholder, value]) => {
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      body = body.replace(new RegExp(placeholder, 'g'), value);
    });

    // Add decision-specific content
    body = this.addDecisionSpecificContent(body, context);

    return { subject, body };
  }

  /**
   * Add decision-specific content to notification
   */
  private addDecisionSpecificContent(body: string, context: NotificationContext): string {
    let additionalContent = '';

    switch (context.decisionDetails.decision) {
      case 'ACCEPTED':
        additionalContent = this.generateAcceptanceContent(context);
        break;
      case 'CONDITIONAL_ACCEPTANCE':
        additionalContent = this.generateConditionalContent(context);
        break;
      case 'WAITLISTED':
        additionalContent = this.generateWaitlistContent(context);
        break;
      case 'REJECTED':
        additionalContent = this.generateRejectionContent(context);
        break;
    }

    return body.replace('{{additionalContent}}', additionalContent);
  }

  /**
   * Generate acceptance-specific content
   */
  private generateAcceptanceContent(context: NotificationContext): string {
    let content = '\n\n🎉 CONGRATULATIONS! 🎉\n\n';
    content += 'We are delighted to welcome you to the ScrollUniversity family. ';
    content += 'Your application demonstrated exceptional alignment with our values and mission.\n\n';
    
    if (context.decisionDetails.strengths.length > 0) {
      content += 'Key strengths we observed:\n';
      context.decisionDetails.strengths.forEach(strength => {
        content += `• ${strength}\n`;
      });
      content += '\n';
    }

    content += 'NEXT STEPS:\n';
    content += '1. Confirm your enrollment by [enrollment deadline]\n';
    content += '2. Complete your student profile setup\n';
    content += '3. Schedule your orientation session\n';
    content += '4. Connect with your assigned ScrollMentor\n\n';

    content += 'We are excited to see how God will use you in this next season of your journey!\n\n';
    content += 'Blessings,\nThe ScrollUniversity Admissions Team';

    return content;
  }

  /**
   * Generate conditional acceptance content
   */
  private generateConditionalContent(context: NotificationContext): string {
    let content = '\n\n✨ CONDITIONAL ACCEPTANCE ✨\n\n';
    content += 'We are pleased to offer you conditional acceptance to ScrollUniversity. ';
    content += 'Your application shows great promise, and we believe you have the potential to thrive in our community.\n\n';

    if (context.decisionDetails.conditions && context.decisionDetails.conditions.length > 0) {
      content += 'CONDITIONS TO FULFILL:\n';
      context.decisionDetails.conditions.forEach(condition => {
        content += `• ${condition}\n`;
      });
      content += '\n';
    }

    content += 'Once these conditions are met, your acceptance will be confirmed. ';
    content += 'We are here to support you through this process.\n\n';

    content += 'Please contact us to discuss your pathway to full acceptance.\n\n';
    content += 'Grace and peace,\nThe ScrollUniversity Admissions Team';

    return content;
  }

  /**
   * Generate waitlist content
   */
  private generateWaitlistContent(context: NotificationContext): string {
    let content = '\n\n⏳ WAITLIST NOTIFICATION ⏳\n\n';
    content += 'Thank you for your interest in ScrollUniversity. ';
    content += 'While we cannot offer you admission at this time, we have placed you on our waitlist.\n\n';

    content += 'This means:\n';
    content += '• Your application met our standards but space is currently limited\n';
    content += '• You may be offered admission if spots become available\n';
    content += '• We will keep you updated on your status\n\n';

    if (context.decisionDetails.recommendations.length > 0) {
      content += 'WAYS TO STRENGTHEN YOUR APPLICATION:\n';
      context.decisionDetails.recommendations.forEach(rec => {
        content += `• ${rec}\n`;
      });
      content += '\n';
    }

    content += 'We encourage you to continue growing and preparing. ';
    content += 'Your journey with the Lord is valuable regardless of admission outcomes.\n\n';

    content += 'Blessings on your path,\nThe ScrollUniversity Admissions Team';

    return content;
  }

  /**
   * Generate rejection content with encouragement
   */
  private generateRejectionContent(context: NotificationContext): string {
    let content = '\n\n💙 ADMISSIONS DECISION 💙\n\n';
    content += 'Thank you for your interest in ScrollUniversity and for taking the time to complete your application. ';
    content += 'After careful consideration and prayer, we are unable to offer you admission at this time.\n\n';

    content += 'Please know that this decision does not reflect your worth or calling. ';
    content += 'God has unique plans for each of His children, and we trust He is directing your path.\n\n';

    if (context.decisionDetails.recommendations.length > 0) {
      content += 'AREAS FOR CONTINUED GROWTH:\n';
      context.decisionDetails.recommendations.forEach(rec => {
        content += `• ${rec}\n`;
      });
      content += '\n';
    }

    content += 'We encourage you to:\n';
    content += '• Continue pursuing your spiritual and academic development\n';
    content += '• Seek mentorship and guidance in your areas of growth\n';
    content += '• Consider reapplying in the future when you feel ready\n\n';

    if (context.institutionalDetails.appealProcess) {
      content += `APPEAL PROCESS: ${context.institutionalDetails.appealProcess}\n\n`;
    }

    content += 'May the Lord bless you and guide your steps.\n\n';
    content += 'With Christian love,\nThe ScrollUniversity Admissions Team';

    return content;
  }

  /**
   * Helper methods for follow-up scheduling
   */
  private addAcceptanceFollowUps(followUpSchedule: FollowUpItem[], context: NotificationContext) {
    // Enrollment reminder
    followUpSchedule.push({
      id: `enrollment_reminder_${Date.now()}`,
      type: 'ENROLLMENT_REMINDER',
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      description: 'Send enrollment confirmation reminder',
      automated: true
    });

    // Orientation scheduling
    followUpSchedule.push({
      id: `orientation_${Date.now()}`,
      type: 'ENROLLMENT_REMINDER',
      scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      description: 'Schedule orientation session',
      automated: false,
      assignedTo: 'orientation_coordinator'
    });
  }

  private addConditionalFollowUps(followUpSchedule: FollowUpItem[], context: NotificationContext) {
    // Condition check reminder
    followUpSchedule.push({
      id: `condition_check_${Date.now()}`,
      type: 'CONDITION_CHECK',
      scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      description: 'Check progress on admission conditions',
      automated: false,
      assignedTo: 'admissions_counselor'
    });
  }

  private addWaitlistFollowUps(followUpSchedule: FollowUpItem[], context: NotificationContext) {
    // Monthly waitlist update
    followUpSchedule.push({
      id: `waitlist_update_${Date.now()}`,
      type: 'WAITLIST_UPDATE',
      scheduledDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      description: 'Send waitlist status update',
      automated: true
    });
  }

  private addRejectionFollowUps(followUpSchedule: FollowUpItem[], context: NotificationContext) {
    // Reapplication information
    followUpSchedule.push({
      id: `reapplication_info_${Date.now()}`,
      type: 'APPEAL_DEADLINE',
      scheduledDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      description: 'Send reapplication information and encouragement',
      automated: true
    });
  }

  /**
   * Utility methods
   */
  private getTemplateId(decisionType: string): string {
    const templateMap: { [key: string]: string } = {
      'ACCEPTED': 'acceptance_notification',
      'REJECTED': 'rejection_notification',
      'WAITLISTED': 'waitlist_notification',
      'CONDITIONAL_ACCEPTANCE': 'conditional_acceptance_notification'
    };

    return templateMap[decisionType] || 'default_decision_notification';
  }

  private async getNotificationTemplate(templateId: string, language: string = 'en'): Promise<NotificationTemplate | null> {
    // Implementation would fetch template from database
    // For now, return a default template structure
    return {
      id: templateId,
      name: `${templateId}_${language}`,
      type: 'ACCEPTANCE',
      subject: 'ScrollUniversity Admissions Decision - {{fullName}}',
      bodyTemplate: `Dear {{firstName}},\n\n{{additionalContent}}\n\nIf you have questions, please contact {{contactPerson}} at {{contactEmail}}.\n\n{{customMessage}}`,
      variables: ['firstName', 'lastName', 'fullName', 'decision', 'program'],
      language,
      isActive: true
    };
  }

  private extractDeadlines(decision: any): { [key: string]: Date } {
    const deadlines: { [key: string]: Date } = {};
    
    if (decision?.enrollmentDeadline) {
      deadlines.enrollment = new Date(decision.enrollmentDeadline);
    }
    
    if (decision?.appealDeadline) {
      deadlines.appeal = new Date(decision.appealDeadline);
    }

    return deadlines;
  }

  private async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // Implementation would integrate with email service
    logger.info(`Sending email to ${to}: ${subject}`);
  }

  private async sendPortalNotification(userId: string, subject: string, body: string): Promise<void> {
    // Implementation would create portal notification
    logger.info(`Creating portal notification for user ${userId}: ${subject}`);
  }

  private async scheduleFollowUpCommunications(plan: CommunicationPlan): Promise<void> {
    // Implementation would schedule follow-up communications
    logger.info(`Scheduling ${plan.followUpSchedule.length} follow-up communications`);
  }

  private async setupEscalationTriggers(plan: CommunicationPlan): Promise<void> {
    // Implementation would set up escalation triggers
    logger.info(`Setting up ${plan.escalationTriggers.length} escalation triggers`);
  }

  private async logCommunicationActivity(applicationId: string, result: NotificationResult): Promise<void> {
    // Implementation would log communication activity
    logger.info(`Logging communication activity for application ${applicationId}`);
  }
}

export default DecisionNotificationManager;