/**
 * Server-side API client for the public site. All calls are made from the Next.js server
 * (SSR), attaching the tenant header so the backend resolves the right tenant. In production
 * the tenant is derived from the request host; in dev it falls back to DXP_TENANT.
 */
import { headers } from 'next/headers';

const API_BASE = process.env.DXP_API_BASE ?? 'http://localhost:4000/api';
const DEV_TENANT = process.env.DXP_TENANT ?? 'vashundhara';

export interface Branding {
  tenant: { id: string; slug: string; name: string };
  branding: {
    shortName?: string;
    tagline?: string;
    logoUrl?: string;
    primaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    socialLinks?: Record<string, string>;
  };
  config: { features?: Record<string, boolean>; menus?: unknown; defaultLocale?: string };
}

export interface Content {
  id: string;
  type: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  body?: { blocks?: { type: string; text?: string }[] } | Record<string, unknown>;
  publishedAt?: string | null;
  seo?: { title?: string; description?: string } & Record<string, unknown>;
}

/** Resolves the tenant slug to send to the API: request host → DXP_TENANT (dev). */
function resolveTenant(): string {
  try {
    const host = headers().get('x-forwarded-host') ?? headers().get('host') ?? '';
    // In production a real host maps to a tenant via the API's domain resolution; here we
    // pass the host through and let the API resolve it. For localhost, use the dev tenant.
    if (host && !host.startsWith('localhost') && !host.startsWith('127.0.0.1')) return '';
  } catch {
    /* headers() unavailable outside request scope */
  }
  return DEV_TENANT;
}

async function apiGet<T>(path: string): Promise<T | null> {
  const tenant = resolveTenant();
  const host = (() => {
    try {
      return headers().get('x-forwarded-host') ?? headers().get('host') ?? '';
    } catch {
      return '';
    }
  })();

  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (tenant) h['x-tenant'] = tenant;
  if (host) h['x-forwarded-host'] = host;

  try {
    const res = await fetch(`${API_BASE}${path}`, { headers: h, cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface PublicCourse {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  coverUrl?: string | null;
  price: number;
  currency: string;
  _count?: { modules: number; enrollments: number };
}

export interface PublicLesson {
  id: string;
  title: string;
  type: string;
  order: number;
  durationSec: number;
  isPreview: boolean;
  content?: { blocks?: { type: string; text?: string }[] } | Record<string, unknown>;
}

export interface PublicCourseDetail extends PublicCourse {
  description?: string | null;
  status: string;
  modules: { id: string; title: string; order: number; lessons: PublicLesson[] }[];
}

export interface PublicProduct {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  type: string;
  price: number;
  currency: string;
  category?: string | null;
  imageUrl?: string | null;
  stock?: number | null;
}

export interface PublicEvent {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  mode: string;
  location?: string | null;
  startsAt: string;
  endsAt?: string | null;
  capacity?: number | null;
  price: number;
  currency: string;
  _count?: { registrations: number };
}

export interface PublicPlan {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  benefits: string[];
}

export interface PublicPost {
  id: string;
  title: string;
  body: string;
  authorName?: string | null;
  pinned: boolean;
  createdAt?: string;
  _count?: { comments: number };
}

export const api = {
  getBranding: () => apiGet<Branding>('/branding'),
  listPublished: (type?: string) =>
    apiGet<Content[]>(`/content/published${type ? `?type=${encodeURIComponent(type)}` : ''}`),
  getPage: (type: string, slug: string) =>
    apiGet<Content>(`/content/${encodeURIComponent(type)}/${encodeURIComponent(slug)}`),
  listPublishedCourses: () => apiGet<PublicCourse[]>('/courses/published'),
  getPublishedCourse: (slug: string) =>
    apiGet<PublicCourseDetail>(`/courses/slug/${encodeURIComponent(slug)}`),
  listProducts: () => apiGet<PublicProduct[]>('/products'),
  getProduct: (slug: string) => apiGet<PublicProduct>(`/products/slug/${encodeURIComponent(slug)}`),
  listEvents: () => apiGet<PublicEvent[]>('/events'),
  getEvent: (slug: string) => apiGet<PublicEvent>(`/events/slug/${encodeURIComponent(slug)}`),
  listMembershipPlans: () => apiGet<PublicPlan[]>('/membership-plans'),
  listCommunityPosts: () => apiGet<PublicPost[]>('/community/posts'),
  apiBase: API_BASE,
  tenant: DEV_TENANT,
};
