import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FxRatePort } from './fx.port';

/**
 * Default, offline-capable FX source. Reads per-tenant rates from the FxRate table.
 * Resolves a rate by: identity (base==quote -> 1), direct row, inverse row (1/rate).
 * Tenant scoping is automatic via the scoped client.
 */
@Injectable()
export class SeededFxAdapter implements FxRatePort {
  readonly name = 'seeded';

  constructor(private readonly prisma: PrismaService) {}

  async getRate(base: string, quote: string): Promise<number | null> {
    const b = base.toUpperCase();
    const q = quote.toUpperCase();
    if (b === q) return 1;

    const direct = await this.prisma.scoped().fxRate.findFirst({
      where: { base: b, quote: q },
    });
    if (direct) return direct.rate;

    const inverse = await this.prisma.scoped().fxRate.findFirst({
      where: { base: q, quote: b },
    });
    if (inverse && inverse.rate !== 0) return 1 / inverse.rate;

    return null;
  }
}
