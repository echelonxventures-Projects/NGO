import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SubscriptionInterval } from '@prisma/client';

export class CreateSubscriptionDto {
  @IsInt() @Min(100) amount!: number; // minor units per cycle
  @IsOptional() @IsString() currency?: string;
  @IsEnum(SubscriptionInterval) interval!: SubscriptionInterval;
  @IsOptional() @IsString() campaign?: string;
  @IsOptional() @IsEmail() donorEmail?: string;
  @IsOptional() @IsString() donorName?: string;
  // Optional tax region hints (else auto-detected from geo header / tenant default).
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() category?: string;
}
