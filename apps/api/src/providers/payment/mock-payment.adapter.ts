import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  CreateIntentInput,
  CreateSubscriptionInput,
  PaymentEvent,
  PaymentIntent,
  PaymentPort,
  SubscriptionResult,
} from './payment.port';

/** Adds one interval to a date (used to compute the next charge date). */
export function addInterval(from: Date, interval: CreateSubscriptionInput['interval']): Date {
  const d = new Date(from);
  switch (interval) {
    case 'WEEKLY':
      d.setDate(d.getDate() + 7);
      break;
    case 'MONTHLY':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'QUARTERLY':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'YEARLY':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

/**
 * Free-first default. Simulates a payment intent that immediately "succeeds" so the full
 * donation flow is demoable with zero external services. Replace via PAYMENT_PROVIDER env
 * (razorpay/stripe adapters) without touching donation code.
 */
@Injectable()
export class MockPaymentAdapter implements PaymentPort {
  readonly name = 'mock';

  async createIntent(input: CreateIntentInput): Promise<PaymentIntent> {
    return {
      provider: this.name,
      providerRef: `mock_${randomUUID()}`,
      clientSecret: `secret_${input.reference}`,
      status: 'succeeded',
    };
  }

  async verifyWebhook(payload: unknown, _signature: string): Promise<PaymentEvent> {
    const p = (payload ?? {}) as { providerRef?: string; status?: 'succeeded' | 'failed' };
    return {
      providerRef: p.providerRef ?? 'unknown',
      status: p.status ?? 'succeeded',
    };
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionResult> {
    return {
      provider: this.name,
      providerRef: `mocksub_${randomUUID()}`,
      status: 'active',
      nextChargeAt: addInterval(new Date(), input.interval),
    };
  }

  async cancelSubscription(_providerRef: string): Promise<void> {
    // no-op for the mock adapter
  }
}
