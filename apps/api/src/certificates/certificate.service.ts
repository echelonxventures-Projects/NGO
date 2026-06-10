import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { renderTemplate, extractPlaceholders } from './template-render';
import { toMajor } from '../currency/minor-units';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  IssueCertificateDto,
  DEFAULT_80G_TEMPLATE,
} from './dto/certificate.dto';

@Injectable()
export class CertificateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  // ---- Templates ----
  listTemplates() {
    return this.prisma.scoped().certificateTemplate.findMany({ orderBy: { type: 'asc' } });
  }

  createTemplate(dto: CreateTemplateDto) {
    return this.prisma.scoped().certificateTemplate.create({
      data: {
        tenantId: this.tenantContext.requireTenantId(),
        type: dto.type,
        name: dto.name,
        template: dto.template,
        fields: extractPlaceholders(dto.template),
      },
    });
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto) {
    const existing = await this.prisma.scoped().certificateTemplate.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Template not found');
    return this.prisma.scoped().certificateTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        template: dto.template,
        fields: dto.template ? extractPlaceholders(dto.template) : undefined,
      },
    });
  }

  /** Ensures the tenant has a default 80G template, creating it if absent. */
  async ensureDefault80G() {
    const tenantId = this.tenantContext.requireTenantId();
    const existing = await this.prisma.scoped().certificateTemplate.findFirst({
      where: { type: 'tax80g' },
    });
    if (existing) return existing;
    return this.prisma.scoped().certificateTemplate.create({
      data: {
        tenantId,
        type: 'tax80g',
        name: 'Default 80G',
        template: DEFAULT_80G_TEMPLATE,
        fields: extractPlaceholders(DEFAULT_80G_TEMPLATE),
      },
    });
  }

  // ---- Issuance ----
  async issue(dto: IssueCertificateDto) {
    const template = await this.prisma.scoped().certificateTemplate.findFirst({
      where: { type: dto.type, active: true, ...(dto.templateName ? { name: dto.templateName } : {}) },
      orderBy: { createdAt: 'asc' },
    });
    if (!template) throw new NotFoundException(`No active template for type '${dto.type}'`);
    return this.render(template, dto.data ?? {}, {
      subjectName: dto.subjectName,
      subjectEmail: dto.subjectEmail,
      refType: dto.refType,
      refId: dto.refId,
    });
  }

  /**
   * Convenience: issue an 80G certificate for a (successful) donation, pulling the donor and
   * the tenant's legal/80G config. Snapshots all values so the certificate never changes.
   */
  async issue80GForDonation(donationId: string) {
    const tenantId = this.tenantContext.requireTenantId();
    const donation = await this.prisma.scoped().donation.findFirst({
      where: { id: donationId },
      include: { donor: true },
    });
    if (!donation) throw new NotFoundException('Donation not found');
    if (donation.status !== 'SUCCEEDED') {
      throw new BadRequestException('Certificate can only be issued for a successful donation');
    }

    const config = await this.prisma.tenantConfig.findUnique({ where: { tenantId } });
    const legal = (config?.legal ?? {}) as Record<string, string>;
    const template = await this.ensureDefault80G();

    const data: Record<string, unknown> = {
      orgLegalName: legal.legalName ?? '',
      orgAddress: legal.address ?? '',
      orgPan: legal.pan ?? '',
      reg80GNumber: legal.reg80GNumber ?? '',
      reg80GDate: legal.reg80GDate ?? '',
      receiptNumber: donation.receiptNumber ?? '',
      issueDate: new Date().toISOString().slice(0, 10),
      donorName: donation.donor?.name ?? '',
      donorEmail: donation.donor?.email ?? '',
      currency: donation.currency,
      amountMajor: toMajor(donation.amount, donation.currency).toFixed(2),
      paymentMode: donation.provider,
    };

    return this.render(template, data, {
      subjectName: donation.donor?.name ?? undefined,
      subjectEmail: donation.donor?.email ?? undefined,
      refType: 'donation',
      refId: donation.id,
    });
  }

  private async render(
    template: { id: string; type: string; template: string },
    data: Record<string, unknown>,
    meta: { subjectName?: string; subjectEmail?: string; refType?: string; refId?: string },
  ) {
    const tenantId = this.tenantContext.requireTenantId();
    const code = this.generateCode();
    const merged = {
      ...data,
      verificationCode: code,
      verifyUrl: `/api/certificates/verify/${code}`,
    };
    const renderedHtml = renderTemplate(template.template, merged);

    return this.prisma.scoped().certificate.create({
      data: {
        tenantId,
        templateId: template.id,
        type: template.type,
        code,
        subjectName: meta.subjectName,
        subjectEmail: meta.subjectEmail,
        data: merged,
        renderedHtml,
        refType: meta.refType,
        refId: meta.refId,
      },
    });
  }

  // ---- Verify / render ----
  async verify(code: string) {
    const cert = await this.prisma.scoped().certificate.findFirst({ where: { code } });
    if (!cert) return { valid: false };
    return {
      valid: cert.revokedAt == null,
      revoked: cert.revokedAt != null,
      type: cert.type,
      code: cert.code,
      subjectName: cert.subjectName,
      issuedAt: cert.issuedAt,
    };
  }

  async getHtml(code: string): Promise<string> {
    const cert = await this.prisma.scoped().certificate.findFirst({ where: { code } });
    if (!cert) throw new NotFoundException('Certificate not found');
    return cert.renderedHtml;
  }

  private generateCode(): string {
    // Readable, URL-safe, collision-resistant verification code.
    return `CERT-${randomBytes(6).toString('hex').toUpperCase()}`;
  }
}
