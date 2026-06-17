import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSmartLinkDto {
  @IsOptional() @IsString() slug?: string; // auto-generated when omitted
  @IsString() @MinLength(1) targetUrl!: string;
  @IsOptional() @IsString() androidUrl?: string;
  @IsOptional() @IsString() iosUrl?: string;
  @IsOptional() @IsString() fallbackUrl?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() campaign?: string;
  @IsOptional() @IsString() referrerId?: string;
}

export class UpdateSmartLinkDto {
  @IsOptional() @IsString() targetUrl?: string;
  @IsOptional() @IsString() androidUrl?: string;
  @IsOptional() @IsString() iosUrl?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
