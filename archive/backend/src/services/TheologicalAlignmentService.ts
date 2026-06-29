/**
 * Theological Alignment Service
 * Validates AI-generated content against Christian doctrine and statement of faith
 */

import { PrismaClient } from '@prisma/client';
import {
  TheologicalAlignment,
  TheologicalConcern,
  AIServiceType,
} from '../types/qa.types';
import { AIGatewayService } from './AIGatewayService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export default class TheologicalAlignmentService {
  private aiGateway: AIGatewayService;
  private statementOfFaith: string;

  constructor() {
    this.aiGateway = new AIGatewayService();
    this.statementOfFaith = this.loadStatementOfFaith();
  }

  /**
   * Check theological alignment of content
   */
  async checkAlignment(
    content: string,
    serviceType: AIServiceType,
    context?: {
      topic?: string;
      audience?: string;
      purpose?: string;
    }
  ): Promise<TheologicalAlignment> {
    try {
      logger.info('Checking theological alignment', { serviceType, context });

      // Use AI to analyze theological alignment
      const analysis = await this.analyzeTheologicalContent(content, context);

      // Calculate alignment score
      const score = this.calculateAlignmentScore(analysis);

      // Extract concerns
      const concerns = this.extractConcerns(analysis);

      // Determine if approved
      const approved = score >= 0.95 && concerns.filter(c => c.severity === 'critical').length === 0;

      const alignment: TheologicalAlignment = {
        score,
        concerns,
        approved,
      };

      // Store alignment check
      // TODO: Add aITheologicalAlignment model to Prisma schema
      // await prisma.aITheologicalAlignment.create({
      //   data: {
      //     serviceType,
      //     content: content.substring(0, 5000), // Store first 5000 chars
      //     score,
      //     concerns: concerns as any,
      //     approved,
      //     context: context as any,
      //   },
      // });

      // Alert theological reviewers if concerns found
      if (!approved) {
        await this.alertTheologicalReviewers(serviceType, content, concerns);
      }

      logger.info('Theological alignment checked', {
        serviceType,
        score,
        approved,
        concernCount: concerns.length,
      });

      return alignment;
    } catch (error) {
      logger.error('Error checking theological alignment', { error, serviceType });
      throw error;
    }
  }

  /**
   * Batch check multiple content items
   */
  async batchCheckAlignment(
    items: Array<{
      content: string;
      serviceType: AIServiceType;
      context?: any;
    }>
  ): Promise<TheologicalAlignment[]> {
    try {
      const results = await Promise.all(
        items.map(item =>
          this.checkAlignment(item.content, item.serviceType, item.context)
        )
      );

      return results;
    } catch (error) {
      logger.error('Error in batch theological alignment check', { error });
      throw error;
    }
  }

  /**
   * Get alignment history for a service
   */
  async getAlignmentHistory(
    serviceType: AIServiceType,
    limit: number = 50
  ): Promise<TheologicalAlignment[]> {
    try {
      // TODO: Add aITheologicalAlignment model to Prisma schema
      return [];
      // const records = await prisma.aITheologicalAlignment.findMany({
      //   where: { serviceType },
      //   orderBy: { createdAt: 'desc' },
      //   take: limit,
      // });

      // return records.map(r => ({
      //   score: r.score,
      //   concerns: r.concerns as TheologicalConcern[],
      //   approved: r.approved,
      //   reviewedBy: r.reviewedBy || undefined,
      //   reviewedAt: r.reviewedAt || undefined,
      // }));
    } catch (error) {
      logger.error('Error fetching alignment history', { error, serviceType });
      throw error;
    }
  }

  /**
   * Review and approve/reject alignment
   */
  async reviewAlignment(
    alignmentId: string,
    reviewerId: string,
    decision: 'approved' | 'rejected',
    notes?: string
  ): Promise<void> {
    try {
      // TODO: Add aITheologicalAlignment model to Prisma schema
      logger.info('Theological alignment approved', { alignmentId, reviewerId });
      return;
      // await prisma.aITheologicalAlignment.update({
      //   where: { id: alignmentId },
      //   data: {
      //     approved: decision === 'approved',
      //     reviewedBy: reviewerId,
      //     reviewedAt: new Date(),
      //     reviewNotes: notes,
      //   },
      // });

      // logger.info('Theological alignment reviewed', {
      //   alignmentId,
      //   reviewerId,
      //   decision,
      // });
    } catch (error) {
      logger.error('Error reviewing alignment', { error, alignmentId });
      throw error;
    }
  }

  // Private helper methods

  private loadStatementOfFaith(): string {
    return `
# ScrollUniversity Statement of Faith

## The Holy Scriptures
We believe the Bible, consisting of the Old and New Testaments, is the inspired, infallible, and authoritative Word of God. It is the supreme and final authority in all matters of faith and practice.

## The Trinity
We believe in one God, eternally existing in three persons: Father, Son, and Holy Spirit, co-equal in nature, power, and glory.

## Jesus Christ
We believe in the deity of Jesus Christ, His virgin birth, His sinless life, His miracles, His vicarious and atoning death through His shed blood, His bodily resurrection, His ascension to the right hand of the Father, and His personal return in power and glory.

## The Holy Spirit
We believe in the present ministry of the Holy Spirit, by whose indwelling the Christian is enabled to live a godly life and to perform good works.

## Salvation
We believe that salvation is by grace alone, through faith alone, in Christ alone. It is the free gift of God, not earned by human merit or works.

## The Church
We believe in the spiritual unity of believers in our Lord Jesus Christ and that all true believers are members of His body, the Church.

## Resurrection and Eternal Life
We believe in the resurrection of both the saved and the lost; the saved unto eternal life and the lost unto eternal damnation.

## The Great Commission
We believe in the personal responsibility of all believers to share the Gospel with all people and to make disciples of all nations.
    `.trim();
  }

  private async analyzeTheologicalContent(
    content: string,
    context?: any
  ): Promise<any> {
    const prompt = `You are a theological reviewer for a Christian university. Analyze the following content for theological alignment with orthodox Christian doctrine.

STATEMENT OF FAITH:
${this.statementOfFaith}

CONTENT TO ANALYZE:
${content}

${context ? `CONTEXT: ${JSON.stringify(context, null, 2)}` : ''}

Provide a detailed analysis in JSON format with the following structure:
{
  "overallAlignment": "excellent|good|concerning|problematic",
  "doctrinalIssues": [
    {
      "severity": "low|medium|high|critical",
      "category": "doctrinal|ethical|scriptural|cultural",
      "description": "Description of the issue",
      "location": "Where in the content this appears",
      "recommendation": "How to address this"
    }
  ],
  "strengths": ["List of theological strengths"],
  "concerns": ["List of concerns"],
  "recommendations": ["Recommendations for improvement"]
}

Be thorough but fair. Minor stylistic differences are acceptable. Focus on substantive theological errors or concerning teachings.`;

    const response = await this.aiGateway.generateCompletion({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert theological reviewer with deep knowledge of Christian doctrine and biblical theology.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      responseFormat: { type: 'json_object' },
    });

    return JSON.parse(response.content);
  }

  private calculateAlignmentScore(analysis: any): number {
    const alignmentMap: Record<string, number> = {
      excellent: 1.0,
      good: 0.9,
      concerning: 0.7,
      problematic: 0.5,
    };

    const baseScore = alignmentMap[analysis.overallAlignment] || 0.5;

    // Reduce score based on severity of issues
    const criticalIssues = analysis.doctrinalIssues?.filter(
      (i: any) => i.severity === 'critical'
    ).length || 0;
    const highIssues = analysis.doctrinalIssues?.filter(
      (i: any) => i.severity === 'high'
    ).length || 0;

    const penalty = criticalIssues * 0.2 + highIssues * 0.1;

    return Math.max(0, Math.min(1, baseScore - penalty));
  }

  private extractConcerns(analysis: any): TheologicalConcern[] {
    if (!analysis.doctrinalIssues || analysis.doctrinalIssues.length === 0) {
      return [];
    }

    return analysis.doctrinalIssues.map((issue: any) => ({
      severity: issue.severity as 'low' | 'medium' | 'high' | 'critical',
      category: issue.category as 'doctrinal' | 'ethical' | 'scriptural' | 'cultural',
      description: issue.description,
      location: issue.location,
      recommendation: issue.recommendation,
    }));
  }

  private async alertTheologicalReviewers(
    serviceType: AIServiceType,
    content: string,
    concerns: TheologicalConcern[]
  ): Promise<void> {
    try {
      // TODO: Add user and aIReviewWorkflow models to Prisma schema
      logger.info('Creating theological review workflow', { serviceType });
      return;
      // Get theological reviewers
      // const reviewers = await prisma.user.findMany({
      //   where: {
      //     role: 'FACULTY',
      //     // Add additional criteria for theological reviewers
      //   },
      //   take: 3,
      // });

      // Create review workflow items
      // for (const reviewer of reviewers) {
      //   await prisma.aIReviewWorkflow.create({
      //     data: {
      //       itemType: 'theological_content',
      //       serviceType,
      //       status: 'pending',
      //       priority: concerns.some(c => c.severity === 'critical') ? 'urgent' : 'high',
      //       assignedTo: reviewer.id,
      //       submittedBy: 'system',
      //       metadata: {
      //         content: content.substring(0, 1000),
      //         concerns,
      //       } as any,
      //     },
      //   });
      // }

      // logger.info('Theological reviewers alerted', {
      //   serviceType,
      //   reviewerCount: reviewers.length,
      //   concernCount: concerns.length,
      // });
    } catch (error) {
      logger.error('Error alerting theological reviewers', { error });
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Get common theological issues
   */
  async getCommonIssues(
    serviceType?: AIServiceType,
    limit: number = 10
  ): Promise<Array<{ issue: string; count: number; severity: string }>> {
    try {
      // TODO: Add aITheologicalAlignment model to Prisma schema
      return [];
      // const alignments = await prisma.aITheologicalAlignment.findMany({
      //   where: serviceType ? { serviceType } : undefined,
      //   orderBy: { createdAt: 'desc' },
      //   take: 1000,
      // });

      // Extract and count issues
      // const issueMap = new Map<string, { count: number; severity: string }>();

      // for (const alignment of alignments) {
      //   const concerns = alignment.concerns as TheologicalConcern[];
      //   for (const concern of concerns) {
      //     const key = `${concern.category}:${concern.description}`;
      //     const existing = issueMap.get(key);
      //     if (existing) {
      //       existing.count++;
      //     } else {
      //       issueMap.set(key, { count: 1, severity: concern.severity });
      //     }
      //   }
      // }

      // Convert to array and sort by count
      // const issues = Array.from(issueMap.entries())
      //   .map(([issue, data]) => ({
      //     issue,
      //     count: data.count,
      //     severity: data.severity,
      //   }))
      //   .sort((a, b) => b.count - a.count)
      //   .slice(0, limit);

      // return issues;
    } catch (error) {
      logger.error('Error getting common theological issues', { error });
      throw error;
    }
  }
}
