import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CommerceService } from './commerce.service';
import { CreateOrderDto, CreateProductDto, UpdateProductDto } from './dto/commerce.dto';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';

@Controller()
export class CommerceController {
  constructor(private readonly commerce: CommerceService) {}

  // ---------- Public catalog ----------

  @Public()
  @Get('products')
  listActive(@Query('category') category?: string) {
    return this.commerce.listActive(category);
  }

  @Public()
  @Get('products/slug/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.commerce.getActiveBySlug(slug);
  }

  // ---------- Public checkout ----------

  @Public()
  @Post('orders')
  checkout(@Body() dto: CreateOrderDto) {
    return this.commerce.checkout(dto);
  }

  /** Authenticated checkout links the order to the user. */
  @Post('my/orders')
  myCheckout(@Body() dto: CreateOrderDto, @CurrentUser() me: AuthUser) {
    return this.commerce.checkout(dto, me.userId);
  }

  // ---------- Admin: products ----------

  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  @Get('products/all')
  list() {
    return this.commerce.listProducts();
  }

  @RequirePermissions(PERMISSIONS.PRODUCT_WRITE)
  @Post('products')
  create(@Body() dto: CreateProductDto) {
    return this.commerce.createProduct(dto);
  }

  @RequirePermissions(PERMISSIONS.PRODUCT_WRITE)
  @Put('products/:id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.commerce.updateProduct(id, dto);
  }

  @RequirePermissions(PERMISSIONS.PRODUCT_WRITE)
  @Delete('products/:id')
  remove(@Param('id') id: string) {
    return this.commerce.deleteProduct(id);
  }

  // ---------- Admin: orders ----------

  @RequirePermissions(PERMISSIONS.ORDER_READ)
  @Get('orders')
  orders() {
    return this.commerce.listOrders();
  }

  @RequirePermissions(PERMISSIONS.ORDER_READ)
  @Get('orders/:id')
  order(@Param('id') id: string) {
    return this.commerce.getOrder(id);
  }

  @RequirePermissions(PERMISSIONS.ORDER_WRITE)
  @Post('orders/:id/fulfill')
  fulfill(@Param('id') id: string) {
    return this.commerce.setOrderStatus(id, 'FULFILLED');
  }

  @RequirePermissions(PERMISSIONS.ORDER_WRITE)
  @Post('orders/:id/cancel')
  cancel(@Param('id') id: string) {
    return this.commerce.setOrderStatus(id, 'CANCELLED');
  }

  @RequirePermissions(PERMISSIONS.ORDER_WRITE)
  @Post('orders/:id/refund')
  refund(@Param('id') id: string) {
    return this.commerce.setOrderStatus(id, 'REFUNDED');
  }
}
