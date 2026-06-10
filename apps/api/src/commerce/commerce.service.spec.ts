import { BadRequestException } from '@nestjs/common';
import { CommerceService } from './commerce.service';

describe('CommerceService.checkout (variants + coupons)', () => {
  const tenantContext = { requireTenantId: jest.fn().mockReturnValue('t1') } as any;

  function build(opts: { products: any[]; coupon?: any }) {
    const tx = {
      product: { update: jest.fn() },
      productVariant: { update: jest.fn() },
      coupon: { update: jest.fn() },
      order: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'o1',
          ...data,
          items: data.items?.create ?? [],
        })),
      },
    };
    const prisma = {
      scoped: jest.fn().mockReturnValue({
        product: { findMany: jest.fn().mockResolvedValue(opts.products) },
        coupon: { findFirst: jest.fn().mockResolvedValue(opts.coupon ?? null) },
      }),
      $transaction: jest.fn().mockImplementation((cb: any) => cb(tx)),
    } as any;
    return { svc: new CommerceService(prisma, tenantContext), tx };
  }

  it('prices a product variant by adding priceDelta and decrements variant stock', async () => {
    const product = {
      id: 'p1',
      title: 'Shirt',
      price: 1000,
      currency: 'INR',
      stock: null,
      status: 'ACTIVE',
      variants: [{ id: 'v1', name: 'Large', priceDelta: 500, stock: 3 }],
    };
    const { svc, tx } = build({ products: [product] });

    const order = await svc.checkout({
      customerEmail: 'a@b.org',
      items: [{ productId: 'p1', variantId: 'v1', quantity: 2 }],
    } as any);

    expect(order.subtotal).toBe(3000); // (1000+500)*2
    expect(order.total).toBe(3000);
    expect(order.items[0].titleSnapshot).toBe('Shirt — Large');
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: 'v1' },
      data: { stock: { decrement: 2 } },
    });
  });

  it('applies a percentage coupon and redeems it', async () => {
    const product = { id: 'p1', title: 'Book', price: 1000, currency: 'INR', stock: null, status: 'ACTIVE', variants: [] };
    const coupon = {
      id: 'c1',
      code: 'SAVE10',
      type: 'PERCENT',
      value: 10,
      minSubtotal: 0,
      maxRedemptions: null,
      redeemedCount: 0,
      expiresAt: null,
      active: true,
    };
    const { svc, tx } = build({ products: [product], coupon });

    const order = await svc.checkout({
      customerEmail: 'a@b.org',
      couponCode: 'save10',
      items: [{ productId: 'p1', quantity: 2 }],
    } as any);

    expect(order.subtotal).toBe(2000);
    expect(order.discount).toBe(200);
    expect(order.total).toBe(1800);
    expect(order.couponCode).toBe('SAVE10');
    expect(tx.coupon.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { redeemedCount: { increment: 1 } },
    });
  });

  it('rejects an invalid coupon code', async () => {
    const product = { id: 'p1', title: 'Book', price: 1000, currency: 'INR', stock: null, status: 'ACTIVE', variants: [] };
    const { svc } = build({ products: [product], coupon: null });
    await expect(
      svc.checkout({ customerEmail: 'a@b.org', couponCode: 'NOPE', items: [{ productId: 'p1', quantity: 1 }] } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects insufficient variant stock', async () => {
    const product = {
      id: 'p1',
      title: 'Shirt',
      price: 1000,
      currency: 'INR',
      stock: null,
      status: 'ACTIVE',
      variants: [{ id: 'v1', name: 'Large', priceDelta: 0, stock: 1 }],
    };
    const { svc } = build({ products: [product] });
    await expect(
      svc.checkout({ customerEmail: 'a@b.org', items: [{ productId: 'p1', variantId: 'v1', quantity: 5 }] } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
