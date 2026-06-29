// Onboarding Workflow Service
// "I will instruct you and teach you in the way you should go" - Psalm 32:8

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import {
  OnboardingProgress,
  OnboardingStep,
  WelcomeEmailData
} from '../types/enrollment.types';

const prisma = new PrismaClient();

export class OnboardingWorkflowService {
  private readonly onboardingSteps: Omit<OnboardingStep, 'isCompleted' | 'completedAt'>[] = [
    {
      stepId: 'welcome',
      title: 'Welcome to ScrollUniversity',
      description: 'Learn about our mission and kingdom-focused education',
      order: 1,
      isRequired: true,
      content: {
        type: 'video',
        url: '/onboarding/welcome-video',
        duration: 5
      }
    },
    {
      stepId: 'profile_setup',
      title: 'Complete Your Profile',
      description: 'Tell us about yourself and your calling',
      order: 2,
      isRequired: true,
      content: {
        type: 'form',
        fields: ['bio', 'scrollCalling', 'spiritualGifts', 'kingdomVision']
      }
    },
    {
      stepId: 'spiritual_assessment',
      title: 'Spiritual Formation Assessment',
      description: 'Discover your spiritual gifts and calling',
      order: 3,
      isRequired: true,
      content: {
        type: 'assessment',
        assessmentId: 'spiritual_gifts'
      }
    },
    {
      stepId: 'platform_tour',
      title: 'Platform Tour',
      description: 'Explore the features and tools available to you',
      order: 4,
      isRequired: true,
      content: {
        type: 'interactive',
        tourSteps: [
          'dashboard',
          'courses',
          'ai_tutor',
          'community',
          'spiritual_formation',
          'scrollcoin_wallet'
        ]
      }
    },
    {
      stepId: 'course_selection',
      title: 'Choose Your First Course',
      description: 'Browse our course catalog and enroll in your first course',
      order: 5,
      isRequired: true,
      content: {
        type: 'course_browser',
        recommendations: true
      }
    },
    {
      stepId: 'advisor_introduction',
      title: 'Meet Your Academic Advisor',
      description: 'Connect with your assigned advisor',
      order: 6,
      isRequired: false,
      content: {
        type: 'advisor_profile',
        scheduleEnabled: true
      }
    },
    {
      stepId: 'community_introduction',
      title: 'Join the Community',
      description: 'Introduce yourself and connect with fellow students',
      order: 7,
      isRequired: false,
      content: {
        type: 'community_post',
        template: 'introduction'
      }
    },
    {
      stepId: 'scrollcoin_tutorial',
      title: 'Understanding ScrollCoin',
      description: 'Learn about our divine economy and how to earn rewards',
      order: 8,
      isRequired: false,
      content: {
        type: 'tutorial',
        topics: ['earning', 'spending', 'wallet_management']
      }
    },
    {
      stepId: 'spiritual_formation_setup',
      title: 'Set Up Spiritual Formation',
      description: 'Configure your daily devotions, prayer journal, and scripture memory',
      order: 9,
      isRequired: false,
      content: {
        type: 'setup',
        modules: ['devotions', 'prayer', 'scripture_memory']
      }
    },
    {
      stepId: 'completion',
      title: 'Onboarding Complete',
      description: 'You are ready to begin your journey!',
      order: 10,
      isRequired: true,
      content: {
        type: 'celebration',
        reward: {
          scrollCoins: 100,
          badge: 'onboarding_complete'
        }
      }
    }
  ];

  /**
   * Initialize onboarding for a new student
   */
  async initializeOnboarding(userId: string): Promise<OnboardingProgress> {
    try {
      logger.info('Initializing onboarding', { userId });

      // Check if onboarding already exists
      const existingProgress = await this.getOnboardingProgress(userId);
      if (existingProgress) {
        return existingProgress;
      }

      // Create onboarding progress record
      const steps = this.onboardingSteps.map(step => ({
        ...step,
        isCompleted: false,
        completedAt: undefined
      }));

      const progress: OnboardingProgress = {
        userId,
        totalSteps: steps.length,
        completedSteps: 0,
        currentStep: 1,
        completionPercentage: 0,
        steps,
        startedAt: new Date()
      };

      // Store in database (using user preferences or a separate table)
      await prisma.userPreferences.upsert({
        where: { userId },
        create: {
          userId,
          learningPreferences: {
            onboardingProgress: progress
          }
        },
        update: {
          learningPreferences: {
            onboardingProgress: progress
          }
        }
      });

      logger.info('Onboarding initialized', { userId });
      return progress;
    } catch (error) {
      logger.error('Error initializing onboarding', { error, userId });
      throw error;
    }
  }

