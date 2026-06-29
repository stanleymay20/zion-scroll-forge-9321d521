/**
 * User Profile and Settings Management Types
 * "I praise you because I am fearfully and wonderfully made" - Psalm 139:14
 */

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  
  // Profile Information
  bio?: string;
  avatarUrl?: string;
  dateOfBirth?: Date;
  phoneNumber?: string;
  location?: string;
  
  // Academic Information
  role: string;
  academicLevel: string;
  enrollmentStatus: string;
  
  // Spiritual Formation
  scrollCalling?: string;
  spiritualGifts: string[];
  kingdomVision?: string;
  scrollAlignment: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  bio?: string;
  dateOfBirth?: Date;
  phoneNumber?: string;
  location?: string;
  scrollCalling?: string;
  spiritualGifts?: string[];
  kingdomVision?: string;
}

export interface AvatarUploadRequest {
  file: Buffer;
  filename: string;
  mimetype: string;
  size: number;
}

export interface AvatarUploadResponse {
  avatarUrl: string;
  thumbnailUrl?: string;
  uploadedAt: Date;
}

export interface UserPreferences {
  userId: string;
  
  // Appearance
  theme: 'light' | 'dark' | 'auto';
  colorScheme?: string;
  fontSize: 'small' | 'medium' | 'large';
  
  // Language & Localization
  language: string;
  timeZone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  
  // Notifications
  emailNotifications: EmailNotificationPreferences;
  pushNotifications: PushNotificationPreferences;
  smsNotifications: SmsNotificationPreferences;
  
  // Privacy
  profileVisibility: 'public' | 'private' | 'friends_only';
  showEmail: boolean;
  showPhoneNumber: boolean;
  showLocation: boolean;
  allowMessagesFrom: 'everyone' | 'connections' | 'nobody';
  
  // Learning Preferences
  autoPlayVideos: boolean;
  videoQuality: 'auto' | 'high' | 'medium' | 'low';
  closedCaptionsEnabled: boolean;
  preferredLearningStyle?: string;
  
  // Accessibility
  screenReaderEnabled: boolean;
  highContrastMode: boolean;
  keyboardNavigationEnabled: boolean;
  
  // Metadata
  updatedAt: Date;
}

export interface EmailNotificationPreferences {
  enabled: boolean;
  courseUpdates: boolean;
  assignmentReminders: boolean;
  gradeNotifications: boolean;
  communityActivity: boolean;
  spiritualFormation: boolean;
  systemAnnouncements: boolean;
  marketingEmails: boolean;
  weeklyDigest: boolean;
}

export interface PushNotificationPreferences {
  enabled: boolean;
  courseUpdates: boolean;
  assignmentReminders: boolean;
  gradeNotifications: boolean;
  messages: boolean;
  communityActivity: boolean;
  spiritualFormation: boolean;
}

export interface SmsNotificationPreferences {
  enabled: boolean;
  urgentOnly: boolean;
  assignmentDeadlines: boolean;
  systemAlerts: boolean;
}

export interface PrivacySettings {
  userId: string;
  
  // Profile Visibility
  profileVisibility: 'public' | 'private' | 'friends_only';
  showEmail: boolean;
  showPhoneNumber: boolean;
  showLocation: boolean;
  showDateOfBirth: boolean;
  
  // Activity Visibility
  showCourseProgress: boolean;
  showAchievements: boolean;
  showScrollCoinBalance: boolean;
  showSpiritualGrowth: boolean;
  
  // Communication
  allowMessagesFrom: 'everyone' | 'connections' | 'nobody';
  allowFriendRequests: boolean;
  allowStudyGroupInvites: boolean;
  
  // Data Sharing
  allowDataAnalytics: boolean;
  allowPersonalization: boolean;
  allowThirdPartySharing: boolean;
  
  // Search & Discovery
  appearInSearch: boolean;
  showInLeaderboards: boolean;
  
  updatedAt: Date;
}

export interface SecuritySettings {
  userId: string;
  
