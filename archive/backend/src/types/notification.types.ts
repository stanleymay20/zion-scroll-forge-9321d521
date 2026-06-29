/**
 * Notification System Type Definitions
 * Comprehensive types for multi-channel notification delivery
 */

export type NotificationChannel = 'email' | 'push' | 'sms' | 'websocket' | 'in_app';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
export type NotificationCategory = 
  | 'academic' 
  | 'spiritual' 
  | 'social' 
  | 'administrative' 
  | 'payment' 
  | 'system' 
  | 'marketing';

export interface NotificationTemplate {
  id: string;
  name: string;
  category: NotificationCategory;
  channels: NotificationChannel[];
  subject?: string;
  emailTemplate?: string;
  smsTemplate?: string;
  pushTemplate?: string;
  inAppTemplate?: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  userId: string;
  email: {
    enabled: boolean;
    academic: boolean;
    spiritual: boolean;
    social: boolean;
    administrative: boolean;
    payment: boolean;
    system: boolean;
    marketing: boolean;
  };
  push: {
    enabled: boolean;
    academic: boolean;
    spiritual: boolean;
    social: boolean;
    administrative: boolean;
    payment: boolean;
    system: boolean;
    marketing: boolean;
  };
  sms: {
    enabled: boolean;
    academic: boolean;
    spiritual: boolean;
    social: boolean;
    administrative: boolean;
    payment: boolean;
    system: boolean;
    marketing: boolean;
  };
  inApp: {
    enabled: boolean;
    academic: boolean;
    spiritual: boolean;
    social: boolean;
    administrative: boolean;
    payment: boolean;
    system: boolean;
    marketing: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string;
    timezone: string;
  };
  batchingEnabled: boolean;
  batchInterval: number; // minutes
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  templateId?: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  subject: string;
  content: string;
  data?: Record<string, any>;
  status: NotificationStatus;
  scheduledFor?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  recipient: string;
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  retryCount: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationBatch {
  id: string;
  userId: string;
  notifications: Notification[];
  scheduledFor: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'cancelled';
  createdAt: Date;
}

export interface NotificationAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  deliveryRate: number;
  readRate: number;
  failureRate: number;
  byChannel: {
    [key in NotificationChannel]: {
      sent: number;
      delivered: number;
      failed: number;
      deliveryRate: number;
    };
  };
  byCategory: {
    [key in NotificationCategory]: {
      sent: number;
      delivered: number;
      read: number;
      readRate: number;
    };
  };
  averageDeliveryTime: number; // milliseconds
  averageReadTime: number; // milliseconds
  engagementScore: number;
}

export interface CreateNotificationRequest {
  userId: string;
  templateId?: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  subject: string;
  content: string;
  data?: Record<string, any>;
  scheduledFor?: Date;
  expiresAt?: Date;
}

export interface BulkNotificationRequest {
  userIds: string[];
  templateId?: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  subject: string;
  content: string;
  data?: Record<string, any>;
  scheduledFor?: Date;
}

export interface UpdatePreferencesRequest {
  email?: Partial<NotificationPreferences['email']>;
  push?: Partial<NotificationPreferences['push']>;
  sms?: Partial<NotificationPreferences['sms']>;
  inApp?: Partial<NotificationPreferences['inApp']>;
  quietHours?: Partial<NotificationPreferences['quietHours']>;
  batchingEnabled?: boolean;
  batchInterval?: number;
}

export interface NotificationFilter {
  userId?: string;
  category?: NotificationCategory;
  status?: NotificationStatus;
  channel?: NotificationChannel;
  priority?: NotificationPriority;
  startDate?: Date;
  endDate?: Date;
  isRead?: boolean;
  limit?: number;
  offset?: number;
}

export interface NotificationEngagement {
  notificationId: string;
  userId: string;
  action: 'opened' | 'clicked' | 'dismissed' | 'deleted';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface NotificationServiceConfig {
  email: {
    provider: 'sendgrid' | 'ses' | 'smtp';
    from: string;
    replyTo?: string;
    apiKey?: string;
  };
  sms: {
    provider: 'twilio' | 'sns';
    from: string;
    apiKey?: string;
  };
  push: {
    provider: 'fcm' | 'apns';
    apiKey?: string;
  };
  batching: {
    enabled: boolean;
    defaultInterval: number;
    maxBatchSize: number;
  };
  retries: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  rateLimit: {
    perUser: {
      perMinute: number;
      perHour: number;
      perDay: number;
    };
    global: {
      perSecond: number;
      perMinute: number;
    };
  };
}
