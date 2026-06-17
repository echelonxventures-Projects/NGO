import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

const AD_TYPES = ['BANNER', 'VIDEO', 'NATIVE', 'SPONSORED', 'AFFILIATE', 'CAMPAIGN'];

export class CreatePlacementDto {
  @IsString() @MinLength(1) key!: string;
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() description?: string;
}

export class CreateAdDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsIn(AD_TYPES) type?: string;
  @IsOptional() @IsString() placementId?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional() @IsString() html?: string;
  @IsOptional() @IsString() targetUrl?: string;
  @IsOptional() @IsInt() @Min(1) weight?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() startAt?: string;
  @IsOptional() @IsString() endAt?: string;
  @IsOptional() @IsObject() targeting?: Record<string, string[]>;
}

export class UpdateAdDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() @Min(1) weight?: number;
  @IsOptional() @IsString() targetUrl?: string;
  @IsOptional() @IsObject() targeting?: Record<string, string[]>;
}
