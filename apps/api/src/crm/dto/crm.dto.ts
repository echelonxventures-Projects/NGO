import { IsArray, IsEmail, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateContactDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() notes?: string;
}

export class AddActivityDto {
  @IsIn(['note', 'call', 'email', 'meeting', 'task']) kind!: string;
  @IsString() @MinLength(1) summary!: string;
}

export class CreateCampaignDto {
  @IsString() @MinLength(1) slug!: string;
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) goalAmount?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() endsAt?: string;
}

export class CreateSponsorshipDto {
  @IsIn(['CHILD', 'EDUCATION', 'ENVIRONMENT', 'HEALTHCARE', 'OTHER']) type!: string;
  @IsEmail() sponsorEmail!: string;
  @IsOptional() @IsString() sponsorName?: string;
  @IsOptional() @IsString() beneficiaryName?: string;
  @IsOptional() @IsString() beneficiaryRef?: string;
  @IsInt() @Min(0) amount!: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsIn(['MONTHLY', 'YEARLY', 'LIFETIME']) interval?: string;
}
