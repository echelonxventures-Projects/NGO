import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';

@Controller('donations')
export class DonationsController {
  constructor(private readonly donations: DonationsService) {}

  /** Admin/staff list of donations (tenant-scoped). */
  @RequirePermissions(PERMISSIONS.DONATION_READ)
  @Get()
  list() {
    return this.donations.list();
  }

  /** Public donation creation (a visitor donating on the public site). */
  @Public()
  @Post()
  create(
    @Body() dto: CreateDonationDto,
    @Headers('cf-ipcountry') cfCountry?: string,
    @Headers('x-country') xCountry?: string,
  ) {
    return this.donations.create(dto, cfCountry || xCountry);
  }

  // ---- Recurring donations (subscriptions) ----

  /** Public: start a recurring donation (mandate + first cycle). */
  @Public()
  @Post('subscriptions')
  createSubscription(
    @Body() dto: CreateSubscriptionDto,
    @Headers('cf-ipcountry') cfCountry?: string,
    @Headers('x-country') xCountry?: string,
  ) {
    return this.donations.createSubscription(dto, cfCountry || xCountry);
  }

  @RequirePermissions(PERMISSIONS.DONATION_READ)
  @Get('subscriptions')
  listSubscriptions() {
    return this.donations.listSubscriptions();
  }

  @RequirePermissions(PERMISSIONS.DONATION_READ)
  @Get('subscriptions/:id')
  getSubscription(@Param('id') id: string) {
    return this.donations.getSubscription(id);
  }

  @RequirePermissions(PERMISSIONS.DONATION_WRITE)
  @Post('subscriptions/:id/pause')
  pause(@Param('id') id: string) {
    return this.donations.pauseSubscription(id);
  }

  @RequirePermissions(PERMISSIONS.DONATION_WRITE)
  @Post('subscriptions/:id/resume')
  resume(@Param('id') id: string) {
    return this.donations.resumeSubscription(id);
  }

  @RequirePermissions(PERMISSIONS.DONATION_WRITE)
  @Post('subscriptions/:id/cancel')
  cancel(@Param('id') id: string) {
    return this.donations.cancelSubscription(id);
  }

  // ---- Donor history ----
  @RequirePermissions(PERMISSIONS.DONATION_READ)
  @Get('donors/:email/history')
  donorHistory(@Param('email') email: string) {
    return this.donations.donorHistory(email);
  }

  /**
   * Payment provider webhook. Public + tenant-agnostic: the donation (and its tenant) is
   * resolved by providerRef. The adapter verifies the signature; we never trust the body
   * alone. Excluded from tenant resolution middleware in AppModule.
   */
  @Public()
  @HttpCode(200)
  @Post('webhook')
  webhook(
    @Body() payload: Record<string, unknown>,
    @Headers('x-webhook-signature') signature?: string,
  ) {
    return this.donations.handleWebhook(payload, signature ?? '');
  }
}
