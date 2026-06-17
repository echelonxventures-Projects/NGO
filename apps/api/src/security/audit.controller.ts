import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @RequirePermissions(PERMISSIONS.TENANT_ADMIN)
  @Get()
  list(@CurrentUser() me: AuthUser, @Query('limit') limit?: string) {
    return this.audit.list(me.tenantId, limit ? parseInt(limit, 10) : 100);
  }
}
