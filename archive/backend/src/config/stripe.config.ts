/**
 * Stripe Configuration
 * "We establish this payment infrastructure not in the wisdom of Babylon, but by the breath of the Spirit"
 */

import { StripeServiceConfig } from '../types/payment.types';

export const stripeConfig: StripeServiceConfig = {
  apiKey: process.env.STRIPE_SECRET_KEY || '',
  webhookSecret: process.env.WEBHOOK_SECRET || '',
  apiVersion: '2024-11-20.acacia',
  maxNetworkRetries: 3,
  timeout: 30000, // 30 seconds
};

// Validate required environment variables
export function validateStripeConfig(): void {
  if (!stripeConfig.apiKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }
  
  if (!stripeConfig.webhookSecret) {
    console.warn('WEBHOOK_SECRET environment variable is not set. Webhook signature verification will be disabled.');
  }
}

// Stripe Product and Price IDs (configure these in Stripe Dashboard)
export const STRIPE_PRODUCTS = {
  COURSE_ENROLLMENT: {
    productId: process.env.STRIPE_COURSE_PRODUCT_ID || 'prod_course',
    priceId: process.env.STRIPE_COURSE_PRICE_ID || 'price_course',
  },
  MONTHLY_SUBSCRIPTION: {
    productId: process.env.STRIPE_MONTHLY_PRODUCT_ID || 'prod_monthly',
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID || 'price_monthly',
  },
  ANNUAL_SUBSCRIPTION: {
    productId: process.env.STRIPE_ANNUAL_PRODUCT_ID || 'prod_annual',
    priceId: process.env.STRIPE_ANNUAL_PRICE_ID || 'price_annual',
  },
};

// Payment configuration
export const PAYMENT_CONFIG = {
  defaultCurrency: 'usd',
  minAmount: 50, // $0.50 minimum
  maxAmount: 99999900, // $999,999.00 maximum
  refundWindow: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  invoiceDueDays: 30,
  receiptEmailEnabled: true,
  automaticTax: false,
};

// Webhook event types to handle
export const WEBHOOK_EVENTS = {
  PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
  PAYMENT_INTENT_FAILED: 'payment_intent.payment_failed',
  PAYMENT_INTENT_CANCELED: 'payment_intent.canceled',
  CHARGE_REFUNDED: 'charge.refunded',
  CHARGE_DISPUTE_CREATED: 'charge.dispute.created',
  CHARGE_DISPUTE_CLOSED: 'charge.dispute.closed',
  CUSTOMER_SUBSCRIPTION_CREATED: 'customer.subscription.created',
  CUSTOMER_SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  CUSTOMER_SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  INVOICE_CREATED: 'invoice.created',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  INVOICE_FINALIZED: 'invoice.finalized',
};

// Error codes
export const STRIPE_ERROR_CODES = {
  CARD_DECLINED: 'card_declined',
  INSUFFICIENT_FUNDS: 'insufficient_funds',
  EXPIRED_CARD: 'expired_card',
  INCORRECT_CVC: 'incorrect_cvc',
  PROCESSING_ERROR: 'processing_error',
  RATE_LIMIT: 'rate_limit',
};

export default stripeConfig;
