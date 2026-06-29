/**
 * ScrollUniversity Admissions - Suspicious Activity Monitoring Service
 * "Many are called, but few are chosen" - Matthew 22:14
 * 
 * Real-time monitoring and alerting for suspicious activities
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import crypto from 'crypto';

export interface ActivityMonitoringConfig {
  thresholds: {
    rapidSubmissions: number;
    duplicateDocuments: number;
    failedVerifications: number;
    suspiciousIPs: number;
    behavioralAnomalies: number;
  };
  timeWindows: {
    rapidSubmissions: number; // minutes
    failedVerifications: number; // minutes
    behavioralAnalysis: number; // minutes
  };
  alertLevels: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  autoActions: {
    enableAutoBlock: boolean;
    enableAutoEscalation: boolean;
    enableRealTimeAlerts: boolean;
  };
}

export interface SuspiciousActivity {
  id?: string;
  applicantId: string;
  activityType: ActivityType;
  severity: SeverityLevel;
  description: string;
  evidence: ActivityEvidence[];
  riskScore: number;
  timestamp: Date;
  status: 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  investigatorId?: string;
  resolution?: string;
  metadata: Record<string, any>;
}

export type ActivityType = 
  | 'RAPID_SUBMISSIONS'
  | 'DUPLICATE_DOCUMENTS'
  | 'FAILED_VERIFICATIONS'
  | 'SUSPICIOUS_IP'
  | 'BEHAVIORAL_ANOMALY'
  | 'IDENTITY_MISMATCH'
  | 'DOCUMENT_TAMPERING'
  | 'AUTOMATED_BEHAVIOR'
  | 'LOCATION_INCONSISTENCY'
  | 'TIME_PATTERN_ANOMALY';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ActivityEvidence {
  type: 'SYSTEM_LOG' | 'USER_ACTION' | 'DOCUMENT_ANALYSIS' | 'NETWORK_DATA' | 'BEHAVIORAL_DATA';
  description: string;
  data: any;
  timestamp: Date;
  confidence: number;
}

export interface MonitoringAlert {
  id: string;
  applicantId: string;
  alertType: ActivityType;
  severity: SeverityLevel;
  title: string;
  description: string;
  evidence: ActivityEvidence[];
  recommendedActions: string[];
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED';
}

export interface BehavioralPattern {
  applicantId: string;
  sessionDuration: number[];
  clickPatterns: ClickPattern[];
  navigationPaths: string[];
  typingPatterns: TypingPattern[];
  timePatterns: TimePattern[];
  deviceFingerprints: string[];
  ipAddresses: string[];
}

export interface ClickPattern {
  timestamp: Date;
  elementType: string;
  coordinates: { x: number; y: number };
  duration: number;
}

export interface TypingPattern {
  timestamp: Date;
  keystrokeInterval: number;
  pauseDuration: number;
  correctionCount: number;
}

export interface TimePattern {
  loginTime: Date;
  sessionDuration: number;
  activityLevel: number;
  timezone: string;
}

export interface NetworkAnalysis {
  ipAddress: string;
  location: string;
  isp: string;
  isProxy: boolean;
  isVPN: boolean;
  riskScore: number;
  previousSessions: number;
  concurrentSessions: number;
}

export class SuspiciousActivityMonitoringService {
  private config: ActivityMonitoringConfig;
  private activeMonitors: Map<string, NodeJS.Timeout> = new Map();
  private behavioralBaselines: Map<string, BehavioralPattern> = new Map();

  constructor(private prisma: PrismaClient) {
    this.config = this.initializeConfig();
    this.startContinuousMonitoring();
  }

  /**
   * Initialize monitoring configuration
   */
  private initializeConfig(): ActivityMonitoringConfig {
    return {
      thresholds: {
        rapidSubmissions: 5, // submissions per time window
        duplicateDocuments: 2, // duplicate instances
        failedVerifications: 3, // failed attempts per time window
        suspiciousIPs: 1, // suspicious IP indicators
        behavioralAnomalies: 0.7 // anomaly score threshold
      },
      timeWindows: {
        rapidSubmissions: 60, // 1 hour
        failedVerifications: 30, // 30 minutes
        behavioralAnalysis: 120 // 2 hours
      },
      alertLevels: {
        low: 0.3,
        medium: 0.5,
        high: 0.7,
        critical: 0.9
      },
      autoActions: {
        enableAutoBlock: true,
        enableAutoEscalation: true,
        enableRealTimeAlerts: true
      }
    };
  }

  /**
   * Start continuous monitoring processes
   */
  private startContinuousMonitoring(): void {
    // Monitor for rapid submissions every 5 minutes
    setInterval(() => {
      this.monitorRapidSubmissions();
    }, 5 * 60 * 1000);

    // Monitor for duplicate documents every 10 minutes
    setInterval(() => {
      this.monitorDuplicateDocuments();
    }, 10 * 60 * 1000);

    // Monitor for failed verifications every 15 minutes
    setInterval(() => {
      this.monitorFailedVerifications();
    }, 15 * 60 * 1000);

    // Analyze behavioral patterns every 30 minutes
    setInterval(() => {
      this.analyzeBehavioralPatterns();
    }, 30 * 60 * 1000);

    logger.info('Suspicious activity monitoring started');
  }

  /**
   * Monitor user activity in real-time
   */
  async monitorUserActivity(
    applicantId: string,
    activityData: any,
    networkData?: NetworkAnalysis
  ): Promise<void> {
    try {
      const suspiciousActivities: SuspiciousActivity[] = [];

      // Check for rapid submissions
      const rapidSubmissionCheck = await this.checkRapidSubmissions(applicantId);
      if (rapidSubmissionCheck.isSuspicious) {
        suspiciousActivities.push(rapidSubmissionCheck.activity);
      }

      // Check for behavioral anomalies
      const behavioralCheck = await this.checkBehavioralAnomalies(applicantId, activityData);
      if (behavioralCheck.isSuspicious) {
        suspiciousActivities.push(behavioralCheck.activity);
      }

      // Check network-related suspicious activities
      if (networkData) {
        const networkCheck = await this.checkNetworkAnomalies(applicantId, networkData);
        if (networkCheck.isSuspicious) {
          suspiciousActivities.push(networkCheck.activity);
        }
      }

      // Process detected suspicious activities
      for (const activity of suspiciousActivities) {
        await this.processSuspiciousActivity(activity);
      }

      // Update behavioral baseline
      await this.updateBehavioralBaseline(applicantId, activityData);

    } catch (error) {
      logger.error('User activity monitoring failed:', error);
    }
  }

  /**
   * Check for rapid submissions pattern
   */
  private async checkRapidSubmissions(applicantId: string): Promise<{
    isSuspicious: boolean;
    activity?: SuspiciousActivity;
  }> {
    const timeWindow = new Date(Date.now() - this.config.timeWindows.rapidSubmissions * 60 * 1000);
    
    const recentSubmissions = await this.prisma.documentVerificationLog.count({
      where: {
        applicantId,
        verifiedAt: {
          gte: timeWindow
        }
      }
    });

    if (recentSubmissions >= this.config.thresholds.rapidSubmissions) {
      const activity: SuspiciousActivity = {
        applicantId,
        activityType: 'RAPID_SUBMISSIONS',
        severity: recentSubmissions > this.config.thresholds.rapidSubmissions * 2 ? 'HIGH' : 'MEDIUM',
        description: `Rapid document submissions detected: ${recentSubmissions} submissions in ${this.config.timeWindows.rapidSubmissions} minutes`,
        evidence: [{
          type: 'SYSTEM_LOG',
          description: 'Document submission frequency analysis',
          data: { submissionCount: recentSubmissions, timeWindow: this.config.timeWindows.rapidSubmissions },
          timestamp: new Date(),
          confidence: 0.9
        }],
        riskScore: Math.min(1, recentSubmissions / this.config.thresholds.rapidSubmissions * 0.5),
        timestamp: new Date(),
        status: 'ACTIVE',
        metadata: {
          submissionCount: recentSubmissions,
          timeWindowMinutes: this.config.timeWindows.rapidSubmissions
        }
      };

      return { isSuspicious: true, activity };
    }

    return { isSuspicious: false };
  }

  /**
   * Check for behavioral anomalies
   */
  private async checkBehavioralAnomalies(
    applicantId: string,
    activityData: any
  ): Promise<{
    isSuspicious: boolean;
    activity?: SuspiciousActivity;
  }> {
    const baseline = this.behavioralBaselines.get(applicantId);
    if (!baseline) {
      // No baseline established yet
      return { isSuspicious: false };
    }

    const anomalyScore = this.calculateBehavioralAnomalyScore(activityData, baseline);
    
    if (anomalyScore >= this.config.thresholds.behavioralAnomalies) {
      const activity: SuspiciousActivity = {
        applicantId,
        activityType: 'BEHAVIORAL_ANOMALY',
        severity: anomalyScore > 0.9 ? 'CRITICAL' : anomalyScore > 0.8 ? 'HIGH' : 'MEDIUM',
        description: `Behavioral anomaly detected with score ${anomalyScore.toFixed(2)}`,
        evidence: [{
          type: 'BEHAVIORAL_DATA',
          description: 'Behavioral pattern analysis',
          data: { anomalyScore, currentBehavior: activityData, baseline },
          timestamp: new Date(),
          confidence: anomalyScore
        }],
        riskScore: anomalyScore,
        timestamp: new Date(),
        status: 'ACTIVE',
        metadata: {
          anomalyScore,
          behaviorType: this.identifyAnomalyType(activityData, baseline)
        }
      };

      return { isSuspicious: true, activity };
    }

    return { isSuspicious: false };
  }

  /**
   * Check for network-related anomalies
   */
  private async checkNetworkAnomalies(
    applicantId: string,
    networkData: NetworkAnalysis
  ): Promise<{
    isSuspicious: boolean;
    activity?: SuspiciousActivity;
  }> {
    const suspiciousIndicators: string[] = [];
    let riskScore = 0;

    // Check for proxy/VPN usage
    if (networkData.isProxy || networkData.isVPN) {
      suspiciousIndicators.push('Proxy/VPN usage detected');
      riskScore += 0.3;
    }

    // Check for high-risk IP
    if (networkData.riskScore > 0.7) {
      suspiciousIndicators.push('High-risk IP address');
      riskScore += 0.4;
    }

    // Check for concurrent sessions
    if (networkData.concurrentSessions > 3) {
      suspiciousIndicators.push('Multiple concurrent sessions');
      riskScore += 0.2;
    }

    // Check for location inconsistency
    const locationConsistency = await this.checkLocationConsistency(applicantId, networkData.location);
    if (!locationConsistency.isConsistent) {
      suspiciousIndicators.push('Location inconsistency detected');
      riskScore += 0.3;
    }

    if (suspiciousIndicators.length > 0 && riskScore >= this.config.thresholds.suspiciousIPs) {
      const activity: SuspiciousActivity = {
        applicantId,
        activityType: 'SUSPICIOUS_IP',
        severity: riskScore > 0.8 ? 'HIGH' : 'MEDIUM',
        description: `Suspicious network activity: ${suspiciousIndicators.join(', ')}`,
        evidence: [{
          type: 'NETWORK_DATA',
          description: 'Network analysis results',
          data: networkData,
          timestamp: new Date(),
          confidence: riskScore
        }],
        riskScore,
        timestamp: new Date(),
        status: 'ACTIVE',
        metadata: {
          ipAddress: networkData.ipAddress,
          location: networkData.location,
          indicators: suspiciousIndicators
        }
      };

      return { isSuspicious: true, activity };
    }

    return { isSuspicious: false };
  }

  /**
   * Process detected suspicious activity
   */
  private async processSuspiciousActivity(activity: SuspiciousActivity): Promise<void> {
    try {
      // Save activity to database
      const savedActivity = await this.prisma.suspiciousActivity.create({
        data: {
          applicantId: activity.applicantId,
          activityType: activity.activityType,
          severity: activity.severity,
          description: activity.description,
          evidence: JSON.stringify(activity.evidence),
          riskScore: activity.riskScore,
          status: activity.status,
          metadata: JSON.stringify(activity.metadata),
          detectedAt: activity.timestamp
        }
      });

      // Create monitoring alert
      await this.createMonitoringAlert(activity);

      // Take automatic actions if configured
      if (this.config.autoActions.enableAutoBlock && activity.severity === 'CRITICAL') {
        await this.autoBlockApplicant(activity.applicantId, activity.description);
      }

      if (this.config.autoActions.enableAutoEscalation && 
          (activity.severity === 'HIGH' || activity.severity === 'CRITICAL')) {
        await this.escalateToInvestigator(activity);
      }

      if (this.config.autoActions.enableRealTimeAlerts) {
        await this.sendRealTimeAlert(activity);
      }

      logger.info(`Suspicious activity processed: ${activity.activityType} for applicant ${activity.applicantId}`);
    } catch (error) {
      logger.error('Failed to process suspicious activity:', error);
    }
  }

  /**
   * Create monitoring alert
   */
  private async createMonitoringAlert(activity: SuspiciousActivity): Promise<void> {
    const alert: MonitoringAlert = {
      id: crypto.randomUUID(),
      applicantId: activity.applicantId,
      alertType: activity.activityType,
      severity: activity.severity,
      title: `${activity.activityType.replace('_', ' ')} Alert`,
      description: activity.description,
      evidence: activity.evidence,
      recommendedActions: this.generateRecommendedActions(activity),
      createdAt: new Date(),
      status: 'PENDING'
    };

    await this.prisma.monitoringAlert.create({
      data: {
        id: alert.id,
        applicantId: alert.applicantId,
        alertType: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        evidence: JSON.stringify(alert.evidence),
        recommendedActions: JSON.stringify(alert.recommendedActions),
        status: alert.status,
        createdAt: alert.createdAt
      }
    });
  }

  /**
   * Generate recommended actions based on activity type and severity
   */
  private generateRecommendedActions(activity: SuspiciousActivity): string[] {
    const actions: string[] = [];

    switch (activity.activityType) {
      case 'RAPID_SUBMISSIONS':
        actions.push('Review submission timeline');
        actions.push('Verify document authenticity');
        if (activity.severity === 'HIGH' || activity.severity === 'CRITICAL') {
          actions.push('Temporarily suspend application processing');
        }
        break;

      case 'DUPLICATE_DOCUMENTS':
        actions.push('Investigate document sources');
        actions.push('Contact applicant for clarification');
        actions.push('Cross-reference with other applications');
        break;

      case 'BEHAVIORAL_ANOMALY':
        actions.push('Analyze user interaction patterns');
        actions.push('Consider additional identity verification');
        if (activity.severity === 'CRITICAL') {
          actions.push('Flag for manual review');
        }
        break;

      case 'SUSPICIOUS_IP':
        actions.push('Verify applicant location');
        actions.push('Check for VPN/proxy usage');
        actions.push('Review access logs');
        break;

      default:
        actions.push('Conduct manual investigation');
        actions.push('Review all related activities');
    }

    // Add severity-based actions
    if (activity.severity === 'CRITICAL') {
      actions.push('Escalate to senior investigator immediately');
      actions.push('Consider application suspension');
    } else if (activity.severity === 'HIGH') {
      actions.push('Prioritize for investigation');
      actions.push('Enhanced monitoring required');
    }

    return actions;
  }

  // Monitoring helper methods
  private async monitorRapidSubmissions(): Promise<void> {
    const timeWindow = new Date(Date.now() - this.config.timeWindows.rapidSubmissions * 60 * 1000);
    
    const rapidSubmitters = await this.prisma.documentVerificationLog.groupBy({
      by: ['applicantId'],
      where: {
        verifiedAt: {
          gte: timeWindow
        }
      },
      _count: {
        applicantId: true
      },
      having: {
        applicantId: {
          _count: {
            gte: this.config.thresholds.rapidSubmissions
          }
        }
      }
    });

    for (const submitter of rapidSubmitters) {
      await this.checkRapidSubmissions(submitter.applicantId);
    }
  }

  private async monitorDuplicateDocuments(): Promise<void> {
    // Find documents with duplicate hashes
    const duplicates = await this.prisma.documentVerificationLog.groupBy({
      by: ['metadata'],
      _count: {
        applicantId: true
      },
      having: {
        applicantId: {
          _count: {
            gte: this.config.thresholds.duplicateDocuments
          }
        }
      }
    });

    for (const duplicate of duplicates) {
      // Process duplicate document detection
      const affectedApplicants = await this.prisma.documentVerificationLog.findMany({
        where: {
          metadata: duplicate.metadata
        },
        select: {
          applicantId: true
        }
      });

      for (const applicant of affectedApplicants) {
        const activity: SuspiciousActivity = {
          applicantId: applicant.applicantId,
          activityType: 'DUPLICATE_DOCUMENTS',
          severity: 'HIGH',
          description: 'Duplicate document detected across multiple applications',
          evidence: [{
            type: 'DOCUMENT_ANALYSIS',
            description: 'Document hash collision detected',
            data: { duplicateCount: duplicate._count.applicantId },
            timestamp: new Date(),
            confidence: 0.95
          }],
          riskScore: 0.8,
          timestamp: new Date(),
          status: 'ACTIVE',
          metadata: {
            duplicateCount: duplicate._count.applicantId
          }
        };

        await this.processSuspiciousActivity(activity);
      }
    }
  }

  private async monitorFailedVerifications(): Promise<void> {
    const timeWindow = new Date(Date.now() - this.config.timeWindows.failedVerifications * 60 * 1000);
    
    const failedVerifications = await this.prisma.documentVerificationLog.groupBy({
      by: ['applicantId'],
      where: {
        isAuthentic: false,
        verifiedAt: {
          gte: timeWindow
        }
      },
      _count: {
        applicantId: true
      },
      having: {
        applicantId: {
          _count: {
            gte: this.config.thresholds.failedVerifications
          }
        }
      }
    });

    for (const failed of failedVerifications) {
      const activity: SuspiciousActivity = {
        applicantId: failed.applicantId,
        activityType: 'FAILED_VERIFICATIONS',
        severity: 'MEDIUM',
        description: `Multiple failed verifications: ${failed._count.applicantId} failures in ${this.config.timeWindows.failedVerifications} minutes`,
        evidence: [{
          type: 'SYSTEM_LOG',
          description: 'Failed verification analysis',
          data: { failureCount: failed._count.applicantId },
          timestamp: new Date(),
          confidence: 0.8
        }],
        riskScore: Math.min(1, failed._count.applicantId / this.config.thresholds.failedVerifications * 0.6),
        timestamp: new Date(),
        status: 'ACTIVE',
        metadata: {
          failureCount: failed._count.applicantId
        }
      };

      await this.processSuspiciousActivity(activity);
    }
  }

  private async analyzeBehavioralPatterns(): Promise<void> {
    // Analyze behavioral patterns for all active applicants
    // This would involve complex behavioral analysis algorithms
    logger.info('Behavioral pattern analysis completed');
  }

  // Behavioral analysis helper methods
  private calculateBehavioralAnomalyScore(currentBehavior: any, baseline: BehavioralPattern): number {
    let anomalyScore = 0;
    let factorCount = 0;

    // Analyze session duration
    if (currentBehavior.sessionDuration && baseline.sessionDuration.length > 0) {
      const avgBaseline = baseline.sessionDuration.reduce((a, b) => a + b, 0) / baseline.sessionDuration.length;
      const deviation = Math.abs(currentBehavior.sessionDuration - avgBaseline) / avgBaseline;
      anomalyScore += Math.min(1, deviation);
      factorCount++;
    }

    // Analyze typing patterns
    if (currentBehavior.typingPattern && baseline.typingPatterns.length > 0) {
      const typingAnomaly = this.analyzeTypingAnomaly(currentBehavior.typingPattern, baseline.typingPatterns);
      anomalyScore += typingAnomaly;
      factorCount++;
    }

    // Analyze click patterns
    if (currentBehavior.clickPattern && baseline.clickPatterns.length > 0) {
      const clickAnomaly = this.analyzeClickAnomaly(currentBehavior.clickPattern, baseline.clickPatterns);
      anomalyScore += clickAnomaly;
      factorCount++;
    }

    return factorCount > 0 ? anomalyScore / factorCount : 0;
  }

  private analyzeTypingAnomaly(current: any, baseline: TypingPattern[]): number {
    // Simplified typing pattern analysis
    const avgKeystrokeInterval = baseline.reduce((sum, pattern) => sum + pattern.keystrokeInterval, 0) / baseline.length;
    const deviation = Math.abs(current.keystrokeInterval - avgKeystrokeInterval) / avgKeystrokeInterval;
    return Math.min(1, deviation);
  }

  private analyzeClickAnomaly(current: any, baseline: ClickPattern[]): number {
    // Simplified click pattern analysis
    const avgDuration = baseline.reduce((sum, pattern) => sum + pattern.duration, 0) / baseline.length;
    const deviation = Math.abs(current.duration - avgDuration) / avgDuration;
    return Math.min(1, deviation);
  }

  private identifyAnomalyType(currentBehavior: any, baseline: BehavioralPattern): string {
    // Identify the type of behavioral anomaly
    if (currentBehavior.sessionDuration && currentBehavior.sessionDuration < 60) {
      return 'UNUSUALLY_SHORT_SESSION';
    }
    if (currentBehavior.typingPattern && currentBehavior.typingPattern.keystrokeInterval < 50) {
      return 'UNUSUALLY_FAST_TYPING';
    }
    return 'GENERAL_BEHAVIORAL_ANOMALY';
  }

  private async checkLocationConsistency(applicantId: string, currentLocation: string): Promise<{
    isConsistent: boolean;
    previousLocations: string[];
  }> {
    // Check location consistency across sessions
    const previousSessions = await this.prisma.userSession.findMany({
      where: {
        applicantId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      select: {
        location: true
      }
    });

    const previousLocations = previousSessions.map(session => session.location).filter(Boolean);
    const uniqueLocations = [...new Set(previousLocations)];

    // Consider consistent if within reasonable geographic area
    const isConsistent = uniqueLocations.length <= 2 || uniqueLocations.includes(currentLocation);

    return {
      isConsistent,
      previousLocations: uniqueLocations
    };
  }

  private async updateBehavioralBaseline(applicantId: string, activityData: any): Promise<void> {
    // Update or create behavioral baseline for the applicant
    const existing = this.behavioralBaselines.get(applicantId);
    
    if (existing) {
      // Update existing baseline
      if (activityData.sessionDuration) {
        existing.sessionDuration.push(activityData.sessionDuration);
        if (existing.sessionDuration.length > 10) {
          existing.sessionDuration.shift(); // Keep only last 10 sessions
        }
      }
    } else {
      // Create new baseline
      const baseline: BehavioralPattern = {
        applicantId,
        sessionDuration: activityData.sessionDuration ? [activityData.sessionDuration] : [],
        clickPatterns: [],
        navigationPaths: [],
        typingPatterns: [],
        timePatterns: [],
        deviceFingerprints: [],
        ipAddresses: []
      };
      
      this.behavioralBaselines.set(applicantId, baseline);
    }
  }

  // Action methods
  private async autoBlockApplicant(applicantId: string, reason: string): Promise<void> {
    try {
      await this.prisma.applicantBlock.create({
        data: {
          applicantId,
          reason,
          blockedAt: new Date(),
          isAutomatic: true,
          status: 'ACTIVE'
        }
      });

      logger.warn(`Applicant ${applicantId} automatically blocked: ${reason}`);
    } catch (error) {
      logger.error('Failed to auto-block applicant:', error);
    }
  }

  private async escalateToInvestigator(activity: SuspiciousActivity): Promise<void> {
    try {
      await this.prisma.investigationCase.create({
        data: {
          applicantId: activity.applicantId,
          caseType: 'SUSPICIOUS_ACTIVITY',
          priority: activity.severity === 'CRITICAL' ? 'URGENT' : 'HIGH',
          description: activity.description,
          evidence: JSON.stringify(activity.evidence),
          status: 'ASSIGNED',
          createdAt: new Date()
        }
      });

      logger.info(`Investigation case created for applicant ${activity.applicantId}`);
    } catch (error) {
      logger.error('Failed to escalate to investigator:', error);
    }
  }

  private async sendRealTimeAlert(activity: SuspiciousActivity): Promise<void> {
    try {
      // In production, this would send alerts via email, SMS, or push notifications
      logger.warn(`REAL-TIME ALERT: ${activity.activityType} - ${activity.description} (Applicant: ${activity.applicantId})`);
      
      // Could integrate with services like:
      // - Email notifications
      // - Slack/Teams alerts
      // - SMS alerts
      // - Push notifications to admin dashboard
    } catch (error) {
      logger.error('Failed to send real-time alert:', error);
    }
  }

  /**
   * Get suspicious activities for an applicant
   */
  async getSuspiciousActivities(applicantId: string): Promise<SuspiciousActivity[]> {
    const activities = await this.prisma.suspiciousActivity.findMany({
      where: { applicantId },
      orderBy: { detectedAt: 'desc' }
    });

    return activities.map(activity => ({
      id: activity.id,
      applicantId: activity.applicantId,
      activityType: activity.activityType as ActivityType,
      severity: activity.severity as SeverityLevel,
      description: activity.description,
      evidence: JSON.parse(activity.evidence as string),
      riskScore: activity.riskScore,
      timestamp: activity.detectedAt,
      status: activity.status as 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE',
      investigatorId: activity.investigatorId || undefined,
      resolution: activity.resolution || undefined,
      metadata: JSON.parse(activity.metadata as string)
    }));
  }

  /**
   * Get monitoring alerts
   */
  async getMonitoringAlerts(status?: string): Promise<MonitoringAlert[]> {
    const alerts = await this.prisma.monitoringAlert.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' }
    });

    return alerts.map(alert => ({
      id: alert.id,
      applicantId: alert.applicantId,
      alertType: alert.alertType as ActivityType,
      severity: alert.severity as SeverityLevel,
      title: alert.title,
      description: alert.description,
      evidence: JSON.parse(alert.evidence as string),
      recommendedActions: JSON.parse(alert.recommendedActions as string),
      createdAt: alert.createdAt,
      acknowledgedAt: alert.acknowledgedAt || undefined,
      acknowledgedBy: alert.acknowledgedBy || undefined,
      status: alert.status as 'PENDING' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED'
    }));
  }

  /**
   * Acknowledge monitoring alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    await this.prisma.monitoringAlert.update({
      where: { id: alertId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedBy
      }
    });
  }
}