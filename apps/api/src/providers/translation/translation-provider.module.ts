import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TRANSLATION_PORT, TranslationPort } from './translation.port';
import { EchoTranslationAdapter } from './echo-translation.adapter';
import { LibreTranslateAdapter } from './libretranslate.adapter';

/**
 * Binds TRANSLATION_PORT to the adapter chosen by TRANSLATION_PROVIDER (env). Defaults to the
 * free offline `echo` adapter; `libretranslate` is the free self-hostable real provider.
 * @Global so the multilingual feature module can inject it.
 */
@Global()
@Module({
  providers: [
    EchoTranslationAdapter,
    {
      provide: TRANSLATION_PORT,
      inject: [ConfigService, EchoTranslationAdapter],
      useFactory: (config: ConfigService, echo: EchoTranslationAdapter): TranslationPort => {
        const provider = config.get<string>('providers.translation') ?? 'echo';
        if (provider === 'libretranslate') {
          return new LibreTranslateAdapter({
            baseUrl: config.get<string>('translation.libreUrl') ?? 'https://libretranslate.com',
            apiKey: config.get<string>('translation.libreApiKey') ?? '',
          });
        }
        return echo;
      },
    },
  ],
  exports: [TRANSLATION_PORT],
})
export class TranslationProviderModule {}
