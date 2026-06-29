/**
 * Study Group Service Tests
 * "As iron sharpens iron, so one person sharpens another" - Proverbs 27:17
 */

import { PrismaClient } from '@prisma/client';
import StudyGroupService from '../StudyGroupService';
import GroupAssignmentService from '../GroupAssignmentService';
import CollaborativeDocumentService from '../CollaborativeDocumentService';
import GroupEventService from '../GroupEventService';
import GroupAnalyticsService from '../GroupAnalyticsService';
import {
  StudyGroupStatus,
  GroupMemberRole,
  AssignmentStatus,
  EventType,
  AttendanceStatus,
  VideoProvider
} from '../../types/study-group.types';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $executeRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn()
  };
  
  return {
    PrismaClient: jest.fn(() => mockPrisma)
  };
});

describe('StudyGroupService', () => {
  let prisma: any;
  
  beforeEach(() => {
    prisma = new PrismaClient();
    jest.clearAllMocks();
  });
  
  describe('createStudyGroup', () => {
    it('should create a study group successfully', async () => {
      const mockGroup = {
        id: 'group-1',
        name: 'Test Study Group',
        description: 'A test group',
        creator_id: 'user-1',
        is_private: false,
        max_members: 20,
        status: 'ACTIVE',
        tags: ['test'],
        interests: ['learning'],
        created_at: new Date(),
        updated_at: new Date()
      };
      
      prisma.$queryRaw.mockResolvedValueOnce([mockGroup]);
      prisma.$executeRaw.mockResolvedValueOnce(1);
      prisma.$queryRaw.mockResolvedValueOnce([mockGroup]);
      prisma.$queryRaw.mockResolvedValueOnce([]);
      
      const result = await StudyGroupService.createStudyGroup('user-1', {
        name: 'Test Study Group',
        description: 'A test group',
        isPrivate: false,
        tags: ['test'],
        interests: ['learning']
      });
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Test Study Group');
    });
    
    it('should validate max members', async () => {
      await expect(
        StudyGroupService.createStudyGroup('user-1', {
          name: 'Test Group',
          description: 'Test',
          isPrivate: false,
          maxMembers: 1 // Too low
        })
      ).rejects.toThrow('Max members must be between 2 and 100');
    });
  });
  
  describe('joinStudyGroup', () => {
    it('should allow user to join a group', async () => {
      const mockGroup = {
        id: 'group-1',
        name: 'Test Group',
        max_members: 20
      };
      
      const mockMember = {
        id: 'member-1',
        group_id: 'group-1',
        user_id: 'user-2',
        role: 'MEMBER',
        joined_at: new Date()
      };
      
      prisma.$queryRaw
        .mockResolvedValueOnce([mockGroup]) // Check group exists
        .mockResolvedValueOnce([]) // Check not already member
        .mockResolvedValueOnce([{ count: '5' }]) // Check capacity
        .mockResolvedValueOnce([mockMember]); // Add member
      
      const result = await StudyGroupService.joinStudyGroup('user-2', {
        groupId: 'group-1'
      });
      
      expect(result.member).toBeDefined();
      expect(result.member.userId).toBe('user-2');
    });
    
    it('should prevent joining when already a member', async () => {
      const mockGroup = { id: 'group-1', max_members: 20 };
      const existingMember = { id: 'member-1', user_id: 'user-2' };
      
      prisma.$queryRaw
        .mockResolvedValueOnce([mockGroup])
        .mockResolvedValueOnce([existingMember]);
      
      await expect(
        StudyGroupService.joinStudyGroup('user-2', { groupId: 'group-1' })
      ).rejects.toThrow('User is already a member of this group');
    });
  });
});