  // Two-Factor Authentication
  twoFactorEnabled: boolean;
  twoFactorMethod?: 'sms' | 'email' | 'authenticator';
  twoFactorBackupCodes?: string[];
  
  // Session Management
  activeSessions: ActiveSession[];
  maxConcurrentSessions: number;
  sessionTimeout: number; // minutes
  
  // Login Security
  loginHistory: LoginHistoryEntry[];
  suspiciousActivityDetected: boolean;
  accountLocked: boolean;
  lockReason?: string;
  
  // Password Policy
  passwordLastChanged: Date;
  passwordExpiryDays: number;
  requirePasswordChange: boolean;
  
  updatedAt: Date;
}

export interface ActiveSession {
  sessionId: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  location?: string;
  loginAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}

export interface DeviceInfo {
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  userAgent: string;
}

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  timestamp: Date;
  ipAddress: string;
  location?: string;
  deviceInfo: DeviceInfo;
  success: boolean;
  failureReason?: string;
  suspicious: boolean;
}

export interface TwoFactorSetupRequest {
  method: 'sms' | 'email' | 'authenticator';
  phoneNumber?: string;
  email?: string;
}

export interface TwoFactorSetupResponse {
  method: string;
  secret?: string; // For authenticator apps
  qrCode?: string; // For authenticator apps
  backupCodes: string[];
}

export interface TwoFactorVerificationRequest {
  code: string;
  backupCode?: string;
}

export interface DataExportRequest {
  userId: string;
  format: 'json' | 'csv' | 'pdf';
  includePersonalInfo: boolean;
  includeAcademicRecords: boolean;
  includeSpiritualFormation: boolean;
  includeCommunityActivity: boolean;
  includeFinancialData: boolean;
}

export interface DataExportResponse {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
  fileSize?: number;
  createdAt: Date;
}

export interface AccountDeletionRequest {
  userId: string;
  reason?: string;
  feedback?: string;
  confirmPassword: string;
}

export interface AccountDeletionResponse {
  deletionId: string;
  status: 'scheduled' | 'processing' | 'completed';
  scheduledFor: Date;
  canCancel: boolean;
  cancelBy: Date;
}

export interface AnonymizationResult {
  userId: string;
  anonymizedAt: Date;
  dataRetained: string[];
  dataDeleted: string[];
  anonymizationMethod: string;
}

export interface ProfileCompletionStatus {
  userId: string;
  completionPercentage: number;
  missingFields: string[];
  recommendations: string[];
  sections: {
    basicInfo: boolean;
    contactInfo: boolean;
    academicInfo: boolean;
    spiritualFormation: boolean;
    preferences: boolean;
    security: boolean;
  };
}

export interface ProfileValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

export interface BulkPreferencesUpdate {
  userId: string;
  preferences: Partial<UserPreferences>;
  overwrite: boolean;
}

export interface SessionTerminationRequest {
  userId: string;
  sessionId?: string; // If not provided, terminates all sessions except current
  terminateAll: boolean;
}

export interface PasswordChangeRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordStrengthResult {
  score: number; // 0-100
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very_strong';
  feedback: string[];
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

export interface ProfileActivityLog {
  userId: string;
  action: string;
  description: string;
  ipAddress: string;
  deviceInfo: DeviceInfo;
  timestamp: Date;
  metadata?: any;
}

export interface GDPRComplianceData {
  userId: string;
  dataCollected: DataCategory[];
  dataProcessingPurposes: string[];
  dataRetentionPeriod: string;
  thirdPartySharing: ThirdPartySharing[];
  userRights: UserRight[];
  lastUpdated: Date;
}

export interface DataCategory {
  category: string;
  description: string;
  dataPoints: string[];
  sensitive: boolean;
}

export interface ThirdPartySharing {
  party: string;
  purpose: string;
  dataShared: string[];
  userConsent: boolean;
  consentDate?: Date;
}

export interface UserRight {
  right: string;
  description: string;
  howToExercise: string;
}

export interface ConsentManagement {
  userId: string;
  consents: Consent[];
  updatedAt: Date;
}

export interface Consent {
  consentType: string;
  description: string;
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  required: boolean;
}
