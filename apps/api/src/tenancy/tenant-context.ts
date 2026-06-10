import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantStore {
  tenantId: string;
  slug: string;
  /** When true, isolation/injection is bypassed (platform-level operations, seeds). */
  bypass?: boolean;
}

/**
 * Request-scoped tenant context backed by AsyncLocalStorage so the active tenantId is
 * available anywhere in the call chain (services, Prisma extension) without threading it
 * through every function signature.
 */
@Injectable()
export class TenantContext {
  private readonly als = new AsyncLocalStorage<TenantStore>();

  run<T>(store: TenantStore, fn: () => T): T {
    return this.als.run(store, fn);
  }

  get(): TenantStore | undefined {
    return this.als.getStore();
  }

  /** Returns the active tenantId or throws — use where a tenant is mandatory. */
  requireTenantId(): string {
    const store = this.als.getStore();
    if (!store?.tenantId) {
      throw new Error('No tenant in context. A tenant-scoped operation ran without context.');
    }
    return store.tenantId;
  }

  isBypassed(): boolean {
    return this.als.getStore()?.bypass === true;
  }
}
