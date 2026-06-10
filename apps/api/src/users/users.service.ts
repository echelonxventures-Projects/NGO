import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

/**
 * Tenant-scoped user & role administration.
 *
 * `User` and `Role` are tenant-owned, so reads/writes go through `prisma.scoped()` which
 * injects `tenantId` automatically. The `UserRole` join table has no `tenantId` column, so
 * its rows are written with the *unscoped* client — but only after both the user and the
 * roles have been resolved within the active tenant, so cross-tenant linkage is impossible.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  /** Strips the password hash before returning a user to the API surface. */
  private sanitize<T extends { passwordHash?: string | null }>(user: T) {
    const { passwordHash: _omit, ...safe } = user;
    return safe;
  }

  async list() {
    const users = await this.prisma.scoped().user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { roles: { include: { role: true } } },
    });
    return users.map((u) => ({
      ...this.sanitize(u),
      roles: u.roles.map((ur) => ur.role.key),
    }));
  }

  listRoles() {
    return this.prisma
      .scoped()
      .role.findMany({
        orderBy: { name: 'asc' },
        include: { permissions: { include: { permission: true } } },
      })
      .then((roles) =>
        roles.map((r) => ({
          id: r.id,
          key: r.key,
          name: r.name,
          isSystem: r.isSystem,
          permissions: r.permissions.map((rp) => rp.permission.key),
        })),
      );
  }

  /** Resolves role keys to tenant-owned role ids, rejecting any that don't exist. */
  private async resolveRoleIds(roleKeys: string[]): Promise<string[]> {
    const unique = Array.from(new Set(roleKeys));
    const roles = await this.prisma.scoped().role.findMany({
      where: { key: { in: unique } },
    });
    if (roles.length !== unique.length) {
      const found = new Set(roles.map((r) => r.key));
      const missing = unique.filter((k) => !found.has(k));
      throw new BadRequestException(`Unknown role(s): ${missing.join(', ')}`);
    }
    return roles.map((r) => r.id);
  }

  async create(dto: CreateUserDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.scoped().user.findFirst({ where: { email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const roleIds = await this.resolveRoleIds(dto.roleKeys);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.scoped().user.create({
      data: { tenantId, email, name: dto.name, passwordHash, status: 'ACTIVE' },
    });

    if (roleIds.length) {
      await this.prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: user.id, roleId })),
        skipDuplicates: true,
      });
    }
    return { ...this.sanitize(user), roles: dto.roleKeys };
  }

  /** Verifies a user belongs to the active tenant (scoped query throws otherwise). */
  private async requireUser(id: string) {
    const user = await this.prisma.scoped().user.findFirst({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto, actingUserId: string) {
    const user = await this.requireUser(id);

    if (id === actingUserId && dto.status && dto.status !== 'ACTIVE') {
      throw new BadRequestException('You cannot disable your own account');
    }

    await this.prisma.scoped().user.update({
      where: { id },
      data: { name: dto.name ?? undefined, status: dto.status ?? undefined },
    });

    if (dto.roleKeys) {
      const roleIds = await this.resolveRoleIds(dto.roleKeys);
      // Replace the user's role set. Safe: userId is tenant-verified, roleIds tenant-scoped.
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      if (roleIds.length) {
        await this.prisma.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId: id, roleId })),
          skipDuplicates: true,
        });
      }
    }

    return this.get(id);
  }

  async resetPassword(id: string, password: string) {
    await this.requireUser(id);
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.scoped().user.update({ where: { id }, data: { passwordHash } });
    return { ok: true };
  }

  async get(id: string) {
    await this.requireUser(id);
    const user = await this.prisma.scoped().user.findFirst({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    return {
      ...this.sanitize(user!),
      roles: user!.roles.map((ur) => ur.role.key),
    };
  }
}
