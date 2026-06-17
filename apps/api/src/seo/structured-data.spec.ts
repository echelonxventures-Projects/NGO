import {
  articleSchema,
  courseSchema,
  eventSchema,
  faqSchema,
  openGraph,
  organizationSchema,
  productSchema,
} from './structured-data';

describe('structured-data builders', () => {
  it('builds NGO organization schema', () => {
    const s = organizationSchema({ name: 'Vashundhara', logo: 'l.png', sameAs: ['https://x.com/v'], isNgo: true });
    expect(s['@type']).toBe('NGO');
    expect(s.name).toBe('Vashundhara');
    expect(s.sameAs).toEqual(['https://x.com/v']);
  });

  it('maps event attendance mode for online events', () => {
    const s = eventSchema({ name: 'Webinar', startDate: '2026-01-01T10:00:00Z', mode: 'ONLINE', location: 'https://meet' });
    expect(s.eventAttendanceMode).toContain('OnlineEventAttendanceMode');
    expect((s.location as Record<string, unknown>)['@type']).toBe('VirtualLocation');
  });

  it('formats product price from minor units with availability', () => {
    const s = productSchema({ name: 'Book', priceMinor: 19900, currency: 'INR', available: false });
    const offer = s.offers as Record<string, unknown>;
    expect(offer.price).toBe('199.00');
    expect(offer.priceCurrency).toBe('INR');
    expect(offer.availability).toContain('OutOfStock');
  });

  it('builds FAQ, course and article schemas', () => {
    expect((faqSchema([{ question: 'Q', answer: 'A' }]).mainEntity as unknown[])).toHaveLength(1);
    expect(courseSchema({ name: 'C', providerName: 'Org' })['@type']).toBe('Course');
    expect(articleSchema({ headline: 'H' })['@type']).toBe('Article');
  });

  it('builds OpenGraph + Twitter tags with large image card when image present', () => {
    const tags = openGraph({ title: 'T', description: 'D', image: 'i.png', url: 'u' });
    expect(tags['twitter:card']).toBe('summary_large_image');
    expect(tags['og:image']).toBe('i.png');
    expect(tags['og:url']).toBe('u');
  });
});
