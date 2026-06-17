import { BadRequestException, Injectable } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { NotificationService } from '../notifications/notification.service';
import { AuthService } from './auth.service';

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/**
 * Mobile/email OTP login. A 6-digit code is hashed + stored with a short TTL and delivered via
 * the notifications platform (free-first: SMS/WhatsApp use the log channel until a real provider
 * is configured; email uses SMTP/log). Verifying finds-or-creates the user and issues a token.
 */
@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    private readonly notifications: NotificationService,
    private readonly auth: AuthService,
  ) {}

  async request(channel: 'sms' | 'email', recipient: string) {
    const tenantId = this.tenantContext.requireTenantId();
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = await bcrypt.hash(code, 8);
    await this.prisma.scoped().otpChallenge.create({
      data: {
        tenantId,
        channel,
        recipient: recipient.trim(),
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    await this.notifications.notify({
      type: 'auth.otp',
      title: 'Your verification code',
      body: `Your one-time code is ${code}. It expires in 5 minutes.`,
      to: recipient,
      channels: channel === 'sms' ? [NotificationChannel.SMS] : [NotificationChannel.EMAIL],
    });

    return { sent: true, channel, expiresInSec: OTP_TTL_MS / 1000 };
  }

  async verify(channel: 'sms' | 'email', recipient: string, code: string, name?: string) {
    const tenantId = this.tenantContext.requireTenantId();
    const norm = recipient.trim();
    const challenge = await this.prisma.scoped().otpChallenge.findFirst({
      where: { recipient: norm, channel, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge) throw new BadRequestException('No valid code; request a new one');
    if (challenge.attempts >= MAX_ATTEMPTS) throw new BadRequestException('Too many attempts');

    const ok = await bcrypt.compare(code, challenge.codeHash);
    if (!ok) {
      await this.prisma.scoped().otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid code');
    }

    await this.prisma.scoped().otpChallenge.update({
      where: { id: challenge.id },
      data: { consumed: true },
    });

    const user = await this.findOrCreateUser(tenantId, channel, norm, name);
    return this.auth.issueToken(user.id);
  }

  /** Finds the user by email (email channel) or phone (sms channel), creating one if needed. */
  private async findOrCreateUser(tenantId: string, channel: string, recipient: string, name?: string) {
    if (channel === 'email') {
      const email = recipient.toLowerCase();
      const existing = await this.prisma.user.findUnique({
        where: { tenantId_email: { tenantId, email } },
      });
      if (existing) return existing;
      return this.createUser(tenantId, { email, name });
    }
    // sms: match by phone
    const existing = await this.prisma.user.findFirst({ where: { tenantId, phone: recipient } });
    if (existing) return existing;
    // synthesize a placeholder email for phone-only accounts
    const email = `${recipient.replace(/[^0-9]/g, '')}@phone.local`;
    return this.createUser(tenantId, { email, phone: recipient, name });
  }

  private async createUser(
    tenantId: string,
    data: { email: string; phone?: string; name?: string },
  ) {
    const user = await this.prisma.user.create({
      data: { tenantId, email: data.email, phone: data.phone, name: data.name, status: 'ACTIVE' },
    });
    const studentRole = await this.prisma.role.findUnique({
      where: { tenantId_key: { tenantId, key: 'student' } },
    });
    if (studentRole) {
      await this.prisma.userRole.create({ data: { userId: user.id, roleId: studentRole.id } });
    }
    return user;
  }
}
