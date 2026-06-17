import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { authenticator } from 'otplib';
import { PrismaService } from '../prisma/prisma.service';
import { QrService } from '../common/qr/qr.service';
import { AuthService } from './auth.service';

// Accept the adjacent 30s step to tolerate clock skew / boundary entry (RFC 6238 guidance).
authenticator.options = { window: 1 };

/**
 * TOTP-based multi-factor auth (RFC 6238) via otplib — free, offline, compatible with Google
 * Authenticator / Authy. Enrollment returns an otpauth:// URI + QR; the user confirms with a
 * code to enable. Login then requires a valid TOTP via verifyAndLogin().
 */
@Injectable()
export class MfaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qr: QrService,
    private readonly auth: AuthService,
  ) {}

  /** Generates a secret (not yet enabled) and returns the provisioning URI + QR. */
  async enroll(userId: string, issuer = 'DXP Platform') {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const secret = authenticator.generateSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret, mfaEnabled: false } });
    const otpauth = authenticator.keyuri(user.email, issuer, secret);
    return { secret, otpauth, qrSvg: await this.qr.toSvg(otpauth) };
  }

  /** Confirms a code against the pending secret and enables MFA. */
  async enable(userId: string, token: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user?.mfaSecret) throw new BadRequestException('Start MFA enrollment first');
    if (!authenticator.check(token, user.mfaSecret)) {
      throw new BadRequestException('Invalid code');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    return { enabled: true };
  }

  async disable(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });
    return { enabled: false };
  }

  /** Second-factor step of login: validates the TOTP and issues the access token. */
  async verifyAndLogin(userId: string, token: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user?.mfaSecret || !user.mfaEnabled) throw new BadRequestException('MFA not enabled');
    if (!authenticator.check(token, user.mfaSecret)) {
      throw new BadRequestException('Invalid code');
    }
    return this.auth.issueToken(userId);
  }
}
