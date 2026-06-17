import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { AuthService } from './auth.service';

export interface OAuthProfile {
  provider: string;
  providerUserId: string;
  email?: string;
  name?: string;
}

/**
 * Provider-abstracted social login. The provider-specific token exchange happens here for the
 * keyless verification paths (Google id_token, GitHub access_token → user); other providers
 * (Facebook/LinkedIn/Apple) plug in by returning an OAuthProfile. After obtaining a verified
 * profile we find-or-create the user + OAuthAccount and issue our own JWT.
 */
@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    private readonly auth: AuthService,
  ) {}

  /** Verifies a Google ID token via the keyless tokeninfo endpoint. */
  async verifyGoogle(idToken: string): Promise<OAuthProfile> {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    if (!res.ok) throw new BadRequestException('Invalid Google token');
    const data = (await res.json()) as { sub?: string; email?: string; name?: string };
    if (!data.sub) throw new BadRequestException('Invalid Google token');
    return { provider: 'google', providerUserId: data.sub, email: data.email, name: data.name };
  }

  /** Resolves a GitHub profile from a user access token (no client secret needed server-side). */
  async verifyGithub(accessToken: string): Promise<OAuthProfile> {
    const res = await fetch('https://api.github.com/user', {
      headers: { authorization: `Bearer ${accessToken}`, accept: 'application/vnd.github+json' },
    });
    if (!res.ok) throw new BadRequestException('Invalid GitHub token');
    const data = (await res.json()) as { id?: number; login?: string; email?: string; name?: string };
    if (!data.id) throw new BadRequestException('Invalid GitHub token');
    return {
      provider: 'github',
      providerUserId: String(data.id),
      email: data.email ?? `${data.login}@users.noreply.github.com`,
      name: data.name ?? data.login,
    };
  }

  /** Find-or-create the local user for a verified provider profile, then issue a token. */
  async login(profile: OAuthProfile) {
    const tenantId = this.tenantContext.requireTenantId();

    const existing = await this.prisma.scoped().oAuthAccount.findFirst({
      where: { provider: profile.provider, providerUserId: profile.providerUserId },
    });
    if (existing) return this.auth.issueToken(existing.userId);

    const email = (profile.email ?? `${profile.provider}_${profile.providerUserId}@oauth.local`).toLowerCase();
    let user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: { tenantId, email, name: profile.name, status: 'ACTIVE' },
      });
      const studentRole = await this.prisma.role.findUnique({
        where: { tenantId_key: { tenantId, key: 'student' } },
      });
      if (studentRole) {
        await this.prisma.userRole.create({ data: { userId: user.id, roleId: studentRole.id } });
      }
    }

    await this.prisma.scoped().oAuthAccount.create({
      data: {
        tenantId,
        userId: user.id,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        email: profile.email,
      },
    });

    return this.auth.issueToken(user.id);
  }
}
