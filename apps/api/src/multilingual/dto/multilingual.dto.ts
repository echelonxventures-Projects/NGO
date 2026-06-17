import { IsArray, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { EXPLANATION_MODES } from '../../ai/prompts';

export class TranslateDto {
  @IsString() @MinLength(1) text!: string;
  @IsString() target!: string;
  @IsOptional() @IsString() source?: string;
}

export class TranslateBatchDto {
  @IsArray() @IsString({ each: true }) texts!: string[];
  @IsString() target!: string;
  @IsOptional() @IsString() source?: string;
}

export class TtsDto {
  @IsString() @MinLength(1) text!: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() voice?: string;
}

export class SttDto {
  @IsString() audioBase64!: string;
  @IsOptional() @IsString() language?: string;
}

export class ExplainLocalizedDto {
  @IsString() @MinLength(1) content!: string;
  @IsIn(EXPLANATION_MODES as unknown as string[]) mode!: string;
  @IsString() language!: string;
}
