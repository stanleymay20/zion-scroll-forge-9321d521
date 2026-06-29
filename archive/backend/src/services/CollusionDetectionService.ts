/**
 * Collusion Detection Service
 * Detects unauthorized collaboration between students
 * "The LORD detests dishonest scales, but accurate weights find favor with him" - Proverbs 11:1
 */

import { PrismaClient } from '@prisma/client';
import {
  CollusionDetectionRequest,
  CollusionDetectionResult,
  CollusionPair,
  SuspiciousGroup,
  SubmissionForCollusion,
  MatchedSection,
  RiskLevel,
} from '../types/integrity.types';
import { integrityConfig, MIN_COLLUSION_SIMILARITY, COLLUSION_TIME_WINDOW } from '../config/integrity.config';
import { VectorStoreService } from './VectorStoreService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export default class CollusionDetectionService {
  private vectorStore: VectorStoreService;

  constructor() {
    this.vectorStore = new VectorStoreService();
  }

  /**
   * Detect collusion among submissions for an assignment
   */
  async detectCollusion(request: CollusionDetectionRequest): Promise<CollusionDetectionResult> {
    try {
      logger.info('Starting collusion detection', {
        assignmentId: request.assignmentId,
        submissionCount: request.submissions.length,
      });

      if (!integrityConfig.collusion.enabled) {
        logger.info('Collusion detection skipped (disabled)');
        return {
          collusionPairs: [],
          suspiciousGroups: [],
          overallRisk: 'low',
        };
      }

      // Generate embeddings for all submissions if not provided
      const submissionsWithEmbeddings = await this.ensureEmbeddings(request.submissions);

      // Find similar pairs
      const collusionPairs = await this.findCollusionPairs(submissionsWithEmbeddings);

      // Identify suspicious groups
      const suspiciousGroups = this.identifySuspiciousGroups(collusionPairs);

      // Calculate overall risk
      const overallRisk = this.calculateOverallRisk(collusionPairs, suspiciousGroups);

      const result: CollusionDetectionResult = {
        collusionPairs,
        suspiciousGroups,
        overallRisk,
      };

      logger.info('Collusion detection completed', {
        assignmentId: request.assignmentId,
        pairsFound: collusionPairs.length,
        groupsFound: suspiciousGroups.length,
        overallRisk,
      });

      return result;
    } catch (error) {
      logger.error('Error in collusion detection', { error });
      throw error;
    }
  }

  /**
   * Ensure all submissions have embeddings
   */
  private async ensureEmbeddings(
    submissions: SubmissionForCollusion[]
  ): Promise<SubmissionForCollusion[]> {
    const result: SubmissionForCollusion[] = [];

    for (const submission of submissions) {
      if (submission.embedding) {
        result.push(submission);
      } else {
        const embedding = await this.vectorStore.generateEmbedding(submission.content);
        result.push({
          ...submission,
          embedding,
        });
      }
    }

    return result;
  }

  /**
   * Find pairs of submissions with high similarity
   */
  private async findCollusionPairs(
    submissions: SubmissionForCollusion[]
  ): Promise<CollusionPair[]> {
    const pairs: CollusionPair[] = [];
    const { similarityThreshold, timingThreshold } = integrityConfig.collusion;

    // Compare each pair of submissions
    for (let i = 0; i < submissions.length; i++) {
      for (let j = i + 1; j < submissions.length; j++) {
        const sub1 = submissions[i];
        const sub2 = submissions[j];

        // Calculate similarity using embeddings
        const similarityScore = this.calculateCosineSimilarity(
          sub1.embedding!,
          sub2.embedding!
        );

        // Check if similarity exceeds threshold
        if (similarityScore >= similarityThreshold) {
          // Calculate structural similarity
          const structuralSimilarity = this.calculateStructuralSimilarity(
            sub1.content,
            sub2.content
          );

          // Calculate timing proximity
          const timingProximity = Math.abs(
            sub1.submittedAt.getTime() - sub2.submittedAt.getTime()
          ) / (1000 * 60); // Convert to minutes

          // Find matched sections
          const matchedSections = this.findMatchedSections(sub1.content, sub2.content);

          // Determine risk level
          const riskLevel = this.calculatePairRiskLevel(
            similarityScore,
            structuralSimilarity,
            timingProximity
          );

          pairs.push({
            submission1Id: sub1.submissionId,
            submission2Id: sub2.submissionId,
            student1Id: sub1.studentId,
            student2Id: sub2.studentId,
            similarityScore,
            structuralSimilarity,
            timingProximity,
            matchedSections,
            riskLevel,
          });
        }
      }
    }

    // Sort by similarity score (highest first)
    pairs.sort((a, b) => b.similarityScore - a.similarityScore);

    return pairs;
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   */
  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  /**
   * Calculate structural similarity (beyond semantic similarity)
   */
  private calculateStructuralSimilarity(content1: string, content2: string): number {
    // Split into sentences
    const sentences1 = content1.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const sentences2 = content2.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    // Check if sentence counts are similar
    const sentenceCountSimilarity = 1 - Math.abs(sentences1.length - sentences2.length) / 
      Math.max(sentences1.length, sentences2.length);

    // Check if paragraph structure is similar
    const paragraphs1 = content1.split(/\n\n+/).filter((p) => p.trim().length > 0);
    const paragraphs2 = content2.split(/\n\n+/).filter((p) => p.trim().length > 0);

    const paragraphCountSimilarity = 1 - Math.abs(paragraphs1.length - paragraphs2.length) / 
      Math.max(paragraphs1.length, paragraphs2.length);

    // Check if word counts are similar
    const words1 = content1.split(/\s+/).length;
    const words2 = content2.split(/\s+/).length;

    const wordCountSimilarity = 1 - Math.abs(words1 - words2) / Math.max(words1, words2);

    // Average the similarities
    return (sentenceCountSimilarity + paragraphCountSimilarity + wordCountSimilarity) / 3;
  }

  /**
   * Find specific sections that match between two submissions
   */
  private findMatchedSections(content1: string, content2: string): MatchedSection[] {
    const matchedSections: MatchedSection[] = [];

    // Split into sentences
    const sentences1 = content1.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const sentences2 = content2.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    // Find matching sentences
    for (let i = 0; i < sentences1.length; i++) {
      const sent1 = sentences1[i].trim().toLowerCase();
      
      for (let j = 0; j < sentences2.length; j++) {
        const sent2 = sentences2[j].trim().toLowerCase();

        // Calculate similarity between sentences
        const similarity = this.calculateStringSimilarity(sent1, sent2);

        if (similarity > 0.8) {
          const startIndex1 = content1.indexOf(sentences1[i]);
          const endIndex1 = startIndex1 + sentences1[i].length;

          matchedSections.push({
            originalText: sentences1[i],
            matchedText: sentences2[j],
            sourceTitle: 'Submission 2',
            sourceUrl: '',
            startIndex: startIndex1,
            endIndex: endIndex1,
            similarity,
          });
        }
      }
    }

    return matchedSections;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate risk level for a collusion pair
   */
  private calculatePairRiskLevel(
    similarityScore: number,
    structuralSimilarity: number,
    timingProximity: number
  ): RiskLevel {
    // High similarity + high structural similarity + close timing = critical
    if (
      similarityScore > 0.95 &&
      structuralSimilarity > 0.9 &&
      timingProximity < 30
    ) {
      return 'critical';
    }

    // High similarity + close timing = high
    if (similarityScore > 0.9 && timingProximity < 60) {
      return 'high';
    }

    // High similarity alone = medium
    if (similarityScore > 0.85) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Identify groups of students who may have colluded together
   */
  private identifySuspiciousGroups(pairs: CollusionPair[]): SuspiciousGroup[] {
    const groups: SuspiciousGroup[] = [];
    const processed = new Set<string>();

    for (const pair of pairs) {
      if (pair.riskLevel === 'low') continue;

      const key = [pair.student1Id, pair.student2Id].sort().join('-');
      if (processed.has(key)) continue;

      // Find all students connected to this pair
      const groupStudents = new Set<string>([pair.student1Id, pair.student2Id]);
      const groupSubmissions = new Set<string>([pair.submission1Id, pair.submission2Id]);
      const groupPairs = [pair];

      // Find connected pairs
      for (const otherPair of pairs) {
        if (otherPair.riskLevel === 'low') continue;

        if (
          groupStudents.has(otherPair.student1Id) ||
          groupStudents.has(otherPair.student2Id)
        ) {
          groupStudents.add(otherPair.student1Id);
          groupStudents.add(otherPair.student2Id);
          groupSubmissions.add(otherPair.submission1Id);
          groupSubmissions.add(otherPair.submission2Id);
          groupPairs.push(otherPair);
        }
      }

      // Only create group if more than 2 students
      if (groupStudents.size > 2) {
        // Calculate average similarity
        const avgSimilarity = groupPairs.reduce((sum, p) => sum + p.similarityScore, 0) / groupPairs.length;

        // Calculate submission time span
        const timings = groupPairs.flatMap((p) => [p.timingProximity]);
        const submissionTimeSpan = Math.max(...timings);

        // Determine group risk level
        const riskLevel = this.calculateGroupRiskLevel(avgSimilarity, groupStudents.size);

        groups.push({
          submissionIds: Array.from(groupSubmissions),
          studentIds: Array.from(groupStudents),
          averageSimilarity: avgSimilarity,
          submissionTimeSpan,
          riskLevel,
        });

        // Mark as processed
        groupPairs.forEach((p) => {
          const pairKey = [p.student1Id, p.student2Id].sort().join('-');
          processed.add(pairKey);
        });
      }
    }

    return groups;
  }

  /**
   * Calculate risk level for a suspicious group
   */
  private calculateGroupRiskLevel(averageSimilarity: number, groupSize: number): RiskLevel {
    // Large group with high similarity = critical
    if (groupSize >= 5 && averageSimilarity > 0.9) {
      return 'critical';
    }

    // Medium group with high similarity = high
    if (groupSize >= 3 && averageSimilarity > 0.85) {
      return 'high';
    }

    // Any group with moderate similarity = medium
    if (averageSimilarity > 0.8) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Calculate overall risk level for the assignment
   */
  private calculateOverallRisk(
    pairs: CollusionPair[],
    groups: SuspiciousGroup[]
  ): RiskLevel {
    // Count high-risk pairs and groups
    const criticalPairs = pairs.filter((p) => p.riskLevel === 'critical').length;
    const highPairs = pairs.filter((p) => p.riskLevel === 'high').length;
    const criticalGroups = groups.filter((g) => g.riskLevel === 'critical').length;
    const highGroups = groups.filter((g) => g.riskLevel === 'high').length;

    // Determine overall risk
    if (criticalPairs > 0 || criticalGroups > 0) {
      return 'critical';
    }

    if (highPairs > 2 || highGroups > 0) {
      return 'high';
    }

    if (highPairs > 0 || pairs.length > 5) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Analyze submission timing patterns
   */
  async analyzeTimingPatterns(
    assignmentId: string,
    courseId: string
  ): Promise<{
    suspiciousPatterns: Array<{
      studentIds: string[];
      submissionTimes: Date[];
      timeSpan: number;
      description: string;
    }>;
  }> {
    try {
      logger.info('Analyzing timing patterns', { assignmentId });

      // Get all submissions for the assignment using raw SQL
      const submissions = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id, student_id, submitted_at
        FROM public.submissions
        WHERE assignment_id = $1
        ORDER BY submitted_at ASC
      `, assignmentId);

      const suspiciousPatterns: Array<{
        studentIds: string[];
        submissionTimes: Date[];
        timeSpan: number;
        description: string;
      }> = [];

      // Look for clusters of submissions within short time windows
      for (let i = 0; i < submissions.length; i++) {
        const cluster: typeof submissions = [submissions[i]];

        for (let j = i + 1; j < submissions.length; j++) {
          const timeDiff = Math.abs(
            submissions[j].submitted_at.getTime() - submissions[i].submitted_at.getTime()
          ) / (1000 * 60); // minutes

          if (timeDiff <= COLLUSION_TIME_WINDOW) {
            cluster.push(submissions[j]);
          } else {
            break; // Submissions are ordered, so we can break
          }
        }

        // Flag if 3+ submissions within time window
        if (cluster.length >= 3) {
          const timeSpan = Math.abs(
            cluster[cluster.length - 1].submitted_at.getTime() - cluster[0].submitted_at.getTime()
          ) / (1000 * 60);

          suspiciousPatterns.push({
            studentIds: cluster.map((s) => s.student_id),
            submissionTimes: cluster.map((s) => s.submitted_at),
            timeSpan,
            description: `${cluster.length} submissions within ${timeSpan.toFixed(1)} minutes`,
          });
        }
      }

      return { suspiciousPatterns };
    } catch (error) {
      logger.error('Error analyzing timing patterns', { error });
      throw error;
    }
  }

  /**
   * Get collusion detection results for an assignment
   */
  async getCollusionResults(assignmentId: string): Promise<CollusionDetectionResult | null> {
    try {
      // In production, would retrieve cached results from database
      // For now, return null (would need to re-run detection)
      return null;
    } catch (error) {
      logger.error('Error getting collusion results', { error, assignmentId });
      throw error;
    }
  }
}
