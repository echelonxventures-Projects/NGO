import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CouponType, ProductStatus, ProductType, ReviewStatus } from '@prisma/client';

export class CreateProductDto {
  @IsString() @MinLength(1) slug!: string;
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(ProductType) type?: ProductType;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsInt() @Min(0) price!: number; // minor units
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsInt() @Min(0) stock?: number;
}

export class UpdateProductDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(ProductType) type?: ProductType;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @IsInt() @Min(0) price?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsInt() @Min(0) stock?: number;
}

export class OrderItemDto {
  @IsString() productId!: string;
  @IsOptional() @IsString() variantId?: string;
  @IsInt() @Min(1) quantity!: number;
}

export class CreateOrderDto {
  @IsEmail() customerEmail!: string;
  @IsOptional() @IsString() customerName?: string;
  @IsOptional() @IsString() couponCode?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}

// ---- Variants ----
export class CreateVariantDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsInt() priceDelta?: number;
  @IsOptional() @IsInt() @Min(0) stock?: number;
}

export class UpdateVariantDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsInt() priceDelta?: number;
  @IsOptional() @IsInt() @Min(0) stock?: number;
}

// ---- Coupons ----
export class CreateCouponDto {
  @IsString() @MinLength(1) code!: string;
  @IsOptional() @IsEnum(CouponType) type?: CouponType;
  @IsInt() @Min(0) value!: number;
  @IsOptional() @IsInt() @Min(0) minSubtotal?: number;
  @IsOptional() @IsInt() @Min(1) maxRedemptions?: number;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateCouponDto {
  @IsOptional() @IsEnum(CouponType) type?: CouponType;
  @IsOptional() @IsInt() @Min(0) value?: number;
  @IsOptional() @IsInt() @Min(0) minSubtotal?: number;
  @IsOptional() @IsInt() @Min(1) maxRedemptions?: number;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class ApplyCouponDto {
  @IsString() @MinLength(1) code!: string;
  @IsInt() @Min(0) subtotal!: number;
}

// ---- Reviews ----
export class CreateReviewDto {
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() authorName?: string;
}

export class ModerateReviewDto {
  @IsEnum(ReviewStatus) status!: ReviewStatus;
}

// ---- Wishlist ----
export class WishlistAddDto {
  @IsString() productId!: string;
}

// ---- Refunds ----
export class CreateRefundDto {
  @IsOptional() @IsInt() @Min(1) amount?: number; // defaults to full order total
  @IsOptional() @IsString() reason?: string;
}
