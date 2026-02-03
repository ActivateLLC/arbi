import { HyperswitchPaymentManager } from './payment/HyperswitchPaymentManager';
import { SecurityManager } from './security/SecurityManager';

import type {
  PaymentConfig,
  PaymentProcessorConfig,
  PaymentRequest,
  PaymentResponse,
  RefundRequest,
  RefundResponse,
  SecurityConfig,
} from './types';

export class TransactionManager {
  private securityManager: SecurityManager;
  private paymentManager: HyperswitchPaymentManager;

  constructor(paymentConfig: PaymentConfig = {}, securityConfig: SecurityConfig = {}) {
    this.securityManager = new SecurityManager(securityConfig);
    this.paymentManager = new HyperswitchPaymentManager(paymentConfig, this.securityManager);
  }

  /**
   * Get the security manager
   */
  public getSecurity(): SecurityManager {
    return this.securityManager;
  }

  /**
   * Register a payment processor
   */
  public registerPaymentProcessor(config: PaymentProcessorConfig): void {
    this.paymentManager.registerProcessor(config);
  }

  /**
   * Process a payment
   */
  public async processPayment(
    processorName: string,
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    const processor = this.paymentManager.getProcessor(processorName);
    return processor.process(request);
  }

  /**
   * Process a refund
   */
  public async processRefund(
    processorName: string,
    request: RefundRequest
  ): Promise<RefundResponse> {
    const processor = this.paymentManager.getProcessor(processorName);
    return processor.refund(request);
  }

  /**
   * Validate webhook signature
   */
  public validateWebhook(
    processorName: string,
    payload: unknown,
    signature: string
  ): boolean {
    const processor = this.paymentManager.getProcessor(processorName);
    return processor.validateWebhook(payload, signature);
  }

  /**
   * Encrypt sensitive payment data
   */
  public encryptPaymentData(data: string): { encryptedData: string; iv: string } {
    return this.securityManager.encrypt(data);
  }

  /**
   * Decrypt sensitive payment data
   */
  public decryptPaymentData(encryptedData: string, iv: string): string {
    return this.securityManager.decrypt(encryptedData, iv);
  }

  /**
   * Generate secure idempotency key
   */
  public generateIdempotencyKey(): string {
    return this.securityManager.generateKey(16);
  }
}
