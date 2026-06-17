import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class BookmarkDto {
  @IsString()
  source!: string;

  @IsString()
  externalId!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  authors?: string[];

  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsString()
  license?: string;
}
