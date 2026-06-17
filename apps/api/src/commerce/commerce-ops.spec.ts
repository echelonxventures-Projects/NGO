import { formatInvoiceNumber } from './commerce-ops.service';

describe('formatInvoiceNumber', () => {
  it('zero-pads to six digits with default prefix', () => {
    expect(formatInvoiceNumber(1)).toBe('INV-000001');
    expect(formatInvoiceNumber(42)).toBe('INV-000042');
    expect(formatInvoiceNumber(123456)).toBe('INV-123456');
  });

  it('supports a custom prefix and does not truncate large sequences', () => {
    expect(formatInvoiceNumber(7, 'VF')).toBe('VF-000007');
    expect(formatInvoiceNumber(1234567)).toBe('INV-1234567');
  });
});
