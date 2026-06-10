import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { TenantContext } from '../tenancy/tenant-context';

/**
 * Models that are NOT tenant-scoped (global / platform-level). All other models are
 * automatically constrained to the active tenantId by the extension below.
 */
const GLOBAL_MODELS = new Set<string>(['Permission']);

/**
 * Models the resolver uses to look up a tenant *before* a tenant context exists.
 * These are queried in bypass mode by TenantService.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  private scopedClient?: ReturnType<PrismaService['buildScoped']>;

  constructor(private readonly tenantContext: TenantContext) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Returns a tenant-scoped client. The extension:
   *  - injects `tenantId` into where-clauses for reads/updates/deletes,
   *  - sets `tenantId` on creates,
   * unless the model is global or the context is in bypass mode.
   *
   * Feature services should use `this.prisma.scoped()` for tenant-owned models.
   */
  scoped() {
    if (!this.scopedClient) {
      this.scopedClient = this.buildScoped();
    }
    return this.scopedClient;
  }

  private buildScoped() {
    const tenantContext = this.tenantContext;
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const store = tenantContext.get();
            const isGlobal = model ? GLOBAL_MODELS.has(model) : true;

            if (!store || store.bypass || isGlobal) {
              return query(args);
            }

            const tenantId = store.tenantId;
            const a = args as Record<string, unknown>;

            switch (operation) {
              case 'findUnique':
              case 'findUniqueOrThrow':
              case 'findFirst':
              case 'findFirstOrThrow':
              case 'findMany':
              case 'count':
              case 'aggregate':
              case 'updateMany':
              case 'deleteMany': {
                a.where = { ...(a.where as object), tenantId };
                break;
              }
              case 'update':
              case 'delete':
              case 'upsert': {
                a.where = { ...(a.where as object), tenantId };
                if (operation === 'upsert' && a.create) {
                  a.create = { ...(a.create as object), tenantId };
                }
                break;
              }
              case 'create': {
                a.data = { ...(a.data as object), tenantId };
                break;
              }
              case 'createMany': {
                const data = (a.data as Record<string, unknown>[]) ?? [];
                a.data = Array.isArray(data)
                  ? data.map((d) => ({ ...d, tenantId }))
                  : { ...(data as object), tenantId };
                break;
              }
              default:
                break;
            }

            return query(a as typeof args);
          },
        },
      },
    });
  }
}
