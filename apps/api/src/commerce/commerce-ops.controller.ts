import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CommerceOpsService } from './commerce-ops.service';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';
import {
  CreateCategoryDto,
  CreateReturnDto,
  CreateShipmentDto,
  CreateShippingMethodDto,
  GenerateInvoiceDto,
  UpdateReturnStatusDto,
  UpdateShipmentStatusDto,
} from './dto/commerce-ops.dto';

@Controller()
export class CommerceOpsController {
  constructor(private readonly ops: CommerceOpsService) {}

  // ---------- Categories (public read, admin write) ----------

  @Public()
  @Get('categories')
  categories() {
    return this.ops.categoryTree();
  }

  @RequirePermissions(PERMISSIONS.PRODUCT_WRITE)
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.ops.createCategory(dto);
  }

  @RequirePermissions(PERMISSIONS.PRODUCT_WRITE)
  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.ops.deleteCategory(id);
  }

  // ---------- Shipping methods ----------

  @Public()
  @Get('shipping-methods')
  shippingMethods() {
    return this.ops.listShippingMethods();
  }

  @RequirePermissions(PERMISSIONS.PRODUCT_WRITE)
  @Post('shipping-methods')
  createShippingMethod(@Body() dto: CreateShippingMethodDto) {
    return this.ops.createShippingMethod(dto);
  }

  // ---------- Shipments (order fulfillment) ----------

  @RequirePermissions(PERMISSIONS.ORDER_WRITE)
  @Post('shipments')
  createShipment(@Body() dto: CreateShipmentDto) {
    return this.ops.createShipment(dto);
  }

  @RequirePermissions(PERMISSIONS.ORDER_WRITE)
  @Put('shipments/:id/status')
  updateShipmentStatus(@Param('id') id: string, @Body() dto: UpdateShipmentStatusDto) {
    return this.ops.updateShipmentStatus(id, dto);
  }

  @RequirePermissions(PERMISSIONS.ORDER_READ)
  @Get('orders/:orderId/shipments')
  shipments(@Param('orderId') orderId: string) {
    return this.ops.listShipments(orderId);
  }

  // ---------- Invoices ----------

  @RequirePermissions(PERMISSIONS.ORDER_WRITE)
  @Post('orders/:orderId/invoice')
  generateInvoice(@Param('orderId') orderId: string, @Body() dto: GenerateInvoiceDto) {
    return this.ops.generateInvoice(orderId, dto.shipping ?? 0, dto.tax ?? 0);
  }

  @RequirePermissions(PERMISSIONS.ORDER_READ)
  @Get('orders/:orderId/invoice')
  getInvoice(@Param('orderId') orderId: string) {
    return this.ops.getInvoice(orderId);
  }

  // ---------- Returns / refunds ----------

  @RequirePermissions(PERMISSIONS.ORDER_WRITE)
  @Post('returns')
  createReturn(@Body() dto: CreateReturnDto) {
    return this.ops.createReturn(dto);
  }

  @RequirePermissions(PERMISSIONS.ORDER_READ)
  @Get('returns')
  listReturns(@Query('orderId') orderId?: string) {
    return this.ops.listReturns(orderId);
  }

  @RequirePermissions(PERMISSIONS.ORDER_WRITE)
  @Put('returns/:id/status')
  updateReturnStatus(@Param('id') id: string, @Body() dto: UpdateReturnStatusDto) {
    return this.ops.updateReturnStatus(id, dto);
  }
}
