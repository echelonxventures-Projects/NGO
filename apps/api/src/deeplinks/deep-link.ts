/** Platform detection + smart-link target resolution. Pure functions for unit testing. */

export type Platform = 'android' | 'ios' | 'web';

export function detectPlatform(userAgent?: string): Platform {
  const ua = (userAgent ?? '').toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  return 'web';
}

export interface ResolvableLink {
  targetUrl: string;
  androidUrl?: string | null;
  iosUrl?: string | null;
  fallbackUrl?: string | null;
}

/**
 * Chooses the best destination for a platform: platform-specific deep link if present,
 * otherwise the default web target. Fallback is used only when no platform/default applies.
 */
export function resolveTarget(link: ResolvableLink, platform: Platform): string {
  if (platform === 'android' && link.androidUrl) return link.androidUrl;
  if (platform === 'ios' && link.iosUrl) return link.iosUrl;
  return link.targetUrl || link.fallbackUrl || '';
}
