/**
 * Study Groups and Collaboration Types
 * "As iron sharpens iron, so one person sharpens another" - Proverbs 27:17
 */

// ============================================================================
// Core Types
// ============================================================================

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  courseId?: string;
  creatorId: string;
  isPrivate: boolean;
  maxMembers: number;
  meetingSchedule?: MeetingSchedule;
  tags: string[];
  interests: string[];
  academicLevel?: string;
  status: StudyGroupStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum StudyGroupStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED'
}

export interface StudyGroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  joinedAt: Date;
  lastActiveAt?: Date;
  contributionScore: number;
  isActive: boolean;
}

export enum GroupMemberRole {
  OWNER = 'OWNER',
  MODERATOR = 'MODERATOR',
  MEMBER = 'MEMBER'
}

export interface MeetingSchedule {
  frequency: MeetingFrequency;
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  time?: string; // HH:MM format
  timezone: string;
  duration: number; // in minutes
  recurringPattern?: string;
}

export enum MeetingFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM'
}

export interface GroupAssignment {
  id: string;
  groupId: string;
  title: string;
  description: string;
  dueDate?: Date;
  status: AssignmentStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum AssignmentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE'
}

export interface GroupAssignmentSubmission {
  id: string;
  assignmentId: string;
  groupId: string;
  submittedBy: string;
  content: string;
  attachments: SubmissionAttachment[];
  grade?: number;
  feedback?: string;
  submittedAt: Date;
  gradedAt?: Date;
  gradedBy?: string;
}

export interface SubmissionAttachment {
  id: string;
  filename: string;
  url: string;
  mimetype: string;
  size: number;
  uploadedAt: Date;
}

