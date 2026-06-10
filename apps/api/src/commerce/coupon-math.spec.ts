import { computeDiscount, couponError, CouponLike } from './coupon-math';

const base: CouponLike = {
  type: 'PERCENT',
  value: 10,
  minSubtotal: 0,
  maxRedemptions: null,
  redeemedCount: 0,
  expiresAt: null,
  active: true,
};

describe('coupon-math', () => {
  describe('computeDiscount', () => {
    it('computes a percentage discount (floored)', () => {
      expect(computeDiscount({ ...base, type: 'PERCENT', value: 10 }, 9999)).toBe(999);
    });

    it('clamps percentage to 0..100', () => {
      expect(computeDiscount({ ...base, type: 'PERCENT', value: 150 }, 1000)).toBe(1000);
      expect(computeDiscount({ ...base, type: 'PERCENT', value: -5 }, 1000)).toBe(0);
    });

    it('applies a fixed discount capped at the subtotal', () => {
      expect(computeDiscount({ ...base, type: 'FIXED', value: 500 }, 1000)).toBe(500);
      expect(computeDiscount({ ...base, type: 'FIXED', value: 5000 }, 1000)).toBe(1000);
    });
  });

  describe('couponError', () => {
    const now = new Date('2026-01-01T00:00:00Z');

    it('returns null for a valid coupon', () => {
      expect(couponError(base, 1000, now)).toBeNull();
    });

    it('rejects an inactive coupon', () => {
      expect(couponError({ ...base, active: false }, 1000, now)).toMatch(/not active/);
    });

    it('rejects an expired coupon', () => {
      expect(couponError({ ...base, expiresAt: new Date('2025-12-31T00:00:00Z') }, 1000, now)).toMatch(
        /expired/,
      );
    });

    it('rejects when the redemption limit is reached', () => {
      expect(couponError({ ...base, maxRedemptions: 5, redeemedCount: 5 }, 1000, now)).toMatch(
        /limit/,
      );
    });

    it('rejects when the subtotal is below the minimum', () => {
      expect(couponError({ ...base, minSubtotal: 2000 }, 1000, now)).toMatch(/minimum/);
    });
  });
});
