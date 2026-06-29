/**
 * ScrollUniversity Admissions - ScrollCoin Integration Service
 * "Give, and it will be given to you" - Luke 6:38
 * 
 * Integrates admissions system with ScrollCoin economy for application fees,
 * rewards, and financial incentives
 */

import { PrismaClient, ApplicationStatus } from '@prisma/client';
import { ScrollCoinService } from '../ScrollCoinService';
import { logger } from '../../utils/logger';

export interface ApplicationFeeData {
  applicationId: string;
  userId: string;
  feeAmount: number;
  paymentMethod: 'SCROLLCOIN' | 'TRADITIONAL' | 'WORK_TRADE';
  discountApplied?: number;
  scholarshipCredit?: number;
}

export interface AdmissionsRewardData {
  userId: string;
  applicationId: string;
  rewardType: 'APPLICATION_SUBMITTED' | 'INTERVIEW_COMPLETED' | 'ASSESSMENT_PASSED' | 'ENROLLMENT_CONFIRMED' | 'REFERRAL_BONUS';
  amount: number;
  description: string;
  milestone?: string;
}

export interface WorkTradeCredit {
  userId: string;
  applicationId: string;
  workType: 'COMMUNITY_SERVICE' | 'MINISTRY_WORK' | 'ACADEMIC_ASSISTANCE' | 'TECHNICAL_SUPPORT';
  hoursWorked: number;
  creditRate: number;
  totalCredit: number;
  verificationRequired: boolean;
}

export interface ScrollCoinAdmissionsConfig {
  applicationFee: number;
  assessmentFee: number;
  interviewFee: number;
  rewardRates: {
    applicationSubmitted: number;
    interviewCompleted: number;
    assessmentPassed: number;
    enrollmentConfirmed: number;
    referralBonus: number;
  };
  workTradeRates: {
    communityService: number;
    ministryWork: number;
    academicAssistance: number;
    technicalSupport: number;
  };
  discountThresholds: {
    earlyApplication: number;
    multipleReferrals: number;
    ministryLeadership: number;
  };
}

export class AdmissionsScrollCoinIntegrationService {
  private scrollCoinService: ScrollCoinService;
  private config: ScrollCoinAdmissionsConfig;

  constructor(
    private prisma: PrismaClient,
    config?: Partial<ScrollCoinAdmissionsConfig>
  ) {
    this.scrollCoinService = ScrollCoinService.getInstance();
    this.config = {
      applicationFee: 50,
      assessmentFee: 25,
      interviewFee: 0, // Free for now
      rewardRates: {
        applicationSubmitted: 10,
        interviewCompleted: 25,
        assessmentPassed: 50,
        enrollmentConfirmed: 100,
        referralBonus: 75
      },
      workTradeRates: {
        communityService: 15, // ScrollCoin per hour
        ministryWork: 20,
        academicAssistance: 18,
        technicalSupport: 22
      },
      discountThresholds: {
        earlyApplication: 20, // 20% discount
        multipleReferrals: 15, // 15% discount
        ministryLeadership: 25 // 25% discount
      },
      ...config
    };
  }

  /**
   * Process application fee payment
   */
  async processApplicationFee(feeData: ApplicationFeeData): Promise<{
    transactionId: string;
    amountCharged: number;
    paymentMethod: string;
    discountApplied: number;
    remainingBalance: number;
  }> {
    try {
      logger.info(`Processing application fee for application ${feeData.applicationId}`);

      // Calculate final fee amount with discounts
      const discounts = await this.calculateDiscounts(feeData.userId, feeData.applicationId);
      const finalAmount = Math.max(0, feeData.feeAmount - discounts.totalDiscount);

      let transactionId: string;
      let remainingBalance: number;

      switch (feeData.paymentMethod) {
        case 'SCROLLCOIN':
          const result = await this.processScrollCoinPayment(feeData.userId, finalAmount, feeData.applicationId);
          transactionId = result.transactionId;
          remainingBalance = result.remainingBalance;
          break;

        case 'WORK_TRADE':
          const workTradeResult = await this.processWorkTradePayment(feeData.userId, finalAmount, feeData.applicationId);
          transactionId = workTradeResult.transactionId;
          remainingBalance = workTradeResult.remainingBalance;
          break;

        case 'TRADITIONAL':
          // Process traditional payment (would integrate with payment processor)
          transactionId = await this.processTraditionalPayment(feeData.userId, finalAmount);
          remainingBalance = 0;
          break;

        default:
          throw new Error('Invalid payment method');
      }

      // Record payment in application
      await this.recordApplicationPayment(feeData.applicationId, {
        transactionId,
        amount: finalAmount,
        paymentMethod: feeData.paymentMethod,
        discountApplied: discounts.totalDiscount
      });

      // Award application submission reward
      await this.awardApplicationReward({
        userId: feeData.userId,
        applicationId: feeData.applicationId,
        rewardType: 'APPLICATION_SUBMITTED',
        amount: this.config.rewardRates.applicationSubmitted,
        description: 'Application submission reward'
      });

      logger.info(`Application fee processed successfully`, {
        applicationId: feeData.applicationId,
        finalAmount,
        paymentMethod: feeData.paymentMethod,
        discountApplied: discounts.totalDiscount
      });

      return {
        transactionId,
        amountCharged: finalAmount,
        paymentMethod: feeData.paymentMethod,
        discountApplied: discounts.totalDiscount,
        remainingBalance
      };

    } catch (error) {
      logger.error('Error processing application fee:', error);
      throw error;
    }
  }

