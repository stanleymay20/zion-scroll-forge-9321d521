/**
 * Feature Flag Service
 * Manages feature flags for gradual rollout
 * Requirements: 13.1
 */

import { logger } from '../utils/logger';

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  targetUsers?: string[];
  targetRoles?: string[];
  environment?: string[];
  startDate?: Date;
  endDate?: Date;
  metadata?: Record<string, any>;
}

interface FeatureFlagEvaluation {
  flagId: string;
  enabled: boolean;
  reason: string;
  variant?: string;
}

export default class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();

  constructor() {
    this.initializeFlags();
  }

  /**
   * Initialize feature flags
   */
  private initializeFlags(): void {
    const defaultFlags: FeatureFlag[] = [
      {
        id: 'ai-tutor-video-avatar',
        name: 'AI Tutor Video Avatar',
        description: 'Enable video avatar for AI tutor interactions',
        enabled: true,
        rolloutPercentage: 50,
        environment: ['production']
      },
      {
        id: 'scrollcoin-rewards',
        name: 'ScrollCoin Rewards',
        description: 'Enable ScrollCoin earning and spending',
        enabled: true,
        rolloutPercentage: 100,
        environment: ['production', 'staging']
      },
      {
        id: 'scrollbadge-nft',
        name: 'ScrollBadge NFT',
        description: 'Enable NFT badge minting for course completion',
        enabled: true,
        rolloutPercentage: 75,
        environment: ['production']
      },
      {
        id: 'ai-grading',
        name: 'AI-Powered Grading',
        description: 'Enable AI-assisted essay grading',
        enabled: true,
        rolloutPercentage: 100,
        targetRoles: ['faculty', 'admin']
      },
      {
        id: 'real-time-collaboration',
        name: 'Real-time Collaboration',
        description: 'Enable real-time document collaboration in study groups',
        enabled: true,
        rolloutPercentage: 80
      },
      {
        id: 'advanced-analytics',
        name: 'Advanced Analytics',
        description: 'Enable predictive analytics and ML-powered insights',
        enabled: true,
        rolloutPercentage: 100,
        targetRoles: ['admin', 'faculty']
      },
      {
        id: 'mobile-offline-mode',
        name: 'Mobile Offline Mode',
        description: 'Enable offline content access on mobile devices',
        enabled: true,
        rolloutPercentage: 90
      },
      {
        id: 'spiritual-formation-ai',
        name: 'AI Spiritual Formation',
        description: 'Enable AI-powered spiritual growth recommendations',
        enabled: true,
        rolloutPercentage: 60
      },
      {
        id: 'multilingual-support',
        name: 'Multilingual Support',
        description: 'Enable multi-language interface and content',
        enabled: true,
        rolloutPercentage: 100
      },
      {
        id: 'xr-classroom',
        name: 'XR Classroom',
        description: 'Enable extended reality immersive learning',
        enabled: false,
        rolloutPercentage: 10,
        environment: ['staging']
      },
      {
        id: 'peer-review-system',
        name: 'Peer Review System',
        description: 'Enable peer-to-peer assignment reviews',
        enabled: true,
        rolloutPercentage: 70
      },
      {
        id: 'career-pathways',
        name: 'Career Pathways',
        description: 'Enable career guidance and job matching',
        enabled: true,
        rolloutPercentage: 85
      },
      {
        id: 'live-streaming',
        name: 'Live Streaming',
        description: 'Enable live lecture streaming',
        enabled: true,
        rolloutPercentage: 100,
        targetRoles: ['faculty']
      },
      {
        id: 'gamification',
        name: 'Gamification',
        description: 'Enable achievement badges and leaderboards',
        enabled: true,
        rolloutPercentage: 95
      },
      {
        id: 'social-learning',
        name: 'Social Learning',
        description: 'Enable social feed and community features',
        enabled: true,
        rolloutPercentage: 100
      }
    ];

    defaultFlags.forEach(flag => {
      this.flags.set(flag.id, flag);
    });

    logger.info('Feature flags initialized', { count: this.flags.size });
  }

  /**
   * Check if feature is enabled for user
   */
  async isEnabled(
    flagId: string,
    userId?: string,
    userRole?: string,
    environment?: string
  ): Promise<boolean> {
    const evaluation = await this.evaluateFlag(flagId, userId, userRole, environment);
    return evaluation.enabled;
  }

  /**
   * Evaluate feature flag
   */
  async evaluateFlag(
    flagId: string,
    userId?: string,
    userRole?: string,
    environment?: string
  ): Promise<FeatureFlagEvaluation> {
    const flag = this.flags.get(flagId);

    if (!flag) {
      logger.warn('Feature flag not found', { flagId });
      return {
        flagId,
        enabled: false,
        reason: 'Flag not found'
      };
    }

    // Check if flag is globally disabled
    if (!flag.enabled) {
      return {
        flagId,
        enabled: false,
        reason: 'Flag globally disabled'
      };
    }

    // Check environment
    if (flag.environment && environment) {
      if (!flag.environment.includes(environment)) {
        return {
          flagId,
          enabled: false,
          reason: `Not enabled for environment: ${environment}`
        };
      }
    }

    // Check date range
    const now = new Date();
    if (flag.startDate && now < flag.startDate) {
      return {
        flagId,
        enabled: false,
        reason: 'Feature not yet available'
      };
    }
    if (flag.endDate && now > flag.endDate) {
      return {
        flagId,
        enabled: false,
        reason: 'Feature expired'
      };
    }

    // Check target users
    if (flag.targetUsers && userId) {
      if (flag.targetUsers.includes(userId)) {
        return {
          flagId,
          enabled: true,
          reason: 'User in target list'
        };
      }
    }

    // Check target roles
    if (flag.targetRoles && userRole) {
      if (!flag.targetRoles.includes(userRole)) {
        return {
          flagId,
          enabled: false,
          reason: `Role ${userRole} not in target roles`
        };
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const userHash = userId ? this.hashUserId(userId) : Math.random();
      const inRollout = userHash < (flag.rolloutPercentage / 100);

      return {
        flagId,
        enabled: inRollout,
        reason: inRollout
          ? `User in ${flag.rolloutPercentage}% rollout`
          : `User not in ${flag.rolloutPercentage}% rollout`
      };
    }

    // Flag is fully enabled
    return {
      flagId,
      enabled: true,
      reason: 'Flag fully enabled'
    };
  }

  /**
   * Hash user ID for consistent rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash % 100) / 100;
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.flags.values());
  }

  /**
   * Get feature flag by ID
   */
  async getFlag(flagId: string): Promise<FeatureFlag | null> {
    return this.flags.get(flagId) || null;
  }

  /**
   * Update feature flag
   */
  async updateFlag(
    flagId: string,
    updates: Partial<FeatureFlag>
  ): Promise<FeatureFlag> {
    const flag = this.flags.get(flagId);

    if (!flag) {
      throw new Error(`Feature flag not found: ${flagId}`);
    }

    const updatedFlag = {
      ...flag,
      ...updates
    };

    this.flags.set(flagId, updatedFlag);

    logger.info('Feature flag updated', {
      flagId,
      updates
    });

    return updatedFlag;
  }

  /**
   * Enable feature flag
   */
  async enableFlag(flagId: string, rolloutPercentage: number = 100): Promise<void> {
    await this.updateFlag(flagId, {
      enabled: true,
      rolloutPercentage
    });

    logger.info('Feature flag enabled', { flagId, rolloutPercentage });
  }

  /**
   * Disable feature flag
   */
  async disableFlag(flagId: string): Promise<void> {
    await this.updateFlag(flagId, {
      enabled: false
    });

    logger.info('Feature flag disabled', { flagId });
  }

  /**
   * Gradually increase rollout
   */
  async increaseRollout(flagId: string, percentage: number): Promise<void> {
    const flag = this.flags.get(flagId);

    if (!flag) {
      throw new Error(`Feature flag not found: ${flagId}`);
    }

    const newPercentage = Math.min(100, flag.rolloutPercentage + percentage);

    await this.updateFlag(flagId, {
      rolloutPercentage: newPercentage
    });

    logger.info('Feature flag rollout increased', {
      flagId,
      oldPercentage: flag.rolloutPercentage,
      newPercentage
    });
  }

  /**
   * Get flags for user
   */
  async getFlagsForUser(
    userId: string,
    userRole?: string,
    environment?: string
  ): Promise<Record<string, boolean>> {
    const flags: Record<string, boolean> = {};

    for (const [flagId] of this.flags) {
      flags[flagId] = await this.isEnabled(flagId, userId, userRole, environment);
    }

    return flags;
  }

  /**
   * Create new feature flag
   */
  async createFlag(flag: FeatureFlag): Promise<FeatureFlag> {
    if (this.flags.has(flag.id)) {
      throw new Error(`Feature flag already exists: ${flag.id}`);
    }

    this.flags.set(flag.id, flag);

    logger.info('Feature flag created', { flagId: flag.id });

    return flag;
  }

  /**
   * Delete feature flag
   */
  async deleteFlag(flagId: string): Promise<void> {
    if (!this.flags.has(flagId)) {
      throw new Error(`Feature flag not found: ${flagId}`);
    }

    this.flags.delete(flagId);

    logger.info('Feature flag deleted', { flagId });
  }

  /**
   * Get flag statistics
   */
  async getFlagStatistics(flagId: string): Promise<any> {
    const flag = this.flags.get(flagId);

    if (!flag) {
      throw new Error(`Feature flag not found: ${flagId}`);
    }

    // In production, fetch actual usage statistics from database
    return {
      flagId,
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
      estimatedUsers: 0, // Calculate based on total users
      actualUsers: 0, // Track actual usage
      lastEvaluated: new Date()
    };
  }

  /**
   * Export flags configuration
   */
  async exportFlags(): Promise<string> {
    const flags = Array.from(this.flags.values());
    return JSON.stringify(flags, null, 2);
  }

  /**
   * Import flags configuration
   */
  async importFlags(flagsJson: string): Promise<void> {
    const flags: FeatureFlag[] = JSON.parse(flagsJson);

    flags.forEach(flag => {
      this.flags.set(flag.id, flag);
    });

    logger.info('Feature flags imported', { count: flags.length });
  }
}
