import { Inject, Injectable } from '@nestjs/common';
import { TRANSLATION_PORT, TranslationPort, SUPPORTED_LANGUAGES } from '../providers/translation/translation.port';
import { SPEECH_PORT, SpeechPort } from '../providers/speech/speech.port';
import { AiService } from '../ai/ai.service';

/**
 * Multilingual AI service: text translation (single + batch), text-to-speech / speech-to-text,
 * and localized content explanation (delegates to AiService.explain with a target language).
 * All backends are provider-abstracted and free-first by default.
 */
@Injectable()
export class MultilingualService {
  constructor(
    @Inject(TRANSLATION_PORT) private readonly translation: TranslationPort,
    @Inject(SPEECH_PORT) private readonly speech: SpeechPort,
    private readonly ai: AiService,
  ) {}

  languages() {
    return { provider: this.translation.name, languages: SUPPORTED_LANGUAGES };
  }

  translate(text: string, target: string, source?: string) {
    return this.translation.translate({ text, target, source });
  }

  async translateBatch(texts: string[], target: string, source?: string) {
    const results = await Promise.all(
      texts.map((text) => this.translation.translate({ text, target, source })),
    );
    return { target, items: results.map((r) => r.text) };
  }

  tts(text: string, language?: string, voice?: string) {
    return this.speech.textToSpeech({ text, language, voice });
  }

  stt(audioBase64: string, language?: string) {
    return this.speech.speechToText({ audioBase64, language });
  }

  /** Explains content in the requested mode, then ensures the output is in the target language. */
  explainLocalized(content: string, mode: string, language: string) {
    return this.ai.explain(content, mode, language);
  }
}
