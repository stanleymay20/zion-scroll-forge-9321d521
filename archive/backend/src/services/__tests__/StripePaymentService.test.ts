/**
 * Stripe Payment Service Tests
 * "We test this payment service not in the wisdom of Babylon, but by the breath of the Spirit"
 */

import StripePaymentService from '../StripePaymentService';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe');
jest.mock('@prisma/client');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  payment: {
    create: jest.fn(),
    updateMany: jest.fn(),
  },
};

(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);

describe('StripePaymentService', () => {
  let service: StripePaymentService;
  let mockStripe: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Stripe instance
    mockStripe = {
      customers: {
        create: jest.fn(),
        update: jest.fn(),
      },
      paymentIntents: {
        create: jest.fn(),
        retrieve: jest.fn(),
        list: jest.fn(),
      },
      subscriptions: {
        create: jest.fn(),
        update: jest.fn(),
        cancel: jest.fn(),
        retrieve: jest.fn(),
      },
      paymentMethods: {
        attach: jest.fn(),
      },
      refunds: {
        create: jest.fn(),
      },
      disputes: {
        retrieve: jest.fn(),
        update: jest.fn(),
      },
      invoiceItems: {
        create: jest.fn(),
      },
      invoices: {
        create: jest.fn(),
        finalizeInvoice: jest.fn(),
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
    };

    (Stripe as any).mockImplementation(() => mockStripe);
    
    service = new StripePaymentService();
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent successfully', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        scrollCoinWallet: 'cus_123',
      };

      const mockPaymentIntent = {
        id: 'pi_123',
        client_secret: 'secret_123',
        amount: 5000,
        currency: 'usd',
        status: 'requires_payment_method',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);
      mockPrisma.payment.create.mockResolvedValue({});

      const result = await service.createPaymentIntent({
        amount: 5000,
        currency: 'usd',
        userId: 'user123',
        description: 'Test payment',
      });

      expect(result.success).toBe(true);
      expect(result.paymentIntentId).toBe('pi_123');
      expect(result.clientSecret).toBe('secret_123');
      expect(mockStripe.paymentIntents.create).toHaveBeenCalled();
      expect(mockPrisma.payment.create).toHaveBeenCalled();
    });

    it('should create customer if not exists', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        scrollCoinWallet: null,
      };

      const mockCustomer = {
        id: 'cus_new123',
      };

      const mockPaymentIntent = {
        id: 'pi_123',
        client_secret: 'secret_123',
        amount: 5000,
        currency: 'usd',
        status: 'requires_payment_method',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockStripe.customers.create.mockResolvedValue(mockCustomer);
      mockPrisma.user.update.mockResolvedValue({});
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);
      mockPrisma.payment.create.mockResolvedValue({});

      const result = await service.createPaymentIntent({
        amount: 5000,
        currency: 'usd',
        userId: 'user123',
        description: 'Test payment',
      });

      expect(result.success).toBe(true);
      expect(mockStripe.customers.create).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should throw error for invalid amount', async () => {
      await expect(
        service.createPaymentIntent({
          amount: 10, // Below minimum
          currency: 'usd',
          userId: 'user123',
          description: 'Test payment',
        })
      ).rejects.toThrow('Amount must be between');
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createPaymentIntent({
          amount: 5000,
          currency: 'usd',
          userId: 'nonexistent',
          description: 'Test payment',
        })
      ).rejects.toThrow('User not found');
    });
  });

  describe('createSubscription', () => {
    it('should create a subscription successfully', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        scrollCoinWallet: 'cus_123',
      };

      const mockSubscription = {
        id: 'sub_123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        cancel_at_period_end: false,
        latest_invoice: {
          payment_intent: {
            client_secret: 'secret_123',
          },
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockStripe.paymentMethods.attach.mockResolvedValue({});
      mockStripe.customers.update.mockResolvedValue({});
      mockStripe.subscriptions.create.mockResolvedValue(mockSubscription);

      const result = await service.createSubscription({
        userId: 'user123',
        priceId: 'price_123',
        paymentMethodId: 'pm_123',
      });

      expect(result.success).toBe(true);
      expect(result.subscriptionId).toBe('sub_123');
      expect(result.status).toBe('active');
      expect(mockStripe.subscriptions.create).toHaveBeenCalled();
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription successfully', async () => {
      const mockSubscription = {
        id: 'sub_123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        cancel_at_period_end: true,
        items: {
          data: [{ id: 'si_123' }],
        },
      };

      mockStripe.subscriptions.retrieve.mockResolvedValue(mockSubscription);
      mockStripe.subscriptions.update.mockResolvedValue(mockSubscription);

      const result = await service.updateSubscription({
        subscriptionId: 'sub_123',
        cancelAtPeriodEnd: true,
      });

      expect(result.success).toBe(true);
      expect(result.cancelAtPeriodEnd).toBe(true);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription immediately', async () => {
      const mockSubscription = {
        id: 'sub_123',
        status: 'canceled',
        current_period_end: Math.floor(Date.now() / 1000),
        cancel_at_period_end: false,
      };

      mockStripe.subscriptions.cancel.mockResolvedValue(mockSubscription);

      const result = await service.cancelSubscription({
        subscriptionId: 'sub_123',
        cancelImmediately: true,
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('canceled');
      expect(mockStripe.subscriptions.cancel).toHaveBeenCalled();
    });

    it('should cancel subscription at period end', async () => {
      const mockSubscription = {
        id: 'sub_123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        cancel_at_period_end: true,
      };

      mockStripe.subscriptions.update.mockResolvedValue(mockSubscription);

      const result = await service.cancelSubscription({
        subscriptionId: 'sub_123',
        cancelImmediately: false,
      });

      expect(result.success).toBe(true);
      expect(result.cancelAtPeriodEnd).toBe(true);
      expect(mockStripe.subscriptions.update).toHaveBeenCalled();
    });
  });

  describe('createRefund', () => {
    it('should create a refund successfully', async () => {
      const mockRefund = {
        id: 'ref_123',
        amount: 5000,
        status: 'succeeded',
        reason: 'requested_by_customer',
      };

      mockStripe.refunds.create.mockResolvedValue(mockRefund);
      mockPrisma.payment.updateMany.mockResolvedValue({});

      const result = await service.createRefund({
        paymentIntentId: 'pi_123',
        amount: 5000,
        reason: 'requested_by_customer',
      });

      expect(result.success).toBe(true);
      expect(result.refundId).toBe('ref_123');
      expect(result.amount).toBe(5000);
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith({
        where: { stripePaymentId: 'pi_123' },
        data: { status: 'REFUNDED' },
      });
    });
  });

  describe('getDispute', () => {
    it('should retrieve dispute information', async () => {
      const mockDispute = {
        id: 'dp_123',
        amount: 5000,
        currency: 'usd',
        reason: 'fraudulent',
        status: 'needs_response',
        evidence: {},
        created: Math.floor(Date.now() / 1000),
      };

      mockStripe.disputes.retrieve.mockResolvedValue(mockDispute);

      const result = await service.getDispute('dp_123');

      expect(result.id).toBe('dp_123');
      expect(result.amount).toBe(5000);
      expect(result.reason).toBe('fraudulent');
    });
  });

  describe('createInvoice', () => {
    it('should create an invoice successfully', async () => {
      const mockInvoice = {
        id: 'in_123',
        hosted_invoice_url: 'https://invoice.stripe.com/123',
        invoice_pdf: 'https://invoice.stripe.com/123.pdf',
        status: 'open',
        amount_due: 10000,
        due_date: Math.floor(Date.now() / 1000) + 2592000,
      };

      mockStripe.invoiceItems.create.mockResolvedValue({});
      mockStripe.invoices.create.mockResolvedValue({ id: 'in_123' });
      mockStripe.invoices.finalizeInvoice.mockResolvedValue(mockInvoice);

      const result = await service.createInvoice({
        userId: 'user123',
        customerId: 'cus_123',
        items: [
          { description: 'Course enrollment', amount: 10000 },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.invoiceId).toBe('in_123');
      expect(result.amountDue).toBe(10000);
    });
  });

  describe('getPaymentHistory', () => {
    it('should retrieve payment history', async () => {
      const mockUser = {
        id: 'user123',
        scrollCoinWallet: 'cus_123',
      };

      const mockPaymentIntents = {
        data: [
          {
            id: 'pi_123',
            amount: 5000,
            currency: 'usd',
            status: 'succeeded',
            description: 'Test payment',
            created: Math.floor(Date.now() / 1000),
            amount_refunded: 0,
            charges: {
              data: [{ receipt_url: 'https://receipt.com/123' }],
            },
          },
        ],
        has_more: false,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockStripe.paymentIntents.list.mockResolvedValue(mockPaymentIntents);

      const result = await service.getPaymentHistory({
        userId: 'user123',
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.payments).toHaveLength(1);
      expect(result.payments[0].id).toBe('pi_123');
    });

    it('should return empty array if user has no customer ID', async () => {
      const mockUser = {
        id: 'user123',
        scrollCoinWallet: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getPaymentHistory({
        userId: 'user123',
      });

      expect(result.success).toBe(true);
      expect(result.payments).toHaveLength(0);
    });
  });

  describe('generateReceipt', () => {
    it('should generate receipt successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        charges: {
          data: [
            {
              receipt_url: 'https://receipt.com/123',
              receipt_number: 'REC-123',
            },
          ],
        },
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      const result = await service.generateReceipt('pi_123');

      expect(result.success).toBe(true);
      expect(result.receiptUrl).toBe('https://receipt.com/123');
      expect(result.receiptNumber).toBe('REC-123');
    });

    it('should throw error if no charge found', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        charges: {
          data: [],
        },
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      await expect(service.generateReceipt('pi_123')).rejects.toThrow(
        'No charge found for payment intent'
      );
    });
  });

  describe('handleWebhook', () => {
    it('should handle payment_intent.succeeded event', async () => {
      const mockEvent = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
            amount: 5000,
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockPrisma.payment.updateMany.mockResolvedValue({});

      const result = await service.handleWebhook(
        JSON.stringify(mockEvent),
        'sig_123'
      );

      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
      expect(mockPrisma.payment.updateMany).toHaveBeenCalled();
    });

    it('should handle payment_intent.payment_failed event', async () => {
      const mockEvent = {
        id: 'evt_123',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_123',
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockPrisma.payment.updateMany.mockResolvedValue({});

      const result = await service.handleWebhook(
        JSON.stringify(mockEvent),
        'sig_123'
      );

      expect(result.success).toBe(true);
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith({
        where: { stripePaymentId: 'pi_123' },
        data: { status: 'FAILED' },
      });
    });
  });

  describe('createCustomer', () => {
    it('should create a Stripe customer', async () => {
      const mockCustomer = {
        id: 'cus_123',
        email: 'test@example.com',
        name: 'John Doe',
      };

      mockStripe.customers.create.mockResolvedValue(mockCustomer);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.createCustomer({
        userId: 'user123',
        email: 'test@example.com',
        name: 'John Doe',
      });

      expect(result.success).toBe(true);
      expect(result.customerId).toBe('cus_123');
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });

  describe('attachPaymentMethod', () => {
    it('should attach payment method to customer', async () => {
      const mockPaymentMethod = {
        id: 'pm_123',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025,
        },
        billing_details: {},
      };

      mockStripe.paymentMethods.attach.mockResolvedValue(mockPaymentMethod);

      const result = await service.attachPaymentMethod({
        paymentMethodId: 'pm_123',
        customerId: 'cus_123',
      });

      expect(result.id).toBe('pm_123');
      expect(result.type).toBe('card');
      expect(result.card?.last4).toBe('4242');
    });
  });
});
