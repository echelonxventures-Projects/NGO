import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { CourseStatus, LessonType } from '@prisma/client';

export class CreateCourseDto {
  @IsString() @MinLength(1) slug!: string;
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @IsInt() @Min(0) price?: number; // minor units; 0 = free
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() instructorId?: string;
}

export class UpdateCourseDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @IsEnum(CourseStatus) status?: CourseStatus;
  @IsOptional() @IsInt() @Min(0) price?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() instructorId?: string;
}

export class CreateModuleDto {
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsInt() order?: number;
}

export class UpdateModuleDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsInt() order?: number;
}

export class CreateLessonDto {
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsEnum(LessonType) type?: LessonType;
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsObject() content?: Record<string, unknown>;
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional() @IsInt() @Min(0) durationSec?: number;
  @IsOptional() @IsBoolean() isPreview?: boolean;
}

export class UpdateLessonDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsEnum(LessonType) type?: LessonType;
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsObject() content?: Record<string, unknown>;
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional() @IsInt() @Min(0) durationSec?: number;
  @IsOptional() @IsBoolean() isPreview?: boolean;
}
