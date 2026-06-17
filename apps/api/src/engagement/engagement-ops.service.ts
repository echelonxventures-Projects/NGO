import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { QrService } from '../common/qr/qr.service';
import { AddBenefitDto, CheckInDto, LogHoursDto, VerifyHoursDto } from './dto/engagement-ops.dto';

/**
 * Engagement completion: QR event tickets + check-in, volunteer hour logging/verification, and
 * membership benefit definitions + entitlement resolution.
 */
@Injectable()
export class EngagementOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    private readonly qr: QrService,
  ) {}

  // ---------- Event QR tickets + check-in ----------

  /** Returns the registration's QR ticket as inline SVG (payload = ticket code). */
  async ticketQr(registrationId: string) {
    const reg = await this.prisma.scoped().eventRegistration.findFirst({
      where: { id: registrationId },
    });
    if (!reg) throw new NotFoundException('Registration not found');
    const payload = `ticket:${reg.ticketCode}`;
    return {
      ticketCode: reg.ticketCode,
      status: reg.status,
      qrSvg: await this.qr.toSvg(payload),
    };
  }

  /** Marks a registration as attended by scanning its ticket code. Idempotent. */
  async checkIn(dto: CheckInDto) {
    const code = dto.ticketCode.replace(/^ticket:/, '');
    const reg = await this.prisma.scoped().eventRegistration.findFirst({
      where: { ticketCode: code },
    });
    if (!reg) throw new NotFoundException('Ticket not found');
    if (reg.status === 'CANCELLED') throw new BadRequestException('Ticket is cancelled');
    if (reg.checkedInAt) return { ...reg, alreadyCheckedIn: true };
    const updated = await this.prisma.scoped().eventRegistration.update({
      where: { id: reg.id },
      data: { status: 'ATTENDED', checkedInAt: new Date() },
    });
    return { ...updated, alreadyCheckedIn: false };
  }

  eventAttendance(eventId: string) {
    return this.prisma.scoped().eventRegistration.findMany({
      where: { eventId, status: 'ATTENDED' },
      orderBy: { checkedInAt: 'desc' },
    });
  }

  // ---------- Volunteer hours ----------

  async logHours(dto: LogHoursDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const signup = await this.prisma.scoped().volunteerSignup.findFirst({
      where: { id: dto.signupId },
    });
    if (!signup) throw new NotFoundException('Volunteer signup not found');
    const log = await this.prisma.scoped().volunteerHourLog.create({
      data: {
        tenantId,
        signupId: dto.signupId,
        hours: dto.hours,
        date: dto.date ? new Date(dto.date) : undefined,
        note: dto.note,
      },
    });
    await this.recomputeSignupHours(dto.signupId);
    return log;
  }

  async verifyHours(logId: string, dto: VerifyHoursDto) {
    const log = await this.prisma.scoped().volunteerHourLog.findFirst({ where: { id: logId } });
    if (!log) throw new NotFoundException('Hour log not found');
    const updated = await this.prisma.scoped().volunteerHourLog.update({
      where: { id: logId },
      data: { verified: dto.verified },
    });
    await this.recomputeSignupHours(log.signupId);
    return updated;
  }

  /** Aggregates verified hours onto the signup's denormalized `hours` total. */
  private async recomputeSignupHours(signupId: string) {
    const logs = await this.prisma.scoped().volunteerHourLog.findMany({
      where: { signupId, verified: true },
      select: { hours: true },
    });
    const total = logs.reduce((s, l) => s + l.hours, 0);
    await this.prisma.scoped().volunteerSignup.update({
      where: { id: signupId },
      data: { hours: total },
    });
    return total;
  }

  hoursForSignup(signupId: string) {
    return this.prisma.scoped().volunteerHourLog.findMany({
      where: { signupId },
      orderBy: { date: 'desc' },
    });
  }

  // ---------- Membership benefits ----------

  addBenefit(dto: AddBenefitDto) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.scoped().membershipBenefit.create({
      data: { tenantId, planId: dto.planId, key: dto.key, label: dto.label, value: dto.value },
    });
  }

  benefitsForPlan(planId: string) {
    return this.prisma.scoped().membershipBenefit.findMany({ where: { planId } });
  }

  /**
   * Resolves the effective benefits for a user from their ACTIVE (non-expired) memberships.
   * This is the enforcement point other modules call (e.g. commerce discount).
   */
  async entitlementsForUser(userId: string) {
    const now = new Date();
    const memberships = await this.prisma.scoped().membership.findMany({
      where: { userId, status: 'ACTIVE' },
    });
    const active = memberships.filter((m) => !m.expiresAt || m.expiresAt > now);
    if (active.length === 0) return { active: false, planIds: [], benefits: [] };
    const planIds = active.map((m) => m.planId);
    const benefits = await this.prisma.scoped().membershipBenefit.findMany({
      where: { planId: { in: planIds } },
    });
    return { active: true, planIds, benefits };
  }
}
