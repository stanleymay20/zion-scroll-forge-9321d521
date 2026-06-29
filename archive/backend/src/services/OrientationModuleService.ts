// Orientation Module Service
// "Show me your ways, LORD, teach me your paths" - Psalm 25:4

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import {
  OrientationModule,
  OrientationProgress,
  OrientationModuleProgress
} from '../types/enrollment.types';

const prisma = new PrismaClient();

export class OrientationModuleService {
  private readonly orientationModules: OrientationModule[] = [
    {
      moduleId: 'welcome_video',
      title: 'Welcome to ScrollUniversity',
      description: 'Introduction to our mission, vision, and kingdom-focused education',
      order: 1,
      duration: 10,
      type: 'video',
      content: {
        videoUrl: '/orientation/welcome.mp4',
        transcript: 'Welcome to ScrollUniversity...',
        slides: []
      },
      isRequired: true,
      completionCriteria: {
        type: 'video_watched',
        minimumPercentage: 90
      }
    },
    {
      moduleId: 'platform_overview',
      title: 'Platform Overview',
      description: 'Learn about the features and tools available to you',
      order: 2,
      duration: 15,
      type: 'interactive',
      content: {
        sections: [
          { id: 'dashboard', title: 'Dashboard', description: 'Your learning hub' },
          { id: 'courses', title: 'Courses', description: 'Browse and enroll in courses' },
          { id: 'ai_tutor', title: 'AI Tutor', description: 'Get personalized help 24/7' },
          { id: 'community', title: 'Community', description: 'Connect with fellow students' },
          { id: 'spiritual_formation', title: 'Spiritual Formation', description: 'Grow spiritually' },
          { id: 'scrollcoin', title: 'ScrollCoin Wallet', description: 'Manage your rewards' }
        ]
      },
      isRequired: true,
      completionCriteria: {
        type: 'sections_completed',
        requiredSections: 6
      }
    },
    {
      moduleId: 'academic_policies',
      title: 'Academic Policies',
      description: 'Understanding our academic standards and expectations',
      order: 3,
      duration: 20,
      type: 'reading',
      content: {
        sections: [
          'Grading System',
          'Academic Integrity',
          'Attendance Policy',
          'Assignment Submission',
          'Course Completion Requirements'
        ]
      },
      isRequired: true,
      completionCriteria: {
        type: 'reading_completed',
        minimumTimeSpent: 15
      }
    },
    {
      moduleId: 'spiritual_formation_intro',
      title: 'Spiritual Formation at ScrollUniversity',
      description: 'How we integrate faith and learning',
      order: 4,
      duration: 15,
      type: 'video',
      content: {
        videoUrl: '/orientation/spiritual-formation.mp4',
        resources: [
          'Daily Devotions Guide',
          'Prayer Journal Tutorial',
          'Scripture Memory System'
        ]
      },
      isRequired: true,
      completionCriteria: {
        type: 'video_watched',
        minimumPercentage: 90
      }
    },
    {
      moduleId: 'scrollcoin_economy',
      title: 'Understanding ScrollCoin',
      description: 'Learn about our divine economy and reward system',
      order: 5,
      duration: 12,
      type: 'interactive',
      content: {
        topics: [
          'What is ScrollCoin?',
          'How to Earn ScrollCoin',
          'Spending ScrollCoin',
          'Wallet Management',
          'Work-Trade Program'
        ]
      },
      isRequired: true,
      completionCriteria: {
        type: 'quiz_passed',
        minimumScore: 80
      }
    },
    {
      moduleId: 'ai_tutor_tutorial',
      title: 'Using Your AI Tutor',
      description: 'Get the most out of your 24/7 AI learning assistant',
      order: 6,
      duration: 10,
      type: 'interactive',
      content: {
        demonstrations: [
          'Starting a tutoring session',
          'Asking effective questions',
          'Using video avatars',
          'Reviewing session history'
        ]
      },
      isRequired: false,
      completionCriteria: {
        type: 'demonstration_completed',
        requiredDemonstrations: 4
      }
    },
    {
      moduleId: 'community_guidelines',
      title: 'Community Guidelines',
      description: 'Building a Christ-centered learning community',
      order: 7,
      duration: 8,
      type: 'reading',
      content: {
        guidelines: [
          'Respectful Communication',
          'Academic Collaboration',
          'Prayer and Support',
          'Content Moderation',
          'Reporting Issues'
        ]
      },
      isRequired: true,
      completionCriteria: {
        type: 'reading_completed',
        minimumTimeSpent: 5
      }
    },
    {
      moduleId: 'technical_requirements',
      title: 'Technical Requirements',
      description: 'Ensure your device and internet connection are ready',
      order: 8,
      duration: 5,
      type: 'interactive',
      content: {
        checks: [
          'Browser compatibility',
          'Internet speed test',
          'Audio/video test',
          'Mobile app installation'
        ]
      },
      isRequired: false,
      completionCriteria: {
        type: 'checks_completed',
        requiredChecks: 3
      }
    },
    {
      moduleId: 'orientation_quiz',
      title: 'Orientation Assessment',
      description: 'Test your understanding of the platform and policies',
      order: 9,
      duration: 15,
      type: 'quiz',
      content: {
        questions: 20,
        passingScore: 80,
        attempts: 3
      },
      isRequired: true,
      completionCriteria: {
        type: 'quiz_passed',
        minimumScore: 80
      }
    },
    {
      moduleId: 'completion_celebration',
      title: 'Orientation Complete!',
      description: 'Congratulations on completing your orientation',
      order: 10,
      duration: 5,
      type: 'interactive',
      content: {
        certificate: true,
        reward: {
          scrollCoins: 50,
          badge: 'orientation_complete'
        },
        nextSteps: [
          'Enroll in your first course',
          'Complete your profile',
          'Meet your advisor',
          'Join a study group'
        ]
      },
      isRequired: true,
      completionCriteria: {
        type: 'acknowledgment',
        required: true
      }
    }
  ];

