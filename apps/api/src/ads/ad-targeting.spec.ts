import { ctr, matchTargeting, pickWeighted } from './ad-targeting';

describe('matchTargeting', () => {
  it('matches when context satisfies every constrained dimension', () => {
    expect(matchTargeting({ country: ['IN'], language: ['hi', 'en'] }, { country: 'IN', language: 'hi' })).toBe(true);
  });

  it('rejects when a constrained dimension is not satisfied', () => {
    expect(matchTargeting({ country: ['IN'] }, { country: 'US' })).toBe(false);
    expect(matchTargeting({ role: ['student'] }, {})).toBe(false);
  });

  it('treats empty/absent constraints as match-all', () => {
    expect(matchTargeting({}, { country: 'US' })).toBe(true);
    expect(matchTargeting({ country: [] }, { country: 'US' })).toBe(true);
  });
});

describe('pickWeighted', () => {
  it('returns null for an empty list', () => {
    expect(pickWeighted([])).toBeNull();
  });

  it('selects deterministically by weight with an injected rng', () => {
    const ads = [{ id: 'a', weight: 1 }, { id: 'b', weight: 3 }];
    // total weight 4; rng 0.1 -> 0.4 < 1 -> 'a'
    expect(pickWeighted(ads, () => 0.1)!.id).toBe('a');
    // rng 0.5 -> 2.0; minus a(1) -> 1.0; minus b(3) -> <0 -> 'b'
    expect(pickWeighted(ads, () => 0.5)!.id).toBe('b');
  });
});

describe('ctr', () => {
  it('computes click-through rate as a 2dp percentage', () => {
    expect(ctr(1000, 25)).toBe(2.5);
    expect(ctr(0, 0)).toBe(0);
  });
});
