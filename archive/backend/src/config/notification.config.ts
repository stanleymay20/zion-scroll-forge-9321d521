/**
 * Notification System Configuration
 * Multi-channel notification delivery settings
 */

import { NotificationServiceConfig } from '../types/notification.types';

export const notificationConfig: NotificationServiceConfig = {
  email: {
    provider: (process.env.EMAIL_PROVIDER as 'sendgrid' | 'ses' | 'smtp') || 'sendgrid',
    from: process.env.EMAIL_FROM || 'notifications@scrolluniversity.edu',
    replyTo: process.env.EMAIL_REPLY_TO || 'support@scrolluniversity.edu',
    apiKey: process.env.SENDGRID_API_KEY || process.env.AWS_SES_API_KEY,
  },
  sms: {
    provider: (process.env.SMS_PROVIDER as 'twilio' | 'sns') || 'twilio',
    from: process.env.SMS_FROM || '+1234567890',
    apiKey: process.env.TWILIO_API_KEY || process.env.AWS_SNS_API_KEY,
  },
  push: {
    provider: (process.env.PUSH_PROVIDER as 'fcm' | 'apns') || 'fcm',
    apiKey: process.env.FCM_SERVER_KEY || process.env.APNS_KEY,
  },
  batching: {
    enabled: process.env.NOTIFICATION_BATCHING_ENABLED === 'true',
    defaultInterval: parseInt(process.env.NOTIFICATION_BATCH_INTERVAL || '30', 10), // minutes
    maxBatchSize: parseInt(process.env.NOTIFICATION_MAX_BATCH_SIZE || '50', 10),
  },
  retries: {
    maxAttempts: parseInt(process.env.NOTIFICATION_MAX_RETRIES || '3', 10),
    backoffMultiplier: parseFloat(process.env.NOTIFICATION_BACKOFF_MULTIPLIER || '2'),
    initialDelay: parseInt(process.env.NOTIFICATION_INITIAL_DELAY || '1000', 10), // ms
  },
  rateLimit: {
    perUser: {
      perMinute: parseInt(process.env.NOTIFICATION_USER_RATE_MINUTE || '10', 10),
      perHour: parseInt(process.env.NOTIFICATION_USER_RATE_HOUR || '100', 10),
      perDay: parseInt(process.env.NOTIFICATION_USER_RATE_DAY || '500', 10),
    },
    global: {
      perSecond: parseInt(process.env.NOTIFICATION_GLOBAL_RATE_SECOND || '100', 10),
      perMinute: parseInt(process.env.NOTIFICATION_GLOBAL_RATE_MINUTE || '5000', 10),
    },
  },
};

