/**
 * ScrollUniversity Decision Management Service
 * "For I know the plans I have for you, declares the Lord" - Jeremiah 29:11
 */

import { PrismaClient, AdmissionDecisionType, ApplicationStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import { DecisionMakingRequest, DecisionResult, ScholarshipEligibility } from '../types/admissions.types';
import { AdmissionsAIService } from './AdmissionsAIService';

const prisma = new PrismaClient();

export class DecisionManagementService {
  private admissionsAI: AdmissionsAIService;

  constructor() {
    this.admissionsAI = new AdmissionsAIService();
  }

  async makeDecision(request: DecisionMakingRequest): Promise<DecisionResult> {
    try {
      logger.info(`Making admission decision for application ${request.applicationId}`);

      // Calculate overall score
      const overallScore = this.calculateOverallScore(request);

      // Get AI recommendation
      const aiRecommendation = await this.admissionsAI.generateDecisionRecommendation({
        applicationId: request.applicationId,
        overallScore,
        componentScores: {
          academic: request.eligibilityResult.academicPrerequisites.score || 0,
          spiritual: request.spiritualEvaluations[0]?.overallScore || 0,
          leadership: 75, // Placeholder
          missionAlignment: request.spiritualEvaluations[0]?.scrollAlignment || 0
        },
        essayEvaluations: []
      });

      // Determine final decision
      const decision = aiRecommendation.decision;

      // Check scholarship eligibility
      const scholarshipEligibility: ScholarshipEligibility | undefined = 
        decision === AdmissionDecisionType.ACCEPTED && overallScore >= 85
          ? {
              eligible: true,
              scholarshipType: 'Merit Scholarship',
              amount: 10000,
              reasoning: 'Outstanding academic and spiritual qualifications'
            }
          : undefined;

      // Create decision record
      const decisionRecord = await prisma.admissionDecision.create({
        data: {
          applicationId: request.applicationId,
          decision,
          decisionDate: new Date(),
          decisionMakers: JSON.stringify(['Admissions Committee', 'AI System']),
          strengths: JSON.stringify(aiRecommendation.strengths),
          concerns: JSON.stringify(aiRecommendation.concerns),
          recommendations: JSON.stringify(aiRecommendation.recommendations),
          overallAssessment: aiRecommendation.reasoning,
          admissionConditions: JSON.stringify([]),
          enrollmentDeadline: decision === AdmissionDecisionType.ACCEPTED 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
            : undefined,
          nextSteps: JSON.stringify(this.getNextSteps(decision)),
          appealEligible: decision !== AdmissionDecisionType.ACCEPTED,
          appealDeadline: decision !== AdmissionDecisionType.ACCEPTED 
            ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) 
            : undefined
        }
      });

      // Update application status
      const newStatus = this.getApplicationStatus(decision);
      await prisma.application.update({
        where: { id: request.applicationId },
        data: {
          status: newStatus,
          admissionDecision: decision,
          decisionDate: new Date()
        }
      });

      const result: DecisionResult = {
        applicationId: request.applicationId,
        decision,
        decisionDate: new Date(),
        decisionMakers: ['Admissions Committee', 'AI System'],
        strengths: aiRecommendation.strengths,
        concerns: aiRecommendation.concerns,
        recommendations: aiRecommendation.recommendations,
        overallAssessment: aiRecommendation.reasoning,
        admissionConditions: [],
        enrollmentDeadline: decisionRecord.enrollmentDeadline || undefined,
        scholarshipEligibility,
        nextSteps: this.getNextSteps(decision),
        appealEligible: decisionRecord.appealEligible,
        appealDeadline: decisionRecord.appealDeadline || undefined
      };

      logger.info(`Decision made: ${request.applicationId} - ${decision}`);
      return result;

    } catch (error) {
      logger.error('Error making decision:', error);
      throw new Error(`Failed to make decision: ${(error as Error).message}`);
    }
  }

  private calculateOverallScore(request: DecisionMakingRequest): number {
    const eligibilityScore = (
      (request.eligibilityResult.basicRequirements.score || 0) +
      (request.eligibilityResult.academicPrerequisites.score || 0) +
      (request.eligibilityResult.languageProficiency.score || 0)
    ) / 3;

    const spiritualScore = request.spiritualEvaluations.length > 0
      ? request.spiritualEvaluations[0].overallScore
      : 0;

    const interviewScore = request.interviewResults.length > 0
      ? (
          request.interviewResults[0].assessmentScores.communicationScore +
          request.interviewResults[0].assessmentScores.spiritualMaturityScore +
          request.interviewResults[0].assessmentScores.academicReadinessScore +
          request.interviewResults[0].assessmentScores.characterScore +
          request.interviewResults[0].assessmentScores.motivationScore +
          request.interviewResults[0].assessmentScores.culturalFitScore
        ) / 6
      : 0;

    // Weighted average
    const overallScore = (
      eligibilityScore * 0.3 +
      spiritualScore * 0.4 +
      interviewScore * 0.3
    );

    return Math.round(overallScore);
  }

  private getApplicationStatus(decision: AdmissionDecisionType): ApplicationStatus {
    switch (decision) {
      case AdmissionDecisionType.ACCEPTED:
        return ApplicationStatus.ACCEPTED;
      case AdmissionDecisionType.REJECTED:
        return ApplicationStatus.REJECTED;
      case AdmissionDecisionType.WAITLISTED:
        return ApplicationStatus.WAITLISTED;
      case AdmissionDecisionType.DEFERRED:
        return ApplicationStatus.DEFERRED;
      default:
        return ApplicationStatus.DECISION_PENDING;
    }
  }

  private getNextSteps(decision: AdmissionDecisionType): string[] {
    switch (decision) {
      case AdmissionDecisionType.ACCEPTED:
        return [
          'Review your acceptance letter',
          'Complete enrollment process',
          'Pay enrollment deposit',
          'Register for courses',
          'Attend orientation'
        ];
      case AdmissionDecisionType.REJECTED:
        return [
          'Review feedback from admissions committee',
          'Consider reapplying in the future',
          'Explore alternative programs',
          'File an appeal if you believe there was an error'
        ];
      case AdmissionDecisionType.WAITLISTED:
        return [
          'Remain patient while we review additional applications',
          'Submit any additional materials that strengthen your application',
          'Confirm your continued interest'
        ];
      default:
        return ['Check your email for updates'];
    }
  }
}

export default DecisionManagementService;