  /**
   * Initialize orientation for a student
   */
  async initializeOrientation(userId: string): Promise<OrientationProgress> {
    try {
      logger.info('Initializing orientation', { userId });

      const modules: OrientationModuleProgress[] = this.orientationModules.map(module => ({
        moduleId: module.moduleId,
        title: module.title,
        status: 'not_started',
        progress: 0,
        attempts: 0
      }));

      const progress: OrientationProgress = {
        userId,
        modules,
        totalModules: this.orientationModules.length,
        completedModules: 0,
        completionPercentage: 0,
        startedAt: new Date(),
        certificateIssued: false
      };

      // Store in database
      await prisma.userPreferences.upsert({
        where: { userId },
        create: {
          userId,
          learningPreferences: {
            orientationProgress: progress
          }
        },
        update: {
          learningPreferences: {
            orientationProgress: progress
          }
        }
      });

      logger.info('Orientation initialized', { userId });
      return progress;
    } catch (error) {
      logger.error('Error initializing orientation', { error, userId });
      throw error;
    }
  }

  /**
   * Get orientation progress
   */
  async getOrientationProgress(userId: string): Promise<OrientationProgress | null> {
    try {
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId }
      });

      if (!preferences || !preferences.learningPreferences) {
        return null;
      }

      const learningPrefs = preferences.learningPreferences as any;
      return learningPrefs.orientationProgress || null;
    } catch (error) {
      logger.error('Error getting orientation progress', { error, userId });
      throw error;
    }
  }

  /**
   * Get orientation module details
   */
  async getModule(moduleId: string): Promise<OrientationModule | null> {
    return this.orientationModules.find(m => m.moduleId === moduleId) || null;
  }

  /**
   * Start a module
   */
  async startModule(userId: string, moduleId: string): Promise<OrientationProgress> {
    try {
      logger.info('Starting orientation module', { userId, moduleId });

      const progress = await this.getOrientationProgress(userId);
      if (!progress) {
        throw new Error('Orientation not initialized');
      }

      const moduleIndex = progress.modules.findIndex(m => m.moduleId === moduleId);
      if (moduleIndex === -1) {
        throw new Error('Module not found');
      }

      if (progress.modules[moduleIndex].status === 'not_started') {
        progress.modules[moduleIndex].status = 'in_progress';
        progress.modules[moduleIndex].startedAt = new Date();
      }

      // Save progress
      await this.saveProgress(userId, progress);

      logger.info('Orientation module started', { userId, moduleId });
      return progress;
    } catch (error) {
      logger.error('Error starting module', { error, userId, moduleId });
      throw error;
    }
  }

  /**
   * Complete a module
   */
  async completeModule(
    userId: string,
    moduleId: string,
    score?: number
  ): Promise<OrientationProgress> {
    try {
      logger.info('Completing orientation module', { userId, moduleId, score });

      const progress = await this.getOrientationProgress(userId);
      if (!progress) {
        throw new Error('Orientation not initialized');
      }

      const moduleIndex = progress.modules.findIndex(m => m.moduleId === moduleId);
      if (moduleIndex === -1) {
        throw new Error('Module not found');
      }

      const module = this.orientationModules.find(m => m.moduleId === moduleId);
      if (!module) {
        throw new Error('Module definition not found');
      }

      // Check completion criteria
      if (module.completionCriteria.type === 'quiz_passed' && score !== undefined) {
        if (score < module.completionCriteria.minimumScore) {
          progress.modules[moduleIndex].attempts++;
          progress.modules[moduleIndex].score = score;
          await this.saveProgress(userId, progress);
          throw new Error(`Quiz score ${score} is below minimum ${module.completionCriteria.minimumScore}`);
        }
      }

      // Mark as completed
      if (progress.modules[moduleIndex].status !== 'completed') {
        progress.modules[moduleIndex].status = 'completed';
        progress.modules[moduleIndex].completedAt = new Date();
        progress.modules[moduleIndex].progress = 100;
        progress.modules[moduleIndex].score = score;
        progress.completedModules++;
        progress.completionPercentage = Math.round(
          (progress.completedModules / progress.totalModules) * 100
        );
      }

      // Check if all modules are complete
      if (progress.completedModules === progress.totalModules) {
        progress.completedAt = new Date();
        await this.issueOrientationCertificate(userId);
        progress.certificateIssued = true;
      }

      // Save progress
      await this.saveProgress(userId, progress);

      logger.info('Orientation module completed', { userId, moduleId });
      return progress;
    } catch (error) {
      logger.error('Error completing module', { error, userId, moduleId });
      throw error;
    }
  }

  /**
   * Update module progress
   */
  async updateModuleProgress(
    userId: string,
    moduleId: string,
    progress: number
  ): Promise<OrientationProgress> {
    try {
      const orientationProgress = await this.getOrientationProgress(userId);
      if (!orientationProgress) {
        throw new Error('Orientation not initialized');
      }

      const moduleIndex = orientationProgress.modules.findIndex(m => m.moduleId === moduleId);
      if (moduleIndex === -1) {
        throw new Error('Module not found');
      }

      orientationProgress.modules[moduleIndex].progress = Math.min(progress, 100);

      if (orientationProgress.modules[moduleIndex].status === 'not_started') {
        orientationProgress.modules[moduleIndex].status = 'in_progress';
        orientationProgress.modules[moduleIndex].startedAt = new Date();
      }

      // Save progress
      await this.saveProgress(userId, orientationProgress);

      return orientationProgress;
    } catch (error) {
      logger.error('Error updating module progress', { error, userId, moduleId });
      throw error;
    }
  }

  /**
   * Issue orientation certificate
   */
  private async issueOrientationCertificate(userId: string): Promise<void> {
    try {
      // Award ScrollCoins
      await prisma.scrollCoinTransaction.create({
        data: {
          userId,
          amount: 50,
          type: 'EARNED',
          description: 'Orientation completion reward',
          activityType: 'COURSE_COMPLETION'
        }
      });

      await prisma.user.update({
        where: { id: userId },
        data: {
          scrollCoinBalance: {
            increment: 50
          }
        }
      });

      logger.info('Orientation certificate issued', { userId });
    } catch (error) {
      logger.error('Error issuing certificate', { error, userId });
    }
  }

  /**
   * Save orientation progress
   */
  private async saveProgress(userId: string, progress: OrientationProgress): Promise<void> {
    await prisma.userPreferences.update({
      where: { userId },
      data: {
        learningPreferences: {
          orientationProgress: progress
        }
      }
    });
  }

  /**
   * Get all orientation modules
   */
  async getAllModules(): Promise<OrientationModule[]> {
    return this.orientationModules;
  }

  /**
   * Reset orientation
   */
  async resetOrientation(userId: string): Promise<OrientationProgress> {
    try {
      logger.info('Resetting orientation', { userId });

      const preferences = await prisma.userPreferences.findUnique({
        where: { userId }
      });

      if (preferences) {
        const learningPrefs = preferences.learningPreferences as any;
        delete learningPrefs.orientationProgress;

        await prisma.userPreferences.update({
          where: { userId },
          data: {
            learningPreferences: learningPrefs
          }
        });
      }

      return this.initializeOrientation(userId);
    } catch (error) {
      logger.error('Error resetting orientation', { error, userId });
      throw error;
    }
  }
}

export default new OrientationModuleService();
