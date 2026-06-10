/**
 * Minimal, dependency-free template rendering for certificates.
 * Replaces {{key}} placeholders with HTML-escaped values from `data`.
 * Unknown placeholders render as empty strings. This is intentionally NOT a general
 * template engine — it only substitutes escaped scalar values, which avoids injection.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    const value = key.split('.').reduce<unknown>((acc, k) => {
      if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[k];
      return undefined;
    }, data);
    return escapeHtml(value);
  });
}

/** Returns the list of {{placeholders}} declared in a template. */
export function extractPlaceholders(template: string): string[] {
  const set = new Set<string>();
  for (const m of template.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) set.add(m[1]);
  return [...set];
}
