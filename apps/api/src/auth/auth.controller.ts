import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './public.decorator';
import { CurrentUser, AuthUser } from './current-user.decorator';
import { MfaService } from './mfa.service';
import { OtpService } from './otp.service';
import { OAuthService } from './oauth.service';
import {
  MfaEnableDto,
  MfaVerifyDto,
  OAuthGithubDto,
  OAuthGoogleDto,
  OAuthProfileDto,
  OtpRequestDto,
  OtpVerifyDto,
} from './dto/auth-extra.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly mfa: MfaService,
    private readonly otp: OtpService,
    private readonly oauth: OAuthService,
  ) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password, dto.name);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  // ---------- MFA (TOTP) ----------

  @Post('mfa/enroll')
  enrollMfa(@CurrentUser() me: AuthUser) {
    return this.mfa.enroll(me.userId);
  }

  @Post('mfa/enable')
  enableMfa(@Body() dto: MfaEnableDto, @CurrentUser() me: AuthUser) {
    return this.mfa.enable(me.userId, dto.token);
  }

  @Post('mfa/disable')
  disableMfa(@CurrentUser() me: AuthUser) {
    return this.mfa.disable(me.userId);
  }

  /** Second factor of login (after /auth/login returns mfaRequired). */
  @Public()
  @Post('mfa/verify')
  verifyMfa(@Body() dto: MfaVerifyDto) {
    return this.mfa.verifyAndLogin(dto.userId, dto.token);
  }

  // ---------- Mobile / email OTP ----------

  @Public()
  @Post('otp/request')
  requestOtp(@Body() dto: OtpRequestDto) {
    return this.otp.request(dto.channel, dto.recipient);
  }

  @Public()
  @Post('otp/verify')
  verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.otp.verify(dto.channel, dto.recipient, dto.code, dto.name);
  }

  // ---------- OAuth / social login ----------

  @Public()
  @Post('oauth/google')
  async google(@Body() dto: OAuthGoogleDto) {
    const profile = await this.oauth.verifyGoogle(dto.idToken);
    return this.oauth.login(profile);
  }

  @Public()
  @Post('oauth/github')
  async github(@Body() dto: OAuthGithubDto) {
    const profile = await this.oauth.verifyGithub(dto.accessToken);
    return this.oauth.login(profile);
  }

  /** Generic provider login for profiles verified at the edge (Facebook/LinkedIn/Apple). */
  @Public()
  @Post('oauth/profile')
  profileLogin(@Body() dto: OAuthProfileDto) {
    return this.oauth.login(dto);
  }
}
