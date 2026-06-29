/**
 * Payment System Type Definitions
 * "We establish this payment system not in the wisdom of Babylon, but by the breath of the Spirit"
 */

import Stripe from 'stripe';

// Payment Intent Types
export interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  userId: string;
  description: string;
  metadata?: Record<string, string>;
  courseId?: string;
  enrollmentId?: string;
}

export interface PaymentIntentResponse {
  success: boolean;
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

// Subscription Types
export interface CreateSubscriptionRequest {
  userId: string;
  priceId: string;
  paymentMethodId: string;
  metadata?: Record<string, string>;
}

export interface SubscriptionResponse {
  success: boolean;
  subscriptionId: string;
  clientSecret?: string;
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export interface UpdateSubscriptionRequest {
  subscriptionId: string;
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface CancelSubscriptionRequest {
  subscriptionId: string;
  cancelImmediately?: boolean;
}

// Webhook Types
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

export interface WebhookHandlerResult {
  success: boolean;
  message: string;
  processed: boolean;
}

// Refund Types
export interface CreateRefundRequest {
  paymentIntentId: string;
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, string>;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  amount: number;
  status: string;
  reason?: string;
}

// Dispute Types
export interface DisputeInfo {
  id: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  evidence?: Record<string, any>;
  created: Date;
}

export interface DisputeResponse {
  success: boolean;
  disputeId: string;
  status: string;
  message: string;
}

// Invoice Types
export interface CreateInvoiceRequest {
  userId: string;
  customerId: string;
  items: InvoiceItem[];
  dueDate?: Date;
  metadata?: Record<string, string>;
}

export interface InvoiceItem {
  description: string;
  amount: number;
  quantity?: number;
  currency?: string;
}

export interface InvoiceResponse {
  success: boolean;
  invoiceId: string;
  invoiceUrl: string;
  invoicePdf: string;
  status: string;
  amountDue: number;
  dueDate?: Date;
}

// Payment History Types
export interface PaymentHistoryQuery {
  userId: string;
  limit?: number;
  startingAfter?: string;
  endingBefore?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  created: Date;
  receiptUrl?: string;
  invoiceUrl?: string;
  refunded: boolean;
  refundAmount?: number;
}

export interface PaymentHistoryResponse {
  success: boolean;
  payments: PaymentHistoryItem[];
  hasMore: boolean;
  total: number;
}

// Receipt Types
export interface ReceiptData {
  paymentIntentId: string;
  userId: string;
  amount: number;
  currency: string;
  description: string;
  created: Date;
  receiptNumber: string;
  customerEmail: string;
  paymentMethod: string;
}

export interface ReceiptResponse {
  success: boolean;
  receiptUrl: string;
  receiptPdf?: string;
  receiptNumber: string;
}

// Customer Types
export interface CreateCustomerRequest {
  userId: string;
  email: string;
  name: string;
  phone?: string;
  metadata?: Record<string, string>;
}

export interface CustomerResponse {
  success: boolean;
  customerId: string;
  email: string;
  name: string;
}

// Payment Method Types
export interface PaymentMethodInfo {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  billingDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: any;
  };
}

export interface AttachPaymentMethodRequest {
  paymentMethodId: string;
  customerId: string;
}

// Price and Product Types
export interface PriceInfo {
  id: string;
  productId: string;
  amount: number;
  currency: string;
  interval?: 'day' | 'week' | 'month' | 'year';
  intervalCount?: number;
  type: 'one_time' | 'recurring';
}

export interface ProductInfo {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  metadata?: Record<string, string>;
}

// Error Types
export interface PaymentError {
  code: string;
  message: string;
  type: string;
  param?: string;
  declineCode?: string;
}

// Service Configuration
export interface StripeServiceConfig {
  apiKey: string;
  webhookSecret: string;
  apiVersion?: string;
  maxNetworkRetries?: number;
  timeout?: number;
}

// Database Payment Record
export interface PaymentRecord {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  method: 'CREDIT_CARD' | 'SCROLL_COIN' | 'CRYPTOCURRENCY' | 'WORK_TRADE' | 'SCHOLARSHIP';
  stripePaymentId?: string;
  scrollCoinTxId?: string;
  cryptoTxHash?: string;
  description: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  createdAt: Date;
  processedAt?: Date;
}

// Subscription Record
export interface SubscriptionRecord {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Email Notification Types
export interface PaymentEmailData {
  to: string;
  subject: string;
  template: 'payment_success' | 'payment_failed' | 'invoice' | 'refund' | 'subscription_created' | 'subscription_canceled';
  data: {
    userName: string;
    amount: number;
    currency: string;
    description?: string;
    receiptUrl?: string;
    invoiceUrl?: string;
    date: Date;
    [key: string]: any;
  };
}
