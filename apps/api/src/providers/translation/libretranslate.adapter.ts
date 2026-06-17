import { Logger } from '@nestjs/common';
import { TranslateInput, TranslateResult, TranslationPort } from './translation.port';

export interface LibreTranslateConfig {
  baseUrl: string;
  apiKey?: string;
}

/**
 * LibreTranslate adapter (https://libretranslate.com / self-hosted) — free and open-source.
 * No key needed for self-hosted instances. Uses the global fetch; no SDK.
 */
export class LibreTranslateAdapter implements TranslationPort {
  readonly name = 'libretranslate';
  private readonly logger = new Logger(LibreTranslateAdapter.name);

  constructor(private readonly cfg: LibreTranslateConfig) {}

  async translate(input: TranslateInput): Promise<TranslateResult> {
    const res = await fetch(`${this.cfg.baseUrl.replace(/\/$/, '')}/translate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        q: input.text,
        source: input.source ?? 'auto',
        target: input.target,
        format: 'text',
        api_key: this.cfg.apiKey || undefined,
      }),
    });
    if (!res.ok) {
      this.logger.error(`libretranslate error ${res.status}`);
      throw new Error(`libretranslate request failed (${res.status})`);
    }
    const data = (await res.json()) as { translatedText?: string; detectedLanguage?: { language?: string } };
    return {
      provider: this.name,
      source: data.detectedLanguage?.language ?? input.source ?? 'auto',
      target: input.target,
      text: data.translatedText ?? '',
    };
  }
}
