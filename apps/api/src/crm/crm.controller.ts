import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CrmService } from './crm.service';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import {
  AddActivityDto,
  CreateCampaignDto,
  CreateContactDto,
  CreateSponsorshipDto,
} from './dto/crm.dto';

@Controller()
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  // ---------- Contacts ----------

  @RequirePermissions(PERMISSIONS.CRM_WRITE)
  @Post('contacts')
  createContact(@Body() dto: CreateContactDto, @CurrentUser() me: AuthUser) {
    return this.crm.createContact(dto, me.userId);
  }

  @RequirePermissions(PERMISSIONS.CRM_READ)
  @Get('contacts')
  contacts(@Query('type') type?: string) {
    return this.crm.listContacts(type);
  }

  @RequirePermissions(PERMISSIONS.CRM_READ)
  @Get('contacts/:id')
  contact(@Param('id') id: string) {
    return this.crm.getContact(id);
  }

  @RequirePermissions(PERMISSIONS.CRM_WRITE)
  @Post('contacts/:id/activities')
  addActivity(@Param('id') id: string, @Body() dto: AddActivityDto) {
    return this.crm.addActivity(id, dto);
  }

  // ---------- Campaigns (public read for fundraising pages) ----------

  @Public()
  @Get('campaigns')
  campaigns() {
    return this.crm.listCampaigns();
  }

  @RequirePermissions(PERMISSIONS.DONATION_WRITE)
  @Post('campaigns')
  createCampaign(@Body() dto: CreateCampaignDto) {
    return this.crm.createCampaign(dto);
  }

  @Public()
  @Get('campaigns/:slug/progress')
  campaignProgress(@Param('slug') slug: string) {
    return this.crm.refreshCampaign(slug);
  }

  // ---------- Sponsorships ----------

  @Public()
  @Post('sponsorships')
  createSponsorship(@Body() dto: CreateSponsorshipDto) {
    return this.crm.createSponsorship(dto);
  }

  @RequirePermissions(PERMISSIONS.DONATION_READ)
  @Get('sponsorships')
  sponsorships(@Query('type') type?: string) {
    return this.crm.listSponsorships(type);
  }

  @RequirePermissions(PERMISSIONS.DONATION_WRITE)
  @Put('sponsorships/:id/status')
  setStatus(@Param('id') id: string, @Body() body: { status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' }) {
    return this.crm.setSponsorshipStatus(id, body.status);
  }
}
