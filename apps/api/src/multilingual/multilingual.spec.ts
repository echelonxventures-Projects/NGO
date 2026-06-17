import { EchoTranslationAdapter } from '../providers/translation/echo-translation.adapter';
import { SUPPORTED_LANGUAGES } from '../providers/translation/translation.port';
import { StubSpeechAdapter } from '../providers/speech/stub-speech.adapter';

describe('EchoTranslationAdapter', () => {
  const adapter = new EchoTranslationAdapter();

  it('tags text with the target language deterministically (offline)', async () => {
    const r = await adapter.translate({ text: 'Hello', target: 'hi' });
    expect(r.provider).toBe('echo');
    expect(r.target).toBe('hi');
    expect(r.text).toBe('[hi] Hello');
    expect(r.source).toBe('auto');
  });
});

describe('SUPPORTED_LANGUAGES', () => {
  it('includes core Indian + international languages with unique codes', () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    for (const c of ['en', 'hi', 'bn', 'ta', 'te']) expect(codes).toContain(c);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('StubSpeechAdapter', () => {
  const adapter = new StubSpeechAdapter();

  it('returns a contract-compliant TTS stub', async () => {
    const r = await adapter.textToSpeech({ text: 'hi', language: 'hi' });
    expect(r.format).toBe('audio/wav');
    expect(r.audioBase64).toBe('');
    expect(r.note).toContain('stub');
  });

  it('returns a contract-compliant STT stub', async () => {
    const r = await adapter.speechToText({ audioBase64: 'x' });
    expect(r.text).toBe('');
    expect(r.provider).toBe('stub');
  });
});
