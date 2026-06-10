import { api } from '@/lib/api';

export default async function HomePage() {
  const [b, programs] = await Promise.all([api.getBranding(), api.listPublished('program')]);
  const name = b?.tenant.name ?? 'DXP Platform';

  return (
    <main>
      <section className="hero">
        <div className="container">
          <h1>{b?.branding.tagline ?? `Welcome to ${name}`}</h1>
          <p>{name} — making a measurable impact.</p>
          <a className="btn" href="/donate">Donate now</a>
        </div>
      </section>

      <section className="section container">
        <h2>Our Programs</h2>
        {programs && programs.length > 0 ? (
          <div className="grid">
            {programs.map((p) => (
              <article className="card" key={p.id}>
                <h3>{p.title}</h3>
                <p>{p.excerpt ?? ''}</p>
                <a href={`/programs/${p.slug}`}>Learn more →</a>
              </article>
            ))}
          </div>
        ) : (
          <p>Programs will appear here once published from the CMS.</p>
        )}
      </section>
    </main>
  );
}
