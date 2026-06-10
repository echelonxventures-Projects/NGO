import { IsDateString, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateContentDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsObject() body?: Record<string, unknown>;
  @IsOptional() @IsString() locale?: string;
  @IsOptional() @IsObject() seo?: Record<string, unknown>;
}

export class ScheduleContentDto {
  @IsDateString() publishAt!: string; // ISO date-time in the future
}
