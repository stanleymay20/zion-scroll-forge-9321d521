/**
 * Video Progress Tracking Service
 * "Track every moment of learning, celebrate every milestone of growth"
 * 
 * Handles video playback progress tracking and completion analytics
 */

import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import {
  VideoProgressUpdate,
  VideoProgressResponse,
  WatchedSegment
} from '../types/video-streaming.types';

export default class VideoProgressTrackingService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Update video progress for a user
   */
  async updateProgress(update: VideoProgressUpdate): Promise<VideoProgressResponse> {
    try {
      logger.info('Updating video progress', {
        userId: update.userId,
        lectureId: update.lectureId,
        currentTime: update.currentTime
      });

      // Calculate percent complete
      const percentComplete = Math.min(100, Math.round((update.currentTime / update.duration) * 100));

      // Find or create progress record
      let progress = await this.prisma.lectureProgress.findUnique({
        where: {
          userId_lectureId: {
            userId: update.userId,
            lectureId: update.lectureId
          }
        }
      });

      if (progress) {
        // Update existing progress
        progress = await this.prisma.lectureProgress.update({
          where: {
            userId_lectureId: {
              userId: update.userId,
              lectureId: update.lectureId
            }
          },
          data: {
            currentTime: update.currentTime,
            percentComplete,
            completed: update.completed || percentComplete >= 90,
            lastWatchedAt: new Date(),
            totalWatchTime: progress.totalWatchTime + 1, // Increment by 1 second
            watchCount: progress.watchCount + (update.currentTime === 0 ? 1 : 0)
          }
        });
      } else {
        // Create new progress record
        progress = await this.prisma.lectureProgress.create({
          data: {
            userId: update.userId,
            lectureId: update.lectureId,
            currentTime: update.currentTime,
            duration: update.duration,
            percentComplete,
            completed: update.completed || percentComplete >= 90,
            lastWatchedAt: new Date(),
            totalWatchTime: 1,
            watchCount: 1
          }
        });
      }

      // Update course enrollment progress if lecture is completed
      if (progress.completed) {
        await this.updateCourseProgress(update.userId, update.lectureId);
      }

      // Store watched segments for analytics
      if (update.watchedSegments) {
        await this.storeWatchedSegments(update.userId, update.lectureId, update.watchedSegments);
      }

      const response: VideoProgressResponse = {
        lectureId: progress.lectureId,
        userId: progress.userId,
        currentTime: progress.currentTime,
        duration: progress.duration,
        percentComplete: progress.percentComplete,
        completed: progress.completed,
        lastWatchedAt: progress.lastWatchedAt,
        totalWatchTime: progress.totalWatchTime,
        watchCount: progress.watchCount
      };

      logger.info('Video progress updated', {
        lectureId: update.lectureId,
        percentComplete
      });

      return response;
    } catch (error) {
      logger.error('Error updating video progress:', error);
      throw new Error(`Failed to update video progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get video progress for a user
   */
  async getProgress(userId: string, lectureId: string): Promise<VideoProgressResponse | null> {
    try {
      const progress = await this.prisma.lectureProgress.findUnique({
        where: {
          userId_lectureId: {
            userId,
            lectureId
          }
        }
      });

      if (!progress) {
        return null;
      }

      return {
        lectureId: progress.lectureId,
        userId: progress.userId,
        currentTime: progress.currentTime,
        duration: progress.duration,
        percentComplete: progress.percentComplete,
        completed: progress.completed,
        lastWatchedAt: progress.lastWatchedAt,
        totalWatchTime: progress.totalWatchTime,
        watchCount: progress.watchCount
      };
    } catch (error) {
      logger.error('Error getting video progress:', error);
      return null;
    }
  }

  /**
   * Get all progress for a course
   */
  async getCourseProgress(userId: string, courseId: string): Promise<VideoProgressResponse[]> {
    try {
      const lectures = await this.prisma.lecture.findMany({
        where: {
          module: {
            courseId
          }
        },
        select: {
          id: true
        }
      });

      const lectureIds = lectures.map(l => l.id);

      const progressRecords = await this.prisma.lectureProgress.findMany({
        where: {
          userId,
          lectureId: {
            in: lectureIds
          }
        }
      });

      return progressRecords.map(progress => ({
        lectureId: progress.lectureId,
        userId: progress.userId,
        currentTime: progress.currentTime,
        duration: progress.duration,
        percentComplete: progress.percentComplete,
        completed: progress.completed,
        lastWatchedAt: progress.lastWatchedAt,
        totalWatchTime: progress.totalWatchTime,
        watchCount: progress.watchCount
      }));
    } catch (error) {
      logger.error('Error getting course progress:', error);
      return [];
    }
  }

  /**
   * Update course enrollment progress when lecture is completed
   */
  private async updateCourseProgress(userId: string, lectureId: string): Promise<void> {
    try {
      // Get lecture and course info
      const lecture = await this.prisma.lecture.findUnique({
        where: { id: lectureId },
        include: {
          module: {
            include: {
              course: {
                include: {
                  modules: {
                    include: {
                      lectures: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!lecture) {
        return;
      }

      const courseId = lecture.module.courseId;

      // Count total lectures and completed lectures
      const totalLectures = lecture.module.course.modules.reduce(
        (sum, module) => sum + module.lectures.length,
        0
      );

      const completedLectures = await this.prisma.lectureProgress.count({
        where: {
          userId,
          completed: true,
          lecture: {
            module: {
              courseId
            }
          }
        }
      });

      // Calculate course progress percentage
      const progress = Math.round((completedLectures / totalLectures) * 100);

      // Update enrollment
      await this.prisma.enrollment.updateMany({
        where: {
          userId,
          courseId,
          status: 'ACTIVE'
        },
        data: {
          progress,
          completedAt: progress >= 100 ? new Date() : null
        }
      });

      logger.info('Course progress updated', {
        userId,
        courseId,
        progress,
        completedLectures,
        totalLectures
      });
    } catch (error) {
      logger.error('Error updating course progress:', error);
    }
  }

  /**
   * Store watched segments for analytics
   */
  private async storeWatchedSegments(
    userId: string,
    lectureId: string,
    segments: WatchedSegment[]
  ): Promise<void> {
    try {
      // In production, this would store segments in a time-series database
      // for detailed analytics on which parts of videos are watched/skipped
      logger.info('Storing watched segments', {
        userId,
        lectureId,
        segmentCount: segments.length
      });
    } catch (error) {
      logger.error('Error storing watched segments:', error);
    }
  }

  /**
   * Get watch statistics for a lecture
   */
  async getLectureWatchStats(lectureId: string): Promise<{
    totalViews: number;
    uniqueViewers: number;
    averageWatchTime: number;
    completionRate: number;
  }> {
    try {
      const stats = await this.prisma.lectureProgress.aggregate({
        where: { lectureId },
        _count: {
          userId: true
        },
        _avg: {
          totalWatchTime: true,
          percentComplete: true
        }
      });

      const completedCount = await this.prisma.lectureProgress.count({
        where: {
          lectureId,
          completed: true
        }
      });

      return {
        totalViews: stats._count.userId || 0,
        uniqueViewers: stats._count.userId || 0,
        averageWatchTime: stats._avg.totalWatchTime || 0,
        completionRate: stats._count.userId > 0 ? (completedCount / stats._count.userId) * 100 : 0
      };
    } catch (error) {
      logger.error('Error getting lecture watch stats:', error);
      return {
        totalViews: 0,
        uniqueViewers: 0,
        averageWatchTime: 0,
        completionRate: 0
      };
    }
  }

  /**
   * Reset progress for a lecture
   */
  async resetProgress(userId: string, lectureId: string): Promise<void> {
    try {
      await this.prisma.lectureProgress.update({
        where: {
          userId_lectureId: {
            userId,
            lectureId
          }
        },
        data: {
          currentTime: 0,
          percentComplete: 0,
          completed: false
        }
      });

      logger.info('Progress reset', { userId, lectureId });
    } catch (error) {
      logger.error('Error resetting progress:', error);
      throw error;
    }
  }
}
