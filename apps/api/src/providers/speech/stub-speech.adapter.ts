import { Injectable } from '@nestjs/common';
import { SpeechPort, SttInput, SttResult, TtsInput, TtsResult } from './speech.port';

/**
 * Free-first stub speech adapter. It does not synthesize or recognize audio (no model/network)
 * but fulfills the SpeechPort contract so TTS/STT endpoints are usable end-to-end in dev/CI.
 * Configure SPEECH_PROVIDER to a real engine (Piper/Coqui TTS, Whisper STT) in production.
 */
@Injectable()
export class StubSpeechAdapter implements SpeechPort {
  readonly name = 'stub';

  async textToSpeech(input: TtsInput): Promise<TtsResult> {
    return {
      provider: this.name,
      format: 'audio/wav',
      audioBase64: '',
      note: `stub TTS — configure SPEECH_PROVIDER for real audio (lang=${input.language ?? 'auto'})`,
    };
  }

  async speechToText(_input: SttInput): Promise<SttResult> {
    return {
      provider: this.name,
      text: '',
      note: 'stub STT — configure SPEECH_PROVIDER (e.g. Whisper) for real transcription',
    };
  }
}
