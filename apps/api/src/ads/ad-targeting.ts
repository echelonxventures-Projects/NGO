/**
 * Pure ad targeting + selection logic (no I/O) so it is fully unit-testable.
 */

export type AdTargeting = Partial<
  Record<'country' | 'state' | 'city' | 'language' | 'device' | 'role' | 'membership', string[]>
>;

export type AdContext = Partial<
  Record<'country' | 'state' | 'city' | 'language' | 'device' | 'role' | 'membership', string>
>;

const DIMENSIONS = ['country', 'state', 'city', 'language', 'device', 'role', 'membership'] as const;

/**
 * An ad matches when, for every targeting dimension it constrains, the request context's value
 * is in the allowed list. An empty/absent constraint on a dimension matches anything.
 */
export function matchTargeting(targeting: AdTargeting, context: AdContext): boolean {
  for (const dim of DIMENSIONS) {
    const allowed = targeting[dim];
    if (allowed && allowed.length > 0) {
      const value = context[dim];
      if (!value || !allowed.includes(value)) return false;
    }
  }
  return true;
}

export interface WeightedAd {
  id: string;
  weight: number;
}

/**
 * Weighted random selection. `rng` returns [0,1); injectable for deterministic tests.
 * Non-positive weights are treated as 1. Returns null for an empty list.
 */
export function pickWeighted<T extends WeightedAd>(ads: T[], rng: () => number = Math.random): T | null {
  if (ads.length === 0) return null;
  const weights = ads.map((a) => (a.weight > 0 ? a.weight : 1));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < ads.length; i++) {
    r -= weights[i];
    if (r < 0) return ads[i];
  }
  return ads[ads.length - 1];
}

export function ctr(impressions: number, clicks: number): number {
  if (impressions <= 0) return 0;
  return Math.round((clicks / impressions) * 10000) / 100; // percentage, 2dp
}
