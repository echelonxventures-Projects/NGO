import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { PAYMENT_PORT, PaymentPort } from '../providers/payment/payment.port';
import { CurrencyService } from '../currency/currency.service';
import { TaxService } from '../tax/tax.service';
import { ReceiptService } from '../receipts/receipt.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

/**
 * Donations. Creates a donation record (with tax computed via region auto-detection and an
 * FX snapshot into the tenant base currency), opens a payment intent via the configured
 * payment adapter, and marks it succeeded with a receipt number when the adapter settles
 * synchronously. Real providers settle asynchronously via the webhook → handleWebhook.
 */
@Injectable()
export class DonationsService {
  private readonly logger = new Logger(DonationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    private readonly currency: CurrencyService,
    private readonly tax: TaxService,
    private readonly receipts: ReceiptService,
    @Inject(PAYMENT_PORT) private readonly payment: PaymentPort,
  ) {}

  /** Best-effort Receipt record creation; never blocks the donation flow. */
  private async issueReceipt(donationId: string): Promise<void> {
    try {
      await this.receipts.generateForDonation(donationId);
    } catch (e) {
      this.logger.warn(`Receipt generation skipped for ${donationId}: ${(e as Error).message}`);
    }
  }

  list() {
    return this.prisma.scoped().donation.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(dto: CreateDonationDto, geoCountry?: string) {
    const tenantId = this.tenantContext.requireTenantId();
    const currency = (dto.currency ?? 'INR').toUpperCase();

    const donor = dto.donorEmail
      ? await this.prisma.scoped().donor.upsert({
          where: { tenantId_email: { tenantId, email: dto.donorEmail.toLowerCase() } },
          create: { tenantId, email: dto.donorEmail.toLowerCase(), name: dto.donorName },
          update: { name: dto.donorName },
        })
      : null;

    // Tax (region auto-detected) + FX snapshot, shared with subscription cycles.
    const fin = await this.financialSnapshot(dto.amount, currency, {
      country: dto.country,
      region: dto.region,
      category: dto.category,
      geoCountry,
    });

    const donation = await this.prisma.scoped().donation.create({
      data: {
        tenantId,
        donorId: donor?.id,
        amount: dto.amount,
        currency,
        type: dto.type ?? 'ONE_TIME',
        campaign: dto.campaign,
        provider: this.payment.name,
        status: 'PENDING',
        taxCountry: fin.tax.country,
        taxRegion: fin.tax.region,
        taxRatePct: fin.tax.ratePct,
        taxAmount: fin.tax.taxAmount,
        taxBreakdown: fin.tax.breakdown,
        baseCurrency: fin.baseCurrency,
        fxRate: fin.fxRate,
        baseAmount: fin.baseAmount,
      },
    });

    const intent = await this.payment.createIntent({
      amount: donation.amount,
      currency: donation.currency,
      reference: donation.id,
      metadata: { tenantId },
    });

    const updated = await this.prisma.scoped().donation.update({
      where: { id: donation.id },
      data: {
        providerRef: intent.providerRef,
        status: intent.status === 'succeeded' ? 'SUCCEEDED' : 'PENDING',
        receiptNumber:
          intent.status === 'succeeded' ? this.receiptNumber(donation.id) : undefined,
      },
    });

    if (updated.status === 'SUCCEEDED') await this.issueReceipt(updated.id);
    return { donation: updated, payment: intent, tax: fin.tax };
  }

  /** Shared tax (region auto-detect) + FX snapshot used by donations and subscription cycles. */
  private async financialSnapshot(
    amount: number,
    currency: string,
    opts: { country?: string; region?: string; category?: string; geoCountry?: string },
  ) {
    const tax = await this.tax.compute({ amount, ...opts });
    let baseCurrency: string | null = null;
    let fxRate: number | null = null;
    let baseAmount: number | null = null;
    try {
      const fx = await this.currency.toBase(amount, currency);
      baseCurrency = fx.to;
      fxRate = fx.rate;
      baseAmount = fx.converted;
    } catch (e) {
      this.logger.warn(`FX snapshot skipped for ${currency}: ${(e as Error).message}`);
    }
    return { tax, baseCurrency, fxRate, baseAmount };
  }

  private receiptNumber(donationId: string): string {
    return `RCPT-${donationId.slice(-8).toUpperCase()}`;
  }

  /**
   * Confirms a donation from a provider webhook. Webhooks have NO tenant context (the call
   * comes from the provider), so we resolve the donation globally by providerRef using the
   * unscoped client and derive the tenant from the record itself.
   *
   * `rawPayload` and `signature` are passed to the adapter for verification; the adapter
   * decides authenticity. Returns the updated donation (or null if no match).
   */
  async handleWebhook(rawPayload: unknown, signature: string) {
    const event = await this.payment.verifyWebhook(rawPayload, signature);
    if (!event?.providerRef) return { matched: false };

    // Unscoped lookup: provider refs are globally unique; tenant comes from the row.
    const donation = await this.prisma.donation.findFirst({
      where: { providerRef: event.providerRef },
    });
    if (!donation) return { matched: false };

    // Idempotent: don't re-process an already-settled donation.
    if (donation.status === 'SUCCEEDED' || donation.status === 'FAILED') {
      return { matched: true, donationId: donation.id, status: donation.status, idempotent: true };
    }

    const succeeded = event.status === 'succeeded';
    const updated = await this.prisma.donation.update({
      where: { id: donation.id },
      data: {
        status: succeeded ? 'SUCCEEDED' : 'FAILED',
        receiptNumber: succeeded ? this.receiptNumber(donation.id) : null,
      },
    });

    return { matched: true, donationId: updated.id, status: updated.status };
  }

  // ============================================================
  // Recurring donations (subscriptions)
  // ============================================================

  listSubscriptions() {
    return this.prisma.scoped().subscription.findMany({
      orderBy: { createdAt: 'desc' },
      include: { donor: true },
    });
  }

  async getSubscription(id: string) {
    const sub = await this.prisma.scoped().subscription.findFirst({
      where: { id },
      include: { donor: true, donations: { orderBy: { createdAt: 'desc' } } },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  /**
   * Creates a recurring donation mandate via the payment adapter and immediately charges the
   * first cycle (a Donation linked to the subscription). Subsequent cycles are created by a
   * scheduler/webhook in a later phase; nextChargeAt is set for that purpose.
   */
  async createSubscription(dto: CreateSubscriptionDto, geoCountry?: string) {
    const tenantId = this.tenantContext.requireTenantId();
    const currency = (dto.currency ?? 'INR').toUpperCase();

    const donor = dto.donorEmail
      ? await this.prisma.scoped().donor.upsert({
          where: { tenantId_email: { tenantId, email: dto.donorEmail.toLowerCase() } },
          create: { tenantId, email: dto.donorEmail.toLowerCase(), name: dto.donorName },
          update: { name: dto.donorName },
        })
      : null;

    const mandate = await this.payment.createSubscription({
      amount: dto.amount,
      currency,
      interval: dto.interval,
      reference: `${tenantId}:${donor?.id ?? 'anon'}`,
      metadata: { tenantId },
    });

    const subscription = await this.prisma.scoped().subscription.create({
      data: {
        tenantId,
        donorId: donor?.id,
        amount: dto.amount,
        currency,
        interval: dto.interval,
        status: mandate.status === 'active' ? 'ACTIVE' : 'PAUSED',
        campaign: dto.campaign,
        provider: this.payment.name,
        providerRef: mandate.providerRef,
        nextChargeAt: mandate.nextChargeAt ?? null,
      },
    });

    // Charge the first cycle now.
    const firstCycle = await this.chargeCycle(subscription.id, {
      country: dto.country,
      region: dto.region,
      category: dto.category,
      geoCountry,
    });

    return { subscription, firstCycle };
  }

  /** Creates and settles one donation cycle for a subscription (used now + by scheduler later). */
  private async chargeCycle(
    subscriptionId: string,
    opts: { country?: string; region?: string; category?: string; geoCountry?: string } = {},
  ) {
    const tenantId = this.tenantContext.requireTenantId();
    const sub = await this.prisma.scoped().subscription.findFirst({ where: { id: subscriptionId } });
    if (!sub) throw new NotFoundException('Subscription not found');

    const fin = await this.financialSnapshot(sub.amount, sub.currency, opts);
    const donation = await this.prisma.scoped().donation.create({
      data: {
        tenantId,
        donorId: sub.donorId,
        subscriptionId: sub.id,
        amount: sub.amount,
        currency: sub.currency,
        type: 'RECURRING',
        campaign: sub.campaign,
        provider: this.payment.name,
        status: 'PENDING',
        taxCountry: fin.tax.country,
        taxRegion: fin.tax.region,
        taxRatePct: fin.tax.ratePct,
        taxAmount: fin.tax.taxAmount,
        taxBreakdown: fin.tax.breakdown,
        baseCurrency: fin.baseCurrency,
        fxRate: fin.fxRate,
        baseAmount: fin.baseAmount,
      },
    });

    const intent = await this.payment.createIntent({
      amount: donation.amount,
      currency: donation.currency,
      reference: donation.id,
      metadata: { tenantId, subscriptionId: sub.id },
    });

    const settled = await this.prisma.scoped().donation.update({
      where: { id: donation.id },
      data: {
        providerRef: intent.providerRef,
        status: intent.status === 'succeeded' ? 'SUCCEEDED' : 'PENDING',
        receiptNumber:
          intent.status === 'succeeded' ? this.receiptNumber(donation.id) : undefined,
      },
    });
    if (settled.status === 'SUCCEEDED') await this.issueReceipt(settled.id);
    return settled;
  }

  async pauseSubscription(id: string) {
    await this.requireSubscription(id);
    return this.prisma.scoped().subscription.update({ where: { id }, data: { status: 'PAUSED' } });
  }

  async resumeSubscription(id: string) {
    await this.requireSubscription(id);
    return this.prisma.scoped().subscription.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  async cancelSubscription(id: string) {
    const sub = await this.requireSubscription(id);
    if (sub.providerRef) {
      await this.payment.cancelSubscription(sub.providerRef);
    }
    return this.prisma.scoped().subscription.update({
      where: { id },
      data: { status: 'CANCELLED', nextChargeAt: null },
    });
  }

  private async requireSubscription(id: string) {
    const sub = await this.prisma.scoped().subscription.findFirst({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  // ============================================================
  // Donor donation history
  // ============================================================

  /** Full giving history for a donor (by email), including one-time + recurring + mandates. */
  async donorHistory(email: string) {
    this.tenantContext.requireTenantId();
    const donor = await this.prisma.scoped().donor.findFirst({
      where: { email: email.toLowerCase() },
      include: {
        donations: { orderBy: { createdAt: 'desc' } },
        subscriptions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!donor) throw new NotFoundException('Donor not found');

    const succeeded = donor.donations.filter((d) => d.status === 'SUCCEEDED');
    const totalsByCurrency: Record<string, number> = {};
    for (const d of succeeded) {
      totalsByCurrency[d.currency] = (totalsByCurrency[d.currency] ?? 0) + d.amount;
    }

    return {
      donor: { id: donor.id, email: donor.email, name: donor.name },
      summary: {
        donationCount: donor.donations.length,
        succeededCount: succeeded.length,
        activeSubscriptions: donor.subscriptions.filter((s) => s.status === 'ACTIVE').length,
        totalsByCurrency,
      },
      donations: donor.donations,
      subscriptions: donor.subscriptions,
    };
  }
}
