/**
 * ISO 4217 minor-unit exponents. Amounts are stored as integer minor units; the exponent
 * tells us how many decimal places a currency has (USD/INR=2, JPY=0, KWD/BHD=3).
 * Defaults to 2 for any currency not listed.
 */
const MINOR_UNITS: Record<string, number> = {
  JPY: 0,
  KRW: 0,
  VND: 0,
  CLP: 0,
  ISK: 0,
  XOF: 0,
  XAF: 0,
  KWD: 3,
  BHD: 3,
  OMR: 3,
  TND: 3,
  // 2-dp currencies fall through to the default
};

export function minorUnitExponent(currency: string): number {
  return MINOR_UNITS[currency.toUpperCase()] ?? 2;
}

/** Convert integer minor units to a major-unit number (e.g. 50000 INR paise -> 500.00). */
export function toMajor(amountMinor: number, currency: string): number {
  return amountMinor / 10 ** minorUnitExponent(currency);
}

/** Convert a major-unit number to integer minor units, rounded. */
export function toMinor(amountMajor: number, currency: string): number {
  return Math.round(amountMajor * 10 ** minorUnitExponent(currency));
}