  /**
   * Award ScrollCoin rewards for admissions milestones
   */
  async awardApplicationReward(rewardData: AdmissionsRewardData): Promise<{
    transactionId: string;
    amount: number;
    newBalance: number;
  }> {
    try {
      logger.info(`Awarding admissions reward for user ${rewardData.userId}`);

      // Check if reward already awarded
      const existingReward = await this.checkExistingReward(
        rewardData.userId,
        rewardData.applicationId,
        rewardData.rewardType
      );

      if (existingReward) {
        throw new Error('Reward already awarded for this milestone');
      }

      // Award ScrollCoin
      const transaction = await this.scrollCoinService.mintScrollCoin(
        rewardData.userId,
        'courseCompletion', // Using existing reward type
        rewardData.description,
        rewardData.applicationId
      );

      // Record reward in admissions system
      await this.recordAdmissionsReward(rewardData, transaction.id);

      // Get updated balance
      const wallet = await this.scrollCoinService.getWallet(rewardData.userId);

      logger.info(`Admissions reward awarded successfully`, {
        userId: rewardData.userId,
        rewardType: rewardData.rewardType,
        amount: rewardData.amount,
        newBalance: wallet.balance
      });

      return {
        transactionId: transaction.id,
        amount: rewardData.amount,
        newBalance: wallet.balance
      };

    } catch (error) {
      logger.error('Error awarding application reward:', error);
      throw error;
    }
  }

