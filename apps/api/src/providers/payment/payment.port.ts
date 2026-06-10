/** Capability port for payments. Feature code depends only on this, never a vendor SDK. */
export const PAYMENT_PORT = Symbol('PAYMENT_PORT');

export interface CreateIntentInput {
  amount: number; // minor units
  currency: string;
  reference: string; // our donation id
  metadata?: Record<string, unknown>;
}

export interface PaymentIntent {
  provider: string;
  providerRef: string;
  clientSecret?: string;
  status: 'requires_action' | 'succeeded' | 'failed';
}

export interface PaymentEvent {
  providerRef: string;
  status: 'succeeded' | 'failed';
}

export interface CreateSubscriptionInput {
  amount: number; // minor units per cycle
  currency: string;
  interval: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  reference: string; // our subscription id
  metadata?: Record<string, unknown>;
}

export interface SubscriptionResult {
  provider: string;
  providerRef: string;
  status: 'active' | 'failed';
  nextChargeAt?: Date;
}

export interface PaymentPort {
  readonly name: string;
  createIntent(input: CreateIntentInput): Promise<PaymentIntent>;
  verifyWebhook(payload: unknown, signature: string): Promise<PaymentEvent>;
  createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionResult>;
  cancelSubscription(providerRef: string): Promise<void>;
}
