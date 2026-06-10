import { Global, Module } from '@nestjs/common';
import { TenantContext } from './tenant-context';
import { TenantService } from './tenant.service';
import { TenantResolutionMiddleware } from './tenant-resolution.middleware';
import { TenantIsolationGuard } from './tenant-isolation.guard';

@Global()
@Module({
  providers: [TenantContext, TenantService, TenantResolutionMiddleware, TenantIsolationGuard],
  exports: [TenantContext, TenantService, TenantResolutionMiddleware, TenantIsolationGuard],
})
export class TenancyModule {}
