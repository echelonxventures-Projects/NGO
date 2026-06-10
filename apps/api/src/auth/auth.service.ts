import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { AuthUser } from './current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly tenantContext: TenantContext,
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

    return this.login(normEmail, password);
  }

  /** Authenticates a user WITHIN the resolved tenant and returns an access token. */
  async login(email: string, password: string): Promise<{ accessToken: string; user: Partial<AuthUser> }> {
    const tenantId = this.tenantContext.requireTenantId();

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: email.toLowerCase().trim() } },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });

    if (!user || !user.passwordHash || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

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
