import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';
import { FX_RATE_PORT } from './fx.port';
import { SeededFxAdapter } from './seeded-fx.adapter';
import { FrankfurterFxAdapter } from './frankfurter-fx.adapter';

/**
 * Binds FX_RATE_PORT to the adapter chosen by FX_PROVIDER (env). Defaults to the offline
 * seeded adapter so the platform always converts using tenant-managed rates.
 */
@Global()
@Module({
  controllers: [CurrencyController],
  providers: [
    CurrencyService,
    SeededFxAdapter,
    FrankfurterFxAdapter,
    {
      provide: FX_RATE_PORT,
      inject: [ConfigService, SeededFxAdapter, FrankfurterFxAdapter],
      useFactory: (
        config: ConfigService,
        seeded: SeededFxAdapter,
        frankfurter: FrankfurterFxAdapter,
      ) => {
        const provider = config.get<string>('providers.fx') ?? 'seeded';
        return provider === 'frankfurter' ? frankfurter : seeded;
      },
    },
  ],
  exports: [CurrencyService, FX_RATE_PORT],
})
export class CurrencyModule {}
