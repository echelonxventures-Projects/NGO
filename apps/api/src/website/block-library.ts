/**
 * Website builder block library. A static catalog of the supported drag-and-drop block types
 * and their allowed prop keys. Pure (no I/O) so validation is unit-testable. The page builder
 * UI renders from this catalog; the API validates submitted blocks against it.
 */

export interface BlockDef {
  type: string;
  label: string;
  /** Allowed prop keys (informational + light validation). */
  props: string[];
}

export const BLOCK_LIBRARY: BlockDef[] = [
  { type: 'hero', label: 'Hero', props: ['title', 'subtitle', 'imageUrl', 'ctaText', 'ctaUrl'] },
  { type: 'text', label: 'Text', props: ['html'] },
  { type: 'image', label: 'Image', props: ['url', 'alt', 'caption'] },
  { type: 'video', label: 'Video', props: ['url', 'poster'] },
  { type: 'gallery', label: 'Gallery', props: ['images'] },
  { type: 'projects', label: 'Projects', props: ['limit', 'tag'] },
  { type: 'products', label: 'Products', props: ['limit', 'category'] },
  { type: 'courses', label: 'Courses', props: ['limit'] },
  { type: 'events', label: 'Events', props: ['limit'] },
  { type: 'forms', label: 'Form', props: ['formId', 'fields'] },
  { type: 'donations', label: 'Donations', props: ['campaign', 'presetAmounts'] },
  { type: 'testimonials', label: 'Testimonials', props: ['items'] },
  { type: 'faq', label: 'FAQ', props: ['items'] },
  { type: 'community_feed', label: 'Community Feed', props: ['limit'] },
  { type: 'live_stream', label: 'Live Stream', props: ['sessionId'] },
  { type: 'custom_html', label: 'Custom HTML', props: ['html'] },
  { type: 'custom_component', label: 'Custom Component', props: ['name', 'props'] },
];

const VALID_TYPES = new Set(BLOCK_LIBRARY.map((b) => b.type));

export interface PageBlock {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
}

export interface BlockValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validates an ordered block list: every block must reference a known type. */
export function validateBlocks(blocks: PageBlock[]): BlockValidationResult {
  const errors: string[] = [];
  if (!Array.isArray(blocks)) {
    return { valid: false, errors: ['blocks must be an array'] };
  }
  blocks.forEach((b, i) => {
    if (!b || typeof b.type !== 'string') {
      errors.push(`block[${i}] missing type`);
    } else if (!VALID_TYPES.has(b.type)) {
      errors.push(`block[${i}] unknown type "${b.type}"`);
    }
  });
  return { valid: errors.length === 0, errors };
}
