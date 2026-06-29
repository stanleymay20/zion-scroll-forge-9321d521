/**
 * Stripe Payment Service
 * "We establish this payment service not in the wisdom of Babylon, but by the breath of the Spirit"
 * 
 * Handles all Stripe payment operations including:
 * - Payment intent creation and processing
 * - Subscription management
 * - Webhook handling
 * - Refund and dispute management
 * - Invoice generation
 * - Payment history and receipts
 */

import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import {
  CreatePaymentIntentRequest,
  PaymentIntentResponse,
  CreateSubscriptionRequest,
  SubscriptionResponse,
  UpdateSubscriptionRequest,
  CancelSubscriptionRequest,
  StripeWebhookEvent,
  WebhookHandlerResult,
  CreateRefundRequest,
  RefundResponse,
  DisputeInfo,
  DisputeResponse,
  CreateInvoiceRequest,
  InvoiceResponse,
  PaymentHistoryQuery,
  PaymentHistoryResponse,
  PaymentHistoryItem,
  ReceiptData,
  ReceiptResponse,
  CreateCustomerRequest,
  CustomerResponse,
  AttachPaymentMethodRequest,
  PaymentMethodInfo,
  PaymentError,
} from '../types/payment.types';
import { stripeConfig, validateStripeConfig, WEBHOOK_EVENTS, PAYMENT_CONFIG } from '../config/stripe.config';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export default class StripePaymentService {
  private stripe: Stripe;

  constructor() {
    validateStripeConfig();
    this.stripe = new Stripe(stripeConfig.apiKey, {
      apiVersion: stripeConfig.apiVersion as Stripe.LatestApiVersion,
      maxNetworkRetries: stripeConfig.maxNetworkRetries,
      timeout: stripeConfig.timeout,
    });
    
    logger.info('StripePaymentService initialized');
  }

  /**
   * Create a payment intent for one-time payments
   */
  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntentResponse> {
    try {
      logger.info('Creating payment intent', { userId: request.userId, amount: request.amount });

      // Validate amount
      if (request.amount < PAYMENT_CONFIG.minAmount || request.amount > PAYMENT_CONFIG.maxAmount) {
        throw new Error(`Amount must be between ${PAYMENT_CONFIG.minAmount} and ${PAYMENT_CONFIG.maxAmount}`);
      }

      // Get or create Stripe customer
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      let customerId = user.scrollCoinWallet; // Reusing this field temporarily for Stripe customer ID
      
      if (!customerId) {
        const customer = await this.stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: {
            userId: user.id,
          },
        });
        customerId = customer.id;
        
        // Update user with customer ID
        await prisma.user.update({
          where: { id: user.id },
          data: { scrollCoinWallet: customerId },
        });
      }

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: request.amount,
        currency: request.currency.toLowerCase(),
        customer: customerId,
        description: request.description,
        metadata: {
          userId: request.userId,
          ...request.metadata,
          ...(request.courseId && { courseId: request.courseId }),
          ...(request.enrollmentId && { enrollmentId: request.enrollmentId }),
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Create payment record in database
      await prisma.payment.create({
        data: {
          userId: request.userId,
          amount: request.amount / 100, // Convert from cents to dollars
          currency: request.currency,
          method: 'CREDIT_CARD',
          stripePaymentId: paymentIntent.id,
          description: request.description,
          status: 'PENDING',
        },
      });

      logger.info('Payment intent created successfully', { paymentIntentId: paymentIntent.id });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      };
    } catch (error: any) {
      logger.error('Error creating payment intent', { error: error.message, userId: request.userId });
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  /**
   * Create a subscription for recurring payments
   */
  async createSubscription(request: CreateSubscriptionRequest): Promise<SubscriptionResponse> {
    try {
      logger.info('Creating subscription', { userId: request.userId, priceId: request.priceId });

      // Get user and customer
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      let customerId = user.scrollCoinWallet;
      
      if (!customerId) {
        const customer = await this.stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: {
            userId: user.id,
          },
        });
        customerId = customer.id;
        
        await prisma.user.update({
          where: { id: user.id },
          data: { scrollCoinWallet: customerId },
        });
      }

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(request.paymentMethodId, {
        customer: customerId,
      });

      // Set as default payment method
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: request.paymentMethodId,
        },
      });

      // Create subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: request.priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: request.userId,
          ...request.metadata,
        },
      });

      logger.info('Subscription created successfully', { subscriptionId: subscription.id });

      const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent;

      return {
        success: true,
        subscriptionId: subscription.id,
        clientSecret: paymentIntent?.client_secret,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    } catch (error: any) {
      logger.error('Error creating subscription', { error: error.message, userId: request.userId });
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  /**
   * Update an existing subscription
   */
  async updateSubscription(request: UpdateSubscriptionRequest): Promise<SubscriptionResponse> {
    try {
      logger.info('Updating subscription', { subscriptionId: request.subscriptionId });

      const updateData: Stripe.SubscriptionUpdateParams = {};
      
      if (request.priceId) {
        const subscription = await this.stripe.subscriptions.retrieve(request.subscriptionId);
        updateData.items = [{
          id: subscription.items.data[0].id,
          price: request.priceId,
        }];
      }
      
      if (request.cancelAtPeriodEnd !== undefined) {
        updateData.cancel_at_period_end = request.cancelAtPeriodEnd;
      }

      const subscription = await this.stripe.subscriptions.update(
        request.subscriptionId,
        updateData
      );

      logger.info('Subscription updated successfully', { subscriptionId: subscription.id });

      return {
        success: true,
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    } catch (error: any) {
      logger.error('Error updating subscription', { error: error.message, subscriptionId: request.subscriptionId });
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(request: CancelSubscriptionRequest): Promise<SubscriptionResponse> {
    try {
      logger.info('Canceling subscription', { subscriptionId: request.subscriptionId });

      let subscription: Stripe.Subscription;
      
      if (request.cancelImmediately) {
        subscription = await this.stripe.subscriptions.cancel(request.subscriptionId);
      } else {
        subscription = await this.stripe.subscriptions.update(request.subscriptionId, {
          cancel_at_period_end: true,
        });
      }

      logger.info('Subscription canceled successfully', { subscriptionId: subscription.id });

      return {
        success: true,
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    } catch (error: any) {
      logger.error('Error canceling subscription', { error: error.message, subscriptionId: request.subscriptionId });
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(payload: string | Buffer, signature: string): Promise<WebhookHandlerResult> {
    try {
      let event: Stripe.Event;

      // Verify webhook signature
      if (stripeConfig.webhookSecret) {
        event = this.stripe.webhooks.constructEvent(
          payload,
          signature,
          stripeConfig.webhookSecret
        );
      } else {
        // For development without webhook secret
        event = JSON.parse(payload.toString());
      }

      logger.info('Processing webhook event', { type: event.type, id: event.id });

      // Handle different event types
      switch (event.type) {
        case WEBHOOK_EVENTS.PAYMENT_INTENT_SUCCEEDED:
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case WEBHOOK_EVENTS.PAYMENT_INTENT_FAILED:
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case WEBHOOK_EVENTS.CHARGE_REFUNDED:
          await this.handleChargeRefunded(event.data.object as Stripe.Charge);
          break;

        case WEBHOOK_EVENTS.CHARGE_DISPUTE_CREATED:
          await this.handleDisputeCreated(event.data.object as Stripe.Dispute);
          break;

        case WEBHOOK_EVENTS.CUSTOMER_SUBSCRIPTION_CREATED:
        case WEBHOOK_EVENTS.CUSTOMER_SUBSCRIPTION_UPDATED:
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case WEBHOOK_EVENTS.CUSTOMER_SUBSCRIPTION_DELETED:
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case WEBHOOK_EVENTS.INVOICE_PAID:
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        case WEBHOOK_EVENTS.INVOICE_PAYMENT_FAILED:
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          logger.info('Unhandled webhook event type', { type: event.type });
      }

      return {
        success: true,
        message: 'Webhook processed successfully',
        processed: true,
      };
    } catch (error: any) {
      logger.error('Error handling webhook', { error: error.message });
      return {
        success: false,
        message: error.message,
        processed: false,
      };
    }
  }

  /**
   * Create a refund for a payment
   */
  async createRefund(request: CreateRefundRequest): Promise<RefundResponse> {
    try {
      logger.info('Creating refund', { paymentIntentId: request.paymentIntentId });

      const refundData: Stripe.RefundCreateParams = {
        payment_intent: request.paymentIntentId,
      };

      if (request.amount) {
        refundData.amount = request.amount;
      }

      if (request.reason) {
        refundData.reason = request.reason;
      }

      if (request.metadata) {
        refundData.metadata = request.metadata;
      }

      const refund = await this.stripe.refunds.create(refundData);

      // Update payment record
      await prisma.payment.updateMany({
        where: { stripePaymentId: request.paymentIntentId },
        data: { status: 'REFUNDED' },
      });

      logger.info('Refund created successfully', { refundId: refund.id });

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
        reason: refund.reason || undefined,
      };
    } catch (error: any) {
      logger.error('Error creating refund', { error: error.message, paymentIntentId: request.paymentIntentId });
      throw new Error(`Failed to create refund: ${error.message}`);
    }
  }

  /**
   * Get dispute information
   */
  async getDispute(disputeId: string): Promise<DisputeInfo> {
    try {
      const dispute = await this.stripe.disputes.retrieve(disputeId);

      return {
        id: dispute.id,
        amount: dispute.amount,
        currency: dispute.currency,
        reason: dispute.reason,
        status: dispute.status,
        evidence: dispute.evidence as any,
        created: new Date(dispute.created * 1000),
      };
    } catch (error: any) {
      logger.error('Error retrieving dispute', { error: error.message, disputeId });
      throw new Error(`Failed to retrieve dispute: ${error.message}`);
    }
  }

  /**
   * Submit evidence for a dispute
   */
  async submitDisputeEvidence(disputeId: string, evidence: Record<string, any>): Promise<DisputeResponse> {
    try {
      logger.info('Submitting dispute evidence', { disputeId });

      await this.stripe.disputes.update(disputeId, {
        evidence: evidence as any,
      });

      logger.info('Dispute evidence submitted successfully', { disputeId });

      return {
        success: true,
        disputeId,
        status: 'evidence_submitted',
        message: 'Evidence submitted successfully',
      };
    } catch (error: any) {
      logger.error('Error submitting dispute evidence', { error: error.message, disputeId });
      throw new Error(`Failed to submit dispute evidence: ${error.message}`);
    }
  }

  /**
   * Create an invoice
   */
  async createInvoice(request: CreateInvoiceRequest): Promise<InvoiceResponse> {
    try {
      logger.info('Creating invoice', { userId: request.userId });

      // Create invoice items
      for (const item of request.items) {
        await this.stripe.invoiceItems.create({
          customer: request.customerId,
          amount: item.amount,
          currency: item.currency || PAYMENT_CONFIG.defaultCurrency,
          description: item.description,
        });
      }

      // Create invoice
      const invoice = await this.stripe.invoices.create({
        customer: request.customerId,
        auto_advance: true,
        collection_method: 'send_invoice',
        days_until_due: request.dueDate 
          ? Math.ceil((request.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : PAYMENT_CONFIG.invoiceDueDays,
        metadata: {
          userId: request.userId,
          ...request.metadata,
        },
      });

      // Finalize invoice
      const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(invoice.id);

      logger.info('Invoice created successfully', { invoiceId: finalizedInvoice.id });

      return {
        success: true,
        invoiceId: finalizedInvoice.id,
        invoiceUrl: finalizedInvoice.hosted_invoice_url!,
        invoicePdf: finalizedInvoice.invoice_pdf!,
        status: finalizedInvoice.status!,
        amountDue: finalizedInvoice.amount_due,
        dueDate: finalizedInvoice.due_date ? new Date(finalizedInvoice.due_date * 1000) : undefined,
      };
    } catch (error: any) {
      logger.error('Error creating invoice', { error: error.message, userId: request.userId });
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  }

  /**
   * Get payment history for a user
   */
  async getPaymentHistory(query: PaymentHistoryQuery): Promise<PaymentHistoryResponse> {
    try {
      logger.info('Fetching payment history', { userId: query.userId });

      // Get user's customer ID
      const user = await prisma.user.findUnique({
        where: { id: query.userId },
      });

      if (!user || !user.scrollCoinWallet) {
        return {
          success: true,
          payments: [],
          hasMore: false,
          total: 0,
        };
      }

      // Fetch payment intents from Stripe
      const paymentIntents = await this.stripe.paymentIntents.list({
        customer: user.scrollCoinWallet,
        limit: query.limit || 10,
        starting_after: query.startingAfter,
        ending_before: query.endingBefore,
      });

      const payments: PaymentHistoryItem[] = paymentIntents.data.map(pi => ({
        id: pi.id,
        amount: pi.amount,
        currency: pi.currency,
        status: pi.status,
        description: pi.description || '',
        created: new Date(pi.created * 1000),
        receiptUrl: (pi.charges.data[0] as any)?.receipt_url,
        refunded: pi.amount_refunded > 0,
        refundAmount: pi.amount_refunded > 0 ? pi.amount_refunded : undefined,
      }));

      logger.info('Payment history fetched successfully', { count: payments.length });

      return {
        success: true,
        payments,
        hasMore: paymentIntents.has_more,
        total: payments.length,
      };
    } catch (error: any) {
      logger.error('Error fetching payment history', { error: error.message, userId: query.userId });
      throw new Error(`Failed to fetch payment history: ${error.message}`);
    }
  }

  /**
   * Generate receipt for a payment
   */
  async generateReceipt(paymentIntentId: string): Promise<ReceiptResponse> {
    try {
      logger.info('Generating receipt', { paymentIntentId });

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['charges.data.receipt_url'],
      });

      const charge = paymentIntent.charges.data[0];
      
      if (!charge) {
        throw new Error('No charge found for payment intent');
      }

      logger.info('Receipt generated successfully', { receiptUrl: charge.receipt_url });

      return {
        success: true,
        receiptUrl: charge.receipt_url!,
        receiptNumber: charge.receipt_number!,
      };
    } catch (error: any) {
      logger.error('Error generating receipt', { error: error.message, paymentIntentId });
      throw new Error(`Failed to generate receipt: ${error.message}`);
    }
  }

  // Private helper methods for webhook handlers

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.info('Payment intent succeeded', { paymentIntentId: paymentIntent.id });

    await prisma.payment.updateMany({
      where: { stripePaymentId: paymentIntent.id },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
      },
    });

    // TODO: Send payment success email
    // TODO: Grant course access if applicable
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.info('Payment intent failed', { paymentIntentId: paymentIntent.id });

    await prisma.payment.updateMany({
      where: { stripePaymentId: paymentIntent.id },
      data: { status: 'FAILED' },
    });

    // TODO: Send payment failed email
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    logger.info('Charge refunded', { chargeId: charge.id });

    await prisma.payment.updateMany({
      where: { stripePaymentId: charge.payment_intent as string },
      data: { status: 'REFUNDED' },
    });

    // TODO: Send refund confirmation email
  }

  private async handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
    logger.warn('Dispute created', { disputeId: dispute.id, reason: dispute.reason });

    // TODO: Notify admin about dispute
    // TODO: Prepare evidence automatically if possible
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    logger.info('Subscription updated', { subscriptionId: subscription.id });

    // TODO: Update subscription record in database
    // TODO: Send subscription update email
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    logger.info('Subscription deleted', { subscriptionId: subscription.id });

    // TODO: Update subscription record in database
    // TODO: Send subscription cancellation email
    // TODO: Revoke access if applicable
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    logger.info('Invoice paid', { invoiceId: invoice.id });

    // TODO: Send invoice paid confirmation email
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    logger.warn('Invoice payment failed', { invoiceId: invoice.id });

    // TODO: Send payment failed email
    // TODO: Retry payment or suspend service
  }

  /**
   * Create a Stripe customer
   */
  async createCustomer(request: CreateCustomerRequest): Promise<CustomerResponse> {
    try {
      const customer = await this.stripe.customers.create({
        email: request.email,
        name: request.name,
        phone: request.phone,
        metadata: {
          userId: request.userId,
          ...request.metadata,
        },
      });

      // Update user with customer ID
      await prisma.user.update({
        where: { id: request.userId },
        data: { scrollCoinWallet: customer.id },
      });

      return {
        success: true,
        customerId: customer.id,
        email: customer.email!,
        name: customer.name!,
      };
    } catch (error: any) {
      logger.error('Error creating customer', { error: error.message });
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethod(request: AttachPaymentMethodRequest): Promise<PaymentMethodInfo> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(
        request.paymentMethodId,
        { customer: request.customerId }
      );

      return {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year,
        } : undefined,
        billingDetails: paymentMethod.billing_details as any,
      };
    } catch (error: any) {
      logger.error('Error attaching payment method', { error: error.message });
      throw new Error(`Failed to attach payment method: ${error.message}`);
    }
  }
}
