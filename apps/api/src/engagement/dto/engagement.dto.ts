import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { EventMode, MembershipInterval } from '@prisma/client';

// ---- Events ----
export class CreateEventDto {
  @IsString() @MinLength(1) slug!: string;
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(EventMode) mode?: EventMode;
  @IsOptional() @IsString() location?: string;
  @IsDateString() startsAt!: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsInt() @Min(0) capacity?: number;
  @IsOptional() @IsInt() @Min(0) price?: number;
  @IsOptional() @IsString() currency?: string;
}

export class UpdateEventDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(EventMode) mode?: EventMode;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsInt() @Min(0) capacity?: number;
  @IsOptional() @IsInt() @Min(0) price?: number;
}

export class RegisterEventDto {
  @IsEmail() email!: string;
  @IsOptional() @IsString() name?: string;
}

// ---- Volunteers ----
export class CreateOpportunityDto {
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsInt() @Min(0) slots?: number;
}

export class UpdateOpportunityDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsInt() @Min(0) slots?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class SignupVolunteerDto {
  @IsEmail() email!: string;
  @IsOptional() @IsString() name?: string;
}

export class UpdateSignupDto {
  @IsOptional() @IsString() status?: string; // APPLIED|APPROVED|REJECTED|COMPLETED
  @IsOptional() @IsInt() @Min(0) hours?: number;
}

// ---- Membership ----
export class CreatePlanDto {
  @IsString() @MinLength(1) slug!: string;
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsInt() @Min(0) price?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsEnum(MembershipInterval) interval?: MembershipInterval;
  @IsOptional() @IsArray() @IsString({ each: true }) benefits?: string[];
}

export class UpdatePlanDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() @Min(0) price?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsEnum(MembershipInterval) interval?: MembershipInterval;
  @IsOptional() @IsArray() @IsString({ each: true }) benefits?: string[];
  @IsOptional() @IsBoolean() active?: boolean;
}

// ---- Community ----
export class CreatePostDto {
  @IsString() @MinLength(1) title!: string;
  @IsString() @MinLength(1) body!: string;
}

export class CreateCommentDto {
  @IsString() @MinLength(1) body!: string;
}
