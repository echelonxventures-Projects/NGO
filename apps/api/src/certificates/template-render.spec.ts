import { escapeHtml, extractPlaceholders, renderTemplate } from './template-render';

describe('template-render', () => {
  describe('escapeHtml', () => {
    it('escapes HTML-significant characters', () => {
      expect(escapeHtml('<script>"x"&\'y\'')).toBe(
        '&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;',
      );
    });

    it('renders null/undefined as an empty string', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });
  });

  describe('renderTemplate', () => {
    it('substitutes simple placeholders', () => {
      expect(renderTemplate('Hello {{name}}', { name: 'Asha' })).toBe('Hello Asha');
    });

    it('resolves nested dotted keys', () => {
      expect(renderTemplate('{{org.legalName}}', { org: { legalName: 'Vashundhara' } })).toBe(
        'Vashundhara',
      );
    });

    it('escapes substituted values (no injection)', () => {
      expect(renderTemplate('{{x}}', { x: '<b>hi</b>' })).toBe('&lt;b&gt;hi&lt;/b&gt;');
    });

    it('renders unknown placeholders as empty', () => {
      expect(renderTemplate('[{{missing}}]', {})).toBe('[]');
    });

    it('tolerates surrounding whitespace in the placeholder', () => {
      expect(renderTemplate('{{  name  }}', { name: 'X' })).toBe('X');
    });
  });

  describe('extractPlaceholders', () => {
    it('returns a de-duplicated list of placeholder keys', () => {
      const keys = extractPlaceholders('{{a}} {{b.c}} {{a}}');
      expect(keys.sort()).toEqual(['a', 'b.c']);
    });

    it('returns an empty array when there are no placeholders', () => {
      expect(extractPlaceholders('no placeholders here')).toEqual([]);
    });
  });
});
