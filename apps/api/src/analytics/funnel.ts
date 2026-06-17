/**
 * Pure analytics aggregation helpers (no I/O) for unit testing.
 */

export interface FunnelStep {
  type: string;
  count: number;
}

export interface FunnelResult {
  step: string;
  count: number;
  /** Conversion from the previous step (percentage, 2dp); 100 for the first step. */
  conversionPct: number;
  /** Conversion from the first step (percentage, 2dp). */
  overallPct: number;
}

/**
 * Computes a funnel from ordered step counts. Each step's conversion is relative to the prior
 * step; overall is relative to the first step.
 */
export function computeFunnel(steps: FunnelStep[]): FunnelResult[] {
  const first = steps[0]?.count ?? 0;
  let prev = first;
  return steps.map((s, i) => {
    const conversionPct = i === 0 ? 100 : prev > 0 ? round2((s.count / prev) * 100) : 0;
    const overallPct = first > 0 ? round2((s.count / first) * 100) : 0;
    prev = s.count;
    return { step: s.type, count: s.count, conversionPct, overallPct };
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
