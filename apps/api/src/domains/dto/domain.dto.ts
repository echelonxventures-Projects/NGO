import { IsOptional, IsString, Matches } from 'class-validator';

export class AddDomainDto {
  // Basic hostname validation (labels + TLD); not exhaustive but blocks obvious garbage.
  @Matches(/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i, {
    message: 'hostname must be a valid domain (e.g. example.org or ngo.example.org)',
  })
  hostname!: string;
}

export class VerifyDomainDto {
  // Dev-only manual token (honored only when DOMAIN_VERIFY_ALLOW_MANUAL=true).
  @IsOptional() @IsString() token?: string;
}
