import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { CreateTaxRuleDto, UpdateTaxRuleDto } from './dto/tax.dto';

export interface RegionInput {
  country?: string;
  region?: string;
  /** Geo hint header value (e.g. cf-ipcountry / x-country). */
  geoCountry?: string;
}

export interface ResolvedRegion {
  country: string;
  region: string | null;
  source: 'address' | 'geo' | 'tenant-default';
}

export interface TaxComputation {
  country: string;
  region: string | null;
  ratePct: number;
  taxAmount: number; // minor units
  netAmount: number; // amount excluding tax (minor units)
  grossAmount: number; // amount including tax (minor units)
  inclusive: boolean;
  breakdown: { name: string; ratePct: number; amount: number }[];
}

@Injectable()
export class TaxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  // ---- Region auto-detection ----
  // Precedence: explicit address > geo header > tenant default.
  async resolveRegion(input: RegionInput = {}): Promise<ResolvedRegion> {
    const tenantId = this.tenantContext.requireTenantId();
    const config = await this.prisma.tenantConfig.findUnique({ where: { tenantId } });

    if (input.country) {
      return { country: input.country.toUpperCase(), region: input.region ?? null, source: 'address' };
    }
    if (input.geoCountry) {
      return { country: input.geoCountry.toUpperCase(), region: null, source: 'geo' };
    }
    return {
      country: (config?.defaultCountry ?? 'IN').toUpperCase(),
      region: config?.defaultRegion ?? null,
      source: 'tenant-default',
    };
  }

  // ---- Tax computation ----
  async compute(params: {
    amount: number;
    country?: string;
    region?: string;
    category?: string;
    geoCountry?: string;
  }): Promise<TaxComputation> {
    const tenantId = this.tenantContext.requireTenantId();
    const config = await this.prisma.tenantConfig.findUnique({ where: { tenantId } });
    const inclusive = config?.taxInclusive ?? false;

    const resolved = await this.resolveRegion({
      country: params.country,
      region: params.region,
      geoCountry: params.geoCountry,
    });

    const rule = await this.bestRule(resolved.country, resolved.region, params.category);
    const ratePct = rule?.ratePct ?? 0;

    let taxAmount: number;
    let netAmount: number;
    let grossAmount: number;
    if (inclusive) {
      // amount already includes tax: extract the tax portion.
      grossAmount = params.amount;
      netAmount = Math.round(params.amount / (1 + ratePct / 100));
      taxAmount = grossAmount - netAmount;
    } else {
      netAmount = params.amount;
      taxAmount = Math.round((params.amount * ratePct) / 100);
      grossAmount = netAmount + taxAmount;
    }

    return {
      country: resolved.country,
      region: resolved.region,
      ratePct,
      taxAmount,
      netAmount,
      grossAmount,
      inclusive,
      breakdown: rule ? [{ name: rule.name, ratePct, amount: taxAmount }] : [],
    };
  }

  /**
   * Best-match rule by specificity: region match (+2) and category match (+1) score higher;
   * ties broken by `priority`. Rules with null region/category are wildcards.
   */
  private async bestRule(country: string, region: string | null, category?: string) {
    const rules = await this.prisma.scoped().taxRule.findMany({
      where: {
        active: true,
        country,
        AND: [
          { OR: [{ region: null }, ...(region ? [{ region }] : [])] },
          { OR: [{ category: null }, ...(category ? [{ category }] : [])] },
        ],
      },
    });
    if (rules.length === 0) return null;

    const score = (r: { region: string | null; category: string | null; priority: number }) =>
      (r.region ? 2 : 0) + (r.category ? 1 : 0) + r.priority * 0.001;

    return rules.sort((a, b) => score(b) - score(a))[0];
  }

  // ---- CRUD ----
  listRules() {
    return this.prisma.scoped().taxRule.findMany({ orderBy: [{ country: 'asc' }, { region: 'asc' }] });
  }

  createRule(dto: CreateTaxRuleDto) {
    return this.prisma.scoped().taxRule.create({
      data: {
        tenantId: this.tenantContext.requireTenantId(),
        name: dto.name,
        country: dto.country.toUpperCase(),
        region: dto.region ?? null,
        category: dto.category ?? null,
        ratePct: dto.ratePct,
        priority: dto.priority ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async updateRule(id: string, dto: UpdateTaxRuleDto) {
    await this.ensureExists(id);
    return this.prisma.scoped().taxRule.update({
      where: { id },
      data: {
        ...dto,
        country: dto.country ? dto.country.toUpperCase() : undefined,
      },
    });
  }

  async deleteRule(id: string) {
    await this.ensureExists(id);
    await this.prisma.scoped().taxRule.delete({ where: { id } });
    return { deleted: true, id };
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.scoped().taxRule.findFirst({ where: { id } });
    if (!found) throw new NotFoundException('Tax rule not found');
  }
}
