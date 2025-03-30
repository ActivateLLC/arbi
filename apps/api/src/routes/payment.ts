import { Router, Request, Response, NextFunction } from 'express';
import { TransactionManager } from '@arbi/transaction';

import { ApiError } from '../middleware/errorHandler';

const router = Router();

// Initialize transaction manager
const transactionManager = new TransactionManager(
  // Payment config
  {
    environment: process.env.PAYMENT_ENV === 'production' ? 'production' : 'sandbox',
    defaultCurrency: 'USD',
  },
  // Security config
  {
    secretKey: process.env.SECURITY_KEY,
  }
);

// Register payment processor
transactionManager.registerPaymentProcessor({
  name: 'hyperswitch',
  apiKey: process.env.HYPERSWITCH_API_KEY,
  merchantId: process.env.HYPERSWITCH_MERCHANT_ID,
  webhookSecret: process.env.HYPERSWITCH_WEBHOOK_SECRET,
  priority: 1,
});

// GET /api/payment/health
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Payment System is operational',
  });
});

// POST /api/payment/process
router.post('/process', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, currency, paymentMethod, customer, description, metadata } = req.body;

    if (!amount || !paymentMethod || !customer) {
      throw new ApiError('Amount, payment method, and customer are required', 400);
    }

    // Generate idempotency key
    const idempotencyKey = transactionManager.generateIdempotencyKey();

    // Process payment
    const result = await transactionManager.processPayment('hyperswitch', {
      amount: {
        value: amount,
        currency: currency || 'USD',
      },
      paymentMethod,
      customer,
      description,
      metadata,
      idempotencyKey,
    });

    if (result.status === 'failed') {
      throw new ApiError(result.error?.message || 'Payment processing failed', 400);
    }

    res.status(200).json({
      transactionId: result.id,
      status: result.status,
      amount: result.amount,
      processorTransactionId: result.processorTransactionId,
      createdAt: result.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/payment/refund
router.post('/refund', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentId, amount, currency, reason } = req.body;

    if (!paymentId) {
      throw new ApiError('Payment ID is required', 400);
    }

    // Generate idempotency key
    const idempotencyKey = transactionManager.generateIdempotencyKey();

    // Process refund
    const result = await transactionManager.processRefund('hyperswitch', {
      paymentId,
      amount: amount && currency ? {
        value: amount,
        currency,
      } : undefined,
      reason,
      idempotencyKey,
    });

    if (result.status === 'failed') {
      throw new ApiError(result.error?.message || 'Refund processing failed', 400);
    }

    res.status(200).json({
      refundId: result.id,
      paymentId: result.paymentId,
      status: result.status,
      amount: result.amount,
      createdAt: result.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/payment/webhook
router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['hyperswitch-signature'] as string;

    if (!signature) {
      throw new ApiError('Missing signature header', 400);
    }

    // Validate webhook signature
    const isValid = transactionManager.validateWebhook(
      'hyperswitch',
      req.body,
      signature
    );

    if (!isValid) {
      throw new ApiError('Invalid signature', 400);
    }

    // Process webhook event
    const event = req.body;

    // Here you would typically process the event based on its type
    // For example, update your database, send notifications, etc.

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/payment/encrypt
router.post('/encrypt', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = req.body;

    if (!data) {
      throw new ApiError('Data is required', 400);
    }

    // Encrypt the data
    const encrypted = transactionManager.encryptPaymentData(data);

    res.status(200).json({
      encryptedData: encrypted.encryptedData,
      iv: encrypted.iv,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/payment/decrypt
router.post('/decrypt', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { encryptedData, iv } = req.body;

    if (!encryptedData || !iv) {
      throw new ApiError('Encrypted data and IV are required', 400);
    }

    // Decrypt the data
    const decrypted = transactionManager.decryptPaymentData(encryptedData, iv);

    res.status(200).json({
      data: decrypted,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
