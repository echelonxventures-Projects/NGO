import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { DomainService } from './domain.service';
import { AddDomainDto, VerifyDomainDto } from './dto/domain.dto';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';

// Domain management is a tenant-admin concern.
@Controller('domains')
export class DomainController {
  constructor(private readonly domains: DomainService) {}

  @RequirePermissions(PERMISSIONS.TENANT_ADMIN)
  @Get()
  list() {
    return this.domains.list();
  }

  @RequirePermissions(PERMISSIONS.TENANT_ADMIN)
  @Post()
  add(@Body() dto: AddDomainDto) {
    return this.domains.add(dto.hostname);
  }

  @RequirePermissions(PERMISSIONS.TENANT_ADMIN)
  @Post(':id/verify')
  verify(@Param('id') id: string, @Body() dto: VerifyDomainDto) {
    return this.domains.verify(id, dto.token);
  }

  @RequirePermissions(PERMISSIONS.TENANT_ADMIN)
  @Post(':id/primary')
  setPrimary(@Param('id') id: string) {
    return this.domains.setPrimary(id);
  }

  @RequirePermissions(PERMISSIONS.TENANT_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.domains.remove(id);
  }
}
