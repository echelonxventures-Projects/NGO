import { BLOCK_LIBRARY, validateBlocks } from './block-library';

describe('block library', () => {
  it('includes all required block types from the spec', () => {
    const types = BLOCK_LIBRARY.map((b) => b.type);
    for (const required of [
      'hero', 'text', 'image', 'video', 'gallery', 'projects', 'products', 'courses',
      'events', 'forms', 'donations', 'testimonials', 'faq', 'community_feed',
      'live_stream', 'custom_html', 'custom_component',
    ]) {
      expect(types).toContain(required);
    }
  });
});

describe('validateBlocks', () => {
  it('accepts known block types', () => {
    expect(validateBlocks([{ type: 'hero' }, { type: 'text', props: { html: 'hi' } }])).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('rejects unknown types and missing type', () => {
    const result = validateBlocks([{ type: 'nope' }, {} as never]);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it('rejects a non-array', () => {
    expect(validateBlocks(null as never).valid).toBe(false);
  });
});
