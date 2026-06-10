import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api, Content } from '@/lib/api';

type Params = { params: { slug: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = await api.getPage('program', params.slug);
  if (!page) return { title: 'Not found' };
  return {
    title: page.seo?.title ?? page.title,
    description: page.seo?.description ?? page.excerpt ?? undefined,
  };
}

function renderBlocks(page: Content) {
  const blocks = (page.body as { blocks?: { type: string; text?: string }[] })?.blocks;
  if (!blocks || blocks.length === 0) {
    return <p>{page.excerpt ?? ''}</p>;
  }
  return blocks.map((block, i) => {
    switch (block.type) {
      case 'hero':
      case 'heading':
        return <h2 key={i}>{block.text}</h2>;
      case 'text':
      default:
        return <p key={i}>{block.text}</p>;
    }
  });
}

export default async function ProgramDetail({ params }: Params) {
  const page = await api.getPage('program', params.slug);
  if (!page) notFound();

  // Article structured data for SEO.
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    description: page.excerpt ?? undefined,
    datePublished: page.publishedAt ?? undefined,
  };

  return (
    <main className="section container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <h1>{page.title}</h1>
      <article>{renderBlocks(page)}</article>
      <p style={{ marginTop: 32 }}>
        <a className="btn btn-primary" href="/donate">Support this program</a>
      </p>
    </main>
  );
}
