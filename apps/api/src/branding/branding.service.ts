import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { UpdateBrandingDto } from './dto/update-branding.dto';

/**
 * Serves and updates per-tenant branding + config. This is the backbone of the
 * "nothing hardcoded" requirement: any frontend themes itself from this data.
 */
@Injectable()
export class BrandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  /** Public theming payload consumed by web/mobile clients. */
  async getPublicBranding() {
    const tenantId = this.tenantContext.requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { branding: true, config: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return {
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
      branding: tenant.branding ?? {},
      config: {
        features: tenant.config?.features ?? {},
        menus: tenant.config?.menus ?? {},
        defaultLocale: tenant.config?.defaultLocale ?? 'en',
      },
    };
  }

  async updateBranding(dto: UpdateBrandingDto) {
    const tenantId = this.tenantContext.requireTenantId();
    // class-validator DTO uses Record types; Prisma JSON fields expect InputJsonValue.
    const data = dto as Prisma.TenantBrandingUncheckedUpdateInput;
    return this.prisma.tenantBranding.upsert({
      where: { tenantId },
      create: { ...(dto as Prisma.TenantBrandingUncheckedCreateInput), tenantId },
      update: data,
    });
  }
}