  /**
   * Process work-trade credits for application fees
   */
  async processWorkTradeCredit(workTradeData: WorkTradeCredit): Promise<{
    creditId: string;
    totalCredit: number;
    applicationFeeReduction: number;
    verificationStatus: string;
  }> {
    try {
      logger.info(`Processing work-trade credit for user ${workTradeData.userId}`);

      // Calculate credit amount
      const creditRate = this.config.workTradeRates[workTradeData.workType];
      const totalCredit = workTradeData.hoursWorked * creditRate;

      // Create work-trade record
      const creditId = `wt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Log work-trade credit (would be stored in dedicated table)
      logger.info(`Work-trade credit created`, {
        creditId,
        userId: workTradeData.userId,
        workType: workTradeData.workType,
        hoursWorked: workTradeData.hoursWorked,
        totalCredit
      });

      // Apply credit to user's work-trade balance
      await this.prisma.user.update({
        where: { id: workTradeData.userId },
        data: {
          workTradeCredits: {
            increment: totalCredit
          }
        }
      });

      // Determine application fee reduction
      const applicationFeeReduction = Math.min(totalCredit, this.config.applicationFee);

      const verificationStatus = workTradeData.verificationRequired ? 'PENDING_VERIFICATION' : 'VERIFIED';

      logger.info(`Work-trade credit processed successfully`, {
        creditId,
        totalCredit,
        applicationFeeReduction,
        verificationStatus
      });

      return {
        creditId,
        totalCredit,
        applicationFeeReduction,
        verificationStatus
      };

    } catch (error) {
      logger.error('Error processing work-trade credit:', error);
      throw error;
    }
  }

  /**
   * Calculate available discounts for application
   */
  async calculateDiscounts(userId: string, applicationId: string): Promise<{
    earlyApplicationDiscount: number;
    referralDiscount: number;
    ministryLeadershipDiscount: number;
    totalDiscount: number;
  }> {
    try {
      let earlyApplicationDiscount = 0;
      let referralDiscount = 0;
      let ministryLeadershipDiscount = 0;

      // Check early application discount
      const application = await this.prisma.applications.findUnique({
        where: { id: applicationId }
      });

      if (application) {
        const submissionDate = new Date(application.submissionDate);
        const earlyDeadline = new Date('2024-12-01'); // Example early deadline
        
        if (submissionDate <= earlyDeadline) {
          earlyApplicationDiscount = (this.config.applicationFee * this.config.discountThresholds.earlyApplication) / 100;
        }
      }

      // Check referral discount
      const referralCount = await this.getReferralCount(userId);
      if (referralCount >= 2) {
        referralDiscount = (this.config.applicationFee * this.config.discountThresholds.multipleReferrals) / 100;
      }

      // Check ministry leadership discount
      const hasMinistryLeadership = await this.checkMinistryLeadership(userId);
      if (hasMinistryLeadership) {
        ministryLeadershipDiscount = (this.config.applicationFee * this.config.discountThresholds.ministryLeadership) / 100;
      }

      const totalDiscount = earlyApplicationDiscount + referralDiscount + ministryLeadershipDiscount;

      return {
        earlyApplicationDiscount,
        referralDiscount,
        ministryLeadershipDiscount,
        totalDiscount
      };

    } catch (error) {
      logger.error('Error calculating discounts:', error);
      return {
        earlyApplicationDiscount: 0,
        referralDiscount: 0,
        ministryLeadershipDiscount: 0,
        totalDiscount: 0
      };
    }
  }

  /**
   * Get ScrollCoin balance and payment options for user
   */
  async getPaymentOptions(userId: string): Promise<{
    scrollCoinBalance: number;
    workTradeCredits: number;
    canPayWithScrollCoin: boolean;
    canPayWithWorkTrade: boolean;
    recommendedPaymentMethod: string;
    estimatedEarnings: number;
  }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          scrollCoinBalance: true,
          workTradeCredits: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const scrollCoinBalance = user.scrollCoinBalance || 0;
      const workTradeCredits = user.workTradeCredits || 0;

      const canPayWithScrollCoin = scrollCoinBalance >= this.config.applicationFee;
      const canPayWithWorkTrade = workTradeCredits >= this.config.applicationFee;

      // Recommend payment method
      let recommendedPaymentMethod = 'TRADITIONAL';
      if (canPayWithScrollCoin) {
        recommendedPaymentMethod = 'SCROLLCOIN';
      } else if (canPayWithWorkTrade) {
        recommendedPaymentMethod = 'WORK_TRADE';
      }

      // Calculate estimated earnings from admissions process
      const estimatedEarnings = this.config.rewardRates.applicationSubmitted +
                               this.config.rewardRates.interviewCompleted +
                               this.config.rewardRates.assessmentPassed +
                               this.config.rewardRates.enrollmentConfirmed;

      return {
        scrollCoinBalance,
        workTradeCredits,
        canPayWithScrollCoin,
        canPayWithWorkTrade,
        recommendedPaymentMethod,
        estimatedEarnings
      };

    } catch (error) {
      logger.error('Error getting payment options:', error);
      throw error;
    }
  }

  /**
   * Process ScrollCoin payment
   */
  private async processScrollCoinPayment(userId: string, amount: number, applicationId: string): Promise<{
    transactionId: string;
    remainingBalance: number;
  }> {
    try {
      // Check balance
      const wallet = await this.scrollCoinService.getWallet(userId);
      if (wallet.balance < amount) {
        throw new Error('Insufficient ScrollCoin balance');
      }

      // Create debit transaction
      const transaction = await this.prisma.scrollCoinTransaction.create({
        data: {
          userId,
          amount: -amount,
          type: 'SPENT',
          description: `Application fee payment for ${applicationId}`,
          relatedEntityId: applicationId,
          relatedEntityType: 'APPLICATION'
        }
      });

      // Update user balance
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          scrollCoinBalance: {
            decrement: amount
          }
        }
      });

      const updatedWallet = await this.scrollCoinService.getWallet(userId);

      return {
        transactionId: transaction.id,
        remainingBalance: updatedWallet.balance
      };

    } catch (error) {
      logger.error('Error processing ScrollCoin payment:', error);
      throw error;
    }
  }

  /**
   * Process work-trade payment
   *   */
 
 private async processWorkTradePayment(
    applicationId: string,
    amount: number
  ): Promise<void> {
    // Implementation for work-trade payment processing
    logger.info('Processing work-trade payment', { applicationId, amount });
  }
}
