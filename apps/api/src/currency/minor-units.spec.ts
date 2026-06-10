import { minorUnitExponent, toMajor, toMinor } from './minor-units';

describe('minor-units', () => {
  describe('minorUnitExponent', () => {
    it('defaults to 2 decimal places for common currencies', () => {
      expect(minorUnitExponent('INR')).toBe(2);
      expect(minorUnitExponent('USD')).toBe(2);
      expect(minorUnitExponent('EUR')).toBe(2);
    });

    it('returns 0 for zero-decimal currencies', () => {
      expect(minorUnitExponent('JPY')).toBe(0);
      expect(minorUnitExponent('KRW')).toBe(0);
      expect(minorUnitExponent('VND')).toBe(0);
    });

    it('returns 3 for three-decimal currencies', () => {
      expect(minorUnitExponent('KWD')).toBe(3);
      expect(minorUnitExponent('BHD')).toBe(3);
      expect(minorUnitExponent('OMR')).toBe(3);
    });

    it('is case-insensitive', () => {
      expect(minorUnitExponent('jpy')).toBe(0);
      expect(minorUnitExponent('kwd')).toBe(3);
    });

    it('falls back to 2 for unknown currencies', () => {
      expect(minorUnitExponent('ZZZ')).toBe(2);
    });
  });

  describe('toMajor', () => {
    it('converts paise to rupees', () => {
      expect(toMajor(50000, 'INR')).toBe(500);
    });

    it('treats zero-decimal currencies as 1:1', () => {
      expect(toMajor(900, 'JPY')).toBe(900);
    });

    it('handles three-decimal currencies', () => {
      expect(toMajor(1500, 'KWD')).toBe(1.5);
    });
  });

  describe('toMinor', () => {
    it('converts rupees to paise', () => {
      expect(toMinor(500, 'INR')).toBe(50000);
    });

    it('rounds to the nearest minor unit', () => {
      expect(toMinor(10.005, 'USD')).toBe(1001);
      expect(toMinor(10.004, 'USD')).toBe(1000);
    });

    it('round-trips through toMajor for 2dp currencies', () => {
      expect(toMinor(toMajor(12345, 'INR'), 'INR')).toBe(12345);
    });
  });
});
