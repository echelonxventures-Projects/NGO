import { EchoAiAdapter } from '../providers/ai/echo-ai.adapter';
import {
  buildExplainPrompt,
  buildQuizPrompt,
  EXPLANATION_MODES,
  isExplanationMode,
  MODE_INSTRUCTIONS,
} from './prompts';

describe('AI prompts', () => {
  it('defines instructions for all eight explanation modes', () => {
    expect(EXPLANATION_MODES).toHaveLength(8);
    for (const mode of EXPLANATION_MODES) {
      expect(MODE_INSTRUCTIONS[mode]).toBeTruthy();
    }
  });

  it('validates explanation modes', () => {
    expect(isExplanationMode('eli5')).toBe(true);
    expect(isExplanationMode('nonsense')).toBe(false);
  });

  it('builds an explain prompt with mode instruction and language', () => {
    const msgs = buildExplainPrompt('Photosynthesis', 'eli5', 'Hindi');
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain(MODE_INSTRUCTIONS.eli5);
    expect(msgs[0].content).toContain('Hindi');
    expect(msgs[1].content).toContain('Photosynthesis');
  });

  it('builds a quiz prompt requesting strict JSON', () => {
    const msgs = buildQuizPrompt('Fractions', 3);
    expect(msgs[0].content.toLowerCase()).toContain('json');
    expect(msgs[1].content).toContain('3');
    expect(msgs[1].content).toContain('Fractions');
  });
});

describe('EchoAiAdapter', () => {
  const adapter = new EchoAiAdapter();

  it('produces a deterministic, non-empty completion without network', async () => {
    const res = await adapter.complete({
      messages: [{ role: 'user', content: 'Explain gravity' }],
    });
    expect(res.provider).toBe('echo');
    expect(res.text).toContain('gravity');
    expect(res.usage.completionTokens).toBeGreaterThan(0);
  });

  it('emits JSON when the system prompt requests JSON', async () => {
    const res = await adapter.complete({
      messages: [
        { role: 'system', content: 'Reply with JSON only' },
        { role: 'user', content: 'Quadratic equations' },
      ],
    });
    expect(() => JSON.parse(res.text)).not.toThrow();
    expect(JSON.parse(res.text).topic).toContain('Quadratic');
  });
});
