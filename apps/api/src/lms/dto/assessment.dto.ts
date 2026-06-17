import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { QuestionType } from '@prisma/client';

// ---- Quizzes ----
export class CreateQuizDto {
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) passingScore?: number;
  @IsOptional() @IsInt() @Min(1) timeLimitSec?: number;
  @IsOptional() @IsBoolean() isExam?: boolean;
  @IsOptional() @IsBoolean() shuffle?: boolean;
}

export class UpdateQuizDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) passingScore?: number;
  @IsOptional() @IsInt() @Min(1) timeLimitSec?: number;
  @IsOptional() @IsBoolean() isExam?: boolean;
  @IsOptional() @IsBoolean() shuffle?: boolean;
}

export class QuizOptionDto {
  @IsString() id!: string;
  @IsString() text!: string;
}

export class CreateQuestionDto {
  @IsString() @MinLength(1) prompt!: string;
  @IsOptional() @IsEnum(QuestionType) type?: QuestionType;
  @IsArray() options!: { id: string; text: string }[];
  @IsArray() @IsString({ each: true }) correct!: string[];
  @IsOptional() @IsInt() @Min(1) points?: number;
  @IsOptional() @IsInt() order?: number;
}

export class UpdateQuestionDto {
  @IsOptional() @IsString() prompt?: string;
  @IsOptional() @IsEnum(QuestionType) type?: QuestionType;
  @IsOptional() @IsArray() options?: { id: string; text: string }[];
  @IsOptional() @IsArray() @IsString({ each: true }) correct?: string[];
  @IsOptional() @IsInt() @Min(1) points?: number;
  @IsOptional() @IsInt() order?: number;
}

export class SubmitQuizDto {
  @IsObject() answers!: Record<string, string | string[]>;
}

// ---- Assignments ----
export class CreateAssignmentDto {
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsString() instructions?: string;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() @IsInt() @Min(1) maxPoints?: number;
}

export class UpdateAssignmentDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() instructions?: string;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() @IsInt() @Min(1) maxPoints?: number;
}

export class SubmitAssignmentDto {
  @IsOptional() @IsString() fileUrl?: string;
  @IsOptional() @IsString() text?: string;
}

export class GradeAssignmentDto {
  @IsInt() @Min(0) grade!: number;
  @IsOptional() @IsString() feedback?: string;
  @IsOptional() @IsBoolean() returnForRevision?: boolean;
}

// ---- Learning paths ----
export class CreateLearningPathDto {
  @IsString() @MinLength(1) slug!: string;
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) courseIds?: string[];
}

export class UpdateLearningPathDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) courseIds?: string[];
  @IsOptional() @IsBoolean() published?: boolean;
}
