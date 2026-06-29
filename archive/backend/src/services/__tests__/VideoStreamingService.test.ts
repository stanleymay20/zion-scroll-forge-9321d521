/**
 * Video Streaming Service Tests
 * "Test the streaming of wisdom scrolls"
 */

import VideoStreamingService from '../VideoStreamingService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    lecture: {
      findUnique: jest.fn()
    },
    enrollment: {
      findFirst: jest.fn()
    }
  };
  
  return {
    PrismaClient: jest.fn(() => mockPrismaClient)
  };
});

describe('VideoStreamingService', () => {
  let service: VideoStreamingService;
  let mockPrisma: any;

  beforeEach(() => {
    service = new VideoStreamingService();
    mockPrisma = new PrismaClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkVideoAccess', () => {
    it('should grant access to enrolled users', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue({
        id: 'enrollment-1',
        userId: 'user-1',
        courseId: 'course-1',
        status: 'ACTIVE',
        expiresAt: null
      });

      const result = await service.checkVideoAccess({
        userId: 'user-1',
        lectureId: 'lecture-1',
        courseId: 'course-1'
      });

      expect(result.hasAccess).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should deny access to non-enrolled users', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);

      const result = await service.checkVideoAccess({
        userId: 'user-1',
        lectureId: 'lecture-1',
        courseId: 'course-1'
      });

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('User is not enrolled in this course');
    });

    it('should deny access if enrollment has expired', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      mockPrisma.enrollment.findFirst.mockResolvedValue({
        id: 'enrollment-1',
        userId: 'user-1',
        courseId: 'course-1',
        status: 'ACTIVE',
        expiresAt: pastDate
      });

      const result = await service.checkVideoAccess({
        userId: 'user-1',
        lectureId: 'lecture-1',
        courseId: 'course-1'
      });

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('Course enrollment has expired');
    });
  });

  describe('getVideoStream', () => {
    it('should return video stream for authorized user', async () => {
      const mockLecture = {
        id: 'lecture-1',
        title: 'Test Lecture',
        videoUrl: 'https://example.com/video.mp4',
        duration: 30,
        closedCaptions: 'https://example.com/captions.vtt',
        module: {
          courseId: 'course-1',
          course: {
            id: 'course-1'
          }
        }
      };

      mockPrisma.lecture.findUnique.mockResolvedValue(mockLecture);
      mockPrisma.enrollment.findFirst.mockResolvedValue({
        id: 'enrollment-1',
        userId: 'user-1',
        courseId: 'course-1',
        status: 'ACTIVE'
      });

      const result = await service.getVideoStream({
        videoId: 'lecture-1',
        userId: 'user-1'
      });

      expect(result).toBeDefined();
      expect(result.streamUrl).toBeDefined();
      expect(result.qualities).toBeDefined();
      expect(result.qualities.length).toBeGreaterThan(0);
      expect(result.captions).toBeDefined();
    });

    it('should throw error for non-existent lecture', async () => {
      mockPrisma.lecture.findUnique.mockResolvedValue(null);

      await expect(
        service.getVideoStream({
          videoId: 'non-existent',
          userId: 'user-1'
        })
      ).rejects.toThrow('Lecture not found');
    });

    it('should throw error for unauthorized user', async () => {
      const mockLecture = {
        id: 'lecture-1',
        videoUrl: 'https://example.com/video.mp4',
        duration: 30,
        module: {
          courseId: 'course-1'
        }
      };

      mockPrisma.lecture.findUnique.mockResolvedValue(mockLecture);
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.getVideoStream({
          videoId: 'lecture-1',
          userId: 'user-1'
        })
      ).rejects.toThrow('User is not enrolled in this course');
    });
  });
});
