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

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  slug!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class CreateShippingMethodDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateShipmentDto {
  @IsString()
  orderId!: string;

  @IsOptional()
  @IsString()
  methodId?: string;

  @IsOptional()
  @IsString()
  methodName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  carrier?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;
}

export class UpdateShipmentStatusDto {
  @IsIn(['PENDING', 'SHIPPED', 'DELIVERED', 'RETURNED'])
  status!: 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'RETURNED';

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  carrier?: string;
}

export class GenerateInvoiceDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  shipping?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  tax?: number;
}

export class CreateReturnDto {
  @IsString()
  orderId!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsArray()
  items?: { orderItemId: string; quantity: number }[];
}

export class UpdateReturnStatusDto {
  @IsIn(['REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED'])
  status!: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'REFUNDED';

  @IsOptional()
  @IsInt()
  @Min(0)
  refundAmount?: number;
}
