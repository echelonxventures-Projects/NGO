import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CertificateService } from './certificate.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  IssueCertificateDto,
} from './dto/certificate.dto';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';

@Controller('certificates')
export class CertificateController {
  constructor(private readonly certificates: CertificateService) {}

  // ---- Templates (admin) ----
  @RequirePermissions(PERMISSIONS.TENANT_ADMIN)
  @Get('templates')
  listTemplates() {
    return this.certificates.listTemplates();
  }

  @RequirePermissions(PERMISSIONS.TENANT_ADMIN)
  @Post('templates')
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.certificates.createTemplate(dto);
  }

  @RequirePermissions(PERMISSIONS.TENANT_ADMIN)
  @Put('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.certificates.updateTemplate(id, dto);
  }

  @RequirePermissions(PERMISSIONS.TENANT_ADMIN)
  @Post('templates/ensure-80g')
  ensure80G() {
    return this.certificates.ensureDefault80G();
  }

  // ---- Issuance (staff) ----
  @RequirePermissions(PERMISSIONS.DONATION_WRITE)
  @Post('issue')
  issue(@Body() dto: IssueCertificateDto) {
    return this.certificates.issue(dto);
  }

  @RequirePermissions(PERMISSIONS.DONATION_WRITE)
  @Post('issue/80g/:donationId')
  issue80G(@Param('donationId') donationId: string) {
    return this.certificates.issue80GForDonation(donationId);
  }

  // ---- Public verify + download ----
  /** Public verification by code (tenant-scoped via host resolution). */
  @Public()
  @Get('verify/:code')
  verify(@Param('code') code: string) {
    return this.certificates.verify(code);
  }

  /** Public print-ready HTML download (open in browser, print to PDF). */
  @Public()
  @Get('download/:code')
  @Header('Content-Type', 'text/html; charset=utf-8')
  download(@Param('code') code: string) {
    return this.certificates.getHtml(code);
  }
}
