import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateTaxRuleDto {
  @IsString() name!: string;
  @IsString() @Length(2, 2) country!: string; // ISO alpha-2
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() category?: string;
  @IsNumber() @Min(0) @Max(100) ratePct!: number;
  @IsOptional() @IsInt() priority?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateTaxRuleDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() @Length(2, 2) country?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100) ratePct?: number;
  @IsOptional() @IsInt() priority?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class ComputeTaxDto {
  @IsInt() @Min(0) amount!: number; // minor units
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() @Length(2, 2) country?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() category?: string;
}
