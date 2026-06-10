import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import BuyBox from './BuyBox';

type Params = { params: { slug: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await api.getProduct(params.slug);
  if (!p) return { title: 'Product not found' };
  return { title: p.title, description: p.description ?? undefined };
}

export default async function ProductDetail({ params }: Params) {
  const p = await api.getProduct(params.slug);
  if (!p) notFound();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    description: p.description ?? undefined,
    offers: {
      '@type': 'Offer',
      price: (p.price / 100).toFixed(2),
      priceCurrency: p.currency,
      availability: p.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    },
  };

  return (
    <main className="section container">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <h1>{p.title}</h1>
      {p.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.imageUrl} alt={p.title} style={{ maxWidth: 420, width: '100%', borderRadius: 10 }} />
      )}
      <p className="stat-sub" style={{ fontSize: 20 }}>{p.currency} {(p.price / 100).toFixed(2)}</p>
      {p.description && <p>{p.description}</p>}
      <BuyBox
        productId={p.id}
        title={p.title}
        outOfStock={p.stock === 0}
      />
    </main>
  );
}
