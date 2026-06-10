import { IsArray, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class CreateUserDto {
  @IsEmail() email!: string;
  @IsOptional() @IsString() name?: string;
  @IsString() @MinLength(8) password!: string;
  /** Role keys to assign (e.g. ["editor"]). Must exist for this tenant. */
  @IsArray() @IsString({ each: true }) roleKeys!: string[];
}

export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
  @IsOptional() @IsArray() @IsString({ each: true }) roleKeys?: string[];
}

export class ResetPasswordDto {
  @IsString() @MinLength(8) password!: string;
}
