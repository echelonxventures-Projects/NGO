import { IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { ContentStatus } from '@prisma/client';

export class CreateContentDto {
  @IsString() @MinLength(1) type!: string;
  @IsString() @MinLength(1) slug!: string;
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsObject() body?: Record<string, unknown>;
  @IsOptional() @IsString() locale?: string;
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsObject() seo?: Record<string, unknown>;
}
