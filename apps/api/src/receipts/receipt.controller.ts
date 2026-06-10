import { Controller, Get, Header, Param, Post } from '@nestjs/common';
import { ReceiptService } from './receipt.service';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';

// Receipts contain donor PII, so all endpoints are permissioned (no public access).
@Controller('receipts')
export class ReceiptController {
  constructor(private readonly receipts: ReceiptService) {}

  @RequirePermissions(PERMISSIONS.DONATION_READ)
  @Get()
  list() {
    return this.receipts.list();
  }

  @RequirePermissions(PERMISSIONS.DONATION_WRITE)
  @Post('generate/:donationId')
  generate(@Param('donationId') donationId: string) {
    return this.receipts.generateForDonation(donationId);
  }

  @RequirePermissions(PERMISSIONS.DONATION_READ)
  @Get('download/:number')
  @Header('Content-Type', 'text/html; charset=utf-8')
  download(@Param('number') number: string) {
    return this.receipts.getHtml(number);
  }
}
