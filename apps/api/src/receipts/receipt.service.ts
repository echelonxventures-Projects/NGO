import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { toMajor } from '../currency/minor-units';
import { renderTemplate } from '../certificates/template-render';

const RECEIPT_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt {{number}}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;color:#222;padding:40px;}
.box{max-width:680px;margin:0 auto;border:1px solid #ccc;padding:32px 40px;}
h1{font-size:22px;margin:0 0 2px;}.muted{color:#666;}
table{width:100%;border-collapse:collapse;margin:18px 0;}td,th{border:1px solid #ddd;padding:8px;text-align:left;font-size:14px;}
.amt{font-size:20px;font-weight:bold;color:#1B5E20;}.foot{font-size:12px;color:#666;margin-top:16px;}</style></head>
<body><div class="box">
<h1>{{orgLegalName}}</h1><div class="muted">{{orgAddress}} · PAN: {{orgPan}}</div>
<h2>Donation Receipt</h2>
<table>
<tr><th>Receipt No.</th><td>{{number}}</td><th>Date</th><td>{{issueDate}}</td></tr>
<tr><th>Donor</th><td>{{donorName}}</td><th>Email</th><td>{{donorEmail}}</td></tr>
<tr><th>Amount</th><td class="amt">{{currency}} {{amountMajor}}</td><th>80G Eligible</th><td>{{eligible}}</td></tr>
</table>
<div class="foot">80G Reg: {{reg80GNumber}} (dated {{reg80GDate}}). This is a computer-generated receipt.</div>
</div></body></html>`;

@Injectable()
export class ReceiptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  list() {
    return this.prisma.scoped().receipt.findMany({ orderBy: { issuedAt: 'desc' } });
  }

  /**
   * Creates a Receipt record for a SUCCEEDED donation, snapshotting the tenant's legal/80G
   * data so it stays valid even if config changes later. Idempotent: returns the existing
   * receipt if one was already issued for the donation.
   */
  async generateForDonation(donationId: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const existing = await this.prisma.scoped().receipt.findFirst({ where: { donationId } });
    if (existing) return existing;

    const donation = await this.prisma.scoped().donation.findFirst({
      where: { id: donationId },
      include: { donor: true },
    });
    if (!donation) throw new NotFoundException('Donation not found');
    if (donation.status !== 'SUCCEEDED') {
      throw new BadRequestException('Receipt can only be issued for a successful donation');
    }

    const config = await this.prisma.tenantConfig.findUnique({ where: { tenantId } });
    const legal = (config?.legal ?? {}) as Record<string, string>;
    const number = donation.receiptNumber ?? `RCPT-${donation.id.slice(-8).toUpperCase()}`;

    return this.prisma.scoped().receipt.create({
      data: {
        tenantId,
        donationId: donation.id,
        number,
        amount: donation.amount,
        currency: donation.currency,
        donorName: donation.donor?.name ?? null,
        donorEmail: donation.donor?.email ?? null,
        orgLegalName: legal.legalName ?? null,
        orgAddress: legal.address ?? null,
        orgPan: legal.pan ?? null,
        reg80GNumber: legal.reg80GNumber ?? null,
        reg80GDate: legal.reg80GDate ?? null,
        is80GEligible: Boolean(legal.reg80GNumber),
      },
    });
  }

  async getHtml(number: string): Promise<string> {
    const receipt = await this.prisma.scoped().receipt.findFirst({ where: { number } });
    if (!receipt) throw new NotFoundException('Receipt not found');
    return renderTemplate(RECEIPT_HTML, {
      number: receipt.number,
      issueDate: receipt.issuedAt.toISOString().slice(0, 10),
      donorName: receipt.donorName ?? '',
      donorEmail: receipt.donorEmail ?? '',
      currency: receipt.currency,
      amountMajor: toMajor(receipt.amount, receipt.currency).toFixed(2),
      eligible: receipt.is80GEligible ? 'Yes (Section 80G)' : 'No',
      orgLegalName: receipt.orgLegalName ?? '',
      orgAddress: receipt.orgAddress ?? '',
      orgPan: receipt.orgPan ?? '',
      reg80GNumber: receipt.reg80GNumber ?? '',
      reg80GDate: receipt.reg80GDate ?? '',
    });
  }
}