export interface CollaborativeDocument {
  id: string;
  groupId: string;
  title: string;
  content: string;
  version: number;
  createdBy: string;
  lastEditedBy: string;
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentEdit {
  id: string;
  documentId: string;
  userId: string;
  changes: string; // JSON string of changes
  version: number;
  editedAt: Date;
}

export interface GroupEvent {
  id: string;
  groupId: string;
  title: string;
  description?: string;
  eventType: EventType;
  startTime: Date;
  endTime: Date;
  location?: string;
  videoConferenceUrl?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum EventType {
  STUDY_SESSION = 'STUDY_SESSION',
  VIDEO_CALL = 'VIDEO_CALL',
  ASSIGNMENT_DUE = 'ASSIGNMENT_DUE',
  EXAM_PREP = 'EXAM_PREP',
  SOCIAL = 'SOCIAL',
  OTHER = 'OTHER'
}

export interface EventAttendance {
  id: string;
  eventId: string;
  userId: string;
  status: AttendanceStatus;
  joinedAt?: Date;
  leftAt?: Date;
  duration?: number; // in minutes
}

export enum AttendanceStatus {
  ATTENDING = 'ATTENDING',
  MAYBE = 'MAYBE',
  NOT_ATTENDING = 'NOT_ATTENDING',
  ATTENDED = 'ATTENDED',
  MISSED = 'MISSED'
}

export interface GroupAnalytics {
  groupId: string;
  totalMembers: number;
  activeMembers: number;
  totalMessages: number;
  totalDocuments: number;
  totalAssignments: number;
  completedAssignments: number;
  averageParticipation: number;
  averageResponseTime: number;
  topContributors: {
    userId: string;
    contributionScore: number;
  }[];
  activityByDay: {
    [day: string]: number;
  };
  engagementTrend: {
    date: string;
    score: number;
  }[];
}

export interface GroupRecommendation {
  groupId: string;
  score: number;
  reasons: string[];
  matchingCourses: string[];
  matchingInterests: string[];
  memberOverlap: number;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CreateStudyGroupRequest {
  name: string;
  description: string;
  courseId?: string;
  isPrivate: boolean;
  maxMembers?: number;
  meetingSchedule?: MeetingSchedule;
  tags?: string[];
  interests?: string[];
  academicLevel?: string;
}

export interface CreateStudyGroupResponse {
  success: boolean;
  group: StudyGroupWithMembers;
}

export interface UpdateStudyGroupRequest {
  groupId: string;
  name?: string;
  description?: string;
  isPrivate?: boolean;
  maxMembers?: number;
  meetingSchedule?: MeetingSchedule;
  tags?: string[];
  interests?: string[];
  status?: StudyGroupStatus;
}

export interface UpdateStudyGroupResponse {
  success: boolean;
  group: StudyGroup;
}

export interface JoinStudyGroupRequest {
  groupId: string;
  message?: string;
}

export interface JoinStudyGroupResponse {
  success: boolean;
  member: StudyGroupMember;
  group: StudyGroup;
}

export interface LeaveStudyGroupRequest {
  groupId: string;
}

export interface LeaveStudyGroupResponse {
  success: boolean;
  message: string;
}

export interface GetStudyGroupsRequest {
  courseId?: string;
  tags?: string[];
  interests?: string[];
  academicLevel?: string;
  status?: StudyGroupStatus;
  limit?: number;
  offset?: number;
}

export interface GetStudyGroupsResponse {
  success: boolean;
  groups: StudyGroupWithMembers[];
  total: number;
  hasMore: boolean;
}

export interface StudyGroupWithMembers extends StudyGroup {
  members: StudyGroupMemberWithUser[];
  memberCount: number;
  isMember?: boolean;
  userRole?: GroupMemberRole;
}

export interface StudyGroupMemberWithUser extends StudyGroupMember {
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    role: string;
  };
}

export interface CreateGroupAssignmentRequest {
  groupId: string;
  title: string;
  description: string;
  dueDate?: Date;
}

export interface CreateGroupAssignmentResponse {
  success: boolean;
  assignment: GroupAssignment;
}

export interface SubmitGroupAssignmentRequest {
  assignmentId: string;
  content: string;
  attachments?: Express.Multer.File[];
}

export interface SubmitGroupAssignmentResponse {
  success: boolean;
  submission: GroupAssignmentSubmission;
}

export interface CreateCollaborativeDocumentRequest {
  groupId: string;
  title: string;
  content?: string;
}

export interface CreateCollaborativeDocumentResponse {
  success: boolean;
  document: CollaborativeDocument;
}

export interface UpdateCollaborativeDocumentRequest {
  documentId: string;
  content: string;
  lockDocument?: boolean;
}

export interface UpdateCollaborativeDocumentResponse {
  success: boolean;
  document: CollaborativeDocument;
  version: number;
}

export interface CreateGroupEventRequest {
  groupId: string;
  title: string;
  description?: string;
  eventType: EventType;
  startTime: Date;
  endTime: Date;
  location?: string;
  videoConferenceUrl?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
}

export interface CreateGroupEventResponse {
  success: boolean;
  event: GroupEvent;
}

export interface UpdateEventAttendanceRequest {
  eventId: string;
  status: AttendanceStatus;
}

export interface UpdateEventAttendanceResponse {
  success: boolean;
  attendance: EventAttendance;
}

export interface GetGroupAnalyticsRequest {
  groupId: string;
  startDate?: Date;
  endDate?: Date;
}

export interface GetGroupAnalyticsResponse {
  success: boolean;
  analytics: GroupAnalytics;
}

export interface GetGroupRecommendationsRequest {
  userId: string;
  limit?: number;
}

export interface GetGroupRecommendationsResponse {
  success: boolean;
  recommendations: GroupRecommendation[];
}

export interface SearchStudyGroupsRequest {
  query: string;
  courseId?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchStudyGroupsResponse {
  success: boolean;
  groups: StudyGroupWithMembers[];
  total: number;
}

export interface UpdateMemberRoleRequest {
  groupId: string;
  userId: string;
  role: GroupMemberRole;
}

export interface UpdateMemberRoleResponse {
  success: boolean;
  member: StudyGroupMember;
}

export interface RemoveMemberRequest {
  groupId: string;
  userId: string;
}

export interface RemoveMemberResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// Video Conferencing Integration Types
// ============================================================================

export interface VideoConferenceSession {
  id: string;
  groupId: string;
  eventId?: string;
  provider: VideoProvider;
  roomId: string;
  roomUrl: string;
  hostId: string;
  startedAt: Date;
  endedAt?: Date;
  participants: VideoParticipant[];
  recordingUrl?: string;
  duration?: number;
}

export enum VideoProvider {
  JITSI = 'JITSI',
  ZOOM = 'ZOOM',
  GOOGLE_MEET = 'GOOGLE_MEET',
  MICROSOFT_TEAMS = 'MICROSOFT_TEAMS',
  CUSTOM = 'CUSTOM'
}

export interface VideoParticipant {
  userId: string;
  joinedAt: Date;
  leftAt?: Date;
  duration: number;
  isMuted: boolean;
  isVideoOn: boolean;
}

export interface StartVideoConferenceRequest {
  groupId: string;
  eventId?: string;
  provider?: VideoProvider;
}

export interface StartVideoConferenceResponse {
  success: boolean;
  session: VideoConferenceSession;
  joinUrl: string;
}

// ============================================================================
// Service Configuration Types
// ============================================================================

export interface StudyGroupServiceConfig {
  maxGroupSize: number;
  maxGroupsPerUser: number;
  maxDocumentsPerGroup: number;
  maxAssignmentsPerGroup: number;
  documentLockTimeout: number; // in minutes
  inactivityThreshold: number; // in days
  recommendationLimit: number;
  enableVideoConferencing: boolean;
  defaultVideoProvider: VideoProvider;
}
