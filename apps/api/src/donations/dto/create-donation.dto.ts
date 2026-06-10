import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { DonationType } from '@prisma/client';

export class CreateDonationDto {
  @IsInt() @Min(100) amount!: number; // minor units; min ~1.00
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsEnum(DonationType) type?: DonationType;
  @IsOptional() @IsString() campaign?: string;
  @IsOptional() @IsEmail() donorEmail?: string;
  @IsOptional() @IsString() donorName?: string;
  // Optional tax region hints (else auto-detected from geo header / tenant default).
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() category?: string;
}
