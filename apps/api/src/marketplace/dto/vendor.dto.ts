import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

const VENDOR_TYPES = ['NGO', 'SHG', 'ARTISAN', 'WOMEN_ENTREPRENEUR', 'TRAINER', 'OTHER'];

export class ApplyVendorDto {
  @IsString()
  @MinLength(1)
  slug!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsIn(VENDOR_TYPES)
  type?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  commissionPct?: number;
}

export class UpdateVendorStatusDto {
  @IsIn(['PENDING', 'APPROVED', 'SUSPENDED'])
  status!: 'PENDING' | 'APPROVED' | 'SUSPENDED';

  @IsOptional()
  @IsInt()
  @Min(0)
  commissionPct?: number;
}

export class VendorProductDto {
  @IsString()
  @MinLength(1)
  slug!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['PHYSICAL', 'DIGITAL'])
  type?: 'PHYSICAL' | 'DIGITAL';

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;
}

export class CreatePayoutDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  grossSales?: number;

  @IsOptional()
  @IsString()
  periodStart?: string;

  @IsOptional()
  @IsString()
  periodEnd?: string;
}
