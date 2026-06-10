import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import {
  CreateCommentDto,
  CreateEventDto,
  CreateOpportunityDto,
  CreatePlanDto,
  CreatePostDto,
  RegisterEventDto,
  SignupVolunteerDto,
  UpdateEventDto,
  UpdateOpportunityDto,
  UpdatePlanDto,
  UpdateSignupDto,
} from './dto/engagement.dto';

/**
 * Phase 4 engagement features: events, volunteers, membership, community. All data is
 * tenant-owned via `prisma.scoped()`. Public registration/signup endpoints are capacity-
 * and duplicate-checked; admin endpoints are RBAC-guarded at the controller.
 */
@Injectable()
export class EngagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  private tid() {
    return this.tenantContext.requireTenantId();
  }

  // ============ Events ============

  listEventsAdmin() {
    return this.prisma.scoped().event.findMany({
      orderBy: { startsAt: 'desc' },
      include: { _count: { select: { registrations: true } } },
    });
  }

  listEventsPublic() {
    return this.prisma.scoped().event.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { startsAt: 'asc' },
      include: { _count: { select: { registrations: true } } },
    });
  }

  async getEventPublic(slug: string) {
    const event = await this.prisma.scoped().event.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: { _count: { select: { registrations: true } } },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async createEvent(dto: CreateEventDto) {
    const existing = await this.prisma.scoped().event.findFirst({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('An event with this slug already exists');
    return this.prisma.scoped().event.create({
      data: {
        tenantId: this.tid(),
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        mode: dto.mode ?? 'PHYSICAL',
        location: dto.location,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        capacity: dto.capacity ?? null,
        price: dto.price ?? 0,
        currency: dto.currency ?? 'INR',
      },
    });
  }

  private async requireEvent(id: string) {
    const e = await this.prisma.scoped().event.findFirst({ where: { id } });
    if (!e) throw new NotFoundException('Event not found');
    return e;
  }

  async updateEvent(id: string, dto: UpdateEventDto) {
    await this.requireEvent(id);
    return this.prisma.scoped().event.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        mode: dto.mode ?? undefined,
        location: dto.location ?? undefined,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        capacity: dto.capacity ?? undefined,
        price: dto.price ?? undefined,
      },
    });
  }

  async setEventPublished(id: string, published: boolean) {
    await this.requireEvent(id);
    return this.prisma.scoped().event.update({
      where: { id },
      data: { status: published ? 'PUBLISHED' : 'DRAFT' },
    });
  }

  async deleteEvent(id: string) {
    await this.requireEvent(id);
    await this.prisma.scoped().event.delete({ where: { id } });
    return { ok: true };
  }

  async registerForEvent(eventId: string, dto: RegisterEventDto, userId?: string) {
    const event = await this.prisma.scoped().event.findFirst({
      where: { id: eventId, status: 'PUBLISHED' },
    });
    if (!event) throw new NotFoundException('Event not found or not open');
    const email = dto.email.toLowerCase().trim();

    const already = await this.prisma.scoped().eventRegistration.findFirst({
      where: { eventId, email },
    });
    if (already) return already;

    if (event.capacity != null) {
      const count = await this.prisma.scoped().eventRegistration.count({
        where: { eventId, status: { not: 'CANCELLED' } },
      });
      if (count >= event.capacity) throw new BadRequestException('This event is full');
    }

    return this.prisma.scoped().eventRegistration.create({
      data: {
        tenantId: this.tid(),
        eventId,
        userId,
        email,
        name: dto.name,
        ticketCode: `TKT-${randomBytes(4).toString('hex').toUpperCase()}`,
      },
    });
  }

  async listRegistrations(eventId: string) {
    await this.requireEvent(eventId);
    return this.prisma.scoped().eventRegistration.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============ Volunteers ============

  listOpportunitiesAdmin() {
    return this.prisma.scoped().volunteerOpportunity.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { signups: true } } },
    });
  }

  listOpportunitiesPublic() {
    return this.prisma.scoped().volunteerOpportunity.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOpportunity(dto: CreateOpportunityDto) {
    return this.prisma.scoped().volunteerOpportunity.create({
      data: {
        tenantId: this.tid(),
        title: dto.title,
        description: dto.description,
        location: dto.location,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        slots: dto.slots ?? null,
      },
    });
  }

  private async requireOpportunity(id: string) {
    const o = await this.prisma.scoped().volunteerOpportunity.findFirst({ where: { id } });
    if (!o) throw new NotFoundException('Opportunity not found');
    return o;
  }

  async updateOpportunity(id: string, dto: UpdateOpportunityDto) {
    await this.requireOpportunity(id);
    return this.prisma.scoped().volunteerOpportunity.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        location: dto.location ?? undefined,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        slots: dto.slots ?? undefined,
        active: dto.active ?? undefined,
      },
    });
  }

  async deleteOpportunity(id: string) {
    await this.requireOpportunity(id);
    await this.prisma.scoped().volunteerOpportunity.delete({ where: { id } });
    return { ok: true };
  }

  async signupVolunteer(opportunityId: string, dto: SignupVolunteerDto, userId?: string) {
    const opp = await this.prisma.scoped().volunteerOpportunity.findFirst({
      where: { id: opportunityId, active: true },
    });
    if (!opp) throw new NotFoundException('Opportunity not found or closed');
    const email = dto.email.toLowerCase().trim();
    const already = await this.prisma.scoped().volunteerSignup.findFirst({
      where: { opportunityId, email },
    });
    if (already) return already;
    if (opp.slots != null) {
      const count = await this.prisma.scoped().volunteerSignup.count({
        where: { opportunityId, status: { not: 'REJECTED' } },
      });
      if (count >= opp.slots) throw new BadRequestException('No slots remaining');
    }
    return this.prisma.scoped().volunteerSignup.create({
      data: { tenantId: this.tid(), opportunityId, userId, email, name: dto.name },
    });
  }

  listSignups(opportunityId?: string) {
    return this.prisma.scoped().volunteerSignup.findMany({
      where: opportunityId ? { opportunityId } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSignup(id: string, dto: UpdateSignupDto) {
    const s = await this.prisma.scoped().volunteerSignup.findFirst({ where: { id } });
    if (!s) throw new NotFoundException('Signup not found');
    return this.prisma.scoped().volunteerSignup.update({
      where: { id },
      data: {
        status: (dto.status as never) ?? undefined,
        hours: dto.hours ?? undefined,
      },
    });
  }

  // ============ Membership ============

  listPlansAdmin() {
    return this.prisma.scoped().membershipPlan.findMany({ orderBy: { price: 'asc' } });
  }

  listPlansPublic() {
    return this.prisma.scoped().membershipPlan.findMany({
      where: { active: true },
      orderBy: { price: 'asc' },
    });
  }

  async createPlan(dto: CreatePlanDto) {
    const existing = await this.prisma.scoped().membershipPlan.findFirst({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('A plan with this slug already exists');
    return this.prisma.scoped().membershipPlan.create({
      data: {
        tenantId: this.tid(),
        slug: dto.slug,
        name: dto.name,
        price: dto.price ?? 0,
        currency: dto.currency ?? 'INR',
        interval: dto.interval ?? 'MONTHLY',
        benefits: dto.benefits ?? [],
      },
    });
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    const p = await this.prisma.scoped().membershipPlan.findFirst({ where: { id } });
    if (!p) throw new NotFoundException('Plan not found');
    return this.prisma.scoped().membershipPlan.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        price: dto.price ?? undefined,
        currency: dto.currency ?? undefined,
        interval: dto.interval ?? undefined,
        benefits: dto.benefits ?? undefined,
        active: dto.active ?? undefined,
      },
    });
  }

  async deletePlan(id: string) {
    const p = await this.prisma.scoped().membershipPlan.findFirst({ where: { id } });
    if (!p) throw new NotFoundException('Plan not found');
    await this.prisma.scoped().membershipPlan.delete({ where: { id } });
    return { ok: true };
  }

  /** Subscribe the current user to a plan (mock activation; payment reuses the adapter). */
  async subscribe(planId: string, userId: string) {
    const plan = await this.prisma.scoped().membershipPlan.findFirst({
      where: { id: planId, active: true },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    const expiresAt =
      plan.interval === 'LIFETIME'
        ? null
        : new Date(Date.now() + (plan.interval === 'YEARLY' ? 365 : 30) * 24 * 3600 * 1000);

    const existing = await this.prisma.scoped().membership.findFirst({
      where: { userId, planId },
    });
    if (existing) {
      return this.prisma.scoped().membership.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE', startedAt: new Date(), expiresAt },
      });
    }
    return this.prisma.scoped().membership.create({
      data: { tenantId: this.tid(), planId, userId, expiresAt },
    });
  }

  myMemberships(userId: string) {
    return this.prisma.scoped().membership.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { startedAt: 'desc' },
    });
  }

  // ============ Community ============

  listPosts() {
    return this.prisma.scoped().communityPost.findMany({
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      include: { _count: { select: { comments: true } } },
    });
  }

  async getPost(id: string) {
    const post = await this.prisma.scoped().communityPost.findFirst({
      where: { id },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  createPost(dto: CreatePostDto, authorId?: string, authorName?: string) {
    return this.prisma.scoped().communityPost.create({
      data: { tenantId: this.tid(), title: dto.title, body: dto.body, authorId, authorName },
    });
  }

  async addComment(postId: string, dto: CreateCommentDto, authorId?: string, authorName?: string) {
    await this.getPost(postId);
    return this.prisma.scoped().communityComment.create({
      data: { tenantId: this.tid(), postId, body: dto.body, authorId, authorName },
    });
  }

  async deletePost(id: string) {
    await this.getPost(id);
    await this.prisma.scoped().communityPost.delete({ where: { id } });
    return { ok: true };
  }

  async setPinned(id: string, pinned: boolean) {
    await this.getPost(id);
    return this.prisma.scoped().communityPost.update({ where: { id }, data: { pinned } });
  }
}