describe('GroupAssignmentService', () => {
  let prisma: any;
  
  beforeEach(() => {
    prisma = new PrismaClient();
    jest.clearAllMocks();
  });
  
  describe('createAssignment', () => {
    it('should create an assignment', async () => {
      const mockMember = { role: 'MEMBER' };
      const mockAssignment = {
        id: 'assignment-1',
        group_id: 'group-1',
        title: 'Test Assignment',
        description: 'Test description',
        status: 'PENDING',
        created_by: 'user-1',
        created_at: new Date()
      };
      
      prisma.$queryRaw
        .mockResolvedValueOnce([mockMember])
        .mockResolvedValueOnce([mockAssignment]);
      
      const result = await GroupAssignmentService.createAssignment('user-1', {
        groupId: 'group-1',
        title: 'Test Assignment',
        description: 'Test description'
      });
      
      expect(result).toBeDefined();
      expect(result.title).toBe('Test Assignment');
    });
  });
  
  describe('submitAssignment', () => {
    it('should submit an assignment', async () => {
      const mockAssignment = { id: 'assignment-1', group_id: 'group-1' };
      const mockMember = { user_id: 'user-1' };
      const mockSubmission = {
        id: 'submission-1',
        assignment_id: 'assignment-1',
        group_id: 'group-1',
        submitted_by: 'user-1',
        content: 'Test submission',
        attachments: [],
        submitted_at: new Date()
      };
      
      prisma.$queryRaw
        .mockResolvedValueOnce([mockAssignment])
        .mockResolvedValueOnce([mockMember])
        .mockResolvedValueOnce([]) // No existing submission
        .mockResolvedValueOnce([mockSubmission]);
      
      prisma.$executeRaw.mockResolvedValueOnce(1);
      
      const result = await GroupAssignmentService.submitAssignment('user-1', {
        assignmentId: 'assignment-1',
        content: 'Test submission'
      });
      
      expect(result).toBeDefined();
      expect(result.content).toBe('Test submission');
    });
  });
});

