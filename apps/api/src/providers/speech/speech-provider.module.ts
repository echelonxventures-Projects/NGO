import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SPEECH_PORT, SpeechPort } from './speech.port';
import { StubSpeechAdapter } from './stub-speech.adapter';

/**
 * Binds SPEECH_PORT to the adapter chosen by SPEECH_PROVIDER (env). Defaults to the free-first
 * stub adapter. Real engines (Piper/Coqui TTS, Whisper STT) add to the switch — feature code
 * never changes. @Global so the multilingual feature module can inject it.
 */
@Global()
@Module({
  providers: [
    StubSpeechAdapter,
    {
      provide: SPEECH_PORT,
      inject: [ConfigService, StubSpeechAdapter],
      useFactory: (_config: ConfigService, stub: StubSpeechAdapter): SpeechPort => stub,
    },
  ],
  exports: [SPEECH_PORT],
})
export class SpeechProviderModule {}
