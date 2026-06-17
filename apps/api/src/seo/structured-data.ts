/**
 * Schema.org structured-data (JSON-LD) builders. Pure functions (no I/O) so they are fully
 * unit-testable and reusable by both the API (SEO endpoints) and the Next.js renderer. Each
 * returns a plain object ready to be JSON-stringified into a <script type="application/ld+json">.
 */

const CTX = 'https://schema.org';

export interface OrgInput {
  name: string;
  url?: string;
  logo?: string;
  sameAs?: string[];
  isNgo?: boolean;
}

export function organizationSchema(o: OrgInput): Record<string, unknown> {
  return {
    '@context': CTX,
    '@type': o.isNgo ? 'NGO' : 'Organization',
    name: o.name,
    url: o.url,
    logo: o.logo,
    sameAs: o.sameAs?.length ? o.sameAs : undefined,
  };
}

export interface EventInput {
  name: string;
  startDate: string;
  endDate?: string;
  url?: string;
  location?: string;
  mode?: 'ONLINE' | 'PHYSICAL' | 'HYBRID';
  description?: string;
}

export function eventSchema(e: EventInput): Record<string, unknown> {
  const attendance =
    e.mode === 'ONLINE'
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : e.mode === 'HYBRID'
        ? 'https://schema.org/MixedEventAttendanceMode'
        : 'https://schema.org/OfflineEventAttendanceMode';
  return {
    '@context': CTX,
    '@type': 'Event',
    name: e.name,
    startDate: e.startDate,
    endDate: e.endDate,
    eventAttendanceMode: attendance,
    location:
      e.mode === 'ONLINE'
        ? { '@type': 'VirtualLocation', url: e.location ?? e.url }
        : { '@type': 'Place', name: e.location },
    description: e.description,
    url: e.url,
  };
}

export interface CourseInput {
  name: string;
  description?: string;
  url?: string;
  providerName?: string;
}

export function courseSchema(c: CourseInput): Record<string, unknown> {
  return {
    '@context': CTX,
    '@type': 'Course',
    name: c.name,
    description: c.description,
    url: c.url,
    provider: c.providerName
      ? { '@type': 'Organization', name: c.providerName }
      : undefined,
  };
}

export interface ProductInput {
  name: string;
  description?: string;
  image?: string;
  priceMinor: number;
  currency: string;
  available?: boolean;
  url?: string;
}

export function productSchema(p: ProductInput): Record<string, unknown> {
  return {
    '@context': CTX,
    '@type': 'Product',
    name: p.name,
    description: p.description,
    image: p.image,
    offers: {
      '@type': 'Offer',
      price: (p.priceMinor / 100).toFixed(2),
      priceCurrency: p.currency,
      availability: p.available === false
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      url: p.url,
    },
  };
}

export function faqSchema(items: { question: string; answer: string }[]): Record<string, unknown> {
  return {
    '@context': CTX,
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.question,
      acceptedAnswer: { '@type': 'Answer', text: i.answer },
    })),
  };
}

export interface ArticleInput {
  headline: string;
  description?: string;
  image?: string;
  authorName?: string;
  datePublished?: string;
  url?: string;
}

export function articleSchema(a: ArticleInput): Record<string, unknown> {
  return {
    '@context': CTX,
    '@type': 'Article',
    headline: a.headline,
    description: a.description,
    image: a.image,
    author: a.authorName ? { '@type': 'Person', name: a.authorName } : undefined,
    datePublished: a.datePublished,
    url: a.url,
  };
}

export interface OpenGraph {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

/** Builds an OpenGraph/Twitter-card meta tag map for a given entity. */
export function openGraph(og: OpenGraph): Record<string, string> {
  const tags: Record<string, string> = {
    'og:title': og.title,
    'og:type': og.type ?? 'website',
    'twitter:card': og.image ? 'summary_large_image' : 'summary',
    'twitter:title': og.title,
  };
  if (og.description) {
    tags['og:description'] = og.description;
    tags['twitter:description'] = og.description;
  }
  if (og.image) {
    tags['og:image'] = og.image;
    tags['twitter:image'] = og.image;
  }
  if (og.url) tags['og:url'] = og.url;
  return tags;
}
