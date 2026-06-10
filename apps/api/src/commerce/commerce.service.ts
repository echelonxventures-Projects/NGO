import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import {
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
} from './dto/commerce.dto';
import { computeDiscount, couponError, CouponLike } from './coupon-math';

/**
 * Commerce core: product catalog and checkout. All data is tenant-owned (accessed via
 * `prisma.scoped()`). Checkout validates products, computes totals server-side (never
 * trusting client prices), decrements stock for physical products inside a transaction,
 * and marks the order paid via the mock provider (real gateways reuse the payment adapter,
 * as donations do).
 */
@Injectable()
export class CommerceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  // ---------- Products (admin) ----------

  listProducts() {
    return this.prisma.scoped().product.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createProduct(dto: CreateProductDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const existing = await this.prisma.scoped().product.findFirst({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('A product with this slug already exists');
    return this.prisma.scoped().product.create({
      data: {
        tenantId,
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        type: dto.type ?? 'PHYSICAL',
        status: dto.status ?? 'DRAFT',
        price: dto.price,
        currency: dto.currency ?? 'INR',
        category: dto.category,
        imageUrl: dto.imageUrl,
        stock: dto.type === 'DIGITAL' ? null : dto.stock ?? null,
      },
    });
  }

  private async requireProduct(id: string) {
    const product = await this.prisma.scoped().product.findFirst({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    await this.requireProduct(id);
    return this.prisma.scoped().product.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        type: dto.type ?? undefined,
        status: dto.status ?? undefined,
        price: dto.price ?? undefined,
        currency: dto.currency ?? undefined,
        category: dto.category ?? undefined,
        imageUrl: dto.imageUrl ?? undefined,
        stock: dto.stock ?? undefined,
      },
    });
  }

  async deleteProduct(id: string) {
    await this.requireProduct(id);
    await this.prisma.scoped().product.delete({ where: { id } });
    return { ok: true };
  }

  // ---------- Public catalog ----------

  listActive(category?: string) {
    return this.prisma.scoped().product.findMany({
      where: { status: 'ACTIVE', ...(category ? { category } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActiveBySlug(slug: string) {
    const product = await this.prisma.scoped().product.findFirst({
      where: { slug, status: 'ACTIVE' },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // ---------- Orders / checkout ----------

  /**
   * Creates and settles an order. Prices/totals are computed from the DB, not the client.
   * Supports product variants (priceDelta + variant stock) and a single coupon code.
   * Stock is checked and decremented atomically; the order is marked PAID (mock provider).
   */
  async checkout(dto: CreateOrderDto, userId?: string) {
    const tenantId = this.tenantContext.requireTenantId();

    // Load all referenced products (tenant-scoped) and validate.
    const ids = dto.items.map((i) => i.productId);
    const products = await this.prisma.scoped().product.findMany({
      where: { id: { in: ids }, status: 'ACTIVE' },
      include: { variants: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    let currency: string | null = null;
    const lines = dto.items.map((item) => {
      const product = byId.get(item.productId);
      if (!product) throw new BadRequestException(`Product not available: ${item.productId}`);
      if (currency && currency !== product.currency) {
        throw new BadRequestException('All items in an order must share one currency');
      }
      currency = product.currency;

      // Resolve optional variant.
      let variant = null as (typeof product.variants)[number] | null;
      if (item.variantId) {
        variant = product.variants.find((v) => v.id === item.variantId) ?? null;
        if (!variant) throw new BadRequestException(`Variant not available: ${item.variantId}`);
      }

      const unitPrice = product.price + (variant?.priceDelta ?? 0);
      const trackedStock = variant ? variant.stock : product.stock;
      if (trackedStock != null && trackedStock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for "${product.title}"`);
      }
      const lineTotal = unitPrice * item.quantity;
      return {
        product,
        variant,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
        titleSnapshot: variant ? `${product.title} — ${variant.name}` : product.title,
      };
    });

    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

    // Validate & price the coupon (if any) before opening the transaction.
    let coupon = null as Awaited<ReturnType<typeof this.loadCoupon>> | null;
    let discount = 0;
    if (dto.couponCode) {
      coupon = await this.loadCoupon(dto.couponCode);
      if (!coupon) throw new BadRequestException('Invalid coupon code');
      const err = couponError(coupon as unknown as CouponLike, subtotal);
      if (err) throw new BadRequestException(err);
      discount = computeDiscount(coupon as unknown as CouponLike, subtotal);
    }
    const total = subtotal - discount;

    // Transaction: decrement stock, redeem coupon, create order with items.
    return this.prisma.$transaction(async (tx) => {
      for (const l of lines) {
        if (l.variant && l.variant.stock != null) {
          await tx.productVariant.update({
            where: { id: l.variant.id },
            data: { stock: { decrement: l.quantity } },
          });
        } else if (!l.variant && l.product.stock != null) {
          await tx.product.update({
            where: { id: l.product.id },
            data: { stock: { decrement: l.quantity } },
          });
        }
      }
      if (coupon) {
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { redeemedCount: { increment: 1 } },
        });
      }
      return tx.order.create({
        data: {
          tenantId,
          userId,
          customerEmail: dto.customerEmail.toLowerCase().trim(),
          customerName: dto.customerName,
          status: 'PAID',
          subtotal,
          discount,
          couponCode: coupon?.code ?? null,
          total,
          currency: currency ?? 'INR',
          provider: 'mock',
          providerRef: `mock_${Date.now()}`,
          items: {
            create: lines.map((l) => ({
              tenantId,
              productId: l.product.id,
              variantId: l.variant?.id ?? null,
              titleSnapshot: l.titleSnapshot,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
              lineTotal: l.lineTotal,
            })),
          },
        },
        include: { items: true },
      });
    });
  }

  private loadCoupon(code: string) {
    return this.prisma.scoped().coupon.findFirst({ where: { code: code.trim().toUpperCase() } });
  }

  listOrders() {
    return this.prisma.scoped().order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  async getOrder(id: string) {
    const order = await this.prisma.scoped().order.findFirst({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async setOrderStatus(id: string, status: 'FULFILLED' | 'CANCELLED' | 'REFUNDED') {
    await this.getOrder(id);
    return this.prisma.scoped().order.update({ where: { id }, data: { status } });
  }

  // ---------- Variants ----------

  async listVariants(productId: string) {
    await this.requireProduct(productId);
    return this.prisma.scoped().productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createVariant(productId: string, dto: CreateVariantDto) {
    await this.requireProduct(productId);
    return this.prisma.scoped().productVariant.create({
      data: {
        tenantId: this.tenantContext.requireTenantId(),
        productId,
        name: dto.name,
        sku: dto.sku,
        priceDelta: dto.priceDelta ?? 0,
        stock: dto.stock ?? null,
      },
    });
  }

  async updateVariant(id: string, dto: UpdateVariantDto) {
    const v = await this.prisma.scoped().productVariant.findFirst({ where: { id } });
    if (!v) throw new NotFoundException('Variant not found');
    return this.prisma.scoped().productVariant.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        sku: dto.sku ?? undefined,
        priceDelta: dto.priceDelta ?? undefined,
        stock: dto.stock ?? undefined,
      },
    });
  }

  async deleteVariant(id: string) {
    const v = await this.prisma.scoped().productVariant.findFirst({ where: { id } });
    if (!v) throw new NotFoundException('Variant not found');
    await this.prisma.scoped().productVariant.delete({ where: { id } });
    return { ok: true };
  }

  // ---------- Coupons ----------

  listCoupons() {
    return this.prisma.scoped().coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createCoupon(dto: CreateCouponDto) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.scoped().coupon.findFirst({ where: { code } });
    if (existing) throw new ConflictException('A coupon with this code already exists');
    return this.prisma.scoped().coupon.create({
      data: {
        tenantId: this.tenantContext.requireTenantId(),
        code,
        type: dto.type ?? 'PERCENT',
        value: dto.value,
        minSubtotal: dto.minSubtotal ?? 0,
        maxRedemptions: dto.maxRedemptions ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        active: dto.active ?? true,
      },
    });
  }

  async updateCoupon(id: string, dto: UpdateCouponDto) {
    const c = await this.prisma.scoped().coupon.findFirst({ where: { id } });
    if (!c) throw new NotFoundException('Coupon not found');
    return this.prisma.scoped().coupon.update({
      where: { id },
      data: {
        type: dto.type ?? undefined,
        value: dto.value ?? undefined,
        minSubtotal: dto.minSubtotal ?? undefined,
        maxRedemptions: dto.maxRedemptions ?? undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        active: dto.active ?? undefined,
      },
    });
  }

  async deleteCoupon(id: string) {
    const c = await this.prisma.scoped().coupon.findFirst({ where: { id } });
    if (!c) throw new NotFoundException('Coupon not found');
    await this.prisma.scoped().coupon.delete({ where: { id } });
    return { ok: true };
  }

  /** Validates a coupon against a subtotal and returns the computed discount. */
  async validateCoupon(code: string, subtotal: number) {
    const coupon = await this.loadCoupon(code);
    if (!coupon) throw new NotFoundException('Invalid coupon code');
    const err = couponError(coupon as unknown as CouponLike, subtotal);
    if (err) throw new BadRequestException(err);
    return { code: coupon.code, discount: computeDiscount(coupon as unknown as CouponLike, subtotal) };
  }

  // ---------- Reviews ----------

  async listReviewsPublic(productId: string) {
    return this.prisma.scoped().review.findMany({
      where: { productId, status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createReview(productId: string, dto: CreateReviewDto, userId?: string, userName?: string) {
    await this.requireProduct(productId);
    return this.prisma.scoped().review.create({
      data: {
        tenantId: this.tenantContext.requireTenantId(),
        productId,
        userId,
        authorName: dto.authorName ?? userName ?? null,
        rating: dto.rating,
        body: dto.body,
      },
    });
  }

  listReviewsAdmin() {
    return this.prisma.scoped().review.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async moderateReview(id: string, dto: ModerateReviewDto) {
    const r = await this.prisma.scoped().review.findFirst({ where: { id } });
    if (!r) throw new NotFoundException('Review not found');
    return this.prisma.scoped().review.update({ where: { id }, data: { status: dto.status } });
  }

  // ---------- Wishlist ----------

  myWishlist(userId: string) {
    return this.prisma.scoped().wishlistItem.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addToWishlist(userId: string, productId: string) {
    await this.requireProduct(productId);
    const existing = await this.prisma.scoped().wishlistItem.findFirst({
      where: { userId, productId },
    });
    if (existing) return existing;
    return this.prisma.scoped().wishlistItem.create({
      data: { tenantId: this.tenantContext.requireTenantId(), userId, productId },
    });
  }

  async removeFromWishlist(userId: string, productId: string) {
    await this.prisma.scoped().wishlistItem.deleteMany({ where: { userId, productId } });
    return { ok: true };
  }

  // ---------- Refunds / returns ----------

  listRefunds() {
    return this.prisma.scoped().refund.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async requestRefund(orderId: string, dto: CreateRefundDto) {
    const order = await this.getOrder(orderId);
    if (!['PAID', 'FULFILLED'].includes(order.status)) {
      throw new BadRequestException('Only paid or fulfilled orders can be refunded');
    }
    const amount = dto.amount ?? order.total;
    if (amount > order.total) throw new BadRequestException('Refund exceeds order total');
    return this.prisma.scoped().refund.create({
      data: {
        tenantId: this.tenantContext.requireTenantId(),
        orderId,
        amount,
        reason: dto.reason,
      },
    });
  }

  /** Approve a refund: marks it REFUNDED and flips the order to REFUNDED (mock gateway). */
  async setRefundStatus(id: string, status: 'APPROVED' | 'REJECTED' | 'REFUNDED') {
    const refund = await this.prisma.scoped().refund.findFirst({ where: { id } });
    if (!refund) throw new NotFoundException('Refund not found');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.refund.update({ where: { id }, data: { status } });
      if (status === 'REFUNDED') {
        await tx.order.update({ where: { id: refund.orderId }, data: { status: 'REFUNDED' } });
      }
      return updated;
    });
  }
}
