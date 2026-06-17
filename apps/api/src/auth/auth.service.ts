import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { AuthUser } from './current-user.decorator';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly tenantContext: TenantContext,
    private readonly notifications: NotificationService,
  ) {}

  static hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
  }

  /**
   * Public self-registration within the resolved tenant. Creates a user with the default
   * `student` role and returns an access token (auto-login). Email is unique per tenant.
   */
  async register(email: string, password: string, name?: string) {
    const tenantId = this.tenantContext.requireTenantId();
    const normEmail = email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: normEmail } },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { tenantId, email: normEmail, name, passwordHash, status: 'ACTIVE' },
    });

    // Assign the default self-service role (`student`) if it exists for this tenant.
    const studentRole = await this.prisma.role.findUnique({
      where: { tenantId_key: { tenantId, key: 'student' } },
    });
    if (studentRole) {
      await this.prisma.userRole.create({
        data: { userId: user.id, roleId: studentRole.id },
      });
    }

    // Welcome the new member across their default channels (in-app + email). Best-effort:
    // a notification failure must never block account creation.
    try {
      await this.notifications.notify({
        type: 'user.welcome',
        title: 'Welcome aboard 🎉',
        body: `Hi ${name ?? 'there'}, your account is ready. Explore programs, courses and more.`,
        userId: user.id,
        to: normEmail,
      });
    } catch (e) {
      this.logger.warn(`Welcome notification skipped for ${normEmail}: ${(e as Error).message}`);
    }

    return this.login(normEmail, password);
  }

  /** Authenticates a user WITHIN the resolved tenant and returns an access token. */
  async login(
    email: string,
    password: string,
  ): Promise<
    | { accessToken: string; user: Partial<AuthUser> }
    | { mfaRequired: true; userId: string }
  > {
    const tenantId = this.tenantContext.requireTenantId();

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: email.toLowerCase().trim() } },
    });

    if (!user || !user.passwordHash || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // MFA gate: when enrolled, password alone is not sufficient — require a second factor
    // via POST /auth/mfa/verify with the returned userId.
    if (user.mfaEnabled) {
      return { mfaRequired: true, userId: user.id };
    }

    return this.issueToken(user.id);
  }

  /**
   * Loads a user's roles/permissions and signs an access token. Reused by password login,
   * MFA verification, OTP login and OAuth login so token shape stays identical everywhere.
   */
  async issueToken(
    userId: string,
  ): Promise<{ accessToken: string; user: Partial<AuthUser> }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const roles = user.roles.map((ur) => ur.role.key);
    const permissions = Array.from(
      new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key))),
    );

    const payload: AuthUser & { sub: string } = {
      sub: user.id,
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles,
      permissions,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      user: { userId: user.id, email: user.email, tenantId: user.tenantId, roles, permissions },
    };
  }
}
