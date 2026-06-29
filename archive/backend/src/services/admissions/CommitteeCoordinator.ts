/**
 * ScrollUniversity Admissions Committee Coordination System
 * "Where two or three gather in my name, there am I with them" - Matthew 18:20
 * 
 * This service manages admission committee coordination, voting, and collaborative decision-making
 * with proper spiritual covering and elder oversight.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export interface CommitteeMember {
  id: string;
  name: string;
  role: string;
  email: string;
  expertise: string[];
  votingWeight: number;
  isAvailable: boolean;
}

export interface VotingSession {
  id: string;
  applicationId: string;
  sessionType: 'REGULAR' | 'EXPEDITED' | 'APPEAL_REVIEW' | 'SPECIAL_CASE';
  requiredQuorum: number;
  votingDeadline: Date;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  chairpersonId: string;
  members: CommitteeMember[];
}

export interface CommitteeVote {
  memberId: string;
  memberName: string;
  vote: 'ACCEPT' | 'REJECT' | 'WAITLIST' | 'CONDITIONAL' | 'ABSTAIN';
  confidence: number;
  reasoning: string;
  spiritualDiscernment?: string;
  timestamp: Date;
  weight: number;
}

export interface VotingResult {
  decision: 'ACCEPTED' | 'REJECTED' | 'WAITLISTED' | 'CONDITIONAL_ACCEPTANCE' | 'NO_CONSENSUS';
  totalVotes: number;
  weightedScore: number;
  voteBreakdown: {
    accept: number;
    reject: number;
    waitlist: number;
    conditional: number;
    abstain: number;
  };
  consensus: boolean;
  quorumMet: boolean;
  spiritualAlignment: boolean;
  elderApproval?: boolean;
}

export interface CommitteeDecision {
  sessionId: string;
  applicationId: string;
  votingResult: VotingResult;
  individualVotes: CommitteeVote[];
  finalDecision: string;
  decisionReasoning: string;
  spiritualCovering: string;
  nextSteps: string[];
  appealEligible: boolean;
  decidedAt: Date;
}

export class CommitteeCoordinator {
  private readonly MINIMUM_QUORUM = 3;
  private readonly CONSENSUS_THRESHOLD = 0.75;
  private readonly SPIRITUAL_ALIGNMENT_THRESHOLD = 0.8;

  /**
   * Create a new voting session for an application
   */
  async createVotingSession(
    applicationId: string,
    sessionType: VotingSession['sessionType'] = 'REGULAR',
    specialRequirements?: {
      requiredExpertise?: string[];
      expedited?: boolean;
      elderOversight?: boolean;
    }
  ): Promise<VotingSession> {
    try {
      logger.info(`Creating voting session for application: ${applicationId}`);

      // Get application details
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

      // Select appropriate committee members
      const members = await this.selectCommitteeMembers(
        application,
        specialRequirements?.requiredExpertise || [],
        sessionType
      );

      // Determine voting parameters
      const requiredQuorum = Math.max(this.MINIMUM_QUORUM, Math.ceil(members.length * 0.6));
      const votingDeadline = specialRequirements?.expedited 
        ? new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Select chairperson (highest ranking available member)
      const chairperson = this.selectChairperson(members);

      const session: VotingSession = {
        id: `session_${Date.now()}_${applicationId.slice(-8)}`,
        applicationId,
        sessionType,
        requiredQuorum,
        votingDeadline,
        status: 'PENDING',
        chairpersonId: chairperson.id,
        members
      };

      // Notify committee members
      await this.notifyCommitteeMembers(session, application);

      logger.info(`Voting session created: ${session.id} with ${members.length} members`);
      return session;

    } catch (error) {
      logger.error('Error creating voting session:', error);
      throw new Error(`Failed to create voting session: ${error.message}`);
    }
  }

  /**
   * Select appropriate committee members based on application requirements
   */
  private async selectCommitteeMembers(
    application: any,
    requiredExpertise: string[],
    sessionType: string
  ): Promise<CommitteeMember[]> {
    
    // Get all available committee members
    const availableMembers = await prisma.users.findMany({
      where: {
        role: {
          in: ['ADMISSIONS_COMMITTEE', 'SCROLL_ELDER', 'PROPHET', 'CHANCELLOR']
        }
      }
    });

    const members: CommitteeMember[] = [];

    // Always include core committee members
    const coreMembers = availableMembers.filter(user => 
      user.role === 'ADMISSIONS_COMMITTEE' || user.role === 'SCROLL_ELDER'
    );

    members.push(...coreMembers.map(user => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      email: user.email,
      expertise: this.getUserExpertise(user),
      votingWeight: this.getVotingWeight(user.role),
      isAvailable: true
    })));

    // Add specialized members based on application needs
    if (this.requiresSpiritualExpertise(application)) {
      const spiritualExperts = availableMembers.filter(user => 
        user.role === 'PROPHET' || user.spiritualGifts?.includes('discernment')
      );
      
      members.push(...spiritualExperts.slice(0, 2).map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        email: user.email,
        expertise: ['spiritual_discernment', 'prophetic_insight'],
        votingWeight: this.getVotingWeight(user.role),
        isAvailable: true
      })));
    }

    // Add academic experts if needed
    if (this.requiresAcademicExpertise(application)) {
      const academicExperts = availableMembers.filter(user => 
        user.role === 'FACULTY' && this.hasAcademicExpertise(user)
      );
      
      members.push(...academicExperts.slice(0, 1).map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        email: user.email,
        expertise: ['academic_assessment', 'curriculum_design'],
        votingWeight: this.getVotingWeight(user.role),
        isAvailable: true
      })));
    }

    // Ensure minimum committee size
    if (members.length < this.MINIMUM_QUORUM) {
      const additionalMembers = availableMembers
        .filter(user => !members.some(m => m.id === user.id))
        .slice(0, this.MINIMUM_QUORUM - members.length);

      members.push(...additionalMembers.map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        email: user.email,
        expertise: this.getUserExpertise(user),
        votingWeight: this.getVotingWeight(user.role),
        isAvailable: true
      })));
    }

    return members;
  }

  /**
   * Process committee votes and determine final decision
   */
  async processCommitteeVotes(
    sessionId: string,
    votes: CommitteeVote[]
  ): Promise<VotingResult> {
    try {
      logger.info(`Processing committee votes for session: ${sessionId}`);

      // Validate votes
      const validVotes = votes.filter(vote => 
        vote.vote !== 'ABSTAIN' && vote.confidence >= 0.5
      );

      // Calculate vote breakdown
      const voteBreakdown = {
        accept: validVotes.filter(v => v.vote === 'ACCEPT').length,
        reject: validVotes.filter(v => v.vote === 'REJECT').length,
        waitlist: validVotes.filter(v => v.vote === 'WAITLIST').length,
        conditional: validVotes.filter(v => v.vote === 'CONDITIONAL').length,
        abstain: votes.filter(v => v.vote === 'ABSTAIN').length
      };

      // Calculate weighted scores
      const weightedScores = {
        accept: this.calculateWeightedScore(validVotes, 'ACCEPT'),
        reject: this.calculateWeightedScore(validVotes, 'REJECT'),
        waitlist: this.calculateWeightedScore(validVotes, 'WAITLIST'),
        conditional: this.calculateWeightedScore(validVotes, 'CONDITIONAL')
      };

      // Determine winning decision
      const maxScore = Math.max(...Object.values(weightedScores));
      let decision: VotingResult['decision'] = 'NO_CONSENSUS';

      if (weightedScores.accept === maxScore && maxScore >= this.CONSENSUS_THRESHOLD) {
        decision = 'ACCEPTED';
      } else if (weightedScores.reject === maxScore && maxScore >= this.CONSENSUS_THRESHOLD) {
        decision = 'REJECTED';
      } else if (weightedScores.waitlist === maxScore && maxScore >= this.CONSENSUS_THRESHOLD) {
        decision = 'WAITLISTED';
      } else if (weightedScores.conditional === maxScore && maxScore >= this.CONSENSUS_THRESHOLD) {
        decision = 'CONDITIONAL_ACCEPTANCE';
      }

      // Check for consensus and spiritual alignment
      const consensus = maxScore >= this.CONSENSUS_THRESHOLD;
      const spiritualAlignment = this.assessSpiritualAlignment(votes);
      const quorumMet = validVotes.length >= this.MINIMUM_QUORUM;

      const result: VotingResult = {
        decision,
        totalVotes: votes.length,
        weightedScore: maxScore,
        voteBreakdown,
        consensus,
        quorumMet,
        spiritualAlignment
      };

      logger.info(`Committee voting result: ${decision} with ${maxScore.toFixed(2)} weighted score`);
      return result;

    } catch (error) {
      logger.error('Error processing committee votes:', error);
      throw new Error(`Failed to process votes: ${error.message}`);
    }
  }

  /**
   * Finalize committee decision with proper documentation
   */
  async finalizeCommitteeDecision(
    sessionId: string,
    applicationId: string,
    votingResult: VotingResult,
    individualVotes: CommitteeVote[],
    elderApproval?: boolean
  ): Promise<CommitteeDecision> {
    try {
      logger.info(`Finalizing committee decision for application: ${applicationId}`);

      // Generate decision reasoning
      const decisionReasoning = this.generateDecisionReasoning(votingResult, individualVotes);
      
      // Generate spiritual covering statement
      const spiritualCovering = this.generateSpiritualCovering(individualVotes, elderApproval);
      
      // Determine next steps
      const nextSteps = this.determineNextSteps(votingResult.decision);
      
      // Check appeal eligibility
      const appealEligible = this.isAppealEligible(votingResult);

      const decision: CommitteeDecision = {
        sessionId,
        applicationId,
        votingResult,
        individualVotes,
        finalDecision: votingResult.decision,
        decisionReasoning,
        spiritualCovering,
        nextSteps,
        appealEligible,
        decidedAt: new Date()
      };

      // Store decision in database
      await this.storeCommitteeDecision(decision);

      // Notify stakeholders
      await this.notifyDecisionStakeholders(decision);

      logger.info(`Committee decision finalized: ${votingResult.decision}`);
      return decision;

    } catch (error) {
      logger.error('Error finalizing committee decision:', error);
      throw new Error(`Failed to finalize decision: ${error.message}`);
    }
  }

  /**
   * Helper methods
   */
  private getUserExpertise(user: any): string[] {
    const expertise: string[] = [];
    
    if (user.role === 'SCROLL_ELDER') expertise.push('spiritual_oversight', 'wisdom_counsel');
    if (user.role === 'PROPHET') expertise.push('prophetic_discernment', 'spiritual_insight');
    if (user.role === 'CHANCELLOR') expertise.push('institutional_leadership', 'strategic_vision');
    if (user.role === 'ADMISSIONS_COMMITTEE') expertise.push('admissions_process', 'candidate_evaluation');
    
    return expertise;
  }

  private getVotingWeight(role: string): number {
    switch (role) {
      case 'CHANCELLOR': return 2.0;
      case 'SCROLL_ELDER': return 1.5;
      case 'PROPHET': return 1.5;
      case 'ADMISSIONS_COMMITTEE': return 1.0;
      default: return 0.5;
    }
  }

  private selectChairperson(members: CommitteeMember[]): CommitteeMember {
    // Priority order: Chancellor > Scroll Elder > Prophet > Committee Member
    const priorityOrder = ['CHANCELLOR', 'SCROLL_ELDER', 'PROPHET', 'ADMISSIONS_COMMITTEE'];
    
    for (const role of priorityOrder) {
      const candidate = members.find(m => m.role === role && m.isAvailable);
      if (candidate) return candidate;
    }
    
    return members[0]; // Fallback to first available member
  }

  private requiresSpiritualExpertise(application: any): boolean {
    return application.spiritualEvaluations?.some((evaluation: any) => 
      evaluation.scrollAlignment < 0.7 || evaluation.spiritualMaturity === 'SEEKER'
    ) || false;
  }

  private requiresAcademicExpertise(application: any): boolean {
    return application.academicEvaluations?.some((evaluation: any) => 
      evaluation.academicReadiness < 60 || evaluation.supportNeeds?.length > 0
    ) || false;
  }

  private hasAcademicExpertise(user: any): boolean {
    return user.role === 'FACULTY' || user.academicLevel === 'SCROLL_DOCTORATE';
  }

  private calculateWeightedScore(votes: CommitteeVote[], targetVote: string): number {
    const relevantVotes = votes.filter(v => v.vote === targetVote);
    if (relevantVotes.length === 0) return 0;

    const totalWeight = votes.reduce((sum, vote) => sum + vote.weight, 0);
    const targetWeight = relevantVotes.reduce((sum, vote) => sum + vote.weight * vote.confidence, 0);
    
    return totalWeight > 0 ? targetWeight / totalWeight : 0;
  }

  private assessSpiritualAlignment(votes: CommitteeVote[]): boolean {
    const spiritualVotes = votes.filter(v => v.spiritualDiscernment);
    if (spiritualVotes.length === 0) return true; // No spiritual concerns raised

    const alignedVotes = spiritualVotes.filter(v => 
      v.spiritualDiscernment?.includes('aligned') || 
      v.spiritualDiscernment?.includes('peace') ||
      v.spiritualDiscernment?.includes('confirmation')
    );

    return alignedVotes.length / spiritualVotes.length >= this.SPIRITUAL_ALIGNMENT_THRESHOLD;
  }

  private generateDecisionReasoning(result: VotingResult, votes: CommitteeVote[]): string {
    let reasoning = `Committee decision reached with ${result.totalVotes} total votes. `;
    reasoning += `Vote breakdown: Accept (${result.voteBreakdown.accept}), `;
    reasoning += `Reject (${result.voteBreakdown.reject}), `;
    reasoning += `Waitlist (${result.voteBreakdown.waitlist}), `;
    reasoning += `Conditional (${result.voteBreakdown.conditional}), `;
    reasoning += `Abstain (${result.voteBreakdown.abstain}). `;

    if (result.consensus) {
      reasoning += 'Strong consensus achieved among committee members. ';
    } else {
      reasoning += 'Decision reached without full consensus, requiring careful consideration. ';
    }

    if (result.spiritualAlignment) {
      reasoning += 'Spiritual alignment confirmed through prayer and discernment. ';
    }

    // Add key reasoning points from individual votes
    const commonReasons = this.extractCommonReasons(votes);
    if (commonReasons.length > 0) {
      reasoning += `Key factors: ${commonReasons.join(', ')}.`;
    }

    return reasoning;
  }

  private generateSpiritualCovering(votes: CommitteeVote[], elderApproval?: boolean): string {
    let covering = 'This decision has been made under spiritual covering with prayer and discernment. ';
    
    const spiritualInputs = votes
      .filter(v => v.spiritualDiscernment)
      .map(v => v.spiritualDiscernment)
      .filter(Boolean);

    if (spiritualInputs.length > 0) {
      covering += 'Spiritual insights received: ';
      covering += spiritualInputs.slice(0, 3).join('; ') + '. ';
    }

    if (elderApproval) {
      covering += 'Elder approval and blessing received for this decision. ';
    }

    covering += 'We commit this decision to the Lord and trust His guidance in the process.';
    
    return covering;
  }

  private determineNextSteps(decision: string): string[] {
    const steps: string[] = [];

    switch (decision) {
      case 'ACCEPTED':
        steps.push('Send acceptance notification to applicant');
        steps.push('Initiate enrollment confirmation process');
        steps.push('Assign ScrollMentor for guidance');
        steps.push('Schedule orientation and onboarding');
        break;

      case 'CONDITIONAL_ACCEPTANCE':
        steps.push('Send conditional acceptance notification');
        steps.push('Provide detailed conditions and requirements');
        steps.push('Set timeline for condition fulfillment');
        steps.push('Schedule follow-up review');
        break;

      case 'WAITLISTED':
        steps.push('Add to appropriate waitlist with priority ranking');
        steps.push('Send waitlist notification with position');
        steps.push('Provide guidance for strengthening application');
        steps.push('Schedule periodic status updates');
        break;

      case 'REJECTED':
        steps.push('Send rejection notification with feedback');
        steps.push('Provide development recommendations');
        steps.push('Offer reapplication guidance');
        steps.push('Document decision for future reference');
        break;

      default:
        steps.push('Schedule additional committee review');
        steps.push('Seek additional input or assessment');
        break;
    }

    return steps;
  }

  private isAppealEligible(result: VotingResult): boolean {
    // Appeals allowed for close decisions or procedural concerns
    return !result.consensus || result.weightedScore < 0.8;
  }

  private extractCommonReasons(votes: CommitteeVote[]): string[] {
    const reasons: string[] = [];
    const reasonCounts: { [key: string]: number } = {};

    // Extract and count common themes from reasoning
    votes.forEach(vote => {
      const words = vote.reasoning.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 4) { // Only consider meaningful words
          reasonCounts[word] = (reasonCounts[word] || 0) + 1;
        }
      });
    });

    // Find most common themes
    const sortedReasons = Object.entries(reasonCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([reason]) => reason);

    return sortedReasons;
  }

  private async storeCommitteeDecision(decision: CommitteeDecision): Promise<void> {
    await prisma.admission_decisions.create({
      data: {
        applicationId: decision.applicationId,
        decision: decision.finalDecision as any,
        decisionDate: decision.decidedAt,
        decisionMakers: decision.individualVotes.map(v => ({
          memberId: v.memberId,
          memberName: v.memberName,
          role: 'COMMITTEE_MEMBER'
        })),
        committeeVotes: decision.individualVotes,
        strengths: [],
        concerns: [],
        recommendations: decision.nextSteps,
        overallAssessment: decision.decisionReasoning,
        futureConsiderations: [],
        admissionConditions: [],
        appealEligible: decision.appealEligible,
        nextSteps: decision.nextSteps
      }
    });
  }

  private async notifyCommitteeMembers(session: VotingSession, application: any): Promise<void> {
    // Implementation would send notifications to committee members
    logger.info(`Notifying ${session.members.length} committee members for session ${session.id}`);
  }

  private async notifyDecisionStakeholders(decision: CommitteeDecision): Promise<void> {
    // Implementation would notify applicant and relevant staff
    logger.info(`Notifying stakeholders of decision: ${decision.finalDecision}`);
  }
}

export default CommitteeCoordinator;