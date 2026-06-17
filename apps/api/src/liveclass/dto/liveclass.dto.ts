import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateLiveSessionDto {
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() courseId?: string;
  @IsString() scheduledAt!: string; // ISO date
  @IsOptional() @IsInt() @Min(1) durationMin?: number;
  @IsOptional() @IsIn(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY']) recurrence?: string;
  @IsOptional() @IsString() hostName?: string;
}

export class UpdateLiveStatusDto {
  @IsIn(['SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED'])
  status!: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';

  @IsOptional() @IsString() recordingUrl?: string;
}