describe('CollaborativeDocumentService', () => {
  let prisma: any;
  
  beforeEach(() => {
    prisma = new PrismaClient();
    jest.clearAllMocks();
  });
  
  describe('createDocument', () => {
    it('should create a collaborative document', async () => {
      const mockMember = { user_id: 'user-1' };
      const mockDocument = {
        id: 'doc-1',
        group_id: 'group-1',
        title: 'Test Document',
        content: '',
        version: 1,
        created_by: 'user-1',
        last_edited_by: 'user-1',
        is_locked: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      prisma.$queryRaw
        .mockResolvedValueOnce([mockMember])
        .mockResolvedValueOnce([mockDocument]);
      
      const result = await CollaborativeDocumentService.createDocument('user-1', {
        groupId: 'group-1',
        title: 'Test Document'
      });
      
      expect(result).toBeDefined();
      expect(result.title).toBe('Test Document');
    });
  });
  
  describe('updateDocument', () => {
    it('should update document content', async () => {
      const mockDoc = {
        id: 'doc-1',
        group_id: 'group-1',
        content: 'Old content',
        version: 1,
        is_locked: false
      };
      
      const mockMember = { user_id: 'user-1' };
      const updatedDoc = { ...mockDoc, content: 'New content', version: 2 };
      
      prisma.$queryRaw
        .mockResolvedValueOnce([mockDoc])
        .mockResolvedValueOnce([mockMember])
        .mockResolvedValueOnce([updatedDoc]);
      
      prisma.$executeRaw.mockResolvedValueOnce(1);
      
      const result = await CollaborativeDocumentService.updateDocument('user-1', {
        documentId: 'doc-1',
        content: 'New content'
      });
      
      expect(result.document.content).toBe('New content');
      expect(result.version).toBe(2);
    });
  });
});

describe('GroupEventService', () => {
  let prisma: any;
  
  beforeEach(() => {
    prisma = new PrismaClient();
    jest.clearAllMocks();
  });
  
  describe('createEvent', () => {
    it('should create a group event', async () => {
      const mockMember = { user_id: 'user-1' };
      const mockEvent = {
        id: 'event-1',
        group_id: 'group-1',
        title: 'Study Session',
        event_type: 'STUDY_SESSION',
        start_time: new Date('2024-01-01T10:00:00Z'),
        end_time: new Date('2024-01-01T12:00:00Z'),
        created_by: 'user-1',
        created_at: new Date()
      };
      
      prisma.$queryRaw
        .mockResolvedValueOnce([mockMember])
        .mockResolvedValueOnce([mockEvent]);
      
      const result = await GroupEventService.createEvent('user-1', {
        groupId: 'group-1',
        title: 'Study Session',
        eventType: EventType.STUDY_SESSION,
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z')
      });
      
      expect(result).toBeDefined();
      expect(result.title).toBe('Study Session');
    });
    
    it('should validate event times', async () => {
      const mockMember = { user_id: 'user-1' };
      prisma.$queryRaw.mockResolvedValueOnce([mockMember]);
      
      await expect(
        GroupEventService.createEvent('user-1', {
          groupId: 'group-1',
          title: 'Invalid Event',
          eventType: EventType.STUDY_SESSION,
          startTime: new Date('2024-01-01T12:00:00Z'),
          endTime: new Date('2024-01-01T10:00:00Z') // End before start
        })
      ).rejects.toThrow('End time must be after start time');
    });
  });
  
  describe('startVideoConference', () => {
    it('should start a video conference session', async () => {
      const mockMember = { user_id: 'user-1' };
      const mockSession = {
        id: 'session-1',
        group_id: 'group-1',
        provider: 'JITSI',
        room_id: 'room-123',
        room_url: 'https://meet.jit.si/scrolluniversity-room-123',
        host_id: 'user-1',
        started_at: new Date()
      };
      
      prisma.$queryRaw
        .mockResolvedValueOnce([mockMember])
        .mockResolvedValueOnce([mockSession]);
      
      const result = await GroupEventService.startVideoConference('user-1', {
        groupId: 'group-1',
        provider: VideoProvider.JITSI
      });
      
      expect(result.session).toBeDefined();
      expect(result.joinUrl).toContain('meet.jit.si');
    });
  });
});

describe('GroupAnalyticsService', () => {
  let prisma: any;
  
  beforeEach(() => {
    prisma = new PrismaClient();
    jest.clearAllMocks();
  });
  
  describe('getGroupAnalytics', () => {
    it('should return group analytics', async () => {
      const mockStats = {
        total_members: '10',
        active_members: '8',
        total_messages: '100',
        total_documents: '5',
        total_assignments: '3',
        completed_assignments: '2'
      };
      
      prisma.$queryRaw
        .mockResolvedValueOnce([mockStats])
        .mockResolvedValueOnce([]) // Top contributors
        .mockResolvedValueOnce([]) // Activity by day
        .mockResolvedValueOnce([]); // Engagement trend
      
      const result = await GroupAnalyticsService.getGroupAnalytics({
        groupId: 'group-1'
      });
      
      expect(result).toBeDefined();
      expect(result.totalMembers).toBe(10);
      expect(result.activeMembers).toBe(8);
    });
  });
  
  describe('getGroupRecommendations', () => {
    it('should return group recommendations', async () => {
      const mockCourses = [{ course_id: 'course-1' }];
      const mockInterests = [{ interest: 'programming' }];
      const mockCurrentGroups = [];
      const mockCourseGroups = [
        {
          id: 'group-2',
          course_id: 'course-1',
          member_count: '5',
          created_at: new Date()
        }
      ];
      
      prisma.$queryRaw
        .mockResolvedValueOnce(mockCourses)
        .mockResolvedValueOnce(mockInterests)
        .mockResolvedValueOnce(mockCurrentGroups)
        .mockResolvedValueOnce(mockCourseGroups);
      
      const result = await GroupAnalyticsService.getGroupRecommendations({
        userId: 'user-1',
        limit: 10
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
  
  describe('calculateGroupHealthScore', () => {
    it('should calculate health score', async () => {
      const mockStats = {
        total_members: '10',
        active_members: '8',
        total_messages: '100',
        total_documents: '5',
        total_assignments: '3',
        completed_assignments: '2'
      };
      
      prisma.$queryRaw
        .mockResolvedValueOnce([mockStats])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      
      const score = await GroupAnalyticsService.calculateGroupHealthScore('group-1');
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
