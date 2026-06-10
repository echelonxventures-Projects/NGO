/**
 * Pure coupon logic, separated from the service so it can be unit-tested without a DB.
 * Amounts are integer minor units. PERCENT value is 0..100; FIXED value is minor units.
 */
export interface CouponLike {
  type: 'PERCENT' | 'FIXED';
  value: number;
  minSubtotal: number;
  maxRedemptions: number | null;
  redeemedCount: number;
  expiresAt: Date | null;
  active: boolean;
}

/** Returns a human-readable reason the coupon cannot apply, or null if it is valid. */
export function couponError(
  coupon: CouponLike,
  subtotal: number,
  now: Date = new Date(),
): string | null {
  if (!coupon.active) return 'Coupon is not active';
  if (coupon.expiresAt && coupon.expiresAt.getTime() < now.getTime()) return 'Coupon has expired';
  if (coupon.maxRedemptions != null && coupon.redeemedCount >= coupon.maxRedemptions) {
    return 'Coupon redemption limit reached';
  }
  if (subtotal < coupon.minSubtotal) {
    return `Order subtotal below the minimum required for this coupon`;
  }
  return null;
}

/** Discount in minor units, never exceeding the subtotal. */
export function computeDiscount(coupon: CouponLike, subtotal: number): number {
  const raw =
    coupon.type === 'PERCENT'
      ? Math.floor((subtotal * Math.max(0, Math.min(100, coupon.value))) / 100)
      : coupon.value;
  return Math.max(0, Math.min(raw, subtotal));
}
