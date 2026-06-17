import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

const EXAM_TYPES = ['MCQ', 'ESSAY', 'SUBJECTIVE', 'VIVA', 'CODING', 'FILE_UPLOAD'];

export class CreateExamDto {
  @IsString() courseId!: string;
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsIn(EXAM_TYPES) type?: string;
  @IsOptional() @IsInt() @Min(1) durationMin?: number;
  @IsOptional() @IsInt() @Min(0) passingPct?: number;
  @IsOptional() @IsBoolean() randomize?: boolean;
  @IsOptional() @IsArray() questions?: unknown[];
  @IsOptional() @IsString() scheduledAt?: string;
}

export class SubmitExamDto {
  @IsObject() answers!: Record<string, number>;
}

export class CreateNoteDto {
  @IsString() lessonId!: string;
  @IsString() @MinLength(1) body!: string;
  @IsOptional() @IsInt() @Min(0) timestamp?: number;
}

export class CreateDiscussionDto {
  @IsString() courseId!: string;
  @IsOptional() @IsString() lessonId?: string;
  @IsString() @MinLength(1) title!: string;
  @IsString() @MinLength(1) body!: string;
}

export class ReplyDto {
  @IsString() @MinLength(1) body!: string;
}

export class MarkAttendanceDto {
  @IsString() courseId!: string;
  @IsString() userId!: string;
  @IsOptional() @IsIn(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']) status?: string;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() sessionId?: string;
}

export class IssueStudentIdDto {
  @IsString() userId!: string;
  @IsOptional() @IsString() enrollmentNo?: string;
  @IsOptional() @IsString() guardian?: string;
  @IsOptional() @IsString() phone?: string;
}

export class IssueTeacherIdDto {
  @IsString() userId!: string;
  @IsOptional() @IsString() staffId?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) subjects?: string[];
}
