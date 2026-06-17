/**
 * Capability port for speech: text-to-speech (TTS) and speech-to-text (STT). Free-first default
 * is a stub adapter (no audio synthesis/recognition) so the API contract is usable everywhere;
 * real engines (Piper/Coqui for TTS, Whisper for STT — all free/self-hostable) plug in later.
 */
export const SPEECH_PORT = Symbol('SPEECH_PORT');

export interface TtsInput {
  text: string;
  language?: string;
  voice?: string;
}

export interface TtsResult {
  provider: string;
  /** Audio MIME type, e.g. "audio/wav". */
  format: string;
  /** Base64-encoded audio when synthesized; empty for the stub. */
  audioBase64: string;
  note?: string;
}

export interface SttInput {
  audioBase64: string;
  language?: string;
}

export interface SttResult {
  provider: string;
  text: string;
  note?: string;
}

export interface SpeechPort {
  readonly name: string;
  textToSpeech(input: TtsInput): Promise<TtsResult>;
  speechToText(input: SttInput): Promise<SttResult>;
}
