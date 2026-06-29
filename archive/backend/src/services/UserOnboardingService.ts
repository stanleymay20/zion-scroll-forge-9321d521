/**
 * User Onboarding Service
 * Manages user onboarding flow and welcome emails
 * Requirements: 10.2, 10.3
 */

import { logger } from '../utils/logger';

interface OnboardingFlow {
  id: string;
  userId: string;
  userType: 'student' | 'faculty' | 'admin';
  currentStep: number;
  totalSteps: number;
  steps: OnboardingStep[];
  startedAt: Date;
  completedAt?: Date;
  status: 'in_progress' | 'completed' | 'abandoned';
}

interface OnboardingStep {
  id: string;
  order: number;
  title: string;
  description: string;
  type: 'profile' | 'preferences' | 'tour' | 'tutorial' | 'verification';
  required: boolean;
  completed: boolean;
  completedAt?: Date;
  data?: any;
}

interface WelcomeEmail {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export default class UserOnboardingService {
  /**
   * Start onboarding flow for new user
   */
  async startOnboarding(
    userId: string,
    userType: 'student' | 'faculty' | 'admin',
    userData: any
  ): Promise<OnboardingFlow> {
    try {
      logger.info('Starting onboarding flow', { userId, userType });

      const steps = this.getOnboardingSteps(userType);

      const flow: OnboardingFlow = {
        id: `onboarding-${userId}-${Date.now()}`,
        userId,
        userType,
        currentStep: 0,
        totalSteps: steps.length,
        steps,
        startedAt: new Date(),
        status: 'in_progress'
      };

      // Send welcome email
      await this.sendWelcomeEmail(userData, userType);

      // Track onboarding start
      logger.info('Onboarding flow started', {
        userId,
        flowId: flow.id,
        totalSteps: flow.totalSteps
      });

      return flow;
    } catch (error) {
      logger.error('Failed to start onboarding', { error, userId });
      throw error;
    }
  }

  /**
   * Get onboarding steps based on user type
   */
  private getOnboardingSteps(userType: string): OnboardingStep[] {
    const commonSteps: OnboardingStep[] = [
      {
        id: 'step-profile',
        order: 1,
        title: 'Complete Your Profile',
        description: 'Add your photo, bio, and contact information',
        type: 'profile',
        required: true,
        completed: false
      },
      {
        id: 'step-preferences',
        order: 2,
        title: 'Set Your Preferences',
        description: 'Choose your language, timezone, and notification settings',
        type: 'preferences',
        required: false,
        completed: false
      }
    ];

    if (userType === 'student') {
      return [
        ...commonSteps,
        {
          id: 'step-spiritual-profile',
          order: 3,
          title: 'Spiritual Formation Profile',
          description: 'Share your spiritual journey and growth goals',
          type: 'profile',
          required: true,
          completed: false
        },
        {
          id: 'step-course-interests',
          order: 4,
          title: 'Select Course Interests',
          description: 'Tell us what subjects interest you',
          type: 'preferences',
          required: false,
          completed: false
        },
        {
          id: 'step-platform-tour',
          order: 5,
          title: 'Platform Tour',
          description: 'Take a guided tour of ScrollUniversity features',
          type: 'tour',
          required: false,
          completed: false
        },
        {
          id: 'step-ai-tutor-intro',
          order: 6,
          title: 'Meet Your AI Tutor',
          description: 'Introduction to AI-powered learning assistance',
          type: 'tutorial',
          required: false,
          completed: false
        },
        {
          id: 'step-scrollcoin-wallet',
          order: 7,
          title: 'Set Up ScrollCoin Wallet',
          description: 'Create your digital wallet for earning rewards',
          type: 'tutorial',
          required: false,
          completed: false
        }
      ];
    } else if (userType === 'faculty') {
      return [
        ...commonSteps,
        {
          id: 'step-teaching-profile',
          order: 3,
          title: 'Teaching Profile',
          description: 'Add your credentials, expertise, and teaching philosophy',
          type: 'profile',
          required: true,
          completed: false
        },
        {
          id: 'step-course-setup',
          order: 4,
          title: 'Course Setup Tutorial',
          description: 'Learn how to create and manage courses',
          type: 'tutorial',
          required: false,
          completed: false
        },
        {
          id: 'step-grading-tools',
          order: 5,
          title: 'Grading Tools Overview',
          description: 'Explore AI-assisted grading and feedback tools',
          type: 'tutorial',
          required: false,
          completed: false
        },
        {
          id: 'step-faculty-resources',
          order: 6,
          title: 'Faculty Resources',
          description: 'Access teaching resources and support materials',
          type: 'tutorial',
          required: false,
          completed: false
        }
      ];
    } else if (userType === 'admin') {
      return [
        ...commonSteps,
        {
          id: 'step-admin-dashboard',
          order: 3,
          title: 'Admin Dashboard Tour',
          description: 'Overview of administrative functions and tools',
          type: 'tour',
          required: true,
          completed: false
        },
        {
          id: 'step-user-management',
          order: 4,
          title: 'User Management',
          description: 'Learn to manage users, roles, and permissions',
          type: 'tutorial',
          required: true,
          completed: false
        },
        {
          id: 'step-analytics-reporting',
          order: 5,
          title: 'Analytics & Reporting',
          description: 'Explore analytics dashboards and reporting tools',
          type: 'tutorial',
          required: false,
          completed: false
        },
        {
          id: 'step-system-configuration',
          order: 6,
          title: 'System Configuration',
          description: 'Configure platform settings and integrations',
          type: 'tutorial',
          required: false,
          completed: false
        }
      ];
    }

    return commonSteps;
  }

