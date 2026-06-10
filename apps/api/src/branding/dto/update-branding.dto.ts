import { IsHexColor, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateBrandingDto {
  @IsOptional() @IsString() shortName?: string;
  @IsOptional() @IsString() tagline?: string;
  @IsOptional() @IsUrl() logoUrl?: string;
  @IsOptional() @IsUrl() darkLogoUrl?: string;
  @IsOptional() @IsUrl() faviconUrl?: string;
  @IsOptional() @IsHexColor() primaryColor?: string;
  @IsOptional() @IsHexColor() accentColor?: string;
  @IsOptional() @IsString() fontFamily?: string;
  @IsOptional() @IsObject() socialLinks?: Record<string, string>;
  @IsOptional() @IsObject() extra?: Record<string, unknown>;
}
