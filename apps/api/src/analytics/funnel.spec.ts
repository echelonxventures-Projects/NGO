import { computeFunnel } from './funnel';

describe('computeFunnel', () => {
  it('computes step and overall conversion percentages', () => {
    const result = computeFunnel([
      { type: 'pageview', count: 1000 },
      { type: 'add_to_cart', count: 250 },
      { type: 'checkout', count: 100 },
      { type: 'purchase', count: 60 },
    ]);
    expect(result[0]).toEqual({ step: 'pageview', count: 1000, conversionPct: 100, overallPct: 100 });
    expect(result[1]).toEqual({ step: 'add_to_cart', count: 250, conversionPct: 25, overallPct: 25 });
    expect(result[2]).toEqual({ step: 'checkout', count: 100, conversionPct: 40, overallPct: 10 });
    expect(result[3]).toEqual({ step: 'purchase', count: 60, conversionPct: 60, overallPct: 6 });
  });

  it('handles zero-count first step without dividing by zero', () => {
    const result = computeFunnel([{ type: 'a', count: 0 }, { type: 'b', count: 0 }]);
    expect(result[0].conversionPct).toBe(100);
    expect(result[1].conversionPct).toBe(0);
    expect(result[1].overallPct).toBe(0);
  });
});
