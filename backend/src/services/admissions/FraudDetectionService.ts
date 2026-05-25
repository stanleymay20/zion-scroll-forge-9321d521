/**
 * ScrollUniversity Admissions - Fraud Detection Service
 * "Many are called, but few are chosen" - Matthew 22:14
 * 
 * Advanced fraud detection algorithms and pattern recognition
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface FraudDetectionConfig {
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  patternWeights: {
    documentTampering: number;
    identityMismatch: number;
    behavioralAnomalies: number;
    networkAnalysis: number;
  };
  alertSettings: {
    enableRealTimeAlerts: boolean;
    escalationThreshold: number;
    autoRejectThreshold: number;
  };
}

export interface FraudPattern {
  id: string;
  name: string;
  description: string;
  category: 'DOCUMENT' | 'IDENTITY' | 'BEHAVIORAL' | 'NETWORK';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  algorithm: string;
  weight: number;
  isActive: boolean;
}

export interface FraudAnalysisResult {
  applicantId: string;
  overallRiskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedPatterns: DetectedPattern[];
  recommendations: FraudRecommendation[];
  requiresManualReview: boolean;
  autoReject: boolean;
  analysisTimestamp: Date;
}

export interface DetectedPattern {
  patternId: string;
  patternName: string;
  confidence: number;
  evidence: string[];
  impact: number;
  category: string;
}

export interface FraudRecommendation {
  type: 'INVESTIGATE' | 'REJECT' | 'REQUEST_ADDITIONAL' | 'ESCALATE' | 'MONITOR';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  description: string;
  actionRequired: string;
  deadline?: Date;
}

export interface NetworkAnalysis {
  ipAddress: string;
  deviceFingerprint: string;
  locationConsistency: number;
  accessPatterns: AccessPattern[];
  suspiciousConnections: string[];
  isProxy?: boolean;
  isVPN?: boolean;
  riskScore?: number;
  concurrentSessions?: number;
}

export interface AccessPattern {
  timestamp: Date;
  action: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  duration: number;
}

export interface BehavioralProfile {
  applicantId: string;
  submissionPatterns: SubmissionPattern[];
  interactionMetrics: InteractionMetrics;
  anomalyScore: number;
  baselineEstablished: boolean;
}

export interface SubmissionPattern {
  documentType: string;
  submissionTime: Date;
  timeToComplete: number;
  revisionCount: number;
  accessFrequency: number;
}

export interface InteractionMetrics {
  averageSessionDuration: number;
  clickPatterns: number[];
  typingSpeed: number;
  pausePatterns: number[];
  navigationBehavior: string[];
}

export class FraudDetectionService {
  private config: FraudDetectionConfig;
  private fraudPatterns: Map<string, FraudPattern> = new Map();
  private behavioralProfiles: Map<string, BehavioralProfile> = new Map();

  constructor(private prisma: PrismaClient) {
    this.config = this.initializeConfig();
    this.initializeFraudPatterns();
  }

  private initializeConfig(): FraudDetectionConfig {
    return {
      riskThresholds: {
        low: 0.3,
        medium: 0.5,
        high: 0.7,
        critical: 0.8
      },
      patternWeights: {
        documentTampering: 0.4,
        identityMismatch: 0.3,
        behavioralAnomalies: 0.25,
        networkAnalysis: 0.25
      },
      alertSettings: {
        enableRealTimeAlerts: true,
        escalationThreshold: 0.7,
        autoRejectThreshold: 0.8
      }
    };
  }

  private initializeFraudPatterns(): void {
    const patterns: FraudPattern[] = [
      { id: 'rapid-multiple-submissions', name: 'Rapid Multiple Submissions', description: 'Multiple applications submitted in rapid succession', category: 'BEHAVIORAL', severity: 'MEDIUM', algorithm: 'TIME_WINDOW_ANALYSIS', weight: 0.6, isActive: true },
      { id: 'document-hash-collision', name: 'Document Hash Collision', description: 'Same document submitted by multiple applicants', category: 'DOCUMENT', severity: 'HIGH', algorithm: 'HASH_COMPARISON', weight: 0.9, isActive: true },
      { id: 'identity-inconsistency', name: 'Identity Data Inconsistency', description: 'Inconsistent personal information across documents', category: 'IDENTITY', severity: 'HIGH', algorithm: 'CROSS_REFERENCE_ANALYSIS', weight: 0.8, isActive: true },
      { id: 'suspicious-ip-pattern', name: 'Suspicious IP Pattern', description: 'Access from known proxy, VPN, or suspicious location', category: 'NETWORK', severity: 'MEDIUM', algorithm: 'IP_REPUTATION_ANALYSIS', weight: 0.4, isActive: true },
      { id: 'automated-behavior', name: 'Automated Behavior Detection', description: 'Behavior patterns consistent with automated tools', category: 'BEHAVIORAL', severity: 'HIGH', algorithm: 'BEHAVIORAL_ANALYSIS', weight: 0.7, isActive: true },
      { id: 'document-metadata-anomaly', name: 'Document Metadata Anomaly', description: 'Suspicious patterns in document metadata', category: 'DOCUMENT', severity: 'MEDIUM', algorithm: 'METADATA_ANALYSIS', weight: 0.5, isActive: true }
    ];

    patterns.forEach(pattern => this.fraudPatterns.set(pattern.id, pattern));
  }

  async analyzeFraudRisk(applicantId: string, applicationData: any, networkData?: NetworkAnalysis): Promise<FraudAnalysisResult> {
    try {
      logger.info(`Starting fraud analysis for applicant ${applicantId}`);

      const detectedPatterns: DetectedPattern[] = [];
      detectedPatterns.push(...await this.analyzeDocumentFraud(applicantId, applicationData.documents ?? []));
      detectedPatterns.push(...await this.analyzeIdentityFraud(applicantId, applicationData.personalInfo ?? {}));
      detectedPatterns.push(...await this.analyzeBehavioralFraud(applicantId, applicationData.behaviorData ?? {}));
      if (networkData) detectedPatterns.push(...await this.analyzeNetworkFraud(applicantId, networkData));

      const overallRiskScore = this.calculateOverallRiskScore(detectedPatterns);
      const riskLevel = this.determineRiskLevel(overallRiskScore);
      const recommendations = this.generateFraudRecommendations(overallRiskScore, detectedPatterns);
      const requiresManualReview = overallRiskScore >= this.config.riskThresholds.medium;
      const autoReject = overallRiskScore >= this.config.alertSettings.autoRejectThreshold;

      const result: FraudAnalysisResult = { applicantId, overallRiskScore, riskLevel, detectedPatterns, recommendations, requiresManualReview, autoReject, analysisTimestamp: new Date() };

      await this.logFraudAnalysis(result);
      if (overallRiskScore >= this.config.alertSettings.escalationThreshold) await this.sendFraudAlert(result);

      logger.info(`Fraud analysis completed for applicant ${applicantId}: Risk Level ${riskLevel}`);
      return result;
    } catch (error) {
      logger.error('Fraud analysis failed:', error);
      throw new Error(`Fraud analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeDocumentFraud(applicantId: string, documents: any[]): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    for (const document of documents) {
      if (document.hash) {
        const duplicates = await this.findDuplicateDocuments(document.hash, applicantId);
        if (duplicates.length > 0) {
          patterns.push({ patternId: 'document-hash-collision', patternName: 'Document Hash Collision', confidence: 0.95, evidence: [`Document hash ${document.hash} found in ${duplicates.length} other applications`], impact: 0.95, category: 'DOCUMENT' });
        }
      }
    }

    const metadataAnomalies = this.detectMetadataAnomalies(documents);
    if (metadataAnomalies.length > 0) {
      patterns.push({ patternId: 'document-metadata-anomaly', patternName: 'Document Metadata Anomaly', confidence: 0.85, evidence: metadataAnomalies, impact: 0.75, category: 'DOCUMENT' });
    }
    return patterns;
  }

  private async analyzeIdentityFraud(applicantId: string, personalInfo: any): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    const inconsistencies = await this.findIdentityInconsistencies(applicantId, personalInfo);
    if (inconsistencies.length > 0) {
      patterns.push({ patternId: 'identity-inconsistency', patternName: 'Identity Data Inconsistency', confidence: 0.8, evidence: inconsistencies, impact: 0.8, category: 'IDENTITY' });
    }

    const fraudCheck = await this.checkFraudDatabases(personalInfo);
    if (fraudCheck.isFlagged) {
      patterns.push({ patternId: 'fraud-database-match', patternName: 'Fraud Database Match', confidence: 0.9, evidence: [fraudCheck.reason || 'Match found in fraud database'], impact: 1.0, category: 'IDENTITY' });
    }
    return patterns;
  }

  private async analyzeBehavioralFraud(applicantId: string, behaviorData: any): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    const recentSubmissions = await this.getRecentSubmissions(applicantId);
    if (recentSubmissions.length > 5) {
      patterns.push({ patternId: 'rapid-multiple-submissions', patternName: 'Rapid Multiple Submissions', confidence: 0.8, evidence: [`${recentSubmissions.length} submissions in the last 24 hours`], impact: 0.65, category: 'BEHAVIORAL' });
    }

    if (behaviorData) {
      const automationScore = this.detectAutomatedBehavior(behaviorData);
      if (automationScore > 0.7) {
        patterns.push({ patternId: 'automated-behavior', patternName: 'Automated Behavior Detection', confidence: automationScore, evidence: ['Behavior patterns consistent with automated tools'], impact: 0.9, category: 'BEHAVIORAL' });
      }
    }
    return patterns;
  }

  private async analyzeNetworkFraud(applicantId: string, networkData: NetworkAnalysis): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    const ipReputation = await this.checkIPReputation(networkData.ipAddress);
    const proxySignals = Boolean(networkData.isProxy || networkData.isVPN || (networkData.riskScore ?? 0) >= 0.7 || (networkData.concurrentSessions ?? 0) >= 4);
    if (ipReputation.isSuspicious || proxySignals) {
      patterns.push({ patternId: 'suspicious-ip-pattern', patternName: 'Suspicious IP Pattern', confidence: Math.max(ipReputation.confidence, networkData.riskScore ?? 0.7), evidence: [ipReputation.reason, networkData.isProxy ? 'Proxy detected' : '', networkData.isVPN ? 'VPN detected' : ''].filter(Boolean), impact: 0.75, category: 'NETWORK' });
    }

    if (networkData.locationConsistency < 0.5) {
      patterns.push({ patternId: 'location-inconsistency', patternName: 'Location Inconsistency', confidence: 1 - networkData.locationConsistency, evidence: ['Inconsistent geographic locations across sessions'], impact: 0.6, category: 'NETWORK' });
    }
    return patterns;
  }

  private calculateOverallRiskScore(patterns: DetectedPattern[]): number {
    if (patterns.length === 0) return 0;

    const weightedSignals = patterns.map(pattern => {
      const categoryWeight = this.getPatternWeight(pattern.category);
      return pattern.confidence * pattern.impact * categoryWeight;
    });

    const additiveScore = weightedSignals.reduce((sum, score) => sum + score, 0);
    const maxSeverity = Math.max(...patterns.map(pattern => pattern.confidence * pattern.impact));
    const multiPatternBoost = patterns.length >= 3 ? 0.2 : patterns.length >= 2 ? 0.1 : 0;
    const highConfidenceBoost = patterns.some(pattern => pattern.confidence >= 0.85 && pattern.impact >= 0.75) ? 0.15 : 0;

    return Math.min(1, additiveScore + maxSeverity * 0.45 + multiPatternBoost + highConfidenceBoost);
  }

  private getPatternWeight(category: string): number {
    switch (category) {
      case 'DOCUMENT': return this.config.patternWeights.documentTampering;
      case 'IDENTITY': return this.config.patternWeights.identityMismatch;
      case 'BEHAVIORAL': return this.config.patternWeights.behavioralAnomalies;
      case 'NETWORK': return this.config.patternWeights.networkAnalysis;
      default: return 0.1;
    }
  }

  private determineRiskLevel(riskScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (riskScore >= this.config.riskThresholds.critical) return 'CRITICAL';
    if (riskScore >= this.config.riskThresholds.high) return 'HIGH';
    if (riskScore >= this.config.riskThresholds.medium) return 'MEDIUM';
    return 'LOW';
  }

  private generateFraudRecommendations(riskScore: number, patterns: DetectedPattern[]): FraudRecommendation[] {
    const recommendations: FraudRecommendation[] = [];
    if (riskScore >= this.config.alertSettings.autoRejectThreshold) {
      recommendations.push({ type: 'REJECT', priority: 'URGENT', description: 'Automatic rejection due to critical fraud risk', actionRequired: 'Reject application immediately and flag applicant', deadline: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    } else if (riskScore >= this.config.alertSettings.escalationThreshold) {
      recommendations.push({ type: 'ESCALATE', priority: 'HIGH', description: 'Escalate to senior admissions officer for review', actionRequired: 'Manual review by senior staff required', deadline: new Date(Date.now() + 48 * 60 * 60 * 1000) });
    } else if (riskScore >= this.config.riskThresholds.medium) {
      recommendations.push({ type: 'INVESTIGATE', priority: 'MEDIUM', description: 'Additional investigation required', actionRequired: 'Conduct enhanced verification process', deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    }

    for (const pattern of patterns) {
      if (pattern.patternId === 'document-hash-collision') recommendations.push({ type: 'REQUEST_ADDITIONAL', priority: 'HIGH', description: 'Request original documents due to duplicate detection', actionRequired: 'Contact applicant for original document submission' });
      if (pattern.patternId === 'identity-inconsistency') recommendations.push({ type: 'INVESTIGATE', priority: 'HIGH', description: 'Verify identity due to data inconsistencies', actionRequired: 'Conduct identity verification process' });
    }
    return recommendations;
  }

  private async findDuplicateDocuments(documentHash: string, excludeApplicantId: string): Promise<string[]> {
    const duplicates = await this.prisma.documentVerificationLog.findMany({ where: { metadata: { path: ['fileHash'], equals: documentHash }, applicantId: { not: excludeApplicantId } }, select: { applicantId: true } } as any);
    return duplicates.map((d: any) => d.applicantId);
  }

  private detectMetadataAnomalies(documents: any[]): string[] {
    const anomalies: string[] = [];
    for (const document of documents) {
      if (document.metadata) {
        if (document.metadata.creationDate && new Date(document.metadata.creationDate) > new Date()) anomalies.push('Future creation date detected');
        if (document.metadata.producer) {
          const suspiciousProducers = ['FAKE', 'TEST', 'SAMPLE', 'TEMPLATE'];
          if (suspiciousProducers.some(producer => document.metadata.producer.toUpperCase().includes(producer))) anomalies.push('Suspicious document producer detected');
        }
      }
    }
    return anomalies;
  }

  private async findIdentityInconsistencies(applicantId: string, personalInfo: any): Promise<string[]> {
    const inconsistencies: string[] = [];
    const verificationLogs = await this.prisma.documentVerificationLog.findMany({ where: { applicantId } } as any);
    const names = new Set<string>();
    for (const log of verificationLogs) {
      if (log.metadata && typeof log.metadata === 'object') {
        const metadata = log.metadata as any;
        if (metadata.extractedName) names.add(metadata.extractedName.toLowerCase());
      }
    }
    if (names.size > 1) inconsistencies.push(`Multiple names found across documents: ${Array.from(names).join(', ')}`);
    return inconsistencies;
  }

  private async checkFraudDatabases(personalInfo: any): Promise<{ isFlagged: boolean; reason?: string }> {
    return { isFlagged: false };
  }

  private async getRecentSubmissions(applicantId: string): Promise<any[]> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return await this.prisma.documentVerificationLog.findMany({ where: { applicantId, verifiedAt: { gte: twentyFourHoursAgo } } } as any);
  }

  private detectAutomatedBehavior(behaviorData: any): number {
    let automationScore = 0;
    if (behaviorData.interactionMetrics) {
      const { clickPatterns, typingSpeed, pausePatterns } = behaviorData.interactionMetrics;
      if (clickPatterns && this.isPatternTooConsistent(clickPatterns)) automationScore += 0.35;
      if (typingSpeed && (typingSpeed > 200 || typingSpeed < 10)) automationScore += 0.3;
      if (pausePatterns && this.lacksNaturalPauses(pausePatterns)) automationScore += 0.35;
    }
    return Math.min(1, automationScore);
  }

  private isPatternTooConsistent(patterns: number[]): boolean {
    if (patterns.length < 3) return false;
    return this.calculateVariance(patterns) < 0.1;
  }

  private lacksNaturalPauses(pausePatterns: number[]): boolean {
    if (pausePatterns.length < 4) return false;
    return this.calculateVariance(pausePatterns) < 0.2;
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  private async checkIPReputation(ipAddress: string): Promise<{ isSuspicious: boolean; confidence: number; reason: string }> {
    if (ipAddress.startsWith('10.') || ipAddress.startsWith('192.168.') || ipAddress.startsWith('172.')) {
      return { isSuspicious: true, confidence: 0.6, reason: 'Private IP address detected' };
    }
    return { isSuspicious: false, confidence: 0.1, reason: 'IP address appears legitimate' };
  }

  private async logFraudAnalysis(result: FraudAnalysisResult): Promise<void> {
    try {
      await this.prisma.fraudAnalysisLog.create({ data: { applicantId: result.applicantId, overallRiskScore: result.overallRiskScore, riskLevel: result.riskLevel, detectedPatterns: JSON.stringify(result.detectedPatterns), recommendations: JSON.stringify(result.recommendations), requiresManualReview: result.requiresManualReview, autoReject: result.autoReject, analyzedAt: result.analysisTimestamp } } as any);
    } catch (error) {
      logger.error('Failed to log fraud analysis:', error);
    }
  }

  private async sendFraudAlert(result: FraudAnalysisResult): Promise<void> {
    try {
      await this.prisma.fraudAlert.create({ data: { applicantId: result.applicantId, riskLevel: result.riskLevel, riskScore: result.overallRiskScore, alertType: result.autoReject ? 'AUTO_REJECT' : 'MANUAL_REVIEW', description: `Fraud risk detected: ${result.riskLevel} (Score: ${result.overallRiskScore.toFixed(2)})`, metadata: JSON.stringify({ patterns: result.detectedPatterns.map(p => p.patternName), recommendations: result.recommendations.map(r => r.type) }), createdAt: new Date() } } as any);
      logger.warn(`Fraud alert sent for applicant ${result.applicantId}: ${result.riskLevel} risk`);
    } catch (error) {
      logger.error('Failed to send fraud alert:', error);
    }
  }
}
