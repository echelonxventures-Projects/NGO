import { Body, Controller, Get, Put } from '@nestjs/common';
import { BrandingService } from './branding.service';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';

@Controller('branding')
export class BrandingController {
  constructor(private readonly branding: BrandingService) {}

  /** Public: any frontend reads this to theme itself (no-hardcode). */
  @Public()
  @Get()
  getPublic() {
    return this.branding.getPublicBranding();
  }

  @RequirePermissions(PERMISSIONS.BRANDING_WRITE)
  @Put()
  update(@Body() dto: UpdateBrandingDto) {
    return this.branding.updateBranding(dto);
  }
}