// Default notification templates
export const defaultTemplates = {
  courseEnrollment: {
    name: 'Course Enrollment Confirmation',
    category: 'academic' as const,
    channels: ['email' as const, 'in_app' as const],
    subject: 'Welcome to {{courseName}}!',
    emailTemplate: `
      <h2>Welcome to {{courseName}}!</h2>
      <p>Dear {{userName}},</p>
      <p>You have successfully enrolled in {{courseName}}. We're excited to have you join us on this learning journey.</p>
      <p><strong>Course Details:</strong></p>
      <ul>
        <li>Start Date: {{startDate}}</li>
        <li>Duration: {{duration}}</li>
        <li>Instructor: {{instructorName}}</li>
      </ul>
      <p>Access your course materials at: <a href="{{courseUrl}}">{{courseUrl}}</a></p>
      <p>Blessings on your studies!</p>
    `,
    variables: ['userName', 'courseName', 'startDate', 'duration', 'instructorName', 'courseUrl'],
  },
  assignmentDue: {
    name: 'Assignment Due Reminder',
    category: 'academic' as const,
    channels: ['email' as const, 'push' as const, 'in_app' as const],
    subject: 'Assignment Due: {{assignmentName}}',
    emailTemplate: `
      <h2>Assignment Reminder</h2>
      <p>Hi {{userName}},</p>
      <p>This is a reminder that your assignment "{{assignmentName}}" for {{courseName}} is due soon.</p>
      <p><strong>Due Date:</strong> {{dueDate}}</p>
      <p><strong>Time Remaining:</strong> {{timeRemaining}}</p>
      <p>Submit your work at: <a href="{{submissionUrl}}">{{submissionUrl}}</a></p>
    `,
    pushTemplate: 'Assignment "{{assignmentName}}" due {{timeRemaining}}',
    variables: ['userName', 'assignmentName', 'courseName', 'dueDate', 'timeRemaining', 'submissionUrl'],
  },
  dailyDevotion: {
    name: 'Daily Devotion',
    category: 'spiritual' as const,
    channels: ['email' as const, 'push' as const, 'in_app' as const],
    subject: 'Your Daily Devotion: {{devotionTitle}}',
    emailTemplate: `
      <h2>{{devotionTitle}}</h2>
      <p>Good morning {{userName}},</p>
      <p><strong>Scripture:</strong> {{scripture}}</p>
      <blockquote>{{scriptureText}}</blockquote>
      <p>{{reflection}}</p>
      <p><strong>Prayer:</strong> {{prayer}}</p>
      <p>Read more at: <a href="{{devotionUrl}}">{{devotionUrl}}</a></p>
    `,
    pushTemplate: 'Your daily devotion is ready: {{devotionTitle}}',
    variables: ['userName', 'devotionTitle', 'scripture', 'scriptureText', 'reflection', 'prayer', 'devotionUrl'],
  },
  prayerRequest: {
    name: 'Prayer Request',
    category: 'spiritual' as const,
    channels: ['email' as const, 'push' as const, 'in_app' as const],
    subject: 'Prayer Request from {{requesterName}}',
    emailTemplate: `
      <h2>Prayer Request</h2>
      <p>{{requesterName}} has requested prayer:</p>
      <blockquote>{{prayerRequest}}</blockquote>
      <p>Join in prayer at: <a href="{{prayerUrl}}">{{prayerUrl}}</a></p>
    `,
    pushTemplate: '{{requesterName}} needs prayer',
    variables: ['requesterName', 'prayerRequest', 'prayerUrl'],
  },
  messageReceived: {
    name: 'New Message',
    category: 'social' as const,
    channels: ['push' as const, 'in_app' as const],
    subject: 'New message from {{senderName}}',
    pushTemplate: '{{senderName}}: {{messagePreview}}',
    inAppTemplate: 'You have a new message from {{senderName}}',
    variables: ['senderName', 'messagePreview', 'messageUrl'],
  },
  paymentSuccess: {
    name: 'Payment Confirmation',
    category: 'payment' as const,
    channels: ['email' as const, 'in_app' as const],
    subject: 'Payment Received - {{amount}}',
    emailTemplate: `
      <h2>Payment Confirmation</h2>
      <p>Dear {{userName}},</p>
      <p>We have received your payment of {{amount}} for {{description}}.</p>
      <p><strong>Transaction Details:</strong></p>
      <ul>
        <li>Amount: {{amount}}</li>
        <li>Date: {{date}}</li>
        <li>Transaction ID: {{transactionId}}</li>
      </ul>
      <p>View receipt: <a href="{{receiptUrl}}">{{receiptUrl}}</a></p>
    `,
    variables: ['userName', 'amount', 'description', 'date', 'transactionId', 'receiptUrl'],
  },
  systemMaintenance: {
    name: 'System Maintenance Notice',
    category: 'system' as const,
    channels: ['email' as const, 'push' as const, 'in_app' as const],
    subject: 'Scheduled Maintenance: {{maintenanceDate}}',
    emailTemplate: `
      <h2>Scheduled Maintenance Notice</h2>
      <p>Dear ScrollUniversity Community,</p>
      <p>We will be performing scheduled maintenance on {{maintenanceDate}} from {{startTime}} to {{endTime}}.</p>
      <p>During this time, the platform may be temporarily unavailable.</p>
      <p>We apologize for any inconvenience and appreciate your patience.</p>
    `,
    pushTemplate: 'Maintenance scheduled for {{maintenanceDate}}',
    variables: ['maintenanceDate', 'startTime', 'endTime'],
  },
};
