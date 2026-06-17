import { IsArray, IsInt, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class TrackEventDto {
  @IsString() @MinLength(1) type!: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsString() path?: string;
  @IsOptional() @IsInt() value?: number;
  @IsOptional() @IsObject() props?: Record<string, unknown>;
}

export class FunnelQueryDto {
  @IsArray() @IsString({ each: true }) steps!: string[];
}
