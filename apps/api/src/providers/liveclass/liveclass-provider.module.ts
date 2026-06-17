import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LIVECLASS_PORT, LiveClassPort } from './liveclass.port';
import { JitsiAdapter } from './jitsi.adapter';

/**
 * Binds LIVECLASS_PORT to the adapter chosen by LIVECLASS_PROVIDER (env). Defaults to the
 * free Jitsi adapter so live classes work with zero configuration. Add LiveKit/BigBlueButton
 * adapters to the switch — feature code never changes.
 *
 * @Global so the LMS / live-class feature module can inject it.
 */
@Global()
@Module({
  providers: [
    {
      provide: LIVECLASS_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): LiveClassPort => {
        const provider = config.get<string>('providers.liveclass') ?? 'jitsi';
        const jitsiBase = config.get<string>('liveclass.jitsiBaseUrl') ?? 'https://meet.jit.si';
        switch (provider) {
          case 'jitsi':
          default:
            return new JitsiAdapter(jitsiBase);
        }
      },
    },
  ],
  exports: [LIVECLASS_PORT],
})
export class LiveClassProviderModule {}
