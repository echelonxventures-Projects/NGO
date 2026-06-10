import { TaxService } from './tax.service';

describe('TaxService', () => {
  const tenantContext = { requireTenantId: jest.fn().mockReturnValue('t1') } as any;

  function build(opts: {
    inclusive?: boolean;
    rules?: any[];
    defaultCountry?: string;
    defaultRegion?: string | null;
  }) {
    const taxRule = { findMany: jest.fn().mockResolvedValue(opts.rules ?? []) };
    const prisma = {
      tenantConfig: {
        findUnique: jest.fn().mockResolvedValue({
          taxInclusive: opts.inclusive ?? false,
          defaultCountry: opts.defaultCountry ?? 'IN',
          defaultRegion: opts.defaultRegion ?? null,
        }),
      },
      scoped: jest.fn().mockReturnValue({ taxRule }),
    } as any;
    return { svc: new TaxService(prisma, tenantContext), taxRule };
  }

  describe('compute (tax-exclusive)', () => {
    it('adds tax on top of the net amount', async () => {
      const { svc } = build({
        inclusive: false,
        rules: [{ name: 'GST', region: null, category: null, priority: 0, ratePct: 18 }],
      });
      const r = await svc.compute({ amount: 10000, country: 'IN' });
      expect(r.netAmount).toBe(10000);
      expect(r.taxAmount).toBe(1800);
      expect(r.grossAmount).toBe(11800);
      expect(r.ratePct).toBe(18);
      expect(r.breakdown).toEqual([{ name: 'GST', ratePct: 18, amount: 1800 }]);
    });

    it('returns zero tax when no rule matches', async () => {
      const { svc } = build({ inclusive: false, rules: [] });
      const r = await svc.compute({ amount: 10000, country: 'IN' });
      expect(r.ratePct).toBe(0);
      expect(r.taxAmount).toBe(0);
      expect(r.grossAmount).toBe(10000);
      expect(r.breakdown).toEqual([]);
    });
  });

  describe('compute (tax-inclusive)', () => {
    it('extracts the tax portion from a gross amount', async () => {
      const { svc } = build({
        inclusive: true,
        rules: [{ name: 'GST', region: null, category: null, priority: 0, ratePct: 18 }],
      });
      const r = await svc.compute({ amount: 11800, country: 'IN' });
      expect(r.grossAmount).toBe(11800);
      expect(r.netAmount).toBe(10000);
      expect(r.taxAmount).toBe(1800);
      expect(r.inclusive).toBe(true);
    });
  });

  describe('bestRule scoring', () => {
    it('prefers a region+category match over wildcards', async () => {
      const { svc } = build({
        inclusive: false,
        rules: [
          { name: 'Country wildcard', region: null, category: null, priority: 0, ratePct: 5 },
          { name: 'Region+Category', region: 'KA', category: 'goods', priority: 0, ratePct: 12 },
          { name: 'Region only', region: 'KA', category: null, priority: 0, ratePct: 8 },
        ],
      });
      const r = await svc.compute({ amount: 10000, country: 'IN', region: 'KA', category: 'goods' });
      expect(r.ratePct).toBe(12);
    });

    it('breaks ties by priority', async () => {
      const { svc } = build({
        inclusive: false,
        rules: [
          { name: 'Low priority', region: null, category: null, priority: 1, ratePct: 5 },
          { name: 'High priority', region: null, category: null, priority: 9, ratePct: 7 },
        ],
      });
      const r = await svc.compute({ amount: 10000, country: 'IN' });
      expect(r.ratePct).toBe(7);
    });
  });

  describe('resolveRegion precedence', () => {
    it('prefers explicit address country', async () => {
      const { svc } = build({ defaultCountry: 'IN' });
      const r = await svc.resolveRegion({ country: 'us', region: 'CA', geoCountry: 'gb' });
      expect(r).toEqual({ country: 'US', region: 'CA', source: 'address' });
    });

    it('falls back to geo header when no address', async () => {
      const { svc } = build({ defaultCountry: 'IN' });
      const r = await svc.resolveRegion({ geoCountry: 'gb' });
      expect(r).toEqual({ country: 'GB', region: null, source: 'geo' });
    });

    it('falls back to the tenant default', async () => {
      const { svc } = build({ defaultCountry: 'in', defaultRegion: 'KA' });
      const r = await svc.resolveRegion({});
      expect(r).toEqual({ country: 'IN', region: 'KA', source: 'tenant-default' });
    });
  });
});
