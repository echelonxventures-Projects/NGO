import { Injectable, Logger } from '@nestjs/common';
import { FxRatePort } from './fx.port';

/**
 * Optional live FX source using frankfurter.app (free, no API key, ECB rates).
 * Selected when FX_PROVIDER=frankfurter. Falls back to null on any failure so callers can
 * degrade gracefully to seeded rates.
 */
@Injectable()
export class FrankfurterFxAdapter implements FxRatePort {
  readonly name = 'frankfurter';
  private readonly logger = new Logger(FrankfurterFxAdapter.name);
  private readonly baseUrl = 'https://api.frankfurter.app';

  async getRate(base: string, quote: string): Promise<number | null> {
    const b = base.toUpperCase();
    const q = quote.toUpperCase();
    if (b === q) return 1;
    try {
      const res = await fetch(`${this.baseUrl}/latest?from=${b}&to=${q}`);
      if (!res.ok) return null;
      const data = (await res.json()) as { rates?: Record<string, number> };
      return data.rates?.[q] ?? null;
    } catch (e) {
      this.logger.warn(`FX fetch failed for ${b}->${q}: ${(e as Error).message}`);
      return null;
    }
  }
}
