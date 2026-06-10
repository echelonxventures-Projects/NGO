import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { FX_RATE_PORT, FxRatePort } from './fx.port';
import { minorUnitExponent, toMajor, toMinor } from './minor-units';

export interface ConversionResult {
  from: string;
  to: string;
  rate: number;
  amount: number; // minor units in `from`
  converted: number; // minor units in `to`
}

@Injectable()
export class CurrencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    @Inject(FX_RATE_PORT) private readonly fx: FxRatePort,
  ) {}

  /** Currencies this tenant accepts, plus its base currency. */
  async listEnabled(): Promise<{ baseCurrency: string; enabledCurrencies: string[] }> {
    const tenantId = this.tenantContext.requireTenantId();
    const config = await this.prisma.tenantConfig.findUnique({ where: { tenantId } });
    return {
      baseCurrency: config?.baseCurrency ?? 'INR',
      enabledCurrencies: config?.enabledCurrencies ?? ['INR'],
    };
  }

  async baseCurrency(): Promise<string> {
    return (await this.listEnabled()).baseCurrency;
  }

  /**
   * Converts an integer minor-unit amount from one currency to another, correctly handling
   * differing minor-unit exponents (e.g. INR 2dp -> JPY 0dp).
   */
  async convert(amountMinor: number, from: string, to: string): Promise<ConversionResult> {
    if (!Number.isInteger(amountMinor) || amountMinor < 0) {
      throw new BadRequestException('amount must be a non-negative integer (minor units)');
    }
    const f = from.toUpperCase();
    const t = to.toUpperCase();

    const rate = await this.fx.getRate(f, t);
    if (rate == null) {
      throw new NotFoundException(`No FX rate available for ${f} -> ${t}`);
    }

    const major = toMajor(amountMinor, f);
    const convertedMinor = toMinor(major * rate, t);
    return { from: f, to: t, rate, amount: amountMinor, converted: convertedMinor };
  }

  /** Convenience: convert a transaction amount into the tenant base currency. */
  async toBase(amountMinor: number, from: string): Promise<ConversionResult> {
    return this.convert(amountMinor, from, await this.baseCurrency());
  }

  exponent(currency: string): number {
    return minorUnitExponent(currency);
  }
}
