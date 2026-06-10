import { TenantContext } from './tenant-context';

describe('TenantContext', () => {
  it('exposes the active store inside run()', () => {
    const tc = new TenantContext();
    const seen = tc.run({ tenantId: 't1', slug: 'acme' }, () => tc.get());
    expect(seen).toEqual({ tenantId: 't1', slug: 'acme' });
  });

  it('returns undefined outside of run()', () => {
    const tc = new TenantContext();
    expect(tc.get()).toBeUndefined();
  });

  it('requireTenantId returns the active tenant', () => {
    const tc = new TenantContext();
    expect(tc.run({ tenantId: 't1', slug: 'acme' }, () => tc.requireTenantId())).toBe('t1');
  });

  it('requireTenantId throws when there is no context', () => {
    const tc = new TenantContext();
    expect(() => tc.requireTenantId()).toThrow(/No tenant in context/);
  });

  it('reports bypass mode', () => {
    const tc = new TenantContext();
    expect(tc.run({ tenantId: 't1', slug: 'acme', bypass: true }, () => tc.isBypassed())).toBe(true);
    expect(tc.run({ tenantId: 't1', slug: 'acme' }, () => tc.isBypassed())).toBe(false);
    expect(tc.isBypassed()).toBe(false);
  });

  it('isolates nested contexts', () => {
    const tc = new TenantContext();
    const outer = tc.run({ tenantId: 'outer', slug: 'o' }, () => {
      const inner = tc.run({ tenantId: 'inner', slug: 'i' }, () => tc.requireTenantId());
      return { inner, afterInner: tc.requireTenantId() };
    });
    expect(outer).toEqual({ inner: 'inner', afterInner: 'outer' });
  });
});
