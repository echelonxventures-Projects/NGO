import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CommerceService } from './commerce.service';
import {
  ApplyCouponDto,
  CreateCouponDto,
  CreateOrderDto,
  CreateProductDto,
  CreateRefundDto,
  CreateReviewDto,
  CreateVariantDto,
  ModerateReviewDto,
  UpdateCouponDto,
  UpdateProductDto,
  UpdateVariantDto,
  WishlistAddDto,
} from './dto/commerce.dto';
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

  // ---------- Public: variants, reviews, coupon validation ----------

  @Public()
  @Get('products/:id/variants')
  variants(@Param('id') id: string) {
    return this.commerce.listVariants(id);
  }

  @Public()
  @Get('products/:id/reviews')
  reviews(@Param('id') id: string) {
    return this.commerce.listReviewsPublic(id);
  }

  @Public()
  @Post('products/:id/reviews')
  addReview(@Param('id') id: string, @Body() dto: CreateReviewDto) {
    return this.commerce.createReview(id, dto);
  }

  @Public()
  @Post('coupons/validate')
  validateCoupon(@Body() dto: ApplyCouponDto) {
    return this.commerce.validateCoupon(dto.code, dto.subtotal);
  }

  // ---------- Authenticated user: wishlist + own review ----------

  @Post('products/:id/my-review')
  addMyReview(@Param('id') id: string, @Body() dto: CreateReviewDto, @CurrentUser() me: AuthUser) {
    return this.commerce.createReview(id, dto, me.userId, me.email);
  }

  @Get('my/wishlist')
  myWishlist(@CurrentUser() me: AuthUser) {
    return this.commerce.myWishlist(me.userId);
  }

  @Post('my/wishlist')
  addWishlist(@Body() dto: WishlistAddDto, @CurrentUser() me: AuthUser) {
    return this.commerce.addToWishlist(me.userId, dto.productId);
  }

  @Delete('my/wishlist/:productId')
  removeWishlist(@Param('productId') productId: string, @CurrentUser() me: AuthUser) {
    return this.commerce.removeFromWishlist(me.userId, productId);
  }

  // ---------- Admin: variants ----------

  @RequirePermissions(PERMISSIONS.PRODUCT_WRITE)
  @Post('products/:id/variants')
  createVariant(@Param('id') id: string, @Body() dto: CreateVariantDto) {
    return this.commerce.createVariant(id, dto);
  }

  @RequirePermissions(PERMISSIONS.PRODUCT_WRITE)
  @Put('variants/:id')
  updateVariant(@Param('id') id: string, @Body() dto: UpdateVariantDto) {
    return this.commerce.updateVariant(id, dto);
  }

  @RequirePermissions(PERMISSIONS.PRODUCT_WRITE)
  @Delete('variants/:id')
  deleteVariant(@Param('id') id: string) {
    return this.commerce.deleteVariant(id);
  }

  // ---------- Admin: coupons ----------

  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  @Get('coupons')
  coupons() {
    return this.commerce.listCoupons();
  }

  @RequirePermissions(PERMISSIONS.PRODUCT_WRITE)
  @Post('coupons')
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.commerce.createCoupon(dto);
  }

  @RequirePermissions(PERMISSIONS.PRODUCT_WRITE)
  @Put('coupons/:id')
  updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.commerce.updateCoupon(id, dto);
  }

  @RequirePermissions(PERMISSIONS.PRODUCT_WRITE)
  @Delete('coupons/:id')
  deleteCoupon(@Param('id') id: string) {
    return this.commerce.deleteCoupon(id);
  }

  // ---------- Admin: reviews moderation ----------

  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  @Get('reviews/all')
  allReviews() {
    return this.commerce.listReviewsAdmin();
  }

  @RequirePermissions(PERMISSIONS.PRODUCT_WRITE)
  @Post('reviews/:id/moderate')
  moderateReview(@Param('id') id: string, @Body() dto: ModerateReviewDto) {
    return this.commerce.moderateReview(id, dto);
  }

  // ---------- Admin: refunds / returns ----------

  @RequirePermissions(PERMISSIONS.ORDER_READ)
  @Get('refunds')
  refunds() {
    return this.commerce.listRefunds();
  }

  @RequirePermissions(PERMISSIONS.ORDER_WRITE)
  @Post('orders/:id/refunds')
  requestRefund(@Param('id') id: string, @Body() dto: CreateRefundDto) {
    return this.commerce.requestRefund(id, dto);
  }

  @RequirePermissions(PERMISSIONS.ORDER_WRITE)
  @Post('refunds/:id/approve')
  approveRefund(@Param('id') id: string) {
    return this.commerce.setRefundStatus(id, 'REFUNDED');
  }

  @RequirePermissions(PERMISSIONS.ORDER_WRITE)
  @Post('refunds/:id/reject')
  rejectRefund(@Param('id') id: string) {
    return this.commerce.setRefundStatus(id, 'REJECTED');
  }
}
