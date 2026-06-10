import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CurrencyService } from './currency.service';

describe('CurrencyService.convert', () => {
  const tenantContext = { requireTenantId: jest.fn().mockReturnValue('t1') } as any;
  const prisma = { tenantConfig: { findUnique: jest.fn() } } as any;

  function service(rate: number | null) {
    const fx = { getRate: jest.fn().mockResolvedValue(rate) } as any;
    return { svc: new CurrencyService(prisma, tenantContext, fx), fx };
  }

  it('converts across differing minor-unit exponents (INR 2dp -> JPY 0dp)', async () => {
    // 50000 paise = 500.00 INR; at rate 1.8 -> 900 JPY (0 decimals) = 900 minor units
    const { svc, fx } = service(1.8);
    const result = await svc.convert(50000, 'inr', 'jpy');

    expect(fx.getRate).toHaveBeenCalledWith('INR', 'JPY');
    expect(result).toEqual({
      from: 'INR',
      to: 'JPY',
      rate: 1.8,
      amount: 50000,
      converted: 900,
    });
  });

  it('uppercases the currency codes in the result', async () => {
    const { svc } = service(1);
    const result = await svc.convert(100, 'usd', 'eur');
    expect(result.from).toBe('USD');
    expect(result.to).toBe('EUR');
  });

  it('rejects negative amounts', async () => {
    const { svc } = service(1);
    await expect(svc.convert(-1, 'INR', 'USD')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects non-integer (fractional minor unit) amounts', async () => {
    const { svc } = service(1);
    await expect(svc.convert(1.5, 'INR', 'USD')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFound when no FX rate is available', async () => {
    const { svc } = service(null);
    await expect(svc.convert(100, 'INR', 'XXX')).rejects.toBeInstanceOf(NotFoundException);
  });
});
