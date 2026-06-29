/**
 * ScrollUniversity Admissions Decision Management Service
 * "For I know the plans I have for you," declares the Lord - Jeremiah 29:11
 * 
 * This service orchestrates the complete admission decision process including
 * decision processing, committee coordination, documentation, and communication.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import DecisionProcessor, { DecisionInput, DecisionResult } from './DecisionProcessor';
import CommitteeCoordinator, { CommitteeDecision, VotingSession } from './CommitteeCoordinator';
import DecisionReasoningDocumentor, { DecisionJustification } from './DecisionReasoningDocumentor';
import DecisionNotificationManager from './DecisionNotificationManager';

const prisma = new PrismaClient();

export interface DecisionRequest {
  applicationId: string;
  requestType: 'AUTOMATED' | 'COMMITTEE_REVIEW' | 'EXPEDITED' | 'APPEAL_REVIEW';
  requesterRole: string;
  requesterId: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  specialInstructions?: string;
  deadline?: Date;
}

export interface DecisionProcessResult {
  applicationId: string;
  processType: 'AUTOMATED' | 'COMMITTEE';
  decision: 'ACCEPTED' | 'REJECTED' | 'WAITLISTED' | 'CONDITIONAL_ACCEPTANCE';
  decisionScore: number;
  confidence: number;
  processingTime: number;
  decisionMakers: string[];
  justification: DecisionJustification;
  notificationResult: any;
  nextSteps: string[];
  appealEligible: boolean;
  completedAt: Date;
}

export interface DecisionMetrics {
  totalDecisions: number;
  decisionBreakdown: {
    accepted: number;
    rejected: number;
    waitlisted: number;
    conditional: number;
  };
  averageProcessingTime: number;
  automatedDecisions: number;
  committeeDecisions: number;
  appealRate: number;
  satisfactionScore: number;
}

export class DecisionManagementService {
  private decisionProcessor: DecisionProcessor;
  private committeeCoordinator: CommitteeCoordinator;
  private reasoningDocumentor: DecisionReasoningDocumentor;
  private notificationManager: DecisionNotificationManager;

  constructor() {
    this.decisionProcessor = new DecisionProcessor();
    this.committeeCoordinator = new CommitteeCoordinator();
    this.reasoningDocumentor = new DecisionReasoningDocumentor();
    this.notificationManager = new DecisionNotificationManager();
  }

  /**
   * Process admission decision with full workflow
   */
  async processAdmissionDecision(request: DecisionRequest): Promise<DecisionProcessResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`Processing admission decision for application: ${request.applicationId}`);

      // Validate request and application
      await this.validateDecisionRequest(request);

      // Gather assessment data
      const assessmentData = await this.gatherAssessmentData(request.applicationId);

      // Determine processing approach
      const processingApproach = await this.determineProcessingApproach(request, assessmentData);

      let decisionResult: DecisionResult;
      let decisionMakers: string[] = [];
      let processType: 'AUTOMATED' | 'COMMITTEE';

      if (processingApproach === 'AUTOMATED') {
        // Process automated decision
        decisionResult = await this.processAutomatedDecision(request, assessmentData);
        decisionMakers = ['AUTOMATED_SYSTEM'];
        processType = 'AUTOMATED';
      } else {
        // Process committee decision
        const committeeResult = await this.processCommitteeDecision(request, assessmentData);
        decisionResult = this.convertCommitteeToDecisionResult(committeeResult);
        decisionMakers = committeeResult.individualVotes.map(vote => vote.memberName);
        processType = 'COMMITTEE';
      }

      // Generate comprehensive justification
      const justification = await this.reasoningDocumentor.generateDecisionJustification(
        request.applicationId,
        decisionResult,
        assessmentData
      );

      // Store decision in database
      await this.storeDecisionRecord(request.applicationId, decisionResult, justification, decisionMakers);

      // Send notifications
      const notificationResult = await this.notificationManager.sendDecisionNotification(
        request.applicationId,
        decisionResult,
        request.specialInstructions
      );

      // Update application status
      await this.updateApplicationStatus(request.applicationId, decisionResult.decision);

      // Generate next steps
      const nextSteps = this.generateNextSteps(decisionResult);

      const processingTime = Date.now() - startTime;

      const result: DecisionProcessResult = {
        applicationId: request.applicationId,
        processType,
        decision: decisionResult.decision,
        decisionScore: decisionResult.overallScore,
        confidence: decisionResult.confidence,
        processingTime,
        decisionMakers,
        justification,
        notificationResult,
        nextSteps,
        appealEligible: this.isAppealEligible(decisionResult),
        completedAt: new Date()
      };

      logger.info(`Decision processed successfully: ${decisionResult.decision} (${processingTime}ms)`);
      return result;

    } catch (error) {
      logger.error('Error processing admission decision:', error);
      throw new Error(`Decision processing failed: ${error.message}`);
    }
  }

  /**
   * Validate decision request
   */
  private async validateDecisionRequest(request: DecisionRequest): Promise<void> {
    // Check if application exists
    const application = await prisma.applications.findUnique({
      where: { id: request.applicationId }
    });

    if (!application) {
      throw new Error('Application not found');
    }

    // Check if application is in correct status
    const validStatuses = ['ASSESSMENT_PENDING', 'INTERVIEW_SCHEDULED', 'DECISION_PENDING'];
    if (!validStatuses.includes(application.status)) {
      throw new Error(`Application status ${application.status} is not valid for decision processing`);
    }

    // Check if decision already exists
    const existingDecision = await prisma.admission_decisions.findFirst({
      where: { applicationId: request.applicationId }
    });

    if (existingDecision && request.requestType !== 'APPEAL_REVIEW') {
      throw new Error('Decision already exists for this application');
    }

    // Validate requester permissions
    await this.validateRequesterPermissions(request.requesterId, request.requesterRole);
  }

  /**
   * Gather all assessment data for decision making
   */
  private async gatherAssessmentData(applicationId: string) {
    const application = await prisma.applications.findUnique({
      where: { id: applicationId },
      include: {
        applicant: true,
        eligibilityAssessments: true,
        spiritualEvaluations: true,
        academicEvaluations: true,
        interviewRecords: true
      }
    });

    if (!application) {
      throw new Error('Application not found');
    }

    return {
      application,
      eligibilityResult: application.eligibilityAssessments[0],
      spiritualEvaluation: application.spiritualEvaluations[0],
      academicEvaluation: application.academicEvaluations[0],
      interviewResults: application.interviewRecords.filter(interview => 
        interview.status === 'COMPLETED'
      )
    };
  }

  /**
   * Determine whether to use automated or committee processing
   */
  private async determineProcessingApproach(
    request: DecisionRequest,
    assessmentData: any
  ): Promise<'AUTOMATED' | 'COMMITTEE'> {
    
    // Force committee review for certain request types
    if (['COMMITTEE_REVIEW', 'APPEAL_REVIEW'].includes(request.requestType)) {
      return 'COMMITTEE';
    }

    // Use committee for complex cases
    if (this.requiresCommitteeReview(assessmentData)) {
      return 'COMMITTEE';
    }

    // Use committee for high-stakes decisions
    if (this.isHighStakesDecision(assessmentData)) {
      return 'COMMITTEE';
    }

    // Default to automated processing
    return 'AUTOMATED';
  }

  /**
   * Process automated decision
   */
  private async processAutomatedDecision(
    request: DecisionRequest,
    assessmentData: any
  ): Promise<DecisionResult> {
    
    const decisionInput: DecisionInput = {
      applicationId: request.applicationId,
      spiritualEvaluation: assessmentData.spiritualEvaluation,
      academicEvaluation: assessmentData.academicEvaluation,
      interviewResults: assessmentData.interviewResults,
      eligibilityResult: assessmentData.eligibilityResult
    };

    // Get decision configuration
    const { weights, criteria } = await this.decisionProcessor.getDecisionConfiguration();

    // Process decision
    return await this.decisionProcessor.processDecision(decisionInput, weights, criteria);
  }

  /**
   * Process committee decision
   */
  private async processCommitteeDecision(
    request: DecisionRequest,
    assessmentData: any
  ): Promise<CommitteeDecision> {
    
    // Create voting session
    const sessionType = request.requestType === 'EXPEDITED' ? 'EXPEDITED' : 'REGULAR';
    const votingSession = await this.committeeCoordinator.createVotingSession(
      request.applicationId,
      sessionType,
      {
        expedited: request.requestType === 'EXPEDITED',
        elderOversight: this.requiresElderOversight(assessmentData)
      }
    );

    // For this implementation, we'll simulate committee voting
    // In a real system, this would wait for actual committee member votes
    const simulatedVotes = await this.simulateCommitteeVotes(votingSession, assessmentData);

    // Process votes
    const votingResult = await this.committeeCoordinator.processCommitteeVotes(
      votingSession.id,
      simulatedVotes
    );

    // Finalize decision
    return await this.committeeCoordinator.finalizeCommitteeDecision(
      votingSession.id,
      request.applicationId,
      votingResult,
      simulatedVotes
    );
  }

  /**
   * Convert committee decision to standard decision result format
   */
  private convertCommitteeToDecisionResult(committeeDecision: CommitteeDecision): DecisionResult {
    return {
      decision: committeeDecision.finalDecision as any,
      overallScore: committeeDecision.votingResult.weightedScore * 100,
      componentScores: {
        spiritual: 0, // Would be calculated from committee input
        academic: 0,
        character: 0,
        interview: 0,
        eligibility: 0
      },
      strengths: [], // Would be extracted from committee reasoning
      concerns: [],
      recommendations: committeeDecision.nextSteps,
      reasoning: committeeDecision.decisionReasoning,
      confidence: committeeDecision.votingResult.consensus ? 95 : 75
    };
  }

  /**
   * Store decision record in database
   */
  private async storeDecisionRecord(
    applicationId: string,
    decisionResult: DecisionResult,
    justification: DecisionJustification,
    decisionMakers: string[]
  ): Promise<void> {
    
    await prisma.admission_decisions.create({
      data: {
        applicationId,
        decision: decisionResult.decision,
        decisionDate: new Date(),
        decisionMakers: decisionMakers.map(name => ({ name, role: 'DECISION_MAKER' })),
        strengths: decisionResult.strengths,
        concerns: decisionResult.concerns,
        recommendations: decisionResult.recommendations,
        overallAssessment: decisionResult.reasoning,
        futureConsiderations: [],
        admissionConditions: [],
        appealEligible: this.isAppealEligible(decisionResult),
        nextSteps: this.generateNextSteps(decisionResult)
      }
    });
  }

  /**
   * Update application status based on decision
   */
  private async updateApplicationStatus(applicationId: string, decision: string): Promise<void> {
    let status: string;

    switch (decision) {
      case 'ACCEPTED':
        status = 'ACCEPTED';
        break;
      case 'CONDITIONAL_ACCEPTANCE':
        status = 'ACCEPTED'; // With conditions noted separately
        break;
      case 'WAITLISTED':
        status = 'WAITLISTED';
        break;
      case 'REJECTED':
        status = 'REJECTED';
        break;
      default:
        status = 'DECISION_PENDING';
    }

    await prisma.applications.update({
      where: { id: applicationId },
      data: { 
        status: status as any,
        admissionDecision: decision as any,
        decisionDate: new Date()
      }
    });
  }

  /**
   * Generate next steps based on decision
   */
  private generateNextSteps(decisionResult: DecisionResult): string[] {
    const steps: string[] = [];

    switch (decisionResult.decision) {
      case 'ACCEPTED':
        steps.push('Send enrollment confirmation instructions');
        steps.push('Assign ScrollMentor');
        steps.push('Schedule orientation');
        break;
      case 'CONDITIONAL_ACCEPTANCE':
        steps.push('Provide condition fulfillment instructions');
        steps.push('Schedule condition review meeting');
        break;
      case 'WAITLISTED':
        steps.push('Add to waitlist with appropriate priority');
        steps.push('Send waitlist management communications');
        break;
      case 'REJECTED':
        steps.push('Provide development feedback');
        steps.push('Offer reapplication guidance');
        break;
    }

    return steps;
  }

  /**
   * Helper methods for decision logic
   */
  private requiresCommitteeReview(assessmentData: any): boolean {
    // Complex spiritual cases
    if (assessmentData.spiritualEvaluation?.scrollAlignment < 0.6) {
      return true;
    }

    // Significant academic concerns
    if (assessmentData.academicEvaluation?.academicReadiness < 50) {
      return true;
    }

    // Conflicting interview results
    if (assessmentData.interviewResults?.length > 1) {
      const recommendations = assessmentData.interviewResults.map((i: any) => i.overallRecommendation);
      const hasConflict = recommendations.includes('STRONG_RECOMMEND') && 
                         recommendations.includes('NOT_RECOMMEND');
      if (hasConflict) return true;
    }

    return false;
  }

  private isHighStakesDecision(assessmentData: any): boolean {
    // High-potential candidates
    if (assessmentData.spiritualEvaluation?.scrollAlignment > 0.9 &&
        assessmentData.academicEvaluation?.learningPotential > 9) {
      return true;
    }

    // Special program applications
    if (assessmentData.application?.programApplied === 'SCROLL_DOCTORATE') {
      return true;
    }

    return false;
  }

  private requiresElderOversight(assessmentData: any): boolean {
    // Spiritual discernment cases
    return assessmentData.spiritualEvaluation?.propheticInput !== null;
  }

  private isAppealEligible(decisionResult: DecisionResult): boolean {
    // Appeals allowed for rejections and waitlist decisions
    return ['REJECTED', 'WAITLISTED'].includes(decisionResult.decision);
  }

  private async validateRequesterPermissions(requesterId: string, requesterRole: string): Promise<void> {
    const validRoles = [
      'ADMISSIONS_OFFICER',
      'ADMISSIONS_COMMITTEE',
      'SCROLL_ELDER',
      'CHANCELLOR'
    ];

    if (!validRoles.includes(requesterRole)) {
      throw new Error('Insufficient permissions to request admission decision');
    }
  }

  /**
   * Simulate committee votes for demonstration
   * In a real system, this would be replaced by actual committee member voting
   */
  private async simulateCommitteeVotes(votingSession: VotingSession, assessmentData: any) {
    // This is a simplified simulation - real implementation would collect actual votes
    const votes = votingSession.members.map(member => ({
      memberId: member.id,
      memberName: member.name,
      vote: this.simulateIndividualVote(member, assessmentData),
      confidence: 0.8 + Math.random() * 0.2,
      reasoning: `Based on comprehensive assessment of the applicant's qualifications and alignment with ScrollUniversity values.`,
      spiritualDiscernment: member.expertise.includes('spiritual_discernment') 
        ? 'Sense of peace and alignment with this decision' 
        : undefined,
      timestamp: new Date(),
      weight: member.votingWeight
    }));

    return votes;
  }

  private simulateIndividualVote(member: any, assessmentData: any): 'ACCEPT' | 'REJECT' | 'WAITLIST' | 'CONDITIONAL' | 'ABSTAIN' {
    // Simplified voting logic based on assessment scores
    const spiritualScore = assessmentData.spiritualEvaluation?.overallScore || 0;
    const academicScore = assessmentData.academicEvaluation?.academicReadiness || 0;
    
    const averageScore = (spiritualScore + academicScore) / 2;

    if (averageScore >= 80) return 'ACCEPT';
    if (averageScore >= 70) return 'CONDITIONAL';
    if (averageScore >= 60) return 'WAITLIST';
    return 'REJECT';
  }

  /**
   * Get decision metrics for analytics
   */
  async getDecisionMetrics(timeframe: { start: Date; end: Date }): Promise<DecisionMetrics> {
    const decisions = await prisma.admission_decisions.findMany({
      where: {
        decisionDate: {
          gte: timeframe.start,
          lte: timeframe.end
        }
      }
    });

    const totalDecisions = decisions.length;
    const decisionBreakdown = {
      accepted: decisions.filter(d => d.decision === 'ACCEPTED').length,
      rejected: decisions.filter(d => d.decision === 'REJECTED').length,
      waitlisted: decisions.filter(d => d.decision === 'WAITLISTED').length,
      conditional: decisions.filter(d => d.decision === 'CONDITIONAL_ACCEPTANCE').length
    };

    return {
      totalDecisions,
      decisionBreakdown,
      averageProcessingTime: 0, // Would be calculated from processing logs
      automatedDecisions: 0, // Would be tracked separately
      committeeDecisions: 0, // Would be tracked separately
      appealRate: 0, // Would be calculated from appeal records
      satisfactionScore: 0 // Would be gathered from feedback surveys
    };
  }
}

export default DecisionManagementService;