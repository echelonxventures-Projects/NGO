import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { VendorType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import {
  ApplyVendorDto,
  CreatePayoutDto,
  UpdateVendorStatusDto,
  VendorProductDto,
} from './dto/vendor.dto';

/** Splits gross sales (minor units) by commission basis points. Pure for unit testing. */
export function splitCommission(
  grossSales: number,
  commissionPct: number,
): { commission: number; net: number } {
  const commission = Math.floor((grossSales * commissionPct) / 10000);
  return { commission, net: grossSales - commission };
}

/**
 * Multi-vendor marketplace. Vendors (NGOs, SHGs, artisans, women entrepreneurs, trainers)
 * apply, get approved by an admin, then list products. Sales/commission are computed from
 * paid orders containing the vendor's products; payouts snapshot a period's net amount.
 */
@Injectable()
export class VendorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  // ---------- Onboarding ----------

  async apply(userId: string, dto: ApplyVendorDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const existing = await this.prisma.scoped().vendor.findFirst({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('A vendor with this slug already exists');
    return this.prisma.scoped().vendor.create({
      data: {
        tenantId,
        userId,
        slug: dto.slug,
        name: dto.name,
        type: (dto.type as VendorType) ?? 'OTHER',
        bio: dto.bio,
        logoUrl: dto.logoUrl,
        commissionPct: dto.commissionPct ?? 1500,
      },
    });
  }

  list(status?: string) {
    return this.prisma.scoped().vendor.findMany({
      where: status ? { status: status as never } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async myVendor(userId: string) {
    return this.prisma.scoped().vendor.findFirst({ where: { userId } });
  }

  private async requireVendor(id: string) {
    const vendor = await this.prisma.scoped().vendor.findFirst({ where: { id } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async setStatus(id: string, dto: UpdateVendorStatusDto) {
    await this.requireVendor(id);
    return this.prisma.scoped().vendor.update({
      where: { id },
      data: {
        status: dto.status,
        commissionPct: dto.commissionPct ?? undefined,
      },
    });
  }

  // ---------- Vendor products ----------

  private async requireApprovedVendorForUser(userId: string) {
    const vendor = await this.myVendor(userId);
    if (!vendor) throw new NotFoundException('You are not a registered vendor');
    if (vendor.status !== 'APPROVED') {
      throw new ConflictException('Your vendor account is not approved yet');
    }
    return vendor;
  }

  async createProduct(userId: string, dto: VendorProductDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const vendor = await this.requireApprovedVendorForUser(userId);
    return this.prisma.scoped().product.create({
      data: {
        tenantId,
        vendorId: vendor.id,
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        type: dto.type ?? 'PHYSICAL',
        status: 'ACTIVE',
        price: dto.price ?? 0,
        currency: dto.currency ?? 'INR',
        category: dto.category,
        imageUrl: dto.imageUrl,
        stock: dto.stock,
      },
    });
  }

  listProducts(vendorId: string) {
    return this.prisma.scoped().product.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------- Sales & commission ----------

  /** Computes gross vendor sales from order items on PAID/FULFILLED orders. */
  async computeSales(vendorId: string): Promise<number> {
    const products = await this.prisma.scoped().product.findMany({
      where: { vendorId },
      select: { id: true },
    });
    if (products.length === 0) return 0;
    const productIds = products.map((p) => p.id);

    const items = await this.prisma.scoped().orderItem.findMany({
      where: { productId: { in: productIds } },
      select: { lineTotal: true, orderId: true },
    });
    if (items.length === 0) return 0;

    const orderIds = [...new Set(items.map((i) => i.orderId))];
    const paidOrders = await this.prisma.scoped().order.findMany({
      where: { id: { in: orderIds }, status: { in: ['PAID', 'FULFILLED'] } },
      select: { id: true },
    });
    const paid = new Set(paidOrders.map((o) => o.id));
    return items
      .filter((i) => paid.has(i.orderId))
      .reduce((sum, i) => sum + i.lineTotal, 0);
  }

  async dashboard(userId: string) {
    const vendor = await this.myVendor(userId);
    if (!vendor) throw new NotFoundException('You are not a registered vendor');
    const grossSales = await this.computeSales(vendor.id);
    const { commission, net } = splitCommission(grossSales, vendor.commissionPct);
    const productCount = await this.prisma.scoped().product.count({ where: { vendorId: vendor.id } });
    const payouts = await this.prisma.scoped().vendorPayout.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: 'desc' },
    });
    const paidOut = payouts
      .filter((p) => p.status === 'PAID')
      .reduce((s, p) => s + p.netAmount, 0);
    return {
      vendor,
      grossSales,
      commission,
      netEarnings: net,
      pendingBalance: net - paidOut,
      productCount,
      payouts,
    };
  }

  // ---------- Payouts (admin) ----------

  async createPayout(vendorId: string, dto: CreatePayoutDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const vendor = await this.requireVendor(vendorId);
    const grossSales = dto.grossSales ?? (await this.computeSales(vendorId));
    const { commission, net } = splitCommission(grossSales, vendor.commissionPct);
    return this.prisma.scoped().vendorPayout.create({
      data: {
        tenantId,
        vendorId,
        grossSales,
        commission,
        netAmount: net,
        currency: 'INR',
        periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
      },
    });
  }

  async markPayoutPaid(id: string) {
    const payout = await this.prisma.scoped().vendorPayout.findFirst({ where: { id } });
    if (!payout) throw new NotFoundException('Payout not found');
    return this.prisma.scoped().vendorPayout.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  listPayouts(vendorId: string) {
    return this.prisma.scoped().vendorPayout.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
