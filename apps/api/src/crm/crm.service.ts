import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipInterval, SponsorshipType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import {
  AddActivityDto,
  CreateCampaignDto,
  CreateContactDto,
  CreateSponsorshipDto,
} from './dto/crm.dto';

/**
 * CRM (contacts + activity timeline), fundraising campaigns (with goal/raised tracking derived
 * from donations tagged with the campaign slug) and sponsorships (child/education/environment/
 * healthcare). All tenant-scoped via prisma.scoped().
 */
@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  // ---------- Contacts ----------

  createContact(dto: CreateContactDto, ownerId?: string) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.scoped().contact.create({
      data: {
        tenantId,
        email: dto.email,
        phone: dto.phone,
        name: dto.name,
        type: dto.type ?? 'lead',
        tags: dto.tags ?? [],
        source: dto.source,
        notes: dto.notes,
        ownerId,
      },
    });
  }

  listContacts(type?: string) {
    return this.prisma.scoped().contact.findMany({
      where: type ? { type } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async getContact(id: string) {
    const contact = await this.prisma.scoped().contact.findFirst({
      where: { id },
      include: { activities: { orderBy: { createdAt: 'desc' } } },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async addActivity(contactId: string, dto: AddActivityDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const contact = await this.prisma.scoped().contact.findFirst({ where: { id: contactId } });
    if (!contact) throw new NotFoundException('Contact not found');
    return this.prisma.scoped().contactActivity.create({
      data: { tenantId, contactId, kind: dto.kind, summary: dto.summary },
    });
  }

  // ---------- Campaigns ----------

  async createCampaign(dto: CreateCampaignDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const existing = await this.prisma.scoped().campaign.findFirst({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Campaign slug already in use');
    return this.prisma.scoped().campaign.create({
      data: {
        tenantId,
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        goalAmount: dto.goalAmount ?? 0,
        currency: dto.currency ?? 'INR',
        coverUrl: dto.coverUrl,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        status: 'ACTIVE',
      },
    });
  }

  listCampaigns() {
    return this.prisma.scoped().campaign.findMany({ orderBy: { createdAt: 'desc' } });
  }

  /** Recomputes raised total from succeeded donations tagged with the campaign slug. */
  async refreshCampaign(slug: string) {
    const campaign = await this.prisma.scoped().campaign.findFirst({ where: { slug } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    const agg = await this.prisma.scoped().donation.aggregate({
      where: { campaign: slug, status: 'SUCCEEDED' },
      _sum: { amount: true },
    });
    const raisedAmount = agg._sum.amount ?? 0;
    const updated = await this.prisma.scoped().campaign.update({
      where: { id: campaign.id },
      data: {
        raisedAmount,
        status: campaign.goalAmount > 0 && raisedAmount >= campaign.goalAmount ? 'COMPLETED' : campaign.status,
      },
    });
    const progressPct = campaign.goalAmount > 0 ? Math.round((raisedAmount / campaign.goalAmount) * 100) : 0;
    return { ...updated, progressPct };
  }

  // ---------- Sponsorships ----------

  createSponsorship(dto: CreateSponsorshipDto, sponsorUserId?: string) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.scoped().sponsorship.create({
      data: {
        tenantId,
        type: dto.type as SponsorshipType,
        sponsorEmail: dto.sponsorEmail,
        sponsorName: dto.sponsorName,
        sponsorUserId,
        beneficiaryName: dto.beneficiaryName,
        beneficiaryRef: dto.beneficiaryRef,
        amount: dto.amount,
        currency: dto.currency ?? 'INR',
        interval: (dto.interval as MembershipInterval) ?? 'MONTHLY',
      },
    });
  }

  listSponsorships(type?: string) {
    return this.prisma.scoped().sponsorship.findMany({
      where: type ? { type: type as SponsorshipType } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async setSponsorshipStatus(id: string, status: 'ACTIVE' | 'PAUSED' | 'CANCELLED') {
    const sp = await this.prisma.scoped().sponsorship.findFirst({ where: { id } });
    if (!sp) throw new NotFoundException('Sponsorship not found');
    return this.prisma.scoped().sponsorship.update({ where: { id }, data: { status } });
  }
}
