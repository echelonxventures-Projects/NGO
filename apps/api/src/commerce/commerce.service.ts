import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { CreateOrderDto, CreateProductDto, UpdateProductDto } from './dto/commerce.dto';

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
   * Stock is checked and decremented atomically; the order is marked PAID (mock provider).
   */
  async checkout(dto: CreateOrderDto, userId?: string) {
    const tenantId = this.tenantContext.requireTenantId();

    // Load all referenced products (tenant-scoped) and validate.
    const ids = dto.items.map((i) => i.productId);
    const products = await this.prisma.scoped().product.findMany({
      where: { id: { in: ids }, status: 'ACTIVE' },
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
      if (product.stock != null && product.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for "${product.title}"`);
      }
      const lineTotal = product.price * item.quantity;
      return { product, quantity: item.quantity, unitPrice: product.price, lineTotal };
    });

    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

    // Transaction: decrement stock + create order with items. Mock settlement → PAID.
    return this.prisma.$transaction(async (tx) => {
      for (const l of lines) {
        if (l.product.stock != null) {
          await tx.product.update({
            where: { id: l.product.id },
            data: { stock: { decrement: l.quantity } },
          });
        }
      }
      return tx.order.create({
        data: {
          tenantId,
          userId,
          customerEmail: dto.customerEmail.toLowerCase().trim(),
          customerName: dto.customerName,
          status: 'PAID',
          subtotal,
          total: subtotal,
          currency: currency ?? 'INR',
          provider: 'mock',
          providerRef: `mock_${Date.now()}`,
          items: {
            create: lines.map((l) => ({
              tenantId,
              productId: l.product.id,
              titleSnapshot: l.product.title,
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
}
