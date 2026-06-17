import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import {
  ApplyVendorDto,
  CreatePayoutDto,
  UpdateVendorStatusDto,
  VendorProductDto,
} from './dto/vendor.dto';

@Controller('vendors')
export class VendorController {
  constructor(private readonly vendors: VendorService) {}

  // ---------- Self-service (vendor user) ----------

  @Post('apply')
  apply(@Body() dto: ApplyVendorDto, @CurrentUser() me: AuthUser) {
    return this.vendors.apply(me.userId, dto);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.vendors.myVendor(user.userId);
  }

  @Get('me/dashboard')
  @RequirePermissions(PERMISSIONS.VENDOR_READ)
  dashboard(@CurrentUser() me: AuthUser) {
    return this.vendors.dashboard(me.userId);
  }

  @Post('me/products')
  @RequirePermissions(PERMISSIONS.VENDOR_WRITE)
  createProduct(@Body() dto: VendorProductDto, @CurrentUser() me: AuthUser) {
    return this.vendors.createProduct(me.userId, dto);
  }

  // ---------- Admin ----------

  @Get()
  @RequirePermissions(PERMISSIONS.VENDOR_ADMIN)
  list(@Query('status') status?: string) {
    return this.vendors.list(status);
  }

  @Put(':id/status')
  @RequirePermissions(PERMISSIONS.VENDOR_ADMIN)
  setStatus(@Param('id') id: string, @Body() dto: UpdateVendorStatusDto) {
    return this.vendors.setStatus(id, dto);
  }

  @Get(':id/products')
  @RequirePermissions(PERMISSIONS.VENDOR_READ)
  products(@Param('id') id: string) {
    return this.vendors.listProducts(id);
  }

  @Get(':id/payouts')
  @RequirePermissions(PERMISSIONS.VENDOR_READ)
  payouts(@Param('id') id: string) {
    return this.vendors.listPayouts(id);
  }

  @Post(':id/payouts')
  @RequirePermissions(PERMISSIONS.VENDOR_ADMIN)
  createPayout(@Param('id') id: string, @Body() dto: CreatePayoutDto) {
    return this.vendors.createPayout(id, dto);
  }

  @Put('payouts/:payoutId/paid')
  @RequirePermissions(PERMISSIONS.VENDOR_ADMIN)
  markPaid(@Param('payoutId') payoutId: string) {
    return this.vendors.markPayoutPaid(payoutId);
  }
}
