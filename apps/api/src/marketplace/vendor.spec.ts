import { splitCommission } from './vendor.service';

describe('splitCommission', () => {
  it('splits gross sales by commission basis points (15%)', () => {
    expect(splitCommission(100000, 1500)).toEqual({ commission: 15000, net: 85000 });
  });

  it('floors fractional commission to whole minor units', () => {
    // 12345 * 1500 / 10000 = 1851.75 -> 1851
    expect(splitCommission(12345, 1500)).toEqual({ commission: 1851, net: 12345 - 1851 });
  });

  it('handles 0% commission and 0 sales', () => {
    expect(splitCommission(5000, 0)).toEqual({ commission: 0, net: 5000 });
    expect(splitCommission(0, 1500)).toEqual({ commission: 0, net: 0 });
  });
});
