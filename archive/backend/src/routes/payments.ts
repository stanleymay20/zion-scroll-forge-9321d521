/**
 * Payment Routes
 * "We establish these payment routes not in the wisdom of Babylon, but by the breath of the Spirit"
 */

import express, { Request, Response } from 'express';
import StripePaymentService from '../services/StripePaymentService';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();
const paymentService = new StripePaymentService();

/**
 * @route   POST /api/payments/create-payment-intent
 * @desc    Create a payment intent for one-time payment
 * @access  Private
 */
router.post('/create-payment-intent', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { amount, currency, description, metadata, courseId, enrollmentId } = req.body;
    const userId = (req as any).user.id;

    if (!amount || !currency || !description) {
      return res.status(400).json({
        success: false,
        error: 'Amount, currency, and description are required',
      });
    }

    const result = await paymentService.createPaymentIntent({
      amount,
      currency,
      userId,
      description,
      metadata,
      courseId,
      enrollmentId,
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Error in create-payment-intent route', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/payments/create-subscription
 * @desc    Create a subscription for recurring payments
 * @access  Private
 */
router.post('/create-subscription', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { priceId, paymentMethodId, metadata } = req.body;
    const userId = (req as any).user.id;

    if (!priceId || !paymentMethodId) {
      return res.status(400).json({
        success: false,
        error: 'Price ID and payment method ID are required',
      });
    }

    const result = await paymentService.createSubscription({
      userId,
      priceId,
      paymentMethodId,
      metadata,
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Error in create-subscription route', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/payments/subscription/:subscriptionId
 * @desc    Update an existing subscription
 * @access  Private
 */
router.put('/subscription/:subscriptionId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const { priceId, cancelAtPeriodEnd } = req.body;

    const result = await paymentService.updateSubscription({
      subscriptionId,
      priceId,
      cancelAtPeriodEnd,
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Error in update-subscription route', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/payments/subscription/:subscriptionId
 * @desc    Cancel a subscription
 * @access  Private
 */
router.delete('/subscription/:subscriptionId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const { cancelImmediately } = req.body;

    const result = await paymentService.cancelSubscription({
      subscriptionId,
      cancelImmediately: cancelImmediately || false,
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Error in cancel-subscription route', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle Stripe webhook events
 * @access  Public (verified by Stripe signature)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing stripe-signature header',
      });
    }

    const result = await paymentService.handleWebhook(req.body, signature);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    logger.error('Error in webhook route', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/payments/refund
 * @desc    Create a refund for a payment
 * @access  Private (Admin only)
 */
router.post('/refund', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { paymentIntentId, amount, reason, metadata } = req.body;
    const userRole = (req as any).user.role;

    // Check if user is admin
    if (userRole !== 'ADMIN' && userRole !== 'SCROLL_ELDER') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Admin access required',
      });
    }

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent ID is required',
      });
    }

    const result = await paymentService.createRefund({
      paymentIntentId,
      amount,
      reason,
      metadata,
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Error in refund route', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/payments/dispute/:disputeId
 * @desc    Get dispute information
 * @access  Private (Admin only)
 */
router.get('/dispute/:disputeId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { disputeId } = req.params;
    const userRole = (req as any).user.role;

    // Check if user is admin
    if (userRole !== 'ADMIN' && userRole !== 'SCROLL_ELDER') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Admin access required',
      });
    }

    const result = await paymentService.getDispute(disputeId);

    res.json({
      success: true,
      dispute: result,
    });
  } catch (error: any) {
    logger.error('Error in get-dispute route', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/payments/dispute/:disputeId/evidence
 * @desc    Submit evidence for a dispute
 * @access  Private (Admin only)
 */
router.post('/dispute/:disputeId/evidence', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { disputeId } = req.params;
    const { evidence } = req.body;
    const userRole = (req as any).user.role;

    // Check if user is admin
    if (userRole !== 'ADMIN' && userRole !== 'SCROLL_ELDER') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Admin access required',
      });
    }

    if (!evidence) {
      return res.status(400).json({
        success: false,
        error: 'Evidence is required',
      });
    }

    const result = await paymentService.submitDisputeEvidence(disputeId, evidence);

    res.json(result);
  } catch (error: any) {
    logger.error('Error in submit-dispute-evidence route', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/payments/create-invoice
 * @desc    Create an invoice
 * @access  Private (Admin only)
 */
router.post('/create-invoice', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId, customerId, items, dueDate, metadata } = req.body;
    const userRole = (req as any).user.role;

    // Check if user is admin
    if (userRole !== 'ADMIN' && userRole !== 'SCROLL_ELDER') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Admin access required',
      });
    }

    if (!userId || !customerId || !items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'User ID, customer ID, and items array are required',
      });
    }

    const result = await paymentService.createInvoice({
      userId,
      customerId,
      items,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      metadata,
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Error in create-invoice route', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/payments/history
 * @desc    Get payment history for the authenticated user
 * @access  Private
 */
router.get('/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { limit, startingAfter, endingBefore } = req.query;

    const result = await paymentService.getPaymentHistory({
      userId,
      limit: limit ? parseInt(limit as string) : undefined,
      startingAfter: startingAfter as string,
      endingBefore: endingBefore as string,
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Error in payment-history route', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/payments/receipt/:paymentIntentId
 * @desc    Generate receipt for a payment
 * @access  Private
 */
router.get('/receipt/:paymentIntentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { paymentIntentId } = req.params;

    const result = await paymentService.generateReceipt(paymentIntentId);

    res.json(result);
  } catch (error: any) {
    logger.error('Error in generate-receipt route', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/payments/create-customer
 * @desc    Create a Stripe customer
 * @access  Private
 */
router.post('/create-customer', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { email, name, phone, metadata } = req.body;
    const userId = (req as any).user.id;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email and name are required',
      });
    }

    const result = await paymentService.createCustomer({
      userId,
      email,
      name,
      phone,
      metadata,
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Error in create-customer route', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/payments/attach-payment-method
 * @desc    Attach payment method to customer
 * @access  Private
 */
router.post('/attach-payment-method', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { paymentMethodId, customerId } = req.body;

    if (!paymentMethodId || !customerId) {
      return res.status(400).json({
        success: false,
        error: 'Payment method ID and customer ID are required',
      });
    }

    const result = await paymentService.attachPaymentMethod({
      paymentMethodId,
      customerId,
    });

    res.json({
      success: true,
      paymentMethod: result,
    });
  } catch (error: any) {
    logger.error('Error in attach-payment-method route', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
