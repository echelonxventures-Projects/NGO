import { IsArray, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePageDto {
  @IsString() @MinLength(1) slug!: string;
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsArray() blocks?: { id?: string; type: string; props?: Record<string, unknown> }[];
  @IsOptional() @IsObject() seo?: Record<string, unknown>;
}

export class UpdatePageDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsArray() blocks?: { id?: string; type: string; props?: Record<string, unknown> }[];
  @IsOptional() @IsObject() seo?: Record<string, unknown>;
}

export class SchedulePageDto {
  @IsString() scheduledAt!: string;
}

export class CreateThemeDto {
  @IsString() @MinLength(1) slug!: string;
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsObject() tokens?: Record<string, unknown>;
}

export class ImportThemeDto {
  @IsString() @MinLength(1) slug!: string;
  @IsString() @MinLength(1) name!: string;
  @IsObject() tokens!: Record<string, unknown>;
}