  /**
   * Complete onboarding step
   */
  async completeStep(
    flowId: string,
    stepId: string,
    stepData?: any
  ): Promise<OnboardingFlow> {
    try {
      logger.info('Completing onboarding step', { flowId, stepId });

      // In production, fetch flow from database
      // For now, simulate step completion
      
      const flow: OnboardingFlow = {
        id: flowId,
        userId: 'user-123',
        userType: 'student',
        currentStep: 1,
        totalSteps: 7,
        steps: this.getOnboardingSteps('student'),
        startedAt: new Date(),
        status: 'in_progress'
      };

      const step = flow.steps.find(s => s.id === stepId);
      if (step) {
        step.completed = true;
        step.completedAt = new Date();
        step.data = stepData;

        flow.currentStep++;

        // Check if all required steps are completed
        const allRequiredCompleted = flow.steps
          .filter(s => s.required)
          .every(s => s.completed);

        if (allRequiredCompleted && flow.currentStep >= flow.totalSteps) {
          flow.status = 'completed';
          flow.completedAt = new Date();

          // Send completion email
          await this.sendOnboardingCompletionEmail(flow.userId);
        }
      }

      logger.info('Onboarding step completed', {
        flowId,
        stepId,
        currentStep: flow.currentStep,
        status: flow.status
      });

      return flow;
    } catch (error) {
      logger.error('Failed to complete onboarding step', { error, flowId, stepId });
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  private async sendWelcomeEmail(
    userData: any,
    userType: string
  ): Promise<void> {
    const templates = {
      student: this.getStudentWelcomeEmail(userData),
      faculty: this.getFacultyWelcomeEmail(userData),
      admin: this.getAdminWelcomeEmail(userData)
    };

    const email = templates[userType as keyof typeof templates];

    logger.info('Sending welcome email', {
      to: email.to,
      userType
    });

    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    // await emailService.send(email);
  }

  /**
   * Get student welcome email
   */
  private getStudentWelcomeEmail(userData: any): WelcomeEmail {
    return {
      to: userData.email,
      subject: 'Welcome to ScrollUniversity - Begin Your Kingdom Education Journey',
      template: 'student-welcome',
      data: {
        firstName: userData.firstName,
        loginUrl: `${process.env.FRONTEND_URL}/login`,
        dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@scrolluniversity.com',
        content: `
Dear ${userData.firstName},

Welcome to ScrollUniversity! We're thrilled to have you join our community of learners pursuing kingdom-focused education.

Your account has been created successfully. Here's what you can do next:

1. **Complete Your Profile**: Add your photo and tell us about your spiritual journey
2. **Explore Courses**: Browse our comprehensive course catalog
3. **Meet Your AI Tutor**: Get personalized learning assistance 24/7
4. **Join the Community**: Connect with fellow students and faculty
5. **Set Up Your ScrollCoin Wallet**: Start earning rewards for your achievements

Getting Started:
- Login: ${process.env.FRONTEND_URL}/login
- Dashboard: ${process.env.FRONTEND_URL}/dashboard
- Help Center: ${process.env.FRONTEND_URL}/help

Need Help?
Our support team is here for you at ${process.env.SUPPORT_EMAIL || 'support@scrolluniversity.com'}

Blessings on your educational journey!

The ScrollUniversity Team
        `
      }
    };
  }

  /**
   * Get faculty welcome email
   */
  private getFacultyWelcomeEmail(userData: any): WelcomeEmail {
    return {
      to: userData.email,
      subject: 'Welcome to ScrollUniversity Faculty',
      template: 'faculty-welcome',
      data: {
        firstName: userData.firstName,
        loginUrl: `${process.env.FRONTEND_URL}/login`,
        facultyDashboardUrl: `${process.env.FRONTEND_URL}/faculty`,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@scrolluniversity.com',
        content: `
Dear Professor ${userData.lastName},

Welcome to the ScrollUniversity faculty! We're honored to have you join our team of educators committed to kingdom-focused learning.

Your faculty account is now active. Here's how to get started:

1. **Complete Your Teaching Profile**: Share your credentials and teaching philosophy
2. **Create Your First Course**: Use our AI-assisted course creation tools
3. **Explore Grading Tools**: Discover AI-powered grading and feedback features
4. **Access Faculty Resources**: Find teaching materials and support
5. **Connect with Students**: Build meaningful relationships with learners

Faculty Resources:
- Faculty Dashboard: ${process.env.FRONTEND_URL}/faculty
- Course Creation: ${process.env.FRONTEND_URL}/faculty/courses/create
- Teaching Resources: ${process.env.FRONTEND_URL}/faculty/resources

Support:
Contact us at ${process.env.SUPPORT_EMAIL || 'support@scrolluniversity.com'}

We're excited to partner with you in transforming education!

The ScrollUniversity Team
        `
      }
    };
  }

  /**
   * Get admin welcome email
   */
  private getAdminWelcomeEmail(userData: any): WelcomeEmail {
    return {
      to: userData.email,
      subject: 'ScrollUniversity Admin Access Granted',
      template: 'admin-welcome',
      data: {
        firstName: userData.firstName,
        loginUrl: `${process.env.FRONTEND_URL}/login`,
        adminDashboardUrl: `${process.env.FRONTEND_URL}/admin`,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@scrolluniversity.com',
        content: `
Dear ${userData.firstName},

Your administrator account for ScrollUniversity has been created.

Admin Access:
- Admin Dashboard: ${process.env.FRONTEND_URL}/admin
- User Management: ${process.env.FRONTEND_URL}/admin/users
- System Configuration: ${process.env.FRONTEND_URL}/admin/settings

Please complete the admin onboarding to familiarize yourself with the platform's administrative functions.

For technical support, contact: ${process.env.SUPPORT_EMAIL || 'support@scrolluniversity.com'}

The ScrollUniversity Team
        `
      }
    };
  }

  /**
   * Send onboarding completion email
   */
  private async sendOnboardingCompletionEmail(userId: string): Promise<void> {
    logger.info('Sending onboarding completion email', { userId });

    // In production, fetch user data and send completion email
    // await emailService.send({
    //   to: user.email,
    //   subject: 'Onboarding Complete - Start Learning!',
    //   template: 'onboarding-complete',
    //   data: { ... }
    // });
  }

  /**
   * Get onboarding progress
   */
  async getOnboardingProgress(userId: string): Promise<OnboardingFlow | null> {
    try {
      // In production, fetch from database
      logger.info('Fetching onboarding progress', { userId });
      return null;
    } catch (error) {
      logger.error('Failed to fetch onboarding progress', { error, userId });
      throw error;
    }
  }

  /**
   * Skip optional step
   */
  async skipStep(flowId: string, stepId: string): Promise<OnboardingFlow> {
    logger.info('Skipping onboarding step', { flowId, stepId });
    
    // Mark step as skipped but move to next step
    return this.completeStep(flowId, stepId, { skipped: true });
  }

  /**
   * Abandon onboarding
   */
  async abandonOnboarding(flowId: string): Promise<void> {
    logger.info('Abandoning onboarding', { flowId });

    // In production, update flow status in database
    // Send re-engagement email after some time
  }

  /**
   * Resume onboarding
   */
  async resumeOnboarding(userId: string): Promise<OnboardingFlow | null> {
    logger.info('Resuming onboarding', { userId });

    // In production, fetch incomplete flow and resume
    return null;
  }
}
