import { Injectable } from '@nestjs/common';
import { TranslateInput, TranslateResult, TranslationPort } from './translation.port';

/**
 * Free-first, offline translation adapter. It does not perform real translation (no network/
 * model); it tags the text with the target language so multilingual pipelines are exercisable
 * end-to-end in dev/CI/air-gapped installs. Configure TRANSLATION_PROVIDER=libretranslate for
 * real translation.
 */
@Injectable()
export class EchoTranslationAdapter implements TranslationPort {
  readonly name = 'echo';

  async translate(input: TranslateInput): Promise<TranslateResult> {
    return {
      provider: this.name,
      source: input.source ?? 'auto',
      target: input.target,
      text: `[${input.target}] ${input.text}`,
    };
  }
}
