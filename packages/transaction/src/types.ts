export interface PaymentConfig {
  apiKey?: string;
  environment?: 'sandbox' | 'production';
  defaultCurrency?: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface PaymentProcessorConfig {
  name: string;
  apiKey?: string;
  apiSecret?: string;
  merchantId?: string;
  webhookSecret?: string;
  priority?: number;
}

export interface PaymentMethod {
  type: 'card' | 'bank_transfer' | 'wallet' | 'crypto';
  details: Record<string, unknown>;
  saved?: boolean;
  customerId?: string;
}

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface Customer {
  id?: string;
  email: string;
  name?: string;
  phone?: string;
  address?: Address;
  metadata?: Record<string, unknown>;
}

export interface PaymentAmount {
  value: number;
  currency: string;
}

export interface LineItem {
  name: string;
  description?: string;
  amount: PaymentAmount;
  quantity: number;
  metadata?: Record<string, unknown>;
}

export interface PaymentRequest {
  amount: PaymentAmount;
  paymentMethod: PaymentMethod;
  customer: Customer;
  description?: string;
  metadata?: Record<string, unknown>;
  items?: LineItem[];
  idempotencyKey?: string;
}

export interface PaymentResponse {
  id: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  amount: PaymentAmount;
  fee?: PaymentAmount;
  processor: string;
  processorTransactionId?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefundRequest {
  paymentId: string;
  amount?: PaymentAmount;
  reason?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface RefundResponse {
  id: string;
  paymentId: string;
  status: 'pending' | 'succeeded' | 'failed';
  amount: PaymentAmount;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentProcessor {
  name: string;
  process: (request: PaymentRequest) => Promise<PaymentResponse>;
  refund: (request: RefundRequest) => Promise<RefundResponse>;
  validateWebhook: (payload: any, signature: string) => boolean;
}

export interface SecurityConfig {
  encryptionAlgorithm?: string;
  keySize?: number;
  saltRounds?: number;
  secretKey?: string;
}
