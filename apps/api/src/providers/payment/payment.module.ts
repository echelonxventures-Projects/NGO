import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PAYMENT_PORT, PaymentPort } from './payment.port';
import { MockPaymentAdapter } from './mock-payment.adapter';

/**
 * Binds PAYMENT_PORT to the adapter selected by PAYMENT_PROVIDER (env). Falls back to the
 * free mock adapter so the platform always runs. Add razorpay/stripe adapters to the switch
 * — no donation code changes required.
 */
@Global()
@Module({
  providers: [
    MockPaymentAdapter,
    {
      provide: PAYMENT_PORT,
      inject: [ConfigService, MockPaymentAdapter],
      useFactory: (config: ConfigService, mock: MockPaymentAdapter): PaymentPort => {
        const provider = config.get<string>('providers.payment') ?? 'mock';
        switch (provider) {
          // case 'razorpay': return new RazorpayAdapter(config);
          // case 'stripe':   return new StripeAdapter(config);
          case 'mock':
          default:
            return mock;
        }
      },
    },
  ],
  exports: [PAYMENT_PORT],
})
export class PaymentModule {}
