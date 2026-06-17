import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { computeFunnel } from './funnel';
import { TrackEventDto } from './dto/analytics.dto';

/**
 * Analytics platform: ingests typed events (pageview/donation/sale/enrollment/...) and provides
 * aggregation — totals by type, a time-series, top paths and conversion funnels. Backed by the
 * AnalyticsEvent table (free-first; no external analytics provider required).
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  track(dto: TrackEventDto, userId?: string) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.scoped().analyticsEvent.create({
      data: {
        tenantId,
        type: dto.type,
        name: dto.name,
        userId,
        sessionId: dto.sessionId,
        path: dto.path,
        value: dto.value ?? 0,
        props: dto.props ?? {},
      },
    });
  }

  /** Overview: counts + summed value grouped by event type within an optional day window. */
  async overview(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const grouped = await this.prisma.scoped().analyticsEvent.groupBy({
      by: ['type'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      _sum: { value: true },
    });
    const byType = grouped.map((g) => ({
      type: g.type,
      count: g._count._all,
      value: g._sum.value ?? 0,
    }));
    const totalEvents = byType.reduce((s, t) => s + t.count, 0);
    const uniqueVisitors = await this.uniqueVisitors(since);
    return { days, totalEvents, uniqueVisitors, byType };
  }

  private async uniqueVisitors(since: Date): Promise<number> {
    const rows = await this.prisma.scoped().analyticsEvent.findMany({
      where: { type: 'pageview', createdAt: { gte: since } },
      select: { sessionId: true },
    });
    return new Set(rows.map((r) => r.sessionId).filter(Boolean)).size;
  }

  /** Daily time-series of event counts for a given type. */
  async timeseries(type: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const events = await this.prisma.scoped().analyticsEvent.findMany({
      where: { type, createdAt: { gte: since } },
      select: { createdAt: true, value: true },
      orderBy: { createdAt: 'asc' },
    });
    const byDay = new Map<string, { count: number; value: number }>();
    for (const e of events) {
      const day = e.createdAt.toISOString().slice(0, 10);
      const cur = byDay.get(day) ?? { count: 0, value: 0 };
      byDay.set(day, { count: cur.count + 1, value: cur.value + e.value });
    }
    return [...byDay.entries()].map(([date, v]) => ({ date, ...v }));
  }

  async topPaths(limit = 10, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const grouped = await this.prisma.scoped().analyticsEvent.groupBy({
      by: ['path'],
      where: { type: 'pageview', path: { not: null }, createdAt: { gte: since } },
      _count: { _all: true },
    });
    return grouped
      .map((g) => ({ path: g.path, count: g._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /** Conversion funnel across an ordered list of event types. */
  async funnel(steps: string[], days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const counts = await Promise.all(
      steps.map(async (type) => ({
        type,
        count: await this.prisma.scoped().analyticsEvent.count({
          where: { type, createdAt: { gte: since } },
        }),
      })),
    );
    return computeFunnel(counts);
  }
}