  /**
   * Get onboarding progress
   */
  async getOnboardingProgress(userId: string): Promise<OnboardingProgress | null> {
    try {
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId }
      });

      if (!preferences || !preferences.learningPreferences) {
        return null;
      }

      const learningPrefs = preferences.learningPreferences as any;
      return learningPrefs.onboardingProgress || null;
    } catch (error) {
      logger.error('Error getting onboarding progress', { error, userId });
      throw error;
    }
  }

  /**
   * Complete an onboarding step
   */
  async completeStep(userId: string, stepId: string): Promise<OnboardingProgress> {
    try {
      logger.info('Completing onboarding step', { userId, stepId });

      const progress = await this.getOnboardingProgress(userId);
      if (!progress) {
        throw new Error('Onboarding not initialized');
      }

      // Find and update the step
      const stepIndex = progress.steps.findIndex(s => s.stepId === stepId);
      if (stepIndex === -1) {
        throw new Error('Step not found');
      }

      if (progress.steps[stepIndex].isCompleted) {
        return progress; // Already completed
      }

      progress.steps[stepIndex].isCompleted = true;
      progress.steps[stepIndex].completedAt = new Date();
      progress.completedSteps++;
      progress.completionPercentage = Math.round(
        (progress.completedSteps / progress.totalSteps) * 100
      );

      // Update current step to next incomplete step
      const nextIncompleteStep = progress.steps.find(s => !s.isCompleted);
      if (nextIncompleteStep) {
        progress.currentStep = nextIncompleteStep.order;
      }

      // Check if onboarding is complete
      if (progress.completedSteps === progress.totalSteps) {
        progress.completedAt = new Date();
        await this.awardOnboardingCompletion(userId);
      }

      // Save progress
      await prisma.userPreferences.update({
        where: { userId },
        data: {
          learningPreferences: {
            onboardingProgress: progress
          }
        }
      });

      logger.info('Onboarding step completed', { userId, stepId });
      return progress;
    } catch (error) {
      logger.error('Error completing onboarding step', { error, userId, stepId });
      throw error;
    }
  }

  /**
   * Award completion rewards
   */
  private async awardOnboardingCompletion(userId: string): Promise<void> {
    try {
      // Award ScrollCoins
      await prisma.scrollCoinTransaction.create({
        data: {
          userId,
          amount: 100,
          type: 'EARNED',
          description: 'Onboarding completion reward',
          activityType: 'COURSE_COMPLETION'
        }
      });

      await prisma.user.update({
        where: { id: userId },
        data: {
          scrollCoinBalance: {
            increment: 100
          }
        }
      });

      logger.info('Onboarding completion rewards awarded', { userId });
    } catch (error) {
      logger.error('Error awarding onboarding completion', { error, userId });
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const enrollments = await prisma.enrollment.findMany({
        where: { userId },
        include: { course: true }
      });

      const emailData: WelcomeEmailData = {
        studentName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        enrollmentDate: new Date(),
        coursesEnrolled: enrollments.map(e => e.course.title),
        nextSteps: [
          'Complete your profile',
          'Take the spiritual formation assessment',
          'Explore the platform tour',
          'Choose your first course',
          'Meet your academic advisor'
        ],
        platformResources: [
          {
            title: 'Getting Started Guide',
            description: 'Learn the basics of ScrollUniversity',
            url: '/resources/getting-started',
            type: 'guide',
            category: 'onboarding'
          },
          {
            title: 'Platform Tutorial Videos',
            description: 'Watch video tutorials for each feature',
            url: '/resources/tutorials',
            type: 'video',
            category: 'tutorials'
          },
          {
            title: 'Student Handbook',
            description: 'Comprehensive guide to student life',
            url: '/resources/handbook',
            type: 'documentation',
            category: 'reference'
          }
        ]
      };

      // TODO: Integrate with email service
      logger.info('Welcome email prepared', { userId, email: user.email });

      // For now, just log the email data
      logger.debug('Welcome email data', emailData);
    } catch (error) {
      logger.error('Error sending welcome email', { error, userId });
      throw error;
    }
  }

  /**
   * Skip optional step
   */
  async skipStep(userId: string, stepId: string): Promise<OnboardingProgress> {
    try {
      const progress = await this.getOnboardingProgress(userId);
      if (!progress) {
        throw new Error('Onboarding not initialized');
      }

      const step = progress.steps.find(s => s.stepId === stepId);
      if (!step) {
        throw new Error('Step not found');
      }

      if (step.isRequired) {
        throw new Error('Cannot skip required step');
      }

      // Mark as completed (skipped)
      return this.completeStep(userId, stepId);
    } catch (error) {
      logger.error('Error skipping onboarding step', { error, userId, stepId });
      throw error;
    }
  }

  /**
   * Reset onboarding
   */
  async resetOnboarding(userId: string): Promise<OnboardingProgress> {
    try {
      logger.info('Resetting onboarding', { userId });

      await prisma.userPreferences.update({
        where: { userId },
        data: {
          learningPreferences: {}
        }
      });

      return this.initializeOnboarding(userId);
    } catch (error) {
      logger.error('Error resetting onboarding', { error, userId });
      throw error;
    }
  }
}

export default new OnboardingWorkflowService();
