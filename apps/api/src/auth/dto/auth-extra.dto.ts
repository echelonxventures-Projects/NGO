import { IsEmail, IsIn, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class MfaVerifyDto {
  @IsString() userId!: string;
  @IsString() @Length(6, 6) token!: string;
}

export class MfaEnableDto {
  @IsString() @Length(6, 6) token!: string;
}

export class OtpRequestDto {
  @IsIn(['sms', 'email']) channel!: 'sms' | 'email';
  @IsString() @MinLength(3) recipient!: string;
}

export class OtpVerifyDto {
  @IsIn(['sms', 'email']) channel!: 'sms' | 'email';
  @IsString() @MinLength(3) recipient!: string;
  @IsString() @Length(6, 6) code!: string;
  @IsOptional() @IsString() name?: string;
}

export class OAuthGoogleDto {
  @IsString() idToken!: string;
}

export class OAuthGithubDto {
  @IsString() accessToken!: string;
}

export class OAuthProfileDto {
  @IsIn(['google', 'github', 'facebook', 'linkedin', 'apple'])
  provider!: string;

  @IsString() providerUserId!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() name?: string;
}
