/**
 * Capability port for machine translation. Free-first default is the offline `echo` adapter
 * (deterministic, no network) so multilingual features always run; LibreTranslate (free,
 * self-hostable, no key) is the recommended real provider. Swap via TRANSLATION_PROVIDER.
 */
export const TRANSLATION_PORT = Symbol('TRANSLATION_PORT');

export interface TranslateInput {
  text: string;
  /** Target language code (ISO 639-1), e.g. "hi", "bn", "ta". */
  target: string;
  /** Source language code or "auto". */
  source?: string;
}

export interface TranslateResult {
  provider: string;
  source: string;
  target: string;
  text: string;
}

export interface TranslationPort {
  readonly name: string;
  translate(input: TranslateInput): Promise<TranslateResult>;
}

/** A non-exhaustive set of supported language codes (the platform targets 100+). */
export const SUPPORTED_LANGUAGES: { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'mr', name: 'Marathi' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'ur', name: 'Urdu' },
  { code: 'or', name: 'Odia' },
  { code: 'as', name: 'Assamese' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'de', name: 'German' },
];
