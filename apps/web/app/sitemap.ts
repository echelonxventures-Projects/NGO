import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.DXP_SITE_URL ?? 'http://localhost:3000';
  const programs = (await api.listPublished('program')) ?? [];
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/programs`, priority: 0.8 },
    { url: `${base}/donate`, priority: 0.9 },
  ];
  const programRoutes: MetadataRoute.Sitemap = programs.map((p) => ({
    url: `${base}/programs/${p.slug}`,
    lastModified: p.publishedAt ?? undefined,
    priority: 0.6,
  }));
  return [...staticRoutes, ...programRoutes];
}
