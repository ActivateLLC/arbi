import axios from 'axios';

import { SecurityManager } from '../security/SecurityManager';
import type {
  PaymentConfig,
  PaymentProcessor,
  PaymentProcessorConfig,
  PaymentRequest,
  PaymentResponse,
  RefundRequest,
  RefundResponse,
} from '../types';

export class HyperswitchPaymentManager {
  private config: PaymentConfig;
  private processors: Map<string, PaymentProcessor>;
  private security: SecurityManager;
  private baseURL: string;

  constructor(config: PaymentConfig, security: SecurityManager) {
    this.config = {
      environment: 'sandbox',
      defaultCurrency: 'USD',
      timeout: 30000,
      retryAttempts: 3,
      ...config,
    };

    this.security = security;
    this.processors = new Map();
    
    // Set base URL based on environment
    this.baseURL = this.config.environment === 'production'
      ? 'https://api.hyperswitch.io'
      : 'https://sandbox.hyperswitch.io';
  }

  /**
   * Register a payment processor
   */
  public registerProcessor(config: PaymentProcessorConfig): void {
    if (this.processors.has(config.name)) {
      throw new Error(`Payment processor ${config.name} is already registered`);
    }

    // Create a processor instance
    const processor: PaymentProcessor = {
      name: config.name,
      
      process: async (request: PaymentRequest) => {
        return this.processPayment(config, request);
      },
      
      refund: async (request: RefundRequest) => {
        return this.processRefund(config, request);
      },
      
      validateWebhook: (payload: any, signature: string) => {
        if (!config.webhookSecret) {
          throw new Error('Webhook secret is required for validation');
        }
        
        const signatureData = typeof payload === 'string' 
          ? payload 
          : JSON.stringify(payload);
          
        return this.security.verifySignature(signatureData, signature, config.webhookSecret);
      },
    };

    this.processors.set(config.name, processor);
  }

  /**
   * Get registered payment processor
   */
  public getProcessor(name: string): PaymentProcessor {
    const processor = this.processors.get(name);
    if (!processor) {
      throw new Error(`Payment processor ${name} is not registered`);
    }
    return processor;
  }

  /**
   * Process payment through Hyperswitch
   */
  private async processPayment(
    processorConfig: PaymentProcessorConfig,
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    try {
      // Create payment request for Hyperswitch API
      const payload = {
        amount: request.amount.value,
        currency: request.amount.currency || this.config.defaultCurrency,
        payment_method: this.mapPaymentMethod(request.paymentMethod),
        customer: {
          email: request.customer.email,
          name: request.customer.name,
          phone: request.customer.phone,
        },
        description: request.description,
        metadata: request.metadata,
        idempotency_key: request.idempotencyKey,
        merchant_id: processorConfig.merchantId,
      };

      // Make the API request
      const response = await axios.post(
        `${this.baseURL}/payments`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${processorConfig.apiKey}`,
          },
          timeout: this.config.timeout,
        }
      );

      // Map response to standardized format
      return {
        id: response.data.id,
        status: this.mapPaymentStatus(response.data.status),
        amount: {
          value: response.data.amount,
          currency: response.data.currency,
        },
        processor: processorConfig.name,
        processorTransactionId: response.data.processor_transaction_id,
        metadata: response.data.metadata,
        createdAt: new Date(response.data.created_at),
        updatedAt: new Date(response.data.updated_at),
      };
    } catch (error: any) {
      // Handle and standardize errors
      console.error('Payment processing error:', error);
      
      return {
        id: '',
        status: 'failed',
        amount: request.amount,
        processor: processorConfig.name,
        error: {
          code: error.response?.data?.error?.code || 'unknown_error',
          message: error.response?.data?.error?.message || error.message || 'Unknown error occurred',
          details: error.response?.data?.error?.details,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Process refund through Hyperswitch
   */
  private async processRefund(
    processorConfig: PaymentProcessorConfig,
    request: RefundRequest
  ): Promise<RefundResponse> {
    try {
      // Create refund request for Hyperswitch API
      const payload = {
        payment_id: request.paymentId,
        amount: request.amount?.value,
        currency: request.amount?.currency || this.config.defaultCurrency,
        reason: request.reason,
        metadata: request.metadata,
        idempotency_key: request.idempotencyKey,
        merchant_id: processorConfig.merchantId,
      };

      // Make the API request
      const response = await axios.post(
        `${this.baseURL}/refunds`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${processorConfig.apiKey}`,
          },
          timeout: this.config.timeout,
        }
      );

      // Map response to standardized format
      return {
        id: response.data.id,
        paymentId: response.data.payment_id,
        status: this.mapRefundStatus(response.data.status),
        amount: {
          value: response.data.amount,
          currency: response.data.currency,
        },
        metadata: response.data.metadata,
        createdAt: new Date(response.data.created_at),
        updatedAt: new Date(response.data.updated_at),
      };
    } catch (error: any) {
      // Handle and standardize errors
      console.error('Refund processing error:', error);
      
      return {
        id: '',
        paymentId: request.paymentId,
        status: 'failed',
        amount: request.amount || { value: 0, currency: this.config.defaultCurrency || 'USD' },
        error: {
          code: error.response?.data?.error?.code || 'unknown_error',
          message: error.response?.data?.error?.message || error.message || 'Unknown error occurred',
          details: error.response?.data?.error?.details,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Map payment method to Hyperswitch format
   */
  private mapPaymentMethod(paymentMethod: any): any {
    // Map payment method details based on type
    const mappedMethod: any = {
      type: paymentMethod.type,
    };

    switch (paymentMethod.type) {
      case 'card':
        mappedMethod.card = {
          number: paymentMethod.details.number,
          exp_month: paymentMethod.details.expMonth,
          exp_year: paymentMethod.details.expYear,
          cvc: paymentMethod.details.cvc,
          name: paymentMethod.details.name,
        };
        break;
      case 'bank_transfer':
        mappedMethod.bank_transfer = {
          account_number: paymentMethod.details.accountNumber,
          routing_number: paymentMethod.details.routingNumber,
          account_type: paymentMethod.details.accountType,
          bank_name: paymentMethod.details.bankName,
        };
        break;
      // Add other payment methods as needed
    }

    return mappedMethod;
  }

  /**
   * Map payment status from Hyperswitch to standardized format
   */
  private mapPaymentStatus(status: string): 'pending' | 'succeeded' | 'failed' | 'canceled' {
    switch (status) {
      case 'succeeded':
        return 'succeeded';
      case 'failed':
        return 'failed';
      case 'canceled':
      case 'cancelled':
        return 'canceled';
      default:
        return 'pending';
    }
  }

  /**
   * Map refund status from Hyperswitch to standardized format
   */
  private mapRefundStatus(status: string): 'pending' | 'succeeded' | 'failed' {
    switch (status) {
      case 'succeeded':
        return 'succeeded';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }
}
