import { Body, Controller, Delete, Get, Headers, Param, Post, Put } from '@nestjs/common';
import { TaxService } from './tax.service';
import { CreateTaxRuleDto, UpdateTaxRuleDto, ComputeTaxDto } from './dto/tax.dto';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';

@Controller('tax')
export class TaxController {
  constructor(private readonly tax: TaxService) {}

  /**
   * Public: compute tax for an amount with region auto-detection.
   * Region precedence: body country/region > geo header (cf-ipcountry / x-country) > tenant default.
   */
  @Public()
  @Post('compute')
  compute(
    @Body() dto: ComputeTaxDto,
    @Headers('cf-ipcountry') cfCountry?: string,
    @Headers('x-country') xCountry?: string,
  ) {
    return this.tax.compute({
      amount: dto.amount,
      country: dto.country,
      region: dto.region,
      category: dto.category,
      geoCountry: cfCountry || xCountry,
    });
  }

  @RequirePermissions(PERMISSIONS.TENANT_ADMIN)
  @Get('rules')
  list() {
    return this.tax.listRules();
  }

  @RequirePermissions(PERMISSIONS.TENANT_ADMIN)
  @Post('rules')
  create(@Body() dto: CreateTaxRuleDto) {
    return this.tax.createRule(dto);
  }

  @RequirePermissions(PERMISSIONS.TENANT_ADMIN)
  @Put('rules/:id')
  update(@Param('id') id: string, @Body() dto: UpdateTaxRuleDto) {
    return this.tax.updateRule(id, dto);
  }

  @RequirePermissions(PERMISSIONS.TENANT_ADMIN)
  @Delete('rules/:id')
  remove(@Param('id') id: string) {
    return this.tax.deleteRule(id);
  }
}
