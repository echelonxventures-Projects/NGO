import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import {
  CreateCategoryDto,
  CreateReturnDto,
  CreateShipmentDto,
  CreateShippingMethodDto,
  UpdateReturnStatusDto,
  UpdateShipmentStatusDto,
} from './dto/commerce-ops.dto';

/** Formats a sequential invoice number, e.g. 1 -> "INV-000001". Pure for unit testing. */
export function formatInvoiceNumber(seq: number, prefix = 'INV'): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

/**
 * Commerce operations: category taxonomy, shipping methods + shipments, invoice generation
 * and the returns/refund workflow. Kept separate from the core CommerceService (catalog +
 * checkout) for cohesion. All data is tenant-scoped via prisma.scoped().
 */
@Injectable()
export class CommerceOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  // ---------- Category taxonomy ----------

  async createCategory(dto: CreateCategoryDto) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.scoped().productCategory.create({
      data: {
        tenantId,
        slug: dto.slug,
        name: dto.name,
        parentId: dto.parentId,
        order: dto.order ?? 0,
      },
    });
  }

  /** Returns the category forest (roots with nested children, one level deep per node). */
  async categoryTree() {
    const all = await this.prisma.scoped().productCategory.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
    const byParent = new Map<string | null, typeof all>();
    for (const c of all) {
      const key = c.parentId ?? null;
      byParent.set(key, [...(byParent.get(key) ?? []), c]);
    }
    const build = (parentId: string | null): unknown[] =>
      (byParent.get(parentId) ?? []).map((c) => ({ ...c, children: build(c.id) }));
    return build(null);
  }

  async deleteCategory(id: string) {
    await this.prisma.scoped().productCategory.deleteMany({ where: { id } });
    return { ok: true };
  }

  // ---------- Shipping methods ----------

  listShippingMethods() {
    return this.prisma.scoped().shippingMethod.findMany({ orderBy: { price: 'asc' } });
  }

  createShippingMethod(dto: CreateShippingMethodDto) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.scoped().shippingMethod.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        price: dto.price ?? 0,
        currency: dto.currency ?? 'INR',
        active: dto.active ?? true,
      },
    });
  }

  // ---------- Shipments ----------

  private async requireOrder(orderId: string) {
    const order = await this.prisma.scoped().order.findFirst({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async createShipment(dto: CreateShipmentDto) {
    const tenantId = this.tenantContext.requireTenantId();
    await this.requireOrder(dto.orderId);
    let methodName = dto.methodName ?? 'Standard';
    let cost = dto.cost ?? 0;
    if (dto.methodId) {
      const method = await this.prisma.scoped().shippingMethod.findFirst({
        where: { id: dto.methodId },
      });
      if (method) {
        methodName = method.name;
        cost = method.price;
      }
    }
    return this.prisma.scoped().shipment.create({
      data: {
        tenantId,
        orderId: dto.orderId,
        methodId: dto.methodId,
        methodName,
        cost,
        carrier: dto.carrier,
        trackingNumber: dto.trackingNumber,
        address: dto.address ?? {},
      },
    });
  }

  async updateShipmentStatus(id: string, dto: UpdateShipmentStatusDto) {
    const shipment = await this.prisma.scoped().shipment.findFirst({ where: { id } });
    if (!shipment) throw new NotFoundException('Shipment not found');
    return this.prisma.scoped().shipment.update({
      where: { id },
      data: {
        status: dto.status,
        trackingNumber: dto.trackingNumber ?? undefined,
        carrier: dto.carrier ?? undefined,
        shippedAt: dto.status === 'SHIPPED' ? new Date() : undefined,
        deliveredAt: dto.status === 'DELIVERED' ? new Date() : undefined,
      },
    });
  }

  listShipments(orderId: string) {
    return this.prisma.scoped().shipment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------- Invoices ----------

  /** Generates (idempotently per order) an invoice snapshotting the order totals. */
  async generateInvoice(orderId: string, shipping = 0, tax = 0) {
    const tenantId = this.tenantContext.requireTenantId();
    const order = await this.requireOrder(orderId);

    const existing = await this.prisma.scoped().invoice.findFirst({ where: { orderId } });
    if (existing) return existing;

    const count = await this.prisma.scoped().invoice.count();
    const number = formatInvoiceNumber(count + 1);
    const total = order.subtotal - order.discount + shipping + tax;

    return this.prisma.scoped().invoice.create({
      data: {
        tenantId,
        orderId,
        number,
        subtotal: order.subtotal,
        discount: order.discount,
        shipping,
        tax,
        total,
        currency: order.currency,
        data: {
          customerEmail: order.customerEmail,
          customerName: order.customerName,
        },
      },
    });
  }

  getInvoice(orderId: string) {
    return this.prisma.scoped().invoice.findFirst({ where: { orderId } });
  }

  // ---------- Returns / refunds workflow ----------

  async createReturn(dto: CreateReturnDto) {
    const tenantId = this.tenantContext.requireTenantId();
    await this.requireOrder(dto.orderId);
    return this.prisma.scoped().orderReturn.create({
      data: {
        tenantId,
        orderId: dto.orderId,
        reason: dto.reason,
        items: dto.items ?? [],
      },
    });
  }

  listReturns(orderId?: string) {
    return this.prisma.scoped().orderReturn.findMany({
      where: orderId ? { orderId } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Advances a return through its lifecycle. On REFUNDED it creates a linked Refund row and
   * marks the order REFUNDED, completing the returns→refund workflow.
   */
  async updateReturnStatus(id: string, dto: UpdateReturnStatusDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const ret = await this.prisma.scoped().orderReturn.findFirst({ where: { id } });
    if (!ret) throw new NotFoundException('Return not found');

    let refundId = ret.refundId;
    if (dto.status === 'REFUNDED' && !refundId) {
      const order = await this.requireOrder(ret.orderId);
      const refund = await this.prisma.scoped().refund.create({
        data: {
          tenantId,
          orderId: ret.orderId,
          amount: dto.refundAmount ?? order.total,
          reason: ret.reason ?? 'Return refund',
          status: 'REFUNDED',
        },
      });
      refundId = refund.id;
      await this.prisma.scoped().order.update({
        where: { id: ret.orderId },
        data: { status: 'REFUNDED' },
      });
    }

    return this.prisma.scoped().orderReturn.update({
      where: { id },
      data: { status: dto.status, refundId },
    });
  }
}
