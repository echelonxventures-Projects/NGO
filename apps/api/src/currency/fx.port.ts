/** Capability port for exchange rates. Conversion code depends only on this. */
export const FX_RATE_PORT = Symbol('FX_RATE_PORT');

export interface FxRatePort {
  readonly name: string;
  /**
   * Returns the rate to convert 1 unit of `base` into `quote`, or null if unavailable.
   * Implementations may read seeded rates from the DB or fetch from a live free API.
   */
  getRate(base: string, quote: string): Promise<number | null>;
}
